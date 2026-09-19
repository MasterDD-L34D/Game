#!/usr/bin/env bash
set -euo pipefail

# Test stack ridotto al solo backend dopo la rimozione di apps/dashboard
# (#1343, sprint SPRINT_001 fase 2). Era npm run test:backend + dashboard
# Vitest; ora basta il primo.

npm run test:backend
