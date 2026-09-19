#!/usr/bin/env bash
# PreToolUse hook: warn (non-blocking) when Edit/Write/MultiEdit happens
# OUTSIDE the current worktree. Stops the recurring "edit on main repo
# instead of worktree" mistake (insights audit 2026-04-25, friction
# category "wrong path/scope assumptions").
#
# Behavior: warn-only (exit 0). Output goes to transcript so the model
# sees it and can self-correct. Never blocks the tool call.
#
# Detects 3 problem patterns:
#   1. Edit target outside the current git worktree root
#   2. Edit on main repo while a worktree exists for the active branch
#   3. Edit on a /tmp/ or transient path (likely accident)

set -uo pipefail

INPUT=$(cat)

# Extract file_path from tool_input
FILE=$(printf '%s' "$INPUT" | python3 -c '
import sys, json
try:
    d = json.load(sys.stdin)
    print(d.get("tool_input", {}).get("file_path", ""))
except Exception:
    pass
' 2>/dev/null || true)

[ -z "${FILE:-}" ] && exit 0

# Resolve current worktree root (where this hook runs)
CWD_ROOT=$(git rev-parse --show-toplevel 2>/dev/null || echo "")
[ -z "$CWD_ROOT" ] && exit 0

# Normalize paths to Windows form (C:/foo) regardless of input form.
# Handles: C:\foo, C:/foo, c:/foo, /c/foo, /C/foo
normalize_path() {
  printf '%s' "$1" \
    | sed 's|\\|/|g' \
    | sed -E 's|^/([a-zA-Z])/|\U\1:/|' \
    | sed -E 's|^([a-z]):|\U\1:|'
}
FILE_NORM=$(normalize_path "$FILE")
CWD_ROOT_NORM=$(normalize_path "$CWD_ROOT")

# Check 1: file outside current worktree
case "$FILE_NORM" in
  "$CWD_ROOT_NORM"/*)
    : # OK — inside current worktree
    ;;
  /tmp/*|/var/folders/*|*/AppData/Local/Temp/*)
    echo "[worktree-guard] INFO: editing transient path $FILE_NORM (likely intentional)"
    ;;
  *)
    # File path is absolute but outside current worktree
    if [[ "$FILE_NORM" == /* ]] || [[ "$FILE_NORM" =~ ^[A-Za-z]:/ ]]; then
      echo "[worktree-guard] WARN: edit target OUTSIDE current worktree"
      echo "[worktree-guard]   target: $FILE_NORM"
      echo "[worktree-guard]   worktree: $CWD_ROOT_NORM"
      echo "[worktree-guard]   action: verify intent — Claude should usually edit inside the worktree"
    fi
    ;;
esac

# Check 2: edit on main repo while in a worktree
if [[ "$CWD_ROOT_NORM" == */.claude/worktrees/* ]]; then
  # We are in a worktree. Check if file_path points to the main repo.
  MAIN_REPO=$(printf '%s' "$CWD_ROOT_NORM" | sed 's|/\.claude/worktrees/.*||')
  if [[ -n "$MAIN_REPO" && "$FILE_NORM" == "$MAIN_REPO"/* ]] && [[ "$FILE_NORM" != "$CWD_ROOT_NORM"/* ]]; then
    echo "[worktree-guard] WARN: editing MAIN REPO while in worktree"
    echo "[worktree-guard]   main repo: $MAIN_REPO"
    echo "[worktree-guard]   worktree:  $CWD_ROOT_NORM"
    echo "[worktree-guard]   target:    $FILE_NORM"
    echo "[worktree-guard]   action: should this go in the worktree instead?"
  fi
fi

exit 0
