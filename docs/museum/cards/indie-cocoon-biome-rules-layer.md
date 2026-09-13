---
title: Cocoon Biome Rules Layer — Nested Tactical Systems
museum_id: M-2026-04-27-030
type: mechanic
domain: old_mechanics
provenance:
  found_at: docs/research/2026-04-27-indie-concept-rubabili.md §4
  source_game: 'Cocoon — Geometric Interactive / Annapurna (2023)'
  git_sha_first: unknown
  git_sha_last: unknown
  last_modified: 2026-04-27
  last_author: narrative-design-illuminator
  buried_reason: deferred
relevance_score: 3
reuse_path: data/core/biomes.yaml biome_rules extension + apps/backend/routes/session.js apply biome rules
related_pillars: [P1, P2]
status: curated
excavated_by: repo-archaeologist
excavated_on: 2026-04-27
last_verified: 2026-04-27
date_curated: 2026-04-27
domain_tag: P1
effort_estimate_h: 7
blast_radius_multiplier: medium
trigger_for_revive: Post sprint P3 specie×job closure + biomeSpawnBias.js stability confirmed
related:
  - docs/research/2026-04-27-indie-concept-rubabili.md
  - docs/reports/2026-04-27-indie-research-classification.md §C.4.3
  - apps/backend/services/combat/biomeSpawnBias.js
  - data/core/biomes.yaml
verified: false
---

# Cocoon Biome Rules Layer — Nested Tactical Systems

## Summary (30s)

- Ogni bioma ha 1-2 regole tattiche uniche in `biome_rules.yaml` (es. arctic: movement_cost_multiplier 1.5). Regole si combinano in transition zone. Briefing cita esplicitamente la regola.
- Deferred: deep biome rules engine ~7h + biomeSpawnBias.js rework. Post-P3 specie×job closure.
- Trigger revive: P3 specie×job closure + biomeSpawnBias.js stability confermata (no rework pending).

## What was buried

Pattern estratto da `indie-concept-rubabili.md §4`. Cocoon: player porta "mondi" (orbs) dentro altri mondi. Ogni orb è un ambiente autonomo con sue regole. Il concept è nested systems che si modificano vicendevolmente.

Per Evo-Tactics: biomi come sistemi con regole tattiche distinte. Ogni bioma ha file `biome_rules.yaml` con 1-2 regole speciali:

```yaml
arctic:
  movement_cost_multiplier: 1.5
  freeze_on_water: true
volcanic:
  hazard_every_n_turns: 3
```

Le regole si combinano in transition zone. Briefing ink cita regola speciale per bioma corrente. Il player "porta" la conoscenza da una missione all'altra.

**Prerequisiti già live**: `biomeSpawnBias.js` (PR #1726 V7), scenario YAML ha `biome_id`, `narrativeRoutes.js` con briefing endpoint.

## Why it was buried

Classificato MUSEUM in `indie-research-classification.md §C.4.3`: "deep biome rules engine ~7h + biomeSpawnBias.js rework". `biomeSpawnBias.js` è già un layer tattico per bioma — aggiungere `biome_rules.yaml` sopra prima di stabilizzare spawn bias creerebbe duplicazione. Priorità: stabilizzare P3 prima di espandere bioma layer.

## Why it might still matter

P1 Tattica leggibile (🟢 def, ma rinforza profondità): ogni bioma avrebbe un "sapore tattico" reale oltre allo spawn bias. Player impara le regole bioma come expertise. P2 Evoluzione: varietà emergente tra missioni senza design manuale di ogni scenario.

## Concrete reuse paths

1. **Minimal (~3h, P2)**: `biome_rules` field in `data/core/biomes.yaml` per 3 biomi (tutorial/arctic/volcanic). Schema extension solo, nessun runtime effect.
2. **Moderate (~5h, P1)**: loader in `session.js /start` applica `biome_rules` a session config. `movement_cost_multiplier` wired in hexGrid movement cost.
3. **Full (~7h, P0 post-P3)**: tutti i biomi con regole speciali, combinazione transition zone (2 biomi), briefing ink variant per bioma che cita regola speciale. Balance pass N=10 per 3 biomi.

## Sources / provenance trail

- Found at: [docs/research/2026-04-27-indie-concept-rubabili.md §4](../../../docs/research/2026-04-27-indie-concept-rubabili.md)
- Classification: [docs/reports/2026-04-27-indie-research-classification.md §C.4.3](../../../docs/reports/2026-04-27-indie-research-classification.md)
- Target: [data/core/biomes.yaml](../../../data/core/biomes.yaml) + [apps/backend/services/combat/biomeSpawnBias.js](../../../apps/backend/services/combat/biomeSpawnBias.js)

## Risks / open questions

- NON level design annidato letterale (Cocoon richiede world design per ogni strato). Evo-Tactics non ha budget per world design iterativo — semplifica a "regole bioma come layer flat", non annidamento.
- Decisione design: quanti biomi con regole speciali al lancio? 3 (tutorial/arctic/volcanic) = manageable. Tutti i 40+ biomi = content creation enorme. Raccomandazione: 3 al lancio, espandibili.
- Verificare compatibilità con `biomeSpawnBias.js` — entrambi modificano il comportamento in-session basato su biome_id. Assicurarsi che le due pipeline non si sovrascrivano. `grep -n "biome_id" apps/backend/services/combat/biomeSpawnBias.js` prima di implementare.
