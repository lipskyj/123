# Cold Build Review

A fresh agent with no prior context was given only the build directory and the README. It started the system, authored its own experience ("Why the Moon has phases", teachback), played it as a student, played and stopped a sample, and checked the approval gate. It then read only `PRIMER_CONTRACT.md` for a separate conformance pass. Full report: `records/validation/cold-build-audit.md`.

An earlier attempt was stopped by a model usage limit before it wrote anything; the review below is from the complete rerun.

## Black-box result

- **Startup:** worked as documented. All Primer pages loaded with no console errors.
- **Hesitations and terminology:** "Teachback"; "Approve for testing only"; "look-fors"; "Words that count as evidence"; the repository root page is unrelated to Primer.
- **Verdict:** both paths work end to end, but the student-facing core was not ready for classroom use.

## Findings and what was done

| # | Severity | Finding | Status |
| --- | --- | --- | --- |
| 1 | major | Character ignored what the student wrote; asked again about criteria already shown | **Repaired (repair 4):** answers to another criterion are acknowledged and that criterion is skipped later; regression test "evidence for another criterion is acknowledged…" |
| 2 | major | Common words over-credited; warm-up answers counted as evidence | **Repaired:** criterion-specific hit required; preparation answers recorded as prior knowledge only; regression test |
| 3 | major | Character questions read as keyword lists | **Repaired:** generic, sequenced questions that the teacher is prompted to rewrite per criterion |
| 4 | major | Teacher's third-person description pasted into first-person speech; lowercased name | **Repaired:** no teacher description is spoken; names are not lowercased; regression test |
| 5 | major | Sample feedback ignored relevant work and leaked hidden words | **Repaired:** phrase matching; growth text no longer lists evidence words; regression test |
| 6 | minor | "Pasted material" shown to students | Repaired: shown as "Course material"; source label removed from key points |
| 7 | minor | Raw ids and engine wording on teacher screens | Repaired for trace table and history ("Criterion 1", "Primer") |
| 8 | minor | System instructions show raw values | Kept, in a collapsed "advanced" section, by design for traceability |
| 9 | minor | Stale "Primer decided" note after the teacher supplied the value | Repaired: notes are dropped once the field comes from the teacher |
| 10 | minor | Generic stakes did not fit a teachback | Repaired: separate default for teachback |
| 11 | minor | Time estimate ignored the classroom constraint | Repaired: students are told the reply limit instead; the teacher can set it |
| 12 | minor | Key anti-misconception sentence not highlighted | Partly: highlighted sentences are now editable by the teacher; automatic choice unchanged |
| 13 | minor | Broken link in BUILD_STATUS | Repaired |
| 14 | minor | Form errors listed in one block | Open |
| 15 | minor | Doubled punctuation in quoted self-assessment | Repaired |
| 16–17 | note | Unrelated repo root page; test counts disagree | README now says the root page is unrelated; counts come from the records |
| 18–20 | note | Same name in both samples; "BATNA" unglossed; feedback section collapsed | Feedback section open by default; the rest open |

## Conformance pass (auditor's judgement, before repair 4)

| Commitment | Judgement |
| --- | --- |
| C1 Educator authority | Holds |
| C2 Meaningful student work | Partly holds |
| C3 Preparation, Practice, Feedback | Holds |
| C4 Productive friction | Partly holds |
| C5 Goal-bound adaptation | Fails as observed |
| C6 Evidence-grounded feedback | Partly holds |
| C7 Traceability | Holds |

These judgements were made on the build before repair 4. The repairs target C5, C2, C4 and C6. Whether they succeed is checked by the simulated students and the independent evaluator; this review does not claim it.
