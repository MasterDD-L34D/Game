#!/usr/bin/env bash
set -euo pipefail

# Harvest the latest CI/QA workflow run artifacts into the local logs/ directories.
# Requirements:
# - GitHub CLI (`gh`) authenticated with a PAT that has `workflow`, `read:org`, and repo admin permissions.
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

pick_token() {
  local token="${CI_LOG_PAT:-${LOG_HARVEST_PAT:-${GH_TOKEN:-${GITHUB_TOKEN:-}}}}"
  if [[ -z "$token" ]]; then
    echo "Error: set CI_LOG_PAT (preferred), LOG_HARVEST_PAT, GH_TOKEN, or GITHUB_TOKEN with a PAT that includes workflow/read:org and repo admin access." >&2
    exit 1
  fi
  export GH_TOKEN="$token"
}

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
  "qa-kpi-monitor.yml|logs/visual_runs|manual|"
  "qa-export.yml|logs/ci_runs|manual|"
  "qa-reports.yml|logs/ci_runs|manual|"
  "hud.yml|logs/ci_runs|manual|"
  "hud.yml|logs/visual_runs|manual|"
  "incoming-smoke.yml|logs/incoming_smoke|manual|-f path=<dataset> -f pack=<pack>"
  "evo-batch.yml|logs/ci_runs|manual|-f batch=traits -f execute=false"
)

workflow_basename() {
  local workflow_file="$1"
  local base
  base=$(basename "$workflow_file")
  base="${base%.*}"
  echo "$base"
}

download_html_page() {
  local run_id="$1"
  local workflow_base="$2"
  local dest="$3"
  local html_url
  html_url=$(gh api --method GET "repos/:owner/:repo/actions/runs/${run_id}" --jq '.html_url')
  if [[ -z "$html_url" ]]; then
    echo "[warn] Unable to resolve HTML URL for run ${run_id}" >&2
    return
  fi
  local html_out="${dest}/${workflow_base}_run${run_id}.html"
  echo "[save] HTML page -> ${html_out}"
  curl -sSL -H "Authorization: token ${GH_TOKEN}" "$html_url" -o "$html_out"
}

download_run_logs_zip() {
  local run_id="$1"
  local workflow_base="$2"
  local dest="$3"
  local logs_zip="${dest}/${workflow_base}_run${run_id}_logs.zip"
  echo "[save] Logs archive -> ${logs_zip}"
  gh api --method GET "repos/:owner/:repo/actions/runs/${run_id}/logs" --output "$logs_zip"
}

download_artifacts() {
  local run_id="$1"
  local workflow_base="$2"
  local dest="$3"

  local run_dir="${dest}/${workflow_base}_run${run_id}"
  mkdir -p "$run_dir"

  echo "[download] artifacts -> ${run_dir}"
  if ! gh run download "$run_id" --dir "$run_dir"; then
    echo "[warn] No artifacts found for run ${run_id} (skipping archive download)" >&2
    return
  fi

  local archive_tmp="${dest}/run.zip"
  local archive_out="${dest}/${workflow_base}_run${run_id}.zip"
  echo "[archive] artifacts zip -> ${archive_out}"
  rm -f "$archive_tmp"
  if gh run download "$run_id" --archive --dir "$dest"; then
    if [[ -f "$archive_tmp" ]]; then
      mv -f "$archive_tmp" "$archive_out"
    else
      echo "[warn] Expected archive ${archive_tmp} not found after download" >&2
    fi
  else
    echo "[warn] Unable to download archive for run ${run_id}" >&2
  fi
}

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

  local workflow_base
  workflow_base=$(workflow_basename "$workflow")

  mkdir -p "$dest"

  if [[ "$status" != "completed" ]]; then
    echo "[wait] Latest run $run_id for $workflow is $status; skipping download."
    return
  fi

  echo "[download] $workflow run $run_id -> $dest (conclusion: ${conclusion:-unknown})"
  if [[ "$DRY_RUN" -eq 0 ]]; then
    download_html_page "$run_id" "$workflow_base" "$dest"
    download_run_logs_zip "$run_id" "$workflow_base" "$dest"
    download_artifacts "$run_id" "$workflow_base" "$dest"
  fi
}

main() {
  pick_token
  while IFS= read -r entry; do
    process_workflow "$entry"
  done < <(read_workflows)
}

main "$@"
