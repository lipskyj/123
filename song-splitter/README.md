# 🎚️ Song Splitter

Paste a YouTube link (or pick an audio file) and get:

- **Each instrument on its own track**: vocals, guitar, piano/keys, bass, drums and "other". Play them together in a mixer with **mute**, **solo** and a **volume** per instrument, plus a **speed** control that slows the song down without changing the pitch, and **loop**.
- **The notes**: a scrolling piano roll for every instrument and drum hits (kick / snare / hi-hat), and **sheet music** that follows along as the song plays.
- **The song's key and tempo** (e.g. "A minor · 92 BPM").
- **Downloads**: each instrument's audio (FLAC), MIDI per instrument or all together, and MusicXML sheet music you can open and fix in the free [MuseScore](https://musescore.org).

Everything runs **on your own computer**. Nothing is uploaded anywhere except the YouTube download itself.

## Start it

| Your computer | What to do |
|---|---|
| **Windows** | Double-click `start-windows.bat`. If you see "Windows protected your PC", click **More info → Run anyway**. |
| **Mac** (M1 or newer) | Double-click `start-mac.command`. If macOS blocks it, right-click → **Open**. If it says "permission denied", open Terminal, type `bash ` (with a space), drag the file into the window and press Enter. |
| **Linux** | Run `./start-linux.sh` |

The first start installs everything it needs: about 1–2 GB on Windows/Mac (about 6 GB on Linux, where the AI library includes graphics-card support), a few minutes. It also needs an internet connection. After that it starts in seconds. Your browser opens **http://localhost:8765**. Keep the black terminal window open while you use it, and close it to stop.

*(Advanced: the scripts just install [uv](https://docs.astral.sh/uv/) and run `uv run server.py`. Options: `--port 9000`, `--no-browser`, and `--lan`, which lets a phone or tablet on the same Wi-Fi open it at `http://<your-computer's-IP>:8765`.)*

## How long does it take?

The first song also downloads the instrument-splitting AI (~80 MB). After that, a 4-minute song takes roughly **2–6 minutes** on a normal laptop (measured: 2½ minutes on a 4-core machine without a graphics card), and less with an NVIDIA graphics card. It needs about 3 GB of free memory while working. Each song is saved, so opening it again is instant.

## What to expect (honest limits)

- **Splitting** (Meta's *Demucs* AI) is very good but not perfect. You will sometimes hear a faint "ghost" of other instruments in a track. It only knows these 6 groups, so violins, horns, synths and so on all land in **Other**. Two guitars stay together on one track.
- **Notes** (Spotify's *Basic Pitch* AI) are a **draft**. Clear bass lines, piano and solo vocals come out mostly right. Busy, distorted or reverb-heavy parts have mistakes, and "Other" is the least reliable. In my tests on a synthetic song with known notes, it got 100% of the bass notes and about 80% of the melody notes.
- **Sheet music** assumes 4/4 time and rounds rhythms to 16th notes. The first beat of each bar is guessed from where the chords change and where the kick and bass hit, and can occasionally be off by a beat. Bass and guitar are written an octave higher than they sound, which is the standard convention (the little "8" under the clef).
- **Drums** are shown as hits (kick / snare / hi-hat), not full drum notation.
- **YouTube** changes often and sometimes breaks downloaders. If a link fails, update the downloader with `uv sync --upgrade-package yt-dlp` in this folder, or save the audio another way and use **Choose audio file**.
- Older **Intel Macs** aren't supported, because the AI library no longer ships for them.

## Please note

Downloading from YouTube is against YouTube's terms, and most songs are copyrighted. Use this for **personal study and practice** only. Don't publish or share split tracks or transcriptions of songs you don't own.

## Files

- `server.py` — the local web app (song list, progress, file serving)
- `splitter.py` — the processing pipeline. You can also run it alone: `uv run splitter.py <link-or-file>`
- `web/` — the page: mixer, piano roll and sheet music (OpenSheetMusicDisplay 2.2.1, BSD licence, in `web/vendor/`)
- `cache/` — your processed songs (not saved to git). Delete a song from the app, or delete this folder to free space.
