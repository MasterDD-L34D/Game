# Full-loop meta band-metrics

Runs: **40** | Completed: **26/40** | Policy: `greedy` | Branch: `cave_path`

> **RATIFIED (master-dd, L-069)** -- RATIFIED 2026-06-03 by master-dd (L-069): the working bands. Reversible (two-way door) -- revise when evidence warrants. Keep the design space healthy (Quality-Diversity); do not optimize to a single best run. GRAPH-MODE RE-RATIFIED 2026-06-04 by master-dd (#2603): with the real draft rosters + the cm3/hp2/dcAdd1 overlay, graph-mode completion lands ~0.66 (N=40 greedy 0.675 / ESFP 0.70 / INTJ 0.60), inside this 0.4-0.7 band -- the fallback-era wider 0.4-0.85 is superseded; completion_rate [0.4, 0.7] holds for both static and graph mode.

| Metric | Value | Band | In band |
|---|---|---|:---:|
| completion_rate | 0.65 | 0.4 - 0.7 | ✅ |
| roster_attrition | 0.442 | 0 - 1 | ✅ |
| economy_flow | drift 1.095 (pe 52.6, bp 192.9) | 0.5 - 2 | ✅ |
| relationship_progress | recruit 5.925, aff 1, mate 5 | composite | ✅ |
| offspring_viability | offspring 5 | >= 1 | ✅ |
| lineage_diversity | 5 crosses, dominant dune-stalker x nano-rust-bloom | >= 3 | ✅ |
| roster_composition | dominant APEX/HAZARD, 5 roles | >= 3 | ✅ |

> Note (economy_flow): PE earned + build-power drift; PI sink exercised (502 attempts)

## Personality axes (Opt 3 OUTPUT) -- N-sample evidence

2523 per-unit samples. Constants are PROPOSED (blend weights + stat bounds, #2679): this section is EVIDENCE for the N=40 ratification batch (incl. the J_P + formPulseVc E_I flags); master-dd ratifies, the batch never does.

| axis | n | mean | sd | min | max | neutral_rate |
| --- | --- | --- | --- | --- | --- | --- |
| symbiosis_predation | 2523 | 0.990 | 0.046 | 0.667 | 1.000 | 0.000 |
| explore_caution | 2523 | 0.627 | 0.205 | 0.500 | 1.000 | 0.717 |
| solitary_swarm | 2523 | 0.579 | 0.207 | 0.250 | 1.000 | 0.765 |
| memory_instinct | 2523 | 0.506 | 0.052 | 0.430 | 0.875 | 0.883 |
| agile_robust | 2523 | 0.478 | 0.077 | 0.140 | 0.735 | 0.661 |

Degenerate (all-5 neutral) rate: 0.000.
Dominant-axis histogram: symbiosis_predation 2294, solitary_swarm 229.
Collinearity (|r| >= 0.8): symbiosis_predation~memory_instinct r=-0.91.
Faction player (856): symbiosis_predation 1.00, explore_caution 0.63, solitary_swarm 0.62, memory_instinct 0.50, agile_robust 0.44.
Faction sistema (1667): symbiosis_predation 0.99, explore_caution 0.62, solitary_swarm 0.56, memory_instinct 0.51, agile_robust 0.50.

Per-run records: `runs.jsonl`. Aggregate: `summary.json`.
