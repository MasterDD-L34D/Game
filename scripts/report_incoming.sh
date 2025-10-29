#!/usr/bin/env bash
# Genera i report per incoming/ ed esegue le validazioni dei dataset/ecosistemi sugli archivi ZIP.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
INCOMING_DIR="${PROJECT_ROOT}/incoming"
VALIDATION_REPORT_ROOT="${PROJECT_ROOT}/reports/incoming/validation"
TIMESTAMP="$(date +%Y%m%d-%H%M%S)"
TEMP_ROOT="$(mktemp -d "${TMPDIR:-/tmp}/incoming_validation.XXXXXX")"
trap 'rm -rf "${TEMP_ROOT}"' EXIT

if ! command -v unzip >/dev/null 2>&1; then
    echo "Errore: il comando 'unzip' non è disponibile nel PATH." >&2
    exit 1
fi

mkdir -p "${VALIDATION_REPORT_ROOT}"

relative_to_project() {
    local path="$1"
    if [[ "${path}" == "${PROJECT_ROOT}"* ]]; then
        echo "${path#${PROJECT_ROOT}/}"
    else
        echo "${path}"
    fi
}

VALIDATION_EXIT=0

process_zip() {
    local zip_file="$1"
    local base name extraction_dir workdir log_dir dataset_log ecosystem_log summary_file
    local cli_path run_root cli_origin
    local dataset_exit ecosystem_exit ran_ecosystem

    base="$(basename "${zip_file}")"
    name="${base%.*}"
    extraction_dir="${TEMP_ROOT}/${name}"
    mkdir -p "${extraction_dir}"

    log_dir="${VALIDATION_REPORT_ROOT}/${name}-${TIMESTAMP}"
    mkdir -p "${log_dir}"
    summary_file="${log_dir}/summary.txt"

    if ! unzip -q "${zip_file}" -d "${extraction_dir}"; then
        {
            echo "zip_file: ${base}"
            echo "timestamp: ${TIMESTAMP}"
            echo "error: estrazione fallita"
        } >"${summary_file}"
        VALIDATION_EXIT=1
        return
    fi

    shopt -s dotglob
    local entries=("${extraction_dir}"/*)
    shopt -u dotglob
    if (( ${#entries[@]} == 1 )) && [[ -d "${entries[0]}" ]]; then
        workdir="${entries[0]}"
    else
        workdir="${extraction_dir}"
    fi

    dataset_log="${log_dir}/validate-datasets.log"
    ecosystem_log="${log_dir}/validate-ecosystem-pack.log"

    if [[ -f "${workdir}/tools/py/game_cli.py" ]]; then
        cli_path="${workdir}/tools/py/game_cli.py"
        run_root="${workdir}"
        cli_origin="archive"
    else
        cli_path="${PROJECT_ROOT}/tools/py/game_cli.py"
        run_root="${PROJECT_ROOT}"
        cli_origin="repository"
    fi

    pushd "${run_root}" >/dev/null

    dataset_exit=0
    if ! python3 "${cli_path}" validate-datasets >"${dataset_log}" 2>&1; then
        dataset_exit=$?
    fi

    ran_ecosystem="no"
    ecosystem_exit=0
    if [[ -d "${run_root}/packs/evo_tactics_pack" ]]; then
        ran_ecosystem="yes"
        if ! python3 "${cli_path}" validate-ecosystem-pack >"${ecosystem_log}" 2>&1; then
            ecosystem_exit=$?
        fi
    fi

    popd >/dev/null

    if (( dataset_exit != 0 )) && (( VALIDATION_EXIT == 0 )); then
        VALIDATION_EXIT=${dataset_exit}
    fi
    if [[ "${ran_ecosystem}" == "yes" ]] && (( ecosystem_exit != 0 )) && (( VALIDATION_EXIT == 0 )); then
        VALIDATION_EXIT=${ecosystem_exit}
    fi

    local rel_dataset_log rel_ecosystem_log
    rel_dataset_log="$(relative_to_project "${dataset_log}")"
    rel_ecosystem_log="$(relative_to_project "${ecosystem_log}")"

    {
        echo "zip_file: ${base}"
        echo "timestamp: ${TIMESTAMP}"
        echo "cli_origin: ${cli_origin}"
        echo "working_directory: ${workdir}"
        echo "validate_datasets_exit_code: ${dataset_exit}"
        echo "validate_datasets_log: ${rel_dataset_log}"
        if [[ "${ran_ecosystem}" == "yes" ]]; then
            echo "validate_ecosystem_pack_exit_code: ${ecosystem_exit}"
            echo "validate_ecosystem_pack_log: ${rel_ecosystem_log}"
        else
            echo "validate_ecosystem_pack: skipped"
        fi
    } >"${summary_file}"
}

cd "${PROJECT_ROOT}"

ZIP_PROCESSED=0
while IFS= read -r -d '' zip_candidate; do
    ZIP_PROCESSED=1
    process_zip "${zip_candidate}"
done < <(find "${INCOMING_DIR}" -maxdepth 1 -type f \( -iname '*.zip' \) -print0)

if (( ZIP_PROCESSED == 0 )); then
    echo "Nessun archivio ZIP rilevato in ${INCOMING_DIR}." >&2
fi

investigate_exit=0
if ! python3 tools/py/game_cli.py investigate incoming --recursive --json --html "$@"; then
    investigate_exit=$?
fi

if (( VALIDATION_EXIT != 0 )); then
    exit ${VALIDATION_EXIT}
fi
if (( investigate_exit != 0 )); then
    exit ${investigate_exit}
fi
