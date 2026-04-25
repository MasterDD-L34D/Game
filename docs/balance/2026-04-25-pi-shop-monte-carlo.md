---
title: PI Shop Monte Carlo — N=1000 (2026-04-25)
doc_status: active
doc_owner: claude-code
workstream: dataset-pack
last_verified: '2026-04-25'
source_of_truth: false
language: it
review_cycle_days: 30
tags:
  - economy
  - pi-shop
  - monte-carlo
  - balance
  - generated
---

# PI Shop Monte Carlo Sim — N=1000

Closes Gap 4 (PI shop budget vs cost-curve unstudied) from
[`docs/balance/macro-economy-source-sink.md`](macro-economy-source-sink.md).

## Cost matrix (from `data/packs.yaml`)

| Item                   | Cost (PI) | Cap |
| ---------------------- | --------: | :-: |
| `starter_bioma`        |         1 |  1  |
| `cap_pt`               |         2 |  1  |
| `guardia_situazionale` |         2 |  —  |
| `sigillo_forma`        |         2 |  —  |
| `trait_T1`             |         3 |  —  |
| `modulo_tattico`       |         3 |  —  |
| `job_ability`          |         4 |  —  |
| `trait_T2`             |         6 |  —  |
| `ultimate_slot`        |         6 |  —  |
| `trait_T3`             |        10 |  —  |

## Budget tiers

- **baseline**: 7 PI
- **veteran**: 9 PI
- **elite**: 11 PI

## Strategy comparison

| Strategy   | Items avg | Items median | Residual avg | Stockpile rate |
| ---------- | --------: | -----------: | -----------: | -------------: |
| `cheapest` |      4.38 |          4.0 |            0 |           0.0% |
| `power`    |         2 |          2.0 |            0 |           0.0% |
| `random`   |      2.96 |          3.0 |         0.12 |          1.59% |

## Item popularity (top per strategy)

### `cheapest`

| Item                   | Bought | Share |
| ---------------------- | -----: | ----: |
| `guardia_situazionale` |   2375 | 54.3% |
| `starter_bioma`        |   1000 | 22.9% |
| `cap_pt`               |   1000 | 22.9% |

### `power`

| Item            | Bought | Share |
| --------------- | -----: | ----: |
| `trait_T2`      |    948 | 47.4% |
| `starter_bioma` |    729 | 36.5% |
| `trait_T1`      |    271 | 13.6% |
| `trait_T3`      |     52 |  2.6% |

### `random`

| Item                   | Bought | Share |
| ---------------------- | -----: | ----: |
| `starter_bioma`        |    714 | 24.1% |
| `guardia_situazionale` |    405 | 13.7% |
| `sigillo_forma`        |    372 | 12.6% |
| `modulo_tattico`       |    311 | 10.5% |
| `trait_T1`             |    302 | 10.2% |
| `cap_pt`               |    299 | 10.1% |
| `job_ability`          |    242 |  8.2% |
| `ultimate_slot`        |    167 |  5.6% |
| `trait_T2`             |    148 |  5.0% |
| `trait_T3`             |      3 |  0.1% |

## Per-tier breakdown

### `cheapest` strategy

| Tier     | Items avg | Items median | Stockpile avg |
| -------- | --------: | -----------: | ------------: |
| baseline |         4 |            4 |             0 |
| veteran  |         5 |            5 |             0 |
| elite    |         6 |          6.0 |             0 |

### `power` strategy

| Tier     | Items avg | Items median | Stockpile avg |
| -------- | --------: | -----------: | ------------: |
| baseline |         2 |            2 |             0 |
| veteran  |         2 |            2 |             0 |
| elite    |         2 |          2.0 |             0 |

### `random` strategy

| Tier     | Items avg | Items median | Stockpile avg |
| -------- | --------: | -----------: | ------------: |
| baseline |      2.76 |            3 |          0.12 |
| veteran  |      3.33 |          3.0 |          0.11 |
| elite    |      3.79 |            4 |          0.23 |

## Sources

- Pattern: Machinations.io Monte Carlo simulation
- Cost data: `data/packs.yaml`
- Companion: `docs/balance/macro-economy-source-sink.md`
- Agent: `.claude/agents/economy-design-illuminator.md`
