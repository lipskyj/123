const { chromium } = require('playwright');const fs=require('fs');
(async()=>{const b=await chromium.launch();const p=await b.newPage({viewport:{width:1280,height:900}});
await p.goto('http://localhost:4100/educator?p=prj-354eaf914b');await p.waitForTimeout(1000);
await p.fill('#answer',fs.readFileSync(process.argv[2],'utf8').trim());await p.click('button:has-text("Send answer")');await p.waitForTimeout(2000);
await p.screenshot({path:process.argv[3]+'.png',fullPage:true});
const t=await p.innerText('body');const i=t.lastIndexOf('Primer\n');console.log(t.slice(i,i+1000));
console.log('BUTTONS:',(await p.$$eval('button',e=>e.map(x=>x.innerText.trim()).filter(Boolean))).join(' | '));
await b.close();})();
