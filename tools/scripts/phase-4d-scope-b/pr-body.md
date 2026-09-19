## Summary

Phase 4d Scope B cross-stack: Game-Database `import-taxonomy.js` consume canonical `species_catalog.json` (Game/ SOT v0.4.x, 53 species rich schema), bypassando mirror Pack v2 21.

Cross-link Game/ closure PRs:

- **#2271** Phase A residue + Q1 Option A canonical migration (merged `66be60b`)
- **#2272** D.5+D.6 master-dd polish 36 visual + 18 symbiosis (merged `a18a86f`)
- **#2273** v2 fine-grained Italian grammar pass 7 fixes (merged `67521db`)

## What changes

### `server/scripts/ingest/import-taxonomy.js`

Aggiunge `loadGameCanonicalSpeciesCatalog()` + `importSpeciesCanonicalFirst()`:

- **Priority 1**: `GAME_CANONICAL_CATALOG_PATH` env var (CI/test override)
- **Priority 2**: `../Game/data/core/species/species_catalog.json` (sibling repo default)
- **Fallback**: existing mirror logic se canonical missing/malformed

### `server/tests/taxonomyRouters.test.js`

5 nuovi test:

1. Canonical catalog 53 species load
2. Rich schema fields (clade_tag + sentience_index + \_provenance_audit)
3. dune_stalker (Skiv) canonical preservation
4. Fallback graceful path missing
5. Fallback graceful JSON malformed

### `server/tests/fixtures/species_catalog_53.json`

Fixture (copia da Game/ catalog SOT) per test isolation.

## Schema map v0.4.x → Species collection

| Catalog field          | Species collection field | Notes                                                       |
| ---------------------- | ------------------------ | ----------------------------------------------------------- |
| `species_id`           | `slug`                   | Canonical underscore_case                                   |
| `legacy_slug`          | `legacy_slug`            | Original from species.yaml                                  |
| `scientific_name`      | `scientific_name`        | Latin binomial                                              |
| `common_names`         | `common_names[]`         |                                                             |
| `classification`       | `classification{}`       | macro_class + habitat                                       |
| `clade_tag`            | `clade_tag`              | Apex/Threat/Bridge/Keystone/Support/Playable                |
| `role_tags`            | `role_tags[]`            |                                                             |
| `ecotypes`             | `ecotypes[]`             |                                                             |
| `biome_affinity`       | `biome_affinity`         |                                                             |
| `sentience_index`      | `sentience_index`        | T0-T6                                                       |
| `risk_profile`         | `risk_profile{}`         | danger_level + vectors                                      |
| `functional_signature` | `functional_signature`   |                                                             |
| `visual_description`   | `visual_description`     | Phase 3 Path D polished                                     |
| `interactions`         | `interactions{}`         | predates_on + predated_by + symbiosis                       |
| `ecology`              | `ecology{}` / null       | ADR-2026-05-02 block                                        |
| `pack_size`            | `pack_size{}` / null     | min + max                                                   |
| `default_parts`        | `default_parts{}` / null | locomotion + metabolism + offense + defense + senses        |
| `trait_refs`           | `trait_refs[]`           |                                                             |
| `genus`                | `genus`                  |                                                             |
| `epithet`              | `epithet`                |                                                             |
| `source`               | `source_provenance`      | pack-v2-full-plus / game-canonical-stub / legacy-yaml-merge |
| `_provenance`          | `_provenance_audit{}`    | Path D HYBRID per-field audit trail                         |
| —                      | `_catalog_version`       | Catalog version metadata (e.g., 0.4.1)                      |
| —                      | `_imported_at`           | ISO timestamp                                               |

## Verify gates checklist

- [ ] `npm test` verde tutti taxonomy router tests (5 nuovi + esistenti)
- [ ] Import catalog reale: `node server/scripts/ingest/import-taxonomy.js`
- [ ] MongoDB Species collection count: 53 species
- [ ] Sample query verifica:
      `db.species.findOne({slug: "dune_stalker"})` → ha clade_tag + sentience_index + default_parts
- [ ] `_provenance_audit` field preservato
- [ ] Fallback graceful test: rinomina catalog path → import torna a mirror
- [ ] API endpoint `/api/species` no regression
- [ ] API endpoint `/api/species/dune_stalker` torna rich schema

## Cross-link

- Game/ canonical SOT: `data/core/species/species_catalog.json` v0.4.1
- Game/ ADR Q1 migration: `docs/adr/ADR-2026-05-15-species-catalog-schema-fork-resolution.md`
- Game/ topology ADR: `docs/adr/ADR-2026-04-14-game-database-topology.md`
- Game/ Phase 4d Scope A: `packs/evo_tactics_pack/docs/catalog/species-canonical-index.json`
- Master-dd execution package: `../Game/tools/scripts/phase-4d-scope-b/`
