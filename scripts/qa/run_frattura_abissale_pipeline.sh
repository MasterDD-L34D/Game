#!/usr/bin/env bash
# Orchestrates validation steps for the "Frattura Abissale Sinaptica" package
# using the execution plan produced in docs/pipelines/Frattura_Abissale_Sinaptica_execution_plan.md.
# It runs in-order checks focused on schemas, trait coherence, and trait tooling.

set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"
STATUS=0
GAP_REPORT="reports/evo/rollout/traits_gap.csv"
TEMP_OUTPUT="/tmp/frattura_abissale_traits_eval"

run() {
  local label="$1"
  shift
  echo "\n==> ${label}"
  if "$@"; then
    echo "[OK] ${label}"
  else
    local rc=$?
    echo "[FAIL] ${label} (exit ${rc})"
    STATUS=${rc}
  fi
}

run "Schema + coherence checks" python scripts/qa/frattura_abissale_validations.py
run "Trait style check" npm run style:check

if [[ -f "${GAP_REPORT}" ]]; then
  run "Trait evaluate (read-only output)" \
    python tools/traits/evaluate_internal.py \
    --gap-report "${GAP_REPORT}" \
    --glossary data/core/traits/glossary.json \
    --output "${TEMP_OUTPUT}"
else
  echo "[SKIP] Trait evaluate (gap report mancante: ${GAP_REPORT})"
fi

if [[ -f "${GAP_REPORT}" ]]; then
  run "Trait index sync (dry-run)" \
    python tools/traits/sync_missing_index.py \
    --source "${GAP_REPORT}" \
    --dest data/core/traits/glossary.json \
    --trait-dir data/traits \
    --dry-run \
    --no-update-glossary
else
  echo "[SKIP] Trait index sync (dry-run) – gap report mancante"
fi

exit ${STATUS}
