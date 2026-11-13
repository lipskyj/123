# Build Log

Chronological record. Decisions are detailed in `records/decisions.json`, findings in `records/findings.json`.

## 2026-11-13

1. **Environment inspection** (ENVIRONMENT_REPORT.md). Node 22, npm, Playwright/Chromium, sub-agents available; no model credentials; the paper URL is blocked, so I used the build prompt plus the reference repository's whitepaper docs. Declared **Mode B**.
2. **Primer Contract** written (PRIMER_CONTRACT.md, records/contract.json).
3. **Repository audit** of wharton-generative-ai-labs/primer (REPOSITORY_AUDIT.md). Decision D1: clean alternative implementation (VERSION_DECISION.md). The previous placeholder `index.html` was moved to `legacy/`.
4. **Core engine**: `text`, `store`, `intake`, `design` (decisions + derived + provenance + assumptions), `compile` (approval gate), `runtime` (three phases, adaptation, evidence, feedback, replay), providers.
5. **Smoke run** of both fixtures through the API: end-to-end OK, replay identical. Fixed F7 (difficulty heuristic, character goal, name repetition) and improved default look-fors for multi-word and parenthetical ideas.
6. **UI**: landing, educator studio (interview, design review/edit/revise/approve, experience & evidence trace), learner runtime. Browser walkthrough with screenshots surfaced **F1** (invented misconception evidence: major), **F2** and **F3**, all fixed.
7. **Unit tests** (25): found F5 (invalid edit crashes the derive step) and F6 (revision verb case). Fixed.
8. **API tests** (10): found **F4** (blocking: a handler error crashed the server via an unhandled rejection in the lock chain). Fixed.
9. **E2E + axe test**: found **F8** (form input lost on error) and **F9** (3 serious accessibility violations). Fixed. Full suite: 36/36 passing.
10. **Dashboard**: `scripts/build-status.js` generates BUILD_STATUS.html and TEST_REPORT.md from `records/*.json`.
11. **Documentation set** written.
12. **Clean-context validation** started (see below).
