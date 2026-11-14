# Teacher-Centeredness

How the build keeps the educator in charge, with where to see it.

| Commitment | Where it appears |
| --- | --- |
| Teacher content is the source | Intake form (`author.html#new`). Key points in Preparation are quoted from the teacher's material with the source named. Criteria are the teacher's "evidence of progress" lines, word for word. |
| Everything stays visible and editable | Design review: each core field has a source chip ("From you" / "Primer's suggestion") and an Edit control; look-fors are editable; "Where each part came from" table; generated prompts are shown under "Instructions given to the system". |
| AI decisions are reviewable | "Decisions Primer made for you" lists every assumption; "Suggestions" can be noted or dismissed; a skipped interview question is recorded as skipped. |
| Revision in natural language | "Request a change". The result states exactly what changed, or says plainly that the request could only be stored as a constraint. |
| Explicit approval | Students cannot open a design until it is approved. Approval needs a typed name. "Approve for testing only" produces a labelled test build. Any change after approval creates a new draft that needs approval again; the old version is marked superseded. |
| Traceability into runtime | "Student sessions on this device": transcript with turn ids, evidence table (turn → criterion → student's words), adaptation table (turn → response → criterion → reason). |

## Honest gaps

- The teacher cannot yet edit individual challenge lines other than the opening and briefing (they can change the criteria and character that generate them).
- Material upload accepts text files only; PDFs and slides must be pasted as text.
- A teacher sees only sessions recorded in their own browser; there is no class view.
- Field editing uses simple browser dialogs.
