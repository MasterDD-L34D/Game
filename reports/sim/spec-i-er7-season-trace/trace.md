# SPEC-I ER7 -- season-tick deterministic trace

Pilot biome `badlands`. Flag `BIOME_POPULATION_ENABLED=true`. Real route
`POST /api/campaign/seasonal/advance-season`. Knobs under test: `RECOVERY_SEASONS=2`,
`ABUNDANCE_SEASONS=2` (worldgen/biomePopulation.js).

| tick | season | prey (state/seasons) | meso | apex | event this tick |
| --- | --- | --- | --- | --- | --- |
| S1 wound badlands | summer | depleted/0 | stable/1 | stable/1 | local_extinction:badlands:prey |
| S2 wound healed (quiet) | autumn | depleted/1 | stable/2 | stable/2 | - |
| S3 quiet | winter | stable/0 | stable/3 | stable/3 | - |
| S4 apex overhunted | spring | stable/1 | stable/4 | depleted/0 | local_extinction:badlands:apex |
| S5 quiet | summer | abundant/0 | stable/5 | depleted/1 | population_boom:badlands:prey |
| S6 quiet | autumn | abundant/1 | stable/6 | stable/0 | - |
| S7 quiet | winter | stable/0 | stable/7 | stable/1 | - |

Determinism: two independent runs of the full sequence are byte-identical: **true**.

Readout:
- prey depleted at S1 (`local_extinction:prey`), recovers to stable at S3 = **2 quiet
  seasons** -> RECOVERY_SEASONS=2.
- apex depleted at S4 (`local_extinction:apex`); the trophic-release boom fires at S5
  (prey abundant, `population_boom:prey`) = **1-season lag** after the apex loss (the
  predator vanishing frees the prey, but not the same tick).
- apex recovers to stable at S6 = 2 seasons after S4.
- the boomed prey decays back to stable at S7 = **2 seasons** after S5 ->
  ABUNDANCE_SEASONS=2.

Evidence only -- the magnitude ratification is a master-dd verdict (L-069).
