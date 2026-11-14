---
name: blindspots
description: Audit the project (or a given area) for unknown unknowns - what an expert would say is missing, risky, or likely to break - and turn findings into a prioritized list. Use when the user runs /blindspots or asks "what am I missing".
---

# Blind-spot review

Look at the project (or the area named in the arguments) as three experts would:
an experienced **game developer**, a **web performance/compatibility** engineer,
and a **domain expert** for the content (here: cave science and education).

1. Read `CLAUDE.md`, then the relevant code. Run the game in a headless browser
   if useful (console errors, desktop + phone screenshots).
2. For each expert, list what they would flag: bugs, missing features players
   expect, performance, mobile/touch, accessibility, loading, browser support,
   content accuracy, maintainability.
3. Output a single table, most important first:
   `# | Finding | Why it matters | Effort (S/M/L) | Evidence (file:line or screenshot)`
   Mark anything you couldn't verify as "unverified".
4. End with: the top 3 to do next, and one line per lesson worth adding to
   `CLAUDE.md` → Lessons (ask before adding).
Do not change code in this skill.
