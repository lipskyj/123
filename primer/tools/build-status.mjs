// Regenerates BUILD_STATUS.html from the same records the reports use.
import { readFileSync, writeFileSync, existsSync } from "node:fs";
const R = (p) => new URL("../" + p, import.meta.url); const read = (p) => readFileSync(R(p), "utf8"); const esc = (s) => String(s).replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));
const st = JSON.parse(read("records/status.json"));
const unit = read("records/unit-results.txt").trim().split("\n").map((l) => ({ ok: l.startsWith("ok"), name: l.replace(/^(not )?ok \d+ - /, "") }));
const e2e = existsSync(R("records/e2e/e2e-results.json")) ? JSON.parse(read("records/e2e/e2e-results.json")) : { results: [], ranAt: "" };
const pass = (a) => a.filter((x) => x.ok).length; const fails = [...unit, ...e2e.results].filter((x) => !x.ok);
const li = (a) => a.map((x) => `<li>${esc(x)}</li>`).join(""); const tone = { complete: "ok", incomplete: "warn", blocked: "bad" }[st.overall] || "warn";
const contract = [["C1 Educator authority", "Design review, approval states, build gate"], ["C2 Meaningful student work", "No answers from the character; written field notes; redirect on answer-seeking"], ["C3 Preparation · Practice · Feedback", "Three connected runtime phases and a session journal"], ["C4 Productive friction", "Character goal, stakes, harder follow-ups, misconception probes"], ["C5 Goal-bound adaptation", "Each adaptation tied to a criterion or misconception and to evidence"], ["C6 Evidence-grounded feedback", "Quotations by turn, inference labelled, not-assessed list"], ["C7 Traceability", "Source chips, trace table, history, sessions view"]];
const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Primer — Build Status</title><style>
:root{--bg:#0e1513;--card:#17211d;--ink:#e9f3ee;--dim:#9db3a9;--line:#2b3a34;--acc:#5fe0b5;--warn:#ffb86b;--bad:#ff8b8b}
@media (prefers-color-scheme: light){:root{--bg:#f6f4ef;--card:#fff;--ink:#1d2622;--dim:#5d6b65;--line:#d9d6cc;--acc:#0f6b52;--warn:#a4560a;--bad:#a32a2a}}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font:15px/1.55 system-ui,-apple-system,"Segoe UI",sans-serif}main{max-width:1080px;margin:0 auto;padding:24px 16px 60px}
h1{font-size:30px;margin:0 0 4px;letter-spacing:.02em}h2{font-size:13px;letter-spacing:.14em;text-transform:uppercase;color:var(--dim);margin:0 0 10px}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:14px;margin-top:14px}.card{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:16px}.wide{grid-column:1/-1}
.pill{display:inline-block;padding:4px 12px;border-radius:999px;font-weight:700;font-size:13px;border:1px solid}.ok{color:var(--acc);border-color:var(--acc)}.warn{color:var(--warn);border-color:var(--warn)}.bad{color:var(--bad);border-color:var(--bad)}
.big{font-size:38px;font-weight:700;line-height:1}.dim{color:var(--dim)}ul{margin:0;padding-left:18px}li{margin:3px 0}table{width:100%;border-collapse:collapse;font-size:14px}td,th{text-align:left;vertical-align:top;padding:6px 8px;border-top:1px solid var(--line)}th{color:var(--dim)}
pre{background:rgba(127,127,127,.12);padding:12px;border-radius:10px;overflow:auto;font-size:13px;margin:0}a{color:var(--acc)}.map{font:12.5px/1.45 ui-monospace,Menlo,monospace;white-space:pre;overflow:auto}
.bar{height:10px;border-radius:5px;background:var(--line);overflow:hidden;margin-top:8px}.bar i{display:block;height:100%;background:var(--acc)}
</style></head><body><main>
<h1>Primer — Build Status</h1><p class="dim">Operator dashboard. Generated ${new Date().toISOString().slice(0, 16).replace("T", " ")} UTC from <code>records/</code>.</p>
<div class="grid">
<div class="card wide"><h2>Current milestone</h2><p style="font-size:20px;margin:0 0 8px"><b>${esc(st.milestone)}</b> <span class="pill ${tone}">${esc(st.overall.toUpperCase())}</span></p><p style="margin:0">${esc(st.summary)}</p></div>
<div class="card"><h2>Engine tests</h2><div class="big">${pass(unit)}<span class="dim" style="font-size:20px"> / ${unit.length}</span></div><div class="bar"><i style="width:${(100 * pass(unit)) / Math.max(1, unit.length)}%"></i></div><p class="dim">node --test tests/primer.test.mjs</p></div>
<div class="card"><h2>Browser checks</h2><div class="big">${pass(e2e.results)}<span class="dim" style="font-size:20px"> / ${e2e.results.length}</span></div><div class="bar"><i style="width:${(100 * pass(e2e.results)) / Math.max(1, e2e.results.length)}%"></i></div><p class="dim">tests/e2e.mjs · ${esc(e2e.ranAt.slice(0, 16).replace("T", " "))}</p></div>
<div class="card"><h2>Known failures</h2>${fails.length ? `<ul>${li(fails.map((f) => f.name))}</ul>` : `<p style="margin:0">No failing automated tests.</p>`}<p class="dim">Findings from independent validation are listed below.</p></div>
<div class="card"><h2>What works now</h2><ul>${li(st.works)}</ul></div>
<div class="card"><h2>What remains</h2><ul>${li(st.remains)}</ul></div>
<div class="card wide"><h2>System map</h2><div class="map">Teacher  ─ intake + materials ─► interview (1 question at a time) ─► DESIGN ─► edit / request change ─► approve | reject
                                                                         │ (sources, assumptions, prompts)        │
                                                                         ▼                                        ▼
Student  ◄─ Preparation ─► Practice [3D cave notes → conversation] ─► Feedback ◄──────── EXPERIENCE PACKAGE (design + approval)
              │                 │ evidence, adaptations                  │ citations, inference, not-assessed
              └──────────── SESSION record (turns · events · evidence · adaptations · journal) ──► Teacher "Student sessions"</div></div>
<div class="card wide"><h2>Contract commitments and where they appear</h2><table><tr><th>Commitment</th><th>Where</th></tr>${contract.map(([a, b]) => `<tr><td>${a}</td><td>${b}</td></tr>`).join("")}</table><p class="dim">Derived from the build prompt; the paper itself was not available. Details: <a href="docs/PRIMER_CONTRACT.md">PRIMER_CONTRACT</a>, <a href="docs/PAPER_TRACEABILITY.md">PAPER_TRACEABILITY</a>.</p></div>
<div class="card wide"><h2>Independent validation (fresh agents, synthetic participants)</h2>${st.validation.length ? `<table><tr><th>Role</th><th>Result</th><th>Record</th></tr>${st.validation.map((v) => `<tr><td>${esc(v.role)}</td><td>${esc(v.result)}</td><td>${/^records\//.test(v.record) ? `<a href="${esc(v.record)}">${esc(v.record)}</a>` : esc(v.record)}</td></tr>`).join("")}</table>` : `<p>Not yet run.</p>`}<p class="dim">All participants are simulated. Nothing here is real teacher, student, classroom or efficacy validation.</p></div>
<div class="card wide"><h2>Decisions and departures</h2><table><tr><th>Decision</th><th>Reason</th></tr>${st.decisions.map(([a, b]) => `<tr><td>${esc(a)}</td><td>${esc(b)}</td></tr>`).join("")}</table></div>
<div class="card"><h2>Working interfaces</h2><ul><li><a href="index.html">Landing page</a></li><li><a href="author.html">Teacher workspace</a></li><li><a href="learn.html">Student page</a></li><li><a href="world-cave.html">3D cave field site</a> (standalone)</li></ul></div>
<div class="card"><h2>Records</h2><ul><li><a href="README.md">README</a></li><li><a href="docs/">docs/</a>: environment, contract, traceability, audit and version decision, system design, teacher-centeredness, test plan, test report, cold-build review, end-to-end validation, build log</li><li><a href="records/">records/</a>: test results, transcripts, validation reports</li><li><a href="experiences/">experiences/</a>: built sample packages</li></ul></div>
<div class="card"><h2>Start it</h2><pre>python3 -m http.server 8000   # from the repository root
# then open http://localhost:8000/primer/</pre><p class="dim">Tests: see README.</p></div>
<div class="card wide"><h2>Next milestone</h2><p style="margin:0">${esc(st.nextMilestone)}</p></div>
</div></main></body></html>`;
writeFileSync(R("BUILD_STATUS.html"), html); console.log("BUILD_STATUS.html written:", pass(unit) + "/" + unit.length, "unit,", pass(e2e.results) + "/" + e2e.results.length, "browser");
