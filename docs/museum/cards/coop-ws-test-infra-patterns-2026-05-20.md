---
title: Coop WS Test Infrastructure Patterns — disconnect race + host-transfer e2e
museum_id: M-2026-05-20-001
type: architecture
domain: [architecture]
provenance:
  found_at: tests/api/lobbyWebSocket.test.js + tests/api/coopWsRebroadcast.test.js + tests/services/network/wsSession-ghost.test.js + tests/services/network/wsSession-resume.test.js + tests/api/coopOrchestrator.test.js + tests/api/coopWorldVote.test.js
  git_sha_first: db4325f0 # lobbyWebSocket initial M11 Phase A
  git_sha_last: 0ce921540842f4b6327a2e4c9dfde65c3be2310b # coopOrchestrator.test.js 2026-05-20
  last_modified: 2026-05-20
  last_author: MasterDD-L34D
  buried_reason: unintegrated
relevance_score: 5
reuse_path: tests/api/coopWorldVote.test.js + tests/services/network/wsSession-ghost.test.js + tests/api/coopWsRebroadcast.test.js — compose 2 new test files for disconnect-race + host-transfer e2e
related_pillars: [P5]
status: excavated
excavated_by: repo-archaeologist
excavated_on: 2026-05-20
last_verified: 2026-05-20
---

# Coop WS Test Infrastructure Patterns

## Summary (30s)

- 6 test file con pattern WS testabili standalone via `spinUp()` + `LobbyService` in-memory. Zero server esterno richiesto.
- Pattern `attachBuffer/waitForMessage/openWs/spinUp` duplicato in ogni file ma con piccole variazioni — riusabile as-is per i 2 test mancanti.
- `worldTally(connectedPlayerIds)` e `ghostTimeoutMs` sono entrambi testabili direttamente senza WS overhead per unit cases.

## What was buried

Sei file di test coprono l'infrastruttura WS coop ma NON includono:

1. **Multi-player disconnect race durante vote attivo** — il path `B-NEW-1 fix 2026-05-08` in `wsSession.js:1516` che filtra `connectedPids` è testato a livello unit in `coopOrchestrator.test.js:106` (solo `worldTally` pure-function), ma NON ha test WS end-to-end: player vota via WS intent `world_vote`, poi disconnette (`.close()`), il tally successivo deve contenere `connected_total = 1` (non 2) e `all_connected_accepted = true`.

2. **Host-transfer + coop-state sync e2e con `coopStore`** — `coopWsRebroadcast.test.js` testa `phase_change + character_ready_list` (F-1) ma NON testa `world_tally` rebroadcast (riga `wsSession.js:997` + `wsSession.js:1036`) dopo host-transfer in `world_setup` phase. Il test esistente usa `hostWs.close()` (graceful, 80ms grace) — il pattern `hostWs.terminate()` (abrupt, zero grace) è usato solo in `lobbyWebSocket.test.js:429` per `round_ready` replay.

### Pattern riusabili identificati

**P1 — `spinUp()` factory** (`tests/api/lobbyWebSocket.test.js:80-90`, `tests/api/coopWsRebroadcast.test.js:62-71`):

```js
async function spinUp(coopStore) {
  const lobby = new LobbyService();
  const wsHandle = createWsServer({ lobby, coopStore, port: 0 });
  await new Promise((resolve) => {
    if (wsHandle.wss.address()) return resolve();
    wsHandle.wss.on('listening', () => resolve());
  });
  return { lobby, port: wsHandle.wss.address().port, wsHandle };
}
```

Differenza chiave: `coopWsRebroadcast.test.js` accetta `coopStore` opzionale (pattern F-1 backward-compat). Per i test nuovi passare sempre `createCoopStore({ lobby })`.

**P2 — `attachBuffer/waitForMessage` predicate-based** (`tests/api/lobbyWebSocket.test.js:28-66`):
Buffer accumula tutti i messaggi WS ricevuti; `waitForMessage(ws, predicate, timeoutMs)` controlla buffer esistente PRIMA di attendere nuovi. Evita race condition listener-attachment. Timeout 3000ms default, overridable.

**P3 — `ghostTimeoutMs` e `hostTransferGraceMs` configurabili per test** (`tests/services/network/wsSession-ghost.test.js:185`):

```js
const meta = lobby.createRoom({ hostName: 'Alice' });
const room = lobby.getRoom(meta.code);
room.ghostTimeoutMs = 80; // post-create override
```

Oppure via costruttore: `lobby.createRoom({ hostName: 'Alice', hostTransferGraceMs: 50 })`. Entrambi usati in test esistenti. Tight window (50-80ms) rende test veloci senza `sleep` lungo.

**P4 — `room.players.values()` filtra `.connected` per quorum** (`wsSession.js:1518-1520` — pattern già usato in produzione, da replicare nel test):

```js
const connectedPids = Array.from(room.players.values())
  .filter((p) => p.connected && p.id !== room.hostId && p.role !== 'host')
  .map((p) => p.id);
```

Il campo `.connected` su ogni player è `true` quando il socket WS è attivo, `false` dopo `close/terminate`. Verificabile via `room.players.get(pid).connected`.

**P5 — `coopStore.getOrCreate(code)` per seedare `orch.phase` pre-test** (`coopWsRebroadcast.test.js:91-98`):

```js
const orch = coopStore.getOrCreate(room.code);
orch.startRun({ scenarioStack: ['enc_tutorial_01'] });
orch.submitCharacter(
  p1.player_id,
  { name: 'Bobby', form_id: 'istj_custode' },
  { allPlayerIds: [p1.player_id] },
);
assert.equal(orch.phase, 'world_setup');
```

Permette di portare l'orchestrator in `world_setup` prima di aprire WS, così i test di vote possono iniziare direttamente dal voto senza simulare l'intero onboarding.

**P6 — `hostWs.terminate()` vs `hostWs.close()`** (`lobbyWebSocket.test.js:429`):
`terminate()` = abrupt disconnect (simula crash/network drop). `close()` = graceful (WebSocket CLOSE frame). Per test disconnect-race usare `terminate()` se vuoi simulare drop improvviso; per host-transfer graceful usare `close()` + aspettare `player_disconnected` prima di procedere.

## Why it was buried

Non sepolti in senso proprio: i pattern esistono e funzionano. Il gap è che i 2 test mancanti richiedono **composizione** di pattern da file diversi (`coopOrchestrator.test.js` unit + `coopWsRebroadcast.test.js` WS integration + `wsSession-ghost.test.js` timing). Nessun singolo file copre entrambi i layer (WS intent → coop orchestrator → tally connected-only).

## Why it might still matter

- BACKLOG ha 2 entry esplicite: "Multi-player disconnect race test" + "Host-transfer + coop-state sync e2e".
- P5 Co-op confirmed 🟢 ma test coverage gap = regression risk su ogni refactor `wsSession.js` vote path.
- `B-NEW-1 fix 2026-05-08` (connected-only quorum) è il bug più recente nel path — zero WS-level regression test per quel fix specifico.

## Concrete reuse paths

### 1. Minimal — disconnect race unit test (P0, ~1.5h)

File: `tests/api/coopOrchestrator.test.js` (append).

```js
test('worldTally: player voted then disconnected counts only in connected tally', () => {
  const co = new CoopOrchestrator({ roomCode: 'DISC', hostId: 'p_h' });
  co.startOnboarding({ scenarioStack: ['enc_demo'] });
  co._setPhase('world_setup');
  const allIds = ['p_a', 'p_b'];
  // p_a vota accept, poi p_b droppe prima di votare.
  co.voteWorld('p_a', { accept: true, allPlayerIds: allIds, connectedPlayerIds: allIds });
  // p_b ora disconnesso — connectedIds = solo p_a.
  const connectedIds = ['p_a'];
  const tally = co.worldTally(allIds, connectedIds);
  assert.equal(tally.accept, 1);
  assert.equal(tally.connected_total, 1);
  assert.equal(tally.all_connected_accepted, true); // p_b offline non blocca
  assert.equal(tally.connected_pending, 0);
});
```

Effort: ~1h (puro unit, nessun WS, pattern da `coopOrchestrator.test.js:106` già esistente).

### 2. Moderate — disconnect race WS e2e (P1, ~3h)

Nuovo file: `tests/api/coopDisconnectRace.test.js`.

Setup: `spinUp(coopStore)` da `coopWsRebroadcast.test.js`. Seed orchestrator in `world_setup` (P5). Connetti host + p1 + p2 WS. p1 invia `intent {action:"world_vote", accept:true}`. p2 disconnette via `p2Ws.close()`. Aspetta `player_disconnected` su host. p1 invia secondo vote (o check tally via `world_tally` broadcast). Assert `tally.connected_total === 1` + `tally.all_connected_accepted === true`.

Effort: ~2.5-3h (WS setup + timing + assert `world_tally` broadcast).
Blast radius: ×1.0 (test-only, zero produzione).

### 3. Full — host-transfer + coop-state sync e2e (P1, ~3h)

Nuovo file: `tests/api/coopHostTransferSync.test.js`.

Estende `coopWsRebroadcast.test.js` F-1 pattern. Seed orchestrator in `world_setup` con p1 vote già registrato. Host droppe (`hostWs.terminate()`, `hostTransferGraceMs: 50`). Aspetta `host_transferred` su p1 (promosso). Assert che p1 riceva:

- `phase_change { phase: 'world_setup', reason: 'host_transferred' }` (già testato F-1)
- `character_ready_list` snapshot (già testato F-1)
- **`world_tally` snapshot** — questo è il gap. `wsSession.js:997` invia `world_tally` in `_rebroadcastCoopState` ma F-1 non lo asserta.

Effort: ~2.5-3h (extend F-1, add `world_tally` assert).
Blast radius: ×1.0 (test-only).

## Sources / provenance trail

- `tests/api/lobbyWebSocket.test.js` — SHA `355f12d4`, 2026-04-25. `spinUp` + `attachBuffer` + `waitForMessage` + `openWs` canonical. Test host-transfer `round_ready` replay (linee 371-443).
- `tests/api/coopWsRebroadcast.test.js` — SHA `b7abfe39`, 2026-04-24. `createCoopStore` integration + `phase_change` + `character_ready_list` post host-transfer. F-1 pattern.
- `tests/services/network/wsSession-ghost.test.js` — SHA `ec383a23`, 2026-05-03. `ghostTimeoutMs` override post-create + `player_left{ghost_timeout}` broadcast.
- `tests/services/network/wsSession-resume.test.js` — SHA `51097d9f`, 2026-05-03. `last_version` param su `openWs` + replay ordering invariant.
- `tests/api/coopOrchestrator.test.js` — SHA `0ce92154`, 2026-05-20. `worldTally(connectedPlayerIds)` unit test linee 106-134.
- `tests/api/coopWorldVote.test.js` — SHA `c259058c`, 2026-04-24. REST vote bootstrap pattern `bootstrapWorldSetup`.
- `apps/backend/services/network/wsSession.js` — `B-NEW-1 fix` linee 1516-1525 (connected-only quorum), `_rebroadcastCoopState` linee 994-1000 (world_tally send post host-transfer).

## Risks / open questions

- `attachBuffer/waitForMessage` duplicato in 5 file distinti con piccole variazioni (es. `openWs` in `wsSession-resume.test.js` accetta `last_version` opzionale). Se usi copy-paste per il nuovo test, includi la variante con `last_version` da `wsSession-resume.test.js:67-73` solo se necessario.
- `ghostTimeoutMs = 0` (default prod) vs override post-create nei test: non confondere con `hostTransferGraceMs`. Ghost = cleanup player non-host disconnesso. HostTransfer = promozione host disconnesso. Separati e non-interferenti.
- Il test "disconnect race" funziona SOLO se `coopStore` è passato a `createWsServer`. Senza `coopStore` il path `world_vote` intent è no-op (riga `wsSession.js:1506`).
- Nessun test attuale verifica il caso limite: player vota, poi si riconnette, poi il ghost timer NON spara — ma il suo voto rimane nel tally con `connected = true` di nuovo. Potenziale false-positive su `all_connected_accepted` se tally viene letto MENTRE il ghost timer è pending ma prima che spari. Non bloccante per i 2 test richiesti.
