---
title: Workstream Matrix
description: Matrice unica workstream-componenti-stato-owner-dipendenze.
tags: [governance, workstream, matrix]
doc_status: active
doc_owner: platform-docs
workstream: cross-cutting
last_verified: 2026-04-13
source_of_truth: true
language: it-en
review_cycle_days: 14
---

# Workstream Matrix

Matrice operativa unica: workstream -> componenti -> stato -> owner -> dipendenze.

## Criteri uscita da `incomplete`

- README minimo del modulo presente.
- Owner operativo assegnato.
- Test o smoke check eseguibile.
- Runbook operativo referenziato.

## Snapshot corrente

- `backend`: moduli con gap documentali/test su `apps/backend` e `services/eventsScheduler`.
- `dataset-pack`: runtime dati attivo, mirror docs segnato come legacy/generated.
- `incoming`: resta attivo in dual-track con etichette esplicite e governance registry.

Fonte machine-readable: `docs/governance/workstream_matrix.json`.
