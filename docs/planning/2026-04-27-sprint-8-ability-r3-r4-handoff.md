---
title: 'Sprint 8 Ability r3/r4 tier progressive — handoff 2026-04-27'
date: 2026-04-27
doc_status: active
doc_owner: master-dd
workstream: cross-cutting
last_verified: '2026-04-27'
source_of_truth: false
language: it
review_cycle_days: 30
tags: [handoff, sprint, jobs, ancient-beast, tier-s, ability-progression]
related:
  - docs/planning/2026-04-27-sprint-7-beast-bond-handoff.md
  - docs/adr/ADR-2026-04-27-ability-r3-r4-tier.md
  - docs/balance/2026-04-27-numeric-reference-canonical.md
  - data/core/jobs.yaml
  - apps/backend/services/jobsLoader.js
  - apps/backend/services/abilityExecutor.js
  - tests/api/jobs.test.js
  - CLAUDE.md
---

# Sprint 8 Ability r3/r4 tier progressive — handoff 2026-04-27

> Scope: 1 PR autonomous shipped (~6h effort) — final closure AncientBeast Tier S #6 (4/4 100%).
> Trigger: Sprint 7 handoff §6 backlog residuo Tier S #6 "Ability r3/r4 tier progressive ~10h P3+".
> Pattern source: AncientBeast Tier S #6 ability rank progression (extraction matrix Sprint 1-5).

## §1 — Sessione output

**1 PR shipped** ([#1978](https://github.com/MasterDD-L34D/Game/pull/1978)):

| PR    | Sprint               | Scope                                                                                                                                                                                                                                      |   Status   |
| ----- | -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | :--------: |
| #1978 | 8 Ability r3/r4 tier | jobs.yaml v0.1.0 → v0.2.0 (+14 ability nuove, 21→35 base) + cost ladder canonical 3/8/14/22 PI + 5 test cost ladder/naming/sort/version + 1 e2e phantom_step + ADR-2026-04-27 + numeric-reference §12 + stato-arte §B.1.5 marked 0 residui | 🟡 PENDING |

## §2 — Pillars status delta

| #   | Pilastro     | Pre Sprint 8 | Post Sprint 8 | Delta                                                                                                                                          |
| --- | ------------ | :----------: | :-----------: | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| P3  | Specie × Job |    🟢c++     |      🟢ⁿ      | Rank progression complete (3→8→14→22 PI). Encounter design ora ha range progressione PI 8× spread. Mid-campaign capstone unlock target chiaro. |

**Score finale post Sprint 1-8**: **5/6 🟢 def/ⁿ + 1/6 🟢c** (P5 unblock playtest live unchanged).

## §3 — Decisioni chiave

### Cost ladder canonical (curva quasi-quadratica)

| Rank | cost_pi | cost_ap | Scope                                                                    |
| :--: | :-----: | :-----: | ------------------------------------------------------------------------ |
|  r1  |    3    |   0-2   | Utility / single-target base (2 ability/job, default unlock)             |
|  r2  |    8    |   1-2   | Capstone parziale (1 ability/job, prima maggiore investitura)            |
|  r3  | **14**  | **1-2** | Mid-tier upgrade (1 ability/job, +1 dmg_step / range +1 / duration +1)   |
|  r4  | **22**  | **2-3** | Capstone signature (1 ability/job, AoE 3x3-4x4 / +3-5 dmg_step / status) |

Curva 3 → 8 → 14 → 22 incrementi `+5/+6/+8` — late investment reward + scoraggia rush.

### 14 ability nuove (per job, 7 base job × 2)

| Job        | r3 (cost_pi 14) | effect_type   | r4 (cost_pi 22)   | effect_type      |
| ---------- | --------------- | ------------- | ----------------- | ---------------- |
| skirmisher | phantom_step    | move_attack   | dervish_whirlwind | multi_attack     |
| vanguard   | aegis_stance    | buff          | bulwark_aegis     | aoe_buff         |
| warden     | chain_shackles  | aoe_debuff    | void_collapse     | aoe_debuff       |
| artificer  | arcane_renewal  | team_heal     | convergence_wave  | team_buff        |
| invoker    | arcane_lance    | ranged_attack | apocalypse_ray    | surge_aoe        |
| ranger     | hunter_mark     | debuff        | headshot          | execution_attack |
| harvester  | vital_drain     | drain_attack  | lifegrove         | team_heal        |

### Vincolo runtime CRITICAL

Tutte le 14 ability nuove **riusano i 18 effect_type esistenti** in `abilityExecutor.js`. **Zero nuovi runtime types, zero modifica all'executor** — extension data-only.

Verifica programmatica eseguita: `loadJobs()` + `extractAbilities()` walk completo, 47 ability totali (35 base + 12 expansion), 0 unsupported effect_type.

### Resource gating r4 (capstone)

| Job        | Resource | Gate                           |
| ---------- | -------- | ------------------------------ |
| skirmisher | PP       | ≥ 10                           |
| vanguard   | PT       | ≥ 8                            |
| warden     | PT       | ≥ 10                           |
| artificer  | PP       | ≥ 10                           |
| invoker    | SG       | **= 100** (full gauge consume) |
| ranger     | PP       | ≥ 12                           |
| harvester  | PT       | ≥ 10                           |

### Version bump

`jobs.yaml` `version: "0.1.0" → "0.2.0"` per signal-trigger downstream consumer (Game-Database catalog import via `npm run sync:evo-pack` + `evo:import` post-merge).

## §4 — Test enforcement

- `tests/api/jobs.test.js` — 9 → **14 test** (+5 nuovi):
  - r3/r4 progression: tutti i 7 base job hanno 5 abilities con rank 1-1-2-3-4 sorted
  - r3/r4 cost ladder canonical: cost_pi 14 (r3) + 22 (r4) per tutti i base job + monotonic ap_cost
  - r3/r4 ability_id naming: lowercase snake_case + globally unique
  - r3/r4 specific keys per effect_type: damage_step_mod / heal_dice / aoe_size / conditional_status presenti
  - jobs.yaml version bump 0.1.0 → 0.2.0
  - 2 test esistenti aggiornati (skirmisher abilities.length 3 → 5, vanguard ability_ids extended con aegis_stance + bulwark_aegis + r3/r4 ladder check)
- `tests/api/abilityExecutor.test.js` — 35 → **36 test** (+1):
  - Sprint 8 phantom_step (r3 move_attack) e2e: dispatch via existing executor (no new runtime path)

**AI baseline post-Sprint 8**: **382/382 ✓** unchanged (was 382 post-Sprint 7).

## §5 — AncientBeast Tier S #6 — closure 4/4 (100%)

| #   | Pattern                            | Sprint | PR           |
| --- | ---------------------------------- | :----: | ------------ |
| 1   | 3 nuovi channel (earth/wind/dark)  |   6    | #1964 ✅     |
| 2   | Beast Bond reaction trigger        |   7    | #1971 ✅     |
| 3   | Beast Showcase wiki cross-link     |   3    | #1937 ✅     |
| 4   | **Ability r3/r4 tier progressive** | **8**  | **#1978 ✅** |

**Stato finale**: AncientBeast Tier S #6 **100% closed**.

## §6 — Next session entry points

**Bundle deep (~10h, P4+)**:

- **Internal voice 4-MBTI axes narrative log** (Disco Tier S #9 stretch, ~10h, P4) — debrief con voce-per-axis durante combat hint. Estende `mbtiSurface.js` + nuovo `internalVoice.js` service.
- **Wildermyth layered storylets pool** (Tier S #12 residuo, ~10h, P4 narrative) — pool weighted pick post-encounter con stagger probability.

**Bundle mid (~5h)**:

- **Defender's advantage AI integration** (P3, B.1.9 1 pattern residuo, ~3h) — extend AI policy engine per riconoscere defender role + cover bias decision.
- **Recall economy formula** (B.1.4 ~5h) — `recall_cost` formula con tier scaling roster overlay.

**Bundle deferred**:

- **Balance pass r3/r4** — N=10 batch validation cost ladder + damage scaling (Sprint 8 ship docs deferral). Userland harness execution.
- **Random map generator weighted noise** (~15h) — beyond hand-authored encounter.

## §7 — Doc updates

- ✅ `docs/adr/ADR-2026-04-27-ability-r3-r4-tier.md` Accepted
- ✅ `docs/balance/2026-04-27-numeric-reference-canonical.md` §12 nuova sezione rank progression matrix
- ✅ `docs/reports/2026-04-27-stato-arte-completo-vertical-slice.md` §B.1.5 marked 0 residui (Tier S #6 100%) + vertical slice tree (Ability r3/r4 marked ✅)
- ✅ Memory file `project_sprint_8_ability_r3_r4.md` + MEMORY.md index entry
- ✅ Handoff doc (questo file)
- ✅ CLAUDE.md sprint context bump
- ✅ BACKLOG.md audit log Sprint 8 entry

## §8 — Game-Database sync trigger

`jobs.yaml` v0.2.0 richiederà propagazione downstream lato Game-Database repo (`MasterDD-L34D/Game-Database`):

1. Lato Game (this repo): `npm run sync:evo-pack` rebuilds catalog mirror in `packs/evo_tactics_pack/docs/catalog/`.
2. Lato Game-Database: `npm run evo:import` legge catalog mirror e ingesta jobs/abilities in Postgres.

Trigger documentato qui per memoria — esecuzione userland post-merge PR #1978.

## §9 — Operational notes

- **Frontend consumer impact zero**: `apps/play/src/abilityPanel.js` + `codexPanel.js` iterano array dinamicamente (no hardcoded length). Mission Console pre-built bundle auto-rispecchia via JSON catalog.
- **Test churn minimo**: 2 esistenti hardcodavano `abilities.length === 3` su skirmisher/vanguard — updated a 5. Naming convention `unlock_r3` / `unlock_r4` mantiene parity con `unlock_r1_1` / `unlock_r1_2` / `unlock_r2`.
- **Balance non playtest**: cost ladder + damage scaling **non** validato via N=10 batch. Schema/cost integrity verificati (5 test enforcement) + runtime smoke (phantom_step e2e) verde. Calibration deferred a sprint dedicato.
- **Capstone gate signature**: invoker.apocalypse_ray richiede SG **= 100** (full gauge consume + reset stress 0). Resource_usage primary di ogni job (PP/PT/SG/Seed) gated alto su r4 — design intent reward post-investment.

## §10 — Memory ritual 5/5

1. ✅ CLAUDE.md sprint context bump
2. ✅ BACKLOG.md audit log Sprint 8 + Tier S #6 closure 100%
3. ✅ Stato-arte §B.1.5 marking Ability r3/r4 ✅ (4/4 closure)
4. ✅ Memory file `project_sprint_8_ability_r3_r4.md`
5. ✅ Handoff doc (this file)
