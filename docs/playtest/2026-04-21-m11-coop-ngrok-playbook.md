---
title: 'M11 co-op demo playbook — ngrok tunnel + 4-player live playtest'
workstream: playtest
category: playbook
status: draft
owner: master-dd
created: 2026-04-21
tags:
  - m11-phase-b
  - m11-phase-c
  - ngrok
  - jackbox
  - coop
  - playtest
  - tkt-m11b-06
related:
  - docs/adr/ADR-2026-04-20-m11-jackbox-phase-a.md
  - docs/planning/2026-04-21-m11-phase-b-close.md
---

# M11 co-op demo playbook — ngrok + 4-player live

Scopo: eseguire il primo playtest **live** del flow Jackbox (TV host + 4 phone player) sopra la pipeline M11 Phase B + B+ + C (PR [#1682](https://github.com/MasterDD-L34D/Game/pull/1682) / [#1683](https://github.com/MasterDD-L34D/Game/pull/1683) / Phase C TBD). Chiude **TKT-M11B-06** e bumpa Pilastro 5 🟡 → 🟢.

## Prerequisiti

1. **Branch shipped + merged** in `main`: Phase B, Phase B+, Phase C (roster panel). Fallback: playtest anche con solo Phase B+ (TV host vede roster panel extra solo dopo Phase C).
2. **Backend running**: `npm run start:api` (porta `3334`, env `LOBBY_WS_PORT=3341`, `LOBBY_WS_ENABLED=true` default).
3. **Frontend running**: `npm run play:dev` (Vite porta `5180`).
4. **ngrok account** Free tier sufficiente (2 tunnel simultanei possibili dalla 2024; verificare limiti personali).
5. **4 device player**: phone o browser desktop distinti (Incognito per separare localStorage).
6. **TV**: monitor ≥1080p con Chrome/Firefox fullscreen. O proiettore + laptop.

## Setup ngrok (2 tunnel)

```bash
# Terminal 1 — HTTP API (backend)
ngrok http 3334
# → copia forward URL: https://<rand-1>.ngrok-free.app
```

```bash
# Terminal 2 — WebSocket server
ngrok http 3341
# → copia forward URL: https://<rand-2>.ngrok-free.app
# Il client LobbyClient riscrive https→wss automatico via resolveWsUrl()
```

**Configura il frontend** per usare WS ngrok:

```bash
# Dev dynamic override (no rebuild):
export VITE_LOBBY_WS_URL="wss://<rand-2>.ngrok-free.app/ws"

# oppure build-time:
npm run build --workspace apps/play -- --mode production
# con .env.production contenente VITE_LOBBY_WS_URL=...
```

Il proxy HTTP Vite (`vite.config.js` → `/api → localhost:3334`) continua a funzionare in dev. Per ngrok HTTP, **aprire il frontend Vite dal tunnel HTTP** (`https://<rand-1>.ngrok-free.app`) **non funziona** senza un reverse-proxy che veicola `5180` → `3334`. Opzioni:

- **A** (semplice): Vite dev locale su laptop host, ngrok solo WS → player si connettono a Vite locale via LAN IP. Funziona solo se tutti in stessa rete (Wi-Fi).
- **B** (consigliato): build prod frontend + serve via backend Express statico + ngrok HTTP al backend (`3334`) + ngrok WS separato (`3341`).
- **C** (doppio tunnel): ngrok HTTP `5180` (Vite) + ngrok WS `3341`. Vite `server.allowedHosts: true` (già impostato). Richiede 3 tunnel totali se backend anche remoto.

Questo playbook assume **B** (prod-like).

## Build frontend per produzione

```bash
cd /c/Users/VGit/Desktop/Game
VITE_LOBBY_WS_URL="wss://<rand-2>.ngrok-free.app/ws" npm run build --workspace apps/play
```

Output in `apps/play/dist/`. Serving minimale:

```js
// apps/backend/index.js (se già presente skip): serve apps/play/dist via express static
app.use('/play', express.static(path.join(__dirname, '../play/dist')));
```

Oppure in dev stack `npm run dev:stack` basta, ma bisogna passare `VITE_LOBBY_WS_URL` a Vite.

## Host (TV) setup

1. Apri `https://<rand-1>.ngrok-free.app/lobby.html` (o `/play/lobby.html` se prod-static).
2. Compila "Crea stanza": nome host + (opzionale) campaign_id + max_players 4/8.
3. Click "Crea stanza" → compare card con codice 4-char + share URL.
4. Click "Entra nella TV" → redirect a `index.html`. Banner 📺 HOST visibile top-right.
5. Verifica roster panel bottom-left (Phase C): lista player (solo host presente, verde).
6. Fullscreen browser (F11 o pulsante Schermo).

## Player (phone) setup

Per ciascuno dei 4 player:

1. Condividi lo share URL dalla card host (copy-to-clipboard disponibile). Formato: `https://<rand-1>.ngrok-free.app/lobby.html?code=ABCD`.
2. Player apre link → codice pre-compilato → inserisce nome → "Entra".
3. Redirect a `index.html`. Overlay 📱 spectator si apre con composer form.
4. Banner top-right mostra `📱 PLAYER · ABCD · connesso`.
5. Verifica roster host-side (TV): +1 player nella lista.

## Playtest script (baseline)

### Scenario A — Tutorial 01 · Primi passi (co-op 2p)

1. Host seleziona scenario `enc_tutorial_01` + modulation `duo` (2p × 2PG = 4 schierati).
2. Host click "Nuova sessione" → world bootstrap. `publishWorld` broadcast.
3. Entrambi player vedono il nuovo state nell'overlay + roster popolato.
4. Player 1 seleziona il proprio PG dal dropdown, azione `attack`, target un enemy, "Invia intent".
5. Host verifica log: `📱→🧠 <player_id>: <actor> attack → <target>`.
6. Host dichiara intent proprio via UI canvas (click unit + click enemy).
7. Host commit round. Tutti vedono il nuovo state.

Ripeti per 3-5 round. **Annota**:

- RTT percepito player→host→broadcast (target <500ms per round)
- Drop/reconnect eventi (forza airplane mode 5s su un player → verifica rejoin)
- Confusione UX (player capisce cosa fare?)

### Scenario B — Tutorial 05 · BOSS Apex (co-op 4p)

Stesso flow, modulation `quartet` (4p × 1PG = 4 schierati). Uno player = 1 PG. Più stress sul flow parallel.

### Scenario C — Campaign live-mirror (4p, campaign_id set)

1. Host crea stanza con campaign_id = `apex_arc_mvp` (o altro da `data/campaigns/`).
2. Avvia sessione. Log atteso: `🗺 Campagna <id> avviata (live-mirror ON)`.
3. Tutti i player vedono box 🗺 Campagna in overlay (id + current_node_id + PE + PI).

## Metriche da catturare

| Metrica                   | Come                                           | Target / signal               |
| ------------------------- | ---------------------------------------------- | ----------------------------- |
| RTT intent → broadcast    | Cronometrare intent submit → overlay update    | <500ms locale · <1500ms ngrok |
| Reconnect success rate    | Count reconnect eventi / tentativi             | ≥90% success                  |
| Host log relay success    | Rapporto ✖ intent relay vs ✓                  | 0 errori                      |
| Campaign summary accuracy | PE/PI mostrati in overlay = PE/PI live backend | 100% match                    |
| UX confusion (soggettivo) | Player verbali "cosa devo fare?" / round       | ≤1 per round                  |
| Fun rating (post-demo)    | Form feedback (`📣 Feedback` header)           | ≥4/5 media                    |

## Troubleshooting

| Sintomo                               | Diagnosi                                                   | Fix                                                     |
| ------------------------------------- | ---------------------------------------------------------- | ------------------------------------------------------- |
| Player banner `chiuso` subito         | WS URL sbagliato o tunnel WS down                          | Verifica `VITE_LOBBY_WS_URL` + `ngrok http 3341` attivo |
| Player banner `retry 1…` ciclico      | `LOBBY_WS_PORT` mismatch / firewall                        | Backend con env corretta + porta aperta                 |
| Overlay resta "in attesa dell'host"   | Host non ha avviato sessione / `publishWorld` non chiamato | Host deve click "Nuova sessione" prima                  |
| `room_not_found` su join              | Stanza chiusa / restart backend (in-memory)                | Host crea nuova stanza                                  |
| Intent player non appare sul host log | Player role !== player / sendIntent guard                  | Verifica session.role in localStorage                   |
| Campaign box non visibile             | session.campaign_id null / api.campaignStart fallito       | Check backend log + `/api/campaign/list`                |

## Rollback

- `LOBBY_WS_ENABLED=false` in env backend → REST continua a rispondere ma WS chiuso. Player smettono di ricevere broadcast.
- Revert PR #1682/#1683 → game shell torna single-host locale.

## Follow-up post-playtest

Creare report in `docs/playtest/2026-04-XX-m11-coop-demo-live.md` con:

1. Data + durata + numero player
2. Metriche raccolte (tabella sopra)
3. Bug trovati → ticket nuovi
4. Decision: P5 🟢? O richiede Phase D (rate-limit / persistence / host-transfer)?

Se demo supera 3 round senza crash + ≥4 player + RTT <1500ms ngrok → bump **P5 🟢** + update [CLAUDE.md §Pilastri](CLAUDE.md#pilastri-di-design--stato-reale).

## Riferimenti

- ADR protocollo: [`docs/adr/ADR-2026-04-20-m11-jackbox-phase-a.md`](../adr/ADR-2026-04-20-m11-jackbox-phase-a.md)
- Phase B close: [`docs/planning/2026-04-21-m11-phase-b-close.md`](../planning/2026-04-21-m11-phase-b-close.md)
- Strategy: [`docs/planning/2026-04-20-strategy-m9-m11-evidence-based.md`](../planning/2026-04-20-strategy-m9-m11-evidence-based.md)
