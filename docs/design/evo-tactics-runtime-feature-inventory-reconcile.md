---
title: 'Evo-Tactics Runtime Feature Inventory Reconcile'
date: 2026-06-06
type: design-spec
doc_status: active
doc_owner: master-dd
workstream: flow
last_verified: '2026-06-10'
source_of_truth: false
language: it
review_cycle_days: 30
tags: [evo-tactics, runtime-inventory, feature-gates, reconcile, live-partial-design]
related: ADR-2026-06-07-device-authority-tv-mirror-canon
---

# Evo-Tactics Runtime Feature Inventory Reconcile

## 1. Scopo

Questa SPEC-L evita che design, planning e ticket lavorino su snapshot vecchi.

Ogni sistema deve essere classificato lungo questa catena:

```text
idea/reference -> data model -> engine runtime -> player surface -> campaign loop -> metric
```

Una feature non e' "mancante" solo perche' non e' visibile nella UI finale. Puo'
essere:

- codice live senza surface;
- codice live ma gated;
- codice live su `origin/main` ma assente nel branch locale;
- surface Godot pronta ma backend branch non riallineato;
- design deciso ma non implementato;
- snapshot/documento storico superato.

La classificazione corretta guida il prossimo lavoro.

## 2. Stati

| Stato          | Significato                                            | Azione tipica                     |
| -------------- | ------------------------------------------------------ | --------------------------------- |
| `LIVE`         | Runtime + test presenti nel branch corretto            | integrare surface/metric o usare  |
| `LIVE_GATED`   | Runtime presente ma dietro flag/env/policy             | decidere flip, playtest, rollback |
| `LIVE_PARTIAL` | Engine o surface presenti, ma loop prodotto incompleto | completare wiring/UX/metric       |
| `CLIENT_LIVE`  | Godot/client presente; backend o branch da allineare   | verificare Game `origin/main`     |
| `ENGINE_ONLY`  | Backend/helper live, nessuna surface o solo test       | definire prodotto/surface         |
| `DESIGN`       | Decisione/documento, nessun runtime chiaro             | scrivere ticket build             |
| `STALE_DOC`    | Documento o wording superato dal codice/main           | bonifica doc                      |
| `OBSOLETE`     | Da non usare come base                                 | linkare sostituto                 |

Regola:

```text
prima rg/git log/test; poi design; poi codice
```

## 3. Gate e branch da controllare sempre

| Gate / branch                  | Lettura                                                                                                                                                         |
| ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Game `origin/main`             | base corretta per giudicare route-vote, graph combat, recruit candidates, canonical species                                                                     |
| Game `main` (sync 2026-06-07)  | RISOLTO 2026-06-07: il vecchio branch `claude/jules-test-coverage-batch-2026-06-03` non esiste piu'; `main` contiene route-vote/#2597. Nessun realign pendente. |
| `META_NETWORK_ROUTING`         | graph route Descent live ma owner-gated                                                                                                                         |
| `NIDO_UNLOCKED`                | Nido hub live ma non default loop                                                                                                                               |
| `policy.aliena_enforcement`    | ALIENA enforcement presente ma default-off                                                                                                                      |
| `reinforcement_policy.enabled` | reinforcements per encounter, non globali                                                                                                                       |
| `mission_timer.enabled`        | timer missione per encounter                                                                                                                                    |
| `MUTATION_MP_ENFORCE`          | economy mutation MP enforce ON salvo override esplicito                                                                                                         |

## 4. Feature inventory

### 4.1 Forme, jobs, trait runtime

| Sistema                    | Stato          | Evidenza                                                                                   | Surface                               | Prossima azione                                  |
| -------------------------- | -------------- | ------------------------------------------------------------------------------------------ | ------------------------------------- | ------------------------------------------------ |
| Form stat runtime          | `LIVE`         | `apps/backend/services/forms/formStatApplier.js`, `tests/services/formStatApplier.test.js` | backend/session, Godot riceve payload | non trattare come gap; documentare in flow Forme |
| Form innate trait          | `LIVE`         | `apps/backend/services/forms/formInnataTrait.js`, `tests/services/formInnataTrait.test.js` | backend trait grant                   | collegare a Device Input Ledger                  |
| Job affinity bonus         | `LIVE`         | `applyJobAffinityBonus` in `formStatApplier.js`                                            | backend combat/progression            | includere in matrice Forme/Job                   |
| Jobs loader/perks          | `LIVE`         | `apps/backend/services/jobsLoader.js`, `tests/api/jobs*.test.js`                           | backend progression                   | surface Godot da verificare per scelta/lettura   |
| Cat F roll-tags/perk apply | `LIVE_PARTIAL` | test progression/category reachability + progression apply                                 | backend first, surface sparsa         | mappare a UI perk/trait                          |
| Trait effects biome/cost   | `LIVE`         | `apps/backend/services/traitEffects.js`, route/session tests                               | backend runtime                       | legare a ERMES/ALIENA telegraph                  |

Decisione:

Forme, job e trait non sono solo dati. Sono gia' runtime. Le nuove spec devono
parlare di surface, metriche e authoring, non di "costruire il sistema da zero".

### 4.2 Economy gates

| Sistema             | Stato          | Evidenza                                                                                                                           | Surface                 | Prossima azione                                   |
| ------------------- | -------------- | ---------------------------------------------------------------------------------------------------------------------------------- | ----------------------- | ------------------------------------------------- |
| SG tracker          | `LIVE`         | `tests/api/sgTracker.test.js`, economy docs                                                                                        | combat/session          | verificare Godot HUD completo                     |
| Overcharge          | `LIVE`         | `apps/backend/services/combat/overchargeEngine.js`, `tests/services/overchargeEngine.test.js`, `tests/api/overchargeRoute.test.js` | combat verb/API         | bilanciare e mostrare come AP extension esplicita |
| Defy                | `LIVE`         | `apps/backend/services/combat/defyEngine.js`, `tests/services/defyEngine.test.js`, Godot `defy_engine.gd`                          | backend + Godot utility | surface player-facing e tutorial                  |
| PT/PP/SG cost gates | `LIVE_PARTIAL` | mutations/cost tests, docs economy                                                                                                 | backend + partial UI    | consolidare in SPEC-L follow-up table             |
| Campaign XP         | `LIVE`         | progression/campaign XP tests, `xpBudget.js`                                                                                       | backend progression     | legare a Nido/party growth                        |
| PI sink             | `LIVE_PARTIAL` | `tests/scripts/test_pi_shop_simulate.py`, economy planning                                                                         | sim/tooling             | serve surface prodotto e metric                   |
| Mutation MP enforce | `LIVE_GATED`   | `MUTATION_MP_ENFORCE` in mutations routes                                                                                          | backend hard gate       | documentare override dev/test                     |

Decisione:

H2/economy non va piu' letto come buco generico. Esistono gate e runtime; il
residuo e' visibilita', bilanciamento e loop Nido/campagna.

### 4.3 OQ-BOND, symbiont, minion

| Sistema                 | Stato          | Evidenza                                                                                         | Surface              | Prossima azione                   |
| ----------------------- | -------------- | ------------------------------------------------------------------------------------------------ | -------------------- | --------------------------------- |
| Symbiont bond redirect  | `LIVE`         | `apps/backend/services/combat/symbiontBond.js`, `tests/progression/symbiontBondRedirect.test.js` | backend combat       | surface leggibile in combat feed  |
| Symbiont shared HP pool | `LIVE`         | `tests/progression/symbiontSharedHpPool.test.js`                                                 | backend combat       | chiarire UX danno condiviso       |
| Symbiont support/heal   | `LIVE_PARTIAL` | `tests/progression/symbiontBondSupport.test.js`, ability executor hooks                          | backend              | surface e tuning                  |
| Minion summon           | `LIVE`         | `abilityExecutor.js`, `tests/progression/minionSummonSpike.test.js`                              | backend combat       | Godot command/visual              |
| Pack command            | `LIVE`         | `tests/progression/packCommand.test.js`                                                          | backend combat       | phone combat composer             |
| Minion buffs            | `LIVE`         | `tests/progression/minionSummonBuffs.test.js`                                                    | backend perk runtime | UI perk/status                    |
| Minion resurrect        | `LIVE`         | `apps/backend/services/combat/minionRuntime.js`, `tests/progression/minionResurrect.test.js`     | end-round backend    | event-log/TV render               |
| Minion proximity damage | `LIVE`         | `tests/progression/minionProximityDmg.test.js`                                                   | backend combat       | documentare L-069 geometry ruling |

Decisione:

Questi sistemi sono gia' una risposta alla domanda "1 player = 1 creatura +
eccezioni". Le eccezioni sono runtime reali: companion/minion/symbiont vanno
governati dal WEGO phone composer e dalla resa TV.

### 4.4 Lifecycle WS e device intents

| Intent               | Stato Game            | Stato Godot    | Prossima azione                                                         |
| -------------------- | --------------------- | -------------- | ----------------------------------------------------------------------- |
| `world_vote`         | `LIVE`                | `LIVE`         | migrarlo da accept/reject a contratto world/route piu' ricco dove serve |
| `route_vote`         | `LIVE` su Game `main` | `LIVE`         | smoke device multi-device (skew branch RISOLTO 2026-06-07)              |
| `mating_vote`        | `LIVE`                | `LIVE`         | collegare identity ledger formula-later                                 |
| `lineage_choice`     | `LIVE`                | `LIVE`         | chiarire Nido/lineage ritual ownership                                  |
| `reveal_acknowledge` | `LIVE`                | `LIVE`         | tenere come device read/ack signal                                      |
| `form_pulse_submit`  | `LIVE`                | `LIVE`         | promuovere a Device Input Ledger                                        |
| `next_macro`         | `LIVE_PARTIAL`        | `LIVE_PARTIAL` | host-gated legacy: SPEC-K/K-05                                          |
| `nido_start_mission` | `LIVE_GATED`          | `LIVE_GATED`   | host-gated + loop parziale: migrare a quorum/ready device               |
| `combat_action`      | `LIVE_PARTIAL`        | `LIVE_PARTIAL` | SPEC-C WEGO composer                                                    |
| `end_turn`           | `LIVE_PARTIAL`        | `LIVE_PARTIAL` | SPEC-C WEGO composer                                                    |

Evidenza:

- `apps/backend/services/network/wsSession.js`
- `apps/backend/services/coop/coopOrchestrator.js`
- `tests/services/network/wsSession-*.test.js`
- `C:/dev/Game-Godot-v2/tests/unit/test_phone_composer_view*.gd`

Decisione:

La pipeline device intent esiste. Il lavoro e' distinguere quali intent sono
gia' product-ready e quali sono ancora host legacy o partial.

### 4.5 Worldgen, Descent, ERMES, ALIENA

| Sistema                    | Stato          | Evidenza                                                                                                                                               | Surface                       | Prossima azione                        |
| -------------------------- | -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------- | -------------------------------------- |
| Meta-network graph routing | `LIVE_GATED`   | `metaNetworkRouting.js`, resolver/completability tests                                                                                                 | campaign API + Godot route UI | flip `META_NETWORK_ROUTING` dopo smoke |
| Graph route real combat    | `LIVE_GATED`   | Game #2601/#2603 on `origin/main`, encounter loader graphMode tests                                                                                    | Godot routed roster           | branch alignment                       |
| Foodweb spawn filter       | `LIVE`         | `worldgen/foodwebFilter.js`, reinforcement tests                                                                                                       | backend spawn behavior        | telegraph ERMES/ALIENA                 |
| Cross-event pressure       | `LIVE`         | `worldgen/crossEventEngine.js`, tests                                                                                                                  | session pressure              | surface debrief/world reveal           |
| Seasonal loop              | `LIVE_PARTIAL` | `seasonalEngine.js`, campaign seasonal routes/tests                                                                                                    | API + Godot seasonal client   | decide product loop                    |
| ERMES exporter/role gap    | `LIVE_PARTIAL` | `ermesExporter.js`, `ermesRunner.js`, tests, Godot role gap; ER1 effect wire BUILT flag-gated OFF (`ERMES_ROLE_GAP_ENABLED`, spec sez.8: ON post N=40) | world reveal/debrief          | SPEC-I runtime pressure                |
| ALIENA scorer              | `LIVE`         | `authorial/alienaCoherence.js`, tests                                                                                                                  | diagnostics/surface           | link to lore enforcement               |
| ALIENA enforcement         | `LIVE_GATED`   | `biomeSpawnBias.js`, `reinforcementSpawner.js`, policy tests                                                                                           | backend spawn bias            | decide soft-on campaigns               |
| ALIENA telemetry           | `LIVE_PARTIAL` | `alienaTelemetryEndpoint`, Godot `aliena_api.gd`                                                                                                       | phone chart/world reveal      | unify product copy                     |

Decisione:

ERMES e ALIENA sono gia' piu' che forecast. Sono runtime bounded/gated. La
domanda aperta non e' "esistono?", ma "quando diventano soft-on e come si
spiegano ai player senza opacita'".

### 4.6 Combat utility systems

| Sistema           | Stato        | Evidenza                                       | Godot                                 | Prossima azione                 |
| ----------------- | ------------ | ---------------------------------------------- | ------------------------------------- | ------------------------------- |
| Sense reveal      | `LIVE`       | `combat/senseReveal.js`, tests, AI smoke       | `scripts/combat/sense_reveal.gd`      | filtrare info device per sensi  |
| Telepathic reveal | `LIVE`       | `combat/telepathicReveal.js`, tests            | `scripts/combat/telepathic_reveal.gd` | SPEC-B private info             |
| Rewind buffer     | `LIVE`       | `combat/rewindBuffer.js`, session rewind tests | `main_rewind.gd`, HUD tests           | decide if P6 product or assist  |
| Defy              | `LIVE`       | `combat/defyEngine.js`, route/test             | `defy_engine.gd`                      | UI tutorial/status              |
| Overcharge        | `LIVE`       | `overchargeEngine.js`, tests                   | partial/no clear Godot mirror         | surface AP extension            |
| Mission timer     | `LIVE`       | `missionTimer.js`, API tests                   | `mission_timer.gd`, HUD tests         | connect to lethal/hardcore      |
| Reinforcements    | `LIVE_GATED` | `reinforcementSpawner.js`, tests               | `reinforcement_spawner.gd`            | authoring + ALIENA policy       |
| Pin down          | `LIVE`       | `combat/pinDown.js`, tests                     | Godot tests                           | include in combat status matrix |

Decisione:

Molte "idee da reference" sono gia' runtime utility. Il rischio e' che non
entrino nella vista TV/device corretta, non che manchino nel motore.

### 4.7 Nido, lineage, offspring, tribe

| Sistema                | Stato                | Evidenza                                          | Surface                           | Prossima azione           |
| ---------------------- | -------------------- | ------------------------------------------------- | --------------------------------- | ------------------------- |
| Nido hub               | `LIVE_GATED/PARTIAL` | `sessionHelpers.nido`, coop/nido tests            | Godot `MainNido`, TV/phone mirror | SPEC-E + K-04/K-05        |
| Nest API               | `LIVE_PARTIAL`       | `/api/v1/meta/nest`, tests                        | Godot `NestApi`                   | espandere modello Nido    |
| Offspring ritual       | `LIVE`               | lineage/offspring routes/tests                    | Godot facade/panel                | decidere party entry      |
| Epigenome              | `LIVE`               | `genetics/epigenome.js`, E2E tests                | no full surface                   | Custodi/lineage spec      |
| Lineage chain          | `LIVE`               | `lineage/offspringStore.js`, `/lineage/:id` tests | Godot lineage propagator          | surface Nido tree         |
| Tribe emergente        | `LIVE_PARTIAL`       | meta comments/routes/tests, tribes API            | phone tribes view read-only       | define social/tribe rules |
| Wounds inheritance     | `LIVE_PARTIAL`       | wound systems + Godot lineage merge service       | Godot tests                       | SPEC-J rituals            |
| Party select from Nido | `DESIGN`             | roster backend exists                             | missing final surface             | SPEC-E build ticket       |

Decisione:

Il Nido non e' solo una pagina da costruire. Molti pezzi sono live/gated; manca
la surface d'insieme e la ownership device.

### 4.8 Custodi, Codex, diary, memory

| Sistema                       | Stato          | Evidenza                                           | Surface                 | Prossima azione             |
| ----------------------------- | -------------- | -------------------------------------------------- | ----------------------- | --------------------------- |
| SKIV companion state          | `LIVE`         | `skiv/companionStateStore.js`, tests               | `/skiv`, monitor/card   | generalizzare Custodi       |
| Companion picker              | `LIVE`         | `companionPicker.js`, world enricher               | world setup custode     | pool per campagna/player    |
| Portable voice diary          | `LIVE_PARTIAL` | skiv tests whitelist portable diary                | SKIV-specific           | Custode export spec         |
| Diary store                   | `LIVE`         | `services/diary/diaryStore.js`, diary routes/tests | no final player surface | link per-creature memory    |
| Codex pages/glyphs            | `LIVE`         | `routes/codex.js`, `codexState.js`, tests          | partial                 | Tri-Sorgente/Custodi memory |
| Species wiki                  | `LIVE`         | species wiki routes/services                       | partial                 | connect TV/device reveal    |
| Custodi generic export/resync | `DESIGN`       | SKIV template only                                 | missing                 | SPEC-F                      |

Decisione:

Il concetto "Custode vivo fuori campagna" ha gia' una base tecnica reale:
SKIV store, diary portable, codex/wiki e companion payload. Serve
generalizzazione, non tabula rasa.

### 4.9 Tri-Sorgente, reward, doctrine

| Sistema                     | Stato            | Evidenza                              | Surface   | Prossima azione            |
| --------------------------- | ---------------- | ------------------------------------- | --------- | -------------------------- |
| Reward offers/cards         | `LIVE_PARTIAL`   | `routes/rewards.js`, reward tests     | partial   | integrate Tri-Sorgente     |
| Codex/diary sedimentation   | `LIVE_PARTIAL`   | codex/diary systems                   | partial   | doctrine memory            |
| Card exchange/control       | `DESIGN`         | design chat/docs                      | missing   | SPEC-G                     |
| Narrative/doctrinal choices | `DESIGN/PARTIAL` | conviction/codex/debrief inputs       | scattered | orchestrator               |
| Failure-as-lore             | `DESIGN/PARTIAL` | failure model docs + codex/wiki hooks | partial   | campaign consequences spec |

Decisione:

Tri-Sorgente non e' solo reward. Il runtime sparso esiste, ma manca
l'orchestratore che unisce offerte, dottrina, scambio carte e sedimentazione.

## 5. Obsolete/stale da non usare come base unica

| Elemento                                        | Perche' e' pericoloso                                  | Sostituto                         |
| ----------------------------------------------- | ------------------------------------------------------ | --------------------------------- |
| branch locale Game corrente                     | antecedente al pacchetto #2591/#2597/#2601/#2603/#2605 | Game `origin/main`                |
| doc Godot che dice route-vote gap               | superato da Game `origin/main` e Godot main            | code-surface reconcile 2026-06-06 |
| doc Godot che dice PR #423 open/dormiente       | PR merged, consumer facade vivo                        | Godot main + SPEC-K               |
| wording "host drives Nido"                      | confligge con TV mirror/device input                   | SPEC-K                            |
| lettura H2 come gap generico                    | economy gates runtime presenti                         | questa SPEC-L + code tests        |
| catalogo legacy species YAML come fonte runtime | catalogo vivo e' species catalog JSON                  | species catalog v0.4.3/runtime    |

## 6. Checklist per nuovi ticket

Prima di aprire o implementare un ticket:

1. controllare `git branch`, `git log --oneline HEAD..origin/main` e branch
   target;
2. cercare simboli con `rg` in Game e Game-Godot-v2;
3. classificare lo stato con la tabella SPEC-L;
4. indicare almeno un file runtime o doc source;
5. indicare surface TV/device;
6. indicare gate/env/policy;
7. indicare metrica o test di verifica;
8. se si tocca device/TV, applicare SPEC-K;
9. se si tocca Nido/party/Custodi/lineage, applicare SPEC-E/F/J;
10. se si tocca ERMES/ALIENA/Tri-Sorgente, applicare SPEC-G/H/I.

Template minimo:

```text
Feature:
State:
Runtime evidence:
Godot surface:
Gate/policy:
Metric/test:
Authority class:
Next action:
```

## 7. Ticket derivabili

### L-01 Runtime matrix table in docs

Produrre una tabella mantenibile, magari JSON/MD, con:

- feature id;
- stato;
- path Game;
- path Godot;
- gate;
- test;
- owner;
- next action.

### L-02 Stale docs cleanup

Bonificare i documenti che parlano di:

- route-vote come assente;
- PR #413/#423 aperti;
- host drives Nido;
- H2/economy come gap non verificato;
- surface-dead gia' chiusi.

### L-03 Gate dashboard

Creare una vista `META_NETWORK_ROUTING`, `NIDO_UNLOCKED`,
`aliena_enforcement`, `reinforcement_policy`, `mission_timer`,
`MUTATION_MP_ENFORCE`.

### L-04 Surface gap tracker

Separare:

- engine live senza surface;
- surface live senza smoke;
- branch skew;
- design puro.

### L-05 Full-loop metric hooks

Collegare ogni feature meta-loop a un test o metrica:

- route traversal;
- recruit rate;
- mating/offspring;
- lineage diversity;
- Nido entry;
- party composition;
- ERMES/ALIENA effect.

## 8. Acceptance criteria

SPEC-L e' accettabile quando:

1. i planning non chiamano "mancante" un sistema `LIVE` o `LIVE_GATED`;
2. ogni nuovo ticket indica stato, gate, surface e test;
3. branch skew viene identificato prima del codice;
4. i doc stale principali vengono marcati o bonificati;
5. SPEC-K e SPEC-L sono citate nei ticket che toccano Godot/TV/device;
6. il prossimo lavoro codice parte da Game `origin/main` o da branch riallineato.

## 9. Fonti

Documenti:

- `docs/planning/2026-06-05-evo-tactics-open-points-resolution-roadmap.md`
- `docs/planning/2026-06-06-game-godot-code-surface-reconcile.md`
- `docs/design/evo-tactics-godot-device-authority-reconciliation.md`
- `docs/guide/games-source-index.md`

Game runtime:

- `apps/backend/services/forms/formStatApplier.js`
- `apps/backend/services/forms/formInnataTrait.js`
- `apps/backend/services/combat/overchargeEngine.js`
- `apps/backend/services/combat/defyEngine.js`
- `apps/backend/services/combat/rewindBuffer.js`
- `apps/backend/services/combat/missionTimer.js`
- `apps/backend/services/combat/reinforcementSpawner.js`
- `apps/backend/services/combat/senseReveal.js`
- `apps/backend/services/combat/telepathicReveal.js`
- `apps/backend/services/combat/symbiontBond.js`
- `apps/backend/services/combat/minionRuntime.js`
- `apps/backend/services/worldgen/foodwebFilter.js`
- `apps/backend/services/worldgen/crossEventEngine.js`
- `apps/backend/services/worldgen/metaNetworkRouting.js`
- `apps/backend/services/campaign/seasonalEngine.js`
- `apps/backend/services/coop/coopOrchestrator.js`
- `apps/backend/services/network/wsSession.js`
- `apps/backend/services/genetics/epigenome.js`
- `apps/backend/services/skiv/companionStateStore.js`
- `apps/backend/services/diary/diaryStore.js`
- `apps/backend/services/codex/codexState.js`

Godot surface:

- `C:/dev/Game-Godot-v2/scripts/phone/phone_composer_view.gd`
- `C:/dev/Game-Godot-v2/scripts/main_route_choice.gd`
- `C:/dev/Game-Godot-v2/scripts/session/main_nido.gd`
- `C:/dev/Game-Godot-v2/scripts/phone/phone_nido_view.gd`
- `C:/dev/Game-Godot-v2/scripts/phone/main_phone_offspring_mount.gd`
- `C:/dev/Game-Godot-v2/scripts/services/mating_genetics_facade.gd`
- `C:/dev/Game-Godot-v2/scripts/main_rewind.gd`
- `C:/dev/Game-Godot-v2/scripts/combat/mission_timer.gd`
- `C:/dev/Game-Godot-v2/scripts/combat/sense_reveal.gd`
- `C:/dev/Game-Godot-v2/scripts/combat/telepathic_reveal.gd`
