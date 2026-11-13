# Primer

Primer is a teacher-centered system for authoring and running educational simulations. An educator describes their course, learners, materials and goals in plain language. Primer proposes a learning and simulation design that the educator can inspect, edit, revise and **explicitly approve**. Only then does Primer build a playable learner experience with three connected phases:

1. **Preparation**: activates prior knowledge and grounds the learner in the educator's own materials.
2. **Practice**: a roleplay or teachback in which the learner must do the thinking. A character raises the educator's misconceptions as challenges, and support and challenge adapt to evidence under educator-approved rules.
3. **Feedback & reflection**: starts from the learner's self-assessment, quotes what the learner actually said, separates observation from inference, marks unseen criteria "not assessed", and ends with a transfer question.

This is an implementation of the system described in *"Primer: An AI Framework for Instructor-Centered Educational Simulation Creation"*, built from the build prompt and the [reference repository](https://github.com/wharton-generative-ai-labs/primer). It is a clean, text-first alternative to that repository. See [VERSION_DECISION.md](VERSION_DECISION.md) and [REPOSITORY_AUDIT.md](REPOSITORY_AUDIT.md).

**Build status:** open [BUILD_STATUS.html](BUILD_STATUS.html), or `/status` while the app runs.

## Quick start

Requires Node.js 20 or newer. There are no runtime dependencies, so you don't need `npm install` just to run it.

```bash
npm start                     # http://localhost:3000
```

| What | Where |
|---|---|
| Educator studio | http://localhost:3000/educator |
| Learner experience | http://localhost:3000/learn/<experience-id> (link shown after you build) |
| Build dashboard | http://localhost:3000/status |

Options (environment variables):

| Variable | Effect |
|---|---|
| `PORT` | Port (default 3000) |
| `PRIMER_DATA_DIR` | Where projects, experiences and sessions are stored (default `./data`) |
| `PRIMER_TEST_MODE=1` | For synthetic or automated testers: every approval is recorded as a **TEST approval**, and builds are labeled "test build". This mode can never produce a classroom approval. |
| `PRIMER_EDUCATOR_KEY` | If set, educator pages and APIs require this shared key (learner links stay open) |
| `PRIMER_PROVIDER=anthropic` + `ANTHROPIC_API_KEY` | Optional: characters' lines are voiced by a Claude model. Pedagogy (evidence, adaptation, feedback) stays deterministic, and the model's output is guarded against revealing answers. The default provider is `deterministic`. |
| `PRIMER_MODEL` | Model id for the anthropic provider (default `claude-sonnet-5-5`) |

## Using it

1. **Educator studio → New experience.** Answer one question at a time. Upload or paste materials (.txt, .md, .html) when asked; Primer suggests key ideas from them.
2. **Generate design.** Review the design. Each element is tagged *from you*, *from your materials*, or *AI suggestion: check this*, and the assumptions Primer made are listed at the top.
3. **Revise.** Use "Edit this design", or ask in plain language (for example "Make it harder. Add criterion: asks a clarifying question. Rename the character to Sam."). Each revision creates a new version; the old one becomes *superseded* and the changes are shown as a diff.
4. **Approve, return for more work, or reject.** Approval requires your name and an explicit confirmation. Unapproved, rejected and superseded designs cannot be built. The server enforces this.
5. **Build learner experience** and share the `/learn/…` link.
6. **Experience & evidence tab.** For each learner session, see the trace from your criteria and misconceptions, through the evidence observed and the adaptations applied, to the feedback given. "Verify by deterministic replay" re-runs the session.

## Tests

```bash
npm install        # dev-only: axe-core for accessibility tests
npm test           # unit + API + browser e2e; writes records/test-results.json, BUILD_STATUS.html, TEST_REPORT.md
node scripts/run-tests.js --no-e2e   # without the browser test
```

Browser tests use Playwright with Chromium (`require('playwright')`) and are skipped if it isn't installed.

## Project layout

```
src/            server.js (HTTP API + static), intake.js, design.js, compile.js, runtime.js, store.js, text.js, providers/
public/         educator studio, learner runtime, landing page (vanilla JS, no build step)
fixtures/       educator briefs used as acceptance-test fixtures (MBA negotiation, high-school biology)
tests/          unit/ (pure modules + HTTP API), e2e/ (browser + axe)
records/        machine-readable build records: milestones, decisions, findings, contract, test results, validation
validation/     clean-context validation prompts and recorded artifacts
scripts/        test runner, dashboard/report generator
docs/previews/  screenshots of educator and learner interfaces
```

## Documentation

[ENVIRONMENT_REPORT](ENVIRONMENT_REPORT.md) · [BUILD_LOG](BUILD_LOG.md) · [PRIMER_CONTRACT](PRIMER_CONTRACT.md) · [PAPER_TRACEABILITY](PAPER_TRACEABILITY.md) · [REPOSITORY_AUDIT](REPOSITORY_AUDIT.md) · [VERSION_DECISION](VERSION_DECISION.md) · [SYSTEM_DESIGN](SYSTEM_DESIGN.md) · [TEACHER_CENTEREDNESS](TEACHER_CENTEREDNESS.md) · [TEST_PLAN](TEST_PLAN.md) · [TEST_REPORT](TEST_REPORT.md) · [COLD_BUILD_REVIEW](COLD_BUILD_REVIEW.md) · [END_TO_END_VALIDATION](END_TO_END_VALIDATION.md)

## Limitations (honest)

- **No real-classroom validation.** All validation used automated tests and synthetic (LLM) teacher and student participants. No efficacy claims are made.
- **Evidence uses look-for matching.** Primer recognizes ideas by educator-editable key words and phrases, with minimum-length, reasoning and refutation checks. Paraphrases that don't use the look-for words are missed (a false "not yet"). Keyword-stuffing is only partly mitigated. Educators should review and edit look-fors.
- **Default character dialogue is templated.** The deterministic provider's lines are clear but repetitive. The Anthropic provider is implemented and tested against a fake API, but it has **not been run against the live API** here because there were no credentials.
- **Materials:** text formats only (.txt/.md/.html or paste); PDF/DOCX are not parsed.
- **Privacy and accounts:** single-tenant, no user accounts. Learner names and transcripts are stored as plain JSON on the server's disk. The optional `PRIMER_EDUCATOR_KEY` is a shared secret, not per-user auth. Don't use real student data without adding authentication, retention policies and institutional approval.
- **Deployment:** one Node process with file storage; not horizontally scalable as is.
- **Text only:** no voice or generated scene images (the reference repository has both).
