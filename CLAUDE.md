# Project notes for Claude

## About the user
At the start of every non-trivial task, load the `orchestrator` skill and follow it.
The user is not a professional developer and does not want to remember
commands, workflows or checklists. **You are responsible for the process.**
Do all of the steps below automatically, without being asked, and without
telling the user to run slash commands. Explain things in plain language.

## What's here
- `cave-world/` — "Cave Field Work", a first-person educational cave game.
  Plain HTML + ES modules, no build step. Three.js and Spark (Gaussian splats,
  `cave.spz`) are vendored in `cave-world/vendor/` via an import map.
  - `index.html` — UI, styles, game loop, controls (desktop + touch)
  - `pois.js` — tools, points of interest, "wrong tool" feedback (science must stay accurate)
  - `audio.js` — procedural Web Audio music and SFX (no audio files)
- `index.html` (root) — "Helios Breach", a single-file WebGL arena shooter (exported from a Claude artifact; ~2.2 MB, self-contained). Served at the GitHub Pages root.
- `song-splitter/` — "Song Splitter": paste a YouTube link / audio file → 6 instrument stems
  (Demucs htdemucs_6s), notes (Basic Pitch, ONNX), key/tempo/downbeats (librosa), MIDI +
  MusicXML (music21); local web app with synced mixer, piano roll, sheet music (vendored OSMD).
  **Exception to the buildless rule**: it needs Python ML packages, managed by `uv` (`pyproject.toml`
  + `uv.lock`, Python 3.11). Run: `cd song-splitter && uv run server.py`. Test audio is synthesized
  (sines + noise drums with known notes) — never commit copyrighted audio; `cache/` is gitignored.
- `problem-solver/index.html` — older "Educational Problem Solver" React demo (moved from root), unrelated.

## How to run
Serve the repo statically, e.g. `python3 -m http.server 8000`, then open
`http://localhost:8000/cave-world/`. Opening the file directly won't work (ES modules).

## Automatic workflow (do this every time, unprompted)
1. **Before building anything non-trivial**, follow `.claude/skills/kickoff`:
   ask the 3–7 questions an expert would ask, each with a recommended default,
   and list "things you might not have considered". If the user says "you
   decide" or doesn't care, pick the defaults and go.
2. **Plan** briefly for anything touching more than one area.
3. **Use expert judgment the user doesn't have**: when you notice a better
   approach, a risk, a missing feature players would expect, or a mistake in
   the user's idea, say so in one or two lines — don't silently comply.
4. **Verify for real** before saying done — follow `.claude/skills/ship-check`:
   run the game in headless Chromium, check console errors, screenshot desktop
   and phone, look at the screenshots, exercise the changed feature.
5. **Review your own diff** for bugs before committing. For larger changes,
   consult the advisor (if available) before declaring done.
6. **Report honestly**: what was verified, what wasn't, what's left.
7. **Learn**: when the user corrects you or a gotcha appears, add one line to
   "Lessons" below yourself, and mention you did.
8. **Proactively suggest the next most valuable improvement** at the end of a
   task (one line). Every few sessions, run a `.claude/skills/blindspots`
   review on your own initiative and share the top 3 findings.

## Rules
- Keep it dependency-free and buildless; vendor any new library with an exact version.
- Must work on phones (touch joystick + USE button) and desktop (mouse/keys).
- Game science (geology, archaeology, cave conservation) must be correct.
- Keep `cave.spz` and other large assets as they are unless asked.
- Ask before anything destructive or irreversible (deleting work, force pushes).

## Lessons
<!-- One line each: what went wrong / what to always do. Newest at the bottom. -->
- In the cloud container, headless Chromium loads the game with no console errors, but `page.screenshot` hangs (software WebGL + 32 MB splat), even with rAF frozen. Check load + console errors there and report "visuals not verified"; real visual checks need a GPU machine or the user's phone.
- Song Splitter in the cloud container: YouTube is blocked (test with uploaded/synthesized audio); Demucs weights come from dl.fbaipublicfiles.com (allowed in the env); download.pytorch.org is blocked, so torch comes from PyPI. basic-pitch hard-requires TensorFlow on Linux — overridden away in pyproject (it runs on ONNX).
- Beat/downbeat gotchas: beat trackers lock to half tempo (double below 70 BPM); the first frames of a file read as zero onset strength (exclude t<0.1 s); kick on 1 & 3 can't pick "beat 1" alone — chord changes decide it.
