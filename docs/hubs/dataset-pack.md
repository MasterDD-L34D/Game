---
title: Dataset and Pack Hub
description: Hub canonico per dati runtime e pack Evo-Tactics.
tags: [dataset, pack, taxonomy]
doc_status: active
doc_owner: data-pack-team
workstream: dataset-pack
last_verified: '2026-04-28'
source_of_truth: true
language: it-en
review_cycle_days: 14
---

# Dataset and Pack Hub

## Scope

- Dataset canonici: `data/`
- Pack runtime: `packs/evo_tactics_pack/`
- Mirror catalog statico: `docs/evo-tactics-pack/` (legacy/generated)

## Documenti live

- [README pack](../evo-tactics-pack/README.md)
- [Traits alignment](../traits_evo_pack_alignment.md)
- [Migration targeted workplan](../migration_targeted_workplan.md)

## Gate principali

- `npm run sync:evo-pack`
- `python scripts/evo_pack_pipeline.py`
- validatori pack da `tools/py/game_cli.py validate-ecosystem-pack`
