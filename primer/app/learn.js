import { createStore, localStorageBackend } from "../src/store.js";
import { DeterministicProvider } from "../src/provider.js";
import { createRuntime } from "../src/runtime.js";
import { validatePackage } from "../src/schema.js";

const store = createStore(localStorageBackend()), R = createRuntime(store, new DeterministicProvider());
const app = document.getElementById("app"), $ = (id) => document.getElementById(id);
const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const params = new URLSearchParams(location.search);
const MIN_FIELD = 3;
function fail(e) { const n = $("err"); if (n) { n.hidden = false; n.textContent = e.message || String(e); n.focus(); } else alert(e.message || e); }
const go = (q) => { history.pushState(null, "", q ? "?" + q : location.pathname); render(); };
addEventListener("popstate", render); $("homeBtn").onclick = () => go("");

async function loadBundled() { try { const r = await fetch("experiences/index.json"); if (!r.ok) return []; return await r.json(); } catch { return []; } }
async function ensurePackage(id, file) {
  let pkg = store.get("packages", id); if (pkg || !file) return pkg;
  const r = await fetch(file); const data = await r.json(); for (const p of data.packages || []) if (!validatePackage(p).length) store.put("packages", p); return store.get("packages", id);
}

async function render() {
  const p = new URLSearchParams(location.search);
  try { if (p.get("session")) return viewSession(p.get("session")); if (p.get("exp")) return await viewStart(p.get("exp"), p.get("file")); return await viewHome(); }
  catch (e) { app.innerHTML = `<div class="notice bad" role="alert">${esc(e.message)}</div><p><a href="learn.html">Back to all experiences</a></p>`; }
}

async function viewHome() {
  const bundled = await loadBundled(); const local = store.list("packages"); const open = store.list("sessions").filter((s) => s.phase !== "ended" && store.get("packages", s.packageId));
  const seen = new Set(local.map((x) => x.id));
  app.innerHTML = `<h1>Choose an experience</h1>
    ${open.length ? `<h2>Continue where you stopped</h2>${open.map((s) => `<div class="card row"><b>${esc(store.get("packages", s.packageId).title)}</b><span class="dim small">${esc(s.learner.name)} · ${s.phase}</span><span style="flex:1"></span><a href="?session=${s.id}">Continue</a></div>`).join("")}` : ""}
    <h2>From your teacher</h2>
    ${local.filter((x) => !bundled.some((b) => b.id === x.id)).map((x) => card(x.id, x.title, x.design.goal.text, x.approval.type, "")).join("") || `<div class="card"><p class="dim" style="margin:0">Nothing yet. If your teacher sent you a file, open it below.</p></div>`}
    <h2>Got a file from your teacher?</h2><div class="card"><label for="file" style="margin-top:0">Open an experience file</label><input type="file" id="file" accept=".json"><div id="err" class="notice bad" hidden tabindex="-1" role="alert"></div></div>
    ${bundled.length ? `<h2>Sample experiences</h2><p class="dim small">Examples that come with Primer, for trying it out.</p>${bundled.map((b) => card(b.id, b.title, b.goal, b.approval, b.file)).join("")}` : ""}`;
  $("file").onchange = async (e) => { try { const data = JSON.parse(await e.target.files[0].text()); const pk = (data.packages || [])[0]; if (!pk) throw new Error("That file does not contain an experience."); const errs = validatePackage(pk); if (errs.length) throw new Error("This experience cannot be opened: " + errs[0]); store.put("packages", pk); go("exp=" + pk.id); } catch (err) { fail(err); } };
}
const card = (id, title, goal, approval, file) => `<div class="card"><div class="row"><b>${esc(title)}</b>${approval === "test" ? `<span class="badge test-approved">Test build</span>` : ""}<span style="flex:1"></span><a href="?exp=${id}${file ? "&file=" + encodeURIComponent(file) : ""}">Open</a></div><p class="dim small" style="margin:6px 0 0">${esc(goal)}</p></div>`;

async function viewStart(id, file) {
  const pkg = await ensurePackage(id, file); if (!pkg) throw new Error("That experience is not available in this browser. Ask your teacher for the experience file.");
  const d = pkg.design;
  app.innerHTML = `<h1>${esc(pkg.title)}</h1>${pkg.approval.type === "test" ? `<div class="notice">Test build. Your teacher has not yet approved this for classroom use.</div>` : ""}
    <div class="card"><p><b>What this is for:</b> ${esc(d.goal.text)}.</p><p><b>What you will do:</b> ${esc(d.learnerRole.text)}.</p>
    <p class="dim">Three parts: prepare, practise with ${esc(d.character.name)}${d.world ? " after field work in a 3D cave" : ""}, then feedback on what you actually wrote. About ${Math.max(10, Math.round((d.practice.maxTurns * 1.5 + 8 + (d.world ? 10 : 0)) / 5) * 5)} minutes at most. Your work is saved in this browser as you go.</p>
    <div id="err" class="notice bad" hidden tabindex="-1" role="alert"></div>
    <label for="name">Your first name</label><input type="text" id="name" autocomplete="given-name"><div class="row end" style="margin-top:12px"><button class="primary" id="startBtn">Start</button></div></div>`;
  $("startBtn").onclick = () => { try { const name = $("name").value.trim(); if (!name) throw new Error("Enter your first name."); const s = R.start(pkg.id, { name }); go("session=" + s.id); } catch (e) { fail(e); } };
}

const steps = (phase) => { const order = ["preparation", "practice", "feedback", "ended"], i = order.indexOf(phase); return `<div class="steps">${["1 Prepare", "2 Practise", "3 Feedback"].map((t, k) => `<span class="${k < i ? "done" : k === i ? "on" : ""}">${t}</span>`).join("")}</div>`; };

function viewSession(id) {
  const s = R.get(id); if (!s) throw new Error("That session was not found in this browser.");
  const pkg = store.get("packages", s.packageId), d = pkg.design; $("who").textContent = s.learner.name;
  const head = `${steps(s.phase)}${!s.classroomApproved ? `<p class="dim small">Test build</p>` : ""}<div id="err" class="notice bad" hidden tabindex="-1" role="alert"></div>`;
  if (s.phase === "preparation") return viewPrep(s, d, head);
  if (s.phase === "practice") return d.world && !s.practice.worldLeft ? viewWorld(s, d, head) : viewChat(s, d, head);
  return viewFeedback(s, d, head);
}

function viewPrep(s, d, head) {
  app.innerHTML = `${head}<h1>Prepare</h1><div class="card"><p style="white-space:pre-wrap">${esc(d.preparation.briefing)}</p></div>
    ${d.preparation.keyPoints.length ? `<h2>Key points from your course material</h2>${d.preparation.keyPoints.map((k) => `<blockquote>${esc(k.text)}<small>${esc(k.source.material)}</small></blockquote>`).join("")}` : ""}
    ${(d.materials || []).length ? `<details><summary>Read all of the course material</summary>${d.materials.map((m) => `<h3>${esc(m.name)}</h3><p style="white-space:pre-wrap">${esc(m.text)}</p>`).join("")}</details><p class="dim small">You can come back to this material during practice.</p>` : ""}
    <h2>Before you begin</h2><p class="dim">Answer in your own words. There are no wrong answers here; it gets your thinking started.</p>
    ${d.preparation.activation.map((q, i) => `<label for="a${i}">${esc(q)}</label><textarea id="a${i}"></textarea>`).join("")}
    <div class="row end" style="margin-top:14px"><button class="primary" id="next">Start practice</button></div>`;
  $("next").onclick = () => { try { R.submitPreparation(s.id, d.preparation.activation.map((_, i) => $("a" + i).value)); render(); } catch (e) { fail(e); } };
}

function viewWorld(s, d, head) {
  const notes = () => R.get(s.id).turns.filter((t) => t.kind === "field-note");
  app.innerHTML = `${head}<h1>Field work</h1>
    <p>${esc(d.character.name)} is waiting outside. First collect your own evidence in the cave: investigate at least ${MIN_FIELD} things, choose the right tool for each, and write a field note saying what it tells you.</p>
    <iframe class="world" id="world" title="3D cave field site" src="world-cave.html?sid=${encodeURIComponent(s.id)}&min=${MIN_FIELD}" allow="autoplay"></iframe>
    <p class="dim small">Cannot use the 3D cave on this device? <button class="link" id="skipWorld">Continue without it</button> (this is recorded).</p>
    <h2>Your field notes</h2><div id="notes"></div>
    <div class="row end"><button class="primary" id="done" disabled>Finish field work and meet ${esc(d.character.name.split(" ")[0])}</button></div>`;
  const draw = () => { const n = notes(); $("notes").innerHTML = n.length ? n.map((t) => `<blockquote>${esc(t.text)}<small>${esc(t.feature || "")}</small></blockquote>`).join("") : `<p class="dim">None yet.</p>`; $("done").disabled = n.length < MIN_FIELD; };
  draw();
  const onMsg = (e) => { if (e.source !== $("world")?.contentWindow || !e.data || e.data.sid !== s.id) return;
    try { if (e.data.type === "primer-world-event") { R.worldEvent(s.id, e.data.event); draw(); } if (e.data.type === "primer-world-done") finish(); } catch (err) { fail(err); } };
  addEventListener("message", onMsg);
  const finish = () => { removeEventListener("message", onMsg); try { R.leaveWorld(s.id); render(); } catch (e) { fail(e); } };
  $("done").onclick = finish;
  $("skipWorld").onclick = () => { removeEventListener("message", onMsg); try { R.worldEvent(s.id, { feature: "none", tool: null, skipped: true, note: "" }); R.leaveWorld(s.id); render(); } catch (e) { fail(e); } };
}

function viewChat(s, d, head) {
  const turns = s.turns.filter((t) => t.phase === "practice" && t.kind !== "field-note");
  app.innerHTML = `${head}<h1>Practice</h1><p class="dim">You are talking with ${esc(d.character.name)}, ${esc(d.character.role)}. Your job: ${esc(d.learnerRole.text)}.</p>
    ${d.world ? `<details><summary>Your field notes</summary>${s.turns.filter((t) => t.kind === "field-note").map((t) => `<blockquote>${esc(t.text)}</blockquote>`).join("") || `<p class="dim">None.</p>`}</details>` : ""}
    <div class="chat" id="chat" role="log" aria-label="Conversation">${turns.map((t) => `<div class="msg ${t.who === "learner" ? "learner" : ""}"><span class="name">${t.who === "learner" ? esc(s.learner.name) : esc(d.character.name)}</span>${esc(t.text)}</div>`).join("")}</div>
    ${(d.materials || []).length ? `<details><summary>Course material</summary>${d.materials.map((m) => `<p style="white-space:pre-wrap">${esc(m.text)}</p>`).join("")}</details>` : ""}
    <label for="say">Your reply</label><textarea id="say"></textarea><div class="row end" style="margin-top:10px"><button class="link" id="endBtn">End practice now</button><span style="flex:1"></span><span class="dim small">Ctrl+Enter to send</span><button class="primary" id="send">Send</button></div>
    <p class="dim small">Reply ${s.practice.learnerTurns} of at most ${d.practice.maxTurns}.</p>`;
  const send = () => { try { R.say(s.id, $("say").value); render(); } catch (e) { fail(e); } };
  $("send").onclick = send;
  $("endBtn").onclick = () => { if (!confirm("End practice now? Anything you have not been asked about yet will be marked as not assessed.")) return; try { R.endPractice(s.id); render(); } catch (e) { fail(e); } }; $("say").onkeydown = (e) => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) send(); }; $("say").focus(); $("chat").lastElementChild?.scrollIntoView({ block: "nearest" });
}

function viewFeedback(s, d, head) {
  const closing = s.turns.filter((t) => t.kind === "closing").at(-1);
  if (!s.selfAssessment) {
    app.innerHTML = `${head}<h1>Before your feedback</h1>${closing ? `<div class="chat"><div class="msg"><span class="name">${esc(d.character.name)}</span>${esc(closing.text)}</div></div>` : ""}
      <p class="dim">The practice is over. First, your own view.</p>${d.feedback.selfAssessment.map((q, i) => `<label for="s${i}">${esc(q)}</label><textarea id="s${i}"></textarea>`).join("")}
      <div class="row end" style="margin-top:14px"><button class="primary" id="next">See feedback</button></div>`;
    $("next").onclick = () => { try { R.submitSelfAssessment(s.id, d.feedback.selfAssessment.map((_, i) => $("s" + i).value)); render(); } catch (e) { fail(e); } }; return;
  }
  const f = s.feedback, cites = (cs) => cs.map((c) => `<blockquote>${esc(c.quote)}<small>What you wrote ${esc(c.where || 'during ' + c.phase)}</small></blockquote>`).join("");
  app.innerHTML = `${head}<h1>${s.phase === "ended" ? "Experience complete" : "Your feedback"}</h1><p class="dim">Goal: ${esc(f.goal)}.</p>
    ${f.selfAssessmentNote ? `<div class="card"><p>${esc(f.selfAssessmentNote)}</p></div>` : ""}
    <h2>What went well</h2>${f.strengths.length ? f.strengths.map((x) => `<div class="card"><b>${esc(x.criterion)}</b><p>${esc(x.observation)}</p>${cites(x.citations)}<p class="dim small">${esc(x.inference.replace(/^Inference:/, "Our guess:"))}</p></div>`).join("") : `<p class="dim">Nothing you wrote matched the criteria yet. See below for where to start.</p>`}
    <h2>Where to grow</h2>${f.growth.length ? f.growth.map((x) => `<div class="card"><b>${esc(x.criterion)}</b><p>${esc(x.observation)}</p>${cites(x.citations)}<p class="dim small">${esc(x.inference.replace(/^Inference:/, "Our guess:"))}</p><p><b>Next step:</b> ${esc(x.nextAction)}</p></div>`).join("") : `<p class="dim">No growth areas were identified from this session.</p>`}
    ${f.misconceptions.length ? `<h2>Ideas to check</h2>${f.misconceptions.map((x) => `<div class="card"><b>"${esc(x.misconception)}"</b><p>${esc(x.note)}</p>${cites(x.citations)}</div>`).join("")}` : ""}
    ${f.notAssessed.length ? `<h2>Not assessed</h2><div class="card"><ul class="clean">${f.notAssessed.map((x) => `<li><b>${esc(x.criterion)}</b><br><span class="dim small">${esc(x.reason)}</span></li>`).join("")}</ul></div>` : ""}
    ${f.effortNote ? `<p>${esc(f.effortNote)}</p>` : ""}<p class="dim small">${esc(f.limits)}</p>
    ${s.phase === "ended" ? `<h2>Your transfer answer</h2><blockquote>${esc(s.transfer.answer)}</blockquote><p class="dim small">${esc(s.transfer.note)}</p><div class="notice ok" role="status"><b>You have finished.</b> You can close this page. <a href="learn.html">Back to all experiences</a></div>`
      : `<h2>One more question</h2><label for="tr">${esc(f.transferQuestion)}</label><textarea id="tr"></textarea><div class="row end" style="margin-top:12px"><button class="primary" id="fin">Finish</button></div>`}`;
  if ($("fin")) $("fin").onclick = () => { try { R.submitTransfer(s.id, $("tr").value); render(); } catch (e) { fail(e); } };
}
render();
