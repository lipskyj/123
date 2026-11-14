---
name: ship-check
description: Pre-push checklist - run the game for real, check console errors and phone/desktop screenshots, review the diff for bugs, and report what was and wasn't verified. Use when the user runs /ship-check or before committing/pushing changes.
---

# Ship check

1. `git diff` (and untracked files): summarize what changed in 3 bullets.
2. Serve the repo (`python3 -m http.server 8000`) and open
   `/cave-world/` in headless Chromium (Playwright). Collect console errors and
   failed requests.
3. Screenshot at desktop (1280x800) and a phone (iPhone emulation). Look at them:
   UI overlapping, text cut off, touch controls visible on phone.
4. Exercise the changed feature if possible (keys/clicks), not just page load.
5. Review the diff for bugs: edge cases, things that break on touch devices,
   performance in the render loop, leftover debug code.
6. Report: ✅ verified, ⚠️ problems found (with fixes or proposed fixes),
   ❓ not verified and why. Only call it "ready" if nothing is ⚠️.
7. If a gotcha came up, propose a one-line addition to `CLAUDE.md` → Lessons.
