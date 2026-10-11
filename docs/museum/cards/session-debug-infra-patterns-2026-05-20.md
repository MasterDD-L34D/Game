---
title: Session Debug & Playtest Infra — 6 pattern riusabili
museum_id: M-2026-05-20-002
type: mechanic
domain: [architecture]
provenance:
  found_at: tests/api/sessionTestHelpers.js + apps/backend/routes/session.js:3407-3479 + apps/backend/services/combat/rewindBuffer.js + tests/api/coopDisconnectRace.test.js:95-107 + apps/backend/routes/coop.js:101-104
  git_sha_first: '44daa5a5 (sessionTestHelpers) | 7be3aef7 (rewindBuffer+replay) | f53093d0 (seedWorldSetup) | 923e55f0 (listBiomeRoleDemands)'
  git_sha_last: '66be60bb 2026-05-15 (session.js) | cd8c7425 2026-05-20 (coopDisconnectRace) | 923e55f0 2026-05-20 (coop route)'
  last_modified: 2026-05-20
  last_author: MasterDD-L34D
  buried_reason: unintegrated
relevance_score: 5
reuse_path: 'tests/api/sessionTestHelpers.js (tutti i 7 export) + GET /api/session/:id/replay + GET /api/coop/role-demands + BRAVADO_ENABLED=true flag'
related_pillars: [P1, P5, P6]
status: excavated
excavated_by: repo-archaeologist
excavated_on: 2026-05-20
last_verified: 2026-05-20
---

# Session Debug & Playtest Infra — 6 pattern riusabili

## Summary (30s)

- **6 infra pattern** scoperti in backend + test layer, tutti operativi, zero documentazione pubblica. Accelerano setup playtest/calibration di 1-3h per sessione.
- Pattern vanno da factory fixture per unit test rapido a endpoint read-only per diagnostica live a env flag per attivare comportamenti opzionali.
- Rilevanza immediata: prossima sessione playtest/calibration può pre-caricare scenario, ispezionare state mid-combat, e rieseguire eventi senza restart.

---

## What was buried

### P1 — `sessionTestHelpers.js` factory suite (7 export)

File: `tests/api/sessionTestHelpers.js` — 163 LOC, estratto da 4 test file duplicati (PR #1404).

Export riusabili:

| Funzione                                | Cosa fa                                                    | Parametri chiave                                           |
| --------------------------------------- | ---------------------------------------------------------- | ---------------------------------------------------------- |
| `twoUnits(overrides)`                   | Fixture 2-unit p1+sis con override granulare               | `p1Hp, p1Pos, p1Mod, sisHp, sisRange, p1Status, sisStatus` |
| `startSession(app, units)`              | POST /api/session/start → restituisce session_id           | units array (default = twoUnits())                         |
| `playerAttack(app, sid, actor, target)` | POST /api/session/action attack                            | —                                                          |
| `turnEnd(app, sid)`                     | POST /api/session/turn/end                                 | —                                                          |
| `getState(app, sid)`                    | GET /api/session/state → body                              | —                                                          |
| `createFlaggedApp(flagValue)`           | App con USE_ROUND_MODEL preset + cleanup                   | restore() + close()                                        |
| `runDual(units, scenario)`              | Esegue scenario su flag-off + flag-on, ritorna `{off, on}` | Utile per A/B regression                                   |

`p1Mod: 99` forza hit deterministico (d20 + 99 vs DC ~10 = sempre hit). Pattern da PR #2271 flaky-fix.

### P2 — `GET /api/session/:id/replay` read-only endpoint

File: `apps/backend/routes/session.js:3407-3432`

Espone `session.events` + `units_snapshot_initial` per qualsiasi sessione in-memory. Schema validato: `packages/contracts/schemas/replay.schema.json`.

Response shape:

```json
{
  "session_id": "...",
  "events": [{ "action_type", "turn", "actor_id", "target_id", "damage_dealt", "result", ... }],
  "units_snapshot_initial": [...],
  "meta": { "turns_played": N, "events_count": N, "export_version": 1 }
}
```

No auth required (readonly). Mulberry32 deterministic seed per smoke E2E + replay determinism (`session.js:3043`). Endpoint live, zero client che lo consuma.

### P3 — `POST /api/session/telemetry` append-only JSONL

File: `apps/backend/routes/session.js:3445-3479`

Batch append fino a 200 eventi per call → `logs/telemetry_YYYYMMDD.jsonl`. Pattern Rainbow Six Siege "Unfun matrix": cattura `ui_error`, `input_latency_ms`, `client_fps`, confusion signals. Schema payload libero (soft validation).

```
POST /api/session/telemetry
{ session_id, player_id, events: [{ ts, type, payload }] }
→ { ok: true, appended: N, log_path: "telemetry_20260520.jsonl" }
```

### P4 — `seedWorldSetup(coopStore, roomCode, playerIds)` coop factory

File: `tests/api/coopDisconnectRace.test.js:95-107` (SHA cd8c7425)

Salta character_creation onboarding, porta orchestratore direttamente a `world_setup` phase. Usato 4× nello stesso file per scenari disconnect-race. NON esportato da modulo separato (copiare inline).

```js
function seedWorldSetup(coopStore, roomCode, playerIds) {
  const orch = coopStore.getOrCreate(roomCode);
  orch.startRun({ scenarioStack: ['enc_tutorial_01'] });
  for (const pid of playerIds) {
    orch.submitCharacter(
      pid,
      { name: `char_${pid}`, form_id: 'istj_custode' },
      { allPlayerIds: playerIds },
    );
  }
  assert.equal(orch.phase, 'world_setup');
  return orch;
}
```

### P5 — `GET /api/coop/role-demands` diagnostic route

File: `apps/backend/routes/coop.js:101-104` (SHA 923e55f0, 2026-05-20)

Lista 13 biome → role demand mapping. Read-only, no auth. Frontend onboarding HUD può preload expectation. Utile per calibrazione coop: verificare che la party soddisfi le richieste di ruolo del bioma scelto.

```
GET /api/coop/role-demands
→ { count: 13, items: [{ biome_id, roles_demanded: {...}, total_slots }] }
```

### P6 — Env flag cluster non documentato (7 flag)

File vari. Nessuno in README o CLAUDE.md (verificato grep 2026-05-20).

| Flag                      | Default | Effetto                                     | File:line             |
| ------------------------- | ------- | ------------------------------------------- | --------------------- |
| `BRAVADO_ENABLED=true`    | OFF     | Attiva bravado morale su kill               | session.js:782        |
| `NIDO_UNLOCKED=true`      | OFF     | Bypass gate nido (dev test)                 | sessionHelpers.js:357 |
| `VC_AXES_ITER=1\|2`       | auto    | Forza iter vcScoring (1=legacy, 2=extended) | vcScoring.js:901-903  |
| `MBTI_REVEAL_THRESHOLD=N` | auto    | Override soglia reveal MBTI                 | mbtiSurface.js:165    |
| `LOBBY_LOG_DISABLED=1`    | OFF     | Silenzia WS lobby log                       | wsSession.js:47       |
| `REWIND_BUFFER_SIZE=N`    | 3       | Snapshot buffer per rewind                  | rewindBuffer.js:27    |
| `PRISMA_LOG_QUERIES`      | OFF     | Log SQL queries Prisma                      | db/prisma.js:106      |

`BRAVADO_ENABLED` è il più utile per playtest: attiva morale bravado senza code change.

---

## Why it was buried

Tutti i pattern sono **unintegrated by design** — sviluppati come tooling interno di test/debug e mai surfacciati in doc developer-facing o playtest runbook. `sessionTestHelpers.js` è estratto da 4 file (PR #1404) ma referenziato solo da test suite, non da playtest script. Il replay endpoint (Q-001 T2.4 PR-2) ha schema contrattuale completo ma zero consumer. I flag env esistono da sprint separati senza catalogo centralizzato.

---

## Why it might still matter

- **P1 Tattica**: replay endpoint + telemetry JSONL = infra per analisi post-playtest (sessione attuale ha nightly cron AI sim già attiva, mancherebbe solo replay viewer).
- **P5 Co-op**: `role-demands` + `seedWorldSetup` accelerano setup scenario coop senza onboarding manuale (~15-20 min risparmiati per sessione playtest).
- **P6 Fairness**: `BRAVADO_ENABLED` + `REWIND_BUFFER_SIZE` sono knob calibrazione diretta per prossima sessione balance.

---

## Concrete reuse paths

1. **Minimal** (P0, ~1h): Documenta 7 env flag in `docs/ops/deploy-min-checklist.md` + `CLAUDE.md` sezione "Env flags debug". Zero code change. Elimina riscoperta per-sessione.

2. **Moderate** (P1, ~3h): Estrai `seedWorldSetup` in `tests/api/coopTestHelpers.js` come modulo condiviso (×1.3 route layer). Aggiungi `twoUnits` override `scenarioId` per scenario seed diretto. Script playtest `scripts/playtest-seed.js` chiama `startSession` + `POST /api/session/telemetry` auto-instrument.

3. **Full** (P2, ~8h): Replay viewer CLI (`tools/ts/replay-viewer.ts`): GET `/:id/replay` → pretty-print timeline + damage log. Feed `telemetry_YYYYMMDD.jsonl` in dashboard Nebula mock. Blast radius ×1.0 (pure tooling, no combat path).

---

## Sources / provenance trail

- `tests/api/sessionTestHelpers.js` — SHA 44daa5a5 (PR #1404 extract), last 66be60bb 2026-05-15
- `apps/backend/routes/session.js:3407-3479` — SHA 7be3aef7 (PR #2241 TKT-P6 rewind), last 66be60bb 2026-05-15
- `apps/backend/services/combat/rewindBuffer.js` — SHA 7be3aef7 2026-05-11
- `tests/api/coopDisconnectRace.test.js:95-107` — SHA f53093d0 (PR #2340), last cd8c7425 2026-05-20
- `apps/backend/routes/coop.js:101-104` — SHA 923e55f0 (PR #2336) 2026-05-20
- `apps/backend/services/vcScoring.js:901-903`, `sessionHelpers.js:357`, `wsSession.js:47`, `rewindBuffer.js:27`, `mbtiSurface.js:165`, `db/prisma.js:106` — vari sprint 2026-04→05

---

## Risks / open questions

- `seedWorldSetup` hardcoda `enc_tutorial_01` e `istj_custode` — per scenario diversity sweep serve parametrizzare `scenarioStack` e `form_id`.
- Replay endpoint non gestisce sessioni terminate da `>24h` (NeDB in-memory volatile) — per replay persistente serve dump JSONL post-session.
- `BRAVADO_ENABLED` non ha test coverage autonomo — attivare senza `morale.test.js` coverage rischia regressione silente.
- Schema drift potenziale: `units_snapshot_initial` in replay è `null` se sessione avviata senza snapshot flag (`Q-001 T2.4`). Consumer deve handle null.
