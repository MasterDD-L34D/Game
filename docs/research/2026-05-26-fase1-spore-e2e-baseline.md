---
title: 'Fase-1 Spore Moderate -- E2E baseline (RECON-01)'
date: 2026-05-26
status: BASELINE -- 20 test esistenti mappati a 7 step plan RECON-01, re-run PASS 2026-05-27
owner: claude (Cowork session + Claude Code re-run)
workstream: evo-tactics / Pilastro 2
language: it
related:
  - docs/superpowers/plans/2026-05-26-fase1-spore-moderate-reconciliation-plan.md
  - docs/adr/ADR-2026-05-26-deep-genetics-phase1-supersede-freeze.md
  - tests/api/mutationsRoutes.test.js
  - tests/services/mpTracker.test.js
---

# Fase-1 Spore Moderate -- E2E baseline (RECON-01)

## 0. Scoperta empirica (refresh-verify 2026-05-26)

RECON-01 plan §3 prevedeva un E2E integration verify nuovo. Verifica file-per-file
mostra che **tutti i 7 step (escluso step 7 frontend visual) sono gia' coperti da
test esistenti shipped + verdi nel `npm run test:api` baseline CI**:

| Plan step                                                        | Coperto da test esistente                                                                                                     | File:line                                   |
| ---------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------- |
| 1. `/registry` returns 36 mutations                              | `mutationsRoutes.test.js` test "GET /api/v1/mutations/registry returns 36 mutations + indexes"                                | `tests/api/mutationsRoutes.test.js:10-29`   |
| 2. Create test unit + apply happy path                           | `mutationsRoutes.test.js` test "POST /api/v1/mutations/apply mutates trait_ids"                                               | `tests/api/mutationsRoutes.test.js:70-111`  |
| 3. MP accumulator tier+kill+biome                                | `mpTracker.test.js` -- 11 test (initUnit, accrue tier/kill/biome, cap, spend, reset)                                          | `tests/services/mpTracker.test.js:19-106`   |
| 4a. Apply tier 2 con prereq met -> 200 + mp deducted             | `mutationsRoutes.test.js` test "POST /apply: success deduct mp + emit mp_spent + bingo state"                                 | `tests/api/mutationsRoutes.test.js:158-181` |
| 4b. Apply ineligible -> 409 mutation_not_eligible                | `mutationsRoutes.test.js` test "POST /api/v1/mutations/apply" (linee 93-98)                                                   | `tests/api/mutationsRoutes.test.js:93-98`   |
| 4c. Apply senza mp field -> back-compat (no enforce)             | `mutationsRoutes.test.js` test "POST /apply: back-compat"                                                                     | `tests/api/mutationsRoutes.test.js:183-201` |
| 4d. MP insufficient -> 409 insufficient_mp                       | `mutationsRoutes.test.js` test "POST /apply: insufficient_mp (S3)"                                                            | `tests/api/mutationsRoutes.test.js:137-156` |
| 5. 3 mutation stessa category -> bingo tank_plus                 | `mutationsRoutes.test.js` test "POST /bingo" triple assertion                                                                 | `tests/api/mutationsRoutes.test.js:212-227` |
| 6. Apply 4a stessa category mismatched slot -> 409 slot_conflict | `mutationsRoutes.test.js` test "POST /apply: slot-conflict detection (S1)"                                                    | `tests/api/mutationsRoutes.test.js:115-135` |
| 7. Frontend characterPanel MP + render dot (visual)              | **NON COPERTO** -- richiede smoke browser, DEFERITO RECON-01.1 (out of scope automatable test, gating master-dd manual smoke) | --                                          |

## 1. Pre-condition verify

- [x] Backend boot Ryzen PG17 standalone -- verify via `npm run start:api` (Eduardo manual check pre-run)
- [x] `@game/*` node_modules junction -- verify via `npm ls @game/contracts` (parte di test runner setup)
- [x] G4 tdd-guard -- **NO TOOL** required (per harsh-review resolution #1). Test runner = `node --test` standard
- [x] Test framework -- supertest + node:test gia' installati (`devDependencies` `package.json` line 70)
- [x] **Prisma client generated** -- `npx prisma generate --schema apps/backend/prisma/schema.prisma` (REQUIRED: npm install NON triggera generate, vedi §3 root cause)

## 2. Run command canonical

```bash
npx prisma generate --schema apps/backend/prisma/schema.prisma   # pre-flight (one-time post npm install)
node --test tests/api/mutationsRoutes.test.js tests/services/mpTracker.test.js
```

Atteso: 20 test PASS (9 mutationsRoutes + 11 mpTracker), 0 fail, 0 skip.

Equivalente parte `npm run test:api` (full suite), ma scoped solo Fase-1 evidence.

## 3. Empirical run results

> Re-run post prisma generate fix (2026-05-27, Claude Code Ryzen).
>
> **Root cause first run FAIL**: `tests/api/mutationsRoutes.test.js` carica
> `app.js` -> `storage.js` -> `db/prisma.js` -> `@prisma/client`, che richiede
> `.prisma/client/default` generato da `prisma generate`. `npm install` NON lo
> genera automaticamente (post-install hook non triggerato). **Fix scoped**:
> `npx prisma generate` (NO migrate, NO seed -- i 20 test usano app in-memory).

### Run timestamp: `2026-05-27 00:43:15`

### node:test output (summary):

```
✔ GET /api/v1/mutations/registry returns 36 mutations + indexes
✔ GET /api/v1/mutations/:id returns single mutation 200, 404 for unknown
✔ POST /api/v1/mutations/eligible filters by unit traits
✔ POST /api/v1/mutations/apply mutates trait_ids + appends applied_mutations
✔ POST /apply: slot-conflict detection (S1) → 409 with conflicting_mutation_id
✔ POST /apply: insufficient_mp (S3) → 409 when unit.mp < mp_cost
✔ POST /apply: success deduct mp + emit mp_spent + bingo state
✔ POST /apply: back-compat — unit senza .mp salta enforce e applica normalmente
✔ POST /bingo: returns counts + archetypes for unit
✔ initUnit: sets default mp=5 + mp_earned_total=0 (idempotent)
✔ accrueEncounter: tier 2 win → +2 MP
✔ accrueEncounter: kill with status → +1 MP
✔ accrueEncounter: biome match → +1 MP
✔ accrueEncounter: full bonus stack tier3+kill+biome → 4 MP
✔ accrueEncounter: tier 1 only no bonus → +0 MP
✔ accrueEncounter: cap at MP_POOL_MAX (capped flag set)
✔ accrueEncounter: tracks mp_earned_total cumulative (uncapped counter)
✔ spend: deducts and returns ok=true when sufficient
✔ spend: insufficient funds → no deduct + ok=false
✔ resetForRun: pool back to default 5
ℹ tests 20
ℹ suites 0
ℹ pass 20
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 1214
=== EXIT CODE: 0 ===
```

> **Nota non-fatale**: durante il run app.js emette warning
> `[release-reporter] EPERM rename reports/status.json` (telemetry side-effect
> `refreshStatusReport` sotto run concorrenti su Windows file-lock). NON e' un
> test failure -- exit code 0, 20/20 pass.

## 4. Step 7 visual gap (DEFERITO RECON-01.1, NOT blocker Fase-1)

Step 7 plan = "Frontend: open characterPanel, verify mp display update + render dot aspect_token visible".

**Decisione**: NON blocker per RECON-01 ship. Motivazione:

- Step 7 = visual smoke browser, non automatable via node:test
- Backend behavior 100% coperto by 20 test (steps 1-6)
- Visual smoke = gating master-dd manual (5 min Eduardo-side post-merge RECON-01)
- DoD plan §6 cita "happy path + negative path PASS" -- ENTRAMBI presenti negli step 1-6

Trigger smoke manuale post-merge:

1. `npm run start:api` + `npm run play:dev`
2. Browser localhost play
3. Apri characterPanel su un'unit con applied_mutations >= 1 + mp > 0
4. Visual verify: MP value mostrato, render dot aspect_token visible su unit canvas
5. Tracking: aggiornare questo doc §4 con `master-dd smoke verdict: PASS/FAIL` post-test

## 5. Definition of Done verify

Plan §6 RECON-01 DoD:

- [x] E2E log saved (questo file)
- [x] Almeno 1 happy path PASS documented (step 4a + 5 in §0 mapping)
- [x] Almeno 1 negative path PASS (step 4b ineligible + step 4d insufficient_mp + step 6 slot_conflict)
- [x] node:test run output captured in §3 (re-run 2026-05-27 PASS 20/20, exit 0)

DoD CHIUSO: §3 popolato con output reale 20/20 PASS post prisma generate fix.

## 6. Issue list discovered durante refresh-verify

ZERO P0 / P1 / P2 issue discovered durante mapping. Tutti i 20 test sono part del
baseline `npm run test:api` (CI green requirement per merge ogni PR). Significa
che il runtime Spore Moderate Fase-1 e' **gia' verified-by-CI ad ogni PR merge**.

Potenziali gap minori (NON blocker, NON Fase-1 scope):

- Frontend smoke step 7 = manual gating
- M14 cost-charging `deferred_m13_p3` test contract: coperto da RECON-04a
- complexity-budget enforce mating-side: coperto da RECON-04b (G2 gate)
- **Env gotcha**: `prisma generate` richiesto post `npm install` (aggiunto §1 + §2 pre-flight)

## 7. Risultato finale RECON-01

**Status**: BASELINE STABLE + COVERED + RE-RUN PASS. Spore Moderate Fase-1 runtime
e' gia' tested empirico (20 test) + CI-verified. Plan §3 step 1-6 = mapped 1:1 a
test esistenti. Re-run 2026-05-27 post prisma-fix = 20/20 PASS exit 0.

**Next**: merge questo PR (Eduardo-only) -> avvia RECON-02 (`feat/spore-fase1-recon-02-derived-ability`).

---

**END BASELINE RECON-01 -- 2026-05-26 (re-run 2026-05-27).**
