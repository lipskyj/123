module.exports = async p => {
  await p.fill('#apprname', 'Dr. R. Okafor (simulated teacher)');
  await p.check('#apprconfirm');
  await p.click('button:has-text("Record test approval")');
  await p.waitForTimeout(3000);
  await p.screenshot({ path: '13-approved.png', fullPage: true });
  const t = await p.innerText('body');
  require('fs').writeFileSync('after-approval.txt', t);
  const i = t.indexOf('3. Experience');
  console.log(t.slice(i, i + 900));
  const j = t.indexOf('Your decision');
  console.log('...\n' + t.slice(j));
  console.log(JSON.stringify(await p.$$eval('button,a', e => e.filter(x => x.offsetParent).map(x => x.textContent.trim().slice(0, 40) + '|' + (x.href || '')))));
};
