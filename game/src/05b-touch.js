// ---------------------------------------------------------------- touch controls
// Left thumb: floating move stick. Right thumb: drag anywhere to aim (the FIRE button also aims while held).
const stick = $('stick'), knob = $('knob');
const STICK_R = 54;
function enableTouch() {
  if (touch.on) return;
  touch.on = true; G.freeLook = true; document.body.classList.add('touch');
  $('keys-desktop').hidden = true; $('keys-touch').hidden = false; $('perkhint').textContent = 'Tap an upgrade to install it.';
  pixelRatio = Math.min(window.devicePixelRatio || 1, 1.1);
  if (world.sun) { world.sun.shadow.mapSize.set(2048, 2048); if (world.sun.shadow.map) { world.sun.shadow.map.dispose(); world.sun.shadow.map = null; } }
  resize();
}
function setAuto(v) { touch.auto = v; $('tauto').textContent = v ? 'AUTO-FIRE ON' : 'AUTO-FIRE OFF'; $('tauto').classList.toggle('off', !v); }
function endTouch(id) {
  if (touch.move && touch.move.id === id) { touch.move = null; touch.mx = touch.my = 0; stick.hidden = true; }
  const l = touch.looks.get(id); if (l) { if (l.fire) { touch.fire = Math.max(0, touch.fire - 1); $('tfire').classList.remove('held'); } touch.looks.delete(id); }
}
function resetTouch() { touch.move = null; touch.mx = touch.my = 0; touch.fire = 0; touch.looks.clear(); stick.hidden = true; $('tfire').classList.remove('held'); mouse.r = false; $('tzoom').classList.remove('held'); }

document.addEventListener('touchstart', e => {
  enableTouch();
  if (G.state !== 'playing') return;                       // menus and upgrade cards take ordinary taps
  const tg = e.target;
  if (tg.closest && tg.closest('.tb:not(#tfire), #slots, #od, #tauto')) return;
  e.preventDefault(); initAudio();
  for (const t of e.changedTouches) {
    if (tg.id === 'tfire') { touch.looks.set(t.identifier, { x: t.clientX, y: t.clientY, fire: true }); touch.fire++; tg.classList.add('held'); }
    else if (!touch.move && t.clientX < window.innerWidth * 0.45 && t.clientY > window.innerHeight * 0.28) {
      touch.move = { id: t.identifier, ox: t.clientX, oy: t.clientY };
      stick.hidden = false; stick.style.transform = `translate(${t.clientX}px,${t.clientY}px)`; knob.style.transform = 'translate(-50%,-50%)';
    } else touch.looks.set(t.identifier, { x: t.clientX, y: t.clientY });
  }
}, { passive: false });
document.addEventListener('touchmove', e => {
  if (G.state !== 'playing') return;
  e.preventDefault();
  for (const t of e.changedTouches) {
    if (touch.move && touch.move.id === t.identifier) {
      let dx = t.clientX - touch.move.ox, dy = t.clientY - touch.move.oy; const l = Math.hypot(dx, dy);
      if (l > STICK_R) { dx *= STICK_R / l; dy *= STICK_R / l; }
      touch.mx = dx / STICK_R; touch.my = dy / STICK_R; knob.style.transform = `translate(calc(-50% + ${dx}px),calc(-50% + ${dy}px))`;
      continue;
    }
    const l = touch.looks.get(t.identifier); if (!l) continue;
    const dx = t.clientX - l.x, dy = t.clientY - l.y; l.x = t.clientX; l.y = t.clientY;
    const s = 0.0052 * G.sens * (1 - 0.5 * P.ads);
    P.yaw -= dx * s; P.pitch = clamp(P.pitch - dy * s, -1.5, 1.5); mouse.dx += dx; mouse.dy += dy;
  }
}, { passive: false });
for (const ev of ['touchend', 'touchcancel']) document.addEventListener(ev, e => { for (const t of e.changedTouches) endTouch(t.identifier); });

function tapButton(id, fn) {
  const el = $(id);
  el.addEventListener('touchstart', e => { e.preventDefault(); e.stopPropagation(); if (G.state === 'playing' || id === 'tauto') fn(el); }, { passive: false });
  el.addEventListener('click', e => { if (!touch.on) fn(el); });
}
tapButton('tjump', () => { pressed.Space = true; });
tapButton('tdash', () => { pressed.ShiftLeft = true; });
tapButton('treload', () => startReload());
tapButton('tzoom', el => { mouse.r = !mouse.r; el.classList.toggle('held', mouse.r); });
tapButton('tpause', () => pauseGame());
tapButton('tauto', () => setAuto(!touch.auto));
tapButton('od', () => onKey('KeyF'));
[...$('slots').children].forEach((b, i) => b.addEventListener('touchstart', e => { e.preventDefault(); e.stopPropagation(); if (G.state === 'playing') switchWeapon(i); }, { passive: false }));

// aim assist + auto-fire: pulls the crosshair gently onto the nearest visible machine and fires the two bullet weapons when on target
function touchAssist(dt) {
  touch.autoFire = false; if (!touch.on) return;
  const cp = Math.cos(P.pitch), fx0 = -Math.sin(P.yaw) * cp, fy0 = Math.sin(P.pitch), fz0 = -Math.cos(P.yaw) * cp;
  let best = null, bs = 1, ba = 0, bl = 1, bx = 0, by = 0, bz = 0;
  for (const e of enemies) {
    if (e.dead || e.born < 0.3) continue;
    const dx = (e.hr > 0 ? e.hx : e.pos.x) - P.eye.x, dy = (e.hr > 0 ? e.hy : e.pos.y + (e.d.fly ? 0 : e.h * 0.5)) - P.eye.y, dz = (e.hr > 0 ? e.hz : e.pos.z) - P.eye.z, l = Math.hypot(dx, dy, dz);
    if (l > 75 || l < 0.6) continue;
    const a = Math.acos(clamp((dx * fx0 + dy * fy0 + dz * fz0) / l, -1, 1));
    const cone = l < 7 ? 0.2 + (7 - l) * 0.09 : 0.2;        // wider up close, where machines cross the view fast
    if (a / cone < bs) { bs = a / cone; ba = a; bl = l; best = e; bx = dx; by = dy; bz = dz; }
  }
  if (!best || !losClear(P.eye, tmpB.set(P.eye.x + bx, P.eye.y + by, P.eye.z + bz))) return;
  const k = Math.min(1, (bl < 7 ? 7 : 3.4) * dt) * (touch.looks.size ? 0.45 : 1);
  P.yaw = angLerp(P.yaw, Math.atan2(-bx, -bz), k); P.pitch += (Math.atan2(by, Math.hypot(bx, bz)) - P.pitch) * k;
  if (touch.auto && cur < 2 && ba < Math.max(0.03, best.r * 0.75 / Math.hypot(bx, by, bz))) touch.autoFire = true;
}
