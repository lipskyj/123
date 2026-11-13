module.exports=async p=>{const fs=require('fs');const t=fs.readFileSync('answer.txt','utf8').trim();const n=process.env.N||'x';
await p.fill('#answer',t);await p.click('button:has-text("Send answer")');await p.waitForTimeout(2500);
await p.screenshot({path:`int-${n}.png`,fullPage:true});
const txt=await p.innerText('body');const i=txt.indexOf('Interview\nPrimer');console.log(txt.slice(i>0?i:0));};
