---
title: Slay the Princess 12-Knot Branching — Narrative State Memory
museum_id: M-2026-04-27-025
type: research
domain: other
provenance:
  found_at: docs/research/2026-04-27-indie-narrative-gameplay.md §2 + docs/research/2026-04-27-indie-concept-rubabili.md §concept cross-ref
  source_game: 'Slay the Princess — Black Tabby Games (2023)'
  git_sha_first: unknown
  git_sha_last: unknown
  last_modified: 2026-04-27
  last_author: narrative-design-illuminator
  buried_reason: deferred
relevance_score: 3
reuse_path: apps/backend/services/narrative/narrativeRoutes.js debrief knot routing + vcScoring.js mbti_group derivation
related_pillars: [P4, P5]
status: curated
excavated_by: repo-archaeologist
excavated_on: 2026-04-27
last_verified: 2026-04-27
date_curated: 2026-04-27
domain_tag: P4
effort_estimate_h: 8
blast_radius_multiplier: low
trigger_for_revive: Decisione D4 risolta + writer assigned (content bottleneck)
related:
  - docs/research/2026-04-27-indie-narrative-gameplay.md
  - docs/reports/2026-04-27-indie-research-classification.md §C.3.1
  - apps/backend/services/narrative/narrativeRoutes.js
verified: false
---

# Slay the Princess 12-Knot Branching — Narrative State Memory

## Summary (30s)

- Debrief reattivo basato su MBTI group (4 gruppi NT/NF/ST/SF) × outcome (win/lose/timeout) = 12 knot. Player sente "il gioco sa come ho giocato".
- Deferred: writer bottleneck D4 (~55 ink units content), ~8h dev ma content bottleneck blocca.
- Trigger revive: decisione D4 (writer commission o reduce a 3 job scope) + writer assigned.

## What was buried

Pattern estratto da `indie-narrative-gameplay.md §2`. Slay the Princess: versioni della Principessa diverse basate su profilo comportamentale cumulativo (non flag binari). Il gioco ricorda il **profilo**, non le singole scelte. Effetto: player sente "la storia ricorda chi sono".

Per Evo-Tactics: `vcScoring.js` già produce `mbti_type` derivato. Debrief attualmente statico (`briefing_post` hardcoded). Fix: `narrativeRoutes.js` riceve `vcSnapshot` + `session_outcome` → seleziona debrief knot basato su `mbti_group` (NT/NF/ST/SF) × outcome (win/lose/timeout) = 12 knot.

Struttura ink proposta (verificata da doc research):

```ink
=== debrief ===
{mbti_group == "NT": -> debrief_NT - else: -> debrief_general}
```

**Prerequisiti già live**: `narrativeRoutes.js`, `vcScoring.js` con `mbti_type` derivato, ink engine `narrativeEngine.js`.

## Why it was buried

Classificato MUSEUM in `indie-research-classification.md §C.3.1`: "writer bottleneck D4 (~55 ink units content), ~8h dev". Il dev è ~8h ma serve writer per 12 knot × 3-5 frasi = ~60 unit di content narrativo. Non si implementa senza writer o decision di ridurre scope.

## Why it might still matter

P4 MBTI/temperamento (gap critico 🟡++): il debrief reattivo è la surface più immediata per mostrare che gli axes "fanno qualcosa". Player sente impatto choices senza UI invasiva. Gap `quality checklist narrativa`: "Failure come path valido" attualmente assente — questo chiuderebbe il gap.

## Concrete reuse paths

1. **Minimal (~3h, P2)**: routing `narrativeRoutes.js` su 4 knot (NT/NF/ST/SF) senza outcome split. Placeholder text nelle knot. Developer-only smoke test.
2. **Moderate (~5h, P1)**: 4 knot × outcome win/lose = 8 knot. Content minimo (1-3 frasi per knot). Placeholder per timeout.
3. **Full (~8h, P0 post-D4)**: 12 knot completi (4 group × 3 outcome), writer-commissioned content, `vcSnapshot` pipe a narrative endpoint, integration test `narrativeRoutes`.

## Sources / provenance trail

- Found at: [docs/research/2026-04-27-indie-narrative-gameplay.md §2](../../../docs/research/2026-04-27-indie-narrative-gameplay.md)
- Classification: [docs/reports/2026-04-27-indie-research-classification.md §C.3.1](../../../docs/reports/2026-04-27-indie-research-classification.md)
- Target: [apps/backend/services/narrative/narrativeRoutes.js](../../../apps/backend/services/narrative/narrativeRoutes.js)

## Risks / open questions

- NON 16 MBTI types diretti (48 combinazioni = overkill). Semplificare a 4 gruppi NT/NF/ST/SF × 3 outcome = 12. Budget realistico.
- NON debrief lungo >5 frasi. Evo-Tactics ha un debrief che compete con il rientro al menu. Brevità essenziale.
- Content bottleneck D4 è il vero blocco. Decisione: A) placeholder dev-only, B) writer commission, C) reduce a 3 job scope. Non auto-decidere.
- Verificare che `deriveMbtiType()` in `vcScoring.js` esporti `mbti_group` (NT/NF/ST/SF) oltre a `mbti_type` (16 tipi). Se non esiste `mbti_group` → aggiungere mapping function prima.
