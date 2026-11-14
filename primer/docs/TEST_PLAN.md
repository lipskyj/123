# Test Plan

| Area (prompt §7) | How it is tested | Where |
| --- | --- | --- |
| Application startup and documented commands | Cold-build auditor follows the README; browser test loads every page | `records/validation/cold-build-audit.md`, `tests/e2e.mjs` |
| Schema and configuration validation | Invalid intake; proposed designs, packages, sessions validate | unit "schema: …" |
| Authoring and runtime state transitions | Interview order; version/supersede; phase gating | unit "authoring: …", "runtime: preparation…" |
| Approval enforcement | Unapproved, rejected, test-approved, tampered package, revise-after-approval | unit "approval: …" (4) |
| Artifact and transcript persistence | Resume from storage; export / import round trip; reload in browser | unit "persistence…", browser "session resumes after a reload" |
| Provider replacement or deterministic replay | Record, replay, compare; mismatch detection | unit "provider: …" |
| Error and interrupted-session recovery | Corrupt and missing records | unit "recovery…" |
| Accessibility basics | Language, title, one h1, labelled controls, named buttons on three pages | browser "accessibility basics…" |
| Teacher revisions changing the experience | NL revision and direct edit propagate to prompts and scenes | unit + browser |
| Educator materials influencing the design | Key points quoted from material; two fixtures differ | unit "educator materials and inputs shape the design" |
| Phases remaining connected | Evidence from preparation and field notes reaches feedback | unit, browser cave path |
| Adaptation tied to goals and evidence | `goalRef` and evidence ids checked | unit |
| Feedback citing actual behaviour | Citations must match learner turns | unit |
| Failure modes: goal drift, character drift, over-helping, invented evidence, unsupported assessment | Dedicated assertions | unit "failure modes…", "struggling learner…", "not assessed" |
| Clean-context validation (§8) | Fresh agents: cold auditor, teacher, students, evaluator | `records/validation/` |
| Generality (§9) | Two bundled fixtures from different domains plus one brief chosen independently by the fresh teacher, all without code changes | `fixtures/`, `records/validation/` |

Not tested: real teachers, real students, classrooms, learning outcomes, screen readers, mobile devices, any language model.
