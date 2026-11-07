---
title: Workstream Matrix
description: Matrice unica workstream-componenti-stato-owner-dipendenze.
tags: [governance, workstream, matrix]
doc_status: active
doc_owner: platform-docs
workstream: cross-cutting
last_verified: 2026-06-06
source_of_truth: true
language: it-en
review_cycle_days: 180
---

# Workstream Matrix

Matrice operativa unica: workstream -> componenti -> stato -> owner -> dipendenze.

## Criteri uscita da `incomplete`

- README minimo del modulo presente.
- Owner operativo assegnato.
- Test o smoke check eseguibile.
- Runbook operativo referenziato.

## Snapshot corrente

- `combat`: runtime d20 attivo in Node (`apps/backend/services/roundOrchestrator.js`, `apps/backend/routes/sessionRoundBridge.js`, `apps/backend/services/abilityExecutor.js`, `apps/backend/services/combat/*`), dati di bilanciamento in `packs/evo_tactics_pack/data/balance/`. Owner: combat-team. Hub: `docs/hubs/combat.md`.
- `backend`: moduli con gap documentali/test su `apps/backend` e `services/eventsScheduler`.
- `dataset-pack`: runtime dati attivo, mirror docs segnato come legacy/generated.
- `incoming`: resta attivo in dual-track con etichette esplicite e governance registry.

Fonte machine-readable: `docs/governance/workstream_matrix.json`.
