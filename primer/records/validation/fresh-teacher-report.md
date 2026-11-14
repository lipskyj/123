# Fresh-teacher validation report: Primer authoring flow

Date: 2026-11-14. Tester: simulated first-time teacher ("Fresh Teacher (simulated)"), no prior knowledge of the tool, web interface only (headless Chromium via Playwright), at http://localhost:8766/primer/. No source, tests, docs or records were read.

Subject chosen: **introductory statistics for psychology undergraduates (interpreting a p-value)**. Setting: conversation only (no 3D cave). Kind of practice: "Let Primer suggest, then ask me".

Outcome: all seven steps completed. Final experience **exp-v3pwiy** (design `design-hlwx3o`, version 7, Educator-approved), student link `http://localhost:8766/primer/learn.html?exp=exp-v3pwiy`, file saved as `records/validation/fresh-teacher-experience.primer.json`.

Process note: the session was interrupted once by a machine restart; nothing in the tool was lost. I also had to create the experience twice, because my first design (10 versions) became a dead end when I tried "Reject" (finding F3). Both runs used the identical brief and answers and produced an identical version 1.

## 1. The brief I supplied (verbatim form entries)

**Short title**

> What a p-value does and does not tell you

**Learning objective**

> Students can correctly interpret a p-value from a two-group comparison in plain language, and can explain what it does not tell us (it is not the probability the null hypothesis is true, and it says nothing about how large or important the effect is).

**Your students**

> Second-year undergraduate psychology students in a research methods seminar (ages 19-21, about 28 per group). Many are anxious about maths and switch off if spoken to in formulas. Speak to them in plain English, use the sleep-and-memory study as the running example, and do not be condescending.

**What they already know**

> They know means, standard deviations and the idea that samples vary by chance. They have met the null hypothesis in lectures and have run an independent-samples t-test in software by following instructions, but they have never had to say in words what the output means.

**What students should do in the experience**

> Explain the result of the sleep-and-memory study to a sceptical classmate who missed the lecture and thinks p = .03 means there is a 3% chance the result is a fluke. The student should say what the p-value means, correct the classmate's wrong readings, and say what else they would need to look at before deciding whether the finding matters.

**Evidence of progress (one per line)**

> States that the p-value is calculated assuming the null hypothesis is true (it is the probability of data at least this extreme if there were really no difference)
> Explicitly rejects the reading that p is the probability the null hypothesis is true or that the result is due to chance
> Separates statistical significance from the size or importance of the effect, and refers to the effect size or confidence interval
> Says that a non-significant result is not proof of no effect, and mentions sample size or power

**Common misconceptions (one per line)**

> p = .03 means there is a 3% chance the null hypothesis is true (or a 97% chance the treatment works)
> A smaller p-value means a bigger or more important effect, and p > .05 proves there is no effect

**Classroom constraints (one per line)**

> Must fit in 15 minutes of a 50-minute seminar
> Text only: students work on their own laptops in a shared room with no headphones, so no audio
> No formulas or calculation required; plain-language reasoning only

**Instructional material (340 words, my own)**

> Reading a p-value: the sleep and memory study
> 
> A researcher wants to know whether a short nap helps people remember word lists. Forty students are randomly split into two groups. One group naps for 20 minutes after studying a list of 30 words; the other group sits quietly. The nap group recalls 17.1 words on average and the quiet group recalls 14.9. An independent-samples t-test gives p = .03.
> 
> What does p = .03 mean? Start with the null hypothesis: in the population, napping makes no difference to recall. The p-value answers one narrow question. If the null hypothesis were true, how often would random sampling alone produce a difference between groups at least as large as the one we observed? Here the answer is about 3 times in 100. The p-value is therefore a statement about the data, assuming the null hypothesis. It is not a statement about the hypothesis.
> 
> This is why p = .03 does not mean there is a 3% chance that the null hypothesis is true, and it does not mean there is a 97% chance that napping works. To say how probable a hypothesis is, we would need extra information that the test does not use, such as how plausible the effect was before the study.
> 
> By convention, a p-value below .05 is called statistically significant, and we reject the null hypothesis. That label says nothing about how big or how important the effect is. With thousands of participants, a trivially small difference can produce a tiny p-value. To judge size, look at the effect size (here the difference is 2.2 words, Cohen's d of about 0.7) and at the 95% confidence interval for the difference (0.2 to 4.2 words), which shows how uncertain the estimate is.
> 
> Finally, a p-value above .05 does not prove there is no effect. A small study may simply lack the power to detect a real difference. Absence of evidence is not evidence of absence. Report what you found, how big it was, and how sure you can be.

**Kind of practice:** Let Primer suggest, then ask me. **Setting:** No 3D world (conversation only).

## 2. Authoring transcript

Path taken: landing page -> card "I'm a teacher / Create or manage experiences" -> "Teacher workspace / My experiences" -> "Create a new experience" -> one-page form "Tell Primer about the lesson" (fields above) -> "Continue" -> six questions, one per screen. Each question offers "I'm not sure - let Primer suggest, and show me what it chose".

| # | Question the tool asked (with its explanatory line) | My answer |
|---|---|---|
| 1 | "How should students practise: by acting inside a situation with a character (Roleplay), or by teaching the idea to a newcomer who asks questions (Teachback)?" - "This decides what kind of work students do in the practice scene." Buttons: Roleplay / Teachback | Clicked "I'm not sure - let Primer suggest, and show me what it chose". (Nothing was shown at that moment; the choice "Teachback" appeared only on the design page.) |
| 2 | "Who should the student talk to in the practice scene, and what does that person want from them?" - "The character's goal is what makes the student's knowledge necessary." Free text | "A classmate called Jordan who missed the lecture and has to write up the sleep-and-memory result for a lab report due tomorrow. Jordan is confident but wrong: they think p = .03 means there is a 3% chance the result is a fluke and that the nap effect is therefore 'big'. Jordan wants a sentence they can safely put in their report and will push back until the explanation actually makes sense to them." |
| 3 | "In the scenario, what goes wrong if the student gets it wrong?" - "Stakes create the productive friction that makes the content matter." Free text | "Jordan writes in the lab report that 'there is only a 3% chance the null hypothesis is true, so napping definitely improves memory a lot'. The marker takes marks off for misinterpreting the test, and Jordan goes on repeating the mistake in their final-year project." |
| 4 | "How hard should the character push the student?" - "This sets how quickly the character raises the challenge and how many attempts a student gets." Buttons: Gentle / Moderate / Demanding | Moderate |
| 5 | "When a student is stuck, how much help is acceptable?" - "This limits assistance so the student still does the thinking." Buttons: No hints - only repeat the question / Guiding questions only / Guiding questions, then point back to the materials | Guiding questions, then point back to the materials |
| 6 | "After the scenario, what different situation should students be able to carry this into?" - "Used for the transfer question at the end of feedback." Free text | Clicked "I'm not sure - let Primer suggest..." (deliberately, to see what the tool invents) |

After question 6 the tool went straight to "Review the design" (step 3 of 4).

## 3. The proposed design as shown (version 1, "Draft", copied text)

Collapsed sections ("1. Preparation", "2. Practice", "3. Feedback and transfer") were expanded before copying. "From you" / "Primer's suggestion" are the tool's own provenance tags; "Edit" marks an edit button.

```text

What a p-value does and does not tell you
Draft
Version 1 of 1 · Teachback
What students will learn and do
Learning goalFrom you Edit
Students can correctly interpret a p-value from a two-group comparison in plain language, and can explain what it does not tell us (it is not the probability the null hypothesis is true, and it says nothing about how large or important the effect is)
StudentsFrom you Edit
Second-year undergraduate psychology students in a research methods seminar (ages 19-21, about 28 per group). Many are anxious about maths and switch off if spoken to in formulas. Speak to them in plain English, use the sleep-and-memory study as the running example, and do not be condescending
The student's jobFrom you Edit
Explain the result of the sleep-and-memory study to a sceptical classmate who missed the lecture and thinks p = .03 means there is a 3% chance the result is a fluke. The student should say what the p-value means, correct the classmate's wrong readings, and say what else they would need to look at before deciding whether the finding matters
Who they talk toFrom you Edit
Aiko Tanaka, A classmate called Jordan who missed the lecture and has to write up the sleep-and-memory result for a lab report due tomorrow. Jordan is confident but wrong: they think p = .03 means there is a 3% chance the result is a fluke and that the nap effect is therefore 'big'. Jordan wants a sentence they can safely put in their report and will push back until the explanation actually makes sense to them
What is at stakeFrom you Edit
Jordan writes in the lab report that 'there is only a 3% chance the null hypothesis is true, so napping definitely improves memory a lot'. The marker takes marks off for misinterpreting the test, and Jordan goes on repeating the mistake in their final-year project
How hard the character pushes Edit
moderate
Help when stuck Edit
Guiding questions, then a pointer back to the materials
Constraints
Must fit in 15 minutes of a 50-minute seminar
Text only: students work on their own laptops in a shared room with no headphones, so no audio
No formulas or calculation required
plain-language reasoning only
Success criteria

Feedback is given only on these. "Listens for" are the words Primer matches in a student's answer; edit them if they are off.

Criterion 1From you Edit
States that the p-value is calculated assuming the null hypothesis is true (it is the probability of data at least this extreme if there were really no difference)
Listens for: value, calculated, assuming, null, hypothesis, true, probability, data, least, extreme, really, difference Edit
Criterion 2From you Edit
Explicitly rejects the reading that p is the probability the null hypothesis is true or that the result is due to chance
Listens for: rejects, reading, probability, null, hypothesis, true, result, due, chance, difference, recall, population Edit
Criterion 3From you Edit
Separates statistical significance from the size or importance of the effect, and refers to the effect size or confidence interval
Listens for: statistical, significance, size, importance, effect, refers, confidence, interval, hypothesis, plausible, probable, information Edit
Criterion 4From you Edit
Says that a non-significant result is not proof of no effect, and mentions sample size or power
Listens for: non, significant, result, proof, effect, mentions, sample, size, power, hypothesis, plausible, probable Edit
Misconceptions to test
Misconception 1From you Edit
p = .03 means there is a 3% chance the null hypothesis is true (or a 97% chance the treatment works)
Misconception 2From you Edit
A smaller p-value means a bigger or more important effect, and p > .05 proves there is no effect
What the student experiences
1. Preparation
Briefing Edit
Purpose: Students can correctly interpret a p-value from a two-group comparison in plain language, and can explain what it does not tell us (it is not the probability the null hypothesis is true, and it says nothing about how large or important the effect is).
Your role: Explain the result of the sleep-and-memory study to a sceptical classmate who missed the lecture and thinks p = .03 means there is a 3% chance the result is a fluke. The student should say what the p-value means, correct the classmate's wrong readings, and say what else they would need to look at before deciding whether the finding matters.
You will teach Aiko Tanaka, A classmate called Jordan who missed the lecture and has to write up the sleep-and-memory result for a lab report due tomorrow. Jordan is confident but wrong: they think p = .03 means there is a 3% chance the result is a fluke and that the nap effect is therefore 'big'. Jordan wants a sentence they can safely put in their report and will push back until the explanation actually makes sense to them.
Keep in mind: Must fit in 15 minutes of a 50-minute seminar; Text only: students work on their own laptops in a shared room with no headphones, so no audio; No formulas or calculation required; plain-language reasoning only.
Key points, quoted from your material
Start with the null hypothesis: in the population, napping makes no difference to recall.
Pasted material
Start with the null hypothesis: in the population, napping makes no difference to recall.
Pasted material
Forty students are randomly split into two groups.
Pasted material
Questions before they start
Before you begin: in your own words, what do you already know about hypothesis?
Your teacher expects you to bring this with you: They know means, standard deviations and the idea that samples vary by chance. They have met the null hypothesis in lectures and have run an independent-samples t-test in software by following instructions, but they have never had to say in words what the output means. Where might it matter in what you are about to do?
2. Practice with Aiko Tanaka
Opening line Edit
Hi, I'm Aiko. I'm A classmate called Jordan who missed the lecture and has to write up the sleep-and-memory result for a lab report due tomorrow. Jordan is confident but wrong: they think p = .03 means there is a 3% chance the result is a fluke and that the nap effect is therefore 'big'. Jordan wants a sentence they can safely put in their report and will push back until the explanation actually makes sense to them. I was told you can help me understand this. I really am starting from zero, so go slowly.
For criterion 1
Asks: Here's what I don't get yet. Can you state that the p-value is calculated assuming the null hypothesis is true (it is the probability of data at least this extreme if there were really no difference), in a way a beginner would follow?
If the student shows it: Okay, I think I follow. But what if someone said the opposite? How would you convince them, thinking about this: must fit in 15 minutes of a 50-minute seminar?
If the student is stuck: I'm lost. Could you try again with one concrete example? → Go back to what you were given before we started. Which part of it deals with value and calculated? What does it imply here?
For criterion 2
Asks: Here's what I don't get yet. Can you explicitly rejects the reading that p is the probability the null hypothesis is true or that the result is due to chance, in a way a beginner would follow?
If the student shows it: Okay, I think I follow. But what if someone said the opposite? How would you convince them, thinking about this: must fit in 15 minutes of a 50-minute seminar?
If the student is stuck: I'm lost. Could you try again with one concrete example? → Go back to what you were given before we started. Which part of it deals with rejects and reading? What does it imply here?
For criterion 3
Asks: Here's what I don't get yet. Can you separate statistical significance from the size or importance of the effect, and refers to the effect size or confidence interval, in a way a beginner would follow?
If the student shows it: Okay, I think I follow. But what if someone said the opposite? How would you convince them, thinking about this: must fit in 15 minutes of a 50-minute seminar?
If the student is stuck: I'm lost. Could you try again with one concrete example? → Go back to what you were given before we started. Which part of it deals with statistical and significance? What does it imply here?
For criterion 4
Asks: Here's what I don't get yet. Can you say that a non-significant result is not proof of no effect, and mentions sample size or power, in a way a beginner would follow?
If the student shows it: Okay, I think I follow. But what if someone said the opposite? How would you convince them, thinking about this: must fit in 15 minutes of a 50-minute seminar?
If the student is stuck: I'm lost. Could you try again with one concrete example? → Go back to what you were given before we started. Which part of it deals with non and significant? What does it imply here?
Misconception check
Oh! So that means p = .03 means there is a 3% chance the null hypothesis is true (or a 97% chance the treatment works), right?
Misconception check
Oh! So that means a smaller p-value means a bigger or more important effect, and p > .05 proves there is no effect, right?
If the student asks for the answer
I can't tell you the answer; I'm the one who doesn't know it! Try explaining the part you're surest of.

Up to 14 student turns; 3 attempts per criterion.

3. Feedback and transfer
Self-assessment first
Before you see any feedback: how do you think that went? Which moment are you most satisfied with?
What would you do differently if you did it again?
Then
For each criterion: what the student actually wrote, quoted; what that suggests, marked as inference; and a next step. Criteria the student was never asked about are reported as not assessed.
Transfer questionPrimer's suggestion Edit
Imagine the same ideas coming up somewhere quite different from Aiko Tanaka's situation. Describe one such situation and how you would handle it.
Decisions Primer made for you
Template chosen by Primer: Teachback, based on the student work you described.
No transfer situation was given, so the final question asks students to think of one themselves.

Change any of these with Edit above or by requesting a change below.
```

Below this the page has three more collapsed sections, which I also read:

- **"Where each part came from"**: a table mapping every part to a source ("Educator: objective", "Educator: answers.character", "Educator: evidenceOfProgress[0]", "Educator material: Pasted material" ...). It lists ten "Key point" rows keyed by single words ("hypothesis", "difference", "group", "value", "null", "effect", "word", "study", "recall", "mean"); four of the ten are the same sentence ("Start with the null hypothesis..."), three are my title run into my first sentence ("Reading a p-value: the sleep and memory study A researcher wants to know whether a short nap helps people remember word lists.") and one is the bare question "What does p = .03 mean?".
- **"Instructions given to the system (advanced)"**: CHARACTER / EVIDENCE / FEEDBACK prompt text regenerated from the design ("You play Aiko Tanaka, A classmate called Jordan who ...", "Difficulty: moderate. Help policy: questions-then-materials.", the criteria with their "look for" word lists, both misconceptions).
- **"History (1)"**: "2026-11-14 05:35 | Primer (deterministic provider) | propose -> Draft | Proposed from educator intake." and "Versions: 1".

Then "Request a change" (free-text box, "Apply change") and "Decision" ("Students cannot open anything until you approve." / Your name / Approve for classroom use / Approve for testing only / Reject).

### My judgement of version 1 as a teacher

What is faithful: the learning goal, student description, student job, stakes, all four criteria and both misconceptions are my own words, unaltered, each tagged "From you" with its own Edit button. Nothing about statistics was invented or misstated, because nothing about statistics was generated at all. The two decisions the tool made (Teachback; no transfer situation) are listed under "Decisions Primer made for you". That part is honest and I could trust it.

What is not usable as proposed:

- The character is **"Aiko Tanaka, A classmate called Jordan ..."**. I named the character Jordan; the tool invented a second name, glued my paragraph after it, and tagged the result "From you". The opening line is my third-person description spoken in the first person: "Hi, I'm Aiko. I'm A classmate called Jordan who missed the lecture ... Jordan is confident but wrong ...".
- Every character question is my marking criterion pasted into a frame: "Can you explicitly rejects the reading that p is ...", "Can you separate statistical significance ..., and refers to the effect size ...". This is ungrammatical, hands the student the answer, and contradicts the opening "I really am starting from zero".
- Every follow-up reads "How would you convince them, thinking about this: must fit in 15 minutes of a 50-minute seminar?" - my timetable constraint injected into the character's speech, five times.
- The "Listens for" lists are single words stripped from my criterion sentences: "value", "rejects", "reading", "refers", "mentions", "non", "least", "really". Criterion 2 (rejecting a misreading) is matched on "probability, null, hypothesis, true, chance", which the misconception itself contains.
- "Key points, quoted from your material" shows three quotes, two of them identical, the third "Forty students are randomly split into two groups." None of the actual content (definition of p, effect size, CI, non-significance) is surfaced, and the student never sees the rest of the material.
- Preparation question 1: "what do you already know about hypothesis?". Question 2 pastes my note to the tool at the student: "Your teacher expects you to bring this with you: They know means, standard deviations ... they have never had to say in words what the output means."
- My third constraint line was split at its semicolon into two constraints ("No formulas or calculation required" / "plain-language reasoning only"). The teacher-facing logistics ("no headphones, so no audio") go into the student's "Keep in mind" line.
- "How hard the character pushes: moderate" - lower-case internal value.

## 4. Revisions and direct edits: what I asked and exactly what changed

Every change creates a new numbered version with status "Revised draft" and the banner "This is now version N and needs approval". Old versions stay readable ("Superseded by a newer version") but are read-only; there is no undo or "restore this version".

First attempt at "Apply change" was refused: "Enter your name first. It is recorded with every decision." The name box is further down the page under "Decision".

### Plain-language requests (first design, design-13ggr2r onward)

| # | My request | Tool's response | What actually changed (diff of full page text) |
|---|---|---|---|
| R1 | "The character should be called Jordan, not Aiko Tanaka. Jordan is a classmate who missed the lecture and needs to write up the nap study for a lab report due tomorrow." | "Changed: Character role: [old text] -> called Jordan, not Aiko Tanaka. Jordan is a classmate who ... This is now version 2 and needs approval." | The name did **not** change. My sentence minus "The character should be" replaced the role text. Result in four places: "Aiko Tanaka, called Jordan, not Aiko Tanaka. Jordan is a classmate ..."; opening line "Hi, I'm Aiko. I'm called Jordan, not Aiko Tanaka. Jordan is a classmate who missed the lecture ...". Worse than before. |
| R2 | "Add a criterion: Uses the actual numbers from the nap study (17.1 versus 14.9 words, p = .03) when explaining, rather than talking only in general terms" | "Changed: Added criterion c5: ... version 3" | Worked structurally: Criterion 5 added, a "For criterion 5" question block added ("Can you use the actual numbers ..., in a way a beginner would follow?"), turn limit rose from 14 to 17, system instructions updated, provenance "Educator: revision". But "Listens for: actual, numbers, nap, study, versus, words, explaining, rather, talking, general, terms" - none of the numbers. |
| R3 | "The follow-up questions shouldn't mention the 15-minute seminar constraint to students; that is a note for me, not something the character would say. Also the character's questions read like my marking criteria pasted into a sentence - please make them sound like a confused student." | "Primer could not turn that into a specific change, so it was Recorded as a constraint the character and briefing must respect: \"...\" ... version 4" | Nothing I asked for changed. My whole complaint was appended verbatim as a new Constraint, and therefore into the **student-facing** briefing "Keep in mind: ...; The follow-up questions shouldn't mention the 15-minute seminar constraint to students; that is a note for me ..." and into the system instructions. The follow-ups still say "must fit in 15 minutes of a 50-minute seminar". |
| R4 | "Remove the last constraint (the one beginning 'The follow-up questions shouldn't mention'). I don't want students to see it." | Same "could not turn that into a specific change ... Recorded as a constraint" - version 5 | The removal request itself was added as a further constraint and shown to students. Constraints have no Edit button, so there is no way in the interface to delete either one. |

The tool is honest that it failed (it says so and logs it), but the fallback makes the design worse and cannot be undone.

### Direct edits (Edit button -> browser prompt() pre-filled with current text)

| # | Field | New value | Result |
|---|---|---|---|
| E1 | Who they talk to | "a classmate who missed the lecture and has to write up the nap study for a lab report due tomorrow. Confident but wrong about what p = .03 means, and will push back until the explanation makes sense" | "Saved as version 6. Everything that depends on it was updated." Role text replaced in the summary, briefing, opening line and system instructions. The name "Aiko Tanaka" is not part of the editable text and stayed. |
| E2 | Opening line | "Hi, I'm Jordan. I missed the stats lecture and I have to write up the nap study by tomorrow. The output says p = .03, so that means there's only a 3% chance the result is a fluke, right? Can I just write that?" | Saved as version 7, verbatim. |
| E3 | Criterion 2 "Words to listen for (comma separated)" | "not the probability, does not mean, null, assuming, if there were no difference, about the data" | Saved as version 8. Side effect: the stuck-hint became "Which part of it deals with not the probability and does not mean?". |
| E4 | Briefing | Rewrote all four lines, naming Jordan and deleting the junk constraints from "Keep in mind" | Saved as version 9, verbatim. The junk constraints remained in the Constraints list and system instructions. (Cancelling a prompt correctly changed nothing.) |
| E5 | Transfer question | "A newspaper headline says a new revision app 'significantly improves exam scores (p = .04)' in a study of 6,000 pupils. What would you want to know before recommending the app to a friend, and why?" | Saved as version 10, but wrapped: "A different situation: [my text]?. What from this session would you use there, and what would you change?" (note "?."). Still tagged "Primer's suggestion", and "Decisions Primer made for you" still says "No transfer situation was given, so the final question asks students to think of one themselves." |

Not editable anywhere: the character's name, the Constraints list, the per-criterion "Asks / If the student shows it / If the student is stuck" lines, the misconception-check lines, the preparation questions, the key points, the turn limits.

### Second design (after the Reject dead end)

Re-entered the same brief and answers (new design `design-h1xppq`, version 1 identical), then applied R2 and E1-E5 only, skipping R1/R3/R4 because they are irreversible damage. Final: `design-hlwx3o`, version 7.

## 5. Approval state at each point, and whether it was enforced

| Point | State shown | Could a student experience be opened? |
|---|---|---|
| After the interview | "Draft", version 1. "Nothing is final until you approve it." "Students cannot open anything until you approve." | No. The design page has no build/open control. The student page (learn.html) listed only two pre-installed examples. Guessed URLs (`learn.html#design-...`, `?design=`, `?id=`, `#experience/...`) all fell back to the list. Enforced. |
| After each revision/edit | "Revised draft", version N, "needs approval" | No, as above. |
| Approve with empty name | Refused: "Enter your name first. It is recorded with every decision." | - |
| "Reject" (first design, version 10) | A prompt "Reason for rejecting (kept in the history):" (empty reason accepted), then "Rejected / Design rejected. / This design was rejected. Start again from a new experience." | No. All Edit buttons, "Request a change" and the approve buttons disappear. The "a new experience" link opens a blank form. The rejected item stays in "My experiences" and cannot be deleted. Terminal and unrecoverable (F3). |
| "Approve for testing only" (second design, version 7) | "Test-approved (not for classroom use)" - "Students will see a \"test build\" label. Approve it as the educator before classroom use." | "Build the student experience" appears; Edit buttons disappear. I did not build at this stage. |
| "Approve for classroom use" as "Fresh Teacher (simulated)" | "Educator-approved" - "Approved for classroom use. You can now build the student experience." History (9). | Build button present. |
| "Build the student experience" | "The student experience is ready." Controls: "Open as a student", "Download experience file", "Student sessions on this device". | Yes: `learn.html?exp=exp-v3pwiy`; also now first in the student list, without a "Test build" label. |

Approval is enforced in the interface: I found no route to a student experience before an approval. A design that is already approved still shows a "Reject" button next to the built experience; I did not press it.

## 6. Final experience

- Experience id: **exp-v3pwiy** (design `design-hlwx3o`, design version 7, "Educator-approved", approver "Fresh Teacher (simulated)")
- Student link: `http://localhost:8766/primer/learn.html?exp=exp-v3pwiy` (only works in the browser profile that built it; other people need the file)
- Downloaded file: suggested name `what-a-p-value-does-and-does-not-tell-you.primer.json`, saved to `/home/user/123/primer/records/validation/fresh-teacher-experience.primer.json` (33,431 bytes; contains one package, id exp-v3pwiy)
- Student view check: the start page loads ("Three parts: prepare, practise with Aiko Tanaka, then feedback on what you actually wrote. About 15-25 minutes."), asks for a first name, and "Start" opens the Prepare page; "Start practice" opens the conversation. I played seven student turns as "Sam" (session `session-140hpvm`); I did not go on to the Feedback stage.

Excerpt from the practice I played (speaker label is "Aiko Tanaka" throughout):

```text
Aiko Tanaka: Hi, I'm Jordan. I missed the stats lecture and I have to write up the nap study by tomorrow. The output says p = .03, so that means there's only a 3% chance the result is a fluke, right? Can I just write that?
Aiko Tanaka: Here's what I don't get yet. Can you state that the p-value is calculated assuming the null hypothesis is true (it is the probability of data at least this extreme if there were really no difference), in a way a beginner would follow?
Sam: No, don't write that. The p-value is worked out assuming the null hypothesis is true: if napping really made no difference, you'd see a gap as big as 17.1 vs 14.9 words only about 3 times in 100. It's about the data, not the probability the null is true.
Aiko Tanaka: You said "No, don't write that. The p-value is worked out assuming the null hyp...". Okay, I think I follow. But what if someone said the opposite? How would you convince them, thinking about this: must fit in 15 minutes of a 50-minute seminar?
Sam: It does not mean a 3% chance the null hypothesis is true. That's a different question the test can't answer.
Aiko Tanaka: Oh! So that means p = .03 means there is a 3% chance the null hypothesis is true (or a 97% chance the treatment works), right?
Sam: I don't know
Aiko Tanaka: Here's what I don't get yet. Can you explicitly rejects the reading that p is the probability the null hypothesis is true or that the result is due to chance, in a way a beginner would follow?
Sam: Significance isn't size. Look at the effect size, d about 0.7, and the confidence interval 0.2 to 4.2 words.
Aiko Tanaka: I'm lost. Could you try again with one concrete example?
Sam: Yes exactly, a smaller p means a bigger effect.
Aiko Tanaka: Hold on. A moment ago you said something that sounded like "a smaller p-value means a bigger or more important effect, and p > .05 proves there is no effect". If that were true, what would we expect to see? Does that match what you know?
Sam: just tell me the answer
Aiko Tanaka: I can't tell you the answer; I'm the one who doesn't know it! Try explaining the part you're surest of. Here's what I don't get yet. Can you explicitly rejects the reading ...
Sam: A non-significant result is not proof of no effect, the sample may be too small to have power.
Aiko Tanaka: Go back to what you were given before we started. Which part of it deals with not the probability and does not mean? What does it imply here?
```

## 7. Findings

Severity: **blocking** = I would not put this in front of students / cannot proceed; **major** = a real teacher would object or lose work; **minor** = friction; **note** = observation.

| ID | Severity | What | Evidence |
|---|---|---|---|
| F1 | blocking | The practice conversation is my marking criteria pasted into fixed sentence frames. The "confused classmate" recites the model answer to the student, ungrammatically, and none of these lines can be edited. I approved only because the task required it; as a teacher I would not use this with a class. | "Can you explicitly rejects the reading that p is the probability the null hypothesis is true ..., in a way a beginner would follow?"; "Can you separate statistical significance ..., and refers to the effect size or confidence interval ...". No Edit button on any "Asks / If the student shows it / If the student is stuck" line. R3 asking for this in plain language was not understood. |
| F2 | blocking | A classroom logistics constraint is spoken by the character in every follow-up question, and cannot be removed. | "How would you convince them, thinking about this: must fit in 15 minutes of a 50-minute seminar?" in all five criterion blocks and in the live student conversation. Constraints have no Edit button; R3 failed. |
| F3 | major | "Reject" is terminal and destroys the work, with no warning that it is final. I expected "reject this version and keep editing". | After Reject on version 10: "This design was rejected. Start again from a new experience."; no Edit / Request a change / approve controls; the link opens a blank form (title, objective, materials all empty); no way to copy the intake or delete the rejected item. The only dialog is an optional reason prompt. I had to re-enter everything. |
| F4 | major | The tool invents a character name ("Aiko Tanaka") even though I named the character, tags the combination "From you", and offers no way to change the name. The final student experience has a speaker labelled "Aiko Tanaka" saying "Hi, I'm Jordan". | v1: "Who they talk to - From you - Aiko Tanaka, A classmate called Jordan ..."; opening "Hi, I'm Aiko. I'm A classmate called Jordan ...". Student start page: "practise with Aiko Tanaka". Edit prompt for "Who they talk to" contains only the role text. |
| F5 | major | The plain-language revision for the character made the design worse: it pasted my instruction into the role text. | R1 result: "Aiko Tanaka, called Jordan, not Aiko Tanaka. Jordan is a classmate ..." and "Hi, I'm Aiko. I'm called Jordan, not Aiko Tanaka." The tool reported this as a successful "Changed: Character role". |
| F6 | major | Any request the tool cannot parse is saved verbatim as a "constraint" and shown to students in the briefing; it cannot be deleted, and asking to remove it adds another. | R3 and R4: "Keep in mind: ...; The follow-up questions shouldn't mention the 15-minute seminar constraint to students; that is a note for me ...; Remove the last constraint ... I don't want students to see it." Only workaround: hand-edit the Briefing; the text stays in Constraints and the system instructions. |
| F7 | major | "Listens for" word lists are stop-word-filtered fragments of my criterion sentences, not evidence of understanding, so the assessment is unreliable. In play, two clear, correct rejections of the misreading were not recognised and the character replied by asserting the misconception. | v1 lists include "value", "rejects", "reading", "refers", "mentions", "non", "least", "really"; c3 and c4 pick up "plausible, probable, information" from an unrelated paragraph. New criterion 5 is about using the numbers and lists none. Transcript above, turns 1-3. Fixing this means hand-writing phrase lists for every criterion in a prompt box. |
| F8 | major | Students get almost none of my material. "Key points, quoted from your material" is three sentences, two identical, one trivial; there is no way to choose or edit them and the full text is not shown to students. | Prepare page: "Start with the null hypothesis: ..." (twice), "Forty students are randomly split into two groups." The form promised "The preparation briefing quotes from it." The definition of p, effect size, CI and the non-significance paragraph never appear, though the stuck-hint says "Go back to what you were given before we started". |
| F9 | major | Preparation questions are broken and not editable. One is ungrammatical; the other shows students my private description of them. | "what do you already know about hypothesis?"; "Your teacher expects you to bring this with you: They know means, standard deviations ... they have never had to say in words what the output means. Where might it matter in what you are about to do?" |
| F10 | major | After a correct answer the scripted flow is incoherent, and the misconception probe is not tied to what the student said. | After the student wrote "It does not mean a 3% chance the null hypothesis is true", the character said "Oh! So that means p = .03 means there is a 3% chance the null hypothesis is true (or a 97% chance the treatment works), right?". A correct effect-size/CI answer got "I'm lost. Could you try again with one concrete example?" because the script was still on criterion 2. |
| F11 | minor | Nothing in the design is specific to my subject beyond text I typed; the "proposal" is a template fill. The landing page does say "This version responds using fixed rules, not a language model", but the teacher workspace calls it a design "Primer proposes" and invites free-text requests, which sets a wrong expectation. | History: "Primer (deterministic provider)". Only requests matching the listed patterns work (R2 worked; R1 half; R3/R4 not at all). |
| F12 | minor | No undo and no "restore version". Old versions are read-only. | "Superseded by a newer version ... This version has been replaced. Open the latest version"; no controls. |
| F13 | minor | Direct edits use browser prompt() boxes: a single-line box for a four-line briefing or a 600-character paragraph. A real browser will make line breaks hard to keep. | Edit on "Briefing" opened prompt() with the four lines joined by newlines. |
| F14 | minor | The transfer-question edit is silently wrapped in extra text, with a punctuation error, and stale labels remain. | "A different situation: ... and why?. What from this session would you use there, and what would you change?"; still tagged "Primer's suggestion"; "Decisions Primer made for you" still says "No transfer situation was given ...". |
| F15 | minor | "Apply change" and Edit need "Your name", which sits lower down under "Decision". I hesitated: the error names no location. | "Enter your name first. It is recorded with every decision." |
| F16 | minor | Constraint lines are split on semicolons, and teacher-only logistics go into the student briefing. | "No formulas or calculation required; plain-language reasoning only" became two constraints. Student briefing v1: "Text only: students work on their own laptops in a shared room with no headphones, so no audio". |
| F17 | minor | The student start page says "About 15-25 minutes" although my constraint was 15 minutes; the design allows up to 17 student turns with no visible way for the teacher to set a limit. I saw no "finish" control in the practice screen during seven turns. | Start page text; "Up to 17 student turns; 3 attempts per criterion." |
| F18 | minor | After approval the Edit buttons vanish, but the page still says "Change any of these with Edit above or by requesting a change below." Only "Request a change" remains, which is the weaker route. | Test-approved and Educator-approved pages. |
| F19 | minor | "I'm not sure - let Primer suggest, and show me what it chose" shows nothing at the time; the choice appears only on the design page. The Teachback rationale is generic ("based on the student work you described"). | Question 1 -> straight to question 2. |
| F20 | minor | Terminology a teacher has to decode: "Teachback"; "Listens for"; "Stakes create the productive friction that makes the content matter"; "transfer"; "Instructions given to the system (advanced)"; provenance paths like "Educator: answers.character", "evidenceOfProgress[0]"; history notes "Edited criteria.1.lookFors"; "deterministic provider"; lower-case "moderate"; "Build the student experience" as a separate step after approving. | Quoted from the pages. |
| F21 | minor | A "Reject" button sits beside the built, classroom-approved experience. Given F3, one mis-click looks dangerous. Not pressed, so the effect on the built experience is unknown. | Educator-approved page: Your name / Reject / "The student experience is built." |
| F22 | note | The student list shows two unrelated pre-installed "Test build" experiences (a salary negotiation and a limestone cave) next to mine. | learn.html "Choose an experience". |
| F23 | note | Sharing is by file only: "send them the downloaded file and the student page, where they choose 'Open an experience file'". For 28 students in a 15-minute slot that is a real overhead, and the teacher cannot see their sessions ("Their work stays in their own browser"). | Text under the build controls. |
| F24 | note | What worked well: the entry point was obvious; the form's field help was clear; my own text was preserved exactly; provenance tags and the "Decisions Primer made for you" box make the tool's assumptions visible; every change is versioned and logged with my name; approval gating was enforced; "add a criterion" propagated everywhere; cancelling an edit changed nothing; build, download and student start all worked first time; the tool admits when it cannot interpret a request. | Sections 3-6. |
| F25 | note | Test-harness caveat, not a tool defect: my headless browser profile did not keep localStorage between separate script runs, so I saved and restored the tool's localStorage keys myself between runs. Stored content was not altered. I did not test whether a real browser refresh mid-interview keeps the answers. | - |

## 8. Bottom line

The teacher-facing half (form, questions, provenance, versioning, approval gate, build, download) is clear and I got through it without help. The generated student experience is not something I would run in a seminar: the character speaks my rubric and my timetable, carries a name I did not choose and cannot change, the evidence matching is keyword fragments that failed on correct answers, and students see three near-useless sentences of my 340-word text. The plain-language revision box handles a few fixed patterns and otherwise damages the design in ways that cannot be reversed, and "Reject" throws the whole thing away.
