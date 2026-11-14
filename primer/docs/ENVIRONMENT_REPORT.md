# Environment Report

Inspected before building (cloud container, Linux, Node 22.23, Python 3, Chromium + Playwright preinstalled, no GPU).

| Capability | Available | Notes |
| --- | --- | --- |
| Read and write persistent files | Yes | Git repository; work is pushed to a branch. The container itself is ephemeral. |
| Run shell commands and application code | Yes | |
| Access or clone the reference repository | Yes, read-only | `wharton-generative-ai-labs/primer` cloned (MIT licence). |
| Install project-scoped dependencies | Yes | Not needed: the build has no runtime dependencies. |
| Run tests, builds and local services | Yes | `node --test`, static server. |
| Inspect a working application in a browser | Yes, headless | Software rendering only; the 3D cave renders at about 30 s per frame here, so cave tests switch the render loop off. |
| Use model providers | **No** | No model API key is available and outbound hosts are restricted. A deterministic rule-based provider is used instead. |
| Create independent agents with fresh contexts | Yes | Used for clean-context validation. |
| Generate HTML and downloadable artifacts | Yes | |
| The paper | **No** | Not supplied with the prompt; the Wharton site is not reachable from here. |

## Declared build mode

**Mode A (full agentic coding environment), with two recorded limits:** no language-model provider, and no copy of the paper. The required core scope is unchanged; the consequences are that all model-dependent behaviour is rule-based and that paper conformance is pending. Neither is represented as done.
