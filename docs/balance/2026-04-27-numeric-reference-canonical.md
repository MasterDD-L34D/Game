---
title: 'Numeric reference canonical — single source per balance numerics'
date: 2026-04-27
doc_status: active
doc_owner: balance-illuminator
workstream: dataset-pack
last_verified: '2026-04-27'
source_of_truth: false
language: it
review_cycle_days: 60
related:
  - packs/evo_tactics_pack/data/balance/action_speed.yaml
  - packs/evo_tactics_pack/data/balance/ai_intent_scores.yaml
  - packs/evo_tactics_pack/data/balance/ai_profiles.yaml
  - packs/evo_tactics_pack/data/balance/movement_profiles.yaml
  - packs/evo_tactics_pack/data/balance/sistema_pressure.yaml
  - packs/evo_tactics_pack/data/balance/species_resistances.yaml
  - packs/evo_tactics_pack/data/balance/terrain_defense.yaml
  - packs/evo_tactics_pack/data/balance/trait_mechanics.yaml
  - packs/evo_tactics_pack/data/balance/xp_budget.yaml
tags: [balance, numeric, reference, fallout-tactics, design-spec]
---

# Numeric Reference Canonical

> Sprint 1 §VI (autonomous plan 2026-04-27) — Fallout Tactics pattern donor (Tier S #11): "design spec numeric detail" come doc canonical singolo accessibile.
>
> **Scope**: index single-source di tutti i numeric balance values del gioco, organizzato per area, con cross-link a YAML canonical.

## §1 — Combat resolution

### Attack roll formula

```
total = d20 + attacker.mod + attacker.attack_mod_bonus + status_mod + time_mod
hit if total >= CD
CD = ATTACK_CD_BASE (10) + target.tier + target.defense_mod + terrain_defense_mod + defender_advantage
```

### MoS → damage step

- MoS 0-2 → step 0 (no bonus)
- MoS 3-5 → step 1 (+1 dmg via `compute_step_flat_bonus`)
- MoS 6+ → step 2+ (escalating)

Source: `services/rules/resolver.py compute_step_count` (`MOS_PER_STEP=5`).

### Critical / Fumble

- Natural 20 → auto-success + step+1 + PT+2
- Natural 1 → auto-miss (fumble)
- PT gain: nat 15-19 = +1, nat 20 = +2; +1 per 5 MoS

Source: `services/rules/resolver.py compute_pt_gained`.

## §2 — AP / SG / PT / PE / PI

### Action Points (AP)

- **AP per turn**: 2 canonical (player + Sistema)
- **Cost mapping** (see `action_speed.yaml`):
  - `defend`: 0 AP, +2 action_speed
  - `parry`: 0 AP, +2 action_speed
  - `attack`: 1 AP, 0 action_speed
  - `move`: 1 AP/cell, -2 action_speed
  - `ability`: 1-3 AP variabile, -1 action_speed default
  - `wait` (FFT, shipped #1896): 0 AP, +20% speed next turn

### Sigma Gauge (SG)

- **Pool**: 0..3 (cap `POOL_MAX`)
- **Earn formula** Opzione C mixed (ADR-2026-04-26):
  - 5 dmg taken cumulative → +1 SG
  - 8 dmg dealt cumulative → +1 SG
  - Cap **2 earn per turn** (`EARN_PER_TURN_CAP`)
- **Tutorial starter**: SG=1 player units (Sprint α #1914)
- Source: `apps/backend/services/combat/sgTracker.js`

### Pit (PT)

- **Pool**: 0..N (`PT_POOL_CAP`, configured per session)
- **Earn**: nat 15-19 +1, nat 20 +2, +1 per 5 MoS
- **Spend**: ability cost OR parry cost

### PE / PI / Mutagen Points (MP)

- **PE earned per session** by difficulty (`rewardEconomy.js`):
  - tutorial 3 / tutorial_advanced 4 / standard 5 / elite 8 / hardcore 10 / boss 12
- **PE bonus thresholds** (VC performance):
  - avg ≥ 0.7 → +3 (eccellente)
  - avg ≥ 0.5 → +2 (buono)
  - avg ≥ 0.3 → +1 (sufficiente)
- **Ennea bonus**: +1 PE per archetype triggered (cap +2)
- **PE → PI conversion**: 5:1 ratio (`PE_PER_PI=5`), gated on `outcome=victory`
- **MP** (Spore Moderate, #1916+#1920): pool separato da PE per mutation tier-up

## §3 — Stress / Status

### Stress breakpoints (resolver.py)

- `STRESS_BREAKPOINT_PANIC` (es. 60 stress) → trigger panic status
- `STRESS_BREAKPOINT_RAGE` (es. 80 stress) → trigger rage status

### Status durations (turns, default)

- `panic`: PANIC_DEFAULT_DURATION (es. 2)
- `rage`: RAGE_DEFAULT_DURATION (es. 2)
- `bleeding`, `frenzy`, `linked`, `fed`, `attuned`, `sensed`, `telepatic_link`, `healing`: variabile, decay 1/round
- Cap totale per status type: `STATUS_DURATION_CAPS` (kill chain re-apply pattern, sustained rage prevention)

### Status modifiers (statusModifiers.js, shipped)

- `linked` +1 attack_mod (only if ally adjacent)
- `fed` +1 HP regen at turn end
- `healing` +1 HP regen at turn end (HoT)
- `attuned` +1 defense_mod target side
- `sensed` +1 attack_mod actor (accuracy)
- `telepatic_link` reveal log marker (no stat)
- `frenzy` +1 attack_mod actor + -1 defense_mod actor

## §4 — Terrain / Elevation

### Terrain types (terrain_defense.yaml)

- **roccia / vegetazione_densa**: defense_mod +2, cover 0.5
- **corallo / cristalli / nebbia**: defense_mod +1, cover 0.25
- **sabbia / pianura / termico / luminescente / spore_diluite**: 0
- **lava / acqua_profonda / ghiaccio**: -1 (hazard)
- **muro**: impassable

### Elevation (3 levels)

- attaccante sopra: +1 attack_mod, +1 range, +30% damage
- attaccante sotto: -1 attack_mod, -15% damage
- alto→basso LOS: clear; basso→alto: check intermedi

### Time of Day (Sprint 1 §I shipped — Wesnoth)

- 4 stati: dawn / day / dusk / night
- Alignment modifier:
  - lawful in day: +1 atk +1 dmg; in night: -1 atk
  - chaotic in night: +1 atk +1 dmg; in day: -1 atk
  - neutral: 0
  - dawn/dusk: midpoint (0)

## §5 — Defender's Advantage (Sprint 1 §II shipped — AI War)

- Player attacks Sistema-defender unit (role: defender/tank/guardian/sentinel) OR target su terrain cover ≥ 0.5
- Effect: target.defense_mod_bonus +1 (raises CD)
- Constant: `DEFENDER_ADVANTAGE_BONUS=1`

## §6 — Boss Enrage (M7-#2 Phase B)

- Trigger: actor.tier === 'boss' OR id contains "\_boss" + HP < threshold per encounter_class
- Effect: actor.mod += enrageModBonus (variable per class)
- Source: `apps/backend/services/balance/bossEnrage.js` + `damage_curves.yaml`

## §7 — XP Budget (Pathfinder, shipped #1894/#1899)

- Encounter XP budget per `encounter_class`
- `auditEncounter()` confronta total enemy XP vs budget atteso
- Threshold: ±20% in_band, >50% critical_over
- Source: `apps/backend/services/balance/xpBudget.js`

## §8 — Reinforcement / Mission Timer

### Reinforcement (M-018)

- `reinforcement_pool` candidate per encounter
- Trigger: `total_kills` modulo policy
- Spawn entry tiles canonical
- Cap: `max_total_spawns` per session
- Biome bias: `applyBiomeBias()` weight via affinities (V7)

### Mission Timer (M13.P6)

- `turn_limit` per encounter (hardcore-07: 10 round)
- `on_expire`: escalate_pressure (+30) + 2 extra spawn
- Source: `apps/backend/services/combat/missionTimer.js`

## §9 — Reward Economy (Tri-Sorgente V2 + Spore + Voidling)

### Reward pool MVP

- 17 cards (post Sprint Tier B+E #1923 + Isaac Anomaly): 8 common + 5 uncommon + 2 rare + 1 epic + 2 legendary (anomaly)
- Roll bucket 1..20 (d20 contextual)
- Personality weights MBTI/Ennea
- Action affinity weights

### Anomaly Trait pool (Isaac Bound, shipped #1923)

- Tier `legendary` + tag `anomaly` + roll_bucket 20
- Effects: `temporal_rewind` ability_unlock OR `coscienza_d_alveare_diffusa` trait_grant

### Mutation visual swap (Voidling Pattern 6, shipped #1899 lint)

- 30/30 mutations require `visual_swap_it` field (lint enforced)
- `aspect_token` field for render layer (drawMutationDots overlay TBD)

## §10 — Channel resistance matrix (Sprint 6, AncientBeast Tier S #6)

Source: `packs/evo_tactics_pack/data/balance/species_resistances.yaml` v0.2.0 (Sprint 6 2026-04-27 ship: +earth/wind/dark).

### Canonical channels (11)

| Channel   | Tipo      | Note runtime                                                            |
| --------- | --------- | ----------------------------------------------------------------------- |
| fisico    | physical  | baseline, default `action.channel` quando assente                       |
| taglio    | physical  | slashing/cutting subtype                                                |
| fuoco     | elemental | mappa terrainReactions `fire` (CHANNEL_TO_ELEMENT in session.js)        |
| elettrico | elemental | mappa terrainReactions `lightning`                                      |
| ionico    | elemental | gelo/cryo/water-corrosive proxy (mappa nessun terrainReaction nativo)   |
| psionico  | mental    | mind/anti-cognition channel                                             |
| mentale   | mental    | confusion/disorient subtype                                             |
| gravita   | esoteric  | physics manipulation channel                                            |
| **earth** | elemental | **Sprint 6**: terreno/sassi/sabbia. Corazzati resist, leggeri vuln.     |
| **wind**  | elemental | **Sprint 6**: aria/sonico/cinetico. Volatili resist mild, pesanti vuln. |
| **dark**  | esoteric  | **Sprint 6**: psionico/abisso/anti-luce. Notturni resist, diurni vuln.  |

### Resistance matrix per archetipo (scala 100-neutral)

> 80 = -20% damage (resist), 100 = neutro, 120 = +20% damage (vuln).

| Archetipo    | fisico | taglio | fuoco | elettrico | ionico | psionico | mentale | gravita | earth | wind | dark |
| ------------ | :----: | :----: | :---: | :-------: | :----: | :------: | :-----: | :-----: | :---: | :--: | :--: |
| corazzato    |   80   |   80   |  100  |    100    |  100   |   120    |   120   |   100   |  70   |  80  | 100  |
| bioelettrico |  120   |  100   |  100  |    70     |   80   |   100    |   100   |   100   |  120  |  90  | 110  |
| psionico     |  120   |  120   |  100  |    100    |  100   |    70    |   70    |   100   |  100  | 100  |  80  |
| termico      |  100   |  100   |  70   |    100    |  120   |   100    |   100   |   100   |  90   | 110  | 120  |
| adattivo     |  100   |  100   |  100  |    100    |  100   |   100    |   100   |   100   |  100  | 100  | 100  |

### Damage matrix per archetipo (input 10 dmg, post `applyResistance`)

> Snapshot output `applyResistance(10, computeUnitResistances(archetype, []), channel)`. Source: `tests/ai/resistanceEngine.test.js` Sprint 6 invariants.

| Archetipo    | fisico | fuoco | ionico | earth | wind | dark |
| ------------ | :----: | :---: | :----: | :---: | :--: | :--: |
| corazzato    |   8    |  10   |   10   |   7   |  8   |  10  |
| bioelettrico |   12   |  10   |   8    |  12   |  9   |  11  |
| psionico     |   12   |  10   |   10   |  10   |  10  |  8   |
| termico      |   10   |   7   |   12   |   9   |  11  |  12  |
| adattivo     |   10   |  10   |   10   |  10   |  10  |  10  |

### Balance invariants (test enforced)

- Nessun outlier dominance: `damage <= 20` (≤ 2× baseline) **e** `damage >= 5` (≥ 0.5× baseline) per ogni archetipo × channel — guardrail.
- Adattivo neutral su tutti gli 11 channel (delta 0 → filtered da `mergeResistances`, dmg invariato).
- Tutti gli 11 channel presenti per ogni archetipo (no missing key).
- Test enforcement: `tests/ai/resistanceEngine.test.js` 31 test (10 nuovi Sprint 6).

### Ability → channel routing

Source: `packs/evo_tactics_pack/data/balance/trait_mechanics.yaml` `active_effects[].channel`.

Sprint 6 ha aggiunto 6 ability nuove (canale earth/wind/dark) su trait esistenti:

| Trait                        | Ability ID    | Name IT            | Channel | Effect type | Dice  |
| ---------------------------- | ------------- | ------------------ | :-----: | ----------- | ----- |
| mantello_meteoritico         | meteor_strike | Caduta Meteoritica |  earth  | damage      | 1d8+2 |
| ipertrofia_muscolare_massiva | ground_pound  | Onda Tellurica     |  earth  | damage      | 1d8+1 |
| respiro_a_scoppio            | gale_burst    | Raffica Vorticosa  |  wind   | damage      | 1d6+2 |
| nucleo_ovomotore_rotante     | vortex_spin   | Vortice Cinetico   |  wind   | damage      | 1d6+1 |
| cannone_sonico_a_raggio      | pressure_wave | Onda di Pressione  |  wind   | damage      | 1d8+1 |
| spore_psichiche_silenziate   | umbral_spore  | Spora Abissale     |  dark   | damage      | 1d6+2 |

Resistance entries aggiunti (passive):

- `mantello_meteoritico` resist earth +15
- `respiro_a_scoppio` resist wind +10
- `spore_psichiche_silenziate` resist dark +10

## Anti-pattern guard

- ❌ NON hardcode numeric values inline nel codice — sempre via YAML config
- ❌ NON modificare numeric senza ADR (>1 numero canonical) o playtest evidence
- ❌ NON breaking change (es. `pe_cost` rename) senza grep blast radius pre-merge
- ✅ DO consume YAML at runtime via `loadConfig()` + cache + idempotent reload
- ✅ DO encoding 'utf-8' explicit (Python json.dump fallback bug 2026-04-25)

## Cross-card

- M-Tier-S #11 Fallout Tactics — pattern source numeric ref doc canonical
- All `packs/evo_tactics_pack/data/balance/*.yaml` — runtime canonical data

## §11 — Beast Bond reactions (Sprint 7, AncientBeast Tier S #6)

Source: `data/core/companion/creature_bonds.yaml`. Engine: `apps/backend/services/combat/bondReactionTrigger.js`. Schema: `schemas/evo/creature_bond.schema.json`. ADR: `docs/adr/ADR-2026-04-27-creature-bond-reactions.md`.

### Bond pairs canonical (6)

| bond_id            | species_pair                                       | reaction_type  | trigger_range | cooldown |
| ------------------ | -------------------------------------------------- | -------------- | :-----------: | :------: |
| pack_alpha         | dune_stalker × dune_stalker (twin)                 | counter_attack |       1       |    2     |
| hunt_alliance      | dune_stalker × anguis_magnetica                    | counter_attack |       1       |    3     |
| hive_link          | sciame_larve_neurali × polpo_araldo_sinaptico      | shield_ally    |       2       |    3     |
| resonant_symbiosis | simbionte_corallino_riflesso × leviatano_risonante | shield_ally    |       2       |    4     |
| toxin_kinship      | chemnotela_toxica × chemnotela_toxica (twin)       | counter_attack |       1       |    2     |
| burrow_guard       | gulogluteus_scutiger × terracetus_ambulator        | shield_ally    |       1       |    3     |

### Trigger conditions

- **counter_attack**: target hit + bond ally entro `trigger_range` Manhattan + ally → attacker entro `ally.attack_range`. Damage_step_mod -1 (refund 1 HP, pulled-punch floor → cannot 1-shot kill).
- **shield_ally**: target hit + bond ally entro `trigger_range`. Absorb `floor(damageDealt / 2)` (transfer math identica intercept reroute).

### Caps

- 1 bond reaction / round / actor (`ally._bond_round_used` gate).
- Cooldown per-bond (`ally._bond_cooldown[bond_id] = currentTurn + cooldown_turns`).
- Skip silent quando `interceptResult` già fired (mutually exclusive con M2 intercept).

### Compat

Missing YAML / vuoto → `loadCreatureBonds` ritorna `{ version: 0, bonds: [] }` → no-op silent. Zero behavior change su encounter senza bond pair coverage.

## §12 — Ability rank progression r1-r4 (Sprint 8, AncientBeast Tier S #6 final closure)

Source: `data/core/jobs.yaml` v0.2.0. Loader: `apps/backend/services/jobsLoader.js extractAbilities` (sort by rank asc). Executor: `apps/backend/services/abilityExecutor.js` (18/18 effect_type — invariato). ADR: `docs/adr/ADR-2026-04-27-ability-r3-r4-tier.md`.

### Cost ladder canonical

| Rank | cost_pi | cost_ap | Scope                                                                    |
| :--: | :-----: | :-----: | ------------------------------------------------------------------------ |
|  r1  |    3    |   0-2   | Utility / single-target base (2 ability/job, default unlock)             |
|  r2  |    8    |   1-2   | Capstone parziale (1 ability/job, prima maggiore investitura)            |
|  r3  | **14**  | **1-2** | Mid-tier upgrade (1 ability/job, +1 dmg_step / range +1 / duration +1)   |
|  r4  | **22**  | **2-3** | Capstone signature (1 ability/job, AoE 3x3-4x4 / +3-5 dmg_step / status) |

Curva quasi-quadratica (3 → 8 → 14 → 22) — late investment reward + scoraggia rush.

### r3/r4 ability per base job (14 nuove)

| Job        | r3 (cost_pi 14) | effect_type   | r4 (cost_pi 22)   | effect_type      |
| ---------- | --------------- | ------------- | ----------------- | ---------------- |
| skirmisher | phantom_step    | move_attack   | dervish_whirlwind | multi_attack     |
| vanguard   | aegis_stance    | buff          | bulwark_aegis     | aoe_buff         |
| warden     | chain_shackles  | aoe_debuff    | void_collapse     | aoe_debuff       |
| artificer  | arcane_renewal  | team_heal     | convergence_wave  | team_buff        |
| invoker    | arcane_lance    | ranged_attack | apocalypse_ray    | surge_aoe        |
| ranger     | hunter_mark     | debuff        | headshot          | execution_attack |
| harvester  | vital_drain     | drain_attack  | lifegrove         | team_heal        |

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

### Constraint runtime

Tutte le 14 ability nuove **riusano i 18 effect_type esistenti** in abilityExecutor.js. Zero nuovi runtime types, zero modifica all'executor — extension data-only.

### Sprint 8.1 (2026-05-05) — Expansion roster gap-fill (8 nuove ability r3/r4)

Source: `data/core/jobs_expansion.yaml` v0.3.0. Stesso cost ladder canonical (r3=14 / r4=22 cost_pi). Stesso vincolo runtime (effect_type ∈ 18/18 supportati).

| Job         | r3 (cost_pi 14)     | effect_type | r4 (cost_pi 22)    | effect_type      |
| ----------- | ------------------- | ----------- | ------------------ | ---------------- |
| stalker     | shadow_mark         | debuff      | shadow_assassinate | execution_attack |
| symbiont    | bond_amplify        | team_buff   | unity_surge        | team_heal        |
| beastmaster | feral_dominion      | aoe_buff    | apex_pack          | aoe_buff         |
| aberrant    | stabilized_mutation | buff        | perfect_mutation   | surge_aoe        |

Resource gating r4 expansion (mirror archetype primary):

| Job         | Resource | Gate |
| ----------- | -------- | ---- |
| stalker     | PP       | ≥ 10 |
| symbiont    | PT       | ≥ 8  |
| beastmaster | PT       | ≥ 10 |
| aberrant    | SG       | ≥ 80 |

Coverage roster: **11/11 job (7 base + 4 expansion) con r1→r4 wired**. Total ability shipped: 35 base + 14 expansion (4 jobs × {2 r1 + 1 r2 + 1 r3 + 1 r4}) = **49 ability**. Test enforcement: `tests/api/jobs.test.js` (18 test, +4 nuovi su Sprint 8.1).

## Maintenance

**Update trigger**:

- New balance YAML aggiunto → riga in §1-§12
- Numeric value canonical change → ADR + update qui
- Sprint α/β/γ ship cambio numerico → cross-link PR

**Review cycle**: 60 giorni (`review_cycle_days`). Ground-truth via grep cross-check pre review.
