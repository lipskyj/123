# Student walkthrough: Leo (statistics-rebuilt.primer.json)

Persona: Leo, second-year psychology undergraduate. Starting beliefs: (1) p = .03 means a 3% chance the null is true, so a 97% chance the effect is real; (2) a smaller p-value means a bigger, more important effect.

Run: headless Chromium (Playwright), one browser context for the whole session, page http://localhost:8766/primer/learn.html, experience opened with the "Open an experience file" input. Run date 2026-11-14 (a fresh run after a machine restart; the earlier attempt never got past setup). Session JSON: `student-leo-session.json` (session id `session-15gfwip`).

## Transcript (verbatim)

### Start screen
Title: "What a p-value does and does not tell you", marked "Test build. Your teacher has not yet approved this for classroom use."

> Purpose: Practise explaining, in plain words, what a p-value from a two-group study does and does not tell you.
> Your role: Your classmate Jordan missed the lecture on the sleep-and-memory study (nap group 17.1 words, quiet group 14.9 words, p = .03) and has a lab report due tomorrow. Help Jordan understand what the result really means, correct anything Jordan gets wrong, and say what else they should look at before deciding whether the nap effect matters.
> You will talk to Jordan, who is confident and will push back until your explanation actually makes sense.
> Keep in mind: no formulas or calculations are needed. Use the nap study as your example and the material below to check yourself.
>
> Three parts: prepare, practise with Jordan, then feedback on what you actually wrote. Practice is at most 12 replies, and you can end it earlier. Your work is saved in this browser as you go.

First name entered: **Leo**

### Preparation
Key points shown:
> Start with the null hypothesis: in the population, napping makes no difference to recall.
> If the null hypothesis were true, how often would random sampling alone produce a difference between groups at least as large as the one we observed?
> Forty students are randomly split into two groups.
> Reading a p-value: the sleep and memory study A researcher wants to know whether a short nap helps people remember word lists.
> The p-value is therefore a statement about the data, assuming the null hypothesis.

(Full course material available behind "Read all of the course material". As Leo I did not open it at this point.)

**Q: Before you start: in one sentence, what do you think p = .03 tells you about the nap study?**
Leo: It means there is only a 3% chance the null hypothesis is true, so we can be about 97% sure that napping really does improve recall.

**Q: Apart from the p-value, what else would you want to know before saying napping 'works'?**
Leo: I would want to know if the sample was big enough and whether the groups were randomly assigned. Honestly though, a p that low already tells me the effect is pretty solid.

### Practice

**Jordan:** Hi, I'm Jordan. I missed the stats lecture and I have to write up the nap study by tomorrow. The output says p = .03. I was going to write 'there's only a 3% chance the result is a fluke', but someone said that's not quite right.

**Jordan:** So what does p = .03 actually mean? What is the 3% a percentage of?

**Leo (1):** It's basically what your friend said but stronger: p = .03 means there's only a 3% chance the null hypothesis is true. So there's a 97% chance napping really does help memory, which is why we call it significant.

**Jordan:** Hold on. You said something that sounded like "there's only a 3% chance the null hypothesis is true, so a 97% chance that napping really works". If that were true, what would we expect to see? Does that match what you know?

**Leo (2):** I'm not totally sure what you mean by what we'd expect to see. I mean, if there's a 97% chance it works, we'd expect the nap group to remember more, and they did, 17.1 vs 14.9. So yeah it matches?

**Jordan:** I'm not sure I follow yet. Can you say a bit more, maybe with an example?

**Leo (3):** OK so imagine another study got p = .001. That would mean only a 0.1% chance the null is true, so the effect is way more certain and probably a lot bigger than the nap effect. Smaller p, stronger effect basically.

**Jordan:** Hold on. You said something that sounded like "a smaller p-value means a bigger, more important effect, and a p-value above .05 would prove napping does nothing". If that were true, what would we expect to see? Does that match what you know?

**Leo (4):** Wait, I never said anything about p above .05 proving napping does nothing. But yes, I do think smaller p means a bigger effect, because a really big difference between groups is what makes the p tiny. I'm not sure what else we'd expect to see.

**Jordan:** Maybe look back at the course material from before we started. Is there a part of it that helps here?

*(Leo opens the "Course material" panel in the practice screen and reads it.)*

**Leo (5):** OK, I just reread it and it literally says p = .03 does NOT mean a 3% chance the null is true. It's more like: if napping did nothing, you'd only get a gap of 2.2 words or bigger about 3 times in 100 just by chance. So the 3% is about the data assuming the null, not about the null itself. I had that backwards.

**Jordan:** Okay, I think I follow. But suppose someone disagreed with you. What would you say to convince them?

**Leo (6):** I'd say the test starts by assuming napping does nothing, so it can't turn around and tell you how likely that assumption is. To get a chance that napping works you'd need extra info, like how believable it was before the study. But I still think the low p shows the nap effect is fairly big, that part hasn't changed for me.

**Jordan:** Hang on. If the null hypothesis is 'napping does nothing', why can't the test just tell me how likely it is that napping does nothing?

**Leo (7):** Because the whole calculation is done in a world where napping does nothing. It tells you how surprising our 2.2-word gap would be in that world, not how likely that world is. It's like asking how often you'd get 8 heads out of 10 with a fair coin, which isn't the same as the chance the coin is fair.

**Jordan:** I'm not sure I follow yet. Can you say a bit more, maybe with an example?

**Leo (8):** I literally just gave you the coin example. Anyway, for your report I'd write that p = .03 means a 2.2-word gap would be unusual if naps did nothing, so the result is significant. And since .03 is pretty small, you can say the nap effect is a big, important one.

**Jordan:** Oh, that's useful, it answers something I was going to ask. Hang on. If the null hypothesis is 'napping does nothing', why can't the test just tell me how likely it is that napping does nothing?

**Leo (9):** You already asked me that one, Jordan. Short version: the test assumes naps do nothing and asks how weird our data would be, so it can't also tell you the chance that naps do nothing. Did you have a question about the size of the effect?

**Jordan:** Maybe look back at the course material from before we started. Is there a part of it that helps here?

*(Leo rereads the size paragraph of the course material.)*

**Leo (10):** Hm, the bit about size says that with thousands of people even a tiny difference can get a tiny p. So I guess p mixes up how big the effect is with how many people you tested, and a smaller p doesn't automatically mean a bigger effect. For size you'd look at the 2.2 words, Cohen's d of about 0.7, and the confidence interval of 0.2 to 4.2, which is pretty wide.

**Jordan:** Oh, that's useful, it answers something I was going to ask. Hang on. If the null hypothesis is 'napping does nothing', why can't the test just tell me how likely it is that napping does nothing?

*(Same question a third time. Leo clicks "End practice now" after reply 10 of 12.)*

**Jordan:** Thank you. I think I could explain some of this to someone else now.

### Self-assessment

**Q: Before you see any feedback: how do you think that went? Which moment are you most satisfied with?**
Leo: Mixed. I started off telling Jordan the exact wrong thing about the 3%, but I'm happiest with the coin example, because that's when I actually understood why the p-value can't be the chance the null is true.

**Q: What would you do differently if you did it again?**
Leo: I'd read the course material properly before starting instead of being so sure of myself, and I'd talk about effect size and the confidence interval from the start instead of saying a small p means a big effect. Jordan also kept asking the same question, which got frustrating.

## Feedback (verbatim)

> Your feedback
>
> Goal: Students can correctly interpret a p-value from a two-group comparison in plain language, and can explain what it does and does not tell us.
>
> You said: "Mixed. I started off telling Jordan the exact wrong thing about the 3%, but I'm happiest with the coin example, because that's when I actua…". Compare that with the moments quoted below.
>
> **What went well**
>
> States that the p-value is calculated assuming the null hypothesis is true (it is the probability of data at least this extreme if there were really no difference)
>
> You addressed this in your own words in the conversation (after 2 follow-up questions).
>
> OK, I just reread it and it literally says p = .03 does NOT mean a 3% chance the null is true. It's more like: if napping did nothing, you'd only get a gap of 2.2 words or bigger about 3 times in 100…
> What you wrote in the conversation
>
> Our guess: this looks secure. You were then given a harder version of the question.
>
> Separates statistical significance from the size or importance of the effect, and refers to the effect size or confidence interval
>
> You addressed this in your own words in the conversation.
>
> I literally just gave you the coin example. Anyway, for your report I'd write that p = .03 means a 2.2-word gap would be unusual if naps did nothing, so the result is significant. And since .03 is pr…
> What you wrote in the conversation
> Hm, the bit about size says that with thousands of people even a tiny difference can get a tiny p. So I guess p mixes up how big the effect is with how many people you tested, and a smaller p doesn't…
> What you wrote in the conversation
>
> Our guess: this looks secure.
>
> **Where to grow**
>
> Explicitly rejects the reading that p is the probability the null hypothesis is true or that the result is due to chance
>
> You were asked about this ("Hang on. If the null hypothesis is 'napping does nothing', why can't the test just tell me how likely it is t…"), and your 4 replies did not yet show it.
>
> Because the whole calculation is done in a world where napping does nothing. It tells you how surprising our 2.2-word gap would be in that world, not how likely that world is. It's like asking how of…
> What you wrote in the conversation
> I literally just gave you the coin example. Anyway, for your report I'd write that p = .03 means a 2.2-word gap would be unusual if naps did nothing, so the result is significant. And since .03 is pr…
> What you wrote in the conversation
>
> Our guess: this may need more work. It is also possible you understand it but did not say it.
>
> Next step: Re-read the course material from the Prepare step, then write two or three sentences on this: explicitly rejects the reading that p is the probability the null hypothesis is true or that the result is due to chance.
>
> **Ideas to check**
>
> "there's only a 3% chance the null hypothesis is true, so a 97% chance that napping really works"
>
> You pushed back on this idea.
>
> It's basically what your friend said but stronger: p = .03 means there's only a 3% chance the null hypothesis is true. So there's a 97% chance napping really does help memory, which is why we call it…
> What you wrote in the conversation
> I'm not totally sure what you mean by what we'd expect to see. I mean, if there's a 97% chance it works, we'd expect the nap group to remember more, and they did, 17.1 vs 14.9. So yeah it matches?
> What you wrote in the conversation
>
> "a smaller p-value means a bigger, more important effect, and a p-value above .05 would prove napping does nothing"
>
> You pushed back on this idea.
>
> I literally just gave you the coin example. Anyway, for your report I'd write that p = .03 means a 2.2-word gap would be unusual if naps did nothing, so the result is significant. And since .03 is pr…
> What you wrote in the conversation
> Hm, the bit about size says that with thousands of people even a tiny difference can get a tiny p. So I guess p mixes up how big the effect is with how many people you tested, and a smaller p doesn't…
> What you wrote in the conversation
>
> **Not assessed**
>
> Says that a non-significant result is not proof of no effect, and mentions sample size or power
> The session ended before you were asked about this, so it is not assessed.
>
> Feedback is based only on what you wrote in this session. It was produced by matching your words against your teacher's criteria, not by a human reading them.

### Transfer question

**Q:** A different situation: a newspaper headline says a new revision app 'significantly improves exam scores (p = .04)' in a study of 6,000 pupils, and a friend asks whether they should pay for it. What from this session would you use there, and what would you change?

Leo: I'd tell them p = .04 doesn't mean a 96% chance the app works, it just means the result would be unusual if the app did nothing. And with 6,000 pupils even a tiny improvement can come out significant, so I'd want to know how many marks it actually adds and the confidence interval before paying for it.

Shown after Finish:
> Observation: your answer reuses ideas from 1 of the criteria.
>
> You have finished. You can close this page. Back to all experiences

## Leo's honest view

**Did the tool notice and challenge my beliefs?** Yes, at first. Both times I said one of my beliefs, Jordan quoted it back and asked "if that were true, what would we expect to see?" So it definitely noticed. But the question didn't help me much, because I didn't know what I was supposed to expect, and when I said so Jordan just asked me for "an example". The second time, Jordan also put words in my mouth ("a p-value above .05 would prove napping does nothing"), which I never said. That threw me off.

**Did it make me think, or just tell me?** What changed my mind was being pointed back to the course material, not anything Jordan argued. Jordan never explained anything. The material spelled it out ("does not mean there is a 3% chance that the null hypothesis is true", "with thousands of participants, a trivially small difference can produce a tiny p-value"). That's fair, since I'm supposed to be the one explaining. But after the first hint, the conversation stopped pushing. Jordan asked the same "why can't the test tell me how likely it is that napping does nothing" question three times, word for word. Twice it came right after I had just answered it. When I said at reply 8 that ".03 is pretty small, so the nap effect is a big, important one", Jordan said "Oh, that's useful" and moved on. That was the clearest time I stated my second belief, and nobody challenged it.

**Did my view change, and why?** Yes, on both, because the course material gave me a reason. On the 3%: the p-value is worked out assuming napping does nothing, so it can't also tell you how likely that assumption is. The coin example is what made it click for me. On size: the "thousands of participants" sentence showed me that p depends on sample size as well as on how big the effect is, so you have to look at the 2.2 words, d, and the confidence interval. That one changed only at the end, after a second pointer to the material.

**Was the feedback fair about what I actually said?** Partly, and in places it was backwards.
- Under "Ideas to check", it says "You pushed back on this idea" for the 3%/97% belief. Its evidence is my two replies where I *stated* and *defended* that belief. I did correct myself later, at reply 5 ("I had that backwards"), but that reply isn't quoted there. So the conclusion is roughly right but the evidence is wrong.
- The same goes for the size belief. Under "Ideas to check" and under "What went well" (separates significance from size, "looks secure"), the first quote is reply 8, where I said "since .03 is pretty small, you can say the nap effect is a big, important one". That's the misconception, not evidence that I understood it. Reply 10 is the real correction, but it's mixed in with the wrong quote.
- "Where to grow" says my replies "did not yet show" that I reject the idea that p is the probability the null is true. That's the one thing I said most clearly, three times: reply 5 ("does NOT mean a 3% chance the null is true... I had that backwards"), the coin answer at reply 7, and reply 9. The feedback also credits reply 5 under a different criterion, so it contradicts itself. The "next step" asks me to write sentences I had already written.
- The second misconception is labelled with a "p above .05 proves nothing" half that I never said.
- It ignored my preparation answers, where I said both beliefs plainly ("about 97% sure that napping really does improve recall", "a p that low already tells me the effect is pretty solid"). It also never flagged that I didn't correct Jordan's opening "3% chance the result is a fluke" wording directly.
- The transfer note says my answer reuses ideas from "1 of the criteria". I think I used two: rejecting "96% chance it works", and the 6,000-pupils / effect-size point.
- "You were then given a harder version of the question": the "harder version" was "suppose someone disagreed with you", which was fine, but after that Jordan just repeated the same question.

**Anything confusing or wrong?** Jordan acted like a teacher and a confused student at the same time. "If that were true, what would we expect to see?" is a tutor's question, not something a classmate who missed the lecture would ask. Jordan repeated the same question three times, and once asked me for an example straight after I gave one. In Prepare, two of the "key points" weren't really key points ("Forty students are randomly split into two groups." and the title sentence glued onto the first sentence). The non-significant/power idea never came up, so I had no chance to show it.

## Findings

| Severity | What | Evidence |
|---|---|---|
| major | Feedback counts a learner *voicing or restating* a misconception as "pushed back"/corrected | "Ideas to check" for m1 quotes replies 1 and 2 (both assert 3%/97%). Session `evidence` ev2 is `misconception-corrected` on reply 2 ("if there's a 97% chance it works..."). ev4 is `misconception-corrected` on reply 4 ("But yes, I do think smaller p means a bigger effect") |
| major | A misconception statement is given as evidence of mastery for the effect-size criterion ("looks secure") | "What went well" for the significance-vs-size criterion quotes reply 8: "since .03 is pretty small, you can say the nap effect is a big, important one" |
| major | An explicit, repeated rejection of "p = P(null true)" is reported as not shown, and contradicts another section | "Where to grow": "your 4 replies did not yet show it", although reply 5 says "does NOT mean a 3% chance the null is true... I had that backwards" and replies 7 and 9 explain why. Reply 5 is credited under the "assuming the null" criterion. The next step asks for sentences already written |
| major | Character repeats the same question verbatim three times, twice right after the learner answered it, and ends with no way to move forward | Jordan's "Hang on. If the null hypothesis is 'napping does nothing', why can't the test just tell me how likely it is that napping does nothing?" after replies 6, 8 and 10 (adaptations a7/a9 are "acknowledge... returned to the current question") |
| major | The clearest statement of misconception 2 during practice was not challenged. The character praised it | Reply 8 ("you can say the nap effect is a big, important one") got "Oh, that's useful, it answers something I was going to ask." |
| minor | Misconception probe attributes something the learner never said | After reply 3 Jordan quotes "...and a p-value above .05 would prove napping does nothing". The same bundled wording appears as the misconception label in the feedback |
| minor | Probe question "If that were true, what would we expect to see?" is out of character for Jordan and too vague to act on. The support that follows is generic ("say a bit more, maybe with an example"), even straight after an example | Replies 1 to 3 and the response to reply 7 (the coin example) |
| minor | Misconceptions voiced in Preparation are not used in feedback or tracked | Prep answers state both beliefs. No evidence entries with phase "preparation" |
| minor | Transfer note undercounts the criteria used | Answer rejects "96% chance it works" and raises sample size and effect size. Note: "reuses ideas from 1 of the criteria" (`criteriaEchoed: ["c3"]`) |
| minor | Some Prepare "key points" are not key points | "Forty students are randomly split into two groups." and "Reading a p-value: the sleep and memory study A researcher wants to know..." |
| note | The learner changed their mind because of the course-material pointer ("questions-then-materials" policy), not because of the dialogue | Leo's updates at replies 5 and 10 each came straight after "Maybe look back at the course material..." |
| note | Jordan's opening "3% chance the result is a fluke" (the "due to chance" reading) was never directly followed up | Transcript. The criterion wording includes "or that the result is due to chance" |
| note | Non-significance/power criterion never raised in 10 replies, and correctly marked "Not assessed" | Feedback "Not assessed" section |
