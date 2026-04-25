#!/usr/bin/env bash
# PostToolUse hook: validate config files after Edit/Write.
# Insights audit 2026-04-25 — kill silent config corruption (LiteLLM enforced_params, denyCommands, Langfuse image).
# Exit 0 always (warn-only). Output goes to transcript, never blocks tool.

set -uo pipefail

INPUT=$(cat)
FILE=$(printf '%s' "$INPUT" | python3 -c 'import sys,json; d=json.load(sys.stdin); print(d.get("tool_input",{}).get("file_path",""))' 2>/dev/null || true)

[ -z "${FILE:-}" ] && exit 0
[ ! -f "$FILE" ] && exit 0

case "$FILE" in
  *.json)
    if command -v jq >/dev/null 2>&1; then
      jq empty "$FILE" >/dev/null 2>&1 || echo "[hook] WARN: invalid JSON in $FILE — re-check edit"
    else
      python3 -c "import json,sys; json.load(open(sys.argv[1]))" "$FILE" >/dev/null 2>&1 || echo "[hook] WARN: invalid JSON in $FILE — re-check edit"
    fi
    ;;
  *.yaml|*.yml)
    python3 -c "import yaml,sys; yaml.safe_load(open(sys.argv[1]))" "$FILE" >/dev/null 2>&1 || echo "[hook] WARN: invalid YAML in $FILE — re-check edit"
    ;;
  *.py)
    if command -v ruff >/dev/null 2>&1; then
      ruff check "$FILE" 2>&1 | head -5 || true
    fi
    ;;
esac

exit 0
