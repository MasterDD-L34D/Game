#!/usr/bin/env bash
#
# Script per eseguire una serie di controlli di sicurezza automatizzati
# sulle dipendenze e sul codice del progetto Evo‑Tactics.
#
# Esegue: bandit (Python), semgrep (TypeScript/JS), npm audit, gitleaks
# e produce report in formato facilmente consultabile.
#
# Requisiti:
# * python3 e pip
# * npm
# * docker (per gitleaks) oppure installazione locale
#
# Uso:
# ./scripts/init_security_checks.sh

set -euo pipefail

ROOT_DIR=$(dirname "$(readlink -f "$0")")/..

# Cartelle per report
REPORT_DIR="$ROOT_DIR/reports/security"
mkdir -p "$REPORT_DIR"

echo "[1/4] Installing/Updating tools…"
python3 -m pip install --quiet --upgrade bandit semgrep || true
npm install --silent --no-save audit-ci > /dev/null 2>&1 || true
# Assicurati che gitleaks sia disponibile; se non c'è, usiamo docker
if ! command -v gitleaks >/dev/null 2>&1; then
  echo "gitleaks non trovato, proverò ad eseguirlo tramite docker…"
fi

echo "[2/4] Esecuzione Bandit (Python static analysis)…"
bandit -r "$ROOT_DIR" -f html -o "$REPORT_DIR/bandit-report.html" || true

echo "[3/4] Esecuzione Semgrep (TS/JS analysis)…"
semgrep --config "p/default" --error --json -o "$REPORT_DIR/semgrep-report.json" "$ROOT_DIR" || true

echo "[4/4] Esecuzione npm audit…"
npx audit-ci --moderate --report-type json --output "$REPORT_DIR/npm-audit-report.json" || true

echo "[5/5] Esecuzione gitleaks (secret scanning)…"
if command -v gitleaks >/dev/null 2>&1; then
  gitleaks detect -f json -o "$REPORT_DIR/gitleaks-report.json" --report-format json || true
else
  docker run --rm -v "$ROOT_DIR:/src" zricethezav/gitleaks:latest detect -s /src -f json -o /src/reports/security/gitleaks-report.json || true
fi

echo "Controlli di sicurezza completati. Report generati in $REPORT_DIR"
