# Full-loop meta band-metrics

Runs: **40** | Completed: **36/40** | Policy: `greedy` | Branch: `cave_path`

> **RATIFIED (master-dd, L-069)** -- RATIFIED 2026-06-03 by master-dd (L-069): the working bands. Reversible (two-way door) -- revise when evidence warrants. Keep the design space healthy (Quality-Diversity); do not optimize to a single best run. GRAPH-MODE RE-RATIFIED 2026-06-04 by master-dd (#2603): with the real draft rosters + the cm3/hp2/dcAdd1 overlay, graph-mode completion lands ~0.66 (N=40 greedy 0.675 / ESFP 0.70 / INTJ 0.60), inside this 0.4-0.7 band -- the fallback-era wider 0.4-0.85 is superseded; completion_rate [0.4, 0.7] holds for both static and graph mode.

| Metric | Value | Band | In band |
|---|---|---|:---:|
| completion_rate | 0.9 | 0.4 - 0.7 | ❌ |
| roster_attrition | 0.496 | 0 - 1 | ✅ |
| economy_flow | drift 1.438 (pe 58.6, bp 224.1) | 0.5 - 2 | ✅ |
| relationship_progress | recruit 6.425, aff 1, mate 5.625 | composite | ✅ |
| offspring_viability | offspring 5.625 | >= 1 | ✅ |
| lineage_diversity | 5 crosses, dominant dune-stalker x nano-rust-bloom | >= 3 | ✅ |
| roster_composition | dominant HAZARD, 5 roles | >= 3 | ✅ |

> Note (economy_flow): PE earned + build-power drift; PI sink exercised (566 attempts)

## Personality axes (Opt 3 OUTPUT) -- N-sample evidence

3001 per-unit samples. Constants are PROPOSED (blend weights + stat bounds, #2679): this section is EVIDENCE for the N=40 ratification batch (incl. the J_P + formPulseVc E_I flags); master-dd ratifies, the batch never does.

| axis | n | mean | sd | min | max | neutral_rate |
| --- | --- | --- | --- | --- | --- | --- |
| symbiosis_predation | 3001 | 0.991 | 0.041 | 0.688 | 1.000 | 0.000 |
| explore_caution | 3001 | 0.632 | 0.209 | 0.500 | 1.000 | 0.707 |
| solitary_swarm | 3001 | 0.570 | 0.204 | 0.250 | 1.000 | 0.768 |
| memory_instinct | 3001 | 0.505 | 0.047 | 0.396 | 0.875 | 0.888 |
| agile_robust | 3001 | 0.483 | 0.075 | 0.140 | 0.735 | 0.672 |

Degenerate (all-5 neutral) rate: 0.000.
Dominant-axis histogram: symbiosis_predation 2725, solitary_swarm 276.
Collinearity (|r| >= 0.8): symbiosis_predation~memory_instinct r=-0.89.
Faction player (984): symbiosis_predation 1.00, explore_caution 0.65, solitary_swarm 0.60, memory_instinct 0.50, agile_robust 0.45.
Faction sistema (2017): symbiosis_predation 0.99, explore_caution 0.62, solitary_swarm 0.55, memory_instinct 0.51, agile_robust 0.50.

> A13 arm: **WOUND-LIVE (PRESSURE_PER_BIOME=1)**

### A13 wound exposure (evidence, not verdict)

- runs: 40 (completed 36, failed-on-retry 4)
- attempts: 316 (retries 19)
- wound exposure: 0/316 attempts (0.0%)
- first-attempt victory rate: 278/297 (93.6%)
- retry victory rate: 15/19 (78.9%) -- wounded retries: 0

| biome | attempts | wounded | victories |
| --- | --- | --- | --- |
| savana | 133 | 0 | 110 |
| canyons_risonanti | 37 | 0 | 37 |
| mezzanotte_orbitale | 37 | 0 | 37 |
| rovine_planari | 73 | 0 | 73 |
| caverna | 36 | 0 | 36 |

Per-run records: `runs.jsonl`. Aggregate: `summary.json`.
