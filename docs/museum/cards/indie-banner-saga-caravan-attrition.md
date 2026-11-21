---
title: Banner Saga Caravan Supply Attrition
museum_id: M-2026-04-27-019
type: mechanic
domain: old_mechanics
provenance:
  found_at: docs/research/2026-04-27-indie-meccaniche-perfette.md §1
  source_game: 'The Banner Saga — Stoic Studio (2014)'
  git_sha_first: unknown
  git_sha_last: unknown
  last_modified: 2026-04-27
  last_author: narrative-design-illuminator
  buried_reason: deferred
relevance_score: 4
reuse_path: apps/backend/services/campaign/campaignResourceTracker.js (nuovo)
related_pillars: [P6]
status: curated
excavated_by: repo-archaeologist
excavated_on: 2026-04-27
last_verified: 2026-04-27
date_curated: 2026-04-27
domain_tag: P6
effort_estimate_h: 13
blast_radius_multiplier: low
trigger_for_revive: Post-playtest TKT-M11B-06 mostra player need per attrition cross-encounter
related:
  - docs/research/2026-04-27-indie-meccaniche-perfette.md
  - docs/reports/2026-04-27-indie-research-classification.md §C.1.1
verified: false
---

# Banner Saga Caravan Supply Attrition

## Summary (30s)

- Caravan supply system: consumo cibo tra missioni proporzionale a sopravvissuti. Pressione diegetica "3 giorni di cibo, 47 bocche" — non HUD number.
- Deferred: Prisma overhead ~3h, nuovo stato persistente cross-encounter, scope-creep per single-dev pre-playtest.
- Trigger revive: se TKT-M11B-06 playtest live mostra che i player cercano conseguenze tra missioni.

## What was buried

Pattern estratto da analisi research 2026-04-27. Caravan supply in Banner Saga: ogni marcia consuma `cibo` proporzionale a `survivors_count`. Decisione marcia (veloce vs. sicura) altera ritmo consumo. Permadeath autentico — i morti restano morti, nessuna resurrezione narrativa.

Il sistema produce pressione diegetica: "hai 3 giorni di cibo" anziché "hai -10 HP". Il player sente la scarsità come realtà narrativa, non come numero.

**Prerequisiti già live**: `campaign advance` endpoint (`/api/campaign/advance`), modulation system (PR #1530), `missionTimer.js` (PR #1695). Stack pronto per aggiungere supply layer.

## Why it was buried

Classificato MUSEUM in `indie-research-classification.md §C.1.1`: "nuovo stato persistente cross-encounter, Prisma overhead ~3h, scope-creep single-dev". Decisione conservativa pre-playtest: aggiungere attrition senza sapere se i player la vogliono è gold-plating.

## Why it might still matter

P6 Fairness (🟡 → 🟢 path). Il supply attrition aggiunge "scelte reali con peso reale" tra scenari — esattamente il gap P6. Costruisce su `missionTimer.js` già live (stesso pillar). `campaignResourceTracker.js` è il componente mancante naturale dopo M13.P6.

## Concrete reuse paths

1. **Minimal (~6h, P1)**: `campaignResourceTracker.js` standalone — supply accumulato, consumo tra missioni. No UI. Log JSON solo.
2. **Moderate (~10h, P1)**: aggiunge supply choice UI (modal pre-scenario "marcia veloce vs. sicura") + endpoint `/api/campaign/supply`.
3. **Full (~13h, P0 post-playtest)**: full integration con modulation preset `supply_mode: enabled`, briefing ink variant su supply basso, permadeath opt-in flag party.yaml.

## Sources / provenance trail

- Found at: [docs/research/2026-04-27-indie-meccaniche-perfette.md §1](../../../docs/research/2026-04-27-indie-meccaniche-perfette.md)
- Classification: [docs/reports/2026-04-27-indie-research-classification.md §C.1.1](../../../docs/reports/2026-04-27-indie-research-classification.md)
- Source game reference: Stoic GDC 2014 postmortem (verified: false — design note reference da doc research)

## Risks / open questions

- Senza playtest data, non sappiamo se i player vogliono attrition. Non implementare prima di TKT-M11B-06 risultati.
- NON copiare: dialogue branches 60+ Banner Saga (budget writer zero), permadeath obbligatorio (inaccessibile casual), caravan come loop principale (Evo-Tactics è combat-first).
- Verificare conflict con `missionTimer.js` pressure escalation — due sistemi di "urgenza" nello stesso campaign advance potrebbero creare overlap.
