// Builds a personalized, illustrated install guide from guide/template.html.
//
//   node guide/make-guide.mjs --server https://whatsapp-inbox.<you>.workers.dev \
//        [--owner "Dana"] [--for owner|friend] [--retention 30] [--out guide/out] [--inline]
//
//   --for owner   (default) guide for the person who deployed the server: includes an admin section.
//   --for friend  guide for someone the owner invites: "ask <owner> for your link".
//   --inline      one self-contained index.html with images embedded (easy to share as a single file).
//                 Without it, index.html + img/ are written side by side (best for publishing as an Artifact).
//
// The guide never contains tokens, setup links, MCP URLs or the admin password. Only the public server URL.
import { readFileSync, writeFileSync, mkdirSync, copyFileSync, readdirSync } from 'node:fs';
import { dirname, join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..');
const args = Object.fromEntries(
  process.argv.slice(2).reduce((acc, a, i, all) => {
    if (a.startsWith('--')) acc.push([a.slice(2), all[i + 1] && !all[i + 1].startsWith('--') ? all[i + 1] : true]);
    return acc;
  }, [])
);

const server = String(args.server || '').replace(/\/+$/, '');
if (!/^https:\/\/[^/]+$/.test(server)) {
  console.error('usage: node guide/make-guide.mjs --server https://whatsapp-inbox.<you>.workers.dev [--owner Name] [--for owner|friend] [--retention 30] [--inline]');
  process.exit(1);
}
if (/\/(mcp|setup)\b|[#?]|\bin_|\bmcp_/.test(server)) {
  console.error('Refusing: --server must be the bare server origin, never a setup link or connector URL.');
  process.exit(1);
}
const owner = String(args.owner || '').trim();
const mode = args.for === 'friend' ? 'friend' : 'owner';
const days = Number(args.retention) > 0 ? Math.round(Number(args.retention)) : 30;
const out = args.out ? String(args.out) : join(HERE, 'out');
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const host = server.replace(/^https:\/\//, '');
const who = owner ? esc(owner) : 'the person who invited you';

const V =
  mode === 'owner'
    ? {
        TITLE: 'WhatsApp Inbox Install Guide',
        EYEBROW: owner ? `${esc(owner)}'s install guide · about 10 minutes` : 'Install guide · about 10 minutes',
        OWNER_POSSESSIVE: 'your own',
        SETUP_LINK_SOURCE: 'Create it on your admin page (see "Your server" below), as a link or a QR code.',
        STEP1_TEXT:
          'Setup only works with a personal setup link (or QR code). As the owner, you create one for yourself on your admin page: open <code>' +
          esc(host) +
          '/admin</code>, sign in with your admin password, add a user with your name and click <b>Create user</b>. The link is shown only once, so open it on your phone right away or keep it somewhere private.',
        LEAK_ACTION: 'open your admin page and click <b>New link</b> next to the user.',
        LOST_LINK_ACTION: 'Open your admin page and click <b>New link</b> next to the user.',
        DELETE_ACTION: 'delete the user on your admin page.',
        WHO_CAN_SEE:
          'The server runs on <b>your own</b> Cloudflare account and the data is encrypted at rest. Anyone with access to that Cloudflare account can technically read the messages, including the messages of friends you invite. Tell them that before they install.',
        ADMIN_SECTION: `<section id="server"><div class="wrap">
  <div class="sec-h"><h2>Your server</h2></div>
  <p class="sec-sub">You deployed your own WhatsApp Inbox. These are the addresses you'll need. None of them is secret on its own.</p>
  <div class="need" style="grid-template-columns:repeat(3,1fr)">
    <div><div class="ic">🌐</div><h3>Server</h3><p><code>${esc(host)}</code></p></div>
    <div><div class="ic">🛠️</div><h3>Admin page</h3><p><code>${esc(host)}/admin</code><br>Create users and their setup links. The password is in your local secrets file, never in this guide.</p></div>
    <div><div class="ic">📦</div><h3>App download</h3><p><code>${esc(host)}/wa-forwarder.apk</code></p></div>
  </div>
  <div class="note info" style="margin-top:14px"><b>Inviting friends</b>Create a user for each person on the admin page and send them their own setup link (it's shown once). Then send them the friend version of this guide, which Claude Code can make with <code>--for friend</code>.</div>
</div></section>`,
      }
    : {
        TITLE: 'WhatsApp Inbox Install Guide',
        EYEBROW: 'Install guide · about 10 minutes',
        OWNER_POSSESSIVE: owner ? `${esc(owner)}'s` : 'a',
        SETUP_LINK_SOURCE: `You get it from ${who}, as a link or a QR code.`,
        STEP1_TEXT: `Setup only works with a personal setup link (or QR code) that ${who} creates for you. Don't have one yet? Ask before you start. Without it you can install the app, but you can't connect it.`,
        LEAK_ACTION: `ask ${who} for a new link.`,
        LOST_LINK_ACTION: `Ask ${who} for a new link.`,
        DELETE_ACTION: `ask ${who} to delete your user.`,
        WHO_CAN_SEE: `The server runs on ${who}'s Cloudflare account and the data is encrypted at rest. Even so, <b>${who} can technically access the messages</b>. It's important that you know that.`,
        ADMIN_SECTION: '',
      };
Object.assign(V, { RETENTION_DAYS: String(days), SERVER_URL: esc(server), SERVER_HOST: esc(host) });

let html = readFileSync(join(HERE, 'template.html'), 'utf8').replace(/\{\{([A-Z0-9_]+)\}\}/g, (m, k) => {
  if (!(k in V)) throw new Error('unknown placeholder ' + m);
  return V[k];
});

mkdirSync(out, { recursive: true });
const imgDir = join(ROOT, 'docs', 'img');
const images = readdirSync(imgDir).filter((f) => f.endsWith('.webp'));
const files = [...images.map((f) => [f, join(imgDir, f)]), ['icon.png', join(ROOT, 'public', 'icon.png')]];
if (args.inline) {
  const mime = { '.webp': 'image/webp', '.png': 'image/png' };
  for (const [name, path] of files) {
    const data = `data:${mime[extname(name)]};base64,${readFileSync(path).toString('base64')}`;
    html = html.split(`img/${name}`).join(data);
  }
} else {
  mkdirSync(join(out, 'img'), { recursive: true });
  for (const [name, path] of files) copyFileSync(path, join(out, 'img', name));
}
writeFileSync(join(out, 'index.html'), html);
console.log(`guide written: ${join(out, 'index.html')}${args.inline ? ' (self-contained)' : ' + img/'}`);
