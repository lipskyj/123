module.exports=async p=>{
if(!(await p.isVisible('#e-mis'))){await p.click('button:has-text("Edit this design")');await p.waitForTimeout(1000);}
await p.fill('#e-title','Le Chatelier: Explain It to Jordan');
await p.fill('#e-cgoal','Understand WHY equilibria shift (not just the rule) before tomorrow\'s exam and the Haber process lab report');
await p.fill('#e-stakes','Jordan has the exam tomorrow and will repeat your explanation in the Haber lab report, so it has to hold up when they ask "but why?"');
await p.fill('#e-concepts',`Equilibrium is dynamic: forward and reverse rates are equal, concentrations constant but not equal | rate, rates, forward, reverse, still, constant, not equal, both directions
Reaction quotient Q vs equilibrium constant K decides the direction of the shift | Q, K, quotient, smaller than K, bigger than K, less than K, greater than K
Concentration and pressure/volume changes change Q, not K | Q changes, K stays, K doesn't change, K does not change, same K, fewer moles
Only temperature changes K (exothermic: heating lowers K) | temperature, heating, exothermic, K decreases, lowers K, K gets smaller
A catalyst speeds up both directions equally and does not shift equilibrium | catalyst, both directions, faster, equally, same amount, doesn't shift, does not shift`);
await p.fill('#e-mis',`Adding a catalyst shifts the equilibrium toward products and gives more ammonia — a catalyst speeds up forward and reverse equally; it only gets to equilibrium faster
At equilibrium the reaction has stopped — both directions are still running, at equal rates
At equilibrium the concentrations of reactants and products are equal — they are constant, not equal
Adding more N2 increases K — adding reactant lowers Q below K; K only changes with temperature
Heating always gives more product — for an exothermic reaction like Haber, heating lowers K and shifts left, even though it gets there faster`);
await p.fill('#e-crit',`Compares Q to K to explain the direction of the shift (e.g. "adding N2 makes Q smaller than K, so it shifts right") | Q, K, smaller than K, bigger than K, less than K, greater than K
Says explicitly that K stays the same for concentration and pressure changes and only changes with temperature | K stays, K doesn't change, K does not change, same K, temperature
Explains that a catalyst speeds up forward and reverse equally, so it gets to equilibrium faster but doesn't change how much product | catalyst, both directions, faster, equally, same amount
Describes equilibrium as dynamic (both reactions still going, equal rates), not stopped and not equal amounts | rate, rates, forward, reverse, still, not equal, both directions
Corrects Jordan's specific wrong statement instead of just repeating the rule | no, actually, not quite, wrong, because`);
await p.screenshot({path:'10-editor-filled.png',fullPage:true});
await p.click('button:has-text("Save as new version")');await p.waitForTimeout(3500);
await p.screenshot({path:'11-design-v3.png',fullPage:true});const t=await p.innerText('body');require('fs').writeFileSync('design-v3.txt',t);console.log(t.slice(t.indexOf('3. Experience')));};
