#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
export ROOT_DIR

log() {
  printf '\n[%s] %s\n' "$(date -u '+%Y-%m-%dT%H:%M:%SZ')" "$1"
}

DATA_SOURCE_DIR="${DEPLOY_DATA_DIR:-$ROOT_DIR/data}"
if [ ! -d "$DATA_SOURCE_DIR" ]; then
  log "Dataset directory '$DATA_SOURCE_DIR' non trovato"
  exit 1
fi
export DATA_SOURCE_DIR

STATUS_REPORT="$ROOT_DIR/reports/status.json"

SMOKE_TEST_MESSAGE=""
SMOKE_TEST_DETAILS=()

log "Validating trait inventory (docs/catalog/traits_inventory.json)"
python3 "$ROOT_DIR/tools/py/traits_validator.py"

log "Generating trait generator profile (scripts/generator.py)"
GENERATOR_OUTPUT="$ROOT_DIR/logs/tooling/generator_run_profile.json"
export GENERATOR_OUTPUT
python3 "$ROOT_DIR/scripts/generator.py" \
  --data-root "$DATA_SOURCE_DIR" \
  --matrix "$ROOT_DIR/docs/catalog/species_trait_matrix.json" \
  --inventory "$ROOT_DIR/docs/catalog/traits_inventory.json" \
  --output "$GENERATOR_OUTPUT"

GENERATOR_SUMMARY=$(python3 - <<'PY'
import json
import os

path = os.environ.get("GENERATOR_OUTPUT")
if not path:
    raise SystemExit
with open(path, "r", encoding="utf-8") as handle:
    profile = json.load(handle)
metrics = profile.get("metrics", {})
highlights = profile.get("highlights", [])
summary = []
summary.append(
    f"  - Trait generator: core={metrics.get('core_traits_total', '?')} "
    f"enriched_species={metrics.get('enriched_species', '?')} "
    f"(time {metrics.get('generation_time_ms', '?')} ms)."
)
if highlights:
    highlight_labels = ", ".join(item.get("trait", "-") for item in highlights)
    summary.append(f"  - Trait highlight: {highlight_labels}.")
summary.append(
    f"  - Report salvato in `logs/tooling/generator_run_profile.json`."
)
print("\n".join(summary))
PY
)
if [ -n "$GENERATOR_SUMMARY" ]; then
  while IFS= read -r line; do
    [ -n "$line" ] && SMOKE_TEST_DETAILS+=("$line")
  done <<<"$GENERATOR_SUMMARY"
fi

log "Checking release telemetry status ($STATUS_REPORT)"
set +e
GO_NO_GO_OUTPUT=$(node - <<'NODE' "$STATUS_REPORT" "$ROOT_DIR")
const fs = require('node:fs');
const path = require('node:path');

const [reportPath, rootDir] = process.argv.slice(2);
if (!reportPath) {
  throw new Error('Percorso status report non fornito');
}
if (!fs.existsSync(reportPath)) {
  throw new Error(`Status report non trovato: ${reportPath}`);
}
const raw = fs.readFileSync(reportPath, 'utf8');
let report;
try {
  report = JSON.parse(raw);
} catch (error) {
  throw new Error(`Status report non valido: ${error.message || error}`);
}
const goNoGo = report?.goNoGo;
if (!goNoGo || !Array.isArray(goNoGo.checks)) {
  throw new Error('Dati go/no-go non disponibili in reports/status.json');
}
const formatter = require(path.join(rootDir, 'tools', 'deploy', 'goNoGo.js'));
const summary = formatter.formatGoNoGoSummary(goNoGo);
console.log(summary.summaryLine);
for (const line of summary.detailLines || []) {
  console.log(line);
}
if (summary.status === 'no-go') {
  throw new Error('Flow Shell go/no-go in stato NO-GO: risolvere i blocchi prima del deploy.');
}
NODE)
STATUS_EXIT=$?
set -e
if [ "$STATUS_EXIT" -ne 0 ]; then
  log "Release telemetry check failed"
  if [ -n "$GO_NO_GO_OUTPUT" ]; then
    printf '%s\n' "$GO_NO_GO_OUTPUT"
  fi
  exit "$STATUS_EXIT"
fi
if [ -n "$GO_NO_GO_OUTPUT" ]; then
  while IFS= read -r line; do
    [ -n "$line" ] && SMOKE_TEST_DETAILS+=("$line")
  done <<<"$GO_NO_GO_OUTPUT"
fi

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
LOG_FILE="$ROOT_DIR/logs/web_status.md"
mkdir -p "$(dirname "$LOG_FILE")"
{
  echo "## $TIMESTAMP · run_deploy_checks.sh"
  echo "- **Esito script**: ✅ \`scripts/run_deploy_checks.sh\`"
  echo "  - Artefatti TypeScript già presenti in \`tools/ts/dist\`."
  echo "  - Bundle statico generato in \`$DIST_LABEL\` con dataset \`$RELATIVE_DATA_SOURCE\`."
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
