---
title: Atlas Hub
description: Hub canonico per dashboard e consultazione runtime.
tags: [atlas, dashboard, frontend]
doc_status: active
doc_owner: atlas-team
workstream: atlas
last_verified: '2026-04-28'
source_of_truth: true
language: it-en
review_cycle_days: 14
---

# Atlas Hub

## Scope

Dashboard e consultazione runtime del progetto. Il bundle Vue 3 pre-built `docs/mission-console/` è l'artifact production servito da GitHub Pages. Lo scaffold AngularJS `apps/dashboard/` è stato rimosso in #1343. Vedi [ADR-2026-04-14](../adr/ADR-2026-04-14-dashboard-scaffold-vs-mission-console.md) (superseded) per lo storico.

- Production bundle: `docs/mission-console/` (Vue 3, frozen)
- Supporto statico legacy: `docs/frontend/test-interface/`

## Documenti live

- [QA checklist](../qa/qa-checklist.md)
- [Telemetry guide](../core/Telemetria-VC.md)
- [Trait editor API](../traits/trait-editor-api.md)
- [ADR dashboard dichotomy](../adr/ADR-2026-04-14-dashboard-scaffold-vs-mission-console.md) (superseded)

## Gate principali

- Backend test suite (`npm run test:api`) — copre mock parity e schema contracts
