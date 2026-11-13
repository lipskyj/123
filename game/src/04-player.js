// ---------------------------------------------------------------- player
const P = {
  pos: V(0, 0, 18), vel: V(), yaw: 0, pitch: 0, onGround: true, airJumps: 1, hp: 100, maxHp: 100, shield: 50, maxShield: 50,
  lastHurt: -9, dashCd: 0, dashT: 0, dashDir: V(), invuln: 0, bob: 0, kick: 0, trauma: 0, dip: 0, roll: 0, fov: 78,
  coyote: 0, jumpBuf: 0, dmgFx: 0, ads: 0, eye: V()
};
const EYE = 1.58, PR = 0.42, PH = 1.75;
let perkAcc = 0, lockTimer = 0;

document.addEventListener('mousemove', e => {
  const locked = document.pointerLockElement === canvas;
  const mx = e.movementX || 0, my = e.movementY || 0;
  if (Math.abs(mx) > 500 || Math.abs(my) > 500) return;
  if (G.state === 'perk') { if (locked) { perkAcc += mx; setPerkSel(clamp(1 + Math.round(perkAcc / 180), 0, 2)); } return; }
  if (G.state !== 'playing' || (!locked && !G.freeLook)) return;
  const s = 0.0022 * G.sens * (1 - 0.5 * P.ads);
  P.yaw -= mx * s; P.pitch = clamp(P.pitch - my * s, -1.5, 1.5);
  mouse.dx += mx; mouse.dy += my;
});
document.addEventListener('mousedown', e => {
  if (e.target && e.target.closest && e.target.closest('button,.card')) return;
  if (G.state === 'perk') { if (document.pointerLockElement === canvas && G.perkGuard <= 0) pickPerk(perkSel); return; }
  if (G.state !== 'playing') return;
  initAudio();
  if (e.button === 0) mouse.l = true; if (e.button === 2) mouse.r = true;
  if (!G.freeLook && document.pointerLockElement !== canvas) lockPointer();
});
window.addEventListener('mouseup', e => { if (e.button === 0) mouse.l = false; if (e.button === 2) mouse.r = false; });
window.addEventListener('wheel', e => { if (G.state === 'playing') switchWeapon((cur + (e.deltaY > 0 ? 1 : 3)) % 4); }, { passive: true });

function lockPointer() {
  if (G.freeLook) return;
  try { const p = canvas.requestPointerLock(); if (p && p.catch) p.catch(() => {}); } catch (e) {}
  clearTimeout(lockTimer);
  lockTimer = setTimeout(() => {
    if (document.pointerLockElement === canvas || G.state !== 'playing') return;
    if (!G.everLocked) { G.freeLook = true; showTip('Mouse capture is unavailable here. Free-look is on: move the mouse to aim, or turn with Q / E.', 9); }
    else pauseGame();
  }, 800);
}
document.addEventListener('pointerlockchange', () => {
  if (document.pointerLockElement === canvas) G.everLocked = true;
  else if (G.state === 'playing' && !G.freeLook) pauseGame();
});

function onKey(code) {
  if (G.state === 'perk') { const i = ['Digit1', 'Digit2', 'Digit3'].indexOf(code); if (i >= 0 && G.perkGuard <= 0) pickPerk(i); return; }
  if (code === 'KeyM') { muted = !muted; if (master) master.gain.value = muted ? 0 : 0.9; showTip(muted ? 'Sound off' : 'Sound on', 1.5); }
  if (code === 'BracketLeft' || code === 'BracketRight') {
    G.sens = clamp(+(G.sens + (code === 'BracketLeft' ? -0.1 : 0.1)).toFixed(1), 0.2, 3);
    try { localStorage.setItem('helios-sens', G.sens); } catch (e) {}
    $('pinfo').textContent = `Sensitivity ${G.sens.toFixed(1)} · press [ or ] to adjust`; showTip('Sensitivity ' + G.sens.toFixed(1), 1.5);
  }
  if (G.state === 'paused' && (code === 'KeyP' || code === 'Enter')) { resumeGame(); return; }
  if (G.state !== 'playing') return;
  if (code === 'KeyP' || (code === 'Escape' && G.freeLook)) { pauseGame(); return; }
  const d = ['Digit1', 'Digit2', 'Digit3', 'Digit4'].indexOf(code); if (d >= 0) switchWeapon(d);
  if (code === 'KeyR') startReload();
  if (code === 'KeyF' && G.od >= 100 && G.odT <= 0) { G.odT = 7; G.od = 0; sfx.od(); announce('OVERDRIVE', 'damage and fire rate boosted · free ammo', 1.6); ring(P.pos, 0.5, 14, 0x4de1ff, 0.7); }
}

function updatePlayer(dt) {
  const turn = ((keys.KeyQ || keys.ArrowLeft) ? 1 : 0) - ((keys.KeyE || keys.ArrowRight) ? 1 : 0);
  if (turn) P.yaw += turn * 2.4 * dt;
  if (keys.ArrowUp) P.pitch = clamp(P.pitch + 1.6 * dt, -1.5, 1.5); if (keys.ArrowDown) P.pitch = clamp(P.pitch - 1.6 * dt, -1.5, 1.5);
  const f = (keys.KeyW ? 1 : 0) - (keys.KeyS ? 1 : 0) - touch.my, s = (keys.KeyD ? 1 : 0) - (keys.KeyA ? 1 : 0) + touch.mx;
  const sy = Math.sin(P.yaw), cy = Math.cos(P.yaw);
  let wx = -sy * f + cy * s, wz = -cy * f - sy * s; const wl = Math.hypot(wx, wz); if (wl > 1) { wx /= wl; wz /= wl; }
  const speed = 9.6 * mods.speed * (1 - 0.35 * P.ads);

  P.dashCd -= dt; P.invuln -= dt;
  if ((pressed.ShiftLeft || pressed.ShiftRight) && P.dashCd <= 0) {
    if (wl > 0.15) P.dashDir.set(wx, 0, wz).normalize(); else P.dashDir.set(-sy, 0, -cy);
    P.dashT = 0.17; P.dashCd = 1.7 * mods.dashCd; P.invuln = 0.25; sfx.dash();
    for (let i = 0; i < 14; i++) emit(P.pos.x + rand(-.4, .4), P.pos.y + rand(.3, 1.5), P.pos.z + rand(-.4, .4), -P.dashDir.x * 6, 0, -P.dashDir.z * 6, 0x4de1ff, 0.25, 0.35);
  }
  if (P.dashT > 0) { P.dashT -= dt; P.vel.x = P.dashDir.x * 31; P.vel.z = P.dashDir.z * 31; if (P.vel.y < 0) P.vel.y *= 0.5; }
  else { const k = Math.min(1, (P.onGround ? 13 : 3.2) * dt); P.vel.x += (wx * speed - P.vel.x) * k; P.vel.z += (wz * speed - P.vel.z) * k; }

  P.coyote = P.onGround ? 0.1 : P.coyote - dt;
  P.jumpBuf = pressed.Space ? 0.12 : P.jumpBuf - dt;
  if (P.jumpBuf > 0) {
    if (P.coyote > 0) { P.vel.y = 9.8; P.coyote = 0; P.jumpBuf = 0; sfx.jump(); }
    else if (P.airJumps > 0 && pressed.Space) { P.vel.y = 9.4; P.airJumps--; P.jumpBuf = 0; sfx.jump(); ring(P.pos, 0.2, 1.6, 0x4de1ff, 0.3); }
  }
  P.vel.y -= 26 * dt;
  const was = P.onGround, vy0 = P.vel.y;
  const hs = Math.hypot(P.vel.x, P.vel.z), n = Math.max(1, Math.ceil(hs * dt / 0.35));
  let g = false; for (let i = 0; i < n; i++) g = collideMove(P.pos, P.vel, dt / n, PR, PH) || g;
  P.onGround = g;
  if (g) { P.airJumps = mods.airJumps; if (!was && vy0 < -9) { P.dip = Math.min(0.35, -vy0 * 0.014); sfx.land(); } }
  if (g) for (const p of pads) if (Math.hypot(P.pos.x - p.x, P.pos.z - p.z) < p.r && P.pos.y < 0.5) {
    P.vel.y = 23; P.onGround = false; sfx.pad(); ring(P.pos, 0.5, 4, 0x5dffa0, 0.45); burst(tmpA.copy(P.pos), 16, 0x5dffa0, 6, 0.3, 0.5, 0, 6);
  }

  // regen
  if (G.time - P.lastHurt > 4 && P.shield < P.maxShield) P.shield = Math.min(P.maxShield, P.shield + 16 * mods.shieldRegen * dt);

  // camera
  if (P.onGround && hs > 1) { const b0 = Math.floor(P.bob / Math.PI); P.bob += hs * dt * 0.95; if (hs > 3 && Math.floor(P.bob / Math.PI) !== b0) sfx.step(); }
  P.dip = damp(P.dip, 0, 9, dt); P.kick = damp(P.kick, 0, 11, dt); P.trauma = Math.max(0, P.trauma - 1.6 * dt);
  P.roll = damp(P.roll, -clamp(s, -1, 1) * 0.035, 8, dt);
  const sh = P.trauma * P.trauma, bobY = P.onGround ? Math.sin(P.bob * 2) * 0.05 * Math.min(1, hs / 9) : 0;
  P.eye.set(P.pos.x, P.pos.y + EYE - P.dip + bobY, P.pos.z);
  camera.position.copy(P.eye);
  camera.rotation.set(P.pitch + P.kick + rand(-1, 1) * sh * 0.05, P.yaw + rand(-1, 1) * sh * 0.05, P.roll + rand(-1, 1) * sh * 0.04);
  P.fov = damp(P.fov, BASEFOV * (1 - 0.385 * P.ads) + (P.dashT > 0 ? 12 : 0) + (G.odT > 0 ? 5 : 0), 10, dt);
  if (Math.abs(camera.fov - P.fov) > 0.01) { camera.fov = P.fov; camera.updateProjectionMatrix(); }
  camera.updateMatrixWorld(true);
}

function hurtPlayer(dmg, src) {
  if (G.state !== 'playing' || P.invuln > 0 || P.hp <= 0) return;
  dmg *= 1 + 0.05 * (G.wave - 1);
  P.lastHurt = G.time;
  if (P.shield > 0) { const a = Math.min(P.shield, dmg); P.shield -= a; dmg -= a; if (P.shield <= 0) sfx.shield(); }
  if (dmg > 0) { P.hp -= dmg; sfx.hurt(); } else sfx.absorb();
  P.trauma = Math.min(1, P.trauma + 0.3); P.dmgFx = Math.min(1, P.dmgFx + 0.4 + dmg * 0.01);
  if (src) damageIndicator(src);
  if (P.hp <= 0) { P.hp = 0; gameOver(); }
}

// ---------------------------------------------------------------- weapons
const WEAPONS = [
  { name: 'PULSE CARBINE', mag: 32, res: Infinity, max: Infinity, rate: 0.085, dmg: 13, pellets: 1, spread: 0.011, reload: 1.25, color: 0x4de1ff, kick: 0.012, rec: 0.5 },
  { name: 'SCATTERGUN', mag: 6, res: 30, max: 48, rate: 0.62, dmg: 11, pellets: 10, spread: 0.075, reload: 1.6, color: 0xffb347, kick: 0.07, rec: 1.6, falloff: 16 },
  { name: 'ARC LAUNCHER', mag: 4, res: 12, max: 20, rate: 0.75, dmg: 115, pellets: 1, spread: 0.004, reload: 1.9, color: 0xb36bff, kick: 0.05, rec: 1.3, proj: true },
  { name: 'RAIL LANCE', mag: 3, res: 9, max: 15, rate: 1.05, dmg: 175, pellets: 1, spread: 0, reload: 2.1, color: 0xff3d6e, kick: 0.1, rec: 2.2, pierce: true }
];
const ws = WEAPONS.map(w => ({ mag: w.mag, res: w.res }));
let cur = 0, fireCd = 0, reloadT = 0, switchT = 0, pendingW = -1;
const vm = { group: new T.Group(), models: [], recoil: 0, swayX: 0, swayY: 0, flash: null, flashT: 0 };
const magSize = i => Math.round(WEAPONS[i].mag * mods.mag);

function buildViewmodel() {
  const dark = new T.MeshStandardMaterial({ ...PBR.metal, color: lin(0x565c68), envMapIntensity: 0.8 });
  const mid = new T.MeshStandardMaterial({ ...PBR.metal, color: lin(0xb4bac8), envMapIntensity: 0.9 });
  const part = (g, geo, mat, x, y, z, sx, sy, sz, rx = 0) => { const m = new T.Mesh(geo, mat); m.position.set(x, y, z); m.scale.set(sx, sy, sz); m.rotation.x = rx; g.add(m); return m; };
  const H = Math.PI / 2;
  const mk = (build, mz) => { const g = new T.Group(); build(g); const mu = new T.Object3D(); mu.position.set(0, 0.02, mz); g.add(mu); g.userData.muzzle = mu; g.visible = false; vm.group.add(g); vm.models.push(g); };
  mk(g => {
    part(g, GEO.box, dark, 0, 0, -.1, .07, .1, .42); part(g, GEO.box, mid, 0, .062, -.1, .03, .025, .3);
    part(g, GEO.cyl, mid, 0, .01, -.43, .018, .28, .018, H); part(g, GEO.box, dark, 0, .01, -.56, .05, .05, .06);
    part(g, GEO.box, mid, 0, -.11, -.05, .045, .14, .07, .2); part(g, GEO.box, dark, 0, -.09, .1, .045, .11, .05, -.25);
    part(g, GEO.box, glowMat(0x4de1ff), 0, .02, -.12, .074, .012, .2); part(g, GEO.box, glowMat(0x4de1ff), 0, .09, -.25, .012, .03, .012);
  }, -.6);
  mk(g => {
    part(g, GEO.box, dark, 0, 0, -.05, .1, .1, .34); part(g, GEO.cyl, mid, -.028, .02, -.38, .028, .36, .028, H); part(g, GEO.cyl, mid, .028, .02, -.38, .028, .36, .028, H);
    part(g, GEO.box, mid, 0, -.045, -.3, .11, .06, .14); part(g, GEO.box, dark, 0, -.09, .1, .05, .12, .06, -.25);
    part(g, GEO.box, glowMat(0xffb347), 0, .03, -.05, .104, .012, .16);
  }, -.58);
  mk(g => {
    part(g, GEO.cyl, dark, 0, .02, -.2, .065, .5, .065, H); part(g, GEO.box, mid, 0, -.02, .1, .1, .12, .14); part(g, GEO.box, dark, 0, -.1, .08, .05, .12, .06, -.25);
    for (const z of [-.05, -.2, -.35]) { const t = new T.Mesh(GEO.torus, glowMat(0xb36bff)); t.scale.setScalar(.075); t.position.set(0, .02, z); g.add(t); }
    part(g, GEO.sphere, glowMat(0xb36bff), 0, .02, -.44, .045, .045, .045);
  }, -.48);
  mk(g => {
    part(g, GEO.box, mid, -.035, .02, -.3, .02, .03, .7); part(g, GEO.box, mid, .035, .02, -.3, .02, .03, .7);
    part(g, GEO.box, glowMat(0xff3d6e), 0, .02, -.3, .02, .012, .66); part(g, GEO.box, dark, 0, 0, .02, .1, .11, .25);
    for (const z of [-.15, -.3, -.45]) part(g, GEO.box, dark, 0, .02, z, .1, .05, .03);
    part(g, GEO.cyl, dark, 0, .085, 0, .02, .16, .02, H); part(g, GEO.box, dark, 0, -.09, .1, .05, .12, .06, -.25);
  }, -.66);
  const ft = canvasTex(128, (g, s) => {
    const gr = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2); gr.addColorStop(0, '#fff'); gr.addColorStop(.25, 'rgba(255,255,255,.8)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.translate(s / 2, s / 2);
    for (let i = 0; i < 6; i++) { g.rotate(Math.PI / 3); g.beginPath(); g.moveTo(0, -5); g.lineTo(s / 2, 0); g.lineTo(0, 5); g.fill(); }
    g.beginPath(); g.arc(0, 0, s / 5, 0, 7); g.fill();
  });
  vm.flash = new T.Mesh(new T.PlaneGeometry(1, 1), new T.MeshBasicMaterial({ map: ft, transparent: true, blending: T.AdditiveBlending, depthWrite: false, depthTest: false }));
  vm.flash.visible = false; vm.group.add(vm.flash);
  const suit = new T.PointLight(lin(0xbfd4ff), 1.1, 9, 2); camera.add(suit);
  camera.add(vm.group); vm.models[0].visible = true;
}
function switchWeapon(i) {
  if (i === cur || switchT > 0) return;
  if (ws[i].mag <= 0 && ws[i].res <= 0) { sfx.empty(); showTip(WEAPONS[i].name + ' is out of ammo', 1.2); return; }
  pendingW = i; switchT = 0.26; reloadT = 0; sfx.swap();
}
function startReload() {
  const w = WEAPONS[cur], s = ws[cur];
  if (reloadT > 0 || switchT > 0 || s.mag >= magSize(cur) || s.res <= 0) return;
  reloadT = w.reload; sfx.reload();
}
function fire() {
  const w = WEAPONS[cur], s = ws[cur], odOn = G.odT > 0;
  if (!odOn) s.mag--;
  fireCd = w.rate / (mods.rate * (odOn ? 1.6 : 1));
  G.shots++;
  const fwd = tmpA.set(0, 0, -1).applyQuaternion(camera.quaternion).clone();
  const right = tmpA.set(1, 0, 0).applyQuaternion(camera.quaternion).clone();
  const up = tmpA.set(0, 1, 0).applyQuaternion(camera.quaternion).clone();
  const muz = vm.models[cur].userData.muzzle.getWorldPosition(V());
  const spread = w.spread * (1 - 0.6 * P.ads) * (P.onGround ? 1 : 1.4);
  let any = false;
  for (let i = 0; i < w.pellets; i++) {
    const a = Math.random() * 6.283, r = Math.sqrt(Math.random()) * spread;
    const d = fwd.clone().addScaledVector(right, Math.cos(a) * r).addScaledVector(up, Math.sin(a) * r).normalize();
    if (w.proj) spawnProj({ type: 'plasma', pos: P.eye.clone().addScaledVector(d, 0.9).addScaledVector(right, 0.14).addScaledVector(up, -0.12), vel: d.multiplyScalar(48), r: 0.3, dmg: w.dmg, owner: 0, g: 3, color: w.color });
    else any = hitscan(P.eye, d, w, muz) || any;
  }
  if (any) G.hits++;
  vm.recoil = Math.min(2.5, vm.recoil + w.rec); P.kick += w.kick * (1 - 0.4 * P.ads); P.trauma = Math.min(1, P.trauma + w.rec * 0.06);
  vm.flashT = 0.05; vm.flash.position.copy(vm.models[cur].userData.muzzle.position); vm.flash.rotation.z = rand(6.28);
  vm.flash.scale.setScalar(rand(.18, .3) * (cur === 0 ? 1 : 1.7)); vm.flash.material.color.copy(lin(w.color, GLOW));
  flash(muz.addScaledVector(fwd, 1.6), w.color, cur === 0 ? 1.1 : 2.2, 0.07);
  if (cur < 2) casing(V().copy(P.eye).addScaledVector(fwd, 0.45).addScaledVector(right, 0.3).addScaledVector(up, -0.16), V().copy(P.vel).addScaledVector(right, rand(2.2, 3.6)).addScaledVector(up, rand(1.8, 3.2)).addScaledVector(fwd, rand(-0.6, 0.6)), cur === 1);
  for (let i = 0; i < 3; i++) emit(muz.x, muz.y, muz.z, fwd.x * rand(1, 3) + rand(-.4, .4), rand(.3, 1.2), fwd.z * rand(1, 3) + rand(-.4, .4), 0x2c2c30, rand(.25, .5), rand(.5, 1));
  sfx.shoot(cur);
}
function updateWeapons(dt) {
  const w = WEAPONS[cur], s = ws[cur];
  fireCd -= dt;
  if (switchT > 0) {
    const before = switchT; switchT -= dt;
    if (before > 0.13 && switchT <= 0.13 && pendingW >= 0) { vm.models[cur].visible = false; cur = pendingW; pendingW = -1; vm.models[cur].visible = true; }
  }
  if (reloadT > 0) {
    reloadT -= dt;
    if (reloadT <= 0) { const need = magSize(cur) - s.mag, take = Math.min(need, s.res); s.mag += take; s.res -= take; }
  }
  if ((mouse.l || touch.fire > 0 || touch.autoFire) && fireCd <= 0 && reloadT <= 0 && switchT <= 0) {
    if (s.mag > 0) fire();
    else if (s.res > 0) startReload();
    else { sfx.empty(); fireCd = 0.3; switchWeapon(0); }
  }
  if (s.mag <= 0 && s.res > 0 && reloadT <= 0 && switchT <= 0 && fireCd <= 0) startReload();
  P.ads = damp(P.ads, mouse.r && reloadT <= 0 && switchT <= 0 ? 1 : 0, 14, dt);

  // viewmodel pose
  const a = P.ads, g = vm.group;
  vm.recoil = damp(vm.recoil, 0, 12, dt);
  vm.swayX = damp(vm.swayX, clamp(-mouse.dx * 0.0009, -.05, .05), 9, dt); vm.swayY = damp(vm.swayY, clamp(mouse.dy * 0.0009, -.05, .05), 9, dt);
  mouse.dx = mouse.dy = 0;
  const sw = switchT > 0 ? Math.sin(Math.PI * (1 - switchT / 0.26)) : 0;
  const rl = reloadT > 0 ? Math.sin(Math.PI * (1 - reloadT / WEAPONS[cur].reload)) : 0;
  const hs = Math.hypot(P.vel.x, P.vel.z) / 9.6, bob = P.onGround ? hs * (1 - a * 0.85) : 0;
  g.position.set(0.27 * VMX * (1 - a) + vm.swayX + Math.cos(P.bob) * 0.012 * bob, -0.25 + 0.085 * a + vm.swayY - sw * 0.35 - rl * 0.13 + Math.sin(P.bob * 2) * 0.01 * bob - P.vel.y * 0.002, -0.46 + 0.08 * a + vm.recoil * 0.07);
  g.rotation.set(vm.recoil * 0.1 - sw * 0.9 + rl * 0.5, vm.swayX * 1.6 + 0.03 * (1 - a), rl * 0.7 + vm.swayX * -1.2);
  vm.flashT -= dt; vm.flash.visible = vm.flashT > 0;
}

function hitscan(o, d, w, muz) {
  const maxT = rayWorld(o, d, 300), end = V(), wn = rayN.clone();
  let hitAny = false;
  if (w.pierce) {
    for (const e of enemies.slice()) {
      if (e.dead) continue; const h = enemyRay(e, o, d);
      if (h.t >= 0 && h.t < maxT) { hitAny = true; damageEnemy(e, w.dmg, h.crit, V().copy(o).addScaledVector(d, h.t)); }
    }
    end.copy(o).addScaledVector(d, maxT);
    tracer(muz, end, w.color, 0.2, 0.32); tracer(muz, end, 0xffffff, 0.06, 0.4);
    const n = Math.min(40, maxT | 0); for (let i = 0; i < n; i++) { const t = rand(maxT); emit(o.x + d.x * t, o.y + d.y * t, o.z + d.z * t, rand(-1, 1), rand(-1, 1), rand(-1, 1), w.color, 0.3, 0.6); }
  } else {
    let best = null, bt = maxT, bc = false;
    for (const e of enemies) { if (e.dead) continue; const h = enemyRay(e, o, d); if (h.t >= 0 && h.t < bt) { bt = h.t; best = e; bc = h.crit; } }
    end.copy(o).addScaledVector(d, bt);
    if (best) { hitAny = true; let dm = w.dmg; if (w.falloff) dm *= clamp(1 - (bt - w.falloff) / (w.falloff * 1.5), 0.25, 1); damageEnemy(best, dm, bc, end.clone()); }
    tracer(muz, end, w.color, 0.035, 0.08);
  }
  if (maxT < 299 && (w.pierce || !hitAny)) { decal(end, wn, w.pierce ? rand(.9, 1.3) : rand(.22, .4)); burst(end, w.pierce ? 22 : 4, w.color, w.pierce ? 9 : 4, 0.22, 0.3, 8); if (w.pierce) flash(end, w.color, 3, 0.2); }
  return hitAny;
}
const hres = { t: -1, crit: false };
function enemyRay(e, o, d) {
  let t = -1;
  for (const [cy, r] of e.parts) { const tt = raySphere(o, d, e.pos.x, e.pos.y + cy * e.sc, e.pos.z, r * e.sc); if (tt >= 0 && (t < 0 || tt < t)) t = tt; }
  hres.crit = false;
  if (e.hr > 0) { const th = raySphere(o, d, e.hx, e.hy, e.hz, e.hr); if (th >= 0 && (t < 0 || th <= t + 0.35)) { hres.t = th; hres.crit = true; return hres; } }
  hres.t = t; return hres;
}
