// Learner runtime: Preparation -> Practice -> Feedback. Every learner action, piece of evidence and adaptation is
// recorded on the session and saved after each step, so an interrupted session can be resumed.
import { validatePackage, validateSession } from "./schema.js";
import { quote, hash, content, stem, overlap } from "./text.js";
import { toTask } from "./provider.js";

const now = () => new Date().toISOString();

export function createRuntime(store, provider) {
  const save = (s) => { s.updatedAt = now(); return store.put("sessions", s); };
  const pkgOf = (s) => store.get("packages", s.packageId);
  let seq = 0; const nid = (p) => `${p}${Date.now().toString(36)}${(seq++).toString(36)}`;

  function addTurn(s, who, text, meta = {}) { const t = { id: "t" + (s.turns.length + 1), who, text, phase: s.phase, at: now(), ...meta }; s.turns.push(t); return t; }
  function event(s, type, data = {}) { const e = { id: "e" + (s.events.length + 1), type, phase: s.phase, at: now(), ...data }; s.events.push(e); return e; }
  function journal(s, text) { s.journal.push({ phase: s.phase, at: now(), text }); }

  function start(packageId, learner) {
    const pkg = store.get("packages", packageId); const errors = validatePackage(pkg);
    if (errors.length) throw new Error("This experience cannot be started: " + errors.join(" "));
    const s = { id: "session-" + hash(packageId + now() + Math.random()), packageId, learner: { name: (learner && learner.name) || "Learner" }, startedAt: now(), phase: "preparation",
      classroomApproved: pkg.approval.type === "educator", turns: [], events: [], evidence: [], adaptations: [], journal: [],
      practice: { index: 0, attempts: 0, raised: {}, prompted: {}, probed: {}, voiced: false, done: false, learnerTurns: 0, pending: null }, selfAssessment: null, feedback: null, transfer: null };
    event(s, "session-started", { approval: pkg.approval });
    return save(s);
  }

  // ----- Preparation -----
  function submitPreparation(sessionId, answers) {
    const s = store.get("sessions", sessionId), d = pkgOf(s).design; if (s.phase !== "preparation") throw new Error("Preparation is already complete.");
    if (!answers || answers.length < d.preparation.activation.length || answers.some((a) => !a || !a.trim())) throw new Error("Please answer each preparation question in your own words.");
    d.preparation.activation.forEach((q, i) => { addTurn(s, "primer", q, { kind: "activation" }); const t = addTurn(s, "learner", answers[i].trim(), { kind: "activation-answer" }); recordEvidence(s, d, t, null); });
    journal(s, `Preparation: learner answered ${answers.length} activation question(s).`);
    s.phase = "practice"; event(s, "phase", { to: "practice" });
    addTurn(s, "character", provider.line("opening", d), { kind: "opening" });
    if (!d.world) promptCurrent(s, d);
    return save(s);
  }

  function recordEvidence(s, d, turn, currentCriterion) {
    const found = provider.assess(turn.text, d), out = [];
    for (const f of found) { const ev = { id: "ev" + (s.evidence.length + 1), kind: f.kind, ref: f.ref, turnId: turn.id, phase: turn.phase, quote: quote(turn.text, 200), strength: f.strength, matched: f.matched, basis: "observed", promptedFor: currentCriterion || null }; s.evidence.push(ev); out.push(ev); }
    return out;
  }
  function adapt(s, kind, turn, reason, evidence, goalRef, extra = {}) { const a = { id: "a" + (s.adaptations.length + 1), kind, turnId: turn.id, reason, evidenceIds: evidence.map((e) => e.id), goalRef, at: now(), ...extra }; s.adaptations.push(a); return a; }
  function promptCurrent(s, d) { const ch = d.practice.challenges[s.practice.index]; const t = addTurn(s, "character", provider.line("prompt", d, { criterionId: ch.criterionId }), { kind: "prompt", criterionId: ch.criterionId }); s.practice.prompted[ch.criterionId] = t.id; s.practice.attempts = 0; }
  function advance(s, d) {
    const p = s.practice; p.index++;
    if (p.index >= d.practice.challenges.length) return finishPractice(s, d);
    // Teachback / roleplay: the character voices one educator-listed misconception part-way through, so the learner gets a fair chance to address it.
    if (!p.voiced && d.practice.probes.length && p.index >= 1) { p.voiced = true; const pr = d.practice.probes.find((x) => !p.probed[x.misconceptionId]);
      if (pr) { p.probed[pr.misconceptionId] = "voiced"; p.pending = { type: "voice", misconceptionId: pr.misconceptionId }; addTurn(s, "character", provider.line("probe-voice", d, { misconceptionId: pr.misconceptionId }), { kind: "probe-voice", misconceptionId: pr.misconceptionId }); return; } }
    promptCurrent(s, d);
  }
  function finishPractice(s, d) { s.practice.done = true; addTurn(s, "character", provider.line("closing", d), { kind: "closing" }); journal(s, `Practice ended after ${s.practice.learnerTurns} learner turn(s).`); s.phase = "feedback"; event(s, "phase", { to: "feedback" }); }

  // A world (e.g. the cave) reports what the learner did there. Field notes are the learner's own words and count as evidence.
  function worldEvent(sessionId, ev) {
    const s = store.get("sessions", sessionId), d = pkgOf(s).design; if (s.phase !== "practice") throw new Error("The field site is only open during practice.");
    const e = event(s, "world", { ...ev });
    if (ev.note && ev.note.trim()) { const t = addTurn(s, "learner", ev.note.trim(), { kind: "field-note", worldEventId: e.id, feature: ev.feature }); recordEvidence(s, d, t, null); }
    return save(s);
  }
  function leaveWorld(sessionId) { const s = store.get("sessions", sessionId), d = pkgOf(s).design; if (s.practice.worldLeft) return s; s.practice.worldLeft = true; event(s, "world-left", {}); journal(s, `Field work: ${s.events.filter((e) => e.type === "world").length} investigation(s) recorded.`); promptCurrent(s, d); return save(s); }

  // ----- Practice -----
  function say(sessionId, text) {
    const s = store.get("sessions", sessionId), d = pkgOf(s).design; if (s.phase !== "practice") throw new Error("Practice is not in progress.");
    if (!text || !text.trim()) throw new Error("Say something first.");
    if (d.world && !s.practice.worldLeft) throw new Error("Finish your field work before talking to " + d.character.name + ".");
    const p = s.practice, ch = d.practice.challenges[p.index], rules = d.practice;
    const turn = addTurn(s, "learner", text.trim(), { kind: "practice", criterionId: ch.criterionId }); p.learnerTurns++;
    const ev = recordEvidence(s, d, turn, ch.criterionId);
    const reply = (kind, ctx, meta) => addTurn(s, "character", provider.line(kind, d, ctx), { kind, ...meta });

    // 1. The learner asks for the answer: decline in character, keep the same task. (Guards against over-helping.)
    if (provider.isAnswerSeeking(text)) { adapt(s, "redirect", turn, "Learner asked to be given the answer; the character declined and restated the task.", [], ch.criterionId); reply("redirect", { criterionId: ch.criterionId }, { criterionId: ch.criterionId }); return save(s); }
    // 2. Reply to a misconception the character voiced.
    if (p.pending && p.pending.type === "voice") { const mid = p.pending.misconceptionId; p.pending = null;
      const corrected = ev.some((e) => e.ref === mid && e.kind === "misconception-corrected");
      if (!corrected) s.evidence.push({ id: "ev" + (s.evidence.length + 1), kind: "misconception-unaddressed", ref: mid, turnId: turn.id, phase: "practice", quote: quote(turn.text, 200), strength: "clear", matched: [], basis: "observed", promptedFor: null });
      promptCurrent(s, d); return save(s); }
    // 3. The learner states an educator-listed misconception: probe it once, tied to that misconception.
    const voiced = ev.find((e) => e.kind === "misconception-voiced" && p.probed[e.ref] !== "challenged");
    if (voiced) { p.probed[voiced.ref] = "challenged"; adapt(s, "probe", turn, "Learner's statement matched an educator-listed misconception; the character asked them to test it.", [voiced], voiced.ref); reply("probe-challenge", { misconceptionId: voiced.ref }, { misconceptionId: voiced.ref }); return save(s); }
    // 4. Evidence for the criterion being worked on.
    const hit = ev.find((e) => e.kind === "criterion" && e.ref === ch.criterionId);
    if (hit) {
      if (rules.raise && !p.raised[ch.criterionId] && p.learnerTurns < rules.maxTurns - 1) { p.raised[ch.criterionId] = true; adapt(s, "raise", turn, "Learner showed evidence for this criterion, so the character raised the challenge within the same goal.", [hit], ch.criterionId); reply("raise", { criterionId: ch.criterionId, learnerText: turn.text }, { criterionId: ch.criterionId }); return save(s); }
      advance(s, d); return save(s);
    }
    if (p.raised[ch.criterionId]) { advance(s, d); return save(s); }   // answered the harder follow-up; move on either way
    // 5. No evidence yet: support within the educator's help policy, then move on.
    p.attempts++;
    if (p.attempts >= rules.maxAttempts || p.learnerTurns >= rules.maxTurns) { event(s, "opportunity-closed", { criterionId: ch.criterionId, attempts: p.attempts }); if (p.learnerTurns >= rules.maxTurns) finishPractice(s, d); else advance(s, d); return save(s); }
    const level = d.helpPolicy === "none" ? 0 : d.helpPolicy === "questions" ? 1 : Math.min(p.attempts, 2);
    if (level === 0) { adapt(s, "repeat", turn, "No evidence yet; help policy is 'no hints', so the question was repeated.", [], ch.criterionId); reply("repeat", { criterionId: ch.criterionId }, { criterionId: ch.criterionId }); }
    else { adapt(s, "support", turn, `No evidence yet for this criterion; support level ${level} given (help policy: ${d.helpPolicy}).`, [], ch.criterionId, { level }); reply("support", { criterionId: ch.criterionId, level }, { criterionId: ch.criterionId, level }); }
    return save(s);
  }

  // ----- Feedback -----
  function submitSelfAssessment(sessionId, answers) {
    const s = store.get("sessions", sessionId), d = pkgOf(s).design; if (s.phase !== "feedback") throw new Error("Feedback has not started."); if (s.selfAssessment) throw new Error("Self-assessment already recorded.");
    if (!answers || answers.length < d.feedback.selfAssessment.length || answers.some((a) => !a || !a.trim())) throw new Error("Please answer the self-assessment questions first.");
    s.selfAssessment = d.feedback.selfAssessment.map((q, i) => { addTurn(s, "primer", q, { kind: "self-assessment" }); const t = addTurn(s, "learner", answers[i].trim(), { kind: "self-assessment-answer" }); return { question: q, answer: t.text, turnId: t.id }; });
    s.feedback = buildFeedback(s, d); journal(s, `Feedback: ${s.feedback.strengths.length} strength(s), ${s.feedback.growth.length} growth area(s), ${s.feedback.notAssessed.length} not assessed.`);
    return save(s);
  }
  function buildFeedback(s, d) {
    const turn = (id) => s.turns.find((t) => t.id === id); const where = (id) => { const k = turn(id).kind; return k === "field-note" ? "in your field notes" : k === "activation-answer" ? "while preparing" : "in the conversation"; };
    const cite = (e) => ({ turnId: e.turnId, phase: e.phase, where: where(e.turnId), quote: e.quote });
    const strengths = [], growth = [], notAssessed = [];
    for (const c of d.criteria) {
      const ev = s.evidence.filter((e) => e.kind === "criterion" && e.ref === c.id), promptId = s.practice.prompted[c.id];
      const support = s.adaptations.filter((a) => a.goalRef === c.id && (a.kind === "support" || a.kind === "repeat")).length, raised = s.adaptations.some((a) => a.goalRef === c.id && a.kind === "raise");
      const places = [...new Set(ev.map((e) => where(e.turnId)))], helped = support && ev.every((e) => turn(e.turnId).kind === "practice");
      if (ev.length) strengths.push({ criterionId: c.id, criterion: c.text, observation: `You addressed this in your own words ${places.join(" and ")}${helped ? ` (after ${support} follow-up question${support > 1 ? "s" : ""})` : ""}.`, citations: ev.slice(0, 3).map(cite),
        inference: ev.some((e) => e.strength === "clear") ? "Inference: this looks secure." + (raised ? " You were then given a harder version of the question." : "") : "Inference: this is developing; the idea is there but not yet fully worked out.", basis: "observed" });
      else if (promptId) { const replies = s.turns.filter((t) => t.who === "learner" && t.criterionId === c.id);
        growth.push({ criterionId: c.id, criterion: c.text, observation: `You were asked about this ("${quote(turn(promptId).text, 110)}") and your ${replies.length > 1 ? replies.length + " replies" : "reply"} did not bring in ${c.lookFors.slice(0, 3).join(", ")}.`,
          citations: replies.slice(0, 2).map((t) => ({ turnId: t.id, phase: t.phase, where: where(t.id), quote: quote(t.text, 200) })), inference: "Inference: this may need more work. It is also possible you understand it but did not say it.",
          nextAction: `Go back to the course material shown in the Prepare step, find the part about ${c.lookFors.slice(0, 2).join(" and ")}, then write two sentences in which you ${toTask(c.text)}.`, basis: "observed" }); }
      else notAssessed.push({ criterionId: c.id, criterion: c.text, reason: "The session ended before you were asked about this, so it is not assessed." });
    }
    const misconceptions = d.misconceptions.map((m) => { const ev = s.evidence.filter((e) => e.ref === m.id); if (!ev.length) return null;
      const last = ev.at(-1); return { misconceptionId: m.id, misconception: m.text, status: last.kind === "misconception-corrected" ? "corrected" : last.kind === "misconception-voiced" ? "stated" : "left unchallenged", citations: ev.slice(-2).map(cite),
        note: last.kind === "misconception-corrected" ? "You pushed back on this idea." : last.kind === "misconception-voiced" ? "You said something close to this idea and were asked to test it." : "The character suggested this idea and your reply did not correct it." }; }).filter(Boolean);
    const redirects = s.adaptations.filter((a) => a.kind === "redirect").length;
    return { generatedAt: now(), goal: d.goal.text, strengths, growth, notAssessed, misconceptions,
      selfAssessmentNote: s.selfAssessment ? `You said: "${quote(s.selfAssessment[0].answer, 140)}". Compare that with the moments quoted below.` : "",
      adaptations: s.adaptations.map((a) => ({ kind: a.kind, goalRef: a.goalRef, reason: a.reason, turnId: a.turnId })),
      effortNote: redirects ? `You asked to be given the answer ${redirects} time${redirects > 1 ? "s" : ""}. The character did not give it, so everything quoted here is your own work.` : "",
      nextActions: growth.map((g) => g.nextAction).concat(misconceptions.filter((m) => m.status !== "corrected").map((m) => `Test this idea against your materials: "${m.misconception}". What evidence would show it is wrong?`)),
      transferQuestion: d.feedback.transfer, limits: "Feedback is based only on what you wrote in this session. It was produced by matching your words against your teacher's criteria, not by a human reading them." };
  }
  function submitTransfer(sessionId, text) {
    const s = store.get("sessions", sessionId), d = pkgOf(s).design; if (s.phase !== "feedback" || !s.feedback) throw new Error("Complete the self-assessment first."); if (!text || !text.trim()) throw new Error("Write a response to the transfer question.");
    addTurn(s, "primer", d.feedback.transfer, { kind: "transfer" }); const t = addTurn(s, "learner", text.trim(), { kind: "transfer-answer" });
    const used = d.criteria.filter((c) => overlap(t.text, [...new Set(c.lookFors.map(stem))]).hits.length >= 2).map((c) => c.id);
    s.transfer = { turnId: t.id, answer: t.text, criteriaEchoed: used, note: used.length ? `Observation: your answer reuses ideas from ${used.length} of the criteria.` : "Observation: your answer does not yet connect back to the ideas from this session." };
    s.phase = "ended"; s.endedAt = now(); event(s, "session-ended", {}); journal(s, "Session ended."); return save(s);
  }
  const get = (id) => store.get("sessions", id);
  const check = (id) => validateSession(get(id));
  return { start, submitPreparation, worldEvent, leaveWorld, say, submitSelfAssessment, submitTransfer, get, check };
}
