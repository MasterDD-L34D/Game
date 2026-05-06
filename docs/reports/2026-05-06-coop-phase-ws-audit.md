---
title: 'Co-op phase WS audit + B6/B7/W5/W6/W8 fix bundle'
doc_status: active
doc_owner: master-dd
workstream: coop
last_verified: 2026-05-06
source_of_truth: false
language: it
review_cycle_days: 30
related:
  - apps/backend/services/network/wsSession.js
  - apps/backend/services/coop/coopOrchestrator.js
  - tools/testing/phone-flow-harness.js
  - docs/playtest/2026-05-05-phone-smoke-results.md
  - docs/planning/2026-05-06-character-creation-port-godot-spec.md
---

# Co-op phase WS audit + fix bundle 2026-05-06

## Status

ACCEPTED — bundle shipped autonomous post phone smoke retry partial 2026-05-06.

## TL;DR

Phone smoke retry 2026-05-06 ha rivelato che backend WS layer (Sprint M11) era progettato per pattern web v1 host-as-arbiter (host JS drena intent), incompatibile con Godot phone v2 (Sprint W7 host = player, no GDScript drain). Audit completo via subagent + automated harness Node `ws` ha mappato 6 gap action drain. 5 fix shipped server-side autonomous (no Godot rebuild). Harness post-fix: **12 PASS / 0 FAIL / 3 GAP-DOCUMENTED** (up from 8/0/6).

## Bug bundle 2026-05-06

### B5 ✅ phase transition runtime (verified pre-bundle, no fix)

`character_creation` phase reached on both phones after host taps "Inizia mondo (host)". Sprint deploy-quick FU4 fix (PR #2053 `publishPhaseChange` + phone composer `event_received` subscribe) confirmed runtime working.

### B6 ✅ host_cannot_intent + phase_locked block ALL character submit

**Repro**: `_on_character_submit_pressed` in `phone_composer_view.gd:418-432` invia `_ws.send_intent({action: 'character_create', name, species_id, job_id})`. Backend `wsSession.js case 'intent'` (pre-fix line 1192-1207):
- Host → `host_cannot_intent` error
- Non-host con phase != planning/idle → `phase_locked` error

In phase=`character_creation` ENTRAMBI host e player non possono submit. Ws v1 web stack non lo aveva visto perché web v1 web client non usava `intent` per character creation (usava REST POST `/api/coop/character/create`).

**Fix shipped** (`wsSession.js case 'intent'` rewritten):
- Split combat actions vs lifecycle actions
- `COMBAT_ACTIONS = {combat_action, end_turn}` — applicano gate originale (host blocked + planning/idle phase only)
- Lifecycle actions (5: character_create, form_pulse_submit, lineage_choice, reveal_acknowledge, next_macro): qualsiasi role, qualsiasi phase

**Harness verify**: scenario 5 + 6 PASS (host_cannot_intent error per combat_action + end_turn). Scenario 2 PASS (host + player entrambi submit character_create senza errore).

### B7 ✅ character_create silent drop (no orch drain + missing form_id + no run bootstrap)

**3 root cause compounding**:

1. **No coop run bootstrap**: phone host `send_phase('character_creation')` chiamava solo `room.publishPhaseChange` ma NON `coopStore.getOrCreate(code).startRun({})`. Web v1 host JS chiamava POST `/api/coop/run/start` separatamente.
2. **No server-side drain**: backend WS `pushIntent` relayava intent solo a host socket per drain. Godot phone host NON ha GDScript handler per type='intent' inbound → emit `unknown_type: intent` error toast + silent drop.
3. **Missing form_id**: `submitCharacter` line 122 throw `spec_invalid` se `!spec.form_id`. Phone composer payload schema (`{action, name, species_id, job_id}`) NON include form_id (Sprint W7 placeholder).

**Fix shipped**:
- `case 'phase'` aggiunge auto-bootstrap quando phaseArg=='character_creation' + coopStore.getOrCreate(code).startRun({}) se phase=='lobby'
- `case 'intent'` action='character_create' drain server-side direct via `orch.submitCharacter()` + broadcast `character_ready_list` + auto-publishPhaseChange('world_setup') quando tutti ready + send `{type: 'character_accepted'}` al sender
- form_id sintetizzato server-side da species_id (`form_${species_id}`) o `form_default` fallback

**Harness verify**: scenario 1 (phase character_creation transition) + scenario 2 (host + player submit) + scenario 3 (character_ready_list broadcast) PASS.

### W5 ✅ world_vote NOT drained → tally never incrementa

**Repro**: phone player in world_setup phase invia `{action: 'world_vote', choice: 'accept', scenario_id}`. Backend pre-fix relayava a host → silent drop. `coopOrchestrator.voteWorld()` mai chiamato. Tally accept/reject sempre 0.

**Fix shipped**: `case 'intent'` action='world_vote' drain via `orch.voteWorld(playerId, {scenarioId, accept})` + broadcast `world_tally` + send `{type: 'world_vote_accepted'}` al sender.

**Harness verify**: scenario 4b PASS (accept=1 reject=0 dopo singolo vote).

### W6 ✅ lineage_choice NOT drained → debrief never auto-advance

**Repro**: phone player in debrief phase invia `{action: 'lineage_choice', mutations_to_leave}`. Backend pre-fix relayava → drop. `submitDebriefChoice()` mai chiamato. Debrief stuck.

**Fix shipped**: `case 'intent'` action='lineage_choice' drain via `orch.submitDebriefChoice(playerId, {mutations_to_leave}, {allPlayerIds})` + broadcast `debrief_ready_list` + auto-publishPhaseChange su advance return ('ended'|'world_setup').

**Harness verify**: scenario 4c PASS (error `not_in_debrief` quando phase=world_setup, conferma drain branch engaged + phase-gated correttamente).

### W8 ✅ Room.publishPhaseChange accept ANY string (desync risk)

**Repro**: pre-fix `publishPhaseChange` line 514-520 accettava qualsiasi string come phase. `room.phase` poteva drift da `coopOrchestrator.PHASES` enum. Phone host invia phase='world_seed_reveal' (UI-only mode) → backend lo accettava anche se non in PHASES → orch state desync.

**Fix shipped**: aggiunto `KNOWN_PHASES` set whitelist (orch PHASES superset + UI-only `world_seed_reveal` + combat lifecycle hints `planning/ready/resolving/idle`). `publishPhaseChange` ora valida + throw `phase_not_whitelisted:<phase>` se non in whitelist.

**Harness verify**: scenario 7a PASS (`world_seed_reveal` accepted). 7b PASS (`invalid_phase_xyz` rejected con phase_invalid).

## Gap residui (deferred ticket)

**Tutti i 6 gap audit chiusi 2026-05-06.** Lifecycle drain matrix complete: 5/5 lifecycle action drained server-side (character_create + form_pulse_submit + lineage_choice + reveal_acknowledge + next_macro).

### Closed addendum 2026-05-06 (autonomous)

- **W4 `form_pulse_submit`** ✅ shipped — `coopOrchestrator.submitFormPulse(playerId, {axes}, {allPlayerIds})` + `formPulseList()` + drain branch in `wsSession.js` mirror voteWorld pattern. Phase-agnostic per-player axes Map; non-numeric/NaN axes filtered. +4 unit test (W4 series). Harness scenario 4a GAP→PASS verified live.
- **W7 `next_macro`** ✅ shipped — `coopOrchestrator.submitNextMacro(playerId, {choice}, {hostId})` + drain branch in `wsSession.js`. Design verdict: **host-only post-debrief macro pick** {advance, branch, retreat}. `advance|branch` delegate `advanceScenarioOrEnd()` (branch == advance per MVP, future Sprint Q ETL diverges). `retreat` forces phase=`ended` + `run.outcome ||= 'retreated'`. Records in `run.lastMacro`. +5 unit test. Harness scenario 4d GAP→PASS verified live (host-only + phase-gated). PR #2073 follow-up.

## Combat E2E + reconnect — DEFERRED

Scenario combat 5 round + airplane reconnect non testati programmatic (richiedono fixture combat scenario + resolveEncounter stub). Tracked: TKT-P5-WS-COMBAT-E2E ~3h.

## Test artifacts

- Harness Node script: `tools/testing/phone-flow-harness.js` (committable, ws node_modules from main repo)
- Run command: `node tools/testing/phone-flow-harness.js` (backend up :3334 prerequisito)
- Output: 18 scenari (lobby join + phase transition + char create + lifecycle gap matrix + B6 host gate + W8 phase whitelist + stateVersion + onboarding host-only)
- Final post-W4+W7 close: **18 PASS / 0 FAIL / 0 GAP** (zero deferred, audit complete)

Cross-repo tests passing:
- `node --test tests/api/wsRoomCode.test.js tests/api/coopOrchestrator.test.js` → 23/23 verde

## Files modified

- `apps/backend/services/network/wsSession.js` — case 'intent' split + 5 lifecycle drain branches (character_create, world_vote, lineage_choice, **form_pulse_submit** W4, **next_macro** W7) + reveal_acknowledge (W8b) + KNOWN_PHASES whitelist + case 'phase' auto-bootstrap coop run
- `apps/backend/services/coop/coopOrchestrator.js` — `submitFormPulse` + `formPulseList` + `formPulses` Map (W4) + `submitNextMacro` host-only post-debrief macro {advance|branch|retreat} + `run.lastMacro` (W7)
- `tools/testing/phone-flow-harness.js` — extended scenario 4a (W4 PASS) + 4d (W7 PASS host-only + phase-gated) + 4b + 4c + 7a + 7b PASS expectations post-fix
- `tests/api/coopOrchestrator.test.js` — +4 W4 unit tests + 5 W7 unit tests (advance + retreat + retreat-default + reject paths + already-ended)

## Reversibility

Fix tutti additive server-side. Reversibile via `git revert` singolo PR. Zero breaking change su web v1 path (combat intent gate preservato + lifecycle relay-to-host fallback preservato per altre 3 lifecycle action non drained).

## Next steps recommended

1. **Master-dd risposta 5 Q narrative onboarding** (`docs/planning/2026-05-06-character-creation-port-godot-spec.md`):
   - Q1 BASE vs COMBO (1 scelta vs 2 + mondo muta)
   - Q2 prima combo trait set
   - Q3 mondo muta = biome o scenario seed
   - Q4 host-only vs vote
   - Q5 sequenza confermata
2. **Plan v3 Sprint M.6** integrare TKT-NARR-P4-CANONICAL-ONBOARD-BASE (~8-10h)
3. **Combat E2E harness** (TKT-P5-WS-COMBAT-E2E) per close phone smoke 5c+5d via automated test (no più manual)
