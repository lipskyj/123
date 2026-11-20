// Song Splitter — browser side: song list, job progress, synced multi-track mixer,
// piano roll and sheet music (OpenSheetMusicDisplay).

const $ = (s) => document.querySelector(s);
const fmt = (t) => {
  t = Math.max(0, t || 0);
  return `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, "0")}`;
};
const NOTE_NAMES = ["C", "C♯", "D", "E♭", "E", "F", "F♯", "G", "A♭", "A", "B♭", "B"];

// ------------------------------------------------------------------ home ----

async function api(path, opts) {
  const r = await fetch(path, opts);
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error || `Request failed (${r.status})`);
  return j;
}

async function loadLibrary() {
  const songs = await api("/api/songs");
  const lib = $("#library");
  lib.innerHTML = "";
  if (!songs.length) {
    lib.innerHTML = '<div class="empty">Nothing here yet — split your first song above.</div>';
    return;
  }
  for (const s of songs) {
    const el = document.createElement("div");
    el.className = "card song";
    el.innerHTML = `<div style="min-width:0"><div class="t"></div><div class="m"></div></div><button class="del" title="Delete this song">×</button>`;
    el.querySelector(".t").textContent = s.title;
    el.querySelector(".m").textContent = `${s.key} · ${Math.round(s.tempo)} BPM · ${fmt(s.duration)}`;
    el.addEventListener("click", () => openSong(s.id));
    el.querySelector(".del").addEventListener("click", async (e) => {
      e.stopPropagation();
      if (!confirm(`Delete "${s.title}" and its split tracks from this computer?`)) return;
      await api(`/api/songs/${s.id}`, { method: "DELETE" });
      loadLibrary();
    });
    lib.appendChild(el);
  }
}

function showProgress(frac, text, isError = false) {
  $("#progress").style.display = "block";
  $("#pbar").style.width = `${Math.round(frac * 100)}%`;
  const pt = $("#ptext");
  pt.textContent = isError ? text : `${Math.round(frac * 100)}% — ${text}`;
  pt.classList.toggle("error", isError);
}

async function followJob(job) {
  const t0 = Date.now();
  while (true) {
    if (job.state === "done") {
      showProgress(1, "Done!");
      await loadLibrary();
      setTimeout(() => ($("#progress").style.display = "none"), 1500);
      return openSong(job.song_id);
    }
    if (job.state === "error") return showProgress(0, `Sorry — ${job.text}`, true);
    const secs = Math.round((Date.now() - t0) / 1000);
    showProgress(job.progress || 0, `${job.text} (${fmt(secs)} elapsed)`);
    await new Promise((r) => setTimeout(r, 800));
    try {
      job = await api(`/api/jobs/${job.id}`);
    } catch (err) {
      return showProgress(0, "Lost track of this song — was the Song Splitter window closed? Start it again and retry.", true);
    }
  }
}

$("#urlForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const url = $("#url").value.trim();
  if (!url) return $("#url").focus();
  try {
    showProgress(0, "Starting…");
    followJob(await api("/api/process", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url }) }));
  } catch (err) {
    showProgress(0, err.message, true);
  }
});

$("#file").addEventListener("change", async () => {
  const f = $("#file").files[0];
  if (!f) return;
  try {
    showProgress(0, `Uploading ${f.name}…`);
    const job = await api("/api/upload", { method: "POST", headers: { "X-Filename": encodeURIComponent(f.name) }, body: f });
    $("#file").value = "";
    followJob(job);
  } catch (err) {
    showProgress(0, err.message, true);
  }
});

// ----------------------------------------------------------------- mixer ----

let song = null; // meta.json of the open song
let tracks = []; // {stem, el, gain, analyser, muted, solo, vol, row}
let ctx = null;
let playing = false;
let speed = 1;
let master = null; // the audio element used as the clock
let viewTime = null; // while dragging the piano roll

function audible(t) {
  const anySolo = tracks.some((x) => x.solo);
  return anySolo ? t.solo : !t.muted;
}

function applyGains() {
  for (const t of tracks) {
    const g = audible(t) ? t.vol : 0;
    if (t.gain) t.gain.gain.setTargetAtTime(g, ctx.currentTime, 0.015);
    else t.el.volume = Math.min(1, g); // before the audio graph exists (media volume max is 1)
    t.row.style.opacity = t.stem.silent ? 0.45 : audible(t) ? 1 : 0.6;
    t.row.querySelector(".m").classList.toggle("on", t.muted);
    t.row.querySelector(".s").classList.toggle("on", t.solo);
  }
}

function ensureGraph() {
  if (ctx) return;
  ctx = new (window.AudioContext || window.webkitAudioContext)();
  for (const t of tracks) {
    const src = ctx.createMediaElementSource(t.el);
    t.analyser = ctx.createAnalyser();
    t.analyser.fftSize = 512;
    t.gain = ctx.createGain();
    t.el.volume = 1;
    src.connect(t.analyser);
    src.connect(t.gain).connect(ctx.destination);
  }
  applyGains();
}

function now() {
  return master ? master.currentTime : 0;
}

function waitSeeked(el) {
  return new Promise((res) => {
    if (!el.seeking) return res();
    const done = () => { el.removeEventListener("seeked", done); res(); };
    el.addEventListener("seeked", done);
    setTimeout(done, 1500);
  });
}

async function seekTo(t) {
  t = Math.max(0, Math.min(song.duration - 0.05, t));
  const was = playing;
  if (was) tracks.forEach((x) => x.el.pause());
  tracks.forEach((x) => (x.el.currentTime = t));
  await Promise.all(tracks.map((x) => waitSeeked(x.el)));
  if (was) await Promise.all(tracks.map((x) => x.el.play().catch(() => {})));
}

async function play() {
  ensureGraph();
  if (ctx.state === "suspended") await ctx.resume();
  const t = now();
  tracks.forEach((x) => { x.el.playbackRate = speed; x.el.currentTime = t; });
  await Promise.all(tracks.map((x) => waitSeeked(x.el)));
  await Promise.all(tracks.map((x) => x.el.play().catch(() => {})));
  playing = true;
  $("#playBtn").textContent = "❚❚";
}

let looping = false;
async function restartLoop() {
  if (looping) return; // one restart at a time
  looping = true;
  try {
    await seekTo(0);
    if (!playing) await play();
  } finally {
    looping = false;
  }
}

function pause() {
  tracks.forEach((x) => x.el.pause());
  playing = false;
  $("#playBtn").textContent = "▶";
}

// Keep every track locked to the master clock: nudge speed for small drift, jump for big drift.
let lastSync = 0;
function syncTracks() {
  if (!playing || performance.now() - lastSync < 200) return;
  lastSync = performance.now();
  const ref = master.currentTime;
  for (const t of tracks) {
    if (t.el === master) continue;
    const d = t.el.currentTime - ref;
    if (Math.abs(d) > 0.08) {
      t.el.currentTime = ref;
      t.el.playbackRate = speed;
    } else if (Math.abs(d) > 0.012) {
      t.el.playbackRate = speed * (1 - Math.max(-0.03, Math.min(0.03, d * 1.5)));
    } else if (t.el.playbackRate !== speed) {
      t.el.playbackRate = speed;
    }
  }
}

function buildTracks() {
  const box = $("#tracks");
  box.innerHTML = "";
  tracks.forEach((t) => { t.el.pause(); t.el.removeAttribute("src"); t.el.load(); });
  tracks = [];
  if (ctx) { ctx.close(); ctx = null; }
  const order = [...song.stems].sort((a, b) => a.silent - b.silent);
  let ready = 0;
  for (const stem of order) {
    const el = new Audio();
    el.preload = "auto";
    el.preservesPitch = el.mozPreservesPitch = el.webkitPreservesPitch = true;
    el.src = `/songs/${song.id}/${stem.audio}`;
    const row = document.createElement("div");
    row.className = "track" + (stem.silent ? " silent" : "");
    const info = stem.silent
      ? "not detected in this song"
      : stem.name === "drums"
        ? `${(stem.hits || []).length} hits found`
        : `${(stem.notes || []).length} notes found`;
    row.innerHTML = `
      <div class="sw" style="background:${stem.color}"></div>
      <div class="name">${stem.label}<small>${info}</small><div class="meter"><div style="background:${stem.color}"></div></div></div>
      <div class="ms"><button class="m" title="Mute">M</button><button class="s" title="Solo">S</button></div>
      <input type="range" min="0" max="1.5" step="0.01" value="1" aria-label="${stem.label} volume">
      <div class="dl"></div>`;
    const dl = row.querySelector(".dl");
    const link = (file, text) => {
      const a = document.createElement("a");
      a.href = `/songs/${song.id}/${file}?download=1`;
      a.textContent = text;
      dl.appendChild(a);
    };
    link(stem.audio, "⬇ audio");
    if (stem.midi) link(stem.midi, "⬇ MIDI");
    if (stem.musicxml) link(stem.musicxml, "⬇ sheet");
    const t = { stem, el, row, muted: !!stem.silent, solo: false, vol: 1, level: 0 };
    row.querySelector(".m").onclick = () => { t.muted = !t.muted; applyGains(); };
    row.querySelector(".s").onclick = () => { t.solo = !t.solo; applyGains(); };
    row.querySelector("input").oninput = (e) => { t.vol = +e.target.value; applyGains(); };
    el.addEventListener("canplay", () => {
      if (!t.ready) { t.ready = true; ready++; }
      if (ready === order.length) $("#playBtn").disabled = false;
    }, { once: false });
    el.addEventListener("error", () => {
      row.querySelector("small").textContent = "audio failed to load";
    });
    box.appendChild(row);
    tracks.push(t);
  }
  master = tracks[0].el;
  master.addEventListener("ended", () => (playing && $("#loop").checked ? restartLoop() : pause()));
  applyGains();
}

$("#playBtn").addEventListener("click", () => (playing ? pause() : play()));
$("#speed").addEventListener("change", (e) => {
  speed = +e.target.value;
  tracks.forEach((t) => (t.el.playbackRate = speed));
});
let seeking = false;
$("#seek").addEventListener("input", (e) => { seeking = true; $("#tNow").textContent = fmt((e.target.value / 1000) * song.duration); });
$("#seek").addEventListener("change", async (e) => { await seekTo((e.target.value / 1000) * song.duration); seeking = false; });
document.addEventListener("keydown", (e) => {
  if (!song || $("#player").style.display !== "block" || e.target.closest("input, select, textarea")) return;
  if (e.code === "Space" && e.target.closest("button, a")) return; // the focused button handles Space itself
  if (e.code === "Space") { e.preventDefault(); if (!$("#playBtn").disabled) playing ? pause() : play(); }
  if (e.code === "ArrowRight") seekTo(now() + 5);
  if (e.code === "ArrowLeft") seekTo(now() - 5);
});

// ------------------------------------------------------------- piano roll ----

const canvas = $("#roll");
const g2 = canvas.getContext("2d");
let pitchLo = 36, pitchHi = 84;

function beatAt(t) {
  const b = song.beats;
  if (t <= b[0]) return (t - b[0]) / (b[1] - b[0]);
  for (let lo = 0, hi = b.length - 1; ;) {
    if (hi - lo <= 1) {
      if (t >= b[hi]) return hi + (t - b[hi]) / (b[hi] - b[hi - 1]);
      return lo + (t - b[lo]) / (b[hi] - b[lo]);
    }
    const mid = (lo + hi) >> 1;
    if (b[mid] <= t) lo = mid; else hi = mid;
  }
}

function computePitchRange() {
  let lo = 127, hi = 0;
  for (const s of song.stems) for (const n of s.notes || []) { lo = Math.min(lo, n[2]); hi = Math.max(hi, n[2]); }
  if (lo > hi) { lo = 48; hi = 72; }
  pitchLo = Math.max(0, lo - 2);
  pitchHi = Math.min(127, Math.max(hi + 2, pitchLo + 24));
}

function drawRoll() {
  const dpr = window.devicePixelRatio || 1;
  const W = canvas.clientWidth, H = canvas.clientHeight;
  if (canvas.width !== Math.round(W * dpr) || canvas.height !== Math.round(H * dpr)) {
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
  }
  g2.setTransform(dpr, 0, 0, dpr, 0, 0);
  g2.clearRect(0, 0, W, H);
  const t = viewTime ?? now();
  const span = +$("#zoom").value; // seconds visible
  const pps = W / span;
  const headX = W * 0.28;
  const x = (s) => headX + (s - t) * pps;
  const drumH = 54, keyW = 36;
  const rollH = H - drumH;
  const rows = pitchHi - pitchLo + 1;
  const rh = rollH / rows;
  const y = (p) => rollH - (p - pitchLo + 1) * rh;

  // black-key stripes + octave lines
  for (let p = pitchLo; p <= pitchHi; p++) {
    if ([1, 3, 6, 8, 10].includes(p % 12)) { g2.fillStyle = "#ffffff08"; g2.fillRect(0, y(p), W, rh); }
    if (p % 12 === 0) { g2.fillStyle = "#ffffff14"; g2.fillRect(0, y(p) + rh - 1, W, 1); }
  }
  // beat & bar lines
  const b = song.beats;
  for (let i = 0; i < b.length; i++) {
    const bx = x(b[i]);
    if (bx < -2 || bx > W + 2) continue;
    g2.fillStyle = i % 4 === 0 ? "#ffffff30" : "#ffffff10";
    g2.fillRect(bx, 0, 1, H);
    if (i % 4 === 0) { g2.fillStyle = "#ffffff55"; g2.font = "10px system-ui"; g2.fillText(String(i / 4 + 1), bx + 3, 11); }
  }
  // notes
  const t0 = t - (headX / pps), t1 = t + (W - headX) / pps;
  for (const tr of tracks) {
    const s = tr.stem;
    if (!s.notes || s.silent) continue;
    const on = audible(tr);
    for (const n of s.notes) {
      if (n[0] > t1 || n[0] + n[1] < t0) continue;
      const active = n[0] <= t && t < n[0] + n[1];
      g2.globalAlpha = on ? (active ? 1 : 0.38 + 0.5 * Math.min(1, n[3])) : 0.1;
      g2.fillStyle = s.color;
      const nx = x(n[0]), nw = Math.max(2, n[1] * pps - 1);
      g2.fillRect(nx, y(n[2]) + 0.5, nw, Math.max(2, rh - 1));
      if (active && on) { g2.strokeStyle = "#fff"; g2.lineWidth = 1; g2.strokeRect(nx + 0.5, y(n[2]) + 0.5, nw - 1, Math.max(2, rh - 1) - 1); }
    }
  }
  g2.globalAlpha = 1;
  // drum lane
  g2.fillStyle = "#171a22"; g2.fillRect(0, rollH, W, drumH);
  g2.fillStyle = "#ffffff20"; g2.fillRect(0, rollH, W, 1);
  const drums = tracks.find((tr) => tr.stem.name === "drums");
  const lanes = { hihat: 0, snare: 1, kick: 2 };
  if (drums && !drums.stem.silent) {
    const on = audible(drums);
    for (const [ht, kind, v] of drums.stem.hits || []) {
      if (ht < t0 || ht > t1) continue;
      const hx = x(ht), hy = rollH + 9 + lanes[kind] * 16;
      const hot = Math.abs(ht - t) < 0.08;
      g2.globalAlpha = on ? (hot ? 1 : 0.4 + 0.5 * v) : 0.12;
      g2.fillStyle = kind === "kick" ? "#e9ecf5" : kind === "snare" ? "#b8c0d6" : "#7f8aa6";
      g2.beginPath(); g2.arc(hx, hy, hot ? 6 : 4, 0, Math.PI * 2); g2.fill();
    }
    g2.globalAlpha = 1;
  }
  g2.fillStyle = "#171a22"; g2.fillRect(0, rollH + 1, keyW, drumH);
  g2.fillStyle = "#9aa1b2"; g2.font = "9px system-ui";
  ["hi-hat", "snare", "kick"].forEach((l, i) => g2.fillText(l, 3, rollH + 12 + i * 16));
  // key labels
  g2.fillStyle = "#0d0f14d0"; g2.fillRect(0, 0, keyW, rollH);
  g2.fillStyle = "#9aa1b2";
  for (let p = pitchLo; p <= pitchHi; p++) {
    if (p % 12 === 0 || (rh > 11 && [4, 7].includes(p % 12))) g2.fillText(`${NOTE_NAMES[p % 12]}${Math.floor(p / 12) - 1}`, 4, y(p) + rh - 2);
  }
  // playhead
  g2.fillStyle = "#5cc8ff"; g2.fillRect(headX - 1, 0, 2, H);
}

// drag the roll to scrub
let drag = null;
canvas.addEventListener("pointerdown", (e) => {
  if (!song) return;
  canvas.setPointerCapture(e.pointerId);
  drag = { x: e.clientX, t: now(), moved: false };
  canvas.style.cursor = "grabbing";
});
canvas.addEventListener("pointermove", (e) => {
  if (!drag) return;
  const pps = canvas.clientWidth / +$("#zoom").value;
  const dx = e.clientX - drag.x;
  if (Math.abs(dx) > 3) drag.moved = true;
  viewTime = Math.max(0, Math.min(song.duration, drag.t - dx / pps));
});
const endDrag = async () => {
  if (!drag) return;
  canvas.style.cursor = "grab";
  if (drag.moved && viewTime != null) await seekTo(viewTime);
  drag = null;
  viewTime = null;
};
canvas.addEventListener("pointerup", endDrag);
canvas.addEventListener("pointercancel", endDrag);

// ----------------------------------------------------------- sheet music ----

let osmd = null;
let sheetLoadedFor = null;
let lastMeasure = -1;

function setTab(name) {
  document.querySelectorAll(".tab").forEach((b) => b.classList.toggle("on", b.dataset.tab === name));
  $("#rollWrap").style.display = name === "roll" ? "block" : "none";
  $("#zoomLbl").style.display = name === "roll" ? "flex" : "none";
  $("#sheetWrap").style.display = name === "sheet" ? "block" : "none";
  if (name === "sheet") loadSheet();
}
document.querySelectorAll(".tab").forEach((b) => b.addEventListener("click", () => setTab(b.dataset.tab)));

function fillSheetPicker() {
  const sel = $("#sheetPart");
  sel.innerHTML = "";
  const parts = song.stems.filter((s) => s.musicxml);
  for (const s of parts) {
    const o = document.createElement("option");
    o.value = s.name; o.textContent = s.label;
    sel.appendChild(o);
  }
  // most useful first guess: the loudest pitched part
  const best = [...parts].sort((a, b) => b.level_db - a.level_db)[0];
  if (best) sel.value = best.name;
  if (!parts.length) {
    const o = document.createElement("option");
    o.textContent = "No sheet music for this song";
    sel.appendChild(o);
  }
}
$("#sheetPart").addEventListener("change", () => loadSheet(true));

async function loadSheet(force = false) {
  const name = $("#sheetPart").value;
  const stem = song.stems.find((s) => s.name === name);
  const key = `${song.id}/${name}`;
  if (!stem || !stem.musicxml) {
    $("#sheet").innerHTML = '<p style="padding:20px;color:#555">No pitched instruments were found in this song.</p>';
    $("#dlXml").style.display = "none";
    return;
  }
  if (sheetLoadedFor === key && !force) return;
  sheetLoadedFor = key;
  $("#dlXml").style.display = "";
  $("#dlXml").href = `/songs/${song.id}/${stem.musicxml}?download=1`;
  $("#sheetNote").textContent = name === "other"
    ? "“Other” mixes several instruments together (strings, synths, horns…), so its notation is the least reliable."
    : name === "bass" || name === "guitar"
      ? "Written an octave higher than it sounds, as is standard for bass and guitar (the small 8 under the clef)."
      : "";
  $("#sheet").innerHTML = '<p style="padding:20px;color:#555">Drawing the sheet music…</p>';
  $("#measureHi").style.display = "none";
  lastMeasure = -1;
  try {
    const xml = await (await fetch(`/songs/${song.id}/${stem.musicxml}`)).text();
    if (sheetLoadedFor !== key) return; // user picked another part meanwhile
    $("#sheet").innerHTML = "";
    osmd = new opensheetmusicdisplay.OpenSheetMusicDisplay($("#sheet"), {
      autoResize: true, backend: "svg", drawTitle: true, drawComposer: false,
      drawPartNames: true, drawMeasureNumbers: true, drawingParameters: "compact",
    });
    await osmd.load(xml);
    osmd.render();
  } catch (err) {
    $("#sheet").innerHTML = `<p style="padding:20px;color:#a00">Couldn't draw this part: ${err.message}</p>`;
    osmd = null;
  }
}

function followSheet() {
  if (!osmd || $("#sheetWrap").style.display !== "block" || !osmd.GraphicSheet) return;
  const beat = beatAt(viewTime ?? now());
  const m = Math.floor(beat / 4);
  if (m === lastMeasure) return;
  lastMeasure = m;
  const list = osmd.GraphicSheet.MeasureList;
  const hi = $("#measureHi");
  if (m < 0 || m >= list.length || !list[m] || !list[m][0]) { hi.style.display = "none"; return; }
  const staves = list[m].filter(Boolean);
  const unit = 10 * osmd.zoom;
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const gm of staves) {
    const ps = gm.PositionAndShape;
    x0 = Math.min(x0, ps.AbsolutePosition.x + ps.BorderLeft);
    x1 = Math.max(x1, ps.AbsolutePosition.x + ps.BorderRight);
    y0 = Math.min(y0, ps.AbsolutePosition.y + ps.BorderTop);
    y1 = Math.max(y1, ps.AbsolutePosition.y + ps.BorderBottom);
  }
  const pad = 1.2;
  const sheetEl = $("#sheet");
  const offX = sheetEl.offsetLeft, offY = sheetEl.offsetTop;
  Object.assign(hi.style, {
    display: "block",
    left: `${offX + x0 * unit - 4}px`, top: `${offY + (y0 - pad) * unit}px`,
    width: `${(x1 - x0) * unit + 8}px`, height: `${(y1 - y0 + 2 * pad) * unit}px`,
  });
  if ($("#follow").checked) {
    const sc = $("#sheetScroll");
    const top = offY + (y0 - pad) * unit;
    if (top < sc.scrollTop + 20 || top > sc.scrollTop + sc.clientHeight - 140) {
      sc.scrollTo({ top: Math.max(0, top - 40), behavior: "smooth" });
    }
  }
}

// ------------------------------------------------------------ open song ----

async function openSong(id) {
  pause();
  song = await api(`/songs/${id}/meta.json`);
  location.hash = `song=${id}`;
  $("#home").style.display = "none";
  $("#player").style.display = "block";
  $("#songTitle").textContent = song.title;
  const chips = [
    ["Key", song.key.name], ["Tempo", `${Math.round(song.tempo)} BPM`], ["Length", fmt(song.duration)],
  ];
  $("#chips").innerHTML = chips.map(([a, b]) => `<span class="chip">${a} <b>${b}</b></span>`).join("");
  $("#dlAllMidi").href = `/songs/${id}/${song.midi_all}?download=1`;
  $("#tDur").textContent = fmt(song.duration);
  $("#playBtn").disabled = true;
  $("#playBtn").textContent = "▶";
  sheetLoadedFor = null;
  osmd = null;
  $("#sheet").innerHTML = "";
  buildTracks();
  computePitchRange();
  fillSheetPicker();
  setTab(document.querySelector(".tab.on")?.dataset.tab || "roll");
  window.scrollTo(0, 0);
}

function goHome() {
  pause();
  song = null;
  history.replaceState(null, "", location.pathname);
  $("#player").style.display = "none";
  $("#home").style.display = "block";
  loadLibrary();
}
$("#back").addEventListener("click", goHome);

// ---------------------------------------------------------------- loop ----

const meterBuf = new Uint8Array(512);
function frame() {
  if (song && master) {
    syncTracks();
    const t = viewTime ?? now();
    if (!seeking) {
      $("#tNow").textContent = fmt(t);
      $("#seek").value = Math.round((t / song.duration) * 1000);
    }
    if ($("#loop").checked && playing && master.currentTime > song.duration - 0.1) restartLoop();
    for (const tr of tracks) {
      let lvl = 0;
      if (tr.analyser && playing) {
        tr.analyser.getByteTimeDomainData(meterBuf);
        let peak = 0;
        for (let i = 0; i < tr.analyser.fftSize; i++) peak = Math.max(peak, Math.abs(meterBuf[i] - 128));
        lvl = Math.min(1, peak / 100);
      }
      tr.level = Math.max(lvl, tr.level * 0.9);
      tr.row.querySelector(".meter > div").style.width = `${Math.round(tr.level * 100)}%`;
    }
    if ($("#rollWrap").style.display !== "none") drawRoll();
    followSheet();
  }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// start, and follow back/forward or edited #song= links
function routeFromHash() {
  const m = location.hash.match(/song=([\w-]+)/);
  if (m && m[1] !== song?.id) openSong(m[1]).catch(() => goHome());
  else if (!m && song) goHome();
}
window.addEventListener("hashchange", routeFromHash);
loadLibrary().then(routeFromHash);

// for automated checks: current position of every track
window.songSplitterDebug = () => tracks.map((t) => t.el.currentTime);
