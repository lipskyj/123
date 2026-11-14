# Independent evaluation: Primer against the Primer Contract (C1–C7)

Evaluator: independent agent with no other context. Date: 2026-11-14.

Scope and method:
- **Read:** `docs/PRIMER_CONTRACT.md`, the three teacher/auditor reports, the five `.primer.json` packages, the three original student sessions and reports, and the three replay sessions. I did not read `src/`, `app/`, `tests/`, `tools/` or any other file under `docs/`. For question 8 I also read the user-visible operator page `BUILD_STATUS.html`.
- **Ran:** black-box checks on the running system (`http://localhost:8766/primer/`) with headless Chromium. I used my own browser profiles under `/tmp/claude-0/-home-user-123/2d80534d-6363-5f50-914e-61f8a59d12b7/scratchpad/evaluator/`. I authored one small experience ("Fractions check"), test-approved it, built it, downloaded it, educator-approved it, and withdrew approval. I played three short student sessions: one on my experience and two on the negotiation sample. Everything I did stayed in those profiles. No repository file was changed apart from this report.
- **How to read citations:** "orig" means the earlier-build session (`student-*-session.json`). "replay" means the same replies run through the current build (`replay-*-session.json`). "live" means my own run on the current build. Turn ids (`t7`) are from the session JSON. Message numbers (`#7`) are from the teacher's session view.
- **Replay caveat:** the replies are fixed text, so the conversation does not flow naturally. I judge replays only on evidence attribution, adaptation reasons and feedback, which the current build fully determines. I re-checked every important replay defect with a live run.

---

## 1. Did teacher materials and revisions materially affect the experience?

**Yes, on the current build, and visibly so.**

- **Teacher text reaches students verbatim.** The statistics design used by all replays (`statistics-rebuilt.primer.json`) has `"written": "teacher"` on all four character questions. Examples: c1 "So what does p = .03 actually mean? What is the 3% a percentage of?" and c3 "Fine, but .03 is a really small number, so the nap effect must be huge, right?…".
- **The teacher's edits are what students saw:**
  - the rewritten briefing ("Your classmate Jordan missed the lecture … nap group 17.1 words…"; Maya report §1);
  - the opening line (orig and replay `t5`);
  - the transfer situation (replay-maya `t28`);
  - the turn limit of 12 ("Practice is at most 12 replies").
- **Teacher look-for edits drive assessment.** c2's words `["not","doesn't","isn't","can't","no",…]` were edited by the teacher (recheck §3 item 3). These words produce the spurious c2 credit in replay-maya (see §5). The teacher's input therefore matters, and so do its side effects.
- **Revisions that the system cannot parse are now harmless.** They are stored as private notes (recheck F5/F6). My own unparseable request ("PRIVNOTE …") became a note and appears nowhere in the student copy.
- **Live:** a character description in my interview became the character name "Kit", the role, the opening line and the practice header.
- **Limits:**
  - Several generated parts are still not teacher-shaped. Key points are picked by word frequency. "Forty students are randomly split into two groups." and "Reading a p-value: the sleep and memory study A researcher wants to…" are still key points in `statistics-rebuilt.primer.json` `preparation.keyPoints[2..3]` (Maya report "a bit weird").
  - Rebuilding the design on the current build silently changed generated lines that the educator had approved. In the educator-approved `statistics-experience.primer.json` (v40) the m1 probe is "Oh! So does that mean …?". In the current rebuild it is "Wait, I read somewhere that … Is that right?". The support lines also changed ("I'm lost…" became "I'm not sure I follow yet…").
  - The rebuild is only **test-approved** (by "Builder (test approval for validation)"). The educator has therefore never approved the content that the current-build students would see.

## 2. Was approval enforced (test vs educator approval, withdrawal)?

**Mostly yes. Withdrawal is incomplete and overclaimed.**

What I verified live:
- **Name required:** approving without a name was refused ("Enter your name in the box at the top of this page first.").
- **No route to an unapproved build:** an unapproved draft had no build or open control. The cold audit also found that guessed ids are refused ("That experience is not available in this browser.").
- **Test approval is labelled as test approval throughout:**
  - The package has `approval: {type:"test", by:"Evaluator Teacher (test approval)"}`.
  - The student list shows "Test build".
  - The intro says "Test build. Your teacher has not yet approved this for classroom use."
  - All replay and sample packages carry `type:"test"`. All sessions have `classroomApproved:false`, and their `session-started` events record the approval type.
- **Educator approval:** "Educator-approved … Approved for classroom use."
- **The student copy carries no private fields.** My downloaded test build contained none of my markers (PRIVLEARNER, PRIVPRIOR, PRIVCONSTRAINT, PRIVNOTE). `learnerProfile`, `constraints`, `notes` and `revisions` were emptied. The prompts read "Withheld from the student copy." Recheck N4 is fixed on the current build. The older, educator-approved `statistics-experience.primer.json` still contains them ("Many are anxious about maths…", the revision requests and the rejection reason), so any copy already sent remains exposed.
- **Withdrawal ("Withdraw approval (reject)"):**
  - The dialog promises: "Students will not be able to open it."
  - After withdrawal, opening `learn.html?exp=…` in the same browser shows "Your teacher has withdrawn this experience.", and Start is refused. The teacher list entry disappears. Recheck N3 is fixed for new starts.
  - **Not fixed:** I opened an **in-progress session** of the withdrawn build ("Continue where you stopped" → `?session=session-1l800kq`). It resumed with no notice, accepted a reply and continued the conversation ("Okay, I think I follow…").
  - The downloaded file opened in a fresh browser after withdrawal, labelled only "Test build". BUILD_STATUS discloses this ("withdrawal cannot reach files already sent to students"). The on-screen dialog does not.
- **Process traceability of approvals:**
  - The rebuilt statistics file and the earlier build that the students actually used share one package id, `exp-1nktad5`. The earlier build was approved at 10:48:53; the rebuilt file was built at 15:18:58.
  - The replay sessions record yet another approval for the same id ("Automated test", 15:19:49).
  - A session's `packageId` therefore does not identify which build it ran on.

## 3. Did the learner perform the intended work (not done for them)?

**Yes, nothing was handed over. However, the current build lets a learner skip the work.**

- **No answer was given.** Answer requests were declined: Sam orig/replay `t8`, "I can't answer that for you. Your judgement is exactly what I came for." In my live run, #10 said "I can't tell you the answer; I'm the one who doesn't know it!" The feedback reports the request ("You asked to be given the answer 1 time…").
- **Maya and Leo produced every explanation themselves.** Maya's report says "Nothing was handed to me during practice". Leo's changes came after the pointer back to the material (Leo report).
- **New on the current build: the "already covered" shortcut removes all effort.** Live, on the negotiation sample, I replied "You already asked me that one." to every question. The character answered "Sorry, you're right, you did. Let's move on." to the **first** question it had ever asked (#7→#8). It did the same for c2 and c3, and practice closed after 4 learner turns with no work done. The adaptation log records `move-on` "Learner said the question had already been covered". The same false concession appears in replay-maya `t14` and replay-leo `t24`, where the character had not asked that question before. To its credit, the feedback then credited nothing.
- **Filler also advances practice.** Live, "yes" and "ok" used up the c2 attempts, and the session closed with "Thank you. I think I could explain some of this to someone else now." (#17).

## 4. Did adaptation stay goal-bound and evidence-based?

**Goal-bound: yes. Evidence-based: only partly.**

Every adaptation in every session carries a `goalRef` (c*/m*) and a reason, so the adaptations are formally goal-bound. The evidence behind them is often wrong:

- **Raising the challenge on a misconception statement:**
  - replay-leo `a7` raises the challenge on c3 at `t21` ("since .03 is pretty small, you can say the nap effect is a big, important one"). Jordan then asks "Could you put that in one sentence I could write down?" (`t22`), inviting Leo to restate the misconception for Jordan's report.
  - Live #7 ("A bigger denominator means a bigger pizza slice … so 1/4 is bigger") was logged "criterion (clear)", and the character "Raised the challenge".
- **Misconceptions stated during practice are not probed.**
  - Live #7 and #11 ("I still think 1/4 is bigger because 4 is a bigger number") produced no probe and no evidence. The design's "Misconception check" never fired.
  - In replay-leo, m2 is stated at `t11`, `t13`, `t17` and `t21`. `practice.probed` contains only m1.
  - In the earlier build, Leo *was* probed on m2 (orig `t12`). This is a regression.
- **Non-sequitur after a misconception defence.** replay-leo `t9` ("So yeah it matches?" while defending m1) got `share-fact` "I don't know any more than that, sorry. What do you think?", with the reason "Learner asked a question; no case facts were left to share." The probe is then dropped.
- **Support given while evidence was present but missed.** In Sam replay, `t19` gets "No evidence yet for this criterion" (`a5`) straight after `t17`/`t19` proposed value-creating options.
- **Improvements over the earlier build:**
  - Off-criterion answers are now acknowledged and not re-asked (`acknowledge`, "that criterion is not asked again").
  - The raise lines vary by criterion.
  - Case facts are shared when asked. Sam replay `t14` is the teacher's first fact. It did not answer Sam's actual question about another offer.
  - The cold audit's C5 failure ("No evidence yet" for criteria already credited) no longer appears in the replays.

## 5. Was feedback supported by actual learner behaviour?

**No, not reliably.** Observation and inference are labelled ("Our guess: …"), the limits are disclosed ("produced by matching your words … not by a human reading them"), and quotes are now complete in the strengths section. But the system credits misconception statements, reports held misconceptions as corrected, misses correct work, and assesses criteria the learner never answered.

### Maya (diligent): original vs replay

| Issue in original | Replay (current build) | Verdict |
|---|---|---|
| m1 "pushed back" cited CI/power replies `t17`,`t19` | m1 cites `t11` ("you'd need extra info the test doesn't use…"), a real rejection | Fixed |
| m2 "pushed back" cited prep `t2` and `t11` (both about m1) | m2 is **absent** from "Ideas to check", although Maya rejected both halves of it: `t16` "a small p doesn't mean a big effect" and `t20` "a non-significant p doesn't prove there's no effect" | Wrong credit replaced by a miss (done but missed) |
| c2 cited `t15`,`t19` (effect-size and power answers) | c2 still cites `t16` and `t20`, matched only on `not/doesn't/no` (`ev7`,`ev10`). `t7` "It's not the chance the result is a fluke" (literally c2's "due to chance" reading) and `t9` are not cited under c2 | Persists: credit for unrelated text, and real evidence missed |
| "You were then given a harder version of the question" on every criterion | c1 "When you were challenged on it, you backed it up"; c4 "your reply did not add much" (accurate: `t22` "Honestly I think I've covered it") | Fixed |
| Quotes truncated, including mid-word | Full quotes in strengths. Still truncated in "Ideas to check" and in the self-assessment note ("…Jordan…") | Partly fixed |
| Self-flagged vagueness ignored | `nextActions[0]` quotes Maya's own next step | Fixed |
| Transfer "reuses ideas from 1 of the criteria" | Names c3 | Fixed |

### Leo (holds misconceptions): original vs replay

| Issue in original | Replay (current build) | Verdict |
|---|---|---|
| m1 "pushed back" cited `t7`,`t9`, where Leo *asserts* m1 | m1 "corrected" cites `t15` ("…does NOT mean a 3% chance the null is true … I had that backwards") | Fixed |
| m2 "pushed back" cited `t21` (misconception) and `t25` | m2 "corrected" cites only `t15`, which is about m1 (matched `big`, `napp`, `noth`). m2 is not recorded as voiced at any of `t11`, `t13`, `t17`, `t21`, nor in prep `t4` ("a p that low already tells me the effect is pretty solid"). Leo held m2 until `t26`. Feedback: "You pushed back on this idea." | **Regressed**: the held misconception is hidden and the quote is wrong |
| c3 "secure" cited `t21`, the misconception | c3 "this looks secure" still cites `t21` first ("…you can say the nap effect is a big, important one") | **Persists**. BUILD_STATUS says "Repaired" |
| c2 "your 4 replies did not yet show it" despite the coin example `t19` | c2 credited "developing" from `t15`. `t19` (the coin example, Leo's best c2 evidence) has no evidence entry at all | Contradiction removed; best evidence still missed |
| Prep misconceptions not tracked | `ev1` records m1 voiced at prep `t2` | Fixed (m1 only) |
| — | `t17`, a correct rejection ("can't turn around and tell you how likely that assumption is"), is logged as `misconception-voiced m1` (`ev8`) in the teacher's evidence | New false positive (teacher view) |
| c4 correctly "Not assessed" | c4 is a growth area after one reply (`t26`, an effect-size answer to a non-significance question; replay artefact), then the learner ended practice | Acceptable, hedged ("It is also possible you understand it but did not say it") |
| Transfer "1 of the criteria" | c1 and c3 named | Fixed |

### Sam (answer-seeker): original vs replay

| Issue in original | Replay (current build) | Verdict |
|---|---|---|
| m1 "your reply did not correct it" cited a correction (`t15`) | Now cites `t17` (fair for that reply). But `t23` "dont lead with your bottom line" is an explicit later correction and is ignored | Done but missed (persists) |
| Value-creating options (`t17`,`t19`) not credited for c3 | Still not credited. They are now quoted as *failing* c2 (BATNA) | Persists. BUILD_STATUS admits it |
| BATNA (`t13`) not cited | Not cited | Persists |
| c3 growth citing one reply | c3 growth: "You were asked about this …, and your reply did not yet show it." with `citations: []`. Sam made **no** reply to the c3 prompt (`t24`); the next turn is the closing `t25` | **New**: assessed with no chance to answer (see §6) |
| Transfer "does not yet connect back" | Same verdict for an answer that trades issues and names the no-agreement alternative | Persists (also reproduced live) |
| Replay fidelity | Learner `t2` differs from the original ("idk" became "I am not sure. idk") | The replay input is not identical to the recorded reply |

### Live confirmation on the current build

On my "Fractions check" experience, #7 states the target misconception. The feedback put it under **What went well** ("Says that the whole is cut into more equal parts…", "Our guess: this looks secure."). "Ideas to check" then said "You said something close to this idea **and were asked to test it**", citing only the prep answer. The learner was never asked to test it, since no probe turn occurred, and #11 restated the misconception without being reported.

The transfer answer "Sharing a cake at a party: more people means smaller pieces." received "does not yet connect back to the ideas from this session."

## 6. Were unelicited skills assessed?

**Yes, on the current build.**

- **Sam replay c3:** a growth area with no learner reply and no citation (above).
- **Reproduced live on the negotiation sample:** after three replies the character asked c3 ("What would you do differently from what I had planned?"), and I pressed "End practice now". The confirm dialog says "Anything you have not been asked about yet will be marked as not assessed". The feedback nevertheless listed c3 under **Where to grow**: "You were asked about this …, and your reply did not yet show it. … Our guess: this may need more work." No reply exists and no quote is shown.
- **Fair-chance problem in the scenario itself:** that c3 prompt refers to "what I had planned", but Dana's plan is only shared if asked (it is fact 4 of 5).
- **What works:** criteria never asked are correctly "not assessed" (Leo orig c4; cold audit sample run).

## 7. Were the interfaces understandable to first-time users?

**Teacher side: largely yes. Student side: navigation yes, conversation often confusing.**

- **Teacher side:**
  - The second teacher reports "I could bring the design to a state I was happy with on the teacher page", with in-page edit dialogs and the name field at the top (recheck F13, F15).
  - The cold auditor completed authoring unaided.
  - Remaining friction: jargon ("Teachback", lower-case "moderate", "Instructions the system follows (advanced)", "Edited criteria.1.lookFors"); approval and building are separate steps; "Superseded" is shown on a version students are still served.
- **Student side:**
  - All three students understood the three phases. Maya: "Mostly yes … the three steps … were obvious."
  - The confusion is conversational. Maya: Jordan "never actually pushed back". Leo: the probe "If that were true, what would we expect to see?" is "a tutor's question, not something a classmate … would ask". Sam: "Dana has no situation", now partly fixed with case facts.
  - On my own look: the landing, intro and prepare pages are clear, and "Pasted material" no longer appears under student key points.
  - Re-opening a student link starts a **new** session each time instead of resuming. My profile accumulated seven "Fractions check · Eva" entries under "Continue where you stopped", although the intro says "Your work is saved in this browser as you go".
  - "End practice now" uses a native `confirm()`.

## 8. Do the implementation's claims match verified behaviour?

| Claim (where) | Verified behaviour | Match? |
|---|---|---|
| "Students (not shown to them)", "Students do not see this", "Classroom constraints (never shown to students)", private notes (author page) | Absent from the student pages and from the downloaded file on the current build (my markers) | Yes (current build) |
| "Test build. Your teacher has not yet approved this for classroom use." / "Approve for testing only" | Test approvals are labelled everywhere, including samples and replays | Yes |
| "Students cannot open anything until you approve." | No route found to an unapproved build | Yes |
| "Students will not be able to open it." (withdraw dialog); "You rejected this version. Students cannot open it." | New starts are blocked in the same browser. In-progress sessions continue silently, and files already sent still open | Partly |
| "Feedback is based only on what you wrote … produced by matching your words against your teacher's criteria" (student feedback) | True, and honest about the method | Yes |
| "You addressed this in your own words" / "this looks secure" | Shown for misconception statements (live #7; replay-leo `t21`) | **No** |
| "You pushed back on this idea." | Shown for Leo's m2, which he held until `t26`, citing an m1 quote | **No** |
| "You said something close to this idea and were asked to test it." | No probe happened (live) | **No** |
| "…and your reply did not yet show it" | Shown with no reply (Sam replay c3; live) | **No** |
| "Anything you have not been asked about yet will be marked as not assessed" (End practice confirm) | Literally true, but a criterion asked one second before ending is graded | Misleading |
| "Sorry, you're right, you did." (character) | Said about questions never asked before (live #8; replay-maya `t14`) | **No** |
| "Students then … practise with a character who responds to what they say" (landing) | It responds to keyword matches; it praised a misconception (Leo orig `t22`) and asks the learner to restate one (replay-leo `t22`) | Partly |
| BUILD_STATUS: Leo "a wrong claim was credited. Repaired (repair 5)"; Maya "feedback misattributed quotes … Repaired" | replay-leo still credits `t21` for c3; replay-maya still cites `t16`/`t20` for c2 and drops m2 | **No** |
| BUILD_STATUS: "Approval states … enforced at build and at session start" | A withdrawn build's existing sessions continue | Partly |
| BUILD_STATUS: Sam "Partly repaired … value-creating options still not credited in replay" | Accurate | Yes |

---

## Contract judgement (current build)

| # | Commitment | Judgement | Key evidence |
|---|---|---|---|
| C1 | Educator authority | **Holds** (with a withdrawal gap) | Every field is editable and tagged by source; unparseable requests become private notes; a name is required; test vs educator approval is labelled end to end; private fields are stripped from the student copy (live). Gaps: withdrawal does not stop in-progress sessions (live), and the dialog overclaims. A re-derived design changes generated lines from what the educator approved, though it is correctly downgraded to test approval. |
| C2 | Meaningful student work | **Partly holds** | Answers are never given and the learners did their own work (Maya, Leo, Sam). But the "You already asked me that one" phrase skips every criterion with no work (live), and filler uses up attempts. |
| C3 | Preparation, Practice, Feedback | **Holds** | All three phases ran in every session. Prep answers feed feedback (replay-leo `ev1`; live "What you wrote while preparing"). Self-assessment comes before feedback, with a transfer question. The quality of the grounding is a C6 matter. |
| C4 | Productive friction | **Partly holds** | Teacher-written questions and case facts create real need (Maya: the new questions "made me think"). The character never contests a weak answer, praises or amplifies misconceptions (replay-leo `t22`), concedes falsely, and drops probes. |
| C5 | Goal-bound adaptation | **Partly holds** | Every adaptation is tied to a c/m id with a reason. Triggers are keyword hits: "raise" on misconception statements (replay-leo `a7`, live #7), "move-on" on a phrase, and no probe when a misconception is stated in practice (live #7/#11; replay-leo m2 never probed, which is a regression from orig `t12`). |
| C6 | Evidence-grounded feedback | **Fails** | Transcripts, events and evidence are preserved, and observation and inference are labelled. But misconception statements are credited as strengths (live #7; replay-leo c3 `t21`). A held misconception is reported as "pushed back" with a wrong quote (replay-leo m2). A criterion is assessed with no reply (Sam replay c3; live negotiation c3). Clear correct work is missed (Sam `t13`,`t17`,`t19`,`t23`; Leo `t19`; Maya m2 `t16`/`t20`). Unrelated replies are credited via negation words (replay-maya c2). |
| C7 | Traceability | **Partly holds** | Teachers can trace each design part to its source, see a versioned history with actor names, and see per-turn evidence and adaptation logs with reasons. The trace is good enough to expose the C5 and C6 defects. Limits: sessions are visible only in the browser where they ran ("sessions recorded in this browser only"); one package id (`exp-1nktad5`) covers different builds and approvals; case facts carry no source; replay metadata does not match the rebuilt file's approval. |

---

## Findings by severity (current build)

### Blocking

1. **Misconception statements are credited as mastery.**
   - **Live:** #7 "A bigger denominator means a bigger pizza slice … so 1/4 is bigger" → "What went well … this looks secure", and the character raised the challenge.
   - **Replay-leo c3:** `t21` "since .03 is pretty small, you can say the nap effect is a big, important one" → "this looks secure"; then `t22` asks the learner to put it "in one sentence I could write down".
   - **Why it blocks:** a student holding the exact error the teacher listed is told they have mastered the corrective idea.
2. **Held misconceptions are not detected and are reported as corrected.**
   - **replay-leo:** m2 is voiced at `t11`, `t13`, `t17`, `t21` with no evidence recorded. Feedback: "You pushed back on this idea", citing `t15`, which is about m1. This regresses from the earlier build, which at least logged m2 as voiced and probed it.
   - **Live:** the misconception restated at #11 was not recorded. Feedback claims the learner "were asked to test it" when no probe occurred.

### Major

3. **Criteria assessed without a fair chance.** A growth verdict ("your reply did not yet show it", "may need more work") is given when the learner made no reply to the prompt. Evidence: Sam replay c3 (`citations: []`); live negotiation c3 after "End practice now". This contradicts the contract's "not assessed" rule.
4. **Correct work missed or filed under the wrong criterion.**
   - Sam: value options `t17`/`t19`, BATNA `t13` and the m1 correction `t23` are uncredited, and the options are quoted as *failing* BATNA.
   - Leo: coin example `t19`.
   - Maya: rejection of m2 at `t16`/`t20` is not reported; c2 evidence at `t7`/`t9` is not cited.
   - Unrelated replies are credited for c2 through negation words (replay-maya `ev7`, `ev10`).
5. **The "already covered" shortcut removes productive effort.** "You already asked me that one." makes the character apologise ("Sorry, you're right, you did. Let's move on.") and skip each criterion, even ones never asked (live negotiation #7–#16). Practice ends after 4 empty turns.
6. **Withdrawal is incomplete, and the dialog overclaims.** Resumed in-progress sessions of a withdrawn build continue with no notice (live `session-1l800kq`). Files already sent still open. The dialog says "Students will not be able to open it."
7. **The operator page claims repairs that the replays do not show.** BUILD_STATUS marks Leo ("a wrong claim was credited") and Maya ("misattributed quotes") as "Repaired (repair 5)". The same defects appear in `replay-leo-session.json` (c3 ← `t21`) and `replay-maya-session.json` (c2 ← `t16`/`t20`, m2 dropped).
8. **The character's behaviour undermines the scenario.**
   - False concessions (`t14`, replay-maya).
   - "I don't know any more than that, sorry. What do you think?" as the reply to a misconception defence (replay-leo `t10`).
   - A probe dropped after one try.
   - The character never contests a weak answer, against the teacher's "will push back until your explanation actually makes sense".
   - A case fact that does not answer the question asked (Sam replay `t14`).
   - The teacher cannot see any of this on the design page before approving.

### Minor

9. **Transfer verdict misses clear connections.** Sam replay `t31` and the live cake answer both get "does not yet connect back to the ideas from this session."
10. **Re-derived generated lines differ from the educator-approved version.** The m1 probe and support lines in `statistics-rebuilt` differ from `statistics-experience` v40. Correctly test-approved only, but the current build has no educator-approved statistics experience.
11. **One package id across builds.** `exp-1nktad5` is used for different builds and approvals, and the replay sessions record an approval ("Automated test", 15:19:49) that differs from the file in records ("Builder (test approval for validation)", 15:18:58). The Sam replay altered a learner reply (`t2`).
12. **Key points are still selected by word frequency.** "Forty students are randomly split into two groups."; the title is run into a sentence. They cannot be chosen by the teacher on the default path.
13. **Re-opening an experience link starts a new session** rather than resuming, which creates duplicate "Continue where you stopped" entries (live: seven entries).
14. **Truncated quotes remain** in "Ideas to check" and in the self-assessment note.
15. **The m1 probe in replay-leo fired once and was then abandoned.** The `t9` defence was not followed up.

### Notes

16. The older, educator-approved `statistics-experience.primer.json` still contains teacher-private text (learner description, revision requests, rejection reason). Fixed for new downloads, but existing copies remain exposed.
17. The teacher can see sessions only from the same browser. With file-based distribution, the teacher-side trace (C7) does not reach real classroom sessions.
18. The positives are real: approval gating, test labelling, honest disclosure of rule-based matching, the answer-request refusal, the private-note handling of unparseable requests, self-assessment before feedback, and a session record detailed enough for this audit.
19. Every participant was simulated. No conclusion here concerns real teachers or students.

## Bottom line

On the current build, the teacher-authority side (C1) and the phase structure (C3) hold. The evidence and feedback core does not. In live runs and in replays, a student who states the misconception the teacher listed can be told they have mastered the idea, a student who holds a misconception throughout can be told they "pushed back on" it, and a criterion can be graded after the learner had no chance to answer. Until misconception statements are excluded from criterion credit, held misconceptions are detected in practice, and criteria with no learner reply are reported as "not assessed", the system should not be used with students. Several of these defects are labelled "Repaired" on the operator page.
