#!/usr/bin/env bash
# Genera i report (JSON e HTML) per i file nella cartella incoming/.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

cd "${PROJECT_ROOT}"

args=("$@")
destination=""

for i in "${!args[@]}"; do
    arg="${args[$i]}"
    case "$arg" in
        --destination)
            next_index=$((i + 1))
            if (( next_index < ${#args[@]} )); then
                destination="${args[$next_index]}"
            fi
            ;;
        --destination=*)
            destination="${arg#*=}"
            ;;
    esac
done

html_args=(--html)
normalized_destination="${destination//[[:space:]]/}"
if [[ "$normalized_destination" == "-" ]]; then
    html_args=()
fi

python3 tools/py/game_cli.py investigate incoming --recursive --json "${html_args[@]}" "${args[@]}"
