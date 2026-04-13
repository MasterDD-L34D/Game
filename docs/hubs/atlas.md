---
title: Atlas Hub
description: Hub canonico per dashboard e consultazione runtime.
tags: [atlas, dashboard, frontend]
doc_status: active
doc_owner: atlas-team
workstream: atlas
last_verified: 2026-04-13
source_of_truth: true
language: it-en
review_cycle_days: 14
---

# Atlas Hub

## Scope

- Dashboard Vue: `apps/dashboard/`
- Supporto statico: `docs/test-interface/`
- Fallback dati web: `apps/dashboard/public/data/`

## Documenti live

- [QA checklist](../qa-checklist.md)
- [Telemetry guide](../Telemetria-VC.md)
- [Trait editor API](../trait-editor-api.md)

## Gate principali

- `npm run test --workspace apps/dashboard`
- `npm run build --workspace apps/dashboard`
- `npm run test:e2e`
