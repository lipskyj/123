const { chromium } = require('playwright');const fs=require('fs');
(async()=>{const b=await chromium.launch();const p=await b.newPage({viewport:{width:1280,height:900}});
await p.goto('http://localhost:4100/educator?p=prj-354eaf914b');await p.waitForTimeout(1000);
await p.click('button:has-text("Edit this design")');await p.waitForTimeout(1500);
await p.screenshot({path:'17-editor.png',fullPage:true});
const els=await p.$$eval('input,textarea,select',e=>e.map(x=>({tag:x.tagName,id:x.id,name:x.name,type:x.type,label:(x.labels&&x.labels[0]?x.labels[0].innerText:''),val:(x.value||'').slice(0,300)})));
console.log(JSON.stringify(els,null,1));
console.log('BUTTONS:',(await p.$$eval('button',e=>e.map(x=>x.innerText.trim()).filter(Boolean))).join(' | '));
await b.close();})();
