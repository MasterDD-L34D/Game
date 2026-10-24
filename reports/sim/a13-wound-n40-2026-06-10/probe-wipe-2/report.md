# Full-loop meta band-metrics

Runs: **6** | Completed: **0/6** | Policy: `greedy` | Branch: `cave_path`

> **RATIFIED (master-dd, L-069)** -- RATIFIED 2026-06-03 by master-dd (L-069): the working bands. Reversible (two-way door) -- revise when evidence warrants. Keep the design space healthy (Quality-Diversity); do not optimize to a single best run. GRAPH-MODE RE-RATIFIED 2026-06-04 by master-dd (#2603): with the real draft rosters + the cm3/hp2/dcAdd1 overlay, graph-mode completion lands ~0.66 (N=40 greedy 0.675 / ESFP 0.70 / INTJ 0.60), inside this 0.4-0.7 band -- the fallback-era wider 0.4-0.85 is superseded; completion_rate [0.4, 0.7] holds for both static and graph mode.

| Metric | Value | Band | In band |
|---|---|---|:---:|
| completion_rate | 0 | 0.4 - 0.7 | ❌ |
| roster_attrition | 1 | 0 - 1 | ❌ |
| economy_flow | drift 1 (pe 0, bp 0) | 0.5 - 2 | ❌ |
| relationship_progress | recruit 0, aff 0, mate 0 | composite | ❌ |
| offspring_viability | offspring 0 | >= 1 | ❌ |
| lineage_diversity | 0 crosses, dominant none | >= 3 | ❌ |
| roster_composition | dominant none, 0 roles | >= 3 | ❌ |

> Note (economy_flow): NO economy signal across the batch (zero XP/MP/PE) -> cannot certify economy_flow

## Personality axes (Opt 3 OUTPUT) -- N-sample evidence

216 per-unit samples. Constants are PROPOSED (blend weights + stat bounds, #2679): this section is EVIDENCE for the N=40 ratification batch (incl. the J_P + formPulseVc E_I flags); master-dd ratifies, the batch never does.

| axis | n | mean | sd | min | max | neutral_rate |
| --- | --- | --- | --- | --- | --- | --- |
| symbiosis_predation | 216 | 1.000 | 0.001 | 0.995 | 1.000 | 0.000 |
| explore_caution | 216 | 0.611 | 0.205 | 0.500 | 1.000 | 0.773 |
| solitary_swarm | 216 | 0.528 | 0.115 | 0.500 | 1.000 | 0.944 |
| memory_instinct | 216 | 0.499 | 0.003 | 0.487 | 0.500 | 0.944 |
| agile_robust | 216 | 0.493 | 0.019 | 0.440 | 0.500 | 0.889 |

Degenerate (all-5 neutral) rate: 0.000.
Dominant-axis histogram: symbiosis_predation 204, solitary_swarm 12.
Collinearity (|r| >= 0.8): symbiosis_predation~solitary_swarm r=-1.00, symbiosis_predation~memory_instinct r=1.00, solitary_swarm~memory_instinct r=-1.00.
Faction player (24): symbiosis_predation 1.00, explore_caution 0.73, solitary_swarm 0.75, memory_instinct 0.49, agile_robust 0.44.
Faction sistema (192): symbiosis_predation 1.00, explore_caution 0.60, solitary_swarm 0.50, memory_instinct 0.50, agile_robust 0.50.

> A13 arm: **WOUND-LIVE (PRESSURE_PER_BIOME=1)**

### A13 wound exposure (evidence, not verdict)

- runs: 6 (completed 0, failed-on-retry 6)
- attempts: 12 (retries 6)
- wound exposure: 0/12 attempts (0.0%)
- first-attempt victory rate: 0/6 (0.0%)
- retry victory rate: 0/6 (0.0%) -- wounded retries: 0

| biome | attempts | wounded | victories |
| --- | --- | --- | --- |
| savana | 12 | 0 | 0 |

Per-run records: `runs.jsonl`. Aggregate: `summary.json`.
