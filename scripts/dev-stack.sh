#!/usr/bin/env bash
set -euo pipefail

# Avvio backend Express. La dashboard scaffold e' stata rimossa con il
# cleanup #1343 (sprint SPRINT_001 fase 2): ora dev-stack lancia solo
# l'API. Per smoke test usa curl/HTTPie sugli endpoint /api/v1/*.

API_PID=""

cleanup() {
  if [[ -n "$API_PID" ]]; then
    kill "$API_PID" >/dev/null 2>&1 || true
    wait "$API_PID" 2>/dev/null || true
    API_PID=""
  fi
}

on_exit() {
  local status=$?
  cleanup
  exit $status
}

on_signal() {
  cleanup
  exit 130
}

trap on_exit EXIT
trap on_signal INT TERM

npm run dev:setup --workspace apps/backend
npm run start:api &
API_PID=$!

wait "$API_PID"
