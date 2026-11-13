# Version Decision

**Decision:** build a *clean alternative implementation* (new code, small Node.js server + vanilla JS UI) that preserves the Primer Contract and reuses the reference repository's concepts. I did not extend the reference repository's code.

## Options considered

| Option | Verdict |
|---|---|
| Extend the reference repository in place | Rejected. Its core loop needs OpenAI Realtime and Google OAuth credentials, which are unavailable, so nothing could be end-to-end tested. The approval gate, evidence model and replay would have to be retrofitted into a voice-agent architecture. |
| Selective reuse (port its TypeScript modules) | Rejected. The reusable value is in its *concepts and prompts*, not its runtime code, which is tied to realtime voice sessions. |
| **Clean alternative** | **Chosen.** Zero runtime dependencies; the whole system runs and is tested here; the contract is enforced structurally. |

## Key architectural choices
1. **Deterministic pedagogy core, pluggable voice.** Evidence, adaptation, gating and feedback are rule-based and recorded. A model (optional) only phrases character moves and is guarded. This makes approval meaningful (the approved design determines runtime behavior), enables replay, and allows operation without credentials.
2. **Decisions vs derived content.** The educator edits *decisions*; *derived* content (preparation notes, challenges, prompts) is rebuilt by a pure function, so revisions always propagate.
3. **Immutable experience packages** that reference the exact approved design version.
4. **Text-first UI** for accessibility and testability.

## Reversibility
- Packages are plain JSON and could be exported to the reference `experience.json` format (agents mentor/practice/feedback with the generated prompts).
- The provider interface is small (`voice(ctx)`); a voice or other model provider can be added.
- The `Store` interface (`get/put/list`) can be swapped for a database.
