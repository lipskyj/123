const { chromium } = require('playwright');
(async()=>{const b=await chromium.launch({args:['--remote-debugging-port=9333']});const p=await b.newPage({viewport:{width:1280,height:900}});await p.goto('http://localhost:4100/educator');setInterval(()=>{},1e9);})();
