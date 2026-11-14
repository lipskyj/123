# End-to-End Validation

All participants were simulated by fresh AI agents that did not share the builder's context or expected answers. **Nothing here is real teacher, student, classroom or efficacy validation.**

## Participants and outcomes

| Round | Participant | Build | Outcome | Record |
| --- | --- | --- | --- | --- |
| 1 | Fresh teacher 1 — own statistics brief (p-values), chosen without the builder's knowledge | v1 | Completed intake, interview, review, revision, approval, build. Approval enforced. 2 blocking, 8 major findings. Would not use with a class. | `records/validation/fresh-teacher-report.md` |
| 2 | Fresh teacher 2 — same brief, re-check | after repair 3 | 11 of 21 findings fixed, 8 partly. New: 1 blocking, 4 major. Would not use yet. | `records/validation/fresh-teacher-recheck.md` |
| 2 | Cold-build auditor — own "Moon phases" teachback | after repair 3 | Starts from README; both paths work. 5 major. Contract: C5 fails as observed. | `records/validation/cold-build-audit.md` |
| 3 | Student Maya (diligent), statistics | after repair 4 | Did the work herself. Feedback misattributed quotes; one follow-up repeated. | `records/validation/student-maya-*` |
| 3 | Student Leo (holds both misconceptions), statistics | after repair 4 | Beliefs noticed, but stating them was recorded as correcting them; a wrong claim credited as mastery. | `records/validation/student-leo-*` |
| 3 | Student Sam (answer-seeker), negotiation sample | after repair 4 | Never given the answer. Character had no case facts; his real work was not credited. | `records/validation/student-sam-*` |
| 4 | Independent evidence evaluator | after repair 5 | **Not ready for students.** C6 fails; 2 blocking, 6 major. | `records/validation/independent-evaluation.md` |
| — | Replays of the three students' replies | after repair 6 | See below. Replies are fixed text written for an earlier build. | `records/validation/replay-*-session.json` |

## Independent evaluator's verdict (build after repair 5)

| Commitment | Verdict |
| --- | --- |
| C1 Educator authority | Holds, with a gap in withdrawal |
| C2 Meaningful student work | Partly holds |
| C3 Preparation, Practice, Feedback | Holds |
| C4 Productive friction | Partly holds |
| C5 Goal-bound adaptation | Partly holds |
| C6 Evidence-grounded feedback | **Fails** |
| C7 Traceability | Partly holds |

Blocking: stated misconceptions credited as mastery; misconceptions the learner held missed and reported as corrected.
Major: criteria graded without a reply; correct work missed or misfiled; "already asked" skipped the work; withdrawal did not stop sessions in progress; the dashboard claimed repairs the replays did not show; character lines undermined the scenario.

## Repair 6 and what the replays show afterwards

Fixed and covered by regression tests (48 engine tests): criteria never answered are "not assessed"; bare negation words earn no credit; "already asked" only works when true; withdrawal stops sessions in progress and the dialog no longer overclaims; a turn that states a misconception earns no criterion credit; whole-sentence judgement with topic-word weighting; all fixed character lines shown to the teacher before approval.

The replays on the current build still show **evidence errors**:

- Maya's correct warm-up answer ("if napping actually did nothing, a difference this big would only happen about 3% of the time") is flagged as the teacher's second misconception, because that misconception joins two ideas and one of them shares "napping does nothing" with correct reasoning.
- One of Leo's correct replies about the null hypothesis is flagged as the first misconception; one sentence where he restated a belief is recorded as a correction.
- Sam's value-creating proposals (signing bonus, start date, remote days) still earn no credit.

## Conclusion

**C6 is not met.** The teacher-side workflow, approval, privacy, phases and traceability work. But the deterministic provider judges student answers by matching words. Four repair rounds each reduced one class of error and exposed another; telling stating from rejecting an idea, or a right from a wrong use of the same words, needs a provider that reads meaning. This is the blocker recorded in `BUILD_STATUS.html`. The evaluator's findings after repair 6 have **not** been re-validated by a fresh evaluator.
