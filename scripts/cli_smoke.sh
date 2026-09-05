#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [[ -z "${SCRIPT_DIR}" ]]; then
  echo "Impossibile risolvere la directory dello script." >&2
  exit 1
fi

if ! ROOT_DIR="$(git -C "${SCRIPT_DIR}" rev-parse --show-toplevel 2>/dev/null)"; then
  ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
fi
export ROOT_DIR
CLI_ENTRYPOINT="${ROOT_DIR}/tools/py/game_cli.py"
CONFIG_DIR="${ROOT_DIR}/config/cli"
LOG_DIR="${ROOT_DIR}/logs/cli"
INCOMING_LOG_DIR="${ROOT_DIR}/logs/incoming_smoke"
INCOMING_PROFILE_NAME="staging_incoming"
DEFAULT_PROFILES=()

RUN_LOG_PATH=""
LABEL_SNAPSHOT_PATH=""
LABEL_LATEST_PATH=""

cleanup_label_logs() {
  local status=$?
  if [[ -n "${LABEL_SNAPSHOT_PATH}" ]]; then
    cp -f "${RUN_LOG_PATH}" "${LABEL_SNAPSHOT_PATH}" 2>/dev/null || true
    cp -f "${RUN_LOG_PATH}" "${LABEL_LATEST_PATH}" 2>/dev/null || true
  fi
  return "${status}"
}

slugify_label() {
  python3 - "$1" <<'PY'
import re
import sys
import unicodedata

value = sys.argv[1]
value = unicodedata.normalize("NFKD", value)
value = value.encode("ascii", "ignore").decode("ascii")
value = re.sub(r"[^A-Za-z0-9_-]+", "-", value)
value = re.sub(r"-+", "-", value)
value = value.strip("-").lower()
print(value)
PY
}

verify_biome_fields() {
  python3 - <<'PY'
import json
import os
import sys
from pathlib import Path
import numbers

try:
    import yaml
except ImportError as exc:
    sys.stderr.write(
        "PyYAML non disponibile: eseguire `pip install -r tools/py/requirements.txt`.\n"
    )
    sys.exit(1)

try:
    root = Path(os.environ["ROOT_DIR"])
except KeyError:
    sys.stderr.write("Variabile ROOT_DIR non definita nel contesto della verifica biomi.\n")
    sys.exit(1)

candidates = [
    root / "data" / "core" / "biomes.yaml",
    root / "data" / "biomes.yaml",
    root / "Game" / "data" / "core" / "biomes.yaml",
    root / "Game" / "data" / "biomes.yaml",
]

# Analizza anche directory nidificate comuni, mantenendo l'ordine deterministico.
for nested in sorted(root.glob("*/data/core/biomes.yaml")):
    if nested not in candidates:
        candidates.append(nested)

biome_path = next((path for path in candidates if path.exists()), None)

if biome_path is None:
    attempted = "\n".join(f"  - {path}" for path in candidates)
    sys.stderr.write("File biomi non trovato. Percorsi verificati:\n")
    sys.stderr.write(f"{attempted or '  (nessun candidato)'}\n")
    sys.exit(1)

with biome_path.open("r", encoding="utf-8") as handle:
    data = yaml.safe_load(handle) or {}

ALLOWED_SEVERITIES = {"low", "medium", "high"}

def is_number(value):
    return isinstance(value, numbers.Real) and not isinstance(value, bool)

biomes = data.get("biomes") or {}
missing = []

for biome_id, payload in biomes.items():
    label = payload.get("label")
    if not (isinstance(label, str) and label.strip()):
        missing.append((biome_id, "label"))

    summary = payload.get("summary")
    if not (isinstance(summary, str) and summary.strip()):
        missing.append((biome_id, "summary"))

    diff_base = payload.get("diff_base")
    if not is_number(diff_base):
        missing.append((biome_id, "diff_base"))

    mod_biome = payload.get("mod_biome")
    if not is_number(mod_biome):
        missing.append((biome_id, "mod_biome"))

    affixes = payload.get("affixes")
    if not (isinstance(affixes, list) and affixes and all(isinstance(item, str) for item in affixes)):
        missing.append((biome_id, "affixes"))

    hazard = payload.get("hazard") or {}
    modifiers = hazard.get("stress_modifiers") or {}
    severity = str(hazard.get("severity") or "").lower()
    if not (hazard.get("description") and severity in ALLOWED_SEVERITIES and modifiers):
        missing.append((biome_id, "hazard"))

    archetypes = payload.get("npc_archetypes") or {}
    if not (archetypes.get("primary") and archetypes.get("support")):
        missing.append((biome_id, "npc_archetypes"))

    stresswave = payload.get("stresswave") or {}
    thresholds = stresswave.get("event_thresholds") or {}
    if not (
        is_number(stresswave.get("baseline"))
        and is_number(stresswave.get("escalation_rate"))
        and isinstance(thresholds, dict)
        and thresholds
    ):
        missing.append((biome_id, "stresswave"))

    hooks = (payload.get("narrative") or {}).get("hooks") or []
    if not hooks:
        missing.append((biome_id, "narrative.hooks"))

    tone = (payload.get("narrative") or {}).get("tone")
    if not (isinstance(tone, str) and tone.strip()):
        missing.append((biome_id, "narrative.tone"))

if missing:
    sys.stderr.write("Verifica biomi fallita:\n")
    for biome_id, section in missing:
        sys.stderr.write(f"  - {biome_id}: campo mancante {section}\n")
    sys.exit(1)

def has_hazard_package(details):
    hazard_block = details.get("hazard") or {}
    severity_value = str(hazard_block.get("severity") or "").lower()
    modifiers = hazard_block.get("stress_modifiers") or {}
    return bool(
        hazard_block.get("description")
        and severity_value in ALLOWED_SEVERITIES
        and isinstance(modifiers, dict)
        and modifiers
    )


def has_archetype_package(details):
    archetypes_block = details.get("npc_archetypes") or {}
    primary = archetypes_block.get("primary") or []
    support = archetypes_block.get("support") or []
    return bool(primary and support)


def has_hooks(details):
    hooks_list = (details.get("narrative") or {}).get("hooks") or []
    return bool(hooks_list)


def has_tone(details):
    tone_value = (details.get("narrative") or {}).get("tone")
    return isinstance(tone_value, str) and tone_value.strip()


def has_stresswave(details):
    stresswave_block = details.get("stresswave") or {}
    thresholds_block = stresswave_block.get("event_thresholds") or {}
    return bool(
        is_number(stresswave_block.get("baseline"))
        and is_number(stresswave_block.get("escalation_rate"))
        and isinstance(thresholds_block, dict)
        and thresholds_block
    )


summary = {
    "total": len(biomes),
    "labels_complete": sum(1 for payload in biomes.values() if payload.get("label")),
    "summaries_complete": sum(1 for payload in biomes.values() if payload.get("summary")),
    "hazard_complete": sum(1 for payload in biomes.values() if has_hazard_package(payload)),
    "archetypes_complete": sum(1 for payload in biomes.values() if has_archetype_package(payload)),
    "stresswave_complete": sum(1 for payload in biomes.values() if has_stresswave(payload)),
    "tone_complete": sum(1 for payload in biomes.values() if has_tone(payload)),
    "hooks_complete": sum(1 for payload in biomes.values() if has_hooks(payload)),
    "hooks_total": sum(
        len((payload.get("narrative") or {}).get("hooks") or [])
        for payload in biomes.values()
    ),
}

print(json.dumps({"biome_validation": summary}, ensure_ascii=False))
PY
}

if [[ -d "${CONFIG_DIR}" ]]; then
  while IFS= read -r profile_path; do
    profile_name="$(basename "${profile_path}" .yaml)"
    if [[ "${profile_name}" == "${INCOMING_PROFILE_NAME}" ]]; then
      if [[ -n "${CLI_INCLUDE_INCOMING_PROFILE:-}" ]]; then
        DEFAULT_PROFILES+=("${profile_name}")
      fi
      continue
    fi
    DEFAULT_PROFILES+=("${profile_name}")
  done < <(find "${CONFIG_DIR}" -maxdepth 1 -type f -name '*.yaml' | sort)
fi

usage() {
  cat <<'USAGE'
Usage: scripts/cli_smoke.sh [--profile "playtest support"] [--label NAME] [--log-subdir PATH]

Esegue i comandi smoke della CLI per i profili configurati.

Opzioni:
  --profile, --profiles  Lista di profili separati da spazio da eseguire.
  --label                Etichetta per i log (slug automatico + timestamp).
  --log-subdir           Percorso relativo (sotto logs/cli) in cui salvare i log.
  -h, --help             Mostra questo messaggio.

In alternativa è possibile usare le variabili d'ambiente CLI_PROFILES,
CLI_LOG_LABEL e CLI_LOG_SUBDIR.
Il profilo "${INCOMING_PROFILE_NAME}" è opt-in: specificarlo esplicitamente
con --profile/CLI_PROFILES oppure esportare CLI_INCLUDE_INCOMING_PROFILE=1.
USAGE
}

profiles_arg="${CLI_PROFILES:-}"
log_label="${CLI_LOG_LABEL:-}"
log_subdir="${CLI_LOG_SUBDIR:-}"

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
    --label)
      if [[ $# -lt 2 ]]; then
        echo "Errore: manca il valore per --label" >&2
        usage >&2
        exit 1
      fi
      log_label="$2"
      shift 2
      ;;
    --log-subdir)
      if [[ $# -lt 2 ]]; then
        echo "Errore: manca il percorso per --log-subdir" >&2
        usage >&2
        exit 1
      fi
      log_subdir="$2"
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

if [[ -n "${log_subdir}" ]]; then
  if ! effective_log_dir="$(LOG_DIR="${LOG_DIR}" python3 - "$log_subdir" <<'PY'
import os
import pathlib
import sys

base = pathlib.Path(os.environ["LOG_DIR"]).resolve()
raw = pathlib.Path(sys.argv[1])
if raw.is_absolute():
    sys.stderr.write("--log-subdir deve essere un percorso relativo sotto logs/cli.\n")
    sys.exit(1)

sanitized = pathlib.Path()
for part in raw.parts:
    if part in ("", "."):
        continue
    if part == "..":
        sys.stderr.write("--log-subdir non può risalire la gerarchia.\n")
        sys.exit(1)
    sanitized = sanitized / part

target = base / sanitized
print(str(target))
PY
)"; then
    exit 1
  fi
  if [[ -z "${effective_log_dir}" ]]; then
    effective_log_dir="${LOG_DIR}"
  fi
else
  effective_log_dir="${LOG_DIR}"
fi

mkdir -p "${effective_log_dir}"
mkdir -p "${INCOMING_LOG_DIR}"

timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
log_base="smoke-${timestamp}"

if [[ -n "${log_label}" ]]; then
  slugified_label="$(slugify_label "${log_label}")"
  if [[ -z "${slugified_label}" ]]; then
    echo "Impossibile derivare uno slug valido da --label='${log_label}'." >&2
    exit 1
  fi
  log_base="${slugified_label}-${timestamp}"
  LABEL_SNAPSHOT_PATH="${effective_log_dir}/${slugified_label}.log"
  LABEL_LATEST_PATH="${effective_log_dir}/latest-${slugified_label}.log"
fi

RUN_LOG_PATH="${effective_log_dir}/${log_base}.log"
latest_log="${effective_log_dir}/latest-smoke.log"

: >"${RUN_LOG_PATH}"
: >"${latest_log}"

if [[ -n "${LABEL_SNAPSHOT_PATH}" ]]; then
  : >"${LABEL_SNAPSHOT_PATH}"
  : >"${LABEL_LATEST_PATH}"
  trap cleanup_label_logs EXIT
fi

exec > >(tee -a "${RUN_LOG_PATH}" | tee "${latest_log}")
exec 2>&1

echo "Output CLI smoke registrato in ${RUN_LOG_PATH} (snapshot corrente: ${latest_log})"
if [[ -n "${LABEL_SNAPSHOT_PATH}" ]]; then
  echo "Etichetta '${slugified_label}' esportata in ${LABEL_SNAPSHOT_PATH} (con copia latest: ${LABEL_LATEST_PATH})"
fi

run_cli_command() {
  local profile_name="$1"
  local summary_file="$2"
  shift 2
  if [[ -n "${summary_file}" ]]; then
    python3 "${CLI_ENTRYPOINT}" --profile "${profile_name}" "$@" 2>&1 | tee -a "${summary_file}"
  else
    python3 "${CLI_ENTRYPOINT}" --profile "${profile_name}" "$@"
  fi
}

echo "::group::Biome dataset check"
verify_biome_fields
echo "::endgroup::"

for profile in "${PROFILES_TO_RUN[@]}"; do
  profile_file="${CONFIG_DIR}/${profile}.yaml"
  if [[ ! -f "${profile_file}" ]]; then
    echo "Profilo CLI '${profile}' non trovato (${profile_file})" >&2
    exit 1
  fi

  seed="smoke-${profile}"
  profile_log_dir="${effective_log_dir}"
  summary_file=""

  if [[ "${profile}" == "${INCOMING_PROFILE_NAME}" ]]; then
    profile_log_dir="${INCOMING_LOG_DIR}"
    summary_file="${profile_log_dir}/${profile}-smoke.log"
    : "${GAME_CLI_INCOMING_DATA_ROOT:=${ROOT_DIR}/incoming/decompressed/latest/data}"
    : "${GAME_CLI_INCOMING_PACK_ROOT:=${ROOT_DIR}/incoming/decompressed/latest/packs/evo_tactics_pack}"
    export GAME_CLI_INCOMING_DATA_ROOT
    export GAME_CLI_INCOMING_PACK_ROOT
    if [[ ! -d "${GAME_CLI_INCOMING_DATA_ROOT}" ]]; then
      echo "Asset incoming decompressi non trovati in ${GAME_CLI_INCOMING_DATA_ROOT}" >&2
      exit 1
    fi
    if [[ ! -d "${GAME_CLI_INCOMING_PACK_ROOT}" ]]; then
      echo "Pack ecosistemi incoming non trovato in ${GAME_CLI_INCOMING_PACK_ROOT}" >&2
      exit 1
    fi
    : >"${summary_file}"
  fi

  mkdir -p "${profile_log_dir}"
  json_out="${profile_log_dir}/${profile}-pack.json"

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
  run_cli_command "${profile}" "${summary_file}" validate-datasets
  run_cli_command "${profile}" "${summary_file}" "${roll_args[@]}"
  run_cli_command "${profile}" "${summary_file}" validate-ecosystem-pack --json-out "${json_out}"

  if [[ "${profile}" == "playtest" ]]; then
    run_cli_command "${profile}" "${summary_file}" generate-encounter savana --party-power 18 --seed "${seed}"
  fi
  echo "::endgroup::"

done
