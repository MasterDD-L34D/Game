---
title: 'Phase 4d Scope B — Master-dd execution package'
doc_status: active
doc_owner: master-dd
workstream: cross-cutting
last_verified: '2026-05-15'
source_of_truth: false
language: it
review_cycle_days: 30
tags: [phase-4d, scope-b, game-database, cross-stack, execution-package, master-dd]
---

# Phase 4d Scope B — Master-dd execution package

**Status**: ✅ **EXECUTION-READY** — bundle pre-fab per esecuzione master-dd ~30-45 min.

**MCP scope**: ristretto a `MasterDD-L34D/Game` only. Game-Database PR creation = master-dd manual.

## Cosa contiene questo bundle

| File                           | Scopo                                                           |
| ------------------------------ | --------------------------------------------------------------- |
| `execute.sh`                   | Orchestrator script: branch + fixture copy + step-by-step guide |
| `verify.sh`                    | Post-integration verification (run su Game-Database side)       |
| `import-taxonomy-extension.js` | JS code drop-in per `server/scripts/ingest/import-taxonomy.js`  |
| `test-extension.js`            | Test suite drop-in per `server/tests/taxonomyRouters.test.js`   |
| `commit-msg.txt`               | Pre-fab commit message (git commit -F)                          |
| `pr-body.md`                   | Pre-fab PR body (gh pr create --body "$(cat pr-body.md)")       |
| `README.md`                    | Questo file — master-dd execution guide                         |

## Quick start — 5 step master-dd execution

```bash
# === STEP 0: prerequisiti (da Game/ root, single-PC con entrambi i repo) ===
# Verifica Game-Database accessibile come sibling repo o path noto
ls /path/to/Game-Database/.git || echo "Game-Database non trovato — clone first"

# === STEP 1: DRY-RUN preview ===
cd /path/to/Game
bash tools/scripts/phase-4d-scope-b/execute.sh /path/to/Game-Database
# → mostra piano esecuzione + valida prerequisiti, NON modifica nulla

# === STEP 2: APPLY (crea branch + copia fixture) ===
bash tools/scripts/phase-4d-scope-b/execute.sh --apply /path/to/Game-Database
# → branch feat/phase-4d-scope-b-species-canonical-import + fixture 53 species
# → mostra istruzioni step 3-5

# === STEP 3: MANUAL INTEGRATION (master-dd, ~10-15 min) ===
# Apri:
#   /path/to/Game-Database/server/scripts/ingest/import-taxonomy.js
# Integra:
#   /path/to/Game/tools/scripts/phase-4d-scope-b/import-taxonomy-extension.js
#
#   - Aggiungi require('path') + require('fs') se non già presenti
#   - Aggiungi loadGameCanonicalSpeciesCatalog() + importSpeciesCanonicalFirst()
#   - Modifica main importSpecies(db) flow:
#       async function importSpecies(db) {
#         const result = await importSpeciesCanonicalFirst(db);
#         if (result.source === 'canonical') return;
#         // ... existing mirror fallback ...
#       }
#   - Aggiungi module.exports = { loadGameCanonicalSpeciesCatalog, importSpeciesCanonicalFirst, ... }

# Apri:
#   /path/to/Game-Database/server/tests/taxonomyRouters.test.js
# Integra (append in fondo):
#   /path/to/Game/tools/scripts/phase-4d-scope-b/test-extension.js

# === STEP 4: VERIFY ===
cd /path/to/Game-Database
bash /path/to/Game/tools/scripts/phase-4d-scope-b/verify.sh
npm test -- --testPathPattern=taxonomyRouters

# === STEP 5: COMMIT + PUSH + PR ===
git add server/scripts/ingest/import-taxonomy.js \
        server/tests/taxonomyRouters.test.js \
        server/tests/fixtures/species_catalog_53.json
git commit -F /path/to/Game/tools/scripts/phase-4d-scope-b/commit-msg.txt
git push -u origin feat/phase-4d-scope-b-species-canonical-import

gh pr create \
  --title "$(head -1 /path/to/Game/tools/scripts/phase-4d-scope-b/commit-msg.txt)" \
  --body "$(cat /path/to/Game/tools/scripts/phase-4d-scope-b/pr-body.md)"
```

## Safety rails

`execute.sh` valida pre-esecuzione:

1. ✅ Target path esiste
2. ✅ Target è git repo
3. ✅ Remote menziona "Game-Database" (warn se no, ask confirm)
4. ✅ Working tree pulito (commit/stash prima di run)
5. ✅ `server/scripts/ingest/import-taxonomy.js` esiste (structure check)
6. ✅ Game/ catalog SOT esiste
7. ✅ DRY-RUN default — `--apply` flag esplicito richiesto per modifiche

`verify.sh` post-integration check:

1. ✅ Fixture present + species count = 53
2. ✅ `loadGameCanonicalSpeciesCatalog` integrato + esportato
3. ✅ Test suite marker "Phase 4d Scope B" presente
4. ✅ Branch corretto
5. ✅ Dry-run import: dune_stalker (Skiv) presente + clade_tag + sentience_index + default_parts preservati

## Why integration step 3 is manual

Game-Database `server/scripts/ingest/import-taxonomy.js` ha contenuto pre-esistente che dipende da Game-Database internal patterns (db driver, schema validator, error handling). Non sappiamo:

- Esatta struttura esistente di `importSpecies(db)` (nome funzione, async pattern, error handler)
- Quali altre import helpers ci sono nello stesso file
- Where exactly to insert le nuove funzioni (top, bottom, middle?)

Integrazione AUTOMATIZZATA potrebbe rompere logiche esistenti. Master-dd manual integration = 10-15 min ma preserva codice Game-Database canonical.

## Outcome atteso

- 1 PR aperto su `MasterDD-L34D/Game-Database` con titolo `feat(import): Phase 4d Scope B — read species_catalog.json canonical 53 species (Game/ SOT v0.4.x)`
- 3 file modificati: import-taxonomy.js + taxonomyRouters.test.js + fixtures/species_catalog_53.json
- 5 nuovi test verde
- Cross-link in PR body a 4 Game/ PR (#2271 + #2272 + #2273 + Phase 4d Scope A)
- Master-dd merge authority → trigger Game-Database npm run evo:import su CI/deploy

## Outstanding post-Phase-4d-Scope-B

- ✅ Q1 Option A canonical migration completata (Game/ side)
- ✅ Phase 3 Path D HYBRID polish (D.5 + D.6 + v2 fixes)
- ✅ Phase 4d Scope A canonical-index mirror
- 🟡 Phase 4d Scope B Game-Database refactor — **THIS PR** (master-dd manual)
- 🟢 Phase 5+ optional: Game-Database HTTP runtime integration (ADR-2026-04-14 Alt B feature-flag, currently OFF)

## Cross-link

- Game/ canonical SOT: `data/core/species/species_catalog.json` v0.4.1
- Game/ ADR Q1: `docs/adr/ADR-2026-05-15-species-catalog-schema-fork-resolution.md`
- Game/ topology ADR: `docs/adr/ADR-2026-04-14-game-database-topology.md`
- Game/ closure PRs: #2271 + #2272 + #2273 (cumulative session 2026-05-15)
- Original Scope B template doc: `docs/planning/2026-05-15-phase-4d-scope-b-game-database-pr-template.md`
- Phase 4d prep handoff: `docs/planning/2026-05-15-phase-4d-game-database-migration-prep.md`
- Museum methodology: `docs/museum/cards/phase-3-path-d-hybrid-pattern-abc.md` (M-2026-05-15-001 score 5/5)
