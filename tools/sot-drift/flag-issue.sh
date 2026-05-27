#!/usr/bin/env bash
set -euo pipefail
SHA="$1"
BODY_FILE="$(mktemp)"
{
  echo "## SoT drift candidate (auto-detected)"
  echo ""
  echo "Commit \`${SHA}\` touched watched runtime areas mapped to canonical SoT docs."
  echo "**Deterministic flag only** -- semantic verdict is gated (sovereign \`sot-drift-verifier\` subagent)."
  echo ""
  node -e '
    const m=JSON.parse(require("fs").readFileSync("matches.json","utf8"));
    for (const x of m) {
      console.log("- **"+x.concept+"** (`"+x.pattern+"`) -> review SoT: "+x.sot_ref.map(r=>"`"+r+"`").join(", "));
      for (const f of x.files) console.log("  - changed: `"+f+"`");
    }
  '
  echo ""
  echo "_Action: sovereign review -> verdict -> if stale, vault branch+PR reconcile (merge human-only)._"
} > "$BODY_FILE"

EXISTING="$(gh issue list --label sot-drift-candidate --state open --json number --jq '.[0].number' 2>/dev/null || true)"
if [ -n "${EXISTING:-}" ] && [ "${EXISTING}" != "null" ]; then
  gh issue edit "$EXISTING" --body-file "$BODY_FILE"
  gh issue comment "$EXISTING" --body "Updated: new drift candidate at commit \`${SHA}\`."
else
  gh issue create --title "SoT drift candidate (runtime ahead of SoT docs)" \
    --label sot-drift-candidate --body-file "$BODY_FILE"
fi
