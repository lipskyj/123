const { chromium } = require('playwright');const fs=require('fs');
(async()=>{const b=await chromium.launch();const p=await b.newPage({viewport:{width:1280,height:900}});
await p.goto('http://localhost:4100/educator?p=prj-354eaf914b');await p.waitForTimeout(1000);
await p.click('button:has-text("Edit this design")');await p.waitForTimeout(1000);
for (const id of ['e-title','e-cname','e-cdesc','e-stakes','e-concepts','e-mis','e-crit']) console.log('=== '+id+'\n'+await p.inputValue('#'+id));
await b.close();})();
