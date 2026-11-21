---
title: 'Next session kickoff — M11 Phase B (Jackbox frontend + TV view)'
workstream: planning
category: handoff
status: draft
owner: master-dd
created: 2026-04-21
tags:
  - kickoff
  - session-handoff
  - sprint-prep
  - m11-phase-b
related:
  - docs/adr/ADR-2026-04-20-m11-jackbox-phase-a.md
  - docs/planning/2026-04-20-strategy-m9-m11-evidence-based.md
  - docs/planning/2026-04-21-next-session-kickoff.md
---

# Next session kickoff — M11 Phase B

Session 2026-04-20 chiuso con PR #1680 merged (Phase A backend). Sequenza C ✅ B ✅ A ✅. **M11 Phase A shipped**: lobby REST + WS backend su porta 3341. Phase B chiude P5 con frontend e demo live.

## Stato Phase A

- **PR [#1680](https://github.com/MasterDD-L34D/Game/pull/1680) merged** `db4325f0` on main
- Test: 15/15 nuovi (9 REST + 6 WS) + baseline AI 307/307 + API 299/299 intatti
- ADR-2026-04-20 Accepted
- Zero nuove deps (`ws@8.18.3` pre-installato)
- Pilastro 5 stato: 🟡 → 🟡 (Phase A live). Phase B chiude → 🟢.

## Quick start

```bash
cd /c/Users/VGit/Desktop/Game
git fetch origin main && git checkout -b feat/m11-jackbox-phase-b origin/main
claude
```

Incolla Prompt B sotto.

---

## Prompt B — M11 Phase B (~8-10h)

**Scope**: chiude Pilastro 5 end-to-end. Frontend + TV view + client reconnect. Demo live 4 amici + phone + TV.

```text
Leggi:
- docs/adr/ADR-2026-04-20-m11-jackbox-phase-a.md (protocollo WS + port + endpoint REST)
- apps/backend/services/network/wsSession.js (Room + LobbyService interface)
- apps/backend/routes/lobby.js (REST contract)
- tests/api/lobbyWebSocket.test.js (esempio uso ws client)
- apps/play/index.html (pattern frontend esistente)

Task: M11 Phase B — Frontend lobby + TV dual-view + client reconnect.

Scope Phase B (~8-10h):
1. apps/play/src/lobby.html NEW: UI picker
   - Form "Crea stanza" → POST /api/lobby/create → mostra code + QR
   - Form "Unisciti" → POST /api/lobby/join (4-char input uppercase-auto)
   - Redirect post-success a main game con role + token in localStorage
2. apps/play/src/network.js NEW: client WS wrapper
   - connect(code, player_id, token) → ws://host:3341/ws?...
   - Handlers per type: hello, state, intent (host), player_joined/left, chat, error
   - Reconnect backoff exp 1s→30s, token replay, state version reconcile
   - Envent emitter pattern (onState, onPlayerJoined, onIntent, etc.)
3. TV dual-view: detect role nel client
   - role='host' → TV layout: shared spectator view (roster + round state + resolve animations)
   - role='player' → phone layout: own PG actions + intent submit
4. Campaign integration: room.campaign_id → bootstrap session via /api/campaign/state
   - Host pubblica state al round boundary
   - Player intent → host resolve → host /api/session/round/execute → broadcast state
5. Tests e2e browser-less:
   - tests/e2e/lobbyEndToEnd.test.js: 4-player join + host publish + all receive
   - Smoke test UI render (jsdom o Playwright se già wired)

Pattern da file esistenti:
- apps/play/index.html → canvas + main loop template
- tests/api/lobbyWebSocket.test.js → client ws.send/on('message') pattern

Non toccare:
- apps/backend/* (Phase A chiuso, no modifiche backend lato server)
- services/rules/ (deprecato)
- packages/contracts/ (schema stabili)

Warning:
- WS port 3341 hardcoded: leggi da env VITE_LOBBY_WS_URL (default ws://localhost:3341/ws)
- localStorage key: 'evo_lobby_session' = { code, player_id, token, role }
- ngrok: se demo remoto, tunnel sia HTTP 3334 sia WS 3341 (2 tunnel separati)

Effort Phase B: ~8-10h. Branch: feat/m11-jackbox-phase-b.

Output PR:
- apps/play/src/lobby.html + apps/play/src/network.js
- TV vs phone layout switching in apps/play/index.html
- tests/e2e/lobbyEndToEnd.test.js
- docs/playtest/2026-04-XX-m11-coop-demo-live.md (se playtest fatto in session)
- ADR addendum se protocollo cambia
```

## Fallback se Phase B scope troppo ampio

**Split B1 + B2**:

- **B1** (~5h): lobby.html + network.js + basic connect flow. Demo: 2 browser tab same host.
- **B2** (~4h): TV dual-view + campaign integration + reconnect hardening.

## Open questions Phase B

1. **Local-host only vs ngrok tunnel**: demo friend live richiede tunnel pubblico. Due tunnel separati (3334 + 3341) o proxy unificato?
2. **Token persistence**: localStorage vs URL-encoded. URL più portable (copia-incolla link invita), localStorage più robusto post-refresh.
3. **State size**: round snapshot ~10KB. Se cresce oltre 50KB, diff sync necessario → Phase C (o tier-2 Colyseus).
4. **Host crash recovery**: se host disconnette permanentemente, room gone. Phase B o C può trasferire host a primo player connesso?

## Test baseline da preservare

- Node AI 307/307
- API 299/299 (post-Phase A +15 = 314)
- Tutte le 15 test M11 Phase A devono restare verdi
- Non toccare `apps/backend/` a meno di bug reale
