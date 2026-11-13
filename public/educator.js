/* Educator studio: intake interview, design review/revision/approval, build, evidence. */
const S = { config: null, projects: [], p: null, tab: 'interview', designId: null, editing: false, sessionId: null, flash: null };
const $ = (sel) => document.querySelector(sel);
const WS = () => $('#workspace');

async function init() {
  S.config = await api('GET', '/api/config');
  if (S.config.testMode) $('#modebanner').innerHTML = '<div class="banner test" role="note">TEST MODE: approvals made here are recorded as synthetic test approvals, not real educator approvals.</div>';
  if (S.config.educatorKeyRequired && !sessionStorage.getItem('primerEducatorKey')) {
    const k = prompt('Educator access key:');
    if (k) sessionStorage.setItem('primerEducatorKey', k);
  }
  $('#newproj').addEventListener('submit', async (e) => {
    e.preventDefault();
    const p = await act(() => api('POST', '/api/projects', { name: $('#newname').value.trim() || undefined }));
    if (!p) return;
    $('#newname').value = '';
    await loadProjects();
    await open(p.id, 'interview');
  });
  await loadProjects();
  const id = new URLSearchParams(location.search).get('p');
  if (id) await open(id);
}

async function act(fn) {
  try { return await fn(); } catch (e) {
    // Keep whatever the educator typed: capture form values, re-render with the error, restore them.
    const saved = [...document.querySelectorAll('#workspace input[id], #workspace textarea[id], #workspace select[id]')].map((el) => [el.id, el.type === 'checkbox' ? el.checked : el.value]);
    const wasEditing = S.editing;
    S.flash = { kind: 'bad', text: e.message }; render();
    if (wasEditing && !document.getElementById('editform')) { const d = S.p.designs.find((x) => x.id === S.designId); if (d) renderEditor(d); }
    for (const [id, v] of saved) { const el = document.getElementById(id); if (el && el.type !== 'file') { if (el.type === 'checkbox') el.checked = v; else el.value = v; } }
    announce(e.message); return null;
  }
}

async function loadProjects() {
  S.projects = await api('GET', '/api/projects');
  $('#projects').innerHTML = S.projects.length ? S.projects.map((p) => `<button type="button" data-id="${esc(p.id)}" aria-current="${S.p && S.p.id === p.id}">${esc(p.name)}<br><span class="small muted">${p.designStatus ? `Design v${p.designVersion}: ` + esc(p.designStatus) : p.intakeComplete ? 'Interview complete' : 'Interview in progress'}${p.packages ? ` · ${p.packages} build(s)` : ''}</span></button>`).join('') : '<p class="muted small">No experiences yet.</p>';
  $('#projects').querySelectorAll('button').forEach((b) => b.addEventListener('click', () => open(b.dataset.id)));
}

async function open(id, tab) {
  S.p = await api('GET', '/api/projects/' + id);
  S.designId = S.p.currentDesignId; S.editing = false; S.sessionId = null; S.flash = null;
  S.tab = tab || (S.p.packages.length ? 'experience' : S.p.designs.length ? 'design' : 'interview');
  history.replaceState(null, '', '/educator?p=' + id);
  render(); loadProjects();
}

function setProject(p, tab) { S.p = p; if (tab) S.tab = tab; render(); loadProjects(); }

function render() {
  const p = S.p; if (!p) return;
  const tabs = [['interview', '1. Interview'], ['design', '2. Design review'], ['experience', '3. Experience & evidence']];
  WS().innerHTML = `
    <div class="panel">
      <h1>${esc(p.name)}</h1>
      <div class="tabs" role="tablist">${tabs.map(([id, l]) => `<button type="button" role="tab" id="tab-${id}" aria-selected="${S.tab === id}" aria-controls="tabpanel" data-tab="${id}">${l}</button>`).join('')}</div>
      ${S.flash ? `<div class="banner ${S.flash.kind}" role="alert">${esc(S.flash.text)}</div>` : ''}
      <div id="tabpanel" role="tabpanel" aria-labelledby="tab-${S.tab}"></div>
    </div>`;
  WS().querySelectorAll('[data-tab]').forEach((b) => b.addEventListener('click', () => { S.tab = b.dataset.tab; S.flash = null; render(); }));
  ({ interview: renderInterview, design: renderDesign, experience: renderExperience })[S.tab]($('#tabpanel'));
}

// ------------------------------------------------------------------ interview
function renderInterview(el) {
  const p = S.p; const q = p.nextQuestion;
  el.innerHTML = `
    <div class="grid2">
      <div>
        <h2>Interview</h2>
        <div class="chat" id="ichat" tabindex="0" role="log" aria-label="Interview transcript">${p.transcript.filter((t) => t.role === 'educator' || t.echo).map((t) => `<div class="msg ${t.role}"><span class="who">${t.role === 'educator' ? 'You' : 'Primer'}</span>${esc(t.text)}</div>`).join('')}</div>
        ${q ? `<div class="qcard"><strong>${esc(q.prompt)}</strong><div class="small muted">Why I'm asking: ${esc(q.why)}</div>${q.example ? `<div class="small muted">${esc(q.example)}</div>` : ''}
          ${q.suggestions && q.suggestions.length ? `<div class="small" style="margin-top:.4rem">Suggestions from your materials (select to add): <span class="chips">${q.suggestions.map((s) => `<button type="button" class="chip" data-sugg="${esc(s)}">${esc(s)}</button>`).join('')}</span></div>` : ''}
          ${q.recommendation ? `<div class="row small" style="margin-top:.4rem"><button type="button" data-quick="roleplay">Roleplay${q.recommendation.template === 'roleplay' ? ' (recommended)' : ''}</button><button type="button" data-quick="teachback">Teachback${q.recommendation.template === 'teachback' ? ' (recommended)' : ''}</button></div>` : ''}
        </div>
        <form id="answerform"><label for="answer">Your answer</label><textarea id="answer" required></textarea>
          <div class="row" style="margin-top:.5rem"><button class="primary" type="submit">Send answer</button>${q && !q.required ? '<button type="button" id="skipq">Skip</button>' : ''}<span class="small muted">Ctrl+Enter sends</span></div></form>`
        : `<div class="banner ok">The interview is complete.</div><button class="primary" id="gen" type="button">${p.designs.length ? 'Generate a fresh design from the interview' : 'Generate design'}</button>`}
      </div>
      <div>
        <h2>Materials</h2>
        <p class="small muted">Readings, notes or cases. Primer quotes these in the learner's preparation and uses them to suggest key ideas. Text formats only: .txt, .md, .html, or paste.</p>
        <ul class="clean" id="mats">${p.materials.map((m) => `<li class="row"><span>${esc(m.name)} <span class="small muted">(${m.text.length.toLocaleString()} chars)</span></span><button type="button" class="danger small" data-delmat="${esc(m.id)}" aria-label="Remove ${esc(m.name)}">Remove</button></li>`).join('') || '<li class="muted small">No materials yet.</li>'}</ul>
        <label for="matfile" style="margin-top:.75rem">Upload a text file</label><input id="matfile" type="file" accept=".txt,.md,.html,.htm,text/plain,text/markdown,text/html">
        <label for="matpaste" style="margin-top:.75rem">Or paste text</label><textarea id="matpaste"></textarea>
        <button type="button" id="addpaste" style="margin-top:.5rem">Add pasted text</button>
      </div>
    </div>`;
  const chat = $('#ichat'); chat.scrollTop = chat.scrollHeight;
  const send = async (text) => { const r = await act(() => api('POST', `/api/projects/${p.id}/answer`, { text })); if (r) { S.flash = null; setProject(r); announce(r.nextQuestion ? 'Next question: ' + r.nextQuestion.prompt : 'Interview complete'); const a = $('#answer'); if (a) a.focus(); } };
  const f = $('#answerform');
  if (f) {
    f.addEventListener('submit', (e) => { e.preventDefault(); send($('#answer').value); });
    $('#answer').addEventListener('keydown', (e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); send($('#answer').value); } });
  }
  el.querySelectorAll('[data-sugg]').forEach((b) => b.addEventListener('click', () => { const a = $('#answer'); a.value = (a.value ? a.value.trimEnd() + '\n' : '') + b.dataset.sugg; a.focus(); }));
  el.querySelectorAll('[data-quick]').forEach((b) => b.addEventListener('click', () => send(b.dataset.quick)));
  if ($('#skipq')) $('#skipq').addEventListener('click', () => send('skip'));
  if ($('#gen')) $('#gen').addEventListener('click', async () => { const r = await act(() => api('POST', `/api/projects/${p.id}/design`)); if (r) { S.designId = r.currentDesignId; S.flash = { kind: 'ok', text: 'Design generated. Please review it carefully.' }; setProject(r, 'design'); } });
  el.querySelectorAll('[data-delmat]').forEach((b) => b.addEventListener('click', async () => { const r = await act(() => api('DELETE', `/api/projects/${p.id}/materials/${b.dataset.delmat}`)); if (r) setProject(r); }));
  $('#matfile').addEventListener('change', async (e) => {
    const file = e.target.files[0]; if (!file) return;
    if (/\.pdf$/i.test(file.name)) { S.flash = { kind: 'bad', text: 'PDF files aren\'t supported yet. Paste the text instead.' }; return render(); }
    const text = await file.text();
    const r = await act(() => api('POST', `/api/projects/${p.id}/materials`, { name: file.name, text }));
    if (r) { S.flash = { kind: 'ok', text: 'Added ' + file.name }; setProject(r); }
  });
  $('#addpaste').addEventListener('click', async () => { const r = await act(() => api('POST', `/api/projects/${p.id}/materials`, { name: 'Pasted text ' + (p.materials.length + 1), text: $('#matpaste').value })); if (r) { S.flash = { kind: 'ok', text: 'Material added.' }; setProject(r); } });
}

// ------------------------------------------------------------------ design
const SRC_LABEL = { educator: 'from you', materials: 'from your materials', ai: 'AI suggestion: check this' };
function srcTag(prov) { if (!prov) return ''; const k = prov.source === 'educator' ? 'educator' : prov.source === 'ai' ? 'ai' : 'materials'; return `<span class="src ${k}" title="${esc(prov.note || prov.ref || '')}">${SRC_LABEL[k]}</span>`; }
const STATUS_HELP = { draft: 'Draft: not yet approved', revised: 'Revised: not yet approved', 'test-approved': 'Test-approved (synthetic tester, not classroom-approved)', 'educator-approved': 'Approved by an educator', rejected: 'Rejected', superseded: 'Superseded by a newer version' };

function renderDesign(el) {
  const p = S.p;
  if (!p.designs.length) { el.innerHTML = '<p>No design yet. Finish the interview, then generate a design.</p>'; return; }
  const d = p.designs.find((x) => x.id === S.designId) || p.designs[p.designs.length - 1];
  const D = d.decisions, X = d.derived, P = d.provenance || {};
  const open = ['draft', 'revised'].includes(d.status);
  const approved = d.status.endsWith('approved');
  const builtFrom = p.packages.filter((x) => x.designVersion === d.version);
  el.innerHTML = `
    <div class="row" style="justify-content:space-between">
      <div><h2 style="display:inline">${esc(D.title)}</h2> <span class="badge ${d.status}">v${d.version} · ${esc(d.status)}</span></div>
      <label class="small" style="display:flex;gap:.4rem;align-items:center;font-weight:400">Version
        <select id="vsel">${p.designs.map((x) => `<option value="${x.id}" ${x.id === d.id ? 'selected' : ''}>v${x.version} (${x.status})</option>`).join('')}</select></label>
    </div>
    <p class="small muted">${esc(STATUS_HELP[d.status])}${d.approval ? ` · ${esc(d.approval.label)} by ${esc(d.approval.by)} on ${new Date(d.approval.at).toLocaleString()}` : ''}${d.rejection ? ` · Reason: ${esc(d.rejection.note || 'none given')}` : ''}</p>
    ${d.revisionNote ? `<p class="small"><strong>What changed:</strong> ${esc(d.revisionNote)}</p>` : ''}
    ${d.changes && d.changes.length ? `<details class="diff"><summary>${d.changes.length} change(s) from the previous version</summary><ul>${d.changes.map((c) => `<li><code>${esc(c.path)}</code>: <del>${esc(short(c.from))}</del> → <ins>${esc(short(c.to))}</ins></li>`).join('')}</ul></details>` : ''}
    ${(d.returns || []).map((r) => `<p class="small banner warn">Returned for work: "${esc(r.note)}"</p>`).join('')}
    ${d.assumptions.length ? `<div class="assume" style="margin:.75rem 0"><strong>Assumptions Primer made. Please check these:</strong><ul>${d.assumptions.map((a) => `<li>${esc(a.text)}</li>`).join('')}</ul></div>` : ''}

    <div id="editor"></div>
    <div id="readview">
    <div class="grid2" style="margin-top:.75rem">
      <section><h3>Learning goal</h3>
        <p><strong>Objective:</strong> ${esc(D.objective)} ${srcTag(P.objective)}</p>
        <p><strong>Learners:</strong> ${esc(D.learners || '—')} ${srcTag(P.learners)}</p>
        <p><strong>Prior knowledge to activate:</strong> ${esc(D.prior || '—')} ${srcTag(P.prior)}</p>
        <p><strong>Format:</strong> ${D.template === 'teachback' ? 'Teachback (the learner teaches a character)' : 'Roleplay (the learner faces a counterpart)'} ${srcTag(P.template)}</p>
        <p><strong>Difficulty:</strong> ${esc(D.difficulty)} ${srcTag(P.adaptation)}<br><span class="small muted">The coach offers a hint after ${D.adaptation.supportAfterMisses} unsuccessful attempt(s) and moves on after ${D.adaptation.maxMissesPerChallenge}. After ${D.adaptation.stretchAfterSuccesses} success(es) the bar rises and reasoning becomes required. An answer must be at least ${D.adaptation.minWordsForCredit} words to count. Practice length: up to ${D.practiceTurns} learner turns.</span></p>
        ${D.constraints ? `<p><strong>Constraints:</strong> ${esc(D.constraints)} ${srcTag(P.constraints)}</p>` : ''}
      </section>
      <section><h3>Scenario</h3>
        <p><strong>Character:</strong> ${esc(D.character.name)}, ${esc(D.character.description)} ${srcTag(P.character)}</p>
        <p><strong>Character's goal:</strong> ${esc(D.character.goal)}</p>
        <p><strong>Learner's task:</strong> ${esc(D.learnerRole)} ${srcTag(P.learnerRole)}</p>
        <p><strong>Stakes:</strong> ${esc(D.stakes)} ${srcTag(P.stakes)}</p>
      </section>
    </div>
    <section style="margin-top:.75rem"><h3>Phase 1: Preparation</h3>
      <p class="small muted">The learner first says what they already know (not graded). They then read these notes and answer retrieval questions in their own words. Primer gives cues, never answers.</p>
      <ul class="clean">${X.briefing.map((b) => { const c = D.concepts.find((x) => x.id === b.conceptId); return `<li><strong>${esc(b.label)}</strong> ${srcTag(P.concepts)} <span class="small muted">look-fors: </span><span class="chips">${c.lookFors.map((l) => `<span class="chip">${esc(l)}</span>`).join('')}</span>${c.minMatches > 1 ? ` <span class="small muted">(needs ${c.minMatches})</span>` : ''}
        ${b.excerpts.map((e) => `<div class="excerpt small">"${esc(e.text)}" <span class="src materials">${esc(e.materialName)}</span></div>`).join('')}${b.notes.map((n) => `<div class="excerpt small">Correct idea: ${esc(n)} <span class="src educator">from you</span></div>`).join('')}
        ${!b.excerpts.length && !b.notes.length ? '<div class="small muted">No material excerpt found for this idea. Consider adding a reading.</div>' : ''}</li>`; }).join('')}</ul>
      <p class="small"><strong>Retrieval questions:</strong> ${X.retrieval.map((r) => esc(r.prompt)).join(' · ')}</p>
    </section>
    <section style="margin-top:.75rem"><h3>Phase 2: Practice challenges</h3>
      <p class="small muted">${esc(D.character.name)} raises these in order. Misconceptions you listed become challenges, which creates productive friction.</p>
      <ol>${X.challenges.map((c) => `<li><em>"${esc(c.line)}"</em><br><span class="small muted">Learner succeeds by: ${esc(c.target)}${c.kind === 'misconception' ? ' · from your misconception list' : ''}</span></li>`).join('')}</ol>
    </section>
    <section style="margin-top:.75rem"><h3>Phase 3: Feedback criteria</h3> ${srcTag(P.criteria)}
      <table><thead><tr><th>Criterion</th><th>Look-fors in the learner's words</th></tr></thead><tbody>
      ${D.criteria.map((k) => `<tr><td>${esc(k.text)}</td><td><span class="chips">${k.lookFors.map((l) => `<span class="chip">${esc(l)}</span>`).join('')}</span>${k.minMatches > 1 ? ` <span class="small muted">(needs ${k.minMatches})</span>` : ''}</td></tr>`).join('')}</tbody></table>
      <p class="small muted">Feedback first asks for the learner's self-assessment. It then quotes their actual words for each criterion, labels inferences separately, marks criteria they had no chance to show as "not assessed", and ends with a transfer question.</p>
    </section>
    <details style="margin-top:.75rem"><summary>Inspect the generated prompts (used when an AI model voices the characters)</summary>
      ${Object.entries(X.prompts).map(([k, v]) => `<h4>${esc(k)}</h4><pre class="prompt">${esc(v)}</pre>`).join('')}</details>
    </div>

    <div class="panel" style="margin-top:1rem;box-shadow:none">
      <h3>Your decision</h3>
      ${open ? `
        <div class="row"><button type="button" id="editbtn">Edit this design</button></div>
        <form id="revform" style="margin-top:.75rem"><label for="revreq">Ask for a revision in plain language</label>
          <textarea id="revreq" placeholder='e.g. "Make it harder. Add criterion: asks a clarifying question. Rename the character to Sam."'></textarea>
          <button type="submit" style="margin-top:.4rem">Request revision</button></form>
        <form id="apprform" style="margin-top:1rem"><fieldset style="border:1px solid var(--line);border-radius:8px"><legend>${S.config.testMode ? 'Test approval (synthetic)' : 'Approve for your classroom'}</legend>
          <label for="apprname">Your name</label><input id="apprname" type="text" required autocomplete="name">
          <label style="font-weight:400;margin-top:.5rem"><input type="checkbox" id="apprconfirm"> I have reviewed this design, including its assumptions, and approve it for learners.</label>
          <div class="row" style="margin-top:.5rem"><button class="primary" type="submit">${S.config.testMode ? 'Record test approval' : 'Approve design'}</button></div></fieldset></form>
        <form id="retform" class="row" style="margin-top:1rem"><label for="retnote" class="visually-hidden">What needs more work</label><input id="retnote" type="text" placeholder="What needs more work?" style="flex:1"><button type="submit">Return for more work</button></form>
        <form id="rejform" class="row" style="margin-top:.5rem"><label for="rejnote" class="visually-hidden">Reason for rejecting</label><input id="rejnote" type="text" placeholder="Reason (optional)" style="flex:1"><button class="danger" type="submit">Reject design</button></form>`
      : approved ? `
        <div class="banner ${d.status === 'test-approved' ? 'test' : 'ok'}">${esc(d.approval.label)}.</div>
        <div class="row"><button class="primary" type="button" id="buildbtn">Build learner experience</button>
          <button type="button" id="editbtn">Revise (creates a new version)</button>
          <button class="danger" type="button" id="rejapproved">Withdraw (reject)</button></div>
        ${builtFrom.length ? `<p class="small">Built from this version: ${builtFrom.map((b) => `<a href="/learn/${esc(b.id)}" target="_blank" rel="noopener">${esc(b.id)}</a>`).join(', ')}</p>` : ''}`
      : `<p>This version is <strong>${esc(d.status)}</strong> and can't be changed or built. ${d.status === 'superseded' ? 'Select the latest version.' : ''}</p>${d.status === 'rejected' ? '<p class="small">To try again, regenerate a design from the interview tab.</p>' : ''}`}
    </div>`;
  $('#vsel').addEventListener('change', (e) => { S.designId = e.target.value; S.editing = false; S.flash = null; render(); });
  const after = (r, msg) => { if (!r) return; S.designId = r.currentDesignId; S.editing = false; S.flash = msg; setProject(r); };
  if ($('#editbtn')) $('#editbtn').addEventListener('click', () => { S.editing = true; renderEditor(d); });
  if ($('#revform')) $('#revform').addEventListener('submit', async (e) => { e.preventDefault(); const r = await act(() => api('POST', `/api/projects/${p.id}/designs/${d.id}/revise`, { request: $('#revreq').value })); if (r) after(r, { kind: r.revision.created ? 'ok' : 'warn', text: r.revision.message + (r.revision.unrecognized.length && r.revision.created ? ' (Not understood: "' + r.revision.unrecognized.join('", "') + '". Edit those parts directly.)' : '') }); });
  if ($('#apprform')) $('#apprform').addEventListener('submit', async (e) => { e.preventDefault(); const r = await act(() => api('POST', `/api/projects/${p.id}/designs/${d.id}/approve`, { by: $('#apprname').value, confirm: $('#apprconfirm').checked })); after(r, { kind: 'ok', text: 'Approved. You can now build the learner experience.' }); });
  if ($('#retform')) $('#retform').addEventListener('submit', async (e) => { e.preventDefault(); const r = await act(() => api('POST', `/api/projects/${p.id}/designs/${d.id}/return`, { note: $('#retnote').value })); if (r) after(r, { kind: r.revision.created ? 'ok' : 'warn', text: r.revision.message }); });
  if ($('#rejform')) $('#rejform').addEventListener('submit', async (e) => { e.preventDefault(); if (!confirm('Reject this design? A rejected design cannot be built.')) return; const r = await act(() => api('POST', `/api/projects/${p.id}/designs/${d.id}/reject`, { note: $('#rejnote').value })); if (r) { S.designId = d.id; after(r, { kind: 'warn', text: 'Design rejected.' }); S.designId = d.id; render(); } });
  if ($('#rejapproved')) $('#rejapproved').addEventListener('click', async () => { if (!confirm('Withdraw this approved design? Learners will no longer be able to start experiences built from it.')) return; const r = await act(() => api('POST', `/api/projects/${p.id}/designs/${d.id}/reject`, { note: 'Withdrawn after approval' })); if (r) { after(r, { kind: 'warn', text: 'Design withdrawn.' }); S.designId = d.id; render(); } });
  if ($('#buildbtn')) $('#buildbtn').addEventListener('click', async () => { const r = await act(() => api('POST', `/api/projects/${p.id}/designs/${d.id}/build`)); if (r) { S.flash = { kind: 'ok', text: 'Experience built. Share the learner link from the Experience tab.' }; setProject(r.project, 'experience'); } });
  if (S.editing) renderEditor(d);
}

function short(v) { const s = typeof v === 'string' ? v : JSON.stringify(v); return s && s.length > 140 ? s.slice(0, 139) + '…' : s; }

function renderEditor(d) {
  const D = d.decisions;
  $('#readview').hidden = true;
  $('#editor').innerHTML = `<form id="editform" class="panel" style="box-shadow:none"><h3>Edit design (saving creates version ${Math.max(...S.p.designs.map((x) => x.version)) + 1})</h3>
    <div class="grid2">
      <div><label for="e-title">Title</label><input id="e-title" type="text" value="${esc(D.title)}"></div>
      <div><label for="e-template">Format</label><select id="e-template"><option value="roleplay" ${D.template === 'roleplay' ? 'selected' : ''}>Roleplay</option><option value="teachback" ${D.template === 'teachback' ? 'selected' : ''}>Teachback</option></select></div>
    </div>
    <label for="e-objective">Objective</label><textarea id="e-objective">${esc(D.objective)}</textarea>
    <div class="grid2">
      <div><label for="e-cname">Character name</label><input id="e-cname" type="text" value="${esc(D.character.name)}"></div>
      <div><label for="e-difficulty">Difficulty</label><select id="e-difficulty">${['supportive', 'standard', 'challenging'].map((x) => `<option ${D.difficulty === x ? 'selected' : ''}>${x}</option>`).join('')}</select></div>
    </div>
    <label for="e-cdesc">Character description</label><textarea id="e-cdesc">${esc(D.character.description)}</textarea>
    <label for="e-cgoal">Character's goal</label><input id="e-cgoal" type="text" value="${esc(D.character.goal)}">
    <label for="e-role">Learner's task</label><textarea id="e-role">${esc(D.learnerRole)}</textarea>
    <label for="e-stakes">Stakes</label><input id="e-stakes" type="text" value="${esc(D.stakes)}">
    <label for="e-concepts">Key ideas: one per line, written as <code>idea | look-for, look-for</code></label><textarea id="e-concepts" rows="5">${esc(D.concepts.map((c) => `${c.label} | ${c.lookFors.join(', ')}`).join('\n'))}</textarea>
    <label for="e-mis">Misconceptions: one per line, written as <code>misconception — correct idea</code></label><textarea id="e-mis" rows="4">${esc(D.misconceptions.map((m) => m.text + (m.correction ? ' — ' + m.correction : '')).join('\n'))}</textarea>
    <label for="e-crit">Feedback criteria: one per line, written as <code>criterion | look-for, look-for</code></label><textarea id="e-crit" rows="4">${esc(D.criteria.map((k) => `${k.text} | ${k.lookFors.join(', ')}`).join('\n'))}</textarea>
    <div class="grid2"><div><label for="e-turns">Practice length (learner turns)</label><input id="e-turns" type="text" inputmode="numeric" value="${D.practiceTurns}"></div>
    <div><label for="e-cons">Constraints</label><input id="e-cons" type="text" value="${esc(D.constraints || '')}"></div></div>
    <div class="row" style="margin-top:.75rem"><button class="primary" type="submit">Save as new version</button><button type="button" id="cancel">Cancel</button></div></form>`;
  $('#cancel').addEventListener('click', () => { S.editing = false; render(); });
  $('#editform').addEventListener('submit', async (e) => {
    e.preventDefault();
    const lines = (id) => $(id).value.split('\n').map((s) => s.trim()).filter(Boolean);
    const pipe = (l) => { const [a, b] = l.split('|'); return [a.trim(), b ? b.split(',').map((x) => x.trim()).filter(Boolean) : []]; };
    const concepts = lines('#e-concepts').map((l, i) => { const [label, lookFors] = pipe(l); const old = D.concepts[i]; return { id: old && old.label === label ? old.id : undefined, label, lookFors }; });
    const misconceptions = lines('#e-mis').map((l, i) => { const [text, correction] = l.split(/\s+[—–]\s+|\s+-\s+/); const old = D.misconceptions[i]; return { id: old ? old.id : undefined, text: text.trim(), correction: (correction || '').trim(), conceptId: old && old.text === text.trim() ? old.conceptId : undefined }; });
    const criteria = lines('#e-crit').map((l, i) => { const [text, lookFors] = pipe(l); const old = D.criteria[i]; return { id: old ? old.id : undefined, text, lookFors, conceptIds: old && old.text === text ? old.conceptIds : undefined }; });
    const edits = { title: $('#e-title').value, template: $('#e-template').value, objective: $('#e-objective').value, character: { name: $('#e-cname').value, description: $('#e-cdesc').value, goal: $('#e-cgoal').value }, learnerRole: $('#e-role').value, stakes: $('#e-stakes').value, concepts, misconceptions, criteria, practiceTurns: Number($('#e-turns').value), constraints: $('#e-cons').value };
    if ($('#e-difficulty').value !== D.difficulty) edits.difficulty = $('#e-difficulty').value;
    const r = await act(() => api('POST', `/api/projects/${S.p.id}/designs/${d.id}/revise`, { edits }));
    if (r) { S.designId = r.currentDesignId; S.editing = false; S.flash = { kind: r.revision.created ? 'ok' : 'warn', text: r.revision.message }; setProject(r); }
  });
}

// ------------------------------------------------------------------ experience & evidence
async function renderExperience(el) {
  const p = S.p;
  if (!p.packages.length) { el.innerHTML = '<p>No experience built yet. Approve a design, then select "Build learner experience".</p>'; return; }
  el.innerHTML = '<p class="muted">Loading…</p>';
  const lists = await Promise.all(p.packages.map((x) => api('GET', `/api/packages/${x.id}/sessions`)));
  el.innerHTML = `<h2>Learner experiences</h2><ul class="clean">${p.packages.map((x, i) => `<li>
      <div class="row"><strong>${esc(x.title)}</strong> <span class="badge">from design v${x.designVersion}</span>${x.testOnly ? '<span class="badge test">TEST BUILD: synthetic approval</span>' : ''}</div>
      <div class="row small">Learner link: <a href="/learn/${esc(x.id)}" target="_blank" rel="noopener">${esc(location.origin)}/learn/${esc(x.id)}</a></div>
      <table style="margin-top:.4rem"><thead><tr><th>Learner</th><th>Status</th><th>Turns</th><th>Evidence</th><th>Adaptations</th><th></th></tr></thead><tbody>
      ${lists[i].map((s) => `<tr><td>${esc(s.learnerName)}</td><td>${esc(s.phase)}</td><td>${s.turns}</td><td>${s.evidence}</td><td>${s.adaptations}</td><td><button type="button" data-ses="${esc(s.id)}">View evidence</button></td></tr>`).join('') || '<tr><td colspan="6" class="muted">No sessions yet.</td></tr>'}
      </tbody></table></li>`).join('')}</ul><div id="sesdetail"></div>`;
  el.querySelectorAll('[data-ses]').forEach((b) => b.addEventListener('click', () => { S.sessionId = b.dataset.ses; showSession(); }));
  if (S.sessionId) showSession();
}

async function showSession() {
  const [s, tr] = await Promise.all([api('GET', '/api/sessions/' + S.sessionId), api('GET', `/api/sessions/${S.sessionId}/trace`)]);
  const fb = s.feedback;
  $('#sesdetail').innerHTML = `<div class="panel" style="box-shadow:none;margin-top:1rem"><h2>Session: ${esc(s.learnerName)} <span class="badge">${esc(s.phase)}</span></h2>
    <h3>Trace: from your input to evidence</h3>
    <table><thead><tr><th>Criterion (your words)</th><th>Look-fors</th><th>Evidence observed</th><th>Feedback</th></tr></thead><tbody>
    ${tr.criteria.map((c) => `<tr><td>${esc(c.text)}</td><td>${c.lookFors.map(esc).join(', ')}</td><td>${c.evidence.map((e) => `<div class="small">"${esc(e.quote)}" <span class="muted">(${esc(e.phase)}, ${esc(e.turnId)})</span></div>`).join('') || '<span class="muted small">none</span>'}</td><td>${c.feedbackStatus ? `<span class="badge ${c.feedbackStatus}">${esc(c.feedbackStatus)}</span>` : '—'}</td></tr>`).join('')}</tbody></table>
    <h3 style="margin-top:1rem">Practice challenges</h3><table><thead><tr><th>Challenge</th><th>Came from</th><th>Outcome</th></tr></thead><tbody>
    ${tr.challenges.map((c) => `<tr><td>${esc(c.line)}</td><td class="small">${c.misconception ? 'Your misconception: "' + esc(c.misconception.text) + '"' : 'Your key ideas'}</td><td><span class="badge ${c.outcome === 'not-yet' ? 'not-yet' : c.outcome.startsWith('resolved') ? 'demonstrated' : 'not-assessed'}">${esc(c.outcome)}</span></td></tr>`).join('')}</tbody></table>
    <h3 style="margin-top:1rem">Adaptations (each tied to an approved rule)</h3>
    <ul>${tr.adaptations.map((a) => `<li class="small"><strong>${esc(a.type)}</strong> · ${esc(a.rule || '')} ${a.approvedRule ? `(approved value: ${esc(JSON.stringify(a.approvedRule))})` : ''}: ${esc(a.reason || a.response || '')} <span class="muted">(${esc(a.turnId || '')})</span></li>`).join('') || '<li class="muted small">None</li>'}</ul>
    ${fb ? `<h3>Feedback given</h3><p class="small">Self-assessment: "${esc(fb.selfAssessment.quote)}"</p><ul>${fb.criteria.map((c) => `<li><span class="badge ${c.status}">${esc(c.status)}</span> ${esc(c.text)}</li>`).join('')}</ul>` : ''}
    <details><summary>Full transcript (${s.transcript.length} turns)</summary><div class="chat" style="max-height:none" tabindex="0" role="log" aria-label="Session transcript">${s.transcript.map((t) => `<div class="msg ${t.role}"><span class="who">${esc(t.speaker || t.role)} · ${esc(t.id)} · ${esc(t.phase)}</span>${esc(t.text)}</div>`).join('')}</div></details>
    <p><button type="button" id="replaybtn">Verify by deterministic replay</button> <span id="replayout" class="small"></span></p></div>`;
  $('#replaybtn').addEventListener('click', async () => { const r = await api('POST', `/api/sessions/${s.id}/replay`); $('#replayout').textContent = r.identical ? 'Replay matches: the same inputs produce the same evidence and feedback.' : 'Replay differs. This is expected if an AI provider voiced the characters.'; });
}

init().catch((e) => { WS().innerHTML = `<div class="panel err" role="alert">${esc(e.message)}</div>`; });
