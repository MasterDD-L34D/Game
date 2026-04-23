---
title: 'ADR 2026-04-26 — M11 Phase D: Prisma lobby persistence (addendum to ADR-2026-04-20)'
workstream: cross-cutting
category: adr
status: accepted
owner: master-dd
created: 2026-04-26
tags:
  - adr
  - m11
  - coop
  - lobby
  - prisma
  - persistence
related:
  - docs/adr/ADR-2026-04-20-m11-jackbox-phase-a.md
  - docs/playtest/2026-04-26-demo-one-command.md
---

# ADR 2026-04-26 — M11 Phase D: Prisma lobby persistence

Addendum a [ADR-2026-04-20](ADR-2026-04-20-m11-jackbox-phase-a.md) (LobbyService in-memory). Room + player survivono restart backend quando `LOBBY_PRISMA_ENABLED=true`.

## Contesto

M11 Phase A-C (PR #1680/#1682/#1686/#1684/#1685) ha shippato flow co-op in-memory. Gap noto:

- Restart backend durante playtest → tutte le stanze perdute → amici devono ri-join
- Durante ngrok playtest, nel caso di crash metà sessione il TKT-M11B-06 test fallisce silenziosamente
- Handoff `2026-04-26-next-session-kickoff-p4-mbti-playtest.md` lista Prisma come Opzione C (~5h)

## Decisione

Adapter **write-through** opt-in (pattern `reference_prisma_write_through_adapter.md`):

- LobbyService in-memory resta source-of-truth a runtime
- Mutazioni (createRoom/joinRoom/closeRoom/setConnected/publishState) invocano sync-write su Prisma
- Boot: hydrate rooms aperte (closed=false) dal DB → LobbyService
- Graceful: se Prisma assente/fallisce, log warn + continua in-mem senza errori

## Schema

Migration `0005_lobby_persistence`:

```prisma
model LobbyRoom {
  code                String         @id
  hostId              String
  hostName            String
  campaignId          String?
  maxPlayers          Int            @default(8)
  hostTransferGraceMs Int            @default(30000)
  closed              Boolean        @default(false)
  stateVersion        Int            @default(0)
  lastState           String?        // JSON
  players             LobbyPlayer[]
}

model LobbyPlayer {
  id              String    @id
  roomCode        String    // FK → LobbyRoom.code
  name            String
  role            String
  token           String
  connected       Boolean   @default(false)
  joinedAt        DateTime
  disconnectedAt  DateTime?
}
```

## Invarianti

1. **Opt-in only** — env `LOBBY_PRISMA_ENABLED=true`, default OFF
2. **Fallback grazioso** — se `@prisma/client` mancante o DB unreachable, log + skip (no crash)
3. **Write-through** — ogni mutazione scrive immediatamente; nessun batching (ok per scope 4-8 player)
4. **Read from memory** — nessuna read via Prisma a runtime (solo boot hydrate)
5. **`lastState` snapshot** — salvato su ogni `publishState`, permette riprendere partita post-crash
6. **Host auth preservato** — `token` HEX non cambia post-restart; client può reconnect con stesso token

## Flow restart

```
backend crash / SIGTERM
 ↓
process restart
 ↓
createLobbyPersistence.hydrate()
 ↓
prisma.lobbyRoom.findMany({ closed: false, include: { players } })
 ↓
LobbyService.rehydrateRoom({...}) per ogni row
 ↓
client WebSocket reconnect backoff (1s→30s) → attachSocket → hello
```

## Non-obiettivi

- Cross-process sharding (single-process resta)
- Chat history persistence
- Replay / time-travel debugging
- Rate-limit / DoS (tracciato separatamente)

## Rollback

- `LOBBY_PRISMA_ENABLED=false` → noop, back a Phase A-C in-memory puro
- Tabelle `lobby_rooms`+`lobby_players` possono restare nel DB inutilizzate
- Migration reversibile via `npm run db:migrate:down`

## Test coverage

- `tests/api/lobbyPersistence.test.js` — 6 unit test fake Prisma (create/join/close/hydrate/failure-swallow/default-noop)
- `tests/api/lobbyRoutes.test.js` + `lobbyWebSocket.test.js` + `e2e/lobbyEndToEnd.test.mjs` — **26/26 verde senza regressione** (adapter opt-in non interferisce con default OFF)

## Riferimenti

- ADR origine: [ADR-2026-04-20](ADR-2026-04-20-m11-jackbox-phase-a.md)
- Pattern write-through: memory `reference_prisma_write_through_adapter.md`
- Esempi simili: migration 0003 (FormSessionState M12.D), 0004 (UnitProgression M13.P3)
