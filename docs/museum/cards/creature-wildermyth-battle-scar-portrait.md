---
title: 'Wildermyth — Battle-scar registry + Layered portrait + Aging (P3 narrative+visual)'
museum_id: M-2026-04-27-004
type: research
domain: creature_aspect
provenance:
  found_at: docs/research/2026-04-26-tier-s-extraction-matrix.md#12-wildermyth-worldwalker-2021--narrative--creature
  git_sha_first: c4a0a4d5
  git_sha_last: 6480e025
  last_modified: 2026-04-26
  last_author: docs-team
  buried_reason: unintegrated
relevance_score: 4
reuse_path: 'Minimal: choice-permanent-flag (~4h) / Moderate: layered storylets pool + battle-scar registry (~22h) / Full: portrait stratificati compositing + aging cross-session (~50h)'
related_pillars: [P3, P4]
status: curated
excavated_by: claude-code (deep extraction pass-2 2026-04-27)
excavated_on: 2026-04-27
last_verified: 2026-04-27
---

# Wildermyth — Battle-scar + Layered portrait + Aging (P3 narrative+visual)

## Summary (30s)

- **4/5 score** — Wildermyth è donor primario per "permanent visible aspect change" + layered narrative. Pattern P3+P4 cross-pillar.
- **5 pattern**: Layered storylets pool (~10h), Permanent visible aspect change/battle-scar registry (~12h), Portrait stratificati layered overlay (~15h), Companion lifecycle aging cross-session (~10h), Choice→permanent consequence flag (~4h quick win).
- **Convergenza con Spore S4 + Voidling Pattern 6**: visual swap mandatory per ogni cambio meccanico significativo. Cross-confirmation 3 fonti indipendenti.

## What was buried

Tier S matrix mappa Wildermyth come tangenziale narrative + creature aspect change. 5 cosa-prendere:

- 🔴 **Layered narrative** (handcrafted hooks + procedural fillers) — extend Skiv storylets pattern a campaign
- 🔴 **Permanent visible aspect change** (Wildermyth: ferita arto = sprite permanent change) — battle-scar registry NEW
- 🔴 **Portrait stratificati** (face + scar + age + clothes layer additivi) — canvas/PIL compositing
- 🔴 **Companion lifecycle aging** (cross-campaign aging counter)
- 🔴 **Choice → permanent consequence narrative weave** — permanent flag in campaign state
- ⏸️ **Comic-book narrative panel UI** — anti-pattern (asset cost)
- ⏸️ **3-stage adult/middle/elder hardcoded** — tieni continuous counter
- ⏸️ **Cross-campaign meta legacy** — scope creep

## Why it might still matter

### Pillar match

- **P3 Specie×Job 🟡 → 🟡+ candidato**: 44/45 species lifecycle YAML mancante è P0 gap esistente. Battle-scar registry + portrait stratificati chiudono "identità persistente" gap.
- **P4 MBTI/Ennea**: choice→permanent consequence flag wire alla VC scoring + thought cabinet (M-2026-04-27-003).

### Convergenza pattern "Permanent visible change" (3 fonti)

- **Wildermyth**: ferita = sprite permanent
- **Subnautica** (M-Tier-A): habitat lifecycle longitudinal stage = sprite shift
- **Voidling Bound Pattern 6** (M-2026-04-26-001): visual swap mandatory per tier-up
- **Spore Pattern S4** (deep extraction): visual emergence prima del testo

3 fonti indipendenti convergono = signal robusto per design canonical.

### File targets

- M12 Form evolution: [`apps/backend/services/forms/formEvolution.js`](../../../apps/backend/services/forms/formEvolution.js)
- Render unit: [`apps/play/src/render.js`](../../../apps/play/src/render.js) — sprite swap attuale
- Skiv storylets (pattern reference): [`data/core/narrative/skiv_storylets.yaml`](../../../data/core/narrative/skiv_storylets.yaml)
- Campaign state: [`apps/backend/routes/campaign.js`](../../../apps/backend/routes/campaign.js) — permanent flag persistence
- Lifecycle YAML: [`data/core/species/dune_stalker_lifecycle.yaml`](../../../data/core/species/dune_stalker_lifecycle.yaml) (template) — 44 species missing

### Cross-card relations

- M-2026-04-26-001 [Voidling Bound](evolution_genetics-voidling-bound-patterns.md) — Pattern 6 visual swap (P0 conferma esterna)
- M-Tier-A Subnautica habitat lifecycle — pattern stage-based aspect
- M-2026-04-25-005 [Magnetic Rift Resonance](old_mechanics-magnetic-rift-resonance.md) — biome-gated trait activation = permanent flag analog

## Concrete reuse paths

### Minimal — Choice permanent flag (~4h)

1. `apps/backend/routes/campaign.js /advance` — accept `narrative_choice: { id, permanent: bool }`
2. Persist in `campaignState.narrativeFlags[]` array
3. Resolver consume: 5-6 trait condition `triggered_when: 'narrative_flag:X'`
4. M19 debrief narrative log → consequence persist

### Moderate — Battle-scar + layered storylets (~22h)

1. **Battle-scar registry** (~12h):
   - Schema `data/core/battle_scars/registry.yaml` — 8-12 scar types con visual_swap_it
   - Trigger: `unit.hp_lost_in_round >= 50%` OR `unit.killing_blow_received` → roll battle_scar
   - Persist in unit state, render via overlay layer (1 scar = 1 layer)
   - Cosmetic only OR optional stat penalty (-1 mod, +1 fear save)
2. **Layered storylets pool** (~10h):
   - Extend Skiv storylets pattern a `data/core/narrative/campaign_storylets.yaml` — 20-30 entry
   - Handcrafted hooks (es. "ally lost") + procedural fillers (random debrief flavor)
   - Wire to QBN engine (M-2026-04-26 inkjs)

### Full — Portrait stratificati + aging (~50h)

1. **Portrait stratificati** (~15h): canvas compositing 4 layer (base + scar + age + biome_marker). Render layer-by-layer in `drawUnit()`.
2. **Aging cross-session** (~10h): `unit.age_counter` increment per campaign turn. Threshold 5/10/15 → portrait age layer swap.
3. **Authoring 44 species lifecycle YAML stub** (~3h via `seed_lifecycle_stub.py` script — gap P0 deep-analysis residuo)

## Tickets proposed

- [`TKT-NARRATIVE-WILDERMYTH-CHOICE-FLAG`](../../../data/core/tickets/proposed/TKT-NARRATIVE-WILDERMYTH-CHOICE-FLAG.json) (4h) — quick win
- [`TKT-NARRATIVE-WILDERMYTH-STORYLETS`](../../../data/core/tickets/proposed/TKT-NARRATIVE-WILDERMYTH-STORYLETS.json) (10h)
- [`TKT-CREATURE-WILDERMYTH-BATTLE-SCAR`](../../../data/core/tickets/proposed/TKT-CREATURE-WILDERMYTH-BATTLE-SCAR.json) (12h)
- [`TKT-CREATURE-WILDERMYTH-PORTRAIT-LAYERED`](../../../data/core/tickets/proposed/TKT-CREATURE-WILDERMYTH-PORTRAIT-LAYERED.json) (15h)
- [`TKT-CREATURE-WILDERMYTH-AGING`](../../../data/core/tickets/proposed/TKT-CREATURE-WILDERMYTH-AGING.json) (10h)

## Sources / provenance trail

- Source matrix: [`docs/research/2026-04-26-tier-s-extraction-matrix.md`](../../research/2026-04-26-tier-s-extraction-matrix.md) §12
- Wildermyth (Worldwalker Games 2021)
- Sintesi cross-game MASTER: [`docs/research/2026-04-26-cross-game-extraction-MASTER.md`](../../research/2026-04-26-cross-game-extraction-MASTER.md) §5 (Mutation pipeline convergence)
- Stato arte: [`docs/reports/2026-04-27-stato-arte-completo-vertical-slice.md`](../../reports/2026-04-27-stato-arte-completo-vertical-slice.md) §B.1.11

## Risks / open questions

- **Asset authoring debt**: 4-layer compositing richiede 44 species × 4 layer asset. Procedural overlay (cifre/marker) può ridurre asset cost.
- **Aging stigma**: aging penalty UX-painful se troppo aggressivo. Cap age modifier max -2 stat.
- **Battle-scar narrative coherence**: 8-12 scar types hand-authored per evitare random feeling. NON procedural pure.

## Anti-pattern guard

- ❌ NON comic-book panel UI (asset cost troppo alto)
- ❌ NON 3-stage age hardcoded (tieni continuous counter)
- ❌ NON cross-campaign legacy meta (scope creep)
- ❌ NON 5-companion party hardcap (tieni 4-8 modulation)
- ✅ DO storylets pool handcrafted+procedural mix
- ✅ DO permanent flag in campaign state, no retcon
