# Environment Report

Inspected at the start of the build (2026-11-13), before any architecture decisions.

| Capability | Result | Evidence |
|---|---|---|
| Read/write persistent files | ✅ Yes | Git working tree at `/home/user/123`; ~30 GB writable allowance |
| Run shell commands and application code | ✅ Yes | bash; Node v22.23.4, npm 10.9.9, Python 3.13 |
| Access/clone the reference repository | ✅ Yes | `git clone --depth 1 https://github.com/wharton-generative-ai-labs/primer` succeeded (read-only, in scratch space) |
| Install project-scoped dependencies | ✅ Yes | npm registry reachable (`npm install axe-core` succeeded) |
| Run tests, linters, builds, local services | ✅ Yes | `node --test`, local HTTP servers on ephemeral ports |
| Inspect a working application in a browser | ✅ Yes | Playwright + Chromium preinstalled; screenshots and axe audits run |
| Model providers | ❌ No credentials | No `ANTHROPIC_API_KEY` / `OPENAI_API_KEY`. A deterministic substitute is used; the Anthropic provider is contract-tested with a fake |
| Independent agents / fresh contexts | ✅ Yes | Sub-agents can be started without the builder's conversation (used for clean-context validation) |
| Generate HTML and downloadable artifacts | ✅ Yes | BUILD_STATUS.html, previews, JSON packages |
| Read the paper | ⚠️ Partially | Only the build prompt PDF (11 pages) was supplied. The paper URL host (`gail.wharton.upenn.edu`) is blocked by the session's network policy. The reference repository's `docs/whitepaper-diagrams/*` and architecture docs were used as the closest available description of the paper's system |

## Declared build mode

**Mode B: coding environment with limited orchestration.** Everything except a live model provider is available. The complete core application is implemented and tested, and fresh-agent validation is run with sub-agents. Because no model credentials exist:

- runtime character dialogue and all pedagogical judgments use the deterministic engine;
- the optional LLM path is verified only against a fake provider (interface, leak guard, error fallback);
- synthetic teacher and student participants are LLM sub-agents driving the real application. They are **not** real educators or learners.

## Implications

- The architecture was chosen so that pedagogy does not depend on a model, which makes the system fully testable here (see VERSION_DECISION.md).
- Validation that requires a live LLM is listed as pending in BUILD_STATUS.html.
