---
title: evo-swarm run #5 discarded claims — 8 hallucinated + 2 redundant
museum_id: M-2026-05-08-001
type: discarded_output
domain: evo-swarm-pipeline-failure-modes
provenance:
  found_at: docs/research/2026-05-08-evo-swarm-stress-mechanics-distillation.md (verification table + triage closure)
  git_sha_first: 1cfd7220
  git_sha_last: 1ee6fd94
  last_modified: 2026-05-08
  last_author: MasterDD-L34D
  buried_reason: discarded post-triage canonical cross-verification
relevance_score: 4
reuse_path: docs/museum/cards/evo-swarm-run-5-discarded-claims.md (3 ranked None / Pipeline Gate Reference / Failure Mode Training Set)
related_pillars: [P2, P4]
related_od: [OD-022]
status: curated
excavated_by: claude-autonomous-2026-05-08-sera (user-requested museum card per discard preservation)
excavated_on: 2026-05-08
last_verified: 2026-05-08
---

# evo-swarm run #5 discarded claims — 8 hallucinated + 2 redundant

## Summary (30s)

- **10 swarm output items discarded** post-triage canonical cross-verification (2026-05-08 sera)
- **8/13 hallucinated** (swarm proposed claim non-canonical) + **2 redundant** (swarm reinventava pattern già esistente in canonical)
- **Pattern dominante swarm-side**: `hallucinate-by-association` — prende nomi reali (`dune_stalker`, `abisso_vulcanico`, `impulsi_bioluminescenti`) e combina attributi non supportati canonical
- **Pattern secondario**: `reinvent-canonical-wheel` — propone framework che già esiste in `data/core/biomes.yaml > hazard.stress_modifiers + stresswave`
- **Reuse value**: training set OD-022 cross-verification gate design (failure mode catalog) + agent prompt examples

## What was discarded

### 8 hallucinated claims (failure mode "hallucinate-by-association")

| #   | Swarm claim                                                                | Reality canonical                                                                                                                                              | Failure pattern                                                       |
| --- | -------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| 1   | Abisso Vulcanico ha affixes `termico, luminescente, spore_diluite, sabbia` | biomes.yaml: "lava pressurizzata + bio-termica" (deep vents, non sabbia)                                                                                       | Attributo speculativo combinato                                       |
| 2   | `dune_stalker` adatto Abisso Vulcanico                                     | species.yaml:72 `biome_affinity: savana`                                                                                                                       | Reassign biome implicit non dichiarato                                |
| 3   | `echolocation` come trait                                                  | Canonical = `default_parts.senses` (body part), NOT trait                                                                                                      | Confusione categoria parts/trait                                      |
| 4   | `sand_digest` come trait                                                   | Canonical = `default_parts.metabolism` (body part), NOT trait                                                                                                  | Stesso pattern category confusion                                     |
| 5   | `thermal_resistance` come trait esistente                                  | Zero match glossary.json + biome_pools.json + active_effects.yaml                                                                                              | Pure invention nome plausibile                                        |
| 6   | `substrate_grip` trait esistente                                           | Non in alcun file canonical (correttamente flagged "proposto" dal swarm)                                                                                       | Speculation framing borderline                                        |
| 7   | Atollo di Ossidiana come PARTIAL (alias only)                              | biomes.yaml:93 PRIMARY canonical entry slug `atollo_obsidiana`                                                                                                 | Mancata grep canonical ortografia variant ("ossidiana" ≠ "obsidiana") |
| 8   | Stress framework needed nuovo top-level                                    | Canonical pattern già esiste: `biomes.yaml > <bioma> > hazard.stress_modifiers: { vector: 0-1 } + stresswave: { baseline, escalation_rate, event_thresholds }` | Reinvent-wheel non riconosciuto                                       |

### 2 redundant claims (failure mode "reinvent-canonical-wheel")

| #   | Swarm claim                                               | Pattern canonical pre-esistente                                                       |
| --- | --------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| 9   | YAML schema location stress_modifiers nuovo file dedicato | Già nest sotto `biomes.yaml > <bioma> > hazard.stress_modifiers` (20+ biomi popolati) |
| 10  | Stress sistema nuovo proposto                             | Stesso pattern stress_modifiers + stresswave già live runtime                         |

## Why discarded

**Triage cross-verification 2026-05-08 sera** (PR [#2121](https://github.com/MasterDD-L34D/Game/pull/2121) `1ee6fd94`): grep canonical su 7 open questions ha rivelato 5/7 risolte da pre-existing data:

- Q1 Atollo Ossidiana: PRIMARY canonical → swarm PARTIAL = wrong
- Q2 dune_stalker reassign: NO canonical = savana → swarm reassign hallucinated
- Q3 thermal_resistance: zero match → pure hallucination
- Q5 stress system pre-esistente: YES → swarm framework redundant
- Q6 schema location nuovo file: NO need → swarm reinvent wheel

2/7 deferred Sprint Q+ (Q4 default_parts/trait policy + Q7 calibration).

**Net actionable per data integration immediate**: zero (Claude triage autonomous judgment, master-dd verdict pendente per criteri value diversi).

## Causa root failure modes

1. **`co02_validation.complete`** valida solo struttura JSON output, **NON fedeltà canonical Game**. Non c'è gate cross-reference.
2. **Swarm specialist context**: 6 specialist (lore-designer / species-curator / balancer / trait-curator / biome-ecosystem-curator / archivist) hanno accept score 7.5/10 tutti, ma score swarm-side ≠ accuratezza canonical Game.
3. **Modello `qwen3-coder:30b`** + 11gg dormancy pre run #5 = riavvio cold senza canonical fresh in context.
4. **Pattern hallucinate-by-association** = LLM prende identifier reale e combina attributi plausibili ma non supportati. Mode tipico LLM su domain con corpus parziale.

## Reuse paths (3 ranked)

### 1. None (default current state)

Swarm dormant fino a Sprint Q+ post-Phase-B. Cards esiste come archive read-only. Effort: 0h.

**Quando**: se evo-swarm Atto 2 path abandoned (kill option). Risk: discarded learning lost se pipeline ricompare M12+.

### 2. Pipeline gate reference (OD-022 implementation)

Card consultata da OD-022 implementation Sprint Q+ post-Phase-B (~7-9h):

- 8 hallucination examples → unit test corpus per `tools/py/swarm_canonical_validator.py` (assert validator catch each)
- 2 redundant examples → reject pattern recognition (validator detect "swarm reinventa pattern X esistente")
- Failure root cause analysis → design gate criteria

Effort post-Phase-B: ~30min consultazione card pre-design gate. Total con OD-022 implementation: ~7.5-9.5h.

**Quando**: master-dd accept OD-022 trigger Sprint Q+. Risk: bassa, additive value.

### 3. Failure mode training set (LLM agent prompt engineering)

Card serve come few-shot examples in prompt swarm-side per `qwen3-coder:30b`:

- "Avoid pattern: claim X exists when canonical not match" → 8 examples
- "Avoid pattern: propose new framework when canonical pre-existing" → 2 examples
- Reduces hallucination rate run #6+ per esposto reference

Effort: ~2-3h (swarm-side prompt update + run #6 baseline test). Cross-repo evo-swarm autonomous.

**Quando**: pre run #6 trigger. Risk: media (prompt engineering iterativo, gain non garantito).

## Open questions deferred Sprint Q+ (preserved)

| #   | Question                                             | Why deferred                                                                                                                                                |
| --- | ---------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Q4  | Policy `default_parts` vs `trait_plan` codification  | Bassa priorità + canonical pattern osservabile (senses/metabolism = parts, abilities = trait)                                                               |
| Q7  | Calibrazione numerica nuovi biomi (se Game ratifica) | Canonical pre-existing (Abisso Vulcanico stress_modifiers calibrati line 73-75 + Atollo Obsidiana line 113-115) = no new calibration unless new biome added |

## Cross-references

- Source PR (additive merge): [#2108](https://github.com/MasterDD-L34D/Game/pull/2108) `1cfd7220`
- Triage closure PR: [#2121](https://github.com/MasterDD-L34D/Game/pull/2121) `1ee6fd94`
- OD-022 trip-wire codification: [PR #2120](https://github.com/MasterDD-L34D/Game/pull/2120) `9d57a2c5` + [`OPEN_DECISIONS.md` OD-022](../../../OPEN_DECISIONS.md#od-022-evo-swarm-pipeline-cross-verification-gate-pre-run-6)
- Research doc canonical: [`docs/research/2026-05-08-evo-swarm-stress-mechanics-distillation.md`](../../research/2026-05-08-evo-swarm-stress-mechanics-distillation.md) §Triage closure 2026-05-08 sera
- Issue weekly digest: [Game#2102](https://github.com/MasterDD-L34D/Game/issues/2102) (0 cicli significativi week 2026-04-30→05-07)

## Skiv link

Indiretto. Swarm specialist `species-curator` ha menzionato `dune_stalker` (= Skiv canonical Arenavenator vagans) ma con biome reassign hallucinated (Abisso Vulcanico vs canonical savana). Card preserve esempio failure: future agent operante su Skiv lifecycle deve grep `data/core/species.yaml:72` PRIMA di trust swarm output.

## Status

**curated** — 2026-05-08 sera. Additive only. Lifecycle: `excavated → curated → reviewed | revived | rejected` per CLAUDE.md Museum-first protocol §Lifecycle.

Reviewed master-dd post Phase B accept (≥2026-05-14) determina path:

- **revived** → integrate Reuse Path 2 (OD-022 gate reference) o 3 (LLM prompt training)
- **rejected** → swarm Atto 2 path abandoned, card resta archive learning per future audit
