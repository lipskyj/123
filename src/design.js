// Learning & simulation design.
// A design = educator-level DECISIONS (editable, with provenance) + DERIVED content
// rebuilt from decisions by a pure function. Revisions edit decisions and rebuild, so
// teacher changes always propagate to prompts, criteria, challenges and runtime rules.
const T = require('./text');
const { newId, now } = require('./store');

const NAMES = ['Dana', 'Riley', 'Sam', 'Jordan', 'Avery', 'Morgan', 'Casey', 'Quinn', 'Rowan', 'Jesse'];
const DIFFICULTY = {
  supportive: { supportAfterMisses: 1, maxMissesPerChallenge: 4, stretchAfterSuccesses: 3, minWordsForCredit: 6 },
  standard: { supportAfterMisses: 2, maxMissesPerChallenge: 4, stretchAfterSuccesses: 2, minWordsForCredit: 8 },
  challenging: { supportAfterMisses: 3, maxMissesPerChallenge: 5, stretchAfterSuccesses: 1, minWordsForCredit: 12 },
};
const STATUSES = ['draft', 'revised', 'test-approved', 'educator-approved', 'rejected', 'superseded'];

function ans(project, id) { const a = project.intake.answers[id]; return a && !a.skipped ? a.text : ''; }
function src(project, id) { const a = project.intake.answers[id]; return a ? { source: 'educator', ref: 'intake:' + id, turnId: a.turnId } : null; }

function defaultLookFors(label) {
  // "reproductive success (fitness)" -> two alternative look-fors.
  const paren = String(label).match(/^(.*?)\s*\(([^)]+)\)\s*$/);
  if (paren) return { lookFors: [paren[1], paren[2]].map((x) => T.contentWords(x).join(' ')).filter(Boolean), minMatches: 1 };
  const cw = T.contentWords(label);
  if (cw.length <= 2) return { lookFors: [cw.join(' ') || label], minMatches: 1 };
  const salient = cw.filter((w) => w.length >= 5).slice(0, 4);
  const lf = salient.length >= 2 ? salient : cw.slice(0, 4);
  return { lookFors: lf, minMatches: 2 };
}

function parseMisconception(item) {
  const m = item.split(/\s+[—–]\s+|\s+-\s+|\s*->\s*|\s*=>\s*|\s+but actually\s+|\s+\(correct(?:ion)?:\s*|\s+correct(?:ion)?:\s*/i);
  return { text: m[0].trim(), correction: m[1] ? m[1].replace(/\)$/, '').trim() : '' };
}

function bestConcept(concepts, text) {
  let best = null, score = 0;
  for (const c of concepts) {
    const s = T.overlapRatio(text, c.label) + 0.5 * c.lookFors.reduce((a, lf) => a + T.overlapRatio(text, lf), 0) / Math.max(1, c.lookFors.length);
    if (s > score) { score = s; best = c; }
  }
  return score > 0 ? best : null;
}

// Interpret the intake into initial decisions, recording provenance and assumptions.
function interpret(project) {
  const prov = {};
  const assumptions = [];
  const assume = (field, text) => assumptions.push({ id: 'a' + (assumptions.length + 1), field, text, source: 'ai-inferred' });
  const materials = project.materials.map((m) => m.text).join('\n');

  const topic = ans(project, 'topic') || 'Untitled topic';
  prov.topic = src(project, 'topic');
  const template = ans(project, 'template') || 'roleplay';
  prov.template = { ...src(project, 'template'), note: project.intake.answers.template && project.intake.answers.template.overridden ? 'Educator overrode AI recommendation' : 'Educator accepted AI recommendation' };

  let conceptLabels = T.splitList(ans(project, 'concepts'));
  prov.concepts = src(project, 'concepts');
  if (!conceptLabels.length) {
    conceptLabels = materials ? T.keyPhrases(materials, 4) : T.contentWords(ans(project, 'objective')).slice(0, 3);
    prov.concepts = { source: 'ai', ref: materials ? 'materials:key-phrases' : 'intake:objective', note: 'Inferred because no key ideas were given' };
    assume('concepts', 'Key ideas were inferred (' + conceptLabels.join(', ') + '). Please confirm or edit.');
  }
  const concepts = conceptLabels.slice(0, 8).map((label, i) => ({ id: 'c' + (i + 1), label, ...defaultLookFors(label) }));

  const misconceptions = T.splitList(ans(project, 'misconceptions')).slice(0, 6).map((item, i) => {
    const p = parseMisconception(item);
    const c = bestConcept(concepts, p.correction + ' ' + p.text);
    const conceptId = c ? c.id : concepts[i % concepts.length].id;
    if (!c) assume('misconceptions.m' + (i + 1), `Misconception "${T.truncate(p.text, 60)}" was linked to the idea "${concepts.find((x) => x.id === conceptId).label}" by position because the wording does not overlap. Please check.`);
    return { id: 'm' + (i + 1), text: p.text, correction: p.correction, conceptId };
  });
  prov.misconceptions = src(project, 'misconceptions');

  let criteriaItems = T.splitList(ans(project, 'evidence'));
  prov.criteria = src(project, 'evidence');
  if (!criteriaItems.length) {
    criteriaItems = concepts.map((c) => `Uses ${c.label} correctly in the practice`);
    prov.criteria = { source: 'ai', ref: 'concepts', note: 'One criterion per key idea, because no evidence of progress was given' };
    assume('criteria', 'Feedback criteria were inferred, one for each key idea. Please replace them with your own look-fors.');
  }
  const criteria = criteriaItems.slice(0, 8).map((text, i) => {
    const linked = concepts.filter((c) => T.overlapRatio(text, c.label) >= 0.5 || c.lookFors.some((lf) => T.overlapRatio(text, lf) >= 0.99));
    let lookFors, minMatches;
    if (linked.length) {
      lookFors = T.uniq(linked.flatMap((c) => c.lookFors));
      minMatches = Math.min(...linked.map((c) => c.minMatches));
    } else {
      const d = defaultLookFors(text);
      lookFors = d.lookFors; minMatches = d.minMatches;
      assume('criteria.k' + (i + 1), `The criterion "${T.truncate(text, 60)}" doesn't name a key idea, so its look-fors (${lookFors.join(', ')}) come from its own wording. Please check them.`);
    }
    return { id: 'k' + (i + 1), text, lookFors, minMatches, conceptIds: linked.map((c) => c.id) };
  });

  const cp = ans(project, 'counterpart');
  prov.character = src(project, 'counterpart');
  const nameMatch = cp.match(/\b(?:named|called|name is)\s+([A-Z][a-z]+)/) || cp.match(/^([A-Z][a-z]+)(?:,|\s+(?:is|who|-|—))/);
  const BAD_NAMES = new Set(['The', 'A', 'An', 'Someone', 'Student', 'Students', 'Learner', 'Their', 'They', 'Our', 'My']);
  let name = nameMatch && !BAD_NAMES.has(nameMatch[1]) ? nameMatch[1] : null;
  if (!name) { name = NAMES[T.hash(project.id + topic) % NAMES.length]; assume('character.name', `The character was given the placeholder name "${name}".`); }
  const description = (cp ? cp.replace(new RegExp('^' + name + '\\s*(,|is|-|—)\\s*'), '').replace(/^\w/, (c) => c.toLowerCase()) : '') || (template === 'teachback' ? 'a curious newcomer who needs to understand this to do their job' : 'a skeptical counterpart with their own interests');
  if (!cp) assume('character.description', 'The character description was inferred.');
  const goalMatch = cp.match(/\b(?:wants?|needs?|hopes?|is trying)\s+(?:to\s+)?([^.;]+)/i);
  const goal = goalMatch ? goalMatch[1].split(/,|\s+and\s+(?:is|will|has)\b/)[0].trim() : template === 'teachback' ? `understand ${topic} well enough to use it` : 'protect their own interests and only be moved by well-reasoned arguments';
  if (!goalMatch) assume('character.goal', `The character's goal was inferred: "${goal}".`);

  const work = ans(project, 'work');
  prov.learnerRole = src(project, 'work');
  const learnerRole = work || (template === 'teachback' ? `Explain ${topic} to ${name} until they truly understand it.` : `Work with ${name} and apply ${topic} to reach a good outcome.`);

  const learners = ans(project, 'learners');
  const lt = T.norm(learners);
  let difficulty = 'standard';
  if (/\b(intro|introductory|beginner|novice|first year|high school|freshm|ninth|tenth|9th|10th|middle school|new to)\b/.test(lt)) difficulty = 'supportive';
  if (/\b(advanced|executive|senior|experienced|graduate|phd|expert|practitioner)\b/.test(lt)) difficulty = 'challenging';
  if (difficulty === 'supportive' && /\b(mba|graduate|master'?s|executive|professional)\b/.test(lt)) difficulty = 'standard';
  prov.difficulty = { source: 'ai', ref: 'intake:learners', note: `AI recommendation (${difficulty}) based on your description of learners` };

  const cons = ans(project, 'constraints');
  const mins = cons.match(/(\d+)\s*(?:min|minute)/i);
  const practiceTurns = mins ? Math.max(6, Math.min(24, Math.round(Number(mins[1]) * 0.6))) : 14;
  prov.practiceTurns = mins ? { source: 'educator', ref: 'intake:constraints', note: 'Derived from the time limit you stated' } : { source: 'ai', ref: 'default', note: 'Default length' };

  const decisions = {
    title: `${T.truncate(topic, 70)} — ${template === 'teachback' ? 'Teachback' : 'Roleplay'}`,
    topic, learners, objective: ans(project, 'objective') || `Apply ${concepts.map((c) => c.label).join(', ')}`,
    prior: ans(project, 'prior'), template, constraints: cons,
    concepts, misconceptions, criteria,
    character: { name, description, goal },
    learnerRole,
    stakes: template === 'teachback' ? `${name} is relying on your explanation and will use it right away.` : `${name} will only move if your reasoning holds up.`,
    difficulty, adaptation: { ...DIFFICULTY[difficulty] }, practiceTurns,
  };
  prov.objective = src(project, 'objective');
  prov.learners = src(project, 'learners');
  prov.prior = src(project, 'prior');
  prov.constraints = src(project, 'constraints');
  prov.stakes = { source: 'ai', ref: 'template', note: 'Stakes are generated from the template and character' };
  prov.adaptation = prov.difficulty;
  if (!decisions.objective || !ans(project, 'objective')) assume('objective', 'The objective was inferred from the key ideas.');
  return { decisions, provenance: prov, assumptions };
}

// Pure derivation: decisions + materials -> learner-facing and engine content.
function build(decisions, materials) {
  const d = decisions;
  const name = d.character.name;
  const tb = d.template === 'teachback';
  const matSentences = materials.flatMap((m) => T.sentences(m.text).map((s) => ({ materialId: m.id, materialName: m.name, text: s })));
  const misByConcept = (cid) => d.misconceptions.filter((m) => m.conceptId === cid);

  const briefing = d.concepts.map((c) => {
    const scored = matSentences.map((s) => ({ ...s, score: c.lookFors.reduce((a, lf) => a + T.overlapRatio(s.text, lf), 0) + T.overlapRatio(s.text, c.label) }))
      .filter((s) => s.score >= 0.99 && T.wordCount(s.text) >= 5 && T.wordCount(s.text) <= 60).sort((a, b) => b.score - a.score).slice(0, 2);
    const corrections = misByConcept(c.id).filter((m) => m.correction).map((m) => m.correction);
    return {
      conceptId: c.id, label: c.label,
      excerpts: scored.map((s) => ({ materialId: s.materialId, materialName: s.materialName, text: s.text })),
      notes: corrections,
      source: scored.length ? 'materials' : corrections.length ? 'educator' : 'educator-label',
    };
  });

  const retrieval = d.concepts.slice(0, 4).map((c, i) => ({
    id: 'r' + (i + 1), conceptId: c.id,
    prompt: `In your own words, what is "${c.label}", and why does it matter for this task?`,
  }));

  const challenges = [];
  for (const m of d.misconceptions) {
    const c = d.concepts.find((x) => x.id === m.conceptId) || d.concepts[0];
    challenges.push({
      id: 'ch' + (challenges.length + 1), kind: 'misconception', misconceptionId: m.id, conceptIds: [c.id],
      line: tb ? `Wait, let me check I've got this. So ${lowerFirst(m.text)}? That's what I always assumed.` : `Look, the way I see it, ${lowerFirst(m.text)}. Why should I see it any differently?`,
      target: `Correct the misconception using "${c.label}"`,
    });
  }
  for (const c of d.concepts) {
    if (challenges.some((ch) => ch.conceptIds.includes(c.id))) continue;
    challenges.push({
      id: 'ch' + (challenges.length + 1), kind: 'concept', conceptIds: [c.id],
      line: tb ? `Okay, next thing I don't get: "${c.label}". Can you explain it so I could actually use it?` : `And what about ${c.label}? Why should that change anything for me?`,
      target: `Apply "${c.label}"`,
    });
  }
  const practiceChallenges = challenges.slice(0, 6);

  const focus = d.concepts.map((c) => c.label).join(', ');
  const learner = {
    title: d.title,
    purpose: `By the end of this experience you should be able to: ${d.objective}`,
    role: tb ? `You are the teacher. ${d.learnerRole}` : `Your role: ${d.learnerRole}`,
    character: { name, description: d.character.description },
    stakes: d.stakes,
    phases: ['Preparation', 'Practice', 'Feedback & reflection'],
    activation: `Before we start: what do you already know about ${d.topic}? Any experience with ${focus}? (This isn't graded.)`,
    opening: tb ? `Hi, I'm ${name}. I really need to understand this, and I'm counting on you. Can you help me?` : `I'm ${name}. I have a few minutes, so let's talk.`,
    selfAssessmentPrompt: 'Before I share what I observed: how do you think it went? What felt strongest, and where did you struggle?',
    transferPrompt: `Where else, outside this scenario, could you use ${d.concepts[0] ? '"' + d.concepts[0].label + '"' : 'what you practiced'}? Describe one specific situation.`,
  };

  const prompts = renderPrompts(d, practiceChallenges, briefing);
  return { learner, briefing, retrieval, challenges: practiceChallenges, prompts };
}

function lowerFirst(s) { s = String(s).trim().replace(/[.?!]+$/, ''); return /^[A-Z][a-z]/.test(s) && !/^I\b/.test(s) ? s[0].toLowerCase() + s.slice(1) : s; }

function renderPrompts(d, challenges, briefing) {
  const tb = d.template === 'teachback';
  const rules = `RULES: Stay within the educator-approved objective: "${d.objective}". Never state the correct answer or the key idea for the learner. The learner must do the thinking. Do not invent facts about what the learner said. Keep replies under 70 words.`;
  return {
    mentor: `You are the preparation guide for "${d.title}". Learners: ${d.learners || 'unspecified'}. Prior knowledge to activate: ${d.prior || 'not specified'}.\nBrief the learner on these key ideas using the educator's materials: ${briefing.map((b) => b.label).join('; ')}.\nAsk retrieval questions and let the learner answer before confirming anything.\n${rules}`,
    practice: `You are ${d.character.name}: ${d.character.description}. Your goal: ${d.character.goal}.\n${tb ? 'You are a learner who does not yet understand and needs the user to teach you.' : 'You are the learner\'s counterpart in a realistic roleplay.'}\nThe learner's role: ${d.learnerRole}. Stakes: ${d.stakes}\nYou raise these challenges in order (the engine tells you which one is active):\n${challenges.map((c) => `- ${c.id}: ${c.line} [the learner succeeds by: ${c.target}]`).join('\n')}\nYou will receive a MOVE from the engine (open, push_back, concede_and_advance, stretch, refuse_to_answer, close) and must voice exactly that move in character.\nConstraints from the educator: ${d.constraints || 'none'}.\n${rules}`,
    feedback: `You write feedback for the learner on "${d.objective}". Use ONLY the evidence records provided. Every claim must cite a quoted learner turn. Label observations ("You said...") separately from inferences ("This suggests..."). Never assess a criterion the learner had no opportunity to show. Criteria:\n${d.criteria.map((k) => `- ${k.id}: ${k.text} (look-fors: ${k.lookFors.join(', ')})`).join('\n')}\nStart from the learner's self-assessment, then give strengths, growth areas, and concrete next actions, and finish with a transfer question.`,
  };
}

function validateDesign(design) {
  const errs = [];
  const d = design.decisions;
  if (!d) return ['missing decisions'];
  if (!d.objective) errs.push('objective is required');
  if (!['roleplay', 'teachback'].includes(d.template)) errs.push('template must be roleplay or teachback');
  if (!Array.isArray(d.concepts) || !d.concepts.length) errs.push('at least one key idea is required');
  if (!Array.isArray(d.criteria) || !d.criteria.length) errs.push('at least one criterion is required');
  for (const c of d.concepts || []) if (!c.label || !Array.isArray(c.lookFors) || !c.lookFors.length) errs.push(`key idea ${c.id} needs a label and look-fors`);
  for (const k of d.criteria || []) if (!k.text || !Array.isArray(k.lookFors) || !k.lookFors.length) errs.push(`criterion ${k.id} needs text and look-fors`);
  for (const m of d.misconceptions || []) if (!(d.concepts || []).some((c) => c.id === m.conceptId)) errs.push(`misconception ${m.id} links to an unknown idea`);
  if (!d.character || !d.character.name) errs.push('character name is required');
  const a = d.adaptation || {};
  for (const k of ['supportAfterMisses', 'maxMissesPerChallenge', 'stretchAfterSuccesses', 'minWordsForCredit']) if (!Number.isInteger(a[k]) || a[k] < 1 || a[k] > 30) errs.push(`adaptation.${k} must be an integer between 1 and 30`);
  if (!STATUSES.includes(design.status)) errs.push('bad status');
  return errs;
}

function generateDesign(project, by = 'primer') {
  const { decisions, provenance, assumptions } = interpret(project);
  const design = {
    id: newId('dsg'), version: 1, status: 'draft', createdAt: now(), createdBy: by,
    decisions, provenance, assumptions, derived: build(decisions, project.materials),
    parentId: null, revisionNote: 'Initial design generated from intake', changes: [], approval: null, rejection: null,
  };
  for (const old of project.designs) if (['draft', 'revised'].includes(old.status)) old.status = 'superseded';
  project.designs.push(design);
  return design;
}

// ---- Revision -------------------------------------------------------------
const EDITABLE = ['title', 'objective', 'learners', 'prior', 'template', 'constraints', 'learnerRole', 'stakes', 'difficulty', 'practiceTurns', 'character', 'concepts', 'misconceptions', 'criteria', 'adaptation'];

function diff(a, b, base = '') {
  const out = [];
  const keys = new Set([...Object.keys(a || {}), ...Object.keys(b || {})]);
  for (const k of keys) {
    const p = base ? base + '.' + k : k;
    const x = a ? a[k] : undefined, y = b ? b[k] : undefined;
    if (JSON.stringify(x) === JSON.stringify(y)) continue;
    if (x && y && typeof x === 'object' && typeof y === 'object' && !Array.isArray(x)) out.push(...diff(x, y, p));
    else out.push({ path: p, from: x, to: y });
  }
  return out;
}

function normalizeDecisions(d) {
  d.concepts = (d.concepts || []).filter((c) => c && String(c.label || '').trim()).map((c, i) => {
    const lf = Array.isArray(c.lookFors) ? c.lookFors.map(String).map((s) => s.trim()).filter(Boolean) : [];
    const def = defaultLookFors(c.label);
    return { id: c.id || 'c' + (i + 1), label: String(c.label).trim(), lookFors: lf.length ? lf : def.lookFors, minMatches: Math.max(1, Math.min(Number(c.minMatches) || (lf.length ? 1 : def.minMatches), (lf.length || def.lookFors.length))) };
  });
  const ids = new Set();
  d.concepts.forEach((c, i) => { if (ids.has(c.id)) c.id = 'c' + (i + 1) + 'x'; ids.add(c.id); });
  d.misconceptions = (d.misconceptions || []).filter((m) => m && String(m.text || '').trim()).map((m, i) => ({ id: m.id || 'm' + (i + 1), text: String(m.text).trim(), correction: String(m.correction || '').trim(), conceptId: d.concepts.some((c) => c.id === m.conceptId) ? m.conceptId : (bestConcept(d.concepts, m.text + ' ' + (m.correction || '')) || d.concepts[0] || {}).id }));
  d.criteria = (d.criteria || []).filter((k) => k && String(k.text || '').trim()).map((k, i) => {
    const lf = Array.isArray(k.lookFors) ? k.lookFors.map(String).map((s) => s.trim()).filter(Boolean) : [];
    const linked = d.concepts.filter((c) => T.overlapRatio(k.text, c.label) >= 0.5);
    const fallback = linked.length ? T.uniq(linked.flatMap((c) => c.lookFors)) : defaultLookFors(k.text).lookFors;
    const fbMin = linked.length ? Math.min(...linked.map((c) => c.minMatches)) : defaultLookFors(k.text).minMatches;
    return { id: k.id || 'k' + (i + 1), text: String(k.text).trim(), lookFors: lf.length ? lf : fallback, minMatches: Math.max(1, Math.min(Number(k.minMatches) || (lf.length ? 1 : fbMin), (lf.length ? lf : fallback).length)), conceptIds: Array.isArray(k.conceptIds) && k.conceptIds.length ? k.conceptIds.filter((id) => d.concepts.some((c) => c.id === id)) : linked.map((c) => c.id) };
  });
  if (d.difficulty && DIFFICULTY[d.difficulty] && d._difficultyChanged) d.adaptation = { ...DIFFICULTY[d.difficulty] };
  delete d._difficultyChanged;
  d.practiceTurns = Math.max(4, Math.min(30, Number(d.practiceTurns) || 14));
  for (const k of Object.keys(d.adaptation || {})) d.adaptation[k] = Math.round(Number(d.adaptation[k]));
  if (d.template === 'teachback' || d.template === 'roleplay') d.title = d.title.replace(/ — (Roleplay|Teachback)$/, ` — ${d.template === 'teachback' ? 'Teachback' : 'Roleplay'}`);
  return d;
}

// Deterministic natural-language revision parser. Returns decision edits it understood.
function parseRevisionRequest(text, decisions) {
  const d = JSON.parse(JSON.stringify(decisions));
  const applied = [];
  const unrecognized = [];
  const clauses = String(text).split(/(?<=[.!?])\s+|\n|;\s*|\s+and also\s+/).map((s) => s.trim()).filter(Boolean);
  for (const cl of clauses) {
    let m, hit = false;
    const L = cl.toLowerCase();
    if (/\b(harder|more challenging|tougher|more difficult|less support|push (them|students) more)\b/.test(L)) { d.difficulty = 'challenging'; d._difficultyChanged = true; applied.push('Difficulty set to challenging'); hit = true; }
    else if (/\b(easier|more support|more supportive|gentler|less difficult|more scaffold)/.test(L)) { d.difficulty = 'supportive'; d._difficultyChanged = true; applied.push('Difficulty set to supportive'); hit = true; }
    if ((m = cl.match(/\b(?:switch|change|make)(?: it)?(?: in)?to (?:a )?(teachback|roleplay|role-play)\b/i) || cl.match(/\bmake it a (teachback|roleplay|role-play)\b/i))) { d.template = m[1].toLowerCase().replace('-', ''); applied.push('Format changed to ' + d.template); hit = true; }
    if ((m = cl.match(/\b(?:[Rr]ename|[Cc]all)\b(?: the)?(?: character| counterpart| them| him| her)?(?: to| as)?\s+([A-Z][a-z]+)/))) { d.character.name = m[1]; applied.push('Character renamed to ' + m[1]); hit = true; }
    if ((m = cl.match(/\b(?:the )?(?:character|counterpart)(?: should be| is| should act as)\s+(.+)/i))) { d.character.description = m[1].replace(/[.]$/, ''); applied.push('Character description updated'); hit = true; }
    if ((m = cl.match(/\b(?:the )?character(?:'s)? goal (?:should be|is)\s+(?:to\s+)?(.+)/i))) { d.character.goal = m[1].replace(/[.]$/, ''); applied.push('Character goal updated'); hit = true; }
    if ((m = cl.match(/\badd (?:a |another )?(?:key )?(?:concept|idea|skill)s?[:\s]+["“]?(.+?)["”]?$/i))) { for (const lab of T.splitList(m[1])) d.concepts.push({ label: lab }); applied.push('Added key idea(s): ' + m[1]); hit = true; }
    if ((m = cl.match(/\b(?:remove|drop|delete) (?:the )?(?:key )?(?:concept|idea|skill)[:\s]+["“]?(.+?)["”]?$/i))) { const before = d.concepts.length; d.concepts = d.concepts.filter((c) => T.overlapRatio(c.label, m[1]) < 0.6); if (d.concepts.length < before) { applied.push('Removed key idea: ' + m[1]); hit = true; } }
    if ((m = cl.match(/\badd (?:a |another )?(?:criterion|criteria|look-?for|evidence(?: criterion)?)[:\s]+["“]?(.+?)["”]?$/i))) { d.criteria.push({ text: m[1] }); applied.push('Added criterion: ' + m[1]); hit = true; }
    if ((m = cl.match(/\b(?:remove|drop|delete) (?:the )?(?:criterion|look-?for)[:\s]+["“]?(.+?)["”]?$/i))) { const before = d.criteria.length; d.criteria = d.criteria.filter((k) => T.overlapRatio(k.text, m[1]) < 0.6); if (d.criteria.length < before) { applied.push('Removed criterion: ' + m[1]); hit = true; } }
    if ((m = cl.match(/\badd (?:a |another )?misconception[:\s]+["“]?(.+?)["”]?$/i))) { const p = parseMisconception(m[1]); d.misconceptions.push({ text: p.text, correction: p.correction }); applied.push('Added misconception: ' + p.text); hit = true; }
    if ((m = cl.match(/\b(?:the )?(?:objective|goal) (?:should be|is|to be)[:\s]+(.+)/i)) && !/character/i.test(cl)) { d.objective = m[1].replace(/[.]$/, ''); applied.push('Objective updated'); hit = true; }
    if ((m = cl.match(/\b(?:the )?(?:stakes?) (?:should be|are|is)[:\s]+(.+)/i))) { d.stakes = m[1]; applied.push('Stakes updated'); hit = true; }
    if (/\b(shorter|fewer turns|less time)\b/.test(L)) { d.practiceTurns = Math.max(4, (d.practiceTurns || 14) - 4); applied.push('Practice shortened to ' + d.practiceTurns + ' turns'); hit = true; }
    if (/\b(longer|more turns|more time)\b/.test(L)) { d.practiceTurns = Math.min(30, (d.practiceTurns || 14) + 4); applied.push('Practice lengthened to ' + d.practiceTurns + ' turns'); hit = true; }
    if ((m = cl.match(/\b(?:avoid|don't mention|do not mention|never mention)\s+(.+)/i))) { d.constraints = [d.constraints, 'Avoid: ' + m[1]].filter(Boolean).join('\n'); applied.push('Constraint added: avoid ' + m[1]); hit = true; }
    if (!hit) unrecognized.push(cl);
  }
  return { decisions: d, applied, unrecognized };
}

function revise(project, designId, { edits, request, by = 'educator', provider } = {}) {
  const base = project.designs.find((x) => x.id === designId);
  if (!base) throw Object.assign(new Error('Design not found'), { status: 404 });
  if (['superseded', 'rejected'].includes(base.status)) throw Object.assign(new Error(`Cannot revise a ${base.status} design. Revise the current version.`), { status: 409 });
  let next = JSON.parse(JSON.stringify(base.decisions));
  const notes = [];
  let unrecognized = [];
  if (edits && typeof edits === 'object') {
    for (const [k, v] of Object.entries(edits)) {
      if (!EDITABLE.includes(k)) throw Object.assign(new Error('Field not editable: ' + k), { status: 400 });
      if (k === 'difficulty') next._difficultyChanged = true;
      next[k] = k === 'character' || k === 'adaptation' ? { ...next[k], ...v } : v;
    }
    notes.push('Direct edits: ' + Object.keys(edits).join(', '));
  }
  if (request && String(request).trim()) {
    const r = (provider && provider.parseRevision ? provider.parseRevision(request, next) : null) || parseRevisionRequest(request, next);
    next = r.decisions; notes.push(...r.applied); unrecognized = r.unrecognized;
  }
  next = normalizeDecisions(next);
  const pre = validateDesign({ decisions: next, status: 'revised' });
  if (pre.length) throw Object.assign(new Error('Revision would make the design invalid: ' + pre.join('; ')), { status: 400 });
  const changes = diff(base.decisions, next);
  if (!changes.length) return { design: null, applied: notes, unrecognized, message: 'No changes were made.' + (unrecognized.length ? ' I could not interpret: "' + unrecognized.join('" / "') + '". Edit the fields directly, or try phrasing like "make it harder", "add criterion: ...", "rename the character to ...".' : '') };
  const prov = { ...base.provenance };
  for (const c of changes) prov[c.path.split('.')[0]] = { source: 'educator', ref: 'revision', note: 'Changed by educator revision v' + (base.version + 1) };
  const design = {
    id: newId('dsg'), version: Math.max(...project.designs.map((x) => x.version)) + 1, status: 'revised', createdAt: now(), createdBy: by,
    decisions: next, provenance: prov, assumptions: base.assumptions.filter((a) => !changes.some((c) => a.field.split('.')[0] === c.path.split('.')[0])),
    derived: build(next, project.materials), parentId: base.id, revisionNote: (request ? 'Requested: "' + String(request).trim() + '". ' : '') + notes.join('; '), changes, approval: null, rejection: null,
  };
  const errs = validateDesign(design);
  if (errs.length) throw Object.assign(new Error('Revision would make the design invalid: ' + errs.join('; ')), { status: 400 });
  for (const old of project.designs) if (old.status !== 'rejected' && old.status !== 'superseded') old.status = 'superseded';
  project.designs.push(design);
  return { design, applied: notes, unrecognized, message: 'Created version ' + design.version + '.' };
}

// ---- Approval gate ---------------------------------------------------------
function transition(project, designId, action, { by, note, testMode } = {}) {
  const dsg = project.designs.find((x) => x.id === designId);
  if (!dsg) throw Object.assign(new Error('Design not found'), { status: 404 });
  const open = ['draft', 'revised'];
  const err = (m) => Object.assign(new Error(m), { status: 409 });
  if (action === 'approve') {
    if (!open.includes(dsg.status)) throw err(`A ${dsg.status} design cannot be approved.`);
    if (!by || !String(by).trim()) throw Object.assign(new Error('Approval requires the approver\'s name.'), { status: 400 });
    const errs = validateDesign(dsg);
    if (errs.length) throw Object.assign(new Error('Design is invalid: ' + errs.join('; ')), { status: 400 });
    // In test mode every approval is recorded as a synthetic TEST approval, never a classroom approval.
    dsg.status = testMode ? 'test-approved' : 'educator-approved';
    dsg.approval = { by: String(by).trim(), at: now(), kind: testMode ? 'test' : 'educator', note: note || '', label: testMode ? 'TEST APPROVAL (synthetic, not a real educator approval)' : 'Educator approval' };
  } else if (action === 'reject') {
    if (!open.includes(dsg.status) && !dsg.status.endsWith('approved')) throw err(`A ${dsg.status} design cannot be rejected.`);
    dsg.status = 'rejected';
    dsg.rejection = { by: by || 'educator', at: now(), note: note || '' };
  } else if (action === 'return') {
    if (!open.includes(dsg.status)) throw err(`A ${dsg.status} design cannot be returned.`);
    if (!note || !String(note).trim()) throw Object.assign(new Error('Say what needs more work.'), { status: 400 });
    dsg.returns = [...(dsg.returns || []), { by: by || 'educator', at: now(), note: String(note).trim() }];
    return dsg;
  } else throw Object.assign(new Error('Unknown action'), { status: 400 });
  return dsg;
}

module.exports = { generateDesign, revise, transition, build, interpret, validateDesign, parseRevisionRequest, normalizeDecisions, STATUSES, DIFFICULTY, EDITABLE };
