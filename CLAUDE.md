# Project notes for Claude

## What's here
- `cave-world/` — "Cave Field Work", a first-person educational cave game.
  Plain HTML + ES modules, no build step. Three.js and Spark (Gaussian splats,
  `cave.spz`) are vendored in `cave-world/vendor/` via an import map.
  - `index.html` — UI, styles, game loop, controls (desktop + touch)
  - `pois.js` — tools, points of interest, "wrong tool" feedback (science must stay accurate)
  - `audio.js` — procedural Web Audio music and SFX (no audio files)
- `index.html` (root) — older "Educational Problem Solver" React demo, unrelated to the game.

## How to run
Serve the repo statically, e.g. `python3 -m http.server 8000`, then open
`http://localhost:8000/cave-world/`. Opening the file directly won't work (ES modules).

## How we work (always)
1. **Unclear or bigger request?** Ask me the questions an experienced game
   developer would ask *before* coding. Say what I might be missing.
2. **Plan first** for anything touching more than one area: approach,
   alternatives, risks. Keep it short.
3. **Explain trade-offs in 1–2 lines** when you choose something, so I learn.
4. **Verify for real**: run the game in a headless browser, check the console
   for errors, take screenshots at desktop *and* phone size (touch controls).
5. **Before saying "done"**: review the diff for bugs, and list anything you
   didn't check or aren't sure about.
6. **Record lessons**: when I correct you or we discover a gotcha, add one line
   to "Lessons" below.

## Rules
- Keep it dependency-free and buildless; vendor any new library with an exact version.
- Must work on phones (touch joystick + USE button) and desktop (mouse/keys).
- Game science (geology, archaeology, cave conservation) must be correct.
- Keep `cave.spz` and other large assets as they are unless asked.

## Lessons
<!-- One line each: what went wrong / what to always do. Newest at the bottom. -->
