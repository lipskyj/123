import { readFileSync } from "node:fs";
import { createStore, memoryBackend } from "../src/store.js";
import { DeterministicProvider } from "../src/provider.js";
import { createAuthoring } from "../src/authoring.js";
import { createRuntime } from "../src/runtime.js";

export const fixture = (name) => JSON.parse(readFileSync(new URL(`../fixtures/${name}.json`, import.meta.url)));
export const TEACHER = { type: "educator", name: "Test fixture educator (synthetic)" };
export const TEST = { type: "test", name: "Automated test" };
export function setup(provider = new DeterministicProvider()) { const store = createStore(memoryBackend()); return { store, provider, authoring: createAuthoring(store, provider), runtime: createRuntime(store, provider) }; }
// Run a fixture through the normal authoring steps and return the proposed design.
export function author(env, name) {
  const fx = fixture(name), { answers, ...fields } = fx; const intake = env.authoring.saveIntake(fields);
  for (let q; (q = env.authoring.nextQuestion(intake.id)); ) env.authoring.answer(intake.id, q.id, answers[q.id] || "", !(q.id in answers));
  return { intake, design: env.authoring.propose(intake.id) };
}
export function built(env, name, actor = TEST) { const { design } = author(env, name); const pkg = env.authoring.build(env.authoring.approveDesign(design.id, actor).id); return pkg; }
