"""Song Splitter pipeline.

Given a YouTube link or an audio file:
  1. get the audio (yt-dlp + bundled ffmpeg)
  2. split it into 6 instrument tracks with Demucs (htdemucs_6s, by Meta)
  3. find tempo, beats and musical key (librosa)
  4. turn each pitched track into notes with Basic Pitch (by Spotify)
  5. find drum hits (kick / snare / hi-hat) on the drum track
  6. write MIDI + MusicXML (sheet music) per instrument

Everything for one song is written to cache/<song-id>/ and described in meta.json.
Run from the command line:  uv run splitter.py <youtube-link-or-audio-file>
"""
from __future__ import annotations

import hashlib
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
import time
import warnings
from pathlib import Path

warnings.filterwarnings("ignore")  # noisy library deprecation warnings
import contextlib
import io
import logging

logging.getLogger().setLevel(logging.ERROR)  # basic-pitch warns about backends we don't use

import numpy as np
import soundfile as sf

HERE = Path(__file__).resolve().parent
CACHE = HERE / "cache"
SR = 44100

# Display names, colours and how to transcribe each Demucs stem.
STEMS = {
    "vocals": dict(label="Vocals", color="#e4572e", mono=True, fmin=70, fmax=1400),
    "guitar": dict(label="Guitar", color="#f3a712", mono=False, fmin=75, fmax=1400),
    "piano": dict(label="Piano / Keys", color="#29bf12", mono=False, fmin=27, fmax=4200),
    "bass": dict(label="Bass", color="#2e86de", mono=True, fmin=30, fmax=400),
    "other": dict(label="Other", color="#a05ad2", mono=False, fmin=50, fmax=4200),
    "drums": dict(label="Drums", color="#8d99ae", mono=None, fmin=None, fmax=None),
}
ORDER = ["vocals", "guitar", "piano", "bass", "other", "drums"]
SILENT_DB = -32  # a track this far below the full mix is treated as "not in this song"


class Progress:
    """Reports overall progress (0..1) and a plain-language stage to a callback."""

    PLAN = [("download", 0.08), ("separate", 0.62), ("analyse", 0.05), ("notes", 0.22), ("write", 0.03)]

    def __init__(self, cb=None):
        self.cb = cb or (lambda frac, text: None)
        self.start = {}
        acc = 0.0
        for name, w in self.PLAN:
            self.start[name] = (acc, w)
            acc += w

    def __call__(self, stage: str, within: float, text: str):
        a, w = self.start[stage]
        self.cb(min(0.999, a + w * max(0.0, min(1.0, within))), text)


# ---------------------------------------------------------------- input ----

def ffmpeg_exe() -> str:
    try:
        import imageio_ffmpeg
        return imageio_ffmpeg.get_ffmpeg_exe()
    except Exception:  # fall back to a system ffmpeg
        exe = shutil.which("ffmpeg")
        if not exe:
            raise RuntimeError("ffmpeg not found")
        return exe


def to_wav(src: Path, dst: Path):
    subprocess.run(
        [ffmpeg_exe(), "-y", "-v", "error", "-i", str(src), "-vn", "-ac", "2", "-ar", str(SR), str(dst)],
        check=True,
    )


YT_RE = re.compile(r"(youtu\.be/|youtube\.com/|music\.youtube\.com/)")


def is_youtube(s: str) -> bool:
    return bool(YT_RE.search(s))


def youtube_id(url: str) -> str | None:
    m = re.search(r"(?:youtu\.be/|v=|/shorts/|/live/|/embed/)([A-Za-z0-9_-]{11})", url)
    return m.group(1) if m else None


def song_id_for(source: str) -> str:
    if is_youtube(source):
        vid = youtube_id(source)
        if vid:
            return "yt-" + vid
        return "url-" + hashlib.sha1(source.encode()).hexdigest()[:12]
    h = hashlib.sha1()
    with open(source, "rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    return "file-" + h.hexdigest()[:12]


def download_youtube(url: str, workdir: Path, prog: Progress) -> tuple[Path, str]:
    import yt_dlp

    def hook(d):
        if d.get("status") == "downloading":
            tot = d.get("total_bytes") or d.get("total_bytes_estimate") or 0
            if tot:
                prog("download", d.get("downloaded_bytes", 0) / tot, "Downloading audio from YouTube…")

    opts = {
        "format": "bestaudio/best",
        "outtmpl": str(workdir / "download.%(ext)s"),
        "noplaylist": True,
        "quiet": True,
        "no_warnings": True,
        "progress_hooks": [hook],
        "ffmpeg_location": ffmpeg_exe(),
        "max_filesize": 300 * 1024 * 1024,
    }
    with yt_dlp.YoutubeDL(opts) as ydl:
        info = ydl.extract_info(url, download=True)
        if info.get("duration") and info["duration"] > 20 * 60:
            raise RuntimeError("That video is longer than 20 minutes — please pick a single song.")
        files = list(workdir.glob("download.*"))
        if not files:
            raise RuntimeError("YouTube download produced no file.")
        return files[0], info.get("title") or "YouTube song"


# ------------------------------------------------------------ separation ----

def separate(wav_path: Path, out_dir: Path, prog: Progress) -> dict[str, np.ndarray]:
    import torch
    import demucs.apply as dapply
    from demucs.pretrained import get_model

    prog("separate", 0, "Loading the instrument-splitting AI (first time downloads ~80 MB)…")
    model = get_model("htdemucs_6s")
    model.eval()
    device = "cuda" if torch.cuda.is_available() else ("mps" if torch.backends.mps.is_available() else "cpu")

    y, sr = sf.read(str(wav_path), dtype="float32", always_2d=True)
    wav = torch.from_numpy(y.T.copy())
    ref = wav.mean(0)
    mean, std = ref.mean(), ref.std() + 1e-8
    wav = (wav - mean) / std

    # Demucs reports progress through tqdm; borrow it to drive our progress bar.
    real_tqdm = dapply.tqdm.tqdm

    class _Tqdm:
        def __init__(self, iterable, **kw):
            self.it = list(iterable)

        def __iter__(self):
            n = len(self.it)
            for i, x in enumerate(self.it):
                prog("separate", i / max(1, n), "Splitting the song into instruments…")
                yield x

    dapply.tqdm.tqdm = _Tqdm
    try:
        with torch.no_grad():
            try:
                out = dapply.apply_model(model, wav[None], device=device, split=True, overlap=0.25, progress=True)[0]
            except Exception:
                if device == "cpu":
                    raise
                out = dapply.apply_model(model, wav[None], device="cpu", split=True, overlap=0.25, progress=True)[0]
    finally:
        dapply.tqdm.tqdm = real_tqdm
    out = (out * std + mean).cpu().numpy()

    stems = {}
    for name, audio in zip(model.sources, out):
        stems[name] = audio.T  # (samples, 2)
        sf.write(str(out_dir / f"{name}.flac"), np.clip(audio.T, -1, 1), sr, subtype="PCM_16")
    return stems


# -------------------------------------------------------------- analysis ----

MAJOR = np.array([6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88])
MINOR = np.array([6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17])
NAMES_SHARP = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"]
NAMES_FLAT = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"]
# Keys conventionally written with flats (major tonic / minor tonic pitch classes).
FLAT_MAJOR = {5, 10, 3, 8, 1, 6}  # F Bb Eb Ab Db Gb
FLAT_MINOR = {2, 7, 0, 5, 10, 3}  # D G C F Bb Eb minor


def estimate_key(y_mono: np.ndarray, sr: int) -> dict:
    """Krumhansl–Schmuckler key finding on the pitched (non-drum) audio."""
    import librosa

    chroma = librosa.feature.chroma_cqt(y=y_mono, sr=sr, hop_length=4096)
    prof = chroma.sum(axis=1)
    if prof.sum() <= 0:
        return dict(tonic=0, mode="major", name="unknown", confidence=0.0, flats=False)
    scores = []
    for mode, tmpl in (("major", MAJOR), ("minor", MINOR)):
        for k in range(12):
            scores.append((np.corrcoef(prof, np.roll(tmpl, k))[0, 1], k, mode))
    scores.sort(reverse=True)
    r, k, mode = scores[0]
    flats = k in (FLAT_MAJOR if mode == "major" else FLAT_MINOR)
    name = (NAMES_FLAT if flats else NAMES_SHARP)[k] + (" major" if mode == "major" else " minor")
    return dict(tonic=int(k), mode=mode, name=name, confidence=round(float(r - scores[1][0]), 3), flats=flats)


def beat_grid(y_mono: np.ndarray, sr: int, duration: float) -> tuple[float, np.ndarray]:
    """Return tempo (BPM) and a beat-time grid that starts at or before 0 s and covers the song."""
    import librosa

    tempo, frames = librosa.beat.beat_track(y=y_mono, sr=sr, hop_length=256, units="frames")
    beats = librosa.frames_to_time(frames, sr=sr, hop_length=256)
    tempo = float(np.atleast_1d(tempo)[0])
    if len(beats) < 4 or tempo <= 0:
        tempo = tempo if tempo > 0 else 120.0
        period = 60.0 / tempo
        return tempo, np.arange(0, duration + period, period) - 0.0
    # Beat trackers often lock onto half the real tempo (e.g. kick-snare at 60 instead of 120).
    # Very few songs are notated below 70 BPM, so double the grid when that happens.
    while 60.0 / float(np.median(np.diff(beats))) < 70:
        beats = np.sort(np.concatenate([beats, (beats[:-1] + beats[1:]) / 2]))
    d = np.diff(beats)
    d = d[np.abs(d - np.median(d)) < 0.15 * np.median(d)]  # ignore skipped / doubled beats
    period = float(d.mean())
    tempo = 60.0 / period
    n_pre = int(np.ceil((beats[0] - 0.05) / period)) if beats[0] > 0.05 else 0  # extend back to ~0 s
    pre = beats[0] - period * np.arange(1, n_pre + 1)[::-1]
    post = beats[-1] + period * np.arange(1, int((duration - beats[-1]) / period) + 3)
    return tempo, np.concatenate([pre, beats, post])


def align_downbeats(grid: np.ndarray, y_low: np.ndarray, y_pitched: np.ndarray, sr: int) -> np.ndarray:
    """Shift the grid so beat 0, 4, 8… fall on bar downbeats ("one").

    Two clues, as a musician would use them: chords usually change on beat 1, and
    the kick drum / bass hit hardest there. We score each of the 4 possible bar
    phases on both, then pad the front of the grid with whole beats so that the
    winning downbeat lands on a multiple of 4.
    """
    import librosa

    if len(grid) < 9:
        return grid
    env = librosa.onset.onset_strength(y=y_low, sr=sr, hop_length=256, fmax=150, n_mels=16)
    frames = np.clip(librosa.time_to_frames(np.clip(grid, 0, None), sr=sr, hop_length=256), 0, len(env) - 1)
    strength = np.array([env[max(0, f - 2): f + 3].max() for f in frames])
    strength[grid < 0.1] = np.nan  # the first frames of a file always read as zero

    # harmonic change: how different the chord is just after each beat vs. just before it
    hop = 512
    chroma = librosa.feature.chroma_cqt(y=y_pitched, sr=sr, hop_length=hop)
    bf = np.clip(librosa.time_to_frames(np.clip(grid, 0, None), sr=sr, hop_length=hop), 0, chroma.shape[1] - 1)
    change = np.full(len(grid), np.nan)
    for i in range(1, len(grid) - 1):
        if grid[i - 1] < 0.1:
            continue
        before = chroma[:, bf[i - 1]: bf[i]]
        after = chroma[:, bf[i]: bf[i + 1]]
        if before.shape[1] == 0 or after.shape[1] == 0:
            continue
        u, v = np.median(before, axis=1), np.median(after, axis=1)
        change[i] = 1 - float(u @ v / (np.linalg.norm(u) * np.linalg.norm(v) + 1e-9))

    def phase_scores(x):
        if not np.isfinite(x).any():
            return np.zeros(4)
        x = x / (np.nanmean(x) + 1e-9)
        return np.array([np.nanmean(x[p::4]) if np.isfinite(x[p::4]).any() else 0 for p in range(4)])

    phase = int(np.argmax(phase_scores(strength) + 1.5 * phase_scores(change)))
    if phase == 0:
        return grid
    period = float(np.median(np.diff(grid)))
    pad = 4 - phase
    return np.concatenate([grid[0] - period * np.arange(pad, 0, -1), grid])


def level_db(x: np.ndarray, ref: np.ndarray) -> float:
    return float(20 * np.log10((np.sqrt(np.mean(x**2)) + 1e-9) / (np.sqrt(np.mean(ref**2)) + 1e-9)))


def drum_hits(drums: np.ndarray, sr: int) -> list[list]:
    """Find drum hits and label each as kick / snare / hihat by where its energy sits."""
    import librosa

    y = drums.mean(axis=1)
    if np.sqrt(np.mean(y**2)) < 1e-4:
        return []
    onsets = librosa.onset.onset_detect(y=y, sr=sr, hop_length=256, units="samples", backtrack=False, delta=0.08)
    win = int(0.06 * sr)
    freqs = np.fft.rfftfreq(win, 1 / sr)
    low, mid, high = freqs < 150, (freqs >= 150) & (freqs < 4000), freqs >= 6000
    peak = np.max(np.abs(y)) + 1e-9
    hits = []
    for s in onsets:
        seg = y[s : s + win]
        if len(seg) < win:
            break
        if np.max(np.abs(seg)) < 0.05 * peak:  # quiet bleed, not a real hit
            continue
        spec = np.abs(np.fft.rfft(seg * np.hanning(win))) ** 2
        e_low, e_mid, e_high = spec[low].sum(), spec[mid].sum(), spec[high].sum()
        tot = e_low + e_mid + e_high + 1e-12
        if e_low / tot > 0.55:
            kind = "kick"
        elif e_high / tot > 0.6 and e_low / tot < 0.05:  # cymbals: almost nothing in the lows
            kind = "hihat"
        else:
            kind = "snare"
        hits.append([round(s / sr, 3), kind, round(float(np.max(np.abs(seg)) / peak), 2)])
    return hits


def transcribe(path: Path, cfg: dict) -> tuple[list, object]:
    """Basic Pitch → list of [start_s, dur_s, midi, velocity 0..1], plus the PrettyMIDI object."""
    from basic_pitch.inference import predict

    with contextlib.redirect_stdout(io.StringIO()):  # silence "Predicting MIDI for…"
        _, midi, events = predict(
            str(path),
            onset_threshold=0.55 if cfg["mono"] else 0.5,
            frame_threshold=0.3,
            minimum_note_length=90,
            minimum_frequency=cfg["fmin"],
            maximum_frequency=cfg["fmax"],
            multiple_pitch_bends=False,
            melodia_trick=True,
        )
    notes = [[round(float(s), 3), round(float(e - s), 3), int(p), round(float(a), 2)] for s, e, p, a, _ in events]
    notes = [n for n in notes if n[3] >= 0.25]
    if cfg["mono"]:
        notes = monophonic(notes)
    notes.sort()
    return notes, midi


def monophonic(notes: list) -> list:
    """Keep one note at a time (the loudest when several start together) — for voice and bass."""
    notes = sorted(notes, key=lambda n: (n[0], -n[3]))
    out = []
    for n in notes:
        if out and n[0] - out[-1][0] < 0.05:
            continue  # same onset: the louder one is already kept
        if out and out[-1][0] + out[-1][1] > n[0]:
            out[-1][1] = round(n[0] - out[-1][0], 3)  # cut the previous note where this one starts
        out.append(list(n))
    return [n for n in out if n[1] > 0.04]


# ------------------------------------------------------------- notation ----

def sec_to_beats(t, grid: np.ndarray):
    return np.interp(t, grid, np.arange(len(grid), dtype=float))


def build_part(name: str, notes: list, grid: np.ndarray, key: dict, tempo: float):
    """Quantise notes to a 16th-note grid on the detected beats and build music21 parts."""
    from music21 import chord, clef, key as m21key, meter, note, stream, tempo as m21tempo, layout

    cfg = STEMS[name]
    # snap onsets/ends to 16ths (in beats = quarter notes)
    q = []
    for s, d, p, v in notes:
        b0 = round(float(sec_to_beats(s, grid)) * 4) / 4
        b1 = round(float(sec_to_beats(s + d, grid)) * 4) / 4
        q.append((b0, max(b1, b0 + 0.25), p, v))

    def spell(midi):
        from music21 import pitch

        p = pitch.Pitch(midi=midi)
        if key["flats"] and p.accidental is not None and p.accidental.name == "sharp":
            p = p.getEnharmonic()
        return p

    def make(stream_cls, items, clef_obj, first):
        part = stream_cls()
        part.partName = cfg["label"]
        part.insert(0, clef_obj)
        if first:
            part.insert(0, m21tempo.MetronomeMark(number=round(tempo)))
        part.insert(0, m21key.Key(NAMES_SHARP[key["tonic"]], key["mode"]) if key["name"] != "unknown" else m21key.KeySignature(0))
        part.insert(0, meter.TimeSignature("4/4"))
        groups: dict[float, list] = {}
        for b0, b1, p, v in items:
            groups.setdefault(b0, []).append((b1, p, v))
        onsets = sorted(groups)
        for i, b0 in enumerate(onsets):
            g = sorted(groups[b0], key=lambda x: -x[2])[:6]
            end = max(x[0] for x in g)
            if i + 1 < len(onsets):
                end = min(end, onsets[i + 1])
            dur = min(max(0.25, end - b0), 8.0)
            pitches = sorted({x[1] for x in g})
            el = note.Note(spell(pitches[0])) if len(pitches) == 1 else chord.Chord([spell(p) for p in pitches])
            el.quarterLength = dur
            part.insert(b0, el)
        return part

    if name == "piano":
        upper = [n for n in q if n[2] >= 60]
        lower = [n for n in q if n[2] < 60]
        rh = make(stream.PartStaff, upper, clef.TrebleClef(), True)
        lh = make(stream.PartStaff, lower, clef.BassClef(), False)
        return [rh, lh], layout.StaffGroup([rh, lh], name=cfg["label"], symbol="brace")
    med = float(np.median([n[2] for n in q])) if q else 60
    if name == "bass":
        c = clef.Bass8vbClef()  # bass guitar sounds an octave below written
    elif name == "guitar":
        c = clef.Treble8vbClef()  # guitar sounds an octave below written
    elif name == "vocals":
        c = clef.Treble8vbClef() if med < 57 else clef.TrebleClef()
    else:
        c = clef.BassClef() if med < 55 else clef.TrebleClef()
    return [make(stream.Part, q, c, True)], None


def write_musicxml(name: str, notes: list, grid, key, tempo, title, path: Path):
    from music21 import metadata, stream

    score = stream.Score()
    score.insert(0, metadata.Metadata(title=f"{title} — {STEMS[name]['label']}", composer="auto-transcribed"))
    parts, group = build_part(name, notes, grid, key, tempo)
    # every staff spans the same whole number of 4/4 bars, so piano hands line up
    end = max([p.highestTime for p in parts] + [4.0])
    end = float(np.ceil(end / 4) * 4)
    for p in parts:
        p.makeRests(refStreamOrTimeRange=[0.0, end], fillGaps=True, inPlace=True)
        score.insert(0, p)
    if group:
        score.insert(0, group)
    score = score.makeNotation()
    score.write("musicxml", fp=str(path))


def write_full_midi(meta: dict, path: Path):
    import pretty_midi

    pm = pretty_midi.PrettyMIDI(initial_tempo=meta["tempo"])
    programs = {"vocals": 52, "guitar": 25, "piano": 0, "bass": 33, "other": 48}
    for st in meta["stems"]:
        if st["name"] == "drums":
            inst = pretty_midi.Instrument(program=0, is_drum=True, name="Drums")
            for t, kind, v in st.get("hits", []):
                inst.notes.append(pretty_midi.Note(int(40 + 87 * v), {"kick": 36, "snare": 38, "hihat": 42}[kind], t, t + 0.1))
        else:
            inst = pretty_midi.Instrument(program=programs[st["name"]], name=st["label"])
            for s, d, p, v in st.get("notes", []):
                inst.notes.append(pretty_midi.Note(int(30 + 97 * min(1, v)), p, s, s + d))
        if inst.notes:
            pm.instruments.append(inst)
    pm.write(str(path))


# ------------------------------------------------------------------ main ----

def process(source: str, title: str | None = None, progress_cb=None, song_id: str | None = None) -> dict:
    """Run the full pipeline. `source` is a YouTube link or a path to an audio file."""
    prog = Progress(progress_cb)
    song_id = song_id or song_id_for(source)
    out = CACHE / song_id
    if (out / "meta.json").exists():
        return json.loads((out / "meta.json").read_text())
    tmp_out = CACHE / (song_id + ".partial")
    shutil.rmtree(tmp_out, ignore_errors=True)
    tmp_out.mkdir(parents=True)
    t_start = time.time()

    with tempfile.TemporaryDirectory() as td:
        work = Path(td)
        if is_youtube(source):
            prog("download", 0, "Contacting YouTube…")
            raw, yt_title = download_youtube(source, work, prog)
            title = title or yt_title
        else:
            raw = Path(source)
            title = title or Path(source).stem
        prog("download", 1, "Converting audio…")
        wav = work / "mix.wav"
        to_wav(raw, wav)

        mix, sr = sf.read(str(wav), dtype="float32", always_2d=True)
        duration = len(mix) / sr
        if duration < 3:
            raise RuntimeError("That audio is too short.")
        if duration > 20 * 60:
            raise RuntimeError("That audio is longer than 20 minutes — please pick a single song.")

        stems = separate(wav, tmp_out, prog)

    prog("analyse", 0.1, "Finding the tempo, beats and key…")
    import librosa

    mono = mix.mean(axis=1)
    pitched = sum(stems[n].mean(axis=1) for n in stems if n != "drums")
    # The beat is clearest on the drum track (as a musician would listen for it); fall back to the full mix.
    beat_src = stems["drums"].mean(axis=1) if level_db(stems["drums"], mix) > SILENT_DB else mono
    y22 = librosa.resample(beat_src, orig_sr=sr, target_sr=22050)
    tempo, grid = beat_grid(y22, 22050, duration)
    low = (stems["drums"] + stems["bass"]).mean(axis=1)
    grid = align_downbeats(grid, librosa.resample(low, orig_sr=sr, target_sr=22050),
                           librosa.resample(pitched, orig_sr=sr, target_sr=22050), 22050)
    key = estimate_key(librosa.resample(pitched, orig_sr=sr, target_sr=22050), 22050)

    meta = dict(
        id=song_id,
        title=title,
        source=source if is_youtube(source) else "uploaded file",
        duration=round(duration, 3),
        tempo=round(tempo, 1),
        key=key,
        beats=[round(float(b), 3) for b in grid],
        stems=[],
        created=time.strftime("%Y-%m-%d %H:%M"),
    )

    pitched_names = [n for n in ORDER if n != "drums"]
    for i, name in enumerate(ORDER):
        cfg = STEMS[name]
        db = level_db(stems[name], mix)
        st = dict(name=name, label=cfg["label"], color=cfg["color"], audio=f"{name}.flac",
                  level_db=round(db, 1), silent=db < SILENT_DB)
        if name == "drums":
            prog("notes", 1, "Finding drum hits…")
            st["hits"] = [] if st["silent"] else drum_hits(stems[name], sr)
        elif not st["silent"]:
            prog("notes", i / len(pitched_names), f"Reading the notes: {cfg['label']}…")
            notes, midi = transcribe(tmp_out / f"{name}.flac", cfg)
            st["notes"] = notes
            if notes:
                midi.write(str(tmp_out / f"{name}.mid"))
                st["midi"] = f"{name}.mid"
                try:
                    write_musicxml(name, notes, grid, key, tempo, title, tmp_out / f"{name}.musicxml")
                    st["musicxml"] = f"{name}.musicxml"
                except Exception as e:  # sheet music is a bonus; never fail the whole song for it
                    st["musicxml_error"] = str(e)[:200]
        meta["stems"].append(st)

    prog("write", 0.5, "Saving…")
    write_full_midi(meta, tmp_out / "all-instruments.mid")
    meta["midi_all"] = "all-instruments.mid"
    meta["seconds_to_process"] = round(time.time() - t_start)
    (tmp_out / "meta.json").write_text(json.dumps(meta))
    shutil.rmtree(out, ignore_errors=True)
    tmp_out.rename(out)
    prog("write", 1, "Done")
    return meta


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("usage: uv run splitter.py <youtube-link-or-audio-file>")
        sys.exit(1)

    def show(frac, text):
        print(f"\r{frac*100:5.1f}%  {text:<70}", end="", flush=True)

    m = process(sys.argv[1], progress_cb=show)
    print(f"\nSaved to {CACHE / m['id']}  —  {m['key']['name']}, {m['tempo']} BPM")
    for s in m["stems"]:
        extra = f"{len(s.get('notes', []))} notes" if s["name"] != "drums" else f"{len(s.get('hits', []))} hits"
        print(f"  {s['label']:<14} {s['level_db']:>6} dB  {'(silent)' if s['silent'] else extra}")
