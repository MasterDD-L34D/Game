---
title: 'Sprint Q+ kickoff coordination — OD-022 path implicit accept (cross-repo Game + evo-swarm + Game-side)'
doc_status: active
doc_owner: master-dd
workstream: cross-cutting
last_verified: 2026-05-08
source_of_truth: false
language: it
review_cycle_days: 7
related:
  - OPEN_DECISIONS.md
  - docs/research/2026-05-08-od-022-validator-pre-design.md
  - docs/museum/cards/evo-swarm-run-5-discarded-claims.md
  - docs/planning/2026-05-08-sprint-q-lineage-merge-etl-scoping.md
  - docs/adr/ADR-2026-05-05-cutover-godot-v2-fase-3-formal.md
tags: [sprint-q, kickoff, evo-swarm, OD-022, OD-020, coordination, cross-repo]
---

# Sprint Q+ kickoff coordination — OD-022 implicit accept

User verdict 2026-05-08 sera: **B coordinate merge + Sprint Q+ kickoff** post #2127 + #2128 merge cascade. Pattern coincidence parallel work cross-repo (master-dd swarm-side + Claude Game-side) verso same OD-022 goal = path implicit accept confermato.

## 1. Context — 3 stream parallel converge

| Stream                                   | Repo                | Action                                                                    | PR/SHA           |
| ---------------------------------------- | ------------------- | ------------------------------------------------------------------------- | ---------------- |
| Swarm-side LLM instruction               | evo-swarm           | CO-02 v0.3 schema canonical_refs MANDATORY                                | evo-swarm #85    |
| Game-side `.ai/GLOBAL_PROFILE.md` shared | Game                | Cross-repo coord: shared instruction agent downstream                     | #2128 `20dda146` |
| Game-side validator pre-design preview   | Game                | Skeleton `tools/py/swarm_canonical_validator.py` + spec doc + test corpus | #2129 `62cd6b60` |
| Discarded claim catalog                  | Game museum         | M-2026-05-08-001 — 10 discarded items run #5 + failure mode catalog       | #2125 `e6e0ba0a` |
| OD-022 entry add                         | Game OPEN_DECISIONS | Trip-wire codification + reuse paths                                      | #2120 `9d57a2c5` |

3 stream Day 3/7 sera convergono. Master-dd swarm-side fix #4 + Claude Game-side pre-design preview = same goal cross-verified.

## 2. OD-022 status update implicit accept

OD-022 entry [`OPEN_DECISIONS.md`](../../OPEN_DECISIONS.md#od-022-evo-swarm-pipeline-cross-verification-gate-pre-run-6) status pre-Day-3-sera = OPEN Sprint Q+ candidate ~7-9h post-Phase-B-accept.

Status post Day 3 sera (post #2128 + #2129 merge):

- ✅ Swarm-side step 1 (`canonical_refs` field MANDATORY) **shipped cross-repo**
- ✅ Game-side step 2 (validator pre-design preview skeleton) **shipped Game**
- ✅ Test corpus (museum card 15 cases) **shipped Game**
- ⏸ Game-side step 3 (full validator impl) **pending Phase B accept** (~3-4h)
- ⏸ Game-side step 4 (pipeline ETL integration) **pending Phase B accept** (~2h)
- ⏸ Run #6 swarm trigger con gate active — **post Phase B**

**Implicit accept verdict** (cross-repo evidence convergente). OD-022 status: OPEN → **CANDIDATE-RIPE post-Phase-B-accept**.

## 3. Sprint Q+ pre-kickoff readiness — full audit

Sprint Q+ scope freeze master-dd verdict OD-020 Day 2/7 = FULL Q.A→Q.E (12 ticket Q-1→Q-12 ~14-17h cumulative). Bundle OD-022 (~3-4h Game-side residue post step 1+2 shipped) = **total Sprint Q+ effort post-Phase-B-accept ~17-21h**.

### Pre-req checklist (5/5)

| Pre-req                                                       | Status                                        |
| ------------------------------------------------------------- | --------------------------------------------- |
| Phase A ACCEPTED + 7gg grace target 2026-05-14                | ⏸ Day 3/7 monitoring in progress             |
| Phase B trigger 2/3 (master-dd nice-to-have weekend playtest) | ⏸ silenzio Day 2+3, optional weekend         |
| 0 critical bug regression Phase A                             | ✅ Day 1+2+3 zero regression                  |
| OD-020 verdict FULL Q.A→Q.E                                   | ✅ master-dd Day 2/7                          |
| OD-022 evidence convergente cross-repo                        | ✅ #2128 swarm-side + #2129 Game-side         |
| Phase B archive readiness ADR §6                              | ✅ score 5/5 ZERO blockers (audit Day 3 sera) |

### Effort breakdown post-Phase-B-accept

| Phase                                   | Effort     | Owner                | Trigger                      |
| --------------------------------------- | ---------- | -------------------- | ---------------------------- |
| Sprint Q+ Q-1→Q-12 ETL pipeline         | 14-17h     | Game-side autonomous | Phase B accept (~2026-05-14) |
| OD-022 step 3 validator full impl       | 3-4h       | Game-side autonomous | Bundle Sprint Q+ pre-kickoff |
| OD-022 step 4 pipeline ETL integration  | 2h         | Game-side autonomous | Bundle Sprint Q+ pre-kickoff |
| Run #6 swarm trigger con gate active    | userland   | master-dd            | Post Sprint Q+ ship          |
| **Total cumulative Sprint Q+ + OD-022** | **19-23h** | mixed                | Phase B accept gated         |

## 4. Trigger sequence post-Phase-B-accept (executable)

Quando master-dd verdict explicit "Phase B ACCEPTED" post 2026-05-14:

```bash
# 1. Phase B archive web v1 formal (per ADR §6, ~15min)
# vedi docs/reports/2026-05-08-day-3-completionist-multi-action-audit.md §4

# 2. Sprint Q+ kickoff Q-1 schema contract review (master-dd manual approve)
# vedi docs/planning/2026-05-08-sprint-q-lineage-merge-etl-scoping.md

# 3. OD-022 step 3+4 bundle insieme Sprint Q+ pre-kickoff (~5-6h Game-side)
# - Implement full validator (skeleton → production)
python tools/py/swarm_canonical_validator.py  # currently prints SKELETON message
# vs target:
# python tools/py/swarm_canonical_validator.py path/to/swarm_artifact.json --canonical-root data/core/

# - Pipeline ETL integration (gh workflow per evo-swarm distillation PR pre-merge gate)
# - Unit test corpus 15 cases via museum card M-2026-05-08-001

# 4. Cross-repo coordinazione run #6 swarm trigger
# evo-swarm-side: usa canonical_refs MANDATORY shared profile (post #2128 GLOBAL_PROFILE)
# Game-side: validator gate auto-reject merge se hallucination_ratio > 0.30
```

## 5. Master-dd action items pre-Sprint-Q+-kickoff

### Cosa serve da master-dd post-Phase-B-accept

1. **Verdict Phase B ACCEPTED** (target 2026-05-14, gated 7gg grace + zero critical regression)
2. **Verdict OD-022 explicit** (current = implicit accept via cross-repo work, formal verdict desiderato per audit trail)
3. **OD-020 sub-decisione Q-1 schema contract review** (forbidden path `packages/contracts/`, master-dd-only approve)
4. **OD-020 sub-decisione Q-2 Prisma migration `Offspring`** (forbidden path `migrations/`, master-dd-only approve)

### Cosa NON serve da master-dd (Claude autonomous Sprint Q+)

- Q-3 mutation list 6-canonical accept-as-spec'd default
- Q-4 HTTP API auth JWT esistente cross-stack default accept
- Q-5 scope freeze full Q.A→Q.E confirmed master-dd Day 2/7
- OD-022 step 3+4 Game-side autonomous post-accept verdict

## 6. Cross-ref

- ADR Phase A/B: [`docs/adr/ADR-2026-05-05-cutover-godot-v2-fase-3-formal.md`](../adr/ADR-2026-05-05-cutover-godot-v2-fase-3-formal.md)
- Sprint Q+ scoping: [`docs/planning/2026-05-08-sprint-q-lineage-merge-etl-scoping.md`](2026-05-08-sprint-q-lineage-merge-etl-scoping.md)
- OD-022 pre-design preview: [`docs/research/2026-05-08-od-022-validator-pre-design.md`](../research/2026-05-08-od-022-validator-pre-design.md)
- Museum card test corpus: [`docs/museum/cards/evo-swarm-run-5-discarded-claims.md`](../museum/cards/evo-swarm-run-5-discarded-claims.md)
- Day 3 sera multi-action audit: [`docs/reports/2026-05-08-day-3-completionist-multi-action-audit.md`](../reports/2026-05-08-day-3-completionist-multi-action-audit.md)
- Phase B archive readiness: stesso doc audit §4
- Skeleton validator: [`tools/py/swarm_canonical_validator.py`](../../tools/py/swarm_canonical_validator.py)
- GLOBAL_PROFILE shared cross-repo: `.ai/GLOBAL_PROFILE.md` (post #2128)

## 7. Status

**ACTIVE** — Sprint Q+ kickoff coordination doc canonical. Trigger `Phase B ACCEPTED` (target 2026-05-14, master-dd verdict explicit). Dipende da:

- 7gg grace passing 2026-05-14 ✓ (current Day 3/7 zero regression)
- Master-dd verdict explicit Phase B accept (post grace)

Post-trigger: ~19-23h Sprint Q+ + OD-022 cumulative effort autonomous Game-side (master-dd gate Q-1+Q-2 forbidden paths only).
