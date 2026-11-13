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
scene.fog = new T.FogExp2(0x000000, 0.0048); scene.fog.color.setRGB(0.014, 0.008, 0.022);
const camera = new T.PerspectiveCamera(78, 1, 0.08, 900);
camera.rotation.order = 'YXZ';
scene.add(camera);

// HDR pipeline: render to half-float, bloom the over-bright values, then ACES tone map + sRGB in the final pass
const HDR = !!(renderer.capabilities.isWebGL2 && renderer.extensions.get('EXT_color_buffer_float'));
const GLOW = HDR ? 3.2 : 1;
const lin = (hex, k = 1) => new T.Color(hex).convertSRGBToLinear().multiplyScalar(k);
let composer = null, bloomPass = null, fxaaPass = null, finalPass = null;
const FinalShader = {
  uniforms: { tDiffuse: { value: null }, uDamage: { value: 0 }, uOD: { value: 0 }, uTime: { value: 0 }, uSun: { value: new T.Vector2(0.5, 0.5) }, uSunVis: { value: 0 }, uAspect: { value: 1 }, uExposure: { value: 0.78 } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
  fragmentShader: `
    uniform sampler2D tDiffuse; uniform float uDamage, uOD, uTime, uSunVis, uAspect, uExposure; uniform vec2 uSun; varying vec2 vUv;
    float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233)))*43758.5453); }
    vec3 aces(vec3 x){ return clamp((x*(2.51*x+0.03))/(x*(2.43*x+0.59)+0.14), 0.0, 1.0); }
    void main(){
      vec2 c = vUv - 0.5; float d = dot(c,c);
      float ca = 0.0008 + d*0.004 + uDamage*0.012 + uOD*0.004;
      vec3 col = vec3(texture2D(tDiffuse, vUv + c*ca).r, texture2D(tDiffuse, vUv).g, texture2D(tDiffuse, vUv - c*ca).b);
      // sun lens flare: core glow, anamorphic streak, ghosts mirrored through the frame centre
      vec2 sp = vUv - uSun; sp.x *= uAspect; float sd = length(sp);
      vec3 fl = vec3(1.0,0.78,0.5) * (0.0016/(sd*sd*30.0+0.008));
      fl += vec3(1.0,0.62,0.35) * exp(-abs(sp.y)*110.0) * exp(-abs(sp.x)*3.0) * 0.14;
      vec2 ax = uSun - 0.5;
      vec2 q1 = vUv - (0.5 - ax*0.45); q1.x *= uAspect; fl += vec3(0.25,0.6,1.0) * smoothstep(0.075,0.055,length(q1)) * 0.035;
      vec2 q2 = vUv - (0.5 - ax*0.9);  q2.x *= uAspect; fl += vec3(1.0,0.5,0.3) * smoothstep(0.04,0.03,length(q2)) * 0.05;
      vec2 q3 = vUv - (0.5 - ax*1.5);  q3.x *= uAspect; fl += vec3(0.6,0.4,1.0) * smoothstep(0.13,0.11,length(q3)) * 0.02;
      col += fl * uSunVis;
      col = mix(col, col*vec3(1.0,0.4,0.35) + vec3(0.35,0.0,0.03)*d*2.5, clamp(uDamage,0.0,1.0));
      col = mix(col, col*vec3(0.7,1.05,1.4) + vec3(0.0,0.03,0.08)*d*3.0, uOD*0.6);
      col = aces(col * uExposure);
      col = pow(col, vec3(1.0/2.2));
      col *= 1.0 - d*0.75;
      col += (h(vUv*900.0 + uTime) - 0.5)*0.028;
      gl_FragColor = vec4(col, 1.0);
    }`
};
if (T.EffectComposer && T.UnrealBloomPass && T.ShaderPass) {
  const rt = new T.WebGLRenderTarget(4, 4, { minFilter: T.LinearFilter, magFilter: T.LinearFilter, format: T.RGBAFormat, type: HDR ? T.HalfFloatType : T.UnsignedByteType });
  composer = new T.EffectComposer(renderer, rt);
  composer.addPass(new T.RenderPass(scene, camera));
  bloomPass = new T.UnrealBloomPass(new T.Vector2(256, 256), HDR ? 0.34 : 0.6, 0.55, HDR ? 1.15 : 0.85);
  if (HDR) for (const t of [bloomPass.renderTargetBright, ...bloomPass.renderTargetsHorizontal, ...bloomPass.renderTargetsVertical]) t.texture.type = T.HalfFloatType;
  composer.addPass(bloomPass);
  finalPass = new T.ShaderPass(FinalShader);
  composer.addPass(finalPass);
  if (T.FXAAShader) { fxaaPass = new T.ShaderPass(T.FXAAShader); composer.addPass(fxaaPass); }
} else { renderer.toneMapping = T.ACESFilmicToneMapping; renderer.outputEncoding = T.sRGBEncoding; }
const touch = { on: false, move: null, looks: new Map(), mx: 0, my: 0, fire: 0, auto: true, autoFire: false };
let BASEFOV = 78, VMX = 1;
function resize() {
  const w = window.innerWidth, h = window.innerHeight;
  renderer.setPixelRatio(pixelRatio);
  renderer.setSize(w, h, false);
  // portrait screens get a taller field of view so the horizontal view stays usable
  BASEFOV = w < h ? Math.min(100, 2 * Math.atan(Math.tan(33 * Math.PI / 180) / (w / h)) * 180 / Math.PI) : 78; VMX = clamp(w / h, 0.45, 1);
  if (G.state !== 'playing') camera.fov = BASEFOV;
  camera.aspect = w / h; camera.updateProjectionMatrix();
  if (finalPass) finalPass.material.uniforms.uAspect.value = w / h;
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
