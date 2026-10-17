---
title: 'Sprint Q+ FULL Scope Codification — Post-Phase-B Schedule'
date: 2026-05-10
type: planning
status: live
workstream: cross-cutting
slug: 2026-05-10-sprint-q-plus-full-scope-codification
tags: [sprint-q-plus, sub-decisions, lineage-merge, etl, post-phase-b, completionist, codification]
author: claude-autonomous
---

# Sprint Q+ FULL Scope Codification — 2026-05-10

V6 verdict codification (master-dd grant 2026-05-10 cascade bundle). Sprint Q+ FULL scope = `Q.A → Q.E` 12-ticket pipeline, **gated post-Phase-B-accept** (target 2026-05-14 + zero-regression confirmed).

OD-020 (RISOLTA 2026-05-08 master-dd verdict FULL deep scope) + OD-022 (IMPLICIT ACCEPT 2026-05-08 sera cross-repo evidence convergente) bundle execution sequence formal.

## Trigger conditions

| #   | Condition                                            | Status target              |
| --- | ---------------------------------------------------- | -------------------------- |
| 1   | Phase A 7gg grace window completed                   | 2026-05-14                 |
| 2   | Zero critical regression Tier 1 sintetic Day 1+3+5+7 | confirmed                  |
| 3   | Master-dd verdict Phase B accept (Option α/β/γ)      | pending Day 8              |
| 4   | Auto-merge L3 cascade pipeline operational           | confirmed (ADR-2026-05-07) |

**Path block**: NO Sprint Q+ kickoff pre-Phase-B-accept. Risk: regressione `DebriefView` cutover-critical surface se ETL ship pre-cutover.

## Scope completionist+optimizer

**FULL Q.A → Q.E sequential** (NO incremental Q.A only). Rationale: Sprint Q+ chiude Engine LIVE Surface DEAD anti-pattern canonical case (`mating_nido-engine-orphan` 5/5 score museum, 469 LOC + 7 endpoint shipped 4 mesi fa con ZERO frontend). Full deep approach = compelete narrative arc Skiv-Pulverator alleanza visible debrief panel + cross-encounter offspring legacy.

### Pipeline 12 ticket Q-1 → Q-12

| Stage                        | Ticket | Scope                                                             |   Forbidden path    | Effort | Master-dd gate |
| ---------------------------- | ------ | ----------------------------------------------------------------- | :-----------------: | :----: | :------------: |
| **Q.A — Schema + Migration** | Q-1    | `lineage_ritual.schema.json` `packages/contracts/`                |         ✅          | ~1.5h  |       ✅       |
|                              | Q-2    | Prisma migration `Offspring` table                                |         ✅          | ~1.5h  |       ✅       |
| **Q.B — Backend Engine**     | Q-3    | MUTATION_LIST canonical + `propagateLineage` engine               |         ❌          |  ~2h   | ⚠️ design call |
|                              | Q-4    | HTTP API `/api/v1/lineage/legacy-ritual` JWT                      |         ❌          |  ~1h   | ⚠️ design call |
|                              | Q-5    | `evaluateChoiceRitual` cross-stack contract                       |         ❌          | ~1.5h  |       —        |
| **Q.C — Cross-Repo Sync**    | Q-6    | OD-022 evo-swarm `canonical_ref` field swarm-side                 |     cross-repo      | ~2-3h  | ⚠️ swarm coord |
|                              | Q-7    | `tools/py/swarm_canonical_validator.py` (skeleton ready PR #2129) |         ❌          | ~3-4h  |       —        |
|                              | Q-8    | Pipeline integration ETL hallucination ratio gate >30%            |         ❌          |  ~2h   |       —        |
| **Q.D — Frontend Surface**   | Q-9    | DebriefView lineage panel extension Game/                         |         ❌          |  ~2h   |       —        |
|                              | Q-10   | Godot v2 LegacyRitualPanel.gd parity wire                         | cross-repo Godot v2 |  ~2h   |       ⚠️       |
| **Q.E — Test + Closure**     | Q-11   | Test E2E lineage chain merge cross-encounter                      |         ❌          | ~1.5h  |       —        |
|                              | Q-12   | Closure docs + museum card + ADR + handoff                        |         ❌          |  ~1h   |       —        |

**Total**: ~22-25h cumulative ~4-5 sessioni autonomous + 5 master-dd review gate (Q-1+Q-2 forbidden + Q-3+Q-4+Q-10 design call).

⚠️ **Effort revision vs OD-020 stima 14-17h**: bundle OD-022 cross-repo sync (Q-6+Q-7+Q-8 ~7-9h) added post IMPLICIT ACCEPT 2026-05-08 sera. Total post-bundle ~22-25h (vs ~14-17h pre-bundle). Aligns with completionist+optimizer "bundle reduce overhead" recommendation.

## Sub-decisione defaults (pending master-dd review)

### Q-1 Schema contract `lineage_ritual.schema.json` (forbidden path)

**Default accept**: schema spec'd in [PR #2109 scoping](https://github.com/MasterDD-L34D/Game/pull/2109) Appendice B. Master-dd review target: validate JSON Schema fields canonical match Game/ + Godot v2 + evo-swarm CO-02 v0.3 contract.

### Q-2 Prisma migration `Offspring` table (forbidden path)

**Default accept**: spec PR #2109 Appendice C (`{ id, parent_a_id, parent_b_id, mutations, born_at, lineage_id }`). Additive migration only (no breaking change existing tables). Schema: composite FK `parent_a_id` + `parent_b_id` → `UnitProgression.id`.

### Q-3 MUTATION_LIST canonical (design call)

**Default accept-as-spec'd** (master-dd verdict 2026-05-08): 6 mutation generic Appendice A PR #2109:

1. `armatura_residua` — +1 defense_mod permanent
2. `tendine_rapide` — +1 attack_range permanent
3. `cuore_doppio` — +HP_max permanent
4. `vista_predatore` — +1 attack_mod vs panicked permanent
5. `lingua_chimica` — apply_status disorient on hit (cooldown 2t)
6. `memoria_ferita` — +1 attack_mod vs trait_id == previous wounded source

LegacyRitualPanel.gd surface 3-of-6 random choice cross-encounter post-defeat (parity Godot v2 spec).

### Q-4 HTTP API auth JWT (design call)

**Default accept**: usa JWT esistente cross-stack (auth middleware shared `apps/backend/middleware/auth.js`). Endpoint `/api/v1/lineage/legacy-ritual`:

- POST `auth: required` (modifies offspring registry)
- GET `auth: required` (per-user lineage chain disclosure)

### Q-5 Scope freeze full Q.A → Q.E

**CONFIRMED FULL** (master-dd verdict 2026-05-08). NO incremental Q.A only. Sequential ship target ~22-25h ~4-5 sessioni post-Phase-B-accept.

## Sprint Q+ resume trigger phrase canonical

Post Phase B accept verdict (≥2026-05-14):

> _"Sprint Q+ kickoff post-Phase-B-accept — execute Q.A Q-1+Q-2 forbidden path bundle"_

Sequential progression:

1. Q.A Q-1+Q-2 → schema + migration (forbidden path bundle)
2. Q.B Q-3+Q-4+Q-5 → backend engine
3. Q.C Q-6+Q-7+Q-8 → cross-repo sync evo-swarm bundle
4. Q.D Q-9+Q-10 → frontend surface Game/ + Godot v2 parity
5. Q.E Q-11+Q-12 → test + closure

Master-dd review gate target: ~5min per gate × 5 gate = ~25min cumulative master-dd burden across 4-5 sessioni.

## Cross-references

- [OD-020 RISOLTA 2026-05-08](../../OPEN_DECISIONS.md#od-020-sprint-q-pre-kickoff-scope-freeze--5-sub-decisione--risolta-2026-05-08-full-deep-scope) FULL deep scope verdict
- [OD-022 IMPLICIT ACCEPT 2026-05-08 sera](../../OPEN_DECISIONS.md#od-022-evo-swarm-pipeline-cross-verification-gate-pre-run-6--implicit-accept-2026-05-08-sera-cross-repo-evidence-convergente) bundle inclusion
- [PR #2109 scoping doc](https://github.com/MasterDD-L34D/Game/pull/2109) Appendice A+B+C
- [PR #2129 pre-design preview](https://github.com/MasterDD-L34D/Game/pull/2129) skeleton validator + spec doc
- [PR #2128 cross-repo coordination](https://github.com/MasterDD-L34D/Game/pull/2128) `.ai/GLOBAL_PROFILE.md` CO-02 v0.3 canonical_refs MANDATORY
- [docs/planning/2026-05-08-sprint-q-kickoff-coordination.md](2026-05-08-sprint-q-kickoff-coordination.md) coordination doc canonical
- [docs/research/2026-05-08-od-022-validator-pre-design.md](../research/2026-05-08-od-022-validator-pre-design.md) validator spec
- [docs/reports/2026-05-10-pending-verdicts-completionist-optimizer.md](../reports/2026-05-10-pending-verdicts-completionist-optimizer.md) V6 + V5 verdict context

## Skiv-Pulverator narrative arc completion

Sprint Q+ closure abilita visible Skiv-Pulverator alleanza beat in DebriefView:

- Player choice ritual fame vs alleanza (Action 6 ambition shipped PR #2004 SHA `dcba8295`)
- Bond reaction surface live PR #2173 SHA `e22e19ab` (Phase B HUD)
- Lineage chain offspring cross-encounter (Sprint Q+ Q-9 + Q-10 wire)
- Reconciliation narrative beat shipped via Q-11 E2E test scenario

P2 + P5 pillar deltas anticipated post-Q+ closure: P2 🟢 def → 🟢++ (lineage chain visible) + P5 🟢 confirmed → 🟢++ (alleanza arc complete).

## Notes

- **Forbidden path PR sequence Q-1+Q-2**: bundle in single PR title `feat(lineage): Q.A schema + migration` per single master-dd grant gate (efficient cascade L3 candidate).
- **Cross-repo dependency Q-6 swarm-side + Q-10 Godot v2**: coordination via `.ai/GLOBAL_PROFILE.md` CO-02 v0.3 canonical_refs MANDATORY (master-dd shipped PR #2128 path implicit accept).
- **Test strategy Q-11**: smoke E2E scenario lineage chain — encounter1 victory + offspring birth + encounter2 victory same lineage_id parent. Verify mutation propagation cross-encounter.
- **Effort variance**: ±20% baseline (master-dd review gate latency primary unknown). Full pipeline ~3-5 days calendar (4-5 sessioni autonomous parallel/sequential).

## Status post-codification

OD-020 + OD-022 bundle execution path **CODIFIED 2026-05-10** (gated post-Phase-B-accept 2026-05-14). Resume trigger phrase canonical preserved. Master-dd Day 8 verdict unblocks single-trigger cascade.
