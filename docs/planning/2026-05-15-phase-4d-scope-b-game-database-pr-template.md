---
title: 'Phase 4d Scope B — Game-Database cross-stack PR template'
doc_status: active
doc_owner: master-dd
workstream: cross-cutting
last_verified: '2026-05-15'
source_of_truth: false
language: it
review_cycle_days: 30
tags: [phase-4d, scope-b, game-database, cross-stack, pr-template, handoff]
---

# Phase 4d Scope B — Game-Database cross-stack PR template

**Status**: ✅ **EXECUTION-READY** — bundle pre-fab disponibile in [`tools/scripts/phase-4d-scope-b/`](../../tools/scripts/phase-4d-scope-b/README.md). Master-dd manual cross-stack ~30-45min (MCP scope ristretto a `MasterDD-L34D/Game` only).

> 🚀 **Quick start**: `bash tools/scripts/phase-4d-scope-b/execute.sh --apply /path/to/Game-Database` poi segui le istruzioni stampate. Vedi [`README.md`](../../tools/scripts/phase-4d-scope-b/README.md) execution package per workflow completo.

## Context

Phase 4d Scope A SHIPPED via PR #2271 (`species-canonical-index.json` 53 species mirror parallel a `species-index.json` 21 Pack v2). Game-Database può OPT-IN consume canonical index.

Phase 4d Scope B = aggiornamento Game-Database `import-taxonomy.js` per leggere direttamente `data/core/species/species_catalog.json` (Game/ canonical, 53 species v0.4.x rich schema), bypassando mirror Pack v2 21.

## PR template Game-Database (master-dd cherry-pick ready)

### Branch + commit

```bash
cd /path/to/Game-Database
git checkout main && git pull origin main
git checkout -b feat/phase-4d-scope-b-species-canonical-import

# Edit server/scripts/ingest/import-taxonomy.js — vedi diff sotto
# Edit server/tests/taxonomyRouters.test.js — vedi diff sotto

npm test
git add server/scripts/ingest/import-taxonomy.js server/tests/taxonomyRouters.test.js
git commit -m "feat(import): Phase 4d Scope B — read species_catalog.json canonical 53 species"
git push -u origin feat/phase-4d-scope-b-species-canonical-import
gh pr create --title "feat(import): Phase 4d Scope B species canonical 53/53 v0.4.x"
```

## File 1 — `server/scripts/ingest/import-taxonomy.js` extension

```javascript
// Add at top imports:
const path = require('path');
const fs = require('fs');

// Add new function near other import helpers:
function loadGameCanonicalSpeciesCatalog() {
  // ADR-2026-05-15 Phase 4d Scope B — canonical SOT Game/.
  // Path: ../Game/data/core/species/species_catalog.json (sibling repo).
  // Override via env GAME_CANONICAL_CATALOG_PATH per CI / non-standard layouts.
  const defaultPath = path.resolve(
    __dirname,
    '..',
    '..',
    '..',
    '..',
    'Game',
    'data',
    'core',
    'species',
    'species_catalog.json',
  );
  const catalogPath = process.env.GAME_CANONICAL_CATALOG_PATH || defaultPath;
  if (!fs.existsSync(catalogPath)) {
    console.warn(
      `[import-taxonomy] canonical catalog not found at ${catalogPath}, fallback mirror`,
    );
    return null;
  }
  try {
    const data = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
    const catalog = Array.isArray(data.catalog) ? data.catalog : [];
    return catalog.map((entry) => ({
      // Normalize to Game-Database Species schema
      slug: entry.species_id,
      legacy_slug: entry.legacy_slug || entry.species_id,
      scientific_name: entry.scientific_name,
      common_names: entry.common_names || [],
      classification: entry.classification || {},
      clade_tag: entry.clade_tag,
      role_tags: entry.role_tags || [],
      ecotypes: entry.ecotypes || [],
      biome_affinity: entry.biome_affinity,
      sentience_index: entry.sentience_index,
      risk_profile: entry.risk_profile || {},
      functional_signature: entry.functional_signature || '',
      visual_description: entry.visual_description || '',
      interactions: entry.interactions || {},
      ecology: entry.ecology || null,
      pack_size: entry.pack_size || null,
      default_parts: entry.default_parts || null,
      trait_refs: entry.trait_refs || [],
      genus: entry.genus,
      epithet: entry.epithet,
      source_provenance: entry.source,
      _provenance_audit: entry._provenance || {},
      _imported_at: new Date().toISOString(),
    }));
  } catch (err) {
    console.warn('[import-taxonomy] canonical catalog load failed:', err.message);
    return null;
  }
}

// Modify main import flow to prefer canonical, fallback mirror:
async function importSpecies(db) {
  const canonical = loadGameCanonicalSpeciesCatalog();
  if (canonical && canonical.length > 0) {
    console.log(`[import-taxonomy] canonical catalog: ${canonical.length} species`);
    for (const entry of canonical) {
      await db
        .collection('species')
        .updateOne({ slug: entry.slug }, { $set: entry }, { upsert: true });
    }
    return;
  }
  // FALLBACK: existing mirror logic (species-index.json + species/*.json)
  // ... (keep existing implementation)
}
```

## File 2 — `server/tests/taxonomyRouters.test.js` extension

```javascript
// Add test suite at end of file:
describe('Phase 4d Scope B — canonical species_catalog.json import', () => {
  test('reads species_catalog.json when available', async () => {
    // Use mock path to fixture
    process.env.GAME_CANONICAL_CATALOG_PATH = path.join(
      __dirname,
      'fixtures/species_catalog_53.json',
    );
    const { loadGameCanonicalSpeciesCatalog } = require('../../scripts/ingest/import-taxonomy');
    const catalog = loadGameCanonicalSpeciesCatalog();
    expect(catalog).toBeTruthy();
    expect(catalog.length).toBe(53);
    expect(catalog[0]).toHaveProperty('slug');
    expect(catalog[0]).toHaveProperty('clade_tag');
    expect(catalog[0]).toHaveProperty('sentience_index');
    expect(catalog[0]).toHaveProperty('_provenance_audit');
  });

  test('fallback gracefully when canonical missing', () => {
    process.env.GAME_CANONICAL_CATALOG_PATH = '/nonexistent/path.json';
    const { loadGameCanonicalSpeciesCatalog } = require('../../scripts/ingest/import-taxonomy');
    const catalog = loadGameCanonicalSpeciesCatalog();
    expect(catalog).toBeNull();
  });
});
```

## File 3 — `server/tests/fixtures/species_catalog_53.json` (test fixture)

Copy from Game/ at PR time:

```bash
cp ../Game/data/core/species/species_catalog.json server/tests/fixtures/species_catalog_53.json
```

## File 4 — `server/scripts/ingest/README.md` update

Append section:

```markdown
## Phase 4d Scope B — Species canonical import (2026-05-15)

`import-taxonomy.js` now prefers canonical `data/core/species/species_catalog.json` (Game/ SOT v0.4.x, 53 species rich schema with clade_tag + role_tags + ecology + default_parts + biome_affinity + sentience_index).

**Fallback chain**:

1. `GAME_CANONICAL_CATALOG_PATH` env override (test fixtures, custom layouts)
2. `../Game/data/core/species/species_catalog.json` default sibling repo path
3. `packs/evo_tactics_pack/docs/catalog/species-index.json` legacy mirror (21 Pack v2)

**Schema map catalog → Species collection**:

- `species_id` → `slug`
- `_provenance` → `_provenance_audit` (Path D HYBRID audit trail preserved)
- Tutti rich fields v0.4.x preservati

Cross-link: `docs/adr/ADR-2026-05-15-species-catalog-schema-fork-resolution.md`
```

## Verify gates checklist

Before merge Game-Database PR:

- [ ] Import test catalog 53 species: `node server/scripts/ingest/import-taxonomy.js`
- [ ] Species collection count 53 in MongoDB
- [ ] Sample query: `db.species.findOne({slug: "dune_stalker"})` → has clade_tag + sentience_index + default_parts
- [ ] `_provenance_audit` field preserved
- [ ] Fallback graceful test: rename catalog path → import falls back to mirror
- [ ] `npm test` verde tutti taxonomy router tests
- [ ] No regression API endpoints `/api/species`, `/api/species/:slug`

## Cross-link

- Game/ canonical SOT: `data/core/species/species_catalog.json` v0.4.x
- Game/ ADR: `docs/adr/ADR-2026-05-15-species-catalog-schema-fork-resolution.md`
- Game/ Phase 4d Scope A: PR #2271 `packs/evo_tactics_pack/docs/catalog/species-canonical-index.json`
- Game-Database side current: `MasterDD-L34D/Game-Database/server/scripts/ingest/import-taxonomy.js`
- Topology ADR: `docs/adr/ADR-2026-04-14-game-database-topology.md`
