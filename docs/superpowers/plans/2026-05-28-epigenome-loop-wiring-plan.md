# Epigenome Loop Wiring Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Make the Fase-3 Epigenome (merged PR #2402) actually reachable in real play: per-creature epigenome persists across sessions, accumulates from how you play (conviction telemetry), biases offspring at mating, and drives live emergent speciation.

**Architecture:** A dedicated, Prisma-gated best-effort `CreatureEpigenome` store (keyed `(campaignId, unitId)`) — NOT the deferred M10 PartyRoster. Session-end accumulates conviction→epigenome onto surviving player creatures. `/mating/roll` hydrates parent epigenomes from the store + records offspring into the lineage graph with epigenome. `/tribes` computes a real species-mean from the lineage registry. Every integration point is best-effort (mirrors `sistemaStateStore`): with no Prisma model present (tests, no DATABASE_URL) the store no-ops and all existing behavior is unchanged.

**Tech Stack:** Node.js (CommonJS), Prisma (PostgreSQL), `node:test` + `node:assert/strict`, `supertest`. Tests in `tests/api/`.

---

## Context (already shipped, do not rebuild)

- `apps/backend/services/genetics/epigenome.js` (PR #2402): `accumulateEpigenome(prevEpi, sessionConviction, alpha)`, `computeOffspringEpigenome`, `computeSpeciesMean(entries)`, `loadEpigenomeConfig()` (config has `accumulation_alpha` 0.4, `speciation_divergence_threshold` 0.15), `AXES`.
- `metaProgression.js`: `rollMatingOffspring` attaches `offspring.epigenome` when `context.epigenomeConfig` + parent `.epigenome`; `recordOffspring(entry)` populates module `_offspringRegistry` (entry supports `epigenome`); `getTribesEmergent(opts)` reads it + computes `epigenetic_divergence`/`is_distinct_form`; `listLineageEntries()` returns all entries.
- `vcScoring.buildVcSnapshot(session)` → `per_actor[unitId].conviction_axis = {utility,liberty,morality}` (0-100).

## Why a dedicated store (decision, master-dd 2026-05-28)

`PartyRoster` Prisma model is **defined but unused at runtime** (`campaignStore.js` is in-memory with `partyRoster: []`, M10 Phase D deferred). So there is no live creature row to attach epigenome to. A narrow `CreatureEpigenome(campaignId, unitId, epigenome)` store — keyed by ids the session flow already has — provides cross-session persistence without dragging in the deferred roster lifecycle.

## Gotchas (load-bearing)

- **Branch-first**: `feat/epigenome-loop` is ALREADY created/checked out. Do NOT touch `main`. Verify `git branch --show-current` before each commit.
- **CI test glob**: tests MUST go in `tests/api/` (runner globs `tests/api/*.test.js`). Import services directly; inject a FAKE prisma for store tests (mirror how `sistemaStateStore` is testable — model absent → best-effort no-op).
- **tdd-guard Write/Edit hook ACTIVE**: one test at a time (Edit-append → run RED → implement). For cohesive new files, Option B (Bash heredoc after RED captured) is authorized — declare it.
- **Prisma migration without a live DB**: prefer `npx prisma migrate diff --from-migrations apps/backend/prisma/migrations --to-schema-datamodel apps/backend/prisma/schema.prisma --script` to GENERATE the SQL, then create the migration folder manually. If `migrate diff` needs a DB and none is reachable, hand-write the additive migration (exact SQL provided in Task 1). A NEW table is zero-risk to existing data. Do NOT attempt to boot Postgres unless trivial.
- **Best-effort everywhere**: every store call at an integration seam is wrapped in `try/catch` and never blocks the response (mirror the Sistema block at `session.js:2933-2945`).
- **Commits**: per task, lowercase conventional subject + trailers (NO `Co-Authored-By`):
  ```
  Coding-Agent: claude-opus-4.7
  Trace-Id: <node -e "console.log(crypto.randomUUID())">
  ```
- **Staging**: `git add` ONLY the files each task changes. NEVER `git add -A` (unrelated untracked files exist).
- husky pre-commit prettier reformatting is expected/fine.

## File Structure

| File                                                                       | Responsibility                                                                       | Action |
| -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ | ------ |
| `apps/backend/prisma/schema.prisma`                                        | Add `CreatureEpigenome` model                                                        | Modify |
| `apps/backend/prisma/migrations/<ts>_add_creature_epigenome/migration.sql` | Additive table                                                                       | Create |
| `apps/backend/services/genetics/creatureEpigenomeStore.js`                 | Prisma-gated DI store: `get/getMany/upsert`                                          | Create |
| `apps/backend/routes/session.js`                                           | Session-end accumulation (best-effort)                                               | Modify |
| `apps/backend/routes/meta.js`                                              | `/mating/roll` parent-hydration + recordOffspring bridge; `/tribes` real speciesMean | Modify |
| `tests/api/creatureEpigenomeStore.test.js`                                 | Store unit tests (fake prisma)                                                       | Create |
| `tests/api/epigenomeLoopWire.test.js`                                      | Accumulation + mating-hydration + tribes integration                                 | Create |

---

## Task 1: CreatureEpigenome model + migration

**Files:** `apps/backend/prisma/schema.prisma`, `apps/backend/prisma/migrations/<ts>_add_creature_epigenome/migration.sql`

- [ ] **Step 1: Add the model** (match neighbor conventions — see `SistemaState` at schema.prisma:418: PascalCase model, camelCase fields with `@map` snake_case, `@@map` snake_case table). Append:

```prisma
model CreatureEpigenome {
  campaignId String   @map("campaign_id")
  unitId     String   @map("unit_id")
  epigenome  Json     @default("{}")
  updatedAt  DateTime @updatedAt @map("updated_at")

  @@id([campaignId, unitId])
  @@map("creature_epigenome")
}
```

- [ ] **Step 2: Generate the migration**

Try: `cd apps/backend && npx prisma migrate diff --from-migrations prisma/migrations --to-schema-datamodel prisma/schema.prisma --script`
Expected SQL (create the folder `prisma/migrations/<UTC-timestamp>_add_creature_epigenome/migration.sql` with it — if `migrate diff` is unavailable/needs a DB, hand-write this):

```sql
-- CreateTable
CREATE TABLE "creature_epigenome" (
    "campaign_id" TEXT NOT NULL,
    "unit_id" TEXT NOT NULL,
    "epigenome" JSONB NOT NULL DEFAULT '{}',
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "creature_epigenome_pkey" PRIMARY KEY ("campaign_id","unit_id")
);
```

- [ ] **Step 3: Validate schema**

Run: `cd apps/backend && npx prisma validate`
Expected: "The schema at prisma/schema.prisma is valid".
(Do NOT run `migrate dev`/`deploy` against prod. If a `prisma generate` is part of the repo's normal flow, run it so the client picks up the model: `npx prisma generate`.)

- [ ] **Step 4: Commit**

```bash
git add apps/backend/prisma/schema.prisma apps/backend/prisma/migrations/
git commit -m "$(cat <<EOF
feat(epigenome): CreatureEpigenome model + migration (per-creature persistence)

Coding-Agent: claude-opus-4.7
Trace-Id: $(node -e "console.log(crypto.randomUUID())")
EOF
)"
```

---

## Task 2: creatureEpigenomeStore (Prisma-gated DI)

**Files:** Create `apps/backend/services/genetics/creatureEpigenomeStore.js`, Test `tests/api/creatureEpigenomeStore.test.js`

- [ ] **Step 1: Write the failing test** (fake prisma DI — mirror the best-effort contract)

Create `tests/api/creatureEpigenomeStore.test.js`:

```js
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  createCreatureEpigenomeStore,
} = require('../../apps/backend/services/genetics/creatureEpigenomeStore');

function fakePrisma() {
  const rows = new Map(); // `${c}:${u}` -> { campaignId, unitId, epigenome }
  return {
    _rows: rows,
    creatureEpigenome: {
      async findUnique({
        where: {
          campaignId_unitId: { campaignId, unitId },
        },
      }) {
        return rows.get(`${campaignId}:${unitId}`) || null;
      },
      async findMany({ where: { campaignId } }) {
        return [...rows.values()].filter((r) => r.campaignId === campaignId);
      },
      async upsert({
        where: {
          campaignId_unitId: { campaignId, unitId },
        },
        update,
        create,
      }) {
        const key = `${campaignId}:${unitId}`;
        const existing = rows.get(key);
        const row = existing ? { ...existing, ...update } : { campaignId, unitId, ...create };
        rows.set(key, row);
        return row;
      },
    },
  };
}

test('store: get returns null epigenome when absent; upsert then get round-trips', async () => {
  const store = createCreatureEpigenomeStore(fakePrisma());
  assert.equal(await store.get('c1', 'u1'), null);
  await store.upsert('c1', 'u1', { utility: 0.7, liberty: 0.5, morality: 0.5 });
  assert.deepEqual(await store.get('c1', 'u1'), { utility: 0.7, liberty: 0.5, morality: 0.5 });
});

test('store: getMany returns { unitId: epigenome } map scoped to campaign', async () => {
  const store = createCreatureEpigenomeStore(fakePrisma());
  await store.upsert('c1', 'u1', { utility: 0.6, liberty: 0.5, morality: 0.5 });
  await store.upsert('c1', 'u2', { utility: 0.8, liberty: 0.5, morality: 0.5 });
  await store.upsert('c2', 'u3', { utility: 0.1, liberty: 0.5, morality: 0.5 });
  const many = await store.getMany('c1');
  assert.deepEqual(Object.keys(many).sort(), ['u1', 'u2']);
  assert.equal(many.u1.utility, 0.6);
});

test('store: no prisma model -> get null, getMany {}, upsert no-op (best-effort)', async () => {
  const store = createCreatureEpigenomeStore({}); // no creatureEpigenome model
  assert.equal(await store.get('c1', 'u1'), null);
  assert.deepEqual(await store.getMany('c1'), {});
  await store.upsert('c1', 'u1', { utility: 0.7, liberty: 0.5, morality: 0.5 }); // must not throw
});
```

> tdd-guard: add tests one at a time (Edit-append) or Option B after capturing RED.

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/api/creatureEpigenomeStore.test.js`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement** (mirror `apps/backend/services/ai/sistemaStateStore.js` pattern)

Create `apps/backend/services/genetics/creatureEpigenomeStore.js`:

```js
// Fase-3 Epigenome — per-creature persistence (campaignId, unitId) -> epigenome.
// Mirror of sistemaStateStore: DI factory, Prisma-gated, best-effort. When the
// creatureEpigenome model is absent (in-memory stub / no DATABASE_URL) or any
// query throws, reads return empty and upsert is a no-op. Persistence failure
// must NEVER block session end or mating.

'use strict';

function createCreatureEpigenomeStore(prisma) {
  const model = prisma && prisma.creatureEpigenome ? prisma.creatureEpigenome : null;

  async function get(campaignId, unitId) {
    if (!model || !campaignId || !unitId) return null;
    try {
      const row = await model.findUnique({
        where: { campaignId_unitId: { campaignId, unitId } },
      });
      if (!row) return null;
      const epi = row.epigenome;
      return epi && typeof epi === 'object' ? epi : null;
    } catch {
      return null;
    }
  }

  async function getMany(campaignId) {
    if (!model || !campaignId) return {};
    try {
      const rows = await model.findMany({ where: { campaignId } });
      const out = {};
      for (const r of rows || []) {
        if (r && r.unitId && r.epigenome && typeof r.epigenome === 'object') {
          out[r.unitId] = r.epigenome;
        }
      }
      return out;
    } catch {
      return {};
    }
  }

  async function upsert(campaignId, unitId, epigenome) {
    if (!model || !campaignId || !unitId) return;
    const epi = epigenome && typeof epigenome === 'object' ? epigenome : {};
    try {
      await model.upsert({
        where: { campaignId_unitId: { campaignId, unitId } },
        update: { epigenome: epi },
        create: { campaignId, unitId, epigenome: epi },
      });
    } catch (err) {
      console.warn('[creatureEpigenomeStore] upsert failed (best-effort):', err.message);
    }
  }

  return { get, getMany, upsert };
}

module.exports = { createCreatureEpigenomeStore };
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/api/creatureEpigenomeStore.test.js`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add apps/backend/services/genetics/creatureEpigenomeStore.js tests/api/creatureEpigenomeStore.test.js
git commit -m "feat(epigenome): creatureEpigenomeStore prisma-gated DI (get/getMany/upsert)  [+ trailers]"
```

(Use the heredoc trailer pattern from Task 1.)

---

## Task 3: Session-end accumulation

**Files:** `apps/backend/routes/session.js` (insert after the Sistema block ~line 2945, BEFORE `appendEvent` ~2947), Test `tests/api/epigenomeLoopWire.test.js`

- [ ] **Step 1: Write the failing test** (drive the accumulator via the store + a fake prisma, asserting EMA write-back for a surviving player unit)

Create `tests/api/epigenomeLoopWire.test.js`:

```js
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  accumulateEpigenome,
  loadEpigenomeConfig,
} = require('../../apps/backend/services/genetics/epigenome');
const {
  createCreatureEpigenomeStore,
} = require('../../apps/backend/services/genetics/creatureEpigenomeStore');

function fakePrisma() {
  const rows = new Map();
  return {
    creatureEpigenome: {
      async findUnique({
        where: {
          campaignId_unitId: { campaignId, unitId },
        },
      }) {
        return rows.get(`${campaignId}:${unitId}`) || null;
      },
      async findMany({ where: { campaignId } }) {
        return [...rows.values()].filter((r) => r.campaignId === campaignId);
      },
      async upsert({
        where: {
          campaignId_unitId: { campaignId, unitId },
        },
        update,
        create,
      }) {
        const key = `${campaignId}:${unitId}`;
        const existing = rows.get(key);
        const row = existing ? { ...existing, ...update } : { campaignId, unitId, ...create };
        rows.set(key, row);
        return row;
      },
    },
  };
}

// Mirrors the exact session-end accumulation logic (Task 3 step 3) so we pin
// the contract: survivors' conviction_axis EMA-accumulated into the store.
async function accumulateSurvivors(store, campaignId, survivors, perActor, alpha) {
  for (const unitId of survivors) {
    const conv = perActor[unitId] && perActor[unitId].conviction_axis;
    if (!conv) continue;
    const prev = await store.get(campaignId, unitId);
    const next = accumulateEpigenome(prev, conv, alpha);
    await store.upsert(campaignId, unitId, next);
  }
}

test('session-end accumulation: survivor conviction EMA-accumulates into store', async () => {
  const store = createCreatureEpigenomeStore(fakePrisma());
  const alpha = loadEpigenomeConfig().accumulation_alpha; // 0.4
  const perActor = { u1: { conviction_axis: { utility: 90, liberty: 50, morality: 10 } } };
  await accumulateSurvivors(store, 'c1', ['u1'], perActor, alpha);
  // first accumulate from baseline 0.5: utility 0.4*0.9+0.6*0.5=0.66
  const after1 = await store.get('c1', 'u1');
  assert.ok(Math.abs(after1.utility - 0.66) < 1e-9);
  // second session reinforces toward high utility
  await accumulateSurvivors(store, 'c1', ['u1'], perActor, alpha);
  const after2 = await store.get('c1', 'u1');
  assert.ok(after2.utility > after1.utility);
});
```

- [ ] **Step 2: Run test to verify it fails** (then GREEN once the helper exists — this test pins the contract that the route code in step 3 must mirror)

Run: `node --test --test-name-pattern="session-end accumulation" tests/api/epigenomeLoopWire.test.js`
Expected: PASS immediately (it tests the helper inline). This test exists to lock the EMA contract the route mirrors. If it fails, the engine/store contract is wrong — STOP.

- [ ] **Step 3: Wire `session.js` POST `/end`**

Add requires near the top of `apps/backend/routes/session.js` (where other service requires live, or lazily inside the block like the Sistema block does). Insert this best-effort block AFTER the Sistema `try/catch` (ends ~line 2946) and BEFORE `await appendEvent(...)` (~line 2947):

```js
// Fase-3 Epigenome — accumulate per-creature epigenome from how the
// player played this session (conviction_axis EMA). Best-effort, never
// blocks session end. Surviving player units only.
try {
  if (session.campaign_id && vcSnapshot && vcSnapshot.per_actor) {
    const { prisma } = require('../db/prisma');
    const { createCreatureEpigenomeStore } = require('../services/genetics/creatureEpigenomeStore');
    const { accumulateEpigenome, loadEpigenomeConfig } = require('../services/genetics/epigenome');
    const epiStore = createCreatureEpigenomeStore(prisma);
    const alpha = loadEpigenomeConfig().accumulation_alpha;
    const survivors = session.units.filter((u) => u.controlled_by === 'player' && (u.hp ?? 0) > 0);
    for (const u of survivors) {
      const conv = vcSnapshot.per_actor[u.id] && vcSnapshot.per_actor[u.id].conviction_axis;
      if (!conv) continue;
      const prev = await epiStore.get(session.campaign_id, u.id);
      const next = accumulateEpigenome(prev, conv, alpha);
      await epiStore.upsert(session.campaign_id, u.id, next);
    }
  }
} catch {
  /* best-effort -- epigenome accumulation never blocks session end */
}
```

- [ ] **Step 4: Regression — full api suite green**

Run: `node --test tests/api/*.test.js`
Expected: PASS (no regression; the block is best-effort and inert without a real prisma model — tests use the stub).

- [ ] **Step 5: Commit**

```bash
git add apps/backend/routes/session.js tests/api/epigenomeLoopWire.test.js
git commit -m "feat(epigenome): accumulate per-creature epigenome at session end (best-effort)  [+ trailers]"
```

---

## Task 4: Mating parent-hydration + recordOffspring bridge

**Files:** `apps/backend/routes/meta.js` (`/mating/roll` handler ~233-269; extend metaProgression require ~line 22-28), Test `tests/api/epigenomeLoopWire.test.js`

- [ ] **Step 1: Append the failing test** (supertest the real route: persisted parent epigenomes → offspring biased + recorded as a tribe member)

Append to `tests/api/epigenomeLoopWire.test.js`:

```js
const request = require('supertest');
const { createApp } = require('../../apps/backend/app');
const meta = require('../../apps/backend/services/metaProgression');

test('mating/roll: records offspring into lineage registry with epigenome (bridge)', async () => {
  meta._resetLineageRegistry();
  const { app, close } = createApp({ databasePath: null });
  try {
    // 3 rolls of the SAME parents (same lineage_id) -> tribe emerges
    for (let i = 0; i < 3; i++) {
      const res = await request(app)
        .post('/api/meta/mating/roll')
        .send({
          campaign_id: 'cL',
          parent_a: { id: 'pa', epigenome: { utility: 1.0, liberty: 0.5, morality: 0.5 } },
          parent_b: { id: 'pb', epigenome: { utility: 1.0, liberty: 0.5, morality: 0.5 } },
          biome_id: 'dune',
        });
      assert.equal(res.status, 200);
      assert.ok(res.body.offspring.epigenome, 'offspring carries epigenome when parents do');
    }
    const entries = meta.listLineageEntries().filter((e) => e.epigenome);
    assert.ok(entries.length >= 3, 'offspring recorded with epigenome');
  } finally {
    close();
  }
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test --test-name-pattern="records offspring into lineage registry" tests/api/epigenomeLoopWire.test.js`
Expected: FAIL — `listLineageEntries()` returns 0 epigenome entries (no bridge yet).

- [ ] **Step 3: Wire `/mating/roll`**

(a) Extend the existing `require('../services/metaProgression')` destructure (meta.js ~lines 22-28) to ALSO import `recordOffspring` and `listLineageEntries` (read the current destructured names first; add these two).

(b) Add `const crypto = require('node:crypto');` at the top if not already present.

(c) Add `computeSpeciesMean` to the `require('../services/genetics/epigenome')` import (line 30): `const { loadEpigenomeConfig, computeSpeciesMean } = require('../services/genetics/epigenome');`

(d) In the `/mating/roll` handler, BEFORE `store.rollOffspring(...)`, hydrate parent epigenomes from the store + compute speciesMean (best-effort, Prisma-gated):

```js
const campaignId = (req.body && req.body.campaign_id) || opts.campaignId || null;
// Hydrate parent epigenomes from persistence when the caller didn't supply
// them inline, and compute a campaign species mean. Best-effort.
let speciesMean;
try {
  if (campaignId) {
    const { prisma } = require('../db/prisma');
    const { createCreatureEpigenomeStore } = require('../services/genetics/creatureEpigenomeStore');
    const epiStore = createCreatureEpigenomeStore(prisma);
    if (parent_a.id && !parent_a.epigenome) {
      const e = await epiStore.get(campaignId, parent_a.id);
      if (e) parent_a.epigenome = e;
    }
    if (parent_b.id && !parent_b.epigenome) {
      const e = await epiStore.get(campaignId, parent_b.id);
      if (e) parent_b.epigenome = e;
    }
    const pop = Object.values(await epiStore.getMany(campaignId)).map((epi) => ({
      epigenome: epi,
    }));
    if (pop.length > 0) speciesMean = computeSpeciesMean(pop);
  }
} catch {
  /* best-effort hydration */
}
```

(e) Pass `speciesMean` into the rollOffspring context (alongside the existing `epigenomeConfig`):

```js
        context: { geneSlotsSchema, mutationCatalog, epigenomeConfig, speciesMean },
```

(f) AFTER the fragment-grant block (after `res.json(result)` is currently called — move the record BEFORE `res.json`), add the recordOffspring bridge:

```js
// Fase-3 — record the offspring into the lineage graph (emergent
// speciation). Best-effort; deterministic lineage_id groups same-parent
// rolls into a tribe. unit_id synthesized (offspring spec has no unit id).
if (result && result.success && result.offspring) {
  try {
    const o = result.offspring;
    recordOffspring({
      unit_id: `${o.lineage_id}:${crypto.randomUUID()}`,
      lineage_id: o.lineage_id,
      parents: [o.parent_a_id, o.parent_b_id].filter(Boolean),
      born_at_biome: o.biome_id_at_mating || null,
      epigenome: o.epigenome || null,
    });
  } catch {
    /* best-effort -- lineage recording never blocks mating */
  }
}
```

Ensure ordering in the handler: hydrate → `rollOffspring` → fragment grant → recordOffspring bridge → `res.json(result)`.

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test --test-name-pattern="records offspring into lineage registry" tests/api/epigenomeLoopWire.test.js`
Expected: PASS.

- [ ] **Step 5: Regression**

Run: `node --test tests/api/*.test.js`
Expected: PASS (existing `/mating/roll` + epigenomeRoute tests unaffected — hydration/bridge are best-effort and additive).

- [ ] **Step 6: Commit**

```bash
git add apps/backend/routes/meta.js tests/api/epigenomeLoopWire.test.js
git commit -m "feat(epigenome): mating parent-hydration + recordOffspring lineage bridge  [+ trailers]"
```

---

## Task 5: /tribes real species-mean + config threshold

**Files:** `apps/backend/routes/meta.js` (`/tribes` handler ~310-317), Test `tests/api/epigenomeLoopWire.test.js`

- [ ] **Step 1: Append the failing test**

Append to `tests/api/epigenomeLoopWire.test.js`:

```js
test('GET /api/meta/tribes: uses config threshold + registry species-mean -> is_distinct_form', async () => {
  meta._resetLineageRegistry();
  // baseline population near 0.5 + one diverged lineage at high utility
  for (let i = 0; i < 3; i++) {
    meta.recordOffspring({
      unit_id: `base${i}`,
      lineage_id: 'BASE',
      generation: i,
      born_at_biome: 'dune',
      epigenome: { utility: 0.5, liberty: 0.5, morality: 0.5 },
    });
  }
  for (let i = 0; i < 3; i++) {
    meta.recordOffspring({
      unit_id: `div${i}`,
      lineage_id: 'DIV',
      generation: i,
      born_at_biome: 'dune',
      epigenome: { utility: 0.95, liberty: 0.5, morality: 0.5 },
    });
  }
  const { app, close } = createApp({ databasePath: null });
  try {
    const res = await request(app).get('/api/meta/tribes');
    assert.equal(res.status, 200);
    const div = res.body.tribes.find((t) => t.tribe_id === 'DIV');
    assert.ok(div, 'DIV tribe present');
    assert.equal(typeof div.epigenetic_divergence, 'number');
    assert.equal(div.is_distinct_form, true); // diverged far from population mean, > 0.15 threshold
  } finally {
    close();
  }
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test --test-name-pattern="uses config threshold" tests/api/epigenomeLoopWire.test.js`
Expected: FAIL — `is_distinct_form` is `false` (route calls `getTribesEmergent()` with no args → speciesMean 0.5 default AND threshold... actually default speciesMean 0.5 may already make DIV distinct; this test makes the route compute the REGISTRY mean which sits between BASE 0.5 and DIV 0.95, and uses the config threshold). It fails because the route currently ignores config + registry mean.

- [ ] **Step 3: Wire `/tribes`** — replace the handler (meta.js ~310-317):

```js
router.get('/tribes', (_req, res, next) => {
  try {
    const cfg = loadEpigenomeConfig();
    const speciesMean = computeSpeciesMean(listLineageEntries());
    const tribes = getTribesEmergent({
      speciesMean,
      divergenceThreshold: cfg.speciation_divergence_threshold,
    });
    res.json({ tribes, threshold: 3 });
  } catch (err) {
    next(err);
  }
});
```

(`loadEpigenomeConfig`, `computeSpeciesMean` already imported in Task 4(c); `listLineageEntries`, `getTribesEmergent` already imported.)

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test --test-name-pattern="uses config threshold" tests/api/epigenomeLoopWire.test.js`
Expected: PASS.

- [ ] **Step 5: Full regression**

Run: `node scripts/run-test-api.cjs`
Expected: PASS (full CI runner green).

- [ ] **Step 6: Commit**

```bash
git add apps/backend/routes/meta.js tests/api/epigenomeLoopWire.test.js
git commit -m "feat(epigenome): /tribes real species-mean + config divergence threshold  [+ trailers]"
```

---

## Task 6: PR

- [ ] **Step 1: Push + PR**

```bash
git push -u origin feat/epigenome-loop
gh pr create --title "feat(epigenome): live loop — per-creature persistence + accumulation + mating hydration + speciation" --body "<summary + test plan + deferred + cognitive protocols footer>"
```

- [ ] **Step 2: update-branch → watch checks → squash merge** (NO `--admin`).

---

## Self-Review

- **Spec coverage**: dedicated store (T1-T2) ✓ · cross-session accumulation (T3) ✓ · mating uses persisted parent epigenome + records lineage (T4) ✓ · live speciation species-mean (T5) ✓.
- **Best-effort**: every seam is Prisma-gated try/catch; with the test stub (no `creatureEpigenome` model) the store no-ops → existing suite unaffected. Confirm `node --test tests/api/*.test.js` stays green after T3/T4/T5.
- **Placeholder scan**: store + integration code is complete; only the Prisma model/migration step asks the implementer to match neighbor conventions (SQL provided).
- **Type consistency**: epigenome = `{utility,liberty,morality}` (0-1) end-to-end; `get`→null|epi, `getMany`→`{unitId:epi}`, `upsert(campaignId,unitId,epi)`.

## Deferred (still out of scope)

- M10 Phase D PartyRoster runtime (full roster lifecycle) — this store is epigenome-only, keyed by ids; it does not build the roster.
- Playtest N>=40 param lock (L-069). Godot read-side #356. Narrative tag authoring.
- Replacing synthesized offspring `unit_id` with a real materialized unit id once the commit/materialization flow exists.
