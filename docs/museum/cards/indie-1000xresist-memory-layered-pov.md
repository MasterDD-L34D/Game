---
title: 1000xRESIST Memory Layered POV — Campaign Tactical Memory
museum_id: M-2026-04-27-028
type: research
domain: other
provenance:
  found_at: docs/research/2026-04-27-indie-narrative-gameplay.md §5
  source_game: '1000xRESIST — sunset visitor / Fellow Traveller (2024)'
  git_sha_first: unknown
  git_sha_last: unknown
  last_modified: 2026-04-27
  last_author: narrative-design-illuminator
  buried_reason: deferred
relevance_score: 3
reuse_path: apps/backend/routes/session.js campaign advance + narrativeRoutes.js biome_loss conditional
related_pillars: [P4]
status: curated
excavated_by: repo-archaeologist
excavated_on: 2026-04-27
last_verified: 2026-04-27
date_curated: 2026-04-27
domain_tag: P4
effort_estimate_h: 5
blast_radius_multiplier: low
trigger_for_revive: Post-Bundle B narrative decision (cross-encounter memory confirmed)
related:
  - docs/research/2026-04-27-indie-narrative-gameplay.md
  - docs/reports/2026-04-27-indie-research-classification.md §C.3.4
  - apps/backend/routes/session.js
  - apps/backend/services/narrative/narrativeRoutes.js
verified: false
---

# 1000xRESIST Memory Layered POV — Campaign Tactical Memory

## Summary (30s)

- Il gioco ricorda cosa ha fatto male: briefing successivo nello stesso bioma cita esplicitamente cosa è successo prima ("la volta scorsa il Sistema ha usato il fianco destro").
- Deferred: ~5h, P4 nice-to-have non critico. Post-Bundle B narrative decision.
- Trigger revive: Bundle B (cross-encounter narrative persistence) confermata.

## What was buried

Pattern estratto da `indie-narrative-gameplay.md §5`. 1000xRESIST: player rivive ricordi con nuova consapevolezza. La prima volta vedi evento, la seconda sai cosa è successo dopo. Dramatic irony diegetica — il player sa qualcosa che il personaggio non sa ancora.

Per Evo-Tactics: campaign sessions sequenziali. Memoria pattern precedenti disponibile in `campaign advance` response. Implementazione: dopo loss in un biome (o KO), il **briefing successivo** nello stesso biome cambia. Cita esplicitamente cosa è successo: "La volta scorsa il Sistema ha usato l'area di copertura sul fianco destro. Tienilo in mente."

Informazione reale: derivata da `session_outcome` + `pressure_peak_position` (già tracciato in session state).

**Prerequisiti già live**: `campaign advance` endpoint, `session_outcome` tracking, `narrativeRoutes.js`, `biomeSpawnBias.js` (sa quale bioma). Manca: `previousBiomeLoss` store in campaign state + conditional ink knot.

## Why it was buried

Classificato MUSEUM in `indie-research-classification.md §C.3.4`: "~5h, P4 nice-to-have non critico". Non è urgente — il sistema funziona senza memoria cross-session. Classificato post-Bundle B perché richiede decision su quanto "memoria" vuole il design (rischio information overload).

## Why it might still matter

P4 MBTI/temperamento: la continuità narrativa cross-session fa sentire al player che il gioco lo conosce. Non è UI invasiva — è il briefing che ricorda. Dramatic irony tattica: il Sistema non ricorda le proprie sconfitte, il player sì. Potente per P5 co-op: la memoria condivisa crea narrativa del party.

## Concrete reuse paths

1. **Minimal (~3h, P2)**: `previousBiomeLoss` accumulato in campaign state JSON. Nessun effect su narrative ancora.
2. **Moderate (~4h, P1)**: `narrativeRoutes.js` riceve `biome_id` + `previousBiomeLoss[biome_id]`. Briefing ink conditional se `loss_count > 0` → variante che cita evento precedente.
3. **Full (~5h, P0 post-Bundle B)**: `pressure_peak_position` incluso nella memoria (cita area specifica), max 1 memoria per briefing (eventi significativi: KO, loss, pressure >80), Prisma persistence `CampaignState.biome_memory`.

## Sources / provenance trail

- Found at: [docs/research/2026-04-27-indie-narrative-gameplay.md §5](../../../docs/research/2026-04-27-indie-narrative-gameplay.md)
- Classification: [docs/reports/2026-04-27-indie-research-classification.md §C.3.4](../../../docs/reports/2026-04-27-indie-research-classification.md)
- Target: [apps/backend/services/narrative/narrativeRoutes.js](../../../apps/backend/services/narrative/narrativeRoutes.js)

## Risks / open questions

- NON generare memoria per ogni event (information overload). Solo eventi significativi: KO di un personaggio, loss di una missione, pressure peak >80. Max 1 memoria richiamata per briefing.
- `verification_needed: true` — design detail di 1000xRESIST da verificare contro fonte primaria (sunset visitor dev notes / 2024 release coverage) prima di scrivere content narrativo specifico.
- Verificare che `pressure_peak_position` sia effettivamente tracciato in `session.js` state — se non esiste → aggiungere tracking prima (~1h additivo).
