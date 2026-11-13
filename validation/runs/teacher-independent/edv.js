module.exports=async p=>{for(const id of ['e-title','e-cgoal','e-concepts','e-mis','e-crit','e-stakes']){console.log('=== '+id);console.log(await p.inputValue('#'+id));}
const t=await p.innerText('form:has(#e-mis)');console.log('=== FORM TEXT\n'+t);};
