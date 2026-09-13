#!/usr/bin/env bash
# PreToolUse hook: warn (non-blocking) when Edit/Write/MultiEdit targets a
# `.env` file inside the repo. Forces the canonical secrets path
# `~/.config/api-keys/keys.env` (per OD-005 + insights audit 2026-04-25).
#
# Behavior: warn-only (exit 0). Output goes to transcript so the model
# sees it and self-corrects.
#
# Detects:
#   1. Edit target ending in `.env` (any name: .env, .env.local, foo.env)
#   2. Inside repo path (NOT under user home `.config/`)
#
# Exempt:
#   - `~/.config/api-keys/*` (canonical location)
#   - `*.env.example` / `*.env.sample` (template files, safe)
#   - read-only `cat`/`grep`/etc — not Edit/Write tools

set -uo pipefail

INPUT=$(cat)

FILE=$(printf '%s' "$INPUT" | python3 -c '
import sys, json
try:
    d = json.load(sys.stdin)
    print(d.get("tool_input", {}).get("file_path", ""))
except Exception:
    pass
' 2>/dev/null || true)

[ -z "${FILE:-}" ] && exit 0

# Normalize path
case "$FILE" in
  *.env.example|*.env.sample|*.env.template) exit 0 ;;
  *.env|*.env.*|*.env)
    # Continue check below
    ;;
  *) exit 0 ;;
esac

# Allow canonical path
case "$FILE" in
  *"/.config/api-keys/"*) exit 0 ;;
  "$HOME/.config/api-keys/"*) exit 0 ;;
esac

# Now FILE looks like a `.env` style file outside canonical config — warn.
echo "[env-keys-guard] WARN: edit/write su file segreto '$FILE' fuori da ~/.config/api-keys/keys.env (OD-005). Verifica intent prima di proseguire." >&2

# Warn-only: never block
exit 0
