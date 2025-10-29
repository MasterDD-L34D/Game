#!/usr/bin/env bash
# Genera i report (JSON e HTML) per i file nella cartella incoming/.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

cd "${PROJECT_ROOT}"

python3 tools/py/game_cli.py investigate incoming --recursive --json --html "$@"
