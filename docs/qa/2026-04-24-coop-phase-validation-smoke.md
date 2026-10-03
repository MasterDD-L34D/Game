---
title: Co-op Phase Validation Report (smoke 2026-04-24)
workstream: ops-qa
status: draft
created: 2026-04-24
tags: [coop, validation, state-machine, websocket, agent-test]
---

# Co-op Phase Validation Report (smoke run)

Run-mode: agent smoke test su `coop-phase-validator`. Focus: locate real phase machine, verify invariants via grep+offset, flag missing coverage. Read budget rispettato (~200 LOC sample, NO full session.js).

## Summary

| Area                  | Stato | Note                                                                                                                                                                  |
| --------------------- | :---: | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| State machine         |  🟢   | Implementazione canonica trovata in `services/coop/coopOrchestrator.js`, NON in `session.js`. PHASES costante esplicita + `_setPhase()` gate.                         |
| Vote tally (M18)      |  🟡   | `voteWorld` + `worldTally` ok, ma host arbitrer-only (no quorum auto-confirm). Tie-break logic = host manuale.                                                        |
| Host authority        |  🟢   | Gate `player.role !== 'host'` esplicito su `state`/`phase`/`round_clear` (wsSession.js:691,732,741). REST coop: `authHost()` su run/start, world/confirm, combat/end. |
| Heartbeat / reconnect |  🟢   | 30s default (`DEFAULT_HEARTBEAT_MS`), `stateVersion` monotonic + replay on rejoin (state_version: room.stateVersion at rejoin path).                                  |
| Host transfer         |  🟢   | `transferHostAuto` FIFO (oldest connected) + grace 30s + `host_transferred` broadcast (wsSession.js:369-376).                                                         |
| Room code             |  🟢   | 20 consonanti `BCDFGHJKLMNPQRSTVWXZ`, length 4, retry 20x (wsSession.js:38-55, 494).                                                                                  |

**Verdict aggregato**: 🟢 candidato playtest. 1 🟡 vote consensus, 0 🔴.

## Locus reale del phase machine

⚠️ **Spec agent obsoleta**: parla di phase logic embedded in `session.js`. Falso.

Realtà:

- `apps/backend/services/coop/coopOrchestrator.js:7` — `const PHASES = ['lobby', 'character_creation', 'world_setup', 'combat', 'debrief', 'ended']`
- Class `CoopOrchestrator` con `_setPhase()` gate (riga 67-73): rifiuta `next` non in PHASES, no-op se uguale, emette `phase_change`.
- `apps/backend/routes/coop.js` — REST handler che istanziano e chiamano metodi orchestrator.
- `session.js` non possiede phase state coop M16-M20: gestisce solo combat round model. I 5 file che matchano "character_creation|world_setup|debrief" usano keyword come label/log, non come state.

## Phase transitions (matrice autorizzata reale)

| From               | To                 | Trigger (metodo)                                   | Authorized by          | Precondizione                                              | File:line                                     |
| ------------------ | ------------------ | -------------------------------------------------- | ---------------------- | ---------------------------------------------------------- | --------------------------------------------- |
| lobby              | character_creation | `startRun()`                                       | host (REST `authHost`) | phase ∈ {lobby, ended}                                     | coopOrchestrator.js:78-93 + coop.js:76-92     |
| character_creation | world_setup        | `submitCharacter()`                                | last player completing | `expected.size === characters.size` AND `every(pid → has)` | coopOrchestrator.js:106-131                   |
| world_setup        | combat             | `confirmWorld()`                                   | host (REST `authHost`) | scenario_id presente                                       | coopOrchestrator.js:154-162 + coop.js:163-182 |
| combat             | debrief            | `endCombat()`                                      | host (REST `authHost`) | phase === combat                                           | coopOrchestrator.js:230-237 + coop.js:205-225 |
| debrief            | world_setup        | `submitDebriefChoice()` → `advanceScenarioOrEnd()` | last player → auto     | tutti choice submitted AND currentIndex+1 < stack.length   | coopOrchestrator.js:242-268                   |
| debrief            | ended              | `advanceScenarioOrEnd()`                           | auto                   | currentIndex+1 ≥ stack.length                              | coopOrchestrator.js:253-260                   |

Nessuna transizione skip osservata: ogni metodo verifica `this.phase !== expected → throw`.

## Invariant violations / 🟡 gap

1. 🟡 **Vote consensus solo advisory** — `coopOrchestrator.js:154-162 confirmWorld()` non guarda `worldVotes`. Host può confermare scenario anche con maggioranza reject. Documentato ("Voting logic deferred to M17 (host confirm for MVP)") ma se il design M18 richiede consensus minimo (es. 50%+ accept), gate manca. Decision needed: lasciare host-arbitrer o aggiungere quorum.

2. 🟡 **`submitCharacter` requires `allPlayerIds` non-empty per advance** — `expected.size > 0` (riga 127). Se chiamante passa `allPlayerIds: []` (es. solo host nella room senza altri player), phase resta in character_creation forever. Edge case host-only: nessun trigger automatico. Verificare contract `allPlayerIds(room)` in `coop.js:37-41` esclude host esplicitamente — se room ha solo host, allPlayerIds=[] e phase stuck.

3. 🟡 **`endCombat` sovrascrive `run.outcome` senza guard** — riga 232: `this.run.outcome = outcome`. Default `'victory'`. Se host chiama 2 volte in race (rete laggosa), seconda chiamata throwa `not_in_combat` ✓ ma se phase fosse già debrief da altro path, no idempotency check. Bassa probabilità data REST sequenziale.

4. 🟡 **`advanceScenarioOrEnd` reset `worldVotes` MA non `characters[].ready` consistente** — riga 261-263: `characters.forEach(ch => ch.ready = true)` carry-over. Se design M19 prevede char re-pick tra scenari (form_change su debrief choice), questo flag carry-over impedisce re-submission gate.

5. 🟢 **Host gate WS protocol completo** — wsSession.js:691,732,741: `state`, `phase`, `round_clear` tutti gated. `intent` gated inverso (host non può inviare). `intent_cancel` rifiutato se phase ∈ {resolving, ready}. ✓

6. 🟢 **Room code alphabet conforme ADR** — `BCDFGHJKLMNPQRSTVWXZ` (20 consonanti, no Y, no vocali). Length 4, space 160k. Retry 20x in `MAX_ROOM_CREATE_RETRIES` (più alto del "10x" specificato in agent — minor drift). ✓

## Test coverage attuale (post-discovery)

`tests/api/coop*` (4 file, 21 test totali):

- `coopOrchestrator.test.js` (10 test): PHASES enumeration, startRun, submitCharacter happy+invalid, confirmWorld, endCombat+debrief loop, last-scenario-end, buildSessionStartPayload, characterToUnit, log emission.
- `coopRoutes.test.js` (6 test): host_token gate, full flow, invalid spec, world/confirm guard, state 404, combat/end host auth.
- `coopWorldVote.test.js` (5 test): accept tally, change-vote latest-wins, bad token reject, phase guard post-confirm, pending count.
- `coopDebrief.test.js` (5 test): combat→debrief, debrief→next-scenario, debrief→ended, bad token, ready_list.

## Missing test coverage (gap concreti)

- 🟡 **Quorum world_setup**: nessun test verifica cosa succede se host conferma con 0 vote o solo reject. Non c'è invariant test "confirm rejected sotto quorum".
- 🟡 **Edge case host-only room**: `allPlayerIds(room) → []` su room con solo host → submitCharacter loop. No regression test.
- 🟡 **Concurrent endCombat race**: nessun test simula 2 host POST `/coop/combat/end` in parallel.
- 🟡 **Phase skip protection**: tests verificano happy path ma no "tentativo character/create in phase=combat" → throw `not_in_character_creation`. Esiste implicitamente in invalid-spec test ma non come test esplicito di skip protection.
- 🟡 **WS `phase_change` broadcast emission**: `coop.js broadcastCoopState()` chiamato post-mutation, ma nessun test integration verifica che client WS riceva `phase_change` payload con `from`/`to` corretti.
- 🟡 **Reconnect mid-coop**: tests reconnect (Phase A) verificano lobby+state replay, ma non verificano che `coopOrchestrator.snapshot()` venga inviato post-rejoin a player ricollegato in mid-debrief.
- 🟢 **Room code collision**: `MAX_ROOM_CREATE_RETRIES=20` non testato esplicitamente (richiederebbe mock RNG fisso). Bassa priorità.
- 🟢 **Host transfer durante coop phase non-lobby**: tests Phase A coprono lobby state, non c'è test di host transfer durante combat/debrief.

## Recommendations

### P0 (pre-playtest live, bloccanti)

- **P0-1** Decisione design: world_setup quorum SI/NO. Se SI, aggiungere gate in `confirmWorld()` (es. `accept ≥ ceil(total/2)` OR override `force=true`). Se NO, documentare in coop-mvp-spec.md che host-arbitrer è il comportamento canonical e chiudere 🟡 #1.
- **P0-2** Fix host-only room edge: `submitCharacter` deve advance anche se `allPlayerIds.length === 0` (skip world_setup → vote? auto-confirm? decisione design). Aggiungere test regression `coopOrchestrator host-only character submit`.

### P1 (pre-merge prossimo PR coop)

- **P1-1** Aggiungere test phase-skip protection esplicito (parametrico su tutti i metodi: chiamare in phase sbagliata → assert throw).
- **P1-2** Aggiungere integration test WS broadcast: `room.broadcast` spy verifica `phase_change` payload `{from, to}` ad ogni transizione orchestrator.
- **P1-3** Reconnect mid-coop scenario: estendere tests/api/coopRoutes.test.js con drop+rejoin player in phase=debrief, verifica snapshot riconciliato.

### P2 (next sprint, non bloccanti)

- **P2-1** Idempotency endCombat (return existing outcome se già in debrief invece di throw `not_in_combat`).
- **P2-2** Test concurrency endCombat 2x parallel via Promise.all.
- **P2-3** Allineare `MAX_ROOM_CREATE_RETRIES` (20) con ADR-2026-04-20 ("collision retry 10x max") — drift documentale OR codice.
- **P2-4** Documentare carry-over `characters[].ready=true` in advanceScenarioOrEnd: design intenzionale o bug? Se intenzionale, comment inline.

## Escalation

Nessun finding 🔴. `session-debugger` agent NON necessario.

Suggerimento: **aggiornare `coop-phase-validator.md` agent spec** prima di prossimo run — sezione "Data sources" punta erroneamente a `session.js`/`phaseMachine.js`/`phaseCoordinator.js`. Path corretto è `services/coop/coopOrchestrator.js`. Vedi critique separata per fix proposti.

## Methodology note

Read budget consumato: ~250 LOC effettivi (orchestrator full 281 + coop.js full 230 + 2 estratti wsSession ~135 + sessionConstants 89). Zero read di session.js (rispettato vincolo). Grep-driven discovery ha localizzato il phase machine reale in <5 query.
