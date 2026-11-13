// ---------------------------------------------------------------- particles
const PN = 3500;
const pPos = new Float32Array(PN * 3), pCol = new Float32Array(PN * 3), pSize = new Float32Array(PN);
const pVel = new Float32Array(PN * 3), pLife = new Float32Array(PN), pMax = new Float32Array(PN), pGrav = new Float32Array(PN), pBase = new Float32Array(PN * 4);
let pNext = 0, particles;
function buildParticles() {
  const g = new T.BufferGeometry();
  g.setAttribute('position', new T.BufferAttribute(pPos, 3));
  g.setAttribute('color', new T.BufferAttribute(pCol, 3));
  g.setAttribute('size', new T.BufferAttribute(pSize, 1));
  g.boundingSphere = new T.Sphere(V(), 2000);
  particles = new T.Points(g, new T.ShaderMaterial({
    transparent: true, depthWrite: false, blending: T.AdditiveBlending, uniforms: { uScale: { value: 600 } },
    vertexShader: 'attribute float size; attribute vec3 color; varying vec3 vC; uniform float uScale; void main(){ vC=color; vec4 mv=modelViewMatrix*vec4(position,1.0); gl_PointSize=min(size*uScale/max(0.1,-mv.z), uScale*0.11); gl_Position=projectionMatrix*mv; }',
    fragmentShader: 'varying vec3 vC; void main(){ vec2 c=gl_PointCoord-0.5; float a=smoothstep(0.5,0.0,length(c)); gl_FragColor=vec4(vC*a*a,1.0); }'
  }));
  particles.frustumCulled = false; scene.add(particles);
}
const _c = new T.Color();
function emit(x, y, z, vx, vy, vz, color, size, life, grav = 0) {
  const i = pNext; pNext = (pNext + 1) % PN; const j = i * 3;
  pPos[j] = x; pPos[j + 1] = y; pPos[j + 2] = z; pVel[j] = vx; pVel[j + 1] = vy; pVel[j + 2] = vz;
  _c.set(color).convertSRGBToLinear().multiplyScalar(HDR ? 2.4 : 1); pBase[i * 4] = _c.r; pBase[i * 4 + 1] = _c.g; pBase[i * 4 + 2] = _c.b; pBase[i * 4 + 3] = size;
  pLife[i] = pMax[i] = life; pGrav[i] = grav;
}
function burst(p, n, color, speed, size, life, grav = 0, up = 0) {
  const px = p.x, py = p.y, pz = p.z;
  for (let i = 0; i < n; i++) {
    tmpA.set(rand(-1, 1), rand(-1, 1), rand(-1, 1)).normalize().multiplyScalar(speed * rand(0.25, 1));
    emit(px, py, pz, tmpA.x, tmpA.y + up, tmpA.z, color, size * rand(0.5, 1.2), life * rand(0.5, 1), grav);
  }
}
function updateParticles(dt) {
  for (let i = 0; i < PN; i++) {
    if (pLife[i] <= 0) continue;
    const j = i * 3; pLife[i] -= dt;
    if (pLife[i] <= 0) { pSize[i] = 0; continue; }
    pVel[j + 1] -= pGrav[i] * dt; const dr = 1 - 1.6 * dt;
    pVel[j] *= dr; pVel[j + 1] *= dr; pVel[j + 2] *= dr;
    pPos[j] += pVel[j] * dt; pPos[j + 1] += pVel[j + 1] * dt; pPos[j + 2] += pVel[j + 2] * dt;
    if (pPos[j + 1] < 0.03 && pGrav[i] > 0) { pPos[j + 1] = 0.03; pVel[j + 1] *= -0.4; }
    const f = pLife[i] / pMax[i];
    pCol[j] = pBase[i * 4] * f; pCol[j + 1] = pBase[i * 4 + 1] * f; pCol[j + 2] = pBase[i * 4 + 2] * f;
    pSize[i] = pBase[i * 4 + 3] * (0.4 + 0.6 * f);
  }
  const a = particles.geometry.attributes; a.position.needsUpdate = a.color.needsUpdate = a.size.needsUpdate = true;
}

// ---------------------------------------------------------------- pooled effects
const fx = { tracers: [], shells: [], rings: [], lights: [], debris: [], delayed: [], decals: [], casings: [] };
function buildFx() {
  for (let i = 0; i < 70; i++) {
    const m = new T.Mesh(GEO.box, new T.MeshBasicMaterial({ color: 0xffffff, transparent: true, blending: T.AdditiveBlending, depthWrite: false }));
    m.visible = false; m.frustumCulled = false; scene.add(m); fx.tracers.push({ m, t: 0, d: 1 });
  }
  for (let i = 0; i < 14; i++) {
    const m = new T.Mesh(GEO.sphere, new T.MeshBasicMaterial({ color: 0xffffff, transparent: true, blending: T.AdditiveBlending, depthWrite: false }));
    m.visible = false; scene.add(m); fx.shells.push({ m, t: 0, d: 1, r: 1 });
  }
  for (let i = 0; i < 18; i++) {
    const m = new T.Mesh(GEO.ring, new T.MeshBasicMaterial({ color: 0xffffff, transparent: true, blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide }));
    m.rotation.x = -Math.PI / 2; m.visible = false; scene.add(m); fx.rings.push({ m, t: 0, d: 1, r0: 0, r1: 1 });
  }
  for (let i = 0; i < 5; i++) { const l = new T.PointLight(0xffffff, 0, 22, 2); scene.add(l); fx.lights.push({ l, t: 0, d: 1, i: 0 }); }
  const dm = new T.MeshStandardMaterial({ ...PBR.metal, color: lin(0x6a7080) });
  const scorch = canvasTex(64, (g, s) => {
    const R = mulberry(91), gr = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
    gr.addColorStop(0, 'rgba(0,0,0,.95)'); gr.addColorStop(0.35, 'rgba(8,6,5,.8)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, s, s);
    for (let i = 0; i < 26; i++) { const a = R() * 6.28, r = 8 + R() * 20; g.fillStyle = `rgba(0,0,0,${0.25 + R() * 0.4})`; g.beginPath(); g.arc(s / 2 + Math.cos(a) * r, s / 2 + Math.sin(a) * r, 1 + R() * 3.5, 0, 7); g.fill(); }
  }, 1, 1, false);
  for (let i = 0; i < 90; i++) {
    const m = new T.Mesh(new T.PlaneGeometry(1, 1), new T.MeshBasicMaterial({ map: scorch, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 }));
    m.visible = false; m.renderOrder = 2; scene.add(m); fx.decals.push({ m, t: 0 });
  }
  const brass = new T.MeshStandardMaterial({ color: lin(0xd9a441), metalness: 1, roughness: 0.28 });
  for (let i = 0; i < 24; i++) { const m = new T.Mesh(GEO.cyl, brass); m.visible = false; m.castShadow = true; scene.add(m); fx.casings.push({ m, t: 0, v: V(), w: V(), keep: true }); }
  for (let i = 0; i < 70; i++) { const m = new T.Mesh(GEO.box, dm); m.visible = false; m.castShadow = true; scene.add(m); fx.debris.push({ m, t: 0, v: V(), w: V() }); }
}
const freeOf = arr => { let b = arr[0]; for (const o of arr) { if (o.t <= 0) return o; if (o.t < b.t) b = o; } return b; };
function tracer(a, b, color, width = 0.04, dur = 0.09) {
  const o = freeOf(fx.tracers), len = a.distanceTo(b); if (len < 0.01) return;
  o.m.position.copy(a).add(b).multiplyScalar(0.5); o.m.lookAt(b); o.m.scale.set(width, width, len);
  o.m.material.color.copy(lin(color, GLOW)); o.m.material.opacity = 1; o.m.visible = true; o.t = o.d = dur; o.w = width;
}
function shell(p, r, color, dur = 0.35) { const o = freeOf(fx.shells); o.m.position.copy(p); o.m.material.color.copy(lin(color, GLOW * 0.8)); o.r = r; o.t = o.d = dur; o.m.visible = true; o.m.scale.setScalar(0.1); }
function ring(p, r0, r1, color, dur = 0.5, hold = false) {
  const o = freeOf(fx.rings); o.m.position.set(p.x, p.y + 0.08, p.z); o.m.material.color.copy(lin(color, GLOW)); o.r0 = r0; o.r1 = r1; o.t = o.d = dur; o.hold = hold; o.m.visible = true; o.m.scale.setScalar(r0 || 0.01); return o;
}
function flash(p, color, intensity, dur = 0.18) { const o = freeOf(fx.lights); o.l.position.copy(p); o.l.color.set(color); o.i = intensity; o.t = o.d = dur; }
function debris(p, n, size) {
  for (let i = 0; i < n; i++) {
    const o = freeOf(fx.debris); o.m.position.copy(p); o.m.scale.set(size * rand(.3, 1), size * rand(.3, 1), size * rand(.3, 1));
    o.v.set(rand(-7, 7), rand(3, 11), rand(-7, 7)); o.w.set(rand(-9, 9), rand(-9, 9), rand(-9, 9)); o.t = rand(1.2, 2.2); o.m.visible = true;
  }
}
function decal(p, n, size) {
  if (n.lengthSq() < 0.5) return;
  const o = freeOf(fx.decals); o.m.position.copy(p).addScaledVector(n, 0.015);
  if (Math.abs(n.y) > 0.9) o.m.rotation.set(-Math.PI / 2 * Math.sign(n.y), 0, rand(6.28)); else { o.m.rotation.set(0, 0, 0); o.m.lookAt(tmpC.copy(o.m.position).add(n)); o.m.rotateZ(rand(6.28)); }
  o.m.scale.setScalar(size); o.m.material.opacity = 0.9; o.m.visible = true; o.t = 22;
}
function casing(p, v, big) {
  const o = freeOf(fx.casings); o.m.position.copy(p); o.m.scale.set(big ? 0.011 : 0.006, big ? 0.055 : 0.03, big ? 0.011 : 0.006);
  o.v.copy(v); o.w.set(rand(-20, 20), rand(-20, 20), rand(-20, 20)); o.t = 5; o.m.visible = true; o.hit = false;
}
function later(t, fn) { fx.delayed.push({ t, fn }); }
function updateFx(dt) {
  for (const o of fx.tracers) if (o.t > 0) { o.t -= dt; const f = Math.max(0, o.t / o.d); o.m.material.opacity = f; o.m.scale.x = o.m.scale.y = o.w * (0.3 + 0.7 * f); if (o.t <= 0) o.m.visible = false; }
  for (const o of fx.shells) if (o.t > 0) { o.t -= dt; const f = 1 - Math.max(0, o.t / o.d); o.m.scale.setScalar(o.r * (0.15 + 0.85 * Math.sqrt(f))); o.m.material.opacity = (1 - f) * 0.9; if (o.t <= 0) o.m.visible = false; }
  for (const o of fx.rings) if (o.t > 0) { o.t -= dt; const f = 1 - Math.max(0, o.t / o.d); o.m.scale.setScalar(o.r0 + (o.r1 - o.r0) * (o.hold ? 1 : Math.sqrt(f))); o.m.material.opacity = o.hold ? 0.35 + 0.65 * f : 1 - f; if (o.t <= 0) o.m.visible = false; }
  for (const o of fx.lights) { if (o.t > 0) { o.t -= dt; o.l.intensity = o.i * Math.max(0, o.t / o.d); } else o.l.intensity = 0; }
  for (const arr of [fx.debris, fx.casings]) for (const o of arr) if (o.t > 0) {
    o.t -= dt; o.v.y -= 24 * dt; o.m.position.addScaledVector(o.v, dt);
    o.m.rotation.x += o.w.x * dt; o.m.rotation.y += o.w.y * dt; o.m.rotation.z += o.w.z * dt;
    const gy = o.keep ? groundAt(o.m.position.x, o.m.position.z, o.m.position.y + 0.3) + 0.02 : 0.08;
    if (o.m.position.y < gy) {
      o.m.position.y = gy; if (o.keep && !o.hit && o.v.y < -2) { o.hit = true; sfx.casing(); }
      o.v.y *= -0.35; o.v.x *= 0.6; o.v.z *= 0.6; o.w.multiplyScalar(0.55);
    }
    if (o.t < 0.3) o.m.scale.multiplyScalar(Math.max(0, 1 - 6 * dt));
    if (o.t <= 0) o.m.visible = false;
  }
  for (const o of fx.decals) if (o.t > 0) { o.t -= dt; if (o.t < 3) o.m.material.opacity = 0.9 * Math.max(0, o.t / 3); if (o.t <= 0) o.m.visible = false; }
  for (let i = fx.delayed.length - 1; i >= 0; i--) { const d = fx.delayed[i]; d.t -= dt; if (d.t <= 0) { fx.delayed.splice(i, 1); d.fn(); } }
}

// ---------------------------------------------------------------- audio (recorded samples; see game/audio/CREDITS.md)
let AC = null, master, sfxBus, musicBus, musicFilter, musicSrc = null, noiseBuf, muted = false;
const bufs = {};
function b64buf(b) { const bin = atob(b), u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return u.buffer; }
function initAudio() {
  if (AC) { if (AC.state === 'suspended') AC.resume(); return; }
  try { AC = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { AC = null; return; }
  const comp = AC.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 6;
  master = AC.createGain(); master.gain.value = muted ? 0 : 0.9; master.connect(comp); comp.connect(AC.destination);
  sfxBus = AC.createGain(); sfxBus.gain.value = 0.95; sfxBus.connect(master);
  musicFilter = AC.createBiquadFilter(); musicFilter.type = 'lowpass'; musicFilter.frequency.value = 700; musicFilter.connect(master);
  musicBus = AC.createGain(); musicBus.gain.value = 0.3; musicBus.connect(musicFilter);
  noiseBuf = AC.createBuffer(1, AC.sampleRate, AC.sampleRate);
  const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  if (typeof SND !== 'undefined') for (const k in SND) {
    try { AC.decodeAudioData(b64buf(SND[k]), b => { bufs[k] = b; if (k === 'music') startMusic(); }, () => {}); } catch (e) {}
  }
}
function startMusic() {
  if (musicSrc || !bufs.music) return;
  musicSrc = AC.createBufferSource(); musicSrc.buffer = bufs.music; musicSrc.loop = true; musicSrc.connect(musicBus); musicSrc.start();
}
// play a sample: volume, playback rate (pitch), delay in seconds
function S(name, vol = 1, rate = 1, t0 = 0) {
  const b = bufs[name]; if (!AC || !b || vol <= 0.004) return;
  const t = AC.currentTime + t0, s = AC.createBufferSource(), g = AC.createGain();
  s.buffer = b; s.playbackRate.value = rate; g.gain.value = vol; s.connect(g); g.connect(sfxBus); s.start(t);
}
function noise(dur, vol, ftype, f, f2, q = 1, t0 = 0) {
  if (!AC) return; const t = AC.currentTime + t0, s = AC.createBufferSource(), fl = AC.createBiquadFilter(), g = AC.createGain();
  s.buffer = noiseBuf; s.loop = true; fl.type = ftype; fl.Q.value = q; fl.frequency.setValueAtTime(f, t); if (f2) fl.frequency.exponentialRampToValueAtTime(Math.max(20, f2), t + dur);
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  s.connect(fl); fl.connect(g); g.connect(sfxBus); s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.02);
}
const distVol = p => { const d = p ? p.distanceTo(P.pos) : 0; return clamp(1.15 - d / 55, 0.08, 1); };
const sfx = {
  shoot(i) {
    if (i === 0) { S('shoot', 0.75, rand(0.94, 1.08)); noise(0.05, 0.1, 'highpass', 3000); }
    else if (i === 1) { S('shoot', 1.1, rand(0.56, 0.62)); S('impact', 0.7, rand(0.8, 0.9)); noise(0.22, 0.4, 'lowpass', 2600, 300); }
    else if (i === 2) { S('shoot', 1.0, 0.42); S('dash', 0.5, 0.8); noise(0.25, 0.2, 'bandpass', 700, 200, 1.5); }
    else { S('shoot', 1.0, 1.5); S('big_kill', 0.6, 1.7); S('impact', 0.8, 0.6); noise(0.35, 0.3, 'highpass', 5000, 800); }
  },
  hit() { S('hit', 0.3, rand(1.1, 1.3)); },
  crit() { S('hit', 0.45, rand(1.6, 1.8)); S('gem', 0.16, 1.5); },
  kill() { S('kill', 0.8, rand(0.9, 1.1)); S('impact', 0.35, rand(1.1, 1.3)); },
  explode(p, big) { const v = distVol(p); S('big_kill', (big ? 1.2 : 0.9) * v, big ? rand(0.75, 0.85) : rand(1.05, 1.25)); S('impact', 0.7 * v, 0.55); noise(big ? 0.8 : 0.5, 0.45 * v, 'lowpass', big ? 900 : 1300, 60); },
  pickup(a) { a ? S('confirm', 0.4, 1.25) : S('gem', 0.5, 1); },
  step() { S('step', rand(0.3, 0.42), rand(0.9, 1.12)); },
  jump() { S('step', 0.5, 1.35); },
  land() { S('land', 0.7, rand(0.95, 1.1)); },
  dash() { S('dash', 0.8, rand(0.95, 1.05)); },
  pad() { S('dash', 0.8, 1.5); S('revive', 0.18, 0.8); },
  hurt() { S('hurt', 0.9, rand(0.92, 1.08)); },
  absorb() { S('hit', 0.4, 0.8); },
  shield() { S('gem', 0.5, 0.5); S('impact', 0.4, 1.4); },
  reload() { S('ui', 0.7, 0.6); S('ui', 0.8, 0.8, 0.18); S('step', 0.3, 1.6, 0.3); },
  empty() { S('ui', 0.5, 1.5); },
  swap() { S('ui', 0.6, 1); S('step', 0.25, 1.5); },
  casing() { S('ui', 0.07, rand(2.2, 2.8)); },
  wave() { S('boss', 0.35, 1.3); },
  clear() { S('level_up', 0.6, 1); },
  perk() { S('confirm', 0.6, 1); S('revive', 0.25, 1, 0.08); },
  multi() { S('coin', 0.35, 1); },
  bolt(p) { S('shoot', 0.4 * distVol(p), rand(0.68, 0.76)); },
  mortar(p) { S('impact', 0.8 * distVol(p), 0.5); S('dash', 0.4 * distVol(p), 0.6); },
  windup(p) { S('dash', 0.6 * distVol(p), 0.45); },
  slam(p) { S('land', 1.2 * distVol(p), 0.6); S('big_kill', 0.5 * distVol(p), 1.3); },
  beep(p) { S('ui', 0.5 * distVol(p), 2); },
  spawn(p) { S('dash', 0.3 * distVol(p), 0.5); },
  od() { S('revive', 0.5, 0.7); S('dash', 0.7, 0.6); },
  boss() { S('boss', 1.0, 0.8); S('big_kill', 0.5, 0.6); },
  charge() { S('revive', 0.3, 0.5); },
  laser() { noise(2.6, 0.22, 'bandpass', 240, 260, 6); noise(2.6, 0.1, 'bandpass', 2400, 2600, 9); S('boss', 0.4, 0.5); },
  die() { S('downed', 0.9, 1); S('big_kill', 0.8, 0.7); }
};
// the battle theme plays muffled in menus and opens up in combat; the boss pushes it faster and louder
const music = { intensity: 0, cur: -1 };
function musicTick() {
  if (!AC || AC.state !== 'running' || !musicSrc) return;
  const it = G.state === 'paused' || G.state === 'perk' ? 0 : music.intensity; if (it === music.cur) return; music.cur = it;
  const t = AC.currentTime;
  musicFilter.frequency.setTargetAtTime(it === 0 ? 700 : 16000, t, 0.4);
  musicBus.gain.setTargetAtTime(it === 0 ? 0.3 : it === 1 ? 0.42 : 0.55, t, 0.4);
  musicSrc.playbackRate.setTargetAtTime(it === 2 ? 1.07 : 1, t, 0.6);
}
