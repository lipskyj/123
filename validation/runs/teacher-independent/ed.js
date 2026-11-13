module.exports=async p=>{await p.click('button:has-text("Edit this design")');await p.waitForTimeout(1500);await p.screenshot({path:'07-editor.png',fullPage:true});
const t=await p.innerText('body');const i=t.indexOf('Your decision');console.log(t.slice(i));
console.log(JSON.stringify(await p.$$eval('input,textarea,select,button',e=>e.filter(x=>x.offsetParent).map(x=>x.tagName+'|'+(x.name||x.id)+'|'+(x.type||'')+'|'+(x.value||'').slice(0,80)+'|'+x.textContent.trim().slice(0,30))),null,0));};
