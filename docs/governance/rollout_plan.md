---
title: Governance Rollout Plan (6-8 weeks)
doc_status: active
doc_owner: platform-docs
workstream: cross-cutting
last_verified: 2026-05-06
source_of_truth: false
language: it-en
review_cycle_days: 14
---

# Governance Rollout Plan

## Stato: Wave 1-3 completate, Wave 4 in corso

## Week 1-2 (7-13 aprile 2026) ✅ COMPLETATE

- Schema metadata e registry centrale attivi.
- Hub canonici per 8 workstream pubblicati (incluso combat).
- Workflow CI docs-governance in warning-only.
- Tool migrazione bulk (`tools/docs_governance_migrator.py`) creato.
- 449 entry nel registry (96.4% coverage).
- 378 file con frontmatter auto-generato.

## Week 3-4 (14-27 aprile 2026) ✅ IN CORSO

- Tag massivo documenti critici completato via tool migrazione.
- Mismatch frontmatter/registry: 0 errori, 0 warning.
- Governance check promosso a **Fase 2** (blocking su governance, warning-only su link).
- PR template aggiornato con sezione rollback plan obbligatoria.
- **Branch protection attivata su main** con check required:
  paths-filter, python-tests, stack-quality, cli-checks, dataset-checks, governance.

## Week 5-6 (28 aprile - 11 maggio 2026) — PROSSIMA

- Chiusura gap moduli incomplete prioritari.
- Consolidamento indici legacy verso entrypoint canonico.
- Promozione link integrity check da warning-only a required (Fase 3).
- Prima retro con metriche drift settimanali.

## Week 7-8 (12-25 maggio 2026)

- Rimozione completa `continue-on-error` su tutti i check.
- Retro finale con metriche: stale docs, mismatch, coverage metadata.
- Enforcement completo: tutte le PR devono passare governance + link check.
