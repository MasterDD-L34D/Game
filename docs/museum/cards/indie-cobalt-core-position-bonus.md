---
title: Cobalt Core Position-Conditional Ability Bonus
museum_id: M-2026-04-27-024
type: mechanic
domain: old_mechanics
provenance:
  found_at: docs/research/2026-04-27-indie-meccaniche-perfette.md §5
  source_game: 'Cobalt Core — Brace Yourself Games (2023)'
  git_sha_first: unknown
  git_sha_last: unknown
  last_modified: 2026-04-27
  last_author: narrative-design-illuminator
  buried_reason: deferred
relevance_score: 4
reuse_path: apps/backend/services/combat/abilityExecutor.js position_condition tag check
related_pillars: [P1, P5]
status: curated
excavated_by: repo-archaeologist
excavated_on: 2026-04-27
last_verified: 2026-04-27
date_curated: 2026-04-27
domain_tag: P1
effort_estimate_h: 15
blast_radius_multiplier: medium
trigger_for_revive: Post-Bundle A "Tactical depth" decision master-dd
related:
  - docs/research/2026-04-27-indie-meccaniche-perfette.md
  - docs/reports/2026-04-27-indie-research-classification.md §C.2.3
  - apps/backend/services/combat/abilityExecutor.js
  - apps/backend/services/hexGrid.js
verified: false
---

# Cobalt Core Position-Conditional Ability Bonus

## Summary (30s)

- Carte che modificano posizione della nave come prerequisito per abilità. Pattern estratto: `position_condition` tag in `abilityExecutor.js` → attacco +2 se flanking.
- Deferred: `abilityExecutor.js` + `traitEffects.js` ripple ~5h, richiede balance-illuminator review. Post-Bundle A "Tactical depth".
- Trigger revive: Bundle A decision + balance-illuminator review approvata.

## What was buried

Pattern estratto da `indie-meccaniche-perfette.md §5`. Cobalt Core: carte che funzionano solo in certi position state (3 corsie: top/mid/bot). Il posizionamento è meta-rilevante per l'intero sistema. In co-op, deck misti creano sinergie cross-character.

Per Evo-Tactics: `hexGrid.js` già implementato (ADR-2026-04-16, axial coordinates + A\*). Le abilità già hanno `effective_reach` e `range` position-dependent. `position_condition` sarebbe un nuovo tag in `active_effects.yaml` che `abilityExecutor.js` valuta: es. `position_condition: flanking` → attacco +2 se target ha un ally sul hex opposto.

**Prerequisiti già live**: `hexGrid.js` (range/LOS), `abilityExecutor.js` (18 effect_type live), `data/core/traits/active_effects.yaml` schema YAML per nuovi tag.

## Why it was buried

Classificato MUSEUM in `indie-research-classification.md §C.2.3`: "abilityExecutor + traitEffects ripple ~5h, requires balance-illuminator review". `abilityExecutor.js` è combat hot path — ogni modifica richiede N=30+ balance validation. Non è safe da implementare senza review dedicata.

## Why it might still matter

P1 Tattica leggibile (🟢 def, ma rinforza profondità): il posizionamento già conta (movement, range, LOS) ma non modifica ability damage. Position-conditional bonus aggiungerebbe un secondo layer di decisione senza modificare le regole core d20. P5 Co-op: cross-party ability unlock (2+ player con species_tag matching) crea identità party emergente.

## Concrete reuse paths

1. **Minimal (~5h, P1)**: `abilityExecutor.js` check `position_condition` tag. Solo `flanking` e `adjacent_ally` come condition iniziali. +2 bonus attack. Balance pass N=10.
2. **Moderate (~10h, P1)**: 3-5 condition types + 2+ trait in `active_effects.yaml` con `position_condition` field. Cross-party ability unlock se `species_tag` matching in party (check su session `/start`).
3. **Full (~15h, P0 post-Bundle A)**: position as narrative trigger (briefing ink variant se party ha formation specifica), full balance review 7 job × position_condition matrix, N=30 calibration.

## Sources / provenance trail

- Found at: [docs/research/2026-04-27-indie-meccaniche-perfette.md §5](../../../docs/research/2026-04-27-indie-meccaniche-perfette.md)
- Classification: [docs/reports/2026-04-27-indie-research-classification.md §C.2.3](../../../docs/reports/2026-04-27-indie-research-classification.md)
- Target: [apps/backend/services/combat/abilityExecutor.js](../../../apps/backend/services/combat/abilityExecutor.js)

## Risks / open questions

- NON deck building roguelite — Cobalt Core estrae carta casualmente. Evo-Tactics ha job abilities fisse. Solo position-conditional bonus, non pool casuale.
- NON layout 3 corsie — Cobalt Core è 2D side-scrolling. Evo-Tactics ha hex grid 3D. Non adattare layout visivo, solo il principio "posizione modifica bonus".
- Blast radius: combat hot path `abilityExecutor.js` richiede blast-radius multiplier ×1.5. Effort 5h naive × 1.5 = 7.5h minimum. Più regression test → 10-12h reale. Non sottovalutare.
