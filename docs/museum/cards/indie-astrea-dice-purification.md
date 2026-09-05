---
title: Astrea Dice Purification Dual-Resource
museum_id: M-2026-04-27-022
type: mechanic
domain: old_mechanics
provenance:
  found_at: docs/research/2026-04-27-indie-meccaniche-perfette.md §3
  source_game: 'Astrea: Six-Sided Oracles — Little Leo Games (2023)'
  git_sha_first: unknown
  git_sha_last: unknown
  last_modified: 2026-04-27
  last_author: narrative-design-illuminator
  buried_reason: deferred
relevance_score: 3
reuse_path: onboardingPanel.js Thought Cabinet + vcScoring.js VC axes as visible dual-resource
related_pillars: [P2, P4]
status: curated
excavated_by: repo-archaeologist
excavated_on: 2026-04-27
last_verified: 2026-04-27
date_curated: 2026-04-27
domain_tag: P4
effort_estimate_h: 15
blast_radius_multiplier: medium
trigger_for_revive: Solo se P4 dice mechanic richiesto post-MBTI surface (post-decisione OD-013)
related:
  - docs/research/2026-04-27-indie-meccaniche-perfette.md
  - docs/reports/2026-04-27-indie-research-classification.md §C.2.1
  - apps/backend/services/vcScoring.js
verified: false
---

# Astrea Dice Purification Dual-Resource

## Summary (30s)

- Dadi a facce contaminate/pure come metafora tangibile del personaggio. Pool dadi = character sheet visibile. Mappa a VC axes come dual-resource Corruption/Purification.
- Deferred DEFER #1925 — Spore Moderate ha già MP pool, scope creep. Attivare solo se P4 dice mechanic richiesto post-MBTI surface.
- Trigger revive: OD-013 MBTI surface verdict + P4 specificamente richiede visualizzazione axes come "dadi".

## What was buried

Pattern estratto da `indie-meccaniche-perfette.md §3`. Astrea: dadi con facce Corruption/Purification. Player modifica le facce attraverso upgrade (letteralmente upgrada il dado). La strategia nasce dalla tensione: più dadi = più potenziale ma più rischio Corruption. Il dado è la metafora tangibile del personaggio.

Per Evo-Tactics: le VC axes (T_F, S_N, E_I, J_P come numeric 0-1) sono già "dadi" concettuali. Pattern di purificazione mappa a "internalization" del Thought Cabinet (V1 onboardingPanel). Debrief potrebbe mostrare radar chart axes come "dadi" con facce contaminate/pure.

**Prerequisiti parziali**: Thought Cabinet V1 (`onboardingPanel.js`), `vcScoring.js` con 20+ raw metrics, `formEvolution.js` (P2 live). Mancano: visual metaphor layer + cognitive stress accumulator.

## Why it was buried

Classificato MUSEUM in `indie-research-classification.md §C.2.1`: "DEFER #1925 — Spore Moderate ha già MP pool, scope creep". Overlap design con MP pool già implementato creerebbe confusione per il player. Da attivare solo se P4 richiede esplicitamente la visualizzazione delle axes come risorsa duale.

## Why it might still matter

P4 MBTI/temperamento (gap critico 🟡): le VC axes sono invisibili al player. Il pattern Astrea offre un modo per rendere le axes tangibili senza introdurre meccanica casuale. P2 Evoluzione: la progressione "visibile e fisica" è il gap centrale del pillar.

## Concrete reuse paths

1. **Minimal (~5h, P2)**: debrief mostra radar chart VC axes con visual "prima/dopo" per sessione corrente. Puro visual, no game mechanic.
2. **Moderate (~10h, P1)**: Thought Cabinet internalization mostra "before/after" axis delta visivamente. Thought internalized = faccia "purificata" nel chart.
3. **Full (~15h, P0 post-OD-013)**: cognitive stress accumulator (`vcScoring.js` `cognitiveStress` field), sessioni high T_F drift accumulano "cognitive stress" visibile in debrief + Thought Cabinet visual dice.

## Sources / provenance trail

- Found at: [docs/research/2026-04-27-indie-meccaniche-perfette.md §3](../../../docs/research/2026-04-27-indie-meccaniche-perfette.md)
- Classification: [docs/reports/2026-04-27-indie-research-classification.md §C.2.1](../../../docs/reports/2026-04-27-indie-research-classification.md)
- Target: [apps/play/src/onboardingPanel.js](../../../apps/play/src/onboardingPanel.js)

## Risks / open questions

- NON copiare: full RNG dice roll ogni turno (core roguelite Astrea), 6+ tipi di dado simultanei (cognitive load), roguelite run restart (incompatibile con progressione persistente XCOM-style).
- Max 2 axis visibili per volta — combat di Evo-Tactics è già cognitivamente denso. Radar chart completo nel debrief, non in-combat.
- Verificare overlap con MP pool Spore prima di implementare. Se il player vede sia MP che VC axes come risorsa duale → confusion. Scegliere una delle due come "risorsa visibile primaria".
