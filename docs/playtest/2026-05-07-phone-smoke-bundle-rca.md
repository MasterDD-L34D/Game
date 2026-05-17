---
title: 'Phone smoke 2026-05-07 — bundle B6+B7+B8 RCA + prevention'
doc_status: active
doc_owner: master-dd
workstream: ops-qa
last_verified: 2026-05-07
source_of_truth: false
language: it
review_cycle_days: 30
related:
  - docs/playtest/2026-05-07-master-dd-validation-10min-checklist.md
  - docs/playtest/2026-05-07-phone-smoke-harness-automated-coverage.md
  - docs/playtest/2026-05-05-phone-smoke-results.md
  - docs/adr/ADR-2026-05-05-cutover-godot-v2-fase-3-formal.md
tags: [playtest, phone, smoke, rca, godot-v2, post-mortem]
---

# Phone smoke 2026-05-07 — bundle RCA B6+B7+B8

Forensic post-mortem della sessione browser-headless smoke retry 2026-05-07. 3 bug runtime emersi durante validation, fix end-to-end shipped + prevention codified.

## Executive summary

| Bug | Surface | Impact | Root cause | Fix shipped | Prevention |
|---|---|---|---|---|---|
| **B6** | Toast `Errore [unknown_type]: character_accepted` su player phone | Player UX broken (toast cover-screen ogni event broadcast non riconosciuto) | dist/web stale May 5 14:39 missing PR #197 (May 6 22:02) char_create handler | `FORCE_REBUILD=1 ./tools/deploy/deploy-quick.sh` + re-mount Game/public/phone/ | Game-Godot-v2 PR #206 invert default — rebuild every run |
| **B7** | Host kicked dalla room post-host-pick (host_id flipped, room closed) | Room lost completamente (entrambi player vedono `room_closed` toast) | dist/web stale May 5 14:39 missing PR #169 (May 5 14:44) host preserve fix | Stesso re-mount come B6 | Stesso prevention come B6 |
| **B8** | Player non-host stuck su STAGE_TRANSITION ("Così sarà.") indefinitely post host pick | Player intero phase character_creation → no progression | Defer guard re-fires da `_on_onboarding_transition_complete` (view stage still "transition" at signal emit) → `_pending_phase_after_onboarding` re-stored loop | [Game-Godot-v2 PR #205](https://github.com/MasterDD-L34D/Game-Godot-v2/pull/205): extract `_should_defer_phase_swap` + `_apply_phase_swap` helpers, transition_complete handler bypassa defer | Unit test `test_phone_composer_view_nonhost_transition.gd` 4/4 lock contract |

**Sessione totale**: 5 PR (4 MERGED Game/ + Godot v2 + 1 DRAFT #2088 ADR cutover Phase A pending master-dd phone hardware retry).

## B6 / B7 — stale dist/web pattern

### Sintomo

Browser smoke session 2026-05-07 round 1, dist/web montato in `apps/backend/public/phone/` aveva timestamp **May 5 14:39**.

PR storia critica:
- PR #197 (May 6 22:02): `feat(sprint-m7): phone composer character_create + lineage_choice events wire` — added `character_accepted` event handler in `coop_ws_peer.gd`
- PR #169 (May 5 14:44): `fix(phone): smoke session 2026-05-05 bug bundle (B1+B3+B4+B5 phone-side)` — host preserve logic + presence broadcast filter

Both PR landed AFTER dist/web build timestamp. Phone HTML5 served = obsolete bundle.

### Repro deterministic

1. Run `./tools/deploy/deploy-quick.sh` con dist/web pre-existing (qualsiasi build pre-PR target)
2. Step 2/5 outputs: `✓ dist/web exists, skipping (FORCE_REBUILD=1 to force)`
3. Phone load → composer codepath = stale build
4. Player phone post host onboarding pick → toast `Errore [unknown_type]: character_accepted`
5. Host phone post 30s grace → kicked from room (B7)

### Forensic evidence

API state lobby room **LGKN** (smoke 2026-05-07 master-dd round 1):
```json
{"code":"LGKN","host_id":"p_1f382e8c8b8c","closed":true,
  "players":[
    {"id":"p_f1a9b69fe9e9","name":"eddy","role":"player","connected":false},
    {"id":"p_1f382e8c8b8c","name":"Chiara","role":"host","connected":false}
  ]}
```

- `closed: true` — B7 room lost
- `host_id: p_1f382e8c8b8c` (Chiara) — host TRANSFERRED dal eddy (era host original) → Chiara
- `eddy.role: player` — flipped da host

vs API state lobby room **TPJT** (post-FORCE_REBUILD, same session round 2):
```json
{"code":"TPJT","host_id":"p_1c00ba4b7cfa","closed":false,"state_version":2,
  "players":[
    {"id":"p_1c00ba4b7cfa","name":"Host_Eddy","role":"host","connected":true},
    {"id":"p_07d4e1377914","name":"Player_Chiara","role":"player","connected":true}
  ]}
```

- `closed: false` — room intact
- `host_id` preserved Eddy
- `state_version: 2` — phase transition fired clean (no broadcast bug toast)

### Fix shipped (immediate)

Cross-stack:
1. `FORCE_REBUILD=1 ./tools/web/build_web.sh --mode=phone` (regenerate dist/web)
2. `cp -R dist/web/. /c/Users/VGit/Desktop/Game/apps/backend/public/phone/` (re-mount)

No scripts/ changes needed — both PR #197 + #169 already in main, just not in dist binary.

### Prevention

Game-Godot-v2 PR #206: invert default in `tools/deploy/deploy-quick.sh`:

**Before**:
```bash
if [[ ! -d dist/web ]] || [[ "${FORCE_REBUILD:-0}" == "1" ]]; then
  ./tools/web/build_web.sh --mode=phone
else
  echo "  ✓ dist/web exists, skipping"
fi
```

**After**:
```bash
if [[ "${SKIP_REBUILD:-0}" == "1" ]] && [[ -d dist/web ]]; then
  echo "  ✓ SKIP_REBUILD=1 — using cached build"
  echo "  ⚠ WARNING: cached build may not include latest scripts/ changes"
else
  ./tools/web/build_web.sh --mode=phone
fi
```

Trade-off: ~30-60s extra per deploy (full Godot HTML5 export). Acceptable for smoke validation (deploy-quick.sh = manual master-dd hands-on workflow, non hot-iteration loop). Opt-out via `SKIP_REBUILD=1` per fast iteration when scripts/ unchanged.

## B8 — defer guard re-fire loop

### Sintomo

Player Tab 2 (Chia, role=player) post host onboarding pick:
1. Receives `onboarding_chosen` broadcast → enters STAGE_TRANSITION ("Così sarà." display) ✅
2. Receives `phase_change("character_creation")` versioned event → composer DEFERS swap (view stage == transition guard fires)
3. After 10s STAGE_TRANSITION elapsed → view emits `transition_complete` signal ✅
4. Composer `_on_onboarding_transition_complete` callback fires
5. **Bug**: callback chiama `_swap_mode_for_phase(target)` → defer guard RE-FIRES → `_pending_phase_after_onboarding` re-stored → return early → swap never executes
6. Loop indefinito — player stuck su "Così sarà." finché tab close

### Root cause analysis

`scripts/phone/phone_composer_view.gd` pre-fix (linea 309-340):
```gdscript
func _swap_mode_for_phase(phase: String) -> void:
    if (
        _current_mode == MODE_ONBOARDING
        and _current_view is PhoneOnboardingView
        and (_current_view as PhoneOnboardingView).get_current_stage() == "transition"
        and phase != "onboarding"
    ):
        _pending_phase_after_onboarding = phase
        return
    match phase:
        "character_creation": _swap_mode(MODE_CHARACTER_CREATION)
        # ...

func _on_onboarding_transition_complete() -> void:
    if _pending_phase_after_onboarding.is_empty():
        return
    var target: String = _pending_phase_after_onboarding
    _pending_phase_after_onboarding = ""
    _swap_mode_for_phase(target)  # ← re-fires defer guard
```

Issue: `transition_complete` signal emit non resetta view stage. View `_current_stage` rimane STAGE_TRANSITION dopo emit (line 311-315 in `phone_onboarding_view.gd`):
```gdscript
STAGE_TRANSITION:
    _transition_elapsed += delta
    if _transition_elapsed >= _transition_duration_s:
        _transition_elapsed = -1.0  # one-shot guard
        emit_signal("transition_complete")
    # ↑ stage stays STAGE_TRANSITION post emit
```

Quindi quando composer chiama `_swap_mode_for_phase` da callback, defer guard `get_current_stage() == "transition"` valuta TRUE → defer fires AGAIN → swap mai eseguito.

### Why host non affetto

Host phone receives `onboarding_choice_accepted` direct ack (server emits ad-hoc al sender) PRIMA di transitionare attraverso STAGE_TRANSITION. Host in narrow timing window può anche colpire stesso bug ma typically reaches char_creation via direct path. Player non-host = unico path attraverso transition stage → bug deterministic.

### Fix shipped — PR #205

Extract defer logic + match in 2 helper:

```gdscript
func _swap_mode_for_phase(phase: String) -> void:
    if _should_defer_phase_swap(phase):
        _pending_phase_after_onboarding = phase
        return
    _apply_phase_swap(phase)


func _should_defer_phase_swap(phase: String) -> bool:
    return (
        _current_mode == MODE_ONBOARDING
        and _current_view is PhoneOnboardingView
        and (_current_view as PhoneOnboardingView).get_current_stage() == "transition"
        and phase != "onboarding"
    )


func _apply_phase_swap(phase: String) -> void:
    match phase:
        "character_creation": _swap_mode(MODE_CHARACTER_CREATION)
        # ...


func _on_onboarding_transition_complete() -> void:
    if _pending_phase_after_onboarding.is_empty():
        return
    var target: String = _pending_phase_after_onboarding
    _pending_phase_after_onboarding = ""
    _apply_phase_swap(target)  # ← bypass defer
```

Public contract preserved: external callers (`_on_state`, `_on_event_received`) still call `_swap_mode_for_phase` (defer-aware).

### Test coverage

`tests/unit/test_phone_composer_view_nonhost_transition.gd` (PR #205):

| Test | Verifica |
|---|---|
| `test_b8_nonhost_chosen_enters_transition_stage` | onboarding_chosen → STAGE_TRANSITION |
| `test_b8_nonhost_phase_change_during_transition_is_deferred` | phase_change defers + stores pending |
| `test_b8_nonhost_transition_complete_drains_pending_phase` | transition_complete drains → MODE_CHARACTER_CREATION (failed pre-fix, locked post-fix) |
| `test_b8_nonhost_phase_change_before_chosen_swaps_immediately` | edge: phase_change before chosen swaps immediato |

Pre-fix: 3/4 pass + 1 fail (test_3 confirmed bug). Post-fix: 4/4 pass + 77/77 regression composer + onboarding suite zero break.

### Browser runtime verification

End-to-end via Cloudflare Quick Tunnel + browser headless 2-tab Chrome MCP:

1. Tab 1 host crea stanza ZDCT
2. Tab 2 player join via `?room=ZDCT`
3. Host tap "Inizia mondo" → onboarding phase entrambi tab
4. Host pick "Come duro e inamovibile" → onboarding_chosen + phase_change broadcast
5. Tab 1 host: advance immediato a "Crea il tuo personaggio" form ✅
6. Tab 2 player: enter STAGE_TRANSITION display "Così sarà." ✅
7. Wait ~30s con tab focused (RAF throttle compensa) → tab 2 advance "Crea il tuo personaggio" form ✅

**B8 fix runtime VERIFIED end-to-end**.

## Lessons codified (cross-session)

### Pattern: tunnel-as-service stale-dist anti-pattern

`deploy-quick.sh` originale = "skip if exists" optimization → fa risparmiare ~30-60s build, ma su sessioni multi-day diventa insidious. Nuovi PR mergiati su main MAY arrive in scripts/ ma NOT in dist/. Phone deployment serve binary stale silently.

**Codified rule**: per Godot HTML5 export pipelines, `build` step deve essere idempotent + default-on. Cache via `SKIP_*=1` opt-in per fast iteration.

### Pattern: signal-emit ≠ state reset

`emit_signal("transition_complete")` non muta lo stato view. Caller defer logic deve assumere "stage may still be transition" anche post emit. Helper extract pattern (`_should_defer_*` + `_apply_*`) preserva public contract while unlocking internal bypass.

### Pattern: browser-headless smoke = sufficient functional gate

User insight 2026-05-07: _"i phone non servono per niente, puoi testare maggior parte tramite browser"_.

Cross-device WAN RTT + mobile touch p95 + airplane hardware = solo physical-only residue. Tutto altro (event flow, state machine, defer guards, broadcast handlers) = browser headless 2-tab via Cloudflare tunnel sufficient. Reduces master-dd hands-on burden ~80%.

**Caveat browser**:
- Chrome RAF throttle background tab ~1Hz → 10s game timer richiede 20-30s wall-clock. Mobile real foreground tab = no throttle.
- Godot HTTPClient transient `network_error 13` su multi-tab Tab 2 join (intermittent, retry funziona)
- `computer.type` su Godot canvas drop char → `computer.key` per single chars è più reliable

## Cross-ref

- [PR #205 Game-Godot-v2 — B8 fix](https://github.com/MasterDD-L34D/Game-Godot-v2/pull/205) (MERGED `d48efe1`)
- [PR #206 Game-Godot-v2 — deploy-quick rebuild default invert](https://github.com/MasterDD-L34D/Game-Godot-v2/pull/206) (this RCA prevention)
- [PR #2087 Game/ — phone smoke harness 17 test](https://github.com/MasterDD-L34D/Game/pull/2087) (MERGED, regression coverage B5+B2+5R+airplane)
- [PR #2088 Game/ — ADR-2026-05-05 cutover Phase A](https://github.com/MasterDD-L34D/Game/pull/2088) (DRAFT, pending master-dd phone hardware retry)
- [docs/playtest/2026-05-07-master-dd-validation-10min-checklist.md](docs/playtest/2026-05-07-master-dd-validation-10min-checklist.md) — physical retry checklist 3-item residue

## Status post-RCA

| Item | Status |
|---|:-:|
| B6 fix | ✅ Shipped (immediate FORCE_REBUILD + prevention via PR #206) |
| B7 fix | ✅ Same as B6 |
| B8 fix | ✅ PR #205 merged + unit test 4/4 + browser runtime verified |
| Prevention deploy-quick | ✅ PR #206 invert default rebuild |
| ADR-2026-05-05 swap | ⏸ Pending master-dd phone hardware retry (Item 2 mobile p95 + Item 3 airplane physical) |
