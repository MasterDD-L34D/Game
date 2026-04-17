---
title: 'ADR 2026-04-17 — Co-op scaling: 4 → 8 giocatori'
doc_status: active
doc_owner: master-dd
workstream: cross-cutting
last_verified: 2026-04-17
source_of_truth: true
language: it
review_cycle_days: 30
supersedes: ['SoT §pilastro 5 linea 930 (max 4 coop)']
---

# ADR-2026-04-17 · Co-op scaling 4 → 8 giocatori

**Stato**: 🟢 ACCEPTED — Master DD 2026-04-17
**Branch**: `play/party-scaling-4to8`

## Contesto

SoT v5 §pilastro 5 (linea 930) dichiarava: _"Co-op 4 giocatori vs Sistema è pilastro #5. Oggi il sistema gira single-machine only."_ Playtest umano #2 con Master ha sollevato richiesta di party più grandi per:

- Sessioni casual "TV + amici numerosi" (4+ amici in salotto)
- Maggiore varietà tattica (8 PG = 8 ruoli diversi coeggibili)
- Mapping Ennea 9 tipi quasi 1:1 con 8 player

Proposta raccolta 2026-04-17 (chat): estendere coop cap da 4 a 8.

## Decisione

**Estendere Pilastro 5 → "Co-op 1-8 giocatori vs Sistema"**.

Implementazione:

- `max_players_coop: 8` (era 4 implicito)
- `max_deployed_per_encounter: 8` PG schierati max
- `max_roster_total: 16` (8 schierabili + 8 Nido reserve)
- Grid auto-scale: 6×6 fino 4 PG · 8×8 per 5-6 · 10×10 per 7-8
- 8 modulation preset: solo / duo / duo_hardcore / trio / trio_mid / quartet (SoT canonico) / quartet_hardcore / quintet / sextet / septet / full

## Alternative valutate

### A. Mantenere 4 canonici

- **Pro**: zero conflitto SoT, nessun ADR
- **Contro**: limita casual coop party TV (4+ amici non giocano insieme)
- **Verdetto**: rigetto — feedback playtest richiede espansione

### B. Scaling dinamico 4-8 (scelto)

- **Pro**: preserva 4 canonico (default), estende fino 8, modulation YAML data-driven
- **Contro**: grid variabile (serve auto-scale logic), balance ricalibrare per 6-8 player
- **Verdetto**: ACCEPTED

### C. Full scaling 16+ giocatori

- **Pro**: party mega-casual
- **Contro**: grid 16×16+ tattica illeggibile, AP economy esplode, balance impossibile
- **Verdetto**: rigetto — out of scope

## Conseguenze

### Positive

- Pilastro 5 più flessibile: casual 4 + hardcore 8
- Roster 16 totali sblocca meta-loop Nido reale (rotation + mating significant)
- Mapping Ennea-roster naturale

### Negative

- Conflict risolto con SoT §pilastro 5 → doc update richiesto
- Grid scaling = complessità engine (switch grid size per scenario)
- Balance encounter 6-8 player: richiede playtest dedicato
- Tutorial 01-05 restano 6×6 (no impatto immediato)

### Neutral

- Modulation preset coprono 1-8 player con distribuzione PG flessibile

## Piano esecuzione

### PR 1 (questa) — data + schema + ADR ✅

- `data/core/party.yaml` con tutto config
- `schemas/evo/party.schema.json` validation AJV
- Questo ADR
- Update SoT §pilastro 5 con ref ADR (follow-up commit)

### PR 2 (follow-up) — engine integration

- Grid scaling auto-derive da scenario `deployed_count`
- Session start accetta `modulation` preset
- `apps/backend/services/partyLoader.js` memoized config loader
- Tests: coverage 8 modulation preset

### PR 3 (follow-up) — UI lobby

- Frontend browser: pre-game lobby con slots 1-8 player
- Assign PG per player drag-drop
- Preset modulation dropdown (solo/duo/quartet/full)

### PR 4 (follow-up) — balance

- Encounter 06+ con `max_deployed: 8` hardcore
- Playtest dedicato 6-8 player (multi-device test difficile single-machine)

## Validation

- [x] AJV: `data/core/party.yaml` valid contro `party.schema.json`
- [x] Invarianti modulation: `sum(pg_per_player) == deployed` per tutti 11 preset
- [x] Invarianti cap: `deployed <= max_deployed`, `len(pg_per_player) <= max_players_coop`
- [ ] Engine integration (PR 2)
- [ ] Playtest 8-player (PR 4, multi-device)

## Cross-reference

- SoT §pilastro 5: linea 930, va aggiornata con ref questo ADR
- `docs/core/02-PILASTRI.md`: update text "4 giocatori" → "1-8 giocatori"
- `data/core/party.yaml`: config canonica
- Pilastro Playtest log `docs/playtests/`: prossimo playtest #4 può testare 2-player duo

## Aperto per review

Nessuna open question. Master DD ha confermato scaling 4→8 in chat 2026-04-17.
