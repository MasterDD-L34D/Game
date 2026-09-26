# Full-loop meta band-metrics

Runs: **40** | Completed: **33/40** | Policy: `greedy` | Branch: `cave_path`

> **RATIFIED (master-dd, L-069)** -- RATIFIED 2026-06-03 by master-dd (L-069): the working bands. Reversible (two-way door) -- revise when evidence warrants. Keep the design space healthy (Quality-Diversity); do not optimize to a single best run. GRAPH-MODE RE-RATIFIED 2026-06-04 by master-dd (#2603): with the real draft rosters + the cm3/hp2/dcAdd1 overlay, graph-mode completion lands ~0.66 (N=40 greedy 0.675 / ESFP 0.70 / INTJ 0.60), inside this 0.4-0.7 band -- the fallback-era wider 0.4-0.85 is superseded; completion_rate [0.4, 0.7] holds for both static and graph mode.

| Metric | Value | Band | In band |
|---|---|---|:---:|
| completion_rate | 0.825 | 0.4 - 0.7 | ❌ |
| roster_attrition | 0.484 | 0 - 1 | ✅ |
| economy_flow | drift 1.345 (pe 56.8, bp 217.8) | 0.5 - 2 | ✅ |
| relationship_progress | recruit 6.275, aff 1, mate 5.475 | composite | ✅ |
| offspring_viability | offspring 5.475 | >= 1 | ✅ |
| lineage_diversity | 5 crosses, dominant dune-stalker x nano-rust-bloom | >= 3 | ✅ |
| roster_composition | dominant HAZARD, 5 roles | >= 3 | ✅ |

> Note (economy_flow): PE earned + build-power drift; PI sink exercised (557 attempts)

## Personality axes (Opt 3 OUTPUT) -- N-sample evidence

2964 per-unit samples. Constants are PROPOSED (blend weights + stat bounds, #2679): this section is EVIDENCE for the N=40 ratification batch (incl. the J_P + formPulseVc E_I flags); master-dd ratifies, the batch never does.

| axis | n | mean | sd | min | max | neutral_rate |
| --- | --- | --- | --- | --- | --- | --- |
| symbiosis_predation | 2964 | 0.991 | 0.043 | 0.688 | 1.000 | 0.000 |
| explore_caution | 2964 | 0.633 | 0.209 | 0.500 | 1.000 | 0.706 |
| solitary_swarm | 2964 | 0.573 | 0.203 | 0.250 | 1.000 | 0.773 |
| memory_instinct | 2964 | 0.505 | 0.048 | 0.396 | 0.875 | 0.887 |
| agile_robust | 2964 | 0.483 | 0.074 | 0.140 | 0.735 | 0.671 |

Degenerate (all-5 neutral) rate: 0.000.
Dominant-axis histogram: symbiosis_predation 2684, solitary_swarm 280.
Collinearity (|r| >= 0.8): symbiosis_predation~memory_instinct r=-0.89.
Faction player (975): symbiosis_predation 1.00, explore_caution 0.64, solitary_swarm 0.61, memory_instinct 0.50, agile_robust 0.45.
Faction sistema (1989): symbiosis_predation 0.99, explore_caution 0.63, solitary_swarm 0.55, memory_instinct 0.51, agile_robust 0.50.

> A13 arm: **CONTROL (read-side disabled)**

### A13 wound exposure (evidence, not verdict)

- runs: 40 (completed 33, failed-on-retry 7)
- attempts: 312 (retries 21)
- wound exposure: 0/312 attempts (0.0%)
- first-attempt victory rate: 270/291 (92.8%)
- retry victory rate: 14/21 (66.7%) -- wounded retries: 0

| biome | attempts | wounded | victories |
| --- | --- | --- | --- |
| savana | 135 | 0 | 107 |
| canyons_risonanti | 37 | 0 | 37 |
| mezzanotte_orbitale | 37 | 0 | 37 |
| rovine_planari | 70 | 0 | 70 |
| caverna | 33 | 0 | 33 |

Per-run records: `runs.jsonl`. Aggregate: `summary.json`.
