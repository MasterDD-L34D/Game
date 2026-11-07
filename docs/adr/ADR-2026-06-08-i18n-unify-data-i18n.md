---
title: 'ADR 2026-06-08 -- i18n: unificare su data/i18n come sorgente unica (QA3)'
doc_status: active
doc_owner: master-dd
workstream: cross-cutting
last_verified: '2026-06-08'
source_of_truth: false
language: it
review_cycle_days: 30
related:
  - 'docs/design/evo-tactics-localization-i18n.md'
  - 'docs/architecture/i18n-strategy.md'
  - 'docs/planning/2026-06-05-evo-tactics-open-points-resolution-roadmap.md'
---

# ADR-2026-06-08 -- i18n: unificare su data/i18n come sorgente unica (QA3)

**Stato**: ACCEPTED (Eduardo 2026-06-08, fork QA3 della retro harsh-review SPEC-N #2636).
**Trigger**: la retro harsh-review di SPEC-N (Localization) ha scoperto DUE sistemi i18n
paralleli; serviva una decisione di livello ADR su quale sia la sorgente unica.
**Scopo**: dare backing di record alla scelta "data/i18n e' la SSOT i18n" e fissare la
direzione di migrazione, senza che ogni nuova surface duplichi un proprio key-space.

## Contesto (git-verified 2026-06-08)

Esistono due sistemi di localizzazione:

1. **`data/i18n/`** -- layer game-data. `data/i18n/{it,en}/common.json` esistono dal
   PR #1463 (2026-04-17): 10 namespace dentro `common` (ui/menu/combat/status/objective/
   result/settings/errors/difficulty/accessibility), `_meta.completion_percent: 5`.
   Validazione parity LIVE: `npm run i18n:check` -> `tools/py/validate_i18n_parity.py`
   (i18n-strategy "PR-2 of 6": key-parity + no-placeholder + mustache + completion).
   **Nessun consumer runtime**: nulla legge `data/i18n/` a runtime oggi.
2. **`apps/mission-console/src/locales/`** -- runtime vue-i18n COMPLETO (createI18n,
   `DEFAULT_LOCALE='it'`, `FALLBACK_LOCALE='en'`), con locali PROPRI co-locati, che NON
   consumano `data/i18n/`.

Il rischio (emerso in SPEC-N retro-review): ogni nuova surface device/TV (SPEC-C/D/E/G/M)
sceglie un sistema e i due key-space divergono. La roadmap `docs/architecture/i18n-strategy.md`
prevede gia' loader (PR-3) + migration (PR-4) + namespace split (PR-5).

## Decisione

1. **`data/i18n/` e' la SSOT i18n** (game-data + tutte le surface player-facing).
2. **`mission-console` migra** a consumare `data/i18n/` (non piu' i locali co-locati).
3. **Le nuove surface** (SPEC-C/D/E/G/M, Godot phone/TV) consumano `data/i18n/` via il
   loader (PR-3), MAI literali hardcoded.
4. **Fallback** dal punto di vista del consumer: `locale=en` con key mancante -> `it`
   (en -> it; default it). Mirror del comportamento mission-console attuale.
5. **Gate "no hardcoded strings"** = forward-only: vincola le surface create DOPO questo
   ADR; il debito esistente (es. `apps/play/biomeChip.js` BIOME_LABELS IT-hardcoded) e'
   migrazione PR-4, non bloccante per le nuove surface.

## Conseguenze

- **Sblocca** la sequenza i18n-strategy: PR-3 (loader runtime + `t()` helper) -> PR-4
  (migration mission-console + debito esistente) -> PR-5 (split namespace combat/tutorial/
  narrative in file separati). PR-2 (parity validator) e' GIA' fatto.
- **Ticket di migrazione** (PR-4) da aprire: mission-console -> data/i18n. Effort L.
- Lo schema JSON formale (`data/i18n/_schema/i18n.schema.json` + AJV) resta OPZIONALE:
  la parity check copre gia' il grosso della validazione; aggiungerlo solo se serve un
  contratto strict oltre la parity.
- Nessun loader i18n nel backend Game finche' una surface backend non lo richiede
  (oggi la localizzazione e' lato frontend/Godot; evitare engine-ahead-of-surface).

## Alternative scartate

- **Tenere i due sistemi separati** (data/i18n per game-data, mission-console per la sua
  UI): meno churn ora, ma i key-space divergono a ogni nuova surface (la ragione per cui
  QA3 e' stato sollevato). Scartata.
- **Unificare su mission-console locales**: legherebbe la SSOT a un'app specifica;
  `data/i18n/` e' neutro rispetto alla surface. Scartata.

## Riferimenti

- Fork QA3 ratificato nella retro harsh-review SPEC-N (PR #2636).
- `docs/design/evo-tactics-localization-i18n.md` (SPEC-N).
- `docs/architecture/i18n-strategy.md` (roadmap PR-1..PR-6).
