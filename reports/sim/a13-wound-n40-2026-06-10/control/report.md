# Full-loop meta band-metrics

Runs: **40** | Completed: **38/40** | Policy: `greedy` | Branch: `cave_path`

> **RATIFIED (master-dd, L-069)** -- RATIFIED 2026-06-03 by master-dd (L-069): the working bands. Reversible (two-way door) -- revise when evidence warrants. Keep the design space healthy (Quality-Diversity); do not optimize to a single best run. GRAPH-MODE RE-RATIFIED 2026-06-04 by master-dd (#2603): with the real draft rosters + the cm3/hp2/dcAdd1 overlay, graph-mode completion lands ~0.66 (N=40 greedy 0.675 / ESFP 0.70 / INTJ 0.60), inside this 0.4-0.7 band -- the fallback-era wider 0.4-0.85 is superseded; completion_rate [0.4, 0.7] holds for both static and graph mode.

| Metric | Value | Band | In band |
|---|---|---|:---:|
| completion_rate | 0.95 | 0.4 - 0.7 | ❌ |
| roster_attrition | 0.453 | 0 - 1 | ✅ |
| economy_flow | drift 1.477 (pe 62.8, bp 240.9) | 0.5 - 2 | ✅ |
| relationship_progress | recruit 6.9, aff 1, mate 6.075 | composite | ✅ |
| offspring_viability | offspring 6.075 | >= 1 | ✅ |
| lineage_diversity | 5 crosses, dominant dune-stalker x nano-rust-bloom | >= 3 | ✅ |
| roster_composition | dominant HAZARD, 5 roles | >= 3 | ✅ |

> Note (economy_flow): PE earned + build-power drift; PI sink exercised (611 attempts)

## Personality axes (Opt 3 OUTPUT) -- N-sample evidence

3156 per-unit samples. Constants are PROPOSED (blend weights + stat bounds, #2679): this section is EVIDENCE for the N=40 ratification batch (incl. the J_P + formPulseVc E_I flags); master-dd ratifies, the batch never does.

| axis | n | mean | sd | min | max | neutral_rate |
| --- | --- | --- | --- | --- | --- | --- |
| symbiosis_predation | 3156 | 0.991 | 0.042 | 0.688 | 1.000 | 0.000 |
| explore_caution | 3156 | 0.631 | 0.208 | 0.500 | 1.000 | 0.711 |
| solitary_swarm | 3156 | 0.572 | 0.205 | 0.250 | 1.000 | 0.766 |
| memory_instinct | 3156 | 0.505 | 0.048 | 0.419 | 0.875 | 0.886 |
| agile_robust | 3156 | 0.482 | 0.076 | 0.140 | 0.735 | 0.668 |

Degenerate (all-5 neutral) rate: 0.000.
Dominant-axis histogram: symbiosis_predation 2869, solitary_swarm 287.
Collinearity (|r| >= 0.8): symbiosis_predation~memory_instinct r=-0.89.
Faction player (1048): symbiosis_predation 1.00, explore_caution 0.65, solitary_swarm 0.60, memory_instinct 0.50, agile_robust 0.45.
Faction sistema (2108): symbiosis_predation 0.99, explore_caution 0.62, solitary_swarm 0.55, memory_instinct 0.51, agile_robust 0.50.

> A13 arm: **CONTROL (read-side disabled)**

### A13 wound exposure (evidence, not verdict)

- runs: 40 (completed 38, failed-on-retry 2)
- attempts: 334 (retries 18)
- wound exposure: 0/334 attempts (0.0%)
- first-attempt victory rate: 298/316 (94.3%)
- retry victory rate: 16/18 (88.9%) -- wounded retries: 0

| biome | attempts | wounded | victories |
| --- | --- | --- | --- |
| savana | 138 | 0 | 118 |
| canyons_risonanti | 40 | 0 | 40 |
| mezzanotte_orbitale | 40 | 0 | 40 |
| rovine_planari | 78 | 0 | 78 |
| caverna | 38 | 0 | 38 |

Per-run records: `runs.jsonl`. Aggregate: `summary.json`.
