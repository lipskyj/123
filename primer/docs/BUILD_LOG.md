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
