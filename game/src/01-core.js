'use strict';
const T = THREE;
const $ = id => document.getElementById(id);
const rand = (a = 1, b) => b === undefined ? Math.random() * a : a + Math.random() * (b - a);
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const damp = (a, b, k, dt) => a + (b - a) * (1 - Math.exp(-k * dt));
const pick = arr => arr[(Math.random() * arr.length) | 0];
const V = (x = 0, y = 0, z = 0) => new T.Vector3(x, y, z);
const tmpA = V(), tmpB = V(), tmpC = V();

// ---------------------------------------------------------------- renderer
const canvas = $('c');
const renderer = new T.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
let pixelRatio = Math.min(window.devicePixelRatio || 1, 1.5);
renderer.setPixelRatio(pixelRatio);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = T.PCFSoftShadowMap;
const scene = new T.Scene();
scene.fog = new T.FogExp2(0x0b0716, 0.0062);
const camera = new T.PerspectiveCamera(78, 1, 0.08, 900);
camera.rotation.order = 'YXZ';
scene.add(camera);

// post-processing (falls back to plain rendering when the helper scripts are unavailable)
let composer = null, bloomPass = null, fxaaPass = null, finalPass = null;
const FinalShader = {
  uniforms: { tDiffuse: { value: null }, uDamage: { value: 0 }, uOD: { value: 0 }, uTime: { value: 0 } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
  fragmentShader: `
    uniform sampler2D tDiffuse; uniform float uDamage, uOD, uTime; varying vec2 vUv;
    float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233)))*43758.5453); }
    void main(){
      vec2 c = vUv - 0.5; float d = dot(c,c);
      float ca = 0.0015 + uDamage*0.012 + uOD*0.004;
      vec3 col = vec3(texture2D(tDiffuse, vUv + c*ca).r, texture2D(tDiffuse, vUv).g, texture2D(tDiffuse, vUv - c*ca).b);
      col *= 1.0 - d*0.85;
      col = mix(col, col*vec3(1.0,0.45,0.4) + vec3(0.5,0.0,0.05)*d*2.5, clamp(uDamage,0.0,1.0));
      col = mix(col, col*vec3(0.75,1.05,1.35) + vec3(0.0,0.05,0.12)*d*3.0, uOD*0.6);
      col += (h(vUv*800.0 + uTime) - 0.5)*0.035;
      col = pow(max(col, 0.0), vec3(0.92));
      gl_FragColor = vec4(col, 1.0);
    }`
};
if (T.EffectComposer && T.UnrealBloomPass && T.ShaderPass) {
  composer = new T.EffectComposer(renderer);
  composer.addPass(new T.RenderPass(scene, camera));
  bloomPass = new T.UnrealBloomPass(new T.Vector2(256, 256), 0.72, 0.5, 0.8);
  composer.addPass(bloomPass);
  if (T.FXAAShader) { fxaaPass = new T.ShaderPass(T.FXAAShader); composer.addPass(fxaaPass); }
  finalPass = new T.ShaderPass(FinalShader);
  composer.addPass(finalPass);
}
function resize() {
  const w = window.innerWidth, h = window.innerHeight;
  renderer.setPixelRatio(pixelRatio);
  renderer.setSize(w, h, false);
  camera.aspect = w / h; camera.updateProjectionMatrix();
  if (typeof particles !== 'undefined' && particles) particles.material.uniforms.uScale.value = h * 0.9;
  if (composer) {
    composer.setPixelRatio(pixelRatio); composer.setSize(w, h);
    if (fxaaPass) fxaaPass.material.uniforms.resolution.value.set(1 / (w * pixelRatio), 1 / (h * pixelRatio));
  }
}
window.addEventListener('resize', resize);

// ---------------------------------------------------------------- game state
const G = {
  state: 'menu', phase: 'idle', phaseT: 0, wave: 0, score: 0, kills: 0, combo: 0, comboT: 0,
  queue: [], spawnT: 0, time: 0, slowT: 0, od: 0, odT: 0, shots: 0, hits: 0, best: 0,
  multiT: 0, multiN: 0, sens: 1, freeLook: false, everLocked: false, perkGuard: 0
};
try { G.best = +(localStorage.getItem('helios-best') || 0); G.sens = +(localStorage.getItem('helios-sens') || 1) || 1; } catch (e) {}
const mods = {};
function resetMods() {
  Object.assign(mods, { dmg: 1, rate: 1, speed: 1, dashCd: 1, mag: 1, crit: 2, lifesteal: 0, volatile: 0, arc: 0, airJumps: 1, magnet: 4.5, drop: 1, shieldRegen: 1 });
}
resetMods();

// ---------------------------------------------------------------- input
const keys = {}, pressed = {};
const mouse = { l: false, r: false, dx: 0, dy: 0 };
window.addEventListener('keydown', e => {
  if (e.code === 'Space' || e.code === 'Tab' || e.code.startsWith('Arrow')) e.preventDefault();
  if (!keys[e.code]) pressed[e.code] = true;
  keys[e.code] = true;
  onKey(e.code);
});
window.addEventListener('keyup', e => { keys[e.code] = false; });
window.addEventListener('blur', () => { for (const k in keys) keys[k] = false; mouse.l = mouse.r = false; });
canvas.addEventListener('contextmenu', e => e.preventDefault());
document.addEventListener('contextmenu', e => { if (G.state === 'playing') e.preventDefault(); });
