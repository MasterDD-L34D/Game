#!/usr/bin/env bash
#
# Esegue controlli di sicurezza (Bandit, Semgrep, npm audit, Gitleaks) e raccoglie
# i report nella directory `reports/security` della repository.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
REPORT_DIR="${REPO_ROOT}/reports/security"

mkdir -p "${REPORT_DIR}"

echo "[1/5] Installing/updating tools…"
python3 -m pip install --quiet --upgrade bandit semgrep || true
npm install --silent --no-save audit-ci >/dev/null 2>&1 || true

if ! command -v gitleaks >/dev/null 2>&1; then
  echo "gitleaks non trovato, verrà utilizzata l'immagine Docker ufficiale se disponibile…"
fi

echo "[2/5] Esecuzione Bandit (Python static analysis)…"
( cd "${REPO_ROOT}" && bandit -r . -f html -o "${REPORT_DIR}/bandit-report.html" ) || true

echo "[3/5] Esecuzione Semgrep (TS/JS analysis)…"
( cd "${REPO_ROOT}" && semgrep --config "p/default" --error --json -o "${REPORT_DIR}/semgrep-report.json" . ) || true

echo "[4/5] Esecuzione npm audit…"
( cd "${REPO_ROOT}" && npx audit-ci --moderate --report-type json --output "${REPORT_DIR}/npm-audit-report.json" ) || true

echo "[5/5] Esecuzione gitleaks (secret scanning)…"
if command -v gitleaks >/dev/null 2>&1; then
  ( cd "${REPO_ROOT}" && gitleaks detect -f json -o "${REPORT_DIR}/gitleaks-report.json" --report-format json ) || true
else
  docker run --rm -v "${REPO_ROOT}:/src" zricethezav/gitleaks:latest detect \
    -s /src -f json -o /src/reports/security/gitleaks-report.json || true
fi

echo "Controlli di sicurezza completati. Report generati in ${REPORT_DIR}"
