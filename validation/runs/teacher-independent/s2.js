const { chromium } = require('playwright');
(async()=>{const b=await chromium.launch();const p=await b.newPage({viewport:{width:1280,height:900}});
await p.goto('http://localhost:4100/educator');
await p.fill('input', 'Le Chatelier - Explain It to a Classmate');
await p.click('text=New experience');await p.waitForTimeout(1500);
await p.screenshot({path:'03-new.png',fullPage:true});
console.log(p.url());console.log(await p.innerText('body'));
console.log(await p.$$eval('input,textarea,select,button',e=>e.map(x=>x.tagName+'|'+(x.name||x.id)+'|'+(x.type||'')+'|'+(x.placeholder||'')+'|'+x.textContent.trim().slice(0,40))));
await b.close();})();
