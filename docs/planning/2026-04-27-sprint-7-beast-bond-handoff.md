---
title: 'Sprint 7 Beast Bond reactions — handoff 2026-04-27'
date: 2026-04-27
doc_status: active
doc_owner: master-dd
workstream: cross-cutting
last_verified: '2026-04-27'
source_of_truth: false
language: it
review_cycle_days: 30
tags: [handoff, sprint, combat, ancient-beast, tier-s, beast-bond, reaction]
related:
  - docs/planning/2026-04-27-sprint-6-channel-resistance-handoff.md
  - docs/adr/ADR-2026-04-27-creature-bond-reactions.md
  - docs/balance/2026-04-27-numeric-reference-canonical.md
  - data/core/companion/creature_bonds.yaml
  - schemas/evo/creature_bond.schema.json
  - apps/backend/services/combat/bondReactionTrigger.js
  - tests/ai/bondReactionTrigger.test.js
  - CLAUDE.md
---

# Sprint 7 Beast Bond reactions — handoff 2026-04-27

> Scope: 1 PR autonomous shipped (~5h effort) — quick win tactical depth.
> Trigger: Sprint 6 handoff §5 backlog residuo Tier S #6 "Beast Bond reaction trigger ~5h P1+".
> Pattern source: AncientBeast "Beast Bond" — bonded creature pair triggers reactive defense / counter when partner is hit.

## §1 — Sessione output

**1 PR shipped** ([#1971](https://github.com/MasterDD-L34D/Game/pull/1971)):

| PR    | Sprint                 | Scope                                                                                                                                                                                         |   Status   |
| ----- | ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :--------: |
| #1971 | 7 Beast Bond reactions | creature_bonds.yaml (6 bond) + AJV schema + bondReactionTrigger.js engine + session.js/sessionRoundBridge.js wire + 19 unit test + ADR-2026-04-27 + numeric-reference §11 + stato-arte §B.1.5 | 🟡 PENDING |

## §2 — Pillars status delta

| #   | Pilastro          | Pre Sprint 7 | Post Sprint 7 | Delta                                                                                                                                                             |
| --- | ----------------- | :----------: | :-----------: | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P1  | Tattica leggibile |     🟢++     |      🟢ⁿ      | Creature reactivity surface live (counter_attack + shield_ally). Prima solo ability-armed via M2 reactionEngine.                                                  |
| P3  | Specie × Job      |     🟢c+     |     🟢c++     | Species_pair semantics emerge dalle 45 specie canonical (6 bond canonical: 2 twin pack + 4 cross-species). Encounter design "boss + bonded lieutenant" sbloccato. |

**Score finale post Sprint 1-7**: **5/6 🟢 def/c++/ⁿ + 1/6 🟢c** (P5 unblock playtest live unchanged).

## §3 — Decisioni chiave

### Architettura: secondo livello reaction system (parallel non sovrapposto)

Bond engine **NON estende** `reactionEngine.js` (M2). Sono due sistemi distinti che convivono nel performAttack pipeline:

| Aspetto        | reactionEngine (M2)             | bondReactionTrigger (Sprint 7)              |
| -------------- | ------------------------------- | ------------------------------------------- |
| Source         | `actor.reactions[]` armed       | YAML `creature_bonds.yaml` data-driven      |
| Trigger lookup | per-actor scan + trigger string | per-pair `(target.species, ally.species)`   |
| Lifecycle      | consume-on-use, re-arm via slot | cooldown_turns regen, no consume            |
| Cap            | 1 reaction/actor (consume gate) | 1 reaction/round/actor (`_bond_round_used`) |
| Compat         | richiede ability slot           | no-op silent quando dati mancanti           |

Hook order in `session.js performAttack`:

1. damage step + status applies + shield/DR
2. `reactionEngine.triggerOnDamage` (intercept)
3. **`bondReactionTrigger.triggerBondReaction`** — skip silente se intercept fired
4. terrain reactions (M14-A)

### 6 bond canonical

| bond_id            | species_pair                                       | reaction_type  | trigger_range | cooldown |
| ------------------ | -------------------------------------------------- | -------------- | :-----------: | :------: |
| pack_alpha         | dune_stalker × dune_stalker (twin)                 | counter_attack |       1       |    2     |
| hunt_alliance      | dune_stalker × anguis_magnetica                    | counter_attack |       1       |    3     |
| hive_link          | sciame_larve_neurali × polpo_araldo_sinaptico      | shield_ally    |       2       |    3     |
| resonant_symbiosis | simbionte_corallino_riflesso × leviatano_risonante | shield_ally    |       2       |    4     |
| toxin_kinship      | chemnotela_toxica × chemnotela_toxica (twin)       | counter_attack |       1       |    2     |
| burrow_guard       | gulogluteus_scutiger × terracetus_ambulator        | shield_ally    |       1       |    3     |

### Refund "pulled punch" design

`counter_attack` con `damage_step_mod=-1` + `refund min(1, dmg)` significa che l'attaccante **non può essere ucciso in 1 colpo** dalla counter (cap floor 1 hp). Decisione consapevole: counter è "reactive defensive strike", non finisher. Kill semantics richiedono follow-up regular attack.

Test esplicito documenta il pattern: `triggerBondReaction counter_attack -1 step_mod refund prevents 1-shot kill`.

## §4 — Test enforcement

- `tests/ai/bondReactionTrigger.test.js` — **19 test nuovi**:
  - `loadCreatureBonds` parse canonical YAML + soft-fail empty bonds[]
  - `findBondsForPair` order-insensitive + twin pack [X,X]
  - `setCooldown`/`isOnCooldown` expiry math
  - `evaluateBondTrigger` 5 eligibility gates (alive/team/stunned/cap/cooldown)
  - `triggerBondReaction counter_attack` fire + range gate + refund + kill semantics
  - `triggerBondReaction shield_ally` fire + 50% absorb + ally_killed + transfer-floors-to-zero no-op
  - back-compat: empty bonds[] + no bonded ally → null
- `tests/services/reactionEngine.test.js` 13/13 verde (intercept/overwatch unchanged)
- `tests/api/abilityExecutor.test.js` 35/35 verde (M2 ability paths unchanged)
- `tests/api/sessionRound*.test.js + session.test.js` 23/23 verde

**AI baseline post-Sprint 7**: **382/382 ✓** (was 363, +19).

## §5 — Backlog residuo AncientBeast Tier S #6

| Tier | Ticket                             | Effort | Pillar | Status                                           |
| :--: | ---------------------------------- | :----: | :----: | ------------------------------------------------ |
|  S   | channel resistance earth/wind/dark |  ~6h   |   P6   | 🟢 Sprint 6 chiuso (PR #1964)                    |
|  S   | Beast Bond reaction trigger        |  ~5h   |  P1+   | 🟢 Sprint 7 chiuso (this PR #1971)               |
|  S   | Ability r3/r4 tier progressive     |  ~10h  |  P3+   | 🔴 aperto (separate sprint, jobs.yaml extension) |

**Tier S #6 closure**: 3/4 pattern shipped (75%).

## §6 — Next session entry points

**Bundle deep (~10h, P3+)**:

- **Ability r3/r4 tier progressive**: extend `data/core/jobs.yaml` con rank r3/r4 + scaling formula + 2-3 ability per job. Test: `tests/api/jobs.test.js` (esistente). Closes Tier S #6 100%.

**Bundle outside Tier S #6**:

- Thought Cabinet UI panel cooldown round-based (Disco Tier S #9, ~8h, P4 dominant) — 4 slot mentali equip-per-N-round → unlock effect.
- Wildermyth layered storylets pool (Tier S #12 residuo, ~10h, P4 narrative) — pool weighted pick post-encounter.
- Internal voice 4-MBTI axes narrative log (Disco Tier S #9 stretch, ~10h, P4) — debrief con voce-per-axis.

**Bundle quick wins (~3-5h)**:

- Defender's advantage AI integration (P3, B.1.9 1 pattern residuo).
- Random map generator weighted noise (~15h, larger).
- Recall economy formula (~5h, B.1.4).

## §7 — Doc updates

- ✅ `docs/adr/ADR-2026-04-27-creature-bond-reactions.md` Accepted
- ✅ `docs/balance/2026-04-27-numeric-reference-canonical.md` §11 nuova sezione bond canonical matrix
- ✅ `docs/reports/2026-04-27-stato-arte-completo-vertical-slice.md` §B.1.5 + §B vertical slice tree (Beast Bond marked ✅)
- ✅ Memory file `project_beast_bond_reactions.md` + MEMORY.md index entry
- ✅ Handoff doc (questo file)
- ✅ CLAUDE.md sprint context bump
- ✅ BACKLOG.md audit log Sprint 7 entry

## §8 — Operational notes

- **Mutually exclusive con M2 intercept**: implementato come `if (damageDealt > 0 && !interceptResult)` nel performAttack. Se intercept reroute fired → bond skipped (target didn't take the hit, intercept already pre-empted).
- **Damage_taken accounting**: shield_ally trasferisce damage_taken[target] → damage_taken[ally] (mirror intercept logic). VC scoring stateless ricalcola dagli eventi → no double-count.
- **Kill chain on counter_attack**: quando counter KOs original attacker, killer = bonded ally (find by `br.ally_id` in session.units), victim = actor (original attacker). `emitKillAndAssists(session, allyUnit, actor, bondEvent)`.
- **Event surface**: nuovo `action_type='reaction_trigger'` con `ability_id='bond:<bond_id>'` + `bond_type` + `damage_absorbed`/`damage_dealt`/`ally_hp_before-after`/`*_killed` flags. Distinct dal canale intercept esistente.

## §9 — Memory ritual 5/5

1. ✅ CLAUDE.md sprint context bump
2. ✅ BACKLOG.md audit log Sprint 7 + Tier S #6 status update
3. ✅ Stato-arte §B.1.5 marking Beast Bond ✅
4. ✅ Memory file `project_beast_bond_reactions.md`
5. ✅ Handoff doc (this file)
