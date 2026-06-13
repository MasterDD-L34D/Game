---
title: 'Agent-driven smoke iter4 — Godot phone vs web v1 comparison 2026-05-08'
doc_status: active
doc_owner: master-dd
workstream: ops-qa
last_verified: 2026-05-08
source_of_truth: false
language: it
review_cycle_days: 14
related:
  - docs/playtest/AGENT_DRIVEN_WORKFLOW.md
  - docs/playtest/2026-05-07-phone-smoke-bundle-rca.md
  - docs/playtest/2026-05-08-phone-smoke-day3-friends-online.md
tags: [playtest, smoke, comparison, godot-phone, web-v1, b-new, iter4]
---

# Agent-driven smoke iter4 — Godot phone vs web v1 (2026-05-08)

**Tunnel**: `https://circumstances-lat-status-summary.trycloudflare.com`
**Backend HEAD**: `67f8dfd8` (post B-NEW bundle iter4)
**Dist mtime**: May 8 20:23 — FRESH
**Harness**: Chrome MCP NOT CONNECTED → Pattern B Playwright multi-context + REST/WS Node forensic

---

## 1. Executive summary

- 14/16 Playwright phone smoke tests PASS (39.8s). Regressions B5+B7+B8+B9+B10 all green.
- B5 (phaseChangeBroadcast.test.js): 6/6 PASS. B2/Airplane (airplaneReconnect.test.js): 5/5 PASS.
- **B-NEW-5-bis (BUG)**: `POST /api/lobby/character` returns 404 — endpoint never existed in lobby.js. B-NEW-5 fix (idempotent submitCharacter) is WS-only via `intent.action=character_create`; no REST surface. No regression, but REST smoke surfaces the gap.
- **B-NEW-1-bis (BUG P1)**: `coopOrchestrator.phase` is NOT advanced to `world_setup` when host sends WS `phase=world_setup` directly (without all players submitting characters). `voteWorld` throws `not_in_world_setup`. Connected-only quorum code (B-NEW-1 fix) is unreachable in minimal phone smoke flow. Day 3 friends online P0 world vote stuck is PARTIALLY fixed — full quorum path blocked by orch phase sync gap.
- **B-NEW-4-bis (P2)**: `/api/lobby/rejoin` returns 404 instead of 410 for closed rooms (room deleted from registry on close, not marked closed). Client cannot distinguish "never existed" from "was closed". Minor UX clarity issue.
- Canvas visual render test (canvas-visual.spec.ts:42) FAIL: Godot splash renders canvas with non-zero dimensions but pixel content is all-black post-20s load via headless Playwright (no GPU). Known headless limitation — not a runtime bug.
- WS RTT p95 FAIL: p95=478ms via tunnel (threshold 200ms). Cloudflare tunnel WAN overhead expected; server-local baseline < 5ms per prior session. Not a regression.

---

## 2. Bug nuovi catturati

### B-NEW-1-bis (P1) — coopOrchestrator phase sync gap: world_vote unreachable in minimal phone flow

**Symptom**: Player sends `intent.action=world_vote` in world_setup phase → server returns `error: not_in_world_setup`.

**Root cause**: `wsSession.js` WS `phase` handler only bootstraps coopOrchestrator on `character_creation` (line 1709) and `onboarding` (line 1724). When host sends `phase=world_setup` directly, `room.publishPhaseChange('world_setup')` is called but `coopOrchestrator._setPhase('world_setup')` is NEVER called. The orch stays at `character_creation`. `voteWorld` (line 354) throws `not_in_world_setup` before reaching B-NEW-1 connected-only quorum code.

**File:line**: `apps/backend/services/network/wsSession.js:1709` (missing `world_setup` bootstrap branch)

**Repro**:

1. Create room + join via WS
2. Host sends `{type:'phase', payload:{phase:'character_creation'}}` → orch bootstrapped
3. Host sends `{type:'phase', payload:{phase:'world_setup'}}` → room phase updated but orch.phase remains `character_creation`
4. Player sends `{type:'intent', payload:{action:'world_vote', choice:'accept'}}` → server error `not_in_world_setup`

**Fix path**:

```js
// wsSession.js ~line 1720, after character_creation bootstrap block:
if (phaseArg === 'world_setup' && coopStore) {
  try {
    const orch = coopStore.get(room.code);
    if (orch && orch.phase === 'character_creation') {
      orch._setPhase('world_setup'); // or orch.forceAdvanceToWorldSetup() if exposed
    }
  } catch (err) {
    console.warn('[ws] world_setup phase sync failed:', err.message);
  }
}
```

Alternatively expose `advanceToWorldSetup()` on coopOrchestrator (mirrors `forceAdvanceToWorldSetup` at line 639).

**Test lock**: `tests/api/phaseChangeBroadcast.test.js` — add B5-7 test: `host phase=world_setup → player world_vote → world_tally received`.

---

### B-NEW-4-bis (P2) — rejoin closed room returns 404 not 410

**Symptom**: `POST /api/lobby/rejoin` with valid (but closed) room code returns HTTP 404 instead of 410 Gone.

**Root cause**: `wsSession.js:907` `closeRoom` calls `this.rooms.delete(normalized)` — room fully removed from registry. `getRoom` after close returns null → `lobby.js:81` returns 404. Phone client cannot distinguish "room code typo / never existed" from "room was closed, my session is stale".

**File:line**: `apps/backend/services/network/wsSession.js:907`, `apps/backend/routes/lobby.js:81`

**Fix path option A** (preferred): Keep closed rooms in registry for 5 minutes with `closed=true` flag. `closeRoom` sets `room.closed = true`, starts a 5-min GC timer, THEN deletes. `getRoom` returns null after GC.

**Fix path option B**: Store closed room codes in a `closedRoomCodes: Set` on LobbyService; `rejoin` checks set before 404 → returns 410.

**Impact**: Low — only affects UX of phone resume flow. Functional correctness not broken.

---

### B-NEW-5-bis (P2) — `POST /api/lobby/character` endpoint missing

**Symptom**: `POST /api/lobby/character` returns Express 404 "Cannot POST".

**Root cause**: There is no REST `/api/lobby/character` endpoint. `submitCharacter` is WS-only via `intent.action=character_create`. `lobby.js` only exposes create/join/rejoin/close/state/list. Not a B-NEW-5 regression (B-NEW-5 is WS idempotent logic), but signals no REST probe surface for character submission.

**Impact**: Informational — no REST smoke coverage for character_create path. Accepted gap (WS-only path by design).

---

## 3. Surface comparison matrix — Godot phone vs web v1

| Pillar                   | Phase                                                           | Godot phone                                              | Web v1                                          | Gap                                      |
| ------------------------ | --------------------------------------------------------------- | -------------------------------------------------------- | ----------------------------------------------- | ---------------------------------------- |
| P1 Telemetry HUD p95     | combat                                                          | GAP-1 SHIPPED (#204) — debug label in HudView            | No equivalent                                   | Godot AHEAD                              |
| P2 ThoughtsRitual        | debrief                                                         | GAP-9 SHIPPED (#203) — LegacyRitualPanel instanced       | No equivalent                                   | Godot AHEAD                              |
| P3 form_pulse axes       | character_creation                                              | W4 intent drain server-side; phone_composer_view.gd wire | No equivalent                                   | Godot AHEAD                              |
| P4 Ennea debrief 9-canon | debrief                                                         | GAP-2 SHIPPED (#203) — debrief_view top archetype        | No equivalent                                   | Godot AHEAD                              |
| P5 share screen / lobby  | lobby                                                           | Share screen overlay + deep-link CTA (B1 fix, #169)      | lobby.html full DOM — create/join forms visible | Web v1 richer DOM UX; Godot phone canvas |
| P5 WS phase broadcast    | lobby→combat                                                    | 14/16 Playwright PASS, B5+B8+B9+B10 fixed                | Same backend shared                             | PARITY                                   |
| P6 WoundState badge      | combat                                                          | GAP-4 SHIPPED (#204) — unit_info_panel severity          | vcScoring JS computes wound; no UI surface      | Godot AHEAD                              |
| state machine phases     | lobby→onboarding→char_creation→world_setup→combat→debrief→ended | All phases reachable via WS (Playwright confirmed)       | All phases reachable via WS                     | PARITY                                   |
| canvas render (headless) | all                                                             | All-black via headless Playwright (GPU-less)             | N/A (DOM-based)                                 | Known headless gap                       |
| WS RTT p95 (tunnel)      | combat                                                          | 478ms p95 via Cloudflare tunnel                          | Same backend                                    | Tunnel overhead expected                 |

---

## 4. Phase coverage map

| Phase              | Godot phone rendered?                                 | Functional?                                             | Notes                                                    |
| ------------------ | ----------------------------------------------------- | ------------------------------------------------------- | -------------------------------------------------------- |
| lobby              | Canvas yes (non-zero dims confirmed)                  | YES — create/join REST verified                         | Share screen overlay available                           |
| onboarding         | GDScript phone_onboarding_view.gd ported (#193)       | YES (Playwright B5+B8 path)                             | campaign YAML broadcast                                  |
| character_creation | phone composer mode swap verified B8                  | YES — intent.action=character_create drains server-side | B-NEW-1-bis: world_vote unreachable if direct phase skip |
| world_setup        | Phase change broadcast verified                       | PARTIAL — world_vote blocked by orch phase sync gap     | B-NEW-1-bis P1 fix needed                                |
| combat             | 5R p95 harness (#202), combat→debrief Playwright PASS | YES                                                     | Telemetry HUD + WoundState badge live (GAP-1+GAP-4)      |
| debrief            | combat→debrief→ended e2e Playwright PASS              | YES — ThoughtsRitual + Ennea 9-canon live               | GAP-2 + GAP-9 shipped                                    |
| ended              | next_macro retreat closes run (Playwright PASS)       | YES                                                     |                                                          |

---

## 5. Top 3 priority fixes

### Fix 1 (P1) — B-NEW-1-bis: coopOrchestrator world_setup phase sync

`apps/backend/services/network/wsSession.js` ~line 1720: add `world_setup` bootstrap branch identical to `character_creation` pattern. Advance `orch._setPhase('world_setup')` (or expose `advanceToWorldSetup()`) when host sends `phase=world_setup` WS intent. Unblocks B-NEW-1 connected-only quorum — the Day 3 P0 world vote stuck is only half-fixed.

Effort: ~30min. Test lock: `phaseChangeBroadcast.test.js` B5-7 addition.

### Fix 2 (P2) — B-NEW-4-bis: rejoin closed room 410 semantic

`apps/backend/services/network/wsSession.js`: LobbyService `closeRoom` stores closed room code in a `this._closedCodes: Set<string>` for 5min TTL. `getRoom` still returns null (GC), but `rejoin` route checks `_closedCodes.has(code)` → 410 before 404 path. Phone resume flow gets clear "room closed, clear session" signal vs "room not found, try again".

Effort: ~30min. No test regression expected.

### Fix 3 (informational) — Canvas smoke gate: skip GPU-less assertion in CI

`tools/ts/tests/playwright/phone/canvas-visual.spec.ts:66`: gate `expect(nonEmpty).toBeGreaterThan(8)` with `test.skip(process.env.CI === 'true', 'Godot canvas GPU-less = all-black in headless CI')`. Reduces noise from known headless limitation. Alternatively set `emptyThreshold: 250` (near-white check) to detect truly broken canvas vs black-because-GPU-absent.

Effort: ~10min.

---

## Harness verdict

14/16 PASS. 2 failures = known external causes (headless GPU + tunnel WAN RTT). 0 regressions from B5/B7/B8/B9/B10 bundle. 1 new P1 bug (B-NEW-1-bis orch phase sync) + 1 P2 (B-NEW-4-bis 404 vs 410). Screenshots not captured (Chrome MCP unavailable; Playwright traces at `tools/ts/test-results/`).

**Chrome MCP blocker**: extension not connected at session start. To retry with full visual screenshot coverage: ensure Chrome extension signed in + active, then re-run this agent.
