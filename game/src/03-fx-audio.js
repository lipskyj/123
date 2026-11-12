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
  _c.set(color); pBase[i * 4] = _c.r; pBase[i * 4 + 1] = _c.g; pBase[i * 4 + 2] = _c.b; pBase[i * 4 + 3] = size;
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
const fx = { tracers: [], shells: [], rings: [], lights: [], debris: [], delayed: [] };
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
  const dm = new T.MeshStandardMaterial({ color: 0x3a3f4d, roughness: .5, metalness: .5 });
  for (let i = 0; i < 70; i++) { const m = new T.Mesh(GEO.box, dm); m.visible = false; m.castShadow = true; scene.add(m); fx.debris.push({ m, t: 0, v: V(), w: V() }); }
}
const freeOf = arr => { let b = arr[0]; for (const o of arr) { if (o.t <= 0) return o; if (o.t < b.t) b = o; } return b; };
function tracer(a, b, color, width = 0.04, dur = 0.09) {
  const o = freeOf(fx.tracers), len = a.distanceTo(b); if (len < 0.01) return;
  o.m.position.copy(a).add(b).multiplyScalar(0.5); o.m.lookAt(b); o.m.scale.set(width, width, len);
  o.m.material.color.set(color); o.m.material.opacity = 1; o.m.visible = true; o.t = o.d = dur; o.w = width;
}
function shell(p, r, color, dur = 0.35) { const o = freeOf(fx.shells); o.m.position.copy(p); o.m.material.color.set(color); o.r = r; o.t = o.d = dur; o.m.visible = true; o.m.scale.setScalar(0.1); }
function ring(p, r0, r1, color, dur = 0.5, hold = false) {
  const o = freeOf(fx.rings); o.m.position.set(p.x, p.y + 0.08, p.z); o.m.material.color.set(color); o.r0 = r0; o.r1 = r1; o.t = o.d = dur; o.hold = hold; o.m.visible = true; o.m.scale.setScalar(r0 || 0.01); return o;
}
function flash(p, color, intensity, dur = 0.18) { const o = freeOf(fx.lights); o.l.position.copy(p); o.l.color.set(color); o.i = intensity; o.t = o.d = dur; }
function debris(p, n, size) {
  for (let i = 0; i < n; i++) {
    const o = freeOf(fx.debris); o.m.position.copy(p); o.m.scale.set(size * rand(.3, 1), size * rand(.3, 1), size * rand(.3, 1));
    o.v.set(rand(-7, 7), rand(3, 11), rand(-7, 7)); o.w.set(rand(-9, 9), rand(-9, 9), rand(-9, 9)); o.t = rand(1.2, 2.2); o.m.visible = true;
  }
}
function later(t, fn) { fx.delayed.push({ t, fn }); }
function updateFx(dt) {
  for (const o of fx.tracers) if (o.t > 0) { o.t -= dt; const f = Math.max(0, o.t / o.d); o.m.material.opacity = f; o.m.scale.x = o.m.scale.y = o.w * (0.3 + 0.7 * f); if (o.t <= 0) o.m.visible = false; }
  for (const o of fx.shells) if (o.t > 0) { o.t -= dt; const f = 1 - Math.max(0, o.t / o.d); o.m.scale.setScalar(o.r * (0.15 + 0.85 * Math.sqrt(f))); o.m.material.opacity = (1 - f) * 0.9; if (o.t <= 0) o.m.visible = false; }
  for (const o of fx.rings) if (o.t > 0) { o.t -= dt; const f = 1 - Math.max(0, o.t / o.d); o.m.scale.setScalar(o.r0 + (o.r1 - o.r0) * (o.hold ? 1 : Math.sqrt(f))); o.m.material.opacity = o.hold ? 0.35 + 0.65 * f : 1 - f; if (o.t <= 0) o.m.visible = false; }
  for (const o of fx.lights) { if (o.t > 0) { o.t -= dt; o.l.intensity = o.i * Math.max(0, o.t / o.d); } else o.l.intensity = 0; }
  for (const o of fx.debris) if (o.t > 0) {
    o.t -= dt; o.v.y -= 24 * dt; o.m.position.addScaledVector(o.v, dt);
    o.m.rotation.x += o.w.x * dt; o.m.rotation.y += o.w.y * dt; o.m.rotation.z += o.w.z * dt;
    if (o.m.position.y < 0.08) { o.m.position.y = 0.08; o.v.y *= -0.35; o.v.x *= 0.6; o.v.z *= 0.6; o.w.multiplyScalar(0.6); }
    if (o.t < 0.3) o.m.scale.multiplyScalar(Math.max(0, 1 - 6 * dt));
    if (o.t <= 0) o.m.visible = false;
  }
  for (let i = fx.delayed.length - 1; i >= 0; i--) { const d = fx.delayed[i]; d.t -= dt; if (d.t <= 0) { fx.delayed.splice(i, 1); d.fn(); } }
}

// ---------------------------------------------------------------- audio (all synthesised)
let AC = null, master, sfxBus, musicBus, noiseBuf, muted = false;
function initAudio() {
  if (AC) { if (AC.state === 'suspended') AC.resume(); return; }
  try { AC = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { AC = null; return; }
  const comp = AC.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 6;
  master = AC.createGain(); master.gain.value = 0.85; master.connect(comp); comp.connect(AC.destination);
  sfxBus = AC.createGain(); sfxBus.gain.value = 0.9; sfxBus.connect(master);
  musicBus = AC.createGain(); musicBus.gain.value = 0.42; musicBus.connect(master);
  noiseBuf = AC.createBuffer(1, AC.sampleRate, AC.sampleRate);
  const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  music.next = AC.currentTime + 0.1;
}
function tone(type, f, f2, dur, vol, t0 = 0, bus) {
  if (!AC) return; const t = AC.currentTime + t0, o = AC.createOscillator(), g = AC.createGain();
  o.type = type; o.frequency.setValueAtTime(f, t); if (f2) o.frequency.exponentialRampToValueAtTime(Math.max(1, f2), t + dur);
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.004); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(bus || sfxBus); o.start(t); o.stop(t + dur + 0.02);
}
function noise(dur, vol, ftype, f, f2, q = 1, t0 = 0, bus) {
  if (!AC) return; const t = AC.currentTime + t0, s = AC.createBufferSource(), fl = AC.createBiquadFilter(), g = AC.createGain();
  s.buffer = noiseBuf; s.loop = true; fl.type = ftype; fl.Q.value = q; fl.frequency.setValueAtTime(f, t); if (f2) fl.frequency.exponentialRampToValueAtTime(Math.max(20, f2), t + dur);
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  s.connect(fl); fl.connect(g); g.connect(bus || sfxBus); s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.02);
}
const distVol = p => { const d = p ? p.distanceTo(P.pos) : 0; return clamp(1.15 - d / 55, 0.08, 1); };
const sfx = {
  shoot(i) {
    if (i === 0) { tone('sawtooth', 880, 180, 0.09, 0.16); noise(0.07, 0.22, 'highpass', 2500); }
    else if (i === 1) { noise(0.28, 0.75, 'lowpass', 3200, 300); tone('square', 150, 40, 0.2, 0.3); }
    else if (i === 2) { tone('sine', 300, 70, 0.3, 0.45); tone('sawtooth', 620, 1500, 0.18, 0.1); noise(0.2, 0.25, 'bandpass', 900, 200, 2); }
    else { tone('sawtooth', 2400, 90, 0.5, 0.32); tone('square', 60, 30, 0.45, 0.45); noise(0.4, 0.5, 'highpass', 4000, 600); }
  },
  hit() { tone('square', 1500, 900, 0.035, 0.07); },
  crit() { tone('square', 2300, 1500, 0.06, 0.11); tone('sine', 3100, 2200, 0.08, 0.07); },
  kill() { tone('triangle', 520, 1040, 0.12, 0.16); noise(0.16, 0.2, 'bandpass', 1800, 500, 1.5); },
  explode(p, big) { const v = distVol(p) * (big ? 1 : 0.7); noise(big ? 0.9 : 0.55, 0.9 * v, 'lowpass', big ? 1300 : 1800, 70); tone('sine', 120, 28, big ? 0.7 : 0.4, 0.75 * v); },
  pickup(a) { tone('triangle', a ? 660 : 880, 0, 0.09, 0.2); tone('triangle', a ? 990 : 1320, 0, 0.14, 0.2, 0.08); },
  jump() { noise(0.12, 0.12, 'bandpass', 500, 1300, 1); },
  dash() { noise(0.3, 0.38, 'bandpass', 2600, 300, 0.8); tone('sawtooth', 240, 70, 0.22, 0.1); },
  pad() { tone('sine', 220, 900, 0.35, 0.3); noise(0.3, 0.2, 'highpass', 1500, 5000); },
  hurt() { tone('sawtooth', 190, 55, 0.22, 0.38); noise(0.14, 0.32, 'lowpass', 900, 200); },
  shield() { tone('sine', 1300, 500, 0.14, 0.22); },
  reload() { tone('square', 320, 0, 0.03, 0.1); tone('square', 480, 0, 0.04, 0.12, 0.16); },
  empty() { tone('square', 200, 0, 0.03, 0.09); },
  swap() { tone('triangle', 700, 420, 0.06, 0.1); },
  wave() { tone('sawtooth', 110, 0, 0.7, 0.24); tone('sawtooth', 165, 0, 0.7, 0.2, 0.18); tone('sawtooth', 220, 0, 0.9, 0.2, 0.36); },
  clear() { [523, 659, 784, 1046].forEach((f, i) => tone('triangle', f, 0, 0.3, 0.2, i * 0.09)); },
  perk() { tone('triangle', 660, 1320, 0.25, 0.22); tone('sine', 1980, 0, 0.3, 0.1, 0.1); },
  bolt(p) { tone('square', 640, 190, 0.14, 0.12 * distVol(p)); },
  mortar(p) { tone('sine', 160, 60, 0.3, 0.4 * distVol(p)); noise(0.2, 0.25 * distVol(p), 'lowpass', 700, 150); },
  beep(p) { tone('square', 1800, 0, 0.05, 0.14 * distVol(p)); },
  spawn(p) { tone('sine', 90, 360, 0.3, 0.14 * distVol(p)); },
  od() { tone('sawtooth', 110, 880, 0.6, 0.3); noise(0.6, 0.3, 'highpass', 600, 7000); },
  boss() { tone('sawtooth', 55, 40, 2.2, 0.5); tone('sawtooth', 58, 43, 2.2, 0.4); noise(2, 0.28, 'lowpass', 300, 80); },
  laser() { tone('sawtooth', 95, 105, 2.6, 0.3); tone('square', 1900, 2100, 2.6, 0.045); },
  die() { tone('sawtooth', 330, 30, 1.6, 0.5); noise(1.4, 0.5, 'lowpass', 2000, 60); }
};
// step-sequenced score: intensity 0 menu, 1 combat, 2 boss
const music = { step: 0, next: 0, intensity: 0 };
const ROOTS = [55, 55, 43.65, 49];
const BASS = [1, 0, 1, 1, 0, 1, 0, 1, 1, 0, 1, 1, 0, 1, 1, 0];
const ARP = [2, 2.378, 3, 3.564, 4, 3.564, 3, 2.378];
function musicTick() {
  if (!AC || AC.state !== 'running') return;
  if (music.next < AC.currentTime) music.next = AC.currentTime + 0.05;
  while (music.next < AC.currentTime + 0.14) {
    const t0 = music.next - AC.currentTime, s = music.step, i = s % 16, root = ROOTS[(s >> 4) & 3], it = music.intensity;
    if (i === 0) for (const m of [2, 2.378, 2.997]) tone('triangle', root * m, 0, 1.85, 0.07, t0, musicBus);
    if (it === 0) { if (i % 4 === 2) tone('sine', root * ARP[(s >> 2) % 8] * 2, 0, 0.5, 0.05, t0, musicBus); }
    else {
      if (i % 4 === 0) { tone('sine', 150, 38, 0.2, 0.75, t0, musicBus); }
      if (i % 8 === 4) noise(0.14, 0.28, 'bandpass', 1900, 900, 0.8, t0, musicBus);
      if (i % 2 === 1 || it > 1) noise(0.035, 0.09, 'highpass', 7500, 0, 1, t0, musicBus);
      if (BASS[i]) tone('sawtooth', root * (i % 8 === 6 ? 2 : 1), 0, 0.13, 0.26, t0, musicBus);
      if (it > 1 || G.wave >= 3) tone('square', root * ARP[s % 8] * (it > 1 ? 4 : 2), 0, 0.09, it > 1 ? 0.05 : 0.03, t0, musicBus);
    }
    music.next += 60 / (it > 1 ? 138 : 124) / 4; music.step = (s + 1) % 64;
  }
}
