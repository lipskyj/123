// Storage. One small interface with interchangeable backends (browser localStorage, in-memory for tests).
export const memoryBackend = () => { const m = new Map(); return { get: (k) => (m.has(k) ? m.get(k) : null), set: (k, v) => void m.set(k, v), del: (k) => void m.delete(k), keys: () => [...m.keys()] }; };
export const localStorageBackend = (ls = globalThis.localStorage) => ({ get: (k) => ls.getItem(k), set: (k, v) => ls.setItem(k, v), del: (k) => ls.removeItem(k), keys: () => Object.keys(ls) });

export function createStore(backend, ns = "primer") {
  const key = (col, id) => `${ns}:${col}:${id}`;
  const api = {
    put(col, rec) { if (!rec || !rec.id) throw new Error("Records need an id."); backend.set(key(col, rec.id), JSON.stringify(rec)); return rec; },
    get(col, id) { const raw = backend.get(key(col, id)); if (raw == null) return null; try { return JSON.parse(raw); } catch { return null; } },
    del(col, id) { backend.del(key(col, id)); },
    list(col) { const pre = `${ns}:${col}:`; return backend.keys().filter((k) => k.startsWith(pre)).map((k) => { try { return JSON.parse(backend.get(k)); } catch { return null; } }).filter(Boolean); },
    exportAll() { const out = {}; for (const col of ["intakes", "designs", "packages", "sessions"]) out[col] = api.list(col); return out; },
    importAll(data) { let n = 0; for (const col of ["intakes", "designs", "packages", "sessions"]) for (const rec of data[col] || []) { api.put(col, rec); n++; } return n; },
  };
  return api;
}
