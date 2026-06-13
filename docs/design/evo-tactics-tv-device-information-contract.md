---
title: 'Evo-Tactics TV/Device Information Contract (SPEC-B)'
date: 2026-06-08
type: design-spec
doc_status: review_needed
doc_owner: master-dd
workstream: flow
last_verified: '2026-06-08'
source_of_truth: false
language: it
review_cycle_days: 30
tags:
  [
    evo-tactics,
    tv-mirror,
    device-authority,
    information-contract,
    visibility,
    privacy,
    public-private,
    coop,
    flow,
  ]
related: ADR-2026-06-07-device-authority-tv-mirror-canon
---

# Evo-Tactics TV/Device Information Contract (SPEC-B)

Contratto Wave-1 #2 della roadmap (`docs/planning/2026-06-05-evo-tactics-open-points-resolution-roadmap.md`).
Risponde al punto di principio rimasto aperto nella ricostruzione del flusso
(`...-tv-device-campaign-flow-reconstruction.md`, sez. 7 punto 7 "Device private info"):

> "La TV mostra intersezione/recap pubblico. I device possono filtrare per sensi,
> cognizione, relazioni, ruolo e creatura. Resta da specificare il contratto esatto
> dei campi pubblici/privati."

SPEC-B specifica quel contratto, per ogni surface di gioco.

## 1. Scopo e non-scopo

**Scopo.** Definire, per ogni surface, QUALE dato e' `public` (la TV lo mostra a
tutti), `private` (solo il device del player owner), `aggregated` (la TV lo mostra
solo come aggregato di gruppo, mai per-player) o `secret` (solo Sistema/engine, mai
mostrato a umani). Output: una matrice di visibilita' per-surface + le regole di
enforcement del canale TV-mirror.

**Non-scopo (esplicito).**

- SPEC-B NON ridefinisce la tassonomia tier: la **eredita** da SPEC-A
  (`docs/design/evo-tactics-device-input-ledger.md` sez. 5). Qui la si APPLICA, non
  la si reinventa.
- SPEC-B NON decide CHI guida una surface (device vs host-technical vs TV-mirror):
  quello e' SPEC-K (`...-godot-device-authority-reconciliation.md` sez. 4). SPEC-B e'
  l'asse ORTOGONALE: a parita' di surface, K dice "chi comanda", B dice "chi vede cosa".
- SPEC-B NON costruisce l'enforcement: il meccanismo e' il `tierFilter` del
  `deviceInputLedger` gia' previsto in SPEC-A. B definisce il contratto che quel
  filtro deve rispettare.
- SPEC-B NON ridefinisce la matematica di scoring (resta engine-owned, vedi SPEC-A
  non-scopo).

Complementarieta' in una riga:

```text
SPEC-A = tassonomia + tierFilter (il MECCANISMO)
SPEC-K = authority per-surface     (CHI guida)
SPEC-B = visibilita' per-surface   (CHI vede COSA)   <-- questo documento
```

## 2. Regola guida

```text
TV = intersezione pubblica + recap + regia
device = percezione, scelta, controllo e informazioni filtrate
```

Derivata (operativa):

- la TV e' un canale di sola lettura che trasporta **solo** `public` + `aggregated`;
- il device del player e' l'unico canale che trasporta `private` (i suoi);
- `secret` non raggiunge nessun umano: vive solo dentro gli engine;
- il passaggio `private`/`secret` -> `public`/`aggregated` avviene SOLO via evento
  esplicito (promotion gate: `reveal_acknowledge`, debrief), mai in automatico
  (SPEC-A sez. 5 regola 3).

Promemoria SPEC-A (sez. 5 regola 4): `secret` != nascosto-al-player. Il player vede
sempre i PROPRI dati (`private`); `secret` significa nascosto a tutti gli umani,
visibile solo al Sistema.

**Opt-in self-disclosure (ratificato 2026-06-08).** Oltre al promotion gate di sistema
(`reveal_acknowledge`/debrief), il player PUO' promuovere volontariamente i PROPRI dati
`private` a `public` (la propria forma, il proprio voto, il proprio consenso). Sempre
player-initiated, mai imposto: default = `private`, opt-in = `public`. Si applica a
F1/F2/F5/F6 (sez. 6).

## 3. Contratto per-surface

Le 10 surface della roadmap SPEC-B. La matrice 3.0 e' il contratto sintetico
(colonne = i 4 tier); le sezioni 3.1-3.10 portano note, edge-case e i puntatori ai
fork aperti (sez. 6). Dove una cella tocca un fork non canon-derivabile, rimanda a
`F#` invece di decidere.

> Reminder operativo (SPEC-A sez. 5 regola 4): in ogni riga `secret` = nascosto a
> TUTTI gli umani, incluso il player stesso. Se il player DEVE vedere un proprio dato
> (i propri assi Forma, i propri valori trust/affinity), quel dato e' `private`, non
> `secret`. Lo `secret` e' solo cio' che vive dentro gli engine.

### 3.0 Matrice sintetica

| Surface            | public (TV)                                                                           | private (device owner)                                                                 | aggregated (TV gruppo)                                 | secret (Sistema)                                     |
| ------------------ | ------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- | ------------------------------------------------------ | ---------------------------------------------------- |
| 1 Lobby / join     | codice room, slot roster, presence, nome + ruolo-slot confermati                      | nome/identita' in editing pre-conferma                                                 | conteggio ready (N/M)                                  | device token, mapping player_id<->device, host_token |
| 2 Form Pulse       | nulla per-player di default; opt-in self-disclosure (F1)                              | micro-scenari + risposte, assi propri (Simbiosi/Predazione...), Forma personale        | radar/ripple di gruppo, tono del branco                | assi -> MBTI/Forma/conviction, custode bias indiv.   |
| 3 World seed       | ecosistema (biome, pressione, tone), Custode/eco seed, reveal nascita run             | dettaglio filtrato per sensi/cognizione/ruolo/creatura                                 | come il Form Pulse aggregato ha piegato seed           | profilo Forma per-player che ha biasato il seed      |
| 4 Route choice     | candidate cards, tally finale, route scelta (reveal), commit                          | voto pre-tally (node_id), preview route filtrata                                       | tally in corso, quorum/timeout countdown               | signal risk_posture dalla scelta                     |
| 5 Planning combat  | stato di FASE planning, tensione del tavolo (NON il piano, NON readiness per-player)  | creatura+controlli, preview NON canonica (draft), percezione filtrata, intent in comp. | readiness gruppo SOLO conteggio (N/M), mood "indeciso" | commit_latency, hesitation_score, preview_dwell      |
| 6 Commit state     | intent rivelati DOPO commit (revealed_intents), risultato round                       | proprio lock/ready pre-reveal, proprio intent committato pre-reveal                    | conteggio locked/waiting (N/M)                         | timing commit (firmness conviction)                  |
| 7 Nido             | vista comune, lineage tree pubblico, risorse comuni, Custode commentary               | creatura principale, party select, recruit accept, mating/offspring, rituali, export   | relazioni aggregate, mood branco                       | scoring affinity/trust interni, letture identita'    |
| 8 Mating / recruit | recap, lista candidati, tally mating, offspring reveal, nuovo ingresso                | decisione recruit, bonding, mating vote pre-tally, mutation choice, rituale offspring  | mating tally in corso, sentiment                       | compatibility scoring, epigenome roll pre-reveal     |
| 9 Tri-Sorgente     | dottrina/sedimentazione pubblica, esito scambio carte; contenuto carta = private (F4) | mano carte, 3 opzioni pre-scelta, offerta scambio pre-accept, frammenti da skip        | lean dottrinale collettivo                             | identita'/conviction scoring da scelte dottrinali    |
| 10 Lethal confirm  | esistenza missione lethal-gated, esito (consenso raggiunto / parte)                   | la conferma del player coinvolto, dettaglio rischio sulla propria creatura             | stato "in attesa" anonimo; coinvolto opt-in (F5)       | signal risk_posture dalla conferma                   |

> TV mirror = colonne `public` + `aggregated`. Le colonne `private` + `secret` NON
> raggiungono mai il canale TV (sez. 4).

> Nota "debrief": il debrief post-round/post-missione non e' una surface a se' nella
> roadmap SPEC-B; la sua visibilita' si compone di righe gia' coperte -- esito/round
> (riga 6), recap+candidati+offspring (riga 8), conseguenze Nido (riga 7). Il canon
> (reconstruction fase 12) conferma il taglio: TV = outcome/MVP/ferite/lineage/barks/
> Custode-memory (`public`); device = scelte private o semi-private. Vedi anche il
> leak-migration "Debrief TV" (sez. 4.2).

### 3.1 Lobby / join e slot

Authority (SPEC-K): host tecnico crea il tavolo, device join. Visibilita':

- I token tecnici (`host_token`, device token, mapping `player_id<->device`) sono
  `secret` (host_technical): non rappresentano agency, non vanno mai serializzati
  verso umani -- nemmeno verso il device owner come dato visibile.
- Distinguere "ruolo": il **ruolo-slot al tavolo** (quale sotto-branco controlla il
  player) e' `public` (gli altri lo sanno); il **token di authority** che lo
  implementa e' `secret`. Non confondere i due.
- Il nome/identita' player e' `private` mentre in editing, `public` una volta
  confermato (e' identita' al tavolo). Presence del singolo = `public`; il conteggio
  "N/M pronti" e' `aggregated` (la TV puo' mostrare la barra senza per-player se si
  preferisce un mirror sobrio).
- Custode NON scelto al join (reconstruction fase 1): eventuale seed/placeholder e'
  `public`, la rivelazione vera arriva dopo Form Pulse/world formation.
- Onboarding narrativo (3 scelte identitarie, ADR-2026-06-07 punto 2): RATIFICATO
  (F6, 2026-06-08) = `private` + opt-in (specchio di F1): le 3 scelte sono `private`,
  confluiscono in `aggregated`/`secret`, il player puo' opt-in a mostrare l'identita'.

### 3.2 Form Pulse

Authority (SPEC-K): device input. Reconstruction fase 2: micro-scenari per device ->
assi comportamentali (Simbiosi/Predazione, Esplorativo/Cauto, Agile/Robusto,
Solitario/Sciame, Memoria/Istinto) -> alimentano MBTI/Forma, ecosistema, custode bias.

- Le risposte ai micro-scenari e gli assi DERIVATI del singolo sono `private` (il
  player vede i suoi) e i loro effetti di scoring sono `secret` (engine).
- La TV mostra il **radar/ripple aggregato** del branco (`aggregated`): conferma
  "il gruppo ha risposto" senza esporre il profilo individuale.
- RATIFICATO (F1, 2026-06-08): default SOLO aggregato (nessun esito per-player in TV);
  il player puo' OPT-IN a mostrare la propria forma in TV (self-disclosure). Mai
  per-player pubblico imposto.
- Edge N=2: con 2 soli player il radar aggregato puo' rivelare il profilo dell'altro
  per differenza; l'edge va risolto in F1.

### 3.3 World seed / formation

Authority (SPEC-K 7.2): device aggrega Form Pulse, TV rivela l'ecosistema, device
riceve dettagli filtrati. SPEC-K 7.2 e' esplicito: "La TV mostra l'intersezione
pubblica: biome, pressione, scenario tone, Custode/eco seed, non il profilo privato
completo dei player".

- `public`: l'ecosistema della run (biome, pressione, tone), il seed Custode/eco,
  l'animazione di nascita del mondo.
- `private`: il dettaglio filtrato per la creatura/ruolo del player (cosa il TUO
  sotto-branco percepisce o sa del mondo). E' il primo punto in cui "informazioni
  filtrate" (regola guida) diventa concreto.
- `aggregated`: come il Form Pulse di gruppo ha piegato il seed (ripple -> mondo).
- `secret`: il profilo Forma per-player che ha biasato il seed.

### 3.4 Route choice (Descent)

Authority (SPEC-K 7.3): host tecnico APRE la finestra (atto di broadcast), i device
votano, il backend committa, la TV osserva tally e reveal. La TV non committa.

- `public`: le candidate route card (tavolo condiviso), il tally finale, la route
  scelta (reveal), il commit `/campaign/choose`.
- `private`: il voto del singolo PRIMA del tally (`node_id`), la preview route
  filtrata per il player.
- `aggregated`: il tally in corso (conteggi per opzione), il countdown quorum/timeout
  (SPEC-K 6.3: il timeout va mostrato in TV come risultato del tavolo, non scelta TV).
- `secret`: il signal `risk_posture` derivato dalla scelta (SPEC-A sez. 6).
- RATIFICATO (F2, 2026-06-08): default SOLO tally (voto `private` fino al commit);
  ogni player puo' OPT-IN ad auto-rivelare il proprio voto, scegliendo se prima o dopo
  il commit (stile reveal WEGO). Mai attribuzione imposta. Vale per world/route/mating.

### 3.5 Planning combat

Authority (SPEC-K 7.4): "La TV non deve essere UI di planning. Puo' mostrare
readiness, tensione e pubblico recap". Dettaglio meccanico -> SPEC-C (WEGO composer).

- `public`: solo lo STATO DI FASE (planning aperto, countdown time-to-commit) e la
  tensione del tavolo. NIENTE piano, NIENTE preview del singolo, e NIENTE readiness
  per-player ("chi ha finito / chi sta ancora pianificando" e' un timing-tell, NON
  dato TV). Solo il conteggio aggregato (N/M) e' ammesso (sotto).
- `private`: la creatura principale assegnata + controlli extra validi
  (reconstruction sez. 7 punto 6: 1 player -> 1 creatura, salvo companion/evocazioni/
  simbionti/possessioni), la **preview NON canonica** (draft, SPEC-K 7.4 /
  ADR-2026-06-07 punto 5), la percezione filtrata (fog/sensi della propria creatura),
  l'intent in composizione entro AP.
- `aggregated`: readiness di gruppo (N/M in planning), mood "branco indeciso".
- `secret`: i signal comportamentali `commit_latency`, `hesitation_score`,
  `preview_dwell` (SPEC-A sez. 6).
- Invariante: la preview e' esplorazione PRIVATA; non e' canonica e non va in TV.
- RATIFICATO (F3, 2026-06-08): il campo di battaglia in TV = UNIONE percettiva del
  branco (somma di cio' che il branco vede); il device resta filtrato per-creatura. La
  TV non e' onnisciente (premia lo scout). Vale anche per sez. 3.6 / round render (SPEC-D).

### 3.6 Commit state (WEGO reveal)

Authority: device committa, backend canonicalizza, TV rivela. Modello WEGO
(ADR-2026-06-07 punto 5 + ADR-2026-04-16 round-based combat model).

- `private`: il proprio lock/ready PRIMA del reveal, il proprio intent committato
  PRIMA del reveal simultaneo.
- `aggregated`: il conteggio locked/waiting (N/M committed) -- la TV mostra "3/4
  pronti" senza rivelare i contenuti.
- `public`: gli intent rivelati DOPO il commit simultaneo (`revealed_intents`,
  input di SPEC-D; nome/forma esatta del campo soggetta al VERIFY engine-API gate di
  SPEC-A sez. 10) e il risultato del round dall'event-log deterministico.
- `secret`: il timing del commit (firmness Conviction).
- **Invariante WEGO (P1):** l'intent e' `private` fino al reveal simultaneo, poi
  `public`. Nessun early-peek sulla TV o cross-device prima del commit. Vale anche
  per i leak PARZIALI: "il player X ha gia' committato / sta ancora pianificando" NON
  va in TV per-player prima del reveal -- e' gia' informazione tattica (timing-tell).
  Solo il conteggio aggregato locked/waiting (N/M) e' ammesso. Questo e' il leak piu'
  rischioso del combat (sez. 4).

### 3.7 Nido

Authority (SPEC-K 7.6): TV = stato pubblico del Nido; device = azioni per-player.
SPEC-K K-04: `PhoneNidoView` da mirror puro a hub di azioni device.

- `public`: vista comune del Nido, lineage tree pubblico, risorse comuni, Custode
  commentary, mission/route board recap.
- `aggregated`: le relazioni del branco come AGGREGATO (SPEC-K 7.6 dice "relazioni
  aggregate"), il mood collettivo.
- `private`: selezione creatura principale, party select, recruit acceptance,
  mating/breeding/offspring ritual, ferite/rituali, export/resync Custode, e i
  valori trust/affinity delle PROPRIE creature.
- `secret`: lo scoring interno affinity/trust e le letture identita'.
- Edge: i numeri trust/affinity per-creatura NON vanno in TV per-player (sarebbero
  `private`); la TV ne mostra solo l'aggregato (sez. 4 leak NidoHubView). "Relazioni
  aggregate" = categoria di coesione del branco (alto/medio/basso), nessun pair
  nominato, a granularita' minima che impedisce l'inferenza per-creatura con pochi
  membri (evitare es. "3 pair in trust critico" se il branco ha 4 creature).

### 3.8 Mating / recruit

Authority (SPEC-K 7.5): device gestisce recruit/mating/offspring, TV mostra recap e
reveal. Decision-events SPEC-A: `mating_vote`, `lineage_choice`, `reveal_acknowledge`.

- `public`: recap, lista candidati recruit, tally mating, **offspring reveal**,
  conseguenze pubbliche (nuovo ingresso roster).
- `private`: la decisione recruit, il bonding, il mating vote PRIMA del tally, la
  mutation choice, il rituale offspring sul device.
- `aggregated`: il mating tally in corso, il sentiment di gruppo.
- `secret`: il compatibility scoring e l'epigenome roll interno PRIMA del reveal.
- L'offspring reveal e' un **promotion gate** esplicito (`reveal_acknowledge`):
  l'esito genetico passa da `secret`/`private` a `public` solo al reveal, mai prima.

### 3.9 Tri-Sorgente (dottrina)

Authority (ADR-2026-06-07 punto 3 + reconstruction sez. 7 punto 10): Tri-Sorgente estesa = reward + scelte narrative/dottrinali +
sedimentazione + scambio carte come meccanica di informazione/influenza/memoria.
Dettaglio -> SPEC-G. Reconstruction: 3 opzioni; skip -> frammenti genetici.

- `public`: la dottrina/sedimentazione che diventa memoria condivisa (branco/Nido/
  campagna); l'esito dello scambio carte (la carta entrata in memoria comune).
- `private`: la mano carte del player, le 3 opzioni PRIMA della scelta, l'offerta di
  scambio PRIMA dell'accept, i frammenti genetici da skip.
- `aggregated`: il lean dottrinale collettivo del branco.
- `secret`: lo scoring identita'/conviction alimentato dalle scelte dottrinali.
- RATIFICATO (F4, 2026-06-08): il FATTO dello scambio + la sedimentazione dottrinale =
  `public`; il CONTENUTO della carta resta `private` tra i due trader finche' non viene
  giocato. Abilita intrigo/asimmetria informativa senza nascondere il patto.

### 3.10 Lethal confirmation

Authority (SPEC-K 6.4 + reconstruction sez. 7 punto 9): default-off, mission-gated, conferma OBBLIGATORIA
dal device del player coinvolto. NON quorum: serve il consenso del player owner.
Dettaglio -> SPEC-J.

- `public`: l'esistenza di una missione lethal-gated (tutti vedono che la missione e'
  a rischio), l'esito (consenso raggiunto / la missione parte).
- `private`: la conferma stessa del player coinvolto (consenso sul device), il
  dettaglio del rischio sulla propria creatura.
- `aggregated`: lo stato "in attesa di consenso" (quanti devono ancora confermare).
- `secret`: il signal `risk_posture` derivato dalla conferma.
- RATIFICATO (F5, 2026-06-08): default ANONIMO ("in attesa di consenso, 1 mancante");
  il player coinvolto puo' OPT-IN a mostrarsi. Mai nomi imposti.
- Requisito di consegna (cross-ref SPEC-J): la sollecitazione al device del player
  coinvolto deve essere una notifica prioritaria non silenziabile dal gameplay; il
  timeout/attesa mostrato in TV decorre solo dopo delivery-receipt dal backend,
  altrimenti il consenso puo' andare in deadlock (device bloccato = tavolo fermo).

## 4. Enforcement canale TV + leak-migration

### 4.1 Invariante di canale

```text
TV_channel = filter(event) where event.tier in { public, aggregated }
```

- Ogni evento e' tier-tagged all'emissione (SPEC-A sez. 5 regola 1: default-tier per
  classe d'evento, override esplicito ammesso).
- Il `tierFilter` del `deviceInputLedger` (SPEC-A sez. 4.4) e' il punto unico di
  enforcement: decide cosa la TV puo' mirror-are. SPEC-B e' il contratto che quel
  filtro applica.
- `private` e `secret` NON vanno mai serializzati verso il canale TV. `private` viaggia
  solo verso il device owner; `secret` non lascia gli engine.
- Promotion `private`/`secret` -> `public`/`aggregated` solo via evento esplicito
  (`reveal_acknowledge`, debrief) -- mai automatico (SPEC-A sez. 5 regola 3).

### 4.2 Leak-migration items

Surface legacy dove il comportamento attuale rischia di mandare `private`/`secret`
alla TV. Sono item di migrazione, da chiudere o ticketare (cross-ref SPEC-K).

| Surface / file                                   | Leak rischio                                                     | Tier corretto                               | Migrazione / cross-ref                           |
| ------------------------------------------------ | ---------------------------------------------------------------- | ------------------------------------------- | ------------------------------------------------ |
| Form Pulse host view (`form_pulse_host_view.gd`) | TV che mostra risposte/assi per-player                           | solo ripple `aggregated`                    | ledger Form Pulse (SPEC-A) + esito di F1         |
| Combat TV pre-commit                             | TV che mostra draft/preview/intent PRIMA del reveal (rompe WEGO) | `public` solo `revealed_intents` post       | SPEC-C (composer) + SPEC-D (director)            |
| `NidoHubView` / righe recruit storiche           | TV che mostra trust/affinity per-creatura o recruit per-player   | `aggregated` (relazioni di branco)          | SPEC-K K-04 (Nido phone action surface)          |
| Debrief TV                                       | TV che mostra "scelte private o semi-private" del singolo        | `public` outcome/MVP/lineage; resto a phone | gia' vicino (reconstruction fase 12); confermare |
| Wording legacy "host drives" / "TV drives"       | non e' data-leak ma authority-leak (induce UI sbagliata)         | n/a (authority)                             | SPEC-K K-06 (wording cleanup)                    |

Nota di responsabilita': SPEC-B definisce COSA non deve fare leak; il `tierFilter` di
SPEC-A e' il COME; la surface audit di SPEC-K (K-01) e' il DOVE. Nessuna delle tre da
sola basta -- serve la terna.

## 5. Relazione con altre spec

- **SPEC-A** (`evo-tactics-device-input-ledger.md`): SPEC-B **eredita** la tassonomia
  4-tier (sez. 5) e si appoggia al `tierFilter` del `deviceInputLedger` come unico
  punto di enforcement. A = meccanismo; B = applicazione per-surface.
- **SPEC-K** (`evo-tactics-godot-device-authority-reconciliation.md`):
  **complementare e ortogonale**. K classifica CHI guida ogni surface (TV_MIRROR /
  DEVICE_INPUT / HOST_TECHNICAL / DEV_FALLBACK / LEGACY_TO_REMOVE, sez. 4); B
  classifica QUALE DATO e' public/private/aggregated/secret sulle stesse surface. Una
  surface `DEVICE_INPUT` di K puo' avere righe `public` su B (il suo esito) -- i due
  assi non si contraddicono, si compongono.
- **SPEC-C** (WEGO Phone Combat Composer): implementa la transizione private->public
  di planning/commit; SPEC-B sez. 3.5/3.6 ne vincola la visibilita' (preview privata,
  intent privato fino al reveal simultaneo).
- **SPEC-D** (TV Cinematic Round Director): consuma SOLO event-log `public`/
  `aggregated`; SPEC-B conferma che l'input del director e' tier-public (nessun
  `private`/`secret` entra nel piano-sequenza).
- **SPEC-J** (Lethal Consent): SPEC-B sez. 3.10 ne definisce la visibilita' (consenso
  privato, esistenza missione pubblica) e apre F5.
- **SPEC-E** (Nido Groups / Party Select): SPEC-B sez. 3.7 separa pubblico-Nido da
  azioni-private-device.
- **SPEC-G** (Tri-Sorgente / scambio carte): SPEC-B sez. 3.9 ne definisce la
  visibilita' e apre F4.
- **SPEC-F** (Custode portable): l'export rispetta i tier (solo aggregati/snapshot
  consentiti, SPEC-A sez. 7).
- **SPEC-L** (Runtime Feature Inventory): traccia lo stato LIVE/PARTIAL del
  `tierFilter` e delle surface qui descritte.

## 6. Decisioni aperte (per Eduardo)

Fork NON canon-derivabili: l'esito non discende univocamente da SPEC-A/K/ADR.
**RATIFICATI da Eduardo 2026-06-08** (matrice sez. 3 + note per-surface aggiornate).
Pattern trasversale emerso: **opt-in self-disclosure** (sez. 2) -- il player puo'
promuovere volontariamente i PROPRI dati `private` a `public`, mai imposto (F1/F2/F5/F6).

| Fork | Esito ratificato (2026-06-08)                                                     |
| ---- | --------------------------------------------------------------------------------- |
| F1   | Aggregato di default + opt-in per-player (no esito pubblico imposto)              |
| F2   | Solo tally di default + opt-in self-reveal del voto (pre/post commit, stile WEGO) |
| F3   | Unione percettiva del branco (TV non onnisciente)                                 |
| F4   | Esito scambio `public`, contenuto carta `private` tra i 2 trader                  |
| F5   | Anonimo di default + opt-in del player coinvolto                                  |
| F6   | `private` + opt-in (specchio di F1)                                               |

Sotto: opzioni/rationale originali di ogni fork (storia della decisione).

### F1 -- Esito Form Pulse: pubblico o privato?

La TV deve mostrare un esito per-player del Form Pulse (es. "Eduardo = Esplorativo /
Sciame") o solo il ripple aggregato?

- **Opzione A -- solo aggregato (raccomandata).** TV mostra ripple di gruppo; il
  profilo per-player resta `private`/`secret`. Tradeoff: protegge il profiling
  diegetico ("il Sistema osserva"), evita meta-gaming sociale, coerente con
  anti-pattern MBTI-hard-gate (SPEC-A sez. 2). Meno spettacolo sulla TV.
- **Opzione B -- esito per-player pubblico.** TV mostra la "forma" di ognuno.
  Tradeoff: piu' leggibile/social al tavolo, ma espone identita' che gli engine usano
  come `secret` e incoraggia recitare un archetipo invece di giocare naturale.
- **Opzione C -- opt-in per-player.** Default privato; il player puo' scegliere di
  "mostrare la propria forma" in TV. Tradeoff: rispetta consenso (SPEC-A sez. 7) ma
  aggiunge UI/stato.
- **Edge N=2 (vale in ogni opzione):** con 2 player l'aggregato rivela l'altro per
  differenza. Mitigazioni: radar smussato/anonimizzato per N<3, sottoinsieme di assi,
  o accettare il leak in small-group.
- **Raccomandazione:** A. Eventualmente C come estensione, mai B di default.

### F2 -- Attribuzione voto: la TV mostra CHI ha votato cosa?

Per `world_vote` / `route_vote` / `mating_vote`: la TV mostra il tally aggregato e
basta, o anche l'attribuzione per-player ("Eduardo -> route nord")?

- **Opzione A -- solo tally (raccomandata).** Il voto del singolo e' `private` fino
  al commit; la TV mostra solo conteggi (`aggregated`) e l'esito (`public`).
  Tradeoff: protegge dalla pressione sociale/bandwagon, mantiene il voto sincero.
- **Opzione B -- attribuzione pubblica.** TV mostra chi ha votato cosa. Tradeoff:
  piu' trasparenza e dibattito al tavolo, ma induce conformismo e ritorsione sociale;
  contraddice il pattern "intent privato fino al reveal".
- **Opzione C -- reveal post-commit.** Tally `aggregated` durante; attribuzione
  `public` solo DOPO il commit (come il reveal WEGO). Tradeoff: compromesso, ma e'
  stato/UI in piu' e va deciso se ha valore di gioco.
- **Raccomandazione:** A. C solo se il dibattito retrospettivo diventa meccanica.

### F3 -- Modello di visibilita' del campo di battaglia in TV

La regola guida dice "TV = intersezione pubblica". Sul combat: la TV mostra un campo
ONNISCIENTE (tutto), l'UNIONE di cio' che il branco percepisce, o l'INTERSEZIONE
(solo cio' che TUTTE le creature vedono)? Il device resta sempre filtrato per-creatura.

- **Opzione A -- unione di percezione del branco (raccomandata).** TV = somma di cio'
  che il branco collettivamente percepisce; il device filtra al per-creatura.
  Tradeoff: la TV resta "tavolo condiviso" leggibile senza diventare onnisciente;
  premia lo scout; coerente con "informazioni filtrate" lato device.
- **Opzione B -- onnisciente.** TV mostra tutto il campo. Tradeoff: massima
  leggibilita' da spettatore, ma annulla fog/scout e rende il filtro device cosmetico.
- **Opzione C -- intersezione stretta.** TV mostra solo cio' che tutti vedono.
  Tradeoff: fedele alla lettera "intersezione", ma spesso una TV quasi vuota -> cattiva
  regia.
- **Raccomandazione:** A (interpretare "intersezione pubblica" come "cio' che e'
  pubblico per il tavolo" = unione percettiva del branco, non intersezione insiemistica).
- **RATIFICATO 2026-06-08: A** (unione percettiva del branco). Coerente col canon
  (reconstruction fase planning: "la TV puo' mostrare intenzioni aggregate, zone di
  rischio, tensione, ma non deve rivelare tutto se c'e' informazione privata") che gia'
  escludeva B (onnisciente) e C (TV vuota).

### F4 -- Scambio carte Tri-Sorgente: info pubblica o tra i due trader?

Lo scambio carte e' "meccanica di informazione". Quando due player scambiano una
carta, l'informazione contenuta diventa pubblica (memoria del tavolo) o resta tra i
due?

- **Opzione A -- esito pubblico, contenuto privato (raccomandata).** Il FATTO dello
  scambio + l'eventuale sedimentazione dottrinale e' `public`; il contenuto specifico
  della carta resta `private` tra i due trader finche' non viene giocato. Tradeoff:
  abilita intrigo/asimmetria informativa senza nascondere che un patto e' avvenuto.
- **Opzione B -- tutto pubblico.** Scambio e contenuto in TV. Tradeoff: trasparenza,
  ma uccide il valore "informazione/influenza" della meccanica.
- **Opzione C -- tutto privato.** Nemmeno il fatto dello scambio in TV. Tradeoff:
  massimo intrigo, ma la TV perde la "sedimentazione condivisa" che ADR-2026-06-07 punto 3 vuole.
- **Raccomandazione:** A. Da rifinire con SPEC-G.

### F5 -- Visibilita' consenso lethal: nomi o anonimo?

In attesa del consenso lethal, la TV mostra i NOMI di chi deve ancora confermare, o
un "in attesa di consenso" anonimo?

- **Opzione A -- aggregato anonimo (raccomandata).** TV: "in attesa di consenso
  (1 mancante)". Tradeoff: niente pressione sociale su una scelta che riguarda il
  rischio personale della creatura del player (coerente con per-player consent,
  SPEC-K 6.4). La sollecitazione mirata arriva sul device del player coinvolto.
- **Opzione B -- nomi in chiaro.** TV: "in attesa di Eduardo". Tradeoff: sblocca
  prima il tavolo, ma mette in piazza una decisione intima e puo' forzare il consenso.
- **Raccomandazione:** A.

### F6 -- Onboarding narrativo: esito per-player o aggregato?

SPEC-K (sez. 4, riga "Onboarding narrativo") rimanda esplicitamente a SPEC-A/B la
scelta "per-player o aggregate" delle 3 scelte identitarie iniziali (ADR-2026-06-07 punto 2). Le 3
scelte producono un esito per-player pubblico o confluiscono solo nell'aggregato?

- **Opzione A -- private + aggregato (raccomandata).** Le 3 scelte sono `private`
  (le vede il player), confluiscono in `aggregated`/`secret` per world/scoring; la TV
  ne mostra solo l'eco aggregata. Tradeoff: coerente con F1, niente etichette
  pubbliche premature.
- **Opzione B -- esito per-player pubblico.** TV mostra la scelta identitaria di
  ognuno. Tradeoff: piu' rituale-da-tavolo all'avvio, ma stessa obiezione di F1-B.
- **Raccomandazione:** A (allineata a F1). Se F1=A e F6=B si crea incoerenza: decidere
  F1 e F6 insieme.

## 7. Acceptance

SPEC-B e' implementabile/chiudibile quando:

1. ognuna delle 10 surface ha lo split 4-tier esplicito (matrice sez. 3.0 + note 3.1-3.10);
2. il canale TV-mirror trasporta SOLO `public` + `aggregated`; `private`/`secret` non
   sono mai serializzati verso la TV (enforced via `tierFilter` SPEC-A; coperto da
   contract-test, cfr. SPEC-A sez. 9 "tier enforcement"); in particolare il
   contract-test verifica che durante il planning NON esca readiness per-player verso
   la TV (solo conteggio aggregato N/M), a tutela dell'invariante WEGO (sez. 3.6);
3. nessuna surface legacy fa leak di `private`/`secret` alla TV: i leak-migration item
   (sez. 4.2) sono chiusi o ticketati con cross-ref SPEC-K;
4. la promotion `private`/`secret` -> `public`/`aggregated` avviene solo via evento
   esplicito -- sistema (`reveal_acknowledge`/debrief) o player (opt-in self-disclosure
   dei propri dati, sez. 2) -- mai automatico;
5. le Decisioni aperte F1-F6 sono ratificate da Eduardo (FATTO 2026-06-08, sez. 6) e la
   matrice/note sez. 3 sono aggiornate con gli esiti; resta a Eduardo il flip
   `review_needed` -> `accepted` al merge del PR;
6. coerenza verificata con SPEC-A (tiers) e SPEC-K (authority): nessuna surface dove
   B contraddice l'authority di K (stesso surface, assi ortogonali).
