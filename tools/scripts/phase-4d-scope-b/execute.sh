#!/usr/bin/env bash
# Phase 4d Scope B — Game-Database cross-stack execution orchestrator
#
# Usage:
#   bash tools/scripts/phase-4d-scope-b/execute.sh /path/to/Game-Database
#
# Cosa fa:
#   1. Valida target = MasterDD-L34D/Game-Database via git remote check
#   2. Crea branch feat/phase-4d-scope-b-species-canonical-import
#   3. Copia fixture species_catalog.json in server/tests/fixtures/
#   4. Mostra istruzioni step-by-step per integrare le 3 file extensions
#   5. NON modifica automaticamente import-taxonomy.js — master-dd integra manualmente
#      (file Game-Database, contenuto pre-esistente da preservare)
#
# Sicurezza:
#   - DRY-RUN mode by default — passa --apply per eseguire copie file
#   - Verifica clean tree pre-modifiche
#   - Mostra diff prima di commit

set -euo pipefail

# ── ARGS ─────────────────────────────────────────────────────────────────────
APPLY_MODE=0
GAME_DATABASE_PATH=""
while [[ $# -gt 0 ]]; do
  case "$1" in
    --apply) APPLY_MODE=1; shift ;;
    --help|-h)
      echo "Usage: $0 [--apply] /path/to/Game-Database"
      echo "  --apply    Execute file copies (default: dry-run)"
      exit 0
      ;;
    *) GAME_DATABASE_PATH="$1"; shift ;;
  esac
done

if [[ -z "$GAME_DATABASE_PATH" ]]; then
  echo "ERROR: Game-Database path required as argument"
  echo "Usage: $0 [--apply] /path/to/Game-Database"
  exit 1
fi

# ── PATHS ────────────────────────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
GAME_ROOT="$(cd "${SCRIPT_DIR}/../../.." && pwd)"
CATALOG_PATH="${GAME_ROOT}/data/core/species/species_catalog.json"

echo "════════════════════════════════════════════════════════════════════════════"
echo " Phase 4d Scope B — Game-Database cross-stack execution"
echo "════════════════════════════════════════════════════════════════════════════"
echo " Game/ source:        ${GAME_ROOT}"
echo " Game-Database target:${GAME_DATABASE_PATH}"
echo " Catalog SOT:         ${CATALOG_PATH}"
echo " Mode:                $([ $APPLY_MODE -eq 1 ] && echo "APPLY (write files)" || echo "DRY-RUN (preview only)")"
echo "════════════════════════════════════════════════════════════════════════════"

# ── VALIDATE GAME-DATABASE TARGET ────────────────────────────────────────────
if [[ ! -d "${GAME_DATABASE_PATH}" ]]; then
  echo "ERROR: target path does not exist: ${GAME_DATABASE_PATH}"
  exit 2
fi

if [[ ! -d "${GAME_DATABASE_PATH}/.git" ]]; then
  echo "ERROR: target is not a git repository: ${GAME_DATABASE_PATH}"
  exit 2
fi

REMOTE_URL=$(git -C "${GAME_DATABASE_PATH}" remote get-url origin 2>/dev/null || echo "")
if [[ "${REMOTE_URL}" != *"Game-Database"* ]]; then
  echo "WARNING: target git remote does NOT mention 'Game-Database' — verify manually"
  echo "  remote: ${REMOTE_URL}"
  read -p "Continue anyway? [y/N] " -r REPLY
  [[ ! "${REPLY}" =~ ^[Yy]$ ]] && exit 3
fi

# Check clean tree
if ! git -C "${GAME_DATABASE_PATH}" diff --quiet HEAD 2>/dev/null; then
  echo "ERROR: target working tree is not clean. Commit or stash before running."
  exit 4
fi

# Check expected file exists
TAXONOMY_PATH="${GAME_DATABASE_PATH}/server/scripts/ingest/import-taxonomy.js"
if [[ ! -f "${TAXONOMY_PATH}" ]]; then
  echo "ERROR: expected file not found: ${TAXONOMY_PATH}"
  echo "Game-Database structure may have changed since ADR-2026-04-14. Verify path."
  exit 5
fi

# Check catalog SOT exists
if [[ ! -f "${CATALOG_PATH}" ]]; then
  echo "ERROR: Game/ catalog SOT not found: ${CATALOG_PATH}"
  exit 6
fi

CATALOG_SPECIES_COUNT=$(python3 -c "import json; d=json.load(open('${CATALOG_PATH}')); print(len(d.get('catalog', [])))")
echo " Catalog species:     ${CATALOG_SPECIES_COUNT}"
echo

# ── PLAN ─────────────────────────────────────────────────────────────────────
echo "── Execution plan ──"
echo "1. Create branch  feat/phase-4d-scope-b-species-canonical-import on Game-Database"
echo "2. Copy fixture   ${CATALOG_PATH}"
echo "                  → ${GAME_DATABASE_PATH}/server/tests/fixtures/species_catalog_53.json"
echo "3. Show extension code for integration:"
echo "   - tools/scripts/phase-4d-scope-b/import-taxonomy-extension.js → append/integrate"
echo "     into ${TAXONOMY_PATH}"
echo "   - tools/scripts/phase-4d-scope-b/test-extension.js → append to"
echo "     ${GAME_DATABASE_PATH}/server/tests/taxonomyRouters.test.js"
echo "4. Master-dd manual integration step (NOT automated — preserves Game-Database content)"
echo "5. Run npm test on Game-Database side"
echo "6. Commit + push + PR"
echo

if [[ $APPLY_MODE -eq 0 ]]; then
  echo "DRY-RUN complete. Re-run with --apply to execute steps 1-2 (branch + fixture copy)."
  echo "Steps 3-6 remain master-dd manual."
  exit 0
fi

# ── APPLY MODE — EXECUTE STEPS 1-2 ───────────────────────────────────────────
echo "── APPLY: creating branch + copying fixture ──"

git -C "${GAME_DATABASE_PATH}" fetch origin
git -C "${GAME_DATABASE_PATH}" checkout main
git -C "${GAME_DATABASE_PATH}" pull origin main
git -C "${GAME_DATABASE_PATH}" checkout -b feat/phase-4d-scope-b-species-canonical-import

FIXTURE_DIR="${GAME_DATABASE_PATH}/server/tests/fixtures"
mkdir -p "${FIXTURE_DIR}"
cp "${CATALOG_PATH}" "${FIXTURE_DIR}/species_catalog_53.json"
echo " ✓ Fixture copied: ${FIXTURE_DIR}/species_catalog_53.json"

echo
echo "── Next steps for master-dd ──"
echo "  1. Open ${TAXONOMY_PATH}"
echo "     Integrate code from: ${SCRIPT_DIR}/import-taxonomy-extension.js"
echo "     - Add functions loadGameCanonicalSpeciesCatalog + importSpeciesCanonicalFirst"
echo "     - Modify main importSpecies(db) to call importSpeciesCanonicalFirst FIRST"
echo "     - Export both functions for tests"
echo
echo "  2. Open ${GAME_DATABASE_PATH}/server/tests/taxonomyRouters.test.js"
echo "     Append test suite from: ${SCRIPT_DIR}/test-extension.js"
echo
echo "  3. Run tests:"
echo "     cd ${GAME_DATABASE_PATH} && npm test"
echo
echo "  4. Commit + push:"
echo "     cd ${GAME_DATABASE_PATH}"
echo "     git add server/scripts/ingest/import-taxonomy.js \\"
echo "             server/tests/taxonomyRouters.test.js \\"
echo "             server/tests/fixtures/species_catalog_53.json"
echo "     git commit -F ${SCRIPT_DIR}/commit-msg.txt"
echo "     git push -u origin feat/phase-4d-scope-b-species-canonical-import"
echo
echo "  5. Create PR on Game-Database:"
echo "     gh pr create --title \"\$(head -1 ${SCRIPT_DIR}/commit-msg.txt)\" \\"
echo "                  --body \"\$(cat ${SCRIPT_DIR}/pr-body.md)\""
echo
echo "════════════════════════════════════════════════════════════════════════════"
echo " ✓ APPLY complete. Master-dd integration steps 3-5 above."
echo "════════════════════════════════════════════════════════════════════════════"
