---
title: 'M7-#2 iter7 — Phase E hardcore tune verdict'
workstream: ops-qa
category: playtest
status: published
owner: balance
created: 2026-04-20
tags:
  - calibration
  - hardcore
  - damage-scaling
  - ADR-2026-04-20
  - M7-2
  - phase-e
  - parked
adr_refs:
  - ADR-2026-04-20-damage-scaling-curves
---

# M7-#2 iter7 — Phase E hardcore tune verdict (parked)

## TL;DR

**VERDICT: RED** (direzionalmente giusto, ma structural fix required). **Multiplier knob exhausted.**

Phase E tune (hardcore 1.4→1.8, boss 1.6→2.0, enrage_mod_bonus 1→3) ridotto win_rate 63.3→33.3% (-30pp ✓) MA timeout_rate raddoppiato 36.7→66.7% (+30pp) e defeat_rate stagnante 0%. Non in band hardcore 15-25% (+8pp win_rate over).

Per Flint kill-60 directive: **no 3rd iteration**. Park con structural fix roadmap M9.

## Comparison iter6 vs iter7

| Metric        | iter6 |     iter7 |  Target | Direction                 |
| ------------- | ----: | --------: | ------: | ------------------------- |
| win_rate      | 63.3% | **33.3%** |  15-25% | ↓ -30pp (still +8pp over) |
| defeat_rate   |  0.0% |      0.0% |  40-55% | no change ❌              |
| timeout_rate  | 36.7% | **66.7%** |  15-25% | ↑ +30pp worse ❌          |
| K/D avg       |  2.42 |      2.38 | 0.6-0.9 | flat                      |
| turns_avg     |  34.7 |      37.9 |     n/a | ↑ 3 rounds                |
| dmg_dealt_avg |  67.9 |      66.1 |     n/a | flat                      |
| dmg_taken_avg |  27.5 |      28.6 |     n/a | flat                      |

### Outcome distribution

iter6: 19 V / 0 L / 11 T
iter7: 10 V / 0 L / **20 T** ← stalemate pattern amplificato

### Turns histogram (post Codex P2 fix: aggiunto bucket 41+)

| Bucket  |  iter6 |  iter7 |
| ------- | -----: | -----: |
| 21-30   |     10 |      4 |
| 31-40   |      9 |      5 |
| **41+** | **11** | **21** |

Bucket 41+ = MAX_ROUNDS esaurito. iter7 21/30 run (70%) chiudono ultimo round — deadlock pattern inequivocabile.

## Root cause analysis

### 1. Damage amplification works but not enough

Boss mod 5 → 9 effective (iter6: 7, iter7: 9). Enrage attiva (threshold 40% HP) ma enrage_mod_bonus +3 arriva quando boss quasi morto. Player HP pool 8 × ~11 = 88 total preserva 4+ players alive sempre.

### 2. Timeout stalemate = combat deadlock

- Player non finisce boss HP 40 + 3-guardia in 40 round
- Enemy non KO entire 8-player party
- Risultato: chip damage mutuo indefinito

iter7 timeout 67% significa che 2/3 run finiscono MAX_ROUNDS senza winner. Non è gameplay — è deadlock system.

### 3. Player damage pool > enemy kill rate

Player 8 × mod 3 × hit_rate 50% × 40 rounds = 480 DPS potenziale.
Enemy 6 × mod 9 × hit_rate 40% × 40 rounds = 864 DPS potenziale **split su 8 target** = 108 per target effettivo.

Enemy DPS > player DPS, MA player HP pool (88 concentrated) > enemy HP pool (40 boss + 2×9 elite + 3×4 minion = 70). Player muore teoricamente ma party size concentra danni.

**Il problema NON è enemy damage — è que l'enemy damage è disperso su team resiliente.**

### 4. Multiplier knob exhausted

| Iter  | hardcore mult | boss mult | enrage |    wr | defeat |
| ----- | ------------: | --------: | -----: | ----: | -----: |
| iter6 |          1.4x |      1.6x |     +1 | 63.3% |     0% |
| iter7 |          1.8x |      2.0x |     +3 | 33.3% |     0% |

Linear tune mult→wr correlation exists, ma defeat_rate stuck a zero. Continua scaling mult porterebbe wr→0% e defeat_rate resta 0%.

**Conclusione Flint (sustained kill-60)**: Feature wiring works, il problema è structural non numerico. Stop multiplier tuning.

## Structural fixes candidati (M9 scope)

### Option F — MAX_ROUNDS + timeout=defeat

Ridurre MAX_ROUNDS 40 → 25. Timeout → "partita persa per inazione" (treat as defeat). Forza decision pressure. **Estimated impact**: trasformerà 67% timeout in ~50% defeat. Target band hardcore raggiungibile.

### Option G — Concentrate enemy aggro

AI enemy `focus_fire` lock su tank lowest HP invece spread target. Kills damage asymmetry su team tanky. **Estimated impact**: defeat_rate +20-30pp.

### Option H — Reduce player HP pool

Vanguard hp 14 → 11 (-21%), skirmisher hp 10 → 8 (-20%). Team pool 88 → 74 (-16%). Player meno resiliente, boss damage conta di più. **Estimated impact**: defeat_rate +15-25pp, ma breaking change.

### Option I — Boss HP ceiling + dice_bonus

Boss hp 40 → 32 (-20%) così non stalla a chip. Boss enrage_damage_dice_bonus 0 → +1 (critical ora one-shot vanguard). **Estimated impact**: wr ↑ (boss muore prima) ma defeat ↑ (one-shot pattern). Net balance sconosciuto.

### Recommended per M9

**F primary** (timeout=defeat) — single-file change, low-risk. Poi iter8 N=30 valida.
**G secondary** se F insufficient — AI policy change, medium complexity.

## Decisione sessione 2026-04-20

**Park M7-#2 Phase E HERE**. Non 3rd iter.

Scope chiuso: ADR-2026-04-20 A+B+C+D+E implementati + calibrated. Feature wiring works (verdict harness validates). Numbers need structural fix, non più tuning.

### Next session cycle

1. M8 Plan-Reveal P0 (in progress #1658) finish merge
2. M9 structural fix F (timeout=defeat): 2-3h harness update + backend MAX_ROUNDS config
3. Re-baseline iter8 hardcore batch

## Artifact

- Aggregate: `reports/calibration/m7_iter7_phase_e.json`
- JSONL per-run: `reports/calibration/m7_iter7_phase_e.jsonl`
- Command: `python3 tools/py/batch_calibrate_hardcore06.py --host http://localhost:3340 --n 30 --encounter-class hardcore --out reports/calibration/m7_iter7_phase_e.json`

## Lesson

1. **Multiplier knob plateau**: scaling lineare enemy dmg riduce wr ma non muove defeat. Necessaria pressione structural.
2. **Timeout treated as outcome**: 40 MAX_ROUNDS + focus-fire stall = deadlock system. Next-gen harness deve penalizzare stalemate.
3. **Flint kill-60 validated**: 2 iter erano sufficient per diagnose. 3rd iter = wasted cycle. Parking disciplined ship value, non perfection.
4. **Verdict harness ROI persistent**: auto-emesso GREEN/AMBER/RED, nessun eyeballing. Pattern data-driven consolidato.
