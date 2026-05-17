---
title: "Co-op Phase Validation Deep Analysis (2026-04-26)"
doc_status: active
doc_owner: claude-code
workstream: cross-cutting
last_verified: '2026-04-26'
source_of_truth: false
language: en
review_cycle_days: 30
tags: [coop, state-machine, ws, audit, M11, M16-M20]
date: 2026-04-26
---

# Co-op Phase Validation Deep Analysis

> Output di `coop-phase-validator` agent. Spawn da [`docs/reports/2026-04-26-design-corpus-catalog.md`](2026-04-26-design-corpus-catalog.md).

## Summary

| Area | Status | Findings |
|---|---|---|
| State machine transitions | OK | 8 transitions verified, all gated. F-2 resolved (force-advance live). |
| Vote tally consistency | OK | Map key uniqueness proven. Host-arbiter by design. 1 P2 test gap. |
| Host authority gate REST | OK | 4 host + 3 player endpoints correctly gated. |
| Host authority gate WS | OK | state/phase/round_clear host-gated. intent player-gated. relay host-only. |
| Heartbeat + reconnect | MODERATE | Reconnect works. Mid-coop phase snapshot NOT pushed on regular-player reconnect. |
| Host transfer | OK | FIFO grace 30s. rebroadcastCoopState wired in close handler. |
| Room code | OK | 20 consonants, 4 chars, retry 20x (ADR text says 10 — P3 doc drift). |
| WS protocol ADR compliance | OK | All 12 original msg types + 5 M16-M20 extensions. |
| Test coverage | MODERATE | Phase-skip negative tests absent. Regular-player reconnect mid-coop not tested. |
| Frontmatter governance | PASS | All 8 docs valid. |

## State machine — PHASES

`['lobby', 'character_creation', 'world_setup', 'combat', 'debrief', 'ended']` (`coopOrchestrator.js:7`).

`_setPhase()` gate (L67-73): rejects unknown, no-ops same-phase, emits `phase_change`. No external caller — verified.

### Authorized transitions

| From | To | Trigger | Auth | Guard |
|---|---|---|---|---|
| lobby/ended | character_creation | `startRun()` | host | L79-80 |
| character_creation | world_setup | `submitCharacter()` last | auto | `expected.size > 0 && expected === characters && every pid` (L130-133) |
| world_setup | combat | `confirmWorld()` | host | L159 |
| combat | debrief | `endCombat()` | host | L235 |
| debrief | world_setup | `submitDebriefChoice()` last | auto | L250-252 |
| debrief | ended | same | auto | `currentIndex >= scenarioStack.length` (L285-286) |
| character_creation/debrief | next | `forceAdvance()` | host | whitelisted (L270-273) |

## Findings

### 🔴 Critical
**None**.

### 🟠 P1 — Regular-player reconnect mid-coop = no snapshot push

`wsSession.js:177-191` reconnect path: closes previous socket code 4000, re-emits `hello` con `state_version`. **MA** CoopOrchestrator snapshot (phase/characters/votes/debriefChoices) NON inviato. Player riconnette mid-`world_setup` → riceve lobby state stale, must call `GET /api/coop/state` manually.

F-1 (host transfer) era già fixato via `rebroadcastCoopState()`. Stessa logica serve per regular-player reconnect.

**Fix**: in `attachSocket()` quando `previousSocket.close(4000)` rilevato → `if (orch) rebroadcastCoopState(room, orch)`. Effort ~1h + 1 integration test.

### 🟡 P2 (5 issue)

1. `characters[].ready` carry-over `coopOrchestrator.js:290-291` undocumented — blocca re-pick se M21+ wants per-scenario char select.
2. Phase-skip negative tests assenti: nessun test asserisce `endCombat()` throws in lobby phase, etc.
3. Concurrent `endCombat` double-POST untested — server throws `not_in_combat` (safe) ma untested.
4. `confirmWorld()` con 0 vote → MVP design (host arbiter) ma untested.
5. Room.phase vs CoopOrchestrator.phase desync potential (separate state machines).

### 🔵 P3 docs
ADR-2026-04-20 text "collision retry 10x" vs code `MAX_ROOM_CREATE_RETRIES=20`. Align una direzione.

## Bug pattern audit M11 Phase B+C

| ID | Pattern | Status |
|---|---|---|
| B-1 | endgame detection client-side host-only | LOW (host vede stesso render cycle) |
| B-2 | `coopCombatEnd` double-fire | safe (server idempotent throw) |
| B-3 | host confirm pre-vote | by design MVP |
| B-4 | `character_ready_list` 4-broadcast 4p | acceptable, debounce per 8p |
| B-5 | phase coordinator switch on WS drop | mitigated GET /coop/state ma no auto-call (vedi P1) |
| B-6 | `allPlayerIds` post host-transfer | correct (old-host-as-player counted) |

## Missing test coverage

| Gap | Priority | Assertion |
|---|---|---|
| Phase-skip parametric (all methods wrong phase → error) | P1 | `co.endCombat() in lobby → throws not_in_combat` |
| Regular-player reconnect mid-coop integration | P1 | spinUp + close + reopen WS + assert snapshot |
| Concurrent `endCombat` double-POST | P2 | `Promise.all([POST, POST])` — secondo gets 400 |
| `confirmWorld()` con 0 vote | P2 | 201 + phase=combat + world_confirmed emit |
| Room code alphabet regex | P2 | 1000-iter loop `/^[BCDFGHJKLMNPQRSTVWXZ]{4}$/` |

## Files key

- `apps/backend/services/coop/coopOrchestrator.js` — phase machine canonical (311 LOC)
- `apps/backend/routes/coop.js` — REST + authHost/authPlayer (252 LOC)
- `apps/backend/services/network/wsSession.js` — WS server, attachSocket (L177), rebroadcastCoopState (L586), close handler (L814-857)
- `apps/play/src/network.js` — client reconnect backoff + stateVersion
- `tests/api/coopWsRebroadcast.test.js` — F-1 host-transfer rebroadcast integration test (2026-04-25)
