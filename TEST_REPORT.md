# Test Report

_Generated from `records/*.json` by `scripts/build-status.js` at 2026-11-13T08:35:01.106Z. The same records drive BUILD_STATUS.html._

## Summary

- Automated tests: **36/36 passing**, 0 failing (run 2026-11-13T08:34:27.148Z, Node v22.23.4)
- Findings repaired: **9/9**
- Clean-context validation: **pending**. 0/0 roles passed
- Build mode: **B**. Full coding environment (shell, Node 22, npm, Playwright/Chromium, persistent files, fresh sub-agents), but no model-provider credentials. The core runs on a deterministic pedagogy engine. The optional Anthropic provider is implemented and contract-tested with a fake, but it has not been exercised against the live API.

> Synthetic teacher and student participants are LLM agents. Nothing here is real-teacher, real-student, classroom or efficacy validation.

## Automated tests by file

### tests/e2e/ui.test.js

| Status | Test | ms |
|---|---|---|
| pass | accessibility + full educator-to-learner flow in the browser (axe, keyboard, labels) | 6800 |

### tests/unit/api.test.js

| Status | Test | ms |
|---|---|---|
| pass | startup: the documented command `npm start` serves the app | 272 |
| pass | approval is enforced by the server, not just the UI | 110 |
| pass | test mode records synthetic approvals as TEST approvals and labels the build | 49 |
| pass | return-for-work applies the educator note as a revision and keeps history | 47 |
| pass | teacher revision changes the generated experience end-to-end (prompts, criteria, runtime, feedback) | 92 |
| pass | learner API never exposes prompts, engine internals or look-fors before feedback | 48 |
| pass | persistence and interrupted-session recovery: a server restart resumes the exact session | 58 |
| pass | concurrent learner messages are serialized without losing turns | 73 |
| pass | errors are clear and do not corrupt state | 10 |
| pass | trace links teacher input -> design -> evidence -> feedback, and replay verifies it | 68 |

### tests/unit/core.test.js

| Status | Test | ms |
|---|---|---|
| pass | text: list splitting handles newlines, semicolons, commas and prose | 3 |
| pass | text: look-for matching uses stems and requires all words of a phrase | 1 |
| pass | intake: asks one question at a time, in order, and records verbatim answers | 1 |
| pass | intake: too-short required answers get exactly one follow-up; required skips are challenged once | 1 |
| pass | intake: template recommendation follows the described student work, and the educator can override it | 2 |
| pass | intake: materials yield suggested key ideas | 1 |
| pass | design: every educator answer appears in the design with educator provenance | 6 |
| pass | design: missing educator input becomes visible AI assumptions, never silent | 2 |
| pass | design: materials influence the design (briefing excerpts and grounding) | 6 |
| pass | design: natural-language revision changes decisions and propagates to prompts, challenges and adaptation | 13 |
| pass | design: unrecognized revision requests are reported, not silently ignored | 4 |
| pass | design: direct edits are validated; invalid edits are refused | 6 |
| pass | approval state machine: only open designs can be approved; approval needs a name; test mode yields test approval | 6 |
| pass | compile: refuses an unapproved draft (approval gate) | 3 |
| pass | compile: superseded cannot be approved, rejected cannot be built, approved builds a valid package | 7 |
| pass | schema: validatePackage catches broken packages | 0 |
| pass | runtime: phases are gated; preparation cannot be skipped and practice needs real attempts | 6 |
| pass | runtime: help requests are refused with escalating cues that never reveal look-fors | 5 |
| pass | runtime: adaptation events cite an approved rule and the learner turn that triggered them | 5 |
| pass | runtime: feedback quotes only real learner turns, separates inference, and does not assess unseen criteria | 6 |
| pass | runtime regression: refuting a misconception is not recorded as endorsing it (invented-evidence fix) | 4 |
| pass | runtime: character stays consistent (same speaker; only scripted challenge lines in deterministic mode) | 5 |
| pass | runtime: deterministic replay reproduces transcript, evidence and feedback | 6 |
| pass | provider replacement: a model provider voices lines; leaks and errors fall back to deterministic lines | 3 |
| pass | generality: two briefs from different domains produce materially different experiences with no code change | 5 |

## Coverage of the required test areas

| Area | Tests |
|---|---|
| Startup and documented commands | ✅ startup: the documented command `npm start` serves the app |
| Schema and configuration validation | ✅ design: direct edits are validated; invalid edits are refused<br>✅ schema: validatePackage catches broken packages |
| Authoring and runtime state transitions | ✅ intake: asks one question at a time, in order, and records verbatim answers<br>✅ approval state machine: only open designs can be approved; approval needs a name; test mode yields test approval<br>✅ runtime: phases are gated; preparation cannot be skipped and practice needs real attempts |
| Approval enforcement | ✅ approval is enforced by the server, not just the UI<br>✅ test mode records synthetic approvals as TEST approvals and labels the build<br>✅ approval state machine: only open designs can be approved; approval needs a name; test mode yields test approval<br>✅ compile: refuses an unapproved draft (approval gate)<br>✅ compile: superseded cannot be approved, rejected cannot be built, approved builds a valid package<br>✅ runtime: adaptation events cite an approved rule and the learner turn that triggered them |
| Artifact and transcript persistence | ✅ persistence and interrupted-session recovery: a server restart resumes the exact session |
| Provider replacement / deterministic replay | ✅ trace links teacher input -> design -> evidence -> feedback, and replay verifies it<br>✅ runtime: deterministic replay reproduces transcript, evidence and feedback<br>✅ provider replacement: a model provider voices lines; leaks and errors fall back to deterministic lines |
| Error and interrupted-session recovery | ✅ persistence and interrupted-session recovery: a server restart resumes the exact session<br>✅ concurrent learner messages are serialized without losing turns<br>✅ errors are clear and do not corrupt state |
| Accessibility basics | ✅ accessibility + full educator-to-learner flow in the browser (axe, keyboard, labels) |
| Teacher revisions change the experience | ✅ return-for-work applies the educator note as a revision and keeps history<br>✅ teacher revision changes the generated experience end-to-end (prompts, criteria, runtime, feedback)<br>✅ design: natural-language revision changes decisions and propagates to prompts, challenges and adaptation<br>✅ design: unrecognized revision requests are reported, not silently ignored |
| Educator materials influence the design | ✅ intake: materials yield suggested key ideas<br>✅ design: materials influence the design (briefing excerpts and grounding) |
| Preparation, practice and feedback stay connected | ✅ teacher revision changes the generated experience end-to-end (prompts, criteria, runtime, feedback)<br>✅ runtime: phases are gated; preparation cannot be skipped and practice needs real attempts<br>✅ runtime: feedback quotes only real learner turns, separates inference, and does not assess unseen criteria |
| Adaptation tied to goals and evidence | ✅ design: natural-language revision changes decisions and propagates to prompts, challenges and adaptation<br>✅ runtime: adaptation events cite an approved rule and the learner turn that triggered them |
| Feedback cites actual learner behavior | ✅ trace links teacher input -> design -> evidence -> feedback, and replay verifies it<br>✅ runtime: feedback quotes only real learner turns, separates inference, and does not assess unseen criteria |
| Failure modes (goal drift, character drift, over-helping, invented evidence, unsupported assessment) | ✅ runtime: help requests are refused with escalating cues that never reveal look-fors<br>✅ runtime: feedback quotes only real learner turns, separates inference, and does not assess unseen criteria<br>✅ runtime regression: refuting a misconception is not recorded as endorsing it (invented-evidence fix)<br>✅ runtime: character stays consistent (same speaker; only scripted challenge lines in deterministic mode)<br>✅ provider replacement: a model provider voices lines; leaks and errors fall back to deterministic lines |
| Generality across domains | ✅ generality: two briefs from different domains produce materially different experiences with no code change |

## Findings: before and after

| ID | Severity | Finding | Fix | Before → After | Regression test | Status |
|---|---|---|---|---|---|---|
| F1 | major | UI walkthrough: a learner who refuted 'splitting the difference is always fair' ("...is only fair if the anchors were fair...") was recorded as endorsing the misconception and listed as a growth area. | Endorsement now requires no negation, no qualifier ('only if', 'depends', 'but'...) and no use of the correcting idea's look-fors. | 1 misconception evidence record for a correct refutation → 0 records; a genuine endorsement still records 1 | runtime regression: refuting a misconception is not recorded as endorsing it | fixed |
| F2 | minor | Educator trace listed the same learner turn twice per criterion (challenge record + observation record). | Trace shows observation records only. | duplicate rows → one row per observation | trace links teacher input -> design -> evidence -> feedback | fixed |
| F3 | minor | Filler words ('something') became look-fors. | Added to the stop list. | look-for: something → removed | manual + fixtures | fixed |
| F4 | blocking | API test: any error thrown inside a locked handler (e.g. approval without a name) produced an unhandled rejection in the lock chain, which crashes the Node process. | Lock tail never rejects. | server process exited on first validation error → 400 returned, server keeps serving | approval is enforced by the server, not just the UI | fixed |
| F5 | major | An invalid direct edit (removing all key ideas) crashed the derive step before validation. | Validate decisions before building derived content. | TypeError 500 → 400 with explanation | design: direct edits are validated | fixed |
| F6 | minor | 'Rename the character to Morgan' (sentence-initial capital) was not recognized. | Case-insensitive verb match. | unrecognized → applied | design: natural-language revision changes decisions | fixed |
| F7 | minor | First-year MBA students were classified as 'supportive' difficulty; the character goal captured an over-long clause; the name was repeated in the description. | Graduate/professional signals override; goal trimmed at clause boundary; leading name stripped. | supportive / long goal → standard / '15% price increase' | design: every educator answer appears | fixed |
| F8 | major | E2E test: when an action failed (e.g. approving without the confirmation box ticked), the error re-render erased everything the educator had typed (name, revision request, edits). | Error handling captures and restores all form values (and the open editor) around the re-render. | approver name lost; second attempt failed → inputs preserved; second attempt succeeds | accessibility + full educator-to-learner flow in the browser | fixed |
| F9 | major | axe (WCAG 2 A/AA): low-contrast phase stepper and 'not assessed' badges; scrollable chat logs not keyboard-focusable. | Raised text contrast; chat logs get tabindex=0 and role=log. | 3 serious axe violations → 0 serious/critical violations on home, interview, design, learner (all phases), and evidence views | accessibility + full educator-to-learner flow in the browser | fixed |

## Clean-context validation

Pending.
