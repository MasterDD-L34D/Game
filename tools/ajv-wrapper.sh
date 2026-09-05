#!/usr/bin/env bash
set -euo pipefail
exec npx --yes ajv-cli "$@"
