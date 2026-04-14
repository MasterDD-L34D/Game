---
title: Atlas Hub
description: Hub canonico per dashboard e consultazione runtime.
tags: [atlas, dashboard, frontend]
doc_status: active
doc_owner: atlas-team
workstream: atlas
last_verified: 2026-04-14
source_of_truth: true
language: it-en
review_cycle_days: 14
---

# Atlas Hub

## Scope

Dashboard e consultazione runtime del progetto. **Nota architetturale**: il repo ha due dashboard sovrapposti — lo scaffold AngularJS `apps/dashboard/` (sorgente non funzionante runtime) e il bundle Vue pre-built `docs/mission-console/` (artifact production servito da GitHub Pages). Vedi [ADR-2026-04-14](../adr/ADR-2026-04-14-dashboard-scaffold-vs-mission-console.md) per la dicotomia completa.

- Source scaffold: `apps/dashboard/` (AngularJS 1.8.3 stub, dev server non renderizza)
- Production bundle: `docs/mission-console/` (Vue 3, frozen)
- Supporto statico legacy: `docs/frontend/test-interface/`
- Fallback dati web: `apps/dashboard/public/data/`

## Documenti live

- [QA checklist](../qa/qa-checklist.md)
- [Telemetry guide](../core/Telemetria-VC.md)
- [Trait editor API](../traits/trait-editor-api.md)
- [ADR dashboard dichotomy](../adr/ADR-2026-04-14-dashboard-scaffold-vs-mission-console.md)

## Gate principali

- `npm run test --workspace apps/dashboard` (unit test Vitest su logica pura)
- `npm run build --workspace apps/dashboard` (build Vite, **no deploy**)
- `npm run test:e2e` (Playwright — limitato dallo stub Angular)
