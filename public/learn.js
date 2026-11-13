/* Learner runtime UI. Shows only learner-facing content; all pedagogy runs server-side. */
const pkgId = location.pathname.split('/').pop();
const KEY = 'primerSession:' + pkgId;
const app = document.getElementById('app');
let V = null; let info = null; let busy = false; let error = '';

async function init() {
  try { info = await api('GET', '/api/learn/' + pkgId); } catch (e) { app.innerHTML = `<div class="panel err" role="alert">${esc(e.status === 404 ? 'This experience link is not valid. Check the link your instructor shared.' : e.message)}</div>`; return; }
  document.getElementById('xtitle').textContent = info.title;
  document.title = 'Primer — ' + info.title;
  const sid = new URLSearchParams(location.search).get('s') || (() => { try { return localStorage.getItem(KEY); } catch { return null; } })();
  if (sid) { try { V = await api('GET', '/api/learn/sessions/' + sid); } catch { V = null; } }
  if (V) { setSid(V.id); render(); } else welcome();
}

function setSid(id) { try { localStorage.setItem(KEY, id); } catch {} const u = new URL(location.href); u.searchParams.set('s', id); history.replaceState(null, '', u); }

function welcome() {
  app.innerHTML = `<div class="panel">
    ${info.testOnly ? '<div class="banner test" role="note">Test build: this experience was approved by a synthetic tester, not yet by an educator.</div>' : ''}
    <h1>${esc(info.title)}</h1>
    <p><strong>${esc(info.purpose)}</strong></p>
    <p>${esc(info.role)}</p>
    <p>This experience has three parts: ${info.phases.map(esc).join(' → ')}. You'll do the thinking. A coach may give hints, but nobody will hand you the answer.</p>
    <form id="startform"><label for="lname">Your name or nickname</label><input id="lname" type="text" autocomplete="nickname" required>
      <button class="primary" type="submit" style="margin-top:.6rem">Begin</button></form></div>`;
  document.getElementById('startform').addEventListener('submit', async (e) => {
    e.preventDefault();
    try { V = await api('POST', `/api/learn/${pkgId}/sessions`, { learnerName: document.getElementById('lname').value }); setSid(V.id); render(); } catch (err) { error = err.message; welcome(); app.insertAdjacentHTML('afterbegin', `<div class="banner bad" role="alert">${esc(error)}</div>`); }
  });
}

const PHASES = [['preparation', 'Preparation'], ['practice', 'Practice'], ['feedback', 'Feedback & reflection']];
const WHO = { guide: 'Guide', coach: 'Coach (hint)', learner: 'You' };

function render() {
  const phaseIdx = V.phase === 'ended' ? 3 : PHASES.findIndex(([p]) => p === V.phase);
  const ch = V.learner.character;
  const ended = V.status === 'complete';
  app.innerHTML = `
    ${V.testOnly ? '<div class="banner test" role="note">Test build: approved by a synthetic tester, not yet by an educator.</div>' : ''}
    <ol class="stepper" aria-label="Progress">${PHASES.map(([p, l], i) => `<li ${i === phaseIdx ? 'aria-current="step"' : ''} class="${i < phaseIdx ? 'done' : ''}">${i < phaseIdx ? '✓ ' : ''}${l}</li>`).join('')}</ol>
    <div class="layout">
      <aside class="panel">
        <h2>Your mission</h2>
        <p class="small"><strong>${esc(V.learner.purpose)}</strong></p>
        <p class="small">${esc(V.learner.role)}</p>
        ${V.phase !== 'preparation' ? `<h3>${esc(ch.name)}</h3><p class="small">${esc(ch.description)}</p><p class="small muted">${esc(V.learner.stakes)}</p>` : ''}
        ${V.phase === 'practice' && !V.practiceDone ? `<p class="small muted">Challenge ${V.progress.current} of ${V.progress.challenges}</p>` : ''}
        <details ${V.phase === 'preparation' ? 'open' : ''}><summary>Preparation notes</summary>
          ${V.briefing.map((b) => `<div style="margin:.5rem 0"><strong>${esc(b.label)}</strong>${b.excerpts.map((e) => `<div class="excerpt small">"${esc(e.text)}" <span class="muted">(${esc(e.source)})</span></div>`).join('')}${b.notes.map((n) => `<div class="excerpt small">${esc(n)}</div>`).join('')}</div>`).join('')}
        </details>
      </aside>
      <section class="panel" aria-labelledby="convhead">
        <h2 id="convhead">${V.phase === 'practice' ? 'Practice with ' + esc(ch.name) : V.phase === 'preparation' ? 'Preparation' : V.phase === 'feedback' ? 'Feedback & reflection' : 'Experience complete'}</h2>
        <div class="chat" id="chat" tabindex="0" role="log" aria-live="polite" aria-label="Conversation">${V.transcript.map(msg).join('')}</div>
        ${error ? `<p class="err" role="alert">${esc(error)}</p>` : ''}
        ${V.feedback ? feedbackPanel(V.feedback) : ''}
        ${ended ? `<div class="banner ok" role="status" style="margin-top:1rem">This experience has ended. Thank you! You can close this page.</div>` : `
        <form id="msgform" style="margin-top:.75rem"><label for="msg">${V.phase === 'practice' ? 'Your reply to ' + esc(ch.name) : 'Your response'}</label>
          <textarea id="msg" ${busy ? 'disabled' : ''}></textarea>
          <div class="row" style="margin-top:.5rem"><button class="primary" type="submit" ${busy ? 'disabled' : ''}>Send</button>
          ${V.canAdvance ? `<button type="button" id="advance">${V.phase === 'preparation' ? 'Start practice →' : V.practiceDone ? 'Continue to feedback →' : 'Wrap up practice →'}</button>` : ''}
          <span class="small muted">Ctrl+Enter sends</span></div></form>`}
      </section>
    </div>`;
  const chat = document.getElementById('chat'); chat.scrollTop = chat.scrollHeight;
  const f = document.getElementById('msgform');
  if (f) {
    f.addEventListener('submit', (e) => { e.preventDefault(); send(); });
    document.getElementById('msg').addEventListener('keydown', (e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); send(); } });
    if (!busy) document.getElementById('msg').focus();
  }
  const adv = document.getElementById('advance');
  if (adv) adv.addEventListener('click', async () => {
    if (V.phase === 'practice' && !V.practiceDone && !confirm('Wrap up practice now? Any challenges you haven\'t reached won\'t be assessed.')) return;
    await call(() => api('POST', `/api/learn/sessions/${V.id}/advance`));
  });
}

function msg(t) {
  const who = t.role === 'character' ? (t.speaker || 'Character') : WHO[t.role] || t.role;
  return `<div class="msg ${esc(t.role)}"><span class="who">${esc(who)}</span>${esc(t.text)}</div>`;
}

function feedbackPanel(f) {
  const label = { demonstrated: 'Demonstrated', partially: 'Partly shown', 'not-yet': 'Not yet', 'not-assessed': 'Not assessed' };
  return `<section class="panel" style="box-shadow:none;margin-top:1rem" aria-labelledby="fbhead"><h2 id="fbhead">Your feedback</h2>
    <p class="small muted">${esc(f.method)}</p>
    <p><strong>You said about yourself:</strong> "${esc(f.selfAssessment.quote)}"<br><span class="small">${esc(f.selfAssessment.alignment)}</span></p>
    <h3>Criteria</h3><ul class="clean">${f.criteria.map((c) => `<li><span class="badge ${c.status}">${label[c.status]}</span> ${esc(c.text)}
      ${c.observations.map((o) => `<div class="excerpt small">Observation: you said "${esc(o.quote)}" <span class="muted">(${esc(o.phase)})</span></div>`).join('')}
      ${c.inference ? `<div class="small muted">Inference: ${esc(c.inference)}</div>` : ''}${c.status === 'not-assessed' ? '<div class="small muted">You didn\'t get an opportunity to show this, so it isn\'t assessed.</div>' : ''}</li>`).join('')}</ul>
    ${f.strengths.length ? `<h3>Strengths</h3><ul>${f.strengths.map((s) => `<li>${esc(s.text)}${s.observation ? ` <span class="small">(you said "${esc(s.observation.quote)}")</span>` : ''}</li>`).join('')}</ul>` : ''}
    ${f.growth.length ? `<h3>Growth areas</h3><ul>${f.growth.map((g) => `<li>${esc(g.text)}${g.observation ? `<div class="small">Observation: you said "${esc(g.observation.quote)}"</div>` : ''}</li>`).join('')}</ul>` : ''}
    <h3>Next steps</h3><ul>${f.nextActions.map((n) => `<li>${esc(n)}</li>`).join('')}</ul></section>`;
}

async function send() {
  const box = document.getElementById('msg'); const text = box.value.trim();
  if (!text) { error = 'Please type a response first.'; render(); return; }
  await call(() => api('POST', `/api/learn/sessions/${V.id}/message`, { text }), text);
}

async function call(fn, pending) {
  busy = true; error = '';
  try { V = await fn(); const last = V.transcript[V.transcript.length - 1]; announce((last.role === 'character' ? last.speaker : WHO[last.role] || '') + ': ' + last.text); }
  catch (e) {
    error = e.status === 409 || e.status === 400 ? e.message : 'Something went wrong. Your progress is saved, so try again in a moment.';
    try { V = await api('GET', '/api/learn/sessions/' + V.id); } catch {}
  }
  busy = false; render();
  if (error && pending) { const b = document.getElementById('msg'); if (b) b.value = pending; }
}

init();
