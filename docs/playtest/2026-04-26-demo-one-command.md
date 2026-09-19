---
title: 'Demo one-command — single tunnel ngrok playable con amici'
workstream: playtest
category: playbook
status: draft
owner: master-dd
created: 2026-04-26
tags:
  - demo
  - ngrok
  - coop
  - m11
  - tkt-m11b-06
related:
  - docs/playtest/2026-04-21-m11-coop-ngrok-playbook.md
  - docs/adr/ADR-2026-04-20-m11-jackbox-phase-a.md
---

# Demo one-command — playable con amici

Shortcut per il playbook ngrok. **Un comando + un tunnel** grazie a shared HTTP+WS.

## Prerequisiti

- `npm ci` eseguito
- `ngrok` CLI installato + account free
- 4 device (phone/browser) + 1 TV/monitor

## One-liner

```bash
# Terminal 1 — build + start backend (serve /play static + WS su /ws)
npm run demo

# Terminal 2 — single tunnel
ngrok http 3334
# → copia https://<rand>.ngrok-free.app
```

## Share

- **Host / TV**: `https://<rand>.ngrok-free.app/play/lobby.html`
  - crea stanza → click "Entra nella TV" → F11 fullscreen
- **Player** (4x phone): condividi link dalla card host, formato `.../play/lobby.html?code=ABCD`

## Come funziona

- `LOBBY_WS_SHARED=true` (settato da `scripts/run-demo.cjs`) fa attach del `WebSocketServer` all'HTTP server esistente sulla stessa porta 3334, path `/ws`.
- Backend serve `apps/play/dist` sotto `/play/*` + genera `/play/runtime-config.js` con `window.LOBBY_WS_SAME_ORIGIN=true`.
- Frontend `resolveWsUrl()` vede il flag → usa `wss://<host-corrente>/ws` → stesso tunnel ngrok, no secondo URL da configurare.
- Query override disponibile: `?ws=wss://altro-host/ws` (utile per test con backend remoto diverso).

## Modalità classica (2 tunnel, dedicated WS)

Se preferisci WS isolato su porta 3341 (playbook originale):

```bash
# Terminal 1
npm run start:api
# Terminal 2
npm run play:dev
# Terminal 3 + 4 — 2 ngrok tunnel (vedi playbook originale)
```

Vedi [`2026-04-21-m11-coop-ngrok-playbook.md`](2026-04-21-m11-coop-ngrok-playbook.md) per dettaglio.

## Rollback

- `LOBBY_WS_SHARED=false npm run start:api` → back a dedicated port
- `rm -rf apps/play/dist` → static /play non servito, dev flow via Vite

## Smoke checklist

- [ ] `curl https://<rand>.ngrok-free.app/play/runtime-config.js` → `window.LOBBY_WS_SAME_ORIGIN=true;`
- [ ] browser devtools Network: WebSocket `wss://<rand>.ngrok-free.app/ws` status 101
- [ ] host crea stanza → 4-char code
- [ ] player con `?code=ABCD` vede overlay composer
- [ ] intent player → host log relay

## Follow-up

Playbook completo metriche + scenari in [`2026-04-21-m11-coop-ngrok-playbook.md`](2026-04-21-m11-coop-ngrok-playbook.md).
