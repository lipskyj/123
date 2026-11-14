// Re-derives a design from an older experience file on the current build, keeping the teacher's own text and
// edits, and builds a new package with TEST approval (the original educator approval does not carry over).
// Usage: node tools/rebuild-package.mjs <in.primer.json> <out.primer.json> "<who is rebuilding>"
import { readFileSync, writeFileSync } from "node:fs";
import { createStore, memoryBackend } from "../src/store.js";
import { DeterministicProvider } from "../src/provider.js";
import { createAuthoring } from "../src/authoring.js";
const [inp, out, who] = process.argv.slice(2);
const old = JSON.parse(readFileSync(inp, "utf8")).packages[0].design, provider = new DeterministicProvider(), store = createStore(memoryBackend()), A = createAuthoring(store, provider);
const d = provider.derive({ ...structuredClone(old), state: "revised", notes: old.notes || [], materials: old.materials || [] });
d.history = [...old.history, { at: new Date().toISOString(), actor: { type: "system", name: "Primer" }, action: "rebuild", from: old.state, to: "revised", note: `Re-derived on the current build from version ${old.version}, approved by ${old.history.filter((h) => h.action === "approve").at(-1)?.actor.name || "unknown"}.` }];
store.put("intakes", { id: d.intakeId, createdAt: d.createdAt, answers: [], materials: d.materials }); store.put("designs", d);
const pkg = A.build(A.approveDesign(d.id, { type: "test", name: who }, "Rebuilt for validation; the original educator approval applied to the earlier build.").id);
writeFileSync(out, JSON.stringify({ packages: [pkg] }, null, 1)); console.log(pkg.id, pkg.approval, "criteria:", pkg.design.criteria.length);
