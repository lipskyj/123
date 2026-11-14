// Builds the bundled sample experiences by running the fixture briefs through the normal authoring steps.
// Approval here is synthetic and is recorded as TEST approval: these are test builds, not classroom-approved.
import { writeFileSync } from "node:fs";
import { setup, author, TEST } from "../tests/helpers.mjs";
const index = [];
for (const name of ["mba-negotiation", "cave-geology"]) {
  const env = setup(), { design } = author(env, name); const pkg = env.authoring.build(env.authoring.approveDesign(design.id, TEST, "Synthetic approval for the bundled sample.").id);
  const file = `experiences/${name}.primer.json`; writeFileSync(new URL("../" + file, import.meta.url), JSON.stringify({ packages: [pkg] }, null, 1));
  index.push({ id: pkg.id, title: pkg.title, goal: pkg.design.goal.text, approval: pkg.approval.type, file });
}
writeFileSync(new URL("../experiences/index.json", import.meta.url), JSON.stringify(index, null, 1)); console.log("built", index.map((x) => x.id).join(", "));
