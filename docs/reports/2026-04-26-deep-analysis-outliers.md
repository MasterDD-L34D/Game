---
doc_status: active
doc_owner: balance-auditor
workstream: combat
last_verified: "2026-04-26"
source_of_truth: false
language: en
review_cycle_days: 30
---

# Balance Audit — Deep Analysis Outliers
**Date**: 2026-04-26  
**Agent**: balance-auditor  
**Sources**: trait_mechanics.yaml (33 traits) · species_resistances.yaml (5 archetypes) ·
ai_intent_scores.yaml · ai_profiles.yaml · terrain_defense.yaml · movement_profiles.yaml ·
active_effects.yaml (433 traits)

---

## 1. Trait Damage / Efficiency Distribution

**Metric**: efficiency = (atk_mod×1.5 + def_mod×1.5 + dmg_step×2 + ae_damage_EV×0.5) / cost_ap  
**n=33** traits | mean=0.888 | stdev=1.222

### Outliers (z-score >2 on efficiency)

| Trait | Eff | z | cost_ap | atk | dmg_step | ae EV | Flag |
|-------|-----|---|---------|-----|----------|-------|------|
| ipertrofia_muscolare_massiva | 4.00 | +2.55 | 2 | 1 | 1 | 9.0 | OUTLIER |
| artigli_sette_vie | 3.63 | +2.24 | 2 | 1 | 1 | 7.5 | OUTLIER |
| frusta_fiammeggiante | 3.38 | +2.04 | 2 | 1 | 1 | 6.5 | OUTLIER |

**Near-outliers (z >1.5)**:

| Trait | Eff | z | Note |
|-------|-----|---|------|
| cannone_sonico_a_raggio | 3.17 | +1.87 | cost_ap=3, dmg_step=2 — balanced by higher cost |
| coda_frusta_cinetica | 2.88 | +1.63 | hybrid atk+def — two-stat packs efficiency |

### Buff Amount Outliers

| Trait | buff_amount | z | cost_ap | Duration | Flag |
|-------|------------|---|---------|----------|------|
| mantello_meteoritico | 4 | +2.69 | 3 | 1 turn | OUTLIER (1-turn burst balances it) |

**mean buff_amount=1.81 stdev=0.81** across 21 active effects with buffs.

### Traits with damage dice EV

| Trait | ae EV | cost_ap | Notes |
|-------|-------|---------|-------|
| ipertrofia_muscolare_massiva | 9.0 | 2 (trait) / 3 (ability) | 2d6+2 — highest EV |
| cannone_sonico_a_raggio | 8.0 | 3 / 3 | 2d6+1, +disorient on DC15 |
| artigli_sette_vie | 7.5 | 2 / 2 | 1d8+3 |
| frusta_fiammeggiante | 6.5 | 2 / 2 | 1d8+2 + fuoco channel |
| coda_frusta_cinetica | 5.5 | 2 / 2 | 1d6+2 |

**Note**: ipertrofia ability costs 3 AP but trait costs 2 AP — the trait grants passive +atk+dmg on top of the ability. Total package at cost_ap=2 passive is dominant.

---

## 2. Species Resistance Coverage

**5 archetypes**: corazzato, bioelettrico, psionico, termico, adattivo  
**8 channels**: fisico, taglio, fuoco, elettrico, psionico, mentale, gravita, ionico

### Archetype resistance totals

| Archetype | Net Resist | Total Deviation | Max Vuln |
|-----------|-----------|----------------|----------|
| psionico | +20 | 100 | 120 (fisico, taglio) |
| bioelettrico | +30 | 70 | 120 (fisico) |
| corazzato | 0 | 80 | 120 (psionico, mentale) |
| termico | +10 | 50 | 120 (ionico) |
| adattivo | 0 | 0 | 100 (all neutral) |

No archetype exceeds z>2 on total deviation (psionico highest z=1.05).

### Channel coverage gaps

| Channel | Resistant archetypes | Vulnerable archetypes | Gap? |
|---------|--------------------|--------------------|------|
| fisico | corazzato | bioelettrico, psionico | OK |
| taglio | corazzato | psionico | OK |
| fuoco | termico | — | NO vulnerable species |
| elettrico | bioelettrico | — | NO vulnerable species |
| psionico | psionico | corazzato | OK |
| mentale | psionico | corazzato | OK |
| **gravita** | — | — | **NO resist AND no vulnerable** |
| ionico | bioelettrico | termico | OK |

**gravita channel is orphaned**: zero traits deal gravita damage (confirmed via grep), zero archetypes resist or are vulnerable to it. Dead channel.

**fuoco and elettrico**: no archetype is vulnerable — these damage types have no natural prey species. Offensive fuoco/elettrico traits gain no bonus vs any archetype.

### adattivo glass cannon note

adattivo has all values = 100 (fully neutral). Not a glass cannon — just blank. No strategic identity. Species using this archetype gain nothing from channel selection.

---

## 3. Top 5 Over-Tuned Traits

Ranked by combination of efficiency z-score, power density, and multi-stat stacking.

| Rank | Trait | Why flagged | Severity |
|------|-------|------------|---------|
| 1 | ipertrofia_muscolare_massiva | z=+2.55 eff; perm atk+1+dmg_step+1 at cost_ap=2 PLUS ability 2d6+2 (EV=9) at extra cost_ap=3; double-stacked offense | P0 |
| 2 | sangue_piroforico | cost_ap=2 with perm atk+1, perm dmg_step+1, fuoco resist 20%, AND ability: atk+2 for 2 turns — 4 independent benefits at the cheapest offensive price | P0 |
| 3 | artigli_sette_vie | z=+2.24 eff; 1d8+3 (EV=7.5) at cost_ap=2; also in active_effects with extra_damage on every melee hit | P1 |
| 4 | frusta_fiammeggiante | z=+2.04 eff; 1d8+2 fuoco channel, no vulnerable archetype so channel is neutral but EV still high | P1 |
| 5 | mimetismo_cromatico_passivo | cost_ap=1 defensive with ability: def+3 for 1 turn at cost_ap=2; buff_amount=3 at cost_ap=1 trait (highest buff/cost_ap ratio among cost_ap=1 traits) | P2 |

---

## 4. AI Intent Score Sanity

### Structure finding

`ai_intent_scores.yaml` contains **no per-intent weights** (attack_weight, heal_weight, retreat_weight, etc.). It is a **constants file** only: combat defaults, thresholds, threat weights, grid size. Actual intent selection logic is hardcoded in `declareSistemaIntents.js`. This is a **data/code coupling gap** — intent weights cannot be tuned without code edits.

### Threat weight check

`aggression_weight(0.40) + passivity_weight(0.35) + pressure_weight(0.25) = 1.00` — OK.

### Profile issues

| Profile | use_utility_brain | Issue |
|---------|------------------|-------|
| aggressive | true | Only profile with utility_brain ON — creates asymmetric AI quality between profiles |
| balanced | false | Empty overrides = pure base defaults. No behavioral identity |
| cautious | false | retreat_hp_pct=0.3 **identical to base default** — no differentiation from balanced |

**Cautious profile is functionally broken**: after the 2026-04-25 audit fix (0.5→0.3), the retreat threshold now matches the base. A cautious AI retreats at the same HP% as a balanced one. Only differentiation is kite_buffer=2 and passivity tolerance.

**Dominant value check**: `default_attack_range=2` appears in both aggressive and cautious overrides — same value as combat.default_attack_range=2 in base. These two overrides have no effect (echo of base value).

---

## 5. Silent Trait No-ops (active_effects.yaml)

**Total traits**: 433  
**Silent (stato not consumed by runtime)**: 68 (15.7%)

### Silent status types

| Status | Count | Runtime consumed? |
|--------|-------|------------------|
| linked | 45 | No — no consumer in policy.js or session.js |
| fed | 8 | No |
| attuned | 5 | No |
| sensed | 4 | No |
| telepatic_link | 3 | No |
| frenzy | 2 | No |
| healing | 1 | No |

All 68 map to ancestor trait batch (OD-011 wire, 2026-04-25). These traits fire `triggered:true` in evaluator pass-1 but the status is never read downstream. Damage/behavior: zero.

### Trait effect kind distribution

| Kind | Count | Notes |
|------|-------|-------|
| apply_status | 186 | Largest category; 68 are no-ops |
| damage_reduction | 116 | All live? Consumed by traitEffects.js |
| extra_damage | 80 | Live |
| buff_stat | 51 | Live |

**Note**: `damage_reduction` category at 116 — unusually high vs `extra_damage` at 80. The game skews heavily defensive at the trait level.

### Tier skew

| Tier | Count | % |
|------|-------|---|
| T1 | 265 | 61% |
| T2 | 162 | 37% |
| T3 | 6 | 1% |

T3 severely underrepresented (6 traits). Endgame builds have almost no T3 options.

---

## 6. Terrain & Movement Audit

### Terrain defense_mod distribution

Range: -1 to +2. 14 terrain types.

**Asymmetry**: lava is the only terrain with defense_mod=-1 AND hazard AND movement_cost=2 (triple-penalty). Heavy units on lava pay effective 4.0 AP per tile — most punishing combo in the system.

**muro anomaly**: muro has defense_mod=0 despite being a wall (impassable). Units standing adjacent to a wall gain no cover. Likely intentional (walls don't give defense) but inconsistent with cover system.

### Elevation imbalance

| Direction | Effect |
|-----------|--------|
| Above | +1 atk_mod, +1 range, +30% damage |
| Below | -1 atk_mod, -15% damage |

Net swing per elevation level: **+45% combined advantage** (atk+range+damage vs below penalty). Triangle Strategy mechanic as implemented strongly rewards high ground. With a 3-level grid, top-to-bottom attacker has +2 atk_mod, +2 range, +30% damage vs -15% if attacked back. No current counter-mechanic (no "bunker" terrain blocks elevation).

### Movement profile gaps

Light profile has no terrain penalties at all — identical cost across all traversable terrain. This makes `light` strictly superior for mobility. No terrain type penalizes light units.

---

## 7. Trait_mechanics vs active_effects Alignment

| Category | Count |
|---------|-------|
| In trait_mechanics only (no runtime effect) | 26/33 (79%) |
| In both files | 7/33 (21%) |
| In active_effects only (no balance data) | 426/433 |

**26 traits in trait_mechanics have no entry in active_effects** — they define passive stat mods and active abilities but have no evaluated trigger in the session engine evaluator. Their active abilities are defined structurally but not wired through `traitEffects.js`. These are balanced on paper but have no mechanical output in runtime.

**426 traits in active_effects have no trait_mechanics entry** — they have runtime triggers but no passive stat mods, no resistance data, no cost_ap validation.

---

## 8. Recommendations

### P0 — Critical

| # | Finding | Action |
|---|---------|--------|
| P0-1 | ipertrofia_muscolare_massiva z=+2.55 double-stacks perm offense | Nerf: either remove perm dmg_step or raise cost_ap to 3. Ability EV=9 already high |
| P0-2 | sangue_piroforico packs 4 benefits at cost_ap=2 | Split: remove perm dmg_step OR reduce fuoco resist to 10% OR raise cost_ap to 3 |
| P0-3 | 68 silent ancestor traits fire but have zero downstream effect | Wire: implement `linked`/`fed`/`attuned`/`sensed` status consumers in policy.js (~6-8h, already flagged TKT) |
| P0-4 | cautious AI retreat_hp_pct identical to base (both 0.3) | Fix: set cautious retreat_hp_pct to 0.45 to restore behavioral differentiation |

### P1 — Moderate

| # | Finding | Action |
|---|---------|--------|
| P1-1 | gravita channel dead (no traits, no resistances) | Decision: remove channel from species_resistances or add 1+ trait using it |
| P1-2 | fuoco + elettrico channels have no vulnerable archetype | Add 1 archetype each with 120 fuoco and 120 elettrico vulnerability, or accept offense-into-neutral is balanced |
| P1-3 | ai_intent_scores.yaml has no per-intent weights — tuning requires code edits | Extract intent weights (attack_weight, heal_weight, kite_weight) into YAML |
| P1-4 | artigli_sette_vie z=+2.24 AND wired in active_effects (double bonus) | Verify active_effects extra_damage doesn't stack with trait_mechanics damage_step at runtime |
| P1-5 | 26/33 trait_mechanics traits have no active_effects entry | These traits are balance-specced but runtime-inert. Audit which are intentional passives vs missing wires |

### P2 — Minor / Polish

| # | Finding | Action |
|---|---------|--------|
| P2-1 | T3 traits only 6/433 (1.4%) | Add 4-6 T3 entries for endgame build diversity |
| P2-2 | Light movement profile has no terrain penalties at all | Add 1+ terrain with light_cost_multiplier > 1.0 (e.g., luminescente=1.5) |
| P2-3 | muro defense_mod=0 while blocking LOS | Consider cover=0.25 for adjacent units (tactical adjacent-to-wall value) |
| P2-4 | Elevation swing (+45% net) has no counter-mechanic | Add high-cover terrain (roccia) that partially negates elevation bonus (+50% cover reduces swing) |
| P2-5 | adattivo archetype fully neutral — no species identity | Either remove or add a minor trait-based identity (e.g., +5% resist all channels) |
| P2-6 | mantello_meteoritico buff=4 z=+2.69 but 1-turn window mitigates | Monitor in playtest; if consistently game-warping, reduce to buff=3 |
| P2-7 | balanced AI profile has empty overrides and utility_brain=false | Add at least 1 override to give balanced a distinct behavioral footprint |

---

## Summary Stats

| Metric | Value |
|--------|-------|
| Traits audited (trait_mechanics) | 33 |
| Efficiency outliers >2σ | 3 (ipertrofia, artigli_sette_vie, frusta_fiammeggiante) |
| Power-dense suspects | +2 (sangue_piroforico, cannone_sonico) |
| Species archetypes | 5 |
| Dead channels | 1 (gravita) |
| Channels with no vulnerable target | 2 (fuoco, elettrico) |
| Silent no-op traits | 68/433 (15.7%) |
| AI profiles with real differentiation | 1/3 (aggressive only) |
| trait_mechanics with no runtime wire | 26/33 (79%) |
| P0 actions | 4 |
| P1 actions | 5 |
| P2 actions | 7 |
