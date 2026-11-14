// Design lifecycle. Every change of state goes through here so approval can be enforced and audited.
import { DESIGN_STATES } from "./schema.js";

export const APPROVED = ["educator-approved", "test-approved"];
const ALLOWED = {
  draft: ["revised", "test-approved", "educator-approved", "rejected", "superseded"],
  revised: ["revised", "test-approved", "educator-approved", "rejected", "superseded"],
  "test-approved": ["educator-approved", "rejected", "superseded"],
  "educator-approved": ["superseded", "rejected"],
  rejected: ["superseded"],
  superseded: [],
};
export const STATE_LABEL = { draft: "Draft", revised: "Revised draft", "test-approved": "Test-approved (not for classroom use)", "educator-approved": "Educator-approved", rejected: "Rejected", superseded: "Superseded by a newer version" };

export function canTransition(from, to) { return DESIGN_STATES.includes(to) && (ALLOWED[from] || []).includes(to); }

function move(design, to, actor, action, note) {
  if (!canTransition(design.state, to)) throw new Error(`A design that is "${STATE_LABEL[design.state]}" cannot become "${STATE_LABEL[to]}".`);
  if (!actor || !["educator", "test", "system"].includes(actor.type) || !actor.name) throw new Error("Every state change needs a named actor (educator, test or system).");
  return { ...design, state: to, history: [...design.history, { at: new Date().toISOString(), actor, action, from: design.state, to, note: note || "" }] };
}

// Approval. A synthetic/test actor can only ever produce "test-approved"; only an educator produces classroom approval.
export function approve(design, actor, note) {
  if (!actor || !["educator", "test"].includes(actor.type)) throw new Error("Only an educator (or a labelled test actor) can approve a design.");
  return move(design, actor.type === "educator" ? "educator-approved" : "test-approved", actor, "approve", note);
}
export const reject = (design, actor, note) => move(design, "rejected", actor, "reject", note);
export const supersede = (design, actor, note) => move(design, "superseded", actor, "supersede", note);
export const isApproved = (design) => APPROVED.includes(design.state);
export const isClassroomApproved = (design) => design.state === "educator-approved";
