---
title: 'Evo-Tactics SPEC-N Localization i18n Scaffold'
date: 2026-06-08
type: design-spec
doc_status: review_needed
doc_owner: master-dd
workstream: flow
last_verified: '2026-06-08'
source_of_truth: false
language: it
review_cycle_days: 30
tags: [evo-tactics, spec-n, localization, i18n]
related: docs/planning/2026-06-05-evo-tactics-open-points-resolution-roadmap.md
---

# SPEC-N: Localization i18n Scaffold

Origine: harvest 2026-06-08 (cluster Spec-M nuove). Recupera
`architecture/i18n-strategy.md` (vault), oggi DESIGN-ONLY (struttura specificata,
0 stringhe). Launch-blocker per il pubblico EN; basso costo, alto valore
orizzontale (ogni spec UI futura usa le key).

## Obiettivo

Posare lo scaffold i18n it/en come fondazione orizzontale per ogni stringa
player-facing, prima che le nuove surface device/TV introducano stringhe
hardcoded.

## Deve coprire

- Struttura namespace: `common` / `combat` / `tutorial` / `narrative`.
- Formato: `data/i18n/{it,en}/<namespace>.json` + `_schema/i18n.schema.json` + AJV.
- Convenzione key + fallback it -> en.
- Integrazione con SPEC-B/C/D: le surface device/TV consumano key, non literali.
- Policy: nessuna stringa hardcoded nelle nuove surface (gate review).

## Dipendenze

- Orizzontale: ogni spec con UI (C, D, E, G, M) usa le key da subito.

## Stato runtime (git-verify 2026-06-08)

DESIGN-ONLY: nessun runtime i18n nel backend Game; struttura solo specificata.

## Output consigliato

Scaffold `data/i18n/` (stub vuoti) + schema + registrazione AJV -> spec piena se
serve estensione oltre it/en.
