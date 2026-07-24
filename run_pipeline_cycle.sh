#!/usr/bin/env bash
set -euo pipefail

# Wrapper per avviare il runner di pipeline dalla radice del repository.
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
exec "${SCRIPT_DIR}/scripts/run_pipeline_cycle.sh" "$@"
