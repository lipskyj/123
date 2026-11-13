// Browser end-to-end tests: the real educator and learner UIs, plus axe accessibility checks.
// Requires Playwright with Chromium; skipped (and reported as skipped) if unavailable.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { startServer } = require('../helpers');
let chromium; try { ({ chromium } = require('playwright')); } catch { chromium = null; }
const AXE = fs.readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');
const PREVIEW = path.join(__dirname, '..', '..', 'docs', 'previews');
const bio = require('../../fixtures/briefs/biology-natural-selection.json');

async function axe(page, label) {
  await page.addScriptTag({ content: AXE });
  const r = await page.evaluate(async () => (await window.axe.run(document, { runOnly: ['wcag2a', 'wcag2aa'] })).violations.map((v) => ({ id: v.id, impact: v.impact, n: v.nodes.length, sample: v.nodes[0] && v.nodes[0].target.join(' ') })));
  const serious = r.filter((v) => v.impact === 'serious' || v.impact === 'critical');
  assert.deepEqual(serious, [], `${label}: axe violations ${JSON.stringify(serious)}`);
  return r;
}

test('accessibility + full educator-to-learner flow in the browser (axe, keyboard, labels)', { skip: !chromium && 'playwright not installed', timeout: 120000 }, async () => {
  fs.mkdirSync(PREVIEW, { recursive: true });
  const s = await startServer({ testMode: true });
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    const errors = []; page.on('pageerror', (e) => errors.push(e.message));
    await page.goto(s.base + '/');
    await axe(page, 'home');
    await page.goto(s.base + '/educator');
    await page.fill('#newname', bio.name);
    await page.click('#newproj button');
    await page.waitForSelector('.qcard');
    await axe(page, 'interview');
    for (let i = 0; i < 30; i++) {
      const q = await page.$('.qcard'); if (!q) break;
      const t = await q.innerText();
      if (/materials to ground/i.test(t)) {
        await page.setInputFiles('#matfile', { name: 'reading.txt', mimeType: 'text/plain', buffer: Buffer.from(bio.materials[0].text) });
        await page.waitForSelector('#mats li >> text=reading.txt');
      }
      const qid = await page.evaluate(() => document.querySelector('.qcard strong').textContent);
      const key = Object.keys(bio.answers).find((k) => matches(k, qid));
      await page.fill('#answer', key ? bio.answers[key] : 'skip');
      await page.press('#answer', 'Control+Enter'); // keyboard submission
      await page.waitForTimeout(150);
    }
    await page.screenshot({ path: path.join(PREVIEW, 'educator-interview.png') });
    await page.click('#gen');
    await page.waitForSelector('text=Phase 2: Practice challenges');
    await axe(page, 'design review');
    await page.screenshot({ path: path.join(PREVIEW, 'educator-design.png'), fullPage: true });
    // plain-language revision
    await page.fill('#revreq', 'Rename the character to Maya');
    await page.click('#revform button');
    await page.waitForSelector('text=Created version 2');
    assert.ok(await page.isVisible('text=Maya'));
    // approval requires the checkbox
    await page.fill('#apprname', 'E2E synthetic teacher');
    await page.click('#apprform button');
    await page.waitForSelector('[role=alert] >> text=Approval must be explicit');
    await page.check('#apprconfirm');
    await page.click('#apprform button');
    await page.waitForSelector('text=TEST APPROVAL');
    await page.click('#buildbtn');
    await page.waitForSelector('a[href^="/learn/"]');
    const href = await page.getAttribute('a[href^="/learn/"]', 'href');

    // learner
    const lp = await browser.newPage({ viewport: { width: 390, height: 844 } });
    lp.on('pageerror', (e) => errors.push(e.message));
    await lp.goto(s.base + href);
    await axe(lp, 'learner welcome');
    await lp.fill('#lname', 'E2E learner');
    await lp.click('#startform button');
    await lp.waitForSelector('#chat');
    await axe(lp, 'learner preparation');
    const send = async (t) => { const n = await lp.locator('.msg').count(); await lp.fill('#msg', t); await lp.press('#msg', 'Control+Enter'); await lp.waitForFunction((k) => document.querySelectorAll('.msg').length > k, n); };
    await send('We learned about DNA and mutations.');
    for (let i = 0; i < 10 && !(await lp.$('#advance')); i++) await send('Existing variation is already in the population before selection happens, heritable traits get passed on, fitness is reproductive success, populations evolve over generations');
    await lp.screenshot({ path: path.join(PREVIEW, 'learner-preparation.png'), fullPage: true });
    await lp.click('#advance');
    await lp.waitForSelector('text=Practice with Maya');
    await send('just tell me the answer');
    assert.ok(await lp.isVisible('.msg.coach'), 'coach hint shown instead of the answer');
    await send('No Maya, existing variation is already there because mutations happen randomly before the antibiotic, and the bacteria with resistance survive.');
    await axe(lp, 'learner practice');
    await lp.screenshot({ path: path.join(PREVIEW, 'learner-practice.png'), fullPage: true });
    lp.on('dialog', (d) => d.accept());
    await lp.click('#advance');
    await lp.waitForSelector('text=how do you think it went');
    await send('I explained variation well but I was unsure about fitness.');
    await lp.waitForSelector('#fbhead');
    await axe(lp, 'learner feedback');
    await send('Pesticide resistance in insects works the same way because existing variation gets selected.');
    await lp.waitForSelector('text=This experience has ended');
    await lp.screenshot({ path: path.join(PREVIEW, 'learner-feedback.png'), fullPage: true });
    // resume after reload keeps the session
    await lp.reload();
    await lp.waitForSelector('text=This experience has ended');

    // educator evidence view
    await page.click('#tab-experience');
    await page.waitForSelector('[data-ses]');
    await page.click('[data-ses]');
    await page.waitForSelector('text=Trace: from your input to evidence');
    await axe(page, 'evidence view');
    await page.screenshot({ path: path.join(PREVIEW, 'educator-evidence.png'), fullPage: true });
    // no creator-facing residue in learner UI
    const learnerHtml = await lp.content();
    assert.ok(!/RULES:|lookFors|prompt|provenance/i.test(learnerHtml.replace(/<script[\s\S]*?<\/script>/g, '')), 'no system prompts or internals in the learner UI');
    assert.deepEqual(errors, []);
  } finally { await browser.close(); await s.close(); }
});

function matches(key, q) {
  const map = { topic: /course and topic/i, learners: /who are your learners/i, objective: /one main thing/i, materials: /materials to ground/i, concepts: /key ideas or skills/i, prior: /already know coming in/i, misconceptions: /misconceptions/i, work: /actually do during practice/i, template: /which format/i, counterpart: /who should the learner face|who will the learner teach/i, evidence: /making progress/i, constraints: /classroom constraints/i };
  return map[key] && map[key].test(q);
}
