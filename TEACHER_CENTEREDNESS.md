# Teacher-Centeredness

How the system keeps the educator in authority at every step, and how this is verified.

| Educator need | How Primer serves it | Verified by |
|---|---|---|
| Say what matters in my own words | Interview stores answers verbatim; design fields cite them (`provenance.source = educator`) | `design: every educator answer appears…` |
| Know why I'm being asked something | Every question shows "Why I'm asking" | UI (educator-interview preview) |
| Not be buried in questions | One consequential question at a time; one follow-up for thin answers only; optional questions skippable | `intake: …one question at a time…`, `…exactly one follow-up…` |
| See what the AI decided for me | AI suggestions are tagged "AI suggestion: check this"; inferred items are listed as **Assumptions** at the top of the design | `design: missing educator input becomes visible AI assumptions` |
| Ground the experience in my materials | Key ideas suggested from materials; the preparation notes quote my materials with source names | `design: materials influence the design` |
| Inspect the important parts | Objective, learners, format, difficulty in plain English, character, stakes, preparation notes, challenges, criteria with look-fors, generated prompts | e2e test + design preview |
| Change anything | Direct editor for all decisions; plain-language revision requests; unrecognized requests are reported, never silently dropped | `design: natural-language revision…`, `…unrecognized revision requests are reported` |
| See what changed | Version history, statuses, per-version diff, revision note | e2e + API tests |
| Stay in control of what reaches students | Server-enforced approval (name + confirmation); reject; return for work; withdraw after approval blocks new sessions | `approval is enforced by the server, not just the UI` |
| Not have tests mistaken for my approval | Test mode records TEST approvals; builds and learner pages say "test build" | `test mode records synthetic approvals as TEST…` |
| Trust what students are told about their work | Feedback quotes students; inferences labeled; unseen criteria "not assessed" | `runtime: feedback quotes only real learner turns…` |
| Understand what happened in a session | Trace from my criteria and misconceptions to evidence, adaptations (with the approved rule) and feedback; replay | `trace links teacher input -> design -> evidence -> feedback` |

## Known gaps
- Look-fors are keyword-based. Educators should review them, and the design view shows them for exactly that reason.
- There is no class-level analytics view yet.
- There's no collaborative or multi-educator review, and no per-educator accounts.
