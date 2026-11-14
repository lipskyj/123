# Build Log

Newest last. Times are approximate (UTC, 14 Nov 2026).

| Step | What happened |
| --- | --- |
| Inspect | Environment inspected: full coding environment, headless browser, no model key, restricted network. Paper not supplied; Wharton site unreachable. Reference repository cloned and audited. Mode A declared with those two limits. |
| Contract | Primer Contract written from Section 3 of the prompt (C1–C7). |
| Decision | Clean browser-only redesign chosen over extending the reference (see `REPOSITORY_AUDIT_AND_VERSION_DECISION.md`). |
| Engine | `text`, `schema`, `states`, `provider`, `store`, `authoring`, `runtime` written. |
| Tests, run 1 | 21 of 25 passed. Failures: (a) correct statements were flagged as misconceptions because they shared words with one; (b) character names differed between runs because the seed used a random id. |
| Repair 1 | Misconception detection now requires a word that belongs to the misconception but not to the correct account. Seed changed to title + objective. 25 of 25. |
| Interfaces | Landing page, teacher workspace, student page, cave field-site page, shared styles. Two sample experiences built through the authoring steps with test approval. |
| Browser test, run 1 | 26 of 30. Real defects found: a skipped transfer question was not listed among Primer's decisions; one field note was credited to a criterion it did not address (shared generic words). Two failures were mistakes in the test itself. |
| Repair 2 | Skipped transfer recorded as an assumption. Evidence now needs at least one look-for specific to the criterion; leading task verbs removed from look-fors. 30 of 30. |
| Polish | Feedback wording: says where the quoted words came from (field notes, preparation, conversation); follow-up count shown only when it applies; next steps phrased as a task. |
| Records | README, environment report, audit and version decision, system design, teacher-centeredness, traceability, test plan, status records, dashboard generator. |
| Validation, attempt 1 | Cold-build auditor and fresh teacher agents started. Both stopped by a usage limit before writing reports. Resumed after the limit reset. |
| Fresh teacher review | Independent simulated teacher (statistics brief, chosen without the builder's knowledge) completed all seven steps; approval was enforced. Verdict: would not use with a class. 2 blocking, 8 major, 11 minor findings (`records/validation/fresh-teacher-report.md`). Main causes: character questions recited the rubric; classroom constraints and unparsed requests were spoken to students; teacher's character name was overwritten; reject was terminal; key points repeated; preparation leaked the teacher's private notes. |
| Repair 3 (engine) | Questions now name a topic without stating the criterion, and each is editable by the teacher. Constraints and unparsed requests are teacher-only. Teacher-given character names are kept; renaming changes only the name. Rejected or approved designs can be edited into a new draft. Full material shown to students; key points distinct. Misconception probes skip ideas the learner already rejected; a plain "no" to a voiced misconception counts as a correction. Learners can end practice early. 7 regression tests (32 of 32). |
| Repair 3 (interface) | In-page editor replaces prompt boxes; character name, questions, constraints, notes, preparation questions and practice length editable; name field at the top; plainer wording ("Chosen by Primer", "Our guess", "Words that count as evidence"); samples listed separately; "End practice now". Browser test 34 of 34. |
| Validation, attempt 2 | Cold-build auditor rerun from scratch (first attempt hit a model limit before reporting). Second fresh teacher re-authoring the statistics brief on the repaired build to check each finding. |
