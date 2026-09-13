---
title: Game/Godot code-surface reconcile
date: 2026-06-06
type: code-surface-reconcile
doc_status: review_needed
doc_owner: master-dd
workstream: cross-cutting
last_verified: '2026-06-06'
source_of_truth: false
language: it
review_cycle_days: 30
tags:
  - evo-tactics
  - code-audit
  - godot
  - game-backend
  - runtime
  - nido
  - route-choice
---

# Game/Godot code-surface reconcile

Questo documento e' un passaggio code-first dopo la ricostruzione design del
5 giugno 2026. Scopo: capire cosa esiste gia' in `C:/dev/Game` e
`C:/dev/Game-Godot-v2`, cosa e' solo surface parziale, e cosa manca ancora
rispetto al flow TV/device/campagna ratificato.

Non sostituisce i documenti di design. Serve come mappa di realta' tecnica per
evitare tre errori:

1. trattare come "idea" un sistema gia' implementato;
2. trattare come "shipped" un client Godot che consuma una route backend ancora
   assente nel repo locale;
3. confondere wording storico host-driven con la direzione ratificata:
   TV/host come mirror/tavolo, input solo dai device.

## 1. Sintesi esecutiva

Il codice conferma che il gioco e' piu' avanti del documento su molti assi
runtime, ma anche che ci sono fratture cross-repo precise.

| Area                          | Stato code-first                                                                                 | Impatto sul design                                                                |
| ----------------------------- | ------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------- |
| Meta-network / Descent chain  | Game backend LIVE flag-OFF; Godot route UI e routed roster avanzati                              | N5 non e' assente: manca flip + completamento WS/phone + verifica end-to-end      |
| Route vote phone              | Godot client pronto; Game `origin/main` contiene PR #2597, ma il branch corrente non lo contiene | Branch skew concreto: non dichiarare gap di progetto se il fix e' gia' su main    |
| Nido                          | Game backend + Godot hub LIVE/PARTIAL; gate locale default-off                                   | Il Nido esiste, ma party-select e full phone authority non sono chiusi            |
| Debrief recruit               | Shipped cross-stack in codice locale                                                             | Va promosso da "design" a LIVE/PARTIAL con playtest real-device pendente          |
| Mating / offspring / genetics | Backend canonico avanzato; Godot facade e TV/phone mirror parziali                               | Il modello e' piu' ricco: epigenome, lineage, tribe emergente, fragment grant     |
| Form Pulse / MBTI input       | Server drain esiste; Godot phone view esiste                                                     | Non e' solo questionario: e' input continuo da device verso world setup/identita' |
| ALIENA                        | Diagnostica + enforcement config-gated default-off presenti                                      | La spec ALIENA deve partire da "soft-on/enforcement gate", non da zero            |
| ERMES                         | Exporter, runtime deltas, runner e debrief input presenti                                        | ERMES e' gia' ponte runtime/lab, ma va governato con contratto leggibile          |
| Custodi / SKIV                | `worldEnricher` produce custode; `skiv/companionStateStore` e routes esistono                    | SKIV e' un template/prototipo Custode portabile, non il concetto completo         |
| Wounds / lethal               | Backend e Godot failure model presenti                                                           | Serve surface rituale/consenso e cutover narrativo, non engine da zero            |

## 2. Game backend: superfici da tracciare

### 2.1 Campaign graph e route choice

File principali:

- `apps/backend/routes/campaign.js`
- `apps/backend/services/worldgen/metaNetworkRouting.js`
- `apps/backend/services/worldgen/metaNetworkResolver.js`
- `apps/backend/services/worldgen/metaNetworkCompletability.js`
- `tests/api/campaignMetaNetworkRouting.test.js`
- `tests/api/metaNetworkRouteEndpoint.test.js`

Stato:

- `GET /api/campaign/meta-network/next` e' read-only, flag-gated da
  `META_NETWORK_ROUTING`.
- `POST /api/campaign/advance`, quando il flag e' ON, usa `currentNode`,
  `clearedNodes`, `selectNextNodes`, season conditions e `encounterForNode`.
- Se ci sono piu' candidati ritorna `choice_required` +
  `route_choice.candidates`.
- `POST /api/campaign/choose` accetta `node_id`, valida che la scelta sia
  pendente e aggiorna `currentNode`/`routeChoices`.

Interpretazione:

La "campagna alla Descent" non e' solo desiderata. Il backend ha gia' il
substrato graph-mode. Il problema aperto e' il percorso completo
co-op/device/production: flag flip, Godot route consumption, route vote e
playtest.

### 2.2 Co-op lifecycle, Form Pulse e world setup

File principali:

- `apps/backend/services/coop/coopOrchestrator.js`
- `apps/backend/routes/coop.js`
- `apps/backend/services/network/wsSession.js`

Stato:

- Fasi note: `lobby -> onboarding -> character_creation -> world_setup ->
combat -> debrief`, con fase transiente `world_seed_reveal`.
- `submitFormPulse` raccoglie assi numerici per player in modo phase-agnostic
  e broadcasta `form_pulse_submit`/`form_pulse_list`.
- `voteWorld` esiste, ma e' ancora booleano `accept/reject` sullo scenario, non
  voto per nodo meta-network.
- `confirmWorld` e' ancora host-only nel codice Game: conferma lo scenario e
  arricchisce il mondo con world/ERMES/ALIENA/custode.

Interpretazione:

Questo e' il punto da riconciliare con la correzione ratificata: il codice
storico usa ancora host confirm, ma il modello target dice che TV/host non deve
essere input authority. Quindi SPEC-K deve distinguere:

- runtime attuale: host conferma in alcuni flussi;
- direzione target: i device votano/scelgono, TV mostra mirror/recap;
- passaggio tecnico: spostare commit/confirm su device/quorum o conferma
  device-side, lasciando TV come osservatore.

### 2.3 Route vote: frattura branch, non assenza di progetto

Godot v2 contiene gia':

- `scripts/net/coop_api.gd` con `build_open_route_request` e `open_route`;
- `scripts/main_route_choice.gd` con apertura `/api/coop/route/open`;
- `scripts/net/coop_ws_peer.gd` con segnali `route_choice_received`,
  `route_tally_received`, `route_vote_accepted_received`;
- `scripts/phone/phone_coop_vote_wire.gd` con invio intent `route_vote`;
- test GUT per API, WS peer, composer e route view.

Nel branch Game corrente al controllo 2026-06-06
(`claude/jules-test-coverage-batch-2026-06-03`, HEAD `7f7f99af`):

- non risulta una route `POST /api/coop/route/open` in `apps/backend/routes`;
- non risultano handler WS `route_vote`, `route_tally`, `route_choice` in
  `wsSession.js` o `coopOrchestrator.js`;
- esiste solo il test `tests/api/coopWorldVoteRouting.test.js`, che dimostra
  il seam REST `world_vote -> /campaign/choose` senza produzione route vote.

Pero' la storia git mostra che il progetto l'ha gia' chiuso su `origin/main`
(`3e2546e2` al controllo):

- `1995276d feat(coop): co-op WS route-vote phase for meta-network route choice
(GAP-C fase-3) (#2597)`;
- `b916b2cb fix(coop): route-vote host-guard + tally re-broadcast on
disconnect`;
- `a75b7727 style(coop): prettier-format the route-vote fix`.

Il commit #2597 aggiunge:

- `POST /api/coop/route/open` in `apps/backend/routes/coop.js`;
- `openRouteChoice`, `voteRoute`, `routeTally` in
  `apps/backend/services/coop/coopOrchestrator.js`;
- drain WS `route_vote`, broadcast `route_tally`, ack `route_vote_accepted` in
  `apps/backend/services/network/wsSession.js`;
- test API/orchestrator/WS dedicati.

Il fix successivo aggiunge host guard e re-broadcast su disconnect, cioe'
proprio i due rischi piu' delicati per quorum device-driven.

Decisione tecnica:

Questo non e' piu' un gap di progetto. E' un branch skew del thread corrente.
Prima di implementare o correggere route vote bisogna riallinearsi a
`origin/main` oppure basare le spec sul main aggiornato.

## 3. Godot v2: superfici vive o quasi vive

### 3.1 Route choice e routed encounter roster

File principali:

- `scripts/main_route_choice.gd`
- `scripts/session/route_choice_flow.gd`
- `scripts/ui/route_choice_view.gd`
- `scripts/main_encounter_roster.gd`
- `scripts/net/campaign_api.gd`
- `docs/superpowers/specs/2026-06-04-gapc-godot-routed-encounter-roster-design.md`

Stato:

- Godot sa interrogare `meta-network/next`, chiamare `/campaign/advance`,
  classificare completed/auto/choice e montare `RouteChoiceView`.
- Su scelta, timbra `scenario.graph_routed = true` e il prossimo encounter id.
- `MainEncounterRoster` usa il marker `graph_routed` per sostituire il tutorial
  roster con PG + wave iniziale SISTEMA dall'encounter runtime.
- Ha guardie per evitare enemyless instant-win e celle sovrapposte.

Implicazione:

La pipeline "Descent route -> prossimo encounter giocabile" e' molto piu' vicina
di quanto sembrasse. Il nodo fragile e' il voto co-op route e il consumo backend
completo, non la view di scelta in se'.

### 3.2 Nido: TV hub, phone mirror, recruit

File principali:

- `scripts/ui/nido_hub_view.gd`
- `scripts/phone/phone_nido_view.gd`
- `scripts/main_nido.gd`
- `scripts/session/meta_relations_presenter.gd`
- `scripts/phone/phone_debrief_recruit_wire.gd`
- `scripts/session/recruit_candidates_builder.gd`

Stato:

- `NidoHubView` su TV mostra nest, roster e relazioni. Ha ancora bottone
  `recruit_pressed` per righe reclutabili.
- `PhoneNidoView` e' mirror read-only: "phone never drives Nido".
- Il recruit da debrief e' invece device action: `PhoneDebriefRecruitWire`
  collega `recruit_pressed` a `MetaApi.recruit`.
- `RecruitCandidatesBuilder` costruisce candidati dai nemici SISTEMA sconfitti,
  preservando `species_id` canonico e Forma derivata da MBTI quando disponibile.

Implicazione:

Non si deve dire genericamente "il telefono e' read-only". Nel Nido hub e'
read-only; nel debrief recruit il telefono agisce gia'. La riconciliazione
corretta e':

- TV/Nido hub attuale: surface mista storica;
- phone Nido: mirror;
- phone debrief recruit: input live;
- target: tutte le scelte player-facing devono passare da device, con TV come
  stato pubblico.

### 3.3 Mating, offspring e facade genetics

File principali:

- `scripts/services/mating_genetics_facade.gd`
- `scripts/services/offspring_ritual_service.gd`
- `scripts/ui/tv_mating_panel.gd`
- `scripts/phone/phone_mating_view.gd`
- `scripts/phone/main_phone_offspring_mount.gd`
- `scripts/phone/phone_offspring_view.gd`

Stato:

- Godot dichiara una facade unica per mating/genetics.
- La genetica canonica resta backend: `run_offspring_ritual`,
  `fetch_canonical_mutations`, `fetch_lineage_chain`.
- La preview locale e' esplicitamente `canonical=false`.
- `TvMatingPanel` e' mirror read-only di tally e offspring resolved.
- Il phone e' il luogo naturale per voti/scelte mating/offspring. I planning
  Godot 2026-06-04 indicavano ancora il consumer facade come PR aperta, ma il
  controllo 2026-06-06 lo ha aggiornato: PR #423 e' merged e il consumer phone
  offspring ritual e' vivo su Godot main.

Implicazione:

Questo e' allineato alla visione device-driven: TV mostra tally e reveal, i
device guidano voto/rituale. Il lavoro aperto e' rifinire UX finale,
Canvas-D/full mating UI e ingresso offspring nel roster/party select.

### 3.4 Lethality e wound state

File principali:

- `scripts/session/lethality_engine.gd`
- `scripts/combat/wound_state.gd`
- Game: `apps/backend/services/combat/woundSystem.js`
- Game: `apps/backend/services/combat/woundedPerma.js`

Stato:

- Godot ha un `LethalityEngine` deterministic KO: death solo se missione lethal
  e trigger ordinati overkill/scar-cap/end-of-life/lethal-hazard.
- Default: soft-death/wound.
- `WoundState` persiste severity e origine round/encounter.

Implicazione:

La risposta alla domanda "MVP puo' morire?" va separata in tre livelli:

1. engine supporta morte vera solo con gate lethal;
2. design ratificato richiede conferma player per missioni lethal;
3. serve surface Nido/rituali/guarigione per ferite gravi e successione.

## 4. Backend Game: sistemi sottotracciati scoperti dal codice

### 4.1 Epigenome e memoria ambientale ereditabile

File principali:

- `apps/backend/services/genetics/epigenome.js`
- `apps/backend/services/genetics/creatureEpigenomeStore.js`
- `apps/backend/routes/meta.js`
- `apps/backend/routes/session.js`

Stato:

- Il modello epigenome usa conviction axis `utility/liberty/morality` come
  substrate Lamarck-lite.
- Accumula EMA per creatura.
- Calcola offspring epigenome con decay, regression-to-mean e cap anti-snowball.
- Deriva `memoria_ambientale` discreta da deviazioni asse/species mean.
- Puo' concedere Frammenti Genetici alla nascita senza creare valuta parallela.
- `meta.js` idrata epigenomi genitori, calcola species mean, registra offspring
  e lineage.

Implicazione:

Il sistema "tamagochi ma con unicita' vere" non e' solo companion portable:
include comportamento storico, eredita' morbida, memorie discrete e divergenza
lineage. Questo va integrato nella spec Custodi/offspring/tribu'.

### 4.2 Tribe emergente da lineage

File principali:

- `apps/backend/routes/meta.js`
- `apps/backend/services/metaProgression.js`
- `apps/backend/services/lineage/offspringStore.js`
- `tests/api/offspringRitualE2E.test.js`

Stato:

- `meta.js` espone `GET /lineage/:id`.
- Commento codice: Tribe = `lineage_id` chain con almeno 3 membri.
- `offspringRitualE2E` verifica catene cross-encounter e lineage id preservato.

Implicazione:

La tribu' non va descritta come scelta iniziale primaria. Il codice conferma la
lettura "emergente da lineage/Nido", con eventuali job/clan come overlay futuro
da decidere.

### 4.3 ALIENA enforcement gia' presente

File principali:

- `apps/backend/services/authorial/alienaCoherence.js`
- `apps/backend/services/combat/biomeSpawnBias.js`
- `apps/backend/services/combat/reinforcementSpawner.js`
- `tests/services/combat/biomeSpawnBiasAlienaEnforcement.test.js`
- `tests/services/combat/reinforcementSpawnerAlienaEnforcement.test.js`

Stato:

- `alienaCoherence` e' ancora scorer diagnostico puro.
- `reinforcementSpawner` thread-a `policy.aliena_enforcement` in
  `pickPoolEntry`.
- `biomeSpawnBias` modula i pesi di spawn con `factor = 1 - strength *
(1 - aggregate)`.
- Default absent/disabled/strength 0 preserva baseline.

Implicazione:

La decisione ratificata "promuovere ALIENA a enforcement" ha gia' un punto di
atterraggio tecnico. Non serve inventare un nuovo motore: serve definire quando
la policy diventa soft-on, quali campagne la attivano, e come comunicarla senza
dire in fiction "ALIENA".

### 4.4 ERMES runtime bridge

File principali:

- `apps/backend/services/ermes/ermesRunner.js`
- `apps/backend/services/ermes/ermesDebriefInput.js`
- `apps/backend/services/coop/ermesExporter.js`
- `apps/backend/services/traitEffects.js`
- `apps/backend/services/coop/worldEnricher.js`
- `tests/services/ermes/ermesRunner.test.js`
- `tests/services/ermes/ermesDebriefInput.test.js`

Stato:

- `ermesExporter` legge eco pressure e role gap.
- `worldEnricher` passa ERMES payload a Godot world setup.
- `traitEffects` applica delta discreti ERMES ai costi/bonus biome, con cap.
- `ermesDebriefInput` produce input per suggestions/lab.
- `ermesRunner` fa ponte con prototype Python, non e' semplice placeholder.

Implicazione:

ERMES deve essere descritto come ponte operativo runtime/lab, non solo forecast.
Pero' la governance deve restare chiara: runtime bounded, leggibile, niente
scrittura opaca in substrate canonici non previsti.

### 4.5 Custode, SKIV e companion export

File principali:

- `apps/backend/services/coop/worldEnricher.js`
- `apps/backend/services/companion/companionPicker.js`
- `apps/backend/services/skiv/companionStateStore.js`
- `apps/backend/routes/skiv.js`
- `docs/skiv/CANONICAL.md`

Stato:

- `worldEnricher` produce `custode` nel payload world setup:
  display name, species, biome origin, voice, ritual lines.
- `companionStateStore` salva stato portabile per SKIV con whitelist privacy,
  signature deterministica, cap 10 ambassador per Nido, voice diary portable e
  crossbreed history.
- `routes/skiv.js` espone stato/feed/card/webhook per SKIV monitor.

Implicazione:

SKIV e' prototipo/template speciale di una forma possibile dei Custodi. Il
framework futuro deve generalizzare:

- Custode per campagna;
- Custode per player;
- export fuori campagna;
- resync/re-entry con nuove info;
- incontro con altri Custodi;
- ritorno in campagna alla Dragon's Dogma pawn.

### 4.6 VC, MBTI, Ennea, Sentience, Conviction

File principali:

- `apps/backend/services/vcScoring.js`
- `apps/backend/services/coop/vcSnapshotToDebriefPayload.js`
- `apps/backend/routes/session.js`
- `apps/backend/services/mbtiSurface.js`
- `apps/backend/services/enneaEffects.js`
- `tests/api/phase-b3-sentience-fold.test.js`
- `tests/api/sessionVcDebriefPayload.test.js`

Stato:

- La snapshot VC e' 4-layer: MBTI, Ennea, Conviction, Sentience.
- `/api/session/:id/vc` e `/end` producono payload anche per phone/Godot.
- Debrief payload e' serializzato in forma compatibile phone:
  `sentience_tier`, `conviction_axis`, `ennea_archetype`.
- Esistono surface di MBTI reveal, PF/Form session, thoughts candidates e
  conviction decisions.

Implicazione:

La raccolta input costante dai device non deve finire in un solo "MBTI quiz".
Deve essere ledger comportamentale: Form Pulse, combat actions, choices,
conviction decisions, debrief rituali, relazioni. MBTI e' una delle proiezioni,
non l'unica.

## 5. Gap implementativi da aggiungere al quadro

| Gap                                                    | Evidenza code-first                                                    | Azione consigliata                                                           |
| ------------------------------------------------------ | ---------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| Branch corrente Game senza route vote                  | `HEAD 7f7f99af` non contiene `1995276d`, ma `origin/main` si'          | Non implementare doppio; riallineare branch o basare spec sul main           |
| TV host ancora commit authority in world/route storici | `confirmWorld` host-only; TV route pick possibile                      | SPEC-K deve spostare commit sui device o quorum device-side                  |
| Phone Nido hub read-only                               | `PhoneNidoView` commenta observer-only                                 | Decidere quali tab Nido diventano input e quali restano mirror               |
| Party select from Nido non chiuso                      | backend roster esiste, Godot party-select surface mancante             | SPEC-E + build ticket Godot                                                  |
| Mating full Canvas-D ancora incompleto                 | facade presente, mirror TV presente, phone consumer live su Godot main | Rifinire UX Canvas-D, ritual UI e ingresso offspring nel roster/party select |
| Tri-Sorgente non codificata come flusso                | reward/codex/diary/carte esistono sparsi                               | SPEC-G deve orchestrare offerte, dottrina e sedimentazione                   |
| D-CLAN non progettato/buildato                         | Godot docs lo segnano net-new                                          | Lasciare dopo lineage/tribe emergente                                        |
| TV cinematic round director assente                    | round/event log esiste, planner non dedicato                           | SPEC-D su event-log immutabile                                               |
| Real-device co-op playtest pendente                    | Godot sprint archive lo segnala                                        | Gate prima di dichiarare Nido/recruit/route production                       |

## 6. Impatto sui documenti prodotti il 5 giugno

Aggiornamenti concettuali da propagare:

1. La Campagna alla Descent va trattata come PARTIAL avanzato, non come idea.
2. Route vote va trattato come gia' chiuso su Game `origin/main` + Godot
   `origin/main`; il thread corrente Game e' vecchio e non contiene ancora quei
   commit.
3. Nido va diviso in hub mirror, debrief recruit action, mating/offspring
   device ritual, party-select mancante.
4. Custodi esportabili devono includere SKIV store, diary portable, signature,
   resync e cross-custode encounter.
5. ALIENA enforcement deve partire dai hook gia' presenti default-off.
6. ERMES deve includere exporter, role gap, runtime deltas e debrief input.
7. Epigenome/lineage/tribe emergente va portato nel flow completo.
8. VC/MBTI/Ennea/Sentience/Conviction sono gia' parte del payload phone/Godot.

## 7. Prossima azione consigliata

Prima di scrivere nuove spec lunghe, fare un reconcile mirato:

```text
SPEC-K: Godot Device-Authority Reconciliation
SPEC-L: Runtime Feature Inventory Reconcile
```

Ma con un ordine tecnico piu' preciso:

1. cercare branch/PR Lenovo o GitHub che contenga Game `route/open` e
   `route_vote` - fatto: vive su `origin/main` PR #2597;
2. prima di modificare codice Game, riallineare il branch corrente o aprire un
   branch nuovo da `origin/main`;
3. aggiornare il flow design marcando ogni surface come:
   `device input`, `TV mirror`, `host legacy`, `backend canonical`,
   `Godot client only`, `missing`;
4. poi trasformare la mappa in task implementativi.

## 8. Secondo passaggio 2026-06-06: branch skew e parita' endpoint

### 8.1 Game branch corrente vs `origin/main`

Controllo git:

- branch corrente Game: `claude/jules-test-coverage-batch-2026-06-03`;
- HEAD corrente: `7f7f99af`;
- `origin/main`: `3e2546e2`;
- `git merge-base --is-ancestor 1995276d HEAD` -> no;
- `git merge-base --is-ancestor 1995276d origin/main` -> yes.

Delta rilevante gia' su `origin/main`, non nel branch corrente:

| Commit             | Stato        | Significato                                                         |
| ------------------ | ------------ | ------------------------------------------------------------------- |
| `ef19fce0` / #2591 | LIVE on main | `recruit_candidates` accettati e broadcastati su `/coop/combat/end` |
| `1995276d` / #2597 | LIVE on main | WS route-vote phase per meta-network route choice                   |
| `3ab6aca7` / #2601 | LIVE on main | `loadEncounter` mode-aware: graph routes usano combattimenti reali  |
| `7ab8550f` / #2603 | LIVE on main | band verify graph-combat option C                                   |
| `3e2546e2` / #2605 | LIVE on main | `species_id` canonico in route encounters e reinforcement pools     |

Questo spiega perche' il controllo del branch corrente sembrava mostrare
feature mancanti. La sorgente corretta per giudicare lo stato attuale build e'
`origin/main`, non il branch documentale/test-coverage del thread.

### 8.2 Godot v2 main

Controllo git:

- repo `C:/dev/Game-Godot-v2` e' su `HEAD` detached uguale a `origin/main`;
- HEAD: `38f1031`;
- working tree pulito.

Commit Godot rilevanti gia' su main:

| Commit    | PR   | Significato                                                    |
| --------- | ---- | -------------------------------------------------------------- |
| `7e324d6` | #401 | route-choice UI fase-3                                         |
| `4dd44da` | #404 | phone route-vote consumer                                      |
| `004844a` | #413 | routed encounter roster                                        |
| `59c7801` | #417 | routed enemies carry `species_id` per recruit                  |
| `e4466ff` | #423 | MatingGeneticsFacade live consumer phone offspring ritual      |
| `b7ba46e` | #431 | canonical `species_id` in routed encounters + KO-gated recruit |

Quindi anche la nota precedente "PR #423 open" va considerata superata nel
quadro attuale: e' merged in Godot main.

### 8.3 Parita' endpoint Godot -> Game

Client Godot individuati e backend Game corrispondente:

| Godot client          | Endpoint                                                                        | Stato Game                                             |
| --------------------- | ------------------------------------------------------------------------------- | ------------------------------------------------------ |
| `lobby_api.gd`        | `/api/lobby/create`, `/join`, `/close`, `/state`, `/list`                       | presente                                               |
| `coop_api.gd`         | `/api/coop/state`, `/run/start`, `/world/vote`, `/world/confirm`, `/combat/end` | presente                                               |
| `coop_api.gd`         | `/api/coop/route/open`                                                          | presente su `origin/main`, assente nel branch corrente |
| `campaign_api.gd`     | `/api/campaign/meta-network/next`, `/advance`, `/choose`                        | presente                                               |
| `campaign_api.gd`     | `/api/campaign/godot-v2/state`                                                  | presente                                               |
| `seasonal_service.gd` | `/api/campaign/seasonal/*`                                                      | presente                                               |
| `companion_api.gd`    | `/api/companion/pick`, `/pool`                                                  | presente                                               |
| `meta_api.gd`         | `/api/meta/compat`, `/npg`, `/recruit`, `/tribes`                               | presente                                               |
| `genetics_api.gd`     | `/api/v1/lineage/*`                                                             | presente                                               |
| `nest_api.gd`         | `/api/v1/meta/nest`                                                             | presente tramite meta v1 mount                         |
| `roster_api.gd`       | `/api/campaign/roster`                                                          | presente                                               |
| `sistema_api.gd`      | `/api/campaign/sistema-state`                                                   | presente                                               |
| `aliena_api.gd`       | `/api/session/:id/aliena-telemetry`                                             | presente                                               |

Nessun altro client Godot evidente risulta "ahead of backend" come sembrava per
route vote.

### 8.4 Intent WS Godot -> Game

Intent Godot individuati:

- `onboarding_choice`;
- `character_create`;
- `form_pulse_submit`;
- `world_confirm`;
- `world_vote`;
- `mating_vote`;
- `route_vote`;
- `lineage_choice`;
- `reveal_acknowledge`;
- `next_macro`;
- `nido_start_mission`;
- `combat_action`;
- `end_turn`.

Su Game `origin/main`, `wsSession.js` drena esplicitamente tutti gli intent
lifecycle sopra, incluso `route_vote`. `combat_action`/`end_turn` seguono invece
il path combat intent generico e restano parte della riconciliazione WEGO phone
composer, non del route/Nido audit.

### 8.5 Nuovo stato corretto

Il blocco Descent/N5 va letto cosi':

1. Backend graph routing: LIVE flag-gated.
2. Backend route vote WS: LIVE su `origin/main`.
3. Godot route UI + phone consumer: LIVE su `origin/main`.
4. Godot routed encounter roster: LIVE su `origin/main`.
5. Canonical species/recruit routed enemies: LIVE su entrambi main.
6. Restano aperti: flip `META_NETWORK_ROUTING`, real-device co-op playtest,
   surface finale device-authority, e campagna graph traversal completa oltre
   MVP route.

### 8.6 Gate e flag da non confondere con assenza

| Gate / policy                  | Dove vive                                                              | Default / stato               | Lettura corretta                                                      |
| ------------------------------ | ---------------------------------------------------------------------- | ----------------------------- | --------------------------------------------------------------------- |
| `META_NETWORK_ROUTING`         | Game `campaign.js`; Godot `MainRouteChoice` gate                       | OFF finche' non viene flipato | Descent graph route shipped/gated, non assente                        |
| `NIDO_UNLOCKED`                | Game `sessionHelpers`, `coopOrchestrator`; Godot `MainNido` local gate | OFF salvo env/meta            | Nido hub shipped ma non default loop                                  |
| `policy.aliena_enforcement`    | Game `reinforcementSpawner` / `biomeSpawnBias`                         | default-OFF                   | ALIENA enforcement esiste, serve decidere quando soft-on              |
| `reinforcement_policy.enabled` | Game combat encounters                                                 | default-OFF per encounter     | Reinforcement e ALIENA spawn effects dipendono da authoring encounter |
| `mission_timer.enabled`        | Game `missionTimer`; Godot HUD hook                                    | per-encounter                 | Timer e pressione round sono feature attivabili, non globali          |
| `MUTATION_MP_ENFORCE`          | Game `mutations.js`                                                    | enforce ON salvo `false`      | Economy mutation MP e' hard gate salvo test/dev override              |
| `trainerCanonical`             | Game `companionPicker` / `worldEnricher`                               | input esplicito               | SKIV/custode canonical override, non regola generale                  |

Questa e' la griglia da usare quando aggiorniamo i documenti: ogni sistema va
classificato come `LIVE default-on`, `LIVE gated`, `LIVE client-only`,
`PARTIAL`, `DESIGN`, o `DEAD/obsolete`. La parola "mancante" va usata solo dopo
aver controllato branch, main e gate.

## 9. Terzo passaggio 2026-06-06: delta main, prove test, residui reali

### 9.1 Delta Game `HEAD..origin/main`

Il branch corrente del thread non e' il punto migliore per decidere cosa
implementare. Il delta `HEAD..origin/main` sui path backend/test contiene un
pacchetto coerente di avanzamento Descent/N5:

| Commit             | Area                      | Lettura                                                                                        |
| ------------------ | ------------------------- | ---------------------------------------------------------------------------------------------- |
| `ef19fce0` / #2591 | co-op debrief recruit     | `/api/coop/combat/end` accetta `recruit_candidates`, li salva in `run.debrief` e li broadcasta |
| `7bb56631` / #2592 | meta-network route UI     | candidate preview con `encounter_id` e terminal marker                                         |
| `efd47c5b` / #2593 | worldgen threat telegraph | metadata node-encounter e telegraph minaccia decoupled dal combat                              |
| `1995276d` / #2597 | route vote WS             | `/api/coop/route/open`, `route_choice`, `route_tally`, `route_vote`, `route_vote_accepted`     |
| `3ab6aca7` / #2601 | graph combat real fights  | `loadEncounter` mode-aware: route graph puo' caricare encounter draft reali                    |
| `7ab8550f` / #2603 | sim/balance               | band-verify option C e retune phase 3                                                          |
| `3e2546e2` / #2605 | canonical species         | route encounters e reinforcement pools portano `species_id` canonico                           |

Conclusione: il problema principale non e' "questi sistemi non esistono", ma
"il branch locale del thread e' antecedente al pacchetto main". Ogni nuova spec
o fix codice deve partire da `origin/main` o da un branch riallineato, altrimenti
rischiamo duplicazioni e diagnosi false.

### 9.2 Prove test backend gia' presenti

Test rilevanti su Game `origin/main`:

| File                                                     | Copertura osservata                                                                                                   |
| -------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `tests/api/coop-recruit-candidates.test.js`              | 10 casi: storage `recruit_candidates`, merge con debrief payload, back-compat assente/vuoto/non-array, broadcast REST |
| `tests/api/coopRouteChoiceBroadcast.test.js`             | 5 casi: broadcast `route_choice`, tally iniziale, candidati vuoti, host token mancante, run non started               |
| `tests/services/network/wsSession-routeVote.test.js`     | smoke 2 telefoni -> leader `/choose`, host non vota, disconnect rebroadcast tally                                     |
| `tests/services/network/wsSession-matingResolve.test.js` | quorum `mating_vote` -> offspring roll + broadcast `mating_resolved`                                                  |
| `tests/services/combat/encounterLoaderGraphMode.test.js` | mode graph include `encounters-draft`; static path resta invariato                                                    |
| `tests/api/sessionEncounterWiringGraphMode.test.js`      | `/session/start graph_mode:true` carica draft; senza graph mode non lo carica                                         |
| `tests/sim/scenarioEnemiesGraphMode.test.js`             | draft id produce roster reale solo con `graphMode`; live id invariato                                                 |
| `tests/services/reinforcementSpawner.test.js`            | `species_id` canonico propagato agli spawn; empty se non authorato; ALIENA telemetry default-off                      |

Questi test non sostituiscono il playtest reale multi-device, ma spostano il
residuo: non siamo davanti a "feature da scrivere", siamo davanti a "feature da
mettere sul branch giusto, flipparla e validarla con device reali".

### 9.3 Prove test Godot main gia' presenti

Test rilevanti su `C:/dev/Game-Godot-v2` main:

| File                                                | Copertura osservata                                                                                           |
| --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `tests/unit/test_phone_composer_view_route_vote.gd` | phone passa a route-vote, invia `route_vote`, blocca host-phone arbiter, aggiorna tally/status                |
| `tests/unit/test_main_route_choice.gd`              | route resolve, `/coop/route/open`, observer quorum, guard resolve-once, cleanup observer, graph-routed marker |
| `tests/unit/test_main_encounter_roster.gd`          | roster graph-routed, canonical `species_id`, nessun fallback label per species non authorata                  |
| `tests/unit/test_phone_composer_view_mating.gd`     | `mating_tally` e `mating_resolved` cache/forward su phone                                                     |
| `tests/unit/test_main_debrief_mating.gd`            | observer debrief mating, leak cleanup e no-op senza auth                                                      |
| `tests/unit/test_main_phone_offspring_mount.gd`     | mount offspring pending usa `MatingGeneticsFacade`                                                            |
| `tests/unit/test_mating_genetics_facade.gd`         | preview non-canonica, backend ops, `offspring_ready`, error path, idempotenza setup                           |
| `tests/unit/test_offspring_ritual_panel.gd`         | scelta mutation 1-3, confirm via facade, skip, emissione offspring                                            |
| `tests/unit/test_lineage_merge_service.gd`          | eredita' ferite offspring, cap FIFO, merge in CampaignState, scenario alleanza SKIV/pulverator                |
| `tests/unit/test_phone_composer_nido.gd`            | phase Nido monta phone view e non apre pannello mating/offspring fuori contesto                               |

Godot quindi e' piu' avanti di quanto risultava dal primo controllo. In
particolare il PR #423 non e' piu' aperto: `MatingGeneticsFacade` ha consumer
vivo su phone offspring ritual.

### 9.4 Parita' critica Game main <-> Godot main

| Flow                        | Game `origin/main`                                                            | Godot main                                                     | Stato                      |
| --------------------------- | ----------------------------------------------------------------------------- | -------------------------------------------------------------- | -------------------------- |
| Route choice Descent        | `/campaign/meta-network/next`, `/choose`, `/coop/route/open`, WS `route_vote` | `MainRouteChoice`, `PhoneComposerView` route vote              | LIVE gated                 |
| Graph route -> combat reale | `loadEncounter({ graphMode:true })`, draft encounters, sim tests              | routed encounter roster, graph marker                          | LIVE gated                 |
| Recruit post-combat         | `recruit_candidates` in `/coop/combat/end` e debrief payload                  | extractor/producer da combat setup + debrief recruit consumer  | LIVE, da smoke device      |
| Canonical species           | pools/encounters con `species_id`; spawner lo propaga                         | roster/recruit KO gated con `species_id` canonico              | LIVE                       |
| Mating vote -> offspring    | WS `mating_vote` quorum, `mating_resolved`                                    | phone mating view, debrief observer, offspring facade consumer | LIVE/PARTIAL per UX finale |
| Nido hub                    | unlock via meta/env, `nido_start_mission` WS, nest endpoints                  | `MainNido`, `PhoneNidoView`, Nido mode                         | LIVE gated/PARTIAL         |
| ALIENA enforcement          | spawn bias/reinforcement hooks default-off, telemetry                         | parity tests, labels hidden, surface state                     | LIVE gated                 |
| ERMES runtime               | role gap, eco pressure, world reveal/debrief payload                          | world reveal and parity surfaces                               | LIVE/PARTIAL               |

### 9.5 Residui reali dopo il controllo codice

Residui da trattare come lavoro vero:

1. **Riallineamento branch**: non proseguire codice dal branch
   `claude/jules-test-coverage-batch-2026-06-03` senza decidere se rebase/branch
   nuovo da `origin/main`.
2. **Device authority**: restano tracce legacy dove la TV/host apre o conferma
   flow (`world_confirm`, `/coop/route/open`). Da chiarire come distinzione:
   host puo' essere broadcaster tecnico, ma non giocatore ne' fonte di scelta.
3. **Flip runtime**: `META_NETWORK_ROUTING`, `NIDO_UNLOCKED`,
   `policy.aliena_enforcement`, `reinforcement_policy.enabled` e timer missione
   vanno governati per campagna/playtest, non confusi con assenza.
4. **Smoke reale multi-device**: route-vote, recruit post-combat, mating
   resolved/offspring e Nido entry devono essere provati su TV + telefoni
   Lenovo/Cloudflare.
5. **UX finale mating/offspring**: il circuito tecnico esiste, ma il documento
   deve ancora dire bene quando l'offspring entra nel roster/combat: automatico
   alla missione dopo o tramite party select dal Nido.
6. **Party select dal Nido**: roster backend e Nido mode esistono; la selezione
   party/creatura principale/social group resta da specificare e chiudere.
7. **Tri-Sorgente estesa**: reward/codex/diary/carte/decisioni dottrinali sono
   presenti a pezzi; manca l'orchestratore esplicito della scelta e della
   sedimentazione.
8. **TV cinematic round director**: event log e round loop esistono; manca il
   planner di resa piano-sequenza sopra log immutabile.
9. **Custodi esportabili generalizzati**: SKIV store e companion store danno il
   template, ma serve spec per Custode per-player/per-campagna, export, resync,
   incontri tra Custodi e rientro con informazioni.
10. **Doc Godot stale**: almeno
    `docs/godot-v2/sprint-context-archive.md` e
    `docs/godot-v2/PRD-BUILD-STATUS-GODOT-V2.md` possono ancora parlare di PR
    aperti (#413/#423), consumer dormiente o route-vote gap. Vanno corretti
    durante la pulizia documentale cross-repo, non come fix codice.

### 9.6 Nuova priorita' consigliata

Ordine consigliato da qui:

1. congelare questo audit come base di verita' tecnica;
2. aprire o usare un branch basato su Game `origin/main`;
3. SPEC-K Device Authority e' stata prodotta in
   `docs/design/evo-tactics-godot-device-authority-reconciliation.md`;
4. SPEC-L Feature/Gate Matrix e' stata prodotta in
   `docs/design/evo-tactics-runtime-feature-inventory-reconcile.md`;
5. poi solo dopo fare modifiche codice mirate: party select Nido, cinematic round
   director, Tri-Sorgente orchestrator, Custodi export/resync.
