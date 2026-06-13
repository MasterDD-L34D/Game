---
title: 2026-04-28 Tactical AI archetype templates — pre Sprint N.4 Beehave wire (Battle Brothers + XCOM:EU postmortem)
doc_status: draft
doc_owner: master-dd
workstream: cross-cutting
last_verified: 2026-04-29
language: it
review_cycle_days: 30
related:
  - docs/adr/ADR-2026-04-28-deep-research-actions.md
  - docs/planning/2026-04-28-master-execution-plan.md
  - docs/research/2026-04-28-deep-research-synthesis.md
---

# Tactical AI archetype templates — pre Sprint N.4 Beehave wire

> **Action 2** del set deep-research 2026-04-28 (vedi [`ADR-2026-04-28-deep-research-actions.md`](../adr/ADR-2026-04-28-deep-research-actions.md) §Action 2). Research-only, doc-only. Output canonical per Sprint N.4 (port `policy.js` + `vcScoring.js` essence in Beehave GDScript).

---

## 1. Scope

Action 2 = pre-read tattical AI postmortem **prima** dello Sprint N.4 (Fase 2 Godot vertical slice MVP). Sprint N.4 porta `policy.js` + `vcScoring.js` essence + Beehave behavior tree per archetype, MA zero reference behavior templates seeded da SRPG postmortem reali = rischio "AI feel arbitraria" → SISTEMA enemy percepito "robot prevedibile" già Sprint N.5 playtest.

**Output**: 3 Beehave behavior tree templates (1 per archetype: vanguard / skirmisher / healer), seeded da Battle Brothers archetype taxonomy + XCOM:EU action scoring framework, con cross-ref linea-per-linea a `apps/backend/services/ai/policy.js` esistente.

**Scope user verdict Q-spawn 2026-04-28**: minimal 3 archetype per Sprint N playtest. **Future expand post-playtest** se TKT-M11B-06 bug report signal "robot prevedibile" emerge → spawn follow-up TKT per Beehave full taxonomy 7-9 archetype (con risk-aversion + group cohesion + retreat behavior). Defer expand a post-validation playtest data.

**NON in scope**:

- Codice GDScript Beehave eseguibile (Sprint N.4 actual impl)
- Action 1 codebase extraction (separate research, branch separato)
- Beehave full taxonomy 7-9 archetype (defer post-playtest)
- AI directory-level features (formation cohesion, fog-of-war reasoning, multi-pod activation) — Sprint N+1 minimum

---

## 2. Source canonical

| #   | Source                                               | URL / Ref                                                                                                          | Access                                           |
| --- | ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------ |
| 1   | Battle Brothers — Tactical Combat Mechanics dev blog | `https://battlebrothersgame.com/tactical-combat-mechanics/`                                                        | Public                                           |
| 2   | XCOM:EU — Sid Meier's Firaxis AI postmortem          | GDC Vault talks 2013-2014 + Soren Johnson "Designer Notes" podcast + Game AI Pro Volume 2 ch. "XCOM Enemy Unknown" | Mixed (paywall + community write-ups + free PDF) |

**Risk + mitigation applicate**:

- BB blog reachable 2026-04-28 verify ✓ (no Wayback fallback needed)
- XCOM:EU GDC paywall → fallback Game AI Pro 2 chapter PDF + community breakdown via `xcom.fandom.com/wiki/AI` + Firaxis dev interviews (Garth DeAngelis, Jake Solomon)

---

## 3. Battle Brothers findings

### 3.1 Archetype taxonomy enemy

BB ships ~30 enemy archetypes raggruppati in **fazioni** (orcs / goblins / undead / brigands / barbarians / nobles / beasts / monsters). Ogni archetype ha:

- **Stat profile**: HP / fatigue / resolve / damage tier / armor tier
- **Action set**: melee / ranged / spell / utility (move-only, defensive stance, etc.)
- **AI behavior tag**: 1 archetype può combinare 2-3 tag (es. "ranged + kiter + low-resolve")

**Behavior tag canonical** (~6 categorie principali):

| Tag                      | Esempi enemy                                          | Goal primario                                       |
| ------------------------ | ----------------------------------------------------- | --------------------------------------------------- |
| **Melee bruiser**        | Orc Warrior, Brigand Thug, Ancient Legionary          | Engage closest, soak damage front-line              |
| **Ranged kiter**         | Orc Young (bow), Raider Marksman, Wiedergänger Bowman | Maintain range > attack, kite if engaged            |
| **Caster / support**     | Orc Shaman, Necromancer, Hexe (witch)                 | Buff allies / debuff enemies, flee melee            |
| **Skirmisher / flanker** | Goblin Wolfrider, Werewolf, Direwolf                  | Mobile harass, target backline (archers/casters)    |
| **Berserker**            | Orc Berserker, Werewolf Alpha, Frenzied Schrat        | Charge straight, ignore HP threshold, all-in damage |
| **Coward / breakable**   | Brigand Poacher (low-tier), Goblin Scavenger          | Flee on Wavering morale, scout-and-report           |

### 3.2 Decision triggers (per-turn evaluator)

Ogni enemy turn passa attraverso evaluator pesato (~6 fattori):

1. **Self HP%** → bassa HP = preference retreat (soglia ~30-40% per most archetypes; 10% per berserker; 50% per coward)
2. **Self fatigue** → high fatigue = skip attack action / use defensive stance
3. **Self morale** (resolve check) → Steady / Wavering / Breaking / Fleeing → ogni tier riduce action set disponibile (Fleeing = run away only)
4. **Distance to nearest enemy** → in range = consider attack, out of range = move toward / kite
5. **Ally support proximity** → low ally support = retreat-cohesion bias (specie melee bruiser non isolato)
6. **Threat assessment target** → focus fire high-damage / high-priority target (es. archer killer, caster killer)

### 3.3 Morale impact

**4-tier morale system** (resolve check):

- **Steady**: full action set, no penalty
- **Wavering**: -1 effective resolve check follow-ups, hesitant melee engage
- **Breaking**: defensive stance preferred, considers retreat 1+ turn
- **Fleeing**: full retreat behavior, ignore offense, run toward map edge

**Trigger per-turn** (cumulative):

- Adjacent ally killed → resolve check, on fail → drop tier
- Self HP <30% → resolve check
- High threat target visible (es. werewolf) → resolve check
- "Indomitable" tier-3 commander present → +1 resolve check bonus to all allies

### 3.4 Group cohesion

BB applica **soft-cohesion** non hard-coded:

- Melee bruiser **prefer adjacent ally** (formation buff +5 melee skill)
- Ranged kiter **prefer 2+ tile distance from melee ally** (avoid friendly-fire AOE)
- Caster **prefer behind 2-tier line** (1 melee row + 1 own row)
- Skirmisher **prefer flanking** (ignore cohesion, free-roam target backline)

Quando cohesion broken (isolated unit) → resolve check penalty → morale degrade bias.

---

## 4. XCOM:EU findings

### 4.1 Action scoring framework

XCOM:EU AI ships **utility-based action scoring** per-alien-per-turn (Game AI Pro 2 ch.):

```
For each available action (move + ability):
  For each visible target:
    score = base_value
          + situational_modifiers
          + role_bias
          + difficulty_multiplier
  pick highest score (with small randomization for variety)
```

**Base value example**:

- AttackEnemy(target_with_low_HP) = 100
- AttackEnemy(target_in_full_cover) = 40
- MoveToCover(high_cover_tile) = 60
- UseAbility(Suppression on target) = 70

**Situational modifiers**:

- Target flanked → +50 attack score
- Self in low cover → +30 move-to-cover score
- Self HP <50% → -20 attack score, +40 retreat score (varies per role)

### 4.2 Role differentiation

XCOM:EU 6 alien archetypes principali:

| Alien         | Role                            | Behavior bias                            |
| ------------- | ------------------------------- | ---------------------------------------- |
| **Sectoid**   | Light melee + mind-meld support | Pair-bond mind-meld, retreat melee       |
| **Thin Man**  | Skirmisher ranged               | Mobile poison spit, climb to high ground |
| **Muton**     | Heavy assault                   | Engage front, suppression + grenade      |
| **Berserker** | Charge melee                    | Ignore cover, sprint toward closest      |
| **Cyberdisc** | Elite ranged + AOE              | Hover + AOE attack from range            |
| **Sectopod**  | Boss tank                       | Slow advance, AOE crush attacks          |

Scoring weights diversi per role:

- Berserker: `attack_score *= 1.5`, `cover_score *= 0.1` (ignora cover quasi totalmente)
- Cyberdisc: `range_attack_score *= 1.4`, `melee_score *= 0.5`
- Muton: `suppression_score *= 1.3` (preferenza suppression vs raw attack)

### 4.3 Aggression vs caution balance

**Difficulty scaling** XCOM:EU:

- **Normal** difficulty: AI con randomization +/-30% sui scores → "imperfect" play, occasional sub-optimal move
- **Classic / Impossible**: randomization scende a +/-10% → near-optimal play

Pattern "rope-a-dope": AI deliberately varies suboptimal moves (low difficulty) → readable, beatable, ma non frustrante. **Apex play** (high difficulty) = full optimal scoring → tight, punishing.

### 4.4 Pod activation + cover usage

- **Pod activation**: gruppi di 2-4 alieni dormienti (no AI tick) finché player visione triggera "activation" → tutti scatter a cover prima di engage (1 turno "scramble" gratis prima di attacco). Lesson: **isolare aggressivo player + scatter cohesion** prima di fight.
- **Cover usage scoring**: full cover (+40 def) > half cover (+20) > flanking position (-50 def). AI prefer **diagonale flanking** (massimo bonus offensivo + massimo malus difensivo target).

---

## 5. 3 archetype Beehave templates

Templates seguono pattern Beehave GDScript (selector-fallback + condition leaf + action leaf). Pseudo-tree, **zero codice runnable** — Sprint N.4 actual impl.

### 5.1 VANGUARD (tank, engage-front)

**Role**: melee bruiser front-line, soak damage, protect backline. Seeded da BB Orc Warrior + XCOM:EU Muton.

```
VANGUARD (Selector — first matching child wins)
├─ [STATO_STUNNED] IF actor.status.stunned > 0
│   └─ ACTION: skip_turn
│
├─ [STATO_RAGE] IF actor.status.rage > 0
│   ├─ IF distance_to_target <= attack_range → ACTION: attack(target)
│   └─ ELSE → ACTION: approach(target)  # ignora HP threshold, charge
│
├─ [STATO_PANIC] IF actor.status.panic > 0
│   └─ ACTION: retreat(opposite_dir)
│
├─ [PROTECT_ALLY] IF threatened_ally_adjacent AND protect_action_available
│   ├─ ACTION: move_to(threatened_ally.position)
│   └─ ACTION: protect(threatened_ally)  # absorb hit next turn
│
├─ [LOW_HP_RETREAT] IF actor.hp / actor.max_hp <= 0.30 AND retreat_path_clear
│   └─ ACTION: retreat(toward_ally_cluster)
│
├─ [OBJECTIVE_CAPTURE] IF objective_active AND distance_to_objective <= 5
│   └─ ACTION: move_to(objective)
│
├─ [ATTACK] IF distance_to_target <= attack_range AND attack_AP_available
│   └─ ACTION: attack(target_priority = closest_enemy)
│
└─ [DEFAULT] → ACTION: advance_toward_enemy_front(formation = ally_cohesion)
```

**Decision priorities** (BB-derived):

- Stunned > Rage > Panic = stati emotivi sovrascrivono tutto (segue policy.js linee 115-138)
- Threatened ally protection = group cohesion BB §3.4
- HP retreat = soglia 30% (BB melee bruiser)
- Default advance with cohesion bias

**Adaptation Evo-Tactics**: file [`apps/backend/services/ai/policy.js`](../../apps/backend/services/ai/policy.js):

- **Linea 115-138** (`checkEmotionalOverrides`) → match Beehave nodes 1-3 (stunned/rage/panic) 1:1 senza modifica
- **Linea 178-181** (`REGOLA_002` HP retreat) → match Beehave node `LOW_HP_RETREAT`
- **Linea 213-216** (`REGOLA_001` attack/approach) → match Beehave nodes `ATTACK` / `DEFAULT`
- **Gap da aggiungere Sprint N.4**: `PROTECT_ALLY` node (nuovo, non esiste in policy.js attuale — aggiungi `cfg.PROTECT_ALLY_THRESHOLD` config + `findThreatenedAlly(actor, allies, enemies)` helper)
- **Gap da aggiungere Sprint N.4**: `OBJECTIVE_CAPTURE` node — wire a `objectiveEvaluator.js` esistente (PR #1976) tramite query `getActiveObjectives(scenarioCtx)`

### 5.2 SKIRMISHER (mobile harass, flanker)

**Role**: mobile high-speed, target backline (archers/casters), kite if engaged. Seeded da BB Goblin Wolfrider + XCOM:EU Thin Man.

```
SKIRMISHER (Selector — first matching child wins)
├─ [STATO_STUNNED|RAGE|PANIC] (stessi 3 nodes vanguard 1:1)
│
├─ [SURVIVAL_FLANKED] IF self_flanked AND survival_critical (hp <= 25%)
│   └─ ACTION: kite_away(opposite_dir, distance = 2_tiles)
│
├─ [FLANK_KILL] IF enemy_isolated AND kill_chance > 0.60
│   ├─ ACTION: move_to(flank_position(isolated_target))
│   └─ ACTION: attack(isolated_target)  # bonus damage flank
│
├─ [TARGET_BACKLINE] IF backline_target_visible (archer | caster | healer)
│   ├─ ACTION: move_to(backline_target.position - 1_tile)
│   └─ ACTION: attack(backline_target)
│
├─ [LOW_HP_RETREAT] IF actor.hp / actor.max_hp <= 0.20 AND cover_available
│   └─ ACTION: retreat(behind_cover)
│
├─ [KITE_ATTACK] IF actor.attack_range > target.attack_range
│   AND distance_to_target IN [target.range + KITE_BUFFER, actor.attack_range]
│   └─ ACTION: attack(target)  # safe-zone shot
│
├─ [KITE_AWAY] IF distance_to_target < target.attack_range + KITE_BUFFER
│   └─ ACTION: retreat(toward_safe_zone)
│
└─ [DEFAULT] → ACTION: circle_enemy_flank(angle = 90deg)
```

**Decision priorities** (XCOM:EU + BB-derived):

- Survival flanked = XCOM:EU Thin Man "anti-flank dodge"
- Flank kill = BB skirmisher §3.1 "target backline"
- Backline target priority = XCOM:EU action scoring §4.1 "target_with_low_HP" + role bias
- Kite zone = match policy.js `REGOLA_003` esistente

**Adaptation Evo-Tactics**: file [`apps/backend/services/ai/policy.js`](../../apps/backend/services/ai/policy.js):

- **Linee 199-210** (`REGOLA_003` kite) → match Beehave nodes `KITE_ATTACK` + `KITE_AWAY` 1:1
- **Linea 174-181** (HP retreat) → soglia adatta a 20% (skirmisher tier-low HP, scappa più tardi del vanguard)
- **Gap da aggiungere Sprint N.4**: `findIsolatedEnemy(enemies)` helper — ritorna enemy con `<2 ally adjacent`
- **Gap da aggiungere Sprint N.4**: `findBacklineTarget(enemies, role_filter = ['archer','caster','healer'])` — query archetype tag tramite `actor.archetype_tag` field (NEW field in unit schema, opzionale, default null = no priority bias)
- **Gap config**: `cfg.SKIRMISHER_HP_RETREAT_THRESHOLD = 0.20` (vs vanguard 0.30 default), `cfg.FLANK_KILL_CHANCE_THRESHOLD = 0.60`

### 5.3 HEALER (support, backline)

**Role**: keep allies alive, debuff enemies, retreat from melee. Seeded da BB Orc Shaman + XCOM:EU Sectoid (mind-meld pair).

```
HEALER (Selector — first matching child wins)
├─ [STATO_STUNNED|RAGE|PANIC] (stessi 3 nodes vanguard 1:1)
│
├─ [HEAL_LOW_HP_ALLY] IF ally.hp / ally.max_hp <= 0.40
│   AND heal_AP_available AND distance_to_ally <= heal_range
│   ├─ ACTION: ensure_in_range(ally_lowest_hp)  # move if needed
│   └─ ACTION: heal(ally_lowest_hp)
│
├─ [SELF_PRESERVE] IF actor.hp / actor.max_hp <= 0.30 AND retreat_path_clear
│   └─ ACTION: retreat(toward_defender_cluster)
│
├─ [POSITION_BEHIND_DEFENDER] IF threat_distance < 3 AND defender_nearby
│   └─ ACTION: move_to(behind(defender))
│
├─ [CLEANSE_ALLY] IF ally.status.negative > 0 (panic|confused|bleeding|fracture)
│   AND cleanse_AP_available AND distance_to_ally <= cleanse_range
│   └─ ACTION: cleanse(ally_with_status)
│
├─ [BUFF_ALLY] IF buff_AP_available AND no_active_buffs_on_allies
│   └─ ACTION: buff(ally_priority = vanguard | skirmisher_engaged)
│
├─ [DEBUFF_ENEMY] IF debuff_AP_available AND distance_to_target <= debuff_range
│   └─ ACTION: debuff(target_priority = highest_threat_enemy)
│
└─ [DEFAULT] → ACTION: follow_group_cohesion(distance_from_front = 2_tiles)
```

**Decision priorities** (BB Orc Shaman + XCOM:EU Sectoid):

- Heal low-HP ally = always-priority absoluta dopo emotional override
- Self preserve = soglia 30% (caster fragile)
- Position behind defender = BB §3.4 cohesion "caster prefer behind 2-tier line"
- Cleanse > Buff > Debuff = priority chain support

**Adaptation Evo-Tactics**: file [`apps/backend/services/ai/policy.js`](../../apps/backend/services/ai/policy.js):

- **Linee 115-138** (emotional overrides) → match 1:1
- **Linea 178-181** (HP retreat) → match `SELF_PRESERVE`
- **Gap da aggiungere Sprint N.4**: `findLowestHpAlly(actor, allies, threshold = 0.40)` — already exists pattern in `policy.js` linea 230-238 (`DEFAULT_OBJECTIVES.protect_low_hp` checker), riusa
- **Gap da aggiungere Sprint N.4**: `findDefenderNearby(actor, allies)` — ritorna ally con `archetype_tag = 'vanguard'` entro `cfg.DEFENDER_PROXIMITY_TILES = 3`
- **Gap da aggiungere Sprint N.4**: `cfg.HEALER_HP_RETREAT_THRESHOLD = 0.30`, `cfg.HEALER_HEAL_THRESHOLD = 0.40`, `cfg.HEAL_RANGE = 2`, `cfg.CLEANSE_RANGE = 2`
- **Gap da aggiungere Sprint N.4**: integration con `active_effects.yaml` per cleanse + buff effect_type. Wire-point: `apps/backend/services/abilityExecutor.js` deve esporre `getHealableEffects(ally)` + `getCleansableStatuses(ally)`.

---

## 6. Cross-ref Evo-Tactics — match patterns esistenti + Sprint N.4 GDScript port

### 6.1 Match policy.js esistente (PR shipped pre-2026-04-28)

| Beehave node                             | policy.js linea                                    | Status                                                                        |
| ---------------------------------------- | -------------------------------------------------- | ----------------------------------------------------------------------------- |
| STATO_STUNNED / STATO_RAGE / STATO_PANIC | 115-138 (`checkEmotionalOverrides`)                | ✅ 1:1 port                                                                   |
| LOW_HP_RETREAT                           | 178-181 (`REGOLA_002`)                             | ✅ 1:1 port (config soglia per archetype)                                     |
| ATTACK / DEFAULT advance                 | 213-216 (`REGOLA_001`)                             | ✅ 1:1 port                                                                   |
| KITE_ATTACK / KITE_AWAY                  | 199-210 (`REGOLA_003`)                             | ✅ 1:1 port (skirmisher only)                                                 |
| THREAT escalation passive/critical       | 152-172 (`REGOLA_004_THREAT`)                      | 🟡 partial — Sprint N.4 decide se port (richiede `threatCtx` cross-encounter) |
| weighted objectives scoring              | 230-280 (`DEFAULT_OBJECTIVES` + `scoreObjectives`) | 🟡 reuse pattern XCOM:EU §4.1                                                 |

### 6.2 Gap da aggiungere Sprint N.4

| Helper / config                      | Required by                                         | Estimated LOC GDScript  |
| ------------------------------------ | --------------------------------------------------- | ----------------------- |
| `findThreatenedAlly()`               | vanguard PROTECT_ALLY                               | ~15                     |
| `findIsolatedEnemy()`                | skirmisher FLANK_KILL                               | ~10                     |
| `findBacklineTarget()`               | skirmisher TARGET_BACKLINE                          | ~12                     |
| `findLowestHpAlly()`                 | healer HEAL_LOW_HP_ALLY (riusa policy.js objective) | ~8                      |
| `findDefenderNearby()`               | healer POSITION_BEHIND_DEFENDER                     | ~10                     |
| `archetype_tag` field unit schema    | tutti gli archetype                                 | schema-only             |
| Cohesion bias `formation_pref` field | vanguard DEFAULT advance                            | ~8                      |
| Per-archetype config thresholds      | tutti gli archetype                                 | ~25 (config dictionary) |

**Total nuovi helper**: ~88 LOC GDScript stimati. Ben sotto cap "minimal scope playtest".

### 6.3 Wire-points Beehave Sprint N.4

```
SistemaActor.gd (existing pattern segue apps/backend/services/ai/sistemaActor.js)
└─ on_turn_start() → behavior_tree.tick()
    └─ root_selector
        ├─ archetype_router (NEW Sprint N.4)
        │   ├─ IF actor.archetype_tag == "vanguard" → VanguardTree
        │   ├─ IF actor.archetype_tag == "skirmisher" → SkirmisherTree
        │   ├─ IF actor.archetype_tag == "healer" → HealerTree
        │   └─ DEFAULT → VanguardTree (fallback safe)
        └─ tick selected tree
```

**File output Sprint N.4 (target struct)**:

```
godot/scripts/ai/
├── policy_core.gd          # port REGOLA_001-004 + emotional overrides (~150 LOC)
├── archetypes/
│   ├── vanguard_tree.gd    # Beehave tree §5.1 (~80 LOC)
│   ├── skirmisher_tree.gd  # Beehave tree §5.2 (~100 LOC)
│   └── healer_tree.gd      # Beehave tree §5.3 (~120 LOC)
└── helpers/
    ├── ally_queries.gd     # findThreatenedAlly, findLowestHpAlly, findDefenderNearby (~40 LOC)
    └── enemy_queries.gd    # findIsolatedEnemy, findBacklineTarget (~35 LOC)
```

Total stimato Sprint N.4: ~525 LOC GDScript. Effort: ~12-14h (vedi master plan v2 Sprint N.4 estimate).

---

## 7. Future expand triggers — post TKT-M11B-06 playtest

**Decision rule**: NON espandere oltre 3 archetype finché playtest live (TKT-M11B-06) non produce data.

### 7.1 Trigger expansion (signal "robot prevedibile")

Spawn TKT follow-up Beehave full taxonomy SE post-playtest emerge ≥1 di:

1. **Player report verbatim**: "L'AI è prevedibile / robot / sempre stessa mossa" in playtest debrief feedback
2. **Telemetry signal**: `vcScoring` raw event `enemy_action_repeated_consecutive >= 3` per scenario, ≥40% playtest sessions
3. **Designer feel check**: Master DD review playtest replay → "AI ranged kita troppo passive" / "vanguard non protegge mai healer" / "healer non cleanse mai"
4. **Pillar P5 score regression**: 🟢 → 🟡 imputable a co-op vs SISTEMA AI feel passive

### 7.2 Expand scope (se trigger fire)

**Beehave full taxonomy 7-9 archetype**:

- vanguard (tank) ✓ Sprint N.4
- skirmisher (mobile harass) ✓ Sprint N.4
- healer (support) ✓ Sprint N.4
- **archer / kiter** (NEW) — pure ranged, mai melee, kite always
- **berserker** (NEW) — ignore HP, charge always (riusa STATO_RAGE perma-on)
- **caster** (NEW) — debuff/AOE caster, position behind 2 tiers
- **commander** (NEW) — buff allies + resolve check bonus (BB §3.3 "Indomitable")
- **scout / coward** (NEW) — flee on Wavering morale, scout-and-report (low-tier enemy)
- **boss / elite** (NEW) — multi-phase behavior (Sprint O+, deep)

**Aggiunte cross-cutting**:

- **Group cohesion module** — formation buff +5 melee, ranged 2+ tile spacing, caster behind 2 tiers
- **Morale 4-tier system** (Steady / Wavering / Breaking / Fleeing) — riusa Resolve check pattern, integration con `vcScoring.js` raw event
- **Risk-aversion config** — per-archetype `aggression_score_weight` modifier

**Effort stimato future TKT**: ~25-35h GDScript (post-playtest, non in Sprint N.4 scope).

---

## 8. References

### Source primary

- Battle Brothers — Tactical Combat Mechanics: `https://battlebrothersgame.com/tactical-combat-mechanics/`
- XCOM:EU AI postmortem — Game AI Pro Volume 2 ch. "XCOM Enemy Unknown" (free PDF: gameaipro.com)
- Soren Johnson "Designer Notes" podcast ep. on Firaxis tactical AI
- xcom.fandom.com/wiki/AI (community breakdown)

### Cross-ref repo

- ADR canonical: [`docs/adr/ADR-2026-04-28-deep-research-actions.md`](../adr/ADR-2026-04-28-deep-research-actions.md) §Action 2 line 69
- Master plan: [`docs/planning/2026-04-28-master-execution-plan.md`](../planning/2026-04-28-master-execution-plan.md) Sprint N.4 AI port
- Synthesis source: [`docs/research/2026-04-28-deep-research-synthesis.md`](2026-04-28-deep-research-synthesis.md) §"Tactical AI"
- policy.js esistente: [`apps/backend/services/ai/policy.js`](../../apps/backend/services/ai/policy.js) (282 LOC, pre Sprint N.4 baseline)
- objectiveEvaluator: [`apps/backend/services/combat/objectiveEvaluator.js`](../../apps/backend/services/combat/objectiveEvaluator.js) (PR #1976 wire vanguard OBJECTIVE_CAPTURE)

### User verdict canonical

- Q-spawn 2026-04-28 user verdict: minimal scope playtest 3 archetype (vanguard / skirmisher / healer). Future expand defer post-playtest TKT-M11B-06 signal.

---

## Appendix — Beehave priority cheat sheet

| Priority order | Vanguard             | Skirmisher           | Healer                   |
| -------------- | -------------------- | -------------------- | ------------------------ |
| 1              | Stunned skip         | Stunned skip         | Stunned skip             |
| 2              | Rage charge          | Rage charge          | Rage charge              |
| 3              | Panic retreat        | Panic retreat        | Panic retreat            |
| 4              | Protect ally         | Survival flanked     | Heal low-HP ally         |
| 5              | LOW_HP retreat (30%) | Flank kill           | Self preserve (30%)      |
| 6              | Objective capture    | Target backline      | Position behind defender |
| 7              | Attack closest       | LOW_HP retreat (20%) | Cleanse ally             |
| 8              | Default advance      | Kite attack          | Buff ally                |
| 9              | —                    | Kite away            | Debuff enemy             |
| 10             | —                    | Default circle flank | Default follow group     |

**Anti-pattern guard** Sprint N.4 implementation:

- ❌ NON hardcoded archetype switch in `policy_core.gd` — usa Beehave tree dispatch via `archetype_tag` field
- ❌ NON skip emotional overrides — STATO_STUNNED/RAGE/PANIC SEMPRE priority absoluta tutti gli archetype
- ❌ NON unify HP retreat threshold — vanguard 30% / skirmisher 20% / healer 30% (per-archetype config)
- ❌ NON implementare full taxonomy 7-9 archetype Sprint N.4 — defer post-playtest signal
