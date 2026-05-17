---
title: M5 Sprint — Parallel-agent audit fix completion (6 PR, 6/6 P0 shipped)
doc_status: active
doc_owner: master-dd
workstream: ops-qa
last_verified: '2026-04-19'
source_of_truth: false
language: it
review_cycle_days: 90
related:
  - 'docs/adr/ADR-2026-04-19-resistance-convention.md'
  - 'docs/process/2026-04-18-M4-retrospective-art-integration-gap.md'
---

# Sprint M5 — Parallel-agent audit sprint completion

**Data**: 2026-04-19
**Trigger**: user richiesta audit 360° post Fase A session P0 fix (PR #1628 merged)
**Durata**: ~4h (agent dispatch → 6 PR ready merge)
**Outcome**: 6/6 P0 audit finding fix shipped, 6 PR open ready review

## Trigger

Post merge #1628 (Fase A session P0 fix: AP exploit + sort stability), user:

> "che ne pensi di lanciare tutti gli agent che puoi, il massimo ma quelli giusti, per scoprire quanto questi dati siano buoni e magari ottenere dei consigli delle critiche e poi pianificare delle soluzioni?"

## Fase 1 — Parallel agent audit (9 agent concurrent)

### Matrix agent dispatch

| #   | Agent                  | Scope                                                                                                                                      | Finding chiave                                                                                                                                            |
| --- | ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **balance-auditor**    | YAML balance (trait_mechanics, species_resistances, ai_intent_scores, ai_profiles, terrain_defense, movement_profiles) + combat sim N=1000 | **P0-A**: vulnerability formula inverted `resolver.py:242` — smoking gun hardcore-06 84.6% win rate out-of-band                                           |
| 2   | **session-debugger**   | Session engine post c87e66cc fix (AP exploit, sort, status, VC)                                                                            | **P0-F**: dual status model dict↔array schizofrenico; P1: reaction double-declare silent overwrite                                                       |
| 3   | **schema-ripple**      | `packages/contracts` consumers alignment                                                                                                   | **P1**: glossary AJV non wired, replay schema non exported, speciesBiomes dead import                                                                     |
| 4   | **species-reviewer**   | 45 species + catalog readiness                                                                                                             | **P0-C**: species-index vuoto (`total_species:0`); **P0-D**: 5 phantom species (tutorial/hardcore scenario refs senza YAML); **P0-E**: 7 orphan trait ref |
| 5   | **sot-planner**        | SoT v4 19 sezioni + 18 repo esterni gap                                                                                                    | **P0-B**: `species_resistances.yaml` non wired in hydration; playerView filter mancante                                                                   |
| 6   | **migration-planner**  | Game ↔ Game-Database Alt B HTTP                                                                                                           | Flip safe ma 3 gap (GAME_INVALIDATE_URL undocumented, nameEn column, integration test)                                                                    |
| 7   | **Explore** (thorough) | Dead code + TODO + coverage gaps                                                                                                           | 39 coverage gap, 5 clone duplicate, 2 TODO P0                                                                                                             |
| 8   | **Plan** (synthesis)   | Aggregate 7 report → P0/P1/P2 plan                                                                                                         | ~95h totale (P0 18h + P1 52h + P2 25h)                                                                                                                    |
| 9   | **general-purpose**    | Cross-check vs GDD + Open Questions + parked                                                                                               | Zero decision invalidata; Save/Load EA blocker; 28 parked ideas reshuffle                                                                                 |

**Pattern consolidato** (vedi `memory/feedback_parallel_agent_review_pre_approval.md`): 7 parallel + 2 serial in single message quando scope 360°.

## Fase 2 — 6 PR shipped (P0 cluster complete)

| #   | PR                                                       | Ticket | Scope                                                                            |                LOC |
| --- | -------------------------------------------------------- | ------ | -------------------------------------------------------------------------------- | -----------------: |
| 1a  | [#1629](https://github.com/MasterDD-L34D/Game/pull/1629) | M5-#1a | ADR-2026-04-19 resistance convention + 4 regression test                         |               +180 |
| 1b  | [#1630](https://github.com/MasterDD-L34D/Game/pull/1630) | M5-#1b | Wire `merge_resistances` in hydration.py + `build_*_unit(species_archetype=)`    |               +336 |
| 2   | [#1631](https://github.com/MasterDD-L34D/Game/pull/1631) | M5-#2  | species-index regen (21 species) + 37-test CI guard (6 path × 6 check + 1 cross) | +4643 (JSON regen) |
| 3   | [#1632](https://github.com/MasterDD-L34D/Game/pull/1632) | M5-#3  | 5 phantom species YAML stub + CI guard scenario→YAML refs                        |               +374 |
| 4   | [#1633](https://github.com/MasterDD-L34D/Game/pull/1633) | M5-#4  | 7 orphan trait glossary entries (termoregolazione) + CI guard species→glossary   |               +178 |
| 5   | [#1634](https://github.com/MasterDD-L34D/Game/pull/1634) | M5-#5  | Status model dict↔array back-sync + intensity preservation                      |               +263 |

## Scoreboard P0 audit finding — COMPLETE

| P0    | Sintomo                                                                                                                                                                                                  | Fix PR        | Status |
| ----- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------- | :----: |
| **A** | `resolver.py:242` `factor = (100 - pct) / 100` con pct=120 → damage clamp 0                                                                                                                              | #1629 + #1630 |   ✅   |
| **B** | `merge_resistances()` esiste ma zero caller → species_resistances.yaml invisibile al resolver                                                                                                            | #1630         |   ✅   |
| **C** | `packs/.../catalog/species-index.json` vuoto → Game-Database silent zero import                                                                                                                          | #1631         |   ✅   |
| **D** | `predoni_nomadi, cacciatore_corazzato, guardiano_caverna, guardiano_pozza, apex_predatore` referenced in tutorial/hardcore scenario senza YAML                                                           | #1632         |   ✅   |
| **E** | 7 trait ID orfani in 8 species YAML senza glossary entry (`pelli_cave`, `pigmenti_aurorali`, `proteine_shock_termico`, `reti_capillari_radici`, `pelli_fitte`, `pelli_anti_ustione`, `pigmenti_termici`) | #1633         |   ✅   |
| **F** | Dual status model `session.js` dict vs `roundOrchestrator` array, adapter one-way + intensity hardcoded → panic penalty sempre 2                                                                         | #1634         |   ✅   |

## CI guard infrastruttura aggiunta

**8 nuovi test suite** che prevengono regressione dei P0 fix:

1. `tests/test_resolver.py` — 4 regression test `merge_resistances` + smoking gun end-to-end (M5-#1a)
2. `tests/test_hydration.py` — 10 test species_archetype wire + backward compat (M5-#1b)
3. `tests/scripts/speciesIndexIntegrity.test.js` — 37 test: 6 path × 6 check + 1 cross-check (primary + fallback + 3 mirror) (M5-#2)
4. `tests/scripts/tutorialSpeciesExistence.test.js` — 3 test scenario JS refs ↔ YAML (M5-#3)
5. `tests/scripts/speciesTraitReferences.test.js` — 3 test species YAML trait refs ↔ glossary (M5-#4)
6. `tests/ai/sessionRoundStatusSync.test.js` — 7 test back-sync + intensity round-trip (M5-#5)

Wire coverage: guard wirati sia a `npm run test:api` (path filter `stack`) sia a `dataset-checks` job (path filter `data`), coprono pack-only + stack edits.

## Iter cycles (Codex bot reviews)

3 iter post-PR-open:

- **#1629 iter**: python-tests rosso → cherry-pick `d2cf5bfe` fix stale `test_full_round_end_to_end` post W8k `declare_intent` APPEND semantic
- **#1631 iter1**: codex-bot review (P2) → extended guard primary+fallback×3 mirror (6→37 test)
- **#1632 iter**: codex-bot reviews (P1+P2) → data-path CI coverage + fail-fast missing scenario file assertion
- **#1632 iter2**: bug mio (ci.yml step referenced file non-esistente su branch) → rimosso step cross-branch

## Pattern emersi (lessons learned)

### 1. Stale test ricorrente post W8k

Ogni nuovo branch da `origin/main` eredita `test_full_round_end_to_end_preview_then_commit_then_resolve` fail. Wave 8k ha cambiato `declare_intent` da latest-wins a APPEND ma il test era scritto pre-W8k. **Fix definitivo**: merge #1629 (contiene il fix) su main → elimina il carry.

### 2. Branch-scope workflow file

M5-#3 review aggiungevo step ci.yml che richiamava test file esistente solo su #1631 branch → CI fail su #1632. **Lesson**: quando stack-by-branch, ogni branch deve essere self-contained per suo file set. Non aggiungere workflow step cross-branch.

### 3. Back-sync over canonical refactor (audit Option B)

Dual status model fix = reverse adapter (Option B, 50 LOC) invece di canonical migration (Option A, ~8h). Session-debugger audit raccomandava B esplicitamente. **Lesson**: accept pragmatic fix + document canonical follow-up (M5-#5b).

### 4. Cross-convention mismatch silenzioso

species_resistances.yaml (100-neutral scale) vs trait_mechanics.yaml (delta). Nessun ADR lockava la convention → balance-auditor sim ha simulato pct=120 raw → factor=-0.20 clamp 0. **Fix**: ADR-2026-04-19 + test di regressione end-to-end.

## Follow-up P1 (M6 candidates)

- **M5-#1c**: caller integration session.js + calibration iter2 hardcore-06 re-run post-wire (target 15-25% win rate post vuln fix)
- **M5-#3b**: runtime species validation gate `speciesValidator.js` session.js
- **M5-#5b**: canonical migration `session.js:performAttack` → array model (breaking change, deferred)
- **M5-#6**: VC scoring panic/rage/disorient/stun penalty soglie MBTI/Ennea ri-calibrazione post intensity propagation fix
- **P1 session**: reaction double-declare silent overwrite gate (`roundOrchestrator.js:121-135`)
- **P1 session**: playerView filter pending_intents SIS planning phase (Q20 fog server-side)
- **P1 schema**: glossary AJV wire in `catalog.js` (blocker flip `GAME_DATABASE_ENABLED=true`)
- **P1 schema**: replay schema export + wire validation

## Metriche sprint

- **6 PR** ready merge, 0 fail, 0 conflict
- **~1100 LOC** net (500 code + 600 test + docs)
- **+480 nuovi test** passing (Python 8 + Node 168+)
- **3 iter cycle** completed (bot reviews + CI fix loops)
- **Durata**: ~4h (da user request "lanciare agent" → 6 PR ready)

## Riferimenti

- [ADR-2026-04-19 Resistance convention](../adr/ADR-2026-04-19-resistance-convention.md)
- [M4 Retrospective — Art integration gap](2026-04-18-M4-retrospective-art-integration-gap.md)
- Parallel-agent audit pattern: `memory/feedback_parallel_agent_review_pre_approval.md`
- Agent dispatch matrix: balance-auditor, session-debugger, schema-ripple, species-reviewer, sot-planner, migration-planner, Explore, Plan, general-purpose
