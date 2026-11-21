---
title: Enneagramma Dataset — 9 tipi canonical schema 1.0
museum_id: M-2026-04-25-003
type: dataset
domain: enneagramma
provenance:
  found_at: incoming/Ennagramma/enneagramma_dataset.json
  git_sha_first: 6027b180
  git_sha_last: dbf46e44
  last_modified: 2026-04-16
  last_author: MasterDD-L34D
  buried_reason: unintegrated
relevance_score: 5
reuse_path: data/core/personality/enneagramma_types.yaml (convert + load in vcScoring.js)
related_pillars: [P4]
status: curated
excavated_by: repo-archaeologist
excavated_on: 2026-04-25
last_verified: 2026-04-25
---

# Enneagramma Dataset — 9 tipi canonical

## Summary (30s)

- **JSON canonical schema 1.0.0** con 9 tipi Enneagramma full schema (id, name_it, center, core_emotion, basic_fear, basic_desire, passion, fixation, virtue, stress_to, growth_to, wings, wings_detail)
- **`vcScoring.js` mappa solo 6/9** (mancano 1 Reformer, 4 Individualist, 6 Loyalist) — 33% gap canonical
- **Skiv `vagans` link**: candidate Type 5 (Investigator) o Type 7 (Enthusiast) — 2 voice palette diverse, dataset ready

## What was buried

JSON 9 entry, ognuno con campi:

```json
{
  "id": 5,
  "name_it": "L'Osservatore / Investigatore",
  "center": "mentale",
  "core_emotion": "paura",
  "basic_fear": "Essere impotenti, incapaci, incompetenti",
  "basic_desire": "Competenza e comprensione",
  "passion": "Avarizia",
  "fixation": "Distacco",
  "virtue": "Distacco/Non attaccamento",
  "stress_to": 7,
  "growth_to": 8,
  "wings": ["5w4", "5w6"],
  "wings_names_ei": ["The Iconoclast", "The Problem Solver"],
  "wings_detail": [{ "id": "5w4", "summary": "..." }]
}
```

Total: 9 tipi × ~13 campi = ~117 dati strutturati pronti runtime.

## Why it was buried

- Intro `6027b180` 2025-10-29 (bulk Enneagramma upload da MasterDD-L34D)
- Ultimo touch `dbf46e44` 2026-04-16 (Prettier bulk, no semantic)
- `vcScoring.js:774-893` ha implementato `computeEnneaArchetypes` ma con 6 archetipi hardcoded da `data/core/telemetry.yaml:55 ennea_themes` invece di leggere questo dataset
- `data/core/mating.yaml:361 compat_ennea` ha solo 3 archetipi (Coordinatore/Conquistatore/Esploratore) — drift parallelo
- `data/core/rewards/reward_pool_mvp.yaml` usa già `{ ennea: '8', weight: 0.8 }` su tutti 9 type-id stringa → unico consumatore canonical che ha intent giusto

## Why it might still matter

- **Skiv Sprint C voices ~6h**: `basic_fear` + `basic_desire` + `passion` sono testi prêt-à-l'emploi per voice generation. Skiv `vagans` (errante) candidate match:
  - **Type 5** (Investigatore, Centro Mentale): voce stoica taxonomica, "cataloga la duna, accumula intel pre-engage"
  - **Type 7** (Entusiasta, Centro Mentale): voce caotica giocosa, "name-drop biome, lista loot"
  - Switch via `vcSnapshot.ennea_archetypes[0]` post-VC scoring
- **P4 status drift fix**: 6/9 archetipi → 9/9 = chiude gap operativo "P4 completo" (oggi falso)
- **Foundation per M-2026-04-25-002 registry**: dataset alimenta `eligibility` checks (es. `triad.core_emotion=paura` matcha types 5, 6, 7)

## Concrete reuse paths

1. **Minimal — convert + load in `vcScoring.js` (P0, ~5h)**

   ```bash
   # JSON → YAML conversion
   yq -P incoming/Ennagramma/enneagramma_dataset.json \
     > data/core/personality/enneagramma_types.yaml
   ```

   - Estendi `vcScoring.js:774` per leggere YAML e mappare 9 tipi
   - Backfill 1/4/6 mancanti (oggi 6 archetipi → 9 archetipi)
   - Test: `node --test tests/api/vcScoring.test.js` (regress baseline)

2. **Moderate — Skiv Sprint C voice palette derivata (P1, ~6h)**
   - 9 voice file YAML in `data/core/narrative/ennea_voices/<type_id>.yaml`
   - Per ogni type: `voice_tone`, `lexicon[]`, `cadence`, `diary_template`
   - Selector in `narrativeEngine.js`: `pickVoice(unit) → ennea_archetypes[0]`
   - Dependency: M-2026-04-25-001 sentience tiers per layered voice (T3 Skiv + Type 5 = stoic-emergent)

3. **Full — Ennea-aware AI policy (P2, ~12h)**
   - `aiPolicy/utilityBrain.js` consideration per ennea archetype
   - Type 5 (Investigator) → priority "intel gather" intent
   - Type 8 (Challenger) → priority "engage_strongest" intent
   - Bayesian tuning soglie per archetype (link `balance-illuminator`)

## Sources / provenance trail

- Found at: [incoming/Ennagramma/enneagramma_dataset.json:1](../../../incoming/Ennagramma/enneagramma_dataset.json)
- Git history: `6027b180` (2025-10-29, intro), `dbf46e44` (2026-04-16, Prettier-only). 0 semantic changes in 6 mesi
- Bus factor: 1 (MasterDD-L34D)
- Related canonical incomplete: [apps/backend/services/vcScoring.js:774](../../../apps/backend/services/vcScoring.js)
- Related canonical full consumer: [data/core/rewards/reward_pool_mvp.yaml](../../../data/core/rewards/reward_pool_mvp.yaml) (9 ennea weights live)
- Related drift: [data/core/mating.yaml:361](../../../data/core/mating.yaml) `compat_ennea` (3 archetipi only)
- Skiv canonical: [data/core/species/dune_stalker_lifecycle.yaml](../../../data/core/species/dune_stalker_lifecycle.yaml)
- Pack duplicate: [packs/evo_tactics_pack/tools/py/modules/personality/enneagram/personality_module.v1.json](../../../packs/evo_tactics_pack/tools/py/modules/personality/enneagram/personality_module.v1.json)
- Inventory: [docs/museum/excavations/2026-04-25-enneagramma-inventory.md](../excavations/2026-04-25-enneagramma-inventory.md)

## Risks / open questions

- ❓ **Skiv Type 5 vs 7 decision** (user input): testare entrambi via A/B Sprint C? Default proposto: Type 5 (allinea con vagans+stoic posture INTP body-first)
- ⚠️ Tritype (Skiv 5-3-9? 5-1-2?) NON determinabile da dataset. Richiede telemetry run reale o user choice. NON inventare
- ⚠️ Pack module `personality_module.v1.json` (M-2026-04-25-005) ha 770 LOC vs questo 9-tipi compact. Decision: usare quale come canonical?
- ✅ Encoding spot-check clean (UTF-8 nativi: à, ù, →)

## Next actions

- **Sprint C kickoff parallelo a M-2026-04-25-002**: convert YAML + Sprint C voice palette (~11h totale Minimal+Moderate)
- **Cross-link M-2026-04-25-002 + M-2026-04-25-006**: trio integrato per Ennea runtime full
- **OPEN_DECISIONS**: OD-010 "Skiv voice palette default" ✅ RISOLTA proposed (skip-via-A/B: implementare entrambe palette + telemetry-driven default)
