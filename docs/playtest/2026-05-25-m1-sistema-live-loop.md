# Playtest findings -- M1 Sistema live-loop validation (Game-side)

> Date: 2026-05-25 | PC: Ryzen (DESKTOP-T77TMKT) | Short goal: "M1 Sistema full
> wired Game<->Godot -- validate/playtest the live loop end-to-end".
> Scope of this report: **Game-side** (API + persistence). Godot-side render
> validation is tracked separately (still open).

## TL;DR

The M1 Sistema persistence loop is **validated Game-side, end-to-end, against a
real PostgreSQL database**. `units_observed` written by the store round-trips
back through a separate Prisma client (real cross-connection persistence), and
the raw Prisma JSON column (`@map unitsObserved` -> `units_observed`) holds the
payload. Logic-level coverage is green (18/18). The only remaining M1 work is
Godot-side render validation + a continuity-validation methodology (see Gaps).

## What was validated

### 1. Logic level -- 18/18 PASS

`node --test` on:

- `tests/ai/sistemaStateStore.test.js` -- DI store: `upsert` then `get`
  round-trip (asserts `kills_vs_sistema=3` reads back), stub-safety (absent
  model -> `{}` / no-op), null campaignId, best-effort throw-swallow.
- `tests/ai/sistemaStateFoldObservations.test.js` -- fold: sightings +1 per
  roster PG, kills accumulate, threat flips at 3, prior counters preserved when
  PG absent this encounter, corrupt high recomputed, malformed-input safe.
- `tests/ai/sistemaStateAccumulator.test.js`.

### 2. Real-Postgres e2e -- PASS

Method (one-shot ground-truth, not a CI test): a throwaway PostgreSQL 17
instance + `prisma migrate deploy` (migrations 0001-0013, incl.
`0011_sistema_state`) + a node script exercising the real
`createSistemaStateStore(new PrismaClient())`:

- **phase 1**: `upsert(cid, { p1: { kills_vs_sistema:3, sightings:4, threat_level:'high' } })` via client A, then `$disconnect()`.
- **phase 2**: `get(cid)` via a **separate** client B -> returns
  `units_observed.p1` intact (proves real persistence, not in-memory).
- **phase 3**: raw `sistemaState.findUnique` -> `unitsObserved` JSON column holds
  the payload (confirms the `@map` camelCase<->snake_case mapping + JSONB
  serialization round-trip).
- cleanup: test row deleted.

Result: `E2E RESULT: PASS` (all 5 assertions ok).

This closes the previously-flagged "stub-vs-live gap": the route/store tests run
with a fake prisma (`databasePath: null` -> `{}`), so the real DB persist+read
path had never been exercised. It has now.

## Loop wiring (confirmed, for reference)

- write: `apps/backend/services/coop/coopOrchestrator.js` folds per-encounter
  `{roster, kills}` via `foldObservations` into `units_observed` keyed by
  `run.id`, persisted best-effort through `createSistemaStateStore`.
- store: `apps/backend/services/ai/sistemaStateStore.js` (Prisma `sistemaState`,
  empty-safe when model/DATABASE_URL absent).
- read route: `GET /api/campaign/sistema-state?campaign_id=<id>`
  (`apps/backend/routes/campaign.js`) -> `{ state: { units_observed } }`.
- consumer: **Godot only** (`Game-Godot-v2` `scripts/net/sistema_api.gd` +
  `main_sistema.gd`). The Vue3 bundle does NOT consume this route; its debrief
  "Cronaca" is a separate QBN feature.

## Gaps remaining (M1 Short not fully closed)

1. **Godot-side render check** -- the other half of "Game<->Godot": confirm the
   brief "Il Sistema ricorda" + debrief Cronaca echo render correctly from the
   read route across a full run. Cross-repo (Game backend + Game-Godot-v2),
   heavier (coordination, ngrok playbook `docs/playtest/2026-04-21-m11-coop-ngrok-playbook.md`).
2. **Continuity-validation methodology (research)** -- there is no established
   method/fixture for cross-session memory _continuity_ ("run N `units_observed`
   correctly surfaces in run N+1's brief"). The calibration harness
   (`tools/py/calibrate_parallel.py`) measures combat win-rate, not memory
   continuity. Pass/fail criteria for "remembers correctly" must be designed.
3. **Mid**: trait completeness post-A4 (ionico/termico) -- no open ticket, needs
   scoping.

## Environment notes

- Docker Desktop crashed on this PC (`initializing Inference manager: ...
dockerInference: The file cannot be accessed`), so the e2e used a **standalone
  PostgreSQL 17** (winget `PostgreSQL.PostgreSQL.17`, unattended, port 5432,
  `game` DB). The Game backend now has a working local Postgres on Ryzen.
- The live e2e was a one-shot proof, not added to CI (the suite intentionally
  uses fake-prisma for portability). If a real-DB regression guard is wanted, it
  would need a DB-provisioned CI lane.
