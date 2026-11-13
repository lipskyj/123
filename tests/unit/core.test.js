// Unit tests for the pure modules: text, intake, design, compile, runtime.
const test = require('node:test');
const assert = require('node:assert/strict');
const T = require('../../src/text');
const intake = require('../../src/intake');
const design = require('../../src/design');
const { compile, validatePackage } = require('../../src/compile');
const runtime = require('../../src/runtime');

function project(brief, { materials = true } = {}) {
  const p = { id: 'prj-unit', name: brief.name, intake: { answers: {}, complete: false }, materials: [], transcript: [], designs: [], log: [] };
  if (materials) for (const m of brief.materials || []) intake.addMaterial(p, m);
  let q, guard = 0;
  while ((q = intake.nextQuestion(p)) && guard++ < 40) intake.answer(p, q.followup ? 'skip' : brief.answers[q.id] || 'skip');
  return p;
}
const mba = require('../../fixtures/briefs/mba-negotiation.json');
const bio = require('../../fixtures/briefs/biology-natural-selection.json');

test('text: list splitting handles newlines, semicolons, commas and prose', () => {
  assert.deepEqual(T.splitList('a\nb\nc'), ['a', 'b', 'c']);
  assert.deepEqual(T.splitList('BATNA; reservation price; anchoring'), ['BATNA', 'reservation price', 'anchoring']);
  assert.deepEqual(T.splitList('alpha, beta, and gamma'), ['alpha', 'beta', 'gamma']);
  assert.equal(T.splitList('A single long sentence that has a comma, and keeps going for quite a while with many words in it').length, 1);
});

test('text: look-for matching uses stems and requires all words of a phrase', () => {
  assert.deepEqual(T.matchLookFors('My reservation prices are firm', ['reservation price']), ['reservation price']);
  assert.deepEqual(T.matchLookFors('the price is fine', ['reservation price']), []);
});

test('intake: asks one question at a time, in order, and records verbatim answers', () => {
  const p = { id: 'x', intake: { answers: {}, complete: false }, materials: [], transcript: [], designs: [] };
  assert.equal(intake.nextQuestion(p).id, 'topic');
  intake.answer(p, 'Statistics: p-values');
  assert.equal(p.intake.answers.topic.text, 'Statistics: p-values');
  assert.equal(intake.nextQuestion(p).id, 'learners');
});

test('intake: too-short required answers get exactly one follow-up; required skips are challenged once', () => {
  const p = { id: 'x', intake: { answers: {}, complete: false }, materials: [], transcript: [], designs: [] };
  intake.answer(p, 'Stats');
  intake.answer(p, 'grads');
  assert.equal(intake.nextQuestion(p).id, 'learners');
  assert.equal(intake.nextQuestion(p).followup, true);
  intake.answer(p, 'second-year PhD students in sociology');
  assert.match(p.intake.answers.learners.text, /grads\nsecond-year PhD/);
  assert.equal(intake.nextQuestion(p).id, 'objective');
  intake.answer(p, 'skip');
  assert.equal(intake.nextQuestion(p).followup, true, 'a required skip is challenged once');
  intake.answer(p, 'skip');
  assert.equal(p.intake.answers.objective.skipped, true);
});

test('intake: template recommendation follows the described student work, and the educator can override it', () => {
  assert.equal(intake.recommendTemplate('persuade a skeptical client').template, 'roleplay');
  assert.equal(intake.recommendTemplate('explain photosynthesis to a younger student').template, 'teachback');
  const p = project({ ...mba, answers: { ...mba.answers, template: 'teachback' } });
  assert.equal(p.intake.answers.template.text, 'teachback');
  assert.equal(p.intake.answers.template.overridden, true);
});

test('intake: materials yield suggested key ideas', () => {
  const p = { id: 'x', intake: { answers: {}, complete: false }, materials: [], transcript: [], designs: [] };
  intake.addMaterial(p, mba.materials[0]);
  for (const id of ['topic', 'learners', 'objective', 'materials']) intake.answer(p, mba.answers[id]);
  const q = intake.nextQuestion(p);
  assert.equal(q.id, 'concepts');
  assert.ok(q.suggestions.length > 0);
  assert.ok(q.suggestions.some((s) => /batna|anchor|reservation/i.test(s)), q.suggestions.join());
});

test('design: every educator answer appears in the design with educator provenance', () => {
  const p = project(mba);
  const d = design.generateDesign(p);
  assert.equal(d.status, 'draft');
  assert.equal(d.decisions.objective, mba.answers.objective);
  assert.deepEqual(d.decisions.concepts.map((c) => c.label), ['BATNA', 'reservation price', 'anchoring', 'objective criteria']);
  assert.equal(d.decisions.misconceptions.length, 3);
  assert.equal(d.decisions.criteria.length, 3);
  assert.equal(d.decisions.character.name, 'Dana');
  for (const k of ['objective', 'concepts', 'misconceptions', 'criteria', 'character', 'learnerRole']) assert.equal(d.provenance[k].source, 'educator', k);
  assert.deepEqual(design.validateDesign(d), []);
});

test('design: missing educator input becomes visible AI assumptions, never silent', () => {
  const sparse = { name: 's', answers: { topic: 'Chemistry: stoichiometry', learners: 'high school juniors', objective: 'Balance chemical equations and compute molar ratios', work: 'explain to a classmate', template: 'teachback' } };
  const d = design.generateDesign(project(sparse));
  assert.ok(d.assumptions.length >= 3, JSON.stringify(d.assumptions));
  assert.equal(d.provenance.criteria.source, 'ai');
  assert.deepEqual(design.validateDesign(d), []);
});

test('design: materials influence the design (briefing excerpts and grounding)', () => {
  const withM = design.generateDesign(project(mba));
  const without = design.generateDesign(project(mba, { materials: false }));
  const ex = (d) => d.derived.briefing.reduce((a, b) => a + b.excerpts.length, 0);
  assert.ok(ex(withM) >= 4);
  assert.equal(ex(without), 0);
  assert.ok(withM.derived.briefing[0].excerpts[0].text.includes('BATNA'));
});

test('design: natural-language revision changes decisions and propagates to prompts, challenges and adaptation', () => {
  const p = project(mba);
  const d1 = design.generateDesign(p);
  const r = design.revise(p, d1.id, { request: 'Make it harder. Add criterion: labels concessions and asks for something in return. Rename the character to Morgan.' });
  const d2 = r.design;
  assert.equal(d2.status, 'revised');
  assert.equal(d1.status, 'superseded');
  assert.equal(d2.version, 2);
  assert.equal(d2.decisions.difficulty, 'challenging');
  assert.equal(d2.decisions.adaptation.stretchAfterSuccesses, 1);
  assert.equal(d2.decisions.criteria.length, 4);
  assert.equal(d2.decisions.character.name, 'Morgan');
  assert.match(d2.derived.prompts.practice, /You are Morgan/);
  assert.match(d2.derived.prompts.feedback, /labels concessions/);
  assert.match(d2.derived.learner.opening, /Morgan/);
  assert.ok(d2.changes.some((c) => c.path.startsWith('character')));
  assert.equal(d2.provenance.criteria.source, 'educator');
});

test('design: unrecognized revision requests are reported, not silently ignored', () => {
  const p = project(mba);
  const d1 = design.generateDesign(p);
  const r = design.revise(p, d1.id, { request: 'Please make the vibe more cosmic.' });
  assert.equal(r.design, null);
  assert.deepEqual(r.unrecognized, ['Please make the vibe more cosmic.']);
  assert.equal(d1.status, 'draft');
});

test('design: direct edits are validated; invalid edits are refused', () => {
  const p = project(bio);
  const d1 = design.generateDesign(p);
  assert.throws(() => design.revise(p, d1.id, { edits: { concepts: [] } }), /invalid/);
  assert.throws(() => design.revise(p, d1.id, { edits: { secret: 1 } }), /not editable/);
  const r = design.revise(p, d1.id, { edits: { concepts: [...d1.decisions.concepts, { label: 'genetic drift' }] } });
  assert.ok(r.design.derived.challenges.some((c) => /genetic drift/.test(c.line)));
});

test('approval state machine: only open designs can be approved; approval needs a name; test mode yields test approval', () => {
  const p = project(mba);
  const d = design.generateDesign(p);
  assert.throws(() => design.transition(p, d.id, 'approve', {}), /name/);
  design.transition(p, d.id, 'approve', { by: 'Bot', testMode: true });
  assert.equal(d.status, 'test-approved');
  assert.equal(d.approval.kind, 'test');
  assert.match(d.approval.label, /TEST APPROVAL/);
  assert.throws(() => design.transition(p, d.id, 'approve', { by: 'Bot' }), /cannot be approved/);
  const p2 = project(mba); const e = design.generateDesign(p2);
  design.transition(p2, e.id, 'approve', { by: 'Prof. Real' });
  assert.equal(e.status, 'educator-approved');
});

test('compile: refuses an unapproved draft (approval gate)', () => {
  const p = project(mba);
  const d = design.generateDesign(p);
  assert.throws(() => compile(p, d.id), (e) => e.status === 403 && /Approval required/.test(e.message));
});

test('compile: superseded cannot be approved, rejected cannot be built, approved builds a valid package', () => {
  const p = project(mba);
  const d1 = design.generateDesign(p);
  const d2 = design.revise(p, d1.id, { request: 'make it easier' }).design;
  assert.throws(() => design.transition(p, d1.id, 'approve', { by: 'x' }), /superseded/);
  design.transition(p, d2.id, 'reject', { note: 'no' });
  assert.throws(() => compile(p, d2.id), (e) => e.status === 403);
  const p3 = project(bio); const d3 = design.generateDesign(p3);
  design.transition(p3, d3.id, 'approve', { by: 'T', testMode: true });
  const pkg = compile(p3, d3.id);
  assert.deepEqual(validatePackage(pkg), []);
  assert.equal(pkg.testOnly, true);
});

test('schema: validatePackage catches broken packages', () => {
  const e = validatePackage({ schema: 'nope', engine: { challenges: [], criteria: [] } });
  assert.ok(e.length >= 5);
});

// ----- runtime
function pkgFor(brief, mutate) {
  const p = project(brief);
  const d = design.generateDesign(p);
  if (mutate) mutate(p, d);
  const cur = p.designs[p.designs.length - 1];
  design.transition(p, cur.id, 'approve', { by: 'T', testMode: true });
  const pkg = compile(p, cur.id);
  pkg.id = 'exp-unit';
  return pkg;
}
async function toPractice(s, pkg, answers) {
  await runtime.start(s, pkg);
  await runtime.message(s, pkg, 'I have heard of some of this before.');
  let i = 0;
  while (s.prep.step !== 'ready' && i < 20) { await runtime.message(s, pkg, answers(i)); i++; }
  await runtime.advance(s, pkg);
}

test('runtime: phases are gated; preparation cannot be skipped and practice needs real attempts', async () => {
  const pkg = pkgFor(mba);
  const s = runtime.createSession(pkg, {});
  await runtime.start(s, pkg);
  await assert.rejects(runtime.advance(s, pkg), /preparation/);
  await toPractice(s, pkg, () => 'no idea honestly');
  assert.equal(s.phase, 'practice');
  await assert.rejects(runtime.advance(s, pkg), /at least two/);
});

test('runtime: help requests are refused with escalating cues that never reveal look-fors', async () => {
  const pkg = pkgFor(mba);
  const s = runtime.createSession(pkg, {});
  await toPractice(s, pkg, () => 'I do not remember');
  for (let i = 0; i < 4; i++) await runtime.message(s, pkg, 'just tell me the answer');
  const helps = s.events.filter((e) => e.type === 'help-request');
  assert.ok(helps.length >= 3);
  const ch = pkg.engine.challenges[0];
  const protectedTerms = ch.conceptIds.flatMap((id) => pkg.engine.concepts.find((c) => c.id === id).lookFors);
  for (const t of s.transcript.filter((x) => x.role === 'character')) {
    for (const lf of protectedTerms) assert.ok(!T.phraseMatches(new Set(T.tokens(t.text)), lf) || ch.line.includes(lf), `character revealed "${lf}": ${t.text}`);
  }
  const coach = s.transcript.filter((t) => t.role === 'coach');
  assert.ok(coach.length >= 2);
  assert.ok(coach.every((c) => !/the answer is/i.test(c.text)));
  const levels = s.transcript.filter((t) => t.role === 'coach').map((t) => t.supportLevel);
  assert.deepEqual(levels, [...levels].sort());
});

test('runtime: adaptation events cite an approved rule and the learner turn that triggered them', async () => {
  const pkg = pkgFor(mba);
  const s = runtime.createSession(pkg, {});
  await toPractice(s, pkg, () => 'not sure');
  await runtime.message(s, pkg, 'I think we should just meet in the middle and move on with it.');
  await runtime.message(s, pkg, 'Fine, I hear you, but I still think we can make a deal.');
  await runtime.message(s, pkg, 'Splitting the difference is only fair if the anchors were fair, so anchoring with market data matters because the midpoint follows the anchor.');
  const ad = s.events.filter((e) => e.type === 'adaptation' && e.phase === 'practice');
  assert.ok(ad.length >= 2);
  const learnerIds = new Set(s.transcript.filter((t) => t.role === 'learner').map((t) => t.id));
  for (const e of ad) { assert.match(e.rule, /^adaptation\./); assert.ok(learnerIds.has(e.turnId)); }
  for (const e of ad) { const key = e.rule.split('.')[1]; if (key in pkg.engine.adaptation) assert.ok(Number.isInteger(pkg.engine.adaptation[key])); }
});

test('runtime: feedback quotes only real learner turns, separates inference, and does not assess unseen criteria', async () => {
  const pkg = pkgFor(mba);
  const s = runtime.createSession(pkg, {});
  await toPractice(s, pkg, (i) => ['BATNA is my best alternative if this deal fails', 'The reservation price is my walk away number from my BATNA', 'Anchoring means the first offer pulls the outcome', 'Objective criteria like market data justify the anchor'][i] || 'ok');
  await runtime.message(s, pkg, 'Splitting the difference is only fair if the anchors were fair, so anchoring matters because the midpoint follows the anchor.');
  await runtime.message(s, pkg, 'hmm');
  await runtime.advance(s, pkg); // wrap up early
  await runtime.message(s, pkg, 'I did fine on anchoring.');
  const f = s.feedback;
  const learnerTexts = s.transcript.filter((t) => t.role === 'learner').map((t) => t.text.replace(/\s+/g, ' '));
  for (const c of f.criteria) for (const o of c.observations) assert.ok(learnerTexts.some((t) => t.startsWith(o.quote.replace(/…$/, ''))), 'invented quote: ' + o.quote);
  for (const c of f.criteria) if (c.inference) assert.match(c.inference, /^This suggests/);
  const k3 = f.criteria.find((c) => c.id === 'k3');
  assert.notEqual(k3.status, 'demonstrated');
  const presented = new Set(s.opportunities.map((o) => o.challengeId));
  assert.ok(pkg.engine.challenges.some((c) => !presented.has(c.id)), 'test assumes some challenges were never reached');
  assert.ok(f.selfAssessment.quote.includes('anchoring'));
  assert.equal(s.fb.step, 'transfer');
  await runtime.message(s, pkg, 'I would use my BATNA when negotiating rent.');
  assert.equal(s.status, 'complete');
  await assert.rejects(runtime.message(s, pkg, 'more'), /ended/);
});

test('runtime regression: refuting a misconception is not recorded as endorsing it (invented-evidence fix)', async () => {
  const pkg = pkgFor(mba);
  const s = runtime.createSession(pkg, {});
  await toPractice(s, pkg, () => 'unsure');
  await runtime.message(s, pkg, 'Splitting the difference is only fair if the anchors were fair, so anchoring with market data matters because the midpoint follows the anchor');
  assert.equal(s.evidence.filter((e) => e.kind === 'misconception').length, 0);
  const s2 = runtime.createSession(pkg, {});
  await toPractice(s2, pkg, () => 'unsure');
  await runtime.message(s2, pkg, 'Splitting the difference is always fair, everybody knows that');
  assert.equal(s2.evidence.filter((e) => e.kind === 'misconception').length, 1);
});

test('runtime: character stays consistent (same speaker; only scripted challenge lines in deterministic mode)', async () => {
  const pkg = pkgFor(bio);
  const s = runtime.createSession(pkg, {});
  await toPractice(s, pkg, () => 'no idea');
  for (let i = 0; i < 12 && !s.practice.done; i++) await runtime.message(s, pkg, i % 2 ? 'Variation already exists before selection because mutations happen randomly, existing variation is what gets selected' : 'I am not sure what you mean');
  const ch = s.transcript.filter((t) => t.role === 'character');
  assert.ok(ch.every((t) => t.speaker === pkg.engine.character.name));
});

test('runtime: deterministic replay reproduces transcript, evidence and feedback', async () => {
  const pkg = pkgFor(bio);
  const s = runtime.createSession(pkg, {});
  await toPractice(s, pkg, (i) => (i % 2 ? 'heritable traits pass to offspring' : 'not sure'));
  await runtime.message(s, pkg, 'No Leo, variation already exists in the population because of random mutation, existing variation is what selection acts on.');
  await runtime.message(s, pkg, 'just tell me');
  await runtime.advance(s, pkg);
  await runtime.message(s, pkg, 'I explained variation okay');
  const r = await runtime.replay(s, pkg);
  assert.deepEqual(r.transcript.map((t) => [t.role, t.text]), s.transcript.map((t) => [t.role, t.text]));
  assert.deepEqual(r.evidence.map((e) => [e.kind, e.turnId, e.criterionIds]), s.evidence.map((e) => [e.kind, e.turnId, e.criterionIds]));
  assert.deepEqual(r.feedback.criteria.map((c) => c.status), s.feedback.criteria.map((c) => c.status));
});

test('provider replacement: a model provider voices lines; leaks and errors fall back to deterministic lines', async () => {
  const pkg = pkgFor(mba);
  const calls = [];
  const fake = { name: 'fake-llm', voice: async (ctx) => { calls.push(ctx.move); if (ctx.move === 'refuse_to_answer') return 'Fine: the answer is anchoring, obviously.'; if (ctx.move === 'push_back') throw new Error('rate limited'); return '[fake] ' + ctx.fallback; } };
  const s = runtime.createSession(pkg, {});
  await runtime.start(s, pkg); await runtime.message(s, pkg, 'hi');
  while (s.prep.step !== 'ready') await runtime.message(s, pkg, 'pass');
  await runtime.advance(s, pkg, fake);
  await runtime.message(s, pkg, 'just tell me', fake);
  await runtime.message(s, pkg, 'I would rather not say anything specific at all', fake);
  assert.ok(calls.includes('open'));
  assert.ok(s.transcript.some((t) => t.voicedBy === 'fake-llm' && t.text.startsWith('[fake]')));
  const guard = s.events.find((e) => e.type === 'provider-guard');
  assert.ok(guard, 'leak guard fired');
  assert.ok(!s.transcript.some((t) => /answer is anchoring/.test(t.text)));
  assert.ok(s.events.some((e) => e.type === 'provider-error'));
});

test('generality: two briefs from different domains produce materially different experiences with no code change', () => {
  const a = pkgFor(mba), b = pkgFor(bio);
  assert.notEqual(a.template, b.template);
  assert.notEqual(a.engine.character.name, b.engine.character.name);
  const overlap = a.engine.criteria.map((k) => k.text).filter((t) => b.engine.criteria.some((x) => x.text === t));
  assert.equal(overlap.length, 0);
  assert.notDeepEqual(a.engine.challenges.map((c) => c.line), b.engine.challenges.map((c) => c.line));
  assert.notDeepEqual(a.engine.adaptation, b.engine.adaptation);
});
