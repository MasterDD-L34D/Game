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
CONFIG_FILE="${CI_LOG_HARVEST_CONFIG:-ops/ci-log-config.txt}"
DRY_RUN=${DRY_RUN:-0}

usage() {
  cat <<'USAGE'
Usage: scripts/ci_log_harvest.sh [--config <file>] [--ref <branch>] [--dry-run]

Options:
  --config <file>   Path to a custom workflow list (pipe-separated fields).
  --ref <branch>    Branch/ref used when dispatching manual workflows (default: main).
  --dry-run         Print actions without calling GitHub CLI.
USAGE
}

detect_platform() {
  local os arch
  os=$(uname -s | tr '[:upper:]' '[:lower:]')
  arch=$(uname -m)

  case "$arch" in
    x86_64|amd64)
      arch="amd64";;
    arm64|aarch64)
      arch="arm64";;
    *)
      echo "Error: unsupported architecture for gh bootstrap ($arch)." >&2
      return 1;;
  esac

  case "$os" in
    linux|darwin)
      ;; 
    *)
      echo "Error: unsupported OS for gh bootstrap ($os)." >&2
      return 1;;
  esac

  echo "${os}|${arch}"
}

bootstrap_gh() {
  local bootstrap_dir="${GH_BOOTSTRAP_DIR:-.cache/gh-cli}"
  local gh_bin="${bootstrap_dir}/bin/gh"

  if [[ -x "$gh_bin" ]]; then
    export PATH="${bootstrap_dir}/bin:${PATH}"
    return
  fi

  local platform
  if ! platform=$(detect_platform); then
    return 1
  fi

  local os="${platform%%|*}"
  local arch="${platform##*|}"
  local version="${GH_BOOTSTRAP_VERSION:-2.57.0}"
  local tarball="gh_${version}_${os}_${arch}.tar.gz"
  local url="https://github.com/cli/cli/releases/download/v${version}/${tarball}"

  echo "[bootstrap] Installing GitHub CLI v${version} -> ${bootstrap_dir} (${os}/${arch})" >&2
  mkdir -p "$bootstrap_dir"

  if ! curl -fsSL "$url" | tar -xz -C "$bootstrap_dir" --strip-components=1; then
    echo "Error: unable to download/install gh from ${url}. Install gh manually or set GH_BOOTSTRAP_DIR to a pre-populated path." >&2
    return 1
  fi

  export PATH="${bootstrap_dir}/bin:${PATH}"
}

ensure_gh() {
  if command -v gh >/dev/null 2>&1; then
    return
  fi

  if ! bootstrap_gh; then
    echo "Error: GitHub CLI (gh) is required. Install via brew/apt or set GH_BOOTSTRAP_DIR to an existing gh install." >&2
    exit 1
  fi
}

pick_token() {
  local token=""
  local source=""
  for name in CI_LOG_PAT LOG_HARVEST_PAT GH_TOKEN GITHUB_TOKEN; do
    if [[ -n "${!name-}" ]]; then
      token="${!name}"
      source="$name"
      break
    fi
  done

  if [[ -z "$token" ]]; then
    echo "Error: provide a PAT with workflow + read:org scopes and repo/admin permissions via CI_LOG_PAT (preferred) or LOG_HARVEST_PAT." >&2
    exit 1
  fi

  if [[ "$source" == "GITHUB_TOKEN" ]]; then
    echo "[warn] GITHUB_TOKEN may not include workflow/read:org; prefer CI_LOG_PAT or LOG_HARVEST_PAT." >&2
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
  "data-quality.yml|logs/ci_runs|auto|"
  "lighthouse.yml|logs/ci_runs|auto|"
  "search-index.yml|logs/ci_runs|auto|"
  "telemetry-export.yml|logs/ci_runs|auto|"
  "idea-intake-index.yml|logs/ci_runs|auto|"
  "schema-validate.yml|logs/ci_runs|auto|"
  "validate-naming.yml|logs/ci_runs|auto|"
  "validate_traits.yml|logs/ci_runs|auto|"
  "update-evo-tracker.yml|logs/ci_runs|auto|"
  "traits-sync.yml|logs/ci_runs|auto|"
  "evo-doc-backfill.yml|logs/ci_runs|auto|"
  "evo-rollout-status.yml|logs/ci_runs|auto|"
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
  if [[ -z "${GH_API_SUPPORTS_OUTPUT:-}" ]]; then
    if gh api --help 2>/dev/null | grep -q -- '--output'; then
      GH_API_SUPPORTS_OUTPUT=1
    else
      GH_API_SUPPORTS_OUTPUT=0
    fi
  fi

  if [[ "$GH_API_SUPPORTS_OUTPUT" -eq 1 ]]; then
    gh api --method GET "repos/:owner/:repo/actions/runs/${run_id}/logs" --header "Accept: application/zip" --output "$logs_zip"
  else
    gh api --method GET "repos/:owner/:repo/actions/runs/${run_id}/logs" --header "Accept: application/zip" >"$logs_zip"
  fi
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

  local archive_out="${dest}/${workflow_base}_run${run_id}.zip"
  echo "[archive] artifacts zip -> ${archive_out}"
  shopt -s nullglob
  local -a existing_zips=("${dest}"/*.zip)
  shopt -u nullglob
  if gh run download "$run_id" --archive --dir "$dest"; then
    shopt -s nullglob
    local -a new_zips=("${dest}"/*.zip)
    shopt -u nullglob

    local archive_tmp=""
    for zip_path in "${new_zips[@]}"; do
      local already_present=0
      for existing_zip in "${existing_zips[@]}"; do
        if [[ "$zip_path" == "$existing_zip" ]]; then
          already_present=1
          break
        fi
      done
      if [[ $already_present -eq 0 ]]; then
        archive_tmp="$zip_path"
        break
      fi
    done

    if [[ -z "$archive_tmp" && -f "${dest}/artifacts.zip" ]]; then
      archive_tmp="${dest}/artifacts.zip"
    fi

    if [[ -n "$archive_tmp" ]]; then
      mv -f "$archive_tmp" "$archive_out"
    else
      echo "[warn] Unable to locate downloaded archive in ${dest} (expected *.zip)" >&2
    fi
  else
    echo "[warn] Unable to download archive for run ${run_id}" >&2
  fi
}

read_workflows() {
  local workflows=()
  if [[ -n "$CONFIG_FILE" && -f "$CONFIG_FILE" ]]; then
    while IFS= read -r line || [[ -n "$line" ]]; do
      [[ -z "$line" || "$line" =~ ^# ]] && continue
      workflows+=("$line")
    done <"$CONFIG_FILE"
  else
    echo "[warn] Config file not found (${CONFIG_FILE:-unset}); using built-in defaults" >&2
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

  if [[ "$DRY_RUN" -eq 1 ]]; then
    echo "[dry-run] $workflow -> $dest (mode: $mode${inputs:+, inputs: $inputs})"
    return
  fi

  if [[ "$mode" == "manual" && "${DISPATCH_MANUAL:-0}" != "1" ]]; then
    echo "[info] $workflow is manual-only; skipping dispatch but downloading latest run if present."
  fi

  if [[ "$mode" == "manual" && "${DISPATCH_MANUAL:-0}" == "1" ]]; then
    echo "[dispatch] $workflow on ref $REF ${inputs:+with inputs: $inputs}"
    if [[ "$DRY_RUN" -eq 0 ]]; then
      gh workflow run "$workflow" --ref "$REF" ${inputs:-}
    fi
    if [[ "${WAIT_FOR_COMPLETION:-0}" == "1" ]]; then
      sleep 5
      local latest_run
      latest_run=$(gh run list --workflow "$workflow" --limit 1 --json databaseId --jq '.[0].databaseId')
      if [[ -n "$latest_run" ]]; then
        maybe_wait_for_completion "$workflow" "$latest_run"
      fi
    else
      echo "Re-run the script after completion to download artifacts."
      return
    fi
  fi

  local run_info
  run_info=$(gh run list --workflow "$workflow" --limit 1 --json databaseId,status,conclusion --jq '.[0] | [(.databaseId|tostring), .status, (.conclusion // "")] | @tsv')

  if [[ -z "$run_info" ]]; then
    echo "[warn] No runs found for $workflow"
    return
  fi

  local run_id status conclusion
  IFS=$'\t' read -r run_id status conclusion <<<"$run_info"

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
  if [[ "$DRY_RUN" -eq 0 ]]; then
    ensure_gh
    pick_token
  else
    echo "[dry-run] Skipping gh bootstrap and token validation" >&2
  fi

  while IFS= read -r entry; do
    process_workflow "$entry"
  done < <(read_workflows)
}

main "$@"
