# Primer (browser edition)

Primer lets a teacher turn a lesson into a practice experience for students, and keeps the teacher in charge of what gets built.

- **Teacher:** describe the lesson, paste the material, answer a few questions one at a time, review the proposed design, change it, then approve or reject it.
- **Student:** prepare, practise with a character who responds to what they write (optionally after field work in a 3D cave), then get feedback that quotes their own words.

Only an approved design can be opened by students.

## Start it

No install or build step. From the repository root:

```sh
python3 -m http.server 8000
```

Then open <http://localhost:8000/primer/> (the repository root page is unrelated to Primer). Choose **I'm a teacher** or **I'm a student**.

On GitHub Pages the same files are served at `/<repo>/primer/`.

## Run the tests

```sh
cd primer
node --test tests/primer.test.mjs                 # engine tests (Node 22+)
node tests/e2e.mjs http://localhost:8000/primer/  # browser test; needs Playwright and the server above
node tools/build-fixtures.mjs                     # rebuild the two bundled sample experiences
node tools/build-status.mjs                       # regenerate BUILD_STATUS.html from the records
```

## What is in the folder

| Path | What it is |
| --- | --- |
| `index.html`, `author.html`, `learn.html` | Landing page, teacher workspace, student page |
| `world-cave.html` | The 3D cave field site used when a teacher chooses that setting (assets in `../cave-world/`) |
| `src/` | The engine: schemas, design states, provider, authoring, runtime, storage |
| `app/` | Interface code and styles |
| `fixtures/` | Two teacher briefs from different subjects, used as acceptance fixtures |
| `experiences/` | The sample experiences built from those briefs (test-approved, labelled "Test build") |
| `tests/`, `records/` | Tests and their recorded results, transcripts and validation reports |
| `docs/` | Contract, design, traceability and test documentation |
| `BUILD_STATUS.html` | Operator dashboard |

## Status

**Blocked, not complete.** The teacher workflow, approval, privacy, the three learner phases and traceability work. Feedback is not yet trustworthy: an independent evaluation found that it can mistake stating a misconception for rejecting it, and miss correct work phrased in unexpected words (see `docs/END_TO_END_VALIDATION.md`). Do not use it with real students yet.

### To resume

1. Add a language-model provider in `src/provider.js` implementing `assess`, `line` and `reviseDesign` (keep `DeterministicProvider` as the fallback and `ReplayProvider` for tests). The runtime and authoring code call the provider synchronously today, so they need to become async.
2. Provide an API key. GitHub Pages cannot keep a key secret, so either run a small server that holds the key or let each teacher paste their own key into the browser.
3. Rerun `node tools/replay-sessions.mjs` and the engine and browser tests, then a fresh independent evaluator using `records/validation/` as evidence.

## Limits you should know about

- **No language model.** Responses come from a rule-based provider that matches a student's words against the teacher's criteria. It is predictable and private, and it is also literal: it can miss a correct answer phrased in unexpected words. See `docs/SYSTEM_DESIGN.md`.
- **No accounts or server.** Everything is stored in the browser that created it. A teacher shares an experience by sending its downloaded file; students open it on the student page. A teacher only sees sessions recorded in their own browser.
- **Sample experiences are test builds.** Their approval is synthetic and labelled as such. No real teacher, student or classroom has validated anything here.
