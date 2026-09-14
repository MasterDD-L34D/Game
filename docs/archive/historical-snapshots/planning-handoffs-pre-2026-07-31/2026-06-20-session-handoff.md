---
title: 'Handoff 2026-06-20 -- SPEC-K closure + 2 seed-decisions + prod-resilience'
date: 2026-06-20
sprint: spec-k-closure-seed-decisions
doc_status: active
workstream: cross-cutting
last_verified: '2026-06-20'
source_of_truth: false
language: it
---

# Handoff 2026-06-20 -- SPEC-K closure + seed-decisions (Lenovo)

## TL;DR

- **SPEC-K device-authority = 6/7 + tutte le 5 K-01 design-call risolte + K-07 AI smoke** (solo K-07 real-device resta).
- **K-02 world-confirm device-quorum** costruito e2e (backend + Godot, flag `WORLD_CONFIRM_QUORUM_ENABLED` OFF) + validato cross-stack (smoke 8/8, trovo+fixo 1 bug REST-broadcast).
- **2 seed-decision** (master-dd): PE_ratio -> **switch a contestedness** (banda pressure droppata); SPEC-H unlock-reachability -> **scaffold predoni_nomadi** (lore = master-dd).
- **Audit sessioni parallele** = tutto SOUND. **prod-resilience** = fix designed (owner-gated elevated).
- main verificato sano: AI 554/554, coop/WS 217/217, governance errors=0, prod 3334=200.

## PR mergiati -- miei (15)

| PR                | Scope                                                                       | SHA       |
| ----------------- | --------------------------------------------------------------------------- | --------- |
| #2878             | SPEC-K K-01 device-authority surface audit (Workflow 5-finder)              | `72b1db9` |
| #2879             | SPEC-K K-02 co-op world lock-in backend (mechanism A1, flag OFF)            | `537f416` |
| GGv2 #513         | SPEC-K K-02 Godot surface (+ master-dd P1 reenter-guard)                    | `86c2b26` |
| GGv2 #516         | SPEC-K K-01 surface_role metadata registry + map + GUT                      | `f4ee8be` |
| #2880/#2882/#2891 | BACKLOG closures (K-01/K-02/K-06 + design-calls + K-07)                     | merged    |
| #2881             | SPEC-K K-06 wording (confirmWorld DEV_FALLBACK / combat-end HOST_TECHNICAL) | `f0b2200` |
| #2883             | K-01 design-calls DC#1/2/4 + 9.5 reconcile                                  | `db05953` |
| #2884             | DC#5 RATIFY persist + reconnect-preserves test (orchestrator+WS-e2e)        | `6a1b84f` |
| #2889             | DC#5 test cleanup (createWsServer close wrapper, Codex P2)                  | `1d8030c` |
| #2890             | K-07 AI smoke fix: world_confirm_accepted on REST vote auto-confirm         | `dee28bd` |
| #2893             | PE_ratio decision = switch to contestedness (handoff calib)                 | `6aa67d3` |
| #2895             | SPEC-H predoni_nomadi codex scaffold (\_drafts, lore=master-dd)             | `0a75b21` |
| #2898             | prod backend task resilience runbook + designed fix                         | `34a39f0` |
| (+ questa)        | codex promote-helper + questo handoff                                       | --        |

Parallel sessions (NON miei, auditati SOUND): #2885 schema-migration + #2886 win-encoding + #2887 ground-truth-audit (schema/validator session) · #2892/#2894/#2896/#2897/#2899 governance stale burn-down · GGv2 #517/#518 Ferrospora-art + roadmap.

## SPEC-K delta

| K             | Stato                                                       | Rif               |
| ------------- | ----------------------------------------------------------- | ----------------- |
| K-01          | DONE (audit + surface_role metadata)                        | #2878 + GGv2 #516 |
| K-02          | DONE e2e (backend + Godot, flag OFF)                        | #2879 + GGv2 #513 |
| K-03/04/05    | DONE (pre-sessione)                                         | --                |
| K-06          | DONE (wording)                                              | #2881             |
| K-07          | AI smoke PASS 8/8; **real-device PENDING**                  | #2890             |
| 5 design-call | TUTTE risolte (DC#1/2/4/9.5 #2883; DC#5 ratify #2884/#2889) | --                |

## Blockers residui (tutti GATED -- non buildable-autonomo)

- [ ] **prod-resilience apply** -- owner-gated (admin elevation; `Set-ScheduledTask` da non-elevato = "Accesso negato"). Script pronto `C:\Users\edusc\fix-evo-backend-task-resilience.ps1`, runbook `docs/ops/2026-06-20-prod-backend-task-resilience.md`.
- [ ] **SPEC-H predoni lore** -- master-dd scrive la prosa A.L.I.E.N.A. in `data/codex/_drafts/predoni_nomadi.yaml` (6 `content:` = TODO) -> poi `node tools/js/promote_codex_draft.js predoni_nomadi` (verifica + move a `data/codex/`) = gap unlock chiuso e2e.
- [ ] **PE_ratio contestedness experiment** -- calib-session (tools/py). Handoff `docs/planning/2026-06-20-pe-ratio-contestedness-switch-handoff.md`: add candidati turns/dmg -> re-run orthogonality -> ratifica banda (master-dd) -> flip P4/P5.
- [ ] **SPEC-J + HA1 flip** -- blocked-downstream (N=40 <- PE_ratio-contestedness + content lethal encounter).
- [ ] **K-07 real-device playtest** -- 2 telefoni + TV (master-dd hands).
- [ ] **META_NETWORK_ROUTING flip** (env, prod-health) / **SPEC-F durable cooldown** (forbidden-path packages/contracts) -- master-dd.

## Next entry point

1. **Quick win prod**: run `fix-evo-backend-task-resilience.ps1` ELEVATO (~5 min) -> prod resiliente (+ opz `Start-ScheduledTask` transizione orfano ~5s blip).
2. **SPEC-H close**: scrivi lore predoni -> `node tools/js/promote_codex_draft.js predoni_nomadi` -> commit (= primo codex unlock reale in-flow).
3. **Calib**: la calib-session prende il PE_ratio contestedness handoff.
4. **Reference da leggere**: `docs/planning/2026-06-20-pe-ratio-contestedness-switch-handoff.md`, `docs/ops/2026-06-20-prod-backend-task-resilience.md`, `docs/reports/2026-06-19-spec-k-01-device-authority-surface-audit.md`.

## Verify-first wins della sessione (anti-pattern #19)

- K-02: il commento "Host remains arbiter" su confirmWorld NON era design-intent ma dev-fallback -> K-02 = gap reale; poi il backend NON ha world-param server-side -> propose/lock-in fork (NON il "reuse worldVotes" stimato).
- Orphan jsonschema fix: branch-SHA `--contains` MANCA gli squash -> usa `git diff --files` per "gia' merged?".
- SPEC-H: gap reale = content-mismatch (entry per specie non-incontrata), NON routing.
- prod: RestartCount=3 esaurito = root-cause dei 3 prod-down, NON "task non resiliente" generico.

## Memory candidates (gia' salvati durante la sessione)

- [x] `project_spec_k_k04_recruit` -- esteso (K-01/K-02/K-06 + 5 design-call + K-07 smoke).
- [x] `project_parallel_workstreams_2026_06` -- esteso (orphan squash-lesson + PE_ratio decision).
- [x] `project_spec_h_codex_surface` -- esteso (unlock-reachability decision + predoni scaffold).
- [ ] (opz) `lesson_scheduled_task_restart_exhaustion` -- RestartCount basso = root-cause prod-down; watchdog vs RestartCount-bump. Catturato nel runbook; promote a lesson solo se ricorre.
