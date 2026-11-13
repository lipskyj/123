const { chromium } = require('playwright');
(async()=>{const b=await chromium.launch();const p=await b.newPage({viewport:{width:1280,height:900}});
await p.goto('http://localhost:4100/');await p.screenshot({path:'01-home.png',fullPage:true});
console.log(p.url());console.log((await p.innerText('body')).slice(0,2000));
await p.goto('http://localhost:4100/educator');await p.screenshot({path:'02-educator.png',fullPage:true});
console.log((await p.innerText('body')).slice(0,3000));
console.log(await p.$$eval('a,button',e=>e.map(x=>x.tagName+':'+x.textContent.trim()+':'+(x.href||''))));
await b.close();})();
