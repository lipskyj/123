// Primer HTTP server: educator authoring API, learner runtime API, static UI.
// Zero runtime dependencies (Node >= 20).
const http = require('http');
const fs = require('fs');
const path = require('path');
const { Store, newId, now } = require('./store');
const intake = require('./intake');
const design = require('./design');
const { compile } = require('./compile');
const runtime = require('./runtime');
const providers = require('./providers');

const ROOT = path.join(__dirname, '..');
const PUBLIC = path.join(ROOT, 'public');
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.svg': 'image/svg+xml', '.md': 'text/markdown; charset=utf-8' };

function createApp(opts = {}) {
  const store = new Store(opts.dataDir || process.env.PRIMER_DATA_DIR || path.join(ROOT, 'data'));
  const testMode = opts.testMode ?? process.env.PRIMER_TEST_MODE === '1';
  const provider = opts.provider || providers.fromEnv();
  const educatorKey = opts.educatorKey ?? process.env.PRIMER_EDUCATOR_KEY ?? '';
  const locks = new Map();

  // Serialize mutations per record so concurrent requests never lose updates.
  function withLock(key, fn) {
    const prev = locks.get(key) || Promise.resolve();
    const p = prev.catch(() => {}).then(fn);
    // The stored tail must never reject, or a handler error becomes an unhandled rejection that kills the process.
    const tail = p.then(() => {}, () => {});
    locks.set(key, tail);
    tail.then(() => { if (locks.get(key) === tail) locks.delete(key); });
    return p;
  }
  const notFound = (what) => Object.assign(new Error(what + ' not found'), { status: 404 });
  const getProject = (id) => store.get('projects', id) || (() => { throw notFound('Project'); })();
  const getPkg = (id) => store.get('packages', id) || (() => { throw notFound('Experience'); })();
  const getSession = (id) => store.get('sessions', id) || (() => { throw notFound('Session'); })();

  function projectSummary(p) {
    const cur = currentDesign(p);
    return { id: p.id, name: p.name, createdAt: p.createdAt, intakeComplete: p.intake.complete, designStatus: cur ? cur.status : null, designVersion: cur ? cur.version : null, packages: store.list('packages').filter((x) => x.projectId === p.id).length };
  }
  function currentDesign(p) { return [...p.designs].reverse().find((d) => d.status !== 'superseded') || p.designs[p.designs.length - 1] || null; }
  function projectView(p) {
    return { ...p, nextQuestion: intake.nextQuestion(p), currentDesignId: (currentDesign(p) || {}).id || null, packages: store.list('packages').filter((x) => x.projectId === p.id).map((x) => ({ id: x.id, designVersion: x.designVersion, createdAt: x.createdAt, testOnly: x.testOnly, title: x.title })) };
  }

  const routes = [];
  const R = (method, pattern, handler, opt = {}) => routes.push({ method, re: new RegExp('^' + pattern.replace(/:(\w+)/g, '(?<$1>[A-Za-z0-9-]+)') + '$'), handler, educator: opt.educator !== false && pattern.startsWith('/api/') && !pattern.startsWith('/api/learn') && !pattern.startsWith('/api/config') && !pattern.startsWith('/api/health') });

  R('GET', '/api/health', () => ({ ok: true, time: now() }));
  R('GET', '/api/config', () => ({ testMode, provider: provider.name, educatorKeyRequired: !!educatorKey }));

  // ---------------- educator authoring
  R('GET', '/api/projects', () => store.list('projects').sort((a, b) => b.createdAt.localeCompare(a.createdAt)).map(projectSummary));
  R('POST', '/api/projects', ({ body }) => {
    const p = { id: newId('prj'), name: String(body.name || 'Untitled experience').slice(0, 120), createdAt: now(), intake: { answers: {}, complete: false }, materials: [], transcript: [], designs: [], log: [] };
    p.transcript.push({ id: newId('t'), role: 'primer', text: 'Hi! I\'ll ask you one question at a time to design a practice experience for your learners. ' + intake.nextQuestion(p).prompt, field: 'topic', at: now(), echo: true });
    store.put('projects', p);
    return projectView(p);
  });
  R('GET', '/api/projects/:id', ({ params }) => projectView(getProject(params.id)));
  R('POST', '/api/projects/:id/answer', ({ params, body }) => withLock(params.id, () => {
    const p = getProject(params.id);
    const r = intake.answer(p, body.text);
    store.put('projects', p);
    return { ...projectView(p), result: r };
  }));
  R('POST', '/api/projects/:id/materials', ({ params, body }) => withLock(params.id, () => {
    const p = getProject(params.id);
    const m = intake.addMaterial(p, body);
    p.log.push({ at: now(), action: 'material-added', materialId: m.id, name: m.name });
    store.put('projects', p);
    return projectView(p);
  }));
  R('DELETE', '/api/projects/:id/materials/:mid', ({ params }) => withLock(params.id, () => {
    const p = getProject(params.id);
    p.materials = p.materials.filter((m) => m.id !== params.mid);
    store.put('projects', p);
    return projectView(p);
  }));
  R('POST', '/api/projects/:id/design', ({ params }) => withLock(params.id, () => {
    const p = getProject(params.id);
    if (!p.intake.complete) throw Object.assign(new Error('Finish the intake questions first.'), { status: 409 });
    const d = design.generateDesign(p);
    p.log.push({ at: now(), action: 'design-generated', designId: d.id, version: d.version });
    store.put('projects', p);
    return projectView(p);
  }));
  R('POST', '/api/projects/:id/designs/:did/revise', ({ params, body }) => withLock(params.id, () => {
    const p = getProject(params.id);
    const r = design.revise(p, params.did, { edits: body.edits, request: body.request, by: body.by || 'educator', provider });
    if (r.design) { p.log.push({ at: now(), action: 'design-revised', designId: r.design.id, version: r.design.version, from: params.did, request: body.request || null, edits: body.edits ? Object.keys(body.edits) : [] }); store.put('projects', p); }
    return { ...projectView(p), revision: { created: !!r.design, applied: r.applied, unrecognized: r.unrecognized, message: r.message } };
  }));
  for (const action of ['approve', 'reject', 'return']) {
    R('POST', `/api/projects/:id/designs/:did/${action}`, ({ params, body }) => withLock(params.id, () => {
      const p = getProject(params.id);
      if (action === 'approve' && body.confirm !== true) throw Object.assign(new Error('Approval must be explicit: confirm that you reviewed the design.'), { status: 400 });
      design.transition(p, params.did, action, { by: body.by, note: body.note, testMode });
      p.log.push({ at: now(), action: 'design-' + action, designId: params.did, by: body.by || null, note: body.note || null, test: action === 'approve' ? testMode : undefined });
      let revision = null;
      if (action === 'return') {
        const r = design.revise(p, params.did, { request: body.note, by: 'primer (returned for work)', provider });
        revision = { created: !!r.design, applied: r.applied, unrecognized: r.unrecognized, message: r.design ? `Primer revised the design to version ${r.design.version} based on your note.` : 'Your note was recorded on this version. Primer could not apply it automatically, so edit the fields directly.' };
      }
      store.put('projects', p);
      return { ...projectView(p), revision };
    }));
  }
  R('POST', '/api/projects/:id/designs/:did/build', ({ params }) => withLock(params.id, () => {
    const p = getProject(params.id);
    const pkg = compile(p, params.did);
    store.put('packages', pkg);
    p.log.push({ at: now(), action: 'experience-built', designId: params.did, packageId: pkg.id, testOnly: pkg.testOnly });
    store.put('projects', p);
    return { package: { id: pkg.id, url: '/learn/' + pkg.id, testOnly: pkg.testOnly }, project: projectView(p) };
  }));
  R('GET', '/api/packages', ({ query }) => store.list('packages').filter((x) => !query.projectId || x.projectId === query.projectId).map((x) => ({ id: x.id, title: x.title, projectId: x.projectId, designVersion: x.designVersion, testOnly: x.testOnly, createdAt: x.createdAt })));
  R('GET', '/api/packages/:id', ({ params }) => getPkg(params.id));
  R('GET', '/api/packages/:id/sessions', ({ params }) => store.list('sessions').filter((s) => s.packageId === params.id).map((s) => ({ id: s.id, learnerName: s.learnerName, status: s.status, phase: s.phase, createdAt: s.createdAt, updatedAt: s.updatedAt, turns: s.transcript.filter((t) => t.role === 'learner').length, evidence: s.evidence.length, adaptations: s.events.filter((e) => e.type === 'adaptation').length })));
  R('GET', '/api/sessions/:id', ({ params }) => getSession(params.id));
  R('GET', '/api/sessions/:id/trace', ({ params }) => {
    const s = getSession(params.id); const pkg = getPkg(s.packageId); const p = getProject(pkg.projectId);
    const dsg = p.designs.find((d) => d.id === pkg.designId);
    const answer = (ref) => { const m = ref && ref.ref && ref.ref.match(/^intake:(\w+)/); return m && p.intake.answers[m[1]] ? p.intake.answers[m[1]].text : null; };
    return {
      session: s.id, package: pkg.id, design: { id: dsg.id, version: dsg.version, status: dsg.status, approval: dsg.approval },
      criteria: pkg.engine.criteria.map((k) => ({
        id: k.id, text: k.text, lookFors: k.lookFors, provenance: pkg.provenance.criteria, teacherInput: answer(pkg.provenance.criteria),
        evidence: s.evidence.filter((e) => e.kind === 'observation' && e.criterionIds.includes(k.id)), feedbackStatus: s.feedback ? (s.feedback.criteria.find((c) => c.id === k.id) || {}).status : null,
      })),
      challenges: pkg.engine.challenges.map((c) => ({ id: c.id, line: c.line, kind: c.kind, misconception: c.misconceptionId ? pkg.engine.misconceptions.find((m) => m.id === c.misconceptionId) : null, teacherInput: c.misconceptionId ? answer(pkg.provenance.misconceptions) : answer(pkg.provenance.concepts), outcome: s.practice.status[c.id] || 'pending' })),
      adaptations: s.events.filter((e) => ['adaptation', 'help-request', 'provider-guard'].includes(e.type)).map((e) => ({ ...e, approvedRule: e.rule && e.rule.startsWith('adaptation.') ? { [e.rule.split('.')[1]]: pkg.engine.adaptation[e.rule.split('.')[1]] ?? true } : null })),
      character: { ...pkg.engine.character, teacherInput: answer(pkg.provenance.character) },
    };
  });
  R('POST', '/api/sessions/:id/replay', async ({ params }) => {
    const s = getSession(params.id); const pkg = getPkg(s.packageId);
    const r = await runtime.replay(s, pkg);
    const strip = (x) => JSON.stringify({ t: x.transcript.filter((t) => !t.voicedBy || t.voicedBy === 'deterministic').map((t) => [t.role, t.text]), e: x.evidence.map((e) => [e.kind, e.turnId, e.criterionIds, e.result]), v: x.events.map((v) => [v.type, v.rule]), f: x.feedback && x.feedback.criteria.map((c) => [c.id, c.status]) });
    return { identical: strip(r) === strip(s), original: { turns: s.transcript.length, evidence: s.evidence.length }, replayed: { turns: r.transcript.length, evidence: r.evidence.length } };
  });

  // ---------------- learner runtime (no prompts or engine internals exposed)
  R('GET', '/api/learn/:pkgId', ({ params }) => { const p = getPkg(params.pkgId); return { id: p.id, title: p.learner.title, purpose: p.learner.purpose, role: p.learner.role, phases: p.learner.phases, testOnly: p.testOnly }; });
  R('POST', '/api/learn/:pkgId/sessions', async ({ params, body }) => {
    const pkg = getPkg(params.pkgId);
    const proj = store.get('projects', pkg.projectId);
    const dsg = proj && proj.designs.find((d) => d.id === pkg.designId);
    if (!dsg || dsg.status === 'rejected') throw Object.assign(new Error('This experience has been withdrawn by the educator.'), { status: 403 });
    const s = runtime.createSession(pkg, { learnerName: body.learnerName });
    await runtime.start(s, pkg);
    store.put('sessions', s);
    return runtime.learnerView(s, pkg);
  });
  R('GET', '/api/learn/sessions/:sid', ({ params }) => { const s = getSession(params.sid); return runtime.learnerView(s, getPkg(s.packageId)); });
  R('POST', '/api/learn/sessions/:sid/message', ({ params, body }) => withLock(params.sid, async () => {
    const s = getSession(params.sid); const pkg = getPkg(s.packageId);
    await runtime.message(s, pkg, body.text, provider);
    store.put('sessions', s);
    return runtime.learnerView(s, pkg);
  }));
  R('POST', '/api/learn/sessions/:sid/advance', ({ params }) => withLock(params.sid, async () => {
    const s = getSession(params.sid); const pkg = getPkg(s.packageId);
    await runtime.advance(s, pkg, provider);
    store.put('sessions', s);
    return runtime.learnerView(s, pkg);
  }));

  async function handle(req, res) {
    const url = new URL(req.url, 'http://x');
    const send = (status, data, type = 'application/json') => {
      res.writeHead(status, { 'content-type': type, 'x-content-type-options': 'nosniff', 'cache-control': 'no-store' });
      res.end(type === 'application/json' ? JSON.stringify(data) : data);
    };
    try {
      if (url.pathname.startsWith('/api/')) {
        const route = routes.find((r) => r.method === req.method && r.re.test(url.pathname));
        if (!route) return send(404, { error: 'Not found' });
        if (route.educator && educatorKey && req.headers['x-educator-key'] !== educatorKey) return send(401, { error: 'Educator key required' });
        let body = {};
        if (req.method === 'POST') {
          const raw = await new Promise((ok, bad) => { let d = ''; req.on('data', (c) => { d += c; if (d.length > 2e6) bad(Object.assign(new Error('Body too large'), { status: 413 })); }); req.on('end', () => ok(d)); req.on('error', bad); });
          try { body = raw ? JSON.parse(raw) : {}; } catch { throw Object.assign(new Error('Invalid JSON'), { status: 400 }); }
        }
        const out = await route.handler({ params: url.pathname.match(route.re).groups || {}, body, query: Object.fromEntries(url.searchParams) });
        return send(200, out);
      }
      // static pages
      let file;
      if (url.pathname === '/') file = path.join(PUBLIC, 'index.html');
      else if (url.pathname === '/educator') file = path.join(PUBLIC, 'educator.html');
      else if (/^\/learn\/[A-Za-z0-9-]+$/.test(url.pathname)) file = path.join(PUBLIC, 'learn.html');
      else if (url.pathname === '/status') file = path.join(ROOT, 'BUILD_STATUS.html');
      else file = path.join(PUBLIC, path.normalize(url.pathname).replace(/^(\.\.[/\\])+/, ''));
      if (!file.startsWith(PUBLIC) && !file.endsWith('BUILD_STATUS.html')) return send(403, 'Forbidden', 'text/plain');
      fs.readFile(file, (err, data) => {
        if (err) return send(404, 'Not found', 'text/plain');
        send(200, data, MIME[path.extname(file)] || 'application/octet-stream');
      });
    } catch (e) {
      const status = e.status || 500;
      if (status === 500) console.error(e);
      send(status, { error: e.message || 'Server error' });
    }
  }
  return { handle, store, testMode, provider };
}

if (require.main === module) {
  const app = createApp();
  const port = Number(process.env.PORT || 3000);
  http.createServer(app.handle).listen(port, () => {
    console.log(`Primer running at http://localhost:${port}`);
    console.log(`  Educator authoring: http://localhost:${port}/educator`);
    console.log(`  Build status:       http://localhost:${port}/status`);
    console.log(`  Provider: ${app.provider.name}${app.testMode ? '  |  TEST MODE: approvals are recorded as synthetic test approvals' : ''}`);
  });
}

module.exports = { createApp };
