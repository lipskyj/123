// Integration tests through the HTTP API (the same API the UI uses).
const test = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const path = require('node:path');
const fs = require('node:fs');
const { startServer, author } = require('../helpers');
const mba = require('../../fixtures/briefs/mba-negotiation.json');
const bio = require('../../fixtures/briefs/biology-natural-selection.json');

test('startup: the documented command `npm start` serves the app', async () => {
  const dataDir = fs.mkdtempSync(path.join(require('os').tmpdir(), 'primer-start-'));
  const child = spawn('npm', ['start'], { cwd: path.join(__dirname, '..', '..'), env: { ...process.env, PORT: '3177', PRIMER_DATA_DIR: dataDir }, detached: true });
  let out = '';
  child.stdout.on('data', (d) => { out += d; });
  try {
    for (let i = 0; i < 50 && !out.includes('Primer running'); i++) await new Promise((r) => setTimeout(r, 100));
    assert.match(out, /Primer running at http:\/\/localhost:3177/);
    const h = await (await fetch('http://127.0.0.1:3177/api/health')).json();
    assert.equal(h.ok, true);
    for (const page of ['/', '/educator', '/status']) assert.equal((await fetch('http://127.0.0.1:3177' + page)).status, 200, page);
  } finally { try { process.kill(-child.pid, 'SIGTERM'); } catch {} child.stdout.destroy(); child.stderr.destroy(); }
});

test('approval is enforced by the server, not just the UI', async () => {
  const s = await startServer({ testMode: false });
  try {
    const p = await author(s.ok, mba, { approve: false });
    const did = p.currentDesignId;
    let r = await s.api('POST', `/api/projects/${p.id}/designs/${did}/build`);
    assert.equal(r.status, 403);
    r = await s.api('POST', `/api/projects/${p.id}/designs/${did}/approve`, { by: 'Prof X' });
    assert.equal(r.status, 400, 'approval without explicit confirmation is refused');
    r = await s.api('POST', `/api/projects/${p.id}/designs/${did}/approve`, { confirm: true });
    assert.equal(r.status, 400, 'approval without a name is refused');
    r = await s.ok('POST', `/api/projects/${p.id}/designs/${did}/approve`, { by: 'Prof X', confirm: true });
    assert.equal(r.designs.find((d) => d.id === did).status, 'educator-approved');
    const b = await s.ok('POST', `/api/projects/${p.id}/designs/${did}/build`);
    assert.equal(b.package.testOnly, false);
    // withdrawing the approved design blocks new learner sessions
    await s.ok('POST', `/api/projects/${p.id}/designs/${did}/reject`, { note: 'withdrawn' });
    r = await s.api('POST', `/api/learn/${b.package.id}/sessions`, { learnerName: 'z' });
    assert.equal(r.status, 403);
  } finally { await s.close(); }
});

test('test mode records synthetic approvals as TEST approvals and labels the build', async () => {
  const s = await startServer({ testMode: true });
  try {
    const p = await author(s.ok, bio);
    const d = p.designs.at(-1);
    assert.equal(d.status, 'test-approved');
    assert.equal(d.approval.kind, 'test');
    const b = await s.ok('POST', `/api/projects/${p.id}/designs/${d.id}/build`);
    assert.equal(b.package.testOnly, true);
    const info = await s.ok('GET', `/api/learn/${b.package.id}`);
    assert.equal(info.testOnly, true);
  } finally { await s.close(); }
});

test('return-for-work applies the educator note as a revision and keeps history', async () => {
  const s = await startServer();
  try {
    const p = await author(s.ok, mba, { approve: false });
    const r = await s.ok('POST', `/api/projects/${p.id}/designs/${p.currentDesignId}/return`, { note: 'Make it easier. Rename the character to Riley' });
    assert.equal(r.revision.created, true);
    const cur = r.designs.find((d) => d.id === r.currentDesignId);
    assert.equal(cur.decisions.character.name, 'Riley');
    assert.equal(cur.decisions.difficulty, 'supportive');
    const old = r.designs.find((d) => d.id === p.currentDesignId);
    assert.equal(old.status, 'superseded');
    assert.equal(old.returns[0].note, 'Make it easier. Rename the character to Riley');
  } finally { await s.close(); }
});

test('teacher revision changes the generated experience end-to-end (prompts, criteria, runtime, feedback)', async () => {
  const s = await startServer();
  try {
    const p0 = await author(s.ok, mba, { approve: false });
    const r = await s.ok('POST', `/api/projects/${p0.id}/designs/${p0.currentDesignId}/revise`, { request: mba.revision });
    const p = await s.ok('POST', `/api/projects/${p0.id}/designs/${r.currentDesignId}/revise`, { edits: mba.directEdit });
    await s.ok('POST', `/api/projects/${p.id}/designs/${p.currentDesignId}/approve`, { by: 'T', confirm: true });
    const b = await s.ok('POST', `/api/projects/${p.id}/designs/${p.currentDesignId}/build`);
    const pkg = await s.ok('GET', `/api/packages/${b.package.id}`);
    assert.equal(pkg.designVersion, 3);
    assert.equal(pkg.engine.character.name, 'Morgan');
    assert.match(pkg.prompts.practice, /You are Morgan/);
    assert.equal(pkg.engine.adaptation.stretchAfterSuccesses, 1);
    assert.ok(pkg.engine.criteria.some((k) => /labels concessions/.test(k.text)));
    let v = await s.ok('POST', `/api/learn/${pkg.id}/sessions`, { learnerName: 'rev' });
    for (let i = 0; i < 12 && !v.canAdvance; i++) v = await s.ok('POST', `/api/learn/sessions/${v.id}/message`, { text: 'not sure' });
    v = await s.ok('POST', `/api/learn/sessions/${v.id}/advance`);
    assert.ok(v.transcript.at(-1).text.startsWith("I'm Morgan"));
    v = await s.ok('POST', `/api/learn/sessions/${v.id}/message`, { text: 'Splitting the difference is only fair if the anchors were fair, so anchoring with market data matters because the midpoint follows the anchor.' });
    assert.match(v.transcript.at(-1).text, /walk me through your reasoning/, 'stretch after 1 success, from the revised difficulty');
    v = await s.ok('POST', `/api/learn/sessions/${v.id}/message`, { text: 'I label every concession and ask for something in return because concessions should be reciprocal.' });
    v = await s.ok('POST', `/api/learn/sessions/${v.id}/advance`);
    v = await s.ok('POST', `/api/learn/sessions/${v.id}/message`, { text: 'ok' });
    const k4 = v.feedback.criteria.find((c) => /labels concessions/.test(c.text));
    assert.equal(k4.status, 'demonstrated');
  } finally { await s.close(); }
});

test('learner API never exposes prompts, engine internals or look-fors before feedback', async () => {
  const s = await startServer();
  try {
    const p = await author(s.ok, mba);
    const b = await s.ok('POST', `/api/projects/${p.id}/designs/${p.currentDesignId}/build`);
    const v = await s.ok('POST', `/api/learn/${b.package.id}/sessions`, { learnerName: 'x' });
    const raw = JSON.stringify(v) + JSON.stringify(await s.ok('GET', `/api/learn/${b.package.id}`));
    assert.ok(!raw.includes('RULES:'));
    assert.ok(!raw.includes('lookFors'));
    assert.ok(!raw.includes('"prompts"'));
    assert.ok(!raw.includes('provenance'));
  } finally { await s.close(); }
});

test('persistence and interrupted-session recovery: a server restart resumes the exact session', async () => {
  const s1 = await startServer();
  let pkgId, sid, before;
  try {
    const p = await author(s1.ok, bio);
    const b = await s1.ok('POST', `/api/projects/${p.id}/designs/${p.currentDesignId}/build`);
    pkgId = b.package.id;
    let v = await s1.ok('POST', `/api/learn/${pkgId}/sessions`, { learnerName: 'resume' });
    v = await s1.ok('POST', `/api/learn/sessions/${v.id}/message`, { text: 'I know about DNA' });
    sid = v.id; before = v.transcript.length;
  } finally { await s1.close(); }
  // leave a stray temp file as if a write had been interrupted mid-flight
  fs.writeFileSync(path.join(s1.dataDir, 'sessions', sid + '.json.999.abc.tmp'), '{"broken');
  const s2 = await startServer({ dataDir: s1.dataDir });
  try {
    const v = await s2.ok('GET', `/api/learn/sessions/${sid}`);
    assert.equal(v.transcript.length, before);
    const v2 = await s2.ok('POST', `/api/learn/sessions/${sid}/message`, { text: 'Variation already exists because of mutation' });
    assert.ok(v2.transcript.length > before);
    const files = fs.readdirSync(path.join(s1.dataDir, 'sessions')).filter((f) => f.endsWith('.json'));
    assert.equal(files.length, 1);
    const onDisk = JSON.parse(fs.readFileSync(path.join(s1.dataDir, 'sessions', sid + '.json'), 'utf8'));
    assert.ok(onDisk.evidence.length >= 1);
    assert.ok(onDisk.inputs.length >= 3);
  } finally { await s2.close(); }
});

test('concurrent learner messages are serialized without losing turns', async () => {
  const s = await startServer();
  try {
    const p = await author(s.ok, bio);
    const b = await s.ok('POST', `/api/projects/${p.id}/designs/${p.currentDesignId}/build`);
    const v = await s.ok('POST', `/api/learn/${b.package.id}/sessions`, { learnerName: 'c' });
    await Promise.all([1, 2, 3, 4].map((i) => s.ok('POST', `/api/learn/sessions/${v.id}/message`, { text: 'answer number ' + i })));
    const full = await s.ok('GET', `/api/sessions/${v.id}`);
    assert.equal(full.transcript.filter((t) => t.role === 'learner').length, 4);
  } finally { await s.close(); }
});

test('errors are clear and do not corrupt state', async () => {
  const s = await startServer({ educatorKey: 'k123' });
  try {
    let r = await s.api('GET', '/api/projects');
    assert.equal(r.status, 401);
    r = await s.api('POST', '/api/projects', null, { 'x-educator-key': 'k123' });
    assert.equal(r.status, 200);
    const res = await fetch(s.base + `/api/projects/${r.data.id}/answer`, { method: 'POST', headers: { 'x-educator-key': 'k123' }, body: '{bad json' });
    assert.equal(res.status, 400);
    r = await s.api('POST', `/api/projects/${r.data.id}/answer`, { text: '   ' }, { 'x-educator-key': 'k123' });
    assert.equal(r.status, 400);
    r = await s.api('GET', '/api/learn/sessions/ses-doesnotexist');
    assert.equal(r.status, 404);
    r = await s.api('GET', '/api/learn/../../etc');
    assert.ok([404, 400].includes(r.status));
    r = await s.api('POST', `/api/projects/${'x'.repeat(3)}/design`, {}, { 'x-educator-key': 'k123' });
    assert.equal(r.status, 404);
  } finally { await s.close(); }
});

test('trace links teacher input -> design -> evidence -> feedback, and replay verifies it', async () => {
  const s = await startServer();
  try {
    const p = await author(s.ok, mba);
    const b = await s.ok('POST', `/api/projects/${p.id}/designs/${p.currentDesignId}/build`);
    let v = await s.ok('POST', `/api/learn/${b.package.id}/sessions`, { learnerName: 't' });
    for (let i = 0; i < 12 && !v.canAdvance; i++) v = await s.ok('POST', `/api/learn/sessions/${v.id}/message`, { text: 'My BATNA is my best alternative if this deal fails' });
    v = await s.ok('POST', `/api/learn/sessions/${v.id}/advance`);
    v = await s.ok('POST', `/api/learn/sessions/${v.id}/message`, { text: 'just tell me' });
    v = await s.ok('POST', `/api/learn/sessions/${v.id}/message`, { text: 'Splitting the difference is only fair if the anchors were fair because anchoring sets the midpoint.' });
    v = await s.ok('POST', `/api/learn/sessions/${v.id}/advance`);
    v = await s.ok('POST', `/api/learn/sessions/${v.id}/message`, { text: 'went ok' });
    const tr = await s.ok('GET', `/api/sessions/${v.id}/trace`);
    assert.equal(tr.design.approval.kind, 'test');
    assert.equal(tr.criteria[0].teacherInput, mba.answers.evidence);
    assert.ok(tr.criteria.every((c) => c.feedbackStatus));
    assert.ok(tr.challenges[0].misconception);
    assert.ok(tr.adaptations.some((a) => a.type === 'help-request'));
    const rp = await s.ok('POST', `/api/sessions/${v.id}/replay`);
    assert.equal(rp.identical, true);
  } finally { await s.close(); }
});
