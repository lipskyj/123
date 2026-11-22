"""Drum sheet music: turn detected drum hits into a standard 5-line drum staff.

Positions follow common drum-notation convention: kick = bottom space (F4),
snare = third space (C5), closed hi-hat = ✕ notehead above the staff (G5).
"""
from __future__ import annotations

from pathlib import Path

import numpy as np

DRUM_MAP = {
    # kind: (display step, octave, notehead, music21 instrument class name, GM drum note)
    "kick": ("F", 4, "normal", "BassDrum", 36),
    "snare": ("C", 5, "normal", "SnareDrum", 38),
    "hihat": ("G", 5, "x", "HiHatCymbal", 42),
}


def write_drum_musicxml(hits: list, grid: np.ndarray, tempo: float, title: str, path: Path):
    from music21 import clef, instrument, metadata, meter, note, percussion, stream
    from music21 import tempo as m21tempo

    beats_of = lambda t: float(np.interp(t, grid, np.arange(len(grid), dtype=float)))
    groups: dict[float, set] = {}
    for t, kind, _v in hits:
        q = round(beats_of(t) * 4) / 4  # nearest 16th note
        groups.setdefault(q, set()).add(kind)

    part = stream.Part()
    part.partName = "Drums"
    part.insert(0, instrument.UnpitchedPercussion())
    part.insert(0, clef.PercussionClef())
    part.insert(0, m21tempo.MetronomeMark(number=round(tempo)))
    part.insert(0, meter.TimeSignature("4/4"))

    def drum_note(kind):
        step, octave, head, inst, midi = DRUM_MAP[kind]
        u = note.Unpitched(displayName=f"{step}{octave}")
        u.notehead = head
        u.stemDirection = "up"
        return u

    onsets = sorted(groups)
    for i, b0 in enumerate(onsets):
        gap = (onsets[i + 1] - b0) if i + 1 < len(onsets) else 1.0
        dur = max(0.25, min(1.0, gap))  # drums are short: at most a quarter note, rest after
        kinds = sorted(groups[b0], key=lambda k: ["hihat", "snare", "kick"].index(k))
        el = drum_note(kinds[0]) if len(kinds) == 1 else percussion.PercussionChord([drum_note(k) for k in kinds])
        el.quarterLength = dur
        part.insert(b0, el)

    end = float(np.ceil(max(part.highestTime, 4.0) / 4) * 4)
    part.makeRests(refStreamOrTimeRange=[0.0, end], fillGaps=True, inPlace=True)
    score = stream.Score()
    score.insert(0, metadata.Metadata(title=f"{title} — Drums", composer="auto-transcribed"))
    score.insert(0, part)
    score = score.makeNotation()
    score.write("musicxml", fp=str(path))
    add_drum_instruments(path)


def add_drum_instruments(path: Path):
    """Tell notation programs (MuseScore etc.) which drum sound each staff position is.

    MusicXML does this with <score-instrument>/<midi-unpitched> entries plus an
    <instrument> reference on every note; music21 doesn't write them for us.
    """
    import re

    xml = path.read_text()
    m = re.search(r'<score-part id="([^"]+)">', xml)
    if not m:
        return
    pid = m.group(1)
    by_pos = {(step, octave): (kind, midi) for kind, (step, octave, _h, _i, midi) in DRUM_MAP.items()}
    names = {"kick": "Bass Drum", "snare": "Snare Drum", "hihat": "Closed Hi-Hat"}
    decl = "".join(
        f'<score-instrument id="{pid}-I{midi}"><instrument-name>{names[kind]}</instrument-name></score-instrument>'
        for kind, (_s, _o, _h, _i, midi) in DRUM_MAP.items()
    ) + "".join(
        # MusicXML counts MIDI channels and drum keys from 1, General MIDI from 0
        f'<midi-instrument id="{pid}-I{midi}"><midi-channel>10</midi-channel><midi-unpitched>{midi + 1}</midi-unpitched></midi-instrument>'
        for _k, (_s, _o, _h, _i, midi) in DRUM_MAP.items()
    )
    # replace whatever instrument declarations music21 wrote with ours
    xml = re.sub(r'(<score-part id="[^"]+">.*?)(</score-part>)',
                 lambda mm: re.sub(r"<score-instrument.*?</score-instrument>|<midi-instrument.*?</midi-instrument>", "",
                                   mm.group(1), flags=re.S) + decl + mm.group(2),
                 xml, count=1, flags=re.S)

    def tag_note(mm):
        note = mm.group(0)
        u = re.search(r"<display-step>(\w)</display-step>\s*<display-octave>(\d)</display-octave>", note)
        if not u or (u.group(1), int(u.group(2))) not in by_pos:
            return note
        note = re.sub(r"\s*<instrument id=\"[^\"]*\"\s*/>", "", note)
        midi = by_pos[(u.group(1), int(u.group(2)))][1]
        # <instrument> goes right after <duration> (and any <tie>) in a MusicXML note
        return re.sub(r"(</duration>(?:\s*<tie [^>]*/>)*)", rf'\1<instrument id="{pid}-I{midi}"/>', note, count=1)

    xml = re.sub(r"<note\b.*?</note>", tag_note, xml, flags=re.S)
    path.write_text(xml)
