#!/usr/bin/env bash
# PostToolUse hook: validate config files after Edit/Write.
# Insights audit 2026-04-25 — kill silent config corruption (LiteLLM enforced_params, denyCommands, Langfuse image).
# Exit 0 always (warn-only). Output goes to transcript, never blocks tool.

set -uo pipefail

INPUT=$(cat)
FILE=$(printf '%s' "$INPUT" | python3 -c 'import sys,json; d=json.load(sys.stdin); print(d.get("tool_input",{}).get("file_path",""))' 2>/dev/null || true)

[ -z "${FILE:-}" ] && exit 0
[ ! -f "$FILE" ] && exit 0

# Encoding mojibake guard (insights audit 2026-04-25 — caught the
# glossary.json corruption AFTER CI failed in PR #1776). The pattern:
# Python json.load + json.dump on Windows preserves whatever encoding
# was in the file; if a previous write corrupted UTF-8 to "Ã" mojibake,
# subsequent reads/writes silently propagate the corruption.
# Detect: count "Ã" sequences (UTF-8 mojibake signature). >5 = warn.
mojibake_check() {
  local f="$1"
  # Count occurrences (NOT lines) of UTF-8 mojibake signature "Ã".
  # grep -o emits one match per line; wc -l counts them.
  # Threshold: >5 occurrences = likely systematic corruption (single
  # legitimate Italian word like "città" generates 0 false positives,
  # since the byte 'Ã' only appears as a leading byte for actual
  # multibyte UTF-8 chars when the file is corrupted).
  local count
  count=$(grep -o "Ã" "$f" 2>/dev/null | wc -l | tr -d ' \t\n\r')
  count="${count:-0}"
  if [ "$count" -gt 5 ] 2>/dev/null; then
    echo "[hook] WARN: $count mojibake sequences (Ã) detected in $f"
    echo "[hook]   likely UTF-8 corruption from cross-platform read/write"
    echo "[hook]   action: restore from git ('git show HEAD:$f') and re-apply changes with explicit encoding='utf-8'"
  fi
}

case "$FILE" in
  *.json)
    if command -v jq >/dev/null 2>&1; then
      jq empty "$FILE" >/dev/null 2>&1 || echo "[hook] WARN: invalid JSON in $FILE — re-check edit"
    else
      python3 -c "import json,sys; json.load(open(sys.argv[1]))" "$FILE" >/dev/null 2>&1 || echo "[hook] WARN: invalid JSON in $FILE — re-check edit"
    fi
    mojibake_check "$FILE"
    ;;
  *.yaml|*.yml)
    python3 -c "import yaml,sys; yaml.safe_load(open(sys.argv[1]))" "$FILE" >/dev/null 2>&1 || echo "[hook] WARN: invalid YAML in $FILE — re-check edit"
    mojibake_check "$FILE"
    ;;
  *.md)
    mojibake_check "$FILE"
    ;;
  *.py)
    if command -v ruff >/dev/null 2>&1; then
      ruff check "$FILE" 2>&1 | head -5 || true
    fi
    mojibake_check "$FILE"
    ;;
esac

exit 0
