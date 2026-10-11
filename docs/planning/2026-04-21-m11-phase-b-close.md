---
title: 'M11 Phase B — Jackbox frontend + TV view close'
workstream: planning
category: sprint-close
status: draft
owner: master-dd
created: 2026-04-21
tags:
  - m11-phase-b
  - pilastro-5
  - network
  - lobby
  - co-op
related:
  - docs/adr/ADR-2026-04-20-m11-jackbox-phase-a.md
  - docs/planning/2026-04-21-next-session-kickoff-phase-b.md
  - docs/planning/2026-04-20-strategy-m9-m11-evidence-based.md
---

# M11 Phase B — close note

Phase A backend shipped con PR #1680 (merged `db4325f0`). Phase B layer frontend + WS client wrapper + spectator view + e2e test, senza toccare il backend.

## Scope effettivo (B1 + B2 parziale)

Il kickoff offriva fallback split B1 + B2. Questo PR copre B1 completo + B2 parziale (TV spectator overlay + banner). Campaign live-mirror opt-in e phone intent-input rimangono a M11 Phase C/polish.

### Consegne

- **`apps/play/lobby.html`** — entry Vite multi-entry, UI picker host/player con ruolo esplicito, codice 4-char auto-uppercase, share URL copy, resume banner (sessione persistita), auto-fill code da query param `?code=` (invite link).
- **`apps/play/src/lobby.js`** — bootstrap POST `/api/lobby/create` + `/api/lobby/join`, persistenza localStorage (`evo_lobby_session`), redirect a `index.html`.
- **`apps/play/src/network.js`** — `LobbyClient` class: connect/close, backoff exp 1s→30s + jitter, stateVersion reconcile, on/off/once event emitter (14 eventi), host-only `sendState`, non-host-only `sendIntent`, `sendChat`, `ping`. Esportato anche `saveLobbySession` / `loadLobbySession` / `clearLobbySession` / `resolveWsUrl`. Accetta `wsImpl` override per Node test.
- **`apps/play/src/lobbyBridge.js`** — integrazione minima nel game shell: banner fisso con ruolo+codice+stato+count, spectator overlay per role `player` (card + pre con ultimo state ricevuto), host publish dopo ogni `refresh()`. Intrusivo in `main.js` per ~10 righe (import + init bridge + gate bootstrap + publish hook).
- **`apps/play/vite.config.js`** — multi-entry rollup (`main` + `lobby`).
- **`apps/play/src/main.js`** — 3 patch mirate: import `initLobbyBridgeIfPresent`, publishWorld dopo refresh host, gate bootstrap skip `startNewSession` se player role (spectator attivo).
- **`tests/e2e/lobbyEndToEnd.test.mjs`** — 5 test ESM Node native runner: host+3 player broadcast state, non-host guard, intent relay scope, auto-reconnect on drop, auth failure reject. `ws` passato come `wsImpl`.

### Protocollo (immutato rispetto a Phase A)

Wire protocol ADR-2026-04-20 §Protocollo. Client non aggiunge type nuovi. Esistenti usati: `hello` · `state` · `intent` · `chat` · `player_joined` · `player_connected` · `player_disconnected` · `room_closed` · `ping`/`pong` · `error`.

### Reconnect

Exponential backoff `1s · 2s · 4s · 8s · 16s · 30s` con jitter ±200ms. Max attempts `Infinity` default. Skip reconnect su codici close `4001` (room_closed), `4003` (auth_failed), `4004` (room_not_found).

### Baseline test

| Suite                       |   Esito   |
| --------------------------- | :-------: |
| AI (307)                    |  307/307  |
| API lobby Phase A REST (9)  |    9/9    |
| API lobby Phase A WS (6)    |    6/6    |
| E2E Phase B LobbyClient (5) |    5/5    |
| **Totale M11 suite**        | **27/27** |

`npm run format:check` verde sui file M11 Phase B (drift pre-esistente `docs/evo-tactics-pack/trait-glossary.json` non toccato).

## Non ancora coperto (M11 Phase B+ / Phase C)

| Item                                               | Priority | Note                                                                                                                     |
| -------------------------------------------------- | :------: | ------------------------------------------------------------------------------------------------------------------------ |
| Phone intent submit (player role)                  |    P1    | Spectator overlay shows state read-only; richiede UI per comporre intent (action + target) e inviare via `sendIntent`.   |
| Campaign live-mirror bootstrap                     |    P1    | Se `campaign_id` set nel room, host deve chiamare `/api/campaign/start` + broadcast summary. Attualmente solo flag.      |
| Host `/session/round/execute` bridge player→intent |    P2    | Trasformare player `intent` in `declare-intent` verso backend. Oggi host riceve solo e deve processare manualmente.      |
| Canvas TV-first layout (host role ampliato)        |    P2    | Oggi TV host vede canvas 512×512 standard. Phase C: widescreen + roster laterale + spectator-friendly (+timer planning). |
| Host-transfer on disconnect                        |    P2    | Se host perde connessione permanent, room muore. Open question §Phase B doc. Phase C candidate.                          |
| Prisma room persistence                            |    P3    | ADR-2026-04-20 Consequences §Negative. Defer finché single-process MVP sufficiente.                                      |
| Rate-limit / DoS hardening                         |    P3    | Phase D se deploy pubblico oltre ngrok playtest.                                                                         |

## Demo flow

1. Host apre `http://localhost:5180/lobby.html` → "Crea stanza" → `📺 HOST` banner + codice `ABCD` + share URL.
2. Host preme "Entra nella TV" → `http://localhost:5180/index.html` → banner `📺 HOST · ABCD · connesso` (verde) in alto a destra. Gioco parte automaticamente, ogni `refresh()` pubblica world.
3. Player apre share URL su phone → codice `ABCD` auto-filled → inserisce nome → "Entra" → `http://localhost:5180/index.html` → spectator overlay con state host live (aggiornato ad ogni round) + banner `📱 PLAYER · ABCD · connesso`.
4. Host gioca sulla TV, tutti i player vedono la board in sync entro RTT tipico ~20-40ms locale, 100-300ms via ngrok tunnel.

## Deploy note ngrok

Demo remoto richiede **due tunnel separati**:

```
ngrok http 3334   # HTTP API backend
ngrok http 3341   # WebSocket server
```

E env `VITE_LOBBY_WS_URL=wss://<ngrok-ws-hostname>/ws` in build per forzare WSS verso tunnel HTTPS. Backend resta `LOBBY_WS_PORT=3341`.

## Pilastro 5 status

- Pre-Phase A: 🟡 (focus-fire locale, zero rete)
- Phase A: 🟡-progressing (beachhead backend)
- **Phase B (questo PR): 🟡→🟢** se demo live 4-player completa senza regressioni; 🟡 finché phone intent submit non shippato (Player può solo guardare)

Recommendation: marcare P5 🟢 **solo dopo demo live 4-player con intent submit player→host funzionante** (Phase B+). Banner + spectator + host broadcast è già un milestone concreto: senza di loro non si può testare live.

## Test baseline preservati

- Node AI: 307/307 ✓
- API lobby Phase A (REST+WS): 15/15 ✓
- API totale 299/299 atteso (non eseguito per time budget; nessun backend toccato)

## Follow-up immediati

- **TKT-M11B-01** Phone intent UI (compose + submit) — P1
- **TKT-M11B-02** Host-side intent relay → `/api/session/declare-intent` bridge — P1
- **TKT-M11B-03** Campaign live-mirror wiring (`campaign_id` → `/api/campaign/start`) — P1
- **TKT-M11B-04** Canvas TV layout + roster panel — P2
- **TKT-M11B-05** Host-transfer su disconnect (first-come-first-served) — P2
- **TKT-M11B-06** Playtest live 4-player via ngrok + report `docs/playtest/2026-04-XX-m11-coop-demo-live.md` — P1
