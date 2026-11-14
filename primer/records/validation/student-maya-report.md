# Student walkthrough: Maya (2nd-year psychology), "What a p-value does and does not tell you"

- Experience file: `primer/records/validation/statistics-rebuilt.primer.json`, opened through "Open an experience file" on `http://localhost:8766/primer/learn.html`
- Run: one headless Chromium context, fresh after the machine restart, played from the start. Date 2026-11-14.
- Session saved to `primer/records/validation/student-maya-session.json`
- Practice ended on its own after 8 of at most 12 replies (all four criteria covered); I did not need "End practice now".

## 1. Start screen (verbatim)

> What a p-value does and does not tell you
> Test build. Your teacher has not yet approved this for classroom use.
>
> Purpose: Practise explaining, in plain words, what a p-value from a two-group study does and does not tell you.
> Your role: Your classmate Jordan missed the lecture on the sleep-and-memory study (nap group 17.1 words, quiet group 14.9 words, p = .03) and has a lab report due tomorrow. Help Jordan understand what the result really means, correct anything Jordan gets wrong, and say what else they should look at before deciding whether the nap effect matters.
> You will talk to Jordan, who is confident and will push back until your explanation actually makes sense.
> Keep in mind: no formulas or calculations are needed. Use the nap study as your example and the material below to check yourself.
>
> Three parts: prepare, practise with Jordan, then feedback on what you actually wrote. Practice is at most 12 replies, and you can end it earlier. Your work is saved in this browser as you go.
>
> Your first name [ ] Start

I typed: **Maya**

## 2. Preparation (verbatim)

The Prepare page repeats the briefing, then:

> Key points from your course material
> Start with the null hypothesis: in the population, napping makes no difference to recall.
> If the null hypothesis were true, how often would random sampling alone produce a difference between groups at least as large as the one we observed?
> Forty students are randomly split into two groups.
> Reading a p-value: the sleep and memory study A researcher wants to know whether a short nap helps people remember word lists.
> The p-value is therefore a statement about the data, assuming the null hypothesis.
> Read all of the course material

Expanding "Read all of the course material":

> COURSE MATERIAL
>
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
>
> You can come back to this material during practice.
>
> Before you begin
> Answer in your own words. There are no wrong answers here; it gets your thinking started.

**Primer:** Before you start: in one sentence, what do you think p = .03 tells you about the nap study?
**Maya:** I think it means that if napping actually did nothing, a difference this big would only happen about 3% of the time by chance, so the result is significant.

**Primer:** Apart from the p-value, what else would you want to know before saying napping 'works'?
**Maya:** How big the difference actually is, like the effect size, and maybe the confidence interval. Also it was only 40 students so I would want to see if it replicates.

## 3. Practice with Jordan (verbatim)

**Jordan:** Hi, I'm Jordan. I missed the stats lecture and I have to write up the nap study by tomorrow. The output says p = .03. I was going to write 'there's only a 3% chance the result is a fluke', but someone said that's not quite right.
**Jordan:** So what does p = .03 actually mean? What is the 3% a percentage of?

**Maya (1):** It's not the chance the result is a fluke. It's like, if napping really made no difference at all, you'd only get a gap this big between the groups about 3 times out of 100 just from random sampling. So the 3% is assuming the null is true.

**Jordan:** Okay, I think I follow. But suppose someone disagreed with you. What would you say to convince them?

**Maya (2):** Um, I guess I'd say the test starts by assuming there's no effect, so it can't then tell you how likely that assumption is. It only tells you how surprising our data would be if the assumption was true.

**Jordan:** Hang on. If the null hypothesis is 'napping does nothing', why can't the test just tell me how likely it is that napping does nothing?

**Maya (3):** Because to know how likely napping does nothing you'd need extra info the test doesn't use, like how believable the effect was before the study even happened. The reading said that. The test just takes the null as given and asks about the data.

**Jordan:** Okay, I think I follow. But suppose someone disagreed with you. What would you say to convince them?

**Maya (4):** You already asked me that one. I'd say the same thing really, p is about the data assuming the null, not about the null itself. Did you want to talk about whether the effect is actually big?

**Jordan:** Fine, but .03 is a really small number, so the nap effect must be huge, right? Can I write that napping has a big effect on memory?

**Maya (5):** No, a small p doesn't mean a big effect. With a huge sample even a tiny difference can get a tiny p. You'd have to look at the effect size, here it's 2.2 words and Cohen's d about 0.7, which I think is medium to large-ish but I'm not totally sure on the cutoffs.

**Jordan:** Okay, I think I follow. But suppose someone disagreed with you. What would you say to convince them?

**Maya (6):** I'd point them to the confidence interval too. It goes from 0.2 to 4.2 words, so the real effect could be pretty tiny or quite big, we're not that sure. So I wouldn't write 'big effect', more like there's a difference but the size is uncertain.

**Jordan:** And if it had come out as p = .20, I'd just write that napping does nothing, yeah?

**Maya (7):** No, a non-significant p doesn't prove there's no effect. With only 40 people the study might not have enough power to pick up a real difference. Absence of evidence isn't evidence of absence, so you'd just say you didn't find a significant difference.

**Jordan:** Okay, I think I follow. But suppose someone disagreed with you. What would you say to convince them?

**Maya (8):** Honestly I think I've covered it. For your report just say what you found, how big it was and how sure you can be. Good luck with it!

**Jordan:** Thank you. I think I could explain some of this to someone else now.

> The practice is over. First, your own view.

## 4. Self-assessment (verbatim)

**Primer:** Before you see any feedback: how do you think that went? Which moment are you most satisfied with?
**Maya:** I think it went okay. I was happiest with explaining the 3% is about the data if the null is true, not the chance it is a fluke. Jordan kept asking the same question though so it got a bit repetitive.

**Primer:** What would you do differently if you did it again?
**Maya:** I would explain the confidence interval more clearly and maybe check the Cohen d cutoffs before saying medium or large. I was a bit vague there.

## 5. Feedback received (verbatim, including the "…" truncations as shown on screen)

> Your feedback
>
> Goal: Students can correctly interpret a p-value from a two-group comparison in plain language, and can explain what it does and does not tell us.
>
> You said: "I think it went okay. I was happiest with explaining the 3% is about the data if the null is true, not the chance it is a fluke. Jordan kep…". Compare that with the moments quoted below.
>
> **What went well**
>
> States that the p-value is calculated assuming the null hypothesis is true (it is the probability of data at least this extreme if there were really no difference)
>
> You addressed this in your own words in the conversation.
>
> It's not the chance the result is a fluke. It's like, if napping really made no difference at all, you'd only get a gap this big between the groups about 3 times out of 100 just from random sampling.…
> What you wrote in the conversation
> Um, I guess I'd say the test starts by assuming there's no effect, so it can't then tell you how likely that assumption is. It only tells you how surprising our data would be if the assumption was tr…
> What you wrote in the conversation
> You already asked me that one. I'd say the same thing really, p is about the data assuming the null, not about the null itself. Did you want to talk about whether the effect is actually big?
> What you wrote in the conversation
>
> Our guess: this looks secure. You were then given a harder version of the question.
>
> Explicitly rejects the reading that p is the probability the null hypothesis is true or that the result is due to chance
>
> You addressed this in your own words in the conversation.
>
> Because to know how likely napping does nothing you'd need extra info the test doesn't use, like how believable the effect was before the study even happened. The reading said that. The test just tak…
> What you wrote in the conversation
> No, a small p doesn't mean a big effect. With a huge sample even a tiny difference can get a tiny p. You'd have to look at the effect size, here it's 2.2 words and Cohen's d about 0.7, which I think…
> What you wrote in the conversation
> No, a non-significant p doesn't prove there's no effect. With only 40 people the study might not have enough power to pick up a real difference. Absence of evidence isn't evidence of absence, so you'…
> What you wrote in the conversation
>
> Our guess: this looks secure. You were then given a harder version of the question.
>
> Separates statistical significance from the size or importance of the effect, and refers to the effect size or confidence interval
>
> You addressed this in your own words in the conversation.
>
> No, a small p doesn't mean a big effect. With a huge sample even a tiny difference can get a tiny p. You'd have to look at the effect size, here it's 2.2 words and Cohen's d about 0.7, which I think…
> What you wrote in the conversation
> I'd point them to the confidence interval too. It goes from 0.2 to 4.2 words, so the real effect could be pretty tiny or quite big, we're not that sure. So I wouldn't write 'big effect', more like th…
> What you wrote in the conversation
>
> Our guess: this looks secure. You were then given a harder version of the question.
>
> Says that a non-significant result is not proof of no effect, and mentions sample size or power
>
> You addressed this in your own words in the conversation.
>
> No, a non-significant p doesn't prove there's no effect. With only 40 people the study might not have enough power to pick up a real difference. Absence of evidence isn't evidence of absence, so you'…
> What you wrote in the conversation
>
> Our guess: this looks secure. You were then given a harder version of the question.
>
> **Where to grow**
>
> No growth areas were identified from this session.
>
> **Ideas to check**
>
> "there's only a 3% chance the null hypothesis is true, so a 97% chance that napping really works"
>
> You pushed back on this idea.
>
> I'd point them to the confidence interval too. It goes from 0.2 to 4.2 words, so the real effect could be pretty tiny or quite big, we're not that sure. So I wouldn't write 'big effect', more like th…
> What you wrote in the conversation
> No, a non-significant p doesn't prove there's no effect. With only 40 people the study might not have enough power to pick up a real difference. Absence of evidence isn't evidence of absence, so you'…
> What you wrote in the conversation
>
> "a smaller p-value means a bigger, more important effect, and a p-value above .05 would prove napping does nothing"
>
> You pushed back on this idea.
>
> I think it means that if napping actually did nothing, a difference this big would only happen about 3% of the time by chance, so the result is significant.
> What you wrote while preparing
> Because to know how likely napping does nothing you'd need extra info the test doesn't use, like how believable the effect was before the study even happened. The reading said that. The test just tak…
> What you wrote in the conversation
>
> Feedback is based only on what you wrote in this session. It was produced by matching your words against your teacher's criteria, not by a human reading them.

## 6. Transfer question (verbatim)

**Primer:** A different situation: a newspaper headline says a new revision app 'significantly improves exam scores (p = .04)' in a study of 6,000 pupils, and a friend asks whether they should pay for it. What from this session would you use there, and what would you change?

**Maya:** With 6,000 pupils even a really tiny improvement could come out significant, so p = .04 does not tell you if it is worth paying for. I would want to know how many marks it actually improves scores by and the confidence interval. I would also check who ran the study, I guess, since that is not really from this session.

**Primer:** Observation: your answer reuses ideas from 1 of the criteria.

> Experience complete ... You have finished. You can close this page. Back to all experiences

## 7. My honest view, as Maya

**Was it clear what to do?** Mostly yes. The briefing told me who Jordan is and what I'm supposed to do, and the three steps (prepare, practise, feedback) were obvious. The "Key points" list at the top of Prepare was a bit weird though: one of the "key points" is just "Forty students are randomly split into two groups", another one is a question, and one runs the title straight into a sentence ("...memory study A researcher wants..."). I ignored it and read the full material instead, which was clear and short.

**Did Jordan respond to what I actually said?** Partly. The opening question and the three "new" questions (why can't the test tell me how likely the null is, isn't a small p a huge effect, would p = .20 mean napping does nothing) were good and made me think. But between each of those Jordan said exactly the same line, "Okay, I think I follow. But suppose someone disagreed with you. What would you say to convince them?", four times. The second time I told Jordan "You already asked me that one" and Jordan just ignored it and moved on. Jordan also never actually pushed back on anything I said or misunderstood me, even though the briefing said Jordan is confident and will push back until it makes sense. It felt like a list of set questions, not a classmate. When I said "Did you want to talk about whether the effect is actually big?" the next question did happen to be about effect size, but I think that was just the next question in line, not a reaction to me.

**Did I have to do the work myself?** Yes. Nothing was handed to me during practice; I had to explain everything in my own words, and I used the reading to check myself. The prep questions also got me thinking before I started. The "suppose someone disagreed" line could have been a good push, but because it was always identical it stopped feeling like a challenge.

**Was the feedback fair and did it quote me accurately?** The quotes are my real words, but a lot of them are cut off mid-word ("if the assumption was tr…", "so you'…"), including my own self-assessment at the top ("Jordan kep…"). Some of the quotes are put under the wrong heading. Under the idea "3% chance the null is true / 97% chance napping works" it quotes my confidence interval answer and my p = .20 answer, which aren't about that at all. Under "smaller p means bigger effect / p above .05 proves nothing" it quotes my prep answer and my "extra info" answer, which are about the other idea. It looks like the two lists of quotes got swapped. Also "Explicitly rejects the reading that p is the probability the null is true" quotes my small-p and p = .20 answers as evidence, which don't really show that.

Every part said "this looks secure. You were then given a harder version of the question." I don't think I got a harder version. The "harder" question was the same "suppose someone disagreed" line every time. "No growth areas were identified" also felt too generous: I said myself that I was vague about Cohen's d cutoffs and the confidence interval, and the feedback didn't pick up on that at all, even though it said to compare my view with the quotes. Some honest pointers would have been more useful than all-green. The transfer comment ("reuses ideas from 1 of the criteria") was fine but didn't tell me which one or whether my answer was any good.

**Anything confusing or wrong?** The repeated Jordan line, the mixed-up quotes under "Ideas to check", the cut-off quotes, and being told I got harder questions when I didn't. Practice also ended by itself straight after my wrap-up message. That was fine for me, but I only had 8 of 12 replies and there was no warning that it was about to end.

## 8. Findings

| Severity | What | Evidence |
|---|---|---|
| major | Feedback "Ideas to check" attaches the wrong quotes to each misconception (the two evidence lists look swapped) | "3% chance the null hypothesis is true..." is evidenced by Maya's CI reply and p = .20 reply; "smaller p-value means a bigger... effect, and p above .05..." is evidenced by her prep answer and her "extra info the test doesn't use" reply |
| major | Jordan repeats one fixed line as the "raise" after every criterion, 4 times verbatim, and ignores the student saying so | "Okay, I think I follow. But suppose someone disagreed with you. What would you say to convince them?" at t8, t12, t16, t20; Maya (4) "You already asked me that one" got no acknowledgement |
| major | Feedback says "You were then given a harder version of the question" for every criterion, but the "harder version" was only the generic line above | Every criterion block ends "Our guess: this looks secure. You were then given a harder version of the question."; session `adaptations` a1–a4 are kind "raise", i.e. the generic line |
| major | Jordan never pushes back or reacts to the content of replies, contrary to the briefing ("confident and will push back until your explanation actually makes sense") | Jordan's turns are fixed prompts per criterion (t6, t10, t14, t18) plus the repeated raise line; no turn refers to anything Maya said |
| minor | Criterion "Explicitly rejects... p is the probability the null hypothesis is true" cites replies that are about other criteria | Quotes "No, a small p doesn't mean a big effect..." and "No, a non-significant p doesn't prove there's no effect..." as evidence |
| minor | "Where to grow: No growth areas were identified" ignores hedging the student flagged herself | Maya wrote "I'm not totally sure on the cutoffs" in practice and "I was a bit vague there" in self-assessment |
| minor | Quotes are truncated mid-word, including the self-assessment quote | "if the assumption was tr…", "so you'…", "Jordan kep…" |
| minor | "Key points" on Prepare are poorly chosen fragments (a design detail, a question, a heading run into a sentence) | "Forty students are randomly split into two groups."; "Reading a p-value: the sleep and memory study A researcher wants to know..." |
| minor | Maya's wrap-up message (not an answer to Jordan's question) was logged as practice evidence for criterion c4 | Session turn t21, `criterionId: "c4"` |
| note | Practice ended automatically after all four criteria were covered (8 of 12 replies) with no warning; acceptable but abrupt | After Maya (8): "Thank you. I think I could explain some of this to someone else now." then "The practice is over." |
| note | Transfer feedback is vague | "Observation: your answer reuses ideas from 1 of the criteria." does not say which one |
| note | Overall flow, material and prep questions were clear; the student did all the explaining herself, nothing was handed over | Sections 2–3 |
