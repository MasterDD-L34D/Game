#!/usr/bin/env bash
# Phase 4d Scope B — post-execution verification script
#
# Run on Game-Database side AFTER integrating extensions:
#   bash /path/to/Game/tools/scripts/phase-4d-scope-b/verify.sh
#
# Verifica:
#   1. Fixture esiste con 53 species
#   2. import-taxonomy.js esporta loadGameCanonicalSpeciesCatalog
#   3. Test suite riconosce extension
#   4. Branch corretto + clean
#   5. Dry-run import canonical mode

set -euo pipefail

if [[ ! -f "server/scripts/ingest/import-taxonomy.js" ]]; then
  echo "ERROR: run from Game-Database root (server/scripts/ingest/import-taxonomy.js not found)"
  exit 1
fi

echo "── Phase 4d Scope B verification ──"

# 1. Fixture check
FIXTURE="server/tests/fixtures/species_catalog_53.json"
if [[ ! -f "${FIXTURE}" ]]; then
  echo "  ✗ Fixture missing: ${FIXTURE}"
  exit 2
fi
SPECIES_COUNT=$(node -e "console.log(JSON.parse(require('fs').readFileSync('${FIXTURE}','utf8')).catalog.length)")
echo "  ✓ Fixture: ${SPECIES_COUNT} species"
if [[ "${SPECIES_COUNT}" != "53" ]]; then
  echo "  ⚠ Expected 53 species, got ${SPECIES_COUNT}"
fi

# 2. Export check
if ! grep -q "loadGameCanonicalSpeciesCatalog" server/scripts/ingest/import-taxonomy.js; then
  echo "  ✗ loadGameCanonicalSpeciesCatalog not found in import-taxonomy.js"
  exit 3
fi
echo "  ✓ loadGameCanonicalSpeciesCatalog integrated"

if ! grep -q "module.exports" server/scripts/ingest/import-taxonomy.js; then
  echo "  ⚠ No module.exports detected — verify function is exported for tests"
fi

# 3. Test suite check
TESTFILE="server/tests/taxonomyRouters.test.js"
if [[ -f "${TESTFILE}" ]]; then
  if grep -q "Phase 4d Scope B" "${TESTFILE}"; then
    echo "  ✓ Test extension integrated in ${TESTFILE}"
  else
    echo "  ⚠ 'Phase 4d Scope B' test marker not found in ${TESTFILE}"
  fi
fi

# 4. Branch check
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
if [[ "${CURRENT_BRANCH}" == "feat/phase-4d-scope-b-species-canonical-import" ]]; then
  echo "  ✓ On expected branch: ${CURRENT_BRANCH}"
else
  echo "  ⚠ Current branch: ${CURRENT_BRANCH} (expected feat/phase-4d-scope-b-species-canonical-import)"
fi

# 5. Dry-run import canonical
echo
echo "── Dry-run canonical import test ──"
node -e "
process.env.GAME_CANONICAL_CATALOG_PATH = require('path').resolve('${FIXTURE}');
delete require.cache[require.resolve('./server/scripts/ingest/import-taxonomy')];
const mod = require('./server/scripts/ingest/import-taxonomy');
const cat = mod.loadGameCanonicalSpeciesCatalog();
if (!cat) { console.error('  ✗ Canonical load returned null'); process.exit(4); }
console.log('  ✓ Canonical load: ' + cat.length + ' species');
const sample = cat.find(e => e.slug === 'dune_stalker');
if (!sample) { console.error('  ✗ dune_stalker not found in canonical'); process.exit(5); }
console.log('  ✓ dune_stalker present: clade=' + sample.clade_tag + ' biome=' + sample.biome_affinity + ' sentience=' + sample.sentience_index);
if (!sample.default_parts || !sample.default_parts.locomotion) { console.error('  ✗ default_parts missing'); process.exit(6); }
console.log('  ✓ default_parts preserved: locomotion=' + sample.default_parts.locomotion);
"

echo
echo "── npm test suggested ──"
echo "  cd \$(pwd) && npm test -- --testPathPattern=taxonomyRouters"
echo
echo "── Commit + push ──"
echo "  git add server/scripts/ingest/import-taxonomy.js \\"
echo "          server/tests/taxonomyRouters.test.js \\"
echo "          server/tests/fixtures/species_catalog_53.json"
echo "  git commit -F /path/to/Game/tools/scripts/phase-4d-scope-b/commit-msg.txt"
echo "  git push -u origin feat/phase-4d-scope-b-species-canonical-import"
echo
echo "Verification complete."
