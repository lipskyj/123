// Educator intake interview: one consequential question at a time.
// Answers are stored verbatim (educator authority) and every later design field cites them.
const T = require('./text');
const { newId, now } = require('./store');

const QUESTIONS = [
  { id: 'topic', required: true, prompt: 'What course and topic is this experience for?', why: 'Names the experience and anchors everything else in your course.', example: 'e.g. "MBA Negotiations — making and responding to the first offer"' },
  { id: 'learners', required: true, prompt: 'Who are your learners? Tell me their level and background.', why: 'Sets the difficulty, tone and how much support the experience gives.', example: 'e.g. "First-year MBA students, most with 3–5 years of work experience"' },
  { id: 'objective', required: true, prompt: 'What is the one main thing learners should be able to do by the end?', why: 'Every phase, adaptation and piece of feedback stays tied to this objective.', example: 'e.g. "Anchor a negotiation with a justified first offer"' },
  { id: 'materials', required: false, prompt: 'Do you have materials to ground this, such as readings, notes or a case? Paste or upload them in the Materials panel, then reply "done". You can also reply "none".', why: 'Your materials are quoted in the learner\'s preparation and used to suggest key ideas.', example: '' },
  { id: 'concepts', required: true, prompt: 'Which key ideas or skills must learners actually use? List them, one per line.', why: 'These become the ideas the practice requires and the "look-fors" in the evidence.', example: 'e.g. "BATNA; reservation price; anchoring"', suggest: 'concepts' },
  { id: 'prior', required: false, prompt: 'What do learners already know coming in, and what should the preparation refresh?', why: 'The preparation phase activates this prior knowledge before practice.', example: '' },
  { id: 'misconceptions', required: true, prompt: 'What mistakes or misconceptions do you usually see? List them. You can add the correct idea after a dash, like "misconception — correct idea".', why: 'Misconceptions become the challenges in practice, which creates productive friction.', example: 'e.g. "Splitting the difference is always fair — the split depends on where the anchors were set"' },
  { id: 'work', required: true, prompt: 'What should learners actually do during practice? For example: persuade a skeptical client, explain an idea to a confused peer, or diagnose a problem.', why: 'This determines the kind of cognitive work the learner must perform, which Primer will not do for them.', example: '' },
  { id: 'template', required: true, kind: 'choice', prompt: 'Which format fits best? I will recommend one based on your last answer.', why: 'Roleplay means the learner faces a counterpart. Teachback means the learner teaches a character who does not yet understand.', options: ['roleplay', 'teachback'] },
  { id: 'counterpart', required: true, prompt: 'Who should the learner face in practice? Describe the character: their role, what they want, and their attitude.', why: 'The character\'s goals create the reason the learner needs the content.', example: 'e.g. "Dana, a procurement manager who wants a 20% discount and is impatient"', teachbackPrompt: 'Who will the learner teach? Describe the character: who they are and why they need to understand this.' },
  { id: 'evidence', required: true, prompt: 'What would show you that a learner is making progress? List the things you would look for.', why: 'These become the feedback criteria. Feedback only cites what the learner actually said.', example: 'e.g. "States their BATNA; justifies the anchor with market data"' },
  { id: 'constraints', required: false, prompt: 'Any classroom constraints, such as time, tone, or topics to avoid?', why: 'Keeps the experience appropriate for your setting.', example: '' },
];

const ROLEPLAY_VERBS = ['persuade', 'convince', 'negotiat', 'advis', 'counsel', 'sell', 'pitch', 'interview', 'diagnos', 'manag', 'lead', 'confront', 'deliver', 'handle', 'respond', 'mediat', 'consult', 'argue', 'defend', 'debate', 'recommend', 'coach'];
const TEACHBACK_VERBS = ['explain', 'teach', 'describe', 'walk through', 'clarify', 'tutor', 'summariz', 'demonstrat', 'show how', 'reteach'];

function recommendTemplate(workText) {
  const t = T.norm(workText);
  const r = ROLEPLAY_VERBS.filter((v) => t.includes(v)).length;
  const k = TEACHBACK_VERBS.filter((v) => t.includes(v)).length;
  if (k > r) return { template: 'teachback', rationale: 'You described learners explaining or teaching. A teachback has them teach a character who needs to understand.' };
  return { template: 'roleplay', rationale: r ? 'You described learners acting on a counterpart (for example persuading, advising or diagnosing). A roleplay puts them in that situation.' : 'There is no strong signal either way. A roleplay is the default because it requires applying ideas under pressure.' };
}

function questionFor(project, q) {
  const tpl = project.intake.answers.template && project.intake.answers.template.text;
  let prompt = q.id === 'counterpart' && tpl === 'teachback' ? q.teachbackPrompt : q.prompt;
  const out = { id: q.id, prompt, why: q.why, example: q.example || '', required: q.required, kind: q.kind || 'text', options: q.options || null, suggestions: [] };
  if (q.id === 'template') {
    const rec = recommendTemplate((project.intake.answers.work || {}).text || '');
    out.recommendation = rec;
    out.prompt = `Which format fits best? I recommend ${rec.template.toUpperCase()}. ${rec.rationale} Reply "roleplay" or "teachback".`;
  }
  if (q.suggest === 'concepts') {
    const mat = project.materials.map((m) => m.text).join('\n');
    if (mat.trim()) out.suggestions = T.keyPhrases(mat, 6);
    if (out.suggestions.length) out.prompt += ` From your materials, I'd suggest: ${out.suggestions.join('; ')}. Keep, edit, or replace these.`;
  }
  return out;
}

function nextQuestion(project) {
  const a = project.intake.answers;
  const pending = project.intake.pendingFollowup;
  if (pending) {
    const q = QUESTIONS.find((x) => x.id === pending);
    return { ...questionFor(project, q), followup: true, prompt: followupPrompt(q) };
  }
  for (const q of QUESTIONS) if (!a[q.id]) return questionFor(project, q);
  return null;
}

function followupPrompt(q) {
  return `Could you say a bit more? ${q.why} ${q.example || ''}`.trim();
}

const SKIP = /^(skip|none|n\/a|na|no|nothing|pass|not sure|idk)\.?$/i;

function answer(project, text) {
  const q = nextQuestion(project);
  if (!q) throw Object.assign(new Error('Intake is already complete'), { status: 409 });
  text = String(text || '').trim();
  if (!text) throw Object.assign(new Error('Please enter an answer'), { status: 400 });
  const tq = { id: newId('t'), role: 'primer', text: q.prompt, field: q.id, at: now() };
  const ta = { id: newId('t'), role: 'educator', text, field: q.id, at: now() };
  project.transcript.push(tq, ta);

  if (q.id === 'template') {
    const t = T.norm(text);
    const choice = t.includes('teach') ? 'teachback' : t.includes('role') ? 'roleplay' : /^(yes|ok|okay|sure|sounds good|agree|fine|y)\b/.test(t) ? q.recommendation.template : null;
    if (!choice) { project.intake.pendingFollowup = 'template'; return reply(project, 'Please reply "roleplay" or "teachback".'); }
    project.intake.answers.template = { text: choice, raw: text, turnId: ta.id, recommended: q.recommendation.template, overridden: choice !== q.recommendation.template };
    delete project.intake.pendingFollowup;
    return reply(project);
  }
  if (q.id === 'materials') {
    project.intake.answers.materials = { text, turnId: ta.id, count: project.materials.length };
    return reply(project, project.materials.length ? `Thanks. I have ${project.materials.length} material(s) to ground the design.` : null);
  }
  if (SKIP.test(text)) {
    if (q.required && !q.followup) {
      project.intake.pendingFollowup = q.id;
      return reply(project, 'This one matters for the design.');
    }
    const prev = project.intake.answers[q.id];
    if (!(q.followup && prev && prev.text)) project.intake.answers[q.id] = { text: '', skipped: true, turnId: ta.id };
    delete project.intake.pendingFollowup;
    if (q.followup && prev && prev.text) return reply(project);
    return reply(project, q.required ? 'OK. I\'ll propose a default and flag it as an assumption you can edit.' : null);
  }
  if (q.required && T.wordCount(text) < 3 && !q.followup && q.id !== 'topic') {
    project.intake.answers[q.id] = { text, turnId: ta.id };
    project.intake.pendingFollowup = q.id;
    return reply(project);
  }
  if (q.followup) {
    const prev = project.intake.answers[q.id];
    project.intake.answers[q.id] = { text: prev && prev.text ? prev.text + '\n' + text : text, turnId: ta.id };
  } else {
    project.intake.answers[q.id] = { text, turnId: ta.id };
  }
  delete project.intake.pendingFollowup;
  return reply(project);
}

function reply(project, note) {
  const nq = nextQuestion(project);
  const msg = [note, nq ? nq.prompt : 'That\'s everything I need. Select "Generate design" to see the proposed learning and simulation design.'].filter(Boolean).join(' ');
  project.transcript.push({ id: newId('t'), role: 'primer', text: msg, field: nq ? nq.id : null, at: now(), echo: true });
  project.intake.complete = !nq;
  return { next: nq, complete: !nq };
}

function addMaterial(project, { name, text }) {
  text = String(text || '');
  if (/\.(html?)$/i.test(name || '')) text = text.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ');
  text = text.replace(/\r/g, '').trim();
  if (!text) throw Object.assign(new Error('Material is empty. Only text files (.txt, .md, .html) or pasted text are supported.'), { status: 400 });
  if (text.length > 200000) throw Object.assign(new Error('Material too large (max 200k characters)'), { status: 413 });
  const m = { id: newId('mat'), name: String(name || 'Pasted text').slice(0, 120), text, addedAt: now() };
  project.materials.push(m);
  return m;
}

module.exports = { QUESTIONS, nextQuestion, answer, addMaterial, recommendTemplate };
