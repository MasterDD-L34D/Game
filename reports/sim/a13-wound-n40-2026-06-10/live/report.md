# Full-loop meta band-metrics

Runs: **36** | Completed: **33/36** | Policy: `greedy` | Branch: `cave_path`

> **RATIFIED (master-dd, L-069)** -- RATIFIED 2026-06-03 by master-dd (L-069): the working bands. Reversible (two-way door) -- revise when evidence warrants. Keep the design space healthy (Quality-Diversity); do not optimize to a single best run. GRAPH-MODE RE-RATIFIED 2026-06-04 by master-dd (#2603): with the real draft rosters + the cm3/hp2/dcAdd1 overlay, graph-mode completion lands ~0.66 (N=40 greedy 0.675 / ESFP 0.70 / INTJ 0.60), inside this 0.4-0.7 band -- the fallback-era wider 0.4-0.85 is superseded; completion_rate [0.4, 0.7] holds for both static and graph mode.

| Metric | Value | Band | In band |
|---|---|---|:---:|
| completion_rate | 0.917 | 0.4 - 0.7 | ❌ |
| roster_attrition | 0.48 | 0 - 1 | ✅ |
| economy_flow | drift 1.407 (pe 59.778, bp 228) | 0.5 - 2 | ✅ |
| relationship_progress | recruit 6.556, aff 1, mate 5.694 | composite | ✅ |
| offspring_viability | offspring 5.694 | >= 1 | ✅ |
| lineage_diversity | 5 crosses, dominant dune-stalker x nano-rust-bloom | >= 3 | ✅ |
| roster_composition | dominant HAZARD, 5 roles | >= 3 | ✅ |

> Note (economy_flow): PE earned + build-power drift; PI sink exercised (518 attempts)

## Personality axes (Opt 3 OUTPUT) -- N-sample evidence

2717 per-unit samples. Constants are PROPOSED (blend weights + stat bounds, #2679): this section is EVIDENCE for the N=40 ratification batch (incl. the J_P + formPulseVc E_I flags); master-dd ratifies, the batch never does.

| axis | n | mean | sd | min | max | neutral_rate |
| --- | --- | --- | --- | --- | --- | --- |
| symbiosis_predation | 2717 | 0.991 | 0.041 | 0.667 | 1.000 | 0.000 |
| explore_caution | 2717 | 0.629 | 0.207 | 0.500 | 1.000 | 0.714 |
| solitary_swarm | 2717 | 0.572 | 0.204 | 0.250 | 1.000 | 0.768 |
| memory_instinct | 2717 | 0.505 | 0.047 | 0.438 | 0.875 | 0.887 |
| agile_robust | 2717 | 0.483 | 0.075 | 0.140 | 0.735 | 0.670 |

Degenerate (all-5 neutral) rate: 0.000.
Dominant-axis histogram: symbiosis_predation 2467, solitary_swarm 250.
Collinearity (|r| >= 0.8): symbiosis_predation~memory_instinct r=-0.89.
Faction player (897): symbiosis_predation 1.00, explore_caution 0.64, solitary_swarm 0.61, memory_instinct 0.50, agile_robust 0.45.
Faction sistema (1820): symbiosis_predation 0.99, explore_caution 0.62, solitary_swarm 0.55, memory_instinct 0.51, agile_robust 0.50.

> A13 arm: **WOUND-LIVE (PRESSURE_PER_BIOME=1)**

### A13 wound exposure (evidence, not verdict)

- runs: 36 (completed 33, failed-on-retry 3)
- attempts: 287 (retries 15)
- wound exposure: 15/287 attempts (5.2%)
- first-attempt victory rate: 257/272 (94.5%)
- retry victory rate: 12/15 (80.0%) -- wounded retries: 15

| biome | attempts | wounded | victories |
| --- | --- | --- | --- |
| savana | 119 | 15 | 101 |
| canyons_risonanti | 34 | 0 | 34 |
| mezzanotte_orbitale | 34 | 0 | 34 |
| rovine_planari | 67 | 0 | 67 |
| caverna | 33 | 0 | 33 |

Per-run records: `runs.jsonl`. Aggregate: `summary.json`.
