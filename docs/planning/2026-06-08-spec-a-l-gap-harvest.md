---
title: 'Spec A..L gap harvest -- eng-graph + Planning/archive vs roadmap'
date: 2026-06-08
type: gap-analysis
doc_status: review_needed
doc_owner: master-dd
workstream: cross-cutting
last_verified: '2026-06-08'
source_of_truth: false
language: it
review_cycle_days: 30
tags: [evo-tactics, gap-analysis, eng-graph, spec-a-l, device-driven]
related: docs/planning/2026-06-05-evo-tactics-open-points-resolution-roadmap.md
---

# Spec A..L gap harvest (2026-06-08)

Harvest di idee/feature/consigli NON coperti dal roadmap Spec A..L, da 2 fonti:

- **eng-graph** (cognee SSE, corpus vault `Spaces/Dev/Evo-Tactics` + `docs/decisions/OD-*`)
- **vecchi piani** `docs/planning/**` + `docs/archive/**` (Game repo)

Stato verificato vs git ground-truth (anti-pattern #19: marker=ipotesi, git=verita).
Candidato = NON gia' in Spec A..L. Esito triage utente 2026-06-08: TUTTI i cluster
accettati -> inseriti nel roadmap (estensioni + Spec-M..P). Vedi roadmap sezione 3bis.

## Finding chiave

Il pattern dominante NON e' "engine mancante" ma **Engine LIVE / Surface DEAD**:
molti engine sono gia' runtime in `apps/backend`, manca solo la surface
device/TV. Questo combacia esattamente con la direzione Spec A..L (riframe di SURFACE).

Legenda stato: LIVE-engine (engine c'e', surface no) | DESIGN-ONLY (0 hit git) |
PARTIAL | PARKED.

## A. DESIGN-ONLY genuini (0 hit git -- davvero da costruire)

| #   | Candidato                                                                               | Rilevanza | Dove inserire                     | Fonte                                 |
| --- | --------------------------------------------------------------------------------------- | --------- | --------------------------------- | ------------------------------------- |
| A1  | Info-mondo asimmetrica per-device (stato filtrato da sensi/cognizione creatura)         | HIGH      | estende SPEC-B + SPEC-C           | v3-canonical-flow B7                  |
| A2  | StressWave: telegraph diegetico ERMES (terreno/particelle a cambio banda) + spawn table | HIGH      | estende SPEC-I + SPEC-D (+SPEC-P) | ermes-codex-brief; 28-NPC_BIOMI_SPAWN |
| A3  | Failure-as-lore: loop run-fail -> epilogo -> wiki -> degrado meta-network               | HIGH      | NEW SPEC-P                        | v3 B18                                |
| A4  | Form Pulse: 5 micro-scenari swipe (15s) al posto dello slider                           | HIGH      | NEW SPEC-M                        | v3 B1; roadmap sez. 2                 |
| A5  | Onboarding 60s: 3 scelte identitarie pre-Act-0                                          | HIGH      | NEW SPEC-M                        | 51-ONBOARDING-60S; ADR-04-21b         |
| A6  | Biome-form affinity landing                                                             | HIGH      | SPEC-M + estende SPEC-K           | v3 B4                                 |
| A7  | Atlas mini-map diegetica TV + overlay phone                                             | HIGH      | estende SPEC-B + SPEC-K           | OD-026                                |
| A8  | Replay endpoint `GET /api/v1/session/:id/replay` (spec completa)                        | MED       | estende SPEC-D + SPEC-B           | architecture/replay-from-event-log    |
| A9  | Worldgen population tick (Lotka-Volterra su foodwebs)                                   | MED       | estende SPEC-I                    | RESCUE-FORGOTTEN; v3 B16              |
| A10 | Trait environmental costs wiring (ADR accettato, 0 hit `biome_costs_applied`)           | MED       | estende SPEC-K                    | ADR-04-21c                            |
| A11 | Mission Template Library (6 tipi; solo 1 encounter tunato)                              | MED       | NEW SPEC-O                        | 15-LEVEL_DESIGN                       |
| A12 | Social/clan ritual test come onboarding ecologico                                       | MED       | SPEC-M                            | v3 B5                                 |
| A13 | Cumulative biome wound persistence cross-run                                            | MED       | estende SPEC-I (+SPEC-P)          | v3 B16                                |
| A14 | Weather global modifier (diegetic, no popup numerico)                                   | MED       | estende SPEC-D + SPEC-I           | M14-A; v3 B8                          |
| A15 | Leviatano boss multi-stage (3 stage + parley/accord/combat)                             | LOW-MED   | NEW Spec content (park)           | v3 B17                                |

## B. LIVE-engine / Surface-DEAD (engine c'e', manca surface device/TV)

| #   | Candidato                                              | Engine (git)                                               | Dove inserire                     |
| --- | ------------------------------------------------------ | ---------------------------------------------------------- | --------------------------------- |
| B1  | FormEvolution surface device                           | `services/forms/formEvolution.js` + `routes/forms.js` LIVE | estende SPEC-E                    |
| B2  | Seasonal org-phase device surface                      | `campaign.js` + `godotV2State.js` LIVE                     | estende SPEC-E                    |
| B3  | Tribe identity surface (TV + phone)                    | `lineage.js` + `meta.js` LIVE                              | estende SPEC-E                    |
| B4  | Nido unlock gate (biome_arc + 3 missioni)              | Nido hub LIVE                                              | estende SPEC-E                    |
| B5  | Conviction recruit gating                              | conviction axis LIVE, gate no                              | estende SPEC-E                    |
| B6  | ERMES pre-mission briefing surface                     | role_gap LIVE, render no                                   | estende SPEC-I + SPEC-B           |
| B7  | SG/PT gauge su phone composer                          | `sgTracker.js`+`ptTracker.js` LIVE                         | estende SPEC-C                    |
| B8  | PI Shop + d20 pack draft                               | YAML c'e', endpoint no                                     | estende SPEC-C/E                  |
| B9  | Rewind UI button + confirm modal                       | `rewindBuffer.js` LIVE, button no                          | estende SPEC-C                    |
| B10 | Narrative ink briefing/debrief depth                   | `narrativeEngine` 7 file LIVE                              | estende SPEC-D                    |
| B11 | Difficulty player-selectable profiles                  | difficulty pervasivo LIVE                                  | estende SPEC-K                    |
| B12 | Macro-route vote weighting (squad-composition)         | route vote LIVE, weighting?                                | estende SPEC-K                    |
| B13 | MBTI/Ennea dialogue color render wire                  | `mbtiPalette.js`/`enneaVoice.js` LIVE                      | estende SPEC-G                    |
| B14 | Progressive in-game wiki (Hades Codex) + Custodi carry | ALIENA partial                                             | estende SPEC-F + SPEC-H (+SPEC-P) |

## C. PARTIAL / mechanics depth (MED)

| #   | Candidato                                                        | Stato                       | Dove             |
| --- | ---------------------------------------------------------------- | --------------------------- | ---------------- |
| C1  | Status effects v2: tier Shaping + Resonance (squad-aura)         | Wave A LIVE, questi no      | estende SPEC-C/D |
| C2  | AP extension +1 via spesa PT/SG (sblocca 5 abilita', verdict 1A) | ADR skeleton                | estende SPEC-C   |
| C3  | Facing + rear crit (pincer LIVE, facing per-unit da verificare)  | da verificare               | estende SPEC-C/D |
| C4  | Push / ledge / collision damage                                  | DESIGN-ONLY                 | estende SPEC-C   |
| C5  | Sentience tiers T1-T6 come asse-dato specie                      | OD-024 verdict pending      | estende SPEC-D/H |
| C6  | Jobs expansion 4 (Stalker/Symbiont/Beastmaster/Aberrant)         | YAML, runtime?              | estende SPEC-E   |
| C7  | Mating ennea 9/9 (oggi 3/9)                                      | PARTIAL                     | estende SPEC-E   |
| C8  | Beast Bond espansione oltre 6 coppie                             | 6 LIVE                      | estende SPEC-E   |
| C9  | AI micro-personality profiles per archetipo                      | enneaVoice LIVE, profili no | estende SPEC-G   |
| C10 | Move syntax disambiguation (grammatica azioni phone)             | DESIGN-ONLY                 | estende SPEC-C   |

## D. NEW Spec-M..P (create 2026-06-08)

- **SPEC-M Onboarding** (`docs/design/evo-tactics-onboarding-identity-flow.md`): A5+A4+A6+A12.
- **SPEC-N Localization/i18n** (`docs/design/evo-tactics-localization-i18n.md`).
- **SPEC-O Mission Template Library** (`docs/design/evo-tactics-mission-template-library.md`): A11.
- **SPEC-P Failure-as-lore** (`docs/design/evo-tactics-failure-as-lore.md`): A3 (+A13/A2/B14).

## E. Production track (binario separato)

Art Direction (sprite states), Audio Direction (freesound pipeline), Asset
Sourcing (Kenney+AI). Prerequisiti build Godot giocabile (SPEC-D needs sprites).
Tenuto FUORI da Spec A..P (binario produzione), per scelta triage.

## F. PARKED a ragione (NON revivere)

- XP Cipher (ADR-04-17 parcheggiato; coperto da PE/PI/VC).
- EchoWake (research isolata).
- Flint/Kill-60 = GATE di processo da APPLICARE ai candidati Spec-M, non feature.
- Flint v1 / Dafne-Swarm / Machinations / Business model = ops/tooling/produzione.
- Thought-cabinet catalog endpoint = tech-debt.

## Provenienza

- eng-graph: cognee SSE `127.0.0.1:8765` (tools `eng_graph_fact/list/explore`),
  corpus vault. Query live 2026-06-08 (sentience->OD-024, replay-spec, forme-16, PE, kill-60).
- Subagent excavation: repo-archaeologist (Planning/archive) + sot-planner (vault).
- git-verify: alt-spelling grep su `apps/`,`services/`,`data/` (formEvolution/sgTracker live).
