# Test Report

Results come from `records/unit-results.txt`, `records/e2e/e2e-results.json` and `records/validation/`. The dashboard (`BUILD_STATUS.html`) reads the same files.

## Automated tests

| Suite | Command | Result |
| --- | --- | --- |
| Engine | `node --test tests/primer.test.mjs` | 25 of 25 pass |
| Browser | `node tests/e2e.mjs <baseUrl>` | 30 of 30 pass |

The browser run plays three complete paths on the real pages: a teacher authoring the MBA brief (including a refused empty form, a natural-language revision, a direct edit, approval and build); a strong student in that experience (including a request for the answer and a page reload mid-session); and a weak student in the bundled cave experience using the 3D field site. Transcripts are saved in `records/e2e/`.

In the cave path the 3D render loop is switched off and tools are used through the page's own functions, because software rendering here takes about 30 seconds per frame. Walking and aiming in 3D are therefore not covered by this test; they were covered earlier for the cave game the page is derived from.

## Before and after for defects found by testing

| Defect | Evidence before | Repair | After |
| --- | --- | --- | --- |
| Correct statements flagged as a listed misconception | Unit tests 14, 20, 25 failed: a correct explanation of stalactites triggered the "made of ice" probe | Require a word distinctive to the misconception | Tests pass; "made of ice" still triggers the probe (browser check "stated misconception appears…") |
| Non-reproducible character name | Unit test 24 failed on replay comparison | Seed from title and objective | Passes |
| Skipped transfer question not disclosed | Browser check "skipped question is listed as a decision Primer made" failed | Recorded as an assumption | Passes |
| Field note credited to the wrong criterion | Note about the acid test also credited the stalactite criterion via "water, calcite, limestone" | Require a criterion-specific look-for | Stalactite criterion now appears under "Where to grow" for that student |

## Independent validation

See `END_TO_END_VALIDATION.md` and `COLD_BUILD_REVIEW.md`.

## Not tested

Real teachers, students or classrooms; learning outcomes; any language model; screen readers; phones; other browsers than Chromium; long sessions; storage limits.
