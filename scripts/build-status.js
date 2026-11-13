#!/usr/bin/env node
// Generates BUILD_STATUS.html (operator dashboard) and TEST_REPORT.md from the SAME records:
// records/{milestones,decisions,findings,contract,validation,test-results}.json
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const read = (f, d) => { try { return JSON.parse(fs.readFileSync(path.join(ROOT, 'records', f), 'utf8')); } catch { return d; } };
const M = read('milestones.json', {}), D = read('decisions.json', []), F = read('findings.json', []), C = read('contract.json', []), V = read('validation.json', { status: 'pending', runs: [] }), R = read('test-results.json', { total: 0, passed: 0, failed: 0, tests: [] });
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const testStatus = (name) => { const t = R.tests.find((x) => x.name === name); return t ? t.status : 'not-run'; };
const byFile = R.tests.reduce((a, t) => { (a[t.file] = a[t.file] || []).push(t); return a; }, {});
const vRuns = V.runs || [];
const validated = V.status === 'complete' && vRuns.length && vRuns.every((r) => r.result === 'pass');

const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Primer Build Status</title>
<style>
:root{--bg:#0f1420;--panel:#171e2e;--ink:#e9edf5;--muted:#93a0b8;--line:#28324a;--ok:#4fd18b;--warn:#f2b84b;--bad:#ff6b6b;--accent:#6cb4ff;--violet:#b18cff}
@media (prefers-color-scheme: light){:root:not([data-theme=dark]){--bg:#f4f2ec;--panel:#fff;--ink:#1b2130;--muted:#5d6678;--line:#e2ddd2;--ok:#16794a;--warn:#9a5b00;--bad:#b3261e;--accent:#1f5f8b;--violet:#6b3fa0}}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font:15px/1.5 system-ui,-apple-system,"Segoe UI",sans-serif}
main{max-width:1180px;margin:0 auto;padding:24px 16px 64px}
.hero{display:grid;grid-template-columns:1.4fr 1fr;gap:16px;align-items:stretch}
@media(max-width:800px){.hero,.g2,.g3{grid-template-columns:1fr!important}}
.card{background:var(--panel);border:1px solid var(--line);border-radius:14px;padding:18px 20px;margin-bottom:16px}
h1{font-size:30px;margin:0 0 4px;letter-spacing:-.02em}h2{font-size:18px;margin:0 0 12px}h3{font-size:15px;margin:12px 0 6px}
.muted{color:var(--muted)}.small{font-size:13px}
.pill{display:inline-block;padding:2px 10px;border-radius:999px;font-weight:700;font-size:12px;border:1px solid currentColor}
.ok{color:var(--ok)}.warn{color:var(--warn)}.bad{color:var(--bad)}.acc{color:var(--accent)}.vi{color:var(--violet)}
.big{font-size:44px;font-weight:800;line-height:1}
.g2{display:grid;grid-template-columns:1fr 1fr;gap:16px}.g3{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}
.stat{background:var(--bg);border:1px solid var(--line);border-radius:12px;padding:12px}
.track{display:flex;gap:6px;flex-wrap:wrap}.ms{flex:1 1 120px;border-radius:10px;padding:8px 10px;border:1px solid var(--line);font-size:12px}
.ms.done{border-color:var(--ok)}.ms.in-progress{border-color:var(--warn);box-shadow:0 0 0 2px color-mix(in srgb,var(--warn) 30%,transparent)}.ms.pending{opacity:.6}
table{width:100%;border-collapse:collapse;font-size:13px}th,td{text-align:left;padding:6px 8px;border-bottom:1px solid var(--line);vertical-align:top}
code{background:var(--bg);padding:1px 5px;border-radius:5px;font-size:12.5px}
pre{background:var(--bg);padding:12px;border-radius:10px;overflow:auto;font-size:13px}
.map{width:100%;height:auto}
.map text{fill:var(--ink);font:12px system-ui}.map .sub{fill:var(--muted);font-size:10.5px}
.map rect{fill:var(--bg);stroke:var(--line);stroke-width:1.5}.map .gate{stroke:var(--warn);stroke-width:2}.map .run{stroke:var(--accent)}
.map path{stroke:var(--muted);stroke-width:1.5;fill:none;marker-end:url(#a)}
details summary{cursor:pointer;font-weight:600}
a{color:var(--accent)}
</style></head><body><main>
<div class="hero">
  <div class="card">
    <div class="muted small">PRIMER · BUILD STATUS · generated ${esc(new Date().toISOString())}</div>
    <h1>Primer: an instructor-centered simulation authoring system</h1>
    <p>Build mode <strong>${esc(M.buildMode)}</strong>. ${esc(M.buildModeReason)}</p>
    <p><span class="pill ${validated ? 'ok' : 'warn'}">${validated ? 'VALIDATED' : 'NOT YET FULLY VALIDATED'}</span>
       <span class="pill acc">Current: ${esc(M.current)}</span></p>
    <p class="small muted">Next: ${esc(M.next)}</p>
  </div>
  <div class="card">
    <div class="g3">
      <div class="stat"><div class="big ${R.failed ? 'bad' : 'ok'}">${R.passed}/${R.total}</div><div class="small muted">automated tests passing</div></div>
      <div class="stat"><div class="big ${F.filter((f) => f.status !== 'fixed').length ? 'warn' : 'ok'}">${F.filter((f) => f.status === 'fixed').length}/${F.length}</div><div class="small muted">findings repaired</div></div>
      <div class="stat"><div class="big ${validated ? 'ok' : 'warn'}">${vRuns.filter((r) => r.result === 'pass').length}/${vRuns.length || '–'}</div><div class="small muted">clean-context validations passed</div></div>
    </div>
    <p class="small muted" style="margin-top:10px">Test run: ${esc(R.generatedAt || 'never')} · Node ${esc(R.node || '')}</p>
  </div>
</div>

<div class="card"><h2>Milestones</h2><div class="track">${(M.milestones || []).map((m) => `<div class="ms ${m.status}"><strong>${esc(m.id)}</strong> <span class="${m.status === 'done' ? 'ok' : m.status === 'in-progress' ? 'warn' : 'muted'}">${esc(m.status)}</span><br>${esc(m.name)}</div>`).join('')}</div></div>

<div class="card"><h2>System map</h2>
<svg class="map" viewBox="0 0 1100 250" role="img" aria-label="System map: educator interview to design to approval gate to experience package to learner phases, with evidence flowing to feedback and the educator trace">
<defs><marker id="a" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="currentColor" stroke="none"/></marker></defs>
<rect x="10" y="20" width="150" height="62" rx="10"/><text x="22" y="44">Educator interview</text><text class="sub" x="22" y="62">intake.js · materials</text>
<rect x="190" y="20" width="160" height="62" rx="10"/><text x="202" y="44">Design (versioned)</text><text class="sub" x="202" y="62">decisions → build() · design.js</text>
<rect x="380" y="20" width="150" height="62" rx="10" class="gate"/><text x="392" y="44">Approval gate</text><text class="sub" x="392" y="62">server-enforced</text>
<rect x="560" y="20" width="160" height="62" rx="10"/><text x="572" y="44">Experience package</text><text class="sub" x="572" y="62">immutable JSON · compile.js</text>
<rect x="750" y="20" width="110" height="62" rx="10" class="run"/><text x="762" y="44">Preparation</text><text class="sub" x="762" y="62">activate · retrieve</text>
<rect x="870" y="20" width="100" height="62" rx="10" class="run"/><text x="882" y="44">Practice</text><text class="sub" x="882" y="62">adapts</text>
<rect x="980" y="20" width="110" height="62" rx="10" class="run"/><text x="992" y="44">Feedback</text><text class="sub" x="992" y="62">evidence-based</text>
<path d="M160,51 H188"/><path d="M350,51 H378"/><path d="M530,51 H558"/><path d="M720,51 H748"/><path d="M860,51 H868"/><path d="M970,51 H978"/>
<path d="M270,82 C270,120 120,120 110,84" /><text class="sub" x="120" y="128">revise (edit / plain language) → new version, old superseded</text>
<rect x="750" y="150" width="340" height="62" rx="10"/><text x="762" y="174">Evidence + events store (runtime.js, store.js)</text><text class="sub" x="762" y="192">observations · adaptations · help requests · transcript</text>
<path d="M920,82 V148"/><path d="M1035,148 V84"/>
<rect x="380" y="150" width="330" height="62" rx="10"/><text x="392" y="174">Educator trace + deterministic replay</text><text class="sub" x="392" y="192">input → design → evidence</text>
<path d="M750,181 H712"/>
<rect x="10" y="150" width="340" height="62" rx="10"/><text x="22" y="174">Providers (voice only, guarded)</text><text class="sub" x="22" y="192">deterministic (default) · anthropic (optional)</text>
<path d="M350,181 C600,240 860,240 900,84"/>
</svg></div>

<div class="g2">
<div class="card"><h2 class="ok">What works now</h2><ul>${(M.works || []).map((w) => `<li>${esc(w)}</li>`).join('')}</ul></div>
<div class="card"><h2 class="warn">What remains</h2><ul>${(M.remains || []).map((w) => `<li>${esc(w)}</li>`).join('')}</ul></div>
</div>

<div class="card"><h2>Paper-derived commitments (Primer Contract) and where they live</h2>
<table><thead><tr><th>Commitment</th><th>Implemented in</th><th>Verified by</th></tr></thead><tbody>
${C.map((c) => `<tr><td><strong>${esc(c.id)} ${esc(c.name)}</strong><div class="small muted">${esc(c.commitment)}</div></td><td class="small">${c.where.map((w) => `<code>${esc(w)}</code>`).join('<br>')}</td><td class="small">${c.tests.map((t) => { const s = testStatus(t); return `<span class="${s === 'pass' ? 'ok' : s === 'fail' ? 'bad' : 'warn'}">● ${esc(s)}</span> ${esc(t)}`; }).join('<br>')}</td></tr>`).join('')}
</tbody></table></div>

<div class="card"><h2>Working interfaces and artifacts</h2>
<table><tbody>
<tr><td>Educator studio</td><td><code>http://localhost:3000/educator</code></td></tr>
<tr><td>Learner experience</td><td><code>http://localhost:3000/learn/&lt;experience-id&gt;</code> (link shown after build)</td></tr>
<tr><td>This dashboard</td><td><code>http://localhost:3000/status</code> or open <code>BUILD_STATUS.html</code></td></tr>
<tr><td>HTML previews (screenshots)</td><td><code>docs/previews/*.png</code></td></tr>
<tr><td>Fixtures (educator briefs)</td><td><code>fixtures/briefs/*.json</code></td></tr>
<tr><td>Validation artifacts</td><td><code>validation/</code> (prompts, transcripts, designs, packages, evidence, feedback)</td></tr>
<tr><td>Records behind this page</td><td><code>records/*.json</code></td></tr>
</tbody></table></div>

<div class="card"><h2>Automated test results <span class="pill ${R.failed ? 'bad' : 'ok'}">${R.passed} passed · ${R.failed} failed</span></h2>
${Object.entries(byFile).map(([f, ts]) => `<details ${ts.some((t) => t.status === 'fail') ? 'open' : ''}><summary>${esc(f)}: ${ts.filter((t) => t.status === 'pass').length}/${ts.length}</summary><table>${ts.map((t) => `<tr><td class="${t.status === 'pass' ? 'ok' : 'bad'}">${esc(t.status)}</td><td>${esc(t.name)}${t.error ? `<div class="bad small">${esc(t.error)}</div>` : ''}</td><td class="muted small">${t.durationMs} ms</td></tr>`).join('')}</table></details>`).join('') || '<p class="warn">No test results recorded yet. Run <code>npm test</code>.</p>'}
</div>

<div class="card"><h2>Clean-context validation</h2>
<p class="small muted">Fresh agents that did not inherit the builder's conversation or expected answers. Synthetic participants are not real teachers or students, and no classroom efficacy is claimed.</p>
${vRuns.length ? `<table><thead><tr><th>Role</th><th>Result</th><th>Summary</th></tr></thead><tbody>${vRuns.map((r) => `<tr><td><strong>${esc(r.role)}</strong><div class="small muted">${esc(r.date || '')}</div></td><td class="${r.result === 'pass' ? 'ok' : r.result === 'fail' ? 'bad' : 'warn'}">${esc(r.result)}</td><td class="small">${esc(r.summary)}${r.findings && r.findings.length ? `<ul>${r.findings.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}${r.artifacts ? `<div class="muted">Artifacts: <code>${esc(r.artifacts)}</code></div>` : ''}</td></tr>`).join('')}</tbody></table>` : '<p class="warn">Pending: not yet run.</p>'}
</div>

<div class="card"><h2>Known failures and repaired findings</h2>
<table><thead><tr><th>ID</th><th>Severity</th><th>Finding</th><th>Before → After</th><th>Status</th></tr></thead><tbody>
${F.map((f) => `<tr><td>${esc(f.id)}</td><td class="${f.severity === 'blocking' ? 'bad' : f.severity === 'major' ? 'warn' : 'muted'}">${esc(f.severity)}</td><td class="small">${esc(f.found)}<div class="muted">Fix: ${esc(f.fix)}</div></td><td class="small">${esc(f.before)} → ${esc(f.after)}</td><td class="${f.status === 'fixed' ? 'ok' : 'bad'}">${esc(f.status)}</td></tr>`).join('')}
</tbody></table></div>

<div class="card"><h2>Decisions and departures from the paper</h2>
<table><tbody>${D.map((d) => `<tr><td><strong>${esc(d.id)}</strong> ${d.departure ? '<span class="pill vi">departure</span>' : ''}</td><td><strong>${esc(d.decision)}</strong><div class="small muted">${esc(d.why)}</div></td></tr>`).join('')}</tbody></table></div>

<div class="card"><h2>Exact startup instructions</h2>
<pre>git clone &lt;this repository&gt; &amp;&amp; cd &lt;repository&gt;
node --version          # requires Node 20 or newer; no npm install needed to run
npm start               # → http://localhost:3000  (educator studio at /educator)
PORT=8080 npm start     # different port
PRIMER_TEST_MODE=1 npm start               # synthetic testers: approvals recorded as TEST
PRIMER_PROVIDER=anthropic ANTHROPIC_API_KEY=… npm start   # optional model-voiced characters
npm install &amp;&amp; npm test  # all tests (e2e uses Playwright + Chromium if installed)</pre></div>
</main></body></html>`;
fs.writeFileSync(path.join(ROOT, 'BUILD_STATUS.html'), html);

// ---- TEST_REPORT.md from the same records
const md = [];
md.push('# Test Report', '', `_Generated from \`records/*.json\` by \`scripts/build-status.js\` at ${new Date().toISOString()}. The same records drive BUILD_STATUS.html._`, '');
md.push('## Summary', '', `- Automated tests: **${R.passed}/${R.total} passing**, ${R.failed} failing (run ${R.generatedAt || 'never'}, Node ${R.node || '?'})`, `- Findings repaired: **${F.filter((f) => f.status === 'fixed').length}/${F.length}**`, `- Clean-context validation: **${V.status}**. ${vRuns.filter((r) => r.result === 'pass').length}/${vRuns.length} roles passed`, `- Build mode: **${M.buildMode}**. ${M.buildModeReason}`, '', '> Synthetic teacher and student participants are LLM agents. Nothing here is real-teacher, real-student, classroom or efficacy validation.', '');
md.push('## Automated tests by file', '');
for (const [f, ts] of Object.entries(byFile)) { md.push(`### ${f}`, '', '| Status | Test | ms |', '|---|---|---|'); for (const t of ts) md.push(`| ${t.status} | ${t.name.replace(/\|/g, '\\|')}${t.error ? ' — ' + t.error.replace(/\|/g, '\\|').replace(/\n/g, ' ') : ''} | ${t.durationMs} |`); md.push(''); }
md.push('## Coverage of the required test areas', '', '| Area | Tests |', '|---|---|');
const areas = [['Startup and documented commands', /startup/], ['Schema and configuration validation', /schema|validated|invalid/], ['Authoring and runtime state transitions', /state machine|phases are gated|one question/], ['Approval enforcement', /approv/], ['Artifact and transcript persistence', /persistence/], ['Provider replacement / deterministic replay', /provider|replay/], ['Error and interrupted-session recovery', /errors are clear|interrupted|concurrent/], ['Accessibility basics', /accessib|axe/], ['Teacher revisions change the experience', /revision/], ['Educator materials influence the design', /materials/], ['Preparation, practice and feedback stay connected', /feedback quotes|phases|end-to-end/], ['Adaptation tied to goals and evidence', /adaptation/], ['Feedback cites actual learner behavior', /feedback quotes|trace/], ['Failure modes (goal drift, character drift, over-helping, invented evidence, unsupported assessment)', /character stays|help requests|regression|unseen criteria|leaks/], ['Generality across domains', /generality|two fixtures|cross-domain/]];
for (const [a, re] of areas) { const ts = R.tests.filter((t) => re.test(t.name)); md.push(`| ${a} | ${ts.length ? ts.map((t) => (t.status === 'pass' ? '✅ ' : '❌ ') + t.name.replace(/\|/g, '\\|')).join('<br>') : '⚠️ none recorded'} |`); }
md.push('', '## Findings: before and after', '', '| ID | Severity | Finding | Fix | Before → After | Regression test | Status |', '|---|---|---|---|---|---|---|');
for (const f of F) md.push(`| ${f.id} | ${f.severity} | ${f.found.replace(/\|/g, '/')} | ${f.fix.replace(/\|/g, '/')} | ${f.before} → ${f.after} | ${f.test} | ${f.status} |`);
md.push('', '## Clean-context validation', '');
if (vRuns.length) for (const r of vRuns) { md.push(`### ${r.role}: ${r.result}`, '', r.summary, ''); for (const x of r.findings || []) md.push('- ' + x); if (r.artifacts) md.push('', `Artifacts: \`${r.artifacts}\``); md.push(''); }
else md.push('Pending.');
fs.writeFileSync(path.join(ROOT, 'TEST_REPORT.md'), md.join('\n') + '\n');
console.log('Wrote BUILD_STATUS.html and TEST_REPORT.md');
