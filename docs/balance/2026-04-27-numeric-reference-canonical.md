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

## Anti-pattern guard

- ❌ NON hardcode numeric values inline nel codice — sempre via YAML config
- ❌ NON modificare numeric senza ADR (>1 numero canonical) o playtest evidence
- ❌ NON breaking change (es. `pe_cost` rename) senza grep blast radius pre-merge
- ✅ DO consume YAML at runtime via `loadConfig()` + cache + idempotent reload
- ✅ DO encoding 'utf-8' explicit (Python json.dump fallback bug 2026-04-25)

## Cross-card

- M-Tier-S #11 Fallout Tactics — pattern source numeric ref doc canonical
- All `packs/evo_tactics_pack/data/balance/*.yaml` — runtime canonical data

## Maintenance

**Update trigger**:

- New balance YAML aggiunto → riga in §1-§9
- Numeric value canonical change → ADR + update qui
- Sprint α/β/γ ship cambio numerico → cross-link PR

**Review cycle**: 60 giorni (`review_cycle_days`). Ground-truth via grep cross-check pre review.
