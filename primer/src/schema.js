// Schemas and validation for Primer records. Validation returns a list of human-readable errors (empty = valid).
export const DESIGN_STATES = ["draft", "revised", "test-approved", "educator-approved", "rejected", "superseded"];
export const TEMPLATES = { roleplay: "Roleplay", teachback: "Teachback" };
export const WORLDS = { none: "No 3D world (conversation only)", cave: "Limestone cave (3D field site)" };

const str = (v) => typeof v === "string" && v.trim().length > 0;
const arr = (v) => Array.isArray(v);

export function validateIntake(x) {
  const e = [];
  if (!x || typeof x !== "object") return ["Intake is missing."];
  if (!str(x.id)) e.push("Intake needs an id.");
  if (!str(x.objective)) e.push("A learning objective is required.");
  if (!str(x.learners)) e.push("A description of the learners is required.");
  if (!arr(x.materials) || !x.materials.some((m) => str(m.text))) e.push("At least one piece of instructional material is required.");
  if (!str(x.studentWork)) e.push("Describe the work students should do.");
  if (!arr(x.evidenceOfProgress) || !x.evidenceOfProgress.length) e.push("List at least one piece of evidence of progress.");
  if (x.template && !TEMPLATES[x.template]) e.push(`Unknown template "${x.template}".`);
  if (x.world && !WORLDS[x.world]) e.push(`Unknown world "${x.world}".`);
  return e;
}

export function validateDesign(d) {
  const e = [];
  if (!d || typeof d !== "object") return ["Design is missing."];
  for (const k of ["id", "intakeId", "title"]) if (!str(d[k])) e.push(`Design needs ${k}.`);
  if (!Number.isInteger(d.version) || d.version < 1) e.push("Design needs a version number.");
  if (!DESIGN_STATES.includes(d.state)) e.push(`Unknown design state "${d.state}".`);
  if (!TEMPLATES[d.template]) e.push("Design needs a known template.");
  if (!d.goal || !str(d.goal.text)) e.push("Design needs a learning goal.");
  if (!d.learnerRole || !str(d.learnerRole.text)) e.push("Design needs a learner role.");
  if (!d.character || !str(d.character.name) || !str(d.character.role)) e.push("Design needs a character with a name and role.");
  if (!arr(d.criteria) || !d.criteria.length) e.push("Design needs at least one success criterion.");
  else d.criteria.forEach((c, i) => { if (!str(c.id) || !str(c.text)) e.push(`Criterion ${i + 1} needs an id and text.`); if (!arr(c.lookFors) || !c.lookFors.length) e.push(`Criterion ${i + 1} needs look-fors.`); });
  if (!arr(d.misconceptions)) e.push("Design needs a misconceptions list (may be empty).");
  if (!d.preparation || !str(d.preparation.briefing) || !arr(d.preparation.activation) || !d.preparation.activation.length) e.push("Design needs a preparation briefing and at least one activation question.");
  if (!d.practice || !str(d.practice.opening) || !arr(d.practice.challenges) || !d.practice.challenges.length) e.push("Design needs a practice opening and challenges.");
  else d.practice.challenges.forEach((c, i) => { if (!d.criteria?.some((k) => k.id === c.criterionId)) e.push(`Challenge ${i + 1} is not tied to a criterion.`); });
  if (!d.feedback || !arr(d.feedback.selfAssessment) || !str(d.feedback.transfer)) e.push("Design needs self-assessment questions and a transfer question.");
  if (!d.prompts || !str(d.prompts.character) || !str(d.prompts.assessor) || !str(d.prompts.feedback)) e.push("Design needs derived prompts.");
  if (!arr(d.history)) e.push("Design needs a history.");
  return e;
}

export function validatePackage(p) {
  const e = [];
  if (!p || typeof p !== "object") return ["Experience package is missing."];
  if (!str(p.id) || !str(p.designId)) e.push("Package needs an id and a designId.");
  if (!p.approval || !["educator", "test"].includes(p.approval.type) || !str(p.approval.by) || !str(p.approval.at)) e.push("Package needs a recorded approval (educator or test).");
  if (!p.design) e.push("Package needs the approved design snapshot.");
  else { const de = validateDesign(p.design); if (de.length) e.push(...de.map((x) => "Design: " + x));
    if (!["educator-approved", "test-approved"].includes(p.design.state)) e.push("Package design is not in an approved state.");
    if (p.approval && ((p.approval.type === "educator") !== (p.design.state === "educator-approved"))) e.push("Package approval type does not match the design state."); }
  return e;
}

export function validateSession(s) {
  const e = [];
  if (!s || typeof s !== "object") return ["Session is missing."];
  if (!str(s.id) || !str(s.packageId)) e.push("Session needs an id and packageId.");
  if (!["preparation", "practice", "feedback", "ended"].includes(s.phase)) e.push(`Unknown phase "${s.phase}".`);
  for (const k of ["turns", "events", "evidence", "adaptations"]) if (!arr(s[k])) e.push(`Session needs ${k}.`);
  const turnIds = new Set((s.turns || []).map((t) => t.id));
  (s.evidence || []).forEach((ev) => { if (!turnIds.has(ev.turnId) && !(s.events || []).some((x) => x.id === ev.turnId)) e.push(`Evidence ${ev.id} cites a turn that does not exist.`); });
  (s.adaptations || []).forEach((a) => { if (!str(a.goalRef)) e.push(`Adaptation ${a.id} is not tied to a goal.`); });
  return e;
}
