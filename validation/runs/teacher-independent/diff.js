module.exports = async p => {
  const s = await p.$$eval('summary', e => e.map(x => x.textContent.trim()));
  console.log(s);
  for (const sm of await p.$$('summary')) { await sm.click(); }
  await p.waitForTimeout(500);
  const d = await p.$$eval('details', e => e.map(x => x.innerText.slice(0, 3000)));
  console.log(d.join('\n-----\n'));
  await p.screenshot({ path: '12-v3-diff-and-prompts.png', fullPage: true });
};
