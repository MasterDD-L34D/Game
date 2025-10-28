#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)

log() {
  printf '\n[%s] %s\n' "$(date -u '+%Y-%m-%dT%H:%M:%SZ')" "$1"
}

log "Running TypeScript species validation"
pushd "$ROOT_DIR/tools/ts" >/dev/null
npm run validate:species
popd >/dev/null

log "Running Python species validator"
python3 "$ROOT_DIR/tools/py/validate_species.py" "$ROOT_DIR/data/species.yaml"

log "Validating base datasets via game_cli"
python3 "$ROOT_DIR/tools/py/game_cli.py" validate-datasets

log "Validating Evo-Tactics ecosystem pack"
EVO_PACK_REPORT=$(mktemp "evo-pack.XXXXXX.json" -p "${ROOT_DIR}/logs" 2>/dev/null || mktemp)
python3 "$ROOT_DIR/tools/py/game_cli.py" validate-ecosystem-pack --json-out "$EVO_PACK_REPORT"
log "Evo-Tactics report stored at $EVO_PACK_REPORT"

log "Auditing trait catalog consistency"
python3 "$ROOT_DIR/scripts/trait_audit.py" --check

log "Validation suite completed successfully"
