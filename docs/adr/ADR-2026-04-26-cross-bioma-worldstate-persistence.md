---
title: 'ADR-2026-04-26 — Cross-bioma world-state persistence'
doc_status: draft
doc_owner: master-dd
workstream: backend
last_verified: '2026-04-26'
source_of_truth: false
language: it
review_cycle_days: 180
related:
  - apps/backend/prisma/schema.prisma
  - docs/museum/cards/worldgen-cross-bioma-events-propagation.md
  - packs/evo_tactics_pack/data/ecosystems/network/cross_events.yaml
  - docs/archive/concept-explorations/2026-04/Vertical Slice - Risveglio del Leviatano.html
---

# ADR-2026-04-26 — Cross-bioma world-state persistence

**Status**: accepted (sign-off master-dd 2026-04-26 sera, sprint kickoff pending Nido merge)
**Decision date**: 2026-04-26
**Accepted date**: 2026-04-26
**Effort impl**: 8-12h (Sprint C)

## Context

Post-Leviatano (outcome `parley` o `combat_win` o `retreat`), il **mondo deve cambiare**:

- Frattura collassa o si stabilizza
- Biomi adiacenti assorbono spillover (vertical slice line 2040: _"alla prossima sessione: il suo canto raggiungerà la Foresta"_)
- `bridge_species_map` si modifica (vertical slice line 1535: _"nuovo bridge ✦"_ fra Cresta-bloom e Frattura-risvegliata)
- Trait planari sbloccano (vertical slice line 811: _"trait planare sblocca in base al comportamento"_)

Oggi **nessun runtime persiste world state cross-encounter**. Ogni session è iso­lata. `metaProgression.js` persiste fragments + PE personali, non world state ecologico.

Museum card **M-2026-04-26-014** (`docs/museum/cards/worldgen-cross-bioma-events-propagation.md`) documenta `packs/evo_tactics_pack/data/ecosystems/network/cross_events.yaml` con 3 eventi tipizzati (tempesta ferrosa, ondata termica, brinastorm) + `propagate_via: [corridor, seasonal_bridge, trophic_spillover]` + validator Python `foodweb.py:collect_event_propagation()` già implementato. **Zero runtime wiring** → buried 2025-10-28, score 4/5.

## Decision

Introduci **`WorldState`** Prisma model con scope **per-campaign**:

```prisma
// apps/backend/prisma/schema.prisma — additive
model WorldState {
  id              String   @id @default(cuid())
  campaign_id     String   @unique
  meta_network    Json     // { biome_health: {...}, bridges: [...], events_active: [...] }
  lore_unlocked   String[] // ["leviatano_first_parley", "frattura_stabilized", ...]
  trait_unlocks   String[] // ["eco_lucido", "canto_assimilato", ...]
  spillover_log   Json[]   // [{ from_biome, to_biome, event, turn_at, session_id }]
  updated_at      DateTime @updatedAt
  created_at      DateTime @default(now())

  @@index([campaign_id])
}
```

**Schema JSON** `meta_network`:

```json
{
  "biome_health": {
    "frattura_abissale_sinaptica": { "status": "risvegliata", "stability": 0.62 },
    "foresta_temperata": { "status": "spillover_target", "stability": 0.85 }
  },
  "bridges": [
    {
      "from": "fotofase",
      "to": "frattura",
      "type": "synaptic_resonance",
      "active": true,
      "created_at_session": "..."
    }
  ],
  "events_active": [
    {
      "event_id": "canto_dello_strappo_propagation",
      "turns_remaining": null,
      "from_biome": "frattura",
      "to_biome": "foresta_temperata",
      "source_session": "..."
    }
  ]
}
```

**Riusa pattern museum M-014**: `cross_events.yaml` definisce _cosa_ può propagarsi, `WorldState.spillover_log` registra _cosa è propagato_ runtime.

**Lifecycle**:

1. `POST /api/session/end` (in `routes/session.js:1987+`) → outcome → enrich `worldStateUpdate` payload
2. `WorldStateService.applyOutcome(campaign_id, outcome, encounter, narrative_choices)` → merge in DB
3. Next session `/start` → `WorldStateService.load(campaign_id)` → apply biases (spawn pool, encounter selection, biome modifiers)

**Hook Nido**: `services/mating-nido/lineageChain.js` (orphan engine, vedi museum card `mating_nido-engine-orphan.md`) può readare `WorldState.trait_unlocks` per offspring environmental mutation. Sblocco implicito.

## Consequences

**Positive**:

- Unblocks campaign multi-run divergence (real ecological persistence)
- Museum card M-014 da `curated` → `revived` (status lifecycle progression)
- Sblocca Nido lineage chain offspring environmental mutation senza wire dedicato
- Pattern riusabile per ogni boss apex (Leviatano è case 1, Apex futuri stesso pattern)

**Negative**:

- Prisma migration 0005 nuovo (irreversibile in prod, mitigation: rollback script)
- `WorldStateService` cache layer richiesto (load every /start = N+1 per multi-player)
- Test surface campaign-level (oggi test suite combat/encounter, non cross-session) → +20-30 test
- Cross-PC sync: campaign_id deve essere stable → blocked se user cambia PC mid-campaign senza Game-Database sync

## Alternatives considered

- **A) `Campaign.metadata` JSON blob**: già esiste model Campaign, ma metadata è untyped → grow into anti-pattern, scartato.
- **B) File-based `data/runtime/world_states/<campaign>.json`**: viola SoT (runtime ≠ data/), no transactional update, scartato.
- **C) NeDB embedded** (default `data/idea_engine.db`): incoerente con Prisma direction, scartato.

## DoD

1. Prisma migration 0005 `WorldState` model
2. `WorldStateService` (load/apply/merge) in `apps/backend/services/world/`
3. Hook in `routes/session.js` `/end` outcome → world state update
4. Hook in `routes/session.js` `/start` campaign_id → world state load → bias applicabili
5. Cross-events YAML loader (riusa `foodweb.py:collect_event_propagation` logic via Node port)
6. Test: ≥10 unit (load/apply/merge) + ≥5 integration (campaign multi-session divergence)
7. Migration script + rollback documented in PR
8. Museum card M-014 update status `curated` → `revived`

## References

- `apps/backend/prisma/schema.prisma` — current schema (campaign model esiste)
- `docs/museum/cards/worldgen-cross-bioma-events-propagation.md` — pattern source M-014
- `packs/evo_tactics_pack/data/ecosystems/network/cross_events.yaml` — propagation events YAML
- `docs/archive/concept-explorations/2026-04/Vertical Slice - Risveglio del Leviatano.html:2038-2060` — outcome → world consequence promises
- `services/mating-nido/lineageChain.js` — Nido orphan engine consumer potential
- ADR-2026-04-21 campaign save persistence (precedent persistence pattern)

## Sequencing

**Indipendente da** Sprint A/B (può shippare in parallelo). Tuttavia outcome `parley` (Sprint B) sblocca i lore_unlocked più ricchi → coordinated value.
**Pattern Nido reuse**: shippare Sprint C **prima** di lavorare su Nido lineage offspring environmental mutation.
