#!/bin/bash
# Double-click this file on a Mac to start Song Splitter.
cd "$(dirname "$0")" || exit 1
export PATH="$HOME/.local/bin:$HOME/.cargo/bin:$PATH"
if ! command -v uv >/dev/null 2>&1; then
  echo "Installing uv (a small tool that sets up Python for this app)…"
  curl -LsSf https://astral.sh/uv/install.sh | sh || { echo "Could not install uv."; read -r; exit 1; }
  export PATH="$HOME/.local/bin:$PATH"
fi
echo "Starting Song Splitter (the first start downloads ~1–2 GB and takes a few minutes)…"
uv run server.py "$@"
echo "Song Splitter stopped. Press Enter to close."; read -r
