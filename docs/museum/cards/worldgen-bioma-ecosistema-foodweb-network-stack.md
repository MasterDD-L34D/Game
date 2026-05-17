---
title: 'Worldgen Stack 4-livelli: bioma → ecosistema → foodweb → network'
museum_id: M-2026-04-26-012
type: architecture
domain: [architecture]
provenance:
  found_at: 'docs/core/00-SOURCE-OF-TRUTH.md:110-169'
  git_sha_first: '8ee399e8'
  git_sha_last: '6b07b18e'
  last_modified: '2025-11-29'
  last_author: 'MasterDD-L34D'
  buried_reason: forgotten
relevance_score: 5
reuse_path: 'apps/backend/services/combat/biomeSpawnBias.js:1 — extend da affix-bias a full ecosystem loader; packs/evo_tactics_pack/data/ecosystems/ — dati già esistenti'
related_pillars: [P1, P3, P6]
status: curated
excavated_by: repo-archaeologist
excavated_on: 2026-04-26
last_verified: 2026-04-26
---

# Worldgen Stack 4-livelli: bioma → ecosistema → foodweb → network

## Summary (30s)

- Il mondo di Evo-Tactics è modellato come **rete di ecosistemi** a 4 livelli sovrapposti, non come elenco di mappe intercambiabili.
- Tutta l'infrastruttura dati esiste e valida (`data/core/biomes.yaml`, 5 `*.ecosystem.yaml`, 5 `*_foodweb.yaml`, `meta_network_alpha.yaml`). Il runtime ne consuma solo lo strato superficiale (affix → spawn bias).
- Rischio: sessioni future di Claude descrivono il gioco come "rotazione di mappe" ignorando 3 livelli profondi già documentati e validati.

## What was buried

La formula canonical da SoT §3 (lines 110-169):

```
bioma → ecosistema → foodweb → specie/ruoli → network fra biomi → eventi propagati → encounter e pressioni di gioco
```

**Livello 1 — bioma** (`data/core/biomes.yaml`, ~30+ biomi):
Ogni bioma è un pacchetto: `difficulty`, `affixes`, `hazard`, `npc_archetypes`, `StressWave` baseline + escalation, tono narrativo, hooks.

**Livello 2 — ecosistema** (`packs/evo_tactics_pack/data/ecosystems/*.ecosystem.yaml`, 5 file):
Clima, aria, abiotico, struttura trofica (produttori → consumatori primari/secondari/terziari → decompositori), link specie, link foodweb, ruoli minimi (`apex`, `keystone`, `bridge`, `threat`, `event`).

**Livello 3 — meta-ecosistema** (`packs/evo_tactics_pack/data/ecosystems/network/meta_network_alpha.yaml`):
5 nodi (BADLANDS, FORESTA_TEMPERATA, DESERTO_CALDO, CRYOSTEPPE, ROVINE_PLANARI). 12 edge tipizzati (`corridor`, `seasonal_bridge`, `trophic_spillover`). `bridge_species_map`. Regole `at_least` (sentient ≥1, apex ≥1, keystone ≥2, bridge ≥1, threat ≥1, event ≥1).

**Livello 4 — eventi cross-bioma** (`packs/evo_tactics_pack/data/ecosystems/network/cross_events.yaml`):
3 eventi con source node + propagation edge type + effetti gameplay (penalità visibilità, stress termico, attrito).

**Schema formale**: `packs/evo_tactics_pack/docs/ecosistema.schema.v2.0.yaml` e `ecosystem_network.schema.v2.0.yaml` — JSON Schema completo, committed 2025-10-25.

## Why it was buried

- Il modello è stato costruito interamente tra 2025-10-25 e 2025-11-29 (`8ee399e8`→`6b07b18e`) — prima che il session engine e il round model fossero il focus principale.
- Sprint successivi (M6-M17, 2026-04) hanno costruito combat loop, forms, jobs, WS lobby, VC scoring — senza mai tornare a wire il livello 2-3-4 nel runtime.
- `biomeSpawnBias.js` (PR #1726, 2026-04-24) è stato l'unico passo verso questo modello, consumando solo gli `affixes` (livello 1), non i dati ecosistemici (livello 2+).
- SoT §3 documenta tutto chiaramente, ma SoT viene raramente letto in contesto di "cosa fare oggi".

## Why it might still matter

- **P1 Tattica leggibile**: biomi con pressioni ecologiche distinte → encounter tatticamente diversi oltre i semplici affix bonus.
- **P3 Specie×Job**: ruoli trofici (apex/keystone/bridge) potrebbero mappare su job archetypes (Senses→Recon, Comm→Support, Settlement→Tank) — connessione già esplorata in CLAUDE.md Sprint context.
- **P6 Fairness**: cross-event propagation = pressione dinamica inattesa, meccanica Long War 2-style già richiesta per Hardcore encounter.
- `biome_pools.json` (`data/core/traits/biome_pools.json`, 489 righe, commit 2025-10-29) contiene già `role_templates` per ogni bioma — struttura pronta per wire verso spawn director.

## Concrete reuse paths

1. **Minimal** (P0, ~3h): estendi `biomeSpawnBias.js` per leggere `role_templates` da `biome_pools.json` invece del solo `AFFIX_TAG_AFFINITIES` hardcoded. Wire nei `reinforcementSpawner.js` (già importa `applyBiomeBias`). Blast radius ×1.3 (route layer) → ~4h.
2. **Moderate** (P1, ~8h): loader `ecosistemaService.js` che legge `*.ecosystem.yaml` per sessione e passa `trophic_structure` a `reinforcementSpawner` per spawn pool qualificato per ruolo. Blast radius ×1.5 (combat hot path) → ~12h.
3. **Full** (P2, ~25h): wire completo `meta_network_alpha.yaml` + `cross_events.yaml` → director riceve pressure da eventi propagati da altri biomi. Richiede ADR + `sessionRoundBridge` extension + event emitter. Blast radius ×1.7 (vcSnapshot core) → ~42h.

## Sources / provenance trail

- Found at: [docs/core/00-SOURCE-OF-TRUTH.md:110-169](../../../docs/core/00-SOURCE-OF-TRUTH.md)
- Schema: [packs/evo_tactics_pack/docs/ecosistema.schema.v2.0.yaml](../../../packs/evo_tactics_pack/docs/ecosistema.schema.v2.0.yaml) — commit `8ee399e8` (MasterDD-L34D, 2025-10-25)
- Meta-network: [packs/evo_tactics_pack/data/ecosystems/network/meta_network_alpha.yaml](../../../packs/evo_tactics_pack/data/ecosystems/network/meta_network_alpha.yaml) — commit `6b07b18e` (MasterDD-L34D, 2025-11-29)
- Runtime parziale: [apps/backend/services/combat/biomeSpawnBias.js](../../../apps/backend/services/combat/biomeSpawnBias.js) — commit `0d501169` (MasterDD-L34D, 2026-04-24)
- Closed PR: [#330 Add root ecosystem definitions](https://github.com/MasterDD-L34D/Game/pull/330) — MERGED 2025-10-30
- Closed PR: [#1459 atlas + foodweb migration](https://github.com/MasterDD-L34D/Game/pull/1459) — MERGED 2026-04-16
- Related card: [architecture-biome-memory-trait-cost.md](architecture-biome-memory-trait-cost.md) — score 4/5

## Risks / open questions

- `bridge_species_map` cita `echo-wing`, `ferrocolonia-magnetotattica`, `archon-solare` — questi slug NON sono in `data/core/species.yaml` (solo 1 entry con `biome_affinity: savana` = dune_stalker). Conflict: bridge species vivono SOLO nel pack ecosystem, non nel core canonical. Serve ADR prima di wire runtime.
- `biome_id` in `meta_network_alpha.yaml` usa slug come `canyons_risonanti`, `foresta_miceliale` — potrebbero non matchare slug in `data/core/biomes.yaml`. Verificare con `grep -n "canyons_risonanti" data/core/biomes.yaml` prima di wire.
- "Non promuovere cross-event a meccanica player-visible senza UX research" — la foodweb è motore invisibile per design (SoT §4 esplicito: "impatto basso come meccanica esplicita").
