---
title: 'Derived-canon salvage -- progress reconstruction (2026-06-23)'
date: 2026-06-23
doc_status: active
doc_owner: claude-code
workstream: dataset-pack
last_verified: '2026-06-23'
source_of_truth: false
review_cycle_days: 90
tags: [salvage, derived, trait, species, progress, handoff, reconstruction]
---

# Derived-canon salvage -- progress reconstruction

> Ground-truth = git (`origin/main`), not narrative. Every "DONE" below is a
> merged commit on main (SHA cited). Verified 2026-06-23.

## Program goal

No silent drops: every retired trait + the 14 retired creatures earn canon status
by passing the established gates, on a pipeline first made reproducible. Three
deliverables: (1) implement the 12 ratified creature-kit trait mechanics; (2)
canonize the 14 creatures (IP-safe); (3) a single owner-gated catalog/affinity
re-baseline. Roadmap: `docs/superpowers/plans/2026-06-22-derived-canon-salvage-roadmap.md`.

## Merged on main (the spine)

| PR                                                       | SHA        | Phase               | Delivered                                                                                                                                                                                                                                                                                                                                                            |
| -------------------------------------------------------- | ---------- | ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [#2971](https://github.com/MasterDD-L34D/Game/pull/2971) | `95ffee23` | 0 Foundation        | reproducibility guard `tools/py/check_derived_reproducible.py` + deterministic bridge (LF + order-preserving + schema_version) + idempotent `promote_gameplay_to_canon` (`--catalog`/`--out` + stub-upgrade) + runbook `docs/guide/derived-artifacts-reproducibility.md`                                                                                             |
| [#2973](https://github.com/MasterDD-L34D/Game/pull/2973) | `87fc3d9b` | 1.5 + GAP1          | `tools/py/add_trait_stub.py` (atomic trait-add through the 5 gates) + **35 GAP1 trait stubs** authored (16 `starter_bioma_*` dropped, 2 statuses excluded)                                                                                                                                                                                                           |
| [#2975](https://github.com/MasterDD-L34D/Game/pull/2975) | `c0bae655` | design + slice 1    | ratified design docs (12-trait mechanics spec + 14-creature proposal + engine plan) + `resonant-claw-hunter.yaml` full spec + **slice 1**: `inibito` status + ability-suppression guard (`combat/abilitySuppression.js` @ `executeAbility`) + `matrice_antimagia` Mode B (on-hit inibito)                                                                            |
| [#2976](https://github.com/MasterDD-L34D/Game/pull/2976) | `37b70964` | ability-grant infra | master-dd "Infra completa AoE": traitMechanics schema (FORBIDDEN, authorized: `+suppress_ability` enum `+aoe_size/range`) + **jobs.yaml re-baseline** (3rd derived-drift family, ~842 stale lines) + `matrice_pulse` (Mode A AoE) + handlers `executeSuppressAbility` + `executeApplyStatus` (un-dormants the trait-native apply_status abilities) ; sentinel 18->20 |
| [#2978](https://github.com/MasterDD-L34D/Game/pull/2978) | `4efaefb9` | slice 2             | **nuclei_di_controllo weak-point** (first PASSIVE-aura slice): `combat/nucleiWeakPoint.js` + statusModifiers consumer + passiveStatusApplier producer + performAttack wire + `PERSISTENT_STATUS_KEYS` durability                                                                                                                                                     |
| [#2983](https://github.com/MasterDD-L34D/Game/pull/2983) | `ab884418` | slice 3             | **ally_aura_mark primitive** (`combat/allyAuraMark.js` broadcastAura + refreshNucleiCoordinamento) + **corteccia_memetica** (DR2 at the mitigation seam + single-use risonanza broadcast) + **nuclei full** (3rd state nucleo_distrutto + burst2 + coordinamento aura); `PERSISTENT_STATUS_KEYS += nucleo_distrutto + coordinamento` (real + spec-mirror)            |
| [#2985](https://github.com/MasterDD-L34D/Game/pull/2985) | `1e7d7e5e` | slice 4             | **artigli_psionici** (read-the-prey source-marked DR, off-status `_lettura_preda` map predicated on attacker id) + **tessuti_adattivi** (channel adaptation; +15% resist via a separate `applyResistance` pass bypassing the frozen `target._resistances` cache). volo I deferred (move-cost substrate absent)                                                       |
| [#2988](https://github.com/MasterDD-L34D/Game/pull/2988) | `1c5712f6` | slice 5             | **filtri_bioattivi** passive (once-per-round cleanse 1 bleeding + 1 fracture + heal 1, object-map @ end-of-round) + **membrane_osmotiche** `duration_absorb` (incoming status durations -1, both apply sites). filtri-active / membrane-terrain / volo II-III deferred                                                                                               |
| [#2995](https://github.com/MasterDD-L34D/Game/pull/2995) | `f3689c10` | slice 7             | **pigmenti_aurorali** passive glow (HP>=50% -> abbagliato -1 atk on adjacent enemies; durable + single-use, P1 decay-timing bug found+fixed). pigmenti-active + eco_sismico deferred                                                                                                                                                                                 |

Band-neutral throughout: no sim unit carries the new traits, so the AI baseline is
byte-stable (554 -> 557 across the whole arc; the +N are new sync tests, not sim changes).

## Trait mechanics -- 12 ratified (spec `2026-06-22-creature-trait-mechanics-design.md`)

| #   | trait                                  | status                                                                 | where                                                                                                                                                                                                                                           |
| --- | -------------------------------------- | ---------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| --  | `inibito` prereq (ability suppression) | **DONE**                                                               | abilitySuppression.js + guard (#2975)                                                                                                                                                                                                           |
| 3   | matrice_antimagia                      | **DONE** (Mode A AoE + Mode B on-hit)                                  | #2975 + #2976                                                                                                                                                                                                                                   |
| 8   | nuclei_di_controllo                    | **DONE** (3-state intact->danno->distrutto+burst + coordinamento aura) | #2978 + #2983                                                                                                                                                                                                                                   |
| 2   | artigli_psionici (read-the-prey DR)    | **DONE**                                                               | #2985                                                                                                                                                                                                                                           |
| 4   | corteccia_memetica                     | **DONE**                                                               | #2983                                                                                                                                                                                                                                           |
| 11  | tessuti_adattivi (channel resist)      | **DONE**                                                               | #2985                                                                                                                                                                                                                                           |
| 1   | adattamento_volo (3 grades)            | **DEFERRED** (substrate-gated)                                         | grade I deferred #2985: live move calc is pure Manhattan, NO terrain move-cost term to ignore (movement_profiles.yaml terrain_cost_multiplier dormant, 0 consumers); grades II/III need elevation/altitude. design-to-engine call for master-dd |
| 6   | filtri_bioattivi (cleanse_status)      | **DONE** (passive cleanse; active deferred)                            | #2988                                                                                                                                                                                                                                           |
| 7   | membrane_osmotiche (duration_absorb)   | **DONE** (absorb; terrain-heal deferred)                               | #2988                                                                                                                                                                                                                                           |
| 9   | pigmenti_aurorali (end-round sweep)    | **DONE** (passive glow; active deferred)                               | #2995                                                                                                                                                                                                                                           |
| 5   | eco_sismico (tile timed-status)        | **DEFERRED** (substrate-gated)                                         | tile-entry trigger needs the move/terrain substrate (units entering zona_risonante) -- same fork as volo/radici; defer to avoid colliding with the substrate build                                                                              |
| 1   | adattamento_volo (3 grades)            | **DEFERRED** (substrate-gated)                                         | grade I: live move calc is pure Manhattan, no terrain move-cost term; grades II/III need elevation/altitude/0-move. design-to-engine call                                                                                                       |
| 10  | radici_ancora_planare                  | **DEFERRED** (substrate-gated)                                         | needs a 0-move producer + flat-DR path; same move-substrate fork                                                                                                                                                                                |

**Score: 9.5 / 12 built** (inibito prereq + matrice + nuclei + corteccia + artigli + tessuti +
filtri-passive + membrane-absorb + pigmenti-passive). The remaining 2.5 are ALL gated:
**eco_sismico + volo I/II/III + radici** on the move/terrain/elevation substrate (being built
separately) ; the **active modes** (filtri/pigmenti/matrice-active cleanse-all + intensify) on
the owner-gated `cleanse_status`-style contract-schema effect_type + jobs.yaml re-baseline.
7-slice plan + per-slice acceptance in `docs/superpowers/plans/2026-06-22-creature-trait-mechanics-engine-plan.md`.

## Creatures -- 14 ratified (proposal `2026-06-22-retired-creatures-salvage-proposal.md`)

- **resonant_claw_hunter**: full gameplay spec on main (`packs/.../caverna_risonante/resonant-claw-hunter.yaml`), **NOT yet inserted into species_catalog** (promote + 5-gate cycle pending).
- **13 others** (heliopteryx_radians, pyroflagellum_meteoriticum, ...): identities/biomes ratified, **not specced/canonized** (each needs full gameplay spec + lore HITL + promote). Their signature kits depend on the trait mechanics above.
- Old rovine_planari stubs (10) + 3 exotic stubs: still to DELETE on canonization (option (a), approved).

**Score: 0 / 14 canonized** (1 specced, 0 in catalog).

## Re-baseline (Phase 4, owner-gated)

- **jobs.yaml**: re-baselined in #2976 (the trait_native generated block was drift-stale; clean regen committed).
- **STILL stale** (the original drift, final re-baseline pending): `data/core/species/species_catalog.json`, `data/traits/index.json`, `data/traits/species_affinity.json` (287->54 affinity, /tmp provenance, lingering evento_ecologico, +species). Run the deterministic pipeline once + commit fresh artifacts; guard goes green. Recipe in the runbook.

## Infrastructure + reusable patterns established

1. **5-gate trait-add** (verify-first): schema-lenient / `trait_template_validator` STRICT / `trait_style_check --fail-on error` (i18n refs) / coverage / `export:qa`. Tool: `add_trait_stub.py`. (#2973)
2. **Ability-granting traits** (master-dd ratified): mechanism EXISTS = `trait_native` job + `trait_abilities`, GENERATED from `trait_mechanics.yaml` `<trait>.active_effects[*]` by `generate_trait_native_abilities.py`. NEVER hand-edit jobs.yaml. New ability effect_types go in `abilityExecutor` SUPPORTED + dispatch. (#2976)
3. **Passive-aura pattern**: producer `passiveStatusApplier` (WAVE_A allowlist) -> consumer `combat/statusModifiers.computeStatusModifiers` (stat deltas); passive statuses survive the round-wipe via the END-OF-ROUND refresh; durable states need `sessionRoundBridge` `PERSISTENT_STATUS_KEYS`. (#2978)
4. **Derived-drift families** (regenerate != committed, reproducibility hazard): (1) trait bridge, (2) species catalog, (3) **jobs.yaml trait_native block** (found this session). Guard predicts drift without writing. (#2971 + this session)

## Residuals (prioritized)

1. **Trait engine = 9.5 / 12 built** (slices 1-5 + 7 merged; matrice Mode A was slice 6). The remaining 2.5 are ALL gated -- nothing more is band-neutrally buildable without an owner decision:
2. **Move/terrain/elevation substrate** (design-to-engine call, master-dd -- BEING BUILT separately): unblocks `adattamento_volo` I-III + `radici_ancora_planare` + `eco_sismico` (tile-entry trigger) + `membrane_osmotiche` terrain-heal. The live move calc is pure Manhattan (no terrain-cost), no elevation/altitude, no 0-move signal; `unit.elevation` is a static attack-time-only false-substrate; the Wesnoth `terrain_cost_multiplier` is dormant (0 consumers). When the substrate lands: review it, then build those 4 modes on top.
3. **Active-mode owner-gate**: filtri/pigmenti/matrice ACTIVE (cleanse-all / intensify / pulse) need a `cleanse_status`-style `effect_type` in `packages/contracts/schemas/traitMechanics.schema.json` (forbidden path) + a jobs.yaml re-baseline -- same gate matrice Mode A had (master-dd authorized that one).
4. **13 creatures**: spec + lore HITL + promote (depend on their kit traits being built) + delete obsolete stubs.
5. **Final catalog/affinity re-baseline** (owner-gated).
6. **GAP2**: 103 per-trait DB files NOT wired to active_effects (likely inert) -- reconcile dup `*_2` suffixes, then propose a mechanic per inert trait (design-gated).
7. **Stale trace_hashes** (repo-wide, separate PR) + **CI-wire the guard** (`.github/workflows`, owner-gated) + register the 2026-06-22 program docs in docs_registry (warning-only).

## Entry point for continuation

Work in the worktree `.claude/worktrees/derived-artifact-reproducibility` (off
`origin/main`). Next = **slice 3** per the engine plan. ADR-0011 trailers, branch +
PR, no self-merge, compensating review (`cavecrew-reviewer`, Codex rate-limited).
Memory: `project_derived_artifact_reproducibility.md`. Chip `task_7906c07d`.
