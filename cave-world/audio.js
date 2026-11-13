// Procedural cave soundtrack and sound effects (Web Audio, no audio files).
// Music is scheduled deterministically by time, so the same code can render offline.

function rng(seed) { return () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296); }
const midi = (n) => 440 * Math.pow(2, (n - 69) / 12);

export function buildAudio(ctx) {
  const master = ctx.createGain(); master.gain.value = 0.9; master.connect(ctx.destination);
  const music = ctx.createGain(); music.gain.value = 0.55; music.connect(master);
  const sfx = ctx.createGain(); sfx.gain.value = 0.9; sfx.connect(master);

  // Cave echo: two feedback delays into a dark low-pass.
  const echoIn = ctx.createGain(), echoOut = ctx.createGain(); echoOut.gain.value = 0.5; echoOut.connect(master);
  [[0.31, 0.5], [0.47, 0.42]].forEach(([t, fb]) => {
    const d = ctx.createDelay(1.5), g = ctx.createGain(), lp = ctx.createBiquadFilter();
    d.delayTime.value = t; g.gain.value = fb; lp.type = "lowpass"; lp.frequency.value = 2200;
    echoIn.connect(d); d.connect(lp); lp.connect(g); g.connect(d); lp.connect(echoOut);
  });
  music.connect(echoIn); sfx.connect(echoIn);

  const noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
  { const d = noiseBuf.getChannelData(0), r = rng(7); for (let i = 0; i < d.length; i++) d[i] = r() * 2 - 1; }

  function tone(dest, { f, t, a = 0.02, d = 1, g = 0.2, type = "sine", f2 = null, pan = 0 }) {
    const o = ctx.createOscillator(), v = ctx.createGain(), p = ctx.createStereoPanner();
    o.type = type; o.frequency.setValueAtTime(f, t); if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + d);
    v.gain.setValueAtTime(0.0001, t); v.gain.exponentialRampToValueAtTime(g, t + a); v.gain.exponentialRampToValueAtTime(0.0001, t + a + d);
    p.pan.value = pan; o.connect(v); v.connect(p); p.connect(dest); o.start(t); o.stop(t + a + d + 0.05);
  }
  function noise(dest, { t, d = 0.2, g = 0.2, f = 1000, q = 1, type = "bandpass", f2 = null }) {
    const s = ctx.createBufferSource(), fl = ctx.createBiquadFilter(), v = ctx.createGain();
    s.buffer = noiseBuf; s.loop = true; fl.type = type; fl.frequency.setValueAtTime(f, t); fl.Q.value = q;
    if (f2) fl.frequency.exponentialRampToValueAtTime(f2, t + d);
    v.gain.setValueAtTime(0.0001, t); v.gain.exponentialRampToValueAtTime(g, t + 0.01); v.gain.exponentialRampToValueAtTime(0.0001, t + d);
    s.connect(fl); fl.connect(v); v.connect(dest); s.start(t, (t * 0.37) % 1.5); s.stop(t + d + 0.05);
  }

  // Constant bed: deep drone + slow "air" noise.
  const bed = (t0) => {
    [[38, 0.11], [45, 0.07], [50.02, 0.05]].forEach(([n, g], i) => {
      const o = ctx.createOscillator(), v = ctx.createGain(), l = ctx.createOscillator(), lg = ctx.createGain();
      o.type = i ? "sine" : "triangle"; o.frequency.value = midi(n);
      l.frequency.value = 0.05 + i * 0.03; lg.gain.value = g * 0.5; l.connect(lg); lg.connect(v.gain);
      v.gain.setValueAtTime(0.0001, t0); v.gain.exponentialRampToValueAtTime(g, t0 + 3);
      o.connect(v); v.connect(music); o.start(t0); l.start(t0);
    });
    const s = ctx.createBufferSource(), fl = ctx.createBiquadFilter(), v = ctx.createGain();
    s.buffer = noiseBuf; s.loop = true; fl.type = "lowpass"; fl.frequency.value = 320; v.gain.value = 0.05;
    s.connect(fl); fl.connect(v); v.connect(master); s.start(t0);
  };

  // Music: slow pad chords with sparse bell notes; drips scattered on top. Bar = 8 s.
  const CHORDS = [[50, 57, 60, 64, 65], [46, 53, 57, 62, 65], [53, 57, 60, 64, 67], [45, 52, 57, 60, 64]];
  const BAR = 8; let scheduled = 0, started = false, t0 = 0;
  function scheduleBar(i) {
    const t = t0 + i * BAR, ch = CHORDS[i % CHORDS.length], r = rng(1000 + i * 17);
    ch.forEach((n, k) => {           // pad
      [-4, 5].forEach((det) => {
        const o = ctx.createOscillator(), v = ctx.createGain(), lp = ctx.createBiquadFilter();
        o.type = "sawtooth"; o.frequency.value = midi(n); o.detune.value = det + k;
        lp.type = "lowpass"; lp.frequency.setValueAtTime(350, t); lp.frequency.linearRampToValueAtTime(900, t + BAR / 2); lp.frequency.linearRampToValueAtTime(350, t + BAR);
        v.gain.setValueAtTime(0.0001, t); v.gain.linearRampToValueAtTime(0.028, t + 2.5); v.gain.setValueAtTime(0.028, t + BAR - 1); v.gain.linearRampToValueAtTime(0.0001, t + BAR + 2);
        o.connect(lp); lp.connect(v); v.connect(music); o.start(t); o.stop(t + BAR + 2.1);
      });
    });
    const nBell = 3 + Math.floor(r() * 3);   // bells
    for (let b = 0; b < nBell; b++) {
      const n = ch[1 + Math.floor(r() * (ch.length - 1))] + 12 * (1 + Math.floor(r() * 2)), bt = t + 0.4 + r() * (BAR - 1);
      tone(music, { f: midi(n), t: bt, a: 0.005, d: 3.2, g: 0.07, pan: r() * 1.6 - 0.8 });
      tone(music, { f: midi(n) * 2.01, t: bt, a: 0.005, d: 1.2, g: 0.02, pan: r() * 1.6 - 0.8 });
    }
    const nDrip = 2 + Math.floor(r() * 4);    // water drips
    for (let d = 0; d < nDrip; d++) {
      const dt = t + r() * BAR, f = 900 + r() * 1400;
      tone(sfx, { f, f2: f * 1.9, t: dt, a: 0.003, d: 0.07, g: 0.06, pan: r() * 2 - 1 });
    }
  }
  function scheduleUntil(tEnd) {
    if (!started) { started = true; t0 = ctx.currentTime + 0.05; bed(t0); }
    while (t0 + scheduled * BAR < tEnd) scheduleBar(scheduled++);
  }

  const fx = {
    step: () => { const t = ctx.currentTime; noise(sfx, { t, d: 0.11, g: 0.11, f: 420, q: 0.8 }); noise(sfx, { t: t + 0.03, d: 0.07, g: 0.05, f: 2600, q: 2 }); },
    select: () => tone(sfx, { f: 660, t: ctx.currentTime, a: 0.003, d: 0.07, g: 0.07, type: "triangle" }),
    lens: () => { const t = ctx.currentTime; tone(sfx, { f: 520, f2: 1040, t, a: 0.02, d: 0.5, g: 0.06 }); },
    hammer: () => { const t = ctx.currentTime; [0, 0.28].forEach((o) => { noise(sfx, { t: t + o, d: 0.09, g: 0.5, f: 3200, q: 1.5 }); tone(sfx, { f: 1900, f2: 700, t: t + o, a: 0.002, d: 0.16, g: 0.22, type: "square" }); }); noise(sfx, { t: t + 0.36, d: 0.5, g: 0.12, f: 900, q: 0.6, f2: 300 }); },
    acid: () => { const t = ctx.currentTime, r = rng(Math.floor(t * 1000)); tone(sfx, { f: 1300, f2: 2400, t, a: 0.003, d: 0.06, g: 0.08 }); for (let i = 0; i < 26; i++) noise(sfx, { t: t + 0.15 + r() * 0.75, d: 0.03 + r() * 0.04, g: 0.09, f: 4000 + r() * 4000, q: 6 }); },
    uv: () => { const t = ctx.currentTime; tone(sfx, { f: 180, f2: 240, t, a: 0.1, d: 0.9, g: 0.07, type: "sawtooth" }); tone(sfx, { f: 1480, t: t + 0.1, a: 0.3, d: 0.7, g: 0.035 }); },
    brush: () => { const t = ctx.currentTime; [0, 0.24, 0.48, 0.72].forEach((o, i) => noise(sfx, { t: t + o, d: 0.2, g: 0.13, f: i % 2 ? 2400 : 3400, q: 0.7, f2: 1500 })); },
    survey: () => { const t = ctx.currentTime; noise(sfx, { t, d: 0.5, g: 0.07, f: 5000, q: 3, f2: 7000 }); tone(sfx, { f: 1760, t: t + 0.6, a: 0.002, d: 0.08, g: 0.08, type: "square" }); },
    wrong: () => { const t = ctx.currentTime; tone(sfx, { f: 220, f2: 150, t, a: 0.01, d: 0.3, g: 0.12, type: "triangle" }); },
    discover: () => { const t = ctx.currentTime; [62, 69, 74, 77, 81].forEach((n, i) => tone(sfx, { f: midi(n), t: t + i * 0.09, a: 0.005, d: 1.6, g: 0.09, pan: i * 0.3 - 0.6 })); },
    complete: () => { const t = ctx.currentTime; [50, 57, 62, 65, 69, 74, 77, 81, 86].forEach((n, i) => tone(sfx, { f: midi(n), t: t + i * 0.12, a: 0.005, d: 2.6, g: 0.08, pan: (i % 3) * 0.5 - 0.5 })); },
  };
  return { ctx, master, scheduleUntil, fx };
}

// Realtime wrapper used by the game.
export function createGameAudio() {
  let a = null, timer = null, muted = false;
  try { muted = localStorage.getItem("caveMuted") === "1"; } catch {}
  return {
    get muted() { return muted; },
    start() {
      if (a) { a.ctx.resume(); return; }
      const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
      a = buildAudio(new AC()); a.master.gain.value = muted ? 0 : 0.9;
      const pump = () => a.scheduleUntil(a.ctx.currentTime + 12);
      pump(); timer = setInterval(pump, 3000);
    },
    play(name) { if (a && !muted && a.fx[name]) a.fx[name](); },
    toggle() {
      muted = !muted; try { localStorage.setItem("caveMuted", muted ? "1" : "0"); } catch {}
      if (a) a.master.gain.setTargetAtTime(muted ? 0 : 0.9, a.ctx.currentTime, 0.1);
      return muted;
    },
  };
}
