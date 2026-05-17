---
title: 'ADR-2026-04-16: Networking architecture for co-op multiplayer'
doc_status: draft
doc_owner: combat-team
workstream: combat
last_verified: 2026-04-16
source_of_truth: false
language: it-en
review_cycle_days: 14
---

# ADR-2026-04-16: Networking architecture for co-op multiplayer

- **Data**: 2026-04-16
- **Stato**: Proposed (draft)
- **Owner**: Backend & Session Engine
- **Stakeholder**: Frontend (lobby UI), Backend (session sync), QA (test multiplayer), Game Design (co-op experience)

## Contesto

"Co-op vs Sistema" è il Pilastro #5 di design. Il round model (ADR-2026-04-15) assume che più giocatori dichiarino intent simultaneamente durante la fase planning. Tuttavia, **nessuna architettura di rete è stata definita**. Il session engine (`apps/backend/routes/session.js`) gestisce tutto in-process — non c'è sync state, non c'è lobby, non c'è gestione disconnessione.

Questo ADR propone un approccio incrementale: hotseat → WebSocket → eventuale framework dedicato.

## Opzioni considerate

### Opzione A: Hotseat-first (raccomandata per MVP)

Tutti i giocatori su stesso device/schermo. Input sequenziale o split-screen. Zero networking. Session engine invariato.

**Pro**: zero complessità, testabile subito, coerente con "TV-first couch co-op."
**Contro**: no gioco online, limita pubblico.

### Opzione B: WebSocket custom su session engine

Aggiungere layer WebSocket (`ws` o `socket.io`) sopra le route esistenti. Server = source of truth. Client invia intent, server broadcast state aggiornato.

**Pro**: controllo totale, integrazione diretta col round orchestrator, no dipendenze esterne.
**Contro**: reinventare lobby, reconnect, state sync, matchmaking.

### Opzione C: Colyseus (framework)

Adottare `colyseus` (6.8k stars, Node.js, session authoritative). Room = encounter. State sync automatico via schema. Lobby, matchmaking, reconnect built-in.

**Pro**: feature complete, battle-tested, Node.js nativo, serializzazione efficiente.
**Contro**: dipendenza esterna, learning curve, potenziale conflitto con session engine custom.

### Opzione D: Modello ibrido (raccomandata per post-MVP)

Fase 1 (MVP): Hotseat. Fase 2: WebSocket custom per intent sync durante planning phase. Fase 3: valutare migrazione a Colyseus se scale richiede matchmaking/lobby avanzati.

## Decisione proposta

**Fase 1 (MVP)**: Opzione A — Hotseat.

- Nessuna modifica al session engine.
- UI: schermo condiviso, planning phase mostra intent di tutti i giocatori.
- Validazione: tutti i pattern co-op testabili in locale.

**Fase 2 (post-MVP, ~3 mesi)**: Opzione B — WebSocket minimal.

- `ws` module (no socket.io overhead) sopra Express.
- Scope limitato: solo sync intent durante planning + broadcast resolved state.
- Endpoint: `ws://host:3334/session/:id/live`
- Protocollo:
  ```
  Client → Server: { type: "declare_intent", unit_id, action, target }
  Client → Server: { type: "clear_intent", unit_id }
  Server → All:    { type: "state_update", round_phase, pending_intents, ... }
  Server → All:    { type: "round_resolved", resolution_log }
  ```
- Reconnect: client ri-invia `GET /session/:id/state` per re-sync.
- Nessun matchmaking — invite link manuale (codice stanza).

**Fase 3 (se necessario)**: Valutare Colyseus.

- Trigger: >100 sessioni concorrenti, necessità matchmaking automatico, mobile client.
- Migrazione: Room Colyseus wrappa `createSessionRouter`, stato sincronizzato via schema.

## Impatto architetturale

| Componente             | Fase 1             | Fase 2                                     | Fase 3                    |
| ---------------------- | ------------------ | ------------------------------------------ | ------------------------- |
| `session.js`           | Invariato          | + WebSocket upgrade handler                | Wrappato in Colyseus Room |
| `roundOrchestrator.js` | Invariato          | Invariato (puro, no I/O)                   | Invariato                 |
| Frontend               | Split-screen/turni | WebSocket client                           | Colyseus client SDK       |
| `playerView()`         | Opzionale          | **Necessario** (hide AI intent per client) | Necessario                |
| Test                   | Locale             | + test WS (mock client)                    | + test Room               |

## Prerequisiti per Fase 2

1. `playerView(state)` implementato (da pattern boardgame.io — ~15 righe in sessionHelpers.js)
2. `enumerateLegalActions(state, unitId)` per validare intent client-side
3. Schema eventi WebSocket definito in `packages/contracts/`

## Conseguenze

- MVP lancia con hotseat co-op. Coerente con target "couch co-op TV-first."
- Fase 2 non richiede rewrite — WebSocket è layer addizionale sopra REST.
- `roundOrchestrator.js` resta puro e testabile indipendentemente dal transport.
- Nessuna dipendenza npm nuova in Fase 1. Solo `ws` (~0 deps) in Fase 2.

## Riferimenti

- `ADR-2026-04-15: Round-based combat model`
- `docs/core/02-PILASTRI.md` — Pilastro #5 Co-op vs Sistema
- `docs/planning/draft-target-audience.md` — piattaforme e contesto d'uso
- boardgame.io pattern extraction — playerView, activePlayers
- colyseus/colyseus (GitHub 6.8k) — reference per Fase 3
