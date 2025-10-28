#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)

log() {
  printf '\n[%s] %s\n' "$(date -u '+%Y-%m-%dT%H:%M:%SZ')" "$1"
}

log "Esecuzione smoke CLI"
"$ROOT_DIR/scripts/cli_smoke.sh"

log "Esecuzione test TypeScript"
pushd "$ROOT_DIR/tools/ts" >/dev/null
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=${PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH:-$(command -v google-chrome-stable 2>/dev/null || command -v chromium 2>/dev/null || command -v chromium-browser 2>/dev/null || true)}
if [[ -n "${PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH}" ]]; then
  export PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
  export PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=${PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD:-1}
fi
npm test
popd >/dev/null

log "Esecuzione test Python"
PYTHONPATH="$ROOT_DIR/tools/py" pytest

log "Suite di test completata"
