---
title: M6 iter2b baseline — 50% win rate hardcore-06 post-resistance wire
doc_status: active
doc_owner: master-dd
workstream: combat
last_verified: '2026-04-19'
source_of_truth: false
language: it
review_cycle_days: 30
related:
  - 'docs/playtest/2026-04-19-m6-resistance-spike-evidence.md'
  - 'docs/architecture/resistance-engine-gap.md'
  - 'docs/adr/ADR-2026-04-19-resistance-convention.md'
---

# M6 iter2b baseline — hardcore-06 post-resistance

**Data**: 2026-04-19
**Trigger**: post merge M6-#1 (#1639) + M6-#2 (#1640) + hotfix #1641
**Outcome**: 50% win rate, caveat channel hardcoded "fisico"

## Summary

Post implementazione resistance engine Node + species archetype field + hotfix bug scope, batch calibration hardcore-06 N=10 mostra:

| Metric        | Baseline pre-M6 | Spike flat -50% | **iter2b M6 real** | Target design |
| ------------- | :-------------: | :-------------: | :----------------: | :-----------: |
| N             |       13        |       15        |       **10**       |       -       |
| Win rate      |      84.6%      |       20%       |      **50%**       |    15-25%     |
| Delta vs base |        —        |     -64.6pp     |    **-34.6pp**     |       -       |
| Timeouts      |       low       |      12/15      |        5/10        | expected low  |
| Defeats       |       low       |        0        |       **0**        | expected some |
| turns_avg     |        —        |       40+       |        33.8        |       -       |
| dmg_dealt_avg |        —        |       ~60       |        63.5        |       -       |
| dmg_taken_avg |        —        |       ~35       |        23.6        |       -       |
| kd_avg        |        —        |       1.6       |        3.06        |       -       |

## Accept rationale

**Iter2b NON è nel target band 15-25%**. Accept come baseline documentato comunque perché:

1. **Channel hardcoded "fisico"** (M6-#1 wire, no routing dinamico). Tuning ora = rumore.
2. **41/84 species archetype `adattivo`** neutral → metà dataset fuori dalla leva
3. **0 defeat con 5 timeout** = problema qualitativo peggiore di win rate (combat stall, non sfida)
4. **Ship M6-#4 (ADR kill Python) + open M6-#1b** ha più ROI che iter3 tuning sul parziale

## Cosa sta succedendo (analisi qualitativa)

Evidence pattern iter2b per-run:

- **Victories (5)**: 20-32 turns, player-lose 1-2, boss hp=0 → combat chiuso correttamente
- **Timeouts (5)**: 41 turns, boss hp residuo 3-32, player-lose 1-4 → stall al cap
- **Defeats (0)**: nessuno → resistance aggrava durata, non letalità

**Interpretazione**: resistance su fisico riduce damage output giocatore di ~15-20% aggregato (solo 2/6 nemici corazzato × 20% resist su fisico). Player comunque mai letali. Boss semplicemente più lento da kill.

Feedback Flint (review 2026-04-19):

> "50% win + 50% timeout = non è 50% difficoltà, è **50% stall**. Giocatore finale vuole tensione (= defeat possibile), non duration. Metric sbagliata."

## Decision

**Accept + pivot**:

1. ✅ iter2b 50% = baseline documentato (questo file)
2. 🔜 M6-#4 ADR kill Python engine (runtime canonical = Node)
3. 🔜 M6-#1b action.channel routing (pipe action → performAttack firma)
4. ⏸ Iter3 tuning DEFERRED finché routing live (tuning su sistema completo, non parziale)

## Follow-up atteso iter3 (post M6-#1b)

Con channel routing live:

- Player attack ABILITY → `action.channel = 'psionico'` (se ability psi)
- Target corazzato resist psionico 120 → delta -20 → damage amplify x1.2
- Target psionico resist psionico 70 → delta +30 → damage reduction x0.7

Expected effect aggregate: tensione tactica reale. Player sceglie match-up favorevole → wins veloci. Match-up sbagliato → defeat concreti.

**Target rivisto iter3** (post Flint):

- Win: 30-40%
- Defeat: 40-50% (**non 0 come iter2b**)
- Timeout: 10-20% (**non 50% stall**)

## Data

- `reports/calibration/m6_iter2b.json` (aggregate)
- `reports/calibration/m6_iter2b.jsonl` (per-run 10)
- `reports/calibration/m6_iter2b.log` (batch output log)

## Riferimenti

- [M6 spike evidence (20%)](2026-04-19-m6-resistance-spike-evidence.md)
- [Gap Node-Python](../architecture/resistance-engine-gap.md)
- [ADR resistance convention](../adr/ADR-2026-04-19-resistance-convention.md)
- Flint advisor review 2026-04-19: "50% = stall non difficoltà. Kill iter3 tuning su sistema incompleto."
