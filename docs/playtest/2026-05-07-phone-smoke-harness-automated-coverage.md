---
title: 'Phone smoke retry — automated harness coverage matrix (B5+B2+5R+airplane)'
doc_status: active
doc_owner: master-dd
workstream: ops-qa
last_verified: 2026-05-07
source_of_truth: false
language: it
review_cycle_days: 14
related:
  - docs/playtest/2026-05-05-phone-smoke-results.md
  - docs/playtest/2026-05-05-phone-smoke-step-by-step.md
  - docs/adr/ADR-2026-05-05-cutover-godot-v2-fase-3-formal.md
  - docs/planning/2026-05-04-plan-v3-drift-sync-godot-realtime.md
tags:
  [playtest, phone, smoke, godot-v2, harness, automated, regression, ws, reconnect, p95, cutover]
---

# Phone smoke retry — automated harness coverage (2026-05-07)

Sessione apertura 2026-05-07 ha aggiunto 3 test files autonomi che coprono i 4 bottleneck B5+B2+5R+airplane delle smoke results 2026-05-05. Obiettivo: ridurre `ADR-2026-05-05` C3 effort residuo da ~30 min userland → ~10 min validation puntuale post-harness verde, senza compromettere copertura regression.

## Coverage matrix shipped

| Bottleneck                                          | Test file                                                                                                                         | Suite count | Verde | Catch regression                                                                                      |
| --------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- | :---------: | :---: | ----------------------------------------------------------------------------------------------------- |
| **B5 phase_change broadcast**                       | [`tests/api/phaseChangeBroadcast.test.js`](../../tests/api/phaseChangeBroadcast.test.js)                                          |      6      |  ✅   | host `{type:'phase'}` → publishPhaseChange versionato → all peers receive (B5 fix FU4)                |
| **B2 host-transfer grace 90s + airplane reconnect** | [`tests/api/airplaneReconnect.test.js`](../../tests/api/airplaneReconnect.test.js)                                                |      5      |  ✅   | DEFAULT_HOST_TRANSFER_GRACE_MS=90s + reconnect mid-grace cancels timer + grace expiry promotes oldest |
| **Combat 5R p95 latency**                           | [`Game-Godot-v2/tests/integration/test_combat_5round_p95.gd`](../../../Game-Godot-v2/tests/integration/test_combat_5round_p95.gd) |      6      |  ✅   | TelemetryCollector p95 PASS/CONDITIONAL/ABORT verdict + HUD payload contract                          |

**Totale**: 17 test, 21 GUT asserts su Godot side, run-time aggregate <2s. Zero regression suite adjacent (lobbyWebSocket.test.js + coopWsRebroadcast.test.js + test_telemetry_collector.gd + test_alleanza_5_encounter.gd).

## Comandi run

```bash
# Game/ side (Node)
cd Game/
node --test tests/api/phaseChangeBroadcast.test.js tests/api/airplaneReconnect.test.js

# Godot v2 side (GUT headless)
cd Game-Godot-v2/
godot --headless -s addons/gut/gut_cmdln.gd \
  -gtest=res://tests/integration/test_combat_5round_p95.gd -gexit
```

## Test detail per file

### Test 1 — `phaseChangeBroadcast.test.js` (B5 contract)

| ID   | Scenario                                                                 | Assertion                                                           |
| ---- | ------------------------------------------------------------------------ | ------------------------------------------------------------------- |
| B5-1 | Player non-host invia `{type:'phase'}`                                   | error `not_host`, no broadcast                                      |
| B5-2 | Host invia phase=`character_creation`                                    | host + 2 peer ricevono `phase_change` versionato con stesso version |
| B5-3 | Host invia phase=`''`                                                    | empty no-op silenzioso, no broadcast                                |
| B5-4 | Host invia phase=`bogus_zzz`                                             | error `phase_invalid`, message match `phase_not_whitelisted`        |
| B5-5 | Host transitions sequenziali `character_creation → world_setup → combat` | stateVersion strict monotonic increase                              |
| B5-6 | Host phase=`character_creation` con coopStore                            | B7 fix: orchestrator auto-bootstrap, phase != lobby post-transition |

### Test 2 — `airplaneReconnect.test.js` (B2 + airplane)

| ID         | Scenario                                               | Assertion                                                          |
| ---------- | ------------------------------------------------------ | ------------------------------------------------------------------ |
| B2-1       | createRoom default                                     | `room.hostTransferGraceMs == 90_000` (post-FU4 30→90s bump)        |
| B2-2       | createRoom override                                    | per-room `hostTransferGraceMs` parameter applicato                 |
| Airplane-1 | Drop host + reconnect mid-grace (50ms in 250ms window) | no `host_transferred` broadcast, host preserved, room not closed   |
| Airplane-2 | Drop host + grace expire + 2 player candidates         | `host_transferred` broadcast a tutti peers, oldest (FIFO) promosso |
| Airplane-3 | Drop solo host (no candidates) + grace expire          | room.closed=true fallback prevents indefinite wait                 |

### Test 3 — `test_combat_5round_p95.gd` (5R p95)

| ID   | Scenario                                                                | Assertion                                                                                           |
| ---- | ----------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| 5R-1 | 20 samples (5R × 4action) @ ~70ms                                       | p95 < 100ms, verdict PASS                                                                           |
| 5R-2 | 20 samples borderline 80-99ms                                           | p95 < 100 ma > 90, verdict PASS edge                                                                |
| 5R-3 | 19 fast + 1-2 outliers 220-250ms                                        | p95 captures outlier solo se count permits (verifica metodologia nearest-rank)                      |
| 5R-4 | Real-clock pipeline `record_action_start/end` con OS.delay_msec(2) × 20 | tutti samples captured, no leaks pending, verdict PASS                                              |
| 5R-5 | Combat aborted round 1 (<5 samples)                                     | p95=-1, verdict INSUFFICIENT_DATA                                                                   |
| 5R-6 | Summary payload contract                                                | contains keys `p95_ms` + `verdict` + `sample_count` + `avg_ms` + `min_ms` + `max_ms` per HUD widget |

## Manual residue master-dd post-harness

Master-dd userland validation puntuale (~10 min, non più ~30 min):

| Item                                                            | Why manual                                                                          | Quick check                                                    |
| --------------------------------------------------------------- | ----------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| Cross-device real RTT (Android Chrome host + iOS Safari player) | Cloudflare Quick Tunnel geographic latency reale, RTT >50ms WAN non simulabile Node | 1 round combat real → console latency log spot-check           |
| Mobile tab background WS pause behavior                         | Browser-specific Android/iOS battery/background policy                              | Tap home button → wait 30s → riapri → verify session preserved |
| Touch input UX latency feel                                     | Subjective perception non-deterministic                                             | "Sembra reattivo?" 5/5 actions feedback                        |

Tutti gli altri scenari B5+B2+5R+airplane catch regression automated → master-dd no più need debug session intricata.

## Impact ADR-2026-05-05 cutover Fase 3

### C3 status delta

**Pre-harness (2026-05-05)**:

- C3 = 🟡 CONDITIONAL
- Effort residuo C3 = ~30 min userland (B5 retest + 5R p95 + airplane reconnect master-dd hands-on)

**Post-harness (2026-05-07)**:

- C3 = 🟡 CONDITIONAL (unchanged status pending master-dd validation)
- Effort residuo C3 = **~10 min userland** validation puntuale (cross-device RTT + mobile tab background + touch feel)
- Regression catch: **automated** B5+B2+5R+airplane via 17 test su 2 repo

### ADR ACCEPTED template patch (ready-to-apply)

Quando master-dd dichiara phase A ACCEPTED post-validation, applicare al ADR-2026-05-05:

```diff
@@ Header @@
- doc_status: draft
+ doc_status: active

@@ Stato @@
- - **Stato**: **PROPOSED — pending master-dd phone smoke retry**
+ - **Stato**: **ACCEPTED Phase A — 2026-05-XX**

@@ Pre-conditions §2 row C3 @@
- | C3  | Phone composer real-device smoke 2-device |    ❌ pending    |   🟡 CONDITIONAL    | iter1 4/5 bug fix runtime-verified, B5 retest pending          |
+ | C3  | Phone composer real-device smoke 2-device |    ❌ pending    |   🟢 PASS           | harness automated B5+B2+5R+airplane (17 test) + master-dd validation 10min |

@@ §3 trigger conditions §3 @@
- 3. 🟡 **C3 phone smoke retry results** — pending master-dd userland (~30 min):
+ 3. 🟢 **C3 phone smoke retry results** — harness automated 17 test PASS (PR #XXXX) + master-dd validation 10min OK 2026-05-XX
```

## Anti-pattern preservato

**No manual test when automatable** (CLAUDE.md feedback memory). User feedback 2026-05-06: _"inutile testare a mano se puoi tu o agenti"_. Harness questa sessione applica direttiva: 4 bug bottleneck completamente automatable + master-dd ridotto a 10 min validation puntuale per item che richiedono real-device infrastructure (RTT WAN + mobile tab pause + touch feel).

**Engine LIVE Surface DEAD prevention**: harness validates anche B5-6 coopStore auto-bootstrap (B7 fix surface) e 5R-6 summary payload HUD contract (M.7 surface debt — HUD widget pending). Wire surface debt esplicito nei test asserts.

## Trigger phrase canonical post-harness

> _"phone smoke harness verde 17/17, eseguo validation 10min userland → ACCEPTED Phase A"_

OPPURE

> _"phone smoke harness verde, ma cross-device RTT > 200ms → CONDITIONAL accept Phase A con monitoring 7gg"_
