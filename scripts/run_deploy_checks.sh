#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
export ROOT_DIR

log() {
  printf '\n[%s] %s\n' "$(date -u '+%Y-%m-%dT%H:%M:%SZ')" "$1"
}

# The CI workflow already runs the full TypeScript and Python test suites.
# This script now assumes the build artifacts produced there are available so
# that we only need to assemble the static bundle (plus an optional smoke test).

log "Verifying TypeScript build artifacts (tools/ts/dist)"
TS_DIST_DIR="$ROOT_DIR/tools/ts/dist"
if [ ! -d "$TS_DIST_DIR" ]; then
  log "Missing TypeScript build output in $TS_DIST_DIR"
  log "Run 'npm run build' (or 'npm test') from tools/ts before invoking this script."
  exit 1
fi

log "Preparing static deploy bundle"
DIST_DIR=$(mktemp -d "dist.XXXXXX" -p "$ROOT_DIR")
DATA_SOURCE_DIR="${DEPLOY_DATA_DIR:-$ROOT_DIR/data}"
if [ ! -d "$DATA_SOURCE_DIR" ]; then
  log "Dataset directory '$DATA_SOURCE_DIR' non trovato"
  exit 1
fi
export DATA_SOURCE_DIR
cp -r "$ROOT_DIR/docs/test-interface" "$DIST_DIR/test-interface"
cp -r "$DATA_SOURCE_DIR" "$DIST_DIR/data"
if [ -f "$ROOT_DIR/docs/test-interface/favicon.ico" ]; then
  cp "$ROOT_DIR/docs/test-interface/favicon.ico" "$DIST_DIR/"
fi
cat <<'HTML' >"$DIST_DIR/index.html"
<!DOCTYPE html>
<html lang="it">
  <head>
    <meta charset="utf-8" />
    <title>Test Interface Dashboard</title>
    <meta http-equiv="refresh" content="0; url=test-interface/" />
  </head>
  <body>
    <p>Redirecting to the <a href="test-interface/">test interface dashboard</a>…</p>
  </body>
</html>
HTML

log "Deploy bundle ready at $DIST_DIR"
SMOKE_TEST_MESSAGE=""
SMOKE_TEST_DETAILS=()

DATA_FILE_TOTAL=$(find "$DIST_DIR/data" -type f | wc -l | tr -d ' ')
SMOKE_TEST_DETAILS+=("  - Dataset copiato con ${DATA_FILE_TOTAL} file totali.")

if [ "${DEPLOY_SKIP_SMOKE_TEST:-0}" = "1" ]; then
  log "Skipping smoke test HTTP server (DEPLOY_SKIP_SMOKE_TEST=1)"
  SMOKE_TEST_MESSAGE="Smoke test HTTP: non eseguito"
  SMOKE_TEST_DETAILS+=("  - Motivo: variabile DEPLOY_SKIP_SMOKE_TEST impostata a 1.")
else
  log "Starting smoke test HTTP server for the deploy bundle"
  PORT=$(python3 - <<'PY'
import socket

with socket.socket() as sock:
    sock.bind(("127.0.0.1", 0))
    print(sock.getsockname()[1])
PY
  )
  SERVER_LOG=$(mktemp "deploy-server.XXXXXX.log" -p "$ROOT_DIR")
  python3 -m http.server "$PORT" --bind 127.0.0.1 --directory "$DIST_DIR" \
    >"$SERVER_LOG" 2>&1 &
  SERVER_PID=$!
  cleanup_server() {
    if kill "$SERVER_PID" 2>/dev/null; then
      wait "$SERVER_PID" 2>/dev/null || true
    fi
  }
  trap cleanup_server EXIT

  for _ in $(seq 1 10); do
    if curl --silent --fail --show-error "http://127.0.0.1:$PORT/index.html" \
      >/dev/null 2>&1; then
      break
    fi
    sleep 0.5
  done
  curl --silent --fail --show-error "http://127.0.0.1:$PORT/test-interface/index.html" \
    >/dev/null
  log "Static site responded successfully on http://127.0.0.1:$PORT/"
  trap - EXIT
  cleanup_server
  rm -f "$SERVER_LOG"

  SMOKE_TEST_URL="http://127.0.0.1:$PORT/"
  SMOKE_TEST_MESSAGE="Smoke test HTTP: server Python attivo su ${SMOKE_TEST_URL}"
  SMOKE_TEST_DETAILS+=("  - Richieste principali completate senza errori (index.html e dashboard).")
fi

PLAYWRIGHT_REPORT="$ROOT_DIR/tools/ts/playwright-report.json"
if [ -f "$PLAYWRIGHT_REPORT" ]; then
  rm -f "$PLAYWRIGHT_REPORT"
fi

TIMESTAMP=$(date -u '+%Y-%m-%dT%H:%M:%SZ')
DIST_LABEL=$(basename "$DIST_DIR")
LOG_FILE="$ROOT_DIR/logs/web_status.md"
mkdir -p "$(dirname "$LOG_FILE")"
{
  echo "## $TIMESTAMP · run_deploy_checks.sh"
  echo "- **Esito script**: ✅ `scripts/run_deploy_checks.sh`"
  echo "  - Artefatti TypeScript già presenti in \`tools/ts/dist\`."
  RELATIVE_DATA_SOURCE=$(python3 - <<'PY'
import os
root = os.environ.get('ROOT_DIR')
source = os.environ.get('DATA_SOURCE_DIR')
if not source:
    raise SystemExit("")
try:
    rel = os.path.relpath(source, root)
except ValueError:
    rel = source
print(rel)
PY
  )
  echo "  - Bundle statico generato in `"$DIST_LABEL"` con dataset `"$RELATIVE_DATA_SOURCE"`."
  if [ -n "$SMOKE_TEST_MESSAGE" ]; then
    echo "- **$SMOKE_TEST_MESSAGE**"
  fi
  if [ "${#SMOKE_TEST_DETAILS[@]}" -gt 0 ]; then
    printf '%s\n' "${SMOKE_TEST_DETAILS[@]}"
  fi
  echo "- **Note**:"
  echo "  - Lo script non esegue più test; utilizza gli artefatti generati dai passaggi CI precedenti."
  echo ""
} >>"$LOG_FILE"

log "Run 'rm -rf $DIST_DIR' when finished inspecting the artifact."
