# Paper Traceability

Maps the paper's system elements to this implementation. The paper's elements were taken from the build prompt and the reference repository's whitepaper diagrams (`docs/whitepaper-diagrams/diagram-1…4`), because the paper text itself was unavailable here.

| Paper element | Where in this build | Status / departure |
|---|---|---|
| Conversation-first intake; no forms; one question at a time | `src/intake.js`, educator Interview tab | ✅ Text instead of voice (D3) |
| Intake checklist / journal | `intake.answers` + interview `transcript` with turn ids; `project.log` | ✅ |
| Educator materials uploaded and read | Materials panel; `addMaterial`; key-phrase suggestions; preparation excerpts | ✅ Text formats only |
| Web research (curricula, standards) | — | ❌ Not implemented (no general web access is assumed) |
| Template selection: Roleplay / Teachback | `recommendTemplate` + educator choice | ✅ |
| Agreed concept / educator buy-in | Design review + explicit approval | ✅ Strengthened: server-enforced gate |
| Design Agent → design document (objectives, narrative, character blocks, stakes, adaptations, assessment criteria) | `design.interpret()` + `build()` | ✅ Deterministic instead of LLM (D2) |
| Educator review and approval of the design | Design tab: approve / reject / return / edit / revise | ✅ |
| Casting Director integrates character context into template prompts | `renderPrompts()` regenerates mentor/practice/feedback prompts from decisions | ✅ |
| Image Generation (scene backdrops) | — | ❌ Out of scope (text-first) |
| Experience Builder (copy template, deploy, publish) | `compile()` → immutable package; learner link | ✅ |
| Mentor phase (introduce concepts, brief) | Preparation phase | ✅ Adds retrieval and activation |
| Practice phase (counterpart or curious learner; adapts difficulty) | Practice phase with challenges, hints, stretch | ✅ |
| Feedback phase (reads journal, evaluates against objectives, cites moments) | Feedback phase from evidence records | ✅ Structural observation vs inference, not-assessed |
| Shared session journal | `session.evidence`, `events`, `transcript` | ✅ |
| Session data captured | Persisted session JSON | ✅ |
| Student report agent | Per-session feedback + educator trace | ◐ No separate report document |
| Class analytics agent | — | ❌ Remaining |
| Class setup / rosters | — | ❌ Remaining (link sharing only) |
| Declarative experience format | `primer.experience/1` package | ✅ |
| Educator can iterate on the design after seeing student results | New versions from the design tab; evidence view | ✅ |
