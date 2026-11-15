---
name: kickoff
description: Start a new feature or change the right way - interview the user about hidden decisions, surface unknown unknowns, and agree a short plan before writing any code. Use when the user runs /kickoff or describes a new feature.
---

# Kickoff

Goal: make the decisions the user doesn't know exist visible *before* code is written.

1. Read `CLAUDE.md` and the files the request touches.
2. Restate the request in one sentence.
3. Ask **3–7 questions** an experienced developer in this domain would ask.
   Prefer questions whose answer changes what gets built (scope, platform,
   controls, performance, accessibility, edge cases, how we'll know it works).
   Offer a recommended default for each so the user can just say "defaults".
4. List **"Things you might not have considered"** — 3–5 risks or opportunities,
   one line each.
5. After answers, write a short plan: steps, files touched, how it will be
   verified (browser run + screenshots desktop/phone), and what is out of scope.
6. Wait for a go-ahead only if the plan changes something big or irreversible;
   otherwise proceed.
