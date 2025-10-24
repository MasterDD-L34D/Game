#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)

log() {
  printf '\n[%s] %s\n' "$(date -u '+%Y-%m-%dT%H:%M:%SZ')" "$1"
}

log "Installing Node.js dependencies via npm ci"
pushd "$ROOT_DIR/tools/ts" >/dev/null
npm ci

log "Running TypeScript test suite"
npm test
popd >/dev/null

log "Ensuring Python test dependencies are available"
python3 -m pip install --quiet -r "$ROOT_DIR/tools/py/requirements.txt"

log "Running Python test suite"
PYTHONPATH="$ROOT_DIR/tools/py" pytest

log "Preparing static deploy bundle"
DIST_DIR=$(mktemp -d "dist.XXXXXX" -p "$ROOT_DIR")
cp -r "$ROOT_DIR/docs/test-interface" "$DIST_DIR/test-interface"
cp -r "$ROOT_DIR/data" "$DIST_DIR/data"
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

log "Run 'rm -rf "$DIST_DIR"' when finished inspecting the artifact."
