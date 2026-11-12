// ---------------------------------------------------------------- world
const ARENA = 60;
const boxes = [];      // static colliders {x0,y0,z0,x1,y1,z1}
const pads = [];       // jump pads {x,z,r,mesh}
const GATES = [[-50, -50], [50, -50], [-50, 50], [50, 50]];
const sunDir = V(-0.45, 0.42, -0.78).normalize();

function canvasTex(size, draw, rx = 1, ry = 1) {
  const c = document.createElement('canvas'); c.width = c.height = size;
  draw(c.getContext('2d'), size);
  const t = new T.CanvasTexture(c);
  t.wrapS = t.wrapT = T.RepeatWrapping; t.repeat.set(rx, ry);
  t.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  return t;
}
function speckle(g, s, n, a) {
  for (let i = 0; i < n; i++) {
    g.fillStyle = `rgba(${Math.random() < .5 ? '255,255,255' : '0,0,0'},${Math.random() * a})`;
    g.fillRect(Math.random() * s, Math.random() * s, 1 + Math.random() * 2, 1 + Math.random() * 2);
  }
}
const floorTex = canvasTex(512, (g, s) => {
  g.fillStyle = '#23262f'; g.fillRect(0, 0, s, s);
  speckle(g, s, 5000, 0.06);
  const n = 4, c = s / n;
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
    g.fillStyle = `rgba(255,255,255,${Math.random() * 0.035})`; g.fillRect(i * c + 3, j * c + 3, c - 6, c - 6);
    g.strokeStyle = 'rgba(0,0,0,.55)'; g.lineWidth = 3; g.strokeRect(i * c + 1.5, j * c + 1.5, c - 3, c - 3);
    g.fillStyle = 'rgba(160,170,190,.35)';
    for (const [a, b] of [[10, 10], [c - 12, 10], [10, c - 12], [c - 12, c - 12]]) g.fillRect(i * c + a, j * c + b, 3, 3);
  }
  g.fillStyle = 'rgba(255,170,60,.16)';
  for (let k = 0; k < 10; k++) g.fillRect(k * 26 + 6, s / 2 - 8, 13, 16);
}, 15, 15);
const floorGlow = canvasTex(512, (g, s) => {
  g.fillStyle = '#000'; g.fillRect(0, 0, s, s);
  g.strokeStyle = '#fff'; g.lineWidth = 3; g.strokeRect(0, 0, s, s);
  g.fillStyle = '#fff'; g.fillRect(s / 2 - 22, s / 2 - 2, 44, 4); g.fillRect(s / 2 - 2, s / 2 - 22, 4, 44);
}, 15, 15);
const panelTex = canvasTex(256, (g, s) => {
  g.fillStyle = '#3a3f4d'; g.fillRect(0, 0, s, s);
  speckle(g, s, 1800, 0.07);
  g.strokeStyle = 'rgba(0,0,0,.6)'; g.lineWidth = 4; g.strokeRect(2, 2, s - 4, s - 4);
  g.strokeStyle = 'rgba(255,255,255,.07)'; g.lineWidth = 2; g.strokeRect(8, 8, s - 16, s - 16);
  g.fillStyle = 'rgba(0,0,0,.35)'; for (let i = 0; i < 5; i++) g.fillRect(30, 40 + i * 14, 70, 5);
  g.fillStyle = 'rgba(190,200,220,.4)'; for (const [a, b] of [[14, 14], [s - 18, 14], [14, s - 18], [s - 18, s - 18]]) g.fillRect(a, b, 4, 4);
});
const crateTex = canvasTex(256, (g, s) => {
  g.fillStyle = '#5a4630'; g.fillRect(0, 0, s, s);
  speckle(g, s, 1500, 0.08);
  g.strokeStyle = 'rgba(0,0,0,.6)'; g.lineWidth = 10; g.strokeRect(5, 5, s - 10, s - 10);
  g.save(); g.beginPath(); g.rect(0, s * 0.62, s, s * 0.2); g.clip();
  for (let i = -s; i < s * 2; i += 44) { g.fillStyle = '#e8a024'; g.beginPath(); g.moveTo(i, s); g.lineTo(i + 22, s); g.lineTo(i + 70, 0); g.lineTo(i + 48, 0); g.fill(); }
  g.restore();
  g.fillStyle = 'rgba(0,0,0,.4)'; g.fillRect(0, s * 0.62, s, 4); g.fillRect(0, s * 0.82 - 4, s, 4);
});

const matFloor = new T.MeshStandardMaterial({ map: floorTex, roughness: 0.86, metalness: 0.12, emissiveMap: floorGlow, emissive: 0xff6a20, emissiveIntensity: 0.55 });
const matPanel = new T.MeshStandardMaterial({ map: panelTex, roughness: 0.6, metalness: 0.3, color: 0xb9c2dc });
const matPlat = new T.MeshStandardMaterial({ map: panelTex, roughness: 0.5, metalness: 0.35, color: 0x8ea0c8 });
const matCrate = new T.MeshStandardMaterial({ map: crateTex, roughness: 0.75, metalness: 0.1 });
const glowMats = {};
const glowMat = c => glowMats[c] || (glowMats[c] = new T.MeshBasicMaterial({ color: c }));
const GEO = {
  box: new T.BoxGeometry(1, 1, 1), sphere: new T.SphereGeometry(1, 20, 14), sphereLo: new T.SphereGeometry(1, 10, 8),
  cyl: new T.CylinderGeometry(1, 1, 1, 16), octa: new T.OctahedronGeometry(1, 0), cone: new T.ConeGeometry(1, 1, 10),
  torus: new T.TorusGeometry(1, 0.08, 8, 28), torusThin: new T.TorusGeometry(1, 0.03, 6, 40), ring: new T.RingGeometry(0.86, 1, 40),
  disc: new T.CircleGeometry(1, 32)
};

function uvBox(w, h, d, s) {
  const g = new T.BoxGeometry(w, h, d), uv = g.attributes.uv;
  const dims = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
  for (let f = 0; f < 6; f++) for (let i = 0; i < 4; i++) {
    const k = f * 4 + i; uv.setXY(k, uv.getX(k) * dims[f][0] / s, uv.getY(k) * dims[f][1] / s);
  }
  return g;
}
function addBox(x, y, z, w, h, d, mat, trim, texScale = 4) {
  const m = new T.Mesh(uvBox(w, h, d, texScale), mat);
  m.position.set(x, y + h / 2, z); m.castShadow = true; m.receiveShadow = true; scene.add(m);
  boxes.push({ x0: x - w / 2, x1: x + w / 2, y0: y, y1: y + h, z0: z - d / 2, z1: z + d / 2 });
  if (trim) {
    const gm = glowMat(trim), t = 0.07, o = 0.03, yy = y + h - 0.12;
    for (const [px, pz, sx, sz] of [[x, z - d / 2 - o, w + 2 * o, t], [x, z + d / 2 + o, w + 2 * o, t], [x - w / 2 - o, z, t, d + 2 * o], [x + w / 2 + o, z, t, d + 2 * o]]) {
      const s = new T.Mesh(GEO.box, gm); s.position.set(px, yy, pz); s.scale.set(sx, t, sz); scene.add(s);
    }
  }
  return m;
}

function buildWorld() {
  // lights
  scene.add(new T.HemisphereLight(0x8f9cff, 0x2a1810, 0.62));
  const sun = new T.DirectionalLight(0xffd0a0, 0.95);
  sun.position.copy(sunDir).multiplyScalar(120); sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.04;
  const sc = sun.shadow.camera; sc.left = -80; sc.right = 80; sc.top = 80; sc.bottom = -80; sc.near = 10; sc.far = 260;
  scene.add(sun);

  // sky
  const sky = new T.Mesh(new T.SphereGeometry(800, 32, 20), new T.ShaderMaterial({
    side: T.BackSide, depthWrite: false, fog: false, uniforms: { uSun: { value: sunDir }, uTime: { value: 0 } },
    vertexShader: 'varying vec3 vDir; void main(){ vDir=normalize(position); gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
    fragmentShader: `
      uniform vec3 uSun; uniform float uTime; varying vec3 vDir;
      float hash(vec3 p){ p=fract(p*0.3183099+.1); p*=17.0; return fract(p.x*p.y*p.z*(p.x+p.y+p.z)); }
      float noise(vec3 x){ vec3 i=floor(x), f=fract(x); f=f*f*(3.0-2.0*f);
        return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x), mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),
                   mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x), mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z); }
      float fbm(vec3 p){ float a=.5,s=0.; for(int i=0;i<4;i++){ s+=a*noise(p); p*=2.03; a*=.5; } return s; }
      void main(){
        vec3 d=normalize(vDir);
        vec3 col=mix(vec3(0.015,0.01,0.04), vec3(0.09,0.03,0.12), smoothstep(-0.3,0.7,d.y));
        float n=fbm(d*3.0+vec3(0.0,uTime*0.008,0.0));
        col+=vec3(0.42,0.10,0.45)*pow(n,3.0)*1.3;
        col+=vec3(0.05,0.22,0.38)*pow(fbm(d*5.0+7.0),4.0)*1.6;
        float sd=max(dot(d,uSun),0.0);
        col+=vec3(1.0,0.5,0.18)*pow(sd,10.0)*0.32;
        col+=vec3(1.0,0.72,0.38)*pow(sd,180.0)*0.5;
        float disc=smoothstep(0.9988,0.9992,sd);
        float gran=0.75+0.5*fbm(d*60.0+uTime*0.05);
        col=mix(col, vec3(1.25,0.95,0.6)*gran, disc);
        gl_FragColor=vec4(col,1.0);
      }`
  }));
  scene.add(sky); world.sky = sky;
  const sp = new Float32Array(1800 * 3);
  for (let i = 0; i < 1800; i++) { tmpA.set(rand(-1, 1), rand(-0.3, 1), rand(-1, 1)).normalize().multiplyScalar(700); sp.set([tmpA.x, tmpA.y, tmpA.z], i * 3); }
  const sg = new T.BufferGeometry(); sg.setAttribute('position', new T.BufferAttribute(sp, 3));
  scene.add(new T.Points(sg, new T.PointsMaterial({ color: 0xcfd8ff, size: 1.6, sizeAttenuation: false, fog: false, depthWrite: false })));

  // colossal forge rings around the deck
  world.rings = [];
  for (const [r, tx, tz, c] of [[150, 1.25, 0.2, 0xff7a30], [190, 1.05, -0.35, 0x8a4dff]]) {
    const m = new T.Mesh(new T.TorusGeometry(r, 1.6, 8, 120), new T.MeshBasicMaterial({ color: c, fog: false }));
    m.rotation.set(tx, 0, tz); m.position.y = -20; scene.add(m); world.rings.push(m);
  }

  // deck
  const floor = new T.Mesh(new T.PlaneGeometry(ARENA * 2, ARENA * 2), matFloor);
  floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);
  const WH = 9;
  addBox(0, 0, -ARENA - 1, ARENA * 2 + 4, WH, 2, matPanel, 0xff7a30, 6);
  addBox(0, 0, ARENA + 1, ARENA * 2 + 4, WH, 2, matPanel, 0xff7a30, 6);
  addBox(-ARENA - 1, 0, 0, 2, WH, ARENA * 2, matPanel, 0xff7a30, 6);
  addBox(ARENA + 1, 0, 0, 2, WH, ARENA * 2, matPanel, 0xff7a30, 6);

  // reactor core
  addBox(0, 0, 0, 7, 2.4, 7, matPlat, 0x4de1ff);
  const core = new T.Mesh(GEO.sphere, new T.MeshBasicMaterial({ color: 0xffb060 }));
  core.position.set(0, 7, 0); core.scale.setScalar(1.9); scene.add(core); world.core = core;
  world.coreRings = [];
  for (let i = 0; i < 3; i++) {
    const r = new T.Mesh(GEO.torusThin, glowMat(0x2fb4d6)); r.scale.setScalar(2.9 + i * 0.7); r.position.copy(core.position); scene.add(r); world.coreRings.push(r);
  }
  const beam = new T.Mesh(new T.CylinderGeometry(0.35, 0.35, 400, 10, 1, true), new T.MeshBasicMaterial({ color: 0xff9040, transparent: true, opacity: 0.35, blending: T.AdditiveBlending, depthWrite: false, fog: false }));
  beam.position.set(0, 207, 0); scene.add(beam); world.beam = beam;
  world.coreLight = new T.PointLight(0xff9a50, 2.2, 55, 2); world.coreLight.position.set(0, 7, 0); scene.add(world.coreLight);

  // platforms, towers, pillars, cover
  for (const [sx, sz] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) {
    addBox(sx * 22, 0, sz * 22, 10, 1.5, 10, matPlat, 0x4de1ff);
    addBox(sx * 25, 1.5, sz * 25, 4, 3, 4, matPlat, 0x4de1ff);
    addBox(sx * 38, 0, sz * 12, 3, 8, 3, matPanel, 0xb36bff);
    addBox(sx * 12, 0, sz * 38, 3, 8, 3, matPanel, 0xb36bff);
    addBox(sx * 34, 0, sz * 34, 8, 1.4, 1.2, matPanel, 0xff7a30);
    addBox(sx * 10, 0, sz * 14, 1.2, 1.4, 7, matPanel, 0xff7a30);
    addBox(sx * 46, 0, sz * 30, 2.4, 2.4, 2.4, matCrate, 0, 2.4);
    addBox(sx * 46, 0, sz * 27.4, 2.4, 1.6, 2.4, matCrate, 0, 2.4);
    addBox(sx * 30, 0, sz * 47, 2.4, 2.4, 2.4, matCrate, 0, 2.4);
    addBox(sx * 32.6, 0, sz * 47, 2.4, 1.2, 2.4, matCrate, 0, 2.4);
    const pl = new T.PointLight(sx * sz > 0 ? 0x4de1ff : 0xff7a30, 1.5, 34, 2); pl.position.set(sx * 22, 6.5, sz * 22); scene.add(pl);
  }
  addBox(0, 0, 26, 12, 1.4, 1.2, matPanel, 0xff7a30); addBox(0, 0, -26, 12, 1.4, 1.2, matPanel, 0xff7a30);
  addBox(26, 0, 0, 1.2, 1.4, 12, matPanel, 0xff7a30); addBox(-26, 0, 0, 1.2, 1.4, 12, matPanel, 0xff7a30);

  // jump pads
  for (const [x, z] of [[42, 0], [-42, 0], [0, 42], [0, -42]]) {
    const d = new T.Mesh(GEO.cyl, new T.MeshStandardMaterial({ color: 0x222838, roughness: .4, metalness: .6 }));
    d.scale.set(1.9, 0.12, 1.9); d.position.set(x, 0.06, z); d.receiveShadow = true; scene.add(d);
    const r = new T.Mesh(GEO.ring, new T.MeshBasicMaterial({ color: 0x5dffa0, side: T.DoubleSide }));
    r.rotation.x = -Math.PI / 2; r.position.set(x, 0.14, z); r.scale.setScalar(1.7); scene.add(r);
    const a = new T.Mesh(GEO.cone, glowMat(0x5dffa0)); a.scale.set(0.5, 0.9, 0.5); a.position.set(x, 1.2, z); scene.add(a);
    pads.push({ x, z, r: 1.9, ring: r, arrow: a });
  }
  // spawn gates
  world.gates = [];
  for (const [x, z] of GATES) {
    const g = new T.Mesh(GEO.torus, glowMat(0xff3d6e)); g.scale.setScalar(2.6); g.position.set(x, 2.8, z);
    g.rotation.y = Math.atan2(x, z); scene.add(g);
    const d = new T.Mesh(GEO.disc, new T.MeshBasicMaterial({ color: 0xff3d6e, transparent: true, opacity: 0.16, side: T.DoubleSide, depthWrite: false, blending: T.AdditiveBlending }));
    d.scale.setScalar(2.5); d.position.copy(g.position); d.rotation.y = g.rotation.y; scene.add(d);
    const pl = new T.PointLight(0xff3d6e, 1.2, 22, 2); pl.position.set(x, 3, z); scene.add(pl);
    world.gates.push({ ring: g, disc: d, pulse: 0 });
  }
}
const world = {};

// ---------------------------------------------------------------- collision + queries
function groundAt(x, z, y) {
  let g = 0;
  for (let i = 0; i < boxes.length; i++) { const b = boxes[i]; if (x > b.x0 && x < b.x1 && z > b.z0 && z < b.z1 && b.y1 <= y + 0.6 && b.y1 > g) g = b.y1; }
  return g;
}
// ray vs static world; returns distance (<= maxT)
function rayWorld(o, d, maxT) {
  let t = maxT;
  if (d.y < -1e-6) { const tg = -o.y / d.y; if (tg > 0 && tg < t) t = tg; }
  for (let i = 0; i < boxes.length; i++) {
    const b = boxes[i]; let t0 = 0, t1 = t, a, c, inv;
    inv = 1 / d.x; a = (b.x0 - o.x) * inv; c = (b.x1 - o.x) * inv; if (a > c) { const s = a; a = c; c = s; } if (a > t0) t0 = a; if (c < t1) t1 = c; if (t0 > t1) continue;
    inv = 1 / d.y; a = (b.y0 - o.y) * inv; c = (b.y1 - o.y) * inv; if (a > c) { const s = a; a = c; c = s; } if (a > t0) t0 = a; if (c < t1) t1 = c; if (t0 > t1) continue;
    inv = 1 / d.z; a = (b.z0 - o.z) * inv; c = (b.z1 - o.z) * inv; if (a > c) { const s = a; a = c; c = s; } if (a > t0) t0 = a; if (c < t1) t1 = c; if (t0 > t1) continue;
    if (t0 < t) t = t0;
  }
  return t;
}
function raySphere(o, d, cx, cy, cz, r) {
  const ox = cx - o.x, oy = cy - o.y, oz = cz - o.z, tca = ox * d.x + oy * d.y + oz * d.z;
  if (tca < 0) return -1;
  const d2 = ox * ox + oy * oy + oz * oz - tca * tca; if (d2 > r * r) return -1;
  return Math.max(0, tca - Math.sqrt(r * r - d2));
}
function losClear(a, b) {
  tmpC.subVectors(b, a); const len = tmpC.length(); if (len < 0.01) return true; tmpC.multiplyScalar(1 / len);
  return rayWorld(a, tmpC, len) >= len - 0.05;
}
function pointInWorld(p, pad) {
  if (p.y < pad * 0.5) return true;
  for (let i = 0; i < boxes.length; i++) { const b = boxes[i]; if (p.x > b.x0 - pad && p.x < b.x1 + pad && p.y > b.y0 - pad && p.y < b.y1 + pad && p.z > b.z0 - pad && p.z < b.z1 + pad) return true; }
  return false;
}
// player-style AABB mover with step-up
function collideMove(pos, vel, dt, r, h) {
  let ground = false;
  const hit = b => pos.x + r > b.x0 && pos.x - r < b.x1 && pos.y + h > b.y0 && pos.y < b.y1 - 1e-4 && pos.z + r > b.z0 && pos.z - r < b.z1;
  pos.x += vel.x * dt;
  for (let i = 0; i < boxes.length; i++) { const b = boxes[i]; if (hit(b)) {
    if (b.y1 - pos.y <= 0.4 && vel.y <= 0.5) { pos.y = b.y1; continue; }
    if (vel.x > 0) pos.x = b.x0 - r; else if (vel.x < 0) pos.x = b.x1 + r; else pos.x = (pos.x < (b.x0 + b.x1) / 2) ? b.x0 - r : b.x1 + r;
    vel.x = 0; } }
  pos.z += vel.z * dt;
  for (let i = 0; i < boxes.length; i++) { const b = boxes[i]; if (hit(b)) {
    if (b.y1 - pos.y <= 0.4 && vel.y <= 0.5) { pos.y = b.y1; continue; }
    if (vel.z > 0) pos.z = b.z0 - r; else if (vel.z < 0) pos.z = b.z1 + r; else pos.z = (pos.z < (b.z0 + b.z1) / 2) ? b.z0 - r : b.z1 + r;
    vel.z = 0; } }
  pos.y += vel.y * dt;
  for (let i = 0; i < boxes.length; i++) { const b = boxes[i]; if (hit(b)) {
    if (vel.y <= 0) { pos.y = b.y1; ground = true; } else pos.y = b.y0 - h;
    vel.y = 0; } }
  if (pos.y <= 0) { pos.y = 0; if (vel.y < 0) vel.y = 0; ground = true; }
  return ground;
}
// circle push-out for enemies
function pushOut(pos, r, h) {
  for (let i = 0; i < boxes.length; i++) {
    const b = boxes[i]; if (pos.y >= b.y1 - 0.4 || pos.y + h <= b.y0) continue;
    const cx = clamp(pos.x, b.x0, b.x1), cz = clamp(pos.z, b.z0, b.z1);
    let dx = pos.x - cx, dz = pos.z - cz; const d2 = dx * dx + dz * dz;
    if (d2 >= r * r) continue;
    if (d2 > 1e-8) { const d = Math.sqrt(d2), k = (r - d) / d; pos.x += dx * k; pos.z += dz * k; }
    else { const l = pos.x - b.x0, rr = b.x1 - pos.x, n = pos.z - b.z0, f = b.z1 - pos.z, m = Math.min(l, rr, n, f);
      if (m === l) pos.x = b.x0 - r; else if (m === rr) pos.x = b.x1 + r; else if (m === n) pos.z = b.z0 - r; else pos.z = b.z1 + r; }
  }
}

// ---------------------------------------------------------------- flow field (enemy pathing)
const FN = 60, FC = 2, flowBlocked = new Uint8Array(FN * FN), flowDist = new Int16Array(FN * FN), flowQ = new Int32Array(FN * FN);
const cellOf = v => clamp(Math.floor((v + ARENA) / FC), 0, FN - 1);
function buildFlowGrid() {
  for (let cz = 0; cz < FN; cz++) for (let cx = 0; cx < FN; cx++) {
    const x = -ARENA + (cx + 0.5) * FC, z = -ARENA + (cz + 0.5) * FC; let bl = 0;
    for (const b of boxes) if (b.y1 > 0.6 && b.y0 < 1.5 && x > b.x0 - 1.1 && x < b.x1 + 1.1 && z > b.z0 - 1.1 && z < b.z1 + 1.1) { bl = 1; break; }
    flowBlocked[cz * FN + cx] = bl;
  }
}
function updateFlow(px, pz) {
  flowDist.fill(-1);
  let head = 0, tail = 0; const s = cellOf(pz) * FN + cellOf(px);
  flowDist[s] = 0; flowQ[tail++] = s;
  while (head < tail) {
    const c = flowQ[head++], cx = c % FN, cz = (c / FN) | 0, d = flowDist[c] + 1;
    if (cx > 0) { const n = c - 1; if (flowDist[n] < 0 && !flowBlocked[n]) { flowDist[n] = d; flowQ[tail++] = n; } }
    if (cx < FN - 1) { const n = c + 1; if (flowDist[n] < 0 && !flowBlocked[n]) { flowDist[n] = d; flowQ[tail++] = n; } }
    if (cz > 0) { const n = c - FN; if (flowDist[n] < 0 && !flowBlocked[n]) { flowDist[n] = d; flowQ[tail++] = n; } }
    if (cz < FN - 1) { const n = c + FN; if (flowDist[n] < 0 && !flowBlocked[n]) { flowDist[n] = d; flowQ[tail++] = n; } }
  }
}
const flowOut = { x: 0, z: 0 };
function flowDir(x, z, tx, tz) {
  const cx = cellOf(x), cz = cellOf(z), c = cz * FN + cx, here = flowDist[c];
  let best = here < 0 ? 32000 : here, bx = -1, bz = -1;
  if (here > 1 || here < 0) for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) {
    if (!dx && !dz) continue; const nx = cx + dx, nz = cz + dz; if (nx < 0 || nz < 0 || nx >= FN || nz >= FN) continue;
    const d = flowDist[nz * FN + nx]; if (d < 0 || d >= best) continue;
    if (dx && dz && (flowBlocked[cz * FN + nx] || flowBlocked[nz * FN + cx])) continue;
    best = d; bx = nx; bz = nz;
  }
  let ox, oz;
  if (bx < 0) { ox = tx - x; oz = tz - z; } else { ox = -ARENA + (bx + 0.5) * FC - x; oz = -ARENA + (bz + 0.5) * FC - z; }
  const l = Math.hypot(ox, oz) || 1; flowOut.x = ox / l; flowOut.z = oz / l; return flowOut;
}
