#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
export ROOT_DIR

log() {
  printf '\n[%s] %s\n' "$(date -u '+%Y-%m-%dT%H:%M:%SZ')" "$1"
}

require_dependency() {
  local check_cmd="$1"
  local hint="$2"
  if ! bash -c "$check_cmd" >/dev/null 2>&1; then
    log "$hint"
    exit 1
  fi
}

require_dependency "python3 -c 'import yaml, requests'" \
  "Dipendenze Python mancanti: eseguire scripts/install_test_dependencies.sh prima di run_deploy_checks.sh."

require_dependency "[ -d '${ROOT_DIR}/tools/ts/node_modules' ]" \
  "Dipendenze Node.js mancanti: eseguire scripts/install_test_dependencies.sh prima di run_deploy_checks.sh."

require_dependency "cd '${ROOT_DIR}/tools/ts' && node -e 'require(\"playwright-core\");'" \
  "Playwright non risulta installato: eseguire scripts/install_test_dependencies.sh prima di run_deploy_checks.sh."

RUN_FULL_VALIDATION=${RUN_FULL_VALIDATION:-1}
if [[ "$RUN_FULL_VALIDATION" == "1" ]]; then
  log "Running validation suite"
  "$ROOT_DIR/scripts/run_validation_suite.sh"

  log "Running test suite"
  "$ROOT_DIR/scripts/run_test_suite.sh"
else
  log "Skipping validation/test execution (RUN_FULL_VALIDATION=$RUN_FULL_VALIDATION)"
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

PLAYWRIGHT_REPORT="$ROOT_DIR/tools/ts/playwright-report.json"
PLAYWRIGHT_SUMMARY=""
if [ -f "$PLAYWRIGHT_REPORT" ]; then
  PLAYWRIGHT_SUMMARY=$(node "$ROOT_DIR/tools/ts/scripts/collect_playwright_summary.js" "$PLAYWRIGHT_REPORT")
  rm -f "$PLAYWRIGHT_REPORT"
fi

TIMESTAMP=$(date -u '+%Y-%m-%dT%H:%M:%SZ')
DIST_LABEL=$(basename "$DIST_DIR")
LOG_FILE="$ROOT_DIR/logs/web_status.md"
{
  echo "## $TIMESTAMP · run_deploy_checks.sh"
  echo "- **Esito script**: ✅ `scripts/run_deploy_checks.sh`"
  echo "  - `npm test` (tools/ts) · suite TypeScript + Playwright completata."
  if [ -n "$PLAYWRIGHT_SUMMARY" ]; then
    echo "$PLAYWRIGHT_SUMMARY" | sed 's/^/    /'
  fi
  echo "  - `pytest` (tools/py) · test suite completata."
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
  echo "- **Smoke test HTTP**: server Python su `http://127.0.0.1:$PORT/`."
  echo "  - Richieste principali completate senza errori (index.html e dashboard)."
  echo "- **Note**:"
  echo "  - Report Playwright elaborato tramite `tools/ts/scripts/collect_playwright_summary.js`."
  echo ""
} >>"$LOG_FILE"

log "Run 'rm -rf "$DIST_DIR"' when finished inspecting the artifact."
