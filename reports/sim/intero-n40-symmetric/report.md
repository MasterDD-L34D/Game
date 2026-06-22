# Full-loop meta band-metrics

Runs: **40** | Completed: **21/40** | Policy: `greedy` | Branch: `cave_path`

> **RATIFIED (master-dd, L-069)** -- RATIFIED 2026-06-03 by master-dd (L-069): the working bands. Reversible (two-way door) -- revise when evidence warrants. Keep the design space healthy (Quality-Diversity); do not optimize to a single best run. GRAPH-MODE RE-RATIFIED 2026-06-04 by master-dd (#2603): with the real draft rosters + the cm3/hp2/dcAdd1 overlay, graph-mode completion lands ~0.66 (N=40 greedy 0.675 / ESFP 0.70 / INTJ 0.60), inside this 0.4-0.7 band -- the fallback-era wider 0.4-0.85 is superseded; completion_rate [0.4, 0.7] holds for both static and graph mode.

| Metric | Value | Band | In band |
|---|---|---|:---:|
| completion_rate | 0.525 | 0.4 - 0.7 | ✅ |
| roster_attrition | 0.583 | 0 - 1 | ✅ |
| economy_flow | drift 1.105 (pe 40.6, bp 149.1) | 0.5 - 2 | ✅ |
| relationship_progress | recruit 4.55, aff 1, mate 3.85 | composite | ✅ |
| offspring_viability | offspring 3.85 | >= 1 | ✅ |
| lineage_diversity | 5 crosses, dominant dune-stalker x nano-rust-bloom | >= 3 | ✅ |
| roster_composition | dominant APEX/HAZARD, 5 roles | >= 3 | ✅ |

> Note (economy_flow): PE earned + build-power drift; PI sink exercised (385 attempts)

## Personality axes (Opt 3 OUTPUT) -- N-sample evidence

2055 per-unit samples. Constants are PROPOSED (blend weights + stat bounds, #2679): this section is EVIDENCE for the N=40 ratification batch (incl. the J_P + formPulseVc E_I flags); master-dd ratifies, the batch never does.

| axis | n | mean | sd | min | max | neutral_rate |
| --- | --- | --- | --- | --- | --- | --- |
| symbiosis_predation | 2055 | 0.991 | 0.042 | 0.688 | 1.000 | 0.000 |
| explore_caution | 2055 | 0.631 | 0.208 | 0.500 | 1.000 | 0.709 |
| solitary_swarm | 2055 | 0.575 | 0.204 | 0.250 | 1.000 | 0.773 |
| memory_instinct | 2055 | 0.505 | 0.048 | 0.448 | 0.875 | 0.886 |
| agile_robust | 2055 | 0.479 | 0.075 | 0.140 | 0.735 | 0.672 |

Degenerate (all-5 neutral) rate: 0.000.
Dominant-axis histogram: symbiosis_predation 1867, solitary_swarm 188.
Collinearity (|r| >= 0.8): symbiosis_predation~memory_instinct r=-0.89.
Faction player (675): symbiosis_predation 1.00, explore_caution 0.64, solitary_swarm 0.62, memory_instinct 0.50, agile_robust 0.44.
Faction sistema (1380): symbiosis_predation 0.99, explore_caution 0.63, solitary_swarm 0.55, memory_instinct 0.51, agile_robust 0.50.

Per-run records: `runs.jsonl`. Aggregate: `summary.json`.
