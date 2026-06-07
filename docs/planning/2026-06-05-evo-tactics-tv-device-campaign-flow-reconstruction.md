---
title: 'Evo-Tactics TV/device campaign flow reconstruction'
date: 2026-06-05
type: reconstruction-note
doc_status: review_needed
doc_owner: master-dd
workstream: cross-cutting
last_verified: '2026-06-06'
source_of_truth: false
language: it
review_cycle_days: 30
tags: [evo-tactics, tv-mirrored, devices, campaign, descent, nido, custodi, skiv, companion, round]
---

# Evo-Tactics TV/device campaign flow reconstruction

> Documento di lavoro per ricostruire il flusso corretto senza consumare contesto in chat.
> Non sostituisce il Source of Truth; consolida memoria, planning recenti e stato codice.

## 0. Correzione importante

La lettura giusta non e':

```text
Skiv = sistema a parte
Custodi = altro sistema narrativo futuro
```

La lettura corretta e':

```text
Custode = pattern/ruolo generico di entita-companion legata alla campagna.
Skiv = forma canonica concreta di quel pattern, gia' costruita come prototipo vivente.
```

Il repo lo conferma con il naming lock Godot:

```text
Custode generic, Skiv canonical.
```

Fonte: `C:/dev/Game-Godot-v2/docs/superpowers/specs/2026-05-21-m1-godot-mirror-design.md`
linea 111.

Quindi Skiv non va trattato come deviazione laterale. Skiv e' il primo Custode/companion
portabile completamente riconoscibile: ha identita', specie, voce, diario, monitor esterno,
schema portabile, saga, lineage e ganci per crossbreeding async.

## 1. Tesi del flusso

Evo-Tactics non e' una missione tattica isolata.

E' una campagna co-op living-room / TV-mirrored alla Descent, dove:

- la TV e' tavolo, mirror, scena comune, regia e memoria condivisa;
- la TV non e' un player e non prende decisioni di gameplay;
- i device sono l'unica superficie di input: scelte, voti, draft, commit,
  conferme, Nido, mating, Tri-Sorgente e gestione creatura avvengono li';
- i player formano un branco, non un party umano astratto;
- ogni player controlla un sotto-branco assegnato, con una creatura MVP/anchor;
- la campagna avanza per nodi, scelte, missioni, debrief e Nido;
- le creature sopravvivono, mutano, si legano, muoiono, generano discendenza o vengono reclutate;
- il Sistema/Overlord ricorda;
- i Custodi danno voce, memoria, identita' e possono diventare entita' persistenti fuori dalla campagna;
- Skiv e' la forma canonica/prototipo di questa persistenza.

Loop ideale canonico gia' nel SoT:

```text
Bioma -> Ecosistema -> Missione -> Planning condivisa -> Resolve -> Debrief
-> Tri-Sorgente -> Telemetria / Identita' -> Nido / Relazioni / Recruit
-> Nuova missione
```

Fonte: `docs/core/00-SOURCE-OF-TRUTH.md` linea 1349.

## 2. La sequenza completa corretta

### Fase 1 - Join TV/device

La TV mostra una stanza e fa da tavolo condiviso. Il "host" e' tecnico
session/server-side, non un operatore che gioca. I device entrano via codice,
QR o deep link.
Il modello e' simile a Republic of Jungle/Jackbox:

- TV = tavolo/mirror condiviso;
- phone/browser = controller privato;
- room code visibile su TV;
- deep-link con `?room=CODE`;
- nome player;
- slot lobby;
- reconnect/host authority server-side.

Stato codice:

- Backend Jackbox Phase A accettato:
  `docs/adr/ADR-2026-04-20-m11-jackbox-phase-a.md`
- Phone join Godot:
  `C:/dev/Game-Godot-v2/scripts/phone/phone_lobby_join_view.gd`
- TV lobby Godot:
  `C:/dev/Game-Godot-v2/scripts/ui/lobby_view.gd`

Decisione:

- il join assegna prima player slot/nome/device identity;
- il Custode non viene scelto nel join base: puo' apparire come seed/placeholder,
  ma la rivelazione vera avviene dopo Form Pulse/world formation.

### Fase 2 - Form Pulse iniziale

All'avvio i device non fanno un quiz decorativo. Raccolgono input di forma.

L'intento ricostruito:

- ogni device riceve micro-scenari;
- il player risponde rapidamente;
- la TV mostra un radar/ripple aggregato;
- gli input producono assi comportamentali;
- questi assi alimentano MBTI/Forma, ecosistema, companion/custode bias e futuro scoring.

Assi di design presenti:

- Simbiosi / Predazione;
- Esplorativo / Cauto;
- Agile / Robusto;
- Solitario / Sciame;
- Memoria / Istinto.

Stato codice/documenti:

- Design integrated world companion:
  `C:/dev/Game-Godot-v2/docs/godot-v2/design/integrated-world-companion-plan.md`
- Visual screen bible:
  `C:/dev/Game-Godot-v2/docs/godot-v2/artstyle/visual-screen-bible.md`
- Phone form pulse attuale:
  `C:/dev/Game-Godot-v2/scripts/phone/phone_form_pulse_view.gd`
- Host form pulse attuale:
  `C:/dev/Game-Godot-v2/scripts/ui/form_pulse_host_view.gd`

Nota stato:

Il codice corrente sembra piu' ridotto rispetto al design: usa una surface piu' MBTI-like
con slider binari. La versione canonica da recuperare e' piu' diegetica: micro-scenari
e scelta situazionale.

### Fase 3 - Raccolta input continua

Il Form Pulse non finisce nella lobby. La campagna continua a osservare i player.

Fonti attuali:

- `apps/backend/services/vcScoring.js`
- `C:/dev/Game-Godot-v2/scripts/ai/vc_scoring.gd`
- `C:/dev/Game-Godot-v2/scripts/ai/vc_scoring_mbti.gd`

L'intento:

- i device raccolgono scelta, esitazione, preferenze, voti, commit, undo;
- il combat produce raw events;
- il debrief traduce eventi in forma/MBTI/Ennea/conviction/sentience;
- il Nido usa queste letture per recruit, mating, trust, affinity e Custodi.

Effetto Dwarf Fortress desiderato:

- non solo numeri;
- micro-storie emergenti;
- creature con memoria;
- relazioni e traumi;
- barks/debrief che raccontano cosa il sistema ha osservato;
- conseguenze persistenti che diventano storia del branco.

Gap:

- serve una mappa esplicita `device_input_event -> scoring signal -> campaign effect`;
- oggi scoring e debrief esistono a pezzi, ma il "continuous device input ledger" va formalizzato.

### Fase 4 - World formation sulla TV

Dopo il Join/Form Pulse, la TV mostra la nascita dell'ecosistema unico della run.

La narrativa:

- le scelte dei device non scelgono solo un menu;
- fanno emergere un bioma, un ecosistema, una pressione, un tono;
- il Sistema/Overlord prende forma;
- i Custodi/companion possono apparire come interpreti, guide o testimoni;
- la campagna riceve un seed identitario.

Fonte di flusso:

- `docs/core/00-SOURCE-OF-TRUTH.md`
- `C:/dev/Game-Godot-v2/scripts/main.gd` commenti world seed reveal
- `C:/dev/Game-Godot-v2/docs/godot-v2/artstyle/visual-screen-bible.md`

Gap:

- riunificare worldgen Game backend con presentazione Godot;
- decidere quando viene assegnato il Custode di campagna: prima del bioma, durante la genesi o dopo.

### Fase 5 - Draft creature iniziali

I player scelgono creature che diventano il nucleo del branco.

Memoria ricostruita:

- TV mostra una griglia o sheet verticale con creature/specie;
- phone sceglie;
- c'e' timer;
- c'e' una finestra di ripensamento/sostituzione;
- la sostituzione e' limitata, non un drafting infinito;
- le creature scelte diventano starter del branco.

Fonte concept:

- `docs/archive/concept-explorations/2026-04/Vertical Slice - 60s Onboarding.html`

Dettaglio recuperato:

- scena TV `GENESI / SELEZIONE SPECIE`;
- circa 7 creature candidate;
- 3 player nello slice;
- `FINESTRA DI RIPENSAMENTO`;
- `SWAP-WINDOW`;
- phone con `SWAP`.

Stato:

- questo e' concept archiviato, ma molto vicino al ricordo utente;
- va re-canonizzato in un nuovo flow document invece di restare sepolto in archive.

Gap:

- definire UX finale di timer/swap;
- definire se le creature sono scelte liberamente, draftate, assegnate dal Form Pulse, o proposte dal Custode;
- definire collisione: due player possono scegliere stessa specie? stessa creatura no, stessa specie forse si.

### Fase 6 - Sotto-branco per player

Ogni player non controlla "un personaggio". Controlla un sotto-branco assegnato.

Pattern:

- ogni player ha 1 creatura MVP/anchor;
- puo' avere 1-N creature secondarie;
- il sotto-branco ha identita' ma resta parte del branco comune;
- le decisioni individuali devono potersi combinare in piano condiviso;
- la TV deve mostrare il branco come organismo collettivo, non come quattro schermate separate.

Conseguenze di UX:

- phone mostra solo le creature del player e informazioni private;
- TV mostra tutto cio' che e' pubblico;
- MVP serve per leggibilita', camera focus, debrief e identita';
- MVP non deve impedire che creature secondarie diventino importanti.

Gap:

- schema dati esplicito `player_id -> sub_pack -> mvp_unit_id -> unit_ids`;
- UI phone planning deve gestire multi-creatura;
- debrief deve distinguere MVP tattico, MVP narrativo, creature sacrificata, recruit candidate.

### Fase 7 - Campagna alla Descent

Questo punto e' forte e documentato.

Fonte:

`C:/dev/Game-Godot-v2/docs/superpowers/specs/2026-05-21-campaign-spine-cl1-cl2-design.md`

Frase chiave:

```text
the game was meant to be a Descent-style campaign
```

Il modello include:

- scenari autoriali concatenati;
- progressione persistente;
- branching binario;
- successione generazionale;
- macro-loop stagionale;
- campaign identity reale, non `campaign_id="default"`;
- campaign definition YAML con atti, encounter, choice node e ending variants.

Stato Game backend:

- campaign store:
  `apps/backend/services/campaign/campaignStore.js`
- campaign engine:
  `apps/backend/services/campaign/campaignEngine.js`
- campaign loader:
  `apps/backend/services/campaign/campaignLoader.js`
- route campaign:
  `apps/backend/routes/campaign.js`
- definition YAML:
  `data/core/campaign/default_campaign_mvp.yaml`

Stato Godot:

- lo spec diceva che il gap storico era: engines live, loop non chiuso;
- poi i PR recenti hanno iniziato a chiuderlo con MainCampaign/MainDebrief/route choice/routed roster.

Nota narrativa:

Il SoT prescrive Fase 2 narrativa come:

```text
Sistema = Overlord persistente
Custodi named = layer sopra, non rewrite
```

Fonte: `docs/core/00-SOURCE-OF-TRUTH.md` linee 1214-1218.

### Fase 8 - Nodo/missione/route choice

La missione nasce dal nodo corrente della campagna.

Il progetto recente ha spinto verso:

- meta-network routing;
- player vote;
- route choice su phone;
- TV route tally;
- encounter roster da nodo;
- branch a 3 vie;
- completability validator;
- Atollo Obsidiana come sesto nodo.

Commit/PR recenti Game:

- #2582 meta-network live campaign routing + player-vote;
- #2584 graph topology tuning;
- #2585 meta-network expansion PR1: 3-way branch + completability validator;
- #2587 Atollo Obsidiana sixth node;
- #2589 graph-mode difficulty recalibration.

Godot:

- `C:/dev/Game-Godot-v2/scripts/main_route_choice.gd`
- `C:/dev/Game-Godot-v2/scripts/main_encounter_roster.gd`
- `C:/dev/Game-Godot-v2/docs/superpowers/plans/2026-06-03-gapc-fase3-route-choice-ui.md`
- `C:/dev/Game-Godot-v2/docs/superpowers/plans/2026-06-04-gapc-godot-routed-encounter-roster.md`

Gap:

- promuovere `META_NETWORK_ROUTING` da test-context/prod-gated a decisione owner;
- assicurare che route choice venga mostrata come scelta di branco, non menu tecnico.

### Fase 9 - Consultazione tattica

Questa e' la parte che va resa bene, perche' definisce la "vista" dello scontro.

Durante planning:

- tutti pianificano contemporaneamente;
- ogni device vede la creatura principale del player e, quando applicabile,
  companion/evocazioni/simbionti o controlli temporanei;
- preview locale indica effetto probabile delle mosse;
- preview non e' canonica;
- undo/clear non consuma risorse;
- la TV puo' mostrare intenzioni aggregate, zone di rischio, tensione, ma non deve rivelare tutto se c'e' informazione privata;
- i player possono discutere, ma non hanno ancora committato.

Fonti:

- `docs/adr/ADR-2026-04-15-round-based-combat-model.md`
- `docs/combat/round-loop.md`
- `apps/backend/services/roundOrchestrator.js`

Dettaglio canonico:

```text
preview_round deep copy
no AP/HP/roll/log consumed during preview
```

Gap:

- Godot phone combat attuale e' ancora troppo "current actor / your turn";
- va riallineato a WEGO planning/commit.

File coinvolti:

- `C:/dev/Game-Godot-v2/scripts/phone/phone_combat_view.gd`
- `C:/dev/Game-Godot-v2/scripts/session/round_orchestrator.gd`
- `apps/play/src/api.js`

### Fase 10 - Commit simultaneo

Dopo consultazione:

- ogni player committa le azioni della propria creatura attiva principale e di
  eventuali entita' controllate in quel round per effetto di companion,
  evocazioni, simbionti o regole speciali;
- AI/Sistema committa le proprie intenzioni;
- scatta un timer/lock;
- chi non committa puo' usare fallback policy;
- il backend costruisce la coda di risoluzione.

Stato backend:

- `beginRound`
- `declareIntent`
- `clearIntent`
- `declareReaction`
- `commitRound`
- `buildResolutionQueue`
- `resolveRound`
- `previewRound`

Endpoint nel bridge:

- `/round/begin-planning`
- `/declare-intent`
- `/undo-action`
- `/commit-round`
- `/resolve-round`

Fonte:

- `apps/backend/routes/sessionRoundBridge.js`

Gap:

- definire come device comunica "committed" al tavolo/TV;
- definire UI stato player: planning, ready, waiting, locked;
- modellare il commit come per-player, contenente uno o piu' micro-intent validi
  per la creatura attiva e per eventuali entita' temporaneamente controllate.

### Fase 11 - Piano sequenza TV

Questa e' la resa chiave del round.

Dopo il commit, il round non va mostrato come una lista di turni.
La TV deve trasformare la resolution queue in un piano sequenza leggibile:

- camera segue prima il movimento/innesco piu' importante;
- le azioni si concatenano;
- le reazioni interrompono in modo comprensibile;
- combo e sinergie hanno callout visivo;
- danni/status/ferite appaiono nel momento narrativo;
- il battle feed accompagna, non sostituisce la scena;
- alla fine si arriva a una nuova situazione tattica condivisa.

Stato backend:

La queue esiste gia':

- `resolution_queue`
- `turn_log_entries`
- `reactions_triggered`
- `skipped`
- `threat_preview`
- `revealed_intents`

Stato Godot:

- battle feed:
  `C:/dev/Game-Godot-v2/scripts/ui/battle_feed.gd`
- feed adapter:
  `C:/dev/Game-Godot-v2/scripts/ui/battle_feed_adapter.gd`

Gap centrale:

Manca un vero TV cinematic director:

```text
resolution_queue + turn_log_entries + reactions -> camera beats -> animation beats -> UI callouts
```

Questo e' il pezzo che deve far sentire il round come evento visto sulla TV,
non come backend log visualizzato.

Nota importante: il combat non e' un singolo round. Questo ciclo si ripete:

```text
planning su device -> preview -> commit -> piano-sequenza TV -> nuovo planning
```

finche' non si esauriscono le condizioni di vittoria, sconfitta, ritirata,
timeout o obiettivo.

### Fase 12 - Debrief, recruit, Tri-Sorgente

Alla fine dello scontro:

- TV mostra outcome, MVP, ferite, lineage, barks, Sistema/Custode memory;
- phone mostra scelte private o semi-private;
- creature sconfitte possono diventare recruit candidates;
- Tri-Sorgente offre progressione a carte/identita';
- scoring MBTI/Forma/Ennea/conviction aggiorna la lettura del player;
- il Nido riceve nuovi ingressi o conseguenze.

Stato codice:

- Backend debrief:
  `apps/backend/routes/session.js`
- Godot debrief:
  `C:/dev/Game-Godot-v2/scripts/main_debrief.gd`
- Combat end coop:
  `C:/dev/Game-Godot-v2/scripts/main_coop_combat_end.gd`
- Debrief recruit producer:
  `C:/dev/Game-Godot-v2/docs/godot-v2/sprints/handoff-2026-06-03-debrief-recruit-producer.md`

Recruit recente:

```text
combat end host -> recruit_candidates -> /api/coop/combat/end
-> debrief_payload -> phone compatibility/recruit -> /api/v1/meta/recruit -> Nido
```

Fonte: `C:/dev/Game-Godot-v2/docs/godot-v2/sprints/handoff-2026-06-03-debrief-recruit-producer.md`

Tri-Sorgente:

- ponte tra bioma, comportamento in run e identita';
- se si saltano le tre opzioni, conversione in frammenti genetici;
- deve connettere run, player identity e Nido;
- non deve restare solo reward-card post-scontro;
- deve includere scelte narrative/dottrinali e sedimentazione delle decisioni;
- include il futuro sistema di "scambio carte" come meccanica di informazione,
  influenza, memoria condivisa o dottrina, non come gimmick isolato.

Fonte: `docs/core/00-SOURCE-OF-TRUTH.md` sezione 20.

### Fase 13 - Nido e prosecuzione, non finale

Questo punto NON e' "fine partita".

E' il passaggio da missione a vita di campagna.

Nel Nido:

- il branco riposa o si riorganizza;
- recruit entrano nel roster;
- trust/affinity cambiano;
- mating e breeding possono avvenire;
- offspring vengono generati;
- ferite e mutazioni si propagano;
- bond persistono;
- lineage diventa storia;
- il Custode ricorda e commenta;
- le risorse PE/PI/SG/PP/PT o loro equivalenti vengono spese;
- il player sceglie o vota il prossimo nodo;
- il campaign graph avanza;
- la prossima missione viene costruita con roster e conseguenze reali.

Stato recente Game:

Il full-loop runner ha gia' dimostrato il ciclo:

```text
campagna -> combat REALE -> advance(esito vero) -> Nido recruit -> choose -> completed
```

Fonte: `docs/planning/2026-06-02-full-loop-build-handoff.md`

Moduli sim attuali:

- `tools/sim/combat-policy.js`
- `tools/sim/combat-adapter.js`
- `tools/sim/campaign-driver.js`
- `tools/sim/full-loop-invariants.js`
- `tools/sim/greedy-policy.js`
- `tools/sim/mbti-policy.js`
- `tools/sim/species-roles.js`
- `tools/sim/recruit-resolver.js`
- `tools/sim/nido-economy.js`
- `tools/sim/scenario-enemies.js`
- `tools/sim/meta-band-aggregator.js`
- `tools/sim/full-loop-batch.js`
- `tools/sim/meta-network-driver.js`

PR importanti:

- #2562 full-loop runner MVP: real combat joins campaign chain;
- #2563 Nido meta-step recruit;
- #2565 recruits fight next mission via faithful stats;
- #2566 Nido economy + breeding;
- #2568 band metrics aggregator + batch runner;
- #2569 mbtiPolicy;
- #2572 routing harness;
- #2573 roster composition;
- #2574 PI sink;
- #2579 lineage diversity policy-sensitive;
- #2580 lineage diversity gate + bands;
- #2589 graph-mode difficulty recalibration.

Gap ancora aperti o owner-gated:

- offspring->combat non completamente chiuso nel handoff fase2;
- routing prod-enable e' decisione data-driven;
- calibrazione difficulty bands;
- roster perk-job per PI sink;
- surface Godot/TV deve raggiungere il runner.

## 3. Custodi, Companion e Skiv

### 3.1 Definizioni operative

Custode:

- entita-companion assegnabile alla campagna o al player;
- interpreta eventi;
- parla nel debrief/cronaca;
- porta memoria;
- puo' avere forma/specie/voce;
- puo' essere generato dal bioma/Forma/ecosistema;
- puo' diventare esportabile in futuro.

Skiv:

- Custode/companion canonico;
- `Arenavenator vagans`, `dune_stalker`, savana;
- forma INTP circa 76%;
- voce prima persona, "allenatore", metafore desertiche;
- saga esportabile;
- monitor esterno;
- prototipo di entita' che vive anche fuori dalla campagna.

Sistema/Overlord:

- entita persistente antagonista/regista;
- ricorda minacce, kill, pattern;
- in Fase 2 narrativa rimane come Overlord mentre i Custodi named si aggiungono sopra.

### 3.2 Perche' Skiv e' una forma possibile dei Custodi

Tre fonti si incastrano:

1. Godot M1 dice: Custode generic, Skiv canonical.
2. SoT dice: Fase 2 narrativa = Sistema Overlord + 2-4 Custodi named.
3. Skiv docs dicono: Skiv e' creatura canonica, recap-card, monitor, saga, companion portabile.

Sintesi:

```text
Skiv dimostra come puo' funzionare un Custode quando smette di essere solo voce
e diventa una creatura-identita' persistente.
```

Non tutti i Custodi devono essere Skiv.
Ma Skiv definisce il primo standard:

- identity card;
- voice rules;
- lifecycle;
- diary;
- lineage;
- export;
- external monitor;
- cross-player ambassador.

### 3.3 Il concetto "Tamagotchi ma non Tamagotchi"

La ricerca del 2026-04-27 e' chiara:

```text
non Tamagotchi 1996
pattern target = async creature-ambassador
```

Fonte:

- `docs/reports/2026-04-27-stat-hybrid-tamagotchi-companion-research.md`
- `docs/reports/2026-04-27-skiv-portable-companion-research-summary.md`
- `docs/adr/ADR-2026-04-27-skiv-portable-companion-crossbreeding.md`

Il punto non era fare un pet da nutrire ogni giorno.

Il punto era:

- racconto di vita portabile;
- identita persistente cross-campagna/cross-device;
- card/QR/JSON;
- lineage_id come stemma di famiglia;
- diary entries;
- mutations;
- MBTI/Forma;
- thought cabinet;
- crossbreeding async;
- ambassador che puo' entrare nel Nido di un altro player.
- risincronizzazione futura: un Custode puo' uscire dalla campagna, incontrare
  altri Custodi o Nidi, raccogliere informazioni/relazioni verificabili e poi
  tornare nella campagna portando memoria nuova.

Pattern reference recuperati:

- Pokemon HOME: identita persistente cross-game, non care simulation;
- Dragon's Dogma pawn system: companion asincrono che visita altri mondi e
  ritorna con esperienza/informazioni;
- Spore Sporepedia: recipe/creature condivisibile, appare nel mondo altrui;
- CK3 DNA string: lignaggio portabile e trasmissibile;
- Wildermyth legacy: personaggio porta scars, trasformazioni e storia;
- Pikmin Bloom: companion registra comportamento reale, non solo stats.

### 3.4 Cosa fa un Custode estratto dalla campagna

Futuro desiderato:

```text
campagna -> Custode/companion maturo -> estrazione -> entita portabile
```

Un Custode estratto dovrebbe diventare:

- una card leggibile fuori dal gioco;
- un JSON firmato;
- una URL/QR condivisibile;
- una presenza in dashboard;
- una memoria consultabile;
- un ambassador importabile;
- una pedina/companion asincrona che puo' rientrare in campagna dopo incontri
  esterni verificati;
- eventualmente un genitore async per crossbreeding;
- non una copia generica, ma quella stessa entita' con storia verificabile.

Non dovrebbe:

- perdere identita';
- diventare solo cosmetic;
- richiedere feeding/sleep/cleaning obbligatorio;
- crescere fuori campagna senza eventi di gioco;
- esportare dati privati o effimeri come session_id/hp_current.

### 3.5 Stato codice Skiv fuori gioco

Gia' vivo:

- `GET /api/skiv/status`
- `GET /api/skiv/feed`
- `GET /api/skiv/card`
- `POST /api/skiv/webhook`

Fonte:

- `apps/backend/routes/skiv.js`
- `docs/integrations/swarm-skiv-feed.md`
- `tools/py/skiv_monitor.py`
- `.github/workflows/skiv-monitor.yml`

Swarm UI:

```text
Game backend :3334 -> Swarm UI :5000
/api/skiv/status
/api/skiv/feed
/api/skiv/card
polling 10s
```

Questo prova che il concetto "vive fuori dal gioco" non e' solo desiderio:
Skiv ha gia' una presenza leggibile da dashboard esterna.

### 3.6 Stato codice companion portabile

Gia' presente:

- `apps/backend/services/skiv/companionStateStore.js`
- schema v0.2.0;
- whitelist privacy;
- `lineage_id`;
- `companion_card_signature`;
- `crossbreed_history`;
- `voice_diary_portable`;
- `share_url`;
- cap 10 ambassador per Nido;
- migration legacy;
- store in-memory + optional Prisma delegate.

Stato route:

Le route live `routes/skiv.js` oggi espongono soprattutto monitor/status/feed/card/webhook.
Il companionStateStore mostra che Phase 1 schema/persistence esiste, ma le route complete
crossbreed/share pubbliche del piano S1 polish non risultano tutte esposte nello stesso file.

Quindi:

```text
Skiv monitor = live.
Skiv portable schema/store = parzialmente live.
Skiv full share/crossbreed UX = pianificato/parziale, da verificare e completare.
```

## 4. Come riconciliare Custodi named e companion generativi

Modello proposto:

### Livello A - Custode voce

Il Custode e' una voce/grammar che commenta:

- outcome;
- lineage;
- mutation inherited;
- bond formed;
- Sistema remembers;
- fallen/trauma futuri.

File:

- `C:/dev/Game-Godot-v2/scripts/narrative/custode_voice_engine.gd`
- `C:/dev/Game-Godot-v2/data/narrative/custode_grammar.json`

### Livello B - Custode entita di campagna

Il Custode ha:

- id;
- nome;
- forma/specie o maschera;
- bioma;
- voce;
- relationship con player/branco;
- memoria eventi;
- role in campagna;
- eventuali skills narrative.

Questo e' il livello "2-4 Custodi named" del SoT.

### Livello C - Custode companion

Il Custode diventa superficie interattiva:

- appare su phone;
- parla in debrief;
- consiglia o reagisce;
- conserva diary;
- puo' essere scelto/assegnato;
- puo' diventare MVP narrativo della campagna.

Skiv e' qui gia' molto avanti.

### Livello D - Custode estratto

Il Custode puo' uscire dalla campagna:

- card;
- QR;
- JSON;
- dashboard;
- share-safe fields;
- lineage;
- ambassador/crossbreed;
- import in un altro Nido.

Questo e' il vero "Tamagotchi-like" riletto correttamente:

```text
non pet-care, ma creatura-memoria portabile.
```

## 5. Stato cross-repo

### Game

Backend e simulazione sono molto avanti:

- campaign engine;
- round orchestrator;
- debrief backend;
- meta/Nido/recruit/mating;
- Skiv monitor;
- Skiv portable schema;
- full-loop runner;
- meta-network routing;
- band metrics;
- MBTI policy;
- lineage diversity.

Branch locale letto:

```text
claude/jules-test-coverage-batch-2026-06-03
```

Ultimi commit rilevanti:

- #2589 graph-mode difficulty recalibration;
- #2587 Atollo Obsidiana sixth node;
- #2585 3-way branch + completability validator;
- #2582 live campaign routing + player-vote;
- #2580 lineage_diversity gate;
- #2579 lineage_diversity policy-sensitive;
- #2576 difficulty/economy flow;
- #2574 PI sink;
- #2573 roster_composition;
- #2572 meta-network driver;
- #2569 mbtiPolicy;
- #2568 band metrics;
- #2566 Nido economy + breeding;
- #2565 recruits fight next mission;
- #2562 real combat joins campaign chain.

### Game-Godot-v2

Godot e' la surface TV/phone in recupero:

- lobby phone/TV;
- form pulse;
- route choice;
- routed encounter roster;
- species_id canonical for enemies/recruit;
- debrief recruit producer;
- mating genetics facade;
- phone offspring ritual;
- Custode voice;
- lineage/bond specs;
- battle feed.

Branch locale letto:

```text
chore/jules-godot-root-doccomments-1
```

Commit/PR rilevanti:

- #431 canonical species_id in routed encounters + KO-gated recruit;
- #423 MatingGeneticsFacade live consumer phone offspring ritual;
- #417 routed enemies recruitable canonical species_id passthrough;
- #413 Godot routed encounter roster.

### CodemasterDD AI Station

Questo repo e' governance/coordination.
Per questa ricostruzione conta come mappa cross-repo, non come runtime primario.

## 6. Gap principali da trasformare in lavoro

### Gap 1 - Documento canonico di flow

Questo file e' review_needed.
Dopo review Eduardo, va promosso o spezzato in:

- flow canonico TV/device;
- spec round cinematic director;
- spec Custodi/Skiv portable;
- spec Nido continuation.

### Gap 2 - TV cinematic director

Manca il layer:

```text
round queue -> cinematic beats -> camera/animation/UI
```

Questo e' essenziale per la resa "piano sequenza".

### Gap 3 - Phone combat WEGO

Il phone combat attuale va spostato da turn-like a:

- sotto-branco;
- planning;
- preview;
- commit;
- undo;
- ready;
- private/public info.

### Gap 4 - Draft creature timer/swap

La vertical slice va recuperata e resa canonica o esplicitamente rifiutata.
Il ricordo utente la conferma: timer + possibilita' di sostituzione sono importanti.

### Gap 5 - Skiv/Custodi schema comune

Serve un contratto dati comune:

```text
custode_id
custode_kind
campaign_id
owner_player_id?
species_id?
biome_id
voice_profile
memory_log
portable_state?
lineage_id?
share_signature?
```

Skiv puo' restare canonical override, ma il sistema deve permettere altri Custodi.

### Gap 6 - Estrazione Custode

Da progettare:

- quando un Custode puo' essere estratto;
- chi lo possiede;
- cosa entra nel JSON;
- cosa resta server-side;
- come si importa;
- cosa succede in un altro Nido;
- se puo' generare offspring/ambassador.

### Gap 7 - Nido surface completa

Backend/sim dimostrano il loop.
Manca ancora la surface completa TV/phone:

- recruit review;
- mating vote/ritual;
- offspring reveal;
- lineage tree;
- route choice;
- Custode comments;
- next mission setup.

Controllo cross-repo 2026-06-06:

- il `host drives` storico e' linguaggio SPEC-K segnalato per il ritiro, non lo
  stato attuale dei file live;
- `C:/dev/Game-Godot-v2/scripts/phone/phone_nido_view.gd` afferma gia' che le
  azioni Nido appartengono ai device connessi e che la view resta mirror
  read-only in attesa delle action tab K-04;
- `C:/dev/Game-Godot-v2/scripts/ui/nido_hub_view.gd` e' una TV hub view
  read-only/render, coerente col target TV mirror.

Riconciliazione target:

- nel prodotto finale la TV resta mirror/recap/regia del Nido;
- recruit, mating, party select, rituali, conferme lethal e Tri-Sorgente devono
  essere guidati dai device;
- eventuali bottoni host/TV rimangono solo dev/offline fallback o transizione
  tecnica da rimuovere/riclassificare nella spec device authority.

## 7. Decisioni aggiornate dopo review Eduardo

Questa sezione sostituisce la prima lista di domande aperte. Alcuni punti sono
ora working-decision, altri restano da specificare.

1. TV/device authority

   Decisione: la TV e' tavolo/mirror/regia/memoria. Non e' un player e non
   interagisce con il gioco. Tutti gli input avvengono dai device.

2. Join

   Decisione: il join assegna player slot/nome/device identity. Il Custode puo'
   essere accennato come seed, ma non e' la scelta primaria del join.

3. Custode campagna/player

   Working model: possono coesistere Custode di campagna e Custodi/companion
   personali. Skiv resta canonical trainer/prototipo; altri Custodi possono
   essere generativi.

4. Estrazione Custode

   Decisione: l'estratto e' vivo in modo asincrono e verificabile, non un
   pet-care obbligatorio. Puo' uscire, incontrare altri Custodi/Nidi, tornare
   con informazioni nuove e risincronizzarsi con la campagna.

   Trigger ancora da specificare: fine atto, morte/successione, milestone Nido,
   campagna completata, rituale scelto dai player.

5. Crossbreeding async

   Proposta ancora valida: solo per Custodi con `species_id`/lineage biologico.
   Custodi puramente narrativi esportano dossier/memoria, non genetica.

6. Combat control model

   Decisione: in combat 1 player controlla 1 creatura principale, salvo
   companion, evocazioni, simbionti, possessioni o altri controlli speciali.
   Fuori combat ogni player gestisce un gruppo sociale: creatura principale,
   amici, compagni, reclute, mating, breeding e lineage.

7. Device private info

   Decisione di principio: la TV mostra intersezione/recap pubblico. I device
   possono filtrare per sensi, cognizione, relazioni, ruolo e creatura. Resta da
   specificare il contratto esatto dei campi pubblici/privati.

8. Round piano-sequenza

   Decisione: backend/event-log deterministico; la regia TV puo' essere
   local-only, ma deve derivare dagli eventi canonici e non alterare l'esito.

9. Lethal missions

   Decisione ratificata: default-off, mission-gated, conferma obbligatoria dal
   device del player coinvolto.

10. Tri-Sorgente e scambio carte

Decisione: Tri-Sorgente va estesa oltre le reward card. Include scelte
narrative/dottrinali, sedimentazione e lo "scambio carte" come meccanica di
informazione/influenza/memoria condivisa.

## 8. Prossima azione consigliata

Non partire subito da codice.

Prima chiudere una mini-review su questo documento:

1. Eduardo corregge termini/visioni sbagliate.
2. Segnare `ACCEPTED_WORKING_FLOW` o lasciare `review_needed`.
3. Da qui estrarre tre ticket build:
   - TV cinematic director;
   - phone WEGO planning/commit;
   - Custodi portable schema generalizzato da Skiv.
4. Aggiungere un ticket di riconciliazione Godot: sostituire le surface Nido
   host-driven/read-only con device-driven actions + TV mirror.

## 9. Fonti principali

Game:

- `docs/core/00-SOURCE-OF-TRUTH.md`
- `docs/adr/ADR-2026-04-15-round-based-combat-model.md`
- `docs/combat/round-loop.md`
- `docs/adr/ADR-2026-04-27-skiv-portable-companion-crossbreeding.md`
- `docs/reports/2026-04-27-stat-hybrid-tamagotchi-companion-research.md`
- `docs/reports/2026-04-27-skiv-portable-companion-research-summary.md`
- `docs/design/2026-04-27-skiv-companion-worldgen-integration.md`
- `docs/skiv/CANONICAL.md`
- `docs/integrations/swarm-skiv-feed.md`
- `docs/planning/2026-06-02-full-loop-build-handoff.md`
- `docs/planning/2026-06-02-full-loop-fase2-handoff.md`
- `apps/backend/services/roundOrchestrator.js`
- `apps/backend/routes/sessionRoundBridge.js`
- `apps/backend/routes/skiv.js`
- `apps/backend/services/skiv/companionStateStore.js`
- `apps/backend/routes/meta.js`

Game-Godot-v2:

- `C:/dev/Game-Godot-v2/docs/superpowers/specs/2026-05-21-campaign-spine-cl1-cl2-design.md`
- `C:/dev/Game-Godot-v2/docs/superpowers/specs/2026-05-21-m1-godot-mirror-design.md`
- `C:/dev/Game-Godot-v2/docs/superpowers/specs/2026-05-20-named-mutations-l3-wildermyth-design.md`
- `C:/dev/Game-Godot-v2/docs/superpowers/specs/2026-05-20-bond-engine-l4-xcom-design.md`
- `C:/dev/Game-Godot-v2/docs/godot-v2/sprints/handoff-2026-06-03-debrief-recruit-producer.md`
- `C:/dev/Game-Godot-v2/docs/godot-v2/sprints/handoff-2026-06-03-enemy-creatures.md`
- `C:/dev/Game-Godot-v2/scripts/phone/phone_lobby_join_view.gd`
- `C:/dev/Game-Godot-v2/scripts/phone/phone_combat_view.gd`
- `C:/dev/Game-Godot-v2/scripts/main_debrief.gd`
- `C:/dev/Game-Godot-v2/scripts/main_route_choice.gd`
- `C:/dev/Game-Godot-v2/scripts/main_encounter_roster.gd`
- `C:/dev/Game-Godot-v2/scripts/narrative/custode_voice_engine.gd`
