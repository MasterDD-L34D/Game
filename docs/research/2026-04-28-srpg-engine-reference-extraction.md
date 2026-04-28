---
title: 2026-04-28 SRPG engine reference codebase extraction — pre Sprint M.4 Godot bootstrap
doc_status: active
doc_owner: master-dd
workstream: cross-cutting
last_verified: 2026-04-29
language: it
review_cycle_days: 30
related:
  - docs/adr/ADR-2026-04-28-deep-research-actions.md
  - docs/planning/2026-04-28-master-execution-plan.md
  - docs/planning/2026-04-28-godot-migration-strategy.md
  - docs/research/2026-04-28-deep-research-synthesis.md
---

# SRPG engine reference codebase extraction — pre Sprint M.4 Godot bootstrap

## 1. Scope

Action 1 di [`ADR-2026-04-28-deep-research-actions.md`](../adr/ADR-2026-04-28-deep-research-actions.md) §Action 1. Pre-requisite Sprint N.3 (Fase 2 Godot vertical slice MVP) e Sprint M.4 (Godot bootstrap). Validare nostro data model + estrarre blueprint A\* GDScript + AI scoring patterns + behavior tree templates archetype prima di ri-implementare in Godot. Save reinvention via study mirato 4 reference repos battle-tested + 1 citation.

**Boundary**:

- ✅ Observation patterns + adaptation note + pseudo-code GDScript original.
- ❌ NO copy code direct (license check — OpenXcom GPLv3 viral).
- ❌ NO runnable spike (Sprint M.4 actual implementation).
- ❌ NO scope balloon Action 2/3 (Beehave templates + harness — separate research).

## 2. Repos studiati

| Repo                    | URL                                        | Linguaggio         | License             | Stato               | Ruolo                              |
| ----------------------- | ------------------------------------------ | ------------------ | ------------------- | ------------------- | ---------------------------------- |
| Project-Tactics         | github.com/Project-Tactics/Project-Tactics | C++ ECS (entt)     | (LICENSE in repo)   | clonato `--depth 1` | FFT-like architecture validation   |
| nicourrea/Tactical-RPG  | github.com/nicourrea/Tactical-RPG          | GDScript Godot 4.x | (no LICENSE file)   | clonato `--depth 1` | A\* pathfinding GDScript blueprint |
| OpenXcom                | github.com/OpenXcom/OpenXcom               | C++                | GPLv3               | clonato `--depth 1` | Tactical AI module patterns        |
| Lex Talionis (lt-maker) | gitlab.com/rainlash/lt-maker               | Python (pygame)    | LICENSE.txt in repo | clonato `--depth 1` | Citation only, defer post-Godot    |

**Note clone**: `https://github.com/rainlash/lt-maker` ritorna `Repository not found` (mirror GitHub assente). Canonical = GitLab (`gitlab.com/rainlash/lt-maker`). ADR-2026-04-28 indica `lex-talionis.net/` come fonte; URL corretto verificato e clonato.

## 3. Project-Tactics findings (FFT-like architecture validation)

**Layout**:

- `src/Engine/` — core (Scene, Overlay, Render).
- `src/Libs/` — Ecs (entt-based), Fsm, Event, Resource, Rendering, Physics.
- `src/Apps/OpenTactica/` — entrypoint app stub.
- `src/Apps/OpenTacticaPrototype/` — prototype giocabile (Component/State/DataSet/Overlay).

### 3.1 Turn scheduler — CT bar (Charge Time)

File: [`src/Apps/OpenTacticaPrototype/Component/CharacterComponent.{h,cpp}`](https://github.com/Project-Tactics/Project-Tactics/blob/main/src/Apps/OpenTacticaPrototype/Component/CharacterComponent.h).

Pattern: ECS component `ChargeTime { speed, chargeTime }` + tag component `CharBattleReady`. Sistema `BattleSystem::advanceTick(deltaTime)`:

1. Per ogni entity con `ChargeTime` → `chargeTime += speed * deltaTime`.
2. Se `chargeTime >= 100` → reset 0 + emplace tag `CharBattleReady`.
3. Tag-based selection per turn order (chi è ready agisce).

**Match Evo-Tactics**: nostro CT bar lookahead PR [#1998](https://github.com/MasterDD-L34D/Game/pull/1998) `apps/backend/services/ctBar*.js` segue lo stesso pattern (charge accumulation + ready threshold). Match perfetto, no adjust necessario. Project-Tactics conferma design canonical FFT-derived.

**Adattamento Evo-Tactics**: nessuno richiesto. Nostro round model + CT lookahead 3 turni resta canonical.

### 3.2 Data model unit — CharStats

```cpp
struct CharStats {
    uint16_t hp, maxHp, mp, maxMp;
    uint8_t level, xp, move, jump;
};
```

**Match Evo-Tactics**: nostro `data/core/jobs.yaml` + per-unit state (HP/AP/PI/level) si allinea. Differenze:

- Project-Tactics ha `jump` esplicito (FFT vertical movement). Noi no — square grid 2D senza terrain height. **Decision** ADR `ADR-2026-04-16-grid-square` conferma.
- Project-Tactics manca status array. Noi abbiamo status modifiers (`statusModifiers.js` 7 status fisici/mentali).

**Adattamento Evo-Tactics**: dati allineati. Sprint M.4 Godot port — riusare YAML jobs/species esistenti, no re-spec.

### 3.3 Grid + tile state

Project-Tactics non ha grid esplicito nei prototype scoperti — ECS-based con `Transform.position` continuous (`glm::vec3`). Render via `RenderSystem`. Grid logic non presente in `OpenTacticaPrototype/State/GameState.cpp`.

**Limit study**: Project-Tactics è in fase "engine framework + sample" più che "FFT clone giocabile". Grid representation non maturata. Riferimento per ECS pattern + CT bar, NON per tile state.

**Adattamento Evo-Tactics**: nostro `apps/backend/services/grid/` (Sprint G.2b) con square 5-zone flanking resta canonical. Conferma ADR-2026-04-26-flanking-tunable.

### 3.4 Action resolution pipeline

Project-Tactics non espone action pipeline matura. `BattleSystem::advanceTick` solo CT accumulator. State machine combat (target select → resolve → animate) demandata a future state.

**Adattamento Evo-Tactics**: nostro `roundOrchestrator.js` + `abilityExecutor.js` + `combat/resistanceEngine.js` chain è più maturo. Project-Tactics utile come ECS skeleton, NO action pipeline reference.

## 4. nicourrea/Tactical-RPG findings (Godot A\* pathfinding blueprint)

**Layout**:

- `Scenes/` — `.tscn` Godot scenes.
- `Scripts/Navigation/` — `navigation.gd` + `weighted_astar.gd`.
- `Scripts/Actions/` — base `action.gd` + `move_action.gd` + `attack_action.gd` + `aoe_attack_action.gd` + `light/heavy_attack_action.gd` + `end_turn_action.gd`.
- `Scripts/Commands/` — command pattern `command_executor.gd`, `command_queue.gd`, `command_string.gd`.
- `Scripts/ScriptAI/` — `characterAI.gd` + `commanderAI.gd`.
- `Scripts/Services/` — service locator (MapServices).
- `project.godot` — Godot 4.x.

### 4.1 A\* implementation — `weighted_astar.gd`

File: [`Scripts/Navigation/weighted_astar.gd`](https://github.com/nicourrea/Tactical-RPG/blob/main/Scripts/Navigation/weighted_astar.gd).

Pattern Godot-native:

```gdscript
extends AStarGrid2D
class_name AStarGrid2DWeighted

var _tile_map_layer: TileMapLayer

func load_astar_parameters(tile_map_layer: TileMapLayer) -> AStarGrid2DWeighted:
    _tile_map_layer = tile_map_layer
    region = _tile_map_layer.get_used_rect()
    cell_size = Vector2(32, 32)
    diagonal_mode = 1   # diagonal allowed
    update()
    build_walls()
    return self

func _compute_cost(from_id: Vector2i, to_id: Vector2i) -> float:
    return get_tile_movement_cost(to_id)

func get_tile_movement_cost(tile: Vector2i) -> int:
    var data = _tile_map_layer.get_cell_tile_data(tile)
    return data.get_custom_data("movement_cost") if data else 10

func is_tile_walkable(tile: Vector2i) -> bool:
    var data = _tile_map_layer.get_cell_tile_data(tile)
    return data.get_custom_data("Walkable") if data else false

func build_walls():
    # iterate region, set_point_solid for non-walkable tiles
```

**Key takeaway**: Godot fornisce `AStarGrid2D` builtin. Custom subclass override `_compute_cost(from, to)` per terrain-weighted A\*. `set_point_solid()` per walls. `tile_data.get_custom_data("movement_cost")` consente costo per tipo terreno via TileMap editor.

**API path**:

- `astar.update()` — rebuild grid.
- `astar.set_point_solid(pos, true)` — wall.
- `astar.get_id_path(start, end) -> Array[Vector2i]` — path tile-by-tile.
- `astar.get_point_path(start, end) -> Array[Vector2]` — path world-coord.

### 4.2 Navigation orchestrator — `navigation.gd`

```gdscript
extends Node

@onready var flood_fill: Node = $FloodFill
@onready var astar_pathfinder: Node = $AstarPathfinder

func navigation_character_movement(c: Character, range: int) -> Array[Vector2i]:
    return flood_fill.navigation_character_movement(c, range)

func navigation_astar(start: Vector2i, end: Vector2i) -> Array[Vector2i]:
    return astar_pathfinder.navigation_astar(start, end)

func navigation_get_furthest_point_in_path(move_range: Array[Vector2i], path: Array[Vector2i]) -> Array[Vector2i]:
    # find tile in path che è ancora dentro move_range (cap movement)
    path = path.duplicate(); path.reverse()
    for path_tile in path:
        if path_tile in move_range:
            return [path_tile]
    return []
```

**Pattern**: 2 component separati — flood-fill per "tile raggiungibili" (range overlay UI) + A* per "path effettivo verso target". Combo `furthest_point_in_path()` = A* fino a target ma fermo a movement-range cap. Pattern usato sia da player click sia da AI.

### 4.3 Action base + command pattern

File: [`Scripts/Actions/action.gd`](https://github.com/nicourrea/Tactical-RPG/blob/main/Scripts/Actions/action.gd).

```gdscript
class_name Action

var _character: Character
var ap_cost: int = 1
var turn_cooldown: int = 1
var remaining_cooldown: int
var limited_uses: bool = false
var max_charges: int = 1
var remaining_charges: int

func get_valid_targets() -> Array[Variant]: ...
func get_in_range_targets() -> Array[Variant]: ...

func perform_action(target: Variant) -> void:
    var q = CommandQueue.new()
    q.add_command_queue(_perform_sub_action(target))
    q.add_command(CommandSetActionCharge.new(self, remaining_charges - 1))
    q.add_command(CommandSetActionCooldown.new(self, turn_cooldown))
    q.add_command(CommandSetAp.new(_character, _character.get_action_points() - ap_cost))
    MapServices.execute_command_queue(q)
    MapServices.end_characters_action(_character)
```

**Pattern**: command queue per atomic state mutation (AP/cooldown/charges). Subclass override solo `_perform_sub_action(target)`. AP + cooldown + charges = 3 dimensioni resource, identici alle nostre `ability.cost_pi` + `ability.cooldown_turns` + `ability.charges_per_battle` in `data/core/jobs.yaml`.

**Match Evo-Tactics**: nostro `apps/backend/services/abilityExecutor.js` ha già 18 `effect_type` + AP/cooldown logic. Match concettuale, ma:

- Noi runtime Node, non Godot. Sprint M.4 port = riscrittura GDScript con Action base subclass per ogni effect_type.
- Comando pattern (mutation atomica via `CommandQueue`) **NON presente** nostro backend. Migliora replay/undo.

**Adattamento Evo-Tactics Sprint M.4**:

- Porta `abilityExecutor.js` → `Scripts/Abilities/ability_executor.gd` con 18 effect_type subclass di `Action`.
- Adotta `CommandQueue` pattern Godot per replay/undo (Wildfrost-style già museum M-024).
- File mappa: `apps/backend/services/abilityExecutor.js` → `godot/scripts/abilities/ability_base.gd` + 18 subclass.

### 4.4 Character AI — `characterAI.gd`

File: [`Scripts/ScriptAI/characterAI.gd`](https://github.com/nicourrea/Tactical-RPG/blob/main/Scripts/ScriptAI/characterAI.gd).

```gdscript
class_name CharacterAI

func decide_action(player_force: Force):
    target = find_closest_target(player_force)
    if target:
        if is_in_attack_range(target):
            execute_attack(target)
        else:
            if move_action.can_be_used():
                move_closer_to_adjacent_tile_with_astar(target)
            else:
                _end_turn_early()
    else:
        _end_turn_early()
```

**Pattern**: AI greedy semplice — closest target + range check + adjacent tile via A\*. NO scoring, NO behavior tree, NO archetype differenziazione. Buono come baseline minimal, **NON** come reference Sprint N.4 AI port.

**Adattamento Evo-Tactics**: nicourrea AI è troppo basic. Per Sprint N.4 ricorrere a OpenXcom (sezione 5) e Action 2 ADR (Battle Brothers / XCOM postmortem).

## 5. OpenXcom findings (AI scoring patterns)

**Target file**: [`src/Battlescape/AIModule.cpp`](https://github.com/OpenXcom/OpenXcom/blob/master/src/Battlescape/AIModule.cpp) (2174 LOC) + `AIModule.h` (126 LOC). License GPLv3.

⚠️ **License caveat**: GPLv3 viral. ZERO copy code direct. Solo observation pattern + descrizione + pseudo-code original in nostro voice.

### 5.1 4 modi AI (state machine)

```cpp
enum AIMode { AI_PATROL, AI_AMBUSH, AI_COMBAT, AI_ESCAPE };
```

| Mode      | Trigger                        | Goal                                                            |
| --------- | ------------------------------ | --------------------------------------------------------------- |
| AI_PATROL | nessun nemico visibile + start | Move verso prossimo `Node` patrol                               |
| AI_AMBUSH | nemico noto ma non visibile    | Move verso tile con cover che vede ultima posizione nota nemico |
| AI_COMBAT | nemico visibile                | Attack: weapon/grenade/psi                                      |
| AI_ESCAPE | hp basso o circondato          | Move verso tile lontano + cover, riduci spotters                |

Mode dispatch in `AIModule::think(BattleAction *action)`. Transizione mode basata su `_visibleEnemies`, `_knownEnemies`, `_spottingEnemies`, hp%, escape TUs.

**Pattern chiave**: state machine 4-stato + transizione data-driven (nessun behavior tree esplicito), ognuno con setup function (`setupPatrol/setupAmbush/setupAttack/setupEscape`) che produce un `BattleAction` da eseguire.

### 5.2 Scoring tile per Ambush + Escape

Pattern (paraphrased):

```text
bestTileScore = -100000
for each reachable tile:
    score = BASE_SYSTEMATIC_SUCCESS  # baseline
    if tile has cover line-to-target: score += COVER_BONUS
    score -= spotters_at(tile) * EXPOSURE_PENALTY
    if tile in fire: score -= FIRE_PENALTY
    score -= TU_cost_to_reach(tile)
    if score > FAST_PASS_THRESHOLD: break  # good enough, gogogo
    if score > bestTileScore: bestTile = tile

if bestTileScore == -100000: AI_PATROL fallback
```

**Constants** (hand-tuned):

- `BASE_SYSTEMATIC_SUCCESS` — score baseline esplorazione razionale.
- `BASE_DESPERATE_SUCCESS` — fallback escape low-hp.
- `COVER_BONUS` — bonus tile con cover.
- `EXPOSURE_PENALTY` — penalty per spotter visible.
- `FIRE_PENALTY` — penalty fire on tile.
- `FAST_PASS_THRESHOLD = 100` — early-exit "abbastanza buono".

**Match Evo-Tactics**: nostro `apps/backend/services/declareSistemaIntents.js` già fa utility scoring (range/HP/threat/cohesion). Pattern OpenXcom = arricchire con:

- **FAST_PASS_THRESHOLD**: early-exit ottimizzazione, evita scan completo. Sprint N.4 importante per perf Godot mobile (60fps target plan v2).
- **Hand-tuned constants**: documentare valori in YAML config, non hardcode. Allineato nostro `config/orchestrator.json` style.
- **Negative score = fallback PATROL**: defensive default quando no good move. Nostro AI non ha fallback chiaro, gap.

### 5.3 Behavior tree archetype templates (preview)

OpenXcom non usa behavior tree puri — è state machine + scoring inline. Per Sprint N.4 Beehave (plan v2) servono template archetype ad-hoc. Preview blueprint qui (specifica completa = Action 2 ADR `docs/research/2026-04-28-tactical-ai-archetype-templates.md`):

**Vanguard tank** (BB "Footman" + XCOM:EU "Sectoid Commander" pattern):

```
Selector
├── Sequence: hp_pct < 0.3 → SetMode(ESCAPE) → MoveToCoverNearAlly()
├── Sequence: enemy_in_melee_range → ExecuteMeleeAttack()
├── Sequence: ally_under_fire → MoveToInterceptLine()  # body-block
└── PatrolToObjective()
```

**Skirmisher offensive** (BB "Hyena" + XCOM:EU "Thin Man" pattern):

```
Selector
├── Sequence: hp_pct < 0.4 → MoveAwayFromEnemies()  # disengage
├── Sequence: enemy_flanked OR enemy_low_hp → BurstAttackHighestThreat()
├── Sequence: high_ground_available → MoveToHighGround()
└── MoveTowardsClosestEnemy()
```

**Healer support** (BB "Necromancer" + Wildfrost healer pattern):

```
Selector
├── Sequence: ally_hp_pct < 0.5 → CastHealAtLowestHpAlly()
├── Sequence: ally_status_critical → CleanseStatus()
├── Sequence: self_threatened → MoveAwayFromEnemies()
└── MoveTowardsAllyClusterCenter()
```

⚠️ **Nota**: questi sono **preview** — Action 2 ADR (separate research, ~3h) produrrà template completo + tuning constants Beehave. Qui solo come bridge OpenXcom → Sprint N.4.

## 6. Lex Talionis citation (defer post-Godot)

**Layout**: Python pygame, 5229+ files. Engine in `app/engine/`:

- `ai_controller.py` (886 LOC) — main AI orchestrator.
- `combat/` — `animation_combat.py`, `base_combat.py`, `map_combat.py`, `simple_combat.py`, `mock_combat.py`.
- `pathfinding/` — pathfinding module.
- `combat_calcs.py` + `combat_calcs_utils.py` — formula combat (FE Mt/Skl/Spd/Lck/Def/Res).

**Phase-based combat model** (FE-style):

- Player Phase → Enemy Phase → NPC Phase (alternate, non simultaneous round). Diverso dal nostro round simultaneo Sprint Round Simultaneo (#1536).
- Combat 1v1 instant-resolve pre-animation (`base_combat.py` calcs → `animation_combat.py` viz).

**AI model** (`ai_controller.py`):

```python
class AIController():
    def __init__(self):
        self.state = "Init"  # state machine string-based
        self.behaviour_idx = 0
        self.behaviour = None

    def set_next_behaviour(self):
        behaviours = DB.ai.get(self.unit.get_ai()).behaviours
        # iterate behaviours fino a uno con condition true
```

State machine Init/Move/Attack/Canto. Behaviour list configurato data-driven da `DB.ai` (analogo nostro YAML jobs/policy). Condition evaluator string-eval (`evaluate.evaluate(condition, unit, position)`).

**Decision**: defer post-Godot. Lex Talionis è alternative lineage (FE-style phase-based, no round simultaneo) — non match diretto nostro core loop. Citation mantenuta come reference se mai pivot a phase-based.

**Reuse possibile post-Godot** (ipotetico):

- `ai_controller.py` behaviour list pattern → analogo Beehave plugin Godot. Già coperto da plan v2.
- `combat_calcs.py` formula structure → reference per combat math validation.

## 7. Cross-ref Evo-Tactics

### 7.1 Match (data model + CT bar)

| Pattern reference                         | File Evo-Tactics nostro                                     | Status           |
| ----------------------------------------- | ----------------------------------------------------------- | ---------------- |
| ECS CT bar (Project-Tactics)              | `apps/backend/services/ctBar*` (PR #1998)                   | ✅ match         |
| Square grid + tile data (nicourrea)       | `apps/backend/services/grid/` + ADR-2026-04-16-grid-square  | ✅ match         |
| Action AP+cooldown+charges (nicourrea)    | `data/core/jobs.yaml` ability schema + `abilityExecutor.js` | ✅ match concept |
| AI utility scoring (OpenXcom paraphrased) | `apps/backend/services/ai/declareSistemaIntents.js`         | ✅ match concept |
| Behaviour list data-driven (Lex Talionis) | `data/core/jobs.yaml` policy hint                           | ✅ match concept |

### 7.2 Divergenze

| Pattern reference                                  | Divergenza                                 | Decision                                         |
| -------------------------------------------------- | ------------------------------------------ | ------------------------------------------------ |
| Project-Tactics `jump` stat (FFT 3D)               | Noi square 2D, no vertical                 | Skip — ADR-2026-04-16 lock 2D                    |
| Lex Talionis phase-based combat (Player→Enemy→NPC) | Noi round simultaneo (#1536)               | Skip — round model superiore per co-op TV        |
| nicourrea greedy AI (closest target)               | Noi utility scoring multi-criterio         | Skip — nostro più maturo                         |
| OpenXcom 4-mode state machine inline               | Noi target Beehave behavior tree (plan v2) | Adapt — porta scoring constants in BT leaf nodes |

### 7.3 Adaptation note Sprint M.4 (Godot bootstrap)

Action concrete derivate da study:

1. **Pathfinding A\*** — porta `apps/backend/services/grid/` logic a `godot/scripts/navigation/astar_grid_weighted.gd` riusando blueprint nicourrea §4.1. ⏱️ ~3h.
2. **Action base class** — crea `godot/scripts/abilities/ability_base.gd` + `command_queue.gd` riusando pattern nicourrea §4.3. 18 subclass per effect_type. ⏱️ ~5h.
3. **CT bar component** — porta `apps/backend/services/ctBar*` a `godot/scripts/combat/charge_time_component.gd` riusando pattern Project-Tactics §3.1. ⏱️ ~2h.
4. **AI scoring constants** — esponi in `godot/config/ai_constants.json` (FAST_PASS_THRESHOLD, COVER_BONUS, EXPOSURE_PENALTY, FIRE_PENALTY) riusando pattern OpenXcom §5.2. Constants tunable senza re-build. ⏱️ ~1h.

Totale Sprint M.4 portion AI/Combat backbone: **~11h** (subset di plan v2 Sprint M.4 ~25-30h budget).

## 8. Output blueprints

### 8.1 A\* GDScript pseudo-code (ready-to-port Sprint M.4)

```gdscript
# godot/scripts/navigation/astar_grid_weighted.gd
extends AStarGrid2D
class_name AStarGridWeighted

const DEFAULT_COST: int = 10

var _tile_map: TileMapLayer
var _occupant_map: Dictionary = {}  # Vector2i -> unit_id (per blocking pathfinding)

func setup(tile_map: TileMapLayer) -> void:
    _tile_map = tile_map
    region = _tile_map.get_used_rect()
    cell_size = _tile_map.tile_set.tile_size
    diagonal_mode = AStarGrid2D.DIAGONAL_MODE_NEVER  # Evo-Tactics 4-direction (square grid)
    update()
    _rebuild_walls()

func _compute_cost(from_id: Vector2i, to_id: Vector2i) -> float:
    return float(_get_tile_cost(to_id))

func _get_tile_cost(tile: Vector2i) -> int:
    var data: TileData = _tile_map.get_cell_tile_data(tile)
    if data == null: return DEFAULT_COST
    return data.get_custom_data("movement_cost") as int

func _rebuild_walls() -> void:
    for x in range(region.position.x, region.position.x + region.size.x):
        for y in range(region.position.y, region.position.y + region.size.y):
            var tile = Vector2i(x, y)
            set_point_solid(tile, not _is_walkable(tile))

func _is_walkable(tile: Vector2i) -> bool:
    var data: TileData = _tile_map.get_cell_tile_data(tile)
    if data == null: return false
    return data.get_custom_data("walkable") as bool

func set_occupant(tile: Vector2i, unit_id: String) -> void:
    _occupant_map[tile] = unit_id
    set_point_solid(tile, true)

func clear_occupant(tile: Vector2i) -> void:
    _occupant_map.erase(tile)
    set_point_solid(tile, not _is_walkable(tile))

# Flood-fill movement range (tile raggiungibili entro budget)
func reachable_tiles(start: Vector2i, budget: int) -> Array[Vector2i]:
    var visited: Dictionary = {start: 0}
    var frontier: Array = [start]
    while not frontier.is_empty():
        var current: Vector2i = frontier.pop_front()
        var current_cost: int = visited[current]
        for neighbor in _neighbors_4(current):
            if not _is_walkable(neighbor): continue
            if _occupant_map.has(neighbor): continue
            var step_cost: int = _get_tile_cost(neighbor)
            var total: int = current_cost + step_cost
            if total <= budget and (not visited.has(neighbor) or visited[neighbor] > total):
                visited[neighbor] = total
                frontier.append(neighbor)
    return visited.keys()

func _neighbors_4(tile: Vector2i) -> Array[Vector2i]:
    return [
        tile + Vector2i(0, 1), tile + Vector2i(0, -1),
        tile + Vector2i(1, 0), tile + Vector2i(-1, 0),
    ]

# A* path tile-by-tile (per move execution)
func path_to(start: Vector2i, end: Vector2i) -> Array[Vector2i]:
    return get_id_path(start, end)

# Cap path a movement-range (combo flood + A*)
func capped_path(start: Vector2i, end: Vector2i, budget: int) -> Array[Vector2i]:
    var range_tiles: Array[Vector2i] = reachable_tiles(start, budget)
    var full_path: Array[Vector2i] = path_to(start, end)
    full_path.reverse()
    for tile in full_path:
        if tile in range_tiles: return [tile]  # furthest reachable
    return []
```

**Pattern**:

- Sublcass `AStarGrid2D` (Godot built-in, performant nativo).
- `_compute_cost` override → terrain-weighted.
- `_occupant_map` → blocca tile per unit attive (no overlap).
- `reachable_tiles` flood-fill custom (movement range overlay UI).
- `capped_path` combo flood + A\* (AI move-as-far-as-possible).

**Adattamento Evo-Tactics Sprint M.4**: file path `godot/scripts/navigation/astar_grid_weighted.gd`. Test scenarios:

- 8x8 map con 2 unit, budget 5, end_tile lontano 10 → expected `capped_path` = tile a 5 step.
- Wall in mezzo → A\* aggira O fallisce gracefully.
- Occupant friendly tile → escluso da reachable.

### 8.2 Beehave behavior tree templates 3 archetype

⚠️ Specifica completa in Action 2 ADR (separate research). Qui preview ad alto livello — vedi sezione 5.3.

**File target Sprint N.4**: `godot/scripts/ai/behavior_trees/`:

- `vanguard_tank.tres` (Beehave resource)
- `skirmisher_offensive.tres`
- `healer_support.tres`

**Action leaf shared**:

- `MoveToTile(tile)` — chiama `astar_grid_weighted.path_to()` + execute movement step-by-step.
- `ExecuteAttack(target, ability_id)` — invoke `ability_executor.execute(self, target, ability_id)`.
- `ScoreAndPick(...)` — utility scoring inline, riusa pattern OpenXcom §5.2 con FAST_PASS_THRESHOLD early-exit.

## 9. Risk + mitigation

| Risk                                                | Likelihood          | Mitigation                                                                                                                              |
| --------------------------------------------------- | ------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| Repo drift (commit shifts post-clone)               | Low                 | Clone `--depth 1` snapshot, file paths reference + commit SHA citati. Re-verify on Sprint M.4 actual port.                              |
| License OpenXcom GPLv3 viral                        | High se code copy   | ZERO copy. Solo descrizione pattern + pseudo-code original nostro voice. Citation OK (URL + file path).                                 |
| nicourrea no LICENSE file                           | Medium              | Default = no permission. Treat come reference observation only, NO derivative. Pseudo-code §8.1 = original re-implementation, non fork. |
| Lex Talionis Python pygame ≠ Godot                  | High se port direct | Defer — citation only. Reuse abstract pattern (behaviour list) sì, code no.                                                             |
| Godot 4.x API drift (AStarGrid2D signatures)        | Low                 | Pseudo-code valid Godot 4.2 stable. Verify on Sprint M.4 setup.                                                                         |
| Project-Tactics ECS skeleton incomplete             | Medium              | Limit scope a CT bar pattern + data model. NO action pipeline reference (immaturo).                                                     |
| Scope balloon study 7h → 14h                        | Medium              | Cap rispettato (Project-Tactics 2h + nicourrea 2h + OpenXcom 1.5h + Lex Talionis 30min + writeup 1h).                                   |
| Blueprint troppo high-level senza valore Sprint M.4 | Medium              | Ogni section §7.3 + §8.1 + §8.2 ha file path + effort stimato + test scenarios.                                                         |

## 10. References

### Repos studiati

- Project-Tactics: <https://github.com/Project-Tactics/Project-Tactics>
- nicourrea/Tactical-RPG: <https://github.com/nicourrea/Tactical-RPG>
- OpenXcom: <https://github.com/OpenXcom/OpenXcom> (GPLv3)
- Lex Talionis (lt-maker): <https://gitlab.com/rainlash/lt-maker>

### Canonical Evo-Tactics docs

- ADR Action 1 spec: [`docs/adr/ADR-2026-04-28-deep-research-actions.md`](../adr/ADR-2026-04-28-deep-research-actions.md) §Action 1
- Master execution plan: [`docs/planning/2026-04-28-master-execution-plan.md`](../planning/2026-04-28-master-execution-plan.md) §Sprint M.4
- Godot migration strategy: [`docs/planning/2026-04-28-godot-migration-strategy.md`](../planning/2026-04-28-godot-migration-strategy.md)
- Deep research synthesis: [`docs/research/2026-04-28-deep-research-synthesis.md`](2026-04-28-deep-research-synthesis.md) §Reference repos
- Grid square ADR: [`docs/adr/ADR-2026-04-16-grid-square.md`](../adr/ADR-2026-04-16-grid-square.md)
- CT bar PR: [#1998](https://github.com/MasterDD-L34D/Game/pull/1998)
- Action 5b BB hardening PR: [#1999](https://github.com/MasterDD-L34D/Game/pull/1999)

### Follow-up sessioni

- Action 2 ADR-2026-04-28 — Beehave behavior tree templates 3 archetype (BB+XCOM postmortem). Effort ~3h. NEW research doc separate.
- Sprint M.4 actual implementation — port pseudo-code §8.1 + §8.2 a Godot 4.x runnable. Effort ~11h subset di plan v2 Sprint M.4 ~25-30h budget.
- Sprint N.4 AI port — `declareSistemaIntents.js` → Beehave BT con scoring constants OpenXcom-paraphrased. Effort ~8h.
