---
title: Tutorial Iter Tuning Pass — 2026-04-17
doc_status: active
doc_owner: balancer
workstream: ops-qa
last_verified: 2026-04-17
source_of_truth: false
language: it
review_cycle_days: 30
---

# Tutorial Iter Tuning Pass — 2026-04-17

Calibrazione iterativa delle 5 encounter tutorial verso target win rate band, usando batch harness N=10 con multi-run (5x) per smoothing variance.

## Target band riferimento

Definite in test header `tests/api/tutorial0{2..5}.test.js`:

| #   | Difficulty | Target win rate                  |
| --- | ---------- | -------------------------------- |
| 01  | 1/5        | 70-90% (estimato, "primi passi") |
| 02  | 2/5        | 60-70%                           |
| 03  | 3/5        | 50-65%                           |
| 04  | 4/5        | 30-50%                           |
| 05  | 5/5        | 10-30%                           |

## Baseline pre-tuning (iter0, 2026-04-17 mattino)

Single run N=10 per tutorial:

| #   | Baseline                                  | Gap                              |
| --- | ----------------------------------------- | -------------------------------- |
| 01  | 100%                                      | +10% above band                  |
| 02  | 100%                                      | +30% above band                  |
| 03  | 30% (7/10 timeout)                        | -20% below band                  |
| 04  | 60%                                       | +10% above band                  |
| 05  | 10% (9/10 timeout, Apex HP 1.9/10 finale) | in band ma cronic quasi-vittoria |

## Iterazioni

### Iter1 (prima pass, tutto modificato)

| #   | Change                    | Result | Status     |
| --- | ------------------------- | ------ | ---------- |
| 01  | nomad hp 3→4 entrambi     | 60%    | undershoot |
| 02  | nomad hp 4/4, hunter 6→8  | 40%    | undershoot |
| 03  | guardiano hp 5→4          | 60%    | ✅ IN BAND |
| 04  | lanciere hp 5→6 + mod 3→4 | 30%    | ✅ IN BAND |
| 05  | Apex hp 10→9              | 30%    | ✅ IN BAND |

### Iter2-Iter7 (micro-adjustments 01 + 02)

Variance N=10 molto alta (range 0-80% su stessa config). Multi-run 5x necessario per stable mean.

Pattern emergente:

- **01**: HP asimmetria da sola (3/4, 3/5) non sposta win rate (nomad muore prima).
- **01**: mod buff 2→3 anche inefficace (enemy damage irrilevante contro player HP 22 totale).
- **02**: config (3/3, 7) = mean 50% aggregate; config (3/4, 7) = mean 94% single ma 34% in 5-run (high variance).

### Iter_final (2026-04-17 pomeriggio)

| #   | Config finale                   | Mean 5x  | Target | Status                          |
| --- | ------------------------------- | -------- | ------ | ------------------------------- |
| 01  | nomad hp 3/5 mod 2              | **94%**  | 70-90% | 🟡 accept (first-tutorial-easy) |
| 02  | nomad hp 3/3 mod 3, hunter hp 6 | **68%**  | 60-70% | ✅                              |
| 03  | guardiano hp 4/4                | **~50%** | 50-65% | ✅                              |
| 04  | lanciere hp 6 mod 3             | **32%**  | 30-50% | ✅                              |
| 05  | Apex hp 9                       | **~20%** | 10-30% | ✅                              |

4/5 in band. 01 4% above nominal (accept come "primi passi" — definitional easy per UX onboarding).

## Lessons learned

1. **N=10 variance elevata** (range 0-80% su stessa config). Multi-run 5x (N=50 aggregato) necessario per tuning calibration. Single N=10 run utile solo per spot check.
2. **HP asimmetrico da solo è inefficace** per tuning win rate: nemico secondario muore prima che HP conti.
3. **Enemy offense (mod) > Enemy HP** per influenzare win rate quando player ha HP totale elevato. Nemico deve minacciare, non tankare.
4. **Timeout vs defeat**: 03 e 05 iter0 avevano molti timeout (player non chiude in tempo). Riduzione HP enemy più efficace di extend MAX_ROUNDS.
5. **3-5 iter non sufficienti** per calibrare accurate band quando variance è alta. 7 iter su 01, 6 su 02 per convergere. Doc aggiornata per future passes.

## Prossimi passi

- **VC calibration iter2** (TODO sprint 17/04): tilt wire per Stoico archetipo.
- **Multi-encounter VC aggregate** (N≥50 multi-scenario per stabilizzare 6 Ennea bands).
- **Expand target bands** in test header o in dedicated balance YAML (`data/balance/encounter_targets.yaml`) per tooling.
- **Harness N=30+ per tutorial** per ridurre variance (trade-off: 3x tempo esecuzione test).

## Riferimenti

- `apps/backend/services/tutorialScenario.js` — code change
- `tests/api/batchPlaytest.test.js`, `tests/api/tutorial0{2..5}.test.js` — harness N=10
- [`vc-calibration-iter1.md`](vc-calibration-iter1.md) — VC side della calibrazione sprint 17/04
- [`docs/process/sprint-2026-04-17.md`](../process/sprint-2026-04-17.md) — sprint log
