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
last_verified: 2026-05-06
source_of_truth: true
language: it-en
review_cycle_days: 14
---

# Canonical Workstream Hub

Questo e' l'entrypoint primario dei documenti operativi.

## Entrypoint canonico

Per un nuovo contributor o agente la sequenza di lettura consigliata e':

1. [`00-GDD_MASTER`](../core/00-GDD_MASTER.md) — **entrypoint unico**: sintesi di tutti i sistemi di design con link alle fonti.
2. [`90-FINAL-DESIGN-FREEZE`](../core/90-FINAL-DESIGN-FREEZE.md) — scope shipping, sistemi congelati, vincoli architetturali.
3. [`00-SOURCE-OF-TRUTH`](../core/00-SOURCE-OF-TRUTH.md) — ricostruzione narrativa completa (19 sezioni, v4).
4. [`EVO_FINAL_DESIGN_SOURCE_AUTHORITY_MAP`](../planning/EVO_FINAL_DESIGN_SOURCE_AUTHORITY_MAP.md) — gerarchia A0..A5, regole di risoluzione conflitti.
5. [`00B-CANONICAL_PROMOTION_MATRIX`](../core/00B-CANONICAL_PROMOTION_MATRIX.md) — classificazione ufficiale 10 sistemi (core/appendix/research/historical).

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
