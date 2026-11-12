#!/usr/bin/env bash
# Concatenates game/src into two files:
#   helios.html - page fragment (no doctype/head), the form the Artifact publisher expects
#   index.html  - standalone page you can open directly or serve from any static host
set -euo pipefail
cd "$(dirname "$0")"
{
  cat src/head.html
  echo '<script>'
  echo '(() => {'
  cat src/0*.js
  echo '})();'
  echo '</script>'
} > helios.html
{
  echo '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><style>body{margin:0}[hidden]{display:none!important}</style></head><body>'
  cat helios.html
  echo '</body></html>'
} > index.html
echo "built: $(wc -c < helios.html) bytes"
