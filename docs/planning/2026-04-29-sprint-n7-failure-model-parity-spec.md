---
title: 2026-04-29 Sprint N.7 spec — Failure model parity Godot port (WoundState.gd + LegacyRitualPanel.gd)
doc_status: draft
doc_owner: master-dd
workstream: cross-cutting
last_verified: 2026-04-29
language: it
review_cycle_days: 30
related:
  - docs/adr/ADR-2026-04-28-deep-research-actions.md
  - docs/adr/ADR-2026-04-28-bg3-lite-plus-movement-layer.md
  - docs/planning/2026-04-28-master-execution-plan.md
  - docs/research/2026-04-28-srpg-engine-reference-extraction.md
---

# Sprint N.7 spec — Failure model parity Godot port

> **Status**: SPEC DRAFT. Implementation deferred Sprint M.1 Godot bootstrap + Sprint N.7 micro-feature execution.

## 1. Scope

Sprint N.7 micro-feature aggiunto Sprint N gate row **MANDATORY 5/5** (user verdict 2026-04-28 Q8). Failure model parity cross-stack web → Godot: `wounded_perma` persistence cross-encounter + `legacy_ritual` overlay fires on death.

Questo doc è SPEC pre-impl. GDScript codice qui sotto è skeleton di riferimento, validation effettiva via Godot editor + GUT runner Sprint M.1.

Senza failure model parity, Godot port = creatura ferita "magicamente sana" encounter dopo = perdita identità tactical RPG attrition = perdita P2 def status. Gate fail = NO Fase 3 cutover.

## 2. Pre-condition

- Sprint M.1 Godot project `Game-Godot-v2` esistente (bootstrap)
- Action 5a+5b BB hardening web stack PR #1999 shipped (severity enum canonical)
- Action 6 ambition PR #2004 shipped (bond_path lineage merge)
- Web stack reference shipped:
  - PR #1982 — Skiv G1 wounded_perma origin
  - PR #1984 — legacyRitualPanel + bond_hearts narrative
  - PR #1918 — propagateLineage
  - PR #1999 — Action 5 severity enum hardening

## 3. Spec WoundState.gd Resource (custom class)

GDScript Resource class mirror web stack `data/core/traits/active_effects.yaml` `wounded_perma`. Persistence cross-encounter via Godot Resource serialization (`ResourceSaver` / `ResourceLoader`).

```gdscript
# 2026-04-29 Sprint N.7 spec — WoundState.gd Resource custom class.
# Mirror web stack PR #1999 wounded_perma severity enum.
# Persistence cross-encounter via Godot Resource serialization.

class_name WoundState
extends Resource

enum Severity { LIGHT, MEDIUM, SEVERE }

@export var unit_id: String = ""
@export var severity: Severity = Severity.LIGHT
@export var origin_encounter_id: String = ""
@export var origin_round: int = 0

func attack_mod_penalty() -> float:
    match severity:
        Severity.LIGHT: return -0.05
        Severity.MEDIUM: return -0.15
        Severity.SEVERE: return -0.30
    return 0.0

func to_save_dict() -> Dictionary:
    # Serialize per persistence cross-encounter
    return {
        "unit_id": unit_id,
        "severity": severity,
        "origin_encounter_id": origin_encounter_id,
        "origin_round": origin_round
    }

static func from_save_dict(data: Dictionary) -> WoundState:
    var w = WoundState.new()
    w.unit_id = data.get("unit_id", "")
    w.severity = data.get("severity", Severity.LIGHT)
    w.origin_encounter_id = data.get("origin_encounter_id", "")
    w.origin_round = data.get("origin_round", 0)
    return w
```

**Mapping web stack → Godot**:

| Web stack (PR #1982/#1999)          | Godot port (Sprint N.7)              |
| ----------------------------------- | ------------------------------------ |
| `active_effects.yaml wounded_perma` | `WoundState.gd` Resource class       |
| `severity: light/medium/severe`     | `Severity { LIGHT, MEDIUM, SEVERE }` |
| `attack_mod` penalty                | `attack_mod_penalty()` method        |
| sgTracker mirror                    | `to_save_dict` / `from_save_dict`    |

## 4. Spec LegacyRitualPanel.gd overlay parity con web stack PR #1984

GDScript scene + script mirror web stack `apps/play/src/legacyRitualPanel.js`. Trigger su unit death event con `lineage_id` non-null.

```gdscript
# 2026-04-29 Sprint N.7 spec — LegacyRitualPanel.gd overlay scene.
# Mirror web stack PR #1984 legacyRitualPanel.js.
# Trigger su unit death event con lineage_id non-null.

class_name LegacyRitualPanel
extends CanvasLayer

signal mutation_chosen(mutation_ids: Array)
signal ritual_skipped()

@onready var mutation_list: VBoxContainer = $Panel/MutationList
@onready var timer_label: Label = $Panel/TimerLabel
@onready var voice_line: Label = $Panel/VoiceLine

var unit: Dictionary = {}  # Unit data (id + traits + lineage_id)
var available_mutations: Array = []
var ritual_timer: float = 30.0  # 30s timer countdown (mirror web stack)

func show_ritual(unit_data: Dictionary, mutations: Array) -> void:
    # Display mutation choice UI
    # Mirror web stack: 30s timer countdown + irreversible commit
    pass

func _on_mutation_button_pressed(mutation_id: String) -> void:
    mutation_chosen.emit([mutation_id])
    queue_free()

func _process(delta: float) -> void:
    ritual_timer -= delta
    timer_label.text = "%.1fs" % ritual_timer
    if ritual_timer <= 0:
        ritual_skipped.emit()
        queue_free()
```

**Mapping web stack → Godot**:

| Web stack (PR #1984)                          | Godot port (Sprint N.7)                   |
| --------------------------------------------- | ----------------------------------------- |
| `legacyRitualPanel.js` overlay                | `LegacyRitualPanel.gd` CanvasLayer scene  |
| 30s timer countdown                           | `ritual_timer: float = 30.0` + `_process` |
| Irreversible session lock                     | `queue_free()` post-emit signal           |
| `POST /api/v1/lineage/legacy-ritual`          | HTTPClient call via backend Express       |
| voice line preview ("Il branco non ti vede…") | `voice_line: Label` populated on show     |

## 5. Persistence cross-encounter strategy

`CampaignState` Resource (NEW Sprint N.7) holds `Array[WoundState]` per `unit_id`. `ResourceSaver.save()` / `ResourceLoader.load()` save/load between encounters. Mirror web stack `apps/backend/services/campaign/campaignStore` pattern (Prisma write-through adapter).

Flow:

1. Encounter A end → orchestrator collects `Array[WoundState]` per unit alive
2. `CampaignState.wounds_by_unit[unit_id] = [...]` updated
3. `ResourceSaver.save("user://campaign_state.tres", campaign_state)`
4. Encounter B start → `ResourceLoader.load("user://campaign_state.tres")`
5. Per unit spawn: `unit.wounds = campaign_state.wounds_by_unit.get(unit.id, [])`
6. `attack_mod_penalty()` aggregato applicato a action_resolver Godot (mirror Express `combat/woundedPermaApply.js`)

## 6. Action 6 ambition tie-in

Bond_path completion `Skiv-Pulverator alleanza` (PR #2004) triggers lineage merge → BOTH parents' WoundState propagate to offspring (if any) via Action 6 lineage merge logic.

Flow:

1. Skiv + Pulverator alpha bond_path completion → ambition ritual fires
2. `LineageMergeService.gd` (Sprint N.7) reads parents' `wounds` arrays
3. Offspring `Resource` instance: `wounds = [parent1.wounds, parent2.wounds]` (cap 5 oldest dropped — vedi §8 risk)
4. Cross-ref Action 6 PR #2004 ambition choice ritual → entrambi 30s timer = consistency UX

## 7. GUT test plan Sprint N.7 (deferred Sprint M.1 actual impl)

- **Test 1** — Persistence: encounter A finishes con unit `wounded_perma severity=MEDIUM` → `ResourceSaver.save` campaign state → encounter B reload → unit ha `wounded_perma severity=MEDIUM` preserved + `attack_mod_penalty() == -0.15`
- **Test 2** — Ritual fire: encounter B unit dies (`hp <= 0`) con `lineage_id` non-null → `LegacyRitualPanel` triggered → `mutation_chosen` signal emit → mutation list saved a `CampaignState`
- **Test 3** — Timer expire: ritual_timer expires (30s) → `ritual_skipped` signal emit → unit dead, no mutation propagated, panel `queue_free()`
- **Test 4** — Lineage merge: Action 6 bond_path complete → Skiv + Pulverator alpha lineage merge → offspring inherits parents' WoundState array (concat + cap 5)
- **Test 5** — Action 5 severity hardening parity: import test fixture web stack `tests/api/woundedPermaSeverity.test.js` → port equivalente GUT → severity enum LIGHT/MEDIUM/SEVERE penalty -0.05/-0.15/-0.30 corrisponde web stack output

GUT runner config: `addons/gut/gut_cmdln.gd -gtest=res://test/sprint_n7/`.

## 8. Risk + mitigation

- **Risk**: GDScript Resource serialization breaks su Godot version drift. **Mitigation**: pin `project.godot config_version` + version-lock Sprint M.1 (Godot 4.x exact patch).
- **Risk**: 30s timer rompe pause game flow. **Mitigation**: pause game state durante ritual modal (mirror web stack PR #1984 `set_process_mode(PROCESS_MODE_ALWAYS)` + `Engine.set_time_scale(0)` su gameplay node).
- **Risk**: mutation list infinite (lineage chain deep). **Mitigation**: cap WoundState array max 5 per unit (oldest dropped FIFO).
- **Risk**: Resource save path collision multi-campaign. **Mitigation**: `user://campaigns/<campaign_id>/state.tres` namespacing.
- **Risk**: cross-stack regression web → Godot test parity. **Mitigation**: import 5 fixture test web stack come golden output, GUT compara byte-level.

## 9. References

- ADR canonical: [`docs/adr/ADR-2026-04-28-deep-research-actions.md`](../adr/ADR-2026-04-28-deep-research-actions.md) §Action 3
- Web stack reference shipped:
  - PR #1982 Skiv G1 wounded_perma
  - PR #1984 legacyRitualPanel + bond_hearts narrative
  - PR #1918 propagateLineage
  - PR #1999 Action 5 severity enum hardening
  - PR #2004 Action 6 ambition Skiv-Pulverator bond_path lineage merge
- Master plan v2: [`docs/planning/2026-04-28-master-execution-plan.md`](2026-04-28-master-execution-plan.md) §Sprint N gate (line ~820 post Action 3.1)
- Reference engine codebase: [`docs/research/2026-04-28-srpg-engine-reference-extraction.md`](../research/2026-04-28-srpg-engine-reference-extraction.md) (Action 1)
- BG3-lite Plus ADR: [`docs/adr/ADR-2026-04-28-bg3-lite-plus-movement-layer.md`](../adr/ADR-2026-04-28-bg3-lite-plus-movement-layer.md) (cross-stack porting context)

## 10. Status

**SPEC DRAFT**. Implementation deferred Sprint M.1 Godot bootstrap + Sprint N.7 micro-feature execution. Effort ADR-2026-04-28 §Action 3 stimato ~3h (riserva 1-2h buffer per actual impl Godot).

Gate Sprint N row "Failure model parity" MANDATORY 5/5 — gate fail = NO Fase 3 cutover.
