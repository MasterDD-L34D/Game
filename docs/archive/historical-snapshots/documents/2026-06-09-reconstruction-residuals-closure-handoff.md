---
title: Handoff reconstruction-residuals closure (Ryzen 2026-06-09)
date: 2026-06-09
sprint: reconstruction-residuals-wave2
doc_status: active
doc_owner: master-dd
workstream: cross-cutting
last_verified: '2026-06-09'
source_of_truth: false
language: it
review_cycle_days: 30
tags: [evo-tactics, reconstruction, handoff, spec-p, i18n, branco-trait, chronicle, item1, fleet]
---

# Handoff reconstruction-residuals closure -- Ryzen 2026-06-09

## TL;DR

- **Ryzen session = 10 PR merged** (i miei engine/i18n/SPEC-P) su main `3f1a9ffb7`; in parallelo **Lenovo** ha chiuso **item 2** (N=40 calib) + avviato **item 3** (Godot chronicle viewer #452).
- Reconstruction items: **4/5/6/7 + 2 = DONE**; **item 3 = STARTED** (chronicle viewer shipped, Form Pulse + char-creation pending); **item 1 = do-last** (mappa pronta, target `active` NON `accepted`).
- **NF3 i18n grind chiusa** · **Memory-mode chronicle END-TO-END** (backend M-7 4/4 #2668 + viewer phone #452) · **SPEC-P backend loop-glue** (epilogo+codex #2676 + PA3 flag #2677).
- 1 gap handed-off a Lenovo via **issue #2674** (Form Pulse backend link).

## PR mergiati (10 Ryzen)

| PR    | Scope                                             | SHA      | Test                 |
| ----- | ------------------------------------------------- | -------- | -------------------- |
| #2664 | i18n NF3 PR-5: 4 pannelli label-map -> `t()`      | a1511509 | 352 play+i18n        |
| #2665 | OA2 nav fix: `stepTowardZone` (min_units>1)       | bc78c43b | combatPolicy +1      |
| #2666 | MA1 part 2: `brancoTraitEmergence` (FP aggregate) | 75108350 | 11+3, campaign 36    |
| #2667 | Lenovo handoff doc (item 2/3)                     | e728ab2d | docs                 |
| #2668 | M-3 `mutation_lineage` emitter (M-7 keystone 4/4) | 439e6877 | 11+2, AI 500         |
| #2671 | NF3 PR-6: debriefPanel ENNEA_META -> `t()`        | fbf6033c | 348 play             |
| #2672 | item-1 spec-readiness map (17 SPEC)               | 191e7953 | docs                 |
| #2675 | handoff -> issue #2674 pointer                    | 4d8b7c8c | docs                 |
| #2676 | SPEC-P failure epilogue + codex hook              | e76b1fe8 | 13+wire, AI no-break |
| #2677 | SPEC-P PA3: expose `biome_wounded` (anti-brick)   | 3f1a9ffb | a13 +2, AI no-break  |

**Lenovo paralleli (merged)**: #2669 (3 bug OA2 completion fix) · #2670 (calib ratify N=49 completion 0.51 in-band, L-069) · #2673 (status: item2 DONE + item3 started) · Godot-v2 #452 (chronicle viewer) + #453.

## Milestone delta

| Sistema               | Before             | After                                              |
| --------------------- | ------------------ | -------------------------------------------------- |
| i18n NF3              | 2/8 pannelli       | **TUTTI** migrati (grind chiusa)                   |
| Memory-mode chronicle | backend M-7 3/4    | **4/4 + viewer phone = END-TO-END**                |
| OA2 completion_rate   | strutturalmente 0% | **0.51 in-band** (nav #2665 + 3 bug #2669 + calib) |
| branco-trait (MA1 p2) | non esiste         | engine LIVE (dormant fino a FP UX)                 |
| SPEC-P loop           | 0 hit failureLore  | epilogo+codex+PA3 backend (surface=Godot)          |

## Blockers / residui

- [ ] **#2674** (OPEN, Lenovo): Form Pulse backend link `run.id==campaign.id` -> sblocca 3 engine dormienti (FP->VC / branco-trait / name-emergence). Fix-direction A/B nell'issue.
- [ ] **item 3 (Godot)**: Form Pulse keystone UX + device char-creation NON partite (chronicle viewer DONE #452). Gate dominante per 8 spec.
- [ ] **item 1**: flip 17 SPEC `review_needed -> active` (NON `accepted` = governance error). Candidate-now: SPEC-N + SPEC-L + SPEC-O (item2 done). do-last, spec-per-spec (mappa #2672).
- [ ] **web biomeChip** (apps/play): consumare il flag `biome_wounded` (#2677) per il telegraph "bioma ferito" (Surface follow-up del backend PA3).
- [ ] SPEC-P surface forks PA1 (epilogo Godot) / PA3 (telegraph form) = item 3.

## Next entry point

1. **First action**: leggi questo handoff + la mappa item-1 (#2672, `docs/planning/2026-06-09-item1-spec-readiness-map.md`) + il Lenovo handoff (`docs/planning/2026-06-09-lenovo-handoff-item2-item3.md`, ora con pointer a #2674).
2. **Reference**: SPEC-P (`docs/design/evo-tactics-failure-as-lore.md`), issue #2674, roadmap `docs/planning/2026-06-05-evo-tactics-open-points-resolution-roadmap.md`.
3. **Decisione owner pendente**: flip SPEC-N/L/O -> `active`? (housekeeping, 3 candidate). item 6 era forbidden-path ma reframe = chronicle emitter (no services/generation touch).
4. **Fleet**: item 2/3 + N=40 + Godot = **LENOVO**. Backend/data + item-1 flip = Ryzen.

## Memory candidates (chiedi conferma per save)

- [ ] `feedback_cross_session_convergence`: pattern #2668 (backend) <-> #452 (surface) -- 2 macchine chiudono un keystone insieme; comunica i gap cross-machine via GitHub issue (#2674), non solo doc.
- [ ] `feedback_chronicle_emitter_whitelist`: nuovo evento chronicle = aggiungi a `ALLOWED_EVENT_TYPES` (chronicleStore) O appendEvent lo droppa silenzioso (debug: getChronicle legge 0).
- [ ] `project_reconstruction_residuals_2026-06-09` (gia' mantenuto PC-local): aggiornare con questa closure.
