---
title: 'Bioma come pacchetto gameplay+fiction: non è una mappa, è un sistema'
museum_id: M-2026-04-26-018
type: architecture
domain: [architecture]
provenance:
  found_at: 'data/core/biomes.yaml:1 + docs/core/00-SOURCE-OF-TRUTH.md:115-127'
  git_sha_first: '8ee399e8'
  git_sha_last: '5c7fb61a'
  last_modified: '2026-04-25'
  last_author: 'MasterDD-L34D'
  buried_reason: forgotten
relevance_score: 5
reuse_path: 'apps/backend/services/combat/biomeSpawnBias.js — estendi da affix-match a full bioma package consumer (StressWave + hazard + npc_archetypes + tono)'
related_pillars: [P1, P3, P6]
status: curated
excavated_by: repo-archaeologist
excavated_on: 2026-04-26
last_verified: 2026-04-26
---

# Bioma come pacchetto gameplay+fiction: non è una mappa, è una mappa

## Summary (30s)

- `data/core/biomes.yaml` contiene per ogni bioma un pacchetto completo: `difficulty`, `affixes`, `hazard` (severity + stress_modifiers), `npc_archetypes` (primary/support/threat), `StressWave` baseline/escalation, tono narrativo, hooks — NON solo un nome di ambientazione.
- Il runtime consuma solo `affixes` (via `biomeSpawnBias.js`) e `npc_archetypes` (via `reinforcementSpawner`). Tutto il resto (`hazard.stress_modifiers`, `StressWave`, tono, hooks) è caricato ma non usato nella sessione.
- Score 5/5 perché: dati completi e validated, path di wire concreta (biomeSpawnBias già open), impatto diretto su P1+P6 senza ADR nuovi.

## What was buried

`data/core/biomes.yaml` struttura per ogni bioma (es. `abisso_vulcanico`):

```yaml
biomes:
  abisso_vulcanico:
    biome_class: geothermal
    display_name_it: Abisso Vulcanico
    diff_base: 5
    mod_biome: 3
    affixes: [termico, luminescente, spore_diluite, sabbia] # ← usato (biomeSpawnBias)
    hazard:
      description: 'Sfiati di magma, shock termici e colate improvvise...'
      severity: high
      stress_modifiers:
        magma_surge: 0.07 # ← NON usato a runtime
        thermal_shock: 0.06 # ← NON usato a runtime
    npc_archetypes:
      primary: [abyssal_forgers, magma_wardens] # ← parzialmente usato
      support: [...]
      threat: [...]
    # ... StressWave baseline + escalation, tono, hooks (assenti in questo bioma ma presenti in altri)
```

`data/core/biomes.yaml` ha 30+ biomi. Commit più recente `5c7fb61a` (2026-04-25, magnetic_rift) — file aggiornato attivamente.

**`biomeSpawnBias.js`** (unico consumer runtime corrente):

```javascript
// Consuma: affixes → AFFIX_TAG_AFFINITIES → weight boost per unit.tags
// NON consuma: hazard.stress_modifiers, StressWave, npc_archetypes.threat, tono
```

**`reinforcementSpawner.js:84`**:

```javascript
const { applyBiomeBias } = require('./biomeSpawnBias');
// Applica bias post-spawn, non pre-pool selection
```

**StressWave** è citata in `data/core/biomes.yaml` con `baseline` e `escalation` per alcuni biomi (es. `mezzanotte_orbitale`, `rovine_planari`). Il session engine ha `pressure` tracking in Atlas — StressWave è il livello mancante tra bioma e pressione di sessione.

**SoT §3** (line 119-127) elenca esplicitamente: `difficulty base`, `modificatori`, `affissi`, `hazard`, `archetipi NPC`, `StressWave baseline ed escalation`, `tono narrativo`, `hooks`. Solo 2/7 elementi sono oggi consumati.

## Why it was buried

- `biomes.yaml` costruito progressivamente tra 2025-10-25 e 2026-04-25 — struttura ricca accumulata incrementalmente.
- `biomeSpawnBias.js` (V7 vision gap, PR #1726, 2026-04-24) ha wireato gli affixes ma era sprint limitato: "chiudi V7 Biome-aware spawn bias". Non era il momento per wire il bioma completo.
- `StressWave` come campo YAML è visibile nel data ma non linkato al `pressure` tracker Atlas — il naming è diverso (StressWave vs pressure/momentum) e nessuno ha connesso i due.
- `hazard.stress_modifiers` ha nomi arbitrari (`magma_surge`, `thermal_shock`) non standardizzati verso il combat resolver — richiedono mapping design prima di wire.

## Why it might still matter

- **P1 Tattica**: biomi con `hazard.severity: high` + `stress_modifiers` dovrebbero modificare la tattica ottimale nel match. Oggi due biomi "difficili" hanno lo stesso pressione dinamica nonostante design intent diverso.
- **P6 Fairness**: `StressWave.baseline` in `biomes.yaml` è esattamente il knob che stava esaurendo nel Hardcore iter7 (CLAUDE.md Sprint 2026-04-24). Anziché aggiungere nemici, il bioma stesso applica pressione baseline.
- **Tono narrativo + hooks**: narrativeEngine (inkjs, PR #1431) potrebbe consumare `hooks` da biomes.yaml per fare branching narrativo bioma-specifico senza hardcode.
- **`diff_base` + `mod_biome`**: questi campi non vengono passati all'encounter generator per scalare difficoltà base — oggi tutti gli encounter partono dallo stesso baseline HP/count.

## Concrete reuse paths

1. **Minimal** (P0, ~2h): passa `biome.diff_base + biome.mod_biome` a `sessionHelpers.js` quando costruisce un encounter — scala `enemy.hp *= 1 + (mod_biome * 0.1)`. Usa `hazard.severity` (low/medium/high) per mappare +StressWave +0/+0.02/+0.05 a inizio sessione. Blast radius ×1.3 → ~3h.
2. **Moderate** (P1, ~8h): wire `StressWave.baseline` da biomes.yaml → `session.pressure` initial value. Wire `hazard.stress_modifiers` come event-trigger (es. se `magma_surge` biome + turn%3==0 → pressure +0.07). Estendi Atlas telemetry per surfaceable. Blast radius ×1.5 → ~12h.
3. **Full** (P2, ~20h): bioma package completo consumato: difficulty scale + StressWave + hazard events + npc_archetype constraint + narrativeEngine hooks. Session `/start` con `biome_id` → full biome package setup. Blast radius ×1.5 → ~30h.

## Sources / provenance trail

- Found at: [data/core/biomes.yaml:1](../../../data/core/biomes.yaml) — commit `8ee399e8` (MasterDD-L34D, 2025-10-25), last `5c7fb61a` (2026-04-25)
- Runtime consumer: [apps/backend/services/combat/biomeSpawnBias.js](../../../apps/backend/services/combat/biomeSpawnBias.js) — commit `0d501169` (2026-04-24)
- SoT §3: [docs/core/00-SOURCE-OF-TRUTH.md:115-127](../../../docs/core/00-SOURCE-OF-TRUTH.md)
- Parent stack: [worldgen-bioma-ecosistema-foodweb-network-stack.md](worldgen-bioma-ecosistema-foodweb-network-stack.md)
- ADR spawn bias: ADR-2026-04-26 (in-file comment `biomeSpawnBias.js:1`)
- Related card: [architecture-biome-memory-trait-cost.md](architecture-biome-memory-trait-cost.md) — score 4/5 (complementare su costo ambientale trait)

## Risks / open questions

- `hazard.stress_modifiers` ha key arbitrarie per bioma (`magma_surge`, `thermal_shock`, `whiteout`...) — servono mapping verso event type canonici. Pre-wire: standardizzare in `data/core/biomes.yaml` con enum fisso (es. `heat_damage`, `visibility_penalty`, `movement_penalty`).
- `StressWave` naming in biomes.yaml vs `pressure` naming in session engine — sono la stessa cosa? Da chiarire prima di wire. Se mappano 1:1, è triviale. Se sono logiche separate, serve ADR.
- `npc_archetypes.primary/support/threat` non ha slug verificati contro `data/core/` — verifica che `abyssal_forgers` sia uno slug valido per encounter generation prima di usarlo come constraint.
- Anti-pattern: NON surfaciare `diff_base`/`mod_biome` al player come numeri naked — sono parametri interni di bilanciamento, non UI-facing.
