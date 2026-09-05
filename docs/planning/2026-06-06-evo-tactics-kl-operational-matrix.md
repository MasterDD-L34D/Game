---
title: 'Evo-Tactics K/L operational matrix'
date: 2026-06-06
type: operational-matrix
doc_status: review_needed
doc_owner: master-dd
workstream: cross-cutting
last_verified: '2026-06-06'
source_of_truth: false
language: it
review_cycle_days: 30
tags: [evo-tactics, spec-k, spec-l, operational-matrix, godot, game-backend]
---

# Evo-Tactics K/L operational matrix

Questa e' la tabella quotidiana per trasformare SPEC-K e SPEC-L in lavoro.

Regola d'uso:

1. prima controllare lo stato in questa matrice;
2. poi aprire la SPEC sorgente;
3. poi verificare branch/gate;
4. solo dopo aprire ticket o PR.

Legenda stato: `LIVE`, `LIVE_GATED`, `LIVE_PARTIAL`, `CLIENT_LIVE`,
`ENGINE_ONLY`, `DESIGN`, `STALE_DOC`.

## 1. Gate rapidi

| Gate / branch                  | Dove                                 | Significato operativo                                                                  |
| ------------------------------ | ------------------------------------ | -------------------------------------------------------------------------------------- |
| Game `origin/main`             | `C:/dev/Game`                        | base corretta per route-vote, graph combat, recruit candidates, canonical species      |
| Godot main                     | `C:/dev/Game-Godot-v2`               | base corretta per route UI, phone route vote, routed roster, offspring facade consumer |
| `META_NETWORK_ROUTING`         | Game campaign + Godot route gate     | Descent graph route shipped/gated, non assente                                         |
| `NIDO_UNLOCKED`                | Game nido helpers + Godot `MainNido` | Nido hub shipped/gated, non default loop                                               |
| `policy.aliena_enforcement`    | Game spawn bias/reinforcement        | ALIENA enforcement esiste, default-off                                                 |
| `MUTATION_MP_ENFORCE`          | Game mutation routes                 | economy hard gate ON salvo override esplicito                                          |
| `mission_timer.enabled`        | encounter policy                     | timer missione per encounter, non global                                               |
| `reinforcement_policy.enabled` | encounter policy                     | reinforcements/ALIENA spawn effects dipendono da authoring encounter                   |

## 2. Matrice operativa

| Feature                             | Stato                         | Game path                                                                                      | Godot path                                                                                                                                                                                                    | Gate                               | Next ticket                                 |
| ----------------------------------- | ----------------------------- | ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------- | ------------------------------------------- |
| TV/device authority contract        | `LIVE_PARTIAL`                | `apps/backend/services/coop/coopOrchestrator.js`; `apps/backend/services/network/wsSession.js` | `scripts/phone/phone_composer_view.gd`; `scripts/main_route_choice.gd`; `scripts/ui/nido_hub_view.gd`; audit `C:/dev/Game-Godot-v2/docs/godot-v2/design/k01-k06-device-authority-surface-audit-2026-06-06.md` | host legacy da isolare             | K-01/K-06 avviati; next K-02/K-03/K-04/K-05 |
| Join room / player slot             | `LIVE_PARTIAL`                | `apps/backend/routes/coop.js`; `coopOrchestrator.js`                                           | phone composer / lobby surfaces                                                                                                                                                                               | host tecnico OK                    | SPEC-A join-slot clarification              |
| Form Pulse / MBTI input             | `LIVE`                        | `wsSession.js`; VC/MBTI payload routes                                                         | `scripts/phone/phone_composer_view.gd`; form pulse views                                                                                                                                                      | none                               | L-04 Device Input Ledger                    |
| World setup vote/confirm            | `LIVE_PARTIAL`                | `coopOrchestrator.js`; `/api/coop/world/*`                                                     | phone composer world setup                                                                                                                                                                                    | host confirm legacy                | K-02 world confirm migration                |
| Route choice broadcast              | `LIVE_GATED`                  | `apps/backend/routes/campaign.js`; `/api/coop/route/open`                                      | `scripts/main_route_choice.gd`; `scripts/ui/route_choice_view.gd`                                                                                                                                             | `META_NETWORK_ROUTING`             | K-03 route TV pick guard                    |
| Route vote phone                    | `LIVE` on Game `origin/main`  | `wsSession.js`; `coopOrchestrator.js`; route vote tests                                        | `scripts/phone/phone_composer_view.gd`; K-07 plan `C:/dev/Game-Godot-v2/docs/godot-v2/qa/k07-real-device-smoke-plan-2026-06-06.md`                                                                            | branch alignment + smoke           | execute K-07 real-device smoke              |
| Graph route real combat             | `LIVE_GATED`                  | `metaNetworkRouting.js`; `metaNetworkResolver.js`; graphMode tests                             | routed roster / encounter runtime                                                                                                                                                                             | `META_NETWORK_ROUTING`             | L-03 gate dashboard + smoke                 |
| Combat planning WEGO                | `LIVE_PARTIAL`                | `apps/backend/routes/session.js`; combat services                                              | phone combat composer; `combat_session.gd`                                                                                                                                                                    | composer incomplete                | SPEC-C WEGO composer                        |
| Combat round TV render              | `LIVE_PARTIAL`                | event-log/session payloads                                                                     | combat UI / feed / replay surfaces                                                                                                                                                                            | needs immutable event-log contract | SPEC-A/SPEC-D animation planner             |
| Device filtered info                | `LIVE_PARTIAL`                | `combat/senseReveal.js`; `combat/telepathicReveal.js`                                          | `scripts/combat/sense_reveal.gd`; `scripts/combat/telepathic_reveal.gd`                                                                                                                                       | none                               | SPEC-B private info filters                 |
| Nido hub                            | `LIVE_GATED/PARTIAL`          | `routes/sessionHelpers.js`; meta/nest endpoints; nido tests                                    | `scripts/session/main_nido.gd`; `scripts/ui/nido_hub_view.gd`; `scripts/phone/phone_nido_view.gd`; SPEC-E `C:/dev/Game-Godot-v2/docs/godot-v2/design/spec-e-nido-groups-party-select-2026-06-06.md`           | `NIDO_UNLOCKED`                    | K-07 smoke, then SPEC-E E-01/E-02           |
| Next mission from Nido              | `LIVE_GATED/PARTIAL`          | `nido_start_mission` WS path                                                                   | `MainNido`; phone Nido mode                                                                                                                                                                                   | host legacy                        | K-05 next mission quorum                    |
| Party select from Nido              | `DESIGN` with backend base    | party roster schema/routes                                                                     | SPEC-E doc created; final party-select surface missing                                                                                                                                                        | `NIDO_UNLOCKED`                    | SPEC-E E-01/E-02 build ticket               |
| Debrief recruit                     | `LIVE_PARTIAL`                | `/coop/combat/end`; `/api/meta/recruit`; recruit candidates                                    | `PhoneDebriefRecruitWire`; TV poll mirror                                                                                                                                                                     | real-device pending                | L-05 full-loop metric hooks                 |
| Mating vote                         | `LIVE_PARTIAL`                | `mating_vote`; `mating_tally`; offspring roll routes                                           | phone mating view; `TvMatingPanel`                                                                                                                                                                            | UX partial                         | SPEC-D Canvas-D mating UX                   |
| Offspring ritual                    | `LIVE` / UX partial           | lineage/offspring routes; genetics services                                                    | `MainPhoneOffspringMount`; `OffspringRitualPanel`; `MatingGeneticsFacade`                                                                                                                                     | roster entry unresolved            | SPEC-D offspring party-entry                |
| Wounds / lethal consent             | `LIVE_PARTIAL`                | failure/lethal/wound systems                                                                   | `LethalityEngine`; lineage merge tests                                                                                                                                                                        | lethal consent missing             | SPEC-J ritual + consent surface             |
| ERMES runtime pressure              | `LIVE_PARTIAL`                | `ermesExporter.js`; `ermesRunner.js`; `traitEffects.js`; world enricher                        | world reveal / role gap surfaces                                                                                                                                                                              | bounded pressure policy            | SPEC-I runtime pressure contract            |
| ALIENA enforcement                  | `LIVE_GATED`                  | `authorial/alienaCoherence.js`; `biomeSpawnBias.js`; `reinforcementSpawner.js`                 | `aliena_api.gd`; labels/surface partial                                                                                                                                                                       | `policy.aliena_enforcement`        | SPEC-H soft-on enforcement                  |
| Reinforcements                      | `LIVE_GATED`                  | `reinforcementSpawner.js`; reinforcement tests                                                 | `reinforcement_spawner.gd`                                                                                                                                                                                    | `reinforcement_policy.enabled`     | L-03 gate dashboard                         |
| Mission timer                       | `LIVE` per encounter          | `missionTimer.js`; API tests                                                                   | `mission_timer.gd`; HUD tests                                                                                                                                                                                 | `mission_timer.enabled`            | connect to lethal/hardcore                  |
| Economy gates PT/PP/SG/MP           | `LIVE_PARTIAL`                | reward/economy/mutation routes; `MUTATION_MP_ENFORCE`                                          | partial UI                                                                                                                                                                                                    | `MUTATION_MP_ENFORCE`              | L-01 economy surface row                    |
| Overcharge / Defy                   | `LIVE_PARTIAL`                | `overchargeEngine.js`; `defyEngine.js`                                                         | `defy_engine.gd`; overcharge mirror partial                                                                                                                                                                   | none                               | combat status/tutorial ticket               |
| Minion / symbiont / pack exceptions | `LIVE_PARTIAL`                | `abilityExecutor.js`; `minionRuntime.js`; `symbiontBond.js`                                    | command/visual partial                                                                                                                                                                                        | composer partial                   | SPEC-C exception controls                   |
| Forms / jobs / traits               | `LIVE_PARTIAL`                | `forms/*`; `jobsLoader.js`; `traitEffects.js`                                                  | species/job/form surfaces partial                                                                                                                                                                             | surface gap                        | SPEC-B/L-04 identity ledger                 |
| Tribe emergente                     | `LIVE_PARTIAL`                | meta comments/routes; tribes API                                                               | phone tribes view read-only                                                                                                                                                                                   | rule design incomplete             | SPEC-E social/tribe rules                   |
| Custodi / SKIV portable state       | `LIVE_PARTIAL`                | `worldEnricher.js`; `skiv/companionStateStore.js`; `routes/skiv.js`; diary routes              | SKIV card/monitor; no generic Custode export                                                                                                                                                                  | SKIV template only                 | SPEC-F export/resync                        |
| Codex / diary / species wiki        | `LIVE_PARTIAL`                | `routes/codex.js`; `codexState.js`; `services/diary/diaryStore.js`; species wiki routes        | partial reveal surfaces                                                                                                                                                                                       | product surface partial            | SPEC-G sedimentation                        |
| Tri-Sorgente cards/doctrine         | `DESIGN/PARTIAL`              | reward/codex/diary/debrief hooks                                                               | missing orchestrated flow                                                                                                                                                                                     | none                               | SPEC-G orchestrator                         |
| Stale Godot docs                    | `STALE_DOC` mostly bonificato | n/a                                                                                            | `docs/godot-v2/*`; `docs/superpowers/*`                                                                                                                                                                       | doc drift                          | L-02 stale docs cleanup                     |

## 3. Ticket seed

| Ticket | Scopo                                                                  | Prima verifica                                                                                                   |
| ------ | ---------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| K-01   | audit Godot surfaces per TV/device authority                           | audit creato in `C:/dev/Game-Godot-v2/docs/godot-v2/design/k01-k06-device-authority-surface-audit-2026-06-06.md` |
| K-02   | migrare world confirm a quorum/device confirm                          | verificare `world_vote`, `world_confirm`, smoke room                                                             |
| K-03   | impedire route pick TV in co-op quando route-vote attivo               | test route-vote + route-choice UI                                                                                |
| K-04   | trasformare Nido phone da mirror puro a action surface                 | tab reclute, party, rituali, mission ready                                                                       |
| K-05   | sostituire `nido_start_mission` host-only con quorum/leader confermato | WS intent + backend guard                                                                                        |
| K-06   | ripulire wording host authority nei doc/codice                         | primo cleanup commenti applicato in `phone_nido_view.gd`, `phone_composer_view.gd`, `main_route_choice.gd`       |
| K-07   | smoke real-device route/Nido/recruit/mating                            | plan creato in `C:/dev/Game-Godot-v2/docs/godot-v2/qa/k07-real-device-smoke-plan-2026-06-06.md`                  |
| L-01   | mantenere matrice runtime compatta                                     | aggiornare questa tabella dopo merge feature                                                                     |
| L-02   | bonifica documenti stale                                               | PR #413/#423, route-vote, host authority                                                                         |
| L-03   | gate dashboard                                                         | `META_NETWORK_ROUTING`, `NIDO_UNLOCKED`, ALIENA, timers, reinforcements                                          |
| L-04   | surface gap tracker/device ledger                                      | Form Pulse, VC, combat intents, choices, doctrine                                                                |
| L-05   | metric hooks full-loop                                                 | recruit, mating, route, Nido, failure/lore                                                                       |

## 4. Regola di manutenzione

Aggiornare questa matrice quando cambia una di queste cose:

- una feature passa da `DESIGN` a runtime;
- un gate viene flipato o rimosso;
- un path Game/Godot cambia;
- una vecchia assunzione host-driven viene eliminata;
- un ticket K/L viene chiuso o splittato.

Non usare questa tabella come fonte unica di verita': se c'e' dubbio, aprire
SPEC-K, SPEC-L e il code-surface reconcile.
