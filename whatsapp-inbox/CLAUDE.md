# CLAUDE.md: build-and-deploy playbook

You are Claude Code, and the person in front of you wants their own **WhatsApp Inbox**: incoming WhatsApp
messages on their Android phone forwarded (from notifications only, no blue ticks) to a private Cloudflare
Worker + D1 server they own, and exposed to Claude as a custom MCP connector.

Your job is to **do the whole setup for them**, end to end, and stop only at the checkpoints marked
**🙋 USER ACTION REQUIRED**, where a human has to log in, approve something, or touch the phone.
Finish by producing a **personalized, illustrated install guide** for them (an Artifact if you can).

**Start with Phase 0: show the disclaimer and get the user's explicit OK.**

Read this whole file before you start. Keep a visible checklist of the phases below and update it as you go.

---

## Ground rules (non-negotiable)

1. **Secrets never leave the machine.** The admin password, setup links, ingest tokens (`in_…`), MCP URLs
   (`…/mcp/mcp_…`) and the APK signing key are secrets. Never put them in a git commit, a public repo, an
   Artifact, a guide, a screenshot, an issue, or any web service other than the user's own Cloudflare account
   and their own claude.ai settings. Don't echo them back in chat unless the user asks; point to the file instead.
2. **One secrets folder, outside the repo.** Create `../whatsapp-inbox-secrets/` (a sibling of this repo folder)
   and keep everything sensitive there: `secrets.txt` (admin password, server URL, setup link, MCP URL) and a
   backup copy of `android/signing/`. Tell the user where it is and that it should be backed up privately.
3. **Don't push the user's filled-in config to a public remote.** After the first deploy, `wrangler.jsonc` gets
   their D1 database id. If they forked this repo publicly, don't commit that change (or make the fork private).
4. **Messages are sensitive.** Never read, print or summarize the user's real WhatsApp messages during setup.
   To verify, use the test message and the message *count* only.
5. **Ask before anything outward-facing or irreversible** (creating accounts, deleting users or data,
   publishing anything). Everything else: just do it and say what you did.
6. **Browser first.** For every web step (Cloudflare sign-up, `wrangler login` consent, claude.ai connector),
   use a browser tool if you have one: Claude in Chrome (`mcp__claude-in-chrome__*`), the Claude desktop app's
   built-in browser, or computer use. Navigate, fill and click for the user; hand over only for passwords,
   2FA, CAPTCHAs, email verification and "Allow" consent clicks. If you have no browser tool, give the user the
   exact URL and a short click path, then wait.

### Platform notes

- **Windows (PowerShell):** plain `npx` is often blocked by the execution policy. Use **`npx.cmd`** (and
  `npm.cmd`) everywhere. Run `android/build.sh` with **Git Bash** (`"C:\Program Files\Git\bin\bash.exe" android/build.sh`).
- **macOS / Linux:** `npx` and `bash` as usual.
- Below, `npx` means `npx.cmd` on Windows.

---

## Phase 0: Disclaimer (before anything else)

Before installing, building or deploying anything, show the user this disclaimer in plain words and ask them to
confirm they accept it. **Do not continue until they explicitly agree.** If they decline, stop.

> **Use at your own discretion and risk.** This tool is provided as is, with no warranty of any kind. You are solely
> responsible for using it, for the server you run, and for the messages it stores; the authors accept no liability.
> The messages it forwards were written by other people, so make sure your use complies with your local laws and with
> WhatsApp's and Google's terms, and tell any friends you invite that whoever controls the Cloudflare account can
> technically read their messages. Setup lowers some phone protections on purpose (sideloading, a temporary Play
> Protect bypass, restricted settings, notification access). It can break or miss messages at any time, so don't
> rely on it for anything important.

## Phase 0b: Preflight

Check, and install what's missing (ask once before installing system packages):

| Need | Check | Install hint |
|---|---|---|
| Node.js 20+ | `node -v` | winget `OpenJS.NodeJS.LTS` · brew `node` · nvm |
| JDK 17+ (java, javac, keytool) | `javac -version` | winget `Microsoft.OpenJDK.17` · brew `openjdk@17` · apt `openjdk-17-jdk-headless` |
| Python 3 | `python3 --version` (or `python`) | winget `Python.Python.3.12` · brew `python` · apt `python3` |
| curl, bash | Git Bash on Windows has both | winget `Git.Git` |

No Android Studio or Android SDK is needed: `android/build.sh` downloads its build tools from Maven Central.

Then `npm install` in the repo root.

## Phase 1: Ask the user four things

Ask in one go (use a multiple-choice question tool if you have one):

1. **Their first name** (shown on their setup page and guide).
2. **Their time zone**, as an IANA name (e.g. `Europe/London`, `America/New_York`, `Asia/Jerusalem`). Default: guess from the system.
3. **How long to keep messages** on the server, in days. Default **30**.
4. **Will friends use it too?** (Each friend gets a separate user and key. The owner of the Cloudflare account
   can technically read everyone's messages; friends must be told.)

Write the time zone into `wrangler.jsonc` → `vars.TIMEZONE`.

## Phase 2: Cloudflare account

Cloudflare's free plan is enough (Workers + D1 + a daily cron).

**🙋 USER ACTION REQUIRED: Cloudflare account.** If they don't have one: open
`https://dash.cloudflare.com/sign-up` in the browser, let them enter email and password and verify the email.
If they do: make sure they're signed in at `https://dash.cloudflare.com`.

**workers.dev subdomain.** A brand-new account has no `*.workers.dev` subdomain yet. Open
**Workers & Pages** in the dashboard; if it asks to choose a subdomain, let the user pick one (it becomes part of
their server URL: `https://whatsapp-inbox.<subdomain>.workers.dev`). Wrangler may also ask for it during the first
deploy; answer with their choice.

## Phase 3: Log Wrangler in

```bash
npx wrangler login
```

This opens a Cloudflare consent page. **🙋 USER ACTION REQUIRED: click "Allow".** If you have a browser tool and
the page opened there, navigate to it and let the user click. Confirm with `npx wrangler whoami`.

Headless or remote machine? Use `npx wrangler login --browser=false` and give the user the printed URL, or have
them create an API token (template "Edit Cloudflare Workers" + D1 edit) and set `CLOUDFLARE_API_TOKEN`
in the environment (never in a file inside the repo).

## Phase 4: Build the Android app

```bash
bash android/build.sh          # Windows: Git Bash
```

- First run downloads ~120 MB of build tools into `android/.build-tools/` (git-ignored).
- It **generates a brand-new signing key** in `android/signing/` with a random password (git-ignored).
  Copy `android/signing/` into `../whatsapp-inbox-secrets/signing-backup/` right away. Losing it means future
  app updates can't install over the old app (the user would have to uninstall first).
- Output: `public/wa-forwarder.apk`, which the Worker serves at `/wa-forwarder.apk`. Build **before** deploying.
- Expect `verified=true … v2=true` and `alignment ok`.

## Phase 5: Deploy the server

```bash
npx wrangler deploy
```

- The D1 database `whatsapp-inbox` is created automatically on the first deploy, and its id is written into
  `wrangler.jsonc`. If your Wrangler version doesn't auto-provision, run
  `npx wrangler d1 create whatsapp-inbox --binding DB --update-config` and deploy again.
- The schema is created on first request; there are no migrations to run.
- Note the URL it prints: `https://whatsapp-inbox.<subdomain>.workers.dev`. Check `GET <url>/health` returns `{"ok":true}`.

## Phase 6: Admin password

Generate a long random password locally (e.g. `node -e "console.log(require('crypto').randomBytes(24).toString('base64url'))"`),
write it to `../whatsapp-inbox-secrets/secrets.txt` as `ADMIN_TOKEN: …` together with `SERVER: <url>`, and set it
on the Worker **from stdin** so it never appears in shell history:

```bash
# bash
npx wrangler secret put ADMIN_TOKEN < <(sed -n 's/^ADMIN_TOKEN: //p' ../whatsapp-inbox-secrets/secrets.txt)
# PowerShell
(Get-Content ..\whatsapp-inbox-secrets\secrets.txt | Select-String '^ADMIN_TOKEN: ').ToString().Substring(13) | npx.cmd wrangler secret put ADMIN_TOKEN
```

## Phase 7: Create the user's own account

Preferred (browser): open `<url>/admin`, sign in with the admin password (paste it for them or let them type it),
add a user with **their name** and **their retention days**, click **Create user**. The page shows the setup link
and a **QR code** once. Copy the link and the "Claude connector URL" into `secrets.txt` as `SETUP_LINK:` and `MCP_URL:`.

Fallback (API):

```bash
curl -s -X POST "<url>/admin/api/users" -H "X-Admin-Token: <admin password>" \
     -H "Content-Type: application/json" -d '{"name":"<Name>","retention_days":30}'
```

The response has `setup_link` and `mcp_url`. Save both to `secrets.txt`; don't print them in chat.

Repeat for each friend if they asked for it, saving each link under the friend's name. Send each friend only
their own link, privately.

## Phase 8: Connect Claude

**🙋 USER ACTION REQUIRED (or browser):** on `https://claude.ai/settings/connectors` → **Add custom connector**:

- Name: `WhatsApp`
- Remote MCP server URL: the `MCP_URL` from `secrets.txt`
- Advanced settings / OAuth: leave empty → **Add**

With a browser tool you can fill this in for them (it's their own account and their own browser). Without one,
tell them to copy the URL from `secrets.txt`. Four tools should appear: `recent_messages`, `search_messages`,
`list_chats`, `get_conversation`. Custom connectors may need a paid Claude plan; if the button is missing, say so.

## Phase 9: The phone

This part is all **🙋 USER ACTION REQUIRED**: you can't touch their phone. Get the setup link onto the phone
(scan the QR from the admin page, or they send the link to themselves through a private channel), then walk them
through it, one checkpoint at a time, waiting for "done" after each:

1. **Open the setup link on the phone** in Chrome → **Download the app** → "Download anyway".
2. **Allow Chrome to install apps** ("Install unknown apps" → Allow from this source).
3. **Google Play Protect** will likely block it ("App blocked to protect your device"). Tap **More details →
   Install anyway**; if that's not offered: Google Play → profile → Play Protect → ⚙️ → turn off **Scan apps with
   Play Protect**, install, then **turn it back on**.
4. **Install**, then back on the setup page tap **Set up the app automatically** (fills server + key).
5. **Notification access**: in the app tap **Allow** on step 2. On Android 13+ the switch is greyed out
   ("Restricted setting"): Settings → Apps → WA Forwarder → ⋮ → **Allow restricted settings**, then turn the switch on.
6. **Battery**: tap **Allow** on step 3 ("Run in background"). Samsung/Xiaomi/Huawei may need extra
   "never sleeping"/autostart settings (the guide covers them).
7. **Send test message** in the app. Status should read **Active · forwarding** and **Sent OK**.

## Phase 10: Verify (without reading messages)

```bash
curl -s "<url>/admin/api/users" -H "X-Admin-Token: <admin password>"
```

Their user should show a recent `last_ingest_at` (the test message updates it but is not stored).
`message_count` goes up once a real message from someone else arrives; that's the end-to-end proof. Then ask the user to open
a new Claude chat with the WhatsApp connector on and ask: *"What came in on WhatsApp in the last hour?"*

## Phase 11: The personalized install guide (deliverable)

Generate it from the template; it contains **no secrets**, only the public server URL:

```bash
node guide/make-guide.mjs --server https://whatsapp-inbox.<subdomain>.workers.dev --owner "<Name>" --retention <days>
#   → guide/out/index.html + guide/out/img/   (add --inline for a single self-contained file)
#   --for friend   makes the version to send to invited friends ("ask <Name> for your link")
```

- **If you have an Artifact tool**, publish `guide/out/index.html` with the files in `guide/out/img/` as an
  Artifact titled "WhatsApp Inbox Install Guide", and give the user the link. Artifacts start private.
- Otherwise, build with `--inline` and open the file locally (and copy it into `../whatsapp-inbox-secrets/`).
- If friends will use it, also make a `--for friend` version they can share.
- Double-check the output has no `in_`, `mcp_`, `/setup#` or admin password before publishing:
  `grep -E "in_[A-Za-z0-9_-]{10}|mcp_[A-Za-z0-9_-]{10}|/setup#" guide/out/index.html` must print nothing.

## Phase 12: Wrap up

Tell the user, briefly:

- Their server URL and admin page (`<url>/admin`), and where `secrets.txt` and the signing-key backup live.
- To **turn Play Protect scanning back on** if they turned it off.
- How to add a friend (admin page → Create user → send the link + the friend guide).
- That messages auto-delete after N days, and the Cloudflare account owner can technically read stored messages.

---

## Reference

### Architecture

```
Android (WA Forwarder)  --POST /ingest (X-Webhook-Secret: in_…)-->  Cloudflare Worker + D1  <--MCP-- Claude
  NotificationListenerService                                        /mcp/<mcp_token>   (custom connector)
  reads notifications only                                           /admin  /setup  daily purge cron
```

| Path | What |
|---|---|
| `src/index.js` | Routes: `/ingest`, `/mcp/<token>`, `/admin`, `/admin/api/*`, `/setup`, `/health`, daily cron |
| `src/mcp.js` | Stateless MCP over Streamable HTTP (JSON responses): `recent_messages`, `search_messages`, `list_chats`, `get_conversation` |
| `src/db.js` | D1 schema (auto-created), per-user tokens stored as SHA-256 hashes, retention purge |
| `src/pages.js` | Admin, setup and home pages (static HTML) |
| `android/` | WA Forwarder app (plain Java, no Gradle), `build.sh` builds + signs without the Android SDK |
| `guide/` | Install-guide template + generator |
| `docs/mockups/` | Source of every screenshot in the README and guide (fake data only) |

### Updating later

- Server change: `npx wrangler deploy`.
- App change: bump `VERSION_CODE`/`VERSION_NAME` (env vars for `build.sh`), rebuild **with the same
  `android/signing/`**, deploy, and have users download and install over the old app.

### Troubleshooting

| Symptom | Fix |
|---|---|
| `npx : … running scripts is disabled` (Windows) | Use `npx.cmd`. |
| Wrangler: "You need to register a workers.dev subdomain" | Dashboard → Workers & Pages → choose a subdomain, deploy again. |
| `/admin` says "ADMIN_TOKEN secret is not set" | Phase 6 didn't run (or ran on another account). Set it again. |
| App status shows **401** | Wrong or rotated key. Open the latest setup link → "Set up the app automatically". |
| Connector shows an error in Claude | URL pasted incompletely or rotated. Delete the connector and add it again with the current `MCP_URL`. |
| "App not installed" on the phone | An older APK signed with a different key is installed. Uninstall it first. |
| Messages stop after a few hours | OEM battery saver. See the guide's Troubleshooting section. |
| `build.sh`: `aapt2: cannot execute` | Wrong platform binary; delete `android/.build-tools/prebuilt` and rerun. |
