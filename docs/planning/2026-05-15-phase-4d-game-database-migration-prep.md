---
title: 'Phase 4d Game-Database catalog migration prep — handoff master-dd'
doc_status: active
doc_owner: master-dd
workstream: cross-cutting
last_verified: '2026-05-15'
source_of_truth: false
language: it
review_cycle_days: 30
tags: [phase-4d, game-database, cross-stack, migration, prep, handoff]
---

# Phase 4d Game-Database catalog migration — prep doc

**Status**: 🟢 **NON-BLOCKING**. Phase 4d è enhancement opzionale, NON blocker per Phase 4c closure.

## Stato post-Phase 4c.6 (2026-05-15)

Game/ canonical migration COMPLETED:

- ✅ `data/core/species/species_catalog.json` v0.4.x (53 species single SOT)
- ✅ `data/core/species.yaml` + `species_expansion.yaml` RIMOSSI (snapshot in `docs/archive/`)
- ✅ Backend consumers refactored (traitEffects + wikiLinkBridge + biomeResonance + synergyDetector)
- ✅ Python tools migrated (8/8) — `tools/py/lib/species_loader.py` helper available
- ✅ Tests 698 Python + 1193 JS + 417 AI verde

## Game-Database build-time import status

**No break post Phase 4c.6**: Game-Database NON legge `data/core/species.yaml` direttamente.

Per ADR-2026-04-14:

```
server/scripts/ingest/import-taxonomy.js (Game-Database)
  → reads packs/evo_tactics_pack/docs/catalog/* (Game/ side)
  → species-index.json + species/*.json mirror files
```

`packs/evo_tactics_pack/docs/catalog/` viene rigenerato via `npm run sync:evo-pack` da Game/ side. Mirror current state:

- 21 species (Pack v2 subset, kebab-case slugs)
- ✅ Game-Database import functional senza changes

## Phase 4d enhancement opzionale — 2 scope possibili

### Scope A — Enhancement minimal (~1-2h, master-dd manual)

Aggiornare `sync:evo-pack` (Game/) per emettere catalog mirror v0.4.x (53 species) invece di 21:

1. Edit `scripts/update_evo_pack_catalog.js` per derivare mirror da `data/core/species/species_catalog.json` (53 entries) invece di `packs/evo_tactics_pack/data/species/<biome>/*.yaml` (21 entries)
2. Re-run `npm run sync:evo-pack` → catalog mirror v0.4.x
3. Game-Database lato: `npm run evo:import` ingesterà 53 species + rich schema fields (clade_tag, role_tags, ecology, default_parts, etc.)

**Pros**: Game-Database accede a full 53 species canonical Game/
**Cons**: 38 legacy species potrebbero avere rich schema fields vuoti (Phase 3 polish pending master-dd narrative review). Game-Database showcase qualità inferiore per quei 38.

### Scope B — Enhancement full (~3-4h, master-dd cross-stack)

Aggiornare Game-Database `import-taxonomy.js` per leggere direttamente `data/core/species/species_catalog.json` (Game/ canonical), bypassando mirror:

1. Game-Database edit `server/scripts/ingest/import-taxonomy.js`:
   - Add path `../Game/data/core/species/species_catalog.json` source
   - Parse `catalog` array + map species_id → MongoDB Species entry
   - Skip mirror `species-index.json` (deprecated path)
2. Game-Database test `taxonomyRouters.test.js` extension per nuovo schema
3. Cross-stack PR Game-Database side

**Pros**: Game-Database accede direct canonical, no mirror sync drift
**Cons**: cross-stack scope (sibling repo `MasterDD-L34D/Game-Database`)

## Master-dd authority required

| Item                                         |           Owner            | Effort |
| -------------------------------------------- | :------------------------: | :----: |
| Scope A enhancement (Game/ sync update)      |      master-dd manual      | ~1-2h  |
| Scope B enhancement (Game-Database refactor) |   master-dd cross-stack    | ~3-4h  |
| Phase 3 polish 38 species rich schema fields | master-dd narrative review | ~1-2h  |
| Decision: A vs B vs defer?                   |     master-dd verdict      |   —    |

## Recommendation Claude-proposed

**DEFER Phase 4d** post Phase 3 polish. Order:

1. Phase 3 polish FIRST (master-dd narrative review 38 species rich fields)
2. Once 38 species have visual_description + symbiosis + constraints filled
3. THEN ship Scope A (sync mirror v0.4.x → Game-Database picks up 53/53 rich)
4. Scope B remains optional enhancement (no immediate need)

## Cherry-pick instructions (Scope A, when master-dd ready)

```bash
cd /path/to/Game
git checkout main && git pull origin main

# Edit scripts/update_evo_pack_catalog.js to read species_catalog.json
# (see comments in current file for mirror generation logic)

npm run sync:evo-pack
git diff packs/evo_tactics_pack/docs/catalog/ | wc -l   # expect ~100+ file changes
git add packs/evo_tactics_pack/docs/catalog/
git commit -m "feat(catalog): Phase 4d Scope A — sync mirror v0.4.x from species_catalog (53 species)"
git push origin <branch>
gh pr create --title "Phase 4d Scope A: sync mirror 53 species canonical"
```

## Cross-link

- `docs/adr/ADR-2026-05-15-species-catalog-schema-fork-resolution.md` (Q1 Option A canonical migration)
- `docs/adr/ADR-2026-04-14-game-database-topology.md` (Game-Database topology + import pipeline)
- `data/core/species/species_catalog.json` (v0.4.x canonical SOT Game/)
- `packs/evo_tactics_pack/docs/catalog/` (Game-Database mirror source)
- `tools/etl/merge_pack_v2_species.py` (ETL v0.4.x output)
- `tools/py/lib/species_loader.py` (Python catalog loader helper)
- `scripts/update_evo_pack_catalog.js` (Game/ mirror generator, edit per Scope A)
- `MasterDD-L34D/Game-Database/server/scripts/ingest/import-taxonomy.js` (Game-Database consumer, edit per Scope B)
