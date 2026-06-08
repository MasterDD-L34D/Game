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

Origine: harvest 2026-06-08 (cluster Spec-M nuove). Recupera la roadmap di consegna in
`docs/architecture/i18n-strategy.md` (LOCAL, `doc_status: active` -- NON vault; PR-1..PR-6).
Launch-blocker per il pubblico EN; basso costo, alto valore orizzontale (ogni spec UI
futura usa le key).

## Obiettivo

Posare lo scaffold i18n it/en come fondazione orizzontale per ogni stringa
player-facing, prima che le nuove surface device/TV introducano stringhe
hardcoded.

## Deve coprire

- Struttura namespace: `common` / `combat` / `tutorial` / `narrative` (oggi tutte dentro
  `common.json`; split in file separati = PR-5).
- Formato: `data/i18n/{it,en}/<namespace>.json` + `_schema/i18n.schema.json` + AJV
  (schema + AJV = PR-2, da costruire).
- Convenzione key + fallback: dal punto di vista del consumer, `locale=en` con key mancante
  -> fallback a `it` (en -> it; default it -- mirror mission-console DEFAULT_LOCALE=it /
  FALLBACK_LOCALE=en).
- Integrazione con SPEC-B/C/D/E/G/M: le surface device/TV consumano key -- MA serve prima
  il loader (PR-3); finche' manca, il gate e' forward-only (sotto).
- Policy: nessuna stringa hardcoded nelle NUOVE surface (gate review forward-only); il
  debito esistente (es. `apps/play/biomeChip.js` BIOME_LABELS IT-hardcoded) = PR-4
  migration, non bloccante qui.
- **QA3 ratificato (2026-06-08)**: `data/i18n/` = sorgente unica; mission-console + le
  nuove surface migrano a consumarlo (loader PR-3). Richiede ADR + ticket migrazione.

## Dipendenze

- Orizzontale: ogni spec con UI (C, D, E, G, M) usa le key da subito.

## Stato runtime (git-verify 2026-06-08)

PARTIAL (NON design-only -- correzione retro-review):

- **Scaffold GIA' presente**: `data/i18n/{it,en}/common.json` esistono dal PR #1463
  (2026-04-17), 10 namespace popolati dentro `common` (ui/menu/combat/status/objective/
  result/settings/errors/difficulty/accessibility) + `_meta.completion_percent: 5`. NON
  sono stub vuoti.
- **Manca**: `_schema/i18n.schema.json` + AJV (PR-2); loader runtime + `t()` backend
  (PR-3); split namespace combat/tutorial/narrative in file separati (oggi sezioni dentro
  `common.json`; PR-5).
- **Backend**: nessun loader i18n reale (il prefisso `i18n:traits.*` e' solo convenzione
  di naming, non runtime).
- **mission-console** ha gia' un runtime vue-i18n COMPLETO ma con locali PROPRI
  (`apps/mission-console/src/locales/`), NON consuma `data/i18n/` (vedi QA3).

## Output consigliato

NON ricreare lo scaffold (esiste). Sequenza: (1) `_schema/i18n.schema.json` + AJV (PR-2);
(2) loader runtime + `t()` (PR-3); (3) ADR unificazione `data/i18n` vs mission-console
(QA3) + ticket migrazione (PR-4); (4) split namespace combat/tutorial/narrative (PR-5).
