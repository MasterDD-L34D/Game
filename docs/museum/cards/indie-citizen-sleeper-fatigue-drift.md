---
title: Citizen Sleeper Fatigue Drift Cross-Encounter
museum_id: M-2026-04-27-021
type: mechanic
domain: old_mechanics
provenance:
  found_at: docs/research/2026-04-27-indie-concept-rubabili.md §1
  source_game: 'Citizen Sleeper — Jump Over The Age / Fellow Traveller (2022)'
  git_sha_first: unknown
  git_sha_last: unknown
  last_modified: 2026-04-27
  last_author: narrative-design-illuminator
  buried_reason: deferred
relevance_score: 3
reuse_path: apps/backend/routes/session.js campaign advance + vcScoring.js axis modifier
related_pillars: [P4, P6]
status: curated
excavated_by: repo-archaeologist
excavated_on: 2026-04-27
last_verified: 2026-04-27
date_curated: 2026-04-27
domain_tag: P4
effort_estimate_h: 8
blast_radius_multiplier: medium
trigger_for_revive: Post-Bundle C decision (cross-encounter persistence confirmed post-playtest)
related:
  - docs/research/2026-04-27-indie-concept-rubabili.md
  - docs/reports/2026-04-27-indie-research-classification.md §C.1.3
  - apps/backend/services/vcScoring.js
verified: false
---

# Citizen Sleeper Fatigue Drift Cross-Encounter

## Summary (30s)

- Fatigue accumulato da trauma (KO, mission loss) modifica VC axis scoring cross-encounter — il corpo come risorsa temporale.
- Deferred: stato persistente cross-encounter + Prisma overhead. Classificato post-Bundle C.
- Trigger revive: decision Bundle C (cross-encounter persistence) confirmata.

## What was buried

Pattern estratto da `indie-concept-rubabili.md §1`. Citizen Sleeper: corpo che si degrada nel tempo (pool dadi ridotto ogni ciclo senza Medicine). Il clock diegetico non è HUD number — è la vita del personaggio che si esaurisce.

Per Evo-Tactics: ogni sessione con trauma (KO, permadeath scenario, pressure peak >80) aggiunge 1 punto `fatigue` alla species. Fatigue accumulata → modifica VC axis scoring (più T → meno F, pression diegetica). Il player "cura" la fatigue tra sessioni con rest events (ink knot). UI: indicatore `stato del party` nel briefing panel.

**Prerequisiti parziali**: `vcScoring.js` già calcola axes, `campaign advance` endpoint già live. Manca: fatigue accumulator store + ink knot rest events.

## Why it was buried

Classificato MUSEUM in `indie-research-classification.md §C.1.3`: "stato persistente cross-encounter + Prisma overhead". Richiede decision Bundle C (feature flag persistence) prima di essere safe da implementare. Il concept del dado (dice pool allocation) è out-of-scope — troppo complesso per co-op TV con 4 pool simultanei.

## Why it might still matter

P4 MBTI/temperamento (🟡 → gap critico): le VC axes si muovono già within-session ma NON cross-session. Fatigue drift darebbe continuità narrativa reale alle axes. P6 Fairness: conseguenze che persistono oltre il singolo combattimento.

## Concrete reuse paths

1. **Minimal (~4h, P2)**: `fatigueTracker.js` standalone — accumula `fatigue_points` in campaign state. Log solo, no effect su gameplay.
2. **Moderate (~6h, P1)**: fatigue modifica `vcScoring.js` axis weight (es. -0.05 su asse T_F per ogni punto fatigue). UI indicator nel briefing panel.
3. **Full (~8h, P0 post-Bundle C)**: ink knot rest events (2-3 varianti), fatigue cura via rest choice, Prisma persistence `CampaignState.fatigue_points`.

## Sources / provenance trail

- Found at: [docs/research/2026-04-27-indie-concept-rubabili.md §1](../../../docs/research/2026-04-27-indie-concept-rubabili.md)
- Classification: [docs/reports/2026-04-27-indie-research-classification.md §C.1.3](../../../docs/reports/2026-04-27-indie-research-classification.md)
- Target service: [apps/backend/services/vcScoring.js](../../../apps/backend/services/vcScoring.js)

## Risks / open questions

- NON copiare il dice pool di Citizen Sleeper (singolo-personaggio + narrativo). Concept si prende (risorsa corporea temporale), non la meccanica dadi. In co-op 4 pool individuali = overhead insostenibile.
- Blast radius multiplier MEDIUM: modifica `vcScoring.js` tocca session hot path (formula aggregate score). Pre-audit delle 20+ raw metrics prima di aggiungere modifier.
- Non implementare prima di conferma Bundle C persistence — senza Prisma store, fatigue resetta ogni sessione vanificando il concept.
