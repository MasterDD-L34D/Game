# scripts/archive -- one-shot migrations, applied and retired

Scripts kept for historical reference. DO NOT RUN: their inputs no longer
exist and their writes are now anti-pattern.

- `trait_orphan_assign_wave_0_1.py` / `trait_orphan_assign_wave_2.py` /
  `trait_orphan_assign_wave_3_4.py` -- trait-orphan ASSIGN-A one-shot
  migrations, applied via PRs #2206-#2214 (2026-05). They read
  `data/core/species.yaml` (removed by #2271; SoT is now
  `data/core/species/species_catalog.json`) and hand-edit derived species
  data, which canon-enforcement now forbids (regenerate-or-die). Archived
  as a family (wave_2/wave_3_4 import from wave_0_1) per owner verdict
  2026-07-01 (TKT-B8-READER-SWEEP).
