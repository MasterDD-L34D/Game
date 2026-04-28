---
title: Backend Hub
description: Hub canonico per API e servizi backend.
tags: [backend, api, services]
doc_status: active
doc_owner: backend-team
workstream: backend
last_verified: '2026-04-28'
source_of_truth: true
language: it-en
review_cycle_days: 14
---

# Backend Hub

## Scope

- API runtime: `apps/backend/`
- Scheduler eventi: `services/eventsScheduler/`
- Contratti condivisi: `packages/contracts/`

## Stato moduli

- `apps/backend` -> `incomplete` (manca README dedicato e test dir esplicita)
- `services/eventsScheduler` -> `incomplete` (manca README e smoke check dedicato)

## Prossimo gate

- completare baseline minima dei moduli incompleti
- aggiornare `docs/governance/workstream_matrix.json`

## Cross-repo (Game ↔ Game-Database)

- [ADR-2026-04-14: Game-Database topology](../adr/ADR-2026-04-14-game-database-topology.md) — confine architetturale non negoziabile: `Game` resta runtime source of truth, `Game-Database` resta CMS/taxonomy e import target build-time.
- [Final Design — Game Database Sync Plan](../planning/EVO_FINAL_DESIGN_GAME_DATABASE_SYNC.md) — runbook operativo per `sync:evo-pack` / `evo:import`, cadence manuale/batch, trigger per riaprire integrazioni avanzate. Segue l'ADR senza introdurre dipendenze runtime.
