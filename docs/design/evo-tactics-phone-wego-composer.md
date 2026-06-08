---
title: 'Evo-Tactics Phone WEGO Combat Composer (SPEC-C)'
date: 2026-06-08
type: design-spec
doc_status: review_needed
doc_owner: master-dd
workstream: flow
last_verified: '2026-06-08'
source_of_truth: false
review_cycle_days: 30
language: it
tags: [evo-tactics, wego, combat, planning, commit, phone, device-authority, composer]
related: ADR-2026-06-07-device-authority-tv-mirror-canon
---

# Evo-Tactics Phone WEGO Combat Composer (SPEC-C)

Contratto Wave-1 #3 della roadmap (`docs/planning/2026-06-05-evo-tactics-open-points-resolution-roadmap.md`).
Sostituisce la mentalita' "your turn / current actor" con un **planning WEGO sul
device**: ogni player compone simultaneamente gli intent della propria creatura
attiva (+ entita' temporaneamente controllate) entro il budget AP, ne vede una
preview NON canonica, poi committa. Il backend risolve in ordine di priorita'.

## 1. Scopo e non-scopo

**Scopo.** Definire il contratto del **composer device-side**: stati UX
(planning/ready/locked/waiting), preview non canonica, multi-intent entro AP,
undo/clear, timeout/fallback, differenza suggerire-vs-committare, e la forma del
**commit per-player** inviato al backend.

**Non-scopo (esplicito).**

- SPEC-C NON reimplementa il round model: `roundOrchestrator.js` (fasi
  planning -> committed -> resolving -> resolved) e' **LIVE** e resta owner della
  risoluzione, della priorita' e del determinismo. SPEC-C lo ALIMENTA via gli
  endpoint esistenti.
- SPEC-C NON definisce la resa TV del round (piano-sequenza): quello e' SPEC-D. Il
  composer finisce al commit; da li' in poi e' event-log -> SPEC-D.
- SPEC-C NON ridefinisce la tassonomia di visibilita': la **eredita** da SPEC-B
  (sez. 3.5/3.6) e da SPEC-A (signal). Qui la si applica al combat.
- SPEC-C NON decide la matematica di danno/priorita' (combat.schema + resolver +
  `DEFAULT_ACTION_SPEED` restano canonici).

Complementarieta':

```text
SPEC-C = device compone l'intent SET (planning -> commit)   <-- questo documento
roundOrchestrator (LIVE) = risolve l'intent SET (committed -> resolved)
SPEC-D = TV trasforma la resolution_queue in piano-sequenza
```

## 2. Baseline LIVE (verificato 2026-06-08, non ricostruire)

`apps/backend/services/roundOrchestrator.js` (canonical, ex-Python ADR-2026-04-19):

| Funzione               | Ruolo                                                                                                                      |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `beginRound`           | refresh AP+reazioni a max, decay status, bleeding tick, fase -> `planning`                                                 |
| `declareIntent`        | **APPEND** un main intent in `pending_intents` (multi-intent, W8k spec)                                                    |
| `clearIntent`          | rimuove TUTTI gli intent (main + reaction) di una unit                                                                     |
| `declareReaction`      | registra reaction intent (event + payload + predicates + cooldown)                                                         |
| `commitRound`          | `planning` -> `committed` (lock)                                                                                           |
| `buildResolutionQueue` | ordina: priority desc, unit_id asc, intent_index asc (multi-intent stabile)                                                |
| `resolveRound`         | risolve committed -> `resolved`, emette `turnLogEntries` + `resolutionQueue`                                               |
| `previewRound`         | deep-copy + auto-commit + resolve, **NESSUN AP/HP/roll/log consumato**                                                     |
| `shouldAutoAdvance`    | helper PURO, NON wired nel bridge (commit esplicito): suggerisce l'avanzo se tutte le unit vive non-minion hanno un intent |

Fasi canoniche: `planning` / `committed` / `resolving` / `resolved`.
`pending_intents` shape: main `{unit_id, action}`, reaction `{unit_id,
reaction_trigger, reaction_payload}`. `action` = `combat.schema.json#/$defs/action`,
REQUIRED `id`/`type`/`actor_id`/`ap_cost`; opzionali `target_id`, `ability_id`,
`channel`, `damage_dice`, `pt_spend`, `parry_response` (`type` =
attack/defend/parry/ability/move). Nota shape: lo state del round usa hp/ap come
`{current,max}` (adapter `adaptSessionToRoundState`); `session.units` usa hp/ap flat.

Endpoint bridge `apps/backend/routes/sessionRoundBridge.js`:
`/round/begin-planning` (body `session_id`), `/declare-intent` (body `session_id`,
`actor_id`, `action`), `/clear-intent/:actorId`, `/undo-action`, `/commit-round`
(body `session_id`, `auto_resolve`), `/resolve-round`. NOTA: il commit e' GLOBALE (un
solo `/commit-round` per round, non per-player). NON esistono `/declare-reaction` ne'
`/preview-round` nel bridge (vedi 4.2, 4.9). `shouldAutoAdvance` e' helper puro non
wired: il commit del round e' esplicito.

Invarianti ereditate:

- **ADR-2026-06-07 punto 5:** planning device -> preview non canonica -> commit
  device -> Sistema/AI commit -> event-log deterministico -> piano-sequenza TV.
- **SPEC-B 3.5/3.6:** la preview e l'intent in composizione sono `private`; l'intent
  e' `private` fino al reveal simultaneo; la readiness e' `aggregated` (solo N/M, mai
  per-player); i signal di timing sono `secret`.
- **SPEC-K 7.4:** la TV non e' UI di planning; mostra solo tensione/readiness/recap.

Gap noto (reconstruction Fase 9): il combat Godot attuale e' ancora "current actor /
your turn" (`scripts/phone/phone_combat_view.gd`, `scripts/session/
round_orchestrator.gd`); va riallineato a WEGO. SPEC-C e' il contratto target.

## 3. Modello composer

Il composer e' la macchina-a-stati device-side che produce un commit valido per il
round model. Mappa 1:1 sulle fasi backend ma aggiunge stati UX locali.

```text
begin-planning -> [PLANNING] -> compose N intent (declare/undo, preview)
   -> [READY] (player ha finito, ancora modificabile? vedi G3)
   -> commit-round -> [LOCKED] -> attesa altri -> [WAITING]
   -> (tutti committed | timeout) -> backend resolve -> nuova [PLANNING]
```

## 4. Contratto per-capability

### 4.1 Creatura attiva + controlli extra

- Ogni player controlla **1 creatura principale attiva** per round (reconstruction
  sez. 7 punto 6), salvo **controlli extra temporanei**: companion, evocazioni,
  simbionti, possessioni o regole speciali (Fase 9/10).
- Il composer mostra la creatura attiva + ogni entita' temporaneamente controllata
  in quel round, ciascuna col proprio budget AP/reazioni.
- Le unit non controllate dal player (`controlled_by !== 'player'`, AI/Sistema,
  minion `is_minion`) NON sono componibili dal player: i minion sono comandati, non
  pianificati. Il backend valida l'eleggibilita' per-intent via `validatePlayerIntent`;
  non c'e' auto-advance live (il commit del round e' esplicito).

### 4.2 Preview NON canonica

- RATIFICATO (G5, 2026-06-08): la preview e' una **stima client-side** (v1, niente
  endpoint; porta aperta a `/preview-round` in v2). La FUNZIONE server `previewRound`
  (deep-copy, NESSUN AP/HP/roll/log consumato) resta il riferimento di determinismo, ma
  NON e' chiamata dal device in v1.
- RATIFICATO (G4, 2026-06-08): resa come **ghost-preview adattiva** sul device
  (proiezione translucida dell'effetto, stile Into the Breach) che mostra hit-chance +
  range; mai un tiro singolo, mai l'rng del round (no seed-leak).
- La preview e' `private` (solo il device owner) e NON e' canonica: non e' l'esito
  reale, e non va mai in TV (SPEC-B 3.5, leak-migration sez. 7).

### 4.3 Multi-intent entro AP

- Una creatura puo' avere **N main intent per round** (`declareIntent` APPEND, W8k),
  fino a esaurimento AP: somma degli `action.ap_cost` <= `unit.ap.current`.
- Il composer valida l'AP **lato device** prima di inviare (UX immediata) ma il
  backend resta autoritativo: `validatePlayerIntent` somma i `pending_intents`
  dell'attore + il nuovo e rifiuta se supera `ap_remaining` (codice `AP_INSUFFICIENT`).
- L'ordine di risoluzione NON e' l'ordine di dichiarazione tra unit diverse: e'
  priority (`initiative + action_speed - penalty`, `DEFAULT_ACTION_SPEED`). Entro la
  STESSA unit conta l'`intent_index` (ordine di dichiarazione). Il composer puo'
  mostrare l'ordine atteso ma non lo controlla cross-unit.
- Le reazioni (`declareReaction`, economia `reactions` separata dagli AP) sono intent
  condizionali. ATTENZIONE: `declareReaction` esiste nell'orchestrator ma NON e'
  esposta dal bridge (manca `/declare-reaction`): il wiring delle reazioni e' un gap
  aperto (vedi 4.9 + acceptance).

### 4.4 Undo / clear

- `clearIntent(unitId)` (endpoint `/clear-intent/:actorId`) rimuove TUTTI gli intent di
  una unit. Costo zero (nessuna risorsa consumata, Fase 9 "undo/clear non consuma
  risorse"). C'e' anche `/undo-action` (bridge) per annullare l'ultima azione.
- Granularita' undo per-intent vs clear-all = **fork G1**: se l'undo per-intent passa
  per clear+replay, il composer DEVE tenere un ledger AP locale e ri-validare ogni
  re-declare (un replay puo' fallire se l'AP non torna). Vedi sez. 8.

### 4.5 Stati composer: planning / ready / locked / waiting

Il backend ha solo fasi GLOBALI (`planning` -> `committed` via un singolo
`/commit-round`); non esiste un commit per-player. Quindi "ready/locked/waiting" sono
uno strato UX device-side SOPRA la fase globale.

| Stato      | Significato (device-UX)                       | Fase backend         | Visibilita' (SPEC-B)             |
| ---------- | --------------------------------------------- | -------------------- | -------------------------------- |
| `planning` | sta componendo, modificabile                  | `planning` (globale) | privato; TV vede solo "in corso" |
| `ready`    | ha finito, segnala pronto (ancora revisabile) | `planning` (globale) | privato; TV solo conteggio N/M   |
| `locked`   | round globalmente committato                  | `committed`          | intent -> reveal; N/M aggregato  |
| `waiting`  | committato, attende resolve                   | `committed`          | aggregato N/M                    |

- Il commit e' globale: un player puo' revisionare/clear-are i propri intent fino al
  `/commit-round` (soft per natura; chi lo triggera = G3 + 4.6).
- La TV mostra SOLO il conteggio aggregato (N/M che hanno dichiarato), MAI chi e' in
  quale stato (SPEC-B 3.6: "chi sta ancora pianificando" = timing-tell `private`). Il
  conteggio dovrebbe essere MONOTONO (vedi G3) per non leakare un de-commit.
- **Opt-in self-disclosure (SPEC-B, ratificato 2026-06-08):** un player PUO' rivelare
  il proprio stato/commit prima del reveal; default = `private`.

### 4.6 Timeout / fallback

- Il `/commit-round` globale e' triggerato quando tutti hanno dichiarato o dall'host
  tecnico/timer (atto tecnico, non scelta TV; SPEC-K). Il timer e' server-authoritative
  (start noto a tutti i device); il countdown e' `aggregated` in TV (SPEC-B 3.4/3.6).
- Chi non committa entro il timeout riceve una **fallback policy** per la propria
  creatura. RATIFICATO (G2, 2026-06-08): **AI-suggested auto-commit** (il Sistema
  propone e committa), trasparente nel recap e sovrascrivibile dal player nel round
  successivo (safeguard agency).
- Il loop non si blocca mai per un device lento/disconnesso: il backend e'
  autoritativo e applica la fallback (graceful degrade, SPEC-A sez. 8).

### 4.7 Suggerire vs committare

- **Suggerire** = preview/draft: locale, `private`, non canonico, reversibile a costo
  zero (stima client-side finche' la preview non e' esposta server-side, vedi G5). E'
  esplorazione (alimenta il signal `preview_dwell`, SPEC-A).
- **Committare** = `commit-round`: lock dell'intent SET, autoritativo, entra nel reveal
  simultaneo. E' il promotion gate `private` -> `public` (al reveal).
- Il composer DEVE rendere visibile la differenza (es. "Anteprima" vs "Conferma") per
  non indurre commit accidentali. La de-commit prima del reveal globale = **fork G3**.

### 4.8 Commit: sequenza wire (NON un body monolitico)

Il commit del round e' una SEQUENZA di chiamate, NON un singolo payload con
`intents[]`. Vista logica aggregata pre-commit (per chiarezza, NON e' il body di
`/commit-round`):

```json
{
  "session_id": "<slug>",
  "turn": 7,
  "player_id": "<slug>",
  "intents": [
    {
      "unit_id": "<creatura-attiva>",
      "action": {
        "id": "<action-slug>",
        "type": "attack",
        "actor_id": "<creatura-attiva>",
        "target_id": "<bersaglio>",
        "ap_cost": 2,
        "channel": "fisico",
        "damage_dice": { "count": 1, "sides": 8, "modifier": 3 }
      }
    },
    {
      "unit_id": "<creatura-attiva>",
      "action": {
        "id": "<slug>",
        "type": "ability",
        "actor_id": "<creatura-attiva>",
        "ability_id": "<ability>",
        "ap_cost": 1
      }
    },
    {
      "unit_id": "<companion-controllato>",
      "action": {
        "id": "<slug>",
        "type": "move",
        "actor_id": "<companion>",
        "ap_cost": 1,
        "move_to": { "x": 2, "y": 3 }
      }
    }
  ]
}
```

Ogni `action` richiede `id`/`type`/`actor_id`/`ap_cost` (combat.schema). Sequenza wire
reale:

```text
POST /round/begin-planning   { session_id }
POST /declare-intent         { session_id, actor_id, action }   x N (una per intent)
POST /clear-intent/:actorId  { session_id }                     (azzera una unit)
POST /undo-action            { session_id, ... }                (annulla ultima)
POST /commit-round           { session_id, auto_resolve }       (GLOBALE, 1 sola volta)
```

- AI/Sistema committa via la propria pipeline (`declareSistemaIntents`) nello stesso
  round, prima del resolve.
- Le REAZIONI non hanno endpoint (no `/declare-reaction`): il payload sopra NON include
  `reactions[]` finche' non wired (4.9).
- Il backend e' autoritativo: rifiuta over-AP (`validatePlayerIntent`), unit non
  eleggibili, fase errata (`declareIntent` richiede `planning`), `id` mancante.

### 4.9 Reazioni condizionali

- Una creatura puo' dichiarare una reazione (parry/counter/overwatch/trigger_status)
  con trigger (event + predicates DSL + cooldown), economia `reactions` separata dagli
  AP. Si dichiarano in planning (`declareReaction` richiede fase `planning`).
- UX dedicata: mostrare il trigger in chiaro (es. "parry se attaccato"), il cooldown
  rimanente, distinguerla dall'azione offensiva.
- GAP wire: `declareReaction` esiste nell'orchestrator ma il bridge non la espone
  (manca `/declare-reaction`). Finche' non wired, la reazione composer-side e' design,
  non implementabile end-to-end (acceptance sez. 9).

## 5. Visibilita' (eredita SPEC-B)

| Dato del composer                              | Tier (SPEC-B)         |
| ---------------------------------------------- | --------------------- |
| creatura attiva + controlli, AP, preview       | `private` (owner)     |
| intent in composizione / committato            | `private` fino reveal |
| stato planning/ready/locked per-player         | `private`             |
| conteggio N/M dichiarati (monotono), countdown | `aggregated` (TV)     |
| intent rivelati dopo commit simultaneo         | `public` (-> SPEC-D)  |
| risultato round (event-log)                    | `public`              |
| commit_latency / hesitation / preview_dwell    | `secret` (SPEC-A)     |

Invariante WEGO (SPEC-B 3.6, P1): nessun early-peek. Ne' il contenuto dell'intent ne'
"chi e' pronto" per-player raggiungono la TV prima del reveal simultaneo. Solo gli
aggregati N/M. Opt-in self-disclosure = unica eccezione, player-initiated.

## 6. Signal emessi (alimenta SPEC-A)

Il composer e' l'**emettitore** dei signal di planning (SPEC-A sez. 6); la derivazione
resta deterministica e il peso resta engine-owned:

- `commit_latency`: tempo da begin-planning a commit.
- `hesitation_score`: numero di undo/clear + cambi di intent pre-commit.
- `preview_dwell`: tempo trascorso in preview/draft.

Raw effimero sul device (SPEC-A sez. 7): solo i signal derivati + il commit (decision
event) vanno sul wire. Mai il raw.

## 7. Leak-migration (cross-ref SPEC-B sez. 4 + SPEC-K)

| Surface / file                  | Leak/gap                                                | Target                                  | Cross-ref              |
| ------------------------------- | ------------------------------------------------------- | --------------------------------------- | ---------------------- |
| `phone_combat_view.gd` (Godot)  | ancora "current actor / your turn", non WEGO            | composer multi-intent simultaneo        | reconstruction F9      |
| TV durante planning             | rischio mostrare preview/intent/readiness per-player    | solo aggregati N/M + tensione           | SPEC-B 3.5/3.6, SPEC-D |
| `round_orchestrator.gd` (Godot) | duplicazione/deriva vs `roundOrchestrator.js` canonical | client consuma il backend, non riscrive | reconstruction F9      |

## 8. Decisioni aperte (per Eduardo)

Fork non canon-derivabili. **RATIFICATI da Eduardo 2026-06-08** (note per-capability
sez. 4 aggiornate di conseguenza).

| Fork | Esito ratificato (2026-06-08)                                                           |
| ---- | --------------------------------------------------------------------------------------- |
| G1   | Undo per-intent (clear+replay con ledger AP locale)                                     |
| G2   | AI-suggested auto-commit al timeout (+ safeguard: trasparente, override nel round dopo) |
| G3   | Ready locale + contatore N/M monotono (no timing-tell)                                  |
| G4   | Atteso + range, reso come ghost-preview adattiva sul device (stile Into the Breach)     |
| G5   | Stima client-side v1 (porta aperta a `/preview-round` server in v2)                     |

Sotto: opzioni/rationale originali (storia della decisione).

### G1 -- Granularita' undo: per-intent o clear-all?

Il backend offre solo `clearIntent` (azzera tutti gli intent della unit). Il composer
deve offrire "annulla ultima azione" o solo "azzera tutto"?

- **Opzione A -- undo per-intent lato composer (raccomandata).** Il composer tiene uno
  stack locale e per "annulla ultima" fa clear-all + replay dei restanti. Tradeoff:
  miglior UX multi-intent; costo = logica di replay device-side.
- **Opzione B -- solo clear-all.** Mappa 1:1 sul backend. Tradeoff: semplice, ma UX
  povera (perdi tutto per correggere un'azione).
- **Raccomandazione:** A. **RATIFICATO 2026-06-08: A** (per-intent via clear+replay).

### G2 -- Fallback policy al timeout

Cosa fa la creatura di chi non committa entro il timer?

- **Opzione A -- hold/defend (raccomandata).** Azione difensiva sicura e prevedibile.
  Tradeoff: nessuna sorpresa, ma "spreca" il round del player assente.
- **Opzione B -- ripeti ultimo intent valido.** Continuita'. Tradeoff: puo' essere
  pericoloso (target morto, contesto cambiato).
- **Opzione C -- AI-suggested auto-commit.** Il Sistema propone e auto-committa.
  Tradeoff: round utile, ma toglie agency e puo' sorprendere.
- **Raccomandazione:** A di default; C come opzione di tavolo (toggle).
- **RATIFICATO 2026-06-08: C** (AI-suggested auto-commit). Safeguard agency: la mossa
  AI-suggested deve essere trasparente (segnalata come tale nel recap) e il player la
  puo' sovrascrivere nel round successivo; mai una scelta irreversibile.

### G3 -- Readiness per-player e timing-tell (commit globale)

Il commit backend e' GLOBALE (un solo `/commit-round`): finche' non scatta, un player
puo' gia' revisionare/clear-are i propri intent (soft per natura). Il nodo reale e' se
il composer espone un "ready" per-player e come la TV lo aggrega senza leak.

- **Opzione A -- ready locale + conteggio monotono (raccomandata).** Il "ready" e'
  device-locale; la TV vede un conteggio N/M che NON decresce (un de-commit non fa
  scendere il contatore visibile). Tradeoff: niente timing-tell (SPEC-B 3.6, P1); il
  conteggio e' un'approssimazione "almeno N hanno dichiarato".
- **Opzione B -- ready autoritativo per-player.** Servirebbe un nuovo endpoint
  `ready`/`uncommit` per-player (oggi assente): alto blast-radius sul round model, e il
  decremento del contatore resta un timing-tell da mascherare.
- **Raccomandazione:** A (evita un redesign del commit globale e chiude il leak).
- **RATIFICATO 2026-06-08: A** (ready locale + contatore monotono).

### G4 -- Fedelta' della preview non canonica

La preview mostra "effetto probabile" (Fase 9). `previewRound` usa l'rng: una preview
con un sample reale rivelerebbe il roll e rischierebbe desync col risultato vero.

- **Opzione A -- aspettato + range (raccomandata).** Mostra hit-chance + range di danno
  (min-max / atteso), NON un tiro singolo. Tradeoff: onesto, niente "la preview ha
  mentito", niente leak del seed; costo = calcolo probabilistico lato composer.
- **Opzione B -- sample singolo deterministico.** Un tiro mostrato. Tradeoff: concreto
  ma ingannevole (un sample != esito) e accoppia il client all'rng.
- **Opzione C -- distribuzione completa.** Istogramma esiti. Tradeoff: massima
  informazione, ma UI pesante e troppo "risolto".
- **Raccomandazione:** A.
- **RATIFICATO 2026-06-08: A**, reso come **ghost-preview adattiva** sul device
  (proiezione translucida dell'effetto/mossa, stile Into the Breach), aggiornata mentre
  il player compone. Mai un tiro singolo; mai l'rng del round.

### G5 -- Dove gira la preview (delivery)

`previewRound` e' una funzione server (deps `resolveAction`/`catalog`/`rng`) e il bridge
NON la espone (manca `/preview-round`). Come fa il composer a fare la preview?

- **Opzione A -- stima client-side (raccomandata).** Il composer calcola hit-chance +
  range localmente dai dati dell'unit/azione (coerente con G4=A). Tradeoff: zero round-
  trip e zero rischio seed-leak; costo = duplicare la formula danno lato client (drift
  da tenere allineato al resolver).
- **Opzione B -- nuovo endpoint `/preview-round`.** Wrappa `previewRound` server.
  Tradeoff: una sola fonte di verita' per la stima, ma round-trip per ogni preview e
  rischio di accoppiare la preview all'rng del round (mitigare con rng separato, G4).
- **Raccomandazione:** A per la v1 (semplice, niente backend nuovo); B se la formula
  client diverge troppo dal resolver.
- **RATIFICATO 2026-06-08: A** (stima client-side v1; porta aperta a `/preview-round`
  server in v2 se la formula client driftta). Alimenta la ghost-preview di G4.

## 9. Acceptance

SPEC-C e' implementabile/chiudibile quando:

1. il composer copre le 9 capability (sez. 4): creatura attiva + controlli extra (4.1),
   preview non canonica (4.2), multi-intent entro AP (4.3), undo/clear (4.4), stati
   planning/ready/locked/waiting (4.5), timeout/fallback (4.6), suggerire-vs-committare
   (4.7), commit wire (4.8), reazioni condizionali (4.9);
2. il composer usa gli endpoint LIVE (`/round/begin-planning`, `/declare-intent`,
   `/clear-intent/:actorId`, `/undo-action`, `/commit-round`) come SEQUENZA (non un body
   monolitico) e NON reimplementa il round model;
3. la preview non consuma risorse e resta `private`; ratificata come ghost-preview
   client-side (G4+G5: atteso+range, mai l'rng del round);
4. la visibilita' rispetta SPEC-B: preview/intent/stato per-player `private`, solo il
   conteggio MONOTONO N/M + countdown in TV, intent `public` solo dopo il reveal
   simultaneo, signal `secret`; contract-test che la TV non riceve readiness per-player
   ne' un de-commit (decremento del contatore) durante planning;
5. il timeout applica una fallback autoritativa server-side (loop mai bloccato da
   device lento/disconnesso);
6. i signal `commit_latency`/`hesitation_score`/`preview_dwell` sono emessi (SPEC-A) e
   il raw resta sul device;
7. GAP da chiudere prima dell'implementazione end-to-end: wiring reazioni
   (`/declare-reaction` assente, 4.9) e delivery della preview (G5);
8. le Decisioni aperte G1-G5 sono ratificate da Eduardo (FATTO 2026-06-08, sez. 8) e le
   note sez. 4 aggiornate; resta a Eduardo il flip `review_needed` -> `accepted` al merge;
9. coerenza con SPEC-A (signal), SPEC-B (visibilita'), SPEC-D (il commit produce
   l'event-log che SPEC-D rende), SPEC-K (authority device, TV non-planning).
