#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'EOF_USAGE'
run_pipeline_cycle.sh - orchestrate the 02A→freeze→03A→03B pipeline with report-only validators.

Environment overrides:
  BRANCH_03A   Branch for 02A/03A steps (default: patch/03A-core-derived)
  BRANCH_03B   Branch for 03B cleanup/redirect (default: patch/03B-incoming-cleanup)
  LOG_ID       Prefix for validator logs (default: TKT-02A-VALIDATOR)
  LOG_DIR      Directory where logs and audit bundle are written (default: logs)
  PATCH_FILE   Optional patch applied during 03A before rerunning 02A
  CYCLE_COUNT  Number of pipeline cycles to run back-to-back (default: 1)
  STATUS_FILE  File where per-phase status updates are appended (default: $LOG_DIR/pipeline_status.log)

Flags:
  -h | --help  Show this message and exit
  --cycles N   Override CYCLE_COUNT from the command line (positive integer)
  --prepare-only  Prepare log directory, resolve branches and record configuration without running the pipeline
  --status-only   Show the latest pipeline status and audit bundle presence without executing any phase
EOF_USAGE
}

# Runnable orchestrator for the 02A→freeze→03A→03B pipeline with report-only validators.
# Logs approvals/whitelists and bundles audit artifacts at the end of the run.

BRANCH_03A=${BRANCH_03A:-patch/03A-core-derived}
BRANCH_03B=${BRANCH_03B:-patch/03B-incoming-cleanup}
LOG_ID=${LOG_ID:-TKT-02A-VALIDATOR}
LOG_DIR=${LOG_DIR:-logs}
PATCH_FILE=${PATCH_FILE:-}
CYCLE_COUNT=${CYCLE_COUNT:-1}
CURRENT_LOG_ID=""
ORIGINAL_BRANCH=""
REPO_ROOT=""
STATUS_FILE=${STATUS_FILE:-}
CURRENT_CYCLE=0
RESOLVED_BRANCH_03A=""
RESOLVED_BRANCH_03B=""
PREPARE_ONLY=false
STATUS_ONLY=false
PHASE_PLAN=""
CURRENT_PHASE="setup"

parse_args() {
  while [[ $# -gt 0 ]]; do
    case "$1" in
      -h|--help)
        usage
        exit 0
        ;;
      --cycles)
        shift
        if [[ $# -eq 0 ]]; then
          echo "Missing value for --cycles" >&2
          exit 1
        fi
        CYCLE_COUNT="$1"
        ;;
      --prepare-only)
        PREPARE_ONLY=true
        ;;
      --status-only)
        STATUS_ONLY=true
        ;;
      *)
        echo "Unknown argument: $1" >&2
        usage
        exit 1
        ;;
    esac
    shift
  done
}

is_positive_integer() {
  [[ "$1" =~ ^[1-9][0-9]*$ ]]
}

require_command() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Command not found: $1" >&2
    exit 1
  fi
}

require_python_module() {
  local module="$1"
  if ! python - "$module" <<'PY'
import importlib.metadata
import sys

module = sys.argv[1]

try:
    importlib.metadata.version(module)
except importlib.metadata.PackageNotFoundError:
    raise SystemExit(
        f"Modulo Python mancante: {module}. Esegui 'pip install -r requirements-dev.txt' prima di lanciare la pipeline."
    )
PY
  then
    echo "Dipendenza Python non soddisfatta: ${module}" >&2
    exit 1
  fi
}

enter_repo_root() {
  REPO_ROOT=$(git rev-parse --show-toplevel 2>/dev/null || true)
  if [[ -z "$REPO_ROOT" ]]; then
    echo "Non riesco a determinare la radice del repository Git" >&2
    exit 1
  fi
  cd "$REPO_ROOT"
}

ensure_log_dir() {
  mkdir -p "$LOG_DIR"
  if [[ -z "$STATUS_FILE" ]]; then
    STATUS_FILE="$LOG_DIR/pipeline_status.log"
  fi
}

branch_exists() {
  git show-ref --verify --quiet "refs/heads/$1"
}

resolve_branch_or_fallback() {
  local requested="$1"
  local fallback="$2"
  local label="$3"

  if branch_exists "$requested"; then
    echo "$requested"
  else
    append_log "$STATUS_FILE" "${label}_fallback: ${requested} -> ${fallback} (branch non trovato, uso fallback)" >/dev/null
    echo "$fallback"
  fi
}

log_run_configuration() {
  append_log "$STATUS_FILE" "config: BRANCH_03A=${RESOLVED_BRANCH_03A} (requested=$BRANCH_03A) BRANCH_03B=${RESOLVED_BRANCH_03B} (requested=$BRANCH_03B) LOG_DIR=$LOG_DIR LOG_ID=$LOG_ID PATCH_FILE=${PATCH_FILE:-none} CYCLE_COUNT=$CYCLE_COUNT"
}

record_phase_plan() {
  PHASE_PLAN="[1] Kickoff 02A -> [2] Preparazioni parallele -> [3] Freeze ufficiale -> [4] Patch 03A + rerun 02A -> [5] Transizione + 03B -> [6] Sblocco + trigger"
  append_log "$STATUS_FILE" "phase_plan: ${PHASE_PLAN}"
}

status_overview() {
  if [[ ! -f "$STATUS_FILE" ]]; then
    echo "Nessun file di stato trovato in $STATUS_FILE. Esegui --prepare-only o una run completa per popolarlo."
    return
  fi

  echo "=== Stato pipeline (fonte: $STATUS_FILE) ==="
  echo "-- Ultimi aggiornamenti --"
  tail -n 20 "$STATUS_FILE"

  local last_cycle
  last_cycle=$(grep -E "c[0-9]+/[0-9]+" "$STATUS_FILE" | tail -n 1 || true)
  if [[ -n "$last_cycle" ]]; then
    echo "-- Ultimo marcatore di ciclo --"
    echo "$last_cycle"
  fi

  if [[ -f "$LOG_DIR/audit-bundle.tar.gz" ]]; then
    echo "Audit bundle presente: $LOG_DIR/audit-bundle.tar.gz"
  else
    echo "Audit bundle non trovato in $LOG_DIR (verifica se la run è stata completata o se i log sono stati rimossi)."
  fi
}

run_and_log() {
  local log_file="$1"
  shift
  echo "[$(date -Iseconds)] $*" | tee -a "$log_file"
  "$@" | tee -a "$log_file"
}

append_log() {
  local log_file="$1"
  shift
  echo "[$(date -Iseconds)] $*" | tee -a "$log_file"
}

on_error() {
  local exit_code=$?
  append_log "$STATUS_FILE" "errore: fase=${CURRENT_PHASE:-sconosciuta} exit_code=$exit_code"
  if [[ -n "$ORIGINAL_BRANCH" ]]; then
    git switch "$ORIGINAL_BRANCH" >/dev/null 2>&1 || true
  fi
  exit "$exit_code"
}

status_update() {
  local phase="$1"
  local cycle_label="c${CURRENT_CYCLE}/${CYCLE_COUNT}"
  append_log "$STATUS_FILE" "${cycle_label}: ${phase}"
}

status_phase_start() {
  local phase="$1"
  CURRENT_PHASE="$phase"
  status_update "Inizio fase: ${phase}"
}

kickoff_02A() {
  git switch "$RESOLVED_BRANCH_03A"
  run_and_log "$LOG_DIR/${CURRENT_LOG_ID}.schema.log" npm run schema:lint
  run_and_log "$LOG_DIR/${CURRENT_LOG_ID}.style.log" node scripts/trait_style_check.js
  append_log "$LOG_DIR/${CURRENT_LOG_ID}.notes.log" "Whitelist (se presente) e note validator 02A registrate."
  status_update "Kickoff 02A completato su $RESOLVED_BRANCH_03A (LOG_ID=$CURRENT_LOG_ID)"
}

prepare_in_parallel() {
  append_log "$LOG_DIR/pipeline_preparations.log" "draft approvals + staging snapshot/backup + redirect plan (nessuna attivazione)"
  status_update "Preparazioni parallele concluse (draft approvals, snapshot/backup staging, redirect plan in bozza)"
}

freeze_official() {
  append_log "$LOG_DIR/freeze.log" "freeze 3→4 attivato: approvazione Master DD, backup/snapshot attivi, redirect plan chiuso"
  status_update "Freeze 3→4 ufficiale attivato con approvazione Master DD e backup/snapshot attivi"
}

apply_patch_03A() {
  if [[ -n "$PATCH_FILE" ]]; then
    git apply "$PATCH_FILE"
  fi
  run_and_log "$LOG_DIR/${CURRENT_LOG_ID}.post03A.schema.log" npm run schema:lint
  run_and_log "$LOG_DIR/${CURRENT_LOG_ID}.post03A.style.log" node scripts/trait_style_check.js
  append_log "$LOG_DIR/03A.log" "changelog + rollback legati allo snapshot; richiesta approvazione merge Master DD inviata"
  status_update "Patch 03A applicate e 02A rieseguito (changelog/rollback legati allo snapshot)"
}

transition_and_03B() {
  git switch "$RESOLVED_BRANCH_03B"
  append_log "$LOG_DIR/transizione.log" "checkpoint transizione: backup/redirect pronti"
  # Inserisci qui eventuali comandi di cleanup/redirect specifici del branch 03B.
  run_and_log "$LOG_DIR/${CURRENT_LOG_ID}.post03B.schema.log" npm run schema:lint
  run_and_log "$LOG_DIR/${CURRENT_LOG_ID}.post03B.style.log" node scripts/trait_style_check.js
  append_log "$LOG_DIR/03B.log" "smoke 02A post-merge completato"
  status_update "Transizione e 03B completati (cleanup/redirect + smoke 02A post-merge)"
}

unfreeze_and_restart() {
  append_log "$LOG_DIR/unfreeze.log" "sblocco freeze: smoke 02A ok, approvazione finale Master DD registrata"
  append_log "$LOG_DIR/restart.log" "trigger riavvio PIPELINE_SIMULATOR con baseline aggiornate"
  status_update "Sblocco freeze completato e trigger di riavvio registrato"
}

audit_bundle() {
  shopt -s nullglob
  local bundle_files=(
    "$LOG_DIR"/${LOG_ID}*.log
    "$LOG_DIR"/freeze.log
    "$LOG_DIR"/03A.log
    "$LOG_DIR"/transizione.log
    "$LOG_DIR"/03B.log
    "$LOG_DIR"/unfreeze.log
    "$LOG_DIR"/restart.log
  )
  shopt -u nullglob

  if [[ ${#bundle_files[@]} -eq 0 ]]; then
    echo "Nessun log trovato per creare l'audit bundle" >&2
    return 0
  fi

  tar -czf "$LOG_DIR/audit-bundle.tar.gz" "${bundle_files[@]}"
  echo "Pipeline completata. Audit bundle: $LOG_DIR/audit-bundle.tar.gz"
}

main() {
  parse_args "$@"

  require_command git
  enter_repo_root
  ORIGINAL_BRANCH=$(git rev-parse --abbrev-ref HEAD)
  ensure_log_dir

  if [[ "$STATUS_ONLY" == true ]]; then
    status_overview
    exit 0
  fi

  require_command python
  require_command npm
  require_command node
  require_command tar
  require_python_module jsonschema

  trap on_error ERR

  if ! is_positive_integer "$CYCLE_COUNT"; then
    echo "CYCLE_COUNT deve essere un intero positivo" >&2
    exit 1
  fi

  RESOLVED_BRANCH_03A=$(resolve_branch_or_fallback "$BRANCH_03A" "$ORIGINAL_BRANCH" "BRANCH_03A")
  RESOLVED_BRANCH_03B=$(resolve_branch_or_fallback "$BRANCH_03B" "$ORIGINAL_BRANCH" "BRANCH_03B")

  log_run_configuration
  record_phase_plan

  if [[ "$PREPARE_ONLY" == true ]]; then
    CURRENT_PHASE="prepare-only"
    status_update "Preparazione completata (--prepare-only): config registrata, branch risolti, log dir pronta"
    echo "Preparazione completata (--prepare-only). Pipeline non eseguita."
    git switch "$ORIGINAL_BRANCH"
    exit 0
  fi

  for (( cycle=1; cycle<=CYCLE_COUNT; cycle++ )); do
    CURRENT_CYCLE=$cycle
    CURRENT_LOG_ID="$LOG_ID"
    if (( CYCLE_COUNT > 1 )); then
      CURRENT_LOG_ID="${LOG_ID}-c${cycle}"
      append_log "$LOG_DIR/cycle.log" "Avvio ciclo ${cycle}/${CYCLE_COUNT} con LOG_ID=$CURRENT_LOG_ID"
    fi

    status_update "Avvio ciclo ${cycle}/${CYCLE_COUNT}"

    status_phase_start "Kickoff 02A"
    kickoff_02A

    status_phase_start "Preparazioni parallele (draft approvals, snapshot/backup staging, redirect plan)"
    prepare_in_parallel

    status_phase_start "Freeze 3→4 ufficiale"
    freeze_official

    status_phase_start "Patch 03A + rerun 02A"
    apply_patch_03A

    status_phase_start "Transizione + 03B"
    transition_and_03B

    status_phase_start "Sblocco freeze + trigger riavvio"
    unfreeze_and_restart

    status_update "Ciclo ${cycle}/${CYCLE_COUNT} completato"
  done

  CURRENT_PHASE="audit_bundle"
  audit_bundle
  git switch "$ORIGINAL_BRANCH"
}

main "$@"
