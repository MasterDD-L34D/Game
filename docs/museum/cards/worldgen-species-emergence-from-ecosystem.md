---
title: 'Emergenza specie da ecosistema: role_templates + biome_pools come PCG layer'
museum_id: M-2026-04-26-013
type: mechanic
domain: [architecture]
provenance:
  found_at: 'data/core/traits/biome_pools.json:1'
  git_sha_first: 'b8837878'
  git_sha_last: '76d83209'
  last_modified: '2025-11-23'
  last_author: 'MasterDD-L34D'
  buried_reason: deferred
relevance_score: 4
reuse_path: 'apps/backend/services/catalog.js:145 — role_templates già parsati, non esposti a spawn director'
related_pillars: [P1, P3]
status: reviewed
reviewed_by: "ADR biome/species data model (issue #3302) -- lo stack 4-livelli diventa enforced; la catena bioma -> ruolo -> trait pool -> specie e' il livello che l'ADR normalizza"
reviewed_on: 2026-07-14
excavated_by: repo-archaeologist
excavated_on: 2026-04-26
last_verified: 2026-07-14
---

# Emergenza specie da ecosistema: role_templates + biome_pools come PCG layer

## Summary (30s)

- `data/core/traits/biome_pools.json` (489 righe, 8+ pool) contiene per ogni bioma: `role_templates` con ruolo (`apex`, `keystone`, `bridge`, `threat`, `minion`), `functional_tags`, `preferred_traits`, `tier` — infrastruttura PCG completa per spawn procedurale basato su ecosistema.
- `apps/backend/services/catalog.js:145` già carica i `role_templates`, ma non li passa al spawn director.
- Gap: la catena "bioma → ecosistema → ruolo → trait pool → specie generata" è documentata in SoT §5, i dati esistono, il runtime si ferma al mapping affix→tag (livello 1).

## What was buried

`data/core/traits/biome_pools.json` struttura per pool (esempio `cryosteppe_convergence`):

```json
{
  "id": "cryosteppe_convergence",
  "climate_tags": ["frozen", "wind", "night"],
  "hazard": { ... },
  "ecology": { "biome_type": "cryosteppe", "primary_resources": [...] },
  "traits": {
    "core": ["ghiaccio_piezoelettrico", "criostasi_adattiva", ...],
    "support": [...]
  },
  "role_templates": [
    {
      "role": "apex",
      "label": "Predatore Risonante",
      "functional_tags": ["criogenico", "imboscata"],
      "preferred_traits": ["criostasi_adattiva", "ghiaccio_piezoelettrico"],
      "tier": 4
    },
    {
      "role": "keystone",
      "label": "Scultore di Cristalli",
      "functional_tags": ["supporto", "costruttore"],
      "tier": 2
    }
  ]
}
```

8 pool attivi in `biome_pools.json`, coprono: `cryosteppe_convergence`, `badlands` e altri. Commit originale `b8837878` (2025-10-29 "Refactor data layout and tooling").

Formula completa SoT §5 (lines 315-319):

```
Bioma/Ecosistema/Pressione → Specie → Parti/Morph → Trait → Forma/PI → comportamento → telemetria VC → unlock/mutazione/Nido
```

`catalog.js:145` parser:

```javascript
const templates = Array.isArray(doc.role_templates) ? doc.role_templates : [];
// ... parsed ma non consumato da spawn director
```

## Why it was buried

- `biome_pools.json` creato 2025-10-29 come parte del data layout refactor prima che il session engine fosse il focus.
- `catalog.js` carica i template per validazione/reporting, mai per spawn procedurale.
- Il reinforcementSpawner usa `spawner_config` hard-codato per encounter (enemy_pool da `*.encounter.yaml`), non da `biome_pools.json`.
- Deferred perché "PCG procedural" è sprint M12+, fuori scope MVP.

## Why it might still matter

- **P3 Identità Specie×Job**: ruolo trofico (`apex`→predatore→vanguard/skirmisher, `keystone`→supporto→warden/artificer) crea coerenza ecologica senza overhead design per ogni encounter.
- **P1 Tattica leggibile**: encounter generati con `role_templates` biome-consistent = AI avversaria con pattern ecologicamente credibile.
- `biome_pools.json` è già la struttura PCG. Non serve inventarla — serve wire.
- `traitEffects.js:126-171` già usa `clade_tag` e `role_tags` per trait resolution. `role_templates.functional_tags` può mapparsi direttamente.

## Concrete reuse paths

1. **Minimal** (P0, ~4h): quando `reinforcementSpawner` riceve un wave, invece del pool fisso, filter `biome_pools.json[biome_type].role_templates` per `role=minion/support` e pick `preferred_traits` come trait pool per l'enemy. Wire in `reinforcementSpawner.js:84` dove già importa `applyBiomeBias`. Blast radius ×1.5 → ~6h.
2. **Moderate** (P1, ~10h): genera enemy da `role_templates` dinamicamente via `SpeciesBuilder` con `biome_id` come input seed. Richiede loader `biomePoolsService.js` + unit test 5 casi. Blast radius ×1.5 → ~15h.
3. **Full** (P2, ~30h): procedural encounter generator che costruisce wave intera da `biome_pools.json` per difficulty tier (apex per boss, keystone per elite, minion per wave). Rimpiazza encounter YAML statici. ADR richiesto. Blast radius ×2.0 (schema-changing) → ~60h.

## Sources / provenance trail

- Found at: [data/core/traits/biome_pools.json:1](../../../data/core/traits/biome_pools.json) — commit `b8837878` (MasterDD-L34D, 2025-10-29)
- Consumer: [apps/backend/services/catalog.js:145](../../../apps/backend/services/catalog.js) — role_templates caricati ma non esportati a spawn
- SoT reference: [docs/core/00-SOURCE-OF-TRUTH.md:253-323](../../../docs/core/00-SOURCE-OF-TRUTH.md) — §5 formula completa sistema evolutivo
- Related card: [worldgen-bioma-ecosistema-foodweb-network-stack.md](worldgen-bioma-ecosistema-foodweb-network-stack.md) — stack 4-livelli padre

## Risks / open questions

- `preferred_traits` in `biome_pools.json` non è cross-validato con `data/core/traits/active_effects.yaml` — slug potrebbero essere stale (es. `ghiaccio_piezoelettrico` existe? `criostasi_adattiva`?). Verificare con `grep -n "ghiaccio_piezoelettrico" data/core/traits/active_effects.yaml` prima di wire.
- Pool copre 8 biomi ma `data/core/biomes.yaml` ha 30+ biomi — gap PCG se si wire solo i pool esistenti. Decision user: coverage completa (2-3h content fill) o solo biomi con pool.
- NON usare come replacement di encounter YAML senza ADR + calibration harness N=10 (Pillar 6 rischio).

---

## REVIEWED -- 2026-07-14 (ADR biome/species data model, issue #3302)

Status `curated` -> `reviewed`. La catena descritta da questa card (**bioma -> ruolo -> trait pool -> specie**) e' esattamente il livello che l'ADR normalizza.

**Contesto nuovo e scomodo**: la card assumeva un catalogo specie sano. Non lo e'. Censimento verificato 2026-07-14:

- **59 / 105** file specie sono **stub autogenerati** (**56%** del catalogo).
- `rovine_planari`: **10 file, 10 stub, 0 specie reali**.
- **21 directory bioma** contengono un solo stub keeper da 3 righe e **zero specie**.

Il "PCG layer" ha quindi un substrato **molto piu' sottile** di quanto la card lasciasse intendere. `role_templates` + `biome_pools.json` restano validi come **infrastruttura**, ma la popolazione di specie reali su cui dovrebbero pescare e' meno della meta' del conteggio nominale.

**Il gap `preferred_traits` non cross-validato** segnalato nei Risks qui sopra si e' rivelato **la punta di un problema piu' grosso**: il gate di copertura trait misurava zero perche' 5 strati di dati fabbricati lo tenevano su. Vedi [M-2026-07-14-001](lesson-coverage-fabrication-five-layers.md).

**Il rischio "pool copre 8 biomi ma biomes.yaml ne ha 30+"**: conteggio corretto -> `biomes.yaml` ha **20** biomi canonici (verificato 2026-07-14), non 30+.

Cross-link: [M-2026-07-14-001](lesson-coverage-fabrication-five-layers.md) - [M-2026-07-14-002](worldgen-biome-vocabularies-orphan.md) - [M-2026-04-26-012](worldgen-bioma-ecosistema-foodweb-network-stack.md) (**revived**).
