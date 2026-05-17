---
title: Flow Hub
description: Hub canonico per pipeline generazione/validazione.
tags: [flow, generation, validation]
doc_status: active
doc_owner: flow-team
workstream: flow
last_verified: '2026-04-28'
source_of_truth: true
language: it-en
review_cycle_days: 14
---

# Flow Hub

## Scope

- Orchestrazione generazione: `services/generation/`
- CLI/runtime Python: `tools/py/`
- Tooling TS di supporto: `tools/ts/`

## Documenti live

- [Structure overview](../structure_overview.md)
- [Pipeline templates](../PIPELINE_TEMPLATES.md)
- [Data guidelines](../data-guidelines.md)

## Gate principali

- `npm run test:api`
- `python tools/py/game_cli.py validate-datasets`
- `python tools/py/game_cli.py validate-ecosystem-pack`
