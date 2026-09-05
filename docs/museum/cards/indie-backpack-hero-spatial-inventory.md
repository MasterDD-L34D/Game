---
title: Backpack Hero Spatial Inventory Adjacency
museum_id: M-2026-04-27-023
type: mechanic
domain: old_mechanics
provenance:
  found_at: docs/research/2026-04-27-indie-meccaniche-perfette.md §4
  source_game: 'Backpack Hero — The Gentlebros (2023)'
  git_sha_first: unknown
  git_sha_last: unknown
  last_modified: 2026-04-27
  last_author: narrative-design-illuminator
  buried_reason: deferred
relevance_score: 3
reuse_path: apps/backend/services/traitEffects.js organ_system adjacency check + rewardOffer.js grid preview
related_pillars: [P2, P3]
status: curated
excavated_by: repo-archaeologist
excavated_on: 2026-04-27
last_verified: 2026-04-27
date_curated: 2026-04-27
domain_tag: P2
effort_estimate_h: 13
blast_radius_multiplier: medium
trigger_for_revive: Post sprint S6 rebalance (Spore body_slot design convergence risolto)
related:
  - docs/research/2026-04-27-indie-meccaniche-perfette.md
  - docs/reports/2026-04-27-indie-research-classification.md §C.2.2
  - docs/adr/ADR-2026-04-26-spore-part-pack-slots.md
  - apps/backend/services/traitEffects.js
verified: false
---

# Backpack Hero Spatial Inventory Adjacency

## Summary (30s)

- Puzzle inventario a griglia Tetris: posizione fisica degli item crea bonus di adiacenza. Mappa a trait organ_system synergy — 2+ trait stesso organ_system attivi → bonus passivo.
- Deferred: overlap design con Spore S6 body_slot da risolvere. Implementare dopo S6 rebalance.
- Trigger revive: sprint S6 design convergence + overlap Spore risolto.

## What was buried

Pattern estratto da `indie-meccaniche-perfette.md §4`. Backpack Hero: zaino come griglia Tetris. Item in posizioni adiacenti sblocca bonus passivi. Combat usa item come risorse. Il puzzle spaziale crea investment materiale nell'equipaggiamento.

Per Evo-Tactics: non il Tetris completo (UX nightmare co-op TV), ma il **principio** (posizione fisica = bonus) come sinergie `organ_system`. Avere 2+ trait dello stesso `organ_system` attivi → `traitEffects.js` applica bonus passivo. `form_pack_bias.yaml` (V4 PR #1726) già implementa pacchetti tematici 16×3 — adiacenza sarebbe il layer bonus.

**Prerequisiti già live**: `form_pack_bias.yaml`, `rewardOffer.js`, `traitEffects.js`. `organ_system` tag già presente nei trait YAML. Manca solo la logica di check adiacenza.

## Why it was buried

Classificato MUSEUM in `indie-research-classification.md §C.2.2`: "convergenza con Spore S6 body_slot — overlap design da risolvere prima". ADR-2026-04-26-spore-part-pack-slots definisce slot system per Spore. Aggiungere adjacency bonus prima che S6 sia risolto crea duplicazione design.

## Why it might still matter

P2 Evoluzione (🟢 candidato) + P3 Specie×Job (🟢 candidato): adiacenza organ_system darebbe profondità emergente al system di trait senza aggiungere complessità esplicita. Il player scopre le sinergie, non le viene spiegato — effetto "non documentato" di Backpack Hero.

## Concrete reuse paths

1. **Minimal (~6h, P1)**: `traitEffects.js` check `organ_system` su 2+ trait attivi → applica `synergy_bonus: +1` attack/defense. Nessuna UI, solo effect wired.
2. **Moderate (~10h, P1)**: `rewardOffer.js` mostra griglia attuale + slot nuova visivamente con highlight adiacenza potenziale.
3. **Full (~13h, P0 post-S6)**: pack slot visual (colored cells non-Tetris), bonus adiacenza per familia (Senses/Motor/Cognitive organ_system), balance pass N=30.

## Sources / provenance trail

- Found at: [docs/research/2026-04-27-indie-meccaniche-perfette.md §4](../../../docs/research/2026-04-27-indie-meccaniche-perfette.md)
- Classification: [docs/reports/2026-04-27-indie-research-classification.md §C.2.2](../../../docs/reports/2026-04-27-indie-research-classification.md)
- ADR reference: [docs/adr/ADR-2026-04-26-spore-part-pack-slots.md](../../../docs/adr/ADR-2026-04-26-spore-part-pack-slots.md)

## Risks / open questions

- NON Tetris completo: per co-op TV con 4 player su telefono/gamepad è UX nightmare. Il principio si prende (adiacenza = bonus), non la griglia spaziale.
- NON item destruction mid-combat: troppo punitivo senza save/reload. Solo bonus passivi, no penalty da distruzione.
- Verificare che `organ_system` tag sia presente in tutti i 432 trait di `active_effects.yaml` prima di implementare check. `grep -c "organ_system:" data/core/traits/active_effects.yaml` — se coverage < 80% → tagging pass prima di adjacency feature.
