# Species YAML Deprecation Snapshot — 2026-05-15

Historical snapshot per ADR-2026-05-15 Phase 4c.6 file removal.

## Context

Files removed from `data/core/`:
- `species.yaml` (893 LOC, 20 species canonical)
- `species_expansion.yaml` (896 LOC, 33 species_examples)

## Reason

ADR-2026-05-15 Q1 Option A canonical migration. New SOT:
`data/core/species/species_catalog.json` (catalog v0.4.x, 53 species).

## Restore path

If runtime regression discovered:
```bash
git checkout HEAD~1 data/core/species.yaml data/core/species_expansion.yaml
```

Or recover from this archive snapshot:
```bash
cp docs/archive/historical-snapshots/2026-05-15_species-deprecation/species.yaml data/core/
cp docs/archive/historical-snapshots/2026-05-15_species-deprecation/species_expansion.yaml data/core/
```

## Migration validation (pre-removal)

Tests verde simulation (mv files /tmp + run):
- node --test tests/api/*.test.js: 1193/1193 ✅
- node --test tests/ai/*.test.js: 417/417 ✅
- python3 tools/py/check_missing_traits.py functional ✅
- python3 tools/py/seed_skiv_saga.py functional ✅

## Cross-link

- `docs/adr/ADR-2026-05-15-species-catalog-schema-fork-resolution.md`
- `data/core/species/species_catalog.json` (new canonical SOT)
- `tools/py/lib/species_loader.py` (Python loader helper)
- `tools/etl/merge_pack_v2_species.py` (ETL preserves all legacy fields)
