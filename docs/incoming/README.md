---
title: Docs Incoming — dispatcher
doc_status: active
doc_owner: incoming-archivist
workstream: incoming
last_verified: 2026-04-14
source_of_truth: false
language: it-en
review_cycle_days: 30
---

# Docs Incoming — dispatcher

Dispatcher operativo per i file residui in `docs/incoming/**`. Dopo il triage batch (PR #1310, #1311) questa directory contiene solo **2 file attivi** legati al workstream 01B in report-only. La fonte canonica della tabella di triage incoming vive in [`docs/planning/REF_INCOMING_CATALOG.md`](../planning/REF_INCOMING_CATALOG.md); questo README serve solo come landing snello per chi entra in `docs/incoming/`.

## Stato file attivi

| File                                                                                       | Stato     | Owner                 | Note                                                 |
| ------------------------------------------------------------------------------------------ | --------- | --------------------- | ---------------------------------------------------- |
| [`lavoro_da_classificare/INTEGRATION_PLAN.md`](lavoro_da_classificare/INTEGRATION_PLAN.md) | INTEGRATO | archivist (Master DD) | Piano integrazione 01B, tenuto attivo in report-only |
| [`lavoro_da_classificare/TASKS_BREAKDOWN.md`](lavoro_da_classificare/TASKS_BREAKDOWN.md)   | INTEGRATO | archivist (Master DD) | Task board derivata dal piano sopra                  |

## Dove trovare il resto

- **Triage catalog completo** con gap list storica, ticket chiusi e stato workstream 01B/01C: [`docs/planning/REF_INCOMING_CATALOG.md`](../planning/REF_INCOMING_CATALOG.md).
- **Hub workstream**: [`docs/hubs/incoming.md`](../hubs/incoming.md).
- **Audit trail** (freeze window, riaperture, gate closures): `logs/agent_activity.md`.
- **File storici** (snapshot 2025-11-15, 2025-12-19 cleanup, decompressed pack legacy): spostati in [`docs/archive/historical-snapshots/`](../archive/historical-snapshots/) da PR #1310.
- **Pack di ricerca** (sentience branch layout, RFC sentience, enneagram addon, EchoWake): spostati in `docs/planning/research/` e `docs/planning/EchoWake/` da PR #1310.

## Policy operativa

Nuovi drop in `docs/incoming/` richiedono log in `logs/agent_activity.md` e coordinamento con l'archivist. Nessuna modifica ai file esistenti senza approvazione Master DD. I ticket storici `[TKT-01A-001..005]` sono **chiusi** (approvati 2026-07-16); i ticket `[TKT-01B-*]` e `[TKT-01C-*]` restano attivi in modalità report-only sui branch `patch/01B-core-derived-matrix` e `patch/01C-tooling-ci-catalog`.
