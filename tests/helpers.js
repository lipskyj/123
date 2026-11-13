const http = require('http');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { createApp } = require('../src/server');

async function startServer(opts = {}) {
  const dataDir = opts.dataDir || fs.mkdtempSync(path.join(os.tmpdir(), 'primer-test-'));
  const app = createApp({ dataDir, testMode: opts.testMode ?? true, provider: opts.provider, educatorKey: opts.educatorKey ?? '' });
  const server = http.createServer(app.handle);
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const base = `http://127.0.0.1:${server.address().port}`;
  const api = async (method, url, body, headers = {}) => {
    const res = await fetch(base + url, { method, headers: { 'content-type': 'application/json', ...headers }, body: body ? JSON.stringify(body) : undefined });
    const data = res.headers.get('content-type').includes('json') ? await res.json() : await res.text();
    return { status: res.status, data };
  };
  const ok = async (method, url, body) => {
    const r = await api(method, url, body);
    if (r.status !== 200) throw new Error(`${method} ${url} -> ${r.status}: ${JSON.stringify(r.data)}`);
    return r.data;
  };
  return { base, api, ok, dataDir, app, close: () => new Promise((r) => server.close(r)) };
}

// Run a fixture brief through the normal educator API (no code changes per fixture).
async function author(ok, brief, { approve = true } = {}) {
  let p = await ok('POST', '/api/projects', { name: brief.name });
  let guard = 0;
  while (p.nextQuestion && guard++ < 40) {
    const q = p.nextQuestion;
    if (q.id === 'materials' && !q.followup) for (const m of brief.materials || []) p = await ok('POST', `/api/projects/${p.id}/materials`, m);
    const a = brief.answers[q.id];
    p = await ok('POST', `/api/projects/${p.id}/answer`, { text: q.followup ? (brief.followups && brief.followups[q.id]) || 'skip' : a == null || a === '' ? 'skip' : a });
  }
  p = await ok('POST', `/api/projects/${p.id}/design`);
  if (approve) p = await ok('POST', `/api/projects/${p.id}/designs/${p.currentDesignId}/approve`, { by: 'Synthetic test teacher', confirm: true });
  return p;
}

module.exports = { startServer, author };
