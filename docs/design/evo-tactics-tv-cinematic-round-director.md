---
title: 'Evo-Tactics TV Cinematic Round Director (SPEC-D)'
date: 2026-06-08
type: design-spec
doc_status: active
doc_owner: master-dd
workstream: flow
last_verified: '2026-06-17'
source_of_truth: false
review_cycle_days: 30
language: it
tags: [evo-tactics, tv-mirror, cinematic, round-director, combat, event-log, device-authority]
related: ADR-2026-06-07-device-authority-tv-mirror-canon
---

# Evo-Tactics TV Cinematic Round Director (SPEC-D)

Contratto Wave-1 #4 della roadmap (`docs/planning/2026-06-05-evo-tactics-open-points-resolution-roadmap.md`).
Trasforma l'event-log + la resolution queue di un round (output del combat LIVE) in un
**piano-sequenza** sulla TV: camera, animazioni, callout, battle feed, recap. Obiettivo:
far sentire il round come un evento VISTO, non come un backend-log visualizzato
(reconstruction Fase 11).

## 1. Scopo e non-scopo

**Scopo.** Definire il contratto del **director TV-side**: quali input canonici consuma
(resolution_queue, turn_log, reazioni, revealed_intents, status, context), quale output
produce (camera/animation beats, callout, battle feed, recap), e l'invariante per cui la
regia NON altera mai l'esito canonico.

**Non-scopo (esplicito).**

- SPEC-D NON risolve il combat: `roundOrchestrator.js` (resolveRound) e' **LIVE** e
  resta owner di danni, kill, status, ordine di risoluzione. D e' il RENDERER, non il
  produttore. La queue + il log gia' esistono (reconstruction Fase 11).
- SPEC-D NON e' UI di device: il planning/commit e' SPEC-C. D parte DOPO il commit, dal
  risultato canonico.
- SPEC-D NON ridefinisce la visibilita': la **eredita** da SPEC-B. D e' una surface TV =
  consuma SOLO `public` + `aggregated` (mai `private`/`secret`).
- SPEC-D NON e' un secondo motore di stato: e' una funzione (quasi) pura
  dall'event-log alla regia.

Complementarieta':

```text
SPEC-C = device compone -> commit
roundOrchestrator (LIVE) = resolve -> event-log + resolution_queue (la VERITA')
SPEC-D = TV trasforma quell'event-log in piano-sequenza   <-- questo documento
```

## 2. Baseline LIVE (verificato 2026-06-08, non ricostruire)

L'output di un round risolto esiste gia' (reconstruction Fase 11; bridge
`apps/backend/routes/sessionRoundBridge.js`). Il director compone da DUE payload:

Output del resolve (risposta `/commit-round` con `auto_resolve` = il round APPENA risolto):

| Campo                                     | Fonte / significato                                         |
| ----------------------------------------- | ----------------------------------------------------------- |
| `resolution_queue`                        | ordine canonico (priority desc, unit_id asc, intent_index)  |
| `turn_log_entries`                        | per azione: `action` + `roll` (roll_result) + danno/status  |
| `reactions_triggered`                     | parry/counter/overwatch/trigger_status scattati nel resolve |
| `player_actions` / `ia_actions`           | le azioni committate di player e Sistema = il reveal WEGO   |
| `skipped`                                 | azioni saltate (actor/target morto) con reason              |
| `objective_state`/`mission_timer`/`state` | esito obiettivo, timer, stato pubblico                      |

Output del begin-planning (risposta `/round/begin-planning` = prepara il round DOPO):

| Campo              | Fonte / significato                                                                   |
| ------------------ | ------------------------------------------------------------------------------------- |
| `threat_preview`   | SIS intents normalizzati del round successivo (`buildThreatPreview`, telegraph)       |
| `revealed_intents` | foresight per-actor da `status.telepatic_link` (`computeTelepathicReveal`), opzionale |

> NAMING-COLLISION (load-bearing): il campo codice `revealed_intents` e' la **foresight
> telepatica** del begin-planning, NON "gli intent rivelati al commit". L'apertura WEGO
> del piano-sequenza = `player_actions`/`ia_actions` dell'output del resolve.

`turn_log` shape (`combat.schema.json#/$defs/turn_log`): `turn`, `action`, `roll`
(natural/total/dc/success/mos/damage_step/is_crit/is_fumble/parry/pt_spent),
`damage_applied`, `statuses_applied`, `statuses_expired`. Godot ha gia' `battle_feed.gd`
e `battle_feed_adapter.gd`, ma manca il vero director (gap centrale, Fase 11).

Invarianti ereditate:

- **ADR-2026-06-07 punto 5 + reconstruction sez. 7 punto 8:** l'event-log e' la verita';
  la regia TV puo' essere **local-only**, ma DEVE derivare dagli eventi canonici e NON
  alterare l'esito.
- **SPEC-B (3.6 + sez. 5):** la TV mirror trasporta SOLO `public` + `aggregated`. Il
  director NON riceve `private` (preview/draft/readiness per-player) ne' `secret`
  (signal). Cio' che mostra (revealed_intents, danni, kill) e' gia' `public` post-reveal.
- **SPEC-K 3.2/7.4:** `TvMatingPanel`/`MainDebrief` sono gia' TV read-only coerenti; il
  round render e' `partial` -> SPEC-D lo completa. La TV non e' UI di planning.

## 3. Regola guida

```text
La regia DERIVA dall'event-log; non lo altera mai.
TV = round come evento visto, non come log mostrato.
```

Derivata (operativa):

- input = SOLO output canonici del resolve (sez. 2), tutti `public`/`aggregated`;
- output = beats/callout/feed/recap, funzione (quasi) deterministica dell'input;
- la regia puo' enfatizzare, ritmare, raggruppare -- MAI cambiare danni, kill, status,
  esito o l'ordine causale (una reazione non puo' essere mostrata prima del suo trigger).

## 4. Contratto input (cosa consuma D)

Tutti `public`/`aggregated` (SPEC-B): il director e' una surface TV.

| Input                                  | Uso nel director                                       | Fonte / Tier                          |
| -------------------------------------- | ------------------------------------------------------ | ------------------------------------- |
| `player_actions` / `ia_actions`        | apertura: cosa player+Sistema han committato (WEGO)    | resolve / `public`                    |
| `resolution_queue`                     | scaletta dei beats (ordine causale canonico)           | resolve / `public`                    |
| `turn_log_entries`                     | contenuto di ogni beat: hit/miss, danno, crit, status  | resolve / `public`                    |
| `reactions_triggered`                  | beats di interruzione (parry/counter/overwatch)        | resolve / `public`                    |
| `skipped`                              | elide o micro-callout ("bersaglio gia' a terra")       | resolve / `public`                    |
| `statuses_applied`/`_expired`, `units` | overlay stato/ferite/mutazioni sulle creature          | resolve / `public`                    |
| `threat_preview`                       | telegraph del round dopo (recap, vedi H5)              | begin-planning / `public`/agg         |
| `revealed_intents` (telepatico)        | foresight opzionale (overlay planning, non l'apertura) | begin-planning / `public`             |
| context sistema (pressure/decisions)   | flavor/commentary (Custode, dottrina, pressione)       | session/begin-planning / `public`/agg |

Il director NON accede a: preview/draft non committati, intent pre-reveal, readiness
per-player, signal comportamentali. Se gli arrivassero, sarebbe un leak SPEC-B (sez. 7).

## 5. Contratto output (cosa produce D)

| Output                 | Derivazione                                                                  |
| ---------------------- | ---------------------------------------------------------------------------- |
| **camera beats**       | sequenza di inquadrature: chi/dove seguire per ogni entry della queue        |
| **animation beats**    | animazioni per azione/reazione/status (attacco, parry, KO, mutazione)        |
| **callout UI**         | evidenze: crit, combo (focus_fire/synergy), reazione, kill, status applicato |
| **battle feed**        | feed sintetico testuale che accompagna (non sostituisce) la scena            |
| **end-of-round recap** | sintesi: MVP/momenti chiave/conseguenze + telegraph round dopo (H5)          |

- Ogni beat e' tracciabile a una entry canonica (queue/turn_log/reaction): nessun beat
  "inventato" senza fonte nell'event-log.
- I callout combo/synergy derivano dai flag nel turn_log (focus_fire, synergy,
  bond_reaction, + `pp_gained` per il combo meter) prodotti dal resolver -- D li mostra,
  non li ricalcola. NOTA: questi flag sono presenti col path di resolve unificato
  (`/commit-round` auto_resolve); il path placeholder (`/resolve-round`) non li popola.
  Fallback callout = `roll.is_crit`/`pp_gained` (sempre nel roll_result canonico).

## 6. Invariante no-alter + determinismo

- **Invariante no-alter (P1):** il director e' read-only sull'esito. NON modifica
  hp/danno/kill/status/log/ordine-causale. Se l'animazione e l'event-log divergono, vince
  SEMPRE l'event-log (la regia e' cosmetica).
- **Determinismo:** dato lo stesso event-log, il director produce lo stesso piano-sequenza
  (a meno di varianti puramente cosmetiche). Cosi' una regia **local-only** su due
  schermi converge sull'identica lettura dell'esito (point 8).
- **Ordine causale preservato:** D puo' raggruppare/parallelizzare beats per ritmo (vedi
  H2), ma una reazione va sempre dopo il suo trigger e un KO dopo il colpo che lo causa.
- **Correlazione reazioni:** per posizionare ogni `reactions_triggered` D usa il suo
  `attacker_unit_id` (gia' nel campo) per agganciarla all'entry-trigger della
  `resolution_queue`. Gli overlay numerici (hp/danno) si leggono SOLO dal log
  (`turn_log.damage_applied`, `units[].hp`): il director non tiene variabili-stato proprie.

## 7. Visibilita' + leak-migration (eredita SPEC-B)

- Il director e' surface TV: consuma e mostra SOLO `public`/`aggregated`. Conferma
  l'enforcement SPEC-B: gli intent che mostra sono `player_actions`/`ia_actions` (azioni
  gia' committate, `public` post-reveal), mai i draft/preview `private` di SPEC-C.

| Surface / file                     | Leak/gap                                         | Target                              | Cross-ref          |
| ---------------------------------- | ------------------------------------------------ | ----------------------------------- | ------------------ |
| `battle_feed.gd` / adapter (Godot) | feed = backend-log grezzo, non piano-sequenza    | director con camera/animation beats | reconstruction F11 |
| Round render TV (oggi `partial`)   | rischio mostrare stato non-`public` o pre-reveal | solo event-log post-commit          | SPEC-B, SPEC-K     |
| Regia che "diverge" dall'event-log | animazione che implica un esito diverso dal log  | event-log = verita' (no-alter)      | ADR pt5 / punto 8  |

## 8. Relazione con altre spec

- **SPEC-C** (WEGO composer): produce il commit -> il resolve -> l'event-log che D rende.
  Le azioni committate (`player_actions`/`ia_actions` dell'output resolve) = l'apertura
  WEGO del piano-sequenza di D (NON il campo `revealed_intents`, che e' foresight
  telepatica del begin-planning, sez. 2).
- **SPEC-B** (info contract): D consuma SOLO `public`/`aggregated`; e' la prova vivente
  dell'enforcement TV-mirror (sez. 7).
- **SPEC-A** (ledger): i signal `secret` NON entrano nel director; restano negli engine.
- **SPEC-K** (device-authority): D e' una surface `TV_MIRROR`; non committa nulla.
- **SPEC-G** (Tri-Sorgente) / ERMES / ALIENA: forniscono il context narrativo `public`
  che D puo' intrecciare (Custode commentary, dottrina, pressione).
- **SPEC-E** (Nido): il recap di fine-round alimenta la transizione verso debrief/Nido.

## 9. Decisioni aperte (per Eduardo)

Fork non canon-derivabili. **RATIFICATI da Eduardo 2026-06-08** (tutti opzione A).

| Fork | Esito ratificato (2026-06-08)                                                   |
| ---- | ------------------------------------------------------------------------------- |
| H1   | Salience-ranked camera (kill > reazione/combo > crit > normale > move)          |
| H2   | Parallelismo cosmetico, ordine causale preservato (focus_fire in sequenza)      |
| H3   | Deterministica-locale (stesso event-log -> stessi beat, niente protocollo sync) |
| H4   | Battle feed: highlights + numeri opzionali                                      |
| H5   | Telegraph pubblico del round successivo (Into the Breach), guard SIS-only       |

### H1 -- Policy di selezione dei camera beat

Cosa determina la priorita'/il focus della camera tra le entry della queue?

- **Opzione A -- salience-ranked (raccomandata).** Priorita': kill > reazione/combo > big
  damage/crit > azione normale > move. Tradeoff: drammaturgia leggibile, ma serve una
  euristica di "salience" da tarare.
- **Opzione B -- strict queue order.** La camera segue l'ordine di risoluzione 1:1.
  Tradeoff: fedele e semplice, ma puo' essere piatto (apre con una mossa banale).
- **Opzione C -- narrative-weighted.** Pesa anche context (ERMES/ALIENA/Custode) e
  storia del branco. Tradeoff: piu' cinematografico, ma piu' stato e rischio di "regia
  che pensa troppo".
- **Raccomandazione:** A (B come fallback se la salience non e' disponibile). **RATIFICATO 2026-06-08: A.**

### H2 -- Riordino/parallelismo dei beat per ritmo

Il director puo' raggruppare o mostrare in parallelo beat per ritmo, o deve essere
strettamente sequenziale?

- **Opzione A -- parallelismo cosmetico con ordine causale preservato (raccomandata).**
  Due commit indipendenti possono essere mostrati vicini/paralleli; ma reazione-dopo-
  trigger e KO-dopo-colpo restano garantiti. Tradeoff: ritmo migliore senza rompere la
  causalita'; costo = logica di raggruppamento.
- **Opzione B -- strettamente sequenziale.** Un beat alla volta in ordine di queue.
  Tradeoff: semplice e inequivocabile, ma lento su round affollati.
- **Raccomandazione:** A. Vincolo: il parallelismo cosmetico e' ammesso SOLO tra azioni
  senza dipendenza causale (nessuna e' trigger/reazione dell'altra, nessuna modifica il
  target dell'altra prima del suo roll -- es. il focus_fire va mostrato in sequenza).
  **RATIFICATO 2026-06-08: A.**

### H3 -- Sincronizzazione cross-schermo

Il punto 8 dice che la regia puo' essere local-only. Con piu' schermi (TV + observer),
la cinematica e' identica e sincronizzata, deterministica-locale, o libera?

- **Opzione A -- deterministica-locale (raccomandata).** Stesso event-log -> stessi beat;
  ogni schermo rende in autonomia ma converge sull'esito; varianti solo cosmetiche.
  Tradeoff: niente protocollo di sync, ma timing leggermente diverso tra schermi.
- **Opzione B -- broadcast sincronizzato.** Il backend/host scandisce i beat per tutti.
  Tradeoff: identico ovunque, ma serve un canale di regia e tolleranza alle latenze.
- **Raccomandazione:** A (B solo se il sync diventa requisito di spettacolo/stream). **RATIFICATO 2026-06-08: A.**

### H4 -- Verbosita' e numeri nel battle feed

Il feed sintetico mostra ogni azione o solo highlights? Con numeri (danni) o narrativo?

- **Opzione A -- highlights + numeri opzionali (raccomandata).** Feed curato (momenti
  chiave) con i numeri di danno mostrabili (sono `public`). Tradeoff: leggibile + onesto;
  un dettaglio completo resta accessibile a richiesta.
- **Opzione B -- log completo per-azione.** Ogni entry nel feed. Tradeoff: completo ma e'
  "backend-log mostrato" (cio' che Fase 11 vuole evitare).
- **Opzione C -- solo narrativo (niente numeri).** Tradeoff: cinematografico, ma nasconde
  informazione `public` utile a capire il round.
- **Raccomandazione:** A. **RATIFICATO 2026-06-08: A.**

### H5 -- Telegraph del round successivo (threat_preview) nel recap

`threat_preview` arriva dalla risposta `/begin-planning` del round successivo (SIS
intents normalizzati, `buildThreatPreview`), non dall'output del resolve corrente: il
recap lo riceve al confine resolve->planning. Il recap mostra il telegraph delle minacce
del round dopo (stile Into the Breach) o no?

- **Opzione A -- telegraph pubblico (raccomandata).** Il recap mostra le minacce note del
  round successivo: il tavolo pianifica informato (clarity-first, come Into the Breach).
  Tradeoff: meno "sorpresa", ma piu' tattica e cooperazione; coerente con device che
  pianificano (SPEC-C). Guard: mostrare SOLO se `threat_preview` contiene SIS intents
  gia' `public` (oggi e' cosi'); se includesse foresight per-player va ri-filtrato (SPEC-B).
- **Opzione B -- niente telegraph.** Solo recap del round appena risolto. Tradeoff: piu'
  tensione/incertezza, ma il planning device dopo e' piu' alla cieca.
- **Raccomandazione:** A (telegraph = abilitatore del WEGO informato). **RATIFICATO 2026-06-08: A.**

## 10. Acceptance

SPEC-D e' implementabile/chiudibile quando:

1. il director consuma SOLO gli output canonici (sez. 4: resolve + begin-planning) e
   nessun input `private`/`secret` -- contract-test sulla firma di input: riceve solo
   {resolution_queue, turn_log_entries, reactions_triggered, skipped, player_actions,
   ia_actions, threat_preview, statuses/units}; mai `pending_intents` pre-commit, draft,
   readiness per-player o signal;
2. produce i 5 output (sez. 5: camera beats, animation beats, callout, battle feed,
   recap), ognuno tracciabile a una entry canonica (queue/turn_log/reaction);
3. **no-alter**: un test verifica che l'esito post-regia == event-log canonico
   (hp/danno/kill/status/ordine causale invariati); il director non ha variabili-stato
   proprie: gli overlay numerici leggono `turn_log.damage_applied` e `units[].hp` dal log;
4. **determinismo**: stesso event-log -> stesso piano-sequenza (varianti solo cosmetiche),
   cosi' una regia local-only converge su piu' schermi;
5. l'ordine causale e' preservato (reazione dopo trigger, KO dopo colpo) anche con
   parallelismo cosmetico (H2);
6. le Decisioni aperte H1-H5 sono ratificate da Eduardo (FATTO 2026-06-08, tutte A,
   sez. 9); resta a Eduardo il flip `review_needed` -> `accepted` al merge;
7. coerenza con SPEC-C (le azioni committate `player_actions`/`ia_actions` sono l'input
   d'apertura), SPEC-B (solo public/aggregato), SPEC-K (surface TV_MIRROR, non committa),
   SPEC-A (signal esclusi).
