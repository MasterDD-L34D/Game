---
title: Required Checks Rollout
description: Piano di promozione dei controlli docs governance da warning-only a required.
tags: [governance, ci, required-checks]
doc_status: active
doc_owner: ops-qa-team
workstream: ops-qa
last_verified: 2026-05-06
source_of_truth: true
language: it-en
review_cycle_days: 14
---

# Required Checks Rollout

## Stato attuale

- ✅ Fase 1 completata (settimane 1-2, 7-13 aprile 2026)
- ✅ Fase 2 attivata (14 aprile 2026): governance check blocking, link warning-only
- ✅ Branch protection attiva su main con 6 check required

## Fase 1 - Stabilizzazione (settimane 1-2) ✅ COMPLETATA

- monitorato artifact `governance_drift_report.json`: 0 errori, 0 warning
- mismatch metadata/registry chiuso via tool migrazione bulk
- `continue-on-error: true` mantenuto durante fase 1

## Fase 2 - Gate misto (settimane 3-4) ✅ ATTIVA

- governance check ora **blocking** (`continue-on-error` rimosso)
- link check mantenuto in warning-only
- branch protection attivata con check required:
  `paths-filter`, `python-tests`, `stack-quality`, `cli-checks`, `dataset-checks`, `governance`
- PR template aggiornato con rollback plan obbligatorio

## Fase 3 - Required completo (settimane 5-6) — PROSSIMA

- rimuovere `continue-on-error` su link integrity
- aggiungere `link_check` ai check required della branch protection
- verificare zero drift per 2 settimane consecutive

## Checklist branch protection

1. aprire repository settings > branches
2. aggiornare regola su `main`
3. abilitare `Require status checks`
4. selezionare check docs governance
5. abilitare `Require branches to be up to date`
