#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CLI_ENTRYPOINT="${ROOT_DIR}/tools/py/game_cli.py"
CONFIG_DIR="${ROOT_DIR}/config/cli"
LOG_DIR="${ROOT_DIR}/logs/cli"
DEFAULT_PROFILES=()

if [[ -d "${CONFIG_DIR}" ]]; then
  while IFS= read -r profile_path; do
    profile_name="$(basename "${profile_path}" .yaml)"
    DEFAULT_PROFILES+=("${profile_name}")
  done < <(find "${CONFIG_DIR}" -maxdepth 1 -type f -name '*.yaml' | sort)
fi

usage() {
  cat <<'USAGE'
Usage: scripts/cli_smoke.sh [--profile "playtest support"]

Esegue i comandi smoke della CLI per i profili configurati.

Opzioni:
  --profile, --profiles  Lista di profili separati da spazio da eseguire.
  -h, --help             Mostra questo messaggio.

In alternativa è possibile usare la variabile d'ambiente CLI_PROFILES.
USAGE
}

profiles_arg="${CLI_PROFILES:-}"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --profile|--profiles)
      if [[ $# -lt 2 ]]; then
        echo "Errore: manca l'elenco dei profili" >&2
        usage >&2
        exit 1
      fi
      profiles_arg="$2"
      shift 2
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Argomento non riconosciuto: $1" >&2
      usage >&2
      exit 1
      ;;
  esac
done

if [[ -z "${profiles_arg}" ]]; then
  if [[ ${#DEFAULT_PROFILES[@]} -eq 0 ]]; then
    echo "Nessun profilo CLI configurato in ${CONFIG_DIR}" >&2
    exit 1
  fi
  PROFILES_TO_RUN=("${DEFAULT_PROFILES[@]}")
else
  read -r -a PROFILES_TO_RUN <<< "${profiles_arg}"
fi

mkdir -p "${LOG_DIR}"

for profile in "${PROFILES_TO_RUN[@]}"; do
  profile_file="${CONFIG_DIR}/${profile}.yaml"
  if [[ ! -f "${profile_file}" ]]; then
    echo "Profilo CLI '${profile}' non trovato (${profile_file})" >&2
    exit 1
  fi

  seed="smoke-${profile}"
  json_out="${LOG_DIR}/${profile}-pack.json"

  case "${profile}" in
    support)
      roll_args=("roll-pack" "ENFJ" "sentinel" "--seed" "${seed}")
      ;;
    telemetry)
      roll_args=("roll-pack" "ISFJ" "support" "--seed" "${seed}")
      ;;
    *)
      roll_args=("roll-pack" "ENTP" "invoker" "--seed" "${seed}")
      ;;
  esac

  echo "::group::CLI smoke (${profile})"
  python3 "${CLI_ENTRYPOINT}" --profile "${profile}" validate-datasets
  python3 "${CLI_ENTRYPOINT}" --profile "${profile}" "${roll_args[@]}"
  python3 "${CLI_ENTRYPOINT}" --profile "${profile}" validate-ecosystem-pack --json-out "${json_out}"

  if [[ "${profile}" == "playtest" ]]; then
    python3 "${CLI_ENTRYPOINT}" --profile "${profile}" generate-encounter savana --party-power 18 --seed "${seed}"
  fi
  echo "::endgroup::"

done
