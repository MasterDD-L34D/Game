---
title: 'Sprint 2026-04-24 — Playtest prep + smoke round 1'
workstream: ops-qa
category: sprint-close
doc_status: active
doc_owner: master-dd
last_verified: '2026-04-24'
source_of_truth: false
language: it
review_cycle_days: 30
tags:
  - sprint-close
  - playtest
  - launcher
  - coop-mvp
  - v5-sg
related:
  - docs/playtest/2026-04-26-coop-full-loop-playbook.md
  - docs/playtest/2026-04-26-demo-launcher.md
  - docs/planning/2026-04-26-vision-gap-sprint-handoff.md
---

# Sprint 2026-04-24 — Playtest prep + smoke round 1

Sessione di preparazione al playtest live 2-4 amici via ngrok. 4 PR consecutivi mergiati su `main` per abilitare flow end-to-end. Smoke round 1 ha rivelato bug critici risolti immediatamente.

## PR shipped

| PR                                                       | Scope                                                                                                    | SHA        | Note                                              |
| -------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- | ---------- | ------------------------------------------------- |
| [#1727](https://github.com/MasterDD-L34D/Game/pull/1727) | V5 SG runtime wire abilityExecutor (7 sites) + UI tri-sorgente rewards + PI pack hint char creation      | `b9a6dc73` | Completa residuo V5 wire post PR #1726            |
| [#1728](https://github.com/MasterDD-L34D/Game/pull/1728) | Fix bug critico `publicSessionView` sovrascrive V5 pool + CSS preview-packs                              | `0df68899` | Ispezionando memory pre-playtest                  |
| [#1729](https://github.com/MasterDD-L34D/Game/pull/1729) | Launcher UX rewrite: preflight + health probe + auto-open + clipboard + QR + ANSI banner                 | `a5d18248` | Research-driven pattern (Steam/itch.io/LAN tools) |
| [#1730](https://github.com/MasterDD-L34D/Game/pull/1730) | Playtest-ui fix round 1: share hint self-poll + layout ultrawide + `runtime-config.js` fallback ngrok WS | `168a8d0d` | Post smoke round 1                                |

## Bug critici risolti

### A) V5 SG pool sovrascritto in `publicSessionView` — BLOCKER CATALOGO

**File**: [`apps/backend/routes/sessionHelpers.js:221`](../../apps/backend/routes/sessionHelpers.js)

Spread `...u` preservava correttamente `u.sg` V5 (integer 0..3, gestito da `sgTracker`), poi la linea successiva sovrascriveva con `sg: Math.floor((u.stress || 0) * 100)` (gauge legacy 0..100). V5 pool mai esposto al client.

**Fix**: preserve V5 `u.sg` esplicito + gauge stress rinominato `stress_gauge` + `surge_ready` mantiene semantica >=75.

### B) ngrok single-tunnel WS roto per `runtime-config.js` missing — BLOCKER PLAYTEST

**File**: [`apps/play/public/runtime-config.js`](../../apps/play/public/runtime-config.js) (nuovo)

Client defaultava `ws://host:3341/ws` (porta dedicata) non esposta via ngrok single-tunnel. Backend serve dinamicamente `/play/runtime-config.js` basato su `LOBBY_WS_SHARED` env ma fallback statico mancante.

**Fix**: creato file statico `public/runtime-config.js` con default `window.LOBBY_WS_SAME_ORIGIN = true`.

### C) Share hint dismiss race — UX BLOCKER

**File**: [`apps/play/src/lobbyOnboarding.js:135`](../../apps/play/src/lobbyOnboarding.js) + [`apps/play/src/lobbyBridge.js:266`](../../apps/play/src/lobbyBridge.js)

Hint `📢 Condividi con i tuoi amici` dismiss legato a event `player_joined`. Se player era già in room quando host carica pagina (reload, late load), event replay missing → hint persiste.

**Fix multi-layer** (robust belt-and-suspenders):

1. `updateHostRoster` ispeziona `_players` + dismiss se `hasOtherPlayer`.
2. `client.on('player_connected')` aggiunto dismiss trigger (covers WS reconnect).
3. `renderHostShareHint` self-poll `setInterval(1s)` ispeziona DOM `li .role:not(.host)` → salvagente contro qualsiasi race.

### D) Layout ultrawide 3436×1265 — COSMETIC BLOCKER

**File**: [`apps/play/src/render.js:163`](../../apps/play/src/render.js) + [`apps/play/src/style.css:160`](../../apps/play/src/style.css)

`fitCanvas` CELL cap 96 era TV-safe 1080p ma canvas minuscolo su desktop ultrawide. `main` grid 300px sidebar overlap con share hint fisso 340px. Spazio vertical sprecato.

**Fix**: CELL cap 96 → 160 (canvas 6×96=576 → 6×160=960). Sidebar 300→360. `min-height:0` main + `.board justify-content:center` per vertical fill.

## Launcher UX (PR #1729)

Research-driven rewrite basato su pattern launcher commerciali (Steam/itch.io/LAN-party tools).

**Prima**: lancia backend+ngrok, banner con URL. User doveva fixare errori cryptic (port busy, authtoken missing, dist stale), copiare URL manualmente, aprire browser manualmente. Backend stdout inquinava banner.

**Dopo**:

- **5 preflight checks** con ✓/✗ e fix hint inline: Node≥18, ngrok presence, authtoken configured, dist presente, port 3334 libera
- **Health probe** `/api/health` (40 retry × 500ms) prima di annunciare ready
- **Banner ANSI-colorato** pulito con URL + QR link + dashboard
- **Auto-copy URL** clipboard (Windows `clip.exe` / macOS `pbcopy` / Linux `xclip`)
- **Auto-open browser** host (platform-aware: `start` / `open` / `xdg-open`)
- **QR mobile link** via api.qrserver.com (no new deps)
- **Log separato** `logs/demo-<ts>.log` (backend stdout non pollute banner)
- **Graceful shutdown** SIGINT/SIGTERM → kill backend+ngrok

## Residuo

- **TKT-M11B-06** playtest live 4p ngrok effettivo post PR #1730 (userland, unico bloccante umano)
- **Narrative log prose** feature M18+ (gap feature non-bug): log attuale è terse `SIS · unit: attack → target (dmg)`. Implementare `narrativeComposer.js` per frasi tipo "Ragno morde Aria per 5 danni" basato su event action_type.

## Lessons

1. **Ngrok single-tunnel richiede WS same-origin**: `LOBBY_WS_SAME_ORIGIN=true` injection essenziale. Backend dynamic route + static fallback per coverage edge case (Vite dev, altri host).
2. **Race event-driven dismiss**: `setInterval` self-poll 1s è salvagente robusto rispetto a listener multipli su WS events che possono arrivare fuori ordine.
3. **Playtest 2-browser audit reale** rivela bug non visibili in unit test (race frontend-backend-WS in ngrok environment).
4. **Launcher UX pattern**: pre-flight con fix hint > cryptic errors. Health probe > "pensare che sia pronto ma non lo è". Auto-open+clipboard > copia manuale.
