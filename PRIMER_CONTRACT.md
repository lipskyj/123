# Primer Contract

The pedagogical constitution this implementation must preserve. It was derived from the build prompt's Section 3 and the paper's system as described in the reference repository's whitepaper diagrams (experience creation flow, experience anatomy, student experience flow). The machine-readable version is in [`records/contract.json`](records/contract.json), which feeds BUILD_STATUS.html.

> Source note: the full paper text was not available in this environment (see ENVIRONMENT_REPORT.md). Where the paper and this contract may differ, the paper governs.

## C1. Educator authority
- Educator goals, content, examples, misconceptions, criteria, constraints and classroom knowledge remain **visible and editable** in the design.
- AI recommendations (template choice, difficulty, inferred key ideas, look-fors, character details) are **labeled as AI suggestions** and listed as assumptions.
- A design cannot reach learners without an **explicit educator approval** (name + confirmation). The server enforces this, not just the UI.
- Synthetic approvals used in testing are recorded and displayed as **TEST APPROVAL**, never as an educator approval (`PRIMER_TEST_MODE=1`).

## C2. Meaningful student work
- The learner must retrieve, explain, decide, persuade, diagnose or correct. Primer never supplies the answer.
- Requests for the answer are refused, and the learner gets a graduated cue instead (name the idea → point to the notes → a sentence starter).
- Credit requires the learner's own words (minimum length) and, under stretch, reasoning.

## C3. Preparation, Practice, and Feedback
- Every experience connects: **Preparation** (prior-knowledge activation + educator materials + retrieval), **Practice** (scenario application), and **Feedback & reflection** (self-assessment → evidence-grounded feedback → transfer).
- Phases are gated, and evidence from earlier phases flows into feedback.

## C4. Productive friction
- The character has a goal and stakes. Educator-listed misconceptions become the character's challenges, so the instructional content is necessary to succeed.
- The narrative is generated from the educator's objective, misconceptions and counterpart description; it is not decorative backstory.

## C5. Goal-bound adaptation
- Support (hints) and challenge (stretch) adapt to learner evidence, only through the **approved adaptation rules** of the design. Each adaptation event names its rule and the learner turn that triggered it.
- Characters cannot leave the approved challenges. Model-voiced lines are guarded against revealing answers.

## C6. Evidence-grounded feedback
- Transcripts, decisions, evidence records and adaptation events persist across phases (crash-safe storage).
- Feedback quotes the learner's actual words. Observations are kept separate from inferences ("This suggests…").
- A criterion the learner had **no fair opportunity** to demonstrate is marked "not assessed".
- An educator can trace teacher input → design version → package → runtime events → evidence → feedback, and replay a session deterministically.

## C7. Reusable system behavior
- Nothing is hard-coded to a course, discipline, scenario, character or rubric.
- An educator creates a substantially different experience by supplying new materials and answering in natural language, with no code changes.
