# Fresh-teacher re-check: Primer authoring flow (after changes)

Date: 2026-11-14. Tester: simulated teacher ("Fresh Teacher 2 (simulated)"). I used only the web interface at http://localhost:8766/primer/, in headless Chromium through Playwright with one persistent browser profile. Apart from the earlier report, the only file I opened was the experience file I downloaded myself.

Brief: the same as in `fresh-teacher-report.md`. I entered the same title, objective, students, prior knowledge, student work, four evidence lines, two misconceptions, three constraints and the 340-word material. Kind of practice was "Not sure — ask me" and the setting was "No 3D world (conversation only)". My answers to the six questions were also the same: Q1 "I'm not sure — let Primer decide", Q2 the Jordan paragraph, Q3 the lab-report stakes, Q4 Moderate, Q5 "Guiding questions, then point back to the materials", Q6 "I'm not sure".

Final result: design version 40, "Educator-approved" by "Fresh Teacher 2 (simulated)", student experience `exp-1qwgw6m`. The file is saved as `records/validation/statistics-experience.primer.json` (contains one package).

## 1. Status of F1–F21

Counts: **11 fixed, 8 partly fixed, 2 not fixed**, 0 not applicable.

| ID | Status | Evidence now |
|---|---|---|
| F1 Character questions are my criteria pasted into frames, and cannot be edited | **Partly fixed** | Version 1 no longer pastes the criterion. Instead it writes a keyword list: "Here's something I don't understand yet: probability, null and hypothesis. How would you explain it to me?" Each question now has a "Written by Primer — check it" tag and an **Edit** button, and "Decisions Primer made for you" warns me to edit them. I rewrote all four. Two kinds of line still cannot be edited: "If the student shows it" ("Okay, I think I follow. But suppose someone disagreed with you…") and "If the student is stuck" ("…Which part deals with probability, null and hypothesis? What does it imply here?"). The stuck hint is still a keyword list taken from the criterion, and it did not change when I edited the evidence words. |
| F2 Classroom constraint spoken by the character | **Fixed** | Follow-ups now read "But suppose someone disagreed with you. What would you say to convince them?" The section is labelled "Classroom constraints (never shown to students)". The constraint did not appear in the student Prepare, Practice or Feedback pages. |
| F3 Reject is terminal | **Fixed** | "Reject this version" opens an in-page dialog: "Why are you rejecting this version? … You can still edit it afterwards to continue from a new draft." After rejecting, the page says "Rejected. Edit anything, or request a change, to continue from a new draft." All Edit buttons stay. One edit made version 9 a "Revised draft", and I approved later versions as normal. |
| F4 Invented name ("Aiko Tanaka"); name cannot be changed | **Fixed** | Version 1 has "Character's name — From you — Jordan", taken from my answer, with its own Edit. Renaming it to Alex changed the briefing, "2. Practice with Alex" and "Hi, I'm Alex"; renaming it back worked too. My own role text still says "Jordan is confident…", which is expected because that is text I wrote. See N5 for the default opening line. |
| F5 Plain-language rename damaged the design | **Fixed (no damage)** | My R1 request, word for word, is now "saved as a note for you only (students never see it) … Nothing in the experience changed. Use the Edit buttons to make this change yourself." However, rename requests are still not understood (see N6). |
| F6 Requests the tool cannot interpret become student-visible constraints and cannot be deleted | **Fixed** | R3 became a private note ("Your notes (never shown to students)"). R4 ("Remove the last constraint…") correctly removed that note: "Changed: Removed: …". Saving the notes field empty removed every note. None of this text reached the student pages. It does reach the downloaded file (N4). |
| F7 "Listens for" lists are word fragments, and assessment is unreliable | **Partly fixed** | The lists are cleaner ("rejects", "reading", "refers" and "mentions" are gone), they are renamed "Words that count as evidence" and they can be edited in a textarea. Criteria 3 and 4 still contain "plausible, probable, information, extra". Matching is still unreliable, and the feedback is now wrong about it (N1). In both play-throughs, clear rejections of the misreading were not credited for criterion 2. |
| F8 Students get almost none of the material | **Partly fixed** | Prepare now has "Read all of the course material" with the full 340 words, plus "You can come back to this material during practice" and a "Course material" button inside practice. There are five "Key points", now all different. However, they cannot be edited or chosen. One of them is my title run into the first sentence ("Reading a p-value: the sleep and memory study A researcher wants to know…"). None covers effect size, CI or non-significance. |
| F9 Preparation questions ungrammatical and not editable | **Fixed** | The default is now "…what do you already know about "What a p-value does and does not tell you"?" plus "Which idea from earlier lessons do you expect to need most here, and why?". These are grammatical, my private prior-knowledge note is no longer shown, and the field has an Edit button ("one per line"). I replaced both questions. |
| F10 Scripted flow incoherent; misconception probe not tied to the student's words | **Not fixed** | The script still goes one criterion at a time. In run 1, the student's correct effect-size answer, given while the script was on criterion 2, got "Go back to the course material… Which part deals with probability, null and hypothesis?". In run 2, the student's correct answer about power, given while the script was on criterion 3, got "I'm lost. Could you try again with one concrete example?". The misconception-1 probe fired straight after a correct rejection of it. In run 2 the student wrote "Smaller p means a stronger effect" (misconception 2), and nothing picked it up: not the character, and not "Ideas to check". |
| F11 Expectation of AI generation vs fixed rules | **Fixed** | The design page says "Primer builds it from your text with fixed rules, so read the character's lines carefully". The landing page says "fixed rules, not a language model". The request box lists the patterns it understands. |
| F12 No undo or restore version | **Not fixed** | Old versions (the "Versions: 1 · 2 · …" links) open read-only with "Superseded by a newer version… Open the latest version (9)". There is no restore control. The impact is lower now, because every field can be edited by hand. |
| F13 Edits use browser prompt() | **Fixed** | Every Edit opens an in-page `<dialog>` with a multi-line textarea or a select, help text ("One per line. Leave empty to remove all."; "A number from 2 to 40."), Cancel and Save. Cancel changed nothing. |
| F14 Transfer edit wrapped, mis-punctuated, stale labels | **Partly fixed** | On the design page the field is "Transfer situation — From you — [my text]" exactly, and the "No transfer situation was given" decision line disappears. The student still sees a wrapper: "A different situation: … and why. What from this session would you use there, and what would you change?" My closing "?" became "." and the wrapper's question follows it. I rewrote my text as a statement so that the wrapper reads acceptably. |
| F15 Name box far from "Apply change" | **Fixed** | "Your name — Recorded with every edit, change and decision." is now at the top of the design page. |
| F16 Constraints split on ";"; logistics in student briefing | **Fixed** | "No formulas or calculation required; plain-language reasoning only" stays one line. The default briefing no longer has a "Keep in mind" line containing the constraints. |
| F17 "About 15–25 minutes", no visible limit or finish control | **Partly fixed** | "Longest practice (student replies)" can now be edited (I set 12). The student page has "End practice now" and "Reply n of at most 12". The start page still says "About 25 minutes at most", against my 15-minute constraint, and I could not change that. |
| F18 Edit buttons vanish after approval, with stale text | **Fixed** | After approval the Edit buttons stay. The page says "Any edit now creates a new draft that needs your approval again. Students keep the approved version until then." |
| F19 "Let Primer suggest" shows nothing; rationale generic | **Partly fixed** | The skip button now reads "let Primer decide (its choice is listed on the design page, where you can change it)", and "Kind of practice" has an Edit (select). The rationale is still generic: "Teachback, based on the student work you described." |
| F20 Jargon | **Partly fixed** | Improved: "Words that count as evidence"; provenance in plain words ("From your answer about the character"); "Students (not shown to them)"; "Create the student experience". Unchanged: "Stakes create the productive friction…", "Teachback", lower-case "moderate"/"demanding", "Instructions the system follows (advanced)", "Primer (deterministic provider)", and history notes such as "Edited criteria.1.lookFors" and "Edited practice.maxTurns". |
| F21 Reject button beside the built, approved experience | **Partly fixed** | The button is now "Withdraw approval (reject)", and the work can be recovered (see F3). But it does not do what it says: see N3. |

## 2. New findings

| ID | Severity | What | Evidence |
|---|---|---|---|
| N1 | **blocking** | The feedback contradicts its own quotes. It tells a student they did not use words that appear in the reply it quotes, then sets a "next step" to write what they already wrote. I would not give this to students. | Run 2, criterion 2 under "Where to grow": "your 4 replies did not bring in not, doesn't, isn't." It then quotes "No, that's **not** it. p = .03 **doesn't** tell you the chance the null is true, and it **isn't** a 97% chance napping works…". Next step: "…find the part about not and doesn't, then write two sentences in which you explicitly rejects the reading…". Run 1 was the same with my first word list: "did not bring in not the probability, does not mean…", quoting "p = .03 **does not mean** a 3% chance…". In both runs the same feedback page says under "Ideas to check": "You pushed back on this idea." |
| N2 | major | The feedback does not report a misconception the student actually stated, and it rates every criterion the same way, whatever the quality of the answer. | Run 2: the student wrote "Smaller p means a stronger effect" and later corrected it. "Ideas to check" lists only misconception 1. Each addressed criterion got "Our guess: this is developing; the idea is there but not yet fully worked out", including complete answers. |
| N3 | major | "Withdraw approval (reject)" says students cannot open the experience, but the built experience stays open. | Dialog: "Students will not be able to open it." After withdrawing, `learn.html?exp=exp-nq13w6` still opened, and "Start" led straight into Prepare. The student list still showed it under "From your teacher". The list now shows three entries with the same title "What a p-value does and does not tell you" (one build per approval), and none is marked as old or withdrawn. |
| N4 | major | Fields labelled "never shown to students" are inside the experience file that the teacher is told to send to students. | The downloaded `statistics-experience.primer.json` contains the "Students" description ("Many are anxious about maths…"), my private revision requests and notes ("The character should be called Jordan, not Aiko Tanaka…"), and my rejection reason. The UI hides them, but any student who opens the file can read them. |
| N5 | major | By default, students see the teacher's description of the scene, which gives the misreading away. The fields that reach students are not marked as such. Editing the Briefing does not change these places. | Practice header for students (default role text): "You are talking with Jordan, A classmate… Jordan is confident but wrong: they think p = .03 means… Your job: … **The student should say** what the p-value means…". The start page shows "What you will do: … The student should say…" and "What this is for: [full objective including the answers in brackets]". The default opening line is still third person turned into first person: "Hi, I'm Jordan. I'm a classmate who… Jordan is confident but wrong: they think…". I had to rewrite "The student's job", "Who the character is" and "Learning goal" to make these screens fit for students. |
| N6 | minor | The request patterns the tool advertises do not work, and each failed request still creates a new version. | Help text: understands "the character should be …", "call the character …". "Call the character Alex" and "call the character: Alex" were both "saved as a note… Nothing in the experience changed", and that produced versions 2–5 with no content change. Saving an unchanged value (12 → 12) also created version 40. |
| N7 | minor | The opening line and the first question are posted together, before the student can reply. If the opening line ends with a question, the conversation does not make sense. | Run 1: "…Can I just write that?" was followed immediately by "Okay, so if p = .03 isn't 'the chance it's a fluke', what actually is it?". I rewrote the opening line so that it ends without a question. |
| N8 | minor | The feedback "Next step" pastes the criterion into a sentence frame, which makes it ungrammatical. | "write two sentences in which you explicitly rejects the reading that p is…". |
| N9 | minor | Withdrawing approval and re-approving needs a dummy edit first. | "Rejected. Edit or request a change to continue." There is no approve button until something is edited, so I re-saved "Longest practice" as 12. |
| N10 | note | The student's "End practice now" uses a native browser confirm(). The teacher edit controls are now in-page dialogs. | "End practice now? Anything you have not been asked about yet will be marked as not assessed." |
| N11 | note | The sample experiences are now in a separate "Sample experiences" section, which resolves F22. "Student sessions on this device" lists the sessions for the current build only. | Student list page; the sessions page showed "Priya · completed" only. |

## 3. What I had to edit by hand

Everything below was done through the Edit dialogs. Each save created a new version.

1. **Opening line**: "Hi, I'm Jordan. I missed the stats lecture and I have to write up the nap study by tomorrow. The output says p = .03. I was going to write 'there's only a 3% chance the result is a fluke', but someone said that's not quite right."
2. **All four character questions** (see section 4).
3. **All four "Words that count as evidence" lists.** I rewrote them twice, and they still did not make criterion 2 reliable (N1).
4. **Both misconceptions**, reworded so that the fixed "Oh! So does that mean …?" frame reads naturally.
5. **Briefing**: rewritten in the second person, without the objective's answers, with the nap-study numbers.
6. **Questions before they start**: "Before you start: in one sentence, what do you think p = .03 tells you about the nap study?" / "Apart from the p-value, what else would you want to know before saying napping 'works'?"
7. **Longest practice**: 14 → 12 student replies.
8. **Transfer situation**: rewritten as a statement so that the student-side wrapper reads acceptably.
9. **The student's job, Who the character is, Learning goal**: rewritten in student-safe form, because the start page and the practice header show them verbatim (N5).
10. **Notes cleared**, and difficulty set back to Moderate (my "make it harder" test had set Demanding).

I could not edit: the "If the student shows it" and "If the student is stuck" lines, the misconception-check frame, the "asks for the answer" line, the key-point highlights, the "About 25 minutes" estimate, or the transfer wrapper.

## 4. Final design: character lines as shown (version 40)

```text
2. Practice with Jordan
Opening line: Hi, I'm Jordan. I missed the stats lecture and I have to write up the nap study by tomorrow. The output says p = .03. I was going to write 'there's only a 3% chance the result is a fluke', but someone said that's not quite right.
For criterion 1
Asks: So what does p = .03 actually mean? What is the 3% a percentage of?
If the student shows it: Okay, I think I follow. But suppose someone disagreed with you. What would you say to convince them?
If the student is stuck: I'm lost. Could you try again with one concrete example? → Go back to the course material you read before we started. Which part deals with p-value, assuming and null? What does it imply here?
For criterion 2
Asks: Hang on. If the null hypothesis is 'napping does nothing', why can't the test just tell me how likely it is that napping does nothing?
If the student is stuck: … Which part deals with probability, null and hypothesis? What does it imply here?
For criterion 3
Asks: Fine, but .03 is a really small number, so the nap effect must be huge, right? Can I write that napping has a big effect on memory?
If the student is stuck: … Which part deals with significance, size and importance? What does it imply here?
For criterion 4
Asks: And if it had come out as p = .20, I'd just write that napping does nothing, yeah?
If the student is stuck: … Which part deals with non-significant, result and proof? What does it imply here?
Misconception check: Oh! So does that mean there's only a 3% chance the null hypothesis is true, so a 97% chance that napping really works?
Misconception check: Oh! So does that mean a smaller p-value means a bigger, more important effect, and a p-value above .05 would prove napping does nothing?
If the student asks for the answer: I can't tell you the answer; I'm the one who doesn't know it! Try explaining the part you're surest of.
Up to 12 student replies; 3 attempts per criterion. Students can also end practice themselves.
Transfer situation: a newspaper headline says a new revision app 'significantly improves exam scores (p = .04)' in a study of 6,000 pupils, and a friend asks whether they should pay for it
```

## 5. Student play-through

I did two runs. Run 1 ("Sam") used the build approved at version 28 and is quoted in N1. Run 2 ("Priya") used the build approved at version 39, which has the same content as the final build. Run 2 is below.

Prepare: briefing as I wrote it, five key points, the full material available, and my two questions. I answered them and pressed "Start practice".

```text
Jordan: Hi, I'm Jordan. I missed the stats lecture … but someone said that's not quite right.
Jordan: So what does p = .03 actually mean? What is the 3% a percentage of?
Priya:  It's about the data. If napping really did nothing (the null), you'd see a gap as big as 17.1 vs 14.9 words only about 3 times in 100 just by random luck.
Jordan: You said "It's about the data. If napping really did nothing (the null), you'd…". Okay, I think I follow. But suppose someone disagreed with you. What would you say to convince them?
Priya:  Because the test starts by assuming napping does nothing. It can't then tell you the probability that assumption is true. That's the mistake in 'a 3% chance it's a fluke'; you'd need other information…
Jordan: Oh! So does that mean there's only a 3% chance the null hypothesis is true, so a 97% chance that napping really works?
Priya:  No, that's not it. p = .03 doesn't tell you the chance the null is true, and it isn't a 97% chance napping works. It's about how surprising the data would be if napping did nothing.
Jordan: Hang on. If the null hypothesis is 'napping does nothing', why can't the test just tell me how likely it is that napping does nothing?
Priya:  Because the whole calculation assumes napping does nothing, so it can't turn round and tell you how likely that is. It's not the probability of the hypothesis, it's about the data.
Jordan: I'm lost. Could you try again with one concrete example?
Priya:  Well, the p is really small so I guess the effect is pretty big? Smaller p means a stronger effect.      [deliberate misconception]
Jordan: Go back to the course material you read before we started. Which part deals with probability, null and hypothesis? What does it imply here?
Priya:  Hmm, actually no, the p-value doesn't say how big it is. You'd look at the effect size, 2.2 words, d about 0.7, and the confidence interval of 0.2 to 4.2 words.
Jordan: Fine, but .03 is a really small number, so the nap effect must be huge, right? Can I write that napping has a big effect on memory?
Priya:  No, p = .20 wouldn't prove napping does nothing. With only 40 people the study might not have enough power to detect a real difference.
Jordan: I'm lost. Could you try again with one concrete example?
Priya:  Sorry, I mean: no, a small p doesn't mean a big effect. With thousands of people a tiny difference can be significant. Here the effect size is 2.2 words and the confidence interval is 0.2 to 4.2, so it might be small.
Jordan: You said "Sorry, I mean: no, a small p doesn't mean a big effect…". Okay, I think I follow. But suppose someone disagreed with you…
[End practice now → confirm] Jordan: Thank you. I think I could explain some of this to someone else now.
```

Self-assessment: two questions, which I answered. Feedback received, summarised:

- **What went well.** Criterion 1, criterion 3 ("after 1 follow-up question") and criterion 4 were each quoted correctly with the student's own words. Criterion 4 was credited from the earlier answer that the script had ignored, which is good. Each one said "Our guess: this is developing".
- **Where to grow.** Criterion 2: "your 4 replies did not bring in not, doesn't, isn't", while quoting two replies that contain exactly those words and that clearly reject the reading. Next step: "write two sentences in which you explicitly rejects the reading…".
- **Ideas to check.** Misconception 1: "You pushed back on this idea." Misconception 2, which the student actually stated, was not mentioned.
- **Footer.** "It was produced by matching your words against your teacher's criteria, not by a human reading them." This is honest.
- **Transfer.** "A different situation: a newspaper headline says … and a friend asks whether they should pay for it. What from this session would you use there, and what would you change?" My answer about effect size, CI and large samples got only "Observation: your answer reuses ideas from 1 of the criteria."

Is the feedback fair and grounded in what I wrote? It is grounded, in the sense that it quotes the student and uses my criteria. It is **not fair** on criterion 2. It tells a student who did exactly what the criterion asks that they did not, and it contradicts itself on the same page. It also misses a misconception the student stated, and it gives the same "developing" verdict to everything.

## 6. Verdict

The authoring side has improved a lot. My name is respected, every important line can be edited in a proper dialog, requests the tool cannot interpret no longer damage anything, Reject can be undone, and constraints stay private. Students now get the whole of my material. I could bring the design to a state I was happy with on the teacher page.

**I would still not use it with a class as it stands.** There are three reasons:

1. **The feedback is not trustworthy (N1, N2).** A student who correctly rejects the "3% chance the null is true" reading, which is the central point of the lesson, is told twice that they did not, with their own correct words quoted underneath. In a group that is already anxious about statistics, that does real harm.
2. **The conversation is still a rigid script (F10).** Correct answers given in a different order get "I'm lost" or "Go back to the course material… which part deals with probability, null and hypothesis?", and a stated misconception goes unnoticed.
3. **Smaller trust problems.** "Withdraw approval" does not withdraw (N3), and my private notes travel inside the file I am told to send to students (N4).

I would reconsider once the criterion matching and the feedback agree with what the student actually wrote, and once the character can respond to an answer about any criterion rather than only the current one.
