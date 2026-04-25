---
title: BiomeMemory + Costo ambientale trait — exploration-note candidates
museum_id: M-2026-04-25-011
type: research
domain: architecture
provenance:
  found_at: docs/archive/concept-explorations/2026-04/Evo Tactics Pitch Deck v2.html (3 exploration notes)
  git_sha_first: ed074ae6
  git_sha_last: ed074ae6
  last_modified: 2026-04-20
  last_author: MasterDD-L34D
  buried_reason: deferred
relevance_score: 4
reuse_path: V7 biome-aware spawn bias next push (PR #1726 follow-up) + Skiv biome-mover differentiation
related_pillars: [P2, P3]
status: curated
excavated_by: repo-archaeologist
excavated_on: 2026-04-25
last_verified: 2026-04-25
---

# BiomeMemory + Costo ambientale trait (concept-exploration buried)

## Summary (30s)

- **3 exploration-note** in deck pitch v2 archived: BiomeMemory (bioma "ricorda" creatura post-N encounter), costo ambientale trait per-bioma (esplosione tuning rischio), onboarding diegetico (V1 GIÀ wired PR #1726)
- **Skiv `vagans` biome-mover differentiation**: BiomeMemory = perfect fit per "wandering creature lascia traccia" persona — Skiv = Arenavenator vagans canonical biome-mover, prima creature da testare pattern
- **Triage decision pending**: pilot 4 trait × 3 biomi ship vs parcheggio per esplosione tuning. Audit 4 (post-V7 spawn bias PR #1726) marca queste come "next push naturale"

## What was buried

### Nota 1: BiomeMemory (bioma ricorda creatura)

> "Ogni biome traccia ultimi N encounter (default N=5). Ogni creature ha residence_score post-engage. Se creature rivisita biome, residence_score moltiplica spawn_rate dei suoi trait per altri ospiti del biome (lieve, +5-10%). Effetto: 'ecologia coevoluzione'."

**Mechanism**: `biome.memory: { last_visitors: [unit_id, ...], residence_scores: {unit_id: float} }`. Tick post-encounter aggiorna. Spawn engine consulta.

**Risk**: rischio "quarta economia" (oltre HP, AP, PE, Legami). Player può non capire se bioma "ricorda" o no.

### Nota 2: Costo ambientale trait per-bioma

> "Ogni trait ha cost_modifier_by_biome: {biome_id: multiplier}. Es. 'thermoregulation_cold' costo PE 0.5x in 'arctic_tundra' ma 2x in 'savana'. Effetto: traits matcha bioma = soft-bias build, traits opposti = penalty meccanica."

**Mechanism**: extension `data/core/traits/active_effects.yaml` + `pe_cost_calc()` in PE engine.

**Risk**: esplosione tuning (16 trait × 12 biome = 192 entry da bilanciare). Combinatorial complexity.

### Nota 3: Onboarding diegetico

> "Onboarding senza menu/tutorial: prima scena ha NPC che interagisce stile Disco Elysium, player skill check rivela MBTI partial."

**Status**: GIÀ WIRED PR #1726 V1 (`onboardingPanel.js` Disco-Elysium 3-stage). Card per completezza only — questa nota non è più buried.

## Why it was buried

- Pitch deck v2 (`docs/archive/concept-explorations/2026-04/Evo Tactics Pitch Deck v2.html`) = archived handoff Master DD, NON canonical doc
- Note 1 + 2 sono "exploration only" — esplicito triage P2 da audit map (`docs/archive/concept-explorations/2026-04/handoff/2026-04-20-integrated-design-map.md`)
- Audit 4 (post-V7 PR #1726) marca "next push naturale" ma nessuno ha aperto ticket BACKLOG
- Bus factor 1, autore non più working su exploration

## Why it might still matter

### Skiv vagans biome-mover canonical

Skiv = `Arenavenator vagans` (errante). Audit creature-aspect-illuminator post-museum identifica Skiv come "biome-mover canonical creature" (audit 2026-04-25 `a66528186ae5bffd7`). BiomeMemory è natural fit:

- **Mechanism Skiv**: Skiv visita atollo_ossidiana 2-3 volte → biome.memory.residence_scores.skiv = 0.6 → spawn rate altri swarm trait `magnetic_rift_resonance` +10% per altri ospiti
- **Narrative**: "Skiv torna dove ha già scavato" persona allineata con vagans erratic-but-anchored

### Pillar match

- **P2 Evoluzione 🟢c**: BiomeMemory aggiunge layer ecology coevoluzione, evolve da pure trait inheritance a system biome-driven. Push naturale post-V7
- **P3 Specie×Job 🟢c+**: per-biome trait cost incentiva build-by-biome (skirmisher in atollo, tank in savana). Diversifica role

### Cross-card P2 ecosystem

Questa card + M-2026-04-25-005 magnetic_rift (biome-gated) + V7 biome spawn bias (PR #1726) = 3 layer biome system:

- M-005: biome-gated trait activation (T2 + biome_check)
- V7: biome-aware spawn bias (creature offered match biome)
- M-011 (this): biome memory + per-biome trait cost (long-term coevoluzione)

## Concrete reuse paths

1. **Minimal — Skiv pilot 1 trait × 1 biome (P0, ~3h)**

   Validate BiomeMemory pattern on Skiv before scaling:
   - Aggiungi `data/core/biomes.yaml` extension per `atollo_ossidiana` con `memory: { last_visitors: [], residence_scores: {} }` (placeholder structure)
   - Tick rule in `roundOrchestrator.tickCampaignTurn()`: post-encounter update memory per Skiv
   - Spawn engine: read residence_score → +10% spawn rate magnetic_rift_resonance per altri swarm
   - Test su 5-encounter mini-campaign Skiv-loops
   - Output: pattern validato 1 trait × 1 biome × 1 creature, scope-controlled

2. **Moderate — Costo ambientale trait pilot 4×3 (P1, ~8h)**

   Test combinatorial complexity via small grid:
   - Pick 4 trait + 3 biome (es. thermoregulation_cold/warm × arctic/desert/savana)
   - Extend `active_effects.yaml` per-trait `cost_modifier_by_biome`
   - PE cost calc integration
   - Balance harness `tools/py/batch_calibrate_biome_cost.py` N=20 per matrix point
   - Output: pattern validabile o stop-decision pre-full grid 16×12 = 192

3. **Full — Both notes shipped (P2, ~16-20h)**

   Long-term ecosystem layer:
   - BiomeMemory across all biomes + all creatures
   - Per-biome trait cost full grid (192 entries)
   - UI HUD biome-affinity hint (link Triangle Proposal B color codes M-009)
   - Telemetry per-creature biome_residence + trait_cost_paid_by_biome
   - ADR architectural pattern (link `sot-planner`)
   - Output: P2/P3 🟢 reali (non candidato)

## Sources / provenance trail

- Found at: [docs/archive/concept-explorations/2026-04/Evo Tactics Pitch Deck v2.html](../../archive/concept-explorations/2026-04/) (3 exploration notes embedded)
- Companion archive: [docs/archive/concept-explorations/2026-04/handoff/2026-04-20-integrated-design-map.md](../../archive/concept-explorations/2026-04/handoff/2026-04-20-integrated-design-map.md) (audit map)
- Git history: `ed074ae6` (chore docs canonical refactor 6/8 TODOs) — last touch on archive structure
- Bus factor: 1
- Related canonical (V7 biome spawn bias): [PR #1726](https://github.com/MasterDD-L34D/Game/pull/1726)
- Related canonical (biome resonance): [apps/backend/services/combat/biomeResonance.js](../../../apps/backend/services/combat/biomeResonance.js) (PR #1785)
- Related cross-card:
  - [M-2026-04-25-005 magnetic-rift-resonance](old_mechanics-magnetic-rift-resonance.md) — biome-gated trait
  - [M-2026-04-25-009 Triangle Strategy](personality-triangle-strategy-transfer.md) Proposal B color codes
- Related Skiv: [data/core/species/dune_stalker_lifecycle.yaml](../../../data/core/species/dune_stalker_lifecycle.yaml) (vagans canonical biome-mover)
- Inventory: [docs/museum/excavations/2026-04-25-architecture-inventory.md](../excavations/2026-04-25-architecture-inventory.md)

## Risks / open questions

- ❓ **Quarta economia risk** (BiomeMemory): potrebbe confondere player. Mitigation: indicator subtle (no UI menu, solo gameplay effect)
- ❓ **Combinatorial explosion** (per-biome trait cost): 16 trait × 12 biome = 192 entries. Balance budget esplodere. Pilot scope-down necessario
- ⚠️ Onboarding nota 3 GIÀ shipped V1 PR #1726 — non re-open, solo informational
- ⚠️ Pattern test-bed Skiv: prima Skiv Sprint A (M-005 magnetic_rift wire) deve essere shipped, then BiomeMemory pilot
- ⚠️ Schema drift potenziale: `biome.memory` field aggiunto a `data/core/biomes.yaml` deve aggiornare `packs/evo_tactics_pack/data/biomes.yaml` (sync via `npm run sync:evo-pack`)
- ✅ Doc concept clean

## Next actions

- **Sprint dependency**: M-005 magnetic_rift wire (Skiv Sprint A) PRIMA di pilot BiomeMemory
- **Cross-link**: M-005 + V7 + questa card = 3-layer biome system. ADR `sot-planner` candidate post-pilot
- **Skiv differentiation strong**: BiomeMemory rende Skiv unique come biome-mover (loro lasciano traccia, altre creature no)
