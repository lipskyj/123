import { createStore, localStorageBackend } from "../src/store.js";
import { DeterministicProvider } from "../src/provider.js";
import { createAuthoring } from "../src/authoring.js";
import { STATE_LABEL, isApproved } from "../src/states.js";
import { TEMPLATES, WORLDS } from "../src/schema.js";

const store = createStore(localStorageBackend()), provider = new DeterministicProvider(), A = createAuthoring(store, provider);
const app = document.getElementById("app");
const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const $ = (id) => document.getElementById(id);
const savedName = () => { try { return localStorage.getItem("primer:teacherName") || ""; } catch { return ""; } };
const src = (s) => (s ? `<span class="src ${s.kind === "teacher" ? "teacher" : "ai"}">${s.kind === "teacher" ? "From you" : "Chosen by Primer"}</span>` : "");
const badge = (st) => `<span class="badge ${st}">${esc(STATE_LABEL[st])}</span>`;
const go = (hash) => { location.hash = hash; };
const TEMPLATE_HELP = { roleplay: "Roleplay — the student acts inside a situation, e.g. advising a client", teachback: "Teachback — the student explains the idea to a newcomer who asks questions" };
const HELP = { none: "No hints; the question is repeated", questions: "Guiding questions only", "questions-then-materials": "Guiding questions, then a pointer back to the material" };
let flash = "";
function fail(e) { const n = $("err"); if (n) { n.hidden = false; n.textContent = e.message || String(e); n.scrollIntoView({ block: "center" }); n.focus(); } else alert(e.message || e); }

function route() {
  const [view, id] = location.hash.slice(1).split("/");
  try { ({ new: viewIntake, interview: viewInterview, design: viewDesign, sessions: viewSessions }[view] || viewHome)(id); } catch (e) { app.innerHTML = `<div class="notice bad">${esc(e.message)}</div><p><a href="#">Back to my experiences</a></p>`; }
  window.scrollTo(0, 0);
}
addEventListener("hashchange", route); $("homeBtn").onclick = () => go("");

// ---------- editor dialog (replaces browser prompt boxes) ----------
const dlg = document.createElement("dialog"); dlg.id = "editor"; dlg.className = "card"; dlg.style.cssText = "max-width:640px;width:calc(100% - 32px);color:inherit";
dlg.innerHTML = `<form method="dialog" id="edForm"><label for="edText" id="edLabel" style="margin-top:0"></label><p class="dim small" id="edHint"></p>
  <select id="edSelect" hidden aria-labelledby="edLabel"></select><textarea id="edText" rows="6"></textarea>
  <div class="row end" style="margin-top:12px"><button value="cancel" type="button" id="edCancel">Cancel</button><button class="primary" id="edSave" value="save">Save</button></div></form>`;
document.body.appendChild(dlg);
function openEditor({ label, hint = "", value = "", options = null }) {
  return new Promise((resolve) => {
    $("edLabel").textContent = label; $("edHint").textContent = hint; $("edHint").hidden = !hint;
    const sel = $("edSelect"), ta = $("edText");
    if (options) { sel.hidden = false; ta.hidden = true; sel.innerHTML = options.map(([v, t]) => `<option value="${esc(v)}"${v === value ? " selected" : ""}>${esc(t)}</option>`).join(""); }
    else { sel.hidden = true; ta.hidden = false; ta.value = value; }
    $("edCancel").onclick = () => { dlg.close(); resolve(null); };
    $("edForm").onsubmit = (e) => { e.preventDefault(); dlg.close(); resolve(options ? sel.value : ta.value); };
    dlg.showModal(); (options ? sel : ta).focus();
  });
}

// ---------- home ----------
function viewHome() {
  const intakes = store.list("intakes").sort((a, b) => b.createdAt.localeCompare(a.createdAt)); const msg = flash; flash = "";
  app.innerHTML = `<h1>My experiences</h1>
    <p class="dim">Each experience starts from your lesson and materials. Nothing reaches students until you approve it.</p>
    ${msg ? `<div class="notice ok" role="status">${esc(msg)}</div>` : ""}
    <div class="row"><button class="primary" id="newBtn">Create a new experience</button><button id="impBtn">Import a saved file</button><input type="file" id="impFile" accept=".json" hidden aria-label="Saved file"><button id="expBtn">Download everything as a file</button></div>
    ${intakes.length ? "" : `<div class="card"><p>You have not created anything yet.</p><p class="dim small">You will be asked for a learning objective, who your students are, what they should do, and the material they have studied. It takes about ten minutes.</p></div>`}
    ${intakes.map((i) => { const d = A.latest(i.id); const next = d ? `#design/${d.id}` : `#interview/${i.id}`;
      return `<div class="card"><div class="row"><b>${esc(i.title || i.objective)}</b>${d ? badge(d.state) + ` <span class="dim small">version ${d.version}</span>` : `<span class="badge">Questions not finished</span>`}<span style="flex:1"></span><a href="${next}">${d ? "Open design" : "Continue"}</a></div><p class="dim small" style="margin:6px 0 0">${esc(i.objective)}</p></div>`; }).join("")}`;
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
      <label for="learners">Your students<span class="hint">Age or level, and anything that affects how they should be spoken to. Students do not see this.</span></label><textarea id="learners"></textarea>
      <label for="priorKnowledge">What they already know<span class="hint">Optional. Students do not see this.</span></label><textarea id="priorKnowledge"></textarea>
      <label for="studentWork">What students should do in the experience<span class="hint">For example: advise a client, explain a process to a newcomer, decide between options.</span></label><textarea id="studentWork"></textarea>
      <label for="evidenceOfProgress">Evidence of progress<span class="hint">One per line. What would you see or hear from a student who is getting it? These become the success criteria. Students are not shown them during practice.</span></label><textarea id="evidenceOfProgress"></textarea>
      <label for="misconceptions">Common misconceptions<span class="hint">One per line. Optional, but the character can test for them.</span></label><textarea id="misconceptions"></textarea>
      <label for="constraints">Classroom constraints<span class="hint">Optional, one per line — e.g. time available, equipment. These guide the design and are never shown to students.</span></label><textarea id="constraints"></textarea>
      <label for="materials">Instructional material<span class="hint">Paste the text students have studied, or add text files. Students can read all of it while they prepare; key sentences are highlighted.</span></label><textarea id="materials" class="big"></textarea>
      <div class="row" style="margin-top:6px"><input type="file" id="files" accept=".txt,.md,.csv,text/plain" multiple aria-label="Add text files"><span class="dim small" id="fileNote"></span></div>
      <label for="template">Kind of practice</label><select id="template"><option value="">Not sure — ask me</option>${Object.entries(TEMPLATE_HELP).map(([k, v]) => `<option value="${k}">${v}</option>`).join("")}</select>
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
  if (!q) { const d = A.propose(intakeId); flash = "Here is the first draft. Primer builds it from your text with fixed rules, so read the character's lines carefully. Nothing is final until you approve it."; return go("design/" + d.id); }
  const optLabel = (o) => (q.id === "template" ? TEMPLATE_HELP[o.toLowerCase()] || o : o);
  app.innerHTML = `<div class="steps"><span class="done">1 Your lesson</span><span class="on">2 A few questions</span><span>3 Review the design</span><span>4 Approve and open</span></div>
    <p class="dim small">Question ${n} of ${total}</p><h1 id="qh">${esc(q.text)}</h1><p class="dim">${esc(q.why)}</p>
    <div id="err" class="notice bad" hidden tabindex="-1" role="alert"></div>
    ${q.options ? `<div class="row" role="group" aria-labelledby="qh">${q.options.map((o, i) => `<button class="opt" data-i="${i}">${esc(optLabel(o))}</button>`).join("")}</div>` : `<label for="ans" class="sr">Your answer</label><textarea id="ans"></textarea><div class="row end" style="margin-top:10px"><button class="primary" id="ok">Continue</button></div>`}
    <p style="margin-top:16px"><button class="link" id="skip">I'm not sure — let Primer decide (its choice is listed on the design page, where you can change it)</button></p>`;
  const next = (text, skipped) => { try { A.answer(intakeId, q.id, text, skipped); route(); } catch (e) { fail(e); } };
  app.querySelectorAll(".opt").forEach((b) => (b.onclick = () => next(q.options[+b.dataset.i], false)));
  if ($("ok")) { $("ok").onclick = () => ($("ans").value.trim() ? next($("ans").value.trim(), false) : fail(new Error("Write an answer, or choose the option below to let Primer decide."))); $("ans").focus(); }
  $("skip").onclick = () => next("", true);
}

// ---------- step 3 and 4: review, revise, approve, build ----------
const FRIENDLY = { objective: "your learning objective", learners: "your description of the students", studentWork: "what students should do", "answers.character": "your answer about the character", "answers.stakes": "your answer about what is at stake", "answers.transfer": "your answer about transfer", revision: "a change you requested", edit: "your edit" };
const friendly = (f) => FRIENDLY[f] || (/^evidenceOfProgress\[(\d+)\]$/.test(f) ? `your evidence-of-progress line ${+f.match(/\d+/)[0] + 1}` : /^misconceptions\[(\d+)\]$/.test(f) ? `your misconception line ${+f.match(/\d+/)[0] + 1}` : f);

function viewDesign(designId) {
  const d = store.get("designs", designId); if (!d) throw new Error("That design was not found in this browser.");
  const versions = A.versions(d.intakeId), newest = versions.at(-1), live = d.state !== "superseded";
  const pkg = store.list("packages").find((p) => p.designId === d.id && p.design.state === d.state);
  const ed = (path, label, extra = "") => (live ? ` <button class="link ed" data-path="${path}" data-label="${esc(label)}"${extra}>Edit</button>` : "");
  const F = (label, value, s, path) => `<div class="field"><div class="k">${label}${src(s)}${path ? ed(path, label) : ""}</div><div class="v">${esc(value)}</div></div>`;
  const msg = flash; flash = "";
  app.innerHTML = `<div class="steps"><span class="done">1 Your lesson</span><span class="done">2 A few questions</span><span class="${isApproved(d) ? "done" : "on"}">3 Review the design</span><span class="${isApproved(d) ? "on" : ""}">4 Approve and open</span></div>
    <h1>${esc(d.title)}</h1><div class="row">${badge(d.state)}<span class="dim small">Version ${d.version} of ${versions.length} · ${esc(TEMPLATE_HELP[d.template].split(" — ")[0])}${d.world ? " · " + esc(WORLDS[d.world]) : ""}</span></div>
    ${msg ? `<div class="notice ok" role="status">${esc(msg)}</div>` : ""}
    ${!live ? `<div class="notice">This version has been replaced. <a href="#design/${newest.id}">Open the latest version (${newest.version})</a>, or <button class="link" id="restoreBtn">restore this version</button> as a new draft.</div>` : ""}
    ${d.state === "test-approved" ? `<div class="notice">Approved for testing only. Students will see a "Test build" label. Approve it yourself before classroom use.</div>` : ""}
    ${d.state === "rejected" ? `<div class="notice">You rejected this version. Students cannot open it. Edit anything below, or request a change, to continue from a new draft.</div>` : ""}
    ${isApproved(d) && live ? `<div class="notice">Any edit now creates a new draft that needs your approval again. Students keep the approved version until then.</div>` : ""}
    <div id="err" class="notice bad" hidden tabindex="-1" role="alert"></div>
    ${true ? `<div class="card"><label for="tname" style="margin-top:0">Your name<span class="hint">Recorded with every edit, change and decision.</span></label><input type="text" id="tname" value="${esc(savedName())}" autocomplete="name"></div>` : ""}

    <h2>What students will learn and do</h2><div class="card">
      ${F("Learning goal", d.goal.text, d.goal.source, "goal.text")}${F("Students (not shown to them)", d.learnerProfile.text, d.learnerProfile.source, "learnerProfile.text")}${F("The student's job", d.learnerRole.text, d.learnerRole.source, "learnerRole.text")}
      ${F("Character's name", d.character.name, d.character.nameSource, "character.name")}${F("Who the character is", d.character.role, d.character.source, "character.role")}${F("What is at stake", d.stakes.text, d.stakes.source, "stakes.text")}
      ${F("How hard the character pushes", d.difficulty, null, "difficulty")}${F("Help when a student is stuck", HELP[d.helpPolicy], null, "helpPolicy")}
      ${F("Kind of practice", TEMPLATE_HELP[d.template], null, "template")}${F("Longest practice (student replies)", String(d.practice.maxTurns), null, "practice.maxTurns")}
      ${F("Classroom constraints (never shown to students)", d.constraints.join("\n") || "None", null, "constraints")}
      ${d.notes && d.notes.length ? F("Your notes (never shown to students)", d.notes.join("\n"), null, "notes") : ""}</div>

    <h2>Success criteria</h2><p class="dim small">Feedback covers only these. Under each is the question the character asks and the words that count as evidence of it.</p>
    <div class="card">${d.criteria.map((c, i) => { const ch = d.practice.challenges.find((x) => x.criterionId === c.id);
      return `<div class="field"><div class="k">Criterion ${i + 1}${src(c.source)}${ed(`criteria.${i}.text`, `Criterion ${i + 1}`)}</div><div class="v">${esc(c.text)}</div>
      <div class="small" style="margin-top:6px"><b>Character asks:</b> ${esc(ch.prompt)} <span class="src ${ch.written === "teacher" ? "teacher" : "ai"}">${ch.written === "teacher" ? "Written by you" : "Written by Primer — check it"}</span>${ed(`criteria.${i}.question`, `Question the character asks for criterion ${i + 1}`)}</div>
      <div class="dim small">Words that count as evidence: ${esc(c.lookFors.join(", "))}${ed(`criteria.${i}.lookFors`, `Words that count as evidence for criterion ${i + 1}`)}</div></div>`; }).join("")}</div>
    <h2>Misconceptions to test</h2><div class="card">${d.misconceptions.length ? d.misconceptions.map((m, i) => F(`Misconception ${i + 1}`, m.text, m.source, `misconceptions.${i}.text`)).join("") : `<p class="dim">None listed.</p>`}</div>

    <h2>What the student experiences</h2>
    <details open><summary>1. Preparation</summary><div class="field"><div class="k">Briefing${ed("preparation.briefing", "Briefing")}</div><p class="dim small" style="margin:2px 0">Students see this text exactly as written, on the start page and during practice. Check that it does not give away answers.</p><div class="v">${esc(d.preparation.briefing)}</div></div>
      <div class="field"><div class="k">Highlighted from your material (students can also read all of it)${ed("preparation.keyPoints", "Highlighted sentences (one per line)")}</div>${d.preparation.keyPoints.map((k) => `<blockquote>${esc(k.text)}<small>${esc(k.source.material)}</small></blockquote>`).join("") || `<p class="dim">No sentences could be highlighted; students still see the full material.</p>`}</div>
      <div class="field"><div class="k">Questions before they start${ed("preparation.activation", "Questions before they start (one per line)")}</div><ol>${d.preparation.activation.map((q) => `<li>${esc(q)}</li>`).join("")}</ol></div></details>
    <details open><summary>2. Practice with ${esc(d.character.name)}</summary><div class="field"><div class="k">Opening line${ed("practice.opening", "Opening line")}</div><div class="v">${esc(d.practice.opening)}</div></div>
      <div class="field"><div class="k">When a student answers a different criterion first${ed("practice.ack", "Acknowledgement line")}</div><div class="v">${esc(d.practice.ack)} <span class="dim">(then repeats the current question; that criterion is not asked again)</span></div></div>
      ${d.practice.challenges.map((c, ci) => `<div class="field"><div class="k">For criterion ${d.criteria.findIndex((x) => x.id === c.criterionId) + 1}${ed(`practice.challenges.${ci}.harder`, "Follow-up when the student shows it").replace(">Edit<", ">Edit follow-up<")}${ed(`practice.challenges.${ci}.support.0`, "First line when the student is stuck").replace(">Edit<", ">Edit stuck line<")}</div><div class="v"><b>Asks:</b> ${esc(c.prompt)}\n<b>If the student shows it:</b> ${d.practice.raise ? esc(c.harder) : "moves on (gentle difficulty)"}\n<b>If the student is stuck:</b> ${d.helpPolicy === "none" ? "repeats the question" : esc(c.support.slice(0, d.helpPolicy === "questions" ? 1 : 2).join(" → "))}</div></div>`).join("")}
      ${d.practice.probes.map((p) => `<div class="field"><div class="k">Misconception check</div><div class="v">${esc(p.voice)}</div></div>`).join("")}
      <div class="field"><div class="k">If the student asks for the answer</div><div class="v">${esc(d.practice.refusal)}</div></div><p class="dim small">Up to ${d.practice.maxTurns} student replies; ${d.practice.maxAttempts} attempts per criterion. Students can also end practice themselves.</p></details>
    <details><summary>3. Feedback and transfer</summary><div class="field"><div class="k">Self-assessment first</div><ol>${d.feedback.selfAssessment.map((q) => `<li>${esc(q)}</li>`).join("")}</ol></div>
      <div class="field"><div class="k">Then</div><div class="v">For each criterion: what the student actually wrote, quoted; what that suggests, marked as a guess; and a next step. Criteria the student was never asked about are reported as not assessed.</div></div>
      ${F("Transfer situation", d.transfer.text || "None — students are asked to think of one", d.transfer.source, "transfer.text")}</details>

    ${d.assumptions.length ? `<h2>Decisions Primer made for you</h2><div class="card"><ul class="clean">${d.assumptions.map((a) => `<li>${esc(a.text)}</li>`).join("")}</ul></div>` : ""}
    ${d.recommendations.length ? `<h2>Suggestions</h2><div class="card"><ul class="clean">${d.recommendations.map((r) => `<li>${esc(r.text)} ${r.accepted === null && live ? `<button class="link rec" data-id="${r.id}" data-a="1">Noted</button><button class="link rec" data-id="${r.id}" data-a="0">Dismiss</button>` : `<span class="dim small">${r.accepted === null ? "" : r.accepted ? "(noted)" : "(dismissed)"}</span>`}</li>`).join("")}</ul></div>` : ""}

    <details><summary>Where each part came from</summary><table><tr><th>Part of the design</th><th>Content</th><th>Source</th></tr>${A.trace(d.id).rows.map((r) => `<tr><td>${esc(r.element)}</td><td>${esc(r.value)}</td><td>${esc(r.from.replace(/^Educator: (.*)$/, (_, f) => "From " + friendly(f)).replace(/^Primer suggestion \((.*)\)$/, "Chosen by Primer"))}</td></tr>`).join("")}</table></details>
    <details><summary>Instructions the system follows (advanced)</summary><p class="dim small">Generated from the design above; they change whenever it changes.</p><h3>Character</h3><pre>${esc(d.prompts.character)}</pre><h3>Evidence</h3><pre>${esc(d.prompts.assessor)}</pre><h3>Feedback</h3><pre>${esc(d.prompts.feedback)}</pre></details>
    <details><summary>History (${d.history.length})</summary><table><tr><th>When</th><th>Who</th><th>What</th><th>Note</th></tr>${d.history.map((h) => `<tr><td>${esc(h.at.slice(0, 16).replace("T", " "))}</td><td>${esc(h.actor.name)}${h.actor.type === "test" ? " (test)" : ""}</td><td>${esc(h.action)}${h.to && h.to !== h.from ? " → " + esc(STATE_LABEL[h.to]) : ""}</td><td>${esc(h.note)}</td></tr>`).join("")}</table>
      <p class="small">Versions: ${versions.map((v) => v.id === d.id ? `<b>${v.version}</b>` : `<a href="#design/${v.id}">${v.version}</a>`).join(" · ")}</p></details>

    ${live ? `<h2>Request a change</h2><div class="card"><label for="rev" style="margin-top:0">Describe what should be different<span class="hint">Primer understands requests like: "make it harder", "make it easier", "add a criterion: …", "add a misconception: …", "the character should be …", "call the character …", "stakes: …", "focus on …", "no hints", "switch to teachback". Anything else is kept as a private note for you, and the Edit buttons above can change any text directly.</span></label>
      <textarea id="rev"></textarea><div class="row end" style="margin-top:10px"><button id="revBtn">Apply change</button></div></div>

    <h2>Decision</h2><div class="card">
      ${isApproved(d) ? `<p><b>${d.state === "educator-approved" ? "You approved this design." : "This design is approved for testing only."}</b></p>` : d.state === "rejected" ? `<p><b>Rejected.</b> Edit or request a change to continue.</p>` : `<p>Students cannot open anything until you approve.</p>`}
      <div class="row">${d.state !== "educator-approved" && d.state !== "rejected" ? `<button class="primary" id="apBtn">Approve for classroom use</button>` : ""}${!isApproved(d) && d.state !== "rejected" ? `<button id="tapBtn">Approve for testing only</button>` : ""}${d.state !== "rejected" ? `<button class="danger" id="rjBtn">${isApproved(d) ? "Withdraw approval (reject)" : "Reject this version"}</button>` : ""}</div>
      ${pkg && pkg.withdrawn ? `<p class="dim">The student experience built from this version has been withdrawn; students can no longer start it on this device.</p>` : ""}
      ${isApproved(d) ? `<hr style="border:0;border-top:1px solid var(--line);margin:16px 0">${pkg ? `<p><b>The student experience is ready.</b></p><div class="row"><a href="learn.html?exp=${pkg.id}" id="openLink"><button class="primary" type="button">Open as a student</button></a><button id="dlBtn">Download experience file</button><a href="#sessions/${pkg.id}">Student sessions on this device</a></div>
        <p class="dim small" style="margin-top:10px">To give it to students: send them the downloaded file. On the student page they choose "Open an experience file". Their work stays in their own browser, so you will only see sessions from this device.</p>` : `<button class="primary" id="buildBtn">Create the student experience</button>`}` : ""}</div>` : ""}`;

  const ENUM_OPTS = { difficulty: [["gentle", "Gentle — never raises the challenge"], ["moderate", "Moderate"], ["demanding", "Demanding — fewer attempts"]], helpPolicy: Object.entries(HELP), template: Object.entries(TEMPLATE_HELP) };
  const LISTS = new Set(["constraints", "notes", "preparation.activation", "preparation.keyPoints"]);
  app.querySelectorAll(".ed").forEach((b) => (b.onclick = async () => {
    const path = b.dataset.path; let cur;
    try { needName(); } catch (e) { return fail(e); }
    const mq = path.match(/^criteria\.(\d+)\.question$/);
    if (path === "preparation.keyPoints") cur = d.preparation.keyPoints.map((k) => k.text); else
    cur = mq ? d.practice.challenges.find((x) => x.criterionId === d.criteria[+mq[1]].id).prompt : path === "practice.maxTurns" ? String(d.practice.maxTurns) : path.split(".").reduce((o, k) => (o == null ? o : o[k]), d);
    const isList = Array.isArray(cur), isWords = /lookFors$/.test(path);
    const val = await openEditor({ label: b.dataset.label, options: ENUM_OPTS[path] || null, value: isList ? cur.join(isWords ? ", " : "\n") : cur ?? "",
      hint: isWords ? "Separate words with commas. A student's answer must contain several of these, including at least one that belongs only to this criterion." : LISTS.has(path) ? "One per line. Leave empty to remove all." : path === "practice.maxTurns" ? "A number from 2 to 40." : "" });
    if (val == null) return;
    let out = isList ? val.split(isWords ? "," : "\n").map((x) => x.trim()).filter(Boolean) : val.trim();
    if (path === "preparation.keyPoints") out = out.map((t) => ({ text: t, source: { material: "Highlighted by you" } }));
    if (!isList && !out) return fail(new Error("That field cannot be empty."));
    try { const nd = A.edit(d.id, path, out, needName()); flash = `Saved as version ${nd.version}. Everything that depends on it was updated${isApproved(d) ? "; it needs your approval again" : ""}.`; go("design/" + nd.id); } catch (e) { fail(e); } }));
  app.querySelectorAll(".rec").forEach((b) => (b.onclick = () => { try { A.setRecommendation(d.id, b.dataset.id, b.dataset.a === "1", needName()); route(); } catch (e) { fail(e); } }));
  if ($("revBtn")) $("revBtn").onclick = () => { try { const r = A.revise(d.id, $("rev").value, needName()); flash = (r.understood ? "Changed: " + r.changes.join("; ") : "Primer could not turn that into a specific change, so it was " + r.changes.join("; ")) + ` This is version ${r.design.version}${r.understood ? " and needs approval" : ""}.`; go("design/" + r.design.id); } catch (e) { fail(e); } };
  const decide = (fn, ok) => { try { fn(); flash = ok; route(); } catch (e) { fail(e); } };
  if ($("apBtn")) $("apBtn").onclick = () => decide(() => A.approveDesign(d.id, needName()), "Approved for classroom use. You can now create the student experience.");
  if ($("tapBtn")) $("tapBtn").onclick = () => decide(() => A.approveDesign(d.id, { type: "test", name: needName().name + " (test approval)" }), "Approved for testing only.");
  if ($("rjBtn")) $("rjBtn").onclick = async () => { try { needName(); } catch (e) { return fail(e); }
    const why = await openEditor({ label: "Why are you rejecting this version?", hint: "Kept in the history. Students will not be able to open it. You can still edit it afterwards to continue from a new draft." }); if (why == null) return;
    decide(() => A.rejectDesign(d.id, needName(), why.trim()), "Rejected. Edit anything, or request a change, to continue from a new draft."); };
  if ($("restoreBtn")) $("restoreBtn").onclick = () => { try { const nd = A.restore(d.id, needName()); flash = `Version ${d.version} restored as version ${nd.version}. It needs your approval.`; go("design/" + nd.id); } catch (e) { fail(e); } };
  if ($("buildBtn")) $("buildBtn").onclick = () => decide(() => A.build(d.id), "The student experience is ready.");
  if ($("dlBtn")) $("dlBtn").onclick = () => download(`${pkg.title.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.primer.json`, { packages: [pkg] });
}
function needName() { const el = $("tname"); const name = (el ? el.value : savedName()).trim(); if (!name) { if (el) { el.scrollIntoView({ block: "center" }); el.focus(); } throw new Error("Enter your name in the box at the top of this page first. It is recorded with every change."); } try { localStorage.setItem("primer:teacherName", name); } catch {} return { type: "educator", name }; }

// ---------- sessions: what students did, and why the system responded as it did ----------
function viewSessions(pkgId) {
  const pkg = store.get("packages", pkgId); if (!pkg) throw new Error("That experience was not found in this browser.");
  const sessions = store.list("sessions").filter((s) => s.packageId === pkgId).sort((a, b) => b.startedAt.localeCompare(a.startedAt)); const d = pkg.design;
  const label = (ref) => { const c = d.criteria.find((x) => x.id === ref); const m = d.misconceptions.find((x) => x.id === ref); return c ? "Criterion: " + c.text : m ? "Misconception: " + m.text : ref; };
  const KIND = { acknowledge: "Acknowledged an answer to another criterion", raise: "Raised the challenge", support: "Gave support", repeat: "Repeated the question", redirect: "Declined to give the answer", probe: "Tested a misconception" };
  app.innerHTML = `<p><a href="#design/${pkg.designId}">← Back to the design</a></p><h1>Student sessions</h1><p class="dim">${esc(pkg.title)} · sessions recorded in this browser only.</p>
    ${sessions.length ? "" : `<div class="card"><p>No sessions yet. Open the experience as a student to create one.</p></div>`}
    ${sessions.map((s) => `<details><summary>${esc(s.learner.name)} · ${esc(s.startedAt.slice(0, 16).replace("T", " "))} · ${s.phase === "ended" ? "completed" : "in progress (" + s.phase + ")"}</summary>
      <h3>Transcript</h3><div class="chat">${s.turns.map((t) => `<div class="msg ${t.who === "learner" ? "learner" : ""}"><span class="name">${t.who === "learner" ? esc(s.learner.name) : t.who === "character" ? esc(d.character.name) : "Primer"} · ${t.phase} · #${t.id.slice(1)}</span>${esc(t.text)}</div>`).join("")}</div>
      <h3>Evidence recorded</h3>${s.evidence.length ? `<table><tr><th>Message</th><th>For</th><th>What was seen</th><th>Student's words</th></tr>${s.evidence.map((e) => `<tr><td>#${e.turnId.slice(1)}</td><td>${esc(label(e.ref))}</td><td>${esc(e.kind.replace("misconception-", "misconception "))} (${e.strength})</td><td>${esc(e.quote)}</td></tr>`).join("")}</table>` : `<p class="dim">None.</p>`}
      <h3>How the character adapted</h3>${s.adaptations.length ? `<table><tr><th>After message</th><th>Response</th><th>Tied to</th><th>Reason</th></tr>${s.adaptations.map((a) => `<tr><td>#${a.turnId.slice(1)}</td><td>${esc(KIND[a.kind] || a.kind)}</td><td>${esc(label(a.goalRef))}</td><td>${esc(a.reason)}</td></tr>`).join("")}</table>` : `<p class="dim">None.</p>`}
      ${s.feedback ? `<h3>Feedback the student saw</h3><p>Strengths: ${s.feedback.strengths.length} · Growth areas: ${s.feedback.growth.length} · Not assessed: ${s.feedback.notAssessed.length}</p>` : ""}</details>`).join("")}`;
}
route();
