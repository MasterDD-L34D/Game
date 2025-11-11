#!/usr/bin/env bash
#
# Esegue la validazione dei trait e delle specie incoming utilizzando AJV.
# Le directory possono essere personalizzate tramite variabili d'ambiente per
# integrarsi con i workflow di automazione e CI.

set -euo pipefail
shopt -s nullglob

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
INCOMING_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

AJV_BIN="${AJV:-${EVO_VALIDATE_AJV:-ajv}}"
TEMPLATES_DIR="${EVO_TEMPLATES_DIR:-${INCOMING_DIR}/templates}"
TRAITS_DIR="${EVO_TRAITS_DIR:-${INCOMING_DIR}/traits}"
SPECIES_DIR="${EVO_SPECIES_DIR:-${INCOMING_DIR}/species}"

run_validation() {
  local schema_path="$1"
  shift
  local dataset=("$@")

  if [ ${#dataset[@]} -eq 0 ]; then
    echo "⚠️  Nessun file da validare per schema ${schema_path}" >&2
    return 0
  fi

  echo "🔍 Validazione $(basename "${schema_path}") su ${#dataset[@]} file…"
  for data_file in "${dataset[@]}"; do
    "${AJV_BIN}" -s "${schema_path}" -d "${data_file}" --spec=draft2020
  done
}

if ! command -v "${AJV_BIN}" >/dev/null 2>&1; then
  echo "Errore: comando AJV '${AJV_BIN}' non trovato." >&2
  exit 1
fi

if [ ! -d "${TEMPLATES_DIR}" ]; then
  echo "Errore: directory template non trovata (${TEMPLATES_DIR})." >&2
  exit 1
fi

run_validation "${TEMPLATES_DIR}/trait.schema.json" "${TRAITS_DIR}"/*.json
run_validation "${TEMPLATES_DIR}/species.schema.json" "${SPECIES_DIR}"/*.json

echo "✅ Validazione completata"
