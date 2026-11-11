// Renders every top-level element with an id in mockups.html and graphics.html to a PNG.
// All values in the mockups are fake.
// Usage: node docs/mockups/shoot.cjs [scale=2] [outDir=docs/img]   (needs Playwright)
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
(async () => {
  const scale = Number(process.argv[2] || 2);
  const out = process.argv[3] || path.join(__dirname, '..', 'img');
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1400, height: 900 }, deviceScaleFactor: scale });
  fs.mkdirSync(out, { recursive: true });
  for (const file of ['mockups.html', 'graphics.html']) {
    await p.goto('file://' + path.join(__dirname, file));
    await p.evaluate(() => document.fonts.ready);
    for (const el of await p.$$('body > [id]')) {
      const id = await el.getAttribute('id');
      await el.screenshot({ path: path.join(out, `${id}.png`), omitBackground: true });
    }
  }
  await b.close();
})();
