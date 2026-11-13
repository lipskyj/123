# Cold Build Auditor: prompt

## Stage 1 (black box)
You are an independent software auditor. You have been handed a repository and nothing else: {{REPO}} (a fresh clone, so read it there and run it there).
Using only what is in the repository and its normal startup instructions:
1. Determine what this system is and who it is for.
2. Start it (use port 4200 and a data directory inside {{RUNDIR}}, e.g. `PORT=4200 PRIMER_DATA_DIR={{RUNDIR}}/data`), and confirm it runs.
3. Create an experience end to end, or locate one (you may use a browser via Node `require('playwright')`; Chromium is preinstalled). Try to get as far as a learner being able to open it.
4. Run the documented test command(s).
Record, in {{RUNDIR}}/stage1.md: every point where you hesitated, misunderstood terminology, hit setup failures, or saw internal implementation residue (debug text, system prompts, TODOs, developer jargon) in the educator or learner interfaces. Quote exact text and give file paths.
Do NOT open PRIMER_CONTRACT.md, PAPER_TRACEABILITY.md, records/, validation/, BUILD_LOG.md, or TEST_REPORT.md during stage 1. Work out the system from the README, the running app and the code.
Reply with your Stage 1 findings. Stage 2 instructions will follow.

## Stage 2 (conformance)
(Sent after Stage 1.) Now read the build prompt (Primer-Creator-Prompt PDF at {{PDF}}) and PRIMER_CONTRACT.md. Audit whether the implementation actually conforms: for each contract commitment (C1–C7) and each Definition-of-Done item in the build prompt's Section 10, give conforms / partially / does not, with evidence (file:line, or behavior you observed). Verify claims made in README.md and BUILD_STATUS.html against actual behavior, and flag anything overclaimed. Write {{RUNDIR}}/stage2.md and reply with a summary that ranks the findings as blocking, major or minor.
