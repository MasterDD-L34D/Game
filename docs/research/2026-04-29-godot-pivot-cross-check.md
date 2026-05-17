---
title: 2026-04-29 Godot pivot cross-check — 19 doc audit + 16 item classification
doc_status: active
doc_owner: master-dd
workstream: cross-cutting
last_verified: 2026-04-29
source_of_truth: false
language: it
review_cycle_days: 30
related:
  - 'docs/adr/ADR-2026-04-29-pivot-godot-immediate.md'
  - 'docs/planning/2026-04-29-master-execution-plan-v3.md'
  - 'docs/planning/2026-04-28-master-execution-plan.md'
  - 'docs/adr/ADR-2026-04-28-bg3-lite-plus-movement-layer.md'
---

# Godot pivot cross-check — agent synthesis

> **Source**: 2 agent paralleli spawned 2026-04-29 sera per audit pivot decision-altering. General-purpose (cross-check 19 doc + Q1-Q4) + balance-illuminator (risk analysis 6 pillar + Skiv canon + Top 7 risk + verdict synthesis Path A/B/C).

> **Outcome**: vedi [ADR-2026-04-29-pivot-godot-immediate.md](../adr/ADR-2026-04-29-pivot-godot-immediate.md) per decision finale + plan v3.

## Q1 — 16 item shipped 2026-04-28/29 classification

| Item                                                     | Type                          | Verdict                                                            |
| -------------------------------------------------------- | ----------------------------- | ------------------------------------------------------------------ |
| Action 5 BB hardening severity stack + slow_down (#1999) | backend service               | **PRESERVE backend**                                               |
| Action 6 ambition Skiv-Pulverator (#2004)                | backend service + frontend UI | **PRESERVE backend** + RE-IMPL UI Godot                            |
| Action 1 SRPG engine reference codebase (#2001)          | research doc                  | **PRESERVE** (Sprint M.4 input)                                    |
| Action 2 tactical AI archetype templates (#2000)         | research doc                  | **PRESERVE** (Sprint N.4 input)                                    |
| Action 3 Sprint N.7 spec failure-model parity (#2005)    | spec doc                      | **PRESERVE** (impl ready Sprint N.7 GATE 0)                        |
| Asset Sprint G v3 Legacy 47 PNG CC0 (#2002)              | asset binary                  | **PRESERVE** (re-import Godot Sprint M.3 ~1h)                      |
| Sprint G.2b BG3-lite Plus ~10-12g                        | planned (NOT shipped)         | **DEPRECATE** (native Godot 2D zero effort)                        |
| A1 rubric session 4 amici tester                         | planned (NOT executed)        | **DEPRECATE** (formal abort, no value gating G.2b post-pivot)      |
| Sprint H itch.io gap-fill OPT                            | planned conditional           | **DEPRECATE** (Godot Asset Library replace)                        |
| Rubric launcher .lnk suite (#2007)                       | tooling .bat + .ps1           | **DEPRECATE archive** (web stack tooling)                          |
| CT bar lookahead 3 turni (#1998)                         | frontend module               | **RE-IMPL Godot Sprint N.1** (HUD overlay GDScript)                |
| Ambition HUD UI (#2004 frontend)                         | frontend module               | **RE-IMPL Godot Sprint N.5**                                       |
| Thoughts ritual G3 panel (#1983)                         | frontend module               | **RE-IMPL Godot Sprint N.7**                                       |
| Mating UI lineagePanel (#1879/#1918)                     | frontend module               | **RE-IMPL Godot Sprint N.7**                                       |
| ERMES E0-E6 (#2009) prototype lab                        | Python isolated               | **KEEP isolated** (out-of-scope Godot, plan integration esplicito) |
| Spike POC #2003 toggle config                            | frontend toggle               | **KEEP archive** (web-v1-final tag, NO Godot port)                 |

**Summary**: 6 PRESERVE backend + 4 RE-IMPL Godot UI + 4 DEPRECATE + 1 KEEP isolated + 1 KEEP archive.

## Q2 — Doc updates richiesti post-pivot (8 P0 + 5 P1)

**P0 (mandatory immediate)**:

1. `docs/planning/2026-04-28-master-execution-plan.md` §FASE 1 + §FASE 2 + §TOTAL effort + §Decisions → superseded by plan v3
2. `docs/planning/2026-04-28-godot-migration-strategy.md` §"Fase 1 Web stack ship demo" → mark superseded
3. `docs/adr/ADR-2026-04-28-bg3-lite-plus-movement-layer.md` status Accepted → **Superseded by ADR-2026-04-29-pivot-godot-immediate**
4. `docs/adr/ADR-2026-04-28-deep-research-actions.md` §10 status table per Action: G.2b/H/A1 marked DEPRECATED, others PRESERVE/RE-IMPL
5. `docs/planning/2026-04-29-sprint-n7-failure-model-parity-spec.md` status → ELEVATE GATE 0 (was Sprint N.7 internal spec)
6. `BACKLOG.md` mark items Sprint G.2b/Sprint I/A1 rubric → DEPRECATED post-pivot
7. `COMPACT_CONTEXT.md` v20 → v21 con TL;DR pivot decision
8. `docs/playtest/2026-04-29-bg3-lite-spike-rubric.md` → archive web-v1-final marker (no tester run)

**P1 (deferred)**:

1. `docs/planning/2026-04-28-asset-sourcing-strategy.md` §Sprint G v3 Web stack → Godot direct
2. `docs/planning/2026-04-29-ermes-cleanup-handoff.md` §4 + §8 decision tree → update post-pivot
3. ADR-2026-04-28-grid-type-square-final → CONFIRM cross-stack (square anche Godot TileMap square-mode)
4. Sprint H spec doc archive note (deferred Sprint H if eventual restore)
5. Memoryfile feedback PC-local sync optional (cross-PC via git skip)

## Q3 — Backend cross-stack inventory

**18 backend services + 3 data layer = ALL KEEP cross-stack** (zero rewrite pre Fase 3):

| File                                                     | Function                                 | Verdict                                   |
| -------------------------------------------------------- | ---------------------------------------- | ----------------------------------------- |
| `apps/backend/routes/session.js` (1967 LOC)              | Round model M17 + planning + combat      | KEEP cross-stack                          |
| `apps/backend/services/ai/policy.js` + `utilityBrain.js` | AI scoring (post fix #2013)              | KEEP cross-stack                          |
| `apps/backend/services/combat/statusModifiers.js`        | Status effects + slow_down trigger       | KEEP cross-stack                          |
| `apps/backend/services/combat/woundedPerma.js`           | BB severity stack (#1999)                | KEEP cross-stack                          |
| `apps/backend/services/combat/resistanceEngine.js`       | Channel resistance                       | KEEP cross-stack                          |
| `apps/backend/services/combat/senseReveal.js`            | Skiv echolocation                        | KEEP cross-stack                          |
| `apps/backend/services/campaign/ambitionService.js`      | Ambition Skiv-Pulverator (#2004)         | KEEP cross-stack                          |
| `apps/backend/services/coop/coopOrchestrator.js`         | Phase machine                            | **CAUTELA M.5** (race condition diagnose) |
| `apps/backend/services/network/wsSession.js`             | WS broadcast                             | **CAUTELA M.5** (race condition diagnose) |
| `apps/backend/services/lifecycle/*`                      | propagateLineage + mating + legacyRitual | KEEP cross-stack                          |
| `apps/backend/services/qbn/qbnEngine.js`                 | Narrative beats                          | KEEP cross-stack                          |
| `apps/backend/services/vcScoring.js`                     | 4 MBTI + 6 Ennea                         | KEEP cross-stack                          |
| `data/core/traits/active_effects.yaml` 458 trait         | data                                     | KEEP cross-stack                          |
| `data/core/encounters/*.yaml` 60+                        | data                                     | KEEP cross-stack                          |
| `prototypes/ermes_lab/` (#2009)                          | Python isolated lab                      | OUT-OF-SCOPE Godot                        |

**Plan v2 §Decision 8 confirmed**: Express + Prisma + Postgres + WS persiste Fase 3.

## Q4 — Roadmap revised plan v3 verifica

**Plan v3 sequenza** (post pivot):

| Sprint                 | Effort revised  | Topic                                                                           |
| ---------------------- | :-------------: | ------------------------------------------------------------------------------- |
| Sprint M.1             | 6-8g (was 3-5g) | NEW repo Game-Godot-v2 + Donchitos cherry-pick INCORPORATED + Godot 4.x install |
| Sprint M.2             |       2g        | Plugin Asset Library priority install                                           |
| Sprint M.3             |      2-3g       | Asset Legacy import                                                             |
| Sprint M.4             |       1g        | Reference codebase study application                                            |
| Sprint M.5             |       4h        | Cross-stack spike Godot HTML5 ↔ Express WS MANDATORY                           |
| Sprint M.6             |       3h        | CI minimal Godot project MANDATORY                                              |
| Sprint M.7             |       2g        | Phone composer Godot HTML5 spike MANDATORY P5 gate                              |
| GATE 0                 |       3h        | Failure-model parity check (Sprint N.7 ELEVATE pre Sprint N.1)                  |
| Sprint N.1-N.7         |    4-5 sett     | Vertical slice MVP 3-feature (combat + mating + thoughts)                       |
| Sprint N decision gate |     binary      | 6/6 SÌ → Fase 3, ≤4/6 → archive                                                 |
| Sprint O-S             |    6-10 sett    | Session engine port + co-op WS port + cutover hybrid stable                     |

**Total revised**: ~13-19 settimane vs plan v2 14-21 settimane.

**Net savings ~1-2 sett** (NOT 3-4 sett initial estimate). Sprint M.1 6-8g (incorporate Sprint K Donchitos) realistic vs 3-5g optimistic.

## Top 5 critical decisions PRE plan v3 commit

1. **Sprint J Visual Map Obsidian — defer post-N gate o eliminate** → default raccomanda **defer post-Sprint N gate** (low priority, master-dd may use OR not)
2. **Sprint K Donchitos cherry-pick — pre-execute o incorporate M.1** → confermato **incorporate M.1** (no separate Sprint K)
3. **Sprint M.5 spike scope — race condition diagnose frontend o backend** → master-dd input richiesto pre M.5 spike commitment
4. **Sprint N.7 failure-model parity — defer M.1 o ELEVATE GATE 0** → confermato **ELEVATE GATE 0** (mandatory PRE Sprint N.1-N.6)
5. **Sprint H formal close vs silent drop** → confermato **formal close** (DEPRECATED post-pivot, archive note)

## Risk analysis Top 7 (severity + mitigation)

1. 🔴 **P5 Co-op phone-as-controller Godot HTML5 gate fail** — mitigation Sprint M.7 spike kill-switch + hybrid fallback (phone web PWA + Godot TV view)
2. 🟡 **vcScoring 384-test cliff GUT port silent regression** — mitigation Sprint Q.1 test parity audit target ≥250 critical pre-cutover
3. 🟡 **Sprint G.2b sunk if pivot accelerated** — mitigated: Spike POC rubric verdict gates G.2b commitment, fail → skip direct Sprint M
4. 🟡 **LegacyRitualPanel + thoughts ritual G3 incomplete Godot spec** — specs exist (#2005 Sprint N.7), effort ~3-4d budgeted
5. 🟢 **Anti-pattern guard compliance round model M17** — Godot pivot architecturally neutral (backend state machine preserved)
6. 🟡 **Donchitos template agent mismatch Sprint N scale** — mitigation Sprint M.1 pin `config_version` Godot 4.x + path-scoped rules adapted (Sprint K.5)
7. 🟡 **Single dev burnout 13-19 sett solo-dev** — mitigation kill-60 policy + daily energy_score 1-5 + sprint exit burnout check + clean abort gate Fase 2 exit

## Verdict synthesis (3 path)

| Path | Description                                       | Pro                                                                                                                          | Con                                                                                                                      | Recommended |
| ---- | ------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ | :---------: |
| A    | Pivot full immediate (skip Fase 1 remainder)      | No sunk cost G.2b ~10-12d, clean start                                                                                       | P5 TKT-M11B-06 deferred 4+ months, Sprint M.7 spike may abort 10+ weeks Godot investment, 384 web tests lost immediately |     NO      |
| B    | Pivot accelerated cap (current plan v3 structure) | P5 validated before 4-month investment, 3 mandatory spikes de-risk, backend continuously deployable, clean abort Fase 2 exit | +1-1.5 sett Fase 1 before Godot R&D starts                                                                               |   **SÌ**    |
| C    | Hybrid cross-stack persist (default)              | Express backend = unchanged                                                                                                  | Not a choice — already mandated plan v2 §Decision 8                                                                      |  implicit   |

## Recommendation finale

**Path B accelerated cap**.

3 reason convergent (cross-check + risk agent):

1. **Sprint M.7 phone composer spike è critical regardless of pivot path** — Path A non salva critical path.
2. **Rubric session IS accelerated decision gate** — fail → skip G.2b automatic, net cost = 1d spike (NOT 10-12d G.2b).
3. **Backend stays unchanged = zero rewrite risk** — 16 PR shipped backend preserved cross-stack, become reference implementation che Godot GDScript ports mirror (specs già scritti #2001/#2000/#2005).

---

**Status doc**: ACTIVE. Reference per decision pivot ADR-2026-04-29-pivot-godot-immediate.
