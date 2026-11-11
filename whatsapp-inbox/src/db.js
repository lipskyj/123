// Database helpers (Cloudflare D1 / SQLite). The schema is created on first use.

const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS users (
     id TEXT PRIMARY KEY,
     name TEXT NOT NULL,
     ingest_hash TEXT NOT NULL UNIQUE,
     mcp_hash TEXT NOT NULL UNIQUE,
     retention_days INTEGER NOT NULL DEFAULT 30,
     created_at INTEGER NOT NULL,
     last_ingest_at INTEGER,
     last_mcp_at INTEGER
   )`,
  `CREATE TABLE IF NOT EXISTS messages (
     id INTEGER PRIMARY KEY AUTOINCREMENT,
     user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
     msg_key TEXT NOT NULL,
     app TEXT,
     chat TEXT NOT NULL,
     sender TEXT NOT NULL,
     text TEXT NOT NULL,
     is_group INTEGER NOT NULL DEFAULT 0,
     sent_at INTEGER NOT NULL,
     received_at INTEGER NOT NULL,
     UNIQUE (user_id, msg_key)
   )`,
  `CREATE INDEX IF NOT EXISTS idx_messages_user_time ON messages (user_id, sent_at DESC)`,
  `CREATE INDEX IF NOT EXISTS idx_messages_user_chat ON messages (user_id, chat, sent_at DESC)`,
];

let ready = false;

export async function ensureSchema(db) {
  if (ready) return;
  await db.batch(SCHEMA.map((s) => db.prepare(s)));
  ready = true;
}

export function randomToken(bytes = 24) {
  const a = new Uint8Array(bytes);
  crypto.getRandomValues(a);
  return btoa(String.fromCharCode(...a)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export async function sha256(s) {
  const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function userByIngestToken(db, token) {
  if (!token) return null;
  return db.prepare('SELECT * FROM users WHERE ingest_hash = ?').bind(await sha256(token)).first();
}

export async function userByMcpToken(db, token) {
  if (!token) return null;
  return db.prepare('SELECT * FROM users WHERE mcp_hash = ?').bind(await sha256(token)).first();
}

export async function createUser(db, name, retentionDays) {
  const id = crypto.randomUUID();
  const ingestToken = 'in_' + randomToken();
  const mcpToken = 'mcp_' + randomToken();
  await db
    .prepare(
      'INSERT INTO users (id, name, ingest_hash, mcp_hash, retention_days, created_at) VALUES (?, ?, ?, ?, ?, ?)'
    )
    .bind(id, name, await sha256(ingestToken), await sha256(mcpToken), retentionDays, Date.now())
    .run();
  return { id, name, retention_days: retentionDays, ingestToken, mcpToken };
}

export async function rotateTokens(db, id) {
  const ingestToken = 'in_' + randomToken();
  const mcpToken = 'mcp_' + randomToken();
  const r = await db
    .prepare('UPDATE users SET ingest_hash = ?, mcp_hash = ? WHERE id = ?')
    .bind(await sha256(ingestToken), await sha256(mcpToken), id)
    .run();
  if (!r.meta.changes) return null;
  const u = await db.prepare('SELECT id, name, retention_days FROM users WHERE id = ?').bind(id).first();
  return { ...u, ingestToken, mcpToken };
}

export async function listUsers(db) {
  const { results } = await db
    .prepare(
      `SELECT u.id, u.name, u.retention_days, u.created_at, u.last_ingest_at, u.last_mcp_at,
              (SELECT COUNT(*) FROM messages m WHERE m.user_id = u.id) AS message_count
         FROM users u ORDER BY u.created_at`
    )
    .all();
  return results;
}

export async function deleteUser(db, id) {
  await db.batch([
    db.prepare('DELETE FROM messages WHERE user_id = ?').bind(id),
    db.prepare('DELETE FROM users WHERE id = ?').bind(id),
  ]);
}

export async function setRetention(db, id, days) {
  await db.prepare('UPDATE users SET retention_days = ? WHERE id = ?').bind(days, id).run();
}

export async function purgeOld(db) {
  // Each user's messages are kept for their own retention_days.
  const r = await db
    .prepare(
      `DELETE FROM messages WHERE id IN (
         SELECT m.id FROM messages m JOIN users u ON u.id = m.user_id
          WHERE m.sent_at < (strftime('%s','now') * 1000 - u.retention_days * 86400000))`
    )
    .run();
  return r.meta.changes || 0;
}
