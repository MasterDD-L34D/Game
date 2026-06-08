---
title: 'Evo-Tactics open points resolution roadmap'
date: 2026-06-05
type: resolution-roadmap
doc_status: review_needed
doc_owner: master-dd
workstream: cross-cutting
last_verified: '2026-06-07'
source_of_truth: false
language: it
review_cycle_days: 30
tags: [evo-tactics, device-driven, tv-mirror, nido, custodi, tri-sorgente, aliena, ermes, combat]
related: ADR-2026-06-07-device-authority-tv-mirror-canon
---

# Evo-Tactics open points resolution roadmap

Questo documento traduce la ricostruzione del 2026-06-05 in lavoro chiudibile.
Fa parte della suite indicizzata in:

- `docs/planning/2026-06-06-evo-tactics-reconstruction-suite-index.md`

Non sostituisce i due documenti di recupero:

- `docs/planning/2026-06-05-evo-tactics-tv-device-campaign-flow-reconstruction.md`
- `docs/planning/2026-06-05-evo-tactics-complete-game-systems-reconstruction.md`

Serve a rispondere a: cosa e' ormai deciso, cosa va specificato, e in che
ordine conviene procedere per chiudere i punti rimasti sospesi.

## 1. Baseline ratificata in chat

### 1.1 Esperienza primaria

Evo-Tactics e':

```text
device-driven / TV-mirrored co-op campaign
+ tactical WEGO combat
+ ecosystem pressure
+ Nido lineage meta-loop
+ Custodi portable memory
```

La TV e' tavolo, mirror, regia e memoria comune. Non e' un player.
Tutte le interazioni avvengono dai device.

### 1.2 Combat loop

Il combat non e' un unico round. Il ciclo corretto e':

```text
planning su device
-> preview non canonica
-> commit dai device
-> Sistema/AI policy commit
-> event-log deterministico
-> piano-sequenza TV via animation planner
-> nuovo planning
```

Il ciclo si ripete finche' non si esauriscono condizioni di vittoria,
sconfitta, ritirata, timeout o obiettivo.

### 1.3 Player, creature e gruppo sociale

In combat, 1 player controlla 1 creatura principale, salvo eccezioni:

- companion;
- evocazioni;
- simbionti;
- possessioni;
- controlli temporanei;
- carte/effetti Tri-Sorgente speciali.

Fuori combat, ogni player ha un gruppo sociale:

- creatura principale iniziale;
- creature amiche;
- compagni;
- reclute;
- partner di mating;
- offspring;
- rami di breeding;
- creature libere eleggibili come nuova principale.

### 1.4 Custodi

Skiv e' prototipo canonico, non unico template.
Custode e' il pattern generico.

Un Custode puo':

- appartenere alla campagna;
- appartenere o legarsi a un player;
- essere esportato;
- incontrare altri Custodi/Nidi;
- rientrare in campagna con informazioni nuove;
- risincronizzarsi in modo verificabile.

Il pattern di riferimento e' vicino alle pedine di Dragon's Dogma, non a un
care-sim obbligatorio.

### 1.5 Sistemi di regia

- ERMES: eco-pressure runtime leggibile, con bande, cap e telegraph diegetico.
- ALIENA: enforcement di coerenza bio-plausibile, ecologica e narrativa.
- Tri-Sorgente: reward + scelte dottrinali/narrative + sedimentazione +
  scambio carte.
- Failure-as-lore: conseguenze persistenti ma bounded, senza brickare la
  campagna.

## 2. Punti chiusi

| Punto                 | Decisione                                                       |
| --------------------- | --------------------------------------------------------------- |
| TV authority          | TV = tavolo/mirror/regia; zero input di gameplay                |
| Device authority      | Tutte le scelte e conferme avvengono dai device                 |
| Join                  | Prima slot/player identity, non Custode                         |
| Form Pulse            | Micro-scenari diegetici; slider solo MVP/debug                  |
| Combat                | Multi-round loop; ogni round ha planning/commit/piano-sequenza  |
| Event truth           | Event-log deterministico; TV animation planner non altera esito |
| Player combat control | Una creatura principale per player, con eccezioni controllate   |
| Player meta control   | Gruppo sociale per-player fuori combat                          |
| Nido                  | Hub sociale/evolutivo, non menu astratto                        |
| Tribe                 | Emergenza da lineage/Nido/scelte sociali/job                    |
| Offspring             | Entra tramite Nido/party select                                 |
| Lethal                | Default-off, mission-gated, conferma device obbligatoria        |
| Skiv                  | Prototipo canonico di Custode                                   |
| Custode export        | Vivo asincrono, risincronizzabile                               |
| ERMES                 | Runtime pilotato, bounded, leggibile                            |
| ALIENA                | Enforcement di coerenza bio-plausibile                          |
| Tri-Sorgente          | Estesa a dottrina, narrative choices, scambio carte             |

## 3. Punti ancora da specificare

Questi non sono piu' dubbi filosofici: sono spec da scrivere.

### 3.0 Controlli di riconciliazione 2026-06-06

Prima di trasformare una spec in codice, ogni ticket deve passare questi
controlli:

1. **Ground truth repo**: verificare se il sistema e' gia' live/partial/design.
2. **Cross-repo Godot**: controllare se la surface attuale e' target canonico,
   fallback offline o bridge temporaneo.
3. **Device authority**: nessun nuovo input di gameplay deve nascere dalla TV.
4. **Full-loop metric**: se il ticket tocca meta-loop/Nido/campagna, indicare
   quale metrica del full-loop runner lo misurera'.
5. **Surface gate**: engine live senza surface o report misurabile non basta.

Controlli gia' emersi:

- `data/core/species/species_catalog.json` e' il catalogo vivo v0.4.3 con 75
  specie; `data/core/species.yaml` non e' piu' fonte runtime.
- Godot `phone_nido_view.gd` e' oggi read-only e contiene wording host-driven:
  va trattato come gap di riconciliazione, non come target.
- Godot `tv_mating_panel.gd` e' invece coerente: TV mirror, vote/offspring
  guidati dai phone.
- `tools/sim/full-loop-runner.js` + `meta-band-aggregator.js` danno gia' una
  base per validare Nido, recruit, mating, roster composition e lineage
  diversity.
- Alcuni gap dei report 2026-05-06 sono oggi chiusi: `formStatApplier`,
  `formInnataTrait`, `applyJobAffinityBonus`, cost-gate SG/PP/PT, Cat F tags,
  symbiont/minion e lifecycle WS drains sono codice runtime, non design gap.
- Alcuni report recenti restano snapshot da riconciliare: H2 cost-gate in
  `design-closure` e' superato dal handoff H2 e dal codice attuale.
- I sistemi minori ma rilevanti (`senseReveal`, `telepathicReveal`,
  `rewindBuffer`, `defyEngine`, `overchargeEngine`, Codex/diary) devono entrare
  nel contratto surface/metriche quando toccano device, replay o Custodi.

### SPEC-A: Device Input Ledger

Obiettivo: formalizzare la catena:

```text
device_input_event -> scoring signal -> campaign effect
```

Deve decidere:

- schema eventi device;
- quali input sono pubblici, privati, aggregati o segreti;
- mapping verso VC/MBTI/Ennea/Conviction;
- mapping verso ERMES/ALIENA/Tri-Sorgente;
- uso in recruit, mating, Nido, Custodi e debrief;
- retention/privacy.

Output consigliato:

```text
docs/design/evo-tactics-device-input-ledger.md
```

### SPEC-B: TV/Public vs Device/Private Contract

Obiettivo: definire cosa vede la TV e cosa resta sui device.

Deve coprire:

- lobby;
- Form Pulse;
- world seed;
- route choice;
- planning combat;
- commit state;
- Nido;
- mating/recruit;
- Tri-Sorgente;
- lethal confirmation.

Regola guida:

```text
TV = intersezione pubblica + recap + regia
device = percezione, scelta, controllo e informazioni filtrate
```

Output consigliato:

```text
docs/design/evo-tactics-tv-device-information-contract.md
```

### SPEC-C: WEGO Phone Combat Composer

Obiettivo: sostituire la mentalita' "your turn/current actor" con planning
WEGO su device.

Deve coprire:

- creatura principale attiva;
- eventuali controlli extra;
- preview non canonica;
- multi-intent entro AP;
- undo/clear;
- ready/locked/waiting;
- fallback se timeout;
- differenza tra suggerire e committare;
- invio commit al backend.

Output consigliato:

```text
docs/design/evo-tactics-phone-wego-composer.md
```

### SPEC-D: TV Cinematic Round Director

Obiettivo: trasformare event-log e resolution queue in piano-sequenza.

Input:

- `resolution_queue`;
- `turn_log_entries`;
- `reactions_triggered`;
- `revealed_intents`;
- status/ferite/mutazioni;
- context ERMES/ALIENA/Tri-Sorgente.

Output:

- camera beats;
- animation beats;
- callout UI;
- battle feed sintetico;
- end-of-round recap.

Vincolo:

```text
animation planner never changes canonical outcome
```

Output consigliato:

```text
docs/design/evo-tactics-tv-cinematic-round-director.md
```

### SPEC-E: Nido Groups, Party Select and Tribe

Obiettivo: modellare il gruppo sociale per-player e il party select.

Deve coprire:

- gruppo sociale per-player;
- creatura principale attiva;
- creature libere/eleggibili;
- reclute;
- trust/affinity;
- mating/breeding;
- offspring;
- successione;
- Nido shared resources;
- nascita della tribu';
- differenza tra branco comune e gruppi sociali.

Output consigliato:

```text
docs/design/evo-tactics-nido-groups-and-tribe.md
```

### SPEC-F: Custode Portable Framework

Obiettivo: generalizzare Skiv in framework Custodi.

Deve coprire:

- Custode di campagna;
- Custode personale;
- export JSON/card/QR;
- firma e privacy whitelist;
- import/rientro;
- risincronizzazione;
- incontri asincroni con altri Custodi/Nidi;
- differenza tra Custode biologico e Custode narrativo;
- cosa puo' fare crossbreeding e cosa esporta solo memoria.

Output consigliato:

```text
docs/design/evo-tactics-custode-portable-framework.md
```

### SPEC-G: Tri-Sorgente Extended Doctrine

Obiettivo: estendere Tri-Sorgente oltre reward card.

Deve coprire:

- reward offers;
- scelte narrative;
- scelte dottrinali;
- sedimentazione decisioni;
- scambio carte;
- suggerimento vs vista vs controllo reale;
- legami con Nido, gruppo sociale e Sistema;
- sicurezza UX: niente furto agency opaco.

Output consigliato:

```text
docs/design/evo-tactics-tri-sorgente-extended-doctrine.md
```

### SPEC-H: ALIENA Enforcement and Narrative Lore

Obiettivo: promuovere ALIENA da summary/diagnostic a enforcement coerente.

Deve usare:

- `docs/planning/draft-narrative-lore.md`;
- `docs/appendici/ALIENA_documento_integrato.md`;
- enforcement design 2026-05-29;
- runtime ALIENA coherence services.

Deve coprire:

- bio-plausibility;
- ecological plausibility;
- narrative anchoring;
- tone guardrails;
- authoring gates;
- runtime soft enforcement;
- Codex/wiki surfacing.

Output consigliato:

```text
docs/design/evo-tactics-aliena-enforcement-lore.md
```

### SPEC-I: ERMES Runtime Pressure Contract

Obiettivo: chiarire come ERMES influenza il gioco senza diventare numero opaco.

Deve coprire:

- low/medium/high bands;
- role gap;
- biome pressure;
- bounded runtime modifiers;
- +/-2 combined cap;
- telegraph player-facing;
- pilot biomi/trait;
- playtest N=40 promotion gate.

Output consigliato:

```text
docs/design/evo-tactics-ermes-runtime-pressure.md
```

### SPEC-J: Lethal Consent and Wound Rituals

Obiettivo: chiudere morte, ferite gravi e consenso lethal.

Deve coprire:

- default soft-death;
- lethal mission flag;
- device confirmation;
- scar/wound tiers;
- grave wounds;
- Nido rituals;
- healing/transformation;
- succession;
- failure-as-lore.

Output consigliato:

```text
docs/design/evo-tactics-lethal-wounds-rituals.md
```

### SPEC-K: Godot Device-Authority Reconciliation

Obiettivo: riconciliare le surface esistenti Godot con la decisione TV mirror /
device input.

Deve coprire:

- quali bottoni host/TV sono dev/offline fallback;
- quali surface TV devono restare solo mirror;
- quali azioni oggi read-only su phone devono diventare input device;
- Nido phone action surface;
- party-select-from-Nido;
- recruit/mating/offspring device flow;
- lethal confirmation device flow;
- route vote e world vote device-driven;
- criteri per rimuovere o marcare ogni vecchio wording "host drives".

Output consigliato:

```text
docs/design/evo-tactics-godot-device-authority-reconciliation.md
```

Stato 2026-06-06: prodotto come documento `review_needed`:

```text
docs/design/evo-tactics-godot-device-authority-reconciliation.md
```

La SPEC-K fissa la distinzione `TV_MIRROR`, `DEVICE_INPUT`,
`HOST_TECHNICAL`, `DEV_FALLBACK` e `LEGACY_TO_REMOVE`, e produce i ticket K-01
.. K-07 per audit Godot, world confirm, route guard, Nido phone actions, next
mission quorum, wording cleanup e smoke reale multi-device.

### SPEC-L: Runtime Feature Inventory Reconcile

Obiettivo: evitare che il design lavori su snapshot vecchi e distinguere:

```text
idea/reference -> data model -> engine runtime -> player surface -> campaign loop -> metric
```

Deve coprire almeno:

- Forme runtime: `formStatApplier`, `formInnataTrait`, `applyJobAffinityBonus`;
- economy gates: SG/PP/PT, Campaign XP, PI sink;
- OQ-BOND/OQ-MINION: symbiont, shared HP pool, minion summon/command/revive;
- Cat F roll-tags e perk applicati;
- lifecycle WS drains: `world_vote`, `mating_vote`, `lineage_choice`,
  `reveal_acknowledge`, `form_pulse_submit`, `next_macro`;
- worldgen runtime: foodweb spawn, cross-events, seasonal loop, GAP-C backend;
- combat utility systems: sense reveal, telepathic reveal, rewind, defy,
  overcharge, mission timer, reinforcements;
- Codex/diary come base per Custodi esportabili e memoria per-creatura.

Output consigliato:

```text
docs/design/evo-tactics-runtime-feature-inventory-reconcile.md
```

Stato 2026-06-06: prodotto come documento `review_needed`:

```text
docs/design/evo-tactics-runtime-feature-inventory-reconcile.md
```

La SPEC-L introduce la classificazione `LIVE`, `LIVE_GATED`,
`LIVE_PARTIAL`, `CLIENT_LIVE`, `ENGINE_ONLY`, `DESIGN`, `STALE_DOC` e
`OBSOLETE`; include la matrice runtime per Forme/job/trait, economy gates,
symbiont/minion, lifecycle WS, worldgen, ERMES/ALIENA, combat utilities,
Nido/lineage/Custodi e Tri-Sorgente.

Pre-audit code-first prodotto il 2026-06-06:

```text
docs/planning/2026-06-06-game-godot-code-surface-reconcile.md
```

Questo audit aveva segnalato un branch skew su route vote (Godot v2 main con
client/surface `route_choice`/`route_tally`/`route_vote`; Game `origin/main` con
`POST /api/coop/route/open` + drain WS `route_vote`, PR #2597; il branch
documentale del thread era piu' vecchio). **Aggiornamento 2026-06-07 (currency
re-verify):** lo skew e' RISOLTO -- Game e' su `main` sincronizzato (contiene
#2597, verificato `git grep coop/route/open origin/main`) e il vecchio branch
`claude/jules-test-coverage-batch-2026-06-03` non esiste piu'. Quindi route-vote
NON va re-implementato (gia' su main) e NON resta nessun branch da riallineare.

## 3bis. Gap recuperati 2026-06-08 (harvest eng-graph + Planning/archive)

Harvest 2026-06-08 da eng-graph (corpus vault) + `docs/planning/**` + `docs/archive/**`,
git-verificato. Dettaglio + provenienza: `docs/planning/2026-06-08-spec-a-l-gap-harvest.md`.
Triage utente: tutti i cluster accettati. Pattern dominante = **Engine LIVE / Surface
DEAD** (engine gia' runtime, manca surface device/TV) -- coerente col riframe Spec A..L.

Estensioni allo scope delle spec esistenti:

| Target | Gap recuperati                                                                                                                                                                                                |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| SPEC-B | A1 info-mondo asimmetrica per-device (DESIGN); A7 mini-map diegetica TV/phone; A8 replay payload shape; B6 ERMES briefing public/private                                                                      |
| SPEC-C | B7 SG/PT gauge phone (tracker live); B8 PI-shop draft; B9 rewind button (buffer live); C2 AP+1 (verdict 1A, 5 abilita' morte); C1 status v2 Shaping/Resonance; C3 facing/rear; C4 push/ledge; C10 move-syntax |
| SPEC-D | A8 replay endpoint; A14 weather diegetic; B10 narrative ink depth (engine live); C5 sentience-tier scene complexity                                                                                           |
| SPEC-E | B1 FormEvolution surface (engine live); B2 seasonal org-phase; B3 tribe identity; B4 Nido unlock gate; B5 conviction recruit; C6 jobs expansion; C7 mating ennea 9/9; C8 beast-bond                           |
| SPEC-F | B14 Custodi portano frammenti wiki/lore                                                                                                                                                                       |
| SPEC-G | B13 MBTI/Ennea color render (palette live); C9 AI archetype voice profiles                                                                                                                                    |
| SPEC-H | B14 progressive wiki (Hades Codex) via ALIENA                                                                                                                                                                 |
| SPEC-I | A2 StressWave telegraph; A9 population tick; A13 biome-wound cross-run; B6 ERMES briefing surface                                                                                                             |
| SPEC-K | A6 biome-form landing; A10 trait-env-costs wiring; B11 difficulty profiles (engine pervasivo); B12 route weighting                                                                                            |

Verifica git puntuale residua prima di scrivere ticket "build": C3 (facing per-unit),
C6 (jobs runtime). Mechanics-depth MED (C1/C4/C10) = scope opzionale di SPEC-C, non blocking.

### SPEC-M: Onboarding Identity Flow

Obiettivo: primi ~60s device-driven (3 scelte pre-Act-0 + Form Pulse 5-swipe +
biome-form landing + social test) che seedano Forma/bioma/Custode, al posto dello
slider MVP/debug. Recupera A4/A5/A6/A12. Dipende da SPEC-A/B/K. Stato: DESIGN-ONLY.

```text
docs/design/evo-tactics-onboarding-identity-flow.md
```

### SPEC-N: Localization i18n Scaffold

Obiettivo: scaffold i18n it/en (namespace common/combat/tutorial/narrative) come
fondazione orizzontale; launch-blocker pubblico EN; basso costo. Recupera
`architecture/i18n-strategy.md`. Stato: DESIGN-ONLY.

```text
docs/design/evo-tactics-localization-i18n.md
```

### SPEC-O: Mission Template Library

Obiettivo: 6 tipi-obiettivo come template YAML (oggi 1 tunato), integrati con
SPEC-D (grammatica scene) e SPEC-I (pressione per tipo). Recupera A11. Stato: PARTIAL.

```text
docs/design/evo-tactics-mission-template-library.md
```

### SPEC-P: Failure-as-Lore Loop

Obiettivo: loop run-fail come arco narrativo persistente bounded (epilogo -> wiki/
Codex -> degrado meta-network), distinto dalla morte per-creatura (SPEC-J). Recupera
A3 (+A13/A2/B14). Dipende da SPEC-J/I/F/D. Stato: DESIGN-ONLY.

```text
docs/design/evo-tactics-failure-as-lore.md
```

## 4. Ordine consigliato

### Wave 1 - Contratti di esperienza

1. SPEC-A Device Input Ledger
2. SPEC-B TV/Public vs Device/Private Contract
3. SPEC-C WEGO Phone Combat Composer
4. SPEC-D TV Cinematic Round Director
5. SPEC-K Godot Device-Authority Reconciliation
6. SPEC-L Runtime Feature Inventory Reconcile

Motivo: senza questi, Godot rischia di implementare UI che contraddice la
visione device-driven o di ricostruire sistemi gia' live.

### Wave 2 - Meta-loop sociale

7. SPEC-E Nido Groups, Party Select and Tribe
8. SPEC-F Custode Portable Framework
9. SPEC-J Lethal Consent and Wound Rituals

Motivo: definiscono persistenza, gruppi sociali, successione e rientro Custodi.

### Wave 3 - Sistemi di significato

10. SPEC-G Tri-Sorgente Extended Doctrine
11. SPEC-H ALIENA Enforcement and Narrative Lore
12. SPEC-I ERMES Runtime Pressure Contract

Motivo: legano comportamento, dottrina, coerenza e pressione ecologica alle
scelte di campagna.

### Wave 4 - Gap recuperati 2026-06-08

Le **estensioni** (tabella sez. 3bis) si assorbono nello scope delle spec esistenti
(B/C/D/E/F/G/H/I/K) -- non riordinano le wave 1-3.

Le **nuove spec** (ordine consigliato):

13. SPEC-N Localization i18n -- orizzontale, basso costo, prima possibile.
14. SPEC-M Onboarding Identity Flow -- dopo SPEC-A/B/K.
15. SPEC-O Mission Template Library -- dopo SPEC-D/I.
16. SPEC-P Failure-as-lore -- dopo SPEC-J/I/F.

Production track (art/audio/asset) = binario separato, fuori Spec A..P (scelta triage).
Gate kill-60 applicato ai candidati Spec-M..P prima del build.

## 5. Ticket build derivabili

Quando le spec A-D+K+L sono chiuse, i primi ticket implementativi diventano:

1. Godot phone WEGO composer redesign.
2. Backend/device commit payload alignment.
3. TV cinematic director MVP from event-log.
4. Public/private state presenter.
5. Lethal confirmation device flow.
6. Godot host-driven/read-only surface audit.
7. Nido phone action surface migration.
8. Runtime inventory overlay in product docs: `LIVE/PARTIAL/DESIGN/GATED`.
9. Surface mapping per sistema gia' live: form runtime, cost gates,
   symbiont/minion, lifecycle WS drains, foodweb/cross-events, Codex/diary.
10. Drift guard: prima di aprire un ticket, check `git log -S` + `rg` sui
    simboli runtime principali.

Quando le spec E-F-J sono chiuse:

1. Nido group model.
2. Party select from player social group.
3. Custode portable schema generalization.
4. Custode import/resync route.
5. Wound ritual surface.

Quando le spec G-H-I sono chiuse:

1. Tri-Sorgente doctrine offer schema.
2. Card exchange safe UX.
3. ALIENA authoring/enforcement gate.
4. ERMES telegraph surface.
5. ERMES/ALIENA debrief integration.

Full-loop validation tickets collegati:

1. Calibrare `tools/sim/scenario-enemies.js` finche' `completion_rate` entra in
   0.40-0.70.
2. Usare roster sim con perk-job valido per far spendere il PI-sink.
3. Chiudere offspring->combat come party-select/Nido slice.
4. Aggiungere report che mappa ogni spec meta-loop alle metriche:
   `relationship_progress`, `offspring_viability`, `roster_composition`,
   `lineage_diversity`.

## 6. Acceptance criteria

Questa fase e' chiusa quando:

- i due documenti di ricostruzione non contengono piu' domande gia' ratificate;
- ogni punto sospeso ha una spec target o un ticket derivabile;
- TV/device authority e' coerente in tutti i documenti nuovi;
- nessuna nuova implementazione tratta la TV come player;
- combat viene sempre descritto come loop multi-round;
- ogni surface Godot host-driven viene marcata come fallback/dev oppure
  migrata a device-driven;
- le spec meta-loop dichiarano come saranno misurate dal full-loop runner;
- Tri-Sorgente, ALIENA, ERMES e Custodi non sono piu' sistemi laterali ma
  contratti integrati del gioco completo.
