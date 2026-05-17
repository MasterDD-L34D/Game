---
title: 'OD-022 swarm canonical validator — pre-design preview Day 3/7 sera'
doc_status: draft
doc_owner: master-dd
workstream: cross-cutting
last_verified: 2026-05-08
source_of_truth: false
language: it
review_cycle_days: 30
related:
  - OPEN_DECISIONS.md
  - docs/museum/cards/evo-swarm-run-5-discarded-claims.md
  - docs/research/2026-05-08-evo-swarm-stress-mechanics-distillation.md
tags: [evo-swarm, validator, pre-design, OD-022]
---

# OD-022 swarm canonical validator — pre-design preview

⚠️ **Status: PRE-DESIGN PREVIEW Claude autonomous Day 3/7 sera 2026-05-08**. Master-dd verdict OD-022 accept pendente. Skeleton + test corpus + spec preview only — full impl gated post-Phase-B-accept.

## 1. Scope

Pre-design preview per OD-022 evo-swarm pipeline cross-verification gate pre run #6. Closes recurrence Engine-LIVE-Surface-DEAD pattern in evo-swarm pipeline:

- Run #5 score: 5/13 verified + 8/13 hallucinated + 2 redundant + 2 deferred = 54% hallucination ratio
- Triage manuale 25min per PR distillation = unsustainable per run #6+
- `co02_validation.complete` valida solo struttura JSON, non fedeltà canonical Game

## 2. Skeleton shipped

`tools/py/swarm_canonical_validator.py` — skeleton 6 funzioni `NotImplementedError`:

| Function                              | Purpose                                                       |
| ------------------------------------- | ------------------------------------------------------------- |
| `parse_swarm_artifact()`              | Load swarm JSON output → SwarmClaim list                      |
| `verify_claim_canonical()`            | Cross-ref single claim vs `data/core/`                        |
| `detect_hallucinate_by_association()` | Pattern: real identifier + non-canonical attributes (8 cases) |
| `detect_reinvent_canonical_wheel()`   | Pattern: new framework when canonical pre-existing (2 cases)  |
| `aggregate_run_report()`              | Per-claim → run-level RunVerificationReport                   |
| `emit_verification_table_markdown()`  | Render embeddable table per distillation doc                  |

Dataclass: `SwarmClaim` + `VerificationResult` + `RunVerificationReport` + `ClaimStatus` literal.

## 3. Test corpus

Card [`M-2026-05-08-001 evo-swarm run #5 discarded claims`](../museum/cards/evo-swarm-run-5-discarded-claims.md) preserva 10 discarded items (8 hallucinated + 2 redundant) come canonical test corpus per validator unit test.

### Hallucinate-by-association (8 expected reject)

| #   | Swarm claim                                | Canonical reality                                  | Validator must catch                      |
| --- | ------------------------------------------ | -------------------------------------------------- | ----------------------------------------- |
| 1   | Abisso Vulcanico affixes "termico, sabbia" | biomes.yaml = "lava pressurizzata + bio-termica"   | Affix mismatch                            |
| 2   | dune_stalker biome=Abisso Vulcanico        | species.yaml:72 = `savana`                         | biome_affinity diff                       |
| 3   | echolocation come trait                    | default_parts.senses (parts ≠ trait)               | Category confusion                        |
| 4   | sand_digest come trait                     | default_parts.metabolism                           | Category confusion                        |
| 5   | thermal_resistance trait                   | Zero match canonical                               | Pure invention                            |
| 6   | substrate_grip trait                       | Zero match canonical (swarm flagged "proposto")    | Borderline (correct framing)              |
| 7   | Atollo Ossidiana = PARTIAL alias-only      | biomes.yaml:93 = PRIMARY (slug `atollo_obsidiana`) | Ortografia variant grep miss              |
| 8   | Stress framework new top-level             | hazard.stress_modifiers + stresswave esistenti     | Framework reinvent (cross with redundant) |

### Reinvent-canonical-wheel (2 expected reject)

| #   | Swarm claim                                      | Canonical pre-esistente                                      |
| --- | ------------------------------------------------ | ------------------------------------------------------------ |
| 9   | YAML schema location stress_modifiers nuovo file | biomes.yaml > <bioma> > hazard.stress_modifiers (20+ biomes) |
| 10  | Stress sistema nuovo proposto                    | stesso pattern stress_modifiers + stresswave runtime         |

### Verified-but-consistency-minor (5 expected accept-with-low-value-flag)

| #   | Swarm claim                          | Canonical match               | Validator behaviour |
| --- | ------------------------------------ | ----------------------------- | ------------------- |
| 11  | abisso_vulcanico esiste              | biomes.yaml entry presente    | Accept              |
| 12  | dune_stalker esiste                  | species.yaml:61               | Accept              |
| 13  | polpo_araldo_sinaptico esiste        | species.yaml genus Synaptopus | Accept              |
| 14  | impulsi_bioluminescenti trait esiste | glossary.json                 | Accept              |
| 15  | nodi_sinaptici_superficiali trait    | glossary.json                 | Accept              |

## 4. Gate criteria (proposed, master-dd verdict pendente)

```python
GATE_THRESHOLD = 0.30  # Reject merge se hallucination_ratio > soglia
```

Run #5 metric per gate eval:

- hallucinated 8/13 = 0.615 → **REJECT** (sopra soglia)
- redundant 2/13 = 0.154 → considera include in reject ratio?

Open question master-dd:

1. Threshold 0.30 too strict / too lax? (Run #5 = 0.54 = clearly above)
2. Redundant should count vs hallucinated separately o aggregato?
3. Verified-low-value (5/13 consistency-minor) = pass o flag attention?

## 5. Effort breakdown post master-dd verdict accept

| Phase                            | Effort    | Gate                            |
| -------------------------------- | --------- | ------------------------------- |
| Swarm-side `canonical_ref` field | 2-3h      | evo-swarm autonomous cross-repo |
| Game-side validator full impl    | 3-4h      | Sprint Q+ ticket                |
| Pipeline ETL integration         | 2h        | Sprint Q+ ticket                |
| Unit test corpus (15 cases card) | 1h        | Sprint Q+ included              |
| **Total cumulative**             | **8-10h** | post-Phase-B-accept             |

## 6. Action followup (post master-dd OD-022 verdict)

### Se accept

1. Implement full validator (~3-4h Game-side)
2. Coordinate swarm-side `canonical_ref` field addition (~2-3h)
3. Pipeline ETL integration (~2h)
4. Unit tests via test corpus (~1h)
5. Re-run swarm run #6 con gate active → expect ratio drop

### Se reject (kill swarm Atto 2 path)

1. Skeleton + pre-design doc shipped come learning archive only
2. Museum card M-2026-05-08-001 status `curated → rejected` lifecycle update
3. ZERO impl effort

### Se defer

1. Skeleton + pre-design doc shipped come bookmarked Sprint Q+ candidate
2. Re-eval post-Phase-B-accept (week 2026-05-14+)

## 7. Cross-ref

- OD-022 entry: [`OPEN_DECISIONS.md`](../../OPEN_DECISIONS.md#od-022-evo-swarm-pipeline-cross-verification-gate-pre-run-6)
- Museum card test corpus: [`docs/museum/cards/evo-swarm-run-5-discarded-claims.md`](../museum/cards/evo-swarm-run-5-discarded-claims.md)
- Run #5 distillation: [`docs/research/2026-05-08-evo-swarm-stress-mechanics-distillation.md`](2026-05-08-evo-swarm-stress-mechanics-distillation.md)
- Skeleton: [`tools/py/swarm_canonical_validator.py`](../../tools/py/swarm_canonical_validator.py)
- ADR-2026-05-07-auto-merge-authorization-l3 (test infra rules) — gate criteria reference

## 8. Status

**DRAFT pre-design preview** — pending master-dd OD-022 verdict accept/reject/defer.

Caveat completionist: pre-design preview shipped autonomous con explicit caveat. Skeleton non production. Test corpus preserved museum card. Zero info lost se reject (skeleton archive read-only).
