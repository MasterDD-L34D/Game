---
title: H1 validation aggressive profile — utility brain oscillation confirmed
workstream: ops-qa
category: playtest
doc_status: active
source_of_truth: true
language: it
last_verified: '2026-05-09'
tags: [ai, balance, calibration, utility-brain, oscillation, validation, fase2]
---

# H1 validation: utility brain oscillation confirmed (aggressive profile)

Resume trigger PR #2143 RCA: validate H1 (utility brain retreat picks) vs H2 (move blocked pathfinding) vs H3 (threat_passivity threshold) hypotheses.

Method: `tests/smoke/ai-driven-sim.js` extended con `sistema_decision` event capture (FASE 2.x). Run `tools/sim/batch-ai-runner.js --seed-count 20 --concurrency 2 --profiles aggressive --max-rounds 40` su tunnel `nor-shot-minolta-config`.

## Result: H1 STRONGLY SUPPORTED

20/20 runs complete: **10 victory + 10 timeout** (50% WR, consistent N=43 baseline 53.5%).

**Total sistema decisions captured: 4086 events across 20 runs** (avg 204 events/run).

### Action breakdown

| Action  |     All runs | Victory (10) | Timeout (10) |
| ------- | -----------: | -----------: | -----------: |
| move    | 3878 (94.9%) | 1408 (91.9%) | 2470 (96.7%) |
| attack  |   208 (5.1%) |   124 (8.1%) |    84 (3.3%) |
| retreat |            0 |            0 |            0 |
| skip    |            0 |            0 |            0 |

**Sistema attacks 5.1% del tempo**. Victory cohort 8.1% vs timeout 3.3% — timeout runs have **2.5× FEWER attacks** despite 1.7× more total events. Sistema doesn't damage the player enough to lose, but doesn't kill enemies either → stalemate.

### ia_rule split

| Rule       |      Victory |      Timeout |   % timeout |
| ---------- | -----------: | -----------: | ----------: |
| UTILITY_AI | 1432 (93.5%) | 2038 (79.8%) |     -13.7pp |
| REGOLA_001 |   100 (6.5%) |  516 (20.2%) | **+13.7pp** |

REGOLA_001 fires **3× more often in timeout runs** (20.2% vs 6.5%). Legacy fallback engages when utility brain returns suboptimal scores or fails to commit.

### Position delta sampling — OSCILLATION SMOKING GUN

Last 10 rounds di 3 timeout runs sample (Sistema deltas):

```
Run timeout 1 (late):
  (+0,-1)/move/REGOLA → (+0,+1)/move/UTILITY → (+0,-1)/move/REGOLA → (+0,+1)/move/UTILITY...

Run timeout 2 (late):
  (+0,+1)/move/UTILITY → (+0,-1)/move/REGOLA → (+0,+1)/move/UTILITY → (+0,-1)/move/REGOLA...

Run timeout 3 (late):
  (+0,+0)/attack/UTILITY → (+0,+1)/move/UTILITY × 4 → (+0,-1)/move/REGOLA → (+0,+1)/move/UTILITY × 4
```

**Net displacement zero**. Two Sistema units alternate via different rule paths (REGOLA_001 vs UTILITY_AI), producing 1-tile up/down oscillation. Player AI minimal cannot close gap because Sistema is "moving" but not progressing.

This **REPLICATES** the bug documented in `ai_profiles.yaml`:

```yaml
# 2026-04-29 fix utilityBrain oscillation (action-aware TargetHealth/SelfHealth +
# additive scoring) → kill-switch ripristinato a true. Apex tutorial_05 verificato
# monotonic forward 5→4→3→2 (range scout). Vedi docs/reports/2026-04-29-utility-ai-oscillation-bug.md.
```

**Il fix 2026-04-29 NON funziona nel profilo aggressive enc_tutorial_01**. La oscillation persists.

## H1/H2/H3 verdict

| Hypothesis                  |          Status           | Evidence                                                                                                                            |
| --------------------------- | :-----------------------: | ----------------------------------------------------------------------------------------------------------------------------------- |
| **H1 utility brain causal** | ✅ **STRONGLY SUPPORTED** | UTILITY_AI dominant (85% all runs); timeout cohort REGOLA_001 fires 3× more often = utility fallback to legacy when scoring fails   |
| **H2 stepTowards block**    |      ⚠️ **PARTIAL**       | Position deltas show valid moves (no skip/null returns). Issue is OSCILLATION not pathfinding hard-block                            |
| **H3 threat_passivity**     |      ⚠️ **PARTIAL**       | Cannot isolate without threat_index telemetry capture. Threshold=2 may contribute to alternation between approach/retreat decisions |

**Primary cause confirmed**: utility brain bidirectional oscillation between two Sistema units, alternating rule paths (UTILITY_AI vs REGOLA_001). 2026-04-29 oscillation fix incomplete for multi-unit kite scenarios.

## Knob priority update

Pre-validation PR #2143 priority:

1. K1 retreat_hp_pct 0.15 → 0.25
2. K2 kite_buffer 0 → 1
3. K3 use_utility_brain false (ablation)

**Post-validation revised priority** (based on oscillation evidence):

1. **K3 use_utility_brain false** (ablation) — DIRECT TEST of root cause. Most confident hypothesis confirmation. ~30min N=20 run.
2. **K1 retreat_hp_pct 0.15 → 0.25** — secondary, may not address oscillation but reduces stalemate via forced repositioning
3. **K2 kite_buffer 0 → 1** — tertiary, widens distance gap

Plus NEW knob proposal:

4. **K4 score normalization audit** — review `utilityBrain.js` action-aware scoring (TargetHealth/SelfHealth quadratic_inverse). Oscillation suggests two unit's utility scores swap signs based on current position, causing alternation. Fix: add stickiness term (last_action bonus +5%) or commit-window (don't reverse direction within 2 rounds).

## SPRT plan refined

H0: aggressive (utility ON) WR ≤ 0.55 vs H1: aggressive (utility OFF, K3) WR ≥ 0.85.

Practical N=40:

```bash
TUNNEL=https://<host>.trycloudflare.com node tools/sim/batch-ai-runner.js \
  --seed-count 40 --concurrency 2 --profiles aggressive --max-rounds 40
```

Then disable utility on aggressive (edit `ai_profiles.yaml` `use_utility_brain: false`) + re-run + compare:

- ΔWR > 30pp → K3 confirmed → patch ai_profiles.yaml + ship
- ΔWR < 10pp → utility brain not main cause → escalate K4 (oscillation source)
- ΔWR 10-30pp → partial fix → combine K3 + K4

## Files

- Capture extension: `tests/smoke/ai-driven-sim.js` (`sistema_decision` log per round)
- Batch dir: `C:/tmp/ai-sim-runs/batch-2026-05-09T12-24-42-149Z/`
- 20 JSONL runs (4086 sistema events total)
- Aggregate via `python` ad-hoc (no shipped tool yet — TODO `tools/sim/sistema-decision-aggregate.js`)

## Cross-ref

- PR #2143 balance-illuminator RCA (initial 3 knobs)
- PR #2142 FASE 2 batch runner
- PR #2141 FASE 1 harness baseline
- `apps/backend/services/ai/utilityBrain.js` (TargetHealth/SelfHealth scoring)
- `apps/backend/services/ai/declareSistemaIntents.js:94` (per-actor profile resolution)
- `packs/evo_tactics_pack/data/balance/ai_profiles.yaml` v0.2.0
- `docs/reports/2026-04-29-utility-ai-oscillation-bug.md` (claim fixed — falsified by this validation)

## Resume triggers

> _"esegui K3 ablation — set ai_profiles.yaml aggressive use_utility_brain false + N=40 re-run + compare WR delta"_

> _"esegui K4 audit — review utilityBrain.js scoring + propose stickiness term"_

> _"esegui MAP-Elites K3 × K4 grid (utility on/off × stickiness 0/+5%/+10%)"_
