#!/usr/bin/env bash
set -euo pipefail

API_PID=""
WEB_PID=""

cleanup() {
  if [[ -n "$API_PID" ]]; then
    kill "$API_PID" >/dev/null 2>&1 || true
    wait "$API_PID" 2>/dev/null || true
    API_PID=""
  fi
  if [[ -n "$WEB_PID" ]]; then
    kill "$WEB_PID" >/dev/null 2>&1 || true
    wait "$WEB_PID" 2>/dev/null || true
    WEB_PID=""
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

npm run start:api &
API_PID=$!

npm run dev --workspace apps/dashboard &
WEB_PID=$!

wait -n "$API_PID" "$WEB_PID"

cleanup
wait "$API_PID" 2>/dev/null || true
wait "$WEB_PID" 2>/dev/null || true
