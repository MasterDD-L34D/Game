# Full-loop meta band-metrics

Runs: **6** | Completed: **4/6** | Policy: `greedy` | Branch: `cave_path`

> **RATIFIED (master-dd, L-069)** -- RATIFIED 2026-06-03 by master-dd (L-069): the working bands. Reversible (two-way door) -- revise when evidence warrants. Keep the design space healthy (Quality-Diversity); do not optimize to a single best run. GRAPH-MODE RE-RATIFIED 2026-06-04 by master-dd (#2603): with the real draft rosters + the cm3/hp2/dcAdd1 overlay, graph-mode completion lands ~0.66 (N=40 greedy 0.675 / ESFP 0.70 / INTJ 0.60), inside this 0.4-0.7 band -- the fallback-era wider 0.4-0.85 is superseded; completion_rate [0.4, 0.7] holds for both static and graph mode.

| Metric | Value | Band | In band |
|---|---|---|:---:|
| completion_rate | 0.667 | 0.4 - 0.7 | ✅ |
| roster_attrition | 0.63 | 0 - 1 | ✅ |
| economy_flow | drift 1.267 (pe 42.667, bp 160) | 0.5 - 2 | ✅ |
| relationship_progress | recruit 4.667, aff 1, mate 4 | composite | ✅ |
| offspring_viability | offspring 4 | >= 1 | ✅ |
| lineage_diversity | 5 crosses, dominant dune-stalker x nano-rust-bloom | >= 3 | ✅ |
| roster_composition | dominant APEX/HAZARD, 5 roles | >= 3 | ✅ |

> Note (economy_flow): PE earned + build-power drift; PI sink exercised (60 attempts)

## Personality axes (Opt 3 OUTPUT) -- N-sample evidence

344 per-unit samples. Constants are PROPOSED (blend weights + stat bounds, #2679): this section is EVIDENCE for the N=40 ratification batch (incl. the J_P + formPulseVc E_I flags); master-dd ratifies, the batch never does.

| axis | n | mean | sd | min | max | neutral_rate |
| --- | --- | --- | --- | --- | --- | --- |
| symbiosis_predation | 344 | 0.990 | 0.048 | 0.667 | 1.000 | 0.000 |
| explore_caution | 344 | 0.627 | 0.206 | 0.500 | 1.000 | 0.718 |
| solitary_swarm | 344 | 0.567 | 0.200 | 0.250 | 1.000 | 0.779 |
| memory_instinct | 344 | 0.506 | 0.050 | 0.435 | 0.875 | 0.890 |
| agile_robust | 344 | 0.480 | 0.072 | 0.140 | 0.735 | 0.686 |

Degenerate (all-5 neutral) rate: 0.000.
Dominant-axis histogram: symbiosis_predation 314, solitary_swarm 30.
Collinearity (|r| >= 0.8): symbiosis_predation~memory_instinct r=-0.90.
Faction player (108): symbiosis_predation 1.00, explore_caution 0.65, solitary_swarm 0.61, memory_instinct 0.50, agile_robust 0.43.
Faction sistema (236): symbiosis_predation 0.99, explore_caution 0.61, solitary_swarm 0.55, memory_instinct 0.51, agile_robust 0.50.

> A13 arm: **WOUND-LIVE (PRESSURE_PER_BIOME=1)**

### A13 wound exposure (evidence, not verdict)

- runs: 6 (completed 4, failed-on-retry 2)
- attempts: 36 (retries 2)
- wound exposure: 0/36 attempts (0.0%)
- first-attempt victory rate: 32/34 (94.1%)
- retry victory rate: 0/2 (0.0%) -- wounded retries: 0

| biome | attempts | wounded | victories |
| --- | --- | --- | --- |
| savana | 16 | 0 | 12 |
| canyons_risonanti | 4 | 0 | 4 |
| mezzanotte_orbitale | 4 | 0 | 4 |
| rovine_planari | 8 | 0 | 8 |
| caverna | 4 | 0 | 4 |

Per-run records: `runs.jsonl`. Aggregate: `summary.json`.
