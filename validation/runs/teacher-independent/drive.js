const { chromium } = require('playwright');
(async()=>{const b=await chromium.connectOverCDP('http://127.0.0.1:9333');
const pages=b.contexts().flatMap(c=>c.pages());let p=pages[pages.length-1];
try{await require(require('path').resolve(process.argv[2]))(p);}catch(e){console.log('ERR',e.message.split('\n')[0]);}
process.exit(0);})();
