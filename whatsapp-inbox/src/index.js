// WhatsApp Inbox server: receives messages from the WA Forwarder Android app
// and exposes them to Claude through a per-user MCP connector.
//
//   POST /ingest                  app -> server (X-Webhook-Secret: <ingest token>)
//   POST /mcp/<mcp token>         Claude custom connector (MCP, Streamable HTTP)
//   GET  /admin                   admin page: create friends, show setup links
//   GET  /setup#in=..&mcp=..      setup page a friend opens on the phone
//   cron                          daily purge of messages past each user's retention

import {
  ensureSchema, userByIngestToken, userByMcpToken, createUser, rotateTokens,
  listUsers, deleteUser, setRetention, purgeOld, sha256,
} from './db.js';
import { handleMcp } from './mcp.js';
import { ADMIN_HTML, SETUP_HTML, HOME_HTML } from './pages.js';

const MAX_TEXT = 8000;

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname.replace(/\/+$/, '') || '/';
    try {
      await ensureSchema(env.DB);

      if (path === '/') return html(HOME_HTML);
      if (path === '/setup') return html(SETUP_HTML);
      if (path === '/admin') return html(ADMIN_HTML);
      if (path === '/health') return json({ ok: true });

      if (path === '/ingest') return ingest(request, env, url);

      if (path.startsWith('/mcp/')) {
        const user = await userByMcpToken(env.DB, decodeURIComponent(path.slice(5)));
        if (!user) return json({ error: 'unknown connector token' }, 401);
        return handleMcp(request, env, user);
      }

      if (path.startsWith('/admin/api/')) return admin(request, env, path.slice('/admin/api/'.length), url);

      return new Response('Not found', { status: 404 });
    } catch (e) {
      console.error(e);
      return json({ error: 'server error' }, 500);
    }
  },

  async scheduled(_event, env) {
    await ensureSchema(env.DB);
    const n = await purgeOld(env.DB);
    console.log(`purged ${n} old messages`);
  },
};

async function ingest(request, env, url) {
  if (request.method !== 'POST') return json({ error: 'POST only' }, 405);
  const auth = request.headers.get('Authorization') || '';
  const token =
    request.headers.get('X-Webhook-Secret') ||
    (auth.startsWith('Bearer ') ? auth.slice(7) : '') ||
    url.searchParams.get('key');
  const user = await userByIngestToken(env.DB, token);
  if (!user) return json({ error: 'unknown token' }, 401);

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'invalid JSON' }, 400);
  }
  const items = (Array.isArray(body) ? body : [body]).slice(0, 100);
  const now = Date.now();
  const stmts = [env.DB.prepare('UPDATE users SET last_ingest_at = ? WHERE id = ?').bind(now, user.id)];
  let accepted = 0;
  for (const m of items) {
    if (!m || typeof m !== 'object' || m.test) continue; // test pings only prove the connection
    const text = str(m.text, MAX_TEXT);
    const chat = str(m.chat, 300);
    const sender = str(m.sender, 300) || chat;
    if (!text || !chat) continue;
    const sentAt = Number.isFinite(Number(m.timestamp)) && Number(m.timestamp) > 0 ? Number(m.timestamp) : now;
    const key = str(m.message_id, 200) || (await sha256(`${chat}|${sender}|${sentAt}|${text}`)).slice(0, 32);
    stmts.push(
      env.DB.prepare(
        `INSERT OR IGNORE INTO messages (user_id, msg_key, app, chat, sender, text, is_group, sent_at, received_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(user.id, key, str(m.app, 100), chat, sender, text, m.is_group ? 1 : 0, sentAt, now)
    );
    accepted++;
  }
  await env.DB.batch(stmts);
  return json({ ok: true, accepted });
}

async function admin(request, env, route, url) {
  if (!env.ADMIN_TOKEN) return json({ error: 'ADMIN_TOKEN secret is not set on the server' }, 503);
  const given = request.headers.get('X-Admin-Token') || '';
  if ((await sha256(given)) !== (await sha256(env.ADMIN_TOKEN))) return json({ error: 'wrong admin token' }, 401);

  const parts = route.split('/');
  if (parts[0] !== 'users') return json({ error: 'not found' }, 404);

  if (parts.length === 1 && request.method === 'GET') return json({ users: await listUsers(env.DB) });

  if (parts.length === 1 && request.method === 'POST') {
    const b = await request.json().catch(() => ({}));
    const name = str(b.name, 100);
    if (!name) return json({ error: 'name is required' }, 400);
    const u = await createUser(env.DB, name, retention(b.retention_days));
    return json(withLinks(u, url));
  }

  const id = parts[1];
  if (parts[2] === 'rotate' && request.method === 'POST') {
    const u = await rotateTokens(env.DB, id);
    return u ? json(withLinks(u, url)) : json({ error: 'no such user' }, 404);
  }
  if (parts[2] === 'retention' && request.method === 'POST') {
    const b = await request.json().catch(() => ({}));
    await setRetention(env.DB, id, retention(b.retention_days));
    return json({ ok: true });
  }
  if (parts.length === 2 && request.method === 'DELETE') {
    await deleteUser(env.DB, id);
    return json({ ok: true });
  }
  return json({ error: 'not found' }, 404);
}

function withLinks(u, url) {
  const origin = url.origin;
  return {
    id: u.id,
    name: u.name,
    retention_days: u.retention_days,
    ingest_url: `${origin}/ingest`,
    ingest_token: u.ingestToken,
    mcp_url: `${origin}/mcp/${u.mcpToken}`,
    setup_link: `${origin}/setup#in=${encodeURIComponent(u.ingestToken)}&mcp=${encodeURIComponent(u.mcpToken)}&n=${encodeURIComponent(u.name)}`,
  };
}

function retention(v) {
  const n = Math.round(Number(v));
  return Number.isFinite(n) && n >= 1 && n <= 3650 ? n : 30;
}

function str(v, max) {
  if (v === null || v === undefined) return '';
  return String(v).trim().slice(0, max);
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}

function html(body) {
  return new Response(body, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
      'Referrer-Policy': 'no-referrer',
      'X-Frame-Options': 'DENY',
    },
  });
}
