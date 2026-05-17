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

- Iterations: **1500**
- Feature dims: ['mbti_t', 'mbti_n', 'archetype_idx']
- Bins per dim: **5** (total cells: 125)
- Fitness: synthetic (mock — production should wire `restricted_play.run_one`)

## Archive stats

- Cells filled: **75** / 125
- Coverage: **60.0%**
- Fitness max: 1.0000
- Fitness avg: 0.9850
- Fitness min: 0.8750

## Top 10 elites

| Cell      | Fitness |  hp | mod |  dc | mbti_t | mbti_n | archetype    |
| --------- | ------: | --: | --: | --: | -----: | -----: | ------------ |
| (1, 1, 4) |  1.0000 |  12 |   3 |  13 |  0.371 |  0.366 | `support`    |
| (2, 0, 0) |  1.0000 |  12 |   3 |  13 |  0.531 |  0.042 | `tank`       |
| (3, 2, 4) |  1.0000 |  12 |   3 |  13 |  0.602 |  0.561 | `support`    |
| (2, 1, 0) |  1.0000 |  12 |   3 |  13 |  0.538 |   0.27 | `tank`       |
| (1, 1, 2) |  1.0000 |  12 |   3 |  13 |  0.371 |  0.365 | `skirmisher` |
| (0, 4, 4) |  1.0000 |  12 |   3 |  13 |    0.0 |  0.952 | `support`    |
| (2, 0, 2) |  1.0000 |  12 |   3 |  13 |  0.531 |  0.042 | `skirmisher` |
| (3, 3, 0) |  1.0000 |  12 |   3 |  13 |  0.608 |  0.736 | `tank`       |
| (1, 3, 2) |  1.0000 |  12 |   3 |  13 |  0.344 |  0.712 | `skirmisher` |
| (4, 3, 4) |  1.0000 |  12 |   3 |  13 |  0.825 |  0.757 | `support`    |

## Convergence trajectory

| Iter | Fitness | Accepted | Coverage |
| ---: | ------: | :------: | -------: |
|    1 |  0.7222 |    ✅    |    15.2% |
|  376 |  1.0000 |    —     |    52.8% |
|  751 |  0.9167 |    —     |    56.8% |
| 1126 |  0.8889 |    —     |    58.4% |
| 1500 |  1.0000 |    —     |    60.0% |

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
