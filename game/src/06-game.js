// ---------------------------------------------------------------- HUD
const setText = (el, s) => { if (el._t !== s) { el._t = s; el.textContent = s; } };
const setBar = (el, f) => { f = clamp(f, 0, 1).toFixed(3); if (el._f !== f) { el._f = f; el.firstElementChild.style.transform = `scaleX(${f})`; } };
const hud = { score: $('score'), combo: $('combo'), wave: $('wave'), left: $('left'), hpnum: $('hpnum'), hpbar: $('hpbar'), shield: $('shieldbar'), dash: $('dashbar'),
  wname: $('wname'), ammo: $('ammo'), slots: [...$('slots').children], od: $('od'), odbar: $('odbar'), odlbl: $('odlbl'), hit: $('hit'), ann: $('announce'), feed: $('feed'), tip: $('tip'), low: $('lowhp') };
const cross = { u: $('cu'), d: $('cd'), l: $('cl'), r: $('cr') };
let hitT = 0, annT = 0, feedT = 0, tipT = 0;
const nums = [];
for (let i = 0; i < 26; i++) { const el = document.createElement('div'); el.className = 'num'; el.hidden = true; el.style.left = el.style.top = '0'; $('nums').appendChild(el); nums.push({ el, t: 0, d: 1, p: V() }); }
function hitMarker(crit) { hitT = 0.16; hud.hit.className = crit ? 'crit' : ''; }
function dmgNumber(pt, dmg, crit) { const o = freeOf(nums); o.t = o.d = 0.7; o.p.copy(pt); o.p.y += 0.3; o.el.textContent = Math.round(dmg); o.el.className = 'num' + (crit ? ' crit' : ''); o.el.hidden = false; }
function damageIndicator(src) {
  const dx = src.x - P.pos.x, dz = src.z - P.pos.z, sy = Math.sin(P.yaw), cy = Math.cos(P.yaw);
  const a = Math.atan2(dx * cy - dz * sy, -dx * sy - dz * cy);
  const el = document.createElement('div'); el.className = 'ind'; el.style.transform = `rotate(${a}rad)`; el.innerHTML = '<i></i>';
  $('inds').appendChild(el); setTimeout(() => el.remove(), 1100);
}
function announce(big, small, dur = 2) { hud.ann.children[0].textContent = big; hud.ann.children[1].textContent = small || ''; hud.ann.style.opacity = 1; annT = dur; }
function feed(text) { hud.feed.textContent = text; hud.feed.style.opacity = 1; feedT = 1.3; }
function showTip(text, dur = 2) { hud.tip.textContent = text; tipT = dur; }
const rc = $('radar').getContext('2d');
function drawRadar() {
  const c = 75, R = 68, range = 48, sy = Math.sin(P.yaw), cy = Math.cos(P.yaw);
  rc.clearRect(0, 0, 150, 150); rc.strokeStyle = 'rgba(77,225,255,.28)'; rc.lineWidth = 1;
  for (const r of [R, R / 2]) { rc.beginPath(); rc.arc(c, c, r, 0, 7); rc.stroke(); }
  rc.beginPath(); rc.moveTo(c, c - R); rc.lineTo(c, c + R); rc.moveTo(c - R, c); rc.lineTo(c + R, c); rc.stroke();
  const plot = (x, z, col, sz) => {
    const dx = x - P.pos.x, dz = z - P.pos.z; let px = (dx * cy - dz * sy) / range * R, py = (dx * sy + dz * cy) / range * R; const l = Math.hypot(px, py);
    if (l > R) { px *= R / l; py *= R / l; } rc.fillStyle = col; rc.beginPath(); rc.arc(c + px, c + py, sz, 0, 7); rc.fill();
  };
  for (const p of pickups) plot(p.pos.x, p.pos.z, p.kind === 'health' ? '#5dffa0' : '#ffc247', 2);
  for (const e of enemies) plot(e.pos.x, e.pos.z, e.type === 'boss' ? '#b36bff' : e.type === 'wasp' ? '#4de1ff' : e.type === 'bulwark' ? '#ffb347' : '#ff3d6e', e.type === 'boss' ? 6 : e.type === 'bulwark' ? 4 : 2.6);
  rc.fillStyle = '#fff'; rc.beginPath(); rc.moveTo(c, c - 6); rc.lineTo(c + 4, c + 4); rc.lineTo(c - 4, c + 4); rc.fill();
}
function updateHUD(dt) {
  setText(hud.score, String(G.score)); setText(hud.combo, G.combo > 1 ? `×${(1 + Math.min(G.combo - 1, 20) * 0.1).toFixed(1)} COMBO` : '');
  const hp = `${Math.ceil(P.hp)}|${Math.ceil(P.shield)}`;
  if (hud.hpnum._t !== hp) { hud.hpnum._t = hp; hud.hpnum.innerHTML = `${Math.ceil(P.hp)}<small>+${Math.ceil(P.shield)}</small>`; }
  setBar(hud.hpbar, P.hp / P.maxHp); setBar(hud.shield, P.shield / P.maxShield); hud.hpbar.classList.toggle('low', P.hp < P.maxHp * 0.3);
  setBar(hud.dash, 1 - Math.max(0, P.dashCd) / (1.7 * mods.dashCd));
  const s = ws[cur], am = `${s.mag}|${s.res}|${reloadT > 0}`;
  if (hud.ammo._t !== am) { hud.ammo._t = am; hud.ammo.innerHTML = reloadT > 0 ? `<small>RELOADING</small>` : `${s.mag}<small>${s.res === Infinity ? '∞' : s.res}</small>`; }
  setText(hud.wname, WEAPONS[cur].name);
  hud.slots.forEach((b, i) => { const cls = (i === cur ? 'on' : '') + (ws[i].mag + ws[i].res <= 0 ? ' dry' : ''); if (b._c !== cls) { b._c = cls; b.className = cls; } });
  setBar(hud.odbar, G.odT > 0 ? G.odT / 7 : G.od / 100); hud.od.classList.toggle('ready', G.od >= 100 && G.odT <= 0);
  setText(hud.odlbl, G.odT > 0 ? 'Overdrive active' : G.od >= 100 ? 'Overdrive ready · press F' : 'Overdrive');
  setText(hud.wave, 'WAVE ' + Math.max(1, G.wave)); setText(hud.left, G.phase === 'fight' ? `${G.queue.length + enemies.length} HOSTILES` : G.phase === 'countdown' ? 'INBOUND' : '');
  const gap = 5 + WEAPONS[cur].spread * 380 * (1 - 0.6 * P.ads) + vm.recoil * 5 + (P.onGround ? 0 : 5) + Math.hypot(P.vel.x, P.vel.z) * 0.25;
  cross.u.style.cssText = `width:2px;height:8px;left:-1px;top:${-gap - 8}px`; cross.d.style.cssText = `width:2px;height:8px;left:-1px;top:${gap}px`;
  cross.l.style.cssText = `width:8px;height:2px;top:-1px;left:${-gap - 8}px`; cross.r.style.cssText = `width:8px;height:2px;top:-1px;left:${gap}px`;
  hitT -= dt; hud.hit.style.opacity = clamp(hitT / 0.12, 0, 1); hud.hit.style.transform = `scale(${1 + Math.max(0, hitT) * 3})`;
  if (annT > 0) { annT -= dt; if (annT <= 0) hud.ann.style.opacity = 0; }
  if (feedT > 0) { feedT -= dt; hud.feed.style.opacity = clamp(feedT * 2, 0, 1); hud.feed.style.transform = `scale(${1 + Math.max(0, feedT - 1) * 2})`; }
  if (tipT > 0) { tipT -= dt; if (tipT <= 0) hud.tip.textContent = ''; }
  hud.low.style.opacity = P.hp < P.maxHp * 0.3 && G.state === 'playing' ? 0.5 + 0.3 * Math.sin(G.time * 7) : 0;
  const w = window.innerWidth, h = window.innerHeight;
  for (const o of nums) if (o.t > 0) {
    o.t -= dt; o.p.y += 1.5 * dt; tmpA.copy(o.p).project(camera);
    if (o.t <= 0 || tmpA.z > 1) { o.el.hidden = true; o.t = Math.min(o.t, 0); continue; }
    o.el.hidden = false; o.el.style.transform = `translate(${((tmpA.x * .5 + .5) * w).toFixed(0)}px,${((-tmpA.y * .5 + .5) * h).toFixed(0)}px) translate(-50%,-50%)`; o.el.style.opacity = clamp(o.t / o.d * 2, 0, 1);
  }
  drawRadar();
}

// ---------------------------------------------------------------- waves + perks
function startWave(n) {
  G.wave = n; G.phase = 'fight'; const boss = n % 5 === 0;
  let budget = 7 + n * 5 + (n > 6 ? (n - 6) * 3 : 0); if (boss) budget = Math.floor(budget * 0.45);
  const types = [['skitter', 1], ['skitter', 1]]; if (n >= 2) types.push(['wasp', 2]); if (n >= 3) types.push(['bomber', 2]); if (n >= 4) types.push(['bulwark', 8]);
  const q = []; let guard = 0, bul = 0;
  while (budget > 0 && guard++ < 600) {
    const t = pick(types);
    if (t[1] > budget || (t[0] === 'bulwark' && bul >= 1 + Math.floor(n / 4))) { if (guard > 400) { q.push('skitter'); budget--; } continue; }
    if (t[0] === 'bulwark') bul++; q.push(t[0]); budget -= t[1];
  }
  G.queue = q; G.spawnT = 1.4; sfx.wave();
  if (boss) {
    spawnEnemy('boss', 0, 32, 0); $('boss').hidden = false; music.intensity = 2; sfx.boss();
    announce('THE OVERSEER', 'aim for the eye · break line of sight when it fires the beam', 3.5);
  } else announce('WAVE ' + n, n === 1 ? 'hold the deck' : n === 2 ? 'wasps inbound · watch the sky' : n === 3 ? 'bombers inbound · shoot them at range' : n === 4 ? 'bulwark inbound · jump its shockwave' : `${q.length} hostiles inbound`, 2.4);
}
function updateWaves(dt, real) {
  if (G.phase === 'countdown') { G.phaseT -= dt; if (G.phaseT <= 0) startWave(G.wave + 1); }
  else if (G.phase === 'fight') {
    G.spawnT -= dt;
    if (G.spawnT <= 0 && G.queue.length && enemies.length < 20 + G.wave) {
      const type = G.queue.pop(), gi = (Math.random() * 4) | 0, g = GATES[gi]; world.gates[gi].pulse = 1;
      spawnEnemy(type, g[0] + rand(-2.5, 2.5), type === 'wasp' ? rand(5, 8) : 0, g[1] + rand(-2.5, 2.5));
      G.spawnT = Math.max(0.2, 1.1 - G.wave * 0.07) * rand(0.7, 1.3);
    }
    if (!G.queue.length && !enemies.length) {
      G.phase = 'cleared'; G.phaseT = 1.9; G.slowT = Math.max(G.slowT, 0.8); const bonus = G.wave * 250; G.score += bonus;
      P.hp = Math.min(P.maxHp, P.hp + 20); sfx.clear(); announce('WAVE CLEARED', `+${bonus} · hull repaired`, 1.8);
    }
  } else if (G.phase === 'cleared') { G.phaseT -= real; if (G.phaseT <= 0) showPerks(); }
}
const PERKS = [
  { n: 'OVERCLOCK', i: '»»', d: '+18% fire rate on every weapon', f: () => mods.rate *= 1.18 },
  { n: 'HOLLOW CORE', i: '◆', d: '+22% damage', f: () => mods.dmg *= 1.22 },
  { n: 'HULL PLATING', i: '✚', d: '+30 max health and a full repair', f: () => { P.maxHp += 30; P.hp = P.maxHp; } },
  { n: 'CAPACITOR', i: '◎', d: '+30 max shield, recharges 40% faster', f: () => { P.maxShield += 30; mods.shieldRegen *= 1.4; } },
  { n: 'SIPHON', i: '♥', d: 'Restore 3 health on every kill', f: () => mods.lifesteal += 3 },
  { n: 'THRUSTERS', i: '➤', d: '+12% move speed, dash recharges 30% faster', f: () => { mods.speed *= 1.12; mods.dashCd *= 0.7; } },
  { n: 'DEEP MAGS', i: '▮▮', d: '+40% magazine size and a full restock', f: () => { mods.mag *= 1.4; for (let k = 1; k < 4; k++) ws[k].res = WEAPONS[k].max; for (let k = 0; k < 4; k++) ws[k].mag = magSize(k); } },
  { n: 'VOLATILE', i: '✹', d: 'Destroyed machines explode and damage others', f: () => mods.volatile += 1 },
  { n: 'ARC LINK', i: 'ϟ', d: 'Every hit arcs to the nearest second machine', f: () => mods.arc += 1 },
  { n: 'GRAV BOOTS', i: '⇈', d: 'One extra mid-air jump', f: () => mods.airJumps += 1 },
  { n: 'SCAVENGER', i: '⬡', d: 'More drops, pulled in from twice as far', f: () => { mods.drop *= 1.6; mods.magnet *= 2; } },
  { n: 'EXECUTIONER', i: '⌖', d: 'Weak-point hits deal +60% more', f: () => mods.crit += 1.2 }
];
let perkChoices = [], perkSel = 1;
function setPerkSel(i) { perkSel = i; [...$('cards').children].forEach((c, k) => c.classList.toggle('sel', k === i)); }
function showPerks() {
  G.state = 'perk'; G.perkGuard = 0.6; hud.ann.style.opacity = 0; annT = 0; perkAcc = 0; mouse.l = mouse.r = false;
  const pool = PERKS.slice(); perkChoices = [];
  for (let i = 0; i < 3; i++) perkChoices.push(pool.splice((Math.random() * pool.length) | 0, 1)[0]);
  $('ptag').textContent = `Wave ${G.wave} cleared`;
  const cards = $('cards'); cards.innerHTML = '';
  perkChoices.forEach((p, i) => {
    const c = document.createElement('div'); c.className = 'card';
    c.innerHTML = `<div class="k">[ ${i + 1} ]</div><div class="ic">${p.i}</div><div class="n">${p.n}</div><div class="d">${p.d}</div>`;
    c.addEventListener('click', () => { if (G.perkGuard <= 0) pickPerk(i); }); c.addEventListener('mouseenter', () => { if (document.pointerLockElement !== canvas) setPerkSel(i); });
    cards.appendChild(c);
  });
  setPerkSel(1); $('perks').hidden = false;
}
function pickPerk(i) {
  if (G.state !== 'perk' || !perkChoices[i]) return;
  perkChoices[i].f(); sfx.perk(); $('perks').hidden = true; showTip(perkChoices[i].n + ' installed', 2.5);
  G.state = 'playing'; G.phase = 'countdown'; G.phaseT = 2.4; mouse.l = false; last = performance.now();
  if (!G.freeLook && document.pointerLockElement !== canvas) lockPointer();
}

// ---------------------------------------------------------------- flow
function startGame() {
  initAudio();
  for (const e of enemies) { scene.remove(e.mesh); if (e.beam) scene.remove(e.beam); } enemies.length = 0;
  for (const o of projs) scene.remove(o.mesh); projs.length = 0;
  for (const p of pickups) scene.remove(p.m); pickups.length = 0;
  for (const r of fx.rings) { r.t = 0; r.m.visible = false; } fx.delayed.length = 0;
  resetMods();
  Object.assign(P, { yaw: 0, pitch: 0, hp: 100, maxHp: 100, shield: 50, maxShield: 50, lastHurt: -9, dashCd: 0, dashT: 0, invuln: 0, kick: 0, trauma: 0, dmgFx: 0, ads: 0, onGround: true, airJumps: 1 });
  P.pos.set(0, 0, 18); P.vel.set(0, 0, 0);
  WEAPONS.forEach((w, i) => { ws[i].mag = w.mag; ws[i].res = w.res; });
  vm.models.forEach((m, i) => m.visible = i === 0); cur = 0; pendingW = -1; switchT = reloadT = fireCd = 0; vm.group.visible = true;
  Object.assign(G, { state: 'playing', phase: 'countdown', phaseT: 2.4, wave: 0, score: 0, kills: 0, combo: 0, comboT: 0, queue: [], time: 0, slowT: 0, od: 0, odT: 0, shots: 0, hits: 0, multiT: 0, multiN: 0 });
  for (const id of ['menu', 'pause', 'perks', 'dead']) $(id).hidden = true;
  $('hud').hidden = false; $('boss').hidden = true; music.intensity = 1; mouse.l = mouse.r = false;
  announce('HOLD THE DECK', 'first wave inbound', 2.2); last = performance.now();
  lockPointer(); canvas.focus();
}
function pauseGame() {
  if (G.state !== 'playing') return;
  G.state = 'paused'; $('pause').hidden = false; mouse.l = mouse.r = false; for (const k in keys) keys[k] = false;
}
function resumeGame() {
  if (G.state !== 'paused') return;
  G.state = 'playing'; $('pause').hidden = true; last = performance.now(); initAudio(); lockPointer(); canvas.focus();
}
function gameOver() {
  G.state = 'dead'; sfx.die(); music.intensity = 0; mouse.l = mouse.r = false;
  const newBest = G.score > G.best; if (newBest) { G.best = G.score; try { localStorage.setItem('helios-best', G.best); } catch (e) {} }
  explode(P.eye.clone(), 6, 0, 0, 0xff3d6e, true);
  if (document.pointerLockElement === canvas) document.exitPointerLock();
  vm.group.visible = false;
  $('stats').innerHTML = `<span>Wave reached</span><b>${G.wave}</b><span>Score</span><b>${G.score}${newBest ? ' · new best' : ''}</b><span>Machines destroyed</span><b>${G.kills}</b><span>Accuracy</span><b>${G.shots ? Math.round(G.hits / G.shots * 100) : 0}%</b><span>Best score</span><b>${G.best}</b>`;
  setTimeout(() => { if (G.state === 'dead') { $('dead').hidden = false; $('hud').hidden = true; } }, 1300);
}
$('play').addEventListener('click', startGame);
$('again').addEventListener('click', startGame);
$('resume').addEventListener('click', resumeGame);
document.addEventListener('visibilitychange', () => { if (document.hidden) pauseGame(); });
if (G.best > 0) $('best').textContent = 'BEST SCORE ' + G.best;
$('pinfo').textContent = `Sensitivity ${G.sens.toFixed(1)} · press [ or ] to adjust`;

// ---------------------------------------------------------------- main loop
buildWorld(); buildFlowGrid(); buildParticles(); buildFx(); buildViewmodel(); vm.group.visible = false; resize();
let last = performance.now(), ftAcc = 0, ftN = 0, wt = 0;
function frame(now) {
  requestAnimationFrame(frame);
  const real = Math.min(0.05, Math.max(0.0001, (now - last) / 1000)); last = now; wt += real;
  musicTick();
  let dt = 0;
  if (G.state === 'playing') {
    dt = real; if (G.slowT > 0) { G.slowT -= real; dt *= 0.3; }
    G.time += dt;
    updatePlayer(dt); updateWeapons(dt);
    const edt = dt * (G.odT > 0 ? 0.6 : 1);
    updateEnemies(edt); updateProjs(edt); updatePickups(dt); updateWaves(dt, real);
    if (G.comboT > 0) { G.comboT -= dt; if (G.comboT <= 0) G.combo = 0; }
    G.multiT -= dt; if (G.odT > 0) G.odT -= dt;
    P.dmgFx = Math.max(0, P.dmgFx - 2.2 * dt);
    ftAcc += real; if (++ftN >= 120) { if (ftAcc / ftN > 1 / 40 && pixelRatio > 0.7) { pixelRatio = Math.max(0.7, pixelRatio * 0.85); resize(); } ftAcc = ftN = 0; }
  } else if (G.state === 'menu') {
    dt = real; const a = wt * 0.07; camera.position.set(Math.cos(a) * 47, 12 + Math.sin(a * 2) * 3, Math.sin(a) * 47); camera.lookAt(0, 5, 0);
  } else if (G.state === 'dead') {
    dt = real * 0.4; camera.position.y = damp(camera.position.y, P.pos.y + 0.35, 3, real); camera.rotation.z = damp(camera.rotation.z, 0.5, 3, real);
    updateEnemies(dt); updateProjs(dt);
  } else if (G.state === 'perk') G.perkGuard -= real;
  updateParticles(dt); updateFx(dt);

  // ambient world motion
  const pulse = 1 + Math.sin(wt * 3) * 0.06;
  world.core.scale.setScalar(1.9 * pulse); world.coreLight.intensity = 2.2 * pulse + (G.odT > 0 ? 1.5 : 0);
  world.core.material.color.setHex(G.odT > 0 ? 0x7fe8ff : 0xffb060); world.beam.material.opacity = 0.28 + 0.1 * Math.sin(wt * 5);
  world.coreRings.forEach((r, i) => { r.rotation.x = wt * (0.5 + i * 0.23); r.rotation.y = wt * (0.35 - i * 0.2); });
  world.rings.forEach((r, i) => { r.rotation.z += real * (i ? -0.02 : 0.03); });
  world.sky.material.uniforms.uTime.value = wt;
  for (const g of world.gates) { g.pulse = Math.max(0, g.pulse - real * 1.5); g.ring.scale.setScalar(2.6 + g.pulse * 0.5); g.disc.material.opacity = 0.14 + g.pulse * 0.6; g.ring.rotation.z += real * (0.5 + g.pulse * 6); }
  for (const p of pads) { p.arrow.position.y = 1.1 + ((wt * 1.4) % 1) * 1.2; p.arrow.scale.setScalar(0.5 * (1 - ((wt * 1.4) % 1) * 0.6)); }

  if (G.state !== 'menu') updateHUD(real);
  if (finalPass) { const u = finalPass.material.uniforms; u.uDamage.value = P.dmgFx; u.uOD.value = G.odT > 0 ? Math.min(1, G.odT * 2) : 0; u.uTime.value = wt % 100; }
  if (composer) composer.render(); else renderer.render(scene, camera);
  for (const k in pressed) delete pressed[k];
}
requestAnimationFrame(frame);
window.HB = { showPerks, vm, fx, get fps() { return ftN / Math.max(ftAcc, 1e-6); }, G, P, enemies, projs, pickups, ws, mods, startGame, spawnEnemy, startWave, pickPerk, WEAPONS };
