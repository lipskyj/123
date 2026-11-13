#!/usr/bin/env node
// Export a validation evidence bundle from a Primer data directory:
//   node scripts/export-evidence.js <dataDir> <outDir>
// For each project: intake transcript, all design versions, packages, sessions, and traces.
const fs = require('fs');
const path = require('path');
const http = require('http');
const { createApp } = require('../src/server');

(async () => {
  const [dataDir, outDir] = process.argv.slice(2);
  if (!dataDir || !outDir) { console.error('usage: export-evidence.js <dataDir> <outDir>'); process.exit(2); }
  const app = createApp({ dataDir, testMode: true });
  const server = http.createServer(app.handle);
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const base = `http://127.0.0.1:${server.address().port}`;
  const get = async (u) => (await fetch(base + u)).json();
  fs.mkdirSync(outDir, { recursive: true });
  const index = [];
  for (const summary of await get('/api/projects')) {
    const p = await get('/api/projects/' + summary.id);
    const dir = path.join(outDir, summary.id);
    fs.mkdirSync(dir, { recursive: true });
    const write = (f, o) => fs.writeFileSync(path.join(dir, f), typeof o === 'string' ? o : JSON.stringify(o, null, 2));
    write('intake-transcript.md', `# Intake: ${p.name}\n\n` + p.transcript.map((t) => `**${t.role === 'educator' ? 'Educator' : 'Primer'}** (${t.id}${t.field ? ', ' + t.field : ''}): ${t.text}`).join('\n\n') + `\n\n## Materials\n\n` + p.materials.map((m) => `### ${m.name}\n\n${m.text}`).join('\n\n'));
    write('intake-answers.json', p.intake.answers);
    write('project-log.json', p.log);
    for (const d of p.designs) write(`design-v${d.version}-${d.status}.json`, d);
    const entry = { projectId: p.id, name: p.name, designs: p.designs.map((d) => ({ v: d.version, status: d.status, approval: d.approval && d.approval.kind })), packages: [] };
    for (const pk of p.packages) {
      const pkg = await get('/api/packages/' + pk.id);
      write(`package-${pk.id}.json`, pkg);
      const sessions = await get(`/api/packages/${pk.id}/sessions`);
      const pe = { id: pk.id, designVersion: pkg.designVersion, sessions: [] };
      for (const s of sessions) {
        const full = await get('/api/sessions/' + s.id);
        const trace = await get(`/api/sessions/${s.id}/trace`);
        const replay = await (await fetch(`${base}/api/sessions/${s.id}/replay`, { method: 'POST' })).json();
        write(`session-${s.id}.json`, full);
        write(`session-${s.id}-trace.json`, trace);
        write(`session-${s.id}-transcript.md`, `# Session ${s.id} (${full.learnerName})\n\n` + full.transcript.map((t) => `**${t.speaker || t.role}** [${t.id}, ${t.phase}]: ${t.text}`).join('\n\n'));
        pe.sessions.push({ id: s.id, learner: s.learnerName, status: s.status, replayIdentical: replay.identical, feedback: full.feedback ? full.feedback.criteria.map((c) => [c.id, c.status]) : null });
      }
      entry.packages.push(pe);
    }
    index.push(entry);
  }
  fs.writeFileSync(path.join(outDir, 'index.json'), JSON.stringify(index, null, 2));
  server.close();
  console.log(`Exported ${index.length} project(s) to ${outDir}`);
})();
