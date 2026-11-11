// Static HTML pages. Tokens never appear in server URLs:
// the setup link carries them in the #fragment, which browsers do not send to the server.

const STYLE = `
:root{--bg:#f6f7f9;--card:#fff;--fg:#1b1f24;--muted:#5b6470;--accent:#128c7e;--border:#dfe3e8;--danger:#c62828}
@media (prefers-color-scheme:dark){:root{--bg:#0f1214;--card:#181c20;--fg:#e8eaed;--muted:#9aa3ad;--accent:#25d366;--border:#2a3036;--danger:#ef5350}}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--fg);font:16px/1.55 system-ui,-apple-system,"Segoe UI",Arial,sans-serif}
main{max-width:720px;margin:0 auto;padding:24px 16px 64px}h1{font-size:1.6rem;margin:.2em 0}h2{font-size:1.15rem;margin:1.4em 0 .4em}
.card{background:var(--card);border:1px solid var(--border);border-radius:14px;padding:18px;margin:14px 0}
.muted{color:var(--muted)}label{display:block;margin:.6em 0 .2em;font-weight:600}
input{width:100%;padding:10px 12px;border:1px solid var(--border);border-radius:10px;background:var(--bg);color:var(--fg);font-size:1rem}
button,.btn{display:inline-block;padding:11px 18px;border:0;border-radius:10px;background:var(--accent);color:#fff;font-weight:700;font-size:1rem;cursor:pointer;text-decoration:none;margin:6px 0 0}
button.secondary{background:transparent;color:var(--accent);border:1px solid var(--accent)}button.danger{background:transparent;color:var(--danger);border:1px solid var(--danger)}
code,.mono{direction:ltr;unicode-bidi:embed;font-family:ui-monospace,Menlo,Consolas,monospace;font-size:.85rem;word-break:break-all;background:var(--bg);padding:2px 6px;border-radius:6px}
.mono{display:block;padding:10px;margin:6px 0}table{width:100%;border-collapse:collapse;font-size:.92rem}td,th{padding:8px 4px;border-bottom:1px solid var(--border);text-align:left;vertical-align:top}
#qr{background:#fff;padding:12px;display:inline-block;border-radius:10px;margin-top:8px}ol li{margin:.35em 0}.hide{display:none}
`;

export const HOME_HTML = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><link rel="icon" href="/icon.svg" type="image/svg+xml"><link rel="apple-touch-icon" href="/apple-touch-icon.png">
<title>WhatsApp Inbox</title><style>${STYLE}</style></head><body><main>
<h1>WhatsApp Inbox</h1><p class="muted">A private server that forwards WhatsApp messages from a phone to Claude. If you got a setup link, open it on your phone.</p>
</main></body></html>`;

export const SETUP_HTML = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><link rel="icon" href="/icon.svg" type="image/svg+xml"><link rel="apple-touch-icon" href="/apple-touch-icon.png">
<title>WhatsApp Inbox setup</title><style>${STYLE}</style></head><body><main>
<h1>WhatsApp Inbox setup</h1>
<p class="muted" id="hello"></p>
<div id="bad" class="card hide">This link is incomplete. Ask whoever sent it for a new one.</div>
<div id="ok" class="hide">
<div class="card"><h2>Step 1: the app on your phone (Android)</h2>
<ol><li><a class="btn" href="/wa-forwarder.apk" download>Download the app</a><br>Install <b>WA Forwarder</b>. If Play Protect blocks it: Google Play → profile → Play Protect → ⚙️ → turn scanning off for a moment, install, then turn it back on.</li>
<li>Open this page <b>on the phone</b> and tap:</li></ol>
<a class="btn" id="deeplink" href="#">Set up the app automatically</a>
<p class="muted">If the button does nothing, enter these in the app by hand:<br>Server URL: <span class="mono" id="inurl"></span>Personal key: <span class="mono" id="insecret"></span></p>
<ol start="3"><li>In the app, tap "Notification access". If the switch is greyed out: Settings → Apps → WA Forwarder → ⋮ → "Allow restricted settings".</li>
<li>Tap "Run in background" (turn off battery optimization), then "Send test message".</li></ol></div>
<div class="card"><h2>Step 2: connect Claude (on your computer)</h2>
<ol><li>On claude.ai: <b>Settings → Connectors → Add custom connector</b>.</li>
<li>Name: <b>WhatsApp</b>. Remote MCP server URL:</li></ol>
<span class="mono" id="mcpurl"></span><button class="secondary" id="copymcp">Copy URL</button>
<ol start="3"><li>Save, then in a new chat ask something like: "What came in on WhatsApp today?"</li></ol>
<p class="muted">⚠️ This URL is the key to your messages. Don't share it.</p></div>
<p class="muted">Experimental open-source tool, provided as is with no warranty. Installing and using it is at your own discretion and risk.</p>
</div>
<script>
const p=new URLSearchParams(location.hash.slice(1));const tin=p.get('in'),tmcp=p.get('mcp'),name=p.get('n');
if(!tin||!tmcp){document.getElementById('bad').classList.remove('hide')}else{
document.getElementById('ok').classList.remove('hide');
if(name)document.getElementById('hello').textContent='Hi '+name+', setup takes about 5 minutes.';
const ingest=location.origin+'/ingest',mcp=location.origin+'/mcp/'+tmcp;
document.getElementById('deeplink').href='waforwarder://config?url='+encodeURIComponent(ingest)+'&secret='+encodeURIComponent(tin);
document.getElementById('inurl').textContent=ingest;document.getElementById('insecret').textContent=tin;
document.getElementById('mcpurl').textContent=mcp;
document.getElementById('copymcp').onclick=async e=>{try{await navigator.clipboard.writeText(mcp);e.target.textContent='Copied ✓'}catch{}};}
</script></main></body></html>`;

export const ADMIN_HTML = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><link rel="icon" href="/icon.svg" type="image/svg+xml"><link rel="apple-touch-icon" href="/apple-touch-icon.png">
<title>WhatsApp Inbox admin</title><style>${STYLE}</style>
<script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"></script></head><body><main>
<h1>WhatsApp Inbox admin</h1>
<div class="card" id="login"><label for="tok">Admin password (ADMIN_TOKEN)</label><input id="tok" type="password" autocomplete="current-password">
<button id="enter">Sign in</button><p class="muted" id="loginmsg"></p></div>
<div id="app" class="hide">
<div class="card"><h2>Add a user</h2>
<label for="name">Name</label><input id="name" placeholder="e.g. Dana">
<label for="ret">Keep messages for (days)</label><input id="ret" type="number" value="30" min="1" max="3650">
<button id="create">Create user</button></div>
<div class="card hide" id="result"><h2 id="rtitle"></h2>
<p>Send this link to the user (or let them scan the code with their phone). <b>It is shown only once.</b></p>
<span class="mono" id="rlink"></span><button class="secondary" id="copylink">Copy link</button>
<div><div id="qr"></div></div>
<p class="muted">Claude connector URL: <span class="mono" id="rmcp"></span></p></div>
<div class="card"><h2>Users</h2><table><thead><tr><th>Name</th><th>Messages</th><th>Last message</th><th>Claude</th><th>Keep</th><th></th></tr></thead><tbody id="rows"></tbody></table></div>
</div>
<script>
let T='';try{T=sessionStorage.getItem('adm')||''}catch{}
const $=id=>document.getElementById(id);
async function api(path,opt={}){const r=await fetch('/admin/api/'+path,{...opt,headers:{'Content-Type':'application/json','X-Admin-Token':T}});const j=await r.json();if(!r.ok)throw new Error(j.error||r.status);return j}
const when=t=>t?new Date(t).toLocaleString(undefined,{dateStyle:'short',timeStyle:'short'}):'—';
async function load(){const {users}=await api('users');$('rows').innerHTML='';for(const u of users){const tr=document.createElement('tr');
tr.innerHTML='<td></td><td></td><td></td><td></td><td></td><td></td>';const c=tr.children;c[0].textContent=u.name;c[1].textContent=u.message_count;c[2].textContent=when(u.last_ingest_at);c[3].textContent=when(u.last_mcp_at);c[4].textContent=u.retention_days+' days';
const rot=document.createElement('button');rot.className='secondary';rot.textContent='New link';rot.onclick=async()=>{if(!confirm('Create a new link for '+u.name+'? The old link stops working, and the app and Claude need to be set up again.'))return;show(await api('users/'+u.id+'/rotate',{method:'POST'}))};
const del=document.createElement('button');del.className='danger';del.textContent='Delete';del.onclick=async()=>{if(!confirm('Delete '+u.name+' and all of their messages? This cannot be undone.'))return;await api('users/'+u.id,{method:'DELETE'});load()};
c[5].append(rot,' ',del);$('rows').append(tr)}}
function show(r){$('result').classList.remove('hide');$('rtitle').textContent='Created: '+r.name;$('rlink').textContent=r.setup_link;$('rmcp').textContent=r.mcp_url;
$('qr').innerHTML='';if(window.QRCode)new QRCode($('qr'),{text:r.setup_link,width:220,height:220,correctLevel:QRCode.CorrectLevel.L});
$('copylink').onclick=async e=>{try{await navigator.clipboard.writeText(r.setup_link);e.target.textContent='Copied ✓'}catch{}};load()}
async function enter(){try{await load();try{sessionStorage.setItem('adm',T)}catch{}$('login').classList.add('hide');$('app').classList.remove('hide')}catch(e){$('loginmsg').textContent='Error: '+e.message}}
$('enter').onclick=()=>{T=$('tok').value.trim();enter()};
$('create').onclick=async()=>{try{show(await api('users',{method:'POST',body:JSON.stringify({name:$('name').value,retention_days:+$('ret').value})}));$('name').value=''}catch(e){alert(e.message)}};
if(T)enter();
</script></main></body></html>`;
