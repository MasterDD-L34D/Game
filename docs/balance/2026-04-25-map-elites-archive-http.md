---
title: MAP-Elites Balance Archive (2026-04-25)
doc_status: active
doc_owner: claude-code
workstream: dataset-pack
last_verified: '2026-04-25'
source_of_truth: false
language: it
review_cycle_days: 30
tags:
  - balance
  - map-elites
  - quality-diversity
  - generated
---

# MAP-Elites Balance Archive

Quality-Diversity illumination of the build design space. Closes [balance-illuminator P1](.claude/agents/balance-illuminator.md). Pattern: Mouret & Clune 2015 + Fontaine 2019 (FDG).

## Run config

- Iterations: **200**
- Feature dims: ['mbti_t', 'mbti_n', 'archetype_idx']
- Bins per dim: **3** (total cells: 27)
- Fitness: **http** (live backend via `restricted_play.run_one`)

## Archive stats

- Cells filled: **23** / 27
- Coverage: **85.2%**
- Fitness max: 1.0000
- Fitness avg: 0.6812
- Fitness min: 0.3333

## Top 10 elites

| Cell      | Fitness |  hp | mod |  dc | mbti_t | mbti_n | archetype    |
| --------- | ------: | --: | --: | --: | -----: | -----: | ------------ |
| (2, 1, 2) |  1.0000 |   8 |   5 |  10 |    1.0 |  0.631 | `support`    |
| (2, 2, 1) |  1.0000 |   9 |   4 |  10 |  0.792 |  0.854 | `skirmisher` |
| (2, 1, 1) |  1.0000 |  10 |   5 |  11 |  0.947 |  0.634 | `skirmisher` |
| (0, 0, 2) |  1.0000 |  15 |   5 |  10 |  0.187 |    0.0 | `support`    |
| (1, 0, 2) |  0.6667 |  11 |   4 |  10 |  0.484 |  0.063 | `support`    |
| (0, 1, 0) |  0.6667 |   9 |   3 |  14 |  0.058 |  0.507 | `tank`       |
| (0, 0, 1) |  0.6667 |   9 |   4 |  13 |   0.07 |  0.091 | `skirmisher` |
| (1, 2, 0) |  0.6667 |   8 |   5 |  14 |  0.397 |  0.976 | `tank`       |
| (1, 1, 2) |  0.6667 |  16 |   2 |  12 |  0.419 |  0.541 | `support`    |
| (2, 0, 2) |  0.6667 |  12 |   2 |  13 |  0.715 |  0.072 | `support`    |

## Convergence trajectory

| Iter | Fitness | Accepted | Coverage |
| ---: | ------: | :------: | -------: |
|    1 |  0.3333 |    ✅    |    40.7% |
|   51 |  0.3333 |    ✅    |    66.7% |
|  101 |  0.3333 |    —     |    66.7% |
|  151 |  0.3333 |    ✅    |    81.5% |
|  200 |  0.3333 |    —     |    85.2% |

## How to read

- **Coverage** = breadth of viable design space discovered. Low (<30%) means the engine struggled to find diverse builds; high (>70%) means the design space is broad and the fitness function permissive.
- **Fitness max** = single best build found. Compare to fitness avg: large gap = some cells dominate, small gap = uniform competence.
- **Convergence trajectory** = acceptance rate over iterations. Drops naturally as the archive fills (most mutations no longer beat the elite).

## Limits + next steps

- **Synthetic fitness only**: replace `synthetic_fitness` with a wrapper around `restricted_play.run_one` to evaluate against the real combat engine (~+2h, separate PR). Until then, this is design-space sketching, not balance verdict.
- **Single-objective**: extend to Pareto MAP-Elites (Cully 2021) to trade off fitness vs diversity vs novelty.
- **Variance**: re-run with multiple seeds and aggregate coverage to distinguish algorithm-stable patterns from RNG luck.

## Sources

- [Mouret & Clune 2015 — Illuminating search spaces](https://arxiv.org/abs/1504.04909)
- [Fontaine et al. 2019 — Mapping Hearthstone Deck Spaces](https://arxiv.org/abs/1904.10656)
- [Cully 2021 — Quality-Diversity Optimization survey](https://arxiv.org/abs/2012.04322)
- Agent: `.claude/agents/balance-illuminator.md`
