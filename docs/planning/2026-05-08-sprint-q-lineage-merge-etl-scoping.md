---
title: 'Sprint Q+ LineageMergeService ETL scoping — GAP-12 deferred design doc'
doc_status: draft
doc_owner: master-dd
workstream: cross-cutting
last_verified: 2026-05-08
source_of_truth: false
language: it
review_cycle_days: 14
related:
  - docs/planning/2026-05-07-phase-a-handoff-next-session.md
  - docs/planning/2026-04-29-sprint-n7-failure-model-parity-spec.md
  - docs/adr/ADR-2026-04-28-deep-research-actions.md
tags: [sprint-q, lineage-merge, etl, gap-12, design-doc, scoping]
---

# Sprint Q+ LineageMergeService ETL scoping

GAP-12 audit godot-surface-coverage 2026-05-07 deferred Sprint Q+. Design-only scoping doc, **NO impl**. Output = effort estimate + Sprint Q+ ticket DoD + dependency chain.

## 1. Audit reality post-Phase-A LIVE

Engine LIVE Surface DEAD pattern persiste solo per GAP-12 (audit 14/15 closed Day 2 tarda sera 2026-05-07 via #215). Esiste contract break tra 3 layer:

| Layer                    | Status | File                                                                         |              Caller?               |
| ------------------------ | :----: | ---------------------------------------------------------------------------- | :--------------------------------: |
| Engine merge             |  LIVE  | `Godot-v2/scripts/lifecycle/lineage_merge_service.gd`                        |                 NO                 |
| Mating trigger           |  LIVE  | `Godot-v2/scripts/session/mating_trigger.gd`                                 |                 NO                 |
| Bond eval Game/          |  LIVE  | `apps/backend/services/campaign/ambitionService.js` (lines 161-225)          |                YES                 |
| Lineage propagator Game/ |  LIVE  | `apps/backend/services/generation/lineagePropagator.js` (`propagateLineage`) | LINE 10 stub: "deferred follow-up" |

**Contract break**: `ambitionService.evaluateChoiceRitual()` ritorna `lineage_merge: !!pathDef.lineage_merge` flag, ma **nessun caller invoke `propagateLineage()`** né cross-stack push to Godot v2 `LineageMergeService.trigger_bond_path_merge()`.

## 2. ETL pipeline canonical (target Sprint Q+)

```
[ Godot v2 combat session ]
        |
        | combat_ended signal + bond_hearts >= 3 + bond_path chosen
        ↓
[ Godot v2 MatingTrigger.generate_child_preview ]  ← DEAD (no caller)
        |
        | child_preview Dict { id, species, parent_ids, traits, bond_hearts }
        ↓
[ Godot v2 LegacyRitualPanel modal 30s ]  ← Sprint N.7 spec § 4 DRAFT
        |
        | mutation_chosen | ritual_skipped signal
        ↓
[ Godot v2 LineageMergeService.trigger_bond_path_merge ]  ← DEAD (no caller)
        |   - reads CampaignState.get_wounds(parent_a, parent_b)
        |   - merge + cap MAX_WOUNDS_PER_UNIT FIFO
        |   - CampaignState.set_wounds(offspring_id)
        ↓
[ Godot v2 → Game/ backend POST /api/v1/lineage/legacy-ritual ]  ← endpoint NON ESISTE
        |
        ↓
[ Game/ backend: ambitionService.recordChoiceRitualOutcome ]  ← function NON ESISTE
        |
        ↓
[ Game/ backend: lineagePropagator.propagateLineage(legacyUnit, speciesId, biomeId) ]  ← LIVE
        |
        ↓
[ DB persistence: campaignStore.upsertOffspring + Prisma write-through ]  ← entity NON ESISTE
        |
        ↓
[ Godot v2 debrief view: offspring panel "Cucciolo nato" + lifecycle phase = hatchling ]  ← DEAD
```

**Gap inventory**:

| ID   | Layer       | What                                                                                      | Effort |
| ---- | ----------- | ----------------------------------------------------------------------------------------- | :----: |
| Q-1  | Godot v2    | `MatingTrigger` wire `combat_ended` signal in `main.gd`                                   |  ~1h   |
| Q-2  | Godot v2    | `LegacyRitualPanel.tscn` scene + `legacy_ritual_panel.gd` 30s timer                       | ~3-4h  |
| Q-3  | Godot v2    | `LineageMergeService.trigger_bond_path_merge` caller post-ritual                          | ~30min |
| Q-4  | cross-stack | HTTPClient POST `/api/v1/lineage/legacy-ritual` Godot → Express                           |  ~1h   |
| Q-5  | Game/ BE    | NEW route `routes/lineage.js` + handler dispatch                                          | ~1-2h  |
| Q-6  | Game/ BE    | NEW `ambitionService.recordChoiceRitualOutcome(ritual_id, mutation_chosen, offspring_id)` |  ~1h   |
| Q-7  | Game/ BE    | Bind `propagateLineage` caller dentro recordChoiceRitualOutcome                           | ~30min |
| Q-8  | Prisma      | NEW model `Offspring { id, parent_a_id, parent_b_id, mutations, born_at, lineage_id }`    |  ~1h   |
| Q-9  | Game/ BE    | `campaignStore.upsertOffspring` write-through adapter                                     |  ~1h   |
| Q-10 | Godot v2    | `DebriefView.tscn` add `%OffspringPanel` + `offspring_panel.gd` render                    |  ~2h   |
| Q-11 | Godot v2    | `DebriefState.offspring_preview` field + `CombatLifecycleHook` populate                   | ~30min |
| Q-12 | Godot v2    | GUT test suite N.7 5 fixture canonical (vedi spec §7)                                     | ~2-3h  |

**Total effort ETL stimato**: ~14-17h, ~2-3 sessioni autonomous + 1 master-dd review gate.

## 3. Sprint Q+ ticket DoD

Gate 5 engine-wired DoD (CLAUDE.md §"Gate 5"):

1. ✅ `MatingTrigger` ha caller in `main.gd` post `combat_ended` signal (smoke probe: trigger combat with 2 surviving allies bond_hearts ≥ 3)
2. ✅ `LegacyRitualPanel.tscn` mostra modal 30s timer + 3 mutation choice button + voice line label diegetic
3. ✅ `LineageMergeService.trigger_bond_path_merge` invoked post-ritual mutation_chosen signal
4. ✅ Endpoint `POST /api/v1/lineage/legacy-ritual` LIVE Game/ backend, ritorna 200 + offspring_id
5. ✅ `Offspring` Prisma entity persisted, query `prisma.offspring.findUnique` ritorna riga
6. ✅ `DebriefView` mostra `%OffspringPanel` con "Cucciolo nato: <species_canonical> · ferite ereditate: N · prossima fase: hatchling"
7. ✅ GUT 5/5 fixture pass (spec §7)
8. ✅ Backend test `tests/api/lineageRitual.test.js` 4+ case pass
9. ✅ Smoke E2E user-visible: master-dd vede offspring panel post combat win con bond_path

## 4. Sprint dependency chain

```
Sprint Q+ pre-req:
  - ✅ ADR-2026-05-05 ACCEPTED Phase A (DONE 2026-05-07)
  - ✅ Phase B trigger 7gg grace passed (target 2026-05-14+)
  - ✅ Phase B 1+ playtest pass post-cutover (master-dd userland)
  - ⏸ Master-dd verdict "Phase B ACCEPTED, archive web v1 formal"

Sprint Q+ blocks:
  - Sprint R+ (offspring instantiation in next encounter as PG controllable unit)
  - Sprint S+ (cross-encounter genealogy tree UI)
```

**Critical path**: Sprint Q+ è downstream Phase B. NON anticipare pre-Phase-B accept. Rationale:

- Mating + offspring = post-combat event, surface = debrief view. Phase A monitoring window primary scope = stability cutover, NON nuove feature.
- Pre-Phase-B impl rischia regressione su `DebriefView` cutover-critical surface (debrief è P5 Co-op anchor TV scene).
- Master-dd playtest Phase B trigger 2/3 = signal canale P5 stable. Solo dopo è safe ship Q+.

## 5. Effort breakdown stimato

| Phase | Tickets                                                 | Effort | Sessions autonomous |   Master-dd gate    |
| ----- | ------------------------------------------------------- | :----: | :-----------------: | :-----------------: |
| Q.A   | Q-1, Q-2, Q-3 (Godot v2 wire mating + ritual + merge)   |  ~5h   |          1          |     review GUT      |
| Q.B   | Q-4, Q-5, Q-6, Q-7 (cross-stack HTTP + ambition record) | ~3-4h  |          1          | review API contract |
| Q.C   | Q-8, Q-9 (Prisma + write-through adapter)               |  ~2h   |         0.5         | migration approval  |
| Q.D   | Q-10, Q-11 (debrief surface)                            | ~2.5h  |         0.5         |      review UX      |
| Q.E   | Q-12 + tests/api/lineageRitual.test.js                  | ~3-4h  |          1          |  gate fail = block  |

**Total**: ~3-4 sessioni autonomous + 4 master-dd review gate. Calendar ~1 settimana se Phase B accepted + master-dd 2 review/giorno cadence.

## 6. Risks + mitigation

| Risk                                                    | Impact | Mitigation                                                                                                                                                          |
| ------------------------------------------------------- | :----: | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Prisma migration rompe Phase A baseline                 |  HIGH  | Migrazione in branch isolato, regression test Game/ + Godot v2 main pre-merge. Migration auto-merge L3 BLOCKED (forbidden path `migrations/`) — master-dd manual.   |
| HTTPClient Godot timeout WAN RTT                        |  MED   | 5s timeout + retry-once + graceful fallback (ritual outcome locale, sync deferred via campaign_state.tres)                                                          |
| 30s ritual timer rompe pause game                       |  MED   | `set_process_mode(PROCESS_MODE_ALWAYS)` + `Engine.set_time_scale(0)` su gameplay node mirror N.7 spec §8                                                            |
| Offspring infinite chain → DB bloat                     |  LOW   | Cap `MAX_WOUNDS_PER_UNIT = 5` + cascade delete on unit retire (Prisma onDelete)                                                                                     |
| Cross-stack regression Game/ ↔ Godot v2 contract drift |  MED   | Schema contract `packages/contracts/schemas/lineage_ritual.schema.json` NEW, AJV validate both sides. forbidden path `packages/contracts/` = master-dd manual gate. |

## 7. Decisione richiesta master-dd pre-Sprint-Q-kickoff

1. **Hard gate**: Phase B ACCEPTED (post 7gg grace + 1+ playtest pass) — bloccante absolute
2. **Schema contract `lineage_ritual.schema.json`** master-dd review obbligatorio (forbidden path `packages/contracts/`)
3. **Prisma migration `Offspring` model** master-dd manual approve (forbidden path `migrations/`)
4. **MUTATION_LIST canonical** (3 mutation choice in LegacyRitualPanel) — master-dd narrative call. Default proposed: 6 mutation generic (vedi appendice A).
5. **HTTP API auth**: `/api/v1/lineage/legacy-ritual` JWT required? Default proposed: usa JWT esistente cross-stack.
6. **Sprint Q+ scope freeze vs incremental**: full ETL Q.A→Q.E in 1 settimana, OR incremental Q.A only ship + master-dd review pre-Q.B kickoff?

## 8. Out-of-scope (Sprint R+ deferred)

- Offspring instantiation come **playable PG unit** in next encounter (richiede roster injection + UI character creation flow)
- Genealogy tree UI cross-encounter (multi-generation lineage history)
- Mutation list expansion oltre 6 canonical (modding hook)
- Cross-campaign offspring transfer (multi-campaign genealogy export)

## 9. References

- Audit: [`Game-Godot-v2/docs/godot-v2/qa/2026-05-07-godot-surface-coverage-audit.md`](../../../Game-Godot-v2/docs/godot-v2/qa/2026-05-07-godot-surface-coverage-audit.md) — GAP-12 row 31
- Spec sorgente: [`docs/planning/2026-04-29-sprint-n7-failure-model-parity-spec.md`](2026-04-29-sprint-n7-failure-model-parity-spec.md) §4-§8
- Engine canonical: `Game-Godot-v2/scripts/lifecycle/lineage_merge_service.gd` (3 static method, 77 LOC LIVE)
- Engine canonical: `Game-Godot-v2/scripts/session/mating_trigger.gd` (164 LOC LIVE)
- Cross-stack: `apps/backend/services/campaign/ambitionService.js` lines 161-225 (evaluateChoiceRitual LIVE)
- Cross-stack: `apps/backend/services/generation/lineagePropagator.js` (`propagateLineage` LIVE, line 10 deferred-caller TODO)
- Handoff parent: [`docs/planning/2026-05-07-phase-a-handoff-next-session.md`](2026-05-07-phase-a-handoff-next-session.md) §"Day 2/7 tarda sera"

## Appendice A — Mutation list proposed (6 canonical)

Default placeholder per master-dd narrative review pre-impl:

1. `armatura_residua` — +5% defense_mod permanent (Skiv-themed: scaglie indurite)
2. `tendine_rapide` — +1 mp permanent (cheetah-trait inheritance)
3. `cuore_doppio` — +10% max_hp permanent
4. `vista_predatore` — +5% crit_chance permanent
5. `lingua_chimica` — unlock trait `chemioception` (P1 tactica scout buff)
6. `memoria_ferita` — bond_hearts +1 starting next encounter (anti-frustration P6)

Bilanciamento target: tutte mutazioni < +10% raw stat. Cap 1 mutation per ritual. Stack capped 5 cross-encounter (mirror MAX_WOUNDS_PER_UNIT FIFO).

---

**Status**: SPEC DRAFT scoping. Approval pending master-dd post-Phase-B-trigger.
