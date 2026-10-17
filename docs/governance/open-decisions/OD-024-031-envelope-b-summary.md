---
id: OD-024-031-envelope-b-summary
title: Envelope B bundle execution summary — OD-024 + OD-025-B2 + OD-027 + OD-029 + OD-031
status: shipped
verdict_date: 2026-05-14
verdict_by: claude-code-aistation
doc_owner: master-dd
workstream: evo-tactics
last_verified: 2026-05-14
language: it
tags:
  [
    open-decision,
    ai-station,
    envelope-b,
    data-layer,
    sentience,
    species,
    neurons,
    promotions,
    pack-v2,
  ]
source_decision_record: docs/governance/open-decisions/OD-024-031-verdict-record.md
analysis_methodology: ai-station-task-execution-protocol-phase-0-7
---

# Envelope B bundle execution summary

5 OD data-layer integrations shipped 2026-05-14 post master-dd ai-station re-analisi approval. Bundle scope: ~17h Envelope B (additive, no breaking, parametric).

## Shipped

### OD-031 — Pack v2-full-plus merge into Game/ canonical

- **ETL script**: `tools/etl/merge_pack_v2_species.py` (~140 LOC, stdlib only)
- **Output**: `data/core/species/species_catalog.json` consolidated JSON
- **Merge result**: 15 species total (10 from Pack v2-full-plus + 5 stubs from Frattura Abissale + dune_stalker canonical)
- **Schema delta**: Pack v2-plus fields injected (scientific_name, classification, functional_signature, visual_description, risk_profile, interactions, constraints, ecotypes, trait_refs, sentience_index) + lifecycle_yaml cross-link preserved

### OD-027 — Full Species type + ecotypes integration

- **Single source-of-truth**: `species_catalog.json` v0.2.0
- **Pattern**: mirror SpeciesCatalog Resource (Godot v2 PRs #149/#151/#153 ETL triplicato)
- **Ecotypes**: per-species `ecotypes` array (e.g. Elastovaranus hydrus → ["dorsali rocciose", "letto fluviale stagionale"])
- **Trait refs**: per-species `trait_refs` array (TR-XXXX codes Pack v2-plus mapping)
- **Provenance tracking**: every entry has `source` field ("pack-v2-full-plus" | "game-canonical-stub") + `merged_at` timestamp

### OD-024 — Sentience full + 4 traits interocettivi RFC v0.1

- **Sentience assignment**: 15/15 Game/ species ora hanno `sentience_index` (T0-T6 scale)
  - 10 species via Pack v2-plus source field verbatim (T0-T3)
  - 5 species via RFC v0.1 heuristic mapping (Animal→T1, pre-sociale→T2, emergente→T3)
- **Distribuzione tier**: T0:2, T1:7, T2:4, T3:2 (no T4-T6 yet — RFC §5 MVP scope)
- **4 traits interocettivi** added to `active_effects.yaml` (T1 sensoriale category):
  - `propriocezione` → +1 attack_bonus min_mos:0
  - `equilibrio_vestibolare` → -1 damage_reduction su hit
  - `nocicezione` → +1 extra_damage gated by ferito status
  - `termocezione` → -1 damage_reduction (thermal)
- **Cross-ref**: RFC v0.1 `Sources/raw/sentience-rfc-2026-04/data/traits_sensienza.yaml` interoception_traits section

### OD-029 — Ancestors neurons_bridge expansion 13→51 entries

- **Source**: vault `Sources/raw/sentience-rfc-2026-04/data/neurons_bridge.csv` (13 entries v0.1)
- **Output**: `data/core/ancestors/neurons_bridge.csv` (51 entries v0.2)
- **Branch coverage**:
  - Senses (SE/SS/SO): 28 entries — eye/sound/smell subtrees full T1-T6
  - Dexterity (DE): 9 entries — manual/precision/composite tools
  - Ambulation (AB): 9 entries — endurance/carrying/bipedal
  - Memorie (BB SS/SX): 5 entries — echoic + iconic memory
- **Tier coverage**: T1:6, T2:10, T3:11, T4:14, T5:7, T6:3
- **Full 297/297 dump deferred**: Phase C external commission (RFC §5 MVP sufficiente per Phase A+B)

### OD-025-B2 — Promotion catalog +elite/+master tier extension

- **File**: `data/core/promotions/promotions.yaml` v0.1.0 → v0.2.0
- **Tier ladder**: base → veteran → captain → **elite** → **master** (5-tier FFT-style)
- **Thresholds elite**: kills_min:18, objectives_min:6, assists_min:6
- **Thresholds master**: kills_min:35, objectives_min:12, assists_min:12
- **Rewards elite**: hp_bonus:15, attack_mod_bonus:3, defense_mod_bonus:2 (NEW stat), initiative_bonus:3, ability_unlock_tier:r4
- **Rewards master**: hp_bonus:25, attack_mod_bonus:4, defense_mod_bonus:3, initiative_bonus:4, crit_chance_bonus:5 (NEW stat), ability_unlock_tier:r5
- **Job archetype bias schema**: per-Job tier override anchor (guerriero/esploratore/tessitore/custode) — reserved per Phase B3 engine extension
- **Engine compatibility**: promotionEngine.js (302 LOC LIVE) auto-consume thresholds + rewards via FALLBACK_CONFIG pattern. NEW reward fields (defense_mod_bonus, crit_chance_bonus) richiedono engine extension Phase B3 (NOT shipped in B2 — schema anchor only)

## Test coverage

`tests/api/envelope-b-data-integrity.test.js` — **24/24 tests pass**:

- OD-024: 5 tests (4 trait shape + RFC reference)
- OD-025-B2: 5 tests (version + ladder + thresholds + rewards + bias schema)
- OD-027+OD-031: 7 tests (catalog schema + merge stats + sentience coverage + lifecycle path validity)
- OD-029: 4 tests (CSV header + count + tier coverage + branch coverage)
- OD-031 ETL: 2 tests (script committed + reproducibility)

## Reproducibility

ETL re-runnable via:

```bash
python tools/etl/merge_pack_v2_species.py \
  --pack-v2 <vault>/Sources/raw/agente-migliore-2025-11/pack-v2-full-plus/evo_tactics_pack_v2_full/species/species_catalog.json \
  --out data/core/species/species_catalog.json
```

Future updates to Pack v2-plus source → re-run ETL → diff committed.

## Pillar status delta post-Envelope B

| #               |  Pre-B  | Post-B  | Note                                                                              |
| --------------- | :-----: | :-----: | --------------------------------------------------------------------------------- |
| P3 Identità     | 🟢-cand | 🟢-cand | promotion ladder 3→5 tier + 4 Job archetype bias schema (engine Phase B3 pending) |
| P4 Temperamenti | 🟢-cand | 🟢-cand | sentience 15/15 + 4 traits interocettivi (vc_scoring fold deferred Godot v2 wire) |
| P6 Fairness     | 🟢-cand | 🟢-cand | unchanged in Envelope B                                                           |

Pilastri 🟢-cand → 🟢 hard promotion ancora gated da playtest #2 userland validation.

## Cross-stack TODO Godot v2

Envelope B data-layer landato Game/-side. Godot v2 client wire follow-up:

- `scripts/data/species_catalog.gd` Resource mirror (SpeciesCatalog pattern #149)
- `scripts/species/species_loader.gd` static facade
- `scripts/data/neurons_bridge_catalog.gd` Resource per neurons_bridge.csv
- `scripts/progression/promotion_engine.gd` extend per elite/master tier (mirror promotionEngine.js Phase B3 extension)

Effort: ~1 PR per resource, ~2-3 PR totali cross-stack Godot v2 (estimated ~4-6h aggiuntivo).

## Pending Envelope C

OD-026 Diegetic Atlas (TV + Phone overlay) deferred — sprint UI dedicato richiede:

- Master-dd design call (shader custom vs Skiv pulse reuse)
- Wildermyth-style asset commission per biome silhouette

## Cross-link

- ai-station re-analisi: `vault/docs/decisions/OD-024-031-aistation-reanalysis-2026-05-14.md`
- Decision record permanente: `docs/governance/open-decisions/OD-024-031-verdict-record.md`
- Envelope A bundle: PR #2261 (OD-025 smoke + OD-028 Howler + OD-030 flag-ON)
- Vault PR ai-station: https://github.com/MasterDD-L34D/vault/pull/5
- Game/ PR #2260 (audit source): comment-4450788725 (delivery)
- RFC sentience v0.1: `vault/Sources/raw/sentience-rfc-2026-04/`
- Pack v2-full-plus: `vault/Sources/raw/agente-migliore-2025-11/pack-v2-full-plus/`
