# Paper Traceability

**Status: partial.** The paper was not available (see `ENVIRONMENT_REPORT.md`). Commitments below are those stated in the build prompt (C1–C7 in `PRIMER_CONTRACT.md`) plus features described in the reference repository's whitepaper diagrams. When the paper is supplied, this table should be re-checked against it section by section.

| Commitment | Implemented in | Verified by |
| --- | --- | --- |
| C1 Educator authority | `states.js` (approve / reject / supersede), `authoring.js` (`build` refuses unapproved designs), design review UI | Unit tests "approval: …" (4); browser checks "no build button before approval", "educator approval recorded" |
| C1 Synthetic approval labelled | `approve()` maps a test actor to `test-approved`; "Test build" label in the student UI | Unit "test approval is labelled…"; browser "bundled experiences are listed and labelled as test builds" |
| C2 Meaningful student work | Runtime never emits material text in character lines; redirect on answer-seeking; cave shows observations only and requires a written field note | Unit "struggling learner…never the answer", "asking for the answer is declined"; browser "the cave shows observations but not the explanation" |
| C3 Preparation, Practice, Feedback | `runtime.js` phases; session journal | Unit "preparation, practice and feedback are connected…" |
| C4 Productive friction | Interview questions on character goal, stakes and difficulty; `harder` follow-ups; misconception probes | Unit "adaptation raises challenge only on evidence", "a stated misconception is probed once" |
| C5 Goal-bound adaptation | Every adaptation record carries `goalRef` (criterion or misconception id) and evidence ids | Unit "adaptation…stays tied to an approved criterion"; `validateSession` |
| C6 Evidence-grounded feedback | `buildFeedback`: citations by turn id, "Inference:" labels, `notAssessed` | Unit "feedback cites only text the learner actually wrote", "criteria…never had a chance at are reported as not assessed" |
| C7 Traceability | `authoring.trace`, design history, sessions view | Unit "trace links design elements to educator input"; browser "teacher can trace evidence and adaptations" |
| Reference: intake interview → design → review → build | `authoring.js` flow | Browser test teacher path |
| Reference: Roleplay and Teachback templates | `provider.derive()` branches on template | Both fixtures |
| Reference: session journal | `session.journal` | Unit phase test |
| Reference: voice, images, class analytics | Not implemented | — |
