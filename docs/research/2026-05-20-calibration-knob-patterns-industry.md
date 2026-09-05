---
title: Calibration Knob Patterns — Cross-Scenario Tension Resolution (Industry Research)
date: 2026-05-20
type: research
domain: [balance, calibration, game-economy]
pillar: [P6]
related_adr:
  - docs/adr/ADR-2026-04-20-damage-scaling-curves.md
trigger: Wave 5-7 nerf (PR #2344) split-verdict — hardcore_07 OOB-high vs hardcore_06 RED
agent: balance-illuminator (research mode)
last_verified: 2026-05-20
---

# Calibration Knob Patterns — Cross-Scenario Tension Resolution

## Problem statement

Single `cost_ap` knob (global, Wave 5-7 nerf PR #2344) = zero-sum. Helps `hardcore_07` (WR 60%, target 30-50%, +10pp above ceiling) but breaks `hardcore_06` (WR 0%, target 15-25%). DPS budget cut hurts scenario already DPS-starved (boss HP=40, avg survivor 22.4 HP residual N=10 post-nerf).

Both scenarios share `encounter_class: 'hardcore'` → same `enemy_damage_multiplier: 1.8` + same target_bands. Global `cost_ap` change hits both identically regardless of scenario design intent.

**Core insight**: need **orthogonal knobs** — scenario-local levers that don't bleed across encounter_class. Industry has solved this repeatedly.

## Pattern 1: Hades Pact of Punishment — Modular Orthogonal Knob Pool ⭐⭐⭐⭐⭐

**Provenance**: [Hades Pact of Punishment — RPGSite verified knob list](https://www.rpgsite.net/feature/10287-hades-pact-of-punishment-heat-modifiers-and-how-to-maximize-your-rewards). Supergiant Games, 2020. Design lineage Bastion Shrines (2011) → Transistor Limiters (2014) → Pyre Titan Stars (2017) → Hades Pact (2020) — 9-year studio design evolution.

**Mechanism**: 15 independent conditions organized by axis (enemy stats / encounter composition / player resources / environmental). Each condition has 1-5 ranks. Player selects any combination → total Heat = sum of activated ranks. Total reachable Heat: 63. **Conditions are independent, not sequential**.

**Verified knob axes**:

| Axis                | Condition            | Ranks | Heat range             |
| ------------------- | -------------------- | ----- | ---------------------- |
| Enemy damage        | Hard Labor           | 5     | +20%/rank → +100% max  |
| Enemy HP            | Calisthenics Program | 2     | +15%/rank              |
| Enemy speed         | Forced Overtime      | 2     | +20%/rank, 3 heat/rank |
| Encounter count     | Jury Summons         | 3     | +20% enemies           |
| Player healing      | Lasting Consequences | 4     | -25%/rank              |
| Player ability pool | Routine Inspection   | 4     | -3 Mirror talents/rank |
| Boss behavior       | Extreme Measures     | 3     | new mechanics/rank     |

**Critical insight**: Forced Overtime (speed) costs 3 heat/rank vs Hard Labor (damage) costs 1 heat/rank. **Non-linear heat pricing** = some knobs are "luxury" hard mode. Speed changes are MORE disruptive than damage, costs more.

**Evo-Tactics translation**: instead of one `enemy_damage_multiplier` per `encounter_class`, define knob pool per scenario in `data/core/balance/damage_curves.yaml`:

```yaml
scenario_overrides:
  enc_tutorial_06_hardcore:
    boss_hp_multiplier: 0.75
    player_healing_pct: 1.0
    enemy_damage_multiplier: 1.8
  enc_tutorial_07_hardcore_pod_rush:
    enemy_count_bonus: 0
    timer_pressure_delta: 0
    enemy_damage_multiplier: 1.4
```

**Landing**: `damageCurves.js getEncounterClass()` reads class defaults → scenario overrides on top. Schema extension ~2h.

## Pattern 2: Slay the Spire Ascension — Categorical Additive Stacking ⭐⭐⭐

**Provenance**: [GDC Vault 2019 — Slay the Spire: Metrics Driven Design and Balance](https://www.gdcvault.com/play/1025731/-Slay-the-Spire-Metrics). Anthony Giovannetti, MegaCrit. Complete level list [slaythespire.wiki.gg/wiki/Ascension](https://slaythespire.wiki.gg/wiki/Ascension).

**Mechanism**: 20 discrete difficulty levels, cumulative stacking. Modifiers categorically separated into axes:

- L1-4: Map/path + enemy stat buffs (damage × 3 tiers)
- L5-6, 11, 14: Player resource compression
- L7-9: Enemy HP buffs (normal/elite/boss tiers)
- L10, 12: Deck/card pool manipulation
- L15-16: Event/shop penalty
- L17-19: Enemy AI complexity (3 tiers)
- L20: Boss composition (2-boss finale)

**Each axis appears in 3-tier form** — damage L2/L3/L4, HP L7/L8/L9, AI L17/L18/L19. Lets players feel same category pressure escalate.

**Applicability Evo-Tactics**: meta-pattern for campaign-level "Ascension" track across scenarios. **NOT for per-scenario cross-calibration**. Additive cumulative stacking → can't selectively buff boss HP for scenario A without buffing it for B.

**Anti-pattern flag**: StS Ascension works because runs are INDEPENDENT. Evo-Tactics scenarios share `encounter_class` → Ascension-style global stacking would break orthogonal scenarios. Useful only for character-difficulty meta-track ABOVE scenario layer. Sprint M14+ candidate.

## Pattern 3: Darkest Dungeon — Dimensional Mode Bundles ⭐⭐⭐

**Provenance**: [Darkest Dungeon wiki.gg/Game_Modes](https://darkestdungeon.wiki.gg/wiki/Game_Modes). Red Hook Studios. Radiant update Feb 2017.

**Mechanism**: 3 named difficulty bundles (Radiant / Darkest / Stygian). Each bundle = pre-configured COMBINATION of knobs. Player chooses one, all knobs change simultaneously. **Fixed combinations, NOT free composition**.

**Radiant design intent** (per Red Hook): "reduce farming and time-consuming elements without reducing combat difficulty". Combat stats unchanged. Campaign meta-knobs changed. **Separation between combat-difficulty knobs and progression-friction knobs**.

**Evo-Tactics use**: NAMED PRESET system on top of `encounter_class`. Example:

```yaml
scenario_presets:
  cattedrale_apex_v3:
    boss_hp_multiplier: 0.75
    enemy_damage_multiplier: 1.8
    party_ap_restore_rate: 1.0
  assalto_spietato_v2:
    enemy_count_bonus: -1
    timer_turn_limit: 12
```

Simpler than free composition (Pattern 1), less flexible. Good for "this scenario has been calibrated and we name it". Premature with 2 hardcore scenarios. Revisit M14.

## Pattern 4: Into the Breach — Scenario-Tagged Orthogonal Design ⭐⭐⭐⭐⭐

**Provenance**: [GDC 2019 — Into the Breach Design Postmortem](https://www.gdcvault.com/play/1025772/-Into-the-Breach-Design). Matthew Davis, Subset Games. Free on [YouTube](https://www.youtube.com/watch?v=s_I07Iq_2XM).

**Mechanism**: each mission has FIXED, TAGGED modifiers that are part of its identity. "Fire" mission has fire tiles as scenario feature, not difficulty toggle. Mission modifiers = DESIGN CHOICES encoded in encounter definition, not difficulty sliders applied post-hoc.

**Core insight (GDC talk)**: ITB famously deleted 80% of content during development. Designers found per-scenario-tagged mechanics (rather than global difficulty systems) more robust because players could learn and anticipate specific encounter rules. Difficulty came from encounter COMPOSITION, not numerical inflation.

**Evo-Tactics applicability** (direct, immediate):

`hardcore_06` boss has 40 HP + `elevation: 1` (+30% damage). Scenario FEATURES. Real fix = scenario-specific parameter:

```javascript
const HARDCORE_06_MODIFIERS = {
  boss_hp: 40,
  boss_elevation: 1,
  hazard_tile_dmg: 2,
  party_ap: 2,
};
```

`hardcore_07` scenario-tagged parameters:

```javascript
const HARDCORE_07_MODIFIERS = {
  pod_count: 3,
  timer_turn_limit: 15,
  sistema_pressure_start: 60,
};
```

**Fix path hardcore_06 0% WR**: scenario-tag `boss_hp_override: 30` WITHOUT touching `enemy_damage_multiplier`. Two scenarios have DIFFERENT bottlenecks, need DIFFERENT knobs.

**Landing**: `hardcoreScenario.js` already has per-unit HP hardcoded. Add `damage_multiplier_override` field per scenario. `damageCurves.js getEncounterClass()` checks scenario-level override first, falls back to class. ~1h code change.

## Pattern 5: Monster Train Covenant — Compound Stacking ⭐⭐ AVOID

**Provenance**: [Monster Train Fandom — Covenant Ranks](https://monster-train.fandom.com/wiki/Covenant_Ranks). Shiny Shoe, 2020.

**Mechanism**: 25 sequential covenant levels, each adding new modifier on top of all previous. Mix enemy buffs, player nerfs, shop cost, deck pollution. Exponential compounding.

**Anti-pattern flag**: compound stacking → exponential complexity. At C25, ALL 25 modifiers active — designers must balance SUM not individual knob. For Evo-Tactics: O(N²) calibration matrix. Changing one level requires re-testing ALL compound combos above. ADR-2026-04-20 already notes "multiplier knob exhausted" after iter7 — compound stacking ceiling hit.

**Use only**: cross-scenario "Ascension track" meta-system Sprint M12+, scenarios stable + telemetry live. NOT for immediate calibration fix.

## Recommended Adoption

### P0 — Immediate (this session, 1-3h)

**Pattern 4 + Pattern 1 combined = Scenario-Local Override System**

Schema additions:

**A — `data/core/balance/damage_curves.yaml`**:

```yaml
scenario_overrides:
  enc_tutorial_06_hardcore:
    boss_hp_override: 30
  enc_tutorial_07_hardcore_pod_rush:
    enemy_count_modifier: -1
    timer_turn_limit_override: 13
```

**B — `damageCurves.js getEncounterClass()`** post class lookup:

```javascript
if (scenario_id && data.scenario_overrides?.[scenario_id]) {
  return { ...cls, ...data.scenario_overrides[scenario_id] };
}
```

**C — `hardcoreScenario.js buildHardcoreUnits06()`** — read `boss_hp_override` from config.

**Expected Δ WR**:

- hardcore_06: HP 40→30 (-25% boss survivability). DPR/HP linear model → WR target shift 0%→15-25%
- hardcore_07: -1 pod + tighter timer. WR shift 60%→40-50% (toward center)

**Effort**: ~2-3h schema + loader + builder. Smoke prerequisite: N=10 batch verify per scenario.

### P1 — Sprint M13/Q (4-8h, post-P0)

Full 7-axis per-scenario knob pool: `boss_hp_multiplier`, `enemy_damage_multiplier`, `enemy_count_modifier`, `player_ap_per_turn`, `hazard_tile_damage`, `timer_turn_limit`, `boss_enrage_threshold_pct`.

Validation rule prevents config drift: scenario_overrides entries must reference valid scenario IDs (verified vs hardcoreScenario.js exports).

### P2 — Sprint M14+ (Backlog)

- Pattern 3 named preset bundles (≥5 calibrated scenarios)
- Pattern 2 StS Ascension meta-track (post-playtest TKT-M11B-06, telemetry live)

## Anti-Pattern Flags

1. **Global `cost_ap` as sole calibration knob** — CONFIRMED ANTI-PATTERN this session + ADR-2026-04-20 "multiplier knob exhausted". Wave 5-7 nerf improved hardcore_07 +10pp but drove hardcore_06 to 0%. Single global knob across scenarios with different bottlenecks = zero-sum.

2. **Monster Train compound stacking** — O(N²) calibration matrix. ADR iter7 ceiling hit at multiplier 1.8.

3. **Boss HP reduction via `encounter_class` global** — would reduce boss HP across ALL hardcore scenarios. hardcore_07 has NO boss HP bottleneck (WR 60%). Wrong direction.

4. **Party AP global increase** — fixes hardcore_06 DPS but trivializes hardcore_07 timer pressure. Orthogonal constraint confirmed.

## Proposed Tickets

```
TKT-BALANCE-HADES-SCENARIO-OVERRIDES: 2h — scenario_overrides block + damageCurves.js resolution (P0)
TKT-BALANCE-ITB-BOSS-HP-DECOUPLE: 1h — boss_hp_override read from scenario config
TKT-BALANCE-HADES-KNOB-POOL: 4h — full 7-axis per-scenario knob pool (P1)
TKT-BALANCE-SMOKE-HC06-N10: 0.5h — batch verify boss_hp=30 pre-merge
```

## Sources (verified primary)

- [GDC 2019 — Slay the Spire Metrics Driven Design](https://www.gdcvault.com/play/1025731/-Slay-the-Spire-Metrics)
- [GDC 2019 — Into the Breach Design Postmortem](https://www.gdcvault.com/play/1025772/-Into-the-Breach-Design)
- [Hades Pact of Punishment — RPGSite](https://www.rpgsite.net/feature/10287-hades-pact-of-punishment-heat-modifiers-and-how-to-maximize-your-rewards)
- [Darkest Dungeon Game Modes — wiki.gg](https://darkestdungeon.wiki.gg/wiki/Game_Modes)
- [Slay the Spire Ascension — wiki.gg](https://slaythespire.wiki.gg/wiki/Ascension)
- [Monster Train Covenant Ranks — Fandom](https://monster-train.fandom.com/wiki/Covenant_Ranks)
- Supergiant design lineage: [thegamer.com Hades Heat Pact trivia](https://www.thegamer.com/hades-heat-pact-punishment-trivia/)

## Conclusion

Root cause = scenario `hardcore_06` and `hardcore_07` share `encounter_class: 'hardcore'` but have orthogonal bottlenecks (boss HP vs pod count). No single class-level knob can fix both.

**Industry-proven solution** (Hades Pact + ITB scenario-tagged): per-scenario override layer in `data/core/balance/damage_curves.yaml` with `scenario_overrides` map. `damageCurves.js` resolver checks scenario override first, falls back to class.

**P0 fix**: `boss_hp_override: 30` for hardcore_06 + `enemy_count_modifier: -1, timer_turn_limit_override: 13` for hardcore_07. Effort 2-3h + N=10 smoke.
