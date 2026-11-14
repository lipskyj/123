# System Design

## Map

```
 Teacher (author.html)                                   Student (learn.html)
 ─────────────────────                                   ────────────────────
 intake form + materials                                 open experience (file / bundled / local)
        │                                                        │
 interview: one question at a time                        Preparation: purpose, role, quoted material,
        │                                                        │        activation questions
 proposed DESIGN  ◄── edit a field / request a change      Practice:  [3D cave field notes] → conversation
   (sources, assumptions, suggestions, prompts)                  │        evidence + adaptation logged
        │                                                 Feedback:  self-assessment → cited feedback
 approve (educator | test) / reject                              │        → transfer question → end
        │                                                        │
 build ──► EXPERIENCE PACKAGE (design snapshot + approval) ──────┘
                                   SESSION record (turns, events, evidence, adaptations, journal, feedback)
                                                  │
 Teacher: "Student sessions" view  ◄──────────────┘  (same browser)
```

## Modules (`src/`)

| File | Responsibility |
| --- | --- |
| `schema.js` | Validation of intake, design, package and session records, with readable errors. |
| `states.js` | Design lifecycle and allowed transitions. Only an `educator` actor can produce classroom approval; a `test` actor can only produce test approval. |
| `provider.js` | `DeterministicProvider` (interview questions, design proposal, `derive`, revision parsing, evidence detection, character lines) and `ReplayProvider` (record / replay). |
| `authoring.js` | Intake, interview, propose, revise, direct edit, recommendations, approve / reject, build, trace. Every change creates a new version and supersedes the old one. |
| `runtime.js` | Session engine for the three phases, world events, adaptation rules, feedback construction, persistence after every step. |
| `store.js` | Storage interface with localStorage and in-memory backends; export / import. |
| `text.js` | Tokenising, stemming, key terms, overlap, answer-seeking and negation patterns. |

## How a teacher's revision propagates

A design has **core fields** (goal, learner role, character, stakes, difficulty, help policy, criteria, misconceptions, constraints, transfer) and **derived parts** (preparation, practice lines, feedback questions, the three prompts). `provider.derive()` rebuilds every derived part from the core fields on each change, so a revision cannot leave stale prompts or criteria behind. A teacher's direct edit to derived text is stored as an override and re-applied after each derive.

## How evidence and adaptation work (deterministic provider)

- Each criterion has **look-fors**: words from the teacher's criterion plus related words from sentences of the teacher's material. A learner turn counts as evidence when it contains enough look-fors, including at least one that is specific to that criterion.
- A misconception is flagged when a learner turn overlaps its wording and uses at least one word that belongs to the misconception but not to the correct account; a negation ("not", "wrong", "myth"…) marks it as corrected.
- Adaptation rules, each logged with the turn, the evidence and the criterion or misconception it is tied to: evidence → **raise** (harder follow-up, unless difficulty is gentle); no evidence → **support** within the teacher's help policy, then move on; request for the answer → **redirect** (declined in character); misconception stated → **probe** once.
- Feedback: per criterion, evidence → strength with quotations; asked but no evidence → growth area with the learner's replies quoted and a next step; never asked → not assessed.

## Known weaknesses of the deterministic provider

It matches words, not meaning. A correct answer in unexpected vocabulary is missed; an answer that uses the right words wrongly can be credited; character lines are assembled from templates and the teacher's phrases, so they can read stiffly; revision requests outside the recognised patterns are stored as constraints rather than acted on. These are the reasons a language-model provider would be the first extension.

## Data, privacy, deployment

All records live in the browser's localStorage under `primer:*`. Nothing is sent anywhere. There is no authentication, so "educator approval" records a typed name, not a verified identity. Sharing is by file. Clearing browser data deletes everything that has not been exported.
