---
title: PCG Audit — Worldgen Runtime vs Dato (2026-04-26)
workstream: dataset-pack
category: report
doc_status: draft
doc_owner: claude-code
tags: [pcg, worldgen, ecosystem, biome, audit]
---

# PCG Audit: Worldgen Runtime vs Dato

**Data**: 2026-04-26 | **Modo**: audit + research ibrida | **Budget**: 60 min

---

## TL;DR — 5 bullet

1. **Livello 1 (Bioma) + Livello 2 (Ecosistema) = solo dato.** `biomeSynthesizer.js` genera biomi sintetici da pool trait, ma legge `data/core/traits/biome_pools.json`, NON i file `*.ecosystem.yaml`. Il trophic graph (produttori→consumatori→decompositori) in `badlands.ecosystem.yaml` e `foresta_temperata.ecosystem.yaml` non influenza nessun runtime encounter.

2. **Livello 3 (Meta-Network) = puro dato.** `meta_network_alpha.yaml` (5 nodi, 11 archi `corridor/trophic_spillover/seasonal_bridge`) non è mai letto a runtime da nessun servizio Node. Zero consumer in `apps/backend/`, zero consumer in `services/`. L'unico lettore è il validator Python (`foodweb.py`) che emette warning/info — non gameplay.

3. **Livello 4 (Cross-events) = flavour testuale.** `cross_events.yaml` (3 eventi: tempesta-ferrosa, ondata-termica, brinastorm) non ha consumer runtime. L'evento non modifica pressione, hazard o spawn. Flavour puro.

4. **Unico layer bioma→gameplay wired: V7 biomeSpawnBias.** `biomeSpawnBias.js` (PR #1726) aumenta peso spawn in `reinforcementSpawner.js` basandosi su `encounter.biome.affixes` + `npc_archetypes`. Input = biome da scenario hand-made (tutorialScenario/hardcoreScenario). Trophic data bypassato.

5. **Gap principale = Livelli 2-4 senza runtime consumer.** Pattern consigliato: non full PCG — ITB pattern P0 (20-30 hand-made encounter + random skin bioma) + Dormans mission grammar per campagna M10+. Cross-events come "biome pressure modifier" (Lvl 3→1 bridge) = effort ~12h, ROI alto, scope controllato.

---

## Tabella 4-livelli × stato

| Livello | Definizione | Dataset | Runtime consumer | Player-facing |
|---------|-------------|---------|-----------------|---------------|
| **1 — Bioma** | `data/core/biomes.yaml`, `biome_pools.json` | SI: 5+ biomi canonici, pool trait | PARZIALE: `biomeSynthesizer.js` genera da pool (non da biomi canonici direttamente). `biomeResonance.js` legge `species.yaml.biome_affinity` | PARZIALE: affix-based spawn bias (V7) + risonanza perfetta/secondaria (Skiv Sprint A) |
| **2 — Ecosistema** | `packs/evo_tactics_pack/data/ecosystems/*.ecosystem.yaml` (5 file) | SI: clima, abiotico, trofico (produttori/consumatori/decompositori), regole `at_least` | NO | NO |
| **3 — Meta-Network** | `network/meta_network_alpha.yaml` | SI: 5 nodi, 11 archi, `bridge_species_map`, regole `per_biome_min` | NO — zero import in Node/services | NO |
| **4 — Cross-events** | `network/cross_events.yaml` | SI: 3 eventi con `effect` testuale | NO — zero consumer runtime | NO — solo doc flavour |

**Nota**: `foodweb.py` valida struttura (edge type, bridge species, connectivity) ma non è chiamato mid-game. Il validator emette livello `info` per propagazione eventi — non gameplay.

---

## Analisi GAP — effort per chiudere

### GAP-A: Foodweb → spawn composition (Livello 2 → runtime)

**Stato**: `badlands.ecosystem.yaml` lista consumatori terziari (`dune-stalker`), secondari (`ferrocolonia-magnetotattica`, `echo-wing`), ma questi nomi non vengono mai usati per filtrare il pool di spawn degli encounter.

**Gap concreto**: un encounter in `biome_id: badlands` potrebbe spawnare `lupus-temperatus` (consumatore foresta) senza che nessun sistema protesti.

**Chiusura minima**: caricatore `ecosystemLoader.js` che mappa `biome_id → consumatori terziari (apex candidati)`. `reinforcementSpawner.js` filtra `reinforcement_pool` escludendo specie fuori trophic tier per quel bioma. Solo filtraggio — non generazione completa.

**Effort**: ~8-10h (loader + filter rule + 10 test). Schema AJV non rotto (biome_id già in encounter.schema.json).

**Pattern fit**: Pathfinder XP budget (P1) + foodweb constraint = "spawn deve rispettare trophic tier".

### GAP-B: Cross-events → pressure modifier (Livello 4 → runtime)

**Stato**: `evento-tempesta-ferrosa` ha `effect: "polveri ferrose e carica magnetica, penalità visibilità/gear metallico"` ma questa stringa non viene parsata o applicata da nessun sistema.

**Gap concreto**: giocatori in FORESTA_TEMPERATA durante cross-event BADLANDS→FORESTA non sentono nulla. Zero gameplay change.

**Chiusura minima**: `crossEventEngine.js` — loader del `cross_events.yaml`, check `from_nodes + to_nodes` per `session.biome_id`, applica `pressure_delta` o `hazard_modifier` sulla sessione. Non serve generare world state — serve solo "questa session ha active cross-events?".

**Effort**: ~12h (engine + session hook + 3 test event types + 5 integration test). Richiede `session.active_events[]` nuovo campo.

**Pattern fit**: ITB "random elements" su mappa hand-made — cross-event è l'elemento random che cambia le condizioni dell'encounter pre-autorizzato.

### GAP-C: Meta-network → campaign routing (Livello 3 → gameplay)

**Stato**: `meta_network_alpha.yaml` ha archi con `resistance`, `seasonality`, `type`. Questi potrebbero guidare quale bioma appare nella sequenza di campagna (M10+), ma `campaignEngine.js` usa `encounter_id` statici da `campaignLoader.js`.

**Gap concreto**: la campagna è una sequenza lineare. Il network graph esiste ma non influenza mai quale biome/encounter il giocatore vede dopo.

**Chiusura minima** (M10+, non MVP): Dormans mission grammar P1. Nodes del `meta_network_alpha` = space grammar. Archi con `resistance` = transition cost. Campagna genera percorso via graph walk pesato da resistance + stagionalità.

**Effort**: ~30-40h (grammar + router + test). P1, post-MVP.

**Pattern fit**: Dormans Mission/Space Grammar (P1) — `meta_network_alpha` è già lo space graph di Dormans, manca solo la mission grammar + router.

### GAP-D: biomeSynthesizer → encounter spawn (disconnessione generativa)

**Stato**: `biomeSynthesizer.js` genera biomi sintetici con species (apex/keystone/bridge) ma questi biomi sintetici NON vengono usati per popolare encounter. Gli encounter usano pool hardcoded in tutorialScenario/hardcoreScenario.

**Gap concreto**: la pipeline generativa produce output ignorato in combat. `generate()` → bioma sintetico con species → nessun consumer.

**Nota**: il generatore è pensato per la pipeline Flow (API `/api/v1/generation/species`), non per mission encounter. Gap architetturale intenzionale o dimenticato?

**Chiusura MVP-safe**: non toccare il generatore. Piuttosto: usare il campo `biome_id` dell'encounter per filtrare (GAP-A). Il generatore rimane separato come tool lore.

**Effort**: GAP-A è la chiusura corretta, non cambiare la pipeline generativa.

---

## Industry pattern primary-sourced

### 1. Ultima Online Ecosystem Runtime (1997) — Anti-pattern

**Citazione primaria**: Raph Koster, "Postmortem: Origin Systems' Ultima Online" (Gamasutra, 2000). [https://www.gamasutra.com/view/feature/131650](https://www.gamasutra.com/view/feature/131650)

**Cosa hanno fatto**: predator-prey wired runtime. Deer popolavano aree, wolf cacciavano deer, wolf si riproducevano se cibo abbondante. Sistema ecologico completamente simulato in-world.

**Risultato**: player uccidevano deer per XP → wolf morivano di fame → equilibrio rotto in 24h. "Equilibrium collapsed in 24 hours." Nessun rimbalzo ecologico — il player è troppo efficiente come predatore esterno.

**Lezione per Evo-Tactics**: NON simulare foodweb runtime con player libero. Player è destabilizzatore sistematico. Foodweb = constraint statico per spawn composition (GAP-A), non simulazione dinamica.

### 2. Rimworld Biome Events — Player-facing minimal

**Citazione primaria**: Tynan Sylvester, "Designing Games" (O'Reilly, 2013) + Rimworld wiki biome events. [https://rimworldwiki.com/wiki/Climate](https://rimworldwiki.com/wiki/Climate)

**Cosa hanno fatto**: ogni bioma ha `baseTemperature`, `seasonalTempVariation`, `eventCommonalities`. Gli eventi (heat wave, cold snap, eclipse) hanno `commonality` per bioma e applicano `temperatureOffset` o `lightMultiplier` a tutto il map. Evento non simulato a livello trophic — applica modifier flat su gameplay metric.

**Lezione per Evo-Tactics**: cross_events non devono essere simulazione ecologica — devono applicare modifier flat su `pressure`, `hazard_severity`, `spawn_weight`. Come Rimworld: evento = temperature offset, non simulazione meteo. GAP-B chiuso con ~12h, non 60h.

### 3. Dwarf Fortress — World gen come data generation, non runtime

**Citazione primaria**: Tarn Adams, "Procedural World Generation" talk (GDC 2010). [https://dwarffortresswiki.org/index.php/World_generation](https://dwarffortresswiki.org/index.php/World_generation)

**Cosa hanno fatto**: world gen (biomi, civ, storia 200 anni) avviene PRIMA del gioco. In-play, world gen è frozen data. Creature in embark zone = prodotto del world gen, non simulazione real-time.

**Lezione per Evo-Tactics**: `meta_network_alpha.yaml` + `*.ecosystem.yaml` = world gen data (già fatto bene). Il runtime non deve re-simulare — deve consumare il dato per campagna routing. Il separazione data/runtime è corretta nel design; manca solo il consumer di campagna (GAP-C, post-MVP).

### 4. Caves of Qud — Biome come spawn constraint

**Citazione primaria**: Caves of Qud devlog "World Generation" + wiki. [https://wiki.cavesofqud.com/wiki/World_generation](https://wiki.cavesofqud.com/wiki/World_generation)

**Cosa hanno fatto**: ogni "zone" ha biome_id. Spawn list per zona = filtro su creature table per biome_id. Creature `glow-wight` appare in `historical_ruins` ma non in `salt_marshes` — non perché simulazione ecologica, ma perché spawn table filtrata. Semplice lookup + whitelist.

**Lezione per Evo-Tactics**: GAP-A è già il pattern Caves of Qud. `foodweb.yaml` lista i consumatori per biome — si usa come whitelist spawn, non come simulazione. Zero overhead computazionale, zero UO-trap.

### 5. Into the Breach — Hand-made maps, random scenario elements

**Citazione primaria**: Subset Games devs, "UI Design and Sacrifice" (GDC 2018). [https://www.gamedeveloper.com/design/-i-into-the-breach-i-dev-on-ui-design-sacrifice-cool-ideas-for-the-sake-of-clarity-every-time-](https://www.gamedeveloper.com/design/-i-into-the-breach-i-dev-on-ui-design-sacrifice-cool-ideas-for-the-sake-of-clarity-every-time-)

> "Cheaper to hand-design 100 maps than to build a procedural system for 8×8 tactical grids."

**Cosa hanno fatto**: ~200 mappe hand-designed 8×8. Scenario (enemy composition + objective + bonus) = random tra un set curato. La mappa è fissa, il "dress" è random.

**Lezione per Evo-Tactics**: per il MVP e le prossime 30-40 encounter: mappa + encounter composition hand-made, `biome_id` + `cross_events_active` = elementi random che cambiano le condizioni. Il worldgen non deve generare la mappa — deve generare le condizioni dell'encounter su una mappa pre-scritta.

---

## Proposta corretta: flusso TV-on → TV-off con worldgen al centro

**Versione corretta del flusso** (worldgen = motore, non scenografia):

```
[1] WORLD STATE INIT (sessione)
    - Carica meta_network_alpha.yaml → world_graph in session.world_state
    - Campagna position → nodo corrente (es. BADLANDS)
    - Calcola active_cross_events: quali cross_events.yaml archi sono attivi
      questa stagione (da world_state.season)?

[2] PRE-ENCOUNTER: BIOME CONTEXT GENERATION
    - Nodo corrente → biome_id (es. canyons_risonanti)
    - Cross events attivi per questo nodo → active_modifiers[]
      esempio: evento-tempesta-ferrosa → pressure +10, gear_metallico penalizzato
    - Foodweb terziari del biome → spawn whitelist (consumatori terziari = apex candidati)
    - Seleziona encounter hand-made dal pool filtrato per biome_id

[3] ENCOUNTER SETUP
    - Encounter hand-made applicato
    - reinforcementSpawner filtra pool con: (a) biomeSpawnBias [GIA LIVE], (b) foodweb whitelist [GAP-A]
    - active_modifiers applicati come hazard_overlay (es. visibilità ridotta) [GAP-B]
    - biomeResonance calcolata per ogni unità player [GIA LIVE]

[4] COMBAT IN-PROGRESS
    - Round orchestrator normale (GIA LIVE)
    - biomeResonance applica discount ricerca per unità in biome matching [GIA LIVE]
    - active_modifiers applicano pressione extra o hazard_damage [GAP-B wired]

[5] POST-ENCOUNTER: WORLD STATE UPDATE
    - Outcome (vittoria/sconfitta/timeout) registrato su world_state.node_history[]
    - Se vittoria: nodo corrente "cleared", sblocca archi adiacenti nella network
    - world_state.season++ se turno dispari (semplice tick)
    - Cross events aggiornati in base a stagione

[6] CAMPAIGN ADVANCE
    - campaignEngine legge world_state.node_history + archi network per calcolare next_encounter
    - Se più nodi adiacenti sbloccati: player sceglie prossimo biome (scelta geografica)
    - Se solo uno: lineare

[7] TV OFF / SAVE
    - world_state persisto (in-memory ora, Prisma futura)
```

**Differenza vs. il flusso precedente di Claude**: worldgen non è la mappa grafica. Worldgen è (1) il world_graph che determina quale biome viene dopo, (2) gli active_cross_events che cambiano le condizioni dell'encounter, (3) la foodweb che filtra cosa può spawnare. La mappa tattica rimane hand-made (ITB pattern). Il mondo generativo è lo strato sopra, non dentro.

---

## Anti-pattern da evitare

| Anti-pattern | Fonte | Applicabilità Evo-Tactics |
|---|---|---|
| **Full foodweb simulation runtime con player libero** | UO postmortem — equilibrio rotto 24h | VIETATO. Player = predatore esterno, distrugge qualsiasi equilibrio ecologico dinamico. Foodweb = dato statico di vincolo |
| **Cross-events come simulazione meteorologica** | Costo computazionale, zero ROI gameplay | EVITARE. Cross-events = modifier flat su pressure/hazard, come Rimworld temperature offset. Non simulare propagazione fisica |
| **WFC per encounter map senza struttura globale** | Boris the Brave: "WFC solo local pattern" [https://www.boristhebrave.com/2020/02/08/wave-function-collapse-tips-and-tricks/](https://www.boristhebrave.com/2020/02/08/wave-function-collapse-tips-and-tricks/) | Non applicabile a encounter 8×8 tactical. WFC è per interior layout (V3 nido), non per tactical encounter design |
| **Full PCG campaign senza hand-anchor** | Dead Cells + ITB entrambi confermano: "authored quality richiede tiles hand-made" | Encounter devono rimanere hand-made. PCG = condizioni (biome skin + cross-events + spawn filter), non la struttura |
| **biomeSynthesizer output come encounter content** | Disconnessione architetturale confermata: generatore produce per pipeline Flow/lore, non per combat | Non wired biomeSynthesizer a mission encounter. Mantieni separazione. Usa foodweb yaml come constraint, non come generatore |
| **Worldgen come scenografia visiva** | Errore concettuale identificato dall'utente | Worldgen = motore di vincoli che determina quali encounter sono disponibili, quali modificatori sono attivi, quale biome viene dopo. Non "skin" della mappa |

---

## Architettura consigliata — stato target

```
world_state (session) ←── meta_network_alpha.yaml (graph statico)
     │                         │
     ├── nodo corrente ─────→ biome_id → encounter pool (hand-made filtrati per biome)
     │
     ├── active_cross_events ← cross_events.yaml + stagione corrente
     │        │
     │        └──→ pressure_delta, hazard_modifier su encounter live
     │
     ├── spawn_constraint ← foodweb [consumatori terziari per biome_id]
     │        │
     │        └──→ reinforcementSpawner.foodwebFilter() [GAP-A]
     │
     └── campaign_routing ← archi network + resistance [GAP-C, post-MVP]

biomeResonance [GIA LIVE] ← species.yaml.biome_affinity × session.biome_id
biomeSpawnBias [GIA LIVE] ← encounter.biome.affixes × unit.tags
```

**Runtime live oggi**: biomeResonance (discount ricerca) + biomeSpawnBias (weight reinforcement pool).

**GAP prioritizzati**:
- **GAP-B cross-events** (~12h): effort/ROI migliore. 3 eventi concreti, effetto immediato player-facing.
- **GAP-A foodweb whitelist** (~8-10h): previene spawn ecologicamente incoerente. Silenzioso ma corretto.
- **GAP-C campaign routing** (~30-40h): post-MVP, Dormans grammar su meta_network_alpha.

---

## Sources

- `services/generation/biomeSynthesizer.js` — analisi completa, nessun import meta_network/cross_events
- `apps/backend/services/combat/biomeSpawnBias.js` — V7 wired, PR #1726
- `apps/backend/services/combat/biomeResonance.js` — Skiv Sprint A wired
- `apps/backend/services/combat/reinforcementSpawner.js` L.68-97 — biomeConfig passato solo da encounter.biome
- `packs/evo_tactics_pack/validators/rules/foodweb.py` — solo validazione struttura, non runtime gameplay
- `packs/evo_tactics_pack/data/ecosystems/network/meta_network_alpha.yaml` — dato, zero consumer Node
- `packs/evo_tactics_pack/data/ecosystems/network/cross_events.yaml` — dato, zero consumer Node
- `apps/backend/services/hardcoreScenario.js` + `tutorialScenario.js` — biome_id hardcoded per scenario
- Museum card M-2026-04-25-011 `architecture-biome-memory-trait-cost.md` — BiomeMemory concept, reuse path compatibile con GAP-A

**Industry primarie**:
- Raph Koster, UO postmortem (2000) — ecosistema runtime broken
- Rimworld wiki / Tynan Sylvester, "Designing Games" (O'Reilly 2013) — biome events come modifier flat
- Tarn Adams, DF World Generation (GDC 2010) — data/runtime separation
- Caves of Qud wiki — biome spawn whitelist pattern
- ITB GDC 2018 — hand-made maps + random scenario elements
- Dormans & Bakkes, "Generating Missions and Spaces" (2011) [https://sander.landofsand.com/publications/Dormans_Bakkes_-_Generating_Missions_and_Spaces_for_Adaptable_Play_Experiences.pdf](https://sander.landofsand.com/publications/Dormans_Bakkes_-_Generating_Missions_and_Spaces_for_Adaptable_Play_Experiences.pdf) — mission/space grammar per GAP-C
