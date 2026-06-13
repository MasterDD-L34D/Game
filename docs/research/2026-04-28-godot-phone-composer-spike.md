---
title: 2026-04-28 Godot phone composer cross-stack spike — DioField command-latency p95 baseline
doc_status: draft
doc_owner: master-dd
workstream: cross-cutting
last_verified: 2026-04-28
language: it
review_cycle_days: 14
related:
  - docs/adr/ADR-2026-04-28-deep-research-actions.md
  - docs/planning/2026-04-28-master-execution-plan.md
  - docs/research/2026-04-28-deep-research-synthesis.md
---

# Godot phone composer cross-stack spike — DioField command-latency p95 baseline

> **Status**: PLACEHOLDER pending Sprint M.7 execution. Doc seed creato 2026-04-28 per ADR-2026-04-28-deep-research-actions §Action 4 cross-link valido. Riempire post-spike con dati reali.

## 1. Scope

POC minimal Godot HTML5 export con 1 button "ATTACK" pressed → WS message → Express WS receive → state update → echo back → Godot HTML5 client render.

Stack target:

- Client: Godot 4.x HTML5 export (browser PWA)
- Server: Express + `ws@8.18.3` (`apps/backend/services/lobby/`)
- Transport: WebSocket native (NO Godot MultiplayerAPI)

## 2. Metrica DioField

**Primary**: `command_latency_p95` round-trip button press → state-echo render.

**Chain misurata** (timestamp marker per step):

1. `t0` — button press (Godot input event)
2. `t1` — WS frame send (client)
3. `t2` — Express WS receive (server log)
4. `t3` — state update committed (server)
5. `t4` — echo frame send (server)
6. `t5` — Godot client render frame after echo (visual ack)

**p95 calcolato**: `t5 - t0` su N=50 sample.

**Source canonical**: F1 §"DioField" + F2 line 97 in [`docs/research/2026-04-28-deep-research-synthesis.md`](2026-04-28-deep-research-synthesis.md). Research esplicita "command latency" come **design crux** per real-time-adjacent inputs SRPG (NOT generic touch latency).

## 3. Baseline web v1 (measure first)

**Razionale**: zero-extra-effort comparison pre-Godot. Riusa current backend WS + `apps/play` web v1.

**Setup**:

- Backend: `npm run start:api` (port 3334)
- Client: `apps/play` canvas click → `fetch /api/session/action` → state-fetch
- Tunnel: ngrok pubblico per real device test

**Sample**: N=50 click "ATTACK" su iOS Safari + Android Chrome.

**Tool**:

- Browser DevTools → Network panel → timing breakdown
- Custom timestamp marker JS: `performance.now()` su click + state-fetch resolved
- Dump CSV → percentile p50/p95/p99

**Output baseline atteso**: numero p95 web v1 attuale (NO benchmark esistente — primo measure).

**Reference comparison**: confronta p95 Godot HTML5 spike vs web v1 baseline. Se Godot p95 > 1.5x baseline → red flag stack overhead.

## 4. Threshold pass / abort

| Condizione                                    | Decisione                                                         |
| --------------------------------------------- | ----------------------------------------------------------------- |
| p95 < 100ms iOS Safari + Android Chrome       | **PASS** — Sprint N.3-N.6 commitment OK                           |
| 100ms ≤ p95 ≤ 200ms                           | **CONDITIONAL** — investiga bottleneck pre-commit                 |
| p95 > 200ms                                   | **ABORT** Godot decision pre Sprint N.3-N.6 (-3-4 sett risparmio) |
| UI scale broken su 320px                      | **ABORT** anche se latency OK                                     |
| Virtual keyboard occludes critical chat input | **ABORT** o re-design composer                                    |

## 5. Test environment

- **Backend**: `npm run start:api` su Windows dev machine + ngrok tunnel pubblico
- **Client iOS**: Safari mobile real device (iPhone, iOS 17+)
- **Client Android**: Chrome mobile real device (Android 12+)
- **Godot HTML5**: export deployable via static server (es. `python -m http.server` o GitHub Pages preview)
- **Network**: WiFi + LTE 4G separato (2 sample set)

## 6. Output binary

Go/no-go signal Sprint N.3-N.6 commitment:

- **GO** → Godot phone composer V2 portable Control nodes confirmed → Sprint R port plan valido
- **NO-GO** → revert Godot decision, mantieni web v1 stack canvas, re-evaluate Sprint R scope

Output documentato qui post-spike: tabella p95 misurato + screenshot UI 320px + pass/fail flag per ciascuna condizione §4.

## 7. References

- **DioField source**: F1 §"DioField" + F2 line 97 in [`docs/research/2026-04-28-deep-research-synthesis.md`](2026-04-28-deep-research-synthesis.md)
- **ADR Action 4**: [`docs/adr/ADR-2026-04-28-deep-research-actions.md`](../adr/ADR-2026-04-28-deep-research-actions.md) §Action 4 — Sprint M.7 re-frame DioField command-latency p95
- **Master plan §M.7**: [`docs/planning/2026-04-28-master-execution-plan.md`](../planning/2026-04-28-master-execution-plan.md) §M.7 — Phone composer Godot HTML5 spike
- **Backend WS**: `apps/backend/services/lobby/` (LobbyService + Room)
- **Web v1 client**: `apps/play/`
