# Repository Audit: wharton-generative-ai-labs/primer

Audited from a read-only shallow clone (default branch, 2026-11-13). It was not modified.

## What it is
A Next.js + TypeScript + Socket.IO application (about 560 files under `src/`) that plays declarative "experiences" (`experience.json` plus markdown agent prompts, scenes and sounds). Key properties:

- **Voice-first runtime:** front-end agents run on the OpenAI Realtime API (`gpt-realtime`); analytics agents can use Anthropic models.
- **Authoring via an Intake Agent** (an installable "module"). It interviews the educator by voice, keeps a private journal and checklist, and delegates to backend agents: Design Agent → design document → educator review → Casting Director (customizes template prompts) → Image Generation Agent → Experience Builder.
- **Templates:** Roleplay and Teachback, each with Mentor → Practice → Feedback agents sharing a session journal.
- **Auth:** NextAuth with Google OAuth. **Storage:** filesystem. **Modules:** installed from a registry.
- Extensive docs (`docs/`), a security audit (`audit/`) and Jest tests.

## Reuse assessment

| Aspect | Decision | Reason |
|---|---|---|
| Overall runtime (Next.js, Realtime voice, OAuth) | **Not reused** | It can't run or be tested here: no OpenAI or Google credentials. Voice isn't a contract commitment. |
| Mentor / Practice / Feedback sequence | **Reused conceptually** | Becomes Preparation / Practice / Feedback phases |
| Roleplay and Teachback templates | **Reused conceptually** | Same two formats, recommended from the described student work, educator can override |
| Intake Agent interview (one question at a time, checklist) | **Reused conceptually** | `src/intake.js`: ordered consequential questions with rationale and follow-ups |
| Design document → educator review → casting | **Reused + strengthened** | Design = editable decisions + derived content. Prompts are regenerated from decisions so revisions propagate. Approval is server-enforced and versioned |
| Session journal shared across agents | **Reused + made explicit** | Structured evidence and event records with turn references, used by feedback and the educator trace |
| Analytics agents (student and class reports) | **Partially** | Per-session evidence, trace and feedback are implemented. Class-level aggregation is not (listed as remaining) |
| Scenes, images, sounds | **Not reused** | Out of scope for a text-first build |

## Observations relevant to the Primer Contract
- In the reference design, approval is a conversational step with the Intake Agent; I found no server-side gate preventing an unapproved design from being built. This build adds one (C1).
- Feedback in the reference runs as an LLM agent reading the journal; observation versus inference and "not assessed" are prompt-level conventions. This build enforces them structurally (C6).
- The reference has no deterministic replay; this build does.
