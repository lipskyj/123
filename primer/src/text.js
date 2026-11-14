// Small deterministic text utilities shared by the deterministic provider and evidence detection.
const STOP = new Set(("a an the and or but if then than so of in on at to for from by with without into onto over under about as is are was were be been being it its this that these those " +
  "i you he she we they me my your his her our their them us do does did done doing have has had having will would can could should may might must shall not no yes " +
  "what which who whom whose when where why how all any both each few more most other some such only own same too very just also there here up down out off again once " +
  "because while during before after above below between through until against am s t don doesn isn aren wasn weren won wouldn couldn shouldn ll re ve d m like get got make made use used using one two " +
  "students student learner learners able understand know explain describe identify apply").split(" "));

export const sentences = (t) => (t || "").replace(/\s+/g, " ").split(/(?<=[.!?])\s+(?=[A-Z0-9"'(])/).map((s) => s.trim()).filter((s) => s.length > 0);
export const words = (t) => (t || "").toLowerCase().replace(/[’']/g, "").match(/[a-z0-9]+/g) || [];
export function stem(w) {
  if (w.length > 5 && w.endsWith("ies")) return w.slice(0, -3) + "y";
  for (const suf of ["ations", "ation", "ments", "ment", "ingly", "ings", "ing", "edly", "ed", "es", "s", "ly"]) {
    if (w.length - suf.length >= 4 && w.endsWith(suf)) return w.slice(0, -suf.length);
  }
  return w;
}
export const content = (t) => words(t).filter((w) => !STOP.has(w) && w.length > 2);
export const stems = (t) => [...new Set(content(t).map(stem))];

// Most characteristic terms of a text (frequency, with a bonus for longer words); returns surface forms.
export function keyTerms(text, n = 12) {
  const freq = new Map(), surface = new Map();
  for (const w of content(text)) { const s = stem(w); freq.set(s, (freq.get(s) || 0) + 1); if (!surface.has(s) || w.length < surface.get(s).length) surface.set(s, w); }
  return [...freq.entries()].map(([s, f]) => [s, f * (1 + Math.min(s.length, 10) / 10)]).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, n).map(([s]) => surface.get(s));
}

// Share of `targetStems` present in text. Returns { score, hits }.
// Look-for matching. Each look-for may be a single word or a phrase, and may be a short or "stop" word such as
// "not" or "doesn't" when the teacher chose it. Returns the look-fors (as written) found in the text.
export const norm = (t) => " " + words(t).map(stem).join(" ") + " ";
export function matchLookFors(text, lookFors) { const T = norm(text); return [...new Set(lookFors)].filter((lf) => { const k = norm(lf).trim(); return k && T.includes(" " + k + " "); }); }
export function overlap(text, targetStems) {
  const have = new Set(content(text).map(stem));
  const hits = targetStems.filter((s) => have.has(s));
  return { score: targetStems.length ? hits.length / targetStems.length : 0, hits };
}

export const NEGATION = /\b(not|no|never|isn't|isnt|aren't|arent|doesn't|doesnt|don't|dont|wrong|myth|mistake|mistaken|misconception|incorrect|false|actually|rather than|instead)\b/i;
export const ANSWER_SEEKING = /\b((just )?(tell|give) me (the |an? )?(right |correct |best )?answer|what('s| is) the (right |correct |best )?answer|what should i (say|do|write|answer)|can you (just )?(solve|do|answer) (it|this|that)( for me)?|i give up|just tell me)\b/i;

export function quote(text, max = 160) { const t = (text || "").replace(/\s+/g, " ").trim(); return t.length > max ? t.slice(0, max - 1).trimEnd() + "…" : t; }
export function splitList(t) { return (t || "").split(/\n|;|•|(?:^|\s)[-*]\s|\d+[.)]\s/).map((s) => s.trim().replace(/^[-*•]\s*/, "")).filter((s) => s.length > 2); }
export function hash(str) { let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0).toString(36); }
export function rng(seed) { let s = typeof seed === "number" ? seed : parseInt(hash(String(seed)), 36); return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296); }
export const pick = (arr, r) => arr[Math.floor(r() * arr.length) % arr.length];
