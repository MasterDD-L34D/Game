#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
VENV_DIR="${ROOT_DIR}/.venv"
PYTHON_BIN="${PYTHON:-python3}"
REQ_FILE="${ROOT_DIR}/requirements.txt"
STAMP_FILE="${VENV_DIR}/.requirements.sha256"

if [ ! -d "${VENV_DIR}" ]; then
  "${PYTHON_BIN}" -m venv "${VENV_DIR}"
fi

# shellcheck disable=SC1091
source "${VENV_DIR}/bin/activate"

pip install --upgrade pip >/dev/null
if [ -f "${REQ_FILE}" ]; then
  NEW_HASH="$(sha256sum "${REQ_FILE}" | awk '{print $1}')"
  OLD_HASH=""
  if [ -f "${STAMP_FILE}" ]; then
    OLD_HASH="$(cat "${STAMP_FILE}")"
  fi
  if [ "${NEW_HASH}" != "${OLD_HASH}" ]; then
    pip install -r "${REQ_FILE}"
    echo "${NEW_HASH}" > "${STAMP_FILE}"
  fi
fi

exec python "${ROOT_DIR}/run_suite.py" "$@"
