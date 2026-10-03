---
title: 'OD-058 D3 -- coop vcSnapshot server-side (ledger replay) evidence'
date: 2026-06-10
type: report
doc_status: active
doc_owner: master-dd
workstream: combat
last_verified: '2026-06-10'
source_of_truth: false
language: it
review_cycle_days: 90
tags: [evo-tactics, od-058, vc, coop, debrief, replay, parity, trust-the-host]
---

# OD-058 D3 -- coop vcSnapshot server-side dal ledger (replay) -- evidence

Issue tracker: #2531 (blocco D3, 3 box -- ULTIMO residuo OD-058).
Contesto: il debrief coop arrivava SOLO dall'host via `POST /coop/combat/end`
(`debrief_payload` host-authored, Bundle C 2026-05-15) = trust-the-host. D3
sposta la derivazione VC server-side: replay-from-event-log sul ledger della
sessione combat linkata (`coopStore.linkSession`, `session.events`).

## Cosa e' stato costruito (3 box D3)

### Box 1 -- ricostruzione vcSnapshot server-side dal ledger coop

`apps/backend/services/coop/vcLedgerReplay.js` (nuovo, thin):

- `replayVcSnapshotFromLedger(session, {formPulses, telemetryConfig})` --
  rebuild via `vcScoring.buildVcSnapshot` sullo STESSO ledger
  (`session.events`) che il round engine (`roundOrchestrator` /
  `sessionRoundBridge`) e l'ingest SPEC-A (`/device-event`) popolano.
  Idratazione Form Pulse parity con `/end` (guard `!session.formPulses`,
  read-only: la sessione NON viene mutata).
- `replayDebriefFromLedger(...)` -- aggiunge `debrief_payload` (serializer
  pinned) + `events_count` + `actor_events_count` (solo eventi attribuiti:
  `session_start` lifecycle con actor null NON rende un ledger replayable).
- `unitStatsById` -- spostata qui da `routes/session.js` (closure) = impl
  canonical unica per /end + /:id/vc + replay coop (anti-drift, semantica
  verdetto #2679 Q2-bis preservata).
- Kill switch: `COOP_VC_LEDGER_REPLAY=0|false|off` (default ON).

Wire: `app.js` passa `getCombatSession` (accessor read-only
`sessionRouter.getSessionById`) a `createCoopRouter`; `/coop/combat/end`
ricostruisce e usa il payload server quando il ledger ha eventi attribuiti.

### Box 2 -- vcSnapshotToDebriefPayload non piu' orphan (prodotto dal replay)

Prima: serializer prodotto solo dal flusso session (`/end` + `/:id/vc`,
#2463) -- il path coop lo riceveva pre-composto dall'host. Ora
`/coop/combat/end` lo PRODUCE dal replay del proprio ledger:
`buildVcSnapshot -> vcSnapshotToDebriefPayload(snapshot, unitStatsById)` --
identico pipeline del flusso single. Il payload host e' ignorato quando il
replay e' disponibile (divergenza loggata + `host_payload_divergent` nella
response, additive). `run.debrief` resta shape PINNED Godot #276 (solo
`per_actor` + `recruit_candidates` opzionale): nessun campo nuovo dentro il
payload broadcast.

### Box 3 -- parity-check coop<->single (pattern Godot #371, versione Node)

`tests/api/coopVcLedgerReplay.test.js` -- contract: stesso ledger ->
`run.debrief` (path coop replay) `deepEqual` `GET /:id/vc debrief_payload`
(path single). Mirror Node di `test_combat_engine_parity_contract.gd`
(Game-Godot-v2 #371): due path che leggono lo stesso event log devono
produrre payload byte-identici.

## Policy fallback (Opzione 2: combat resolution resta client-side)

| Caso                                                  | Esito                                  |
| ----------------------------------------------------- | -------------------------------------- |
| Sessione linkata + ledger con eventi attribuiti       | replay server AUTHORITATIVE (`ledger_replay`) |
| Host payload presente e divergente dal replay         | replay vince, `host_payload_divergent: true` + warn log |
| Nessuna sessione linkata (orch.sessionId null)        | legacy host passthrough (`host`)       |
| Ledger inerte (solo `session_start`, combat client-side Godot) | host fallback (`host`)         |
| `COOP_VC_LEDGER_REPLAY=0`                             | legacy host passthrough (kill switch)  |

Outcome / survivors / xp restano host-reported: D3 sposta SOLO la derivazione
VC (scope lettera issue #2531 "Opzione 2, combat stays client-side").

## Evidence (TDD, run 2026-06-10)

- RED verificato: 3 unit fail (`actor_events_count` assente) + 7/7 API fail
  (wire assente) PRIMA dell'implementazione.
- GREEN: unit `tests/services/coop/vcLedgerReplay.test.js` **11/11** + API
  `tests/api/coopVcLedgerReplay.test.js` **7/7** (incl. parity contract +
  spoof-rejection: actor host-inventato NON sopravvive al replay).
- Area regression: 56/56 (sessionVcDebriefPayload, vcSnapshotToDebriefPayload,
  coopBroadcastDebriefPayload, coop-recruit-candidates, coopDebrief,
  coopRoutes) -- back-compat legacy intatta (i test coop esistenti non linkano
  sessioni -> path invariato).
- Suite: tests/services area 175/175 -- tests/ai 502/502 -- full `tests/api`
  vedi PR (gate pre-push).

## Vincoli rispettati

- Raw event schema `{action_type,turn,actor_id,target_id,damage_dealt,result,
  position_from,position_to}` -- INVARIATO (replay = solo lettura).
- `debrief_payload` schema PINNED Godot #276 -- INVARIATO (i campi additive
  `debrief_source`/`host_payload_divergent` stanno nella response REST di
  `/coop/combat/end`, NON nel payload broadcast).
- `packages/contracts/` -- non toccato.

## Caveat / forward-work

- **Ledger sparso Godot**: se in futuro il client Godot streama QUALCHE evento
  attribuito (device decision-events con actor bound) senza streamare il
  combat completo, il replay diventa authoritative su un ledger parziale ->
  payload piu' povero del client-side host. Mitigazione attuale = soglia
  `actor_events_count > 0` + kill switch. Knob da rivedere quando il flusso
  Godot streaming sara' definito (non bloccante oggi: il path Godot coop senza
  sessione server non linka -> fallback host pulito).
- `host_payload_divergent` e' telemetria di transizione: quando i client
  smettono di POSTare `debrief_payload`, il campo muore naturalmente.
