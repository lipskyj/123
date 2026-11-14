# Repository Audit and Version Decision

## Repository audit (`wharton-generative-ai-labs/primer`, commit 6ef8d0e, MIT)

- **What it is:** a Next.js + custom Node server application (`server.ts`, Socket.IO) that plays "experiences" defined by configuration: voice agents on the OpenAI Realtime API, scenes, sounds, tools, and agent hand-offs. Experiences are installed as modules; the Experience Creator module depends on the Roleplay and Teachback templates.
- **Creation flow (whitepaper diagram 1):** voice Intake Agent with a private journal and checklist → Design Agent writes a design document → educator reviews and approves or requests changes → Casting Director customises three agent prompts (Mentor, Practice, Feedback) → image generation → Experience Builder → link to a playable experience. Agents pass named, versioned artifacts.
- **Student flow (diagram 4):** Mentor → Practice → Feedback, with a shared session Journal for continuity; practice adapts (hints when struggling, harder challenges when excelling); educator-triggered per-student and class analytics.
- **What it needs to run:** OpenAI API key with Realtime access, Google OAuth credentials, a long-running server. None is available here, and it cannot be hosted on GitHub Pages.

## Version decision

**A clean, compatible redesign** rather than an extension of the repository.

| Decision | Reason |
| --- | --- |
| Browser-only, no server, no accounts | The owner publishes through GitHub Pages; the reference needs a server, OAuth and paid realtime voice. |
| Text, not voice | No realtime model available; text also keeps an exact transcript for evidence. |
| Deterministic provider behind a provider interface | No model key. The interface (`src/provider.js`) is the seam for a model later; a record/replay provider proves it is replaceable. |
| One design record with derived prompts, instead of a pipeline of agents and artifacts | Without a model there is nothing for separate agents to do; deriving prompts, runtime and feedback rules from one approved record makes teacher revisions propagate by construction. |
| Explicit approval states enforced in code | The prompt requires draft / revised / test-approved / educator-approved / rejected / superseded and enforcement. |
| Kept from the reference | Roleplay and Teachback templates; intake interview → design document → educator review → build; three learner phases (the reference's Mentor phase is "Preparation" here); adaptation in practice; a session journal; feedback that cites specific moments. |
| Not built | Voice, generated images, class rosters, class-level analytics, LMS integration, web research during intake. |
| Added | An optional 3D "world" (the cave) as a practice setting, where students gather evidence and write field notes before the conversation. |
