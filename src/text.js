// Text utilities: tokenizing, crude stemming, list splitting, phrase matching.
// Deterministic and dependency-free so evidence decisions are reproducible and auditable.

const STOP = new Set(`a an the and or but if then else of to in on at by for with from into onto about as is are was were be been being
this that these those it its it's they them their there here we our us you your i me my he she his her him
do does did doing done have has had having can could should would will shall may might must not no nor so too very
just than such some any all each every both few more most other own same only also what which who whom whose when where why how
up down out over under again further once off per via vs etc e.g. i.e. like really thing things lot lots get gets got make makes
student students learner learners able clearly explicitly correctly appropriately well good better best
explain explains explaining explained identify identifies identifying use uses using used show shows showing
demonstrate demonstrates demonstrating describe describes describing name names naming state states stating
understand understands understanding apply applies applying give gives giving recognize recognizes recognise
know knows knowing think thinks one two three way ways need needs needed want wants within without whether
something anything everything someone somebody i'm don't doesn't isn't aren't can't won't that's yes yeah ok okay sure right`.split(/\s+/));

const NEGATORS = new Set(['not', 'no', 'never', "isn't", "aren't", "don't", "doesn't", "won't", "can't", 'cannot', 'nor', 'wrong', 'false', 'myth', 'mistake', 'incorrect']);

function norm(s) {
  return String(s || '').toLowerCase().replace(/[’']/g, "'").replace(/[^a-z0-9'\s-]/g, ' ').replace(/-/g, ' ');
}

function stem(w) {
  w = w.replace(/^'+|'+$/g, '').replace(/'s$/, '');
  if (w.length <= 3) return w;
  if (w.endsWith('ies') && w.length > 4) return w.slice(0, -3) + 'y';
  if (w.endsWith('sses')) return w.slice(0, -2);
  if (w.endsWith('ing') && w.length > 5) return w.slice(0, -3);
  if (w.endsWith('ed') && w.length > 4) return w.slice(0, -2);
  if (w.endsWith('es') && w.length > 4 && /(ch|sh|x|z|ss)es$/.test(w)) return w.slice(0, -2);
  if (w.endsWith('s') && !w.endsWith('ss') && !w.endsWith('us') && !w.endsWith('is')) return w.slice(0, -1);
  return w;
}

function words(s) {
  return norm(s).split(/\s+/).filter(Boolean);
}

function tokens(s) {
  return words(s).filter((w) => !STOP.has(w) && w.length > 1).map(stem);
}

function wordCount(s) {
  return words(s).length;
}

// Split an educator's natural-language list into items.
function splitList(s) {
  const text = String(s || '').trim();
  if (!text) return [];
  let parts;
  if (/\n/.test(text) || /;/.test(text) || /(^|\s)(\d+[.)]|[-•*])\s/.test(text)) {
    parts = text.split(/\n|;|(?:^|\s)(?:\d+[.)]|[•*])\s|(?:^|\n)\s*-\s/);
  } else {
    parts = text.split(/,(?![^()]*\))/);
    // A single long sentence with commas is probably prose, not a list.
    if (parts.some((p) => wordCount(p) > 10)) parts = [text];
  }
  return parts.map((p) => p.replace(/^\s*(and|or)\s+/i, '').replace(/^[\s\-•*\d.)]+/, '').trim().replace(/[.;,]+$/, '')).filter((p) => p && wordCount(p) > 0);
}

function sentences(s) {
  return String(s || '').replace(/\s+/g, ' ').split(/(?<=[.!?])\s+(?=[A-Z0-9"'(])/).map((x) => x.trim()).filter(Boolean);
}

function uniq(arr) {
  return [...new Set(arr)];
}

// Content terms of a phrase, in order, without duplicates (surface forms).
function contentWords(s) {
  return uniq(words(s).filter((w) => !STOP.has(w) && w.length > 2).map((w) => w.replace(/^'+|'+$/g, '')));
}

// A look-for is a short phrase; it matches when all its stems appear in the text.
function phraseMatches(textTokenSet, phrase) {
  const pt = tokens(phrase);
  if (!pt.length) return false;
  return pt.every((t) => textTokenSet.has(t));
}

function matchLookFors(text, lookFors) {
  const set = new Set(tokens(text));
  return (lookFors || []).filter((lf) => phraseMatches(set, lf));
}

// Is a phrase asserted in the text without a nearby negation?
function overlapRatio(text, phrase) {
  const set = new Set(tokens(text));
  const pt = uniq(tokens(phrase));
  if (!pt.length) return 0;
  return pt.filter((t) => set.has(t)).length / pt.length;
}

function hasNegation(text) {
  return words(text).some((w) => NEGATORS.has(w) || w.endsWith("n't"));
}

// Hedges that turn a restated misconception into a refutation ("only fair if...", "it depends").
const QUALIFIER = /\b(only (?:if|when)|unless|depends|not always|not necessarily|isn'?t always|but|however|actually|instead|rather)\b/i;
function hasQualifier(text) { return QUALIFIER.test(String(text || '')); }

// Frequency-based key phrases from materials (unigrams and bigrams).
function keyPhrases(text, n = 8) {
  const ws = words(text);
  const counts = new Map();
  const surface = new Map();
  for (let i = 0; i < ws.length; i++) {
    const w = ws[i];
    if (STOP.has(w) || w.length < 4 || /^\d+$/.test(w)) continue;
    const k = stem(w);
    counts.set(k, (counts.get(k) || 0) + 1);
    if (!surface.has(k)) surface.set(k, w);
    const w2 = ws[i + 1];
    if (w2 && !STOP.has(w2) && w2.length > 3 && !/^\d+$/.test(w2)) {
      const k2 = k + ' ' + stem(w2);
      counts.set(k2, (counts.get(k2) || 0) + 1.6);
      if (!surface.has(k2)) surface.set(k2, w + ' ' + w2);
    }
  }
  const ranked = [...counts.entries()].filter(([, c]) => c >= 2).sort((a, b) => b[1] - a[1]);
  const out = [];
  for (const [k] of ranked) {
    if (out.some((o) => o.key.includes(k) || k.includes(o.key))) continue;
    out.push({ key: k, label: surface.get(k) });
    if (out.length >= n) break;
  }
  return out.map((o) => o.label);
}

function hash(s) {
  let h = 2166136261;
  for (const c of String(s)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

function truncate(s, n) {
  s = String(s || '');
  return s.length > n ? s.slice(0, n - 1).trimEnd() + '…' : s;
}

module.exports = { hasQualifier, norm, stem, words, tokens, wordCount, splitList, sentences, contentWords, phraseMatches, matchLookFors, overlapRatio, hasNegation, keyPhrases, hash, uniq, truncate, STOP };
