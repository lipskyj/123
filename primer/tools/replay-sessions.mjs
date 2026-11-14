// Replays recorded student replies through the current build and saves the resulting sessions.
// The replies are fixed: they were written in response to the earlier build, so they do not react to the new character lines.
import { readFileSync, writeFileSync } from "node:fs";
import { setup, built, TEST } from "../tests/helpers.mjs";
const statsPkg = (env) => { const old = JSON.parse(readFileSync(new URL("../records/validation/statistics-experience.primer.json", import.meta.url))).packages[0].design;
  const d = env.provider.derive({ ...structuredClone(old), state: "revised", notes: [], materials: old.materials || [] });
  env.store.put("intakes", { id: d.intakeId, createdAt: d.createdAt, answers: [], materials: d.materials }); env.store.put("designs", d); return env.authoring.build(env.authoring.approveDesign(d.id, TEST).id); };
for (const [who, mk] of [["maya", statsPkg], ["leo", statsPkg], ["sam", (env) => built(env, "mba-negotiation")]]) {
  const rec = JSON.parse(readFileSync(new URL(`../records/validation/student-${who}-session.json`, import.meta.url))); const env = setup(); const pkg = mk(env);
  const said = (k) => rec.turns.filter((t) => t.who === "learner" && t.kind === k).map((t) => t.text);
  let s = env.runtime.start(pkg.id, { name: who[0].toUpperCase() + who.slice(1) + " (replay)" }); s = env.runtime.submitPreparation(s.id, said("activation-answer").map((a) => (a.split(/\s+/).length < 3 ? "I am not sure. " + a : a)));
  for (const text of said("practice")) { if (s.phase !== "practice") break; s = env.runtime.say(s.id, text); } if (s.phase === "practice") s = env.runtime.endPractice(s.id);
  s = env.runtime.submitSelfAssessment(s.id, said("self-assessment-answer")); s = env.runtime.submitTransfer(s.id, said("transfer-answer")[0] || "I am not sure.");
  writeFileSync(new URL(`../records/validation/replay-${who}-session.json`, import.meta.url), JSON.stringify({ note: "Replay of the student's recorded replies through the current build. Replies are fixed and do not respond to the new character lines.", design: pkg.design, session: s }, null, 1));
  console.log(who, "turns", s.turns.length, "strengths", s.feedback.strengths.length, "growth", s.feedback.growth.length, "not assessed", s.feedback.notAssessed.length, "misconceptions", s.feedback.misconceptions.map((m) => m.misconceptionId + ":" + m.status).join(","));
}
