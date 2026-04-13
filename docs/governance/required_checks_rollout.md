---
title: Required Checks Rollout
description: Piano di promozione dei controlli docs governance da warning-only a required.
tags: [governance, ci, required-checks]
doc_status: active
doc_owner: ops-qa-team
workstream: ops-qa
last_verified: 2026-04-13
source_of_truth: true
language: it-en
review_cycle_days: 14
---

# Required Checks Rollout

## Stato attuale

- workflow `docs-governance.yml` attivo in warning-only
- controllo link docs e governance registry gia' eseguito e stabile

## Fase 1 - Stabilizzazione (settimane 1-2)

- monitorare artifact `governance_drift_report.json`
- chiudere mismatch metadata/registry
- mantenere `continue-on-error: true`

## Fase 2 - Gate misto (settimane 3-4)

- rendere blocking solo il check governance (`--strict`)
- mantenere link check in warning-only se necessario
- validare flusso PR senza regressioni operative

## Fase 3 - Required completo (settimane 5-6)

- rimuovere `continue-on-error` su governance + link integrity
- impostare branch protection con check richiesto:
  - `Docs Governance / governance`

## Checklist branch protection

1. aprire repository settings > branches
2. aggiornare regola su `main`
3. abilitare `Require status checks`
4. selezionare check docs governance
5. abilitare `Require branches to be up to date`
