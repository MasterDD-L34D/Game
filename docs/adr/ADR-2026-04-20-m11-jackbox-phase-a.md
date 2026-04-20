---
title: 'ADR-2026-04-20: M11 Phase A — Jackbox room-code WebSocket backend'
doc_status: active
doc_owner: platform-docs
workstream: cross-cutting
last_verified: 2026-04-20
source_of_truth: false
language: it-en
review_cycle_days: 30
related:
  - docs/adr/ADR-2026-04-16-networking-colyseus.md
  - docs/adr/ADR-2026-04-16-networking-co-op.md
  - docs/adr/ADR-2026-04-17-coop-scaling-4to8.md
  - docs/planning/2026-04-20-strategy-m9-m11-evidence-based.md
---

# ADR-2026-04-20: M11 Phase A — Jackbox room-code WebSocket backend

- **Data**: 2026-04-20
- **Stato**: Accepted
- **Owner**: Backend + Network
- **Stakeholder**: Player-facing co-op (4-8 friend demo su ngrok), Campaign engine M10

## Contesto

Pilastro #5 (Co-op vs Sistema) era 🟡 nell'audit 2026-04-20: focus-fire locale shipped ma **zero rete**. Sprint M11 lockato: demo live co-op su TV condivisa + phone privati via room-code, stile Jackbox.

Runtime esistente:

- Combat engine round-based single-host autoritativo (ADR-2026-04-16).
- Campaign engine M10 persiste su Prisma (ADR-2026-04-21).
- Package `ws@8.18.3` già installato.
- User vincolo: **1 gioco online senza master**, niente Python rules engine (vedi `services/rules/DEPRECATED.md`).

Phase A scope = **solo backend**: room registry in-memory + WebSocket server. Phase B (next session) layer frontend lobby/TV view.

## Decisione

Implementare Jackbox-style lobby + WS server **senza nuove dipendenze**, sfruttando `ws` già presente. Colyseus (ADR-2026-04-16) resta **fallback tier-2** se Jackbox pattern insufficiente a 4-8 player.

### Architettura

```
HTTP :3334                    WebSocket :3341
┌─────────────────┐           ┌──────────────────────┐
│ POST /api/lobby │           │ ws://host:3341/ws    │
│   /create       │           │   ?code=ABCD         │
│   /join         │           │   &player_id=...     │
│   /close        │           │   &token=...         │
│ GET  /state     │◄──────────┤                      │
│      /list      │   lobby   │  host-auth state     │
└─────────────────┘  (shared) │  relay intents       │
          │                    │  broadcast presence  │
          ▼                    └──────────────────────┘
   LobbyService (in-memory Map<code, Room>)
```

- **Port 3341** per WS: isolato da HTTP `:3334`, Vite `:5180`, calibration `:3340` (prompt vincolo esplicito).
- **Code generator**: 4 char da alfabeto 20 consonanti `BCDFGHJKLMNPQRSTVWXZ` (no vocali → evita parole reali/obscenity). Spazio = 160k; retry collisione 20×.
- **Host-authoritative**: solo `player_id == room.hostId` può pubblicare `state`. Altri mandano `intent`, relayed al solo host.
- **Auth**: token HEX 16-byte generato al create/join, passato come query string sul WS upgrade. In-memory match.
- **Reconnection**: stesso token riusabile. `attachSocket` chiude socket precedente con code `4000 superseded`, player marcato `connected=false` su drop, `true` su re-attach.

### Protocollo (JSON on wire)

| Type                  | Direzione | Payload                                                 |
| --------------------- | :-------: | ------------------------------------------------------- |
| `hello`               |    S→C    | `{ role, player_id, name, room, state, state_version }` |
| `player_joined`       |    S→C    | `{ player_id, name, role }` broadcast                   |
| `player_connected`    |    S→C    | `{ player_id, name, role }` broadcast                   |
| `player_disconnected` |    S→C    | `{ player_id }` broadcast                               |
| `state`               |    C→S    | payload arbitrary (host only)                           |
| `state`               |    S→C    | `{ version, payload }` broadcast                        |
| `intent`              |    C→S    | payload arbitrary (non-host only)                       |
| `intent`              |    S→C    | `{ id, from, payload, ts }` relay a host                |
| `chat`                |   C↔S    | `{ from, name, text, ts }` broadcast                    |
| `ping`/`pong`         |   C↔S    | `{ t }` keepalive                                       |
| `error`               |    S→C    | `{ code, message? }`                                    |
| `room_closed`         |    S→C    | `{ reason }` broadcast su close host                    |

### Heartbeat

`WebSocketServer` setInterval 30s: ping ogni client; se `pong` non ricevuto entro il ciclo successivo, `terminate()`. Interval `unref()` per non bloccare exit.

## Opzioni valutate

### A. Jackbox pattern (ws nativo) ← SCELTA

- **Pro**: zero nuove deps, 3 OSS clone pubblici (hammre/party-box, axlan/jill_box, InvoxiPlayGames/johnbox), match diretto con "4 amici + TV + phone", effort ~10h Phase A.
- **Contro**: state sync manuale (no diff automatico), reconnect-logic lato client da scrivere Phase B, no matchmaking.
- **Scope-fit**: single-process demo. Scala fino a 8 player/room per ADR-2026-04-17 cap.

### B. Colyseus (ADR-2026-04-16 proposed)

- **Pro**: delta binary sync, matchmaking, reconnect nativo, SDK multi-platform.
- **Contro**: nuova dep, abstraction layer in più per un pattern che Jackbox risolve con 250 LOC, overhead eccessivo per MVP demo.
- **Decisione**: **fallback tier-2** se Jackbox pattern non scala a 8p in playtest live.

### C. Socket.io

- Pro: reconnect polyfill, room broadcast built-in.
- Contro: overhead protocollo HTTP long-poll fallback non necessario, dep extra.
- Rigettata: `ws` soddisfa requisiti con meno codice.

## Conseguenze

### Positive

- **Demo live immediato**: 4 friend + ngrok + phones = test concreto Pilastro 5 già da Phase B.
- **Stack minimo**: `ws@8.18.3` già in `node_modules`, no nuove deps.
- **Separation of concerns**: lobby REST resta idempotente/testabile via supertest; WS server isolato su porta dedicata.
- **Integrazione campaign**: `campaign_id` opzionale nel room payload → link a campaign engine M10 in Phase B senza refactor.

### Negative

- **State sync manuale**: Phase B dovrà implementare diff custom se state grande (round snapshot). Fallback Colyseus se necessario.
- **Single process**: lobby in-memory. Restart backend = tutti i room persi. Prisma persistence deferred a Phase C se necessario.
- **Port extra**: operatori devono aprire `:3341`. Documentato in README deploy (follow-up M11B).

### Rollback

Disable via `LOBBY_WS_ENABLED=false`. REST routes restano operative (degrade grace to no live sync). Revert PR se regressioni CI.

## Scope Phase A (questo PR)

- `apps/backend/services/network/wsSession.js` (~330 LOC): `LobbyService` + `Room` + `createWsServer`.
- `apps/backend/routes/lobby.js` (~90 LOC): 5 REST endpoint.
- Wire in `apps/backend/app.js` + bootstrap WS in `apps/backend/index.js` su `LOBBY_WS_PORT=3341` (override env).
- Tests:
  - `tests/api/lobbyRoutes.test.js` — 9 test REST (create/join/close/state/list/cap/case-insensitive/auth).
  - `tests/api/lobbyWebSocket.test.js` — 6 test WS (4-player sync + host-auth gate + intent relay + reconnect + auth failures).

**Totale nuovi test Phase A**: **15/15** pass. Baseline AI 307/307 + session/playtest 309/309 intatti.

## Fuori scope Phase A (Phase B next session)

- Frontend lobby picker (`apps/play/src/lobby.html`).
- TV dual-view (shared spectator + phone-private).
- Client reconnect logic (`apps/play/src/network.js`).
- Campaign-state live mirroring via WS state channel.
- Prisma persistence adapter (opzionale, Phase C).
- Rate-limit / DoS hardening (Phase D se produzione).

## Riferimenti

- Jackbox architecture writeup — https://www.abtach.ae/blog/how-to-build-a-game-like-jackbox/
- Daikon Games 7-day spike — https://www.patreon.com/posts/free-radish-how-34077166
- OSS clone: hammre/party-box, axlan/jill_box, InvoxiPlayGames/johnbox
- Colyseus (tier-2 fallback): https://github.com/colyseus/colyseus
- `packages/ws` — 8.18.3 già installato
