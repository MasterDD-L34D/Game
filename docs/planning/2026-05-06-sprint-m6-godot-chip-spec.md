---
title: 'Sprint M.6 chip spec — phone_onboarding_view.gd Godot port (BASE)'
doc_status: active
doc_owner: master-dd
workstream: cross-cutting
last_verified: 2026-05-06
source_of_truth: false
language: it
review_cycle_days: 30
related:
  - docs/planning/2026-05-06-opt-c-execution-plan.md
  - docs/planning/2026-05-06-character-creation-port-godot-spec.md
  - docs/core/51-ONBOARDING-60S.md
  - apps/backend/services/coop/coopOrchestrator.js
---

# Sprint M.6 chip spec — Godot phone_onboarding_view BASE port

## Status

READY-FOR-CHIP — backend Phase A shipped (PR #2071 commit `861adcc6`). Frontend port deferred a master-dd hand-impl o Codex chip agent.

## Scope

Implementare `phone_onboarding_view.gd` + `.tscn` in **Game-Godot-v2** repo. Pre-CHARACTER_CREATION step.

**SCOPE BASE-ONLY**: 1 scelta narrativa identità branco, host-only. NO vote co-op. NO 2-step COMBO. NO world muta. (vedi `docs/planning/2026-05-06-opt-c-execution-plan.md` per Sprint N+ COMBO upgrade post-playtest).

## Backend ready (no further wire needed)

- WS msg `{type: 'phase', payload: {phase: 'onboarding'}}` → bootstrap orch + broadcast `onboarding_payload` con 3 choices canonical
- WS msg `{type: 'intent', payload: {action: 'onboarding_choice', option_key, auto_selected}}` → drain via `orch.submitOnboardingChoice` + broadcast `onboarding_chosen` + auto-publishPhaseChange `character_creation`
- Host-only enforcement at orch layer (`host_only` error code)

## Files da creare

### `Game-Godot-v2/scripts/phone/phone_onboarding_view.gd`

```gdscript
class_name PhoneOnboardingView
extends Control

signal onboarding_complete(option_key: String, auto_selected: bool)
signal onboarding_stage_changed(stage: String)  # "briefing"|"choices"|"transition"

const STAGE_BRIEFING := "briefing"
const STAGE_CHOICES := "choices"
const STAGE_TRANSITION := "transition"

var _campaign_def_id: String = "default_campaign_mvp"
var _onboarding_payload: Dictionary = {}
var _is_host: bool = false
var _picked_key: String = ""
var _auto_key: String = "option_a"
var _stage_timer: SceneTreeTimer = null
var _deliberation_timer: SceneTreeTimer = null
var _countdown_elapsed: float = 0.0
var _briefing_remaining_s: float = 10.0
var _deliberation_timeout_s: float = 30.0

# References to scene nodes (populated via @onready)
@onready var _stage_container: Control = %StageContainer
@onready var _briefing_lines: VBoxContainer = %NarrativeLines
@onready var _briefing_timer_bar: ProgressBar = %TimerBar
@onready var _choices_grid: GridContainer = %CardGrid
@onready var _countdown_label: Label = %CountdownLabel
@onready var _auto_select_hint: Label = %AutoSelectHint
@onready var _transition_line: Label = %TransitionLine


func bind_payload(payload: Dictionary, is_host: bool) -> void:
    _onboarding_payload = payload
    _is_host = is_host
    _auto_key = payload.get("default_choice_on_timeout", "option_a")
    _briefing_remaining_s = float(payload.get("briefing", {}).get("duration_seconds", 10))
    _deliberation_timeout_s = float(payload.get("deliberation_timeout_seconds", 30))


func start() -> void:
    _enter_briefing_stage()


func _enter_briefing_stage() -> void:
    emit_signal("onboarding_stage_changed", STAGE_BRIEFING)
    _stage_container.show_only("briefing")
    var briefing := _onboarding_payload.get("briefing", {})
    var lines: Array = briefing.get("lines", [])
    for line_text in lines:
        var label := Label.new()
        label.text = line_text
        _briefing_lines.add_child(label)
    _briefing_timer_bar.max_value = _briefing_remaining_s
    _briefing_timer_bar.value = _briefing_remaining_s
    _stage_timer = get_tree().create_timer(_briefing_remaining_s)
    _stage_timer.timeout.connect(_enter_choices_stage)


func _enter_choices_stage() -> void:
    emit_signal("onboarding_stage_changed", STAGE_CHOICES)
    _stage_container.show_only("choices")
    var choices: Array = _onboarding_payload.get("choices", [])
    for c in choices:
        var card := _build_card(c)
        _choices_grid.add_child(card)
    if not _is_host:
        _disable_card_interactions()  # non-host read-only
    _countdown_elapsed = 0.0


func _process(delta: float) -> void:
    var current_stage := _current_stage()
    if current_stage != STAGE_CHOICES or not _is_host or not _picked_key.is_empty():
        return
    _countdown_elapsed += delta
    var remaining: float = max(0.0, _deliberation_timeout_s - _countdown_elapsed)
    _countdown_label.text = "%ds" % int(ceil(remaining))
    if remaining <= 5.0:
        _countdown_label.add_theme_color_override("font_color", Color.RED)
        _auto_select_hint.show()
    if remaining <= 0.0 and _picked_key.is_empty():
        _picked_key = _auto_key
        _confirm_choice(true)


func _on_card_pressed(option_key: String) -> void:
    if _picked_key.is_empty():
        _picked_key = option_key
        _confirm_choice(false)


func _confirm_choice(auto_selected: bool) -> void:
    emit_signal("onboarding_complete", _picked_key, auto_selected)
    _enter_transition_stage()


func _enter_transition_stage() -> void:
    emit_signal("onboarding_stage_changed", STAGE_TRANSITION)
    _stage_container.show_only("transition")
    var transition := _onboarding_payload.get("transition", {})
    _transition_line.text = transition.get("line", "")
    var duration_s := float(transition.get("duration_seconds", 10))
    get_tree().create_timer(duration_s)


# ... helpers (omitted for brevity)
```

### `Game-Godot-v2/scenes/phone/phone_onboarding_view.tscn`

3-stage Control structure:

- VBoxContainer fullscreen padding 16px
- StageContainer (Control swap) con BriefingStage / ChoicesStage / TransitionStage child
- BriefingStage: NarrativeLines (VBoxContainer 3 Label) + TimerBar (ProgressBar)
- ChoicesStage: CountdownLabel + CardGrid (GridContainer 3 col, 1 row) + AutoSelectHint
- TransitionStage: CenterContainer + TransitionLine (Label centered)

### `Game-Godot-v2/scripts/phone/phone_composer_view.gd` (modify)

Add MODE_ONBOARDING state:

```gdscript
const MODE_ONBOARDING := "onboarding"

# In _swap_mode_for_phase():
"onboarding":
    var onb_view := PhoneOnboardingView.new()
    add_child(onb_view)
    onb_view.bind_payload(_pending_onboarding_payload, _local_role == "host")
    onb_view.onboarding_complete.connect(_on_onboarding_complete)
    onb_view.start()
    _current_view = onb_view

# Subscribe `onboarding_payload` event from WS
"onboarding_payload":
    _pending_onboarding_payload = payload.get("onboarding", {})
```

```gdscript
func _on_onboarding_complete(option_key: String, auto_selected: bool) -> void:
    _ws.send_intent({
        "action": "onboarding_choice",
        "option_key": option_key,
        "auto_selected": auto_selected,
    })
```

Plus host start button currently triggers `phase: 'character_creation'` directly — refactor to send `phase: 'onboarding'` instead. CHARACTER_CREATION will auto-advance via backend post submit.

### Display `onboarding_chosen` broadcast read-only

Non-host phone deve vedere quale scelta è stata fatta. Add WS subscriber to `onboarding_chosen` event:

```gdscript
"onboarding_chosen":
    var label := payload.get("label", "")
    var trait_id := payload.get("trait_id", "")
    _show_toast("Scelto: %s (trait: %s)" % [label, trait_id])
```

## Test plan

### Manual smoke (post Godot build + deploy-quick.sh)

1. Phone host (Android) + phone player (iOS) join lobby
2. Host tap "Inizia mondo" → phone composer triggers `phase: 'onboarding'`
3. Entrambi phone vedono briefing 3 narrative lines + timer 10s
4. Briefing termina → choices 3 card visibili
5. Solo host può tap card. Player vede card + countdown 30s read-only
6. Host tap "Come duro e inamovibile" (option_b)
7. Entrambi phone vedono transition "Così sarà." 10s
8. Auto-advance phase character_creation visibile entrambi phone
9. Player non-host: toast "Scelto: Come duro e inamovibile (trait: pelle_elastomera)" su `onboarding_chosen` event

### Auto-select timeout test

1. Host non tap card → countdown elapses 30s
2. Backend riceve `auto_selected: true` con `option_key: option_a` (default)
3. Verify `onboarding_chosen.auto_selected == true`

### Test harness automated (preferito vs manual)

Aggiungi scenario harness `phone-flow-harness.js` da WS perspective (Linux CI compatible). Backend già verde via scenario 9. Frontend Godot test = harness Godot scene tests (separate repo Game-Godot-v2/tests/).

## Effort

| Sub-task                                    | Effort   |
| ------------------------------------------- | -------- |
| `phone_onboarding_view.gd` script + signals | 2h       |
| `.tscn` scene 3-stage                       | 1.5h     |
| Composer integration MODE_ONBOARDING        | 1h       |
| WS payload binding + auto-advance           | 1h       |
| Read-only display non-host                  | 30min    |
| Manual smoke + screenshot evidence          | 1h       |
| **Total**                                   | **5-7h** |

## Open questions

1. Visual style cards: usa Disco-Elysium-inspired layout (gradient + Georgia serif italic body + trait badge)? Default = consistent con `Game-Godot-v2` Sprint W7 dropdown style → minimalist solid color.
2. Audio briefing 10s: TTS Godot AudioStreamPlayer su narrative lines? Skip MVP → solo testo visibile + ProgressBar timer.
3. Replay onboarding skip button: NO MVP (canonical 51 = no respec).

## Definition of Done (Gate 5 surface check)

- ✅ Player phone (host) tap "Inizia mondo" → vede briefing + 3 card + timer in <5s
- ✅ Player phone (non-host) vede briefing + read-only countdown
- ✅ Auto-advance character_creation phase post submit visibile a entrambi
- ✅ `onboarding_chosen` broadcast visibile a player non-host (toast/banner)
- ✅ Auto-select timeout funziona (default option_a)
- ✅ Smoke screenshot per evidenza Gate 5 player-visible

## Reversibility

Modulare. Reversibile via:

- Revert Game-Godot-v2 PR Phase B
- Phone composer fallback su MODE_CHARACTER_CREATION direct (Sprint W7 path)
- Backend Phase A `861adcc6` resta (additive, no impact)

## Pickup instructions per Codex/master-dd

1. Read this doc + Phase A backend reference (PR #2071 commit `861adcc6`)
2. Create Game-Godot-v2 branch `feat/sprint-m6-onboarding-view`
3. Add files above (script + scene + composer mod)
4. Test manual smoke (deploy-quick.sh)
5. Open PR Game-Godot-v2 + cross-reference PR #2071 Game/

Master-dd OR Codex agent può raccogliere chip + ship indipendente.
