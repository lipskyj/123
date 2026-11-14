import { test } from "node:test";
import assert from "node:assert/strict";
import { setup, author, built, fixture, TEACHER, TEST } from "./helpers.mjs";
import { validateIntake, validateDesign, validatePackage, validateSession } from "../src/schema.js";
import { DeterministicProvider, ReplayProvider } from "../src/provider.js";
import { createStore, memoryBackend } from "../src/store.js";
import { createRuntime } from "../src/runtime.js";
import { createAuthoring } from "../src/authoring.js";

const PREP = ["I know a little about it from class.", "I expect explaining the reasons to be hardest."];
const SELF = ["I think it went fairly well; I explained the main idea.", "I would give more evidence next time."];

// ---------- schema and configuration ----------
test("schema: incomplete intake is rejected with readable errors", () => {
  const e = validateIntake({ id: "x", objective: "", learners: "", materials: [], studentWork: "", evidenceOfProgress: [] });
  assert.ok(e.length >= 5); assert.ok(e.every((m) => /[a-z]/.test(m) && !/undefined/.test(m)));
  assert.throws(() => setup().authoring.saveIntake({ objective: "x" }), /learners/i);
});
test("schema: proposed designs, packages and sessions validate", () => {
  for (const name of ["mba-negotiation", "cave-geology"]) { const env = setup(); const pkg = built(env, name);
    assert.deepEqual(validateDesign(pkg.design), []); assert.deepEqual(validatePackage(pkg), []);
    assert.deepEqual(validateSession(env.runtime.start(pkg.id, { name: "A" })), []); }
});

// ---------- authoring ----------
test("authoring: interview asks one question at a time and records answers", () => {
  const env = setup(), { answers, ...fields } = fixture("mba-negotiation"); const intake = env.authoring.saveIntake(fields); const seen = [];
  for (let q; (q = env.authoring.nextQuestion(intake.id)); ) { seen.push(q.id); assert.ok(q.text.endsWith("?")); env.authoring.answer(intake.id, q.id, answers[q.id] || ""); }
  assert.deepEqual(seen, ["character", "stakes", "difficulty", "help", "transfer"]);   // template was already chosen, so it is not asked
  assert.equal(env.store.get("intakes", intake.id).answers.length, 5);
});
test("authoring: educator materials and inputs shape the design", () => {
  const a = author(setup(), "mba-negotiation").design, b = author(setup(), "cave-geology").design;
  assert.equal(a.template, "roleplay"); assert.equal(b.template, "teachback"); assert.equal(b.world, "cave"); assert.equal(a.world, null);
  assert.ok(a.concepts.some((c) => /batna/i.test(c.term))); assert.ok(b.concepts.some((c) => /calcite|limestone/i.test(c.term)));
  for (const d of [a, b]) for (const c of d.concepts) assert.ok(fixture(d === a ? "mba-negotiation" : "cave-geology").materials[0].text.includes(c.fact.replace(/…$/, "").slice(0, 60)), "key points are quoted from the educator's materials");
  assert.notEqual(a.practice.opening, b.practice.opening); assert.notDeepEqual(a.criteria.map((c) => c.text), b.criteria.map((c) => c.text));
  assert.match(a.practice.opening, /bottom line|weak offer/); assert.match(b.prompts.character, /volunteer guide/);
});
test("authoring: skipped questions become visible AI assumptions", () => {
  const env = setup(), { answers, ...fields } = fixture("mba-negotiation"); delete fields.template; const intake = env.authoring.saveIntake(fields);
  for (let q; (q = env.authoring.nextQuestion(intake.id)); ) env.authoring.answer(intake.id, q.id, "", true);
  const d = env.authoring.propose(intake.id); assert.ok(d.assumptions.length >= 4); assert.ok(d.assumptions.every((x) => x.source === "ai" && x.field));
  assert.equal(d.character.source.kind, "ai"); assert.equal(d.goal.source.kind, "teacher");
});
test("authoring: a natural-language revision changes the design and propagates downstream", () => {
  const env = setup(), { design } = author(env, "mba-negotiation");
  const r = env.authoring.revise(design.id, "Make it harder and add a criterion: Recommends improving the BATNA before the meeting", TEACHER);
  assert.equal(r.understood, true); assert.equal(r.design.version, 2); assert.equal(r.design.state, "revised"); assert.equal(r.design.difficulty, "demanding");
  assert.equal(r.design.criteria.length, design.criteria.length + 1); assert.equal(r.design.practice.challenges.length, design.practice.challenges.length + 1);
  assert.match(r.design.prompts.assessor, /improving the BATNA/); assert.match(r.design.prompts.character, /demanding/); assert.equal(r.design.practice.maxAttempts, 2);
  assert.equal(env.store.get("designs", design.id).state, "superseded");
  const r2 = env.authoring.revise(r.design.id, "The character should be a senior engineer changing careers", TEACHER);
  assert.match(r2.design.practice.opening, /senior engineer/); assert.match(r2.design.preparation.briefing, /senior engineer/);
});
test("authoring: a request Primer cannot interpret becomes a teacher-only note, never student-facing text", () => {
  const env = setup(), { design } = author(env, "cave-geology"); const r = env.authoring.revise(design.id, "Please keep sentences short because several students are new to English", TEACHER);
  assert.equal(r.understood, false); assert.match(r.changes[0], /note for you only/); assert.ok(r.design.notes.some((c) => /new to English/.test(c)));
  const studentFacing = JSON.stringify([r.design.preparation, r.design.practice, r.design.feedback]); assert.ok(!/new to English/.test(studentFacing));
  const r2 = env.authoring.revise(r.design.id, "Remove the last note", TEACHER); assert.equal(r2.design.notes.length, 0); assert.equal(r2.understood, true);
});
// ---------- regressions from the independent teacher review (records/validation/fresh-teacher-report.md) ----------
test("review F1: the character's questions do not recite the success criteria", () => {
  for (const name of ["mba-negotiation", "cave-geology"]) { const d = author(setup(), name).design;
    for (const ch of d.practice.challenges) { const c = d.criteria.find((x) => x.id === ch.criterionId); assert.ok(!ch.prompt.toLowerCase().includes(c.text.toLowerCase().split(" ").slice(1, 6).join(" ")), ch.prompt); assert.match(ch.prompt, /\?$/); assert.equal(ch.written, "primer"); }
    assert.ok(d.assumptions.some((a) => a.field === "questions")); }
  const env = setup(), { design } = author(env, "mba-negotiation"); const e = env.authoring.edit(design.id, "criteria.0.question", "What do you think the hiring manager actually cares about?", TEACHER);
  assert.equal(e.practice.challenges[0].prompt, "What do you think the hiring manager actually cares about?"); assert.equal(e.practice.challenges[0].written, "teacher");
});
test("review F2/F6/F16: classroom constraints are never spoken by the character or shown in the briefing", () => {
  const d = author(setup(), "mba-negotiation").design; assert.ok(d.constraints.length >= 1); const studentFacing = JSON.stringify([d.preparation, d.practice, d.feedback]);
  for (const c of d.constraints) assert.ok(!studentFacing.includes(c.slice(0, 25)), c); assert.match(d.prompts.character, /only one other offer/);
});
test("review F4/F5: a character named by the teacher keeps that name; renaming changes only the name", () => {
  const env = setup(), { answers, ...fields } = fixture("mba-negotiation"); const intake = env.authoring.saveIntake(fields);
  for (let q; (q = env.authoring.nextQuestion(intake.id)); ) env.authoring.answer(intake.id, q.id, q.id === "character" ? "A classmate called Jordan who missed the lecture" : answers[q.id] || "");
  const d = env.authoring.propose(intake.id); assert.equal(d.character.name, "Jordan"); assert.equal(d.character.nameSource.kind, "teacher"); assert.match(d.practice.opening, /^I'm Jordan, a classmate who missed the lecture/);
  const r = env.authoring.revise(d.id, "The character should be called Sam, not Jordan", TEACHER); assert.equal(r.design.character.name, "Sam"); assert.equal(r.design.character.role, d.character.role); assert.match(r.design.practice.opening, /^I'm Sam, a classmate/);
  const plain = author(setup(), "mba-negotiation").design; assert.equal(plain.character.nameSource.kind, "ai"); assert.ok(plain.assumptions.some((a) => a.field === "character.name"));
});
test("review F3: a rejected design can be reopened by editing; the new version needs approval", () => {
  const env = setup(), { design } = author(env, "mba-negotiation"); env.authoring.rejectDesign(design.id, TEACHER, "not yet");
  const r = env.authoring.revise(design.id, "make it easier", TEACHER); assert.equal(r.design.state, "revised"); assert.equal(env.store.get("designs", design.id).state, "superseded"); assert.throws(() => env.authoring.build(r.design.id), /Only an approved/);
});
test("review F8/F9: students get the full material, distinct key points and clean preparation questions", () => {
  const d = author(setup(), "cave-geology").design; assert.ok(d.materials[0].text.length > 500); const kp = d.preparation.keyPoints.map((k) => k.text); assert.equal(new Set(kp).size, kp.length); assert.ok(kp.length >= 3);
  for (const q of d.preparation.activation) { assert.match(q, /\?$/); assert.ok(!q.includes(d.learnerProfile.priorKnowledge)); }
});
test("review F10: a misconception the learner already rejected is not voiced; a plain 'no' counts as a correction", () => {
  const env = setup(), pkg = built(env, "cave-geology"); let s = env.runtime.start(pkg.id, {}); s = env.runtime.submitPreparation(s.id, PREP); s = env.runtime.leaveWorld(s.id);
  s = env.runtime.say(s.id, "It is a myth that caves are carved by fast flowing rivers cutting the rock; that is not how it works."); let n = 0;
  while (s.phase === "practice" && n++ < 30) { const last = s.turns.at(-1); if (last.kind === "probe-voice") assert.equal(last.misconceptionId, "m2"); s = env.runtime.say(s.id, last.kind === "probe-voice" ? "No, that isn't right." : "I am not sure."); }
  s = env.runtime.submitSelfAssessment(s.id, SELF); const st = Object.fromEntries(s.feedback.misconceptions.map((m) => [m.misconceptionId, m.status])); assert.equal(st.m1, "corrected"); assert.equal(st.m2, "corrected");
});
test("review F17: a learner can end practice early; unasked criteria are not assessed", () => {
  const env = setup(), pkg = built(env, "mba-negotiation"); let s = env.runtime.start(pkg.id, {}); s = env.runtime.submitPreparation(s.id, PREP); s = env.runtime.say(s.id, "I am not sure.");
  s = env.runtime.endPractice(s.id); assert.equal(s.phase, "feedback"); s = env.runtime.submitSelfAssessment(s.id, SELF); assert.ok(s.feedback.notAssessed.length >= 2);
  const env2 = setup(), { design } = author(env2, "mba-negotiation"); assert.equal(env2.authoring.edit(design.id, "practice.maxTurns", "5", TEACHER).practice.maxTurns, 5); assert.throws(() => env2.authoring.edit(design.id, "difficulty", "x", TEACHER));
});
test("authoring: direct edits create a new version; edits to derived text survive later revisions", () => {
  const env = setup(), { design } = author(env, "cave-geology");
  const e1 = env.authoring.edit(design.id, "practice.opening", "Hello! I start tours on Monday and I'm terrified.", TEACHER); assert.equal(e1.version, 2);
  const e2 = env.authoring.edit(e1.id, "goal.text", "Students explain cave formation from evidence", TEACHER); assert.match(e2.prompts.character, /explain cave formation from evidence/);
  assert.equal(e2.practice.opening, "Hello! I start tours on Monday and I'm terrified.");
  assert.throws(() => env.authoring.edit(design.id, "goal.text", "x", TEACHER), /superseded/);
});
test("authoring: trace links design elements to educator input", () => {
  const env = setup(), { design } = author(env, "mba-negotiation"); const t = env.authoring.trace(design.id);
  assert.ok(t.rows.find((r) => r.element === "Learning goal" && /Educator: objective/.test(r.from))); assert.ok(t.rows.filter((r) => /Educator material/.test(r.from)).length >= 3);
});

// ---------- approval ----------
test("approval: an unapproved design cannot be built or played", () => {
  const env = setup(), { design } = author(env, "mba-negotiation");
  assert.throws(() => env.authoring.build(design.id), /Only an approved design/);
  const rejected = env.authoring.rejectDesign(design.id, TEACHER, "Wrong level"); assert.equal(rejected.state, "rejected"); assert.throws(() => env.authoring.build(design.id), /Only an approved design/);
  assert.throws(() => env.authoring.approveDesign(design.id, TEACHER), /cannot become/);
});
test("approval: test approval is labelled and never counts as educator approval", () => {
  const env = setup(), { design } = author(env, "mba-negotiation");
  const t = env.authoring.approveDesign(design.id, TEST); assert.equal(t.state, "test-approved"); const pkg = env.authoring.build(t.id); assert.equal(pkg.approval.type, "test");
  assert.equal(env.runtime.start(pkg.id, {}).classroomApproved, false);
  const e = env.authoring.approveDesign(design.id, TEACHER); assert.equal(e.state, "educator-approved"); assert.equal(env.runtime.start(env.authoring.build(e.id).id, {}).classroomApproved, true);
  assert.throws(() => env.authoring.approveDesign(design.id, { type: "system", name: "x" }), /Only an educator/);
});
test("approval: a tampered package is refused by the runtime", () => {
  const env = setup(), pkg = built(env, "mba-negotiation"); const bad = structuredClone(pkg); bad.id = "exp-bad"; bad.design.state = "draft"; env.store.put("packages", bad);
  assert.throws(() => env.runtime.start("exp-bad", {}), /cannot be started/);
  const bad2 = structuredClone(pkg); bad2.id = "exp-bad2"; bad2.approval.type = "educator"; env.store.put("packages", bad2); assert.throws(() => env.runtime.start("exp-bad2", {}), /does not match/);
});
test("approval: revising an approved design supersedes it and the new version needs its own approval", () => {
  const env = setup(), { design } = author(env, "mba-negotiation"); env.authoring.approveDesign(design.id, TEACHER);
  const r = env.authoring.revise(design.id, "make it easier", TEACHER); assert.equal(r.design.state, "revised"); assert.throws(() => env.authoring.build(r.design.id), /Only an approved design/);
  assert.equal(env.store.get("designs", design.id).state, "superseded"); assert.throws(() => env.authoring.build(design.id), /Only an approved design/);
});

// ---------- runtime ----------
function playStrong(env, pkg) {
  let s = env.runtime.start(pkg.id, { name: "Strong" }); s = env.runtime.submitPreparation(s.id, PREP);
  if (pkg.design.world) { s = env.runtime.worldEvent(s.id, { feature: "limestone", tool: "acid", wrongTools: [], note: "The wall fizzes with acid so the rock is calcite limestone, and acidic water dissolves it." }); s = env.runtime.leaveWorld(s.id); }
  let guard = 0;
  while (s.phase === "practice" && guard++ < 40) { const last = s.turns.at(-1); const c = pkg.design.criteria.find((x) => x.id === last.criterionId);
    const text = last.kind === "probe-voice" ? `No, that is not right, it is a misconception: it is wrong that ${pkg.design.misconceptions.find((m) => m.id === last.misconceptionId).text}.`
      : !c ? "No, that is wrong and not what the evidence shows; it is a misconception."
      : `Here is my reasoning: ${c.text}. In other words ${c.lookFors.join(" ")} all matter here.`; s = env.runtime.say(s.id, text); }
  return s;
}
test("runtime: preparation, practice and feedback are connected and the session ends clearly", () => {
  for (const name of ["mba-negotiation", "cave-geology"]) { const env = setup(), pkg = built(env, name);
    let s = env.runtime.start(pkg.id, { name: "A" }); assert.equal(s.phase, "preparation"); assert.throws(() => env.runtime.say(s.id, "hi"), /not in progress/);
    assert.throws(() => env.runtime.submitPreparation(s.id, ["only one"]), /each preparation question/);
    s = playStrong(env, pkg); assert.equal(s.phase, "feedback"); assert.throws(() => env.runtime.submitTransfer(s.id, "x"), /self-assessment first/);
    s = env.runtime.submitSelfAssessment(s.id, SELF); assert.equal(s.feedback.strengths.length, pkg.design.criteria.length); assert.equal(s.feedback.growth.length, 0);
    s = env.runtime.submitTransfer(s.id, "I would look for the same evidence in the new place."); assert.equal(s.phase, "ended"); assert.ok(s.endedAt);
    assert.throws(() => env.runtime.say(s.id, "more"), /not in progress/); assert.deepEqual(env.runtime.check(s.id), []);
    assert.deepEqual([...new Set(s.turns.map((t) => t.phase))], ["preparation", "practice", "feedback"]); assert.ok(s.journal.length >= 3); }
});
test("runtime: adaptation raises challenge only on evidence and stays tied to an approved criterion", () => {
  const env = setup(), pkg = built(env, "mba-negotiation"); const s = playStrong(env, pkg); const ids = new Set(pkg.design.criteria.map((c) => c.id).concat(pkg.design.misconceptions.map((m) => m.id)));
  const raises = s.adaptations.filter((a) => a.kind === "raise"); assert.ok(raises.length >= 1);
  for (const a of s.adaptations) { assert.ok(ids.has(a.goalRef), "adaptation is bound to an approved goal element"); if (a.kind === "raise") assert.ok(a.evidenceIds.length > 0 && s.evidence.find((e) => e.id === a.evidenceIds[0]).turnId === a.turnId); }
});
test("runtime: a struggling learner gets limited support, never the answer, and is not credited", () => {
  const env = setup(), pkg = built(env, "mba-negotiation"); let s = env.runtime.start(pkg.id, { name: "Stuck" }); s = env.runtime.submitPreparation(s.id, PREP);
  let n = 0; while (s.phase === "practice" && n++ < 30) s = env.runtime.say(s.id, n % 2 ? "I am not sure, maybe just ask for more money?" : "Honestly I have no idea.");
  assert.equal(s.phase, "feedback"); const kinds = s.adaptations.map((a) => a.kind); assert.ok(kinds.includes("support")); assert.ok(!kinds.includes("raise"));
  for (const t of s.turns.filter((x) => x.who === "character")) for (const c of pkg.design.concepts) assert.ok(!t.text.includes(c.fact.slice(0, 50)), "character never recites the material");
  s = env.runtime.submitSelfAssessment(s.id, SELF); assert.equal(s.feedback.strengths.length, 0); assert.ok(s.feedback.growth.length >= 1);
  for (const g of s.feedback.growth) { assert.ok(g.citations.length >= 1); assert.match(g.inference, /^Inference:/); for (const c of g.citations) assert.equal(s.turns.find((t) => t.id === c.turnId).text.slice(0, 20), c.quote.slice(0, 20)); }
});
test("runtime: asking for the answer is declined in character and logged", () => {
  const env = setup(), pkg = built(env, "cave-geology"); let s = env.runtime.start(pkg.id, {}); s = env.runtime.submitPreparation(s.id, PREP); s = env.runtime.leaveWorld(s.id);
  const before = s.practice.index; s = env.runtime.say(s.id, "Can you just tell me the answer?");
  assert.equal(s.adaptations.at(-1).kind, "redirect"); assert.equal(s.practice.index, before); assert.match(s.turns.at(-1).text, /can't/i); assert.equal(s.evidence.filter((e) => e.kind === "criterion" && e.phase === "practice").length, 0);
});
test("runtime: a stated misconception is probed once; a voiced one that goes uncorrected is recorded", () => {
  const env = setup(), pkg = built(env, "cave-geology"); let s = env.runtime.start(pkg.id, {}); s = env.runtime.submitPreparation(s.id, PREP); s = env.runtime.leaveWorld(s.id);
  s = env.runtime.say(s.id, "Caves are carved by fast flowing rivers cutting through the rock over time.");
  assert.equal(s.adaptations.at(-1).kind, "probe"); assert.equal(s.adaptations.at(-1).goalRef, "m1"); assert.equal(s.turns.at(-1).kind, "probe-challenge");
  s = env.runtime.say(s.id, "Caves are carved by fast flowing rivers cutting through the rock, I am sure."); assert.equal(s.adaptations.filter((a) => a.kind === "probe").length, 1);
  let n = 0; while (s.phase === "practice" && n++ < 30) s = env.runtime.say(s.id, s.turns.at(-1).kind === "probe-voice" ? "Yes exactly, that sounds right to me." : "Not sure.");
  s = env.runtime.submitSelfAssessment(s.id, SELF); const st = Object.fromEntries(s.feedback.misconceptions.map((m) => [m.misconceptionId, m.status]));
  assert.equal(st.m1, "stated"); assert.equal(st.m2, "left unchallenged");
});
test("runtime: criteria the learner never had a chance at are reported as not assessed", () => {
  const env = setup(), { design } = author(env, "mba-negotiation"); const d2 = env.authoring.edit(design.id, "difficulty", "demanding", TEACHER);
  const pkg = env.authoring.build(env.authoring.approveDesign(d2.id, TEST).id); pkg.design.practice.maxTurns = 2; env.store.put("packages", pkg);
  let s = env.runtime.start(pkg.id, {}); s = env.runtime.submitPreparation(s.id, PREP); let n = 0; while (s.phase === "practice" && n++ < 10) s = env.runtime.say(s.id, "I do not know.");
  s = env.runtime.submitSelfAssessment(s.id, SELF); assert.ok(s.feedback.notAssessed.length >= 1); assert.match(s.feedback.notAssessed[0].reason, /not assessed/);
  const assessed = new Set([...s.feedback.strengths, ...s.feedback.growth].map((x) => x.criterionId)); for (const x of s.feedback.notAssessed) assert.ok(!assessed.has(x.criterionId));
});
test("runtime: feedback cites only text the learner actually wrote (no invented evidence)", () => {
  const env = setup(), pkg = built(env, "cave-geology"); let s = playStrong(env, pkg); s = env.runtime.submitSelfAssessment(s.id, SELF);
  const learner = s.turns.filter((t) => t.who === "learner"); const all = [...s.feedback.strengths, ...s.feedback.growth, ...s.feedback.misconceptions].flatMap((x) => x.citations);
  assert.ok(all.length >= 4); for (const c of all) { const t = learner.find((x) => x.id === c.turnId); assert.ok(t, "citation points at a learner turn"); assert.ok(t.text.startsWith(c.quote.replace(/…$/, ""))); }
  assert.ok(s.evidence.some((e) => e.phase === "practice" && s.turns.find((t) => t.id === e.turnId).kind === "field-note"), "field notes from the world count as evidence");
});
test("runtime: world practice gates the conversation until field work is done", () => {
  const env = setup(), pkg = built(env, "cave-geology"); let s = env.runtime.start(pkg.id, {}); s = env.runtime.submitPreparation(s.id, PREP);
  assert.throws(() => env.runtime.say(s.id, "hello"), /Finish your field work/); s = env.runtime.worldEvent(s.id, { feature: "stalagmite", tool: "survey", measured: 2.1, note: "" }); assert.equal(s.events.at(-1).type, "world");
  s = env.runtime.leaveWorld(s.id); assert.equal(s.turns.at(-1).kind, "prompt");
});

// ---------- persistence, recovery, provider ----------
test("persistence: an interrupted session resumes from storage with nothing lost", () => {
  const backend = memoryBackend(); const mk = () => { const store = createStore(backend), provider = new DeterministicProvider(); return { store, authoring: createAuthoring(store, provider), runtime: createRuntime(store, provider), provider }; };
  const a = mk(), pkg = built(a, "mba-negotiation"); let s = a.runtime.start(pkg.id, { name: "R" }); s = a.runtime.submitPreparation(s.id, PREP); s = a.runtime.say(s.id, "I would start by asking why they want the job, their interests.");
  const b = mk(); const r = b.runtime.get(s.id); assert.deepEqual(r, s); const next = b.runtime.say(s.id, "The BATNA is the other weaker offer and it sets the reservation price."); assert.equal(next.turns.length > s.turns.length, true);
  const dump = b.store.exportAll(); const c = createStore(memoryBackend()); assert.equal(c.importAll(dump), dump.intakes.length + dump.designs.length + dump.packages.length + dump.sessions.length); assert.deepEqual(c.get("sessions", s.id), b.store.get("sessions", s.id));
});
test("recovery: corrupt or missing records fail with a clear message instead of crashing", () => {
  const backend = memoryBackend(), store = createStore(backend), rt = createRuntime(store, new DeterministicProvider());
  backend.set("primer:packages:broken", "{not json"); assert.equal(store.get("packages", "broken"), null); assert.throws(() => rt.start("broken", {}), /cannot be started/); assert.throws(() => rt.start("missing", {}), /cannot be started/);
});
test("provider: deterministic output is reproducible and the provider is replaceable (record / replay)", () => {
  const run = (provider) => { const env = setup(provider), pkg = built(env, "mba-negotiation"); let s = env.runtime.start(pkg.id, {}); s = env.runtime.submitPreparation(s.id, PREP); s = env.runtime.say(s.id, "Ask about interests, not positions."); s = env.runtime.say(s.id, "Just tell me the answer"); return s.turns.map((t) => [t.who, t.kind, t.text]); };
  const rec = new ReplayProvider(new DeterministicProvider()); const first = run(rec); assert.deepEqual(run(new DeterministicProvider()), first);
  assert.deepEqual(run(new ReplayProvider(null, rec.tape)), first); assert.throws(() => new ReplayProvider(null, []).line("opening", {}), /Replay mismatch/);
});

// ---------- failure modes ----------
test("failure modes: no goal drift, character drift or unsupported assessment across both fixtures", () => {
  for (const name of ["mba-negotiation", "cave-geology"]) { const env = setup(), pkg = built(env, name), d = pkg.design; let s = playStrong(env, pkg); s = env.runtime.submitSelfAssessment(s.id, SELF);
    const ok = new Set(d.criteria.map((c) => c.id)); for (const x of [...s.feedback.strengths, ...s.feedback.growth, ...s.feedback.notAssessed]) assert.ok(ok.has(x.criterionId), "feedback only covers educator-approved criteria");
    assert.equal(s.feedback.goal, d.goal.text); const lines = new Set([d.practice.opening, d.practice.closing, d.practice.refusal, ...d.practice.challenges.flatMap((c) => [c.prompt, c.harder, ...c.support]), ...d.practice.probes.flatMap((p) => [p.voice, p.challenge])]);
    for (const t of s.turns.filter((x) => x.who === "character")) assert.ok([...lines].some((l) => t.text.endsWith(l) || t.text.includes(l)), "character lines come from the approved design");
    for (const e of s.evidence) assert.equal(e.basis, "observed"); }
});
