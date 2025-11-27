#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

usage() {
  cat <<USAGE
Usage: $0 --dataset <dataset> --schema <schema-path>

Options:
  --dataset   Dataset identifier or directory containing JSON files.
  --schema    Path to the JSON schema used for validation.
  --help      Show this help message.
USAGE
}

DATASET=""
SCHEMA=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --dataset)
      DATASET="$2"
      shift 2
      ;;
    --schema)
      SCHEMA="$2"
      shift 2
      ;;
    --help|-h)
      usage
      exit 0
      ;;
    *)
      echo "Unknown option: $1" >&2
      usage >&2
      exit 1
      ;;
  esac
done

if [[ -z "$DATASET" || -z "$SCHEMA" ]]; then
  echo "Both --dataset and --schema are required." >&2
  usage >&2
  exit 1
fi

resolve_dataset() {
  local dataset_key="$1"
  case "$dataset_key" in
    evo-species)
      echo "${REPO_ROOT}/data/external/evo/species"
      ;;
    *)
      if [[ -d "$dataset_key" ]]; then
        echo "$(cd "$dataset_key" && pwd)"
      elif [[ -d "${REPO_ROOT}/${dataset_key}" ]]; then
        echo "$(cd "${REPO_ROOT}/${dataset_key}" && pwd)"
      else
        echo "Unknown dataset: $dataset_key" >&2
        exit 1
      fi
      ;;
  esac
}

DATA_DIR=$(resolve_dataset "$DATASET")

if [[ ! -d "$DATA_DIR" ]]; then
  echo "Dataset directory not found: $DATA_DIR" >&2
  exit 1
fi

if [[ -f "$SCHEMA" ]]; then
  SCHEMA_PATH=$(cd "$(dirname "$SCHEMA")" && pwd)/"$(basename "$SCHEMA")"
elif [[ -f "${REPO_ROOT}/${SCHEMA}" ]]; then
  SCHEMA_PATH="${REPO_ROOT}/${SCHEMA}"
else
  echo "Schema file not found: $SCHEMA" >&2
  exit 1
fi

mapfile -t FILES < <(find "$DATA_DIR" -maxdepth 1 -type f -name '*.json')

if [[ "$DATASET" == "evo-species" ]]; then
  # Exclude ecotype payloads and catalog aggregators from schema validation.
  mapfile -t FILES < <(find "$DATA_DIR" -maxdepth 1 -type f -name '*.json' \
    ! -name '*_ecotypes.json' \
    ! -name 'species_catalog.json' \
    ! -name 'species_ecotype_map.json')
fi

if [[ ${#FILES[@]} -eq 0 ]]; then
  echo "No JSON files found in $DATA_DIR" >&2
  exit 1
fi

node "${REPO_ROOT}/scripts/validate-dataset.cjs" "$SCHEMA_PATH" "${FILES[@]}"
