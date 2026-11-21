---
title: Banner Saga Permadeath Opt-In Mode
museum_id: M-2026-04-27-020
type: mechanic
domain: old_mechanics
provenance:
  found_at: docs/research/2026-04-27-indie-meccaniche-perfette.md §1 + docs/research/2026-04-27-indie-MASTER-synthesis.md §2 quick-win #5
  source_game: 'The Banner Saga — Stoic Studio (2014)'
  git_sha_first: unknown
  git_sha_last: unknown
  last_modified: 2026-04-27
  last_author: narrative-design-illuminator
  buried_reason: deferred
relevance_score: 4
reuse_path: data/core/party.yaml modulation preset + apps/backend/routes/session.js /start handler
related_pillars: [P6]
status: curated
excavated_by: repo-archaeologist
excavated_on: 2026-04-27
last_verified: 2026-04-27
date_curated: 2026-04-27
domain_tag: P6
effort_estimate_h: 4
blast_radius_multiplier: low
trigger_for_revive: Decisione D3 risolta (master-dd sceglie A modulation / B tutorial intro / C milestone unlock)
related:
  - docs/research/2026-04-27-indie-meccaniche-perfette.md
  - docs/reports/2026-04-27-indie-research-classification.md §C.1.2
  - data/core/party.yaml
verified: false
---

# Banner Saga Permadeath Opt-In Mode

## Summary (30s)

- Permadeath opt-in: unità che muoiono in battaglia restano morte, nessuna resurrezione. Scelta consapevole player all'avvio campagna.
- Deferred: decisione D3 master-dd pending (modulation preset vs tutorial intro vs milestone unlock). Effort ~4h ma manca policy design.
- Trigger revive: D3 risolta.

## What was buried

Pattern estratto da analisi research 2026-04-27. Banner Saga: permadeath selettivo (solo in battle, non in cutscene). I personaggi "importanti" muoiono come tutti gli altri — nessun plot armor. Questo rende ogni battaglia significativa perché le conseguenze sono permanenti.

In Evo-Tactics il pattern mapperebbe come flag `permadeath: true` nel modulation preset `hardcore` in `party.yaml`. Session `/start` legge la modulation e setta policy per `resolveAttack` death outcome.

**Prerequisiti già live**: modulation system (`party.yaml` PR #1530, 11 preset), `missionTimer.js` (già un layer hardcore). Base tecnica pronta.

## Why it was buried

Classificato MUSEUM in `indie-research-classification.md §C.1.2`: "decisione master-dd D3 pending (modulation vs tutorial intro vs milestone unlock)". Non è scope-creep tecnico — è una policy design decision non ancora presa. Effort ~4h è ragionevole, ma implementare senza alignment su come viene scoperta dall'utente crea UX rotta.

## Why it might still matter

P6 Fairness: permadeath è la conseguenza massima, chiude il cerchio "scelte reali con peso reale". Costruisce su mission timer (stesso preset hardcore). ROI alto se D3 risolta nella direzione giusta.

## Concrete reuse paths

1. **Minimal (~4h, P1)**: flag `permadeath: true` in `party.yaml` preset `hardcore_permadeath`. `session.js /start` legge flag + setta policy. `resolveAttack` death branch: unità rimossa da roster campaign permanentemente.
2. **Moderate (~6h, P1)**: aggiunge UI warning in lobby "MODALITÀ PERMADEATH — le unità morte non tornano" + confirmation modal.
3. **Full (~8h, P0 post-D3)**: milestone unlock progression (sblocca dopo N campagne completate in normal mode), tutorial intro spiegazione, cross-ref supply attrition (M-2026-04-27-019).

## Sources / provenance trail

- Found at: [docs/research/2026-04-27-indie-meccaniche-perfette.md §1](../../../docs/research/2026-04-27-indie-meccaniche-perfette.md)
- Classification: [docs/reports/2026-04-27-indie-research-classification.md §C.1.2](../../../docs/reports/2026-04-27-indie-research-classification.md)
- Party modulation: [data/core/party.yaml](../../../data/core/party.yaml)

## Risks / open questions

- Decisione D3 NON auto-decidere. Opzioni: A) modulation picker lobby, B) tutorial intro opzionale, C) milestone unlock. Impatto onboarding diverso per ciascuna.
- NON permadeath obbligatorio — rende inaccessibile gioco casual. Solo opt-in.
- Verificare che `resolveAttack` death branch gestisca correttamente rimozione da campaign roster senza rompere `sessionRoundBridge.js` actor list.
