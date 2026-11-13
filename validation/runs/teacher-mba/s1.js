const { chromium } = require('playwright');
(async()=>{const b=await chromium.launch();const p=await b.newPage({viewport:{width:1280,height:900}});
await p.goto('http://localhost:4100/educator');await p.waitForTimeout(1000);
await p.screenshot({path:'01-educator.png',fullPage:true});
console.log(await p.innerText('body'));
console.log((await p.$$eval('button,a,input,textarea,select',els=>els.map(e=>e.tagName+'|'+(e.id||'')+'|'+(e.name||'')+'|'+(e.innerText||e.placeholder||e.href||'').slice(0,60)))).join('\n'));
await b.close();})();
