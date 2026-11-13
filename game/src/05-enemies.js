// ---------------------------------------------------------------- enemies
const enemies = [], projs = [], pickups = [];
const ET = {
  skitter: { hp: 42, r: 0.75, h: 1.1, speed: 7.4, score: 100, parts: [[0.55, 0.78]], color: 0xff3d6e, od: 5, deb: 5, size: 0.3 },
  bomber: { hp: 30, r: 0.65, h: 1.3, speed: 8.6, score: 150, parts: [[0.65, 0.72]], color: 0xffb347, od: 5, deb: 4, size: 0.3 },
  wasp: { hp: 34, r: 0.6, h: 1, speed: 10, score: 175, parts: [[0, 0.78]], color: 0x4de1ff, fly: true, od: 6, deb: 5, size: 0.28 },
  bulwark: { hp: 340, r: 1.35, h: 3.4, speed: 3.1, score: 600, parts: [[2.1, 1.35], [0.8, 1.0]], color: 0xffb347, od: 14, deb: 14, size: 0.6 },
  boss: { hp: 2400, r: 3.2, h: 6, speed: 0, score: 5000, parts: [[0, 3.2]], color: 0xff3d6e, fly: true, od: 40, deb: 30, size: 0.9 }
};
const angLerp = (a, b, k) => { let d = (b - a + Math.PI) % (Math.PI * 2); if (d < 0) d += Math.PI * 2; return a + (d - Math.PI) * Math.min(1, k); };
function bm(e, color, em = 0) { const m = new T.MeshStandardMaterial({ ...PBR.metal, color: lin(color, 2.6), emissive: em, envMapIntensity: 0.8 }); m.userData.e = new T.Color(em); e.mats.push(m); return m; }
function mp(parent, geo, mat, x, y, z, sx, sy, sz) { const m = new T.Mesh(geo, mat); m.position.set(x, y, z); m.scale.set(sx, sy === undefined ? sx : sy, sz === undefined ? sx : sz); m.castShadow = true; parent.add(m); return m; }

const BUILD = {
  skitter(e) {
    const b = bm(e, 0x343a4a), g = e.mesh;
    mp(g, GEO.sphere, b, 0, .55, 0, .6, .36, .8); mp(g, GEO.sphere, b, 0, .62, .62, .3, .26, .3);
    mp(g, GEO.sphere, glowMat(0xff3d6e), 0, .66, .86, .11); mp(g, GEO.box, glowMat(0xff3d6e), 0, .88, -.1, .08, .04, .7);
    e.legs = [];
    for (const side of [-1, 1]) for (const k of [-1, 0, 1]) {
      const pv = new T.Group(); pv.position.set(side * .4, .55, k * .38); g.add(pv);
      const leg = mp(pv, GEO.box, b, side * .42, -.25, 0, .95, .07, .07); leg.rotation.z = -side * 0.6;
      pv.userData.ph = k * 2 + side; e.legs.push(pv);
    }
  },
  wasp(e) {
    const b = bm(e, 0x475072), g = e.mesh;
    mp(g, GEO.octa, b, 0, 0, 0, .5, .34, .75); e.eye = mp(g, GEO.sphere, glowMat(0x4de1ff), 0, 0, .6, .14);
    mp(g, GEO.box, b, 0, .1, 0, 1.3, .05, .1); e.rot = [];
    for (const side of [-1, 1]) { const r = mp(g, GEO.torus, b, side * .75, .1, 0, .36); r.rotation.x = Math.PI / 2; e.rot.push(mp(g, GEO.box, glowMat(0x4de1ff), side * .75, .1, 0, .66, .02, .05)); }
    e.R = rand(9, 15); e.H = rand(3.2, 6.5); e.orb = rand(6.28); e.orbDir = Math.random() < .5 ? -1 : 1;
  },
  bomber(e) {
    const b = bm(e, 0x3a3340), g = e.mesh;
    e.ball = new T.Group(); e.ball.position.y = .65; g.add(e.ball);
    mp(e.ball, GEO.sphere, b, 0, 0, 0, .62); mp(e.ball, GEO.torus, glowMat(0xffb347), 0, 0, 0, .64);
    mp(e.ball, GEO.torus, glowMat(0xffb347), 0, 0, 0, .64).rotation.y = Math.PI / 2;
    e.eye = mp(g, GEO.sphere, glowMat(0xff3d6e), 0, 1.36, 0, .12);
  },
  bulwark(e) {
    const b = bm(e, 0x5a6074), d = bm(e, 0x343846), g = e.mesh;
    e.legL = mp(g, GEO.box, d, -.55, .65, 0, .55, 1.3, .7); e.legR = mp(g, GEO.box, d, .55, .65, 0, .55, 1.3, .7);
    const t = e.torso = new T.Group(); t.position.y = 2.05; g.add(t);
    mp(t, GEO.box, b, 0, 0, 0, 2.0, 1.5, 1.25); mp(t, GEO.box, d, 0, -.85, 0, 1.3, .4, .9);
    mp(t, GEO.box, d, 0, 1.05, .1, .62, .5, .62); mp(t, GEO.box, glowMat(0xff3d6e), 0, 1.08, .42, .46, .1, .04);
    for (const s of [-1, 1]) {
      mp(t, GEO.box, b, s * 1.35, -.1, .1, .6, 1.5, .7); mp(t, GEO.cyl, d, s * 1.35, -.6, .7, .2, .8, .2).rotation.x = Math.PI / 2;
      mp(t, GEO.sphere, glowMat(0xffb347), s * 1.35, -.6, 1.12, .14);
    }
    mp(t, GEO.box, glowMat(0xffb347), 0, .2, -.66, .7, .7, .06);
  },
  boss(e) {
    const b = bm(e, 0x352c44), g = e.mesh;
    mp(g, GEO.sphere, b, 0, 0, 0, 3); mp(g, GEO.sphere, glowMat(0xff3d6e), 0, 0, 2.3, 1.25, 1.25, .9); mp(g, GEO.sphere, glowMat(0x1a0008), 0, 0, 3.05, .5, .5, .3);
    e.rings = []; for (let i = 0; i < 3; i++) e.rings.push(mp(g, GEO.torusThin, glowMat(0xb36bff), 0, 0, 0, 4.2 + i * .65));
    for (let i = 0; i < 8; i++) { const a = i / 8 * 6.283, c = mp(g, GEO.cone, b, Math.cos(a) * 3.3, Math.sin(a) * 3.3, -.4, .5, 1.9, .5); c.rotation.z = a - Math.PI / 2; }
    e.beam = new T.Mesh(GEO.cyl, new T.MeshBasicMaterial({ color: lin(0xff3d6e, GLOW * 1.5), transparent: true, blending: T.AdditiveBlending, depthWrite: false }));
    e.beam.visible = false; e.beam.frustumCulled = false; scene.add(e.beam);
    e.atk = 'idle'; e.st = 2.5; e.atkI = 0; e.aim = V(); e.orb = rand(6.28); e.tick = 0;
  }
};

function spawnEnemy(type, x, y, z) {
  const d = ET[type], k = 1 + 0.09 * (G.wave - 1);
  const e = { type, d, pos: V(x, y, z), vel: V(), hp: d.hp * k * (type === 'boss' ? 1 + 0.5 * (G.wave / 5 - 1) : 1), r: d.r, h: d.h, parts: d.parts, sc: 1,
    hx: 0, hy: 0, hz: 0, hr: 0, flash: 0, t: rand(10), born: 0, dead: false, state: 'chase', st: 0, cd: rand(1, 2.5), cd2: rand(2, 4.5), grounded: false, face: 0, mats: [], mesh: new T.Group() };
  e.maxHp = e.hp; e.mesh.rotation.order = 'YXZ'; BUILD[type](e); e.mesh.position.copy(e.pos); e.mesh.scale.setScalar(0.1); scene.add(e.mesh); enemies.push(e);
  burst(e.pos, 14, 0xff3d6e, 5, 0.35, 0.5, 0, 2); sfx.spawn(e.pos);
  return e;
}
function walk(e, dt, speed, stop) {
  if (e.grounded) {
    let tx = 0, tz = 0;
    if (!stop) { const f = flowDir(e.pos.x, e.pos.z, P.pos.x, P.pos.z); tx = f.x * speed; tz = f.z * speed; }
    const k = Math.min(1, 7 * dt); e.vel.x += (tx - e.vel.x) * k; e.vel.z += (tz - e.vel.z) * k;
  }
  e.vel.y -= 26 * dt; e.pos.addScaledVector(e.vel, dt);
  const gy = groundAt(e.pos.x, e.pos.z, e.pos.y);
  if (e.pos.y <= gy) { e.pos.y = gy; e.vel.y = 0; e.grounded = true; } else e.grounded = false;
  pushOut(e.pos, e.r * 0.8, e.h);
  e.pos.x = clamp(e.pos.x, -ARENA + e.r, ARENA - e.r); e.pos.z = clamp(e.pos.z, -ARENA + e.r, ARENA - e.r);
  if (Math.hypot(e.vel.x, e.vel.z) > 0.6) e.face = angLerp(e.face, Math.atan2(e.vel.x, e.vel.z), 10 * dt);
}
const M = { dx: 0, dy: 0, dz: 0, dh: 0, d3: 0 };
const UPD = {
  skitter(e, dt) {
    const sp = e.d.speed * (1 + 0.02 * G.wave);
    if (e.state === 'leap') {
      e.st += dt; walk(e, dt, 0, true);
      if (!e.hitOnce && M.d3 < 1.7) { hurtPlayer(13, e.pos); e.hitOnce = true; }
      if (e.grounded && e.st > 0.1) e.state = 'chase';
    } else if (e.state === 'wind') {
      walk(e, dt, 0, true); e.st -= dt; e.face = angLerp(e.face, Math.atan2(M.dx, M.dz), 14 * dt);
      if (e.st <= 0) { if (M.d3 < 2.7) hurtPlayer(9, e.pos); e.state = 'chase'; e.cd = 0.7; }
    } else {
      walk(e, dt, sp, false); e.cd -= dt; e.cd2 -= dt;
      if (M.d3 < 2.0 && e.cd <= 0) { e.state = 'wind'; e.st = 0.22; }
      else if (e.grounded && e.cd2 <= 0 && M.dh > 5 && M.dh < 14) {
        e.cd2 = rand(3, 6); e.vel.x = M.dx / M.dh * 13; e.vel.z = M.dz / M.dh * 13; e.vel.y = 7.5 + clamp((P.pos.y - e.pos.y) * 1.6, 0, 7);
        e.pos.y += 0.05; e.grounded = false; e.state = 'leap'; e.hitOnce = false; e.st = 0; e.face = Math.atan2(M.dx, M.dz);
      }
    }
    const mv = Math.min(1, Math.hypot(e.vel.x, e.vel.z) / 4);
    for (const l of e.legs) l.rotation.y = Math.sin(e.t * 17 + l.userData.ph) * 0.5 * mv + (e.grounded ? 0 : 0.5);
    e.mesh.rotation.x = e.state === 'wind' ? -0.35 : e.state === 'leap' ? -0.3 : 0;
    const s = Math.sin(e.face), c = Math.cos(e.face); e.hx = e.pos.x + s * 0.68; e.hy = e.pos.y + 0.66; e.hz = e.pos.z + c * 0.68; e.hr = 0.34;
  },
  wasp(e, dt) {
    e.orb += e.orbDir * 0.45 * dt;
    const tx = clamp(P.pos.x + Math.cos(e.orb) * e.R, -ARENA + 3, ARENA - 3), tz = clamp(P.pos.z + Math.sin(e.orb) * e.R, -ARENA + 3, ARENA - 3);
    const ty = Math.max(groundAt(tx, tz, 99) + 2.5, P.pos.y + e.H) + Math.sin(e.t * 2) * 0.6;
    e.vel.x += (tx - e.pos.x) * 2.4 * dt; e.vel.y += (ty - e.pos.y) * 3 * dt; e.vel.z += (tz - e.pos.z) * 2.4 * dt;
    e.vel.multiplyScalar(1 - 1.3 * dt); const sp = e.vel.length(); if (sp > e.d.speed) e.vel.multiplyScalar(e.d.speed / sp);
    e.pos.addScaledVector(e.vel, dt); if (e.pos.y < 1.2) e.pos.y = 1.2;
    for (const b of boxes) {
      const r = e.r + 0.3; if (e.pos.x < b.x0 - r || e.pos.x > b.x1 + r || e.pos.z < b.z0 - r || e.pos.z > b.z1 + r || e.pos.y > b.y1 + r || e.pos.y < b.y0 - r) continue;
      const a = e.pos.x - (b.x0 - r), c = (b.x1 + r) - e.pos.x, f = e.pos.z - (b.z0 - r), g = (b.z1 + r) - e.pos.z, u = (b.y1 + r) - e.pos.y, m = Math.min(a, c, f, g, u);
      if (m === u) { e.pos.y = b.y1 + r; if (e.vel.y < 0) e.vel.y = 0; } else if (m === a) e.pos.x = b.x0 - r; else if (m === c) e.pos.x = b.x1 + r; else if (m === f) e.pos.z = b.z0 - r; else e.pos.z = b.z1 + r;
    }
    e.face = Math.atan2(M.dx, M.dz); e.mesh.rotation.z = clamp(-e.vel.x * 0.03, -.4, .4); e.mesh.rotation.x = clamp(M.dh > 0 ? Math.atan2(-M.dy, M.dh) * 0.6 : 0, -.6, .6);
    for (const r of e.rot) r.rotation.y += 40 * dt;
    e.cd -= dt; e.eye.scale.setScalar(e.cd < 0.45 ? 0.14 + (0.45 - e.cd) * 0.45 : 0.14);
    if (e.cd <= 0) {
      const tgt = tmpA.copy(P.eye); tgt.y -= 0.4; tgt.addScaledVector(P.vel, M.d3 / 26 * 0.5);
      if (losClear(e.pos, tgt)) {
        const v = tgt.clone().sub(e.pos).normalize();
        spawnProj({ type: 'bolt', pos: e.pos.clone().addScaledVector(v, 0.7), vel: v.multiplyScalar(26), r: 0.2, dmg: 9, owner: 1, g: 0, color: 0xff5a3d, src: e.pos.clone() });
        sfx.bolt(e.pos); e.cd = rand(1.9, 3.2) * Math.max(0.6, 1 - G.wave * 0.02);
      } else e.cd = 0.4;
    }
    e.hr = 0;
  },
  bomber(e, dt) {
    const sp = e.d.speed * (1 + 0.02 * G.wave);
    if (e.state === 'fuse') {
      walk(e, dt, sp * 0.4, false); e.st -= dt; e.flash = Math.sin(e.st * 70) > 0 ? 1 : 0; e.mesh.scale.setScalar(1 + (0.55 - e.st) * 0.5);
      if (e.st <= 0) killEnemy(e, false);
    } else {
      walk(e, dt, sp, false);
      if (M.d3 < 2.8) { e.state = 'fuse'; e.st = 0.55; sfx.beep(e.pos); later(0.18, () => sfx.beep(e.pos)); later(0.36, () => sfx.beep(e.pos)); }
    }
    e.ball.rotation.x += Math.hypot(e.vel.x, e.vel.z) * dt / 0.62;
    e.eye.visible = Math.sin(e.t * 9) > 0; e.hr = 0;
  },
  bulwark(e, dt) {
    const sp = e.d.speed * (1 + 0.015 * G.wave);
    if (e.state === 'slam') {
      walk(e, dt, 0, true); e.st -= dt; e.torso.position.y = 2.05 + Math.sin(Math.min(1, (0.7 - e.st) / 0.55) * Math.PI) * 0.7;
      if (e.st <= 0) {
        ring(e.pos, 1, 6.6, 0xffb347, 0.4); burst(tmpA.copy(e.pos).setY(e.pos.y + 0.3), 30, 0xffb347, 12, 0.4, 0.5, 6, 2); sfx.slam(e.pos);
        P.trauma = Math.min(1, P.trauma + clamp(1 - M.dh / 20, 0, 0.6));
        if (M.dh < 6.6 && P.pos.y - e.pos.y < 1.1) hurtPlayer(26, e.pos);
        e.state = 'chase'; e.cd = 2.6; e.torso.position.y = 2.05;
      }
    } else {
      const stop = M.dh < 3.2; walk(e, dt, sp, stop); e.cd -= dt; e.cd2 -= dt;
      if (stop) e.face = angLerp(e.face, Math.atan2(M.dx, M.dz), 4 * dt);
      if (M.dh < 4.6 && e.cd <= 0 && Math.abs(P.pos.y - e.pos.y) < 3) { e.state = 'slam'; e.st = 0.7; sfx.windup(e.pos); }
      else if (e.cd2 <= 0 && M.dh > 8 && M.dh < 60) {
        e.cd2 = rand(3.4, 5); const tf = 1.5, g = 20;
        const tx = clamp(P.pos.x + P.vel.x * 0.6, -ARENA + 2, ARENA - 2), tz = clamp(P.pos.z + P.vel.z * 0.6, -ARENA + 2, ARENA - 2), ty = groundAt(tx, tz, P.pos.y + 0.5);
        const p0 = V(e.pos.x, e.pos.y + 3.7, e.pos.z);
        const warn = ring(V(tx, ty, tz), 4.6, 4.6, 0xff3d6e, tf + 0.1, true);
        spawnProj({ type: 'mortar', pos: p0, vel: V((tx - p0.x) / tf, (ty - p0.y + 0.5 * g * tf * tf) / tf, (tz - p0.z) / tf), r: 0.42, dmg: 28, owner: 1, g, color: 0xff6a3d, warn, src: e.pos.clone() });
        sfx.mortar(e.pos); burst(p0, 10, 0xffb347, 5, 0.3, 0.3);
      }
    }
    const mv = Math.min(1, Math.hypot(e.vel.x, e.vel.z) / 2), sw = Math.sin(e.t * 5) * 0.35 * mv;
    e.legL.position.z = sw; e.legR.position.z = -sw; e.torso.rotation.z = Math.sin(e.t * 5) * 0.03 * mv;
    const s = Math.sin(e.face), c = Math.cos(e.face); e.hx = e.pos.x + s * 0.12; e.hy = e.pos.y + e.torso.position.y + 1.05; e.hz = e.pos.z + c * 0.12; e.hr = 0.46;
  },
  boss(e, dt) {
    const enr = e.hp < e.maxHp * 0.5;
    e.orb += 0.14 * dt;
    tmpA.set(Math.cos(e.orb) * 20, 10.5 + Math.sin(e.t * 0.7) * 1.5, Math.sin(e.orb) * 20);
    e.pos.lerp(tmpA, 1 - Math.exp(-1.2 * dt));
    e.mesh.lookAt(P.eye);
    e.rings.forEach((r, i) => { r.rotation.x += (0.7 + i * 0.4) * dt * (enr ? 2 : 1); r.rotation.y += (0.5 - i * 0.3) * dt; });
    const dir = tmpB.copy(P.eye).sub(e.pos).normalize();
    e.hx = e.pos.x + dir.x * 2.5; e.hy = e.pos.y + dir.y * 2.5; e.hz = e.pos.z + dir.z * 2.5; e.hr = 1.3;
    const eye = V(e.pos.x + dir.x * 3.2, e.pos.y + dir.y * 3.2, e.pos.z + dir.z * 3.2);
    e.st -= dt;
    if (e.atk === 'idle') {
      if (e.st <= 0) {
        e.atk = ['burst', 'laser', 'summon'][e.atkI++ % 3];
        if (e.atk === 'burst') { e.vol = enr ? 5 : 3; e.st = 0.3; }
        if (e.atk === 'laser') { e.lt = 0; e.aim.copy(P.pos).setY(P.pos.y + 0.9); e.tick = 0; sfx.charge(); later(1.1, () => { if (!e.dead) sfx.laser(); }); }
        if (e.atk === 'summon') {
          const n = Math.min(6, 3 + Math.floor(G.wave / 5)); sfx.boss();
          for (let i = 0; i < n; i++) later(0.3 + i * 0.25, () => { if (e.dead || G.state === 'dead') return; const gi = (Math.random() * 4) | 0, g = GATES[gi]; world.gates[gi].pulse = 1; spawnEnemy(Math.random() < 0.6 ? 'skitter' : 'bomber', g[0] + rand(-2, 2), 0, g[1] + rand(-2, 2)); });
          e.atk = 'idle'; e.st = enr ? 2 : 3;
        }
      }
    } else if (e.atk === 'burst') {
      if (e.st <= 0) {
        const N = enr ? 11 : 9, base = Math.atan2(dir.x, dir.z), py = dir.y;
        for (let i = 0; i < N; i++) {
          const a = base + (i - (N - 1) / 2) * 0.13, v = V(Math.sin(a), py + rand(-0.03, 0.03), Math.cos(a)).normalize();
          spawnProj({ type: 'bolt', pos: eye.clone(), vel: v.multiplyScalar(21), r: 0.26, dmg: 10, owner: 1, g: 0, color: 0xff3d6e, src: e.pos.clone() });
        }
        sfx.bolt(e.pos); sfx.bolt(e.pos); flash(eye, 0xff3d6e, 4, 0.2);
        if (--e.vol <= 0) { e.atk = 'idle'; e.st = enr ? 1.1 : 1.9; } else e.st = 0.55;
      }
    } else if (e.atk === 'laser') {
      e.lt += dt; const active = e.lt > 1.1;
      tmpA.copy(P.pos).setY(P.pos.y + 0.9); e.aim.lerp(tmpA, 1 - Math.exp(-(active ? (enr ? 2.3 : 1.9) : 6) * dt));
      const bd = tmpA.copy(e.aim).sub(eye).normalize(), len = rayWorld(eye, bd, 220);
      const w = active ? 0.42 + Math.sin(e.t * 40) * 0.08 : 0.05;
      e.beam.visible = true; e.beam.position.copy(eye).addScaledVector(bd, len / 2); e.beam.quaternion.setFromUnitVectors(tmpC.set(0, 1, 0), bd); e.beam.scale.set(w, len, w);
      e.beam.material.opacity = active ? 0.95 : 0.35;
      if (active) {
        const ex = eye.x + bd.x * len, ey = eye.y + bd.y * len, ez = eye.z + bd.z * len;
        for (let i = 0; i < 3; i++) emit(ex, ey, ez, rand(-6, 6), rand(1, 8), rand(-6, 6), 0xff6a3d, 0.4, 0.4, 10);
        e.tick -= dt;
        const pc = tmpC.copy(P.pos).setY(P.pos.y + 0.9).sub(eye), t = pc.dot(bd);
        if (t > 0 && t < len && e.tick <= 0) { const dd = pc.addScaledVector(bd, -t).length(); if (dd < 0.95) { hurtPlayer(5.5, e.pos); e.tick = 0.15; } }
      }
      if (e.lt > 3.7) { e.beam.visible = false; e.atk = 'idle'; e.st = enr ? 1.2 : 2; }
    }
    $('bossbar').firstElementChild.style.transform = `scaleX(${clamp(e.hp / e.maxHp, 0, 1)})`;
  }
};

let flowT = 0;
function updateEnemies(dt) {
  flowT -= dt; if (flowT <= 0) { flowT = 0.25; updateFlow(P.pos.x, P.pos.z); }
  for (const e of enemies.slice()) {
    if (e.dead) continue;
    e.t += dt; e.born += dt;
    M.dx = P.pos.x - e.pos.x; M.dz = P.pos.z - e.pos.z; M.dy = (P.pos.y + 0.9) - (e.pos.y + (e.d.fly ? 0 : e.h * 0.5));
    M.dh = Math.hypot(M.dx, M.dz) || 0.001; M.d3 = Math.hypot(M.dh, M.dy);
    if (e.type !== 'bomber' || e.state !== 'fuse') e.mesh.scale.setScalar(Math.min(1, 0.1 + e.born / 0.35));
    UPD[e.type](e, dt);
    if (e.dead) continue;
    if (!e.d.fly && e.state !== 'leap' && Math.abs(P.pos.y - e.pos.y) < 1.6) {      // machines crowd the player but never stand inside them
      const ox = e.pos.x - P.pos.x, oz = e.pos.z - P.pos.z, od = Math.hypot(ox, oz), min = e.r + 0.55;
      if (od < min && od > 1e-4) { e.pos.x = P.pos.x + ox / od * min; e.pos.z = P.pos.z + oz / od * min; }
    }
    if (e.flash > 0 || e.wasFlash) { const f = e.flash; for (const m of e.mats) m.emissive.setRGB(m.userData.e.r + f * 2.5, m.userData.e.g + f * 2.5, m.userData.e.b + f * 2.5); e.wasFlash = f > 0; e.flash = Math.max(0, f - 7 * dt); }
    e.mesh.position.copy(e.pos); if (e.type !== 'boss') e.mesh.rotation.y = e.face;
  }
  for (let i = 0; i < enemies.length; i++) {
    const a = enemies[i]; if (a.type === 'boss') continue;
    for (let j = i + 1; j < enemies.length; j++) {
      const b = enemies[j]; if (b.type === 'boss' || !a.d.fly !== !b.d.fly) continue;
      const dx = b.pos.x - a.pos.x, dz = b.pos.z - a.pos.z, m = (a.r + b.r) * 0.9, d2 = dx * dx + dz * dz;
      if (d2 < m * m && d2 > 1e-6 && Math.abs(a.pos.y - b.pos.y) < 2) { const d = Math.sqrt(d2), k = (m - d) / d * 0.5; a.pos.x -= dx * k; a.pos.z -= dz * k; b.pos.x += dx * k; b.pos.z += dz * k; }
    }
  }
}

// ---------------------------------------------------------------- damage
let lastHitSfx = 0;
const centerOf = (e, out) => out.set(e.pos.x, e.pos.y + (e.d.fly ? 0 : e.h * 0.5), e.pos.z);
function applyDamage(e, dmg, crit, pt) {
  if (e.dead) return;
  e.hp -= dmg; e.flash = 1; hitMarker(crit); dmgNumber(pt, dmg, crit);
  if (G.time - lastHitSfx > 0.03) { lastHitSfx = G.time; crit ? sfx.crit() : sfx.hit(); }
  burst(pt, crit ? 7 : 3, crit ? 0xffd24a : e.d.color, 5, 0.22, 0.3, 6);
  if (e.hp <= 0) killEnemy(e, true);
}
function damageEnemy(e, dmg, crit, pt, noChain) {
  if (e.dead) return;
  dmg *= mods.dmg * (G.odT > 0 ? 1.5 : 1) * (crit ? mods.crit : 1);
  if (mods.arc > 0 && !noChain) {
    let best = null, bd = 100;
    for (const o of enemies) { if (o === e || o.dead) continue; const d = o.pos.distanceToSquared(e.pos); if (d < bd) { bd = d; best = o; } }
    if (best) { const c = centerOf(best, V()); tracer(pt, c, 0x9fe8ff, 0.07, 0.16); applyDamage(best, dmg * 0.35 * mods.arc, false, c); }
  }
  applyDamage(e, dmg, crit, pt);
}
function explode(p, r, dmgE, dmgP, color, big) {
  shell(p, r * 0.9, color, big ? 0.5 : 0.35); shell(p, r * 0.5, 0xffffff, 0.2);
  if (p.y < 2.5) ring(V(p.x, groundAt(p.x, p.z, p.y + 0.5), p.z), 0.5, r * 1.15, color, 0.45);
  burst(p, big ? 70 : 40, color, big ? 22 : 15, 0.55, 0.7, 8, 3); burst(p, 14, 0xffffff, 9, 0.3, 0.35);
  flash(p, color, big ? 9 : 6, 0.3); sfx.explode(p, big);
  const pd = p.distanceTo(tmpA.copy(P.pos).setY(P.pos.y + 0.9));
  P.trauma = Math.min(1, P.trauma + clamp(1.1 - pd / (r * 4), 0, 0.7));
  if (dmgE > 0) for (const e of enemies.slice()) {
    if (e.dead) continue; const c = centerOf(e, V()), d = c.distanceTo(p) - e.r;
    if (d < r) damageEnemy(e, dmgE * clamp(1 - d / r * 0.7, 0.3, 1), false, c, true);
  }
  if (dmgP > 0 && pd < r) hurtPlayer(dmgP * clamp(1 - pd / r * 0.7, 0.3, 1), p);
}
function killEnemy(e, byPlayer) {
  if (e.dead) return; e.dead = true;
  const i = enemies.indexOf(e); if (i >= 0) enemies.splice(i, 1);
  scene.remove(e.mesh); for (const m of e.mats) m.dispose();
  if (e.beam) { scene.remove(e.beam); e.beam.material.dispose(); }
  const c = centerOf(e, V()), d = e.d;
  burst(c, 22, d.color, 11, 0.45, 0.6, 9, 3); burst(c, 8, 0xffffff, 6, 0.25, 0.3); debris(c, d.deb, d.size);
  shell(c, e.r * 2.2, d.color, 0.28); flash(c, d.color, 4, 0.22); sfx.kill();
  if (byPlayer) {
    G.kills++; G.combo++; G.comboT = 3.5; const mult = 1 + Math.min(G.combo - 1, 20) * 0.1;
    G.score += Math.round(d.score * mult); G.od = Math.min(100, G.od + (G.odT > 0 ? 0 : d.od));
    G.multiN = G.multiT > 0 ? G.multiN + 1 : 1; G.multiT = 1.3;
    if (G.multiN >= 2) sfx.multi();
    if (G.multiN >= 2) feed(['', '', 'DOUBLE KILL', 'TRIPLE KILL', 'OVERKILL', 'ANNIHILATION'][Math.min(5, G.multiN)]);
    if (mods.lifesteal) P.hp = Math.min(P.maxHp, P.hp + mods.lifesteal);
    if (mods.volatile && e.type !== 'bomber') later(0.08, () => explode(c, 3.2 + mods.volatile * 0.6, 38 * mods.volatile, 0, 0xffb347));
    let n = e.type === 'bulwark' ? 2 : e.type === 'boss' ? 6 : (Math.random() < 0.2 * mods.drop ? 1 : 0);
    while (n-- > 0) spawnPickup((P.hp < P.maxHp * 0.5 && Math.random() < 0.65) || Math.random() < 0.4 ? 'health' : 'ammo', c.x + rand(-1.5, 1.5), c.z + rand(-1.5, 1.5));
  }
  if (e.type === 'bomber') later(0.06, () => explode(c, 5.2, 70, 34, 0xffb347));
  if (e.type === 'boss') {
    for (let k = 0; k < 7; k++) later(k * 0.22, () => explode(V(c.x + rand(-4, 4), c.y + rand(-3, 3), c.z + rand(-4, 4)), 7, 0, 0, k % 2 ? 0xff3d6e : 0xb36bff, true));
    $('boss').hidden = true; music.intensity = 1; announce('OVERSEER DESTROYED', '+5000', 2.5); G.slowT = 1.4;
  }
}

// ---------------------------------------------------------------- projectiles + pickups
function spawnProj(o) {
  const m = new T.Mesh(GEO.sphereLo, glowMat(o.color)); m.scale.setScalar(o.r); m.position.copy(o.pos); scene.add(m);
  o.mesh = m; o.life = 7; projs.push(o); return o;
}
function updateProjs(dt) {
  for (let i = projs.length - 1; i >= 0; i--) {
    const o = projs[i]; let hit = 0;
    const n = Math.max(1, Math.ceil(o.vel.length() * dt / 0.6)), sdt = dt / n;
    for (let s = 0; s < n && !hit; s++) {
      o.vel.y -= o.g * sdt; o.pos.addScaledVector(o.vel, sdt);
      if (pointInWorld(o.pos, o.r * 0.4) || Math.abs(o.pos.x) > ARENA + 4 || Math.abs(o.pos.z) > ARENA + 4) hit = 1;
      else if (o.owner === 0) {
        for (const e of enemies) { for (const [cy, r] of e.parts) { const dy = o.pos.y - (e.pos.y + cy), dx = o.pos.x - e.pos.x, dz = o.pos.z - e.pos.z, rr = r + o.r; if (dx * dx + dy * dy + dz * dz < rr * rr) { hit = 1; break; } } if (hit) break; }
      } else {
        const py = clamp(o.pos.y, P.pos.y + 0.3, P.pos.y + 1.6), dx = o.pos.x - P.pos.x, dy = o.pos.y - py, dz = o.pos.z - P.pos.z, rr = 0.5 + o.r;
        if (dx * dx + dy * dy + dz * dz < rr * rr) hit = 2;
      }
    }
    o.life -= dt; o.mesh.position.copy(o.pos);
    emit(o.pos.x, o.pos.y, o.pos.z, rand(-.5, .5), rand(-.5, .5), rand(-.5, .5), o.color, o.r * 1.8, o.type === 'bolt' ? 0.18 : 0.4);
    if (hit || o.life <= 0) {
      if (o.type === 'plasma') explode(o.pos, 5.5, o.dmg, 16, o.color);
      else if (o.type === 'mortar') { explode(o.pos, 4.6, 0, o.dmg, 0xff6a3d); if (o.warn) o.warn.t = 0.01; }
      else { if (hit === 2) hurtPlayer(o.dmg, o.src); burst(o.pos, 6, o.color, 5, 0.25, 0.25); }
      scene.remove(o.mesh); projs.splice(i, 1);
    }
  }
}
const matHealth = new T.MeshBasicMaterial({ color: lin(0x5dffa0, GLOW * 0.45) }), matAmmo = new T.MeshBasicMaterial({ color: lin(0xffc247, GLOW * 0.4) });
function spawnPickup(kind, x, z) {
  x = clamp(x, -ARENA + 2, ARENA - 2); z = clamp(z, -ARENA + 2, ARENA - 2);
  const m = new T.Mesh(kind === 'health' ? GEO.octa : GEO.box, kind === 'health' ? matHealth : matAmmo);
  m.scale.setScalar(kind === 'health' ? 0.38 : 0.42); const y = groundAt(x, z, 99) + 0.8; m.position.set(x, y, z); scene.add(m);
  pickups.push({ kind, pos: m.position, y, m, t: rand(6), life: 28 });
}
function updatePickups(dt) {
  for (let i = pickups.length - 1; i >= 0; i--) {
    const p = pickups[i]; p.t += dt; p.life -= dt; p.m.rotation.y += 2.5 * dt; p.m.rotation.x += 1.2 * dt;
    const d = tmpA.copy(P.pos).setY(P.pos.y + 0.9).sub(p.pos), dist = d.length();
    if (dist < mods.magnet) p.pos.addScaledVector(d, Math.min(1, 14 * dt / Math.max(dist, 0.1)));
    else p.pos.y = p.y + Math.sin(p.t * 3) * 0.18;
    p.m.visible = p.life > 4 || Math.sin(p.life * 16) > 0;
    if (Math.random() < 0.3) emit(p.pos.x, p.pos.y, p.pos.z, rand(-.6, .6), rand(.5, 1.5), rand(-.6, .6), p.kind === 'health' ? 0x5dffa0 : 0xffc247, 0.16, 0.5);
    if (dist < 1.3) {
      if (p.kind === 'health') { if (P.hp >= P.maxHp) P.shield = Math.min(P.maxShield, P.shield + 25); P.hp = Math.min(P.maxHp, P.hp + 25); sfx.pickup(0); showTip('+25 health', 1); }
      else { for (let k = 1; k < 4; k++) ws[k].res = Math.min(WEAPONS[k].max, ws[k].res + Math.ceil(WEAPONS[k].max * 0.34)); sfx.pickup(1); showTip('Ammo restocked', 1); }
      burst(p.pos, 10, p.kind === 'health' ? 0x5dffa0 : 0xffc247, 4, 0.25, 0.4);
      p.life = 0;
    }
    if (p.life <= 0) { scene.remove(p.m); pickups.splice(i, 1); }
  }
}
