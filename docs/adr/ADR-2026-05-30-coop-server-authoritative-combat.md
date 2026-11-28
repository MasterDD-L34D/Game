---
title: 'ADR 2026-05-30 -- Co-op server-authoritative combat (vcSnapshot reconstruction)'
doc_status: active
doc_owner: master-dd
workstream: backend
last_verified: '2026-06-07'
source_of_truth: false
language: it
review_cycle_days: 30
related:
  - 'docs/core/00-SOURCE-OF-TRUTH.md'
  - 'docs/core/00D-ENGINES_AS_GAME_FEATURES.md'
  - 'docs/adr/ADR-2026-04-16-networking-co-op.md'
  - 'docs/adr/ADR-2026-04-16-networking-colyseus.md'
  - 'docs/adr/ADR-2026-06-07-device-authority-tv-mirror-canon.md'
---

# ADR-2026-05-30 - Co-op server-authoritative combat (vcSnapshot reconstruction)

**Stato**: ACCEPTED (decisione 2026-05-30; **formalizzata 2026-06-07** -- era gia'
citata come decision-of-record in SoT §24.1 / `00D §16.4` ma il file non esisteva).
**Supersedes**: `ADR-2026-04-16-networking-colyseus.md` (opzione rifiutata) +
`ADR-2026-04-16-networking-co-op.md` (draft incrementale).

## Contesto

Il co-op (4-8 player, TV + device) richiede (a) una architettura di rete e (b) una
decisione su DOVE risiede l'autorita' del combat. Tre opzioni di transport valutate
(SoT, sezione networking):

- **A. Express + Socket.io** -- minimo overhead, state-sync manuale.
- **B. Colyseus** -- state-sync delta automatico, rooms, matchmaking, ma nuova
  dipendenza pesante (stima 2-3 settimane di refactor `session.js` -> Colyseus Schema).
- **C. Custom WebSocket sul session engine** -- controllo totale, server source-of-truth.

In parallelo: il combat single-player e' client-side (SoT §24.1). In co-op serve che lo
scoring/evoluzione (vcSnapshot) NON sia cittadino-di-seconda-classe.

## Decisione

1. **Transport = Express WebSocket server-authoritative** (opzione C, **NON Colyseus**).
   Layer WS (`ws`) sopra le route session esistenti; server = source-of-truth per
   stato/fase/lobby/room/host-transfer/reconnect. Godot HTML5 usa un custom
   `WebSocketClient` verso il server Express (NO Godot MultiplayerAPI). Nessuna
   dipendenza Colyseus.
2. **Il combat resta client-side; il server RICOSTRUISCE `vcSnapshot` dal
   ledger/event-log** (D3 Opzione 2). Il server non risolve il combat: riceve
   l'event-log deterministico e ne ricostruisce lo scoring VC, cosi' il
   debrief/evoluzione co-op e' allineato al single-player senza violare SoT §24.1.
3. Coerente col canon device-authority (ADR-2026-06-07): TV = mirror; input/commit dai
   device; il server e' authoritative per lo STATO condiviso, non per l'input di gameplay.

## Conseguenze

- Scoring/evoluzione co-op = first-class (ricostruito server-side dal ledger).
- Nessuna dipendenza Colyseus; la rete resta Express WS (gia' in uso).
- `ADR-2026-04-16-networking-colyseus` (opzione B) e `ADR-2026-04-16-networking-co-op`
  (draft incrementale) sono **SUPERSEDED** da questo ADR.
- I riferimenti preesistenti (SoT §24.1, `00D §16.4`) ora risolvono a un
  decision-of-record reale.

## Evidenze

- `docs/core/00-SOURCE-OF-TRUTH.md` (opzioni networking A/B/C + §24.1 combat client-side).
- `docs/core/00D-ENGINES_AS_GAME_FEATURES.md` §16.4 (vcSnapshot ricostruito dal ledger).
- `docs/planning/2026-04-29-master-execution-plan-v3.md` ("keep Express WS server
  authoritative, NO Godot MultiplayerAPI").
