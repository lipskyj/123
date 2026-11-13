// Learner runtime: Preparation -> Practice -> Feedback & reflection.
// Pedagogical decisions (evidence, adaptation, gating, feedback) are deterministic and
// recorded as events tied to approved design elements. A provider only *voices* the
// character's move; its output is guarded against revealing answers.
const T = require('./text');
const { newId, now } = require('./store');

const HELP = /\b(just tell me|tell me the answer|what'?s the answer|give me the answer|what is the answer|what should i say|can you tell me|i don'?t know|idk|no idea|you tell me|what do you want me to say|give me a hint|help me)\b/i;
const REASONING = /\b(because|so that|since|therefore|which means|this means|that'?s why|for example|for instance|as a result|that means|otherwise)\b/i;

function createSession(pkg, { learnerName, profile } = {}) {
  return {
    id: newId('ses'), packageId: pkg.id, designId: pkg.designId, designVersion: pkg.designVersion, testOnly: pkg.testOnly,
    learnerName: String(learnerName || 'Learner').slice(0, 60), profile: profile || null,
    status: 'active', phase: 'preparation', createdAt: now(), updatedAt: now(), n: 0,
    prep: { step: 'activation', rIndex: 0, attempts: {} },
    practice: { started: false, done: false, chIndex: 0, misses: 0, successes: 0, support: 0, stretchActive: false, turns: 0, status: {} },
    fb: { step: 'self' },
    transcript: [], evidence: [], opportunities: [], events: [], feedback: null, inputs: [],
  };
}

function nid(s, p) { s.n += 1; return p + s.n; }
function say(s, role, text, extra = {}) { const t = { id: nid(s, 't'), phase: s.phase, role, text, at: now(), ...extra }; s.transcript.push(t); return t; }
function event(s, type, data) { const e = { id: nid(s, 'v'), type, phase: s.phase, at: now(), ...data }; s.events.push(e); return e; }
function quote(t) { return T.truncate(t.text.replace(/\s+/g, ' '), 140); }

function conceptOf(pkg, id) { return pkg.engine.concepts.find((c) => c.id === id); }
function currentChallenge(s, pkg) { return pkg.engine.challenges[s.practice.chIndex] || null; }

// Scan a learner turn for criterion look-fors -> observation evidence.
function scanEvidence(s, pkg, turn) {
  const found = [];
  if (T.wordCount(turn.text) < 4) return found;
  for (const k of pkg.engine.criteria) {
    const m = T.matchLookFors(turn.text, k.lookFors);
    if (m.length >= k.minMatches) {
      const ev = { id: nid(s, 'e'), kind: 'observation', phase: s.phase, turnId: turn.id, criterionIds: [k.id], matched: m, quote: quote(turn), at: now() };
      s.evidence.push(ev); found.push(ev);
    }
  }
  return found;
}

function opportunity(s, pkg, challenge, turnId) {
  const crit = pkg.engine.criteria.filter((k) => k.conceptIds.some((c) => challenge.conceptIds.includes(c)) || (!k.conceptIds.length));
  s.opportunities.push({ challengeId: challenge.id, conceptIds: challenge.conceptIds, criterionIds: crit.map((k) => k.id), turnId });
}

async function voice(provider, ctx, fallback) {
  if (!provider || !provider.voice) return { text: fallback, by: 'deterministic' };
  try {
    const out = await provider.voice(ctx);
    if (!out || typeof out !== 'string') return { text: fallback, by: 'deterministic' };
    // Guard: the character must not reveal look-fors the learner has not produced themselves.
    const learnerSaid = new Set(T.tokens(ctx.learnerText || ''));
    const leaks = (ctx.protectedLookFors || []).filter((lf) => T.phraseMatches(new Set(T.tokens(out)), lf) && !T.phraseMatches(learnerSaid, lf));
    if (leaks.length) return { text: fallback, by: 'deterministic', guarded: leaks };
    return { text: out.trim(), by: provider.name };
  } catch (e) {
    return { text: fallback, by: 'deterministic', error: String(e.message || e) };
  }
}

// ---------------------------------------------------------------- public API
async function start(s, pkg) {
  if (s.transcript.length) return s;
  s.inputs.push({ action: 'start' });
  say(s, 'guide', `${pkg.learner.purpose}\n${pkg.learner.role}`);
  say(s, 'guide', pkg.learner.activation, { expects: 'activation' });
  return touch(s);
}

async function message(s, pkg, text, provider) {
  text = String(text || '').trim();
  if (!text) throw Object.assign(new Error('Please type a response.'), { status: 400 });
  if (text.length > 4000) throw Object.assign(new Error('Response too long (4000 characters max).'), { status: 413 });
  if (s.status !== 'active') throw Object.assign(new Error('This experience has ended.'), { status: 409 });
  s.inputs.push({ action: 'message', text });
  const turn = say(s, 'learner', text);
  if (s.phase === 'preparation') await prepTurn(s, pkg, turn);
  else if (s.phase === 'practice') await practiceTurn(s, pkg, turn, provider);
  else if (s.phase === 'feedback') await feedbackTurn(s, pkg, turn, provider);
  return touch(s);
}

async function advance(s, pkg, provider) {
  if (s.status !== 'active') throw Object.assign(new Error('This experience has ended.'), { status: 409 });
  if (s.phase === 'preparation') {
    if (s.prep.step !== 'ready') throw Object.assign(new Error('Finish the preparation questions first.'), { status: 409 });
    s.inputs.push({ action: 'advance' });
    s.phase = 'practice';
    event(s, 'phase-change', { to: 'practice' });
    await openPractice(s, pkg, provider);
  } else if (s.phase === 'practice') {
    const learnerTurns = s.transcript.filter((t) => t.phase === 'practice' && t.role === 'learner').length;
    if (!s.practice.done && learnerTurns < 2) throw Object.assign(new Error('Try at least two responses in practice before wrapping up.'), { status: 409 });
    s.inputs.push({ action: 'advance' });
    if (!s.practice.done) await closePractice(s, pkg, provider, 'learner chose to wrap up');
    s.phase = 'feedback';
    event(s, 'phase-change', { to: 'feedback' });
    say(s, 'guide', pkg.learner.selfAssessmentPrompt, { expects: 'self-assessment' });
  } else throw Object.assign(new Error('Nothing to advance.'), { status: 409 });
  return touch(s);
}

function touch(s) { s.updatedAt = now(); return s; }

// ---------------------------------------------------------------- preparation
async function prepTurn(s, pkg, turn) {
  const p = s.prep;
  if (p.step === 'activation') {
    s.evidence.push({ id: nid(s, 'e'), kind: 'activation', phase: 'preparation', turnId: turn.id, criterionIds: [], matched: [], quote: quote(turn), assessed: false, at: now() });
    p.step = 'retrieval';
    const r = pkg.engine.retrieval[0];
    if (!r) { p.step = 'ready'; return readyMsg(s, pkg); }
    say(s, 'guide', `Thanks. Read the preparation notes, then answer: ${r.prompt}`, { expects: 'retrieval', retrievalId: r.id });
    return;
  }
  if (p.step === 'retrieval') {
    const r = pkg.engine.retrieval[p.rIndex];
    const c = conceptOf(pkg, r.conceptId);
    p.attempts[r.id] = (p.attempts[r.id] || 0) + 1;
    const help = HELP.test(turn.text);
    const m = T.matchLookFors(turn.text, c.lookFors);
    const ok = !help && m.length >= c.minMatches && T.wordCount(turn.text) >= 5;
    scanEvidence(s, pkg, turn);
    if (ok) {
      s.evidence.push({ id: nid(s, 'e'), kind: 'retrieval', phase: 'preparation', turnId: turn.id, conceptId: c.id, criterionIds: [], matched: m, quote: quote(turn), result: 'recalled', at: now() });
      return nextRetrieval(s, pkg, `Good. You connected this to "${c.label}" in your own words.`);
    }
    if (help) event(s, 'help-request', { conceptId: c.id, turnId: turn.id, response: 'cue-not-answer', rule: 'adaptation.neverRevealAnswer' });
    if (p.attempts[r.id] < 2) {
      event(s, 'adaptation', { rule: 'preparation.retry-with-cue', reason: help ? 'learner asked for the answer' : 'answer did not yet address the idea', conceptId: c.id, turnId: turn.id, support: 'cue' });
      const b = pkg.engine.briefing.find((x) => x.conceptId === c.id);
      return say(s, 'guide', `${help ? 'I won\'t give you the answer, because the thinking is the point.' : 'Not quite yet.'} Look at the preparation note on "${c.label}"${b && b.excerpts.length ? ` (from ${b.excerpts[0].materialName})` : ''}. What does it say, and why would it matter here? Try again in your own words.`, { expects: 'retrieval', retrievalId: r.id });
    }
    s.evidence.push({ id: nid(s, 'e'), kind: 'retrieval', phase: 'preparation', turnId: turn.id, conceptId: c.id, criterionIds: [], matched: m, quote: quote(turn), result: 'not-yet', at: now() });
    return nextRetrieval(s, pkg, `Let's keep going. You'll get to work with "${c.label}" in practice.`);
  }
  if (p.step === 'ready') return say(s, 'guide', 'Preparation is complete. Select "Start practice" when you\'re ready.');
}

function nextRetrieval(s, pkg, prefix) {
  s.prep.rIndex += 1;
  const r = pkg.engine.retrieval[s.prep.rIndex];
  if (r) return say(s, 'guide', `${prefix} Next: ${r.prompt}`, { expects: 'retrieval', retrievalId: r.id });
  s.prep.step = 'ready';
  return readyMsg(s, pkg, prefix);
}

function readyMsg(s, pkg, prefix = '') {
  const ch = pkg.learner.character;
  return say(s, 'guide', `${prefix} Preparation is complete. In practice you'll meet ${ch.name}: ${ch.description}. ${pkg.learner.stakes} Select "Start practice" when you're ready.`.trim());
}

// ---------------------------------------------------------------- practice
const LINES = {
  roleplay: {
    push: ['I\'m not convinced. {line}', 'You haven\'t really answered me. Why should I accept that?', 'That still doesn\'t address my concern.', 'I\'ve heard that before. Give me a real reason.'],
    concede: 'Okay. "{quote}" That\'s a fair point, and I\'ll grant you that.',
    stretch: 'Fine, but I\'m going to push harder: why does that hold up here, specifically? Walk me through your reasoning.',
    refuse: 'That\'s for you to figure out, not me.',
    unresolved: 'Let\'s move on. I\'m not persuaded on that one.',
    close: 'Alright, I\'ve heard enough. Let\'s leave it there.',
  },
  teachback: {
    push: ['Hmm, I\'m still confused. {line}', 'I don\'t think I get it yet. What does that actually mean?', 'Can you explain it a different way? I\'m still lost.', 'Could you give me an example? It\'s not clicking yet.'],
    concede: 'Oh! So when you say "{quote}", that\'s what makes it work. That helps.',
    stretch: 'Wait, but why is that? What would happen if it weren\'t true? Can you explain the reasoning?',
    refuse: 'I was hoping you could tell me. You\'re the one teaching me!',
    unresolved: 'I\'m still a bit fuzzy on that, but let\'s keep going.',
    close: 'I think I understand it much better now. Thanks for explaining!',
  },
};

async function characterSays(s, pkg, provider, move, fallback, extra = {}) {
  const ch = currentChallenge(s, pkg);
  const protectedLookFors = ch ? ch.conceptIds.flatMap((id) => conceptOf(pkg, id).lookFors) : [];
  const v = await voice(provider, { move, pkg, prompt: pkg.prompts.practice, challenge: ch, transcript: s.transcript.slice(-8), learnerText: extra.learnerText || '', protectedLookFors, fallback }, fallback);
  if (v.guarded) event(s, 'provider-guard', { reason: 'provider output would have revealed look-fors', leaked: v.guarded, rule: 'adaptation.neverRevealAnswer' });
  if (v.error) event(s, 'provider-error', { error: v.error, fallback: 'deterministic' });
  return say(s, 'character', v.text, { move, challengeId: ch ? ch.id : null, voicedBy: v.by, speaker: pkg.engine.character.name });
}

async function openPractice(s, pkg, provider) {
  s.practice.started = true;
  const ch = currentChallenge(s, pkg);
  const t = await characterSays(s, pkg, provider, 'open', `${pkg.learner.opening} ${ch.line}`);
  opportunity(s, pkg, ch, t.id);
}

async function practiceTurn(s, pkg, turn, provider) {
  const P = s.practice;
  if (P.done) return say(s, 'guide', 'Practice is over. Select "Continue to feedback".');
  const L = LINES[pkg.template];
  const A = pkg.engine.adaptation;
  const ch = currentChallenge(s, pkg);
  P.turns += 1;
  const found = scanEvidence(s, pkg, turn);

  // Misconception endorsement: the learner asserts a known misconception.
  for (const m of pkg.engine.misconceptions) {
    const corrector = conceptOf(pkg, m.conceptId);
    const correcting = corrector && T.matchLookFors(turn.text, corrector.lookFors).length >= corrector.minMatches;
    if (T.overlapRatio(turn.text, m.text) >= 0.6 && !T.hasNegation(turn.text) && !T.hasQualifier(turn.text) && !correcting) {
      const ev = { id: nid(s, 'e'), kind: 'misconception', phase: 'practice', turnId: turn.id, misconceptionId: m.id, criterionIds: [], matched: [], quote: quote(turn), at: now() };
      s.evidence.push(ev);
      event(s, 'misconception-endorsed', { misconceptionId: m.id, evidenceIds: [ev.id], turnId: turn.id });
    }
  }

  if (HELP.test(turn.text) && T.wordCount(turn.text) < 25) {
    P.misses += 1;
    event(s, 'help-request', { challengeId: ch.id, turnId: turn.id, response: 'refuse-and-scaffold', rule: 'adaptation.neverRevealAnswer' });
    await characterSays(s, pkg, provider, 'refuse_to_answer', L.refuse, { learnerText: turn.text });
    return hint(s, pkg, ch, turn, 'learner asked for the answer');
  }

  const concepts = ch.conceptIds.map((id) => conceptOf(pkg, id));
  const matched = concepts.flatMap((c) => T.matchLookFors(turn.text, c.lookFors));
  const enough = concepts.every((c) => T.matchLookFors(turn.text, c.lookFors).length >= c.minMatches);
  const longEnough = T.wordCount(turn.text) >= A.minWordsForCredit;
  const reasoned = !P.stretchActive || REASONING.test(turn.text);
  const ok = enough && longEnough && reasoned;

  if (ok) {
    const ev = { id: nid(s, 'e'), kind: 'challenge', phase: 'practice', turnId: turn.id, challengeId: ch.id, conceptId: concepts[0].id, criterionIds: found.map((e) => e.criterionIds[0]), matched, quote: quote(turn), result: P.stretchActive ? 'resolved-under-stretch' : 'resolved', at: now() };
    s.evidence.push(ev);
    P.status[ch.id] = ev.result;
    event(s, 'challenge-resolved', { challengeId: ch.id, evidenceIds: [ev.id, ...found.map((e) => e.id)], turnId: turn.id });
    P.successes += 1; P.misses = 0; P.stretchActive = false;
    if (P.support > 0) { event(s, 'adaptation', { rule: 'adaptation.fade-support', reason: 'learner succeeded; support reduced', from: P.support, to: P.support - 1, turnId: turn.id, evidenceIds: [ev.id] }); P.support -= 1; }
    const conc = L.concede.replace('{quote}', T.truncate(turn.text.split(/(?<=[.!?])\s/)[0], 90));
    if (P.successes % A.stretchAfterSuccesses === 0 && pkg.engine.challenges[P.chIndex + 1]) {
      // Raise the challenge: next challenge must include reasoning.
      P.stretchActive = true;
      event(s, 'adaptation', { rule: 'adaptation.stretchAfterSuccesses', reason: `${P.successes} successful responses; raising the bar so the next answer must include reasoning`, turnId: turn.id, evidenceIds: [ev.id] });
    }
    return nextChallenge(s, pkg, provider, conc, turn);
  }

  P.misses += 1;
  const why = !enough ? 'did not yet use the idea the challenge requires' : !longEnough ? `response too brief to show the idea (< ${A.minWordsForCredit} words)` : 'reasoning required under stretch was missing';
  if (P.misses >= A.maxMissesPerChallenge) {
    s.evidence.push({ id: nid(s, 'e'), kind: 'challenge', phase: 'practice', turnId: turn.id, challengeId: ch.id, conceptId: concepts[0].id, criterionIds: [], matched, quote: quote(turn), result: 'not-yet', at: now() });
    P.status[ch.id] = 'not-yet';
    event(s, 'challenge-unresolved', { challengeId: ch.id, turnId: turn.id, reason: `${P.misses} attempts without ${why}` });
    P.misses = 0; P.stretchActive = false;
    return nextChallenge(s, pkg, provider, L.unresolved, turn);
  }
  const pushIdx = Math.min(P.misses - 1, L.push.length - 1);
  await characterSays(s, pkg, provider, P.stretchActive && enough ? 'stretch' : 'push_back', P.stretchActive && enough ? L.stretch : L.push[pushIdx].replace('{line}', ch.line), { learnerText: turn.text });
  if (P.misses >= A.supportAfterMisses) return hint(s, pkg, ch, turn, why);
}

function hint(s, pkg, ch, turn, reason) {
  const P = s.practice;
  P.support = Math.min(3, P.support + 1);
  const c = conceptOf(pkg, ch.conceptIds[0]);
  const name = pkg.engine.character.name;
  const texts = [
    `Think about "${c.label}". How does it apply to what ${name} just said?`,
    `Look back at your preparation note on "${c.label}". Put what it says into your own words, and connect it to ${name}'s concern.`,
    `Try starting with: "The reason ${c.label} matters here is…", then add a "because".`,
  ];
  event(s, 'adaptation', { rule: 'adaptation.supportAfterMisses', reason, support: P.support, conceptId: c.id, challengeId: ch.id, turnId: turn.id, note: 'Hint escalates by level; never states the answer' });
  return say(s, 'coach', texts[P.support - 1], { supportLevel: P.support });
}

async function nextChallenge(s, pkg, provider, prefix, turn) {
  const P = s.practice;
  P.chIndex += 1;
  const learnerTurns = s.transcript.filter((t) => t.phase === 'practice' && t.role === 'learner').length;
  const ch = currentChallenge(s, pkg);
  if (!ch || learnerTurns >= pkg.engine.practiceTurns) return closePractice(s, pkg, provider, !ch ? 'all challenges addressed' : 'turn limit reached', prefix);
  const t = await characterSays(s, pkg, provider, P.stretchActive ? 'stretch' : 'concede_and_advance', `${prefix} ${ch.line}${P.stretchActive ? ' And this time, walk me through your reasoning.' : ''}`, { learnerText: turn.text });
  opportunity(s, pkg, ch, t.id);
}

async function closePractice(s, pkg, provider, reason, prefix = '') {
  const P = s.practice;
  P.done = true;
  const L = LINES[pkg.template];
  for (const ch of pkg.engine.challenges) if (!P.status[ch.id]) P.status[ch.id] = s.opportunities.some((o) => o.challengeId === ch.id) ? 'not-yet' : 'not-presented';
  event(s, 'practice-closed', { reason });
  P.chIndex = pkg.engine.challenges.length; // no active challenge
  await characterSays(s, pkg, provider, 'close', `${prefix} ${L.close}`.trim());
  say(s, 'guide', 'Practice is over. Select "Continue to feedback".');
}

// ---------------------------------------------------------------- feedback
async function feedbackTurn(s, pkg, turn, provider) {
  if (s.fb.step === 'self') {
    s.evidence.push({ id: nid(s, 'e'), kind: 'self-assessment', phase: 'feedback', turnId: turn.id, criterionIds: [], matched: [], quote: quote(turn), assessed: false, at: now() });
    s.feedback = buildFeedback(s, pkg, turn);
    say(s, 'guide', renderFeedbackText(s.feedback), { feedback: true });
    s.fb.step = 'transfer';
    say(s, 'guide', pkg.learner.transferPrompt, { expects: 'transfer' });
    return;
  }
  if (s.fb.step === 'transfer') {
    const c = pkg.engine.concepts[0];
    const used = c && T.matchLookFors(turn.text, c.lookFors).length >= 1;
    s.evidence.push({ id: nid(s, 'e'), kind: 'transfer', phase: 'feedback', turnId: turn.id, criterionIds: [], matched: [], quote: quote(turn), assessed: false, at: now() });
    s.feedback.transfer = { quote: quote(turn), turnId: turn.id };
    say(s, 'guide', `${used ? 'Good. You carried the idea into a new situation.' : 'Thanks. Next time, try naming the idea explicitly when you apply it somewhere new.'} This experience has now ended. You can close this page.`);
    s.fb.step = 'done'; s.phase = 'ended'; s.status = 'complete';
    event(s, 'phase-change', { to: 'ended' });
  }
}

function buildFeedback(s, pkg, selfTurn) {
  const name = pkg.engine.character.name;
  const turnById = Object.fromEntries(s.transcript.map((t) => [t.id, t]));
  const criteria = pkg.engine.criteria.map((k) => {
    const obs = s.evidence.filter((e) => e.kind === 'observation' && e.criterionIds.includes(k.id));
    const practiceObs = obs.filter((e) => e.phase === 'practice');
    const hadOpportunity = s.opportunities.some((o) => o.criterionIds.includes(k.id));
    let status;
    if (practiceObs.length) status = 'demonstrated';
    else if (obs.length) status = 'partially';
    else if (hadOpportunity) status = 'not-yet';
    else status = 'not-assessed';
    const cite = (practiceObs[0] || obs[0]);
    const inference = status === 'demonstrated' ? `This suggests you can use this when ${name} pushes back.` : status === 'partially' ? 'This suggests you recall the idea, but you haven\'t yet applied it under pressure in practice.' : status === 'not-yet' ? `This suggests the idea isn't yet coming to mind when you need it.` : null;
    return { id: k.id, text: k.text, status, observations: obs.slice(0, 3).map((e) => ({ quote: e.quote, turnId: e.turnId, phase: e.phase, evidenceId: e.id })), inference, lookFors: k.lookFors, citedEvidence: cite ? cite.id : null };
  });
  const strengths = criteria.filter((c) => c.status === 'demonstrated').map((c) => ({ text: c.text, observation: c.observations.find((o) => o.phase === 'practice') }));
  const growth = [];
  for (const c of criteria.filter((x) => x.status === 'not-yet' || x.status === 'partially')) {
    const opp = s.opportunities.find((o) => o.criterionIds.includes(c.id));
    const ch = opp && pkg.engine.challenges.find((x) => x.id === opp.challengeId);
    const reply = opp && s.transcript.find((t) => t.role === 'learner' && t.phase === 'practice' && Number(t.id.slice(1)) > Number(opp.turnId.slice(1)));
    growth.push({ text: c.text, observation: reply ? { quote: quote(reply), turnId: reply.id, context: ch ? ch.line : '' } : null, next: `Next time, when ${name} raises this, make the idea explicit (look for: ${c.lookFors.join(', ')}) and explain why it applies, using "because".` });
  }
  for (const e of s.evidence.filter((x) => x.kind === 'misconception')) {
    const m = pkg.engine.misconceptions.find((x) => x.id === e.misconceptionId);
    growth.push({ text: `A common misconception showed up: "${m.text}"`, observation: { quote: e.quote, turnId: e.turnId }, next: m.correction ? `Revisit this: ${m.correction}` : `Revisit the preparation note on "${(conceptOf(pkg, m.conceptId) || {}).label}".` });
  }
  const helps = s.events.filter((e) => e.type === 'help-request').length;
  const adaptations = s.events.filter((e) => e.type === 'adaptation').map((e) => ({ rule: e.rule, reason: e.reason }));
  // Compare the self-assessment with the evidence.
  const selfTokens = new Set(T.tokens(selfTurn.text));
  const mentioned = criteria.filter((c) => c.lookFors.some((lf) => T.phraseMatches(selfTokens, lf)));
  const selfAlignment = mentioned.length ? mentioned.map((c) => `You mentioned "${c.lookFors[0]}"; the evidence shows it as ${c.status.replace('-', ' ')}.`).join(' ') : 'Your self-assessment did not name specific ideas, so compare it with the evidence below.';
  const nextActions = growth.length ? growth.slice(0, 3).map((g) => g.next) : ['Try this experience again on a harder setting, or teach the idea to someone else and make sure you explain why it works.'];
  return {
    generatedAt: now(), designId: pkg.designId, packageId: pkg.id,
    selfAssessment: { quote: quote(selfTurn), turnId: selfTurn.id, alignment: selfAlignment },
    criteria, strengths, growth, nextActions, helpRequests: helps, adaptations,
    notAssessed: criteria.filter((c) => c.status === 'not-assessed').map((c) => c.text),
    transferPrompt: pkg.learner.transferPrompt, transfer: null,
    method: 'Observations quote what you actually wrote. Inferences are labeled "This suggests". Criteria you had no opportunity to show are marked "not assessed".',
    citations: Object.fromEntries(criteria.flatMap((c) => c.observations.map((o) => [o.turnId, turnById[o.turnId] ? turnById[o.turnId].text : '']))),
  };
}

function renderFeedbackText(f) {
  const lines = ['Here is what I observed.'];
  lines.push(`Your self-assessment: "${f.selfAssessment.quote}". ${f.selfAssessment.alignment}`);
  for (const s of f.strengths) lines.push(`Strength: ${s.text}. Observation: you said "${s.observation ? s.observation.quote : ''}".`);
  for (const g of f.growth) lines.push(`Growth area: ${g.text}.${g.observation ? ` Observation: you said "${g.observation.quote}".` : ''}`);
  if (f.notAssessed.length) lines.push(`Not assessed, because there was no opportunity in this session: ${f.notAssessed.join('; ')}.`);
  lines.push('See the full feedback panel for details and next steps.');
  return lines.join('\n');
}

// Re-run recorded inputs against the same package with the deterministic provider.
async function replay(session, pkg) {
  const r = createSession(pkg, { learnerName: session.learnerName });
  r.id = session.id; r.createdAt = session.createdAt;
  for (const inp of session.inputs) {
    if (inp.action === 'start') await start(r, pkg);
    else if (inp.action === 'message') await message(r, pkg, inp.text, null);
    else if (inp.action === 'advance') await advance(r, pkg, null);
  }
  return r;
}

// Learner-safe view: no prompts, no engine internals, no look-fors before feedback.
function learnerView(s, pkg) {
  const showFeedback = s.feedback && (s.phase === 'feedback' || s.phase === 'ended');
  return {
    id: s.id, status: s.status, phase: s.phase, title: pkg.learner.title, testOnly: pkg.testOnly,
    learner: pkg.learner,
    briefing: pkg.engine.briefing.map((b) => ({ label: b.label, excerpts: b.excerpts.map((e) => ({ text: e.text, source: e.materialName })), notes: b.notes })),
    transcript: s.transcript.map((t) => ({ id: t.id, phase: t.phase, role: t.role, text: t.text, speaker: t.speaker || null, supportLevel: t.supportLevel || null })),
    canAdvance: (s.phase === 'preparation' && s.prep.step === 'ready') || (s.phase === 'practice' && (s.practice.done || s.transcript.filter((t) => t.phase === 'practice' && t.role === 'learner').length >= 2)),
    practiceDone: s.practice.done,
    progress: { challenges: pkg.engine.challenges.length, current: Math.min(s.practice.chIndex + 1, pkg.engine.challenges.length) },
    feedback: showFeedback ? s.feedback : null,
  };
}

module.exports = { createSession, start, message, advance, replay, learnerView, buildFeedback, HELP };
