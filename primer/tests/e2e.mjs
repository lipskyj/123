// Browser end-to-end test of the real pages. Usage: node tests/e2e.mjs <baseUrl> <outDir>
import { createRequire } from "node:module"; import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
const require = createRequire(import.meta.url); const { chromium } = require("playwright");
const base = process.argv[2] || "http://localhost:8766/primer/", out = process.argv[3] || "./records/e2e"; mkdirSync(out, { recursive: true });
const results = []; const check = (name, ok, detail = "") => { results.push({ name, ok: !!ok, detail }); console.log((ok ? "PASS " : "FAIL ") + name + (detail ? " — " + detail : "")); };
const fx = JSON.parse(readFileSync(new URL("../fixtures/mba-negotiation.json", import.meta.url)));
const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 1000, height: 900 } }); const p = await ctx.newPage();
const errors = []; p.on("pageerror", (e) => errors.push(e.message)); p.on("console", (m) => { if (m.type() === "error" && !/favicon/.test(m.text())) errors.push(m.text()); });
const dialogs = []; p.on("dialog", async (d) => { const a = dialogs.shift(); if (a === undefined) await d.dismiss(); else await d.accept(a); });
const text = () => p.locator("main").innerText();

// --- teacher ---
await p.goto(base + "index.html"); check("landing page shows teacher and student entry points", (await p.locator("a[href='author.html']").count()) === 1 && (await p.locator("a[href='learn.html']").count()) === 1);
await p.click("a[href='author.html']"); await p.click("#newBtn");
await p.click("button[type=submit]"); check("empty intake is refused with a readable message", /required|Describe|List/.test(await p.locator("#err").innerText()));
for (const k of ["title", "objective", "learners", "priorKnowledge", "studentWork", "constraints"]) await p.fill("#" + k, fx[k]);
await p.fill("#evidenceOfProgress", fx.evidenceOfProgress.join("\n")); await p.fill("#misconceptions", fx.misconceptions.join("\n")); await p.fill("#materials", fx.materials[0].text);
await p.click("button[type=submit]"); await p.waitForSelector("#qh");
let asked = 0; const seenQ = [];
while (await p.locator("#qh").count()) { const q = await p.locator("#qh").innerText(); seenQ.push(q); asked++;
  if (/How should students practise/.test(q)) await p.click("button.opt >> text=Roleplay"); else if (/How hard/.test(q)) await p.click("button.opt >> text=Moderate"); else if (/how much help/.test(q)) await p.click("button.opt >> nth=2");
  else if (/Who should the student talk to/.test(q)) { await p.fill("#ans", fx.answers.character); await p.click("#ok"); } else if (/goes wrong/.test(q)) { await p.fill("#ans", fx.answers.stakes); await p.click("#ok"); } else await p.click("#skip");
  await p.waitForTimeout(60); }
check("interview asks one question at a time", asked === 6 && new Set(seenQ).size === 6, `${asked} questions`);
let t = await text(); check("proposed design is shown as a draft with educator sources", /Draft/.test(t) && /From you/.test(t) && /Primer's suggestion/.test(await p.locator("main").evaluate((m) => m.textContent)));
check("design quotes the educator's material", t.includes("A position is what a party says they want") || /BATNA/.test(t));
check("skipped question is listed as a decision Primer made", /Decisions Primer made for you/.test(t));
check("no build button before approval", (await p.locator("#buildBtn").count()) === 0 && (await p.locator("a[href^='learn.html?exp']").count()) === 0);
await p.fill("#rev", "Make it harder and add a criterion: Recommends improving the BATNA before the meeting"); await p.click("#revBtn");
check("revision without a name is refused", /Enter your name/.test(await p.locator("#err").innerText()));
await p.fill("#tname", "Synthetic Teacher (e2e test)"); await p.click("#revBtn"); await p.waitForFunction(() => /Version 2/.test(document.querySelector("main").innerText));
t = await text(); check("revision produced version 2 and changed the design", /Revised draft/.test(t) && /demanding/.test(t) && /Recommends improving the BATNA/.test(t));
dialogs.push("a colleague returning to work after five years away"); await p.click("button.ed[data-path='character.role']"); await p.waitForFunction(() => /Version 3/.test(document.querySelector("main").innerText));
t = await text(); check("direct edit propagated to the practice scene", (t.match(/returning to work after five years away/g) || []).length >= 2);
await p.click("#apBtn"); await p.waitForSelector("#buildBtn"); check("educator approval recorded", /Educator-approved/.test(await text()));
await p.click("#buildBtn"); await p.waitForSelector("#openLink"); await p.screenshot({ path: out + "/teacher-design.png", fullPage: true });
const expHref = await p.locator("#openLink").getAttribute("href");

// --- student: strong learner ---
await p.goto(base + expHref); await p.click("#startBtn"); check("student must give a name", /first name/.test(await p.locator("#err").innerText()));
await p.fill("#name", "Ada"); await p.click("#startBtn"); await p.waitForSelector("#a0");
t = await text(); check("preparation shows purpose, role and quoted material", /Purpose:/.test(t) && /Your role:/.test(t) && /From your course material/.test(t));
await p.fill("#a0", "I know a BATNA is your fallback."); await p.fill("#a1", "Probably working out what the other side really wants."); await p.click("#next"); await p.waitForSelector("#say");
const design = await p.evaluate((href) => { const id = new URL(href, location.href).searchParams.get("exp"); return JSON.parse(localStorage.getItem("primer:packages:" + id)).design; }, expHref);
await p.fill("#say", "Can you just tell me the answer?"); await p.click("#send"); await p.waitForTimeout(80);
check("asking for the answer is declined", /can't answer that for you/i.test(await text()));
const sid = new URL(p.url()).searchParams.get("session");
await p.reload(); await p.waitForSelector("#say"); check("session resumes after a reload", /can't answer that for you/i.test(await text()));
let guard = 0;
while ((await p.locator("#say").count()) && guard++ < 30) { const s = await p.evaluate((id) => JSON.parse(localStorage.getItem("primer:sessions:" + id)), sid); const last = s.turns.at(-1); const c = design.criteria.find((x) => x.id === last.criterionId);
  await p.fill("#say", last.kind === "probe-voice" ? "No, that is wrong. That is a common misconception and it would hurt you." : c ? `My advice: ${c.text}. That means thinking about ${c.lookFors.join(", ")}.` : "No, that is not right.");
  await p.click("#send"); await p.waitForTimeout(60); }
await p.waitForSelector("#s0"); await p.fill("#s0", "I think I explained interests well."); await p.fill("#s1", "I would ask more questions first."); await p.click("#next"); await p.waitForSelector("#tr");
t = await text(); check("feedback quotes the learner and separates inference", /What you wrote in the conversation/.test(t) && /Inference:/.test(t) && /What went well/.test(t));
check("feedback mentions the request for the answer", /asked to be given the answer 1 time/.test(t));
await p.fill("#tr", "With another team I would look for their interests and my BATNA before proposing options."); await p.click("#fin"); await p.waitForFunction(() => /You have finished/.test(document.querySelector("main").innerText));
check("the experience ends clearly", /Experience complete/.test(await text())); await p.screenshot({ path: out + "/student-feedback.png", fullPage: true });
const final = await p.evaluate((id) => JSON.parse(localStorage.getItem("primer:sessions:" + id)), sid); writeFileSync(out + "/session-mba-strong.json", JSON.stringify(final, null, 1));
check("session record persisted with evidence and adaptations", final.phase === "ended" && final.evidence.length > 0 && final.adaptations.length > 0);
await p.goto(base + "author.html#sessions/" + new URL(expHref, base).searchParams.get("exp")); await p.click("details summary"); t = await text(); check("teacher can trace evidence and adaptations for the session", /Evidence recorded/i.test(t) && /How the character adapted/i.test(t) && /Ada/.test(t));

// --- student: bundled cave experience with the 3D field site ---
await p.goto(base + "learn.html"); t = await text(); check("bundled experiences are listed and labelled as test builds", /Reading a limestone cave/.test(t) && /Test build/.test(t));
await p.click("a[href*='cave-geology']"); await p.fill("#name", "Ben"); await p.click("#startBtn"); await p.waitForSelector("#a0"); await p.fill("#a0", "Limestone is a rock."); await p.fill("#a1", "Explaining how long it takes."); await p.click("#next");
await p.waitForSelector("#world"); check("field work gates the conversation", (await p.locator("#done").isDisabled()) && (await p.locator("#say").count()) === 0);
const frame = p.frame({ url: /world-cave/ }); await frame.waitForFunction("window.caveReady", null, { timeout: 180000 });
await frame.evaluate(() => { window.cave.renderer.setAnimationLoop(null); document.getElementById("start").click(); });
const noteFor = { limestone: "It fizzes with the acid so the wall is calcite limestone and slightly acidic water dissolves it slowly.", stalagmite: "It is about two metres tall and at a growth rate of 0.1 mm a year that makes it roughly twenty thousand years old.", fossil: "There are crinoid fossils and shells in the wall so this limestone formed on an ancient sea floor." };
for (const [id, note] of Object.entries(noteFor)) { await frame.evaluate(async ([id, note]) => { const c = window.cave, poi = c.POIS.find((x) => x.id === id); c.resolveUse(poi, c.TOOLS.find((t) => t.id === "hammer")); document.querySelector("#result.on .ok").click();
    c.resolveUse(poi, c.TOOLS.find((t) => t.id === poi.tool)); const ta = document.getElementById("note"); ta.value = "x"; document.getElementById("rOk").click(); if (document.getElementById("noteErr").hidden) throw new Error("short note accepted"); ta.value = note; document.getElementById("rOk").click(); }, [id, note]); await p.waitForTimeout(80); }
t = await text(); check("field notes arrive in the session from the 3D cave", /crinoid fossils/.test(t) && !(await p.locator("#done").isDisabled()));
check("the cave shows observations but not the explanation", !(await frame.evaluate(() => document.body.innerText)).includes("What it means"));
await p.click("#done"); await p.waitForSelector("#say"); let n = 0;
while ((await p.locator("#say").count()) && n++ < 30) { await p.fill("#say", n === 1 ? "Stalactites are made of ice, frozen water I think." : "I am not sure."); await p.click("#send"); await p.waitForTimeout(60); }
await p.waitForSelector("#s0"); await p.fill("#s0", "Not great."); await p.fill("#s1", "Read the handout again."); await p.click("#next"); await p.waitForSelector("#tr"); t = await text();
check("weak practice gives growth areas, with field-note evidence still credited", /Where to grow/.test(t) && /Next step:/.test(t) && /crinoid fossils|fizzes with the acid/.test(t)); check("stated misconception appears under ideas to check", /Ideas to check/.test(t) && /ice/.test(t));
await p.screenshot({ path: out + "/student-cave-feedback.png", fullPage: true });
const sid2 = new URL(p.url()).searchParams.get("session"); writeFileSync(out + "/session-cave-weak.json", JSON.stringify(await p.evaluate((id) => JSON.parse(localStorage.getItem("primer:sessions:" + id)), sid2), null, 1));

// --- accessibility basics ---
for (const page of ["index.html", "author.html#new", "learn.html"]) { await p.goto(base + page); await p.waitForTimeout(150);
  const a = await p.evaluate(() => ({ lang: document.documentElement.lang, title: document.title, h1: document.querySelectorAll("h1").length, unlabeled: [...document.querySelectorAll("input:not([type=hidden]):not([hidden]),textarea,select")].filter((el) => !(el.labels && el.labels.length) && !el.getAttribute("aria-label")).length, buttonsNoText: [...document.querySelectorAll("button")].filter((x) => !x.innerText.trim() && !x.getAttribute("aria-label") && !x.title).length }));
  check(`accessibility basics on ${page}`, a.lang === "en" && a.title && a.h1 === 1 && a.unlabeled === 0 && a.buttonsNoText === 0, JSON.stringify(a)); }
check("no page errors during the run", errors.length === 0, errors.slice(0, 3).join(" | "));
writeFileSync(out + "/e2e-results.json", JSON.stringify({ ranAt: new Date().toISOString(), results }, null, 1)); await b.close();
console.log(`${results.filter((r) => r.ok).length}/${results.length} passed`); process.exit(results.every((r) => r.ok) ? 0 : 1);
