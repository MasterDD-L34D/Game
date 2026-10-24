---
title: 'M7-#2 iter6 — hardcore damage curves verdict'
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
adr_refs:
  - ADR-2026-04-20-damage-scaling-curves
---

# M7-#2 iter6 — hardcore damage curves verdict

## TL;DR

**VERDICT: RED** — damage scaling curves shipped (Phase A+B+C+D) MA hardcore multiplier 1.4x insufficiente. Win rate 63.3% vs target band 15-25%.

| Metric       | Observed |  Target |   Delta |
| ------------ | -------: | ------: | ------: |
| win_rate     |    63.3% |  15-25% | +38pp ↑ |
| defeat_rate  |     0.0% |  40-55% | -40pp ↓ |
| timeout_rate |    36.7% |  15-25% | +12pp ↑ |
| K/D avg      |     2.42 | 0.6-0.9 |  +1.5 ↑ |

## Setup

- **Scenario**: `enc_tutorial_06_hardcore` (8p vs 6 enemy + 1 BOSS apex)
- **encounter_class**: `hardcore` (multiplier 1.4x, boss enrage 40% HP)
- **N**: 30 runs
- **Policy player**: greedy atk-closest + channel exploit (psionico vs corazzato)
- **MAX_ROUNDS**: 40
- **Backend**: port 3340 (isolato da demo :3334), commit post #1654+#1656

## Risultati aggregate

```json
{
  "N": 30,
  "win_rate": 0.633,
  "defeat_rate": 0.0,
  "timeout_rate": 0.367,
  "verdict": "RED",
  "turns_avg": 34.7,
  "turns_median": 37.0,
  "kd_avg": 2.42,
  "dmg_dealt_avg": 67.9,
  "dmg_taken_avg": 27.5,
  "players_alive_avg_on_win": 5.58
}
```

- 19 victory / 11 timeout / **0 defeat** in 30 run.
- Turns hist: 21-30 → 10 runs, 31-40 → 9 runs, **41+ timeout → 11 runs**.

## Root cause analysis

### 1. Damage asymmetry player >> enemy

- **Player damage dealt**: 67.9 avg (boss hp 40 + 5 enemy ≈ 80 pool → 85% coverage)
- **Player damage taken**: 27.5 avg su 8 PG × ~11 HP = 88 total → 31% coverage
- Ratio 2.47:1 — player overpowers despite 1.4x enemy multiplier.

### 2. Timeout stall pattern

11/30 timeout. Player avg 67.9 dmg (85% enemy HP) ma non finisce in 40 round. Boss hp 40 + guardia 4 (tank-heavy) = player chip dmg insufficient a chiudere.

**Mean turns on win**: ~28. **Mean turns on timeout**: ~41. Distribuzione bimodale → alcuni run chiudono rapidamente (KO boss lucky), altri stallano.

### 3. 0% defeat suggestive

Player AI (8 unit greedy) + damage in-channel psionico vs boss corazzato = focus-fire sempre funziona. Enemy mai killa TUTTI 8 PG. Suggerisce:

- Multiplier 1.4x non scala abbastanza offensive enemy
- Boss enrage 40% HP threshold = attiva a boss hp 16. Con player dmg 2pt/hit, boss vive ~20 round dopo enrage → enrage mod +1 troppo flebile
- 8v6 modulation = focus-fire concentrato > damage spread enemy

## Ipotesi correttive (M7-#2 Phase E o M8-hardcore-tune)

### Option A — Scale multiplier up

Bump hardcore: 1.4x → 1.8x. Rifire N=30, aspettato wr drop a 40-45%. Se ancora RED, 2.0x + enrage threshold 50%.

### Option B — Boss HP floor

Boss hp 40 → 55. Combined con enrage threshold 40% = enrage trigger a 22 HP, 20 round di enrage. Piu probabile defeat tank player.

### Option C — Reduce MAX_ROUNDS pressure

Timeout → defeat se player_alive < 50%. Non vale wr band ma forza decision pressure.

### Option D — Boss enrage bonus stronger

`enrage_mod_bonus` 1 → 3. Durante enrage, boss passa da mod 5 → mod 8, one-shot potential.

### Raccomandato

**A + D combo**: multiplier 1.8x + enrage_mod_bonus 3. Scale uniforme + boss drama late-fight.

## Decisione

**NON re-tune in questa sessione**. M7-#2 scope era:

1. ✅ ADR damage curves pubblicato
2. ✅ Runtime wiring (Phase B)
3. ✅ Encounter annotation (Phase C)
4. ✅ Harness verdict auto (Phase D)
5. ❌ Hardcore band centered — **iter6 RED, defer a M8 o M7-#2 Phase E**

ADR-2026-04-20 è correttamente implementato. Il bilancio **numerico** dei valori (multiplier 1.4x) è stato scelto come STARTING POINT, non calibrato su playtest. Iter6 è il PRIMO playtest post-wiring — conferma che il sistema funziona (verdict emesso correttamente, multiplier applicato runtime) ma che i NUMERI YAML vanno ritoccati.

## Next actions

| Azione                                                          | Priorità | Owner       |   ETA    |
| --------------------------------------------------------------- | :------: | ----------- | :------: |
| M7-#2 Phase E tune (A+D combo iter7)                            |    P1    | balance     | 1h batch |
| Validate enrage telemetry (does it fire?)                       |    P1    | engineering |  30min   |
| Tutorial batch N=30 per class (tutorial/tutorial_advanced/boss) |    P2    | balance     |    2h    |
| ADR-2026-04-20 update § "Phase E calibration"                   |    P2    | docs        |  30min   |

## Artifact

- Aggregate: `reports/calibration/m7_iter6_phase_c_d.json`
- JSONL per-run: `reports/calibration/m7_iter6_phase_c_d.jsonl`
- Command: `python3 tools/py/batch_calibrate_hardcore06.py --host http://localhost:3340 --n 30 --encounter-class hardcore`

## Annotazione metodologica

Iter6 dimostra il **valore** di Phase D (verdict automatico). Pre-Phase D, questo batch avrebbe richiesto lettura manuale di win_rate + confronto mentale con band. Ora verdict RED è stampato direttamente + bands incluse in report → ops-cycle più veloce, no ambiguity.

Pattern validato: **data-driven balance > ad-hoc eyeballing**.
