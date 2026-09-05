---
title: 'Hades + Monster Train — Multi-currency split + Pact opt-in difficulty (P2 + P6)'
museum_id: M-2026-04-27-005
type: research
domain: economy
provenance:
  found_at: docs/research/2026-04-26-tier-a-extraction-matrix.md#2-hades-supergiant--2020
  git_sha_first: c4a0a4d5
  git_sha_last: 6480e025
  last_modified: 2026-04-26
  last_author: platform-research
  buried_reason: unintegrated
relevance_score: 5
reuse_path: 'Minimal: Multi-currency split (~6h) + Pact Shards opt-in (~5h) / Moderate: Codex panel + Pact menu (~20h) / Full: 7-currency Hades stack (overkill defer)'
related_pillars: [P2, P6]
status: curated
excavated_by: claude-code (deep extraction pass-2 2026-04-27)
excavated_on: 2026-04-27
last_verified: 2026-04-27
---

# Hades + Monster Train — Multi-currency + Pact opt-in (P2+P6)

## Summary (30s)

- **5/5 score** — Hades Pact philosophy + Monster Train Pact Shards convergono su "opt-in difficulty stack composable" pattern. Convergenza 4 fonti (Hades + MT + AI War progress + LW2 timer).
- **2 pattern alto-ROI**: Hades multi-currency split PE-run + Shards-meta + PI (~6h Min), MT Pact Shards opt-in scaling (~5h Min). Bundle ~11h chiude P2 currency separation + P6 player-controlled difficulty.
- **Codex panel schema spec'd** già — `docs/design/2026-04-27-codex-aliena-hades-schema.md` (Wave 9, 11h totale).

## What was buried

Tier A matrix #2-3 categorizza Hades + MT come donor primario P2 (currency) + P6 (difficulty opt-in). Convergenza explicit cross-game:

- 🔴 **Currency separation tight-loop vs long-loop** (Hades 7 currency, MT Shards single)
- 🔴 **Codex tematico container** sidebar list + entry view sezioni espandibili
- 🔴 **Gradual reveal mitigation** — 1-2 currency alla volta tramite tutorial run
- 🔴 **Pact opt-in N tiers** (MT 0-25 Pact, Hades 50+ Heat)
- 🔴 **Difficulty modifier additive composable** (NOT monolithic difficulty preset)
- 🔴 **Reward tradeoff trasparente** — UI mostra esattamente "tu prendi X difficulty per Y reward boost"

## Why it might still matter

### Pillar match

- **P2 Evoluzione 🟡++**: PE singolo è bottleneck. Split in 3 currency (PE-run / Shards-meta / PI-pack) chiude competizione "evolvi MBTI form" vs "sblocca job perk" — confermato da Voidling Bound Pattern 4 (M-2026-04-26-001).
- **P6 Fairness 🟡+**: hardcore-07 deadlock multiplier knob exhausted. Pact menu modificatori = player-controlled scaling (NOT preset eyeball calibration).

### Convergenza opt-in difficulty composable (4 fonti)

- **Hades Heat system** (M-questo)
- **Monster Train Pact Shards** (Tier A #3)
- **AI War Progress meter** (Tier S #10) — analog "chosen escalation"
- **XCOM Long War 2 Pact** (Tier S #8) — hardcoded, MT/Hades = player-chosen

4 fonti convergono = signal robusto.

### File targets

- Reward economy: [`apps/backend/services/rewards/rewardEconomy.js`](../../../apps/backend/services/rewards/rewardEconomy.js)
- Reward offer: [`apps/backend/services/rewards/rewardOffer.js`](../../../apps/backend/services/rewards/rewardOffer.js) — softmax pool R/A/P
- Form evolution: [`apps/backend/services/forms/formEvolution.js`](../../../apps/backend/services/forms/formEvolution.js)
- Codex schema spec: `docs/design/2026-04-27-codex-aliena-hades-schema.md`
- Campaign endpoint: [`apps/backend/routes/campaign.js`](../../../apps/backend/routes/campaign.js) — `/start` accept `pact_shards: 0..5`

### Cross-card relations

- M-2026-04-26-001 [Voidling Bound](evolution_genetics-voidling-bound-patterns.md) — Pattern 4 currency separation conferma esterna
- M-2026-04-25-005 [Magnetic Rift Resonance](old_mechanics-magnetic-rift-resonance.md) — biome-gated trait activation analog
- M-2026-04-25-007 [Mating Engine Orphan](mating_nido-engine-orphan.md) — V3 Mating PE consumption point

## Concrete reuse paths

### Minimal — Multi-currency + Pact Shards (~11h totale)

**Multi-currency split** (~6h):

1. Schema `data/core/economy/currencies.yaml` — 3 currency: `PE_run` (tight-loop, victory XP) + `Shards_meta` (long-loop, persists) + `PI_pack` (inventory)
2. Reward economy: `rewardEconomy.js` emette pool M (Mutation Points / Shards) separato da PE
3. Form evolution: `formEvolution.js peCost` rinominato `mbti_pe_cost`, separato da `mutagen_cost`
4. Persistence: `formSessionStore` write-through `meta_shards` cross-run

**Pact Shards opt-in** (~5h):

1. `pact_shards: 0..5` param `/api/campaign/start`
2. Schema `data/core/pact_shards.yaml` — 5 modifier additivi (es. "+10% enemy HP", "-1 starting energy", "+1 reinforcement", "biome diff_base +1", "trait pool ridotto")
3. Reward multiplier proporzionale: `rewardMultiplier = 1 + 0.2 * shards`
4. UI picker pre-mission con preview totale + telemetry per shard popularity

### Moderate — Codex panel + Pact UI (~20h)

1. `apps/play/src/codexPanel.js` (NEW) — schema A.L.I.E.N.A. 6-dim entry-by-entry
2. Pact UI `apps/play/src/pactPicker.js` — slider tier preview con effect summary
3. Telemetry gate: shard configuration popularity + win-rate per shard count
4. Codex unlock progressive (locked entries visibili ma testo oscurato)

### Full — Hades 7-currency stack (overkill defer)

- 7 currency (Darkness/Keys/Gems/Nectar/Ambrosia/Titan Blood/Diamonds) overwhelming MVP
- Defer post-MVP — tieni 3 currency MVP scope

## Tickets proposed

- [`TKT-ECONOMY-HADES-MULTI-CURRENCY`](../../../data/core/tickets/proposed/TKT-ECONOMY-HADES-MULTI-CURRENCY.json) (6h) — high-ROI
- [`TKT-P6-MONSTER-TRAIN-PACT-SHARDS`](../../../data/core/tickets/proposed/TKT-P6-MONSTER-TRAIN-PACT-SHARDS.json) (5h) — high-ROI
- [`TKT-P6-HADES-PACT-MENU`](../../../data/core/tickets/proposed/TKT-P6-HADES-PACT-MENU.json) (14h) — Tier B Pact menu modificatori opt-in

## Sources / provenance trail

- Source matrix Tier A: [`docs/research/2026-04-26-tier-a-extraction-matrix.md`](../../research/2026-04-26-tier-a-extraction-matrix.md) §2-3
- Source matrix Tier B (Hades GDC): [`docs/research/2026-04-26-tier-b-extraction-matrix.md`](../../research/2026-04-26-tier-b-extraction-matrix.md) #13
- Hades (Supergiant 2020), Monster Train (Shiny Shoe 2020)
- Codex schema spec: `docs/design/2026-04-27-codex-aliena-hades-schema.md`
- Stato arte: [`docs/reports/2026-04-27-stato-arte-completo-vertical-slice.md`](../../reports/2026-04-27-stato-arte-completo-vertical-slice.md) §B.2

## Risks / open questions

- **PE rename blast radius**: `pe_cost` rename schema-changing se altri consumer leggono. Verifica `grep -rn "pe_cost" apps/ data/` pre-merge.
- **Shards persistence design**: cross-run state — Prisma adapter pattern già usato (FormSessionState model + migration).
- **Pact balance test**: ogni shard tier richiede N=10 calibration run per win-rate validation. Tier `pact_shards: 5` baseline 15-25% win.
- **UI picker complexity**: 5+ shard combinations possibili → preview totale richiede formula calcolo client-side. Cap UX overhead.

## Anti-pattern guard

- ❌ NON 7+ currency overwhelming MVP (Hades full stack)
- ❌ NON difficulty preset monolitico (Easy/Normal/Hard) — composable additive
- ❌ NON shards lockout campaign-permanent (player può cambiare run-to-run)
- ❌ NON Pact menu nascosto in submenu (visibility prima del run)
- ✅ DO reward proporzionale (tradeoff trasparente)
- ✅ DO gradual reveal (introdurre 1-2 currency tutorial run)
