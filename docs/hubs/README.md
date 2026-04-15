---
title: Canonical Workstream Hub
description: Entry-point unico per la navigazione documentale canonica del monorepo Game.
tags:
  - docs
  - governance
  - hub
doc_status: active
doc_owner: platform-docs
workstream: cross-cutting
last_verified: 2026-04-13
source_of_truth: true
language: it-en
review_cycle_days: 14
---

# Canonical Workstream Hub

Questo e' l'entrypoint primario dei documenti operativi.

## Final Design Freeze (baseline canonica)

La baseline di design finale di Evo Tactics e' pubblicata nel bundle [Final Design Freeze v0.9](../core/90-FINAL-DESIGN-FREEZE.md). Per un nuovo contributor o agente la sequenza di lettura consigliata e':

1. [`90-FINAL-DESIGN-FREEZE`](../core/90-FINAL-DESIGN-FREEZE.md) — sintesi di prodotto, scope shipping, vincoli architetturali.
2. [`EVO_FINAL_DESIGN_SOURCE_AUTHORITY_MAP`](../planning/EVO_FINAL_DESIGN_SOURCE_AUTHORITY_MAP.md) — **leggere per primo** in caso di conflitto tra fonti: definisce la gerarchia A0..A5 (governance → ADR/hub → core data → freeze → agent docs → storico).
3. [`EVO_FINAL_DESIGN_ROADMAPS_INDEX`](../planning/EVO_FINAL_DESIGN_ROADMAPS_INDEX.md) — indice del bundle esecutivo (roadmap, milestones & gates, backlog, playbook Codex, piano cross-repo).

## Hub per workstream

- [Flow](flow.md) - orchestrazione e validazione contenuti.
- [Atlas](atlas.md) - dashboard, frontend, consultazione dati.
- [Backend](backend.md) - API, servizi e runtime server.
- [Dataset/Pack](dataset-pack.md) - sorgenti dati, pack e cataloghi runtime.
- [Ops/QA](ops-qa.md) - CI, quality gate, audit e release checks.
- [Incoming](incoming.md) - intake, triage, storico e freeze policy.

## Legacy indexes (dual-track)

- [INDEX](../INDEX.md)
- [README docs](../README.md)
- [00-INDEX](../00-INDEX.md)

Questi restano disponibili ma non sono il source of truth primario.

## Governance Plans

- [Master Realign Plan](../governance/master_realign_plan.md)
- [Required Checks Rollout](../governance/required_checks_rollout.md)
