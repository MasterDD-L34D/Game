#!/usr/bin/env bash
set -euo pipefail

SESSION_DIR="${1:-logs/playtests/2025-03-05-evt02}"
OUTPUT_FILE="${SESSION_DIR}/flags/evt02_flags_$(date +%Y%m%dT%H%M%S).json"

if [[ ! -d "${SESSION_DIR}" ]]; then
  echo "[export_evt_flags] Creating session directory at ${SESSION_DIR}" >&2
  mkdir -p "${SESSION_DIR}"
fi

mkdir -p "${SESSION_DIR}/flags"

cat <<JSON > "${OUTPUT_FILE}"
{
  "session": "EVT-02",
  "status": "placeholder",
  "notes": "Sostituire con export reale dei flag narrativi una volta disponibile l'integrazione tooling."
}
JSON

echo "[export_evt_flags] Placeholder export creato: ${OUTPUT_FILE}" >&2
