// ---------------------------------------------------------------- world
const ARENA = 60;
const boxes = [];      // static colliders {x0,y0,z0,x1,y1,z1}
const pads = [];       // jump pads {x,z,r,mesh}
const GATES = [[-50, -50], [50, -50], [-50, 50], [50, 50]];
const sunDir = V(-0.45, 0.42, -0.78).normalize();
const world = {};

// ---- procedural PBR texture sets: every surface gets albedo + normal (from a height field) + roughness/metalness
function mulberry(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function mkCanvas(s) { const c = document.createElement('canvas'); c.width = c.height = s; return c; }
function cloud(g, s, rnd, alpha, op = 'overlay', cells = [5, 11, 23, 47, 95]) {
  g.save(); g.globalCompositeOperation = op; g.globalAlpha = alpha; g.imageSmoothingEnabled = true;
  for (const n of cells) {
    const c = mkCanvas(n), x = c.getContext('2d'), im = x.createImageData(n, n);
    for (let i = 0; i < n * n; i++) { const v = rnd() * 255; im.data[i * 4] = im.data[i * 4 + 1] = im.data[i * 4 + 2] = v; im.data[i * 4 + 3] = 255; }
    x.putImageData(im, 0, 0); g.drawImage(c, 0, 0, s, s);
  }
  g.restore();
}
function normalFrom(hc, k) {
  const s = hc.width, src = hc.getContext('2d').getImageData(0, 0, s, s).data, out = mkCanvas(s), g = out.getContext('2d'), im = g.createImageData(s, s), d = im.data;
  const H = (x, y) => src[(((y + s) % s) * s + ((x + s) % s)) * 4];
  for (let y = 0; y < s; y++) for (let x = 0; x < s; x++) {
    const nx = (H(x - 1, y) - H(x + 1, y)) / 255 * k, ny = (H(x, y + 1) - H(x, y - 1)) / 255 * k, l = 1 / Math.hypot(nx, ny, 1), i = (y * s + x) * 4;
    d[i] = (nx * l * .5 + .5) * 255; d[i + 1] = (ny * l * .5 + .5) * 255; d[i + 2] = (l * .5 + .5) * 255; d[i + 3] = 255;
  }
  g.putImageData(im, 0, 0); return out;
}
function ormFrom(rc, metal) {
  const s = rc.width, g = rc.getContext('2d'), im = g.getImageData(0, 0, s, s), d = im.data, mc = typeof metal === 'number' ? null : metal.getContext('2d').getImageData(0, 0, s, s).data;
  for (let i = 0; i < d.length; i += 4) { d[i + 1] = d[i]; d[i + 2] = mc ? mc[i] : metal * 255; d[i] = 255; }
  g.putImageData(im, 0, 0); return rc;
}
function toTex(c, srgb, rx = 1, ry = 1) {
  const t = new T.CanvasTexture(c); t.wrapS = t.wrapT = T.RepeatWrapping; t.repeat.set(rx, ry);
  t.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy()); if (srgb) t.encoding = T.sRGBEncoding; return t;
}
function canvasTex(size, draw, rx = 1, ry = 1, srgb = true) { const c = mkCanvas(size); draw(c.getContext('2d'), size); return toTex(c, srgb, rx, ry); }
function pbrSet(size, draw, bump, metal, rx = 1, ry = 1) {
  const mk = m => { const c = mkCanvas(size); draw(c.getContext('2d'), size, m); return c; };
  const a = mk('a'), h = mk('h'), r = mk('r');
  const orm = toTex(ormFrom(r, metal), false, rx, ry);
  return { map: toTex(a, true, rx, ry), normalMap: toTex(normalFrom(h, bump), false, rx, ry), roughnessMap: orm, metalnessMap: orm, roughness: 1, metalness: 1 };
}
const pickM = (m, h, a, r) => m === 'h' ? h : m === 'a' ? a : r;

function drawFloor(g, s, m) {
  const R = mulberry(7), n = 2, c = s / n;
  g.fillStyle = pickM(m, '#808080', '#3a3e47', '#a4a4a4'); g.fillRect(0, 0, s, s);
  if (m === 'a') cloud(g, s, mulberry(11), 0.3, 'overlay', [5, 11, 23]); else if (m === 'r') cloud(g, s, mulberry(12), 0.28, 'overlay', [5, 11, 23]); else cloud(g, s, mulberry(13), 0.07, 'source-over', [95, 190]);
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
    const x = i * c, y = j * c, tread = (i + j) % 2 === 0, v = R(), va = R();
    if (m === 'a') { g.fillStyle = `rgba(${v > .5 ? '255,255,255' : '0,0,0'},${0.03 + va * 0.06})`; g.fillRect(x, y, c, c); }
    if (tread) {
      for (let ty = 16; ty < c - 10; ty += 14) for (let tx = 16; tx < c - 10; tx += 14) {
        g.save(); g.translate(x + tx, y + ty); g.rotate(((tx / 14 + ty / 14) & 1) ? 0.785 : -0.785);
        g.fillStyle = pickM(m, '#cfcfcf', 'rgba(200,205,215,.2)', 'rgba(30,30,30,.55)');
        g.beginPath(); g.ellipse(0, 0, 5.5, 1.9, 0, 0, 7); g.fill(); g.restore();
      }
    } else {
      for (let k = 0; k < 22; k++) {
        const sx = x + 12 + R() * (c - 24), sy = y + 12 + R() * (c - 24), an = R() * 6.28, ln = 15 + R() * 80, ex = clamp(sx + Math.cos(an) * ln, x + 8, x + c - 8), ey = clamp(sy + Math.sin(an) * ln, y + 8, y + c - 8);
        g.strokeStyle = pickM(m, 'rgba(0,0,0,.22)', 'rgba(205,210,220,.2)', 'rgba(255,255,255,.35)'); g.lineWidth = 1; g.beginPath(); g.moveTo(sx, sy); g.lineTo(ex, ey); g.stroke();
      }
      for (const [bx, by] of [[14, 14], [c - 14, 14], [14, c - 14], [c - 14, c - 14], [c / 2, 14], [c / 2, c - 14]]) {
        g.fillStyle = pickM(m, '#e2e2e2', '#8a8f99', '#484848'); g.beginPath(); g.arc(x + bx, y + by, 4, 0, 7); g.fill();
        if (m === 'h') { g.strokeStyle = '#404040'; g.lineWidth = 1.5; g.beginPath(); g.arc(x + bx, y + by, 5.5, 0, 7); g.stroke(); }
      }
    }
    g.strokeStyle = pickM(m, 'rgba(0,0,0,.2)', 'rgba(0,0,0,.2)', 'rgba(255,255,255,.22)'); g.lineWidth = 16; g.strokeRect(x + 8, y + 8, c - 16, c - 16);
    g.strokeStyle = pickM(m, '#161616', 'rgba(6,6,8,.95)', '#dcdcdc'); g.lineWidth = 4; g.strokeRect(x + 2, y + 2, c - 4, c - 4);
  }
  for (let k = 0; k < 7; k++) {
    const bx = 70 + R() * (s - 140), by = 70 + R() * (s - 140), br = 22 + R() * 45, oil = R() < 0.6;
    if (m === 'h') continue;
    const gr = g.createRadialGradient(bx, by, 0, bx, by, br);
    gr.addColorStop(0, m === 'a' ? (oil ? 'rgba(12,12,16,.55)' : 'rgba(78,40,18,.5)') : (oil ? 'rgba(8,8,8,.95)' : 'rgba(235,235,235,.6)')); gr.addColorStop(0.6, m === 'a' ? (oil ? 'rgba(12,12,16,.3)' : 'rgba(78,40,18,.2)') : (oil ? 'rgba(8,8,8,.6)' : 'rgba(235,235,235,.25)')); gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr; g.save(); g.translate(bx, by); g.scale(1, 0.55 + R() * 0.5); g.translate(-bx, -by); g.fillRect(bx - br, by - br * 2, br * 2, br * 4); g.restore();
  }
  if (m !== 'h') {
    const W = mulberry(5); g.save(); g.beginPath(); g.rect(c + 12, c + 12, c - 24, 16); g.clip();
    for (let k = -20; k < c; k += 28) { g.fillStyle = m === 'a' ? 'rgba(214,160,32,.85)' : 'rgba(170,170,170,.8)'; g.beginPath(); g.moveTo(c + k, c + 28); g.lineTo(c + k + 14, c + 28); g.lineTo(c + k + 30, c + 12); g.lineTo(c + k + 16, c + 12); g.fill(); }
    g.restore();
    if (m === 'a') for (let k = 0; k < 260; k++) { g.fillStyle = 'rgba(60,62,70,.9)'; g.fillRect(c + 12 + W() * (c - 24), c + 12 + W() * 16, 1 + W() * 3, 1 + W() * 2); }
  }
}
function drawWall(g, s, m) {
  const R = mulberry(21);
  g.fillStyle = pickM(m, '#808080', '#6a707e', '#909090'); g.fillRect(0, 0, s, s);
  if (m === 'a') cloud(g, s, mulberry(31), 0.25, 'overlay', [5, 11, 23]); else if (m === 'r') cloud(g, s, mulberry(32), 0.25, 'overlay', [5, 11, 23]); else cloud(g, s, mulberry(33), 0.05, 'source-over', [95, 190]);
  // raised inner plate
  g.fillStyle = pickM(m, '#989898', 'rgba(255,255,255,.05)', 'rgba(0,0,0,.08)'); g.fillRect(22, 22, s - 44, s - 44);
  g.strokeStyle = pickM(m, '#b8b8b8', 'rgba(215,220,230,.25)', 'rgba(20,20,20,.6)'); g.lineWidth = 3; g.strokeRect(23, 23, s - 46, s - 46);
  // louvred vent
  for (let y = 300; y < 430; y += 14) {
    if (m === 'h') { const gr = g.createLinearGradient(0, y, 0, y + 14); gr.addColorStop(0, '#d0d0d0'); gr.addColorStop(1, '#202020'); g.fillStyle = gr; } else g.fillStyle = m === 'a' ? ((y / 14) & 1 ? '#15171c' : '#23262d') : '#b0b0b0';
    g.fillRect(60, y, 170, 14);
  }
  g.strokeStyle = pickM(m, '#303030', '#0c0d10', '#707070'); g.lineWidth = 4; g.strokeRect(58, 298, 174, 134);
  // conduit pipes
  for (const px of [372, 412]) {
    if (m === 'h') { const gr = g.createLinearGradient(px, 0, px + 26, 0); gr.addColorStop(0, '#505050'); gr.addColorStop(.5, '#ffffff'); gr.addColorStop(1, '#505050'); g.fillStyle = gr; } else g.fillStyle = m === 'a' ? '#4a4e58' : '#585858';
    g.fillRect(px, 0, 26, s);
    for (const cy of [90, 330]) { g.fillStyle = pickM(m, '#ffffff', '#30333a', '#808080'); g.fillRect(px - 4, cy, 34, 16); }
  }
  // access hatch + bolts
  g.strokeStyle = pickM(m, '#2a2a2a', 'rgba(8,8,10,.9)', '#d0d0d0'); g.lineWidth = 3; g.strokeRect(70, 70, 230, 170);
  for (let k = 0; k < 14; k++) { const a = k / 14, bx = k < 7 ? 80 + k * 35 : 80 + (k - 7) * 35, by = k < 7 ? 80 : 230; g.fillStyle = pickM(m, '#dadada', '#8c919c', '#484848'); g.beginPath(); g.arc(bx, by, 3.5, 0, 7); g.fill(); }
  if (m === 'a') {
    g.fillStyle = 'rgba(214,120,32,.85)'; g.fillRect(84, 150, 200, 20); g.fillStyle = 'rgba(225,228,235,.8)'; g.font = 'bold 34px monospace'; g.fillText('H-07', 92, 136);
    const gr = g.createLinearGradient(0, s * .6, 0, s); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,.45)'); g.fillStyle = gr; g.fillRect(0, 0, s, s);
  }
  // drips, scratches, frame seam
  for (let k = 0; k < 16; k++) {
    const dx = 20 + R() * (s - 40), dy = R() * s * 0.6, dl = 40 + R() * 160, dw = 2 + R() * 5;
    if (m === 'h') continue; const gr = g.createLinearGradient(0, dy, 0, dy + dl);
    gr.addColorStop(0, m === 'a' ? 'rgba(20,14,10,.4)' : 'rgba(240,240,240,.4)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(dx, dy, dw, dl);
  }
  for (let k = 0; k < 40; k++) {
    const sx = R() * s, sy = R() * s, an = R() * 6.28, ln = 10 + R() * 60;
    g.strokeStyle = pickM(m, 'rgba(0,0,0,.18)', 'rgba(215,220,230,.16)', 'rgba(30,30,30,.4)'); g.lineWidth = 1; g.beginPath(); g.moveTo(sx, sy); g.lineTo(sx + Math.cos(an) * ln, sy + Math.sin(an) * ln); g.stroke();
  }
  g.strokeStyle = pickM(m, '#141414', 'rgba(6,6,8,.95)', '#e0e0e0'); g.lineWidth = 5; g.strokeRect(2.5, 2.5, s - 5, s - 5);
}
function drawCrate(g, s, m) {
  const R = mulberry(41);
  g.fillStyle = pickM(m, '#808080', '#2f6f73', '#a0a0a0'); g.fillRect(0, 0, s, s);
  if (m === 'a') cloud(g, s, mulberry(51), 0.3, 'overlay', [5, 11, 23]); else if (m === 'r') cloud(g, s, mulberry(52), 0.25, 'overlay', [5, 11, 23]);
  for (let x = 20; x < s - 20; x += 20) {
    if (m === 'h') { const gr = g.createLinearGradient(x, 0, x + 20, 0); gr.addColorStop(0, '#404040'); gr.addColorStop(.5, '#c8c8c8'); gr.addColorStop(1, '#404040'); g.fillStyle = gr; g.fillRect(x, 20, 20, s - 40); }
    else if (m === 'a') { g.fillStyle = 'rgba(0,0,0,.16)'; g.fillRect(x, 20, 3, s - 40); g.fillStyle = 'rgba(255,255,255,.07)'; g.fillRect(x + 9, 20, 3, s - 40); }
  }
  g.fillStyle = pickM(m, '#e0e0e0', '#274f55', '#808080'); for (const [x, y, w, h] of [[0, 0, s, 20], [0, s - 20, s, 20], [0, 0, 20, s], [s - 20, 0, 20, s]]) g.fillRect(x, y, w, h);
  if (m === 'a') { g.fillStyle = 'rgba(230,232,236,.8)'; g.fillRect(40, 60, 90, 44); g.fillStyle = '#1b1d22'; g.font = 'bold 20px monospace'; g.fillText('FORGE', 50, 80); g.fillText('UN 1978', 44, 99); }
  for (let k = 0; k < 90; k++) {
    const x = R() * s, y = R() * s, w = 2 + R() * 9, h = 2 + R() * 6;
    g.fillStyle = pickM(m, 'rgba(0,0,0,.25)', k % 3 ? 'rgba(150,155,165,.9)' : 'rgba(96,52,24,.9)', 'rgba(40,40,40,.9)'); g.fillRect(x, y, w, h);
  }
  if (m === 'a') { const gr = g.createLinearGradient(0, s * .55, 0, s); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,.4)'); g.fillStyle = gr; g.fillRect(0, 0, s, s); }
  g.strokeStyle = pickM(m, '#202020', 'rgba(0,0,0,.8)', '#d0d0d0'); g.lineWidth = 3; g.strokeRect(1.5, 1.5, s - 3, s - 3);
}
function drawMetal(g, s, m) {
  const R = mulberry(61);
  g.fillStyle = pickM(m, '#808080', '#ffffff', '#787878'); g.fillRect(0, 0, s, s);
  if (m === 'a') cloud(g, s, mulberry(71), 0.12, 'overlay', [5, 11]); else if (m === 'r') cloud(g, s, mulberry(72), 0.22, 'overlay', [5, 11, 23]); else cloud(g, s, mulberry(73), 0.05, 'source-over', [47, 95]);
  for (let k = 0; k < 70; k++) {
    const sx = R() * s, sy = R() * s, an = R() * 6.28, ln = 8 + R() * 70;
    g.strokeStyle = pickM(m, 'rgba(0,0,0,.3)', 'rgba(255,255,255,.25)', 'rgba(255,255,255,.4)'); g.lineWidth = 1; g.beginPath(); g.moveTo(sx, sy); g.lineTo(sx + Math.cos(an) * ln, sy + Math.sin(an) * ln); g.stroke();
  }
  g.strokeStyle = pickM(m, '#303030', 'rgba(0,0,0,.6)', '#c0c0c0'); g.lineWidth = 2; g.strokeRect(s * .12, s * .12, s * .76, s * .76); g.beginPath(); g.moveTo(0, s / 2); g.lineTo(s * .12, s / 2); g.moveTo(s * .88, s / 2); g.lineTo(s, s / 2); g.stroke();
}

const floorGlow = canvasTex(512, (g, s) => {
  g.fillStyle = '#000'; g.fillRect(0, 0, s, s);
  g.fillStyle = '#fff'; for (const [x, y] of [[0, 0], [s, 0], [0, s], [s, s]]) { g.beginPath(); g.arc(x, y, 9, 0, 7); g.fill(); }
  g.fillRect(s / 2 - 30, s / 2 - 2, 60, 4);
}, 30, 30, false);
const PBR = { floor: pbrSet(512, drawFloor, 3.2, 0.6, 30, 30), wall: pbrSet(512, drawWall, 3.0, 0.3), crate: pbrSet(256, drawCrate, 2.6, 0.2), metal: pbrSet(256, drawMetal, 1.4, 0.85) };
const matFloor = new T.MeshStandardMaterial({ ...PBR.floor, normalScale: new T.Vector2(1.1, 1.1), emissiveMap: floorGlow, emissive: lin(0xff7a30, GLOW * 1.3), envMapIntensity: 0.55 });
const matPanel = new T.MeshStandardMaterial({ ...PBR.wall, color: lin(0x8e94a6), envMapIntensity: 0.5 });
const matPlat = new T.MeshStandardMaterial({ ...PBR.wall, color: lin(0x7888ac), envMapIntensity: 0.5 });
const matCrate = new T.MeshStandardMaterial({ ...PBR.crate, envMapIntensity: 0.5 });
const matTrim = new T.MeshStandardMaterial({ ...PBR.metal, color: lin(0x5a606e), envMapIntensity: 0.7 });
const glowMats = {};
const glowMat = c => glowMats[c] || (glowMats[c] = new T.MeshBasicMaterial({ color: lin(c, GLOW) }));
const GEO = {
  box: new T.BoxGeometry(1, 1, 1), sphere: new T.SphereGeometry(1, 32, 22), sphereLo: new T.SphereGeometry(1, 12, 9),
  cyl: new T.CylinderGeometry(1, 1, 1, 28), octa: new T.OctahedronGeometry(1, 0), cone: new T.ConeGeometry(1, 1, 14),
  torus: new T.TorusGeometry(1, 0.08, 10, 40), torusThin: new T.TorusGeometry(1, 0.03, 8, 56), ring: new T.RingGeometry(0.86, 1, 48),
  disc: new T.CircleGeometry(1, 40)
};

function uvBox(w, h, d, s) {
  const g = new T.BoxGeometry(w, h, d), uv = g.attributes.uv;
  const dims = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
  for (let f = 0; f < 6; f++) for (let i = 0; i < 4; i++) {
    const k = f * 4 + i; uv.setXY(k, uv.getX(k) * dims[f][0] / s, uv.getY(k) * dims[f][1] / s);
  }
  return g;
}
// soft contact shadow painted on the deck around anything that stands on it (9-sliced so the falloff stays even)
const aoTex = canvasTex(128, (g, s) => { g.shadowColor = '#000'; g.shadowBlur = 26; g.fillStyle = '#000'; g.fillRect(32, 32, 64, 64); g.fillRect(32, 32, 64, 64); }, 1, 1, false);
const matAO = new T.MeshBasicMaterial({ map: aoTex, transparent: true, depthWrite: false, opacity: 0.8, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
function aoSkirt(x, y, z, w, d) {
  const m = 1.5, g = new T.PlaneGeometry(1, 1, 3, 3), ps = g.attributes.position, uv = g.attributes.uv;
  const xs = [-w / 2 - m, -w / 2, w / 2, w / 2 + m], zs = [d / 2 + m, d / 2, -d / 2, -d / 2 - m], us = [0, .25, .75, 1];
  for (let j = 0; j < 4; j++) for (let i = 0; i < 4; i++) { const k = j * 4 + i; ps.setXYZ(k, xs[i], zs[j], 0); uv.setXY(k, us[i], 1 - us[j]); }
  const mesh = new T.Mesh(g, matAO); mesh.rotation.x = -Math.PI / 2; mesh.position.set(x, y + 0.012, z); mesh.renderOrder = 1; scene.add(mesh);
}
function addBox(x, y, z, w, h, d, mat, trim, texScale = 4, dress = true) {
  const m = new T.Mesh(uvBox(w, h, d, texScale), mat);
  m.position.set(x, y + h / 2, z); m.castShadow = true; m.receiveShadow = true; scene.add(m);
  boxes.push({ x0: x - w / 2, x1: x + w / 2, y0: y, y1: y + h, z0: z - d / 2, z1: z + d / 2 });
  aoSkirt(x, y, z, w, d);
  if (dress) {
    const base = new T.Mesh(GEO.box, matTrim); base.scale.set(w + 0.28, 0.16, d + 0.28); base.position.set(x, y + 0.08, z); base.castShadow = base.receiveShadow = true; scene.add(base);
    const cap = new T.Mesh(GEO.box, matTrim); cap.scale.set(w + 0.14, 0.09, d + 0.14); cap.position.set(x, y + h - 0.04, z); cap.castShadow = cap.receiveShadow = true; scene.add(cap);
  }
  if (trim) {
    const gm = glowMat(trim), t = 0.05, o = 0.025, yy = y + h - 0.16;
    for (const [px, pz, sx, sz] of [[x, z - d / 2 - o, w - 0.3, t], [x, z + d / 2 + o, w - 0.3, t], [x - w / 2 - o, z, t, d - 0.3], [x + w / 2 + o, z, t, d - 0.3]]) {
      const s = new T.Mesh(GEO.box, gm); s.position.set(px, yy, pz); s.scale.set(sx, t, sz); scene.add(s);
    }
  }
  return m;
}

function buildWorld() {
  // sky: HDR so the sun drives bloom, reflections and the lens flare
  const skyMat = new T.ShaderMaterial({
    side: T.BackSide, depthWrite: false, fog: false, uniforms: { uSun: { value: sunDir }, uTime: { value: 0 } },
    vertexShader: 'varying vec3 vDir; void main(){ vDir=normalize(position); gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
    fragmentShader: `
      uniform vec3 uSun; uniform float uTime; varying vec3 vDir;
      float hash(vec3 p){ p=fract(p*0.3183099+.1); p*=17.0; return fract(p.x*p.y*p.z*(p.x+p.y+p.z)); }
      float noise(vec3 x){ vec3 i=floor(x), f=fract(x); f=f*f*(3.0-2.0*f);
        return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x), mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),
                   mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x), mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z); }
      float fbm(vec3 p){ float a=.5,s=0.; for(int i=0;i<5;i++){ s+=a*noise(p); p*=2.03; a*=.5; } return s; }
      void main(){
        vec3 d=normalize(vDir);
        vec3 col=mix(vec3(0.004,0.003,0.010), vec3(0.030,0.012,0.045), smoothstep(-0.3,0.6,d.y));
        float n=fbm(d*3.0+vec3(0.0,uTime*0.008,0.0));
        col+=vec3(0.30,0.05,0.34)*pow(n,3.2)*0.9;
        col+=vec3(0.03,0.16,0.30)*pow(fbm(d*5.0+7.0),4.0)*1.3;
        col+=vec3(0.5,0.22,0.08)*pow(fbm(d*2.0-3.0),5.0)*0.8;
        float sd=max(dot(d,uSun),0.0);
        col+=vec3(1.0,0.45,0.15)*pow(sd,12.0)*0.22;
        col+=vec3(1.0,0.7,0.35)*pow(sd,220.0)*0.5;
        float disc=smoothstep(0.99905,0.99925,sd);
        col=mix(col, vec3(14.0,9.5,5.0)*(0.8+0.4*fbm(d*90.0+uTime*0.05)), disc);
        gl_FragColor=vec4(col,1.0);
        #include <encodings_fragment>
      }`
  });
  const sky = new T.Mesh(new T.SphereGeometry(800, 48, 28), skyMat);
  scene.add(sky); world.sky = sky;
  const sp = new Float32Array(2600 * 3);
  for (let i = 0; i < 2600; i++) { tmpA.set(rand(-1, 1), rand(-0.3, 1), rand(-1, 1)).normalize().multiplyScalar(700); sp.set([tmpA.x, tmpA.y, tmpA.z], i * 3); }
  const sg = new T.BufferGeometry(); sg.setAttribute('position', new T.BufferAttribute(sp, 3));
  scene.add(new T.Points(sg, new T.PointsMaterial({ color: lin(0xcfd8ff, HDR ? 1.6 : 1), size: 1.5, sizeAttenuation: false, fog: false, depthWrite: false })));

  // colossal forge rings around the deck
  world.rings = [];
  const ringDefs = [[150, 1.25, 0.2, 0xff7a30], [190, 1.05, -0.35, 0x8a4dff]];
  for (const [r, tx, tz, c] of ringDefs) {
    const m = new T.Mesh(new T.TorusGeometry(r, 1.6, 10, 160), new T.MeshBasicMaterial({ color: lin(c, GLOW * 0.8), fog: false }));
    m.rotation.set(tx, 0, tz); m.position.y = -20; scene.add(m); world.rings.push(m);
  }

  // image-based lighting: prefilter the sky (plus the big emitters) into an environment map so metal reflects its surroundings
  try {
    const env = new T.Scene(); env.add(new T.Mesh(sky.geometry, skyMat));
    for (const [r, tx, tz, c] of ringDefs) { const m = new T.Mesh(new T.TorusGeometry(r, 4, 6, 60), new T.MeshBasicMaterial({ color: lin(c, 6) })); m.rotation.set(tx, 0, tz); m.position.y = -20; env.add(m); }
    const glow = new T.Mesh(GEO.sphere, new T.MeshBasicMaterial({ color: lin(0xffb060, 8) })); glow.scale.setScalar(6); glow.position.set(0, 7, -40); env.add(glow);
    const deck = new T.Mesh(new T.CircleGeometry(700, 24), new T.MeshBasicMaterial({ color: new T.Color(0.02, 0.02, 0.026) })); deck.rotation.x = -Math.PI / 2; deck.position.y = -3; env.add(deck);
    const pm = new T.PMREMGenerator(renderer); scene.environment = pm.fromScene(env, 0.01, 1, 1000).texture; pm.dispose();
  } catch (e) { console.warn('environment map unavailable', e); }

  // lights
  scene.add(new T.HemisphereLight(lin(0x8f9cff), lin(0x4a3020), 0.85));
  const sun = world.sun = new T.DirectionalLight(lin(0xffd9b4), 1.9);
  sun.position.copy(sunDir).multiplyScalar(120); sun.castShadow = true;
  sun.shadow.mapSize.set(4096, 4096); sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.03; sun.shadow.radius = 2.5;
  const sc = sun.shadow.camera; sc.left = -52; sc.right = 52; sc.top = 52; sc.bottom = -52; sc.near = 20; sc.far = 240;
  scene.add(sun); scene.add(sun.target);

  // deck
  const floor = new T.Mesh(new T.PlaneGeometry(ARENA * 2, ARENA * 2), matFloor);
  floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);
  const WH = 9;
  addBox(0, 0, -ARENA - 1, ARENA * 2 + 4, WH, 2, matPanel, 0xff7a30, 4, false);
  addBox(0, 0, ARENA + 1, ARENA * 2 + 4, WH, 2, matPanel, 0xff7a30, 4, false);
  addBox(-ARENA - 1, 0, 0, 2, WH, ARENA * 2, matPanel, 0xff7a30, 4, false);
  addBox(ARENA + 1, 0, 0, 2, WH, ARENA * 2, matPanel, 0xff7a30, 4, false);
  // buttresses break up the long walls
  for (let k = -50; k <= 50; k += 20) for (const s of [-1, 1]) {
    for (const [bx, bz, bw, bd] of [[k, s * (ARENA - 0.35), 1.6, 0.7], [s * (ARENA - 0.35), k, 0.7, 1.6]]) {
      const b = new T.Mesh(uvBox(bw, WH, bd, 4), matTrim); b.position.set(bx, WH / 2, bz); b.castShadow = b.receiveShadow = true; scene.add(b);
    }
  }

  // reactor core
  addBox(0, 0, 0, 7, 2.4, 7, matPlat, 0x4de1ff);
  const core = new T.Mesh(GEO.sphere, new T.MeshBasicMaterial({ color: lin(0xffb060, GLOW * 1.6) }));
  core.position.set(0, 7, 0); core.scale.setScalar(1.9); scene.add(core); world.core = core;
  world.coreRings = [];
  for (let i = 0; i < 3; i++) {
    const r = new T.Mesh(GEO.torusThin, new T.MeshStandardMaterial({ ...PBR.metal, color: lin(0xb9c4d8), emissive: lin(0x2fb4d6, 0.6) })); r.scale.setScalar(2.9 + i * 0.7); r.position.copy(core.position); r.castShadow = true; scene.add(r); world.coreRings.push(r);
  }
  for (const [px, pz] of [[2.6, 2.6], [-2.6, 2.6], [2.6, -2.6], [-2.6, -2.6]]) { const p = new T.Mesh(GEO.cyl, matTrim); p.scale.set(0.22, 3.2, 0.22); p.position.set(px, 4, pz); p.castShadow = true; scene.add(p); const tip = new T.Mesh(GEO.sphere, glowMat(0x4de1ff)); tip.scale.setScalar(0.16); tip.position.set(px, 5.7, pz); scene.add(tip); }
  const beam = new T.Mesh(new T.CylinderGeometry(0.35, 0.35, 400, 12, 1, true), new T.MeshBasicMaterial({ color: lin(0xff9040, GLOW * 0.6), transparent: true, opacity: 0.35, blending: T.AdditiveBlending, depthWrite: false, fog: false }));
  beam.position.set(0, 207, 0); scene.add(beam); world.beam = beam;
  world.coreLight = new T.PointLight(lin(0xff9a50), 6, 60, 2); world.coreLight.position.set(0, 7, 0); scene.add(world.coreLight);

  // platforms, towers, pillars, cover
  for (const [sx, sz] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) {
    addBox(sx * 22, 0, sz * 22, 10, 1.5, 10, matPlat, 0x4de1ff);
    addBox(sx * 25, 1.5, sz * 25, 4, 3, 4, matPlat, 0x4de1ff);
    addBox(sx * 38, 0, sz * 12, 3, 8, 3, matPanel, 0xb36bff);
    addBox(sx * 12, 0, sz * 38, 3, 8, 3, matPanel, 0xb36bff);
    addBox(sx * 34, 0, sz * 34, 8, 1.4, 1.2, matPanel, 0xff7a30);
    addBox(sx * 10, 0, sz * 14, 1.2, 1.4, 7, matPanel, 0xff7a30);
    addBox(sx * 46, 0, sz * 30, 2.4, 2.4, 2.4, matCrate, 0, 2.4, false);
    addBox(sx * 46, 0, sz * 27.4, 2.4, 1.6, 2.4, matCrate, 0, 2.4, false);
    addBox(sx * 30, 0, sz * 47, 2.4, 2.4, 2.4, matCrate, 0, 2.4, false);
    addBox(sx * 32.6, 0, sz * 47, 2.4, 1.2, 2.4, matCrate, 0, 2.4, false);
    const pl = new T.PointLight(lin(sx * sz > 0 ? 0x4de1ff : 0xff7a30), 4.5, 36, 2); pl.position.set(sx * 22, 6.5, sz * 22); scene.add(pl);
  }
  addBox(0, 0, 26, 12, 1.4, 1.2, matPanel, 0xff7a30); addBox(0, 0, -26, 12, 1.4, 1.2, matPanel, 0xff7a30);
  addBox(26, 0, 0, 1.2, 1.4, 12, matPanel, 0xff7a30); addBox(-26, 0, 0, 1.2, 1.4, 12, matPanel, 0xff7a30);

  // jump pads
  for (const [x, z] of [[42, 0], [-42, 0], [0, 42], [0, -42]]) {
    const d = new T.Mesh(GEO.cyl, matTrim);
    d.scale.set(1.9, 0.12, 1.9); d.position.set(x, 0.06, z); d.receiveShadow = true; scene.add(d);
    const r = new T.Mesh(GEO.ring, new T.MeshBasicMaterial({ color: lin(0x5dffa0, GLOW), side: T.DoubleSide }));
    r.rotation.x = -Math.PI / 2; r.position.set(x, 0.14, z); r.scale.setScalar(1.7); scene.add(r);
    const a = new T.Mesh(GEO.cone, glowMat(0x5dffa0)); a.scale.set(0.5, 0.9, 0.5); a.position.set(x, 1.2, z); scene.add(a);
    pads.push({ x, z, r: 1.9, ring: r, arrow: a });
  }
  // spawn gates
  world.gates = [];
  for (const [x, z] of GATES) {
    const frame = new T.Mesh(new T.TorusGeometry(1, 0.11, 12, 48), matTrim); frame.scale.setScalar(2.75); frame.position.set(x, 2.8, z); frame.rotation.y = Math.atan2(x, z); frame.castShadow = true; scene.add(frame);
    const g = new T.Mesh(GEO.torusThin, glowMat(0xff3d6e)); g.scale.setScalar(2.55); g.position.set(x, 2.8, z);
    g.rotation.y = Math.atan2(x, z); scene.add(g);
    const d = new T.Mesh(GEO.disc, new T.MeshBasicMaterial({ color: lin(0xff3d6e, GLOW), transparent: true, opacity: 0.16, side: T.DoubleSide, depthWrite: false, blending: T.AdditiveBlending }));
    d.scale.setScalar(2.5); d.position.copy(g.position); d.rotation.y = g.rotation.y; scene.add(d);
    const pl = new T.PointLight(lin(0xff3d6e), 3.5, 24, 2); pl.position.set(x, 3, z); scene.add(pl);
    world.gates.push({ ring: g, disc: d, pulse: 0 });
  }
}

// ---------------------------------------------------------------- collision + queries
function groundAt(x, z, y) {
  let g = 0;
  for (let i = 0; i < boxes.length; i++) { const b = boxes[i]; if (x > b.x0 && x < b.x1 && z > b.z0 && z < b.z1 && b.y1 <= y + 0.6 && b.y1 > g) g = b.y1; }
  return g;
}
// ray vs static world; returns distance (<= maxT) and leaves the surface normal in rayN
const rayN = V();
function rayWorld(o, d, maxT) {
  let t = maxT; rayN.set(0, 0, 0);
  if (d.y < -1e-6) { const tg = -o.y / d.y; if (tg > 0 && tg < t) { t = tg; rayN.set(0, 1, 0); } }
  for (let i = 0; i < boxes.length; i++) {
    const b = boxes[i]; let t0 = 0, t1 = t, ax = -1, a, c, inv;
    inv = 1 / d.x; a = (b.x0 - o.x) * inv; c = (b.x1 - o.x) * inv; if (a > c) { const s = a; a = c; c = s; } if (a > t0) { t0 = a; ax = 0; } if (c < t1) t1 = c; if (t0 > t1) continue;
    inv = 1 / d.y; a = (b.y0 - o.y) * inv; c = (b.y1 - o.y) * inv; if (a > c) { const s = a; a = c; c = s; } if (a > t0) { t0 = a; ax = 1; } if (c < t1) t1 = c; if (t0 > t1) continue;
    inv = 1 / d.z; a = (b.z0 - o.z) * inv; c = (b.z1 - o.z) * inv; if (a > c) { const s = a; a = c; c = s; } if (a > t0) { t0 = a; ax = 2; } if (c < t1) t1 = c; if (t0 > t1) continue;
    if (t0 < t) { t = t0; rayN.set(ax === 0 ? (d.x > 0 ? -1 : 1) : 0, ax === 1 ? (d.y > 0 ? -1 : 1) : 0, ax === 2 ? (d.z > 0 ? -1 : 1) : 0); }
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
