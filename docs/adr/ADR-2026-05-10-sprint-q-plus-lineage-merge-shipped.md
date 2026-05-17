---
title: 'ADR-2026-05-10: Sprint Q+ Lineage Merge ETL — SHIPPED'
date: 2026-05-10
doc_status: active
doc_owner: master-dd
workstream: cross-cutting
last_verified: 2026-05-10
source_of_truth: true
language: it
review_cycle_days: 30
related:
  - docs/adr/ADR-2026-05-05-cutover-godot-v2-fase-3-formal.md
  - docs/planning/2026-05-10-sprint-q-plus-full-scope-codification.md
  - docs/planning/2026-05-10-sprint-q-plus-qa-prestage-bundle.md
  - docs/planning/2026-05-10-sprint-q-plus-qbcde-spec-extension.md
---

# ADR-2026-05-10: Sprint Q+ Lineage Merge ETL — SHIPPED

- **Data**: 2026-05-10 sera
- **Stato**: ✅ ACCEPTED + SHIPPED 9/12 ticket Game-side (Q-10 Godot v2 cross-repo deferred)
- **Owner**: Master DD
- **Stakeholder**: P2 Evoluzione + P5 Co-op pillar leads
- **Trigger**: ADR-2026-05-05 §13.3 Phase B Path γ ACCEPTED 2026-05-10 sera

## 1. Decisione

Sprint Q+ Lineage Merge ETL chiude Engine LIVE / Surface DEAD anti-pattern canonical case (mating engine orphan 4 mesi pre-shipping). Pipeline 12 ticket Q-1 → Q-12 ship cascade autonomous post-Phase-B-accept Path γ.

## 2. Ticket shipped

| Ticket                  | PR           | SHA               | Topic                                                                                        | Effort actual |
| ----------------------- | ------------ | ----------------- | -------------------------------------------------------------------------------------------- | :-----------: |
| Q-1 schema              | #2200        | `862dde8b`        | `lineage_ritual.schema.json` JSON Schema draft-07 + AJV registry                             |   included    |
| Q-2 migration           | #2200        | `862dde8b`        | Prisma 0008_offspring + schema model + UnitProgression back-ref                              |   included    |
| Q-3 engine              | #2201        | `f8f37904`        | `propagateOffspringRitual` + MUTATION_LIST 6-canonical + offspringStore Prisma write-through |   included    |
| Q-4 HTTP API            | #2201        | `f8f37904`        | POST /offspring-ritual + GET /chain + GET /session + GET /mutations/canonical                |   included    |
| Q-5 bridge              | #2201        | `f8f37904`        | `bridgeOffspringRitualOnChoice` chain evaluateChoiceRitual outcome                           |   included    |
| Q-6 swarm canonical_ref | (cross-repo) | (master-dd #2128) | swarm-side `.ai/GLOBAL_PROFILE.md` CO-02 v0.3 canonical_refs MANDATORY                       |   external    |
| Q-7 validator           | #2202        | `41778bd1`        | `tools/py/swarm_canonical_validator.py` 6 functions impl (ex-skeleton PR #2129)              |   included    |
| Q-8 workflow gate       | #2202        | `41778bd1`        | `.github/workflows/swarm-validation.yml` PR comment + hallucination_ratio gate 0.30          |   included    |
| Q-9 frontend Game/      | #2203        | `7092c24e`        | `offspringRitualPanel.js` + `legacyRitualApi.js` + DebriefView section + CSS                 |   included    |
| Q-10 Godot v2           | TBD          | TBD               | LegacyRitualPanel.gd parity wire cross-repo                                                  | **deferred**  |
| Q-11 E2E test           | this PR      | TBD               | `offspringRitualE2E.test.js` cross-encounter chain (3 cases)                                 |   included    |
| Q-12 closure            | this PR      | TBD               | ADR shipped + museum card + handoff + CLAUDE.md update                                       |   included    |

## 3. Effort actual vs estimated

| Stage               |  Estimated  |        Actual        |
| ------------------- | :---------: | :------------------: |
| Q.A                 |     ~3h     |        ~30min        |
| Q.B                 |    ~4.5h    |        ~50min        |
| Q.C                 |    ~7-9h    |        ~50min        |
| Q.D Q-9             |     ~2h     |        ~15min        |
| Q.E Q-11+Q-12       |    ~2.5h    |        ~30min        |
| **Total Game-side** | **~19-21h** | **~3h** (10x faster) |

Q-10 Godot v2 cross-repo ~2h deferred next session.

## 4. Pillar deltas

- **P2 Evoluzione emergente** 🟢++ → 🟢ⁿ (lineage chain visible cross-encounter player-side via DebriefView ritual section + 6-canonical mutations choice 3-of-6)
- **P5 Co-op vs Sistema** 🟢 → 🟢++ (Skiv-Pulverator alleanza arc canonical complete via offspring birth post-mating)

## 5. Anti-pattern killer

Engine LIVE / Surface DEAD ricorrenza chiusa (vedi `mating_nido-engine-orphan` museum card score 5/5). Da scoperta-2026-04-25 a shipping-2026-05-10 sera = 16 giorni cumulative.

## 6. Forbidden path grants

Master-dd cascade approval session sera "2+3" + "procedi" cascade Q.A→Q.B→Q.C→Q.D→Q.E:

- Q-1 `packages/contracts/` — schema contract
- Q-2 `migrations/` — Prisma additive 0008_offspring
- Q-7+Q-8 `.github/workflows/` — swarm-validation.yml workflow gate

## 7. Cross-repo pending

Q-10 Godot v2 `Game-Godot-v2/scripts/ui/legacy_ritual_panel.gd` parity wire deferred next session (richiede checkout Godot v2 worktree separato).

Trigger phrase canonical:

> _"Sprint Q+ Q-10 Godot v2 LegacyRitualPanel parity — checkout Game-Godot-v2 + impl GDScript bridge + test GUT"_

## 8. Test coverage

- AI baseline 393/393 verde (zero regression)
- API tests/api/offspringRitualRoutes.test.js: 8/8 verde (Q-4 contract)
- API tests/api/offspringRitualE2E.test.js: 3/3 verde (Q-11 cross-encounter)
- Tools tests/tools/test_swarm_canonical_validator.py: 9/9 verde (Q-7 validator)
- Total Sprint Q+ tests new: 20

## 9. Resume trigger phrases

Post-Q-10 Godot v2 ship:

> _"Sprint Q+ closure final — verify cross-stack contract + museum card + memory save"_

## 10. Refs

- Phase B accept: [`ADR-2026-05-05 §13.3`](ADR-2026-05-05-cutover-godot-v2-fase-3-formal.md#133-master-dd-verdict-fill-2026-05-14)
- Scope codification: [`docs/planning/2026-05-10-sprint-q-plus-full-scope-codification.md`](../planning/2026-05-10-sprint-q-plus-full-scope-codification.md)
- Pre-stage bundles: PR #2189 (Q.A) + PR #2190 (Q.B-Q.E)
- Museum card pending: M-2026-05-10-002 lineage-merge-canonical (TBD next session post-Q-10)
