---
title: Master Realign Plan
description: Piano master di riordino e riallineamento del monorepo Game in modalita' dual-track.
tags: [governance, roadmap, alignment]
doc_status: active
doc_owner: platform-docs
workstream: cross-cutting
last_verified: 2026-05-06
source_of_truth: true
language: it-en
review_cycle_days: 14
---

# Master Realign Plan

Questo documento conserva il piano completo approvato per il refactor documentale del monorepo `Game`.

## Obiettivo

- rendere il monorepo leggibile e governato
- mantenere tracciabilita' di owner, stato e revisione documenti
- conservare storico e legacy in dual-track, senza perdere accesso

## Wave operative

1. Governance unificata (schema metadata + registry centrale)
2. Hub canonici per workstream e unificazione entrypoint
3. Matrice workstream-componenti-stato-owner-dipendenze
4. Quality gate CI in warning-only
5. Promozione graduale dei check a required

## Contratti introdotti

- schema metadata docs: `docs/governance/docs_metadata.schema.json`
- registry centrale: `docs/governance/docs_registry.json`
- matrice workstream: `docs/governance/workstream_matrix.json`
- validator governance: `tools/check_docs_governance.py`

## Acceptance strategica

- ogni workstream ha un hub canonico
- i documenti source-of-truth hanno metadata validi
- il drift report viene prodotto automaticamente
- il passaggio a required avviene solo dopo stabilizzazione warning-only
