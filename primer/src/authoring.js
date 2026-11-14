// Educator-facing authoring: intake -> one-question-at-a-time interview -> proposed design -> edit / revise ->
// approve or reject -> build an experience package. All records are persisted through the store.
import { validateIntake, validateDesign, validatePackage } from "./schema.js";
import { approve, reject, supersede, isApproved } from "./states.js";
import { setPath } from "./provider.js";
import { hash, splitList } from "./text.js";

const now = () => new Date().toISOString();

export function createAuthoring(store, provider) {
  const A_latest = (intakeId) => versions(intakeId).at(-1);
  const versions = (intakeId) => store.list("designs").filter((d) => d.intakeId === intakeId).sort((a, b) => a.version - b.version);
  const latest = (intakeId) => versions(intakeId).at(-1) || null;

  function saveIntake(fields) {
    const intake = { id: fields.id || "intake-" + hash(now() + Math.random()), createdAt: fields.createdAt || now(), answers: [], ...fields,
      misconceptions: Array.isArray(fields.misconceptions) ? fields.misconceptions : splitList(fields.misconceptions),
      evidenceOfProgress: Array.isArray(fields.evidenceOfProgress) ? fields.evidenceOfProgress : splitList(fields.evidenceOfProgress) };
    const errors = validateIntake(intake); if (errors.length) { const e = new Error(errors.join(" ")); e.errors = errors; throw e; }
    return store.put("intakes", intake);
  }
  // The next unanswered interview question, or null when the interview is complete.
  function nextQuestion(intakeId) {
    const intake = store.get("intakes", intakeId); const done = new Set(intake.answers.map((a) => a.qid));
    return provider.interviewQuestions(intake).find((q) => !done.has(q.id)) || null;
  }
  function answer(intakeId, qid, text, skipped = false) {
    const intake = store.get("intakes", intakeId); const q = provider.interviewQuestions(intake).find((x) => x.id === qid); if (!q) throw new Error("Unknown question.");
    intake.answers = intake.answers.filter((a) => a.qid !== qid).concat({ qid, question: q.text, answer: skipped ? "" : text, skipped, at: now() });
    return store.put("intakes", intake);
  }
  function propose(intakeId) {
    const intake = store.get("intakes", intakeId); if (!intake) throw new Error("Intake not found.");
    if (latest(intakeId)) throw new Error("A design already exists for this intake. Revise it instead of proposing again.");
    const design = provider.proposeDesign(intake); const errors = validateDesign(design); if (errors.length) throw new Error("Proposed design is invalid: " + errors.join(" "));
    return store.put("designs", design);
  }
  // Any change makes a new version; the previous version is superseded and stays on record.
  function newVersion(prev, next, actor, action, note) {
    next.id = "design-" + hash(prev.intakeId + ":v" + (prev.version + 1)); next.version = prev.version + 1; next.state = "revised"; next.supersedes = prev.id; next.createdAt = now();
    next.history = [...prev.history, { at: now(), actor, action, from: prev.state, to: "revised", note }];
    const errors = validateDesign(next); if (errors.length) throw new Error("The change would make the design invalid: " + errors.join(" "));
    store.put("designs", supersede(prev, { type: "system", name: "Primer" }, `Superseded by version ${next.version}.`));
    return store.put("designs", next);
  }
  function current(designId) { const d = store.get("designs", designId); if (!d) throw new Error("Design not found."); if (d.state === "superseded") throw new Error("This version has been superseded. Open the latest version."); return d; }

  function revise(designId, request, actor) {
    const prev = current(designId); if (!request || !request.trim()) throw new Error("Describe the change you want.");
    const { design, changes, understood } = provider.reviseDesign(prev, request);
    return { design: newVersion(prev, design, actor, "revise", request), changes, understood };
  }
  // Direct edit of one field. Core fields re-derive everything downstream; derived text is kept as an override.
  const CORE = /^(title|goal\.text|learnerRole\.text|learnerProfile\.(text|priorKnowledge)|character\.(name|role)|stakes\.text|transfer\.text|difficulty|helpPolicy|template|criteria\.\d+\.(text|lookFors|question)|misconceptions\.\d+\.text|constraints|notes)$/;
  const ENUM = { difficulty: ["gentle", "moderate", "demanding"], helpPolicy: ["none", "questions", "questions-then-materials"], template: ["roleplay", "teachback"] };
  function edit(designId, path, value, actor) {
    const prev = current(designId); const d = structuredClone(prev);
    if (ENUM[path]) { value = String(value).trim().toLowerCase(); if (!ENUM[path].includes(value)) throw new Error(`Choose one of: ${ENUM[path].join(", ")}.`); }
    if (path === "practice.maxTurns") { value = parseInt(value, 10); if (!(value >= 2 && value <= 40)) throw new Error("Enter a number of replies between 2 and 40."); }
    if (CORE.test(path)) { const mq = path.match(/^criteria\.(\d+)\.question$/); if (mq) d.criteria[+mq[1]].question = String(value).trim(); else if (!setPath(d, path, value)) throw new Error("Unknown field " + path); delete d.overrides[path];
      // An edited field now comes from the educator: update its source and drop the matching "Primer decided" note.
      const top = path.split(".")[0], owner = d[top]; if (owner && typeof owner === "object" && !Array.isArray(owner)) { const k = path === "character.name" ? "nameSource" : "source"; if (owner[k]) owner[k] = { kind: "teacher", field: "edit" }; }
      d.assumptions = d.assumptions.filter((a) => !(a.field === path || a.field === top || (mq && a.field === "questions" && d.criteria.every((c) => c.question))));
      const mm = path.match(/^misconceptions\.(\d+)\.text$/); if (mm) d.misconceptions[+mm[1]].cues = [];
    } else { if (!setPath(d, path, value)) throw new Error("Unknown field " + path); d.overrides[path] = value; }
    d.revisions.push({ id: "rev" + (d.revisions.length + 1), at: now(), request: `Direct edit of ${path}`, changes: [`${path} edited by ${actor.name}`], understood: true });
    return newVersion(prev, provider.derive(d), actor, "edit", `Edited ${path}`);
  }
  function setRecommendation(designId, recId, accepted, actor) {
    const d = current(designId); const r = d.recommendations.find((x) => x.id === recId); if (!r) throw new Error("Unknown recommendation."); r.accepted = accepted;
    d.history.push({ at: now(), actor, action: accepted ? "accept-recommendation" : "decline-recommendation", from: d.state, to: d.state, note: r.text }); return store.put("designs", d);
  }
  const approveDesign = (designId, actor, note) => store.put("designs", approve(current(designId), actor, note));
  // Rejecting an approved design withdraws every experience built from it.
  function rejectDesign(designId, actor, note) { const d = store.put("designs", reject(current(designId), actor, note));
    for (const p of store.list("packages").filter((x) => x.designId === designId && !x.withdrawn)) store.put("packages", { ...p, withdrawn: { at: now(), by: actor.name, reason: "withdrawn" } }); return d; }
  // Restoring an old version copies it into a new draft that needs approval.
  function restore(designId, actor) { const old = store.get("designs", designId); if (!old) throw new Error("Version not found."); const prev = A_latest(old.intakeId);
    if (prev.id === old.id) throw new Error("This is already the latest version."); const next = structuredClone(old); next.state = prev.state; return newVersion(prev, next, actor, "restore", `Restored version ${old.version}`); }
  // The copy given to students: everything the runtime needs, nothing the teacher marked private.
  function studentCopy(d) { const c = structuredClone(d); c.learnerProfile = { text: "", priorKnowledge: "", source: c.learnerProfile.source }; c.constraints = []; c.notes = []; c.assumptions = []; c.recommendations = []; c.revisions = []; c.overrides = {};
    c.prompts = { character: "Withheld from the student copy.", assessor: "Withheld from the student copy.", feedback: "Withheld from the student copy." };
    c.history = c.history.filter((h) => h.action === "approve").slice(-1).map((h) => ({ ...h, note: "" })); return c; }

  // Build the learner experience. Refused unless the design is approved; the package records who approved it and how.
  function build(designId) {
    const d = store.get("designs", designId); if (!d) throw new Error("Design not found.");
    if (!isApproved(d)) throw new Error(`This design is "${d.state}". Only an approved design can be built into a learner experience.`);
    const ap = [...d.history].reverse().find((h) => h.action === "approve");
    const pkg = { id: "exp-" + hash(d.id + d.state), designId: d.id, designVersion: d.version, title: d.title, builtAt: now(), provider: provider.name,
      approval: { type: d.state === "educator-approved" ? "educator" : "test", by: ap.actor.name, at: ap.at }, design: studentCopy(d) };
    const errors = validatePackage(pkg); if (errors.length) throw new Error("Package invalid: " + errors.join(" "));
    for (const old of store.list("packages").filter((x) => x.design.intakeId === d.intakeId && x.id !== pkg.id && !x.withdrawn)) store.put("packages", { ...old, withdrawn: { at: now(), by: "Primer", reason: "replaced" } });
    return store.put("packages", pkg);
  }
  // How each part of the design traces back to educator input.
  function trace(designId) {
    const d = store.get("designs", designId), intake = store.get("intakes", d.intakeId), rows = [];
    const add = (element, value, src) => rows.push({ element, value, from: src.kind === "teacher" ? `Educator: ${src.field}` : `Primer suggestion (${src.field})`, kind: src.kind });
    add("Learning goal", d.goal.text, d.goal.source); add("Learner role", d.learnerRole.text, d.learnerRole.source); add("Character", `${d.character.name}, ${d.character.role}`, d.character.source);
    add("Stakes", d.stakes.text, d.stakes.source); d.criteria.forEach((c) => add(`Criterion ${c.id.slice(1)}`, c.text, c.source)); d.misconceptions.forEach((m) => add(`Misconception ${m.id.slice(1)}`, m.text, m.source));
    d.concepts.forEach((c) => rows.push({ element: `Key point "${c.term}"`, value: c.fact, from: `Educator material: ${c.source.material}`, kind: "teacher" }));
    d.revisions.forEach((r) => rows.push({ element: `Change ${r.id.slice(3)}`, value: r.changes.join("; "), from: `Educator request: "${r.request}"`, kind: "teacher" }));
    return { intake, rows };
  }
  return { saveIntake, nextQuestion, answer, propose, revise, edit, setRecommendation, approveDesign, rejectDesign, restore, build, versions, latest, trace };
}
