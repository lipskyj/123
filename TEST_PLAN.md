# Test Plan

## Layers

| Layer | Location | Runs | What it proves |
|---|---|---|---|
| Unit | `tests/unit/core.test.js` | `npm test` | Intake, design derivation, revision, state machine, compile gate, runtime rules, feedback, replay, provider replacement, failure modes, generality |
| API integration | `tests/unit/api.test.js` | `npm test` | Documented startup, server-side approval enforcement, test-mode labeling, return-for-work, end-to-end revision propagation, learner data isolation, persistence + restart recovery, concurrency, errors, trace + replay |
| Browser e2e + accessibility | `tests/e2e/ui.test.js` | `npm test` (needs Playwright + Chromium) | The real UIs: full educator → learner flow, keyboard submission, approval UX, resume after reload, no internals in the learner UI, **axe WCAG 2 A/AA with zero serious/critical violations** on every screen, at desktop and phone widths |
| Clean-context validation | `validation/prompts/*.md` | fresh sub-agents | Cold build audit, fresh simulated teacher (independently chosen brief), fresh simulated students (typical, misconception, answer-seeker), independent evidence evaluator |

## Required areas → tests
See the "Coverage of the required test areas" table in TEST_REPORT.md, which is generated from the actual test results.

## Failure modes targeted
| Failure mode | Test |
|---|---|
| Goal drift | Character lines come only from approved challenges; the model prompt carries the approved objective; adaptation events must cite `adaptation.*` rules |
| Character drift | `runtime: character stays consistent` |
| Over-helping | `runtime: help requests are refused…`; provider leak guard test |
| Invented evidence | `feedback quotes only real learner turns`; misconception refutation regression (F1) |
| Unsupported assessment | Unreached challenges → criteria `not-assessed` |

## Acceptance fixtures (Section 9)
1. `fixtures/briefs/mba-negotiation.json`: MBA negotiation roleplay.
2. `fixtures/briefs/biology-natural-selection.json`: high-school biology teachback.
3. **Independent brief**, chosen by a fresh tester agent the builder had not seen, authored through the normal educator UI with no code changes (see END_TO_END_VALIDATION.md).

## Procedure for blocking or major failures
Preserve the evidence (records/findings.json), repair, add or extend a regression test, rerun, and record before and after.
