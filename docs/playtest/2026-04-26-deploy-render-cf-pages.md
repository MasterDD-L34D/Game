---
title: 'Deploy playbook — Render backend + Cloudflare Pages frontend (stack pilot M11)'
workstream: playtest
category: playbook
status: draft
owner: master-dd
created: 2026-04-26
tags:
  - playbook
  - deploy
  - render
  - cloudflare-pages
  - m11
  - tkt-m11b-06
related:
  - docs/adr/ADR-2026-04-26-hosting-stack-decision.md
  - docs/playtest/2026-04-26-demo-one-command.md
---

# Deploy playbook — Render + Cloudflare Pages

Stack pilot **free tier perpetual** per TKT-M11B-06 playtest live. Zero laptop 24/7, URL stabile, no ngrok. ADR: [`ADR-2026-04-26`](../adr/ADR-2026-04-26-hosting-stack-decision.md).

## Prerequisiti

- Account GitHub collegato al repo `MasterDD-L34D/Game`
- Account **Render** free (sign-up con GitHub, no CC required)
- Account **Cloudflare** free (sign-up, no CC required)
- Merge PR #1700 (demo one-tunnel, `LOBBY_WS_SHARED=true`) su main

## Step 1 — Backend su Render (~20 min)

### 1.1 Creazione service

1. Render dashboard → **New** → **Blueprint**
2. Connect `MasterDD-L34D/Game` → branch `main`
3. Render legge `render.yaml` → preview service config:
   - Name: `evo-tactics-backend`
   - Plan: **Free**
   - Region: **Frankfurt** (EU vicino)
   - Build: `npm ci && npm run play:build`
   - Start: `node apps/backend/index.js`
   - Healthcheck: `/api/lobby/state`
4. Click **Apply** → primo deploy ~3-5 min

### 1.2 Env vars (pre-seeded da blueprint)

| Key                     | Value      | Note                                    |
| ----------------------- | ---------- | --------------------------------------- |
| `NODE_VERSION`          | 22.19.0    | Match locale                            |
| `NODE_ENV`              | production |                                         |
| `LOBBY_WS_ENABLED`      | true       |                                         |
| `LOBBY_WS_SHARED`       | true       | **Critico**: WS sulla stessa porta HTTP |
| `LOBBY_PRISMA_ENABLED`  | false      | M11 scope = no persist (attiva in M14)  |
| `GAME_DATABASE_ENABLED` | false      |                                         |
| `CORS_ORIGIN`           | `*`        | Tighten post-beta                       |

### 1.3 Verifica

```bash
# Sostituisci con URL Render reale (dashboard → service → copy URL)
export BE=https://evo-tactics-backend.onrender.com

curl -sf $BE/api/lobby/state       # {...}
curl -sf $BE/play/runtime-config.js # window.LOBBY_WS_SAME_ORIGIN=true;
curl -sf $BE/play/lobby.html | head -5  # <!doctype html>
```

> **Cold start**: primo request dopo 15 min idle = 30-60s. Keepalive: il servizio resta alive finché ci sono WS messages in corso (Feb 2026 update Render).

## Step 2 — Frontend su Cloudflare Pages (~15 min)

### 2.1 Creazione project

1. Cloudflare dashboard → **Workers & Pages** → **Create** → **Pages** → **Connect to Git**
2. Seleziona `MasterDD-L34D/Game` → branch `main`
3. Build config:
   - **Framework preset**: None
   - **Build command**: `npm ci && npm run play:build`
   - **Build output directory**: `apps/play/dist`
   - **Root directory**: `/` (default)
4. Env vars build-time:

| Key                 | Value                                       |
| ------------------- | ------------------------------------------- |
| `VITE_LOBBY_WS_URL` | `wss://evo-tactics-backend.onrender.com/ws` |
| `NODE_VERSION`      | `22.19.0`                                   |

5. **Save and Deploy** → primo deploy ~2-3 min

### 2.2 Note runtime-config.js su CF Pages

Il file `/play/runtime-config.js` è backend-served (Render, shared mode). Su CF Pages **404** atteso — gestito via `onerror="void 0"` nei tag `<script>`. La WS URL arriva da `VITE_LOBBY_WS_URL` baked al build.

### 2.3 Verifica

```bash
export FE=https://evo-tactics.pages.dev  # URL assegnato da Pages

curl -sfI $FE/lobby.html      # 200
curl -sfI $FE/assets/         # 200 con cache headers _headers
```

Apri `$FE/lobby.html` → UI carica, crea stanza → WS connect a Render backend.

## Step 3 — Smoke test live (~10 min)

1. **Host**: apri `$FE/lobby.html` → crea stanza → codice 4-char
2. **Browser Incognito** (simula player): apri stessa URL → join con codice
3. **Network tab** (player): `WS wss://evo-tactics-backend.onrender.com/ws?code=...` → status **101**
4. Host side → click "Nuova sessione" → stato broadcast
5. Player overlay riceve world → compose intent → invia
6. Host log mostra intent relay

## Step 4 — Share amici (live playtest)

```
https://evo-tactics.pages.dev/lobby.html
```

Host entra, crea stanza, condivide link con `?code=XXXX`. 4 amici connettono. Nessun laptop acceso necessario.

## Monitoring

- **Render logs**: dashboard → service → Logs tab (real-time)
- **Cloudflare Pages**: analytics free (req/bandwidth per deploy)
- **Uptime**: usa [UptimeRobot](https://uptimerobot.com) free (ping `/api/lobby/state` ogni 5min → previene spin-down durante eventi)

## Cold start mitigation

Render free spin-down 15min idle. Workaround pre-playtest:

```bash
# 5 min prima del playtest, warmup:
curl https://evo-tactics-backend.onrender.com/api/lobby/state
sleep 30
curl https://evo-tactics-backend.onrender.com/api/lobby/state
# Service ora warm per ~15 min
```

## Troubleshooting

| Sintomo                                     | Diagnosi                   | Fix                                                      |
| ------------------------------------------- | -------------------------- | -------------------------------------------------------- |
| Player banner `chiuso` subito               | WS URL sbagliato in bundle | Verifica `VITE_LOBBY_WS_URL` in CF Pages env + rebuild   |
| WS handshake 503                            | Render service spin-down   | Primo request warmup, poi ritry                          |
| 404 su `/play/runtime-config.js` (CF Pages) | Expected (backend-served)  | `onerror="void 0"` gestisce silently                     |
| `room_not_found` post-restart               | In-memory lost             | Attiva `LOBBY_PRISMA_ENABLED=true` + Neon Postgres (M14) |

## Rollback

### Rollback frontend

Dashboard CF Pages → Deployments → click precedente deploy → **Rollback**. <30s.

### Rollback backend

Dashboard Render → service → Deploys tab → click precedente → **Redeploy**. ~2 min.

### Rollback full (back a laptop+ngrok)

1. Render: **Suspend** service
2. CF Pages: disable auto-deploy
3. Locale: `npm run demo` + `ngrok http 3334` → demo one-tunnel

## Follow-up M14

Path B pianificato: rewrite `LobbyService` → Cloudflare Durable Objects (via PartyKit pattern). Zero cold start + natural sharding. Effort ~4-6h post-playtest validation.

## Riferimenti

- ADR: [`ADR-2026-04-26`](../adr/ADR-2026-04-26-hosting-stack-decision.md)
- Demo one-tunnel (alternativa laptop): [`docs/playtest/2026-04-26-demo-one-command.md`](2026-04-26-demo-one-command.md)
- Render docs WS: https://render.com/docs/websocket
- CF Pages limits: https://developers.cloudflare.com/pages/platform/limits/
