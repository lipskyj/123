const { chromium } = require('playwright');const fs=require('fs');
(async()=>{const b=await chromium.launch();const p=await b.newPage({viewport:{width:1280,height:900}});
await p.goto('http://localhost:4100/educator?p=prj-354eaf914b');await p.waitForTimeout(1000);
await p.fill('#revreq',fs.readFileSync(process.argv[2],'utf8').trim());await p.click('button:has-text("Request revision")');await p.waitForTimeout(4000);
await p.screenshot({path:process.argv[3]+'.png',fullPage:true});
const t=await p.innerText('body');fs.writeFileSync(process.argv[3]+'.txt',t);console.log(t);
await b.close();})();
