"""Song Splitter — local web app.

Start it with:   uv run server.py
Then your browser opens http://localhost:8765 . Paste a YouTube link or pick an audio file.
Everything runs on this computer; processed songs are kept in the cache/ folder.
"""
from __future__ import annotations

import argparse
import json
import mimetypes
import os
import queue
import re
import shutil
import tempfile
import threading
import traceback
import uuid
import webbrowser
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import unquote, urlparse

import splitter

HERE = Path(__file__).resolve().parent
WEB = HERE / "web"
CACHE = splitter.CACHE
MAX_UPLOAD = 300 * 1024 * 1024
ID_RE = re.compile(r"^[a-z]+-[A-Za-z0-9_-]{6,40}$")
FILE_RE = re.compile(r"^[a-z-]+\.(flac|mid|musicxml|json)$")
mimetypes.add_type("audio/flac", ".flac")
mimetypes.add_type("audio/midi", ".mid")
mimetypes.add_type("application/vnd.recordare.musicxml+xml", ".musicxml")
mimetypes.add_type("text/javascript", ".js")

jobs: dict[str, dict] = {}
work_q: "queue.Queue[str]" = queue.Queue()
lock = threading.Lock()


def worker():
    """Process one song at a time (splitting uses every CPU core)."""
    while True:
        job_id = work_q.get()
        job = jobs[job_id]
        job.update(state="running", text="Starting…")

        def cb(frac, text, job=job):
            job.update(progress=round(frac, 3), text=text)

        try:
            meta = splitter.process(job["source"], title=job.get("title"), progress_cb=cb, song_id=job["song_id"])
            job.update(state="done", progress=1.0, text="Done", song_id=meta["id"])
        except Exception as e:  # report a friendly message, keep the details in the terminal
            traceback.print_exc()
            msg = str(e).splitlines()[0] if str(e) else e.__class__.__name__
            if splitter.is_youtube(job["source"]):
                msg = friendly_youtube_error(msg)
            job.update(state="error", text=msg[:300])
        finally:
            if job.get("tmpfile"):
                Path(job["tmpfile"]).unlink(missing_ok=True)


def friendly_youtube_error(msg: str) -> str:
    low = msg.lower()
    if "sign in to confirm you" in low or "not a bot" in low:
        return "YouTube refused the download (it thinks this is a bot). Try again later, or upload the audio file instead."
    if "private video" in low or "video unavailable" in low or "has been removed" in low:
        return "That video is private, removed or not available in your country."
    if "confirm your age" in low or "age-restricted" in low:
        return "That video is age-restricted, so it can't be downloaded without signing in. Upload the audio file instead."
    if any(w in low for w in ("unable to connect", "proxy", "network is unreachable", "timed out",
                              "failed to resolve", "name resolution", "getaddrinfo")):
        return "Couldn't reach YouTube — check your internet connection and try again."
    if low.startswith("error: [youtube]"):
        return ("YouTube download failed. Updating may help: in this folder run  uv sync --upgrade-package yt-dlp  "
                "and restart. Or upload the audio file instead.")
    return msg


def new_job(source: str, song_id: str, title: str | None = None, tmpfile: str | None = None) -> dict:
    with lock:
        # same song already queued or running? reuse that job
        for j in jobs.values():
            if j["song_id"] == song_id and j["state"] in ("queued", "running"):
                if tmpfile:
                    Path(tmpfile).unlink(missing_ok=True)
                return j
        job_id = uuid.uuid4().hex[:12]
        job = dict(id=job_id, source=source, song_id=song_id, title=title, tmpfile=tmpfile,
                   state="queued", progress=0.0, text="In the queue…")
        jobs[job_id] = job
    if (CACHE / song_id / "meta.json").exists():
        job.update(state="done", progress=1.0, text="Already processed")
        if tmpfile:
            Path(tmpfile).unlink(missing_ok=True)
    else:
        work_q.put(job_id)
    return job


def public(job: dict) -> dict:
    return {k: job[k] for k in ("id", "state", "progress", "text", "song_id")}


def list_songs() -> list[dict]:
    out = []
    for meta_path in CACHE.glob("*/meta.json"):
        try:
            m = json.loads(meta_path.read_text())
        except Exception:
            continue
        out.append({k: m.get(k) for k in ("id", "title", "duration", "tempo", "created")} | {"key": m["key"]["name"]})
    out.sort(key=lambda m: m.get("created") or "", reverse=True)
    return out


class Handler(BaseHTTPRequestHandler):
    server_version = "SongSplitter/1.0"

    def log_message(self, fmt, *args):  # keep the terminal quiet
        pass

    # ------------------------------------------------------------ helpers
    def send_json(self, obj, status=200):
        body = json.dumps(obj).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    def send_file(self, path: Path, download_name: str | None = None):
        """Serve a file with HTTP Range support (needed for seeking in audio)."""
        if not path.is_file():
            return self.send_error(HTTPStatus.NOT_FOUND)
        size = path.stat().st_size
        ctype = mimetypes.guess_type(path.name)[0] or "application/octet-stream"
        start, end = 0, size - 1
        rng = self.headers.get("Range")
        status = 200
        if rng:
            m = re.match(r"bytes=(\d*)-(\d*)", rng)
            if m:
                if m.group(1):
                    start = int(m.group(1))
                    if m.group(2):
                        end = min(int(m.group(2)), size - 1)
                elif m.group(2):  # suffix range: last N bytes
                    start = max(0, size - int(m.group(2)))
                if start > end or start >= size:
                    self.send_response(HTTPStatus.REQUESTED_RANGE_NOT_SATISFIABLE)
                    self.send_header("Content-Range", f"bytes */{size}")
                    self.end_headers()
                    return
                status = 206
        length = end - start + 1
        self.send_response(status)
        self.send_header("Content-Type", ctype)
        self.send_header("Accept-Ranges", "bytes")
        self.send_header("Content-Length", str(length))
        if status == 206:
            self.send_header("Content-Range", f"bytes {start}-{end}/{size}")
        if download_name:
            self.send_header("Content-Disposition", f'attachment; filename="{download_name}"')
        self.send_header("Cache-Control", "no-cache")
        self.end_headers()
        if self.command == "HEAD":
            return
        with open(path, "rb") as f:
            f.seek(start)
            left = length
            try:
                while left > 0:
                    chunk = f.read(min(1 << 16, left))
                    if not chunk:
                        break
                    self.wfile.write(chunk)
                    left -= len(chunk)
            except (BrokenPipeError, ConnectionResetError):
                pass  # browser stopped reading (normal when seeking)

    def read_json(self) -> dict:
        n = int(self.headers.get("Content-Length") or 0)
        if n > 100_000:
            raise ValueError("request too large")
        return json.loads(self.rfile.read(n) or b"{}")

    def request_allowed(self) -> bool:
        """Block other websites from driving this local app.

        - Host must be localhost or a raw IP (defeats DNS-rebinding tricks).
        - Changes (POST/DELETE) from a browser must come from this page itself.
        """
        host = (self.headers.get("Host") or "").rsplit(":", 1)[0].strip("[]").lower()
        if host != "localhost" and not re.fullmatch(r"[0-9.]+|[0-9a-f:]+", host):
            self.send_json({"error": "forbidden host"}, 403)
            return False
        if self.command in ("POST", "DELETE"):
            origin = self.headers.get("Origin")
            if origin and urlparse(origin).netloc != self.headers.get("Host"):
                self.send_json({"error": "forbidden origin"}, 403)
                return False
        return True

    # ------------------------------------------------------------ routes
    def do_HEAD(self):
        self.do_GET()

    def do_GET(self):
        if not self.request_allowed():
            return
        path = unquote(urlparse(self.path).path)
        if path in ("/", "/index.html"):
            return self.send_file(WEB / "index.html")
        if path.startswith("/web/"):
            target = (WEB / path[5:]).resolve()
            if WEB.resolve() not in target.parents:
                return self.send_error(HTTPStatus.FORBIDDEN)
            return self.send_file(target)
        if path == "/api/songs":
            return self.send_json(list_songs())
        m = re.match(r"^/api/jobs/([a-f0-9]{12})$", path)
        if m:
            job = jobs.get(m.group(1))
            return self.send_json(public(job)) if job else self.send_json({"error": "unknown job"}, 404)
        m = re.match(r"^/songs/([^/]+)/([^/]+)$", path)
        if m and ID_RE.match(m.group(1)) and FILE_RE.match(m.group(2)):
            dl = None
            if "download=1" in (urlparse(self.path).query or ""):
                meta = json.loads((CACHE / m.group(1) / "meta.json").read_text())
                safe = re.sub(r"[^A-Za-z0-9 _.-]+", "", meta.get("title", "song"))[:60].strip() or "song"
                dl = f"{safe} - {m.group(2)}"
            return self.send_file(CACHE / m.group(1) / m.group(2), dl)
        self.send_error(HTTPStatus.NOT_FOUND)

    def do_POST(self):
        if not self.request_allowed():
            return
        path = urlparse(self.path).path
        try:
            if path == "/api/process":
                if not (self.headers.get("Content-Type") or "").startswith("application/json"):
                    return self.send_json({"error": "expected JSON"}, 415)
                url = str(self.read_json().get("url", "")).strip()
                if not splitter.is_youtube(url) or not url.startswith(("http://", "https://", "youtu", "www.", "music.")):
                    return self.send_json({"error": "That doesn't look like a YouTube link."}, 400)
                if not url.startswith("http"):
                    url = "https://" + url
                return self.send_json(public(new_job(url, splitter.song_id_for(url))))
            if path == "/api/upload":
                if not self.headers.get("X-Filename"):  # custom header = browsers must ask permission first
                    return self.send_json({"error": "missing file name"}, 400)
                n = int(self.headers.get("Content-Length") or 0)
                if n <= 0 or n > MAX_UPLOAD:
                    return self.send_json({"error": "File is empty or larger than 300 MB."}, 400)
                name = unquote(self.headers.get("X-Filename") or "upload")
                suffix = Path(name).suffix[:8] or ".audio"
                fd, tmp = tempfile.mkstemp(suffix=suffix)
                with os.fdopen(fd, "wb") as f:
                    left = n
                    while left > 0:
                        chunk = self.rfile.read(min(1 << 20, left))
                        if not chunk:
                            break
                        f.write(chunk)
                        left -= len(chunk)
                if left > 0:
                    Path(tmp).unlink(missing_ok=True)
                    return self.send_json({"error": "The upload was interrupted — please try again."}, 400)
                title = Path(name).stem[:120] or "Uploaded song"
                return self.send_json(public(new_job(tmp, splitter.song_id_for(tmp), title=title, tmpfile=tmp)))
        except Exception as e:
            traceback.print_exc()
            return self.send_json({"error": str(e)[:300]}, 400)
        self.send_error(HTTPStatus.NOT_FOUND)

    def do_DELETE(self):
        if not self.request_allowed():
            return
        m = re.match(r"^/api/songs/([^/]+)$", urlparse(self.path).path)
        if m and ID_RE.match(m.group(1)) and (CACHE / m.group(1)).is_dir():
            shutil.rmtree(CACHE / m.group(1))
            return self.send_json({"ok": True})
        self.send_json({"error": "not found"}, 404)


def main():
    ap = argparse.ArgumentParser(description="Song Splitter local web app")
    ap.add_argument("--port", type=int, default=8765)
    ap.add_argument("--no-browser", action="store_true")
    ap.add_argument("--lan", action="store_true", help="also allow phones/tablets on your Wi-Fi to connect")
    args = ap.parse_args()
    CACHE.mkdir(exist_ok=True)
    for p in CACHE.glob("*.partial"):  # leftovers from an interrupted run
        shutil.rmtree(p, ignore_errors=True)
    threading.Thread(target=worker, daemon=True).start()
    host = "0.0.0.0" if args.lan else "127.0.0.1"
    srv = ThreadingHTTPServer((host, args.port), Handler)
    url = f"http://localhost:{args.port}"
    print(f"\n  Song Splitter is running →  {url}\n  (leave this window open; press Ctrl+C to stop)\n")
    if not args.no_browser:
        threading.Timer(1.0, lambda: webbrowser.open(url)).start()
    try:
        srv.serve_forever()
    except KeyboardInterrupt:
        print("\nStopped.")


if __name__ == "__main__":
    main()
