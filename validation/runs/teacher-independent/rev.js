module.exports=async p=>{const fs=require('fs');if(await p.isVisible('#cancel'))await p.click('#cancel');
await p.fill('#revreq',fs.readFileSync('revision.txt','utf8').trim());await p.click('button:has-text("Request revision")');await p.waitForTimeout(4000);
await p.screenshot({path:process.env.SHOT||'08-after-revision.png',fullPage:true});const t=await p.innerText('body');fs.writeFileSync(process.env.OUT||'design-v2.txt',t);console.log(t.slice(t.indexOf('Le Chatelier - Explain It to a Classmate\n1.')));};
