import { createStore, localStorageBackend } from "../src/store.js";
import { DeterministicProvider } from "../src/provider.js";
import { createAuthoring } from "../src/authoring.js";
import { STATE_LABEL, isApproved } from "../src/states.js";
import { TEMPLATES, WORLDS } from "../src/schema.js";

const store = createStore(localStorageBackend()), provider = new DeterministicProvider(), A = createAuthoring(store, provider);
const app = document.getElementById("app");
const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const $ = (id) => document.getElementById(id);
const teacher = () => ({ type: "educator", name: localStorage.getItem("primer:teacherName") || "" });
const src = (s) => `<span class="src ${s.kind === "teacher" ? "teacher" : "ai"}">${s.kind === "teacher" ? "From you" : "Primer's suggestion"}</span>`;
const badge = (st) => `<span class="badge ${st}">${esc(STATE_LABEL[st])}</span>`;
const go = (hash) => { location.hash = hash; };
let flash = "";
function fail(e) { const n = $("err"); if (n) { n.hidden = false; n.textContent = e.message || String(e); n.focus(); } else alert(e.message || e); }

function route() {
  const [view, id] = location.hash.slice(1).split("/");
  try { ({ new: viewIntake, interview: viewInterview, design: viewDesign, sessions: viewSessions }[view] || viewHome)(id); } catch (e) { app.innerHTML = `<div class="notice bad">${esc(e.message)}</div><p><a href="#">Back to my experiences</a></p>`; }
  window.scrollTo(0, 0);
}
addEventListener("hashchange", route); $("homeBtn").onclick = () => go("");

// ---------- home ----------
function viewHome() {
  const intakes = store.list("intakes").sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  app.innerHTML = `<h1>My experiences</h1>
    <p class="dim">Each experience starts from your lesson and materials. Nothing reaches students until you approve it.</p>
    <div class="row"><button class="primary" id="newBtn">Create a new experience</button><button id="impBtn">Import a saved file</button><input type="file" id="impFile" accept=".json" hidden><button id="expBtn">Download everything as a file</button></div>
    ${intakes.length ? "" : `<div class="card"><p>You have not created anything yet.</p><p class="dim small">You will be asked for a learning objective, who your students are, what they should do, and the material they have studied. It takes about ten minutes.</p></div>`}
    ${intakes.map((i) => { const d = A.latest(i.id); const next = d ? `#design/${d.id}` : `#interview/${i.id}`;
      return `<div class="card"><div class="row"><b>${esc(i.title || i.objective)}</b>${d ? badge(d.state) + ` <span class="dim small">version ${d.version}</span>` : `<span class="badge">Interview not finished</span>`}<span style="flex:1"></span><a href="${next}">${d ? "Open design" : "Continue"}</a></div><p class="dim small" style="margin:6px 0 0">${esc(i.objective)}</p></div>`; }).join("")}`;
  $("newBtn").onclick = () => go("new");
  $("expBtn").onclick = () => download("primer-export.json", store.exportAll());
  $("impBtn").onclick = () => $("impFile").click();
  $("impFile").onchange = async (e) => { try { const n = store.importAll(JSON.parse(await e.target.files[0].text())); flash = `Imported ${n} records.`; route(); } catch (err) { alert("That file could not be read: " + err.message); } };
}
function download(name, data) { const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" })); a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000); }

// ---------- step 1: intake ----------
function viewIntake() {
  app.innerHTML = `<div class="steps"><span class="on">1 Your lesson</span><span>2 A few questions</span><span>3 Review the design</span><span>4 Approve and open</span></div>
    <h1>Tell Primer about the lesson</h1><p class="dim">Write the way you would explain it to a colleague. You can change everything later.</p>
    <div id="err" class="notice bad" hidden tabindex="-1" role="alert"></div>
    <form id="f" novalidate>
      <label for="title">Short title</label><input type="text" id="title" autocomplete="off">
      <label for="objective">Learning objective<span class="hint">What should students be able to do afterwards?</span></label><textarea id="objective"></textarea>
      <label for="learners">Your students<span class="hint">Age or level, and anything that affects how they should be spoken to.</span></label><textarea id="learners"></textarea>
      <label for="priorKnowledge">What they already know<span class="hint">Optional.</span></label><textarea id="priorKnowledge"></textarea>
      <label for="studentWork">What students should do in the experience<span class="hint">For example: advise a client, explain a process to a newcomer, decide between options.</span></label><textarea id="studentWork"></textarea>
      <label for="evidenceOfProgress">Evidence of progress<span class="hint">One per line. What would you see or hear from a student who is getting it? These become the success criteria.</span></label><textarea id="evidenceOfProgress"></textarea>
      <label for="misconceptions">Common misconceptions<span class="hint">One per line. Optional, but the character can test for them.</span></label><textarea id="misconceptions"></textarea>
      <label for="constraints">Classroom constraints<span class="hint">Optional. Anything the experience must respect, one per line.</span></label><textarea id="constraints"></textarea>
      <label for="materials">Instructional material<span class="hint">Paste the text students have studied, or add text files. The preparation briefing quotes from it.</span></label><textarea id="materials" class="big"></textarea>
      <div class="row" style="margin-top:6px"><input type="file" id="files" accept=".txt,.md,.csv,text/plain" multiple aria-label="Add text files"><span class="dim small" id="fileNote"></span></div>
      <label for="template">Kind of practice</label><select id="template"><option value="">Let Primer suggest, then ask me</option>${Object.entries(TEMPLATES).map(([k, v]) => `<option value="${k}">${v}</option>`).join("")}</select>
      <label for="world">Setting</label><select id="world">${Object.entries(WORLDS).map(([k, v]) => `<option value="${k}">${v}</option>`).join("")}</select>
      <div class="row end" style="margin-top:18px"><button type="submit" class="primary">Continue</button></div>
    </form>`;
  const files = [];
  $("files").onchange = async (e) => { for (const f of e.target.files) files.push({ name: f.name, text: await f.text() }); $("fileNote").textContent = files.length ? `${files.length} file(s) added: ${files.map((f) => f.name).join(", ")}` : ""; };
  $("f").onsubmit = (e) => { e.preventDefault(); const v = (id) => $(id).value.trim();
    const materials = [...(v("materials") ? [{ name: "Pasted material", text: v("materials") }] : []), ...files];
    try { const intake = A.saveIntake({ title: v("title"), objective: v("objective"), learners: v("learners"), priorKnowledge: v("priorKnowledge"), studentWork: v("studentWork"), evidenceOfProgress: v("evidenceOfProgress"), misconceptions: v("misconceptions"), constraints: v("constraints"), materials, template: v("template") || null, world: v("world") });
      go("interview/" + intake.id); } catch (err) { fail(err); } };
}

// ---------- step 2: interview, one question at a time ----------
function viewInterview(intakeId) {
  const intake = store.get("intakes", intakeId); if (!intake) throw new Error("That experience was not found in this browser.");
  if (A.latest(intakeId)) return go("design/" + A.latest(intakeId).id);
  const q = A.nextQuestion(intakeId), total = provider.interviewQuestions(intake).length, n = intake.answers.length + 1;
  if (!q) { const d = A.propose(intakeId); flash = "Here is the design Primer proposes. Nothing is final until you approve it."; return go("design/" + d.id); }
  app.innerHTML = `<div class="steps"><span class="done">1 Your lesson</span><span class="on">2 A few questions</span><span>3 Review the design</span><span>4 Approve and open</span></div>
    <p class="dim small">Question ${n} of ${total}</p><h1 id="qh">${esc(q.text)}</h1><p class="dim">${esc(q.why)}</p>
    <div id="err" class="notice bad" hidden tabindex="-1" role="alert"></div>
    ${q.options ? `<div class="row" role="group" aria-labelledby="qh">${q.options.map((o, i) => `<button class="opt" data-i="${i}">${esc(o)}</button>`).join("")}</div>` : `<label for="ans" class="sr">Your answer</label><textarea id="ans"></textarea><div class="row end" style="margin-top:10px"><button class="primary" id="ok">Continue</button></div>`}
    <p style="margin-top:16px"><button class="link" id="skip">I'm not sure — let Primer suggest, and show me what it chose</button></p>`;
  const next = (text, skipped) => { try { A.answer(intakeId, q.id, text, skipped); route(); } catch (e) { fail(e); } };
  app.querySelectorAll(".opt").forEach((b) => (b.onclick = () => next(q.options[+b.dataset.i], false)));
  if ($("ok")) { $("ok").onclick = () => ($("ans").value.trim() ? next($("ans").value.trim(), false) : fail(new Error("Write an answer, or choose the option below to let Primer suggest."))); $("ans").focus(); }
  $("skip").onclick = () => next("", true);
}

// ---------- step 3 and 4: review, revise, approve, build ----------
function viewDesign(designId) {
  const d = store.get("designs", designId); if (!d) throw new Error("That design was not found in this browser.");
  const versions = A.versions(d.intakeId), newest = versions.at(-1), live = d.state !== "superseded", editable = live && !isApproved(d) && d.state !== "rejected";
  const pkg = store.list("packages").find((p) => p.designId === d.id && p.design.state === d.state);
  const F = (label, value, s, path) => `<div class="field"><div class="k">${label}${s ? src(s) : ""}${path && editable ? ` <button class="link ed" data-path="${path}" data-label="${esc(label)}">Edit</button>` : ""}</div><div class="v">${esc(value)}</div></div>`;
  const msg = flash; flash = "";
  app.innerHTML = `<div class="steps"><span class="done">1 Your lesson</span><span class="done">2 A few questions</span><span class="${isApproved(d) ? "done" : "on"}">3 Review the design</span><span class="${isApproved(d) ? "on" : ""}">4 Approve and open</span></div>
    <h1>${esc(d.title)}</h1><div class="row">${badge(d.state)}<span class="dim small">Version ${d.version} of ${versions.length} · ${TEMPLATES[d.template]}${d.world ? " · " + esc(WORLDS[d.world]) : ""}</span></div>
    ${msg ? `<div class="notice ok" role="status">${esc(msg)}</div>` : ""}
    ${!live ? `<div class="notice">This version has been replaced. <a href="#design/${newest.id}">Open the latest version (${newest.version})</a>.</div>` : ""}
    ${d.state === "test-approved" ? `<div class="notice">Approved for testing only. Students will see a "test build" label. Approve it as the educator before classroom use.</div>` : ""}
    <div id="err" class="notice bad" hidden tabindex="-1" role="alert"></div>

    <h2>What students will learn and do</h2><div class="card">
      ${F("Learning goal", d.goal.text, d.goal.source, "goal.text")}${F("Students", d.learnerProfile.text, d.learnerProfile.source, "learnerProfile.text")}${F("The student's job", d.learnerRole.text, d.learnerRole.source, "learnerRole.text")}
      ${F("Who they talk to", `${d.character.name}, ${d.character.role}`, d.character.source, "character.role")}${F("What is at stake", d.stakes.text, d.stakes.source, "stakes.text")}
      ${F("How hard the character pushes", d.difficulty, null, "difficulty")}${F("Help when stuck", { none: "No hints; the question is repeated", questions: "Guiding questions only", "questions-then-materials": "Guiding questions, then a pointer back to the materials" }[d.helpPolicy], null, "helpPolicy")}
      ${d.constraints.length ? F("Constraints", d.constraints.join("\n")) : ""}</div>

    <h2>Success criteria</h2><p class="dim small">Feedback is given only on these. "Listens for" are the words Primer matches in a student's answer; edit them if they are off.</p>
    <div class="card">${d.criteria.map((c, i) => `<div class="field"><div class="k">Criterion ${i + 1}${src(c.source)}${editable ? ` <button class="link ed" data-path="criteria.${i}.text" data-label="Criterion ${i + 1}">Edit</button>` : ""}</div><div class="v">${esc(c.text)}</div><div class="dim small">Listens for: ${esc(c.lookFors.join(", "))}${editable ? ` <button class="link ed" data-path="criteria.${i}.lookFors" data-label="Words to listen for (comma separated)">Edit</button>` : ""}</div></div>`).join("")}</div>
    <h2>Misconceptions to test</h2><div class="card">${d.misconceptions.length ? d.misconceptions.map((m, i) => F(`Misconception ${i + 1}`, m.text, m.source, `misconceptions.${i}.text`)).join("") : `<p class="dim">None listed.</p>`}</div>

    <h2>What the student experiences</h2>
    <details open><summary>1. Preparation</summary><div class="field"><div class="k">Briefing ${editable ? `<button class="link ed" data-path="preparation.briefing" data-label="Briefing">Edit</button>` : ""}</div><div class="v">${esc(d.preparation.briefing)}</div></div>
      <div class="field"><div class="k">Key points, quoted from your material</div>${d.preparation.keyPoints.map((k) => `<blockquote>${esc(k.text)}<small>${esc(k.source.material)}</small></blockquote>`).join("") || `<p class="dim">No key points could be drawn from the material.</p>`}</div>
      <div class="field"><div class="k">Questions before they start</div><ol>${d.preparation.activation.map((q) => `<li>${esc(q)}</li>`).join("")}</ol></div></details>
    <details><summary>2. Practice with ${esc(d.character.name)}</summary><div class="field"><div class="k">Opening line ${editable ? `<button class="link ed" data-path="practice.opening" data-label="Opening line">Edit</button>` : ""}</div><div class="v">${esc(d.practice.opening)}</div></div>
      ${d.practice.challenges.map((c, i) => `<div class="field"><div class="k">For criterion ${d.criteria.findIndex((x) => x.id === c.criterionId) + 1}</div><div class="v"><b>Asks:</b> ${esc(c.prompt)}\n<b>If the student shows it:</b> ${esc(c.harder)}\n<b>If the student is stuck:</b> ${d.helpPolicy === "none" ? "repeats the question" : esc(c.support.slice(0, d.helpPolicy === "questions" ? 1 : 2).join(" → "))}</div></div>`).join("")}
      ${d.practice.probes.map((p) => `<div class="field"><div class="k">Misconception check</div><div class="v">${esc(p.voice)}</div></div>`).join("")}
      <div class="field"><div class="k">If the student asks for the answer</div><div class="v">${esc(d.practice.refusal)}</div></div><p class="dim small">Up to ${d.practice.maxTurns} student turns; ${d.practice.maxAttempts} attempts per criterion.</p></details>
    <details><summary>3. Feedback and transfer</summary><div class="field"><div class="k">Self-assessment first</div><ol>${d.feedback.selfAssessment.map((q) => `<li>${esc(q)}</li>`).join("")}</ol></div>
      <div class="field"><div class="k">Then</div><div class="v">For each criterion: what the student actually wrote, quoted; what that suggests, marked as inference; and a next step. Criteria the student was never asked about are reported as not assessed.</div></div>
      ${F("Transfer question", d.feedback.transfer, d.transfer.source, "transfer.text")}</details>

    ${d.assumptions.length ? `<h2>Decisions Primer made for you</h2><div class="card"><ul class="clean">${d.assumptions.map((a) => `<li>${esc(a.text)}</li>`).join("")}</ul><p class="dim small">Change any of these with Edit above or by requesting a change below.</p></div>` : ""}
    ${d.recommendations.length ? `<h2>Suggestions</h2><div class="card"><ul class="clean">${d.recommendations.map((r) => `<li>${esc(r.text)} ${r.accepted === null && editable ? `<button class="link rec" data-id="${r.id}" data-a="1">Noted</button><button class="link rec" data-id="${r.id}" data-a="0">Dismiss</button>` : `<span class="dim small">${r.accepted === null ? "" : r.accepted ? "(noted)" : "(dismissed)"}</span>`}</li>`).join("")}</ul></div>` : ""}

    <details><summary>Where each part came from</summary><table><tr><th>Part of the design</th><th>Content</th><th>Source</th></tr>${A.trace(d.id).rows.map((r) => `<tr><td>${esc(r.element)}</td><td>${esc(r.value)}</td><td>${esc(r.from)}</td></tr>`).join("")}</table></details>
    <details><summary>Instructions given to the system (advanced)</summary><p class="dim small">These are generated from the design above and change whenever it changes.</p><h3>Character</h3><pre>${esc(d.prompts.character)}</pre><h3>Evidence</h3><pre>${esc(d.prompts.assessor)}</pre><h3>Feedback</h3><pre>${esc(d.prompts.feedback)}</pre></details>
    <details><summary>History (${d.history.length})</summary><table><tr><th>When</th><th>Who</th><th>What</th><th>Note</th></tr>${d.history.map((h) => `<tr><td>${esc(h.at.slice(0, 16).replace("T", " "))}</td><td>${esc(h.actor.name)}${h.actor.type === "test" ? " (test)" : ""}</td><td>${esc(h.action)}${h.to && h.to !== h.from ? " → " + esc(STATE_LABEL[h.to]) : ""}</td><td>${esc(h.note)}</td></tr>`).join("")}</table>
      <p class="small">Versions: ${versions.map((v) => v.id === d.id ? `<b>${v.version}</b>` : `<a href="#design/${v.id}">${v.version}</a>`).join(" · ")}</p></details>

    ${live && d.state !== "rejected" ? `<h2>Request a change</h2><div class="card"><label for="rev" style="margin-top:0">Describe what should be different<span class="hint">For example: "make it harder", "add a criterion: …", "the character should be …", "focus on …", "stakes: …". Approved designs can be changed too; the change creates a new draft that needs approval again.</span></label>
      <textarea id="rev"></textarea><div class="row end" style="margin-top:10px"><button id="revBtn">Apply change</button></div></div>` : ""}

    ${live ? `<h2>Decision</h2><div class="card">
      ${isApproved(d) ? `<p><b>${d.state === "educator-approved" ? "You approved this design." : "This design is approved for testing only."}</b></p>` : d.state === "rejected" ? `<p><b>This design was rejected.</b> Start again from <a href="#new">a new experience</a>.</p>` : `<p>Students cannot open anything until you approve.</p>`}
      ${d.state !== "rejected" ? `<label for="tname">Your name</label><input type="text" id="tname" value="${esc(teacher().name)}" autocomplete="name">
      <div class="row" style="margin-top:12px">${d.state !== "educator-approved" ? `<button class="primary" id="apBtn">Approve for classroom use</button>` : ""}${!isApproved(d) ? `<button id="tapBtn">Approve for testing only</button>` : ""}<button class="danger" id="rjBtn">Reject</button></div>` : ""}
      ${isApproved(d) ? `<hr style="border:0;border-top:1px solid var(--line);margin:16px 0">${pkg ? `<p><b>The student experience is built.</b></p><div class="row"><a href="learn.html?exp=${pkg.id}" id="openLink"><button class="primary" type="button">Open as a student</button></a><button id="dlBtn">Download experience file</button><a href="#sessions/${pkg.id}">Student sessions on this device</a></div>
        <p class="dim small" style="margin-top:10px">To give it to students: send them the downloaded file and the student page, where they choose "Open an experience file". Their work stays in their own browser.</p>` : `<button class="primary" id="buildBtn">Build the student experience</button>`}` : ""}</div>` : ""}`;

  app.querySelectorAll(".ed").forEach((b) => (b.onclick = () => { const path = b.dataset.path; let cur = path.split(".").reduce((o, k) => o[k], d);
    if (path === "character.role") cur = d.character.role; const isList = Array.isArray(cur);
    let val = prompt(b.dataset.label + (path === "difficulty" ? " (gentle, moderate or demanding)" : path === "helpPolicy" ? " (none, questions, or questions-then-materials)" : ""), isList ? cur.join(", ") : cur); if (val == null) return; val = val.trim(); if (!val) return;
    try { const name = needName(); const nd = A.edit(d.id, path, isList ? val.split(",").map((s) => s.trim()).filter(Boolean) : val, name); flash = `Saved as version ${nd.version}. Everything that depends on it was updated.`; go("design/" + nd.id); } catch (e) { fail(e); } }));
  app.querySelectorAll(".rec").forEach((b) => (b.onclick = () => { try { A.setRecommendation(d.id, b.dataset.id, b.dataset.a === "1", needName()); route(); } catch (e) { fail(e); } }));
  if ($("revBtn")) $("revBtn").onclick = () => { try { const r = A.revise(d.id, $("rev").value, needName()); flash = (r.understood ? "Changed: " : "Primer could not turn that into a specific change, so it was ") + r.changes.join("; ") + `. This is now version ${r.design.version} and needs approval.`; go("design/" + r.design.id); } catch (e) { fail(e); } };
  const decide = (fn, ok) => { try { fn(); flash = ok; route(); } catch (e) { fail(e); } };
  if ($("apBtn")) $("apBtn").onclick = () => decide(() => A.approveDesign(d.id, needName()), "Approved for classroom use. You can now build the student experience.");
  if ($("tapBtn")) $("tapBtn").onclick = () => decide(() => A.approveDesign(d.id, { type: "test", name: (needName().name) + " (test approval)" }), "Approved for testing only.");
  if ($("rjBtn")) $("rjBtn").onclick = () => { const why = prompt("Reason for rejecting (kept in the history):"); if (why == null) return; decide(() => A.rejectDesign(d.id, needName(), why), "Design rejected."); };
  if ($("buildBtn")) $("buildBtn").onclick = () => decide(() => A.build(d.id), "The student experience is ready.");
  if ($("dlBtn")) $("dlBtn").onclick = () => download(`${pkg.title.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.primer.json`, { packages: [pkg] });
}
function needName() { const el = $("tname"); const name = (el ? el.value : teacher().name).trim(); if (!name) { if (el) el.focus(); throw new Error("Enter your name first. It is recorded with every decision."); } localStorage.setItem("primer:teacherName", name); return { type: "educator", name }; }

// ---------- sessions: what students did, and why the system responded as it did ----------
function viewSessions(pkgId) {
  const pkg = store.get("packages", pkgId); if (!pkg) throw new Error("That experience was not found in this browser.");
  const sessions = store.list("sessions").filter((s) => s.packageId === pkgId).sort((a, b) => b.startedAt.localeCompare(a.startedAt)); const d = pkg.design;
  const label = (ref) => { const c = d.criteria.find((x) => x.id === ref); const m = d.misconceptions.find((x) => x.id === ref); return c ? "Criterion: " + c.text : m ? "Misconception: " + m.text : ref; };
  app.innerHTML = `<p><a href="#design/${pkg.designId}">← Back to the design</a></p><h1>Student sessions</h1><p class="dim">${esc(pkg.title)} · sessions recorded in this browser only.</p>
    ${sessions.length ? "" : `<div class="card"><p>No sessions yet. Open the experience as a student to create one.</p></div>`}
    ${sessions.map((s) => `<details><summary>${esc(s.learner.name)} · ${esc(s.startedAt.slice(0, 16).replace("T", " "))} · ${s.phase === "ended" ? "completed" : "in progress (" + s.phase + ")"}</summary>
      <h3>Transcript</h3><div class="chat">${s.turns.map((t) => `<div class="msg ${t.who === "learner" ? "learner" : ""}"><span class="name">${t.who === "learner" ? esc(s.learner.name) : t.who === "character" ? esc(d.character.name) : "Primer"} · ${t.phase} · ${t.id}</span>${esc(t.text)}</div>`).join("")}</div>
      <h3>Evidence recorded</h3>${s.evidence.length ? `<table><tr><th>Turn</th><th>For</th><th>Kind</th><th>Student's words</th></tr>${s.evidence.map((e) => `<tr><td>${e.turnId}</td><td>${esc(label(e.ref))}</td><td>${esc(e.kind)} (${e.strength})</td><td>${esc(e.quote)}</td></tr>`).join("")}</table>` : `<p class="dim">None.</p>`}
      <h3>How the character adapted</h3>${s.adaptations.length ? `<table><tr><th>Turn</th><th>Response</th><th>Tied to</th><th>Reason</th></tr>${s.adaptations.map((a) => `<tr><td>${a.turnId}</td><td>${esc(a.kind)}</td><td>${esc(label(a.goalRef))}</td><td>${esc(a.reason)}</td></tr>`).join("")}</table>` : `<p class="dim">None.</p>`}
      ${s.feedback ? `<h3>Feedback the student saw</h3><p>Strengths: ${s.feedback.strengths.length} · Growth areas: ${s.feedback.growth.length} · Not assessed: ${s.feedback.notAssessed.length}</p>` : ""}</details>`).join("")}`;
}
route();
