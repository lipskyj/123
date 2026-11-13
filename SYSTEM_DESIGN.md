# System Design

## Components

```
Educator ──► intake.js ──► design.js ──(approve)──► compile.js ──► experience package (JSON)
             interview     decisions+derived   gate        immutable      │
             materials     versions/diffs                                 ▼
                                                     Learner ──► runtime.js (Preparation → Practice → Feedback)
                                                                   │ evidence, events, transcript, inputs
                                                                   ▼
                                                     store.js (atomic JSON) ──► /trace, /replay ──► Educator
providers/: deterministic (default) | anthropic — voice character moves only, output guarded
```

| Module | Responsibility |
|---|---|
| `src/intake.js` | Ordered consequential questions with "why I'm asking". One follow-up for thin answers; required skips are challenged once, then become assumptions. Template recommendation from the described student work. Materials ingestion and key-phrase suggestions. |
| `src/design.js` | `interpret()` turns intake into **decisions** with **provenance** and **assumptions**. `build()` is a pure derivation of the preparation briefing (with material excerpts), retrieval questions, practice challenges (misconceptions first), learner-facing text and model prompts. `revise()` handles direct edits or plain-language requests (deterministic parser, reports anything it couldn't interpret), validates, versions and supersedes. `transition()` handles approve/reject/return. |
| `src/compile.js` | Refuses anything not `educator-approved` / `test-approved` (HTTP 403). Produces a validated, immutable package with `testOnly` tied to the approval kind. |
| `src/runtime.js` | Learner engine. Phase gating, retrieval with cues, practice challenge loop, help-request refusal, graduated hints, stretch, misconception endorsement detection (with refutation guard), opportunity tracking, evidence scanning, feedback generation, deterministic replay, learner-safe view. |
| `src/providers/` | `deterministic` (no model) and `anthropic` (Messages API). The runtime's `voice()` wrapper rejects outputs that reveal look-fors the learner hasn't said, and falls back on errors (recorded as events). |
| `src/store.js` | JSON files under `PRIMER_DATA_DIR`, written atomically (temp file + rename). |
| `src/server.js` | HTTP API, per-record serialization locks, optional educator key, static UI, `/status`. |

## Data model (abridged)

- **Project**: `intake.answers{field:{text,turnId}}`, `transcript[]`, `materials[]`, `designs[]`, `log[]`.
- **Design version**: `status ∈ {draft, revised, test-approved, educator-approved, rejected, superseded}`, `decisions`, `derived`, `provenance{field:{source: educator|ai|materials, ref, note}}`, `assumptions[]`, `changes[]` (diff from parent), `approval{by, at, kind: educator|test, label}`, `rejection`, `returns[]`.
- **Decisions**: `title, topic, learners, objective, prior, template, constraints, concepts[{id,label,lookFors,minMatches}], misconceptions[{id,text,correction,conceptId}], criteria[{id,text,lookFors,minMatches,conceptIds}], character{name,description,goal}, learnerRole, stakes, difficulty, adaptation{supportAfterMisses,maxMissesPerChallenge,stretchAfterSuccesses,minWordsForCredit}, practiceTurns`.
- **Experience package** (`primer.experience/1`): `designId, designVersion, approval, testOnly, learner{…}, engine{concepts, misconceptions, criteria, briefing, retrieval, challenges, adaptation, character}, prompts, provenance`.
- **Session**: `phase, prep, practice{chIndex, misses, successes, support, stretchActive, status{}}, transcript[], evidence[{kind: observation|retrieval|challenge|misconception|activation|self-assessment|transfer, turnId, criterionIds, quote}], opportunities[], events[{type: adaptation|help-request|misconception-endorsed|challenge-resolved|…, rule, turnId}], feedback, inputs[]` (for replay).

## Design state machine

```
draft ──revise──► revised ──revise──► revised …   (previous open version → superseded)
  │                  │
  ├─approve─► educator-approved / test-approved ──build──► package
  ├─return (note)──► revision attempted from the note; note kept on the version
  └─reject──► rejected (terminal; also allowed after approval = withdraw: new sessions blocked)
```

## Runtime rules (all values come from the approved design)
- **Preparation**: activation (recorded, not assessed) → one retrieval question per key idea (max 4). Credit = the concept's look-fors (≥ `minMatches`) in ≥ 5 words. Otherwise one cue (never the answer), then move on and record "not-yet".
- **Practice**: challenges in order. Credit = the challenge concept's look-fors, ≥ `minWordsForCredit` words, plus a reasoning marker if stretch is active. A miss → in-character pushback. After `supportAfterMisses` misses → a coach hint at the next level (1–3). After `maxMissesPerChallenge` → record "not-yet" and move on. Every `stretchAfterSuccesses` successes → stretch. A help request → refusal plus hint. Practice ends when the challenges are exhausted, at `practiceTurns`, or when the learner wraps up (≥ 2 turns).
- **Feedback**: per criterion, `demonstrated` (practice evidence) / `partially` (preparation only) / `not-yet` (had an opportunity, no evidence) / `not-assessed` (no opportunity). It cites quotes, labels inferences, lists misconception growth areas, compares against the self-assessment, then asks the transfer question → end.

## API (educator routes require `x-educator-key` if `PRIMER_EDUCATOR_KEY` is set)
`POST /api/projects` · `GET /api/projects/:id` · `POST …/answer` · `POST|DELETE …/materials` · `POST …/design` · `POST …/designs/:did/{revise|approve|reject|return|build}` · `GET /api/packages/:id[/sessions]` · `GET /api/sessions/:id[/trace]` · `POST /api/sessions/:id/replay` · learner: `GET /api/learn/:pkg` · `POST /api/learn/:pkg/sessions` · `GET /api/learn/sessions/:sid` · `POST …/message` · `POST …/advance`.
