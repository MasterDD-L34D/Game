---
title: Docs Governance Contract
description: Contratto operativo per metadata, registry e quality gate documentali.
tags: [docs, governance, dual-track]
doc_status: active
doc_owner: platform-docs
workstream: cross-cutting
last_verified: 2026-05-06
source_of_truth: true
language: it-en
review_cycle_days: 14
---

# Docs Governance (Dual-Track)

Questo spazio definisce il contratto operativo per mantenere la documentazione
tracciabile nel tempo, senza perdere il materiale storico.

## Obiettivo

- Tenere un solo punto di verita' operativo per stato, owner e workstream.
- Mantenere accessibili i documenti legacy/storici, ma marcati in modo esplicito.
- Applicare quality gate progressivi in CI (warning prima, required dopo).

## Contratto metadata

I documenti attivi (hub, runbook, procedure, roadmap operative) devono avere
frontmatter YAML con i campi:

- `doc_status`
- `doc_owner`
- `workstream`
- `last_verified`
- `source_of_truth`
- `language`
- `review_cycle_days`

Valori `doc_status` ammessi:

- `active`
- `draft`
- `review_needed`
- `legacy_active`
- `generated`
- `historical_ref`
- `superseded`

## Policy lingua

Policy corrente: `IT+EN`.

- I documenti attivi sono scritti in italiano tecnico con termini inglesi
  mantenuti quando sono nomi standard (es. runtime, workflow, smoke test).
- Le sezioni operative devono evitare sinonimi ambigui tra IT/EN.
- Ogni hub canonico mantiene il glossario minimo dei termini usati.

## Dual-track

- **Canonical track**: documenti hub e runbook marcati `source_of_truth: true`.
- **Historical track**: archivio, incoming, report e mirror mantenuti disponibili
  ma non primari (`source_of_truth: false`).

## Registry centrale

Il file machine-readable e':

- `docs/governance/docs_registry.json`

Lo script di controllo governance:

- `tools/check_docs_governance.py`

Report drift:

- `reports/docs/governance_drift_report.json`

## Gerarchia delle fonti per decisioni di design

La governance (A0) regola **dove** vive un documento e quale stato ha, ma non decide il contenuto di design. Per le decisioni di prodotto e la risoluzione di conflitti tra fonti (ADR vs freeze vs core data vs file operativi), la fonte canonica e' [`docs/planning/EVO_FINAL_DESIGN_SOURCE_AUTHORITY_MAP.md`](../planning/EVO_FINAL_DESIGN_SOURCE_AUTHORITY_MAP.md), che definisce la gerarchia A0..A5 e le regole pratiche §4.1..§4.5.

Il contratto governance di questo README e' il livello **A0**; le altre decisioni (cosa e' canonico, cosa vince in caso di conflitto semantico) vivono all'authority map.

## Rollout

1. Schema + registry + hub canonici.
2. Tag massivo documenti critici.
3. Gate CI warning-only.
4. Promozione a gate required dopo stabilizzazione.
