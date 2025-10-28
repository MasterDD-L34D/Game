#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
export ROOT_DIR

log() {
  printf '\n[%s] %s\n' "$(date -u '+%Y-%m-%dT%H:%M:%SZ')" "$1"
}

log "Aggiornamento pip e installazione dipendenze Python"
python3 -m pip install --quiet --upgrade pip
python3 -m pip install --quiet --requirement "$ROOT_DIR/tools/py/requirements.txt"

log "Installazione dipendenze Node.js (npm ci)"
pushd "$ROOT_DIR/tools/ts" >/dev/null
npm ci

install_playwright_browser() {
  local download_host=${PLAYWRIGHT_DOWNLOAD_HOST:-"https://playwright.azureedge.net"}
  log "Installazione browser Playwright da $download_host"
  if PLAYWRIGHT_DOWNLOAD_HOST="$download_host" npx playwright install chromium; then
    log "Browser Playwright installato con successo"
    return 0
  fi

  if command -v google-chrome-stable >/dev/null 2>&1; then
    log "Google Chrome già presente: salto fallback"
    return 0
  fi

  local chrome_url=${PLAYWRIGHT_CHROME_FALLBACK_URL:-"https://dl.google.com/linux/direct/google-chrome-stable_current_amd64.deb"}
  local chrome_pkg
  chrome_pkg=$(mktemp "chrome.XXXXXX.deb" -p "${TMPDIR:-/tmp}")
  log "Scarico Google Chrome fallback da $chrome_url"
  if ! curl --fail --location --output "$chrome_pkg" "$chrome_url"; then
    log "Download di Google Chrome fallito. Riprovare impostando manualmente PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH"
    rm -f "$chrome_pkg"
    return 1
  fi

  log "Installo pacchetto Google Chrome via apt"
  export DEBIAN_FRONTEND=noninteractive
  if ! apt-get update; then
    log "apt-get update fallito: verificare connettività verso mirror Ubuntu"
  fi
  if ! apt-get install --yes --no-install-recommends "$chrome_pkg"; then
    log "Installazione Google Chrome fallita. Provo a completare le dipendenze con --fix-broken"
    apt-get install --yes --no-install-recommends -f
  fi
  rm -f "$chrome_pkg"

  if command -v google-chrome-stable >/dev/null 2>&1; then
    log "Installazione fallback Google Chrome completata"
    return 0
  fi

  log "Impossibile installare un browser compatibile con Playwright"
  return 1
}

install_playwright_browser
popd >/dev/null

log "Dipendenze di test installate correttamente"
