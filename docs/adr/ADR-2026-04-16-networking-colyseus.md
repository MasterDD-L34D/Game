---
title: 'ADR-2026-04-16: Networking Co-op — Colyseus'
doc_status: active
doc_owner: platform-docs
workstream: cross-cutting
last_verified: 2026-04-16
source_of_truth: false
language: it-en
review_cycle_days: 30
---

# ADR-2026-04-16: Networking Co-op — Colyseus

- **Data**: 2026-04-16
- **Stato**: Proposto
- **Owner**: Team Backend
- **Stakeholder**: Frontend Squad (companion app), AI SIS (Sistema intents), QA (multiplayer test)

## Contesto

Co-op 4 giocatori vs Sistema e pilastro #5. Oggi il sistema gira single-machine: `session.js` (851 LOC) + `roundOrchestrator.js` con xstate FSM. Lo stato e gia autoritativo (server-side), manca solo il transport layer per broadcast a client remoti.

Requisiti: 4 giocatori simultanei, TV shared screen (host) + companion (client), planning simultaneo con intenti privati, reconnect, stato autoritativo.

## Opzioni valutate

### A. Express + Socket.io

- Pro: Express gia in uso (port 3334), overhead minimo, nessuna nuova dipendenza significativa
- Contro: state sync manuale (delta computation custom), no matchmaking, no reconnect built-in, no serializzazione ottimizzata
- Effort: 4-6 settimane

### B. Colyseus ← SCELTA

- Pro: state sync delta automatico con binary encoding, rooms + matchmaking built-in, reconnect nativo, turn-based supporto esplicito, MIT license, Node.js native, SDK multi-piattaforma (web, Unity, Godot)
- Contro: nuova dipendenza, porta separata o sub-route
- Effort: 2-3 settimane

### C. Custom WebSocket

- Pro: controllo totale
- Contro: tutto da implementare (sync, serialization, reconnect, lobby)
- Effort: 8-12 settimane

## Decisione

**Colyseus (opzione B).** Coesiste con Express su porta/route separata.

## Motivazioni

1. **Round model gia autoritativo**: `roundOrchestrator.js` ha `beginRound()`, `declareIntent()`, `commitRound()`, `resolveRound()`. Colyseus aggiunge solo transport + delta sync — non richiede riscrittura logica.
2. **State sync automatico**: delta-compression + binary encoding. Ogni fase round emette delta, broadcast a client. Planning phase: intenti privati per giocatore (playerView pattern da boardgame.io).
3. **Turn-based nativo**: Colyseus documenta supporto esplicito per giochi a turni. Room state riflette fase corrente xstate FSM.
4. **Reconnect**: built-in. Critico per sessioni TV (disconnessione companion WiFi).
5. **Express coesistenza**: Colyseus su porta separata o sub-route. Express (port 3334) resta per API/auth/mock. Zero conflitto.
6. **Effort minimo**: refactor `session.js` state → Colyseus Schema + room events. ~2-3 settimane.

## Conseguenze

### Positive

- Multiplayer co-op operativo con effort contenuto
- Companion app = client leggero che riceve stato filtrato (proprie unita + mappa visibile)
- Matchmaking/lobby gratis da Colyseus
- SDK multi-piattaforma per futuro companion mobile

### Negative

- Nuova dipendenza npm `colyseus` (richiede approvazione)
- Porta separata per WebSocket (o integrazione HTTP upgrade)
- Test multiplayer significativamente piu complessi

### Rischi

- Colyseus Schema potrebbe non mappare 1:1 su session state corrente — possibile adapter layer
- Performance da validare con 4 client + AI Sistema (throughput round)
- Companion app rendering fuori scope backend — richiede frontend dedicato

## Implementazione proposta

1. **Fase 1** (1 settimana): Colyseus room con Schema che wrappa session state. Endpoint round esposti come room messages.
2. **Fase 2** (1 settimana): playerView filter (intenti privati per giocatore durante planning). Reconnect test.
3. **Fase 3** (1 settimana): Companion client minimale (web, solo planning + VC view). Lobby/matchmaking.
4. Test: 4 client simulati, disconnect/reconnect, round completo, latenza.
