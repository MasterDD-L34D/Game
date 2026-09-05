---
title: Co-op Phase Validation — Pre-Playtest Report
workstream: ops-qa
status: draft
created: 2026-04-24
tags: [coop, validation, pre-playtest, state-machine, websocket]
---

# Co-op Phase Validation — Pre-Playtest Report

**Verdict**: 🟡 minor issues — cleared for playtest with documented caveats. No 🔴 blocker.

## Summary

| Area                       | Status |
| -------------------------- | :----: |
| State machine transitions  |   🟢   |
| Vote tally consistency     |   🟢   |
| Host authority gate (REST) |   🟢   |
| Host authority gate (WS)   |   🟢   |
| Heartbeat + reconnect      |   🟢   |
| Host transfer (TKT-05)     |   🟡   |
| 4-letter room code         |   🟡   |
| Test coverage (phase)      |   🟡   |

Score: 5🟢 + 3🟡 + 0🔴.

## Files inspected

Canonical runtime:

- `apps/backend/services/coop/coopOrchestrator.js` (281 LOC, class `CoopOrchestrator`, const `PHASES`)
- `apps/backend/services/coop/coopStore.js` (48 LOC, in-memory Map roomCode → orchestrator)
- `apps/backend/routes/coop.js` (231 LOC, 7 endpoint REST `/api/coop/*`)
- `apps/backend/services/network/wsSession.js` (816 LOC, `LobbyService`, `Room`, `createWsServer`)
- `apps/backend/routes/lobby.js` (100 LOC, 5 endpoint REST `/api/lobby/*`)
- `apps/backend/app.js` L720-734 (wire: `coopStore = createCoopStore({ lobby }) → app.use('/api', createCoopRouter({ lobby, coopStore }))`)
- `apps/backend/routes/session.js` L741 (char→unit bridge via `characterToUnit` import)

Tests:

- `tests/api/coopOrchestrator.test.js` (10 test)
- `tests/api/coopRoutes.test.js` (6 test)
- `tests/api/coopWorldVote.test.js` (5 test)
- `tests/api/coopDebrief.test.js` (5 test)
- `tests/api/lobbyWebSocket.test.js` (includes reconnect test L229)
- `tests/e2e/lobbyEndToEnd.test.mjs` (includes host-transfer e2e test L465+)

Total coop-specific: **26 test files coverage**.

## Phase transitions (authorized matrix)

| From               | To                 | Method                   | Trigger                         | Guard                                | File:Line                   |
| ------------------ | ------------------ | ------------------------ | ------------------------------- | ------------------------------------ | --------------------------- |
| lobby              | character_creation | `startRun()`             | host REST `/coop/run/start`     | phase ∈ {lobby, ended} + authHost    | coopOrchestrator.js:78-96   |
| ended              | character_creation | `startRun()`             | host REST (loop restart)        | phase ∈ {lobby, ended} + authHost    | coopOrchestrator.js:78-96   |
| character_creation | world_setup        | `submitCharacter()` auto | all expected players submitted  | `expected.size === characters.size`  | coopOrchestrator.js:106-132 |
| world_setup        | combat             | `confirmWorld()`         | host REST `/coop/world/confirm` | phase===world_setup + authHost       | coopOrchestrator.js:154-162 |
| combat             | debrief            | `endCombat()`            | host REST `/coop/combat/end`    | phase===combat + authHost            | coopOrchestrator.js:230-237 |
| debrief            | world_setup        | `advanceScenarioOrEnd()` | all debrief choices in          | all players ready + more scenarios   | coopOrchestrator.js:253-268 |
| debrief            | ended              | `advanceScenarioOrEnd()` | last scenario completed         | currentIndex >= scenarioStack.length | coopOrchestrator.js:256-260 |

**No direct `_setPhase` callers other than the methods above**. Transition logic centralized. 🟢

## Invariant findings

### 🟢 Phase transition authority

- `_setPhase()` (L67-73) validates `PHASES.includes(next)` — rejects unknown. No caller outside the orchestrator class. No route/WS handler bypasses method-level gates.
- `authHost()` (routes/coop.js:20-27) validates `host.token === hostToken` against `room.getPlayer(room.hostId)`. After a host transfer, the old host's token will not pass (role downgraded). Correctly gated.
- `authPlayer()` (routes/coop.js:29-35) delegates to `room.authenticate(playerId, token)`. Token mismatch returns null.

### 🟢 Vote tally consistency (M18)

- `worldVotes` is a `Map<playerId, {scenario_id, accept, ts}>` → player re-voting overwrites (verified by `coopWorldVote.test.js` L64-82 "player may change vote").
- `worldTally()` (L195-212) iterates Map entries; cannot yield duplicates.
- `pending` computed as `max(allPlayerIds.length - (accept+reject), 0)` — safe against negative count.
- Host-arbiter design is **intentional** per L152-153 comment "Voting logic deferred to M17 (host confirm for MVP)". Confirming world without consensus is allowed by design. Document for playtest MVP scope.

### 🟢 Host authority gate (REST + WS)

- `/coop/run/start`, `/coop/world/confirm`, `/coop/combat/end` all gated by `authHost()`.
- `/coop/character/create`, `/coop/world/vote`, `/coop/debrief/choice` gated by `authPlayer()`.
- WS `wsSession.js` L689-697: `state` message rejected if `player.role !== 'host'` (code `not_host`).
- WS L698-714: `intent` rejected if role===host (code `host_cannot_intent`).
- WS L260: `pushIntent()` relays only to `this.hostId` via `sendTo(hostId, ...)`. NOT broadcast to peers. 🟢 matches ADR-2026-04-20.

### 🟢 Heartbeat + reconnect

- WS heartbeat interval 30_000ms (L597-614, `DEFAULT_HEARTBEAT_MS`). `.unref()` applied → won't keep process alive.
- Stale clients (`__alive=false`) terminated.
- Reconnect test in `tests/api/lobbyWebSocket.test.js:229` "WS: reconnect survives one drop — token reusable".
- `attachSocket` (L177-191) supersedes old socket cleanly (close code 4000 "superseded").

### 🟡 F-1 — Host transfer timing vs active combat round

**Severity**: moderate. **File**: `wsSession.js:765-784`.

`socket.on('close')` schedules `transferHostAuto` unconditionally when `playerId === room.hostId`. If a host drops **during `combat` phase** (player intents pending), promotion fires after 30s grace regardless of round state. The new host inherits `coopOrchestrator` state (via `coopStore` lookup by roomCode — shared), but no state-reconcile broadcast is emitted to push current phase + run to the new host. Client must call `GET /api/coop/state` to recover phase.

**Risk for playtest**: new host may see stale UI until they explicitly refresh via `/coop/state`. Not data-lossy; recoverable.

**Recommendation P1**: after `transferHostTo()`, trigger a `broadcastCoopState(room, orch)` from the WS server close handler if coop orchestrator exists for that room. Requires wiring `coopStore` reference into `wsSession.createWsServer`. Deferred acceptable if documented pre-playtest.

### 🟡 F-2 — Orphan characters after player disconnect mid-character_creation

**Severity**: moderate (edge case). **File**: `coopOrchestrator.js:126-130` + `routes/coop.js:37-41`.

`submitCharacter()` auto-transitions `character_creation → world_setup` when:

```
expected.size === this.characters.size
AND every expected player has a character entry
```

`expected` is computed by `routes/coop.js:allPlayerIds(room)` which filters `room.players.values()`. **room.players does NOT remove entries on disconnect** — `detachSocket()` only flips `connected=false`, keeps the player record (verified `wsSession.js:193-199`).

Good news: disconnected player is still in `expected`, so phase will not transition prematurely. Bad news: if the disconnected player never returns, the run is **stuck in character_creation** indefinitely with no host override.

**Risk for playtest**: 4-player lobby → player 3 drops before submitting → host cannot force advance.

**Recommendation P1**: add `/coop/character/force-advance` endpoint (host-only) that calls `orchestrator._setPhase('world_setup')` after timeout or explicit host action. Include reason + broadcast.

Related: same issue for debrief (`submitDebriefChoice` requires `debriefChoices.size >= expected.size`, L246-249). Same mitigation needed.

### 🟡 F-3 — `submitCharacter` accepts any playerId without membership check

**Severity**: low. **File**: `coopOrchestrator.js:106-132`.

Method validates `playerId` is truthy but does NOT verify `playerId ∈ allPlayerIds`. A stale/malicious client with a valid `player_token` (issued earlier) could submit a character after leaving/rejoining. Route-level `authPlayer()` does check token, but the orchestrator doesn't cross-check with the expected-set.

Because Map keys are unique, worst case is a ghost character in `characters` that delays auto-advance (same mechanism as F-2). No data integrity loss.

**Recommendation P2**: defensive check in `submitCharacter`:

```js
if (allPlayerIds.length && !allPlayerIds.includes(playerId)) {
  throw new Error('player_not_in_room');
}
```

### 🟡 F-4 — Room code no test for alphabet purity

**Severity**: low. **File**: `tests/api/*` — no coverage.

`wsSession.js:38` defines `ROOM_CODE_ALPHABET = 'BCDFGHJKLMNPQRSTVWXZ'` (20 consonants, no vowels). `generateRoomCode()` uses `crypto.randomInt(0, 20)`. No test asserts generated codes match `/^[BCDFGHJKLMNPQRSTVWXZ]{4}$/`. No collision-retry ceiling test (MAX_ROOM_CREATE_RETRIES=20 on L40).

**Recommendation P2**: add unit test

```js
for (let i = 0; i < 1000; i++) assert.match(generateRoomCode(), /^[BCDFGHJKLMNPQRSTVWXZ]{4}$/);
```

### 🟢 No infinite collision loop

`createRoom()` (L488-529) loops `MAX_ROOM_CREATE_RETRIES=20` attempts; throws `room_code_exhaustion` if all collide. Bounded.

### 🟢 No vowels possible

Alphabet string literal contains only `BCDFGHJKLMNPQRSTVWXZ`. `Y` excluded intentionally (L38 comment "avoid words"). Pure consonant space 20^4=160k.

## Missing test coverage

Gaps worth closing before production (not gating playtest):

1. **Phase-skip negative tests**: no test asserts that `confirmWorld()` throws when called in `lobby` or `combat` phase (only the happy path in world_setup is exercised).
2. **Multi-player debrief race**: no test with 2+ players where one submits debrief choice, second disconnects, then third submits — check deadlock.
3. **Host transfer + coop orchestrator state sync**: no e2e test that promoted host receives current coop phase via WS broadcast or `/coop/state`.
4. **Room code alphabet regex**: see F-4.
5. **`startRun()` from `combat` phase**: should throw `cannot_start_from_phase:combat`. No test.
6. **Scenario-stack rotation**: `advanceScenarioOrEnd()` resets `worldVotes + debriefChoices` and carries `characters.ready=true`. Covered by single test (L57-75) but only N=2 scenarios. Edge: scenarioStack length > 2 with vote divergence between scenarios.

## Recommendations

**Before playtest (P0)**: none. 🟢 ready.

**Pre-playtest hardening (P1, ~2h)**:

1. Add `/coop/run/force-advance` host-only endpoint for F-2 (character_creation + debrief stuck-state).
2. Wire `coopStore` into `wsSession` close handler to re-broadcast coop state on host transfer (F-1).

**Post-playtest cleanup (P2, ~1-2h)**:

3. Defensive `allPlayerIds` membership check in `submitCharacter` (F-3).
4. Room code alphabet regex test (F-4).
5. Phase-skip negative tests (coverage gap #1).
6. Multi-player disconnect race test (gap #2).

**Documentation**: confirm in playtest playbook (`docs/playtest/2026-04-21-m11-coop-ngrok-playbook.md`) that:

- If a player drops in character_creation and doesn't return, host must close the room (no force-advance yet).
- If host drops mid-combat, new host should refresh via `GET /api/coop/state` after promotion.

## Escalation

No 🔴 findings. Not escalating to `session-debugger`.

If F-1 or F-2 manifests during playtest and blocks a run, capture: (a) room code + phase at drop, (b) server logs for `host_transferred` event, (c) client-side WS trace. File as TKT-M16-07.

## Test baseline

Aggregate (per CLAUDE.md line 420): **411/411 verde** including coop suites. No regressions in this validation pass.

---

Generated by `coop-phase-validator` agent (pre-playtest production run, 2026-04-24).
