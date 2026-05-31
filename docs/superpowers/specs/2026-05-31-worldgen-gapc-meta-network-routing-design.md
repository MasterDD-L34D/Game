---
title: 'GAP-C meta-network campaign routing — design (TKT-WORLDGEN-GAPC) [no-impl]'
workstream: flow
category: spec
doc_status: draft
doc_owner: claude-code
last_verified: '2026-05-31'
language: it
tags: [worldgen, meta-network, campaign, routing, dormans, mission-grammar, gap-c, spec, no-impl]
---

# GAP-C meta-network campaign routing — design

> Spec di design (review master-dd PRIMA di implementare — **NO-IMPL**, zero codice, zero
> tocco a catalog/data). Terzo e ultimo gap worldgen runtime. GAP-A (foodweb → spawn filter)
> e GAP-B (cross-event → pressure) sono gia SHIPPED + WIRED + TESTED in
> [PR #2447](https://github.com/MasterDD-L34D/Game/pull/2447) (`04a3920a` su main) e fanno
> da **architettura di riferimento**: read-only resolver + thin wire in un engine esistente +
> band-safe fallback + Gate-5 surface log + kill-switch flag + unit test. Questo doc replica
> quel pattern per il routing della campagna.

## 0. TL;DR (per decidere in 30s)

- **Cosa**: il routing della campagna (quale prossimo encounter) guidato dal **grafo meta-network**
  (`meta_network_alpha.yaml`) invece della lista statica di `encounter_id`, con la grammatica di
  missione di Joris Dormans (lock-and-key, gating, percorso critico/opzionale).
- **Come**: un nuovo `metaNetworkResolver` (loader read-only del grafo, clone di `ecosystemResolver`)
  + una funzione pura `selectNextNode()` (clone del ruolo "thin filter" di `foodwebFilter`) wired
  in `campaignEngine` / `routes/campaign.js` per la scelta del next-node.
- **Default invariato**: il path statico `encounter_id` resta il default; il graph routing e
  **opt-in dietro flag**; niente grafo / niente dati / niente mapping → **passthrough** al
  comportamento attuale (mai blocca la progressione — clone della garanzia "il filtro non svuota
  mai il pool" di GAP-A).
- **MVP-now = topologia + traversal read-only** sul grafo AUTORATO (niente nuovi campi dato).
  Il **vocabolario di arc-condition** (requires_trait/min_pressure/…) richiede un'estensione di
  schema YAML → **data gate master-dd**, fase 2. La **grammatica generativa** Dormans (rewrite
  rule che generano grafi) e' esplicitamente **POST-MVP** (evita il "runtime-sim trap" che GAP-B
  ha gia scansato).
- **Determinismo**: stesso contesto → stesso next-node (nessun RNG nella selezione MVP).
- **Reference feel**: Into the Breach (scelta missioni isola), Slay the Spire / FTL (map node graph
  branching + rischio/ricompensa), Dormans (mission grammar). Vedi §3 + §8.

> ⚠️ **Claude autonomous judgment — pending master-dd review**: scope MVP, vocabolario condizioni,
> e namespace `biome_id` (§1.1 caveat) sono proposte; i fork irreversibili (schema dato, namespace
> canonico) sono lasciati come OPEN QUESTION (§7.3), non decisi qui.

---

## 1. Ground-truth (stato reale verificato 2026-05-31)

### 1.1 `meta_network_alpha.yaml` — shape attuale

Path: `packs/evo_tactics_pack/data/ecosystems/network/meta_network_alpha.yaml` — `schema_version: 2.0`.

**Correzione marker (anti-pattern #19 / L-075)**: BACKLOG + handoff dicono "5 nodi / 11 archi". Il
file reale ha **5 nodi e 12 archi** (l'arco `CRYOSTEPPE → BADLANDS` compare **due volte** con `type`
diverso — `trophic_spillover` righe 75-80 e `corridor` righe 81-86 → e' un **multigrafo**). Il
resolver dovra' gestire archi paralleli.

**Nodi** (righe 17-37) — i nodi sono **BIOMI**, non encounter:

| node `id`        | `biome_id` (campo)   | `path` (ecosystem yaml)     | `weight` |
| ---------------- | -------------------- | --------------------------- | -------- |
| BADLANDS         | canyons_risonanti    | badlands.ecosystem.yaml     | 0.45     |
| FORESTA_TEMPERATA| foresta_miceliale    | foresta_temperata...yaml    | 0.55     |
| DESERTO_CALDO    | savana               | deserto_caldo.ecosystem.yaml| 0.40     |
| CRYOSTEPPE       | mezzanotte_orbitale  | cryosteppe.ecosystem.yaml   | 0.40     |
| ROVINE_PLANARI   | rovine_planari       | rovine_planari...yaml       | 0.50     |

**Archi** (righe 38-110) — transizioni **ecologiche**, non archi di progressione con condizioni.
Campi per arco: `from`, `to`, `type` (`corridor` ×6 / `trophic_spillover` ×3 / `seasonal_bridge` ×3),
`resistance` (0.40-0.70), `seasonality` (stringa libera, es. "estate", "inverno profondo"),
`notes` (flavor). **Nessun** campo di gating (no `requires_*`, no `min_pressure`, no encounter ref).

Inoltre: `bridge_species_map` (righe 111-133, specie ponte per nodo), `rules` (righe 134-145,
`at_least` / `per_biome_min` — vincoli di **generazione ecosistema**, non di routing).

> 🔎 **Caveat namespace `biome_id` (load-bearing per il join)**: il campo `node.biome_id`
> (`canyons_risonanti`, `foresta_miceliale`, `savana`, `mezzanotte_orbitale`) **diverge** dalla
> chiave con cui il runtime GAP-A/B fa join. GAP-A (`ecosystemResolver`) keya su
> `ecosistema.biome_id` del file `.ecosystem.yaml` (= slug `badlands`, `foresta_temperata`, …);
> GAP-B (`cross_events.yaml`) usa `to_nodes` = **node id** (`BADLANDS`) normalizzato lowercase, e
> il test passa `'badlands'`. In pratica `lowercase(node.id)` == slug ecosystem == chiave di
> join GAP-A/B, mentre `node.biome_id` (canyons_risonanti) e' una **label di design separata** non
> usata dai join runtime. Implicazione: il resolver deve esporre entrambi e il routing deve
> joinare su `lowercase(node.id)` per restare coerente con GAP-A/B. → OPEN QUESTION §7.3-Q1.

### 1.2 Come `campaignEngine` sceglie il next encounter OGGI

La selezione e' **statica**: catena `encounter_id` via `act_idx` + `chapter_idx` + `branch_key`. Il
grafo meta-network **non viene mai consultato**. Esistono **due picker duplicati**:

1. **Pure peek** — `apps/backend/services/campaign/campaignEngine.js:74-107`
   `getNextEncounter(campaign, def)`:
   - trova l'act via `campaign.currentAct` (`:76`), calcola `nextChapterIdx = currentChapter + 1`
     (`:78`), filtra per `branch_key` / `is_choice_node` (`:81-83`),
   - `nextEntry = pathEncounters.find(e => e.chapter_idx === nextChapterIdx)` (`:84`),
   - se choice_node → `{choice_required:true}` (`:86-92`); se trovato → `{next_encounter_id}` (`:93`);
     altrimenti primo encounter del next act o `{campaign_completed:true}` (`:97-106`).
   - Consumato da `summariseCampaign(campaign, def)` (`:144-174`), lo snapshot UI ritornato da
     `GET /api/campaign/summary` (`routes/campaign.js:182-192`).
2. **Real mutate** — `apps/backend/routes/campaign.js:322-391` (`POST /api/campaign/advance`):
   **re-implementa inline** la stessa selezione (NON chiama `getNextEncounter`):
   `pathEncounters.find(e => e.chapter_idx === nextChapterIdx)` (`:329`), poi muta lo stato
   (`updateCampaign`) e ritorna `next_encounter_id`. La scelta di branch binaria vive in
   `POST /choose` → `resolveBranch(defDoc, currentAct, branch_key)` (`:408`).

> ⚠️ **Tech-debt rilevante per il wire**: la logica di "next" e' duplicata tra l'engine puro
> (`getNextEncounter`) e l'handler route (`/advance`). Wirando il grafo bisogna toccarli entrambi,
> oppure prima rifattorizzare `/advance` per delegare a `campaignEngine`. → OPEN QUESTION §7.3-Q6.

`createCampaignRouter` e' montato in `apps/backend/app.js:792`. Il `def` arriva da
`loadCampaignDef(campaign.campaignDefId)` (`campaignLoader`); default def = `default_campaign_mvp`.

### 1.3 Il gap centrale: due layer scollegati

- meta-network = grafo di **adiacenza ecologica fra biomi** (nodi=biomi, archi=corridoi/spillover/bridge).
- campaign def = catena **lineare/branch-binaria di encounter** (`acts[].encounters[]` con
  `encounter_id`, `chapter_idx`, `branch_key`, `is_choice_node`, `choice`).
- **Non esiste link** node↔encounter: gli encounter del def non referenziano nodi del grafo, e gli
  archi non referenziano encounter. Il `default_campaign_mvp` non ha `biome_id` per-encounter (il
  badlands pilot scenario, separato, ce l'ha: `badlandsPilotScenario.js:82` `biome_id:'badlands'`).
- Quindi GAP-C deve **mappare il grafo ecologico (biomi) sulla progressione (encounter)**. Questo e'
  il fork di design principale (§3 + §7.3-Q1/Q2).

### 1.4 Pattern di riferimento GAP-A/B (le 6 invarianti da clonare)

Verificato leggendo i file shipped. GAP-C DEVE rispettare le stesse 6 invarianti:

| # | Invariante                | GAP-A (`foodwebFilter` + `reinforcementSpawner`)                              | GAP-B (`crossEventEngine` + `session.js`)                       |
| - | ------------------------- | ----------------------------------------------------------------------------- | --------------------------------------------------------------- |
| 1 | Loader read-only + cache  | `ecosystemResolver.js:59-90` `_load`/`getEcosystem` + `_resetCache():92-94`   | `crossEventEngine.js:46-60` `loadCrossEvents` + `_resetCache`   |
| 2 | Thin fn pura + dep iniett. | `foodwebFilter.js:41-75` `filterReinforcementPool`, `opts.getEcosystem`        | `getCrossEventPressureDelta`, `opts.events`/`opts.path`         |
| 3 | Kill-switch flag          | `reinforcementSpawner.js:168` `if (policy.foodweb_filter === false)`           | feature attiva via biome+season presenti (no-data → no-op)      |
| 4 | Band-safe fallback        | `foodwebFilter.js:65-74` mai svuota il pool → reason `all_excluded_fallback`  | no biome/season → `[]`, load fail → delta 0                     |
| 5 | Gate-5 surface            | `reinforcementSpawner.js:175-182` console JSON + `:302-306` campo strutturato | `crossEventEngine.js:85-101` `console.log(JSON.stringify({...}))` |
| 6 | Unit test pattern         | `tests/worldgen/foodwebFilter.test.js` (8/8): passthrough+real+injected+BAND-NEUTRAL | `tests/worldgen/crossEventEngine.test.js` (9/9)          |

---

## 2. Architettura proposta

Tre componenti, **simulazione/dato separati dall'engine** (il resolver legge il grafo; la fn di
routing e' pura e valuta condizioni; il wire e' sottile e reversibile via flag).

### 2.1 `metaNetworkResolver` — graph loader read-only (clone di `ecosystemResolver`)

Nuovo file `apps/backend/services/worldgen/metaNetworkResolver.js`. Read-only, niente write, niente
generazione. Carica `meta_network_alpha.yaml` (+ futuri file network nella stessa dir), costruisce
un grafo in-memory con cache module-level + seam `_resetCache()`.

API proposta (forma — NO impl):

```
getNetwork(opts?)                  -> { id, label, nodes: Map<nodeId,node>, adjacency: Map<nodeId,edge[]> } | null
getNode(nodeId)                    -> { id, biome_id, path, weight } | null
getOutgoingEdges(nodeId)           -> edge[]      // multigrafo: include archi paralleli (CRYOSTEPPE->BADLANDS x2)
getNodeByBiome(biomeOrSlug)        -> node | null // join su lowercase(node.id) == slug ecosystem (vedi §1.1 caveat)
_resetCache()                      // test seam
NETWORK_DIR                        // export costante path (come ECOSYSTEMS_DIR / CROSS_EVENTS_PATH)
```

- `opts.network` / `opts.path` iniettabili per unit test puri (clone di `opts.events` GAP-B).
- `edge` normalizzato = `{ from, to, type, resistance, seasonality, notes }` + (fase 2) `conditions`.
- Su file mancante / parse fail → `console.warn` + grafo vuoto (clone `crossEventEngine.js:54-57`),
  cosi' il routing degrada a passthrough.

### 2.2 `metaNetworkRouting` — selezione next-node pura (clone del ruolo "thin filter")

Nuovo file `apps/backend/services/worldgen/metaNetworkRouting.js`. Pura (no I/O, no mutation). Valuta
gli archi uscenti dal nodo corrente contro le condizioni, usando un `context` read-only.

API proposta:

```
selectNextNode(currentNodeId, context, opts?) -> {
  applied,        // boolean: il graph routing ha prodotto una scelta?
  current_node,   // nodeId risolto (o null)
  candidates,     // [{ node_id, biome_id, edge, eligible, blocked_by: condKey|null }]
  chosen,         // nodeId scelto (o null)
  reason,         // 'no_graph' | 'no_current_node' | 'no_candidates' |
                  // 'all_blocked_fallback' | 'single' | 'selected'
}
```

- `context` (read-only, assemblato dal caller): `{ party_traits[], pressure, cleared_nodes[],
  flags[], season, biome_affinity{} , progress }`. Tutti **gia disponibili** nel runtime
  (campaign state, sessione, seasonalEngine, D4 biome-affinity del branch corrente).
- `opts.getNode` / `opts.getOutgoingEdges` iniettabili (default = resolver) per test puri (clone
  `opts.getEcosystem` GAP-A `foodwebFilter.js:49-50`).
- **Condition evaluator**: una pura `_evalCondition(cond, context)` per ogni tipo (vedi §3 vocab).
  In MVP (fase 1) il set di condizioni e' minimo e derivato **solo da stato esistente** (es.
  `prior_node_cleared` da `cleared_nodes`), senza nuovi campi YAML.
- **Policy di selezione** MVP = deterministica: percorso critico prima, poi `weight` discendente,
  tie-break stabile su `node_id` lex. (Niente RNG; se in futuro si vuole weighted-random, va
  seedato — OPEN QUESTION §7.3-Q4.)

### 2.3 Thin wire in campaign (clone di `reinforcementSpawner` GAP-A)

**Kill-switch flag** (clone `policy.foodweb_filter === false` + `reinforcement_policy.enabled`):
graph routing **opt-in**, default OFF. Proposta a 3 livelli (il caller usa il primo presente):

1. per-campaign: `campaign_def.routing_mode === 'graph'` (default assente = `'static'`),
2. per-router: `options.campaign.metaNetworkRouting === true` (passato a `createCampaignRouter`),
3. env: `CAMPAIGN_GRAPH_ROUTING=1` (parita' con gli env-flag worldgen).

**Wire points** (entrambi, vista la duplicazione §1.2):

- `campaignEngine.getNextEncounter` (peek): se graph-mode + dati + mapping node→encounter presenti
  → consulta `selectNextNode` e mappa il nodo scelto al suo encounter; **altrimenti la logica
  statica attuale, intatta**.
- `routes/campaign.js POST /advance` (mutate): stesso branch graph-vs-static.

**Gate-5 surface** (clone `reinforcementSpawner.js:175-182` + `:302-306`):

- `console.log(JSON.stringify({ component: 'meta-network-router', current_node, chosen, candidates,
  reason }))` quando `applied` o `all_blocked_fallback`.
- campo strutturato nel payload di `/advance` e `/summary`:
  `meta_network_routing: { applied, current_node, chosen, candidates, reason }` (replay/telemetry
  + futura UI map-ahead §8).

### 2.4 Separazione simulazione/dato vs engine

- **Dato** = i file YAML (`meta_network_alpha.yaml`, eventuale estensione `conditions`). **NON
  toccati da questo spec.**
- **Resolver** = sola lettura del dato → struttura grafo. Nessuna logica di gioco.
- **Routing** = pura valutazione condizioni + policy di scelta. Nessun I/O.
- **Engine/route** = wire sottile + flag + surface. Il combat a valle resta stocastico; il routing
  e' deterministico (input→output).

---

## 3. Mapping grammatica di missione (Dormans)

Joris Dormans (_Game Mechanics: Advanced Game Design_; _Adventures in Level Design_) separa la
**missione** (sequenza logica di task: goal, lock-and-key, dipendenze) dallo **spazio** (layout
geometrico). La missione e' espressa come grafo orientato generabile via **graph grammar** (rewrite
rule che espandono un simbolo iniziale). GAP-C adotta la **missione** (grafo + gating); lo **spazio**
e' gia il biome/grid del combat esistente; la **generazione** (rewrite) e' deferita (vedi sotto).

### 3.1 Nodi/archi come grafo di missione

| Concetto Dormans         | meta-network GAP-C                                                          |
| ------------------------ | -------------------------------------------------------------------------- |
| Mission node (task)      | nodo = bioma/regione = "clear this encounter/bioma"                         |
| Edge (ordering/dep.)     | arco = transizione **traversabile solo se la condizione regge**            |
| Lock                     | arco con condizione non soddisfatta (bloccato)                             |
| Key                      | item/stato che soddisfa la condizione (trait, flag, prior-clear, pressure) |
| Critical path            | nodi/archi `critical: true` da attraversare per completare la campagna     |
| Optional / side          | nodi/archi non critici = rischio/ricompensa (StS/FTL)                      |

### 3.2 Vocabolario di arc-condition necessario

Per esprimere lock-and-key servono condizioni sull'arco. **Tutte richiedono un'estensione di schema
YAML** (un blocco `conditions:` sugli edge) → **data gate master-dd** (fase 2, §7.3-Q2). Proposta:

| Condition            | Semantica (key/lock)                                  | Sorgente nel `context` (gia esistente)                    |
| -------------------- | ----------------------------------------------------- | --------------------------------------------------------- |
| `requires_trait`     | il branco possiede il trait X (key esplicita)         | `party_traits` (campaign `acquiredTraits` / roster)       |
| `requires_flag`      | flag permanente settato (Wildermyth choice→flag)      | `flags` (`campaign.permanentFlags`, route `/flag/record`) |
| `prior_node_cleared` | lock-and-key puro: nodo Y vinto prima                 | `cleared_nodes` (chapters `outcome==='victory'`)          |
| `min_pressure` / `max_pressure` | gate su Sistema pressure                  | `pressure` (sessione / hardcore / cross-event GAP-B)      |
| `biome_affinity`     | affinita' bioma del branco ≥ soglia                   | `biome_affinity` (D4, branch `claude/d4-biome-affinity-spec`) |
| `season`             | stagione corrente (lega seasonalEngine + cross_events)| `season` (`seasonalEngine` / `cross_events.yaml`)         |
| `min_progress` / `act_gate` | gate su avanzamento campagna                   | `progress` (`computeProgress`)                            |

**MVP (fase 1)** usa **solo** condizioni derivabili da stato esistente **senza nuovi campi dato**:
in pratica `prior_node_cleared` (da `cleared_nodes`) + flag `critical` topologico. Il resto
(`requires_trait`, `min_pressure`, `biome_affinity`, `season`, …) entra in fase 2 con lo schema esteso.

### 3.3 Autorato adesso, generativo dopo (anti runtime-sim trap)

GAP-B ha scelto un modificatore flat (Rimworld temperature-offset) **proprio per evitare il
"Ultima Online runtime-foodweb trap"** (`crossEventEngine.js:9`). Stessa disciplina qui: l'MVP fa
**traversal di un grafo AUTORATO** (lettura + gating), **non** rewrite generativo. Le rewrite-rule
generative di Dormans (espandere uno start symbol in un grafo di missione runtime) sono **POST-MVP**
(fase 4, §7.2) — alto rischio, alto effort, fuori dal goal "far vivere il dato esistente".

---

## 4. Band-safety + back-compat (clone garanzie GAP-A/B)

| Garanzia                     | Meccanismo GAP-C                                                                 |
| ---------------------------- | ------------------------------------------------------------------------------- |
| Default invariato            | `routing_mode` assente / flag OFF → path statico `encounter_id` identico a oggi  |
| Niente grafo / dato          | resolver ritorna null → `selectNextNode` reason `no_graph` → passthrough statico |
| Nodo corrente non mappabile  | reason `no_current_node` → passthrough statico                                   |
| Nessun arco eleggibile       | reason `all_blocked_fallback` → passthrough statico (mai blocca la progressione) |
| Determinismo                 | nessun RNG nella selezione MVP → stesso `context` = stesso next-node             |
| Def canonico intatto         | `default_campaign_mvp` non modificato → flussi + test campaign esistenti invariati |
| WR/calibrazione              | il routing non tocca stat/combat → bande hardcore_06/07 + badlands non sfiorate  |

**Invariante killer (clone "il filtro non svuota mai il pool")**: il graph routing **non puo' mai
lasciare la campagna senza next**. Se il grafo non produce un nodo eleggibile mappabile a un
encounter, si ricade **sempre** sul next statico. La progressione non e' mai bloccata dal grafo.

---

## 5. Data flow + componenti (diagramma testuale)

```
DATI (read-only, NON toccati)
  packs/.../ecosystems/network/meta_network_alpha.yaml   (5 nodi / 12 archi)
  [fase 2] edge.conditions: { requires_trait, min_pressure, ... }   <-- DATA GATE master-dd
        |
        v
RESOLVER (nuovo, read-only, clone ecosystemResolver)
  metaNetworkResolver.js
    _load() -> { nodes: Map, adjacency: Map }   (+ cache, _resetCache)
    getNode / getOutgoingEdges / getNodeByBiome
        |
        v
ROUTING (nuovo, puro, clone ruolo foodwebFilter)
  metaNetworkRouting.selectNextNode(currentNodeId, context, opts)
     context  <-- { party_traits, pressure, cleared_nodes, flags, season, biome_affinity, progress }
                  (assemblato dal caller da stato GIA esistente)
     -> { applied, current_node, candidates, chosen, reason }
        |
        v
WIRE (sottile, dietro flag — clone reinforcementSpawner)
  campaignEngine.getNextEncounter (peek)   ---\
  routes/campaign.js POST /advance (mutate) ---+--> if graph-mode + dati + mapping: usa chosen->encounter
                                                    else: logica statica ATTUALE (default)
        |
        v
SURFACE (Gate-5, clone foodweb_filter field)
  console.log({component:'meta-network-router', ...})
  payload.meta_network_routing { applied, current_node, chosen, candidates, reason }
  -> /advance + /summary  -> replay / telemetry / [fase 3] UI map-ahead
```

Join key cross-system: `lowercase(node.id)` == slug ecosystem == chiave GAP-A (`foodwebFilter`) +
GAP-B (`cross_events.to_nodes`). Coerenza garantita usando node.id, **non** `node.biome_id` (§1.1).

---

## 6. Test plan (clone `foodwebFilter.test.js` / `crossEventEngine.test.js`)

`node:test` + `node:assert`. Ordine: passthrough/edge → real-data → injected-pure → BAND-NEUTRAL.

### 6.1 `tests/worldgen/metaNetworkResolver.test.js`

- load reale `meta_network_alpha.yaml` → **5 nodi / 12 archi** (asserzione esplicita anti-drift).
- `getNode('BADLANDS')` → `{ biome_id:'canyons_risonanti', weight:0.45, path:...}`.
- `getOutgoingEdges('CRYOSTEPPE')` include **entrambi** gli archi verso BADLANDS (multigrafo).
- `getNodeByBiome('badlands')` → nodo BADLANDS (join su lowercase node.id); `getNodeByBiome('canyons_risonanti')` → caso da definire (OPEN Q1).
- id ignoto → `null`; file mancante (`opts.path` fasullo) → grafo vuoto, no throw.
- `_resetCache()` → re-read da disco.
- `opts.network` iniettato (puro, no I/O).

### 6.2 `tests/worldgen/metaNetworkRouting.test.js` (puro, grafo + context iniettati)

- no graph → `applied:false`, reason `no_graph`, passthrough.
- no current node → reason `no_current_node`.
- tutti gli archi bloccati → reason `all_blocked_fallback` (mai sceglie → caller fa fallback).
- `prior_node_cleared`: nodo Y in `cleared_nodes` → arco eleggibile; assente → `blocked_by:'prior_node_cleared'`.
- (fase 2) `requires_trait` presente/assente; `min_pressure` sopra/sotto soglia; `season` match/mismatch.
- multipli eleggibili → scelta deterministica (critical → weight → lex); stesso context = stesso chosen.
- `critical:true` ha precedenza sugli opzionali.
- `opts.getNode`/`getOutgoingEdges` iniettati (puro, no I/O); join case-insensitive (clone crossEvent).

### 6.3 Integrazione campaign (estende `tests/ai/campaignEngine.test.js` o nuovo file)

- **BAND-NEUTRAL / back-compat**: flag OFF → `getNextEncounter` e `/advance` ritornano **identico**
  allo statico attuale (snapshot di regressione sul `default_campaign_mvp`).
- flag ON + dati + mapping → next encounter dal nodo scelto dal grafo.
- flag ON + nessun mapping node→encounter → fallback statico (reason surfaced).
- payload `/advance` + `/summary` portano il campo `meta_network_routing` (Gate-5).
- duplicazione: verifica che peek (`getNextEncounter`) e mutate (`/advance`) concordino sul next.

---

## 7. Effort + phasing + OPEN QUESTIONS

BACKLOG: **~30-40h, POST-MVP, gate normale, NON priorita' automatica**. Breakdown coerente:

### 7.1 Fasi

| Fase | Slice                                                                                   | Tocca dato? | Effort | Quando      |
| ---- | --------------------------------------------------------------------------------------- | ----------- | ------ | ----------- |
| 0    | Questo spec (design, no-impl)                                                            | no          | —      | ora         |
| 1    | **MVP-now**: `metaNetworkResolver` + `selectNextNode` topologia/`prior_node_cleared` + peek wire + surface, **flag OFF default**, niente nuovi campi dato | no | ~8-12h | gate normale |
| 2    | Arc-condition vocab (`requires_trait`/`min_pressure`/`biome_affinity`/`season`/…) → **estensione schema YAML `conditions` + mapping node→encounter** | **SI (data gate)** | ~10-14h | post master-dd verdict Q2 |
| 3    | Choice surface player-facing (Into the Breach selezione + FTL map-ahead) — Gate-5 UI    | no (UI)     | ~6-8h  | post fase 2 |
| 4    | **Deferito**: grammatica generativa Dormans (rewrite-rule → grafi) — POST-MVP           | dipende     | ~10h+  | non pianificato |

Totale fasi 1-3 ≈ 24-34h (dentro la stima 30-40h; fase 4 esclusa = il margine).

**MVP-now consigliato = solo Fase 1** (band-safe, zero tocco dato, reversibile via flag). Sblocca il
grafo come consumatore runtime read-only senza rischi di calibrazione. Fase 2 e' il valore "vero"
(lock-and-key) ma e' gated dal dato → master-dd.

### 7.2 Cosa NON fare in MVP

- Niente rewrite generativo (fase 4 / forse mai) — vedi §3.3.
- Niente modifica a `meta_network_alpha.yaml` o altri dato (fase 2 con ADR + master-dd).
- Niente RNG nella selezione (rompe il determinismo + la riproducibilita' dei test).

### 7.3 OPEN QUESTIONS per master-dd (Eduardo)

1. **Q1 — namespace `biome_id`**: `node.biome_id` (canyons_risonanti) diverge da `lowercase(node.id)`
   (badlands = chiave join GAP-A/B). La join canonica usa node.id; va riconciliato `node.biome_id`
   (rinominare / allineare al slug) o resta label di design separata? (§1.1)
2. **Q2 — schema arc-condition (DATA)**: aggiungere `conditions:` agli edge di `meta_network_alpha.yaml`
   (bump `schema_version`)? Quali condizioni sono in-scope per v1? Questo e' un fork **irreversibile/
   gated** (tocca catalog/data) → non deciso qui.
3. **Q3 — node↔encounter mapping**: i nodi sono biomi; il routing serve encounter. Mappa 1:N
   (nodo=regione che contiene N encounter del def) o si aggiunge un grafo a livello-encounter? Dove
   vive il mapping (campaign def per-encounter `node_id`, o tabella separata)?
4. **Q4 — policy di selezione**: con piu' archi eleggibili → deterministico critical→weight (proposto),
   weighted-random seedato, o **player-choice** (Into the Breach / riuso `choice_node`)? Default MVP?
5. **Q5 — relazione con i sistemi esistenti**: unificare o stratificare con `choice_node`/`branch_key`
   (binario), `seasonalEngine`, e la D4 biome-affinity (branch corrente)? La condizione `biome_affinity`
   consumerebbe direttamente il lavoro D4.
6. **Q6 — tech-debt picker duplicato**: rifattorizzare `/advance` per delegare a
   `campaignEngine.getNextEncounter` PRIMA di wirare il grafo (un solo path), o wirare entrambi?
7. **Q7 — `bridge_species_map` + `rules`**: sono concern di generazione ecosistema; confermi che sono
   **fuori scope** per il routing (il resolver li ignora)?
8. **Q8 — multi-network**: oggi c'e' solo `meta_network_alpha.yaml`. Il resolver deve supportare piu'
   file network (merge) o single-file per ora?

---

## 8. Reference games → scelte di design concrete

| Gioco                     | Meccanica                                                       | Scelta GAP-C informata                                                                                   |
| ------------------------- | -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| **Into the Breach**       | isola → scelta di N missioni su M, con preview reward/threat   | a un nodo con piu' archi uscenti, **presentare una scelta** di next-node con preview (bioma/threat/reward) invece di auto-pick → estende `choice_node` da branch binario a selezione su archi (§7.3-Q4, fase 3) |
| **Slay the Spire / FTL**  | map node graph branching, nodi tipati, percorso scelto in anticipo, archi rischio/ricompensa | la meta-network **e' la mappa**; `node.weight` → probabilita'/difficolta'; `arc.resistance` → costo/rischio di traversata; presenza di apex nell'ecosistema → nodo "elite-like"; surface **map-ahead** dei nodi raggiungibili + condizioni (Gate-5, fase 3) |
| **FTL (specifico)**       | non visiti tutto; fuel/time forzano la rotta                   | non ogni nodo raggiungibile in un run: gate `min_pressure`/`season` + percorso critico forzano routing **significativo** (fase 2) |
| **Dormans grammars**      | mission vs space; lock-and-key; rewrite generativo             | adottare **mission graph + lock-and-key** (§3); tenere la **generazione** (rewrite) come fase 4 deferita per evitare il runtime-sim trap (§3.3) |

---

## 9. Provenance + no-impl footer

- **Ground-truth verificata 2026-05-31** (file:line citati): `meta_network_alpha.yaml`,
  `campaignEngine.js:74-107`, `routes/campaign.js:322-391`, `ecosystemResolver.js`, `foodwebFilter.js`,
  `crossEventEngine.js`, `reinforcementSpawner.js:165-182,302-306`, `session.js:142,1532`, `app.js:792`,
  `BACKLOG.md` (riga GAP-C + closure GAP-A/B #2447).
- **Reference pattern**: [PR #2447](https://github.com/MasterDD-L34D/Game/pull/2447) GAP-A/B.
- **Museum**: card worldgen M-013/M-014/M-016 + `docs/museum/galleries/worldgen.md`;
  audit `docs/reports/2026-04-26-worldgen-pcg-audit.md`.
- **Anti-pattern Gate-5** (Engine LIVE / Surface DEAD): il wire include surface (console + campo
  payload) per non ripetere il pattern orphan.
- **NO-IMPL**: questo doc e' solo design. Nessun codice scritto, nessun file dato toccato, nessun
  merge. Implementazione gated da review master-dd (in particolare §7.3 OPEN QUESTIONS, e Q2 = data gate).
