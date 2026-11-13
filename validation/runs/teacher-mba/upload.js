const { chromium } = require('playwright');
(async()=>{const b=await chromium.launch();const p=await b.newPage({viewport:{width:1280,height:900}});
await p.goto('http://localhost:4100/educator?p=prj-354eaf914b');await p.waitForTimeout(1000);
await p.setInputFiles('#matfile','halvorsen-case.md');await p.waitForTimeout(2500);
await p.screenshot({path:'06-material-uploaded.png',fullPage:true});
const t=await p.innerText('body');console.log(t.slice(t.indexOf('Materials')));
await b.close();})();
