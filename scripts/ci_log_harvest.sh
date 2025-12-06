#!/usr/bin/env bash
set -euo pipefail

# Harvest the latest CI/QA workflow run artifacts into the local logs/ directories.
# Requirements:
# - GitHub CLI (`gh`) authenticated with a PAT that has `workflow` and `read:org` scopes.
# - Network access to GitHub.
#
# Usage:
#   scripts/ci_log_harvest.sh [--config <file>] [--ref <branch>] [--dry-run]
# Environment flags:
#   DISPATCH_MANUAL=1       Allow dispatching manual-only workflows if inputs are configured.
#   WAIT_FOR_COMPLETION=1   Poll a dispatched manual workflow until it is completed before download.
#
# The config file (optional) uses pipe-separated fields per line:
#   workflow_file|destination|mode|dispatch_inputs
# - mode: auto | manual
# - dispatch_inputs: extra args for `gh workflow run ...` (e.g., "-f batch=traits -f execute=false")
# Lines starting with # or empty lines are ignored.

REF="main"
CONFIG_FILE=""
DRY_RUN=0

usage() {
  cat <<'USAGE'
Usage: scripts/ci_log_harvest.sh [--config <file>] [--ref <branch>] [--dry-run]

Options:
  --config <file>   Path to a custom workflow list (pipe-separated fields).
  --ref <branch>    Branch/ref used when dispatching manual workflows (default: main).
  --dry-run         Print actions without calling GitHub CLI.
USAGE
}

command -v gh >/dev/null 2>&1 || { echo "Error: GitHub CLI (gh) is required." >&2; exit 1; }

while [[ $# -gt 0 ]]; do
  case "$1" in
    --config)
      CONFIG_FILE="$2"; shift 2;;
    --ref)
      REF="$2"; shift 2;;
    --dry-run)
      DRY_RUN=1; shift;;
    -h|--help)
      usage; exit 0;;
    *)
      echo "Unknown option: $1" >&2; usage; exit 1;;
  esac
done

DEFAULT_WORKFLOWS=(
  "ci.yml|logs/ci_runs|auto|"
  "e2e.yml|logs/ci_runs|auto|"
  "deploy-test-interface.yml|logs/ci_runs|auto|"
  "daily-pr-summary.yml|logs/ci_runs|auto|"
  "daily-tracker-refresh.yml|logs/ci_runs|auto|"
  "lighthouse.yml|logs/ci_runs|auto|"
  "search-index.yml|logs/ci_runs|auto|"
  "telemetry-export.yml|logs/ci_runs|auto|"
  "qa-kpi-monitor.yml|logs/ci_runs|manual|"
  "qa-export.yml|logs/ci_runs|manual|"
  "qa-reports.yml|logs/ci_runs|manual|"
  "hud.yml|logs/ci_runs|manual|"
  "incoming-smoke.yml|logs/incoming_smoke|manual|-f path=<dataset> -f pack=<pack>"
  "evo-batch.yml|logs/ci_runs|manual|-f batch=traits -f execute=false"
)

read_workflows() {
  local workflows=()
  if [[ -n "$CONFIG_FILE" ]]; then
    if [[ ! -f "$CONFIG_FILE" ]]; then
      echo "Config file not found: $CONFIG_FILE" >&2
      exit 1
    fi
    while IFS= read -r line || [[ -n "$line" ]]; do
      [[ -z "$line" || "$line" =~ ^# ]] && continue
      workflows+=("$line")
    done <"$CONFIG_FILE"
  else
    workflows=("${DEFAULT_WORKFLOWS[@]}")
  fi
  printf '%s\n' "${workflows[@]}"
}

maybe_wait_for_completion() {
  local workflow="$1"
  local run_id="$2"
  if [[ "${WAIT_FOR_COMPLETION:-0}" != "1" ]]; then
    return
  fi
  echo "Waiting for $workflow (run $run_id) to finish..."
  local status=""
  local conclusion=""
  while true; do
    local output
    output=$(gh run view "$run_id" --json status,conclusion --template '{{.status}} {{.conclusion}}')
    status=$(cut -d' ' -f1 <<<"$output")
    conclusion=$(cut -d' ' -f2 <<<"$output")
    if [[ "$status" == "completed" ]]; then
      echo "Run $run_id completed with conclusion: ${conclusion:-unknown}"
      break
    fi
    sleep 10
  done
}

process_workflow() {
  local entry="$1"
  IFS='|' read -r workflow dest mode inputs <<<"$entry"

  if [[ -z "$workflow" || -z "$dest" || -z "$mode" ]]; then
    echo "Skipping malformed entry: $entry" >&2
    return
  fi

  mkdir -p "$dest"

  if [[ "$mode" == "manual" && "${DISPATCH_MANUAL:-0}" != "1" ]]; then
    echo "[skip] $workflow is manual-only (use DISPATCH_MANUAL=1 to dispatch)."
    return
  fi

  if [[ "$mode" == "manual" && "${DISPATCH_MANUAL:-0}" == "1" ]]; then
    echo "[dispatch] $workflow on ref $REF ${inputs:+with inputs: $inputs}"
    if [[ "$DRY_RUN" -eq 0 ]]; then
      gh workflow run "$workflow" --ref "$REF" ${inputs:-}
    fi
    if [[ "${WAIT_FOR_COMPLETION:-0}" == "1" ]]; then
      sleep 5
      local latest_run
      latest_run=$(gh run list --workflow "$workflow" --limit 1 --json databaseId --template '{{range .}}{{.databaseId}}{{"\n"}}{{end}}')
      if [[ -n "$latest_run" ]]; then
        maybe_wait_for_completion "$workflow" "$latest_run"
      fi
    else
      echo "Re-run the script after completion to download artifacts."
      return
    fi
  fi

  local run_info
  run_info=$(gh run list --workflow "$workflow" --limit 1 --json databaseId,status,conclusion --template '{{range .}}{{.databaseId}}\t{{.status}}\t{{.conclusion}}{{"\n"}}{{end}}')

  if [[ -z "$run_info" ]]; then
    echo "[warn] No runs found for $workflow"
    return
  fi

  local run_id status conclusion
  read -r run_id status conclusion <<<"$run_info"

  if [[ "$status" != "completed" ]]; then
    echo "[wait] Latest run $run_id for $workflow is $status; skipping download."
    return
  fi

  echo "[download] $workflow run $run_id -> $dest (conclusion: ${conclusion:-unknown})"
  if [[ "$DRY_RUN" -eq 0 ]]; then
    gh run download "$run_id" --dir "$dest"
  fi
}

main() {
  while IFS= read -r entry; do
    process_workflow "$entry"
  done < <(read_workflows)
}

main "$@"
