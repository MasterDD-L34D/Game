#!/usr/bin/env bash
set -euo pipefail

export VITE_API_MODE="${VITE_API_MODE:-mock}"
export VITE_API_BASE_URL="${VITE_API_BASE_URL:-http://localhost:3333}"
export VITE_API_USER="${VITE_API_USER:-test-runner}"

npm run test:backend
npm run test --workspace apps/dashboard
