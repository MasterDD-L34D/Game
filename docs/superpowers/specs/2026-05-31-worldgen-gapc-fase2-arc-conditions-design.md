---
title: 'GAP-C fase 2 — arc-conditions (lock-and-key) su edge meta-network — design (TKT-WORLDGEN-GAPC) [no-impl]'
workstream: flow
category: spec
doc_status: draft
doc_owner: claude-code
last_verified: '2026-05-31'
language: it
tags:
  [
    worldgen,
    meta-network,
    campaign,
    routing,
    dormans,
    arc-conditions,
    lock-and-key,
    season,
    biome-affinity,
    gap-c,
    fase-2,
    spec,
    no-impl,
  ]
---

# GAP-C fase 2 — arc-conditions su edge meta-network

> Spec di design (review master-dd PRIMA di implementare — **NO-IMPL**, zero codice, zero tocco a
> catalog/data). Approfondisce **§3.2 (vocabolario arc-condition)** + **§7.3-Q2 (data gate)** della
> spec fase 1
> [`2026-05-31-worldgen-gapc-meta-network-routing-design.md`](2026-05-31-worldgen-gapc-meta-network-routing-design.md)
> in uno spec fase-2 **decision-ready**. Non ri-deriva l'intero feature: assume la fase 1 SHIPPED
> (PR #2483, `efa3e50d` su main) come base verificata e ne estende SOLO la valutazione delle
> condizioni sugli archi (Dormans lock-and-key).

## 0. TL;DR (per decidere in 30s)

- **Cosa**: aggiungere un blocco `conditions:` agli **edge** del grafo meta-network, cosi' che
  `selectNextNodes` filtri i candidati non solo per topologia (`prior_node_cleared`, gia in fase 1)
  ma anche per **stato di gioco** (stagione, trait del branco, pressione, biome-affinity). E' il
  "lock-and-key" di Dormans: l'arco e' una **porta**; la condizione e' la **chiave**.
- **Quick-win raccomandato v1 = `season` da solo**. La stagione corrente e' **gia stato runtime
  vivo** (`campaignSeasonalState.current_season`, verificato questa sessione) e i 3 archi
  `seasonal_bridge` del grafo **vogliono gia** un gate stagionale (la loro `seasonality` descrittiva
  dice "inverno"/"notte"): la condizione rende **meccanicamente vera** una flavor gia presente. Zero
  nuovo stato da fork-are; un solo nuovo campo dato.
- **Data gate (irreversibile)**: scrivere `conditions:` dentro `meta_network_alpha.yaml` tocca
  catalog/data + bump `schema_version 2.0 -> 2.1` + ricalcolo `trace_hash`. **Richiede verdict
  master-dd + ADR** (§5). Questo spec NON tocca il YAML.
- **Band-safe / back-compat**: edge **senza** blocco `conditions` -> sempre eleggibile (passthrough),
  quindi il grafo fase-1 a 12 archi si comporta **identico** finche' nessun edge porta condizioni.
  Il routing non tocca stat/combat -> bande hardcore_06/07 + badlands intatte.
- **Reference feel**: FTL (carburante/tempo forzano una rotta non-esaustiva), Slay the Spire
  (nodi/archi tipati e gated), Dormans (lock-and-key). Vedi §8.

> ⚠️ **Claude autonomous judgment — pending master-dd review** (criteri value diversi possibili):
> il set di condizioni v1, la forma del campo `season`, e il bump di `schema_version` sono
> **proposte**. I fork irreversibili (scrittura su catalog/data, namespace, schema) restano OPEN
> QUESTION (§7) e NON sono decisi qui.

---

## 1. Ground-truth recap — cosa ha shippato la fase 1 (file:line su main)

Verificato leggendo i tre file su `efa3e50d` (origin/main) dentro il worktree, non dalla memoria.

### 1.1 I tre artefatti fase 1

| Artefatto                                          | File:line (main `efa3e50d`)                             | Ruolo                                                                        |
| -------------------------------------------------- | ------------------------------------------------------- | ---------------------------------------------------------------------------- |
| `metaNetworkResolver` (loader read-only)           | `apps/backend/services/worldgen/metaNetworkResolver.js` | parse YAML -> `{ network, nodeIndex, edgesBySource }`, cache + `_resetCache` |
| `metaNetworkRouting.selectNextNodes` (selez. pura) | `apps/backend/services/worldgen/metaNetworkRouting.js`  | candidati next-node + dedupe archi paralleli, deterministico                 |
| `GET /api/campaign/meta-network/next` (diagnostic) | `apps/backend/routes/campaign.js:204-230`               | endpoint flag-gated `META_NETWORK_ROUTING` OFF default                       |

**Nota di reconciliation (anti-pattern #19)**: la spec fase 1 aveva _proposto_ una API `selectNextNode`
(singolare, con `chosen`). Lo **shipped** e' `selectNextNodes` (plurale, ritorna `candidates[]` per il
player-choice = verdict Q4). Questo spec fase 2 estende la **realta' shippata**, non la proposta.

### 1.2 Dove `selectNextNodes` consumera' le condizioni (il loop di eleggibilita')

Firma + ritorno shippati (`metaNetworkRouting.js:33,114`):

```
selectNextNodes(currentNodeId, ctx = {})  // ctx OGGI = { graph, clearedNodes, allowRevisit }
  -> { applied, from, candidates:[{ node_id, biome_id, weight, edge_type, resistance,
       seasonality, edge_types[] }], excluded:[node_id], reason }
  // reason in: no_graph | no_node | terminal | all_cleared | filtered | eligible
```

Il **punto di innesto** delle condizioni e' il loop archi-uscenti `metaNetworkRouting.js:70-100`. Oggi
l'unico filtro e' la **clear-gate** (`:72`):

```js
for (const e of outgoing) {
  const toKey = _norm(e.to);
  if (!allowRevisit && cleared.has(toKey)) {
    // :72  -> ESCLUSIONE topologica gia presente (prior_node_cleared)
    excludedSet.add(e.to);
    continue;
  }
  // ... (:76-99) costruzione/merge del candidato per target (dedupe archi paralleli)
}
```

Le arc-conditions si valutano **qui**, subito dopo la clear-gate (`:72`) e prima della costruzione del
candidato (`:76`). E' un singolo `continue` aggiuntivo per edge bloccato.

### 1.3 Catena load-bearing che la fase 1 NON copre (gap da chiudere in fase 2)

Verificato sul resolver: il mapper edge `metaNetworkResolver.js:63-70` normalizza **solo**
`from / to / type / resistance / seasonality / notes`. **Qualsiasi campo non in quella lista viene
silenziosamente scartato.** Quindi:

> 🔴 **Se aggiungo `conditions:` al YAML ma NON estendo il mapper, `selectNextNodes` non vedra' mai le
> condizioni (no-op silenzioso).** La fase 2 DEVE estendere `metaNetworkResolver.js:63-70` con
> `conditions: e.conditions ?? null` (pass-through grezzo: il resolver resta "muto", non interpreta).

Questa e' la singola modifica piu' facile-da-dimenticare e va trattata come parte 1 dell'impl.

---

## 2. Schema `conditions:` proposto sugli edge (data, fase 2)

### 2.1 Forma YAML + bump schema_version

`schema_version: 2.0 -> 2.1` (additivo, retro-compatibile: edge senza `conditions` invariati). Forma
proposta (esempio sul `seasonal_bridge` che gia vuole un gate stagionale):

```yaml
# meta_network_alpha.yaml (NON scritto da questo spec — esempio illustrativo)
edges:
  - from: FORESTA_TEMPERATA
    to: CRYOSTEPPE
    type: seasonal_bridge
    resistance: 0.6
    seasonality: inverno # <-- flavor descrittivo (resta, italiano, NON usato per il gate)
    notes: valichi nevosi con copertura forestale rada
    conditions: # <-- NUOVO blocco (fase 2). Assente = arco sempre eleggibile.
      season: [winter] # enum canonico EN (= seasonalEngine.SEASONS / cross_events.yaml)
```

**Semantica di valutazione** (proposta):

- Blocco `conditions` **assente o vuoto** -> arco **sempre** eleggibile (passthrough / back-compat).
- Piu' chiavi nello stesso blocco -> **AND** (tutte devono passare).
- Una chiave con valore-lista (es. `season: [winter, autumn]`) -> **OR** intra-lista (basta un match).
- Prima chiave che fallisce -> arco escluso, `blocked_by = <chiave>` (per il surface Gate-5).

### 2.2 Set di condizioni candidate (v1) — sorgente di stato + semantica

Le candidate vengono da §3.2 della spec fase 1. Per ognuna: **dove vive lo stato OGGI** (citato/
verificato) e **semantica di eval**. La colonna "Verifica" segna cosa ho confermato questa sessione vs
cosa va confermato in impl.

| Condizione                       | Lock/Key (semantica)                           | Sorgente stato nel runtime OGGI                                                                                    | Eval (pura)                               | Verifica                           |
| -------------------------------- | ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ | ----------------------------------------- | ---------------------------------- |
| `season: [enum]`                 | l'arco apre solo in certe stagioni             | `campaignSeasonalState.get(id).current_season` (`campaign.js:66,72-77`) — enum EN `spring/summer/autumn/winter`    | `_norm(ctx.season)` in lista normalizzata | ✅ stato live verificato           |
| `prior_node_cleared: [id]`       | nodo Y vinto prima (lock-and-key puro)         | `ctx.clearedNodes` (gia in fase 1, `metaNetworkRouting.js:60`)                                                     | tutti gli id in `cleared` set             | ✅ gia implementato (formalizzare) |
| `min_pressure` / `max_pressure`  | gate su pressione Sistema                      | `pressure` di sessione/hardcore/GAP-B — **non ancora threadato nel context di campaign-routing**                   | `ctx.pressure >= min` / `<= max`          | 🟡 sorgente da threadare (Q-F)     |
| `requires_trait: [id]`           | il branco possiede trait X (key esplicita)     | trait acquisiti del branco — fase-1 §3.2 indica `campaign.acquiredTraits` / roster; **campo esatto da confermare** | ogni id in `ctx.partyTraits` set          | 🟡 campo esatto da confermare      |
| `biome_affinity: { biome, min }` | affinita' del branco al bioma target >= soglia | mappa D4 biome-affinity (branch `claude/d4-biome-affinity-spec`) — **da threadare nel context** (Q5)               | `ctx.biomeAffinity[target] >= min`        | 🟡 dipende da D4 (Q-D)             |
| `requires_flag: [id]`            | flag permanente settato (Wildermyth choice)    | `campaign.permanentFlags` / route `/flag/record` (fase-1 §3.2)                                                     | ogni flag in `ctx.flags` set              | 🟡 campo esatto da confermare      |
| `min_progress` / `act_gate`      | gate su avanzamento campagna                   | `campaign.currentAct` (`campaignEngine.js:57,76,97` — verificato) / `computeProgress`                              | `ctx.act >= act_gate`                     | ✅ `currentAct` verificato         |

**Raccomandazione v1 (minimal)**: spedire **`season`** + formalizzare **`prior_node_cleared`** nel
blocco `conditions` (gia coperto a livello topologico in fase 1). Sono le uniche due con **stato
gia vivo e verificato** + footprint dati minimo. Le altre (`min_pressure`, `requires_trait`,
`biome_affinity`, `requires_flag`, `act_gate`) entrano in **v1.1** una volta provata la plumbing
end-to-end e sciolto il context-threading (Q-F/Q-D). Cut finale del set = **OPEN Q-A** (master-dd).

> Motivazione "season-first" (mirror della disciplina fase-1 = MVP minimo prima): provare l'intera
> catena dato->resolver->routing->endpoint con UNA condizione a basso rischio e stato gia vivo evita
> di accoppiare il primo data-gate a 5 sorgenti di stato non ancora threadate.

---

## 3. Come `selectNextNodes` valuta le condizioni (estensione pura)

### 3.1 Estensione del `ctx` (additiva, opzionale)

`ctx` oggi = `{ graph, clearedNodes, allowRevisit }`. Fase 2 aggiunge campi **opzionali**, consumati
**solo** se un edge porta la chiave corrispondente:

```
ctx = {
  graph, clearedNodes, allowRevisit,        // fase 1 (invariati)
  season,            // string EN (es. 'winter') — da campaignSeasonalState
  partyTraits,       // string[] o Set — trait acquisiti del branco
  pressure,          // number
  flags,             // string[] o Set
  biomeAffinity,     // { [biomeOrNodeSlug]: number } (D4)
  act,               // number (campaign.currentAct)
}
```

Tutti i campi nuovi sono opzionali: se assenti e un edge li richiede, la condizione **fallisce
chiuso** (fail-closed) -> arco escluso con `blocked_by` (l'arco e' "bloccato perche' non so lo stato").
Eccezione disciplinata: vedi §3.3 sul fail-open vs fail-closed (OPEN Q).

### 3.2 Il valutatore (forma — NO impl)

Pura, dependency-light, clone del registro `_norm` gia in `metaNetworkRouting.js:27`:

```
_evalEdgeConditions(conditions, ctx) -> { ok: boolean, blocked_by: condKey | null }
  - !conditions || Object.keys==0  -> { ok:true,  blocked_by:null }    // passthrough back-compat
  - per ogni (key,val) in conditions (ordine stabile):
      eval = _COND[key](val, ctx)      // dispatch su un piccolo registro di evaluatori puri
      if (!eval) return { ok:false, blocked_by:key }                   // AND: primo fail esce
  - return { ok:true, blocked_by:null }
```

Innesto nel loop esistente (`metaNetworkRouting.js:70-100`), subito dopo la clear-gate `:72`:

```
// dopo  if (!allowRevisit && cleared.has(toKey)) {...continue;}
const cond = _evalEdgeConditions(e.conditions, ctx);
if (!cond.ok) {
  excludedSet.add(e.to);                          // riusa l'excluded esistente (reason 'filtered')
  blocked.push({ node_id: e.to, blocked_by: cond.blocked_by });   // dettaglio Gate-5 (additivo)
  continue;
}
// ... costruzione candidato invariata (:76-99)
```

### 3.3 Invarianti preservate (band-safe)

- **Back-compat**: i 12 edge attuali non hanno `conditions` -> `_evalEdgeConditions` ritorna sempre
  `ok:true` -> output **identico** alla fase 1 a parita' di `ctx`. Asserzione BAND-NEUTRAL nel test.
- **Determinismo**: la valutazione e' pura (input->output), nessun RNG; ordinamento candidati
  invariato (`weight` desc, `node_id` asc, `:107`).
- **Mai blocca la progressione**: se TUTTI gli archi sono bloccati da condizioni, `candidates` resta
  vuoto e il caller fa fallback al next statico (clone garanzia GAP-A "il filtro non svuota mai il
  pool"). Per distinguerlo dal caso "tutti cleared", propongo un nuovo `reason`:
  - `all_cleared` (esistente) = nessun candidato perche' tutti i target gia vinti;
  - **`all_blocked`** (nuovo) = nessun candidato perche' tutti bloccati da `conditions`;
  - `filtered` (esistente) = restano candidati ma qualcuno escluso (cleared o condizione).
- **`excluded` shape**: resta `node_id[]` (back-compat); il dettaglio `blocked_by` vive in un campo
  **additivo** `blocked: [{ node_id, blocked_by }]` (per il surface). Cambiare la forma di `excluded`
  e' fuori scope -> OPEN Q-E.
- **fail-closed vs fail-open**: proposta = **fail-closed** (stato mancante per una condizione richiesta
  -> arco bloccato), perche' e' band-safe (al massimo fa fallback statico, mai apre una rotta che non
  dovrebbe). Alternativa fail-open (stato mancante -> ignora la condizione) e' piu' permissiva ma puo'
  aprire archi out-of-state -> NON raccomandata. Decisione = OPEN Q.

---

## 4. Il quick-win `season` (effort minimo, stato gia vivo)

Perche' `season` e' la **prima** condizione giusta:

1. **Stato gia vivo** (verificato questa sessione): `campaign.js:66` dichiara
   `campaignSeasonalState = new Map()`; `:72-77` `_getOrInitSeasonalState(campaignId)` ritorna lo
   stato con `current_season` (enum EN, default `'spring'`). Le route stagionali sono **shippate**
   (`campaign.js:618/633/657/684`, header `:49` "Phase C routes"). Niente nuovo stato da creare:
   il caller legge `_getOrInitSeasonalState(id).current_season` e lo passa in `ctx.season`.
2. **Vocabolario gia coerente**: `seasonalEngine.SEASONS = ['spring','summer','autumn','winter']`
   (`seasonalEngine.js:51`) **e** `cross_events.yaml` (stessa dir del grafo) usa gia `autumn/summer/
winter` (`cross_events.yaml:17,28,41`). Quindi il campo `conditions.season` usa **lo stesso enum
   EN** -> zero nuovo vocabolario, e il match e' lo stesso pattern di GAP-B
   (`crossEventEngine.js:68` `_norm(e.season) === _norm(s)`).
3. **La flavor lo chiede gia**: 3 archi del grafo sono `seasonal_bridge` con `seasonality`
   "inverno"/"inverno profondo"/"notte" (`meta_network_alpha.yaml:65,73,109`). Aggiungere
   `conditions.season:[winter]` su quegli archi rende **meccanicamente vero** cio' che il dato gia
   dice in prosa. E' il piu' piccolo delta dato->comportamento.

### 4.1 La decisione sul campo `season` (NON parsare la `seasonality` descrittiva)

> ⚠️ Trappola da evitare: la `seasonality` esistente e' **free-text italiano e composito** —
> `"estate/notte"`, `"primavera/autunno"`, `"tarda_inverno"`, `"episodico"` (quest'ultimo **non e'
> nemmeno una stagione**). Gate-are su questa stringa = parsing fragile + mapping it->en + gestione
> token non-stagione.

**Proposta (raccomandata)**: NON usare `seasonality` per il gate. Aggiungere un campo **esplicito**
`conditions.season: [<enum EN>]`, machine-clean, allineato a `seasonalEngine.SEASONS` +
`cross_events.yaml`. La `seasonality` descrittiva resta come **flavor** (UI/log), disaccoppiata dalla
meccanica. Cosi':

- `ctx.season = _norm(current_season)` (es. `'winter'`).
- eligibile se `conditions.season` assente **oppure** `ctx.season` in `conditions.season.map(_norm)`.

Token non-stagione ("episodico") e compositi ("estate/notte") restano **solo** descrittivi; se un
designer vuole gate-arli, lo fa con l'enum esplicito (`[summer]` + eventuale futura condizione
`time_of_day`). Mapping it->en della `seasonality` = **esplicitamente fuori scope** (OPEN Q-C).

---

## 5. DATA GATE (Q2) — punto di decisione esplicito + ADR stub

Aggiungere `conditions:` a `meta_network_alpha.yaml` **non e' una modifica di codice reversibile via
flag**: e' un **fork irreversibile su catalog/data**. Per la disciplina del progetto (anti-pattern
#19, "stop per fork architetturale / catalog-write", memoria `feedback_autonomous_choice_on_forks`),
**questo spec NON scrive il YAML** e lo lascia come decisione master-dd.

### 5.1 Cosa tocca il data gate (ripple checklist da verificare in impl)

| Ripple                          | Dettaglio                                                                                                                                                  |
| ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `schema_version 2.0 -> 2.1`     | bump additivo (edge senza `conditions` validi anche in 2.1)                                                                                                |
| `receipt.trace_hash` (riga 6)   | cambia il contenuto -> il `trace_hash` va ricalcolato (`tests/scripts/test_trace_hashes.py`)                                                               |
| Validatori pack                 | `python tools/py/game_cli.py validate-ecosystem-pack` + `validate-datasets` devono restare verdi (confermare se esiste uno schema AJV per il file network) |
| Resolver pass-through           | `metaNetworkResolver.js:63-70` deve propagare `conditions` (vedi §1.3) — codice, non dato                                                                  |
| Altri consumer del file network | confermare che nessun consumer assuma "no conditions" (oggi solo il resolver lo legge)                                                                     |

### 5.2 ADR stub proposto (da creare SE master-dd approva)

```
docs/adr/ADR-2026-05-31-meta-network-arc-conditions-schema.md   (status: PROPOSED)

Title:   Meta-network edge arc-conditions schema (schema_version 2.0 -> 2.1)
Context: GAP-C fase 1 (PR #2483) ha shippato routing topologico read-only. La fase 2
         (lock-and-key Dormans) richiede condizioni sugli edge -> estensione schema su
         catalog/data (irreversibile, fuori dall'auto-merge L3 forbidden-paths? confermare).
Decision (gated master-dd):
  - approvare blocco `conditions:` additivo sugli edge, `schema_version 2.0 -> 2.1`;
  - set v1 = { season } (+ prior_node_cleared formalizzato) [vedi Q-A];
  - `season` = enum EN [spring,summer,autumn,winter], NON parsing della `seasonality` it [vedi Q-C];
  - ricalcolo trace_hash + validatori verdi come gate di merge.
Consequences: i 12 edge attuali invariati (back-compat); fase 2 codice (resolver+routing+endpoint)
         sbloccata solo dopo questo ADR ACCEPTED.
Alternatives considered: nessun campo (resta topologico), gate su seasonality free-text (rifiutato §4.1).
```

> **Q2 = il punto di decisione**: approvi il bump `schema_version` + il blocco `conditions:`? Con
> quale set v1? Senza questo verdict, la fase 2 resta design-only (questo doc).

---

## 6. Test plan (mirror fase 1: passthrough/edge -> real -> injected -> BAND-NEUTRAL)

`node:test` + `node:assert`. Estende i file fase-1, non li riscrive.

### 6.1 `tests/worldgen/metaNetworkRouting.test.js` (puro, grafo + ctx iniettati)

- **back-compat**: edge **senza** `conditions` + qualsiasi `ctx` -> eleggibile (output identico a fase 1).
- `season`: edge `conditions.season:[winter]` + `ctx.season='winter'` -> eleggibile;
  `ctx.season='summer'` -> escluso, `blocked: [{node_id, blocked_by:'season'}]`.
- **OR intra-lista**: `season:[winter,autumn]` + `ctx.season='autumn'` -> eleggibile.
- **AND inter-chiave**: `{ season:[winter], min_pressure:3 }` -> passa solo se entrambe; una fallisce -> escluso con `blocked_by` della prima che fallisce.
- **fail-closed**: edge richiede `season` ma `ctx.season` assente -> escluso (`blocked_by:'season'`).
- `reason`: tutti gli archi bloccati da condizioni (nessuno cleared) -> nuovo `all_blocked`; misto -> `filtered`.
- **determinismo**: stesso `ctx` -> stesso ordinamento/`candidates` (ripetuto 2x, deep-equal).
- `prior_node_cleared` formalizzato come condizione -> parita' col comportamento topologico fase 1.

### 6.2 `tests/worldgen/metaNetworkResolver.test.js`

- **pass-through condizioni**: `opts.network` iniettato con un edge che porta `conditions` ->
  `getOutgoingEdges(...)` restituisce l'edge **con** `conditions` (regola il gap §1.3).
- **real file**: `meta_network_alpha.yaml` reale -> **5 nodi / 12 archi** invariati, `conditions`
  assenti/null (anti-drift; conferma che il dato reale non e' stato toccato da questo lavoro).

### 6.3 Endpoint `GET /api/campaign/meta-network/next` (estende il test fase-1)

- flag OFF (`META_NETWORK_ROUTING !== 'true'`) -> `{ enabled:false }` (invariato).
- flag ON + `?from=FORESTA_TEMPERATA&season=winter` -> candidato CRYOSTEPPE eleggibile;
  `?season=summer` -> CRYOSTEPPE escluso + `blocked` surfacizzato.
- ctx assembly: il diagnostic accetta `season` (e futuri `pressure`/`traits`) via query param, mirror
  del pattern `?cleared=` esistente (`campaign.js:219-222`); in alternativa, se passato un campaign id,
  legge `_getOrInitSeasonalState(id).current_season`.

---

## 7. Effort + OPEN QUESTIONS

### 7.1 Effort breakdown (fase 2, codice — il dato e' gated a parte)

| Slice                                                                                             | Tocca dato?    | Effort  |
| ------------------------------------------------------------------------------------------------- | -------------- | ------- |
| Resolver pass-through `conditions` (`metaNetworkResolver.js:63-70`) + test                        | no             | ~0.5h   |
| `_evalEdgeConditions` + registro evaluatori (v1 = `season` + `prior_node_cleared`) + innesto loop | no             | ~3-4h   |
| Estensione `ctx` + assembly endpoint (`season` da `campaignSeasonalState`) + test endpoint        | no             | ~1.5-2h |
| ADR stub + ripple (trace_hash, validatori) **se master-dd approva il dato**                       | **SI (gated)** | ~1-1.5h |
| Scrittura `conditions:` sugli archi (es. 3 `seasonal_bridge`) **dopo ADR**                        | **SI (gated)** | ~0.5h   |
| v1.1 (condizioni extra: `min_pressure`/`requires_trait`/`biome_affinity`/...)                     | dipende        | ~4-6h   |

Codice v1 (no-dato) ≈ **5-6.5h**; col data gate + scrittura archi ≈ **7-8.5h** (dentro la stima
fase-1 §7.1 di ~10-14h per la fase 2). v1.1 e' incrementale.

### 7.2 OPEN QUESTIONS per master-dd (Eduardo)

1. **Q-A — set condizioni v1**: `season`-only-first (raccomandato) | `season` + `prior_node_cleared`
   formalizzato | vocab pieno (`+ min_pressure/requires_trait/biome_affinity/requires_flag/act_gate`)?
2. **Q-B (= fase-1 Q2, DATA GATE)**: approvi `schema_version 2.0 -> 2.1` + blocco `conditions:` su
   `meta_network_alpha.yaml`? E' il fork irreversibile. ADR stub in §5.2.
3. **Q-C — forma `season`**: campo esplicito `conditions.season:[enum EN]` (raccomandato, allinea
   `cross_events.yaml` + `seasonalEngine`) **vs** gate sulla `seasonality` descrittiva it (rifiutato,
   §4.1). E i token non-stagione (`episodico`) / compositi (`estate/notte`) — restano solo flavor?
4. **Q-D (= fase-1 Q5) — relazione con D4 biome-affinity**: la condizione `biome_affinity` consuma la
   mappa D4 del branch `claude/d4-biome-affinity-spec`? Va threadata nel `ctx` (da dove al
   campaign-routing time?). Stratificare con `season` o tenerla in v1.1?
5. **Q-E — shape `excluded`**: tenere `excluded: node_id[]` (back-compat) + nuovo `blocked:
[{node_id, blocked_by}]` (raccomandato) | cambiare la forma di `excluded`?
6. **Q-F — sorgente `pressure`**: la pressione e' di **sessione/combat**, il routing e' di
   **campaign**. Da dove arriva `ctx.pressure` al momento della scelta del next-node (snapshot
   ultima sessione? cross-event GAP-B? campaign-level aggregate)?
7. **Q-G — fail-closed vs fail-open**: stato mancante per una condizione richiesta -> arco bloccato
   (fail-closed, raccomandato band-safe) | ignora la condizione (fail-open)?
8. **Q-H — persistenza season**: `campaignSeasonalState` e' una **Map in-memory POC** non persistita
   (`campaign.js:63-66`). Accettabile per il gate (al massimo fallback statico) o bloccare su
   Prisma write-through prima di gate-are routing su season?

---

## 8. Reference games -> condizione concreta

| Gioco                    | Meccanica di gating                                      | Mappatura su una arc-condition concreta                                                                                                                                                                                    |
| ------------------------ | -------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **FTL**                  | carburante/tempo forzano una rotta; non visiti tutto     | `season` + (v1.1) `min_pressure` chiudono archi -> in un dato run NON tutti i nodi sono raggiungibili. I 3 `seasonal_bridge` diventano rotte "che si aprono solo in inverno/notte" -> rotta significativa, non esaustiva.  |
| **Slay the Spire**       | nodi/archi tipati, ti impegni in anticipo su un percorso | `conditions` rende gli edge **tipati per stato**: un arco verso un nodo apex-like puo' chiedere `requires_trait`/`min_pressure` (elite gated) -> il player sceglie la rotta sapendo il gate (preview gia in `candidates`). |
| **Dormans lock-and-key** | una "chiave" (stato) sblocca una "porta" (arco)          | letterale: `requires_trait`/`requires_flag`/`prior_node_cleared` = chiavi; il blocco `conditions` = la serratura. `season` = una chiave "ambientale" (la stagione e' la chiave che apre il valico).                        |

---

## 9. Provenance + no-impl footer

- **Ground-truth verificata 2026-05-31** su `efa3e50d` (origin/main), dentro il worktree, file:line
  citati: `metaNetworkRouting.js:27,33,60,70-100,107,114`, `metaNetworkResolver.js:63-70`,
  `routes/campaign.js:49-77,204-230,618,633,657,684`, `seasonalEngine.js:51,211-222`,
  `crossEventEngine.js:62-68`, `cross_events.yaml:17,28,41`, `meta_network_alpha.yaml` (5 nodi/12 archi,
  `schema_version 2.0`, `seasonality` it free-text), `campaignEngine.js:57,76,97`.
- **Correzioni anti-pattern #19 (verify > trust prompt/memoria)**: (a) lo shipped e' `selectNextNodes`
  (plurale), non `selectNextNode`; (b) `seasonalEngine.js` ESISTE al path indicato e le sue route sono
  shippate (commento "Phase C deferred" interno e' stale); (c) il resolver **scarta** i campi non
  mappati -> `conditions` va propagato esplicitamente; (d) la `seasonality` esistente NON e' un enum
  ed e' italiana/composita -> non gate-abile direttamente.
- **Base di riferimento**: spec fase 1
  [`2026-05-31-worldgen-gapc-meta-network-routing-design.md`](2026-05-31-worldgen-gapc-meta-network-routing-design.md)
  (§3.2 vocab, §7.3-Q2 data gate, §7.3-Q5 D4); pattern GAP-A/B
  [PR #2447](https://github.com/MasterDD-L34D/Game/pull/2447); MVP fase 1
  [PR #2483](https://github.com/MasterDD-L34D/Game/pull/2483).
- **NO-IMPL**: solo design. Nessun codice scritto, **nessun file dato/schema toccato**, nessun merge.
  Implementazione gated da review master-dd (§7.2 OPEN QUESTIONS, in particolare Q-B = data gate).
