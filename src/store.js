// File-backed JSON store. Every write is atomic (write temp file, then rename) so an
// interrupted process never leaves a half-written record; sessions resume from disk.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

class Store {
  constructor(dir) {
    this.dir = dir;
    for (const kind of ['projects', 'packages', 'sessions']) fs.mkdirSync(path.join(dir, kind), { recursive: true });
  }
  file(kind, id) {
    if (!/^[a-z0-9-]+$/i.test(id)) throw Object.assign(new Error('Invalid id'), { status: 400 });
    return path.join(this.dir, kind, id + '.json');
  }
  get(kind, id) {
    try { return JSON.parse(fs.readFileSync(this.file(kind, id), 'utf8')); } catch (e) {
      if (e.code === 'ENOENT') return null;
      throw e;
    }
  }
  put(kind, obj) {
    const f = this.file(kind, obj.id);
    const tmp = f + '.' + process.pid + '.' + crypto.randomBytes(3).toString('hex') + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(obj, null, 2));
    fs.renameSync(tmp, f);
    return obj;
  }
  list(kind) {
    return fs.readdirSync(path.join(this.dir, kind)).filter((f) => f.endsWith('.json')).map((f) => this.get(kind, f.slice(0, -5))).filter(Boolean);
  }
}

function newId(prefix) {
  return prefix + '-' + crypto.randomBytes(5).toString('hex');
}

function now() {
  return new Date().toISOString();
}

module.exports = { Store, newId, now };
