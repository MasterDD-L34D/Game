# Epigenome Registry Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development.

**Goal:** Close the 2 deferred robustness gaps from PR #2404's final review so the live epigenome loop is production-safe: (1) the lineage registry is per-campaign scoped + pruned (today it is process-global, mixes campaigns, grows unbounded); (2) the route blocks gain a prisma DI seam so the session-end accumulation + mating hydration are exercised end-to-end in CI (today only inline-helper/store round-trip).

**Architecture:** Backward-compatible. `recordOffspring` entries gain `campaign_id` + `created_at`; the registry readers gain an OPTIONAL `campaignId` filter (omitted = current global behavior). A per-campaign FIFO cap evicts oldest entries past a bound. The `/mating/roll` + session-end blocks acquire prisma via `opts.prisma || require('../db/prisma').prisma`, enabling a fake-prisma route-level test.

**Tech Stack:** Node.js (CommonJS), `node:test` + `node:assert/strict`, `supertest` + `express`. Tests in `tests/api/`.

---

## Verified seams (current state)

- `apps/backend/services/metaProgression.js`: `_offspringRegistry = new Map()` (unit_id→entry, line ~1022). `recordOffspring` (1042) normalized has NO `campaign_id`/`created_at`. Readers: `getLineageChain(lineageId)` (1072), `getTribesEmergent(opts={})` (1095, reads ALL), `getTribeForUnit(unitId)` (1178), `listLineageEntries()` (1191). `_resetLineageRegistry()` exists.
- `apps/backend/routes/meta.js`: `createMetaRouter(opts={})` (110) — `opts.prisma` exists (passed to createMetaStore). `/mating/roll` hydration uses `const { prisma } = require('../db/prisma')` (257) directly — NOT opts.prisma. recordOffspring bridge at 300 (does NOT pass campaign_id today). `/tribes` (356) calls `getTribesEmergent({speciesMean, divergenceThreshold})` (no campaign filter); `/lineage/:id` (345); `/tribe/unit/:id` (370).
- `apps/backend/routes/session.js`: `createSessionRouter(options={})` (250). Epigenome accumulation block (~2952) uses `require('../db/prisma')` directly.

## Gotchas

- Branch `feat/epigenome-registry-hardening` already checked out. No `main` edits. `git add` only listed files (never -A). tdd-guard active (one-test-at-a-time / Option B Bash heredoc after RED). Commits: lowercase conventional + trailers `Coding-Agent: claude-opus-4.7` / `Trace-Id: <node -e "console.log(crypto.randomUUID())">`. Tests in `tests/api/`. husky prettier OK.
- **Back-compat is the hard requirement**: existing callers of the 4 readers pass NO campaignId and must behave EXACTLY as today. Existing tests (epigenomeSpeciation.test.js, epigenomeMatingWire.test.js, lineage tests) must stay green.

---

## Task 1: Registry per-campaign scoping + FIFO prune

**Files:** `apps/backend/services/metaProgression.js`, `apps/backend/routes/meta.js`, Test `tests/api/epigenomeRegistryScope.test.js`

- [ ] **Step 1: Write failing test** — create `tests/api/epigenomeRegistryScope.test.js`:

```js
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const {
  recordOffspring,
  getTribesEmergent,
  listLineageEntries,
  _resetLineageRegistry,
  LINEAGE_REGISTRY_MAX_PER_CAMPAIGN,
} = require('../../apps/backend/services/metaProgression');

test('scoping: campaignId filter isolates lineage entries per campaign', () => {
  _resetLineageRegistry();
  recordOffspring({ unit_id: 'a1', lineage_id: 'LA', campaign_id: 'cA', generation: 0 });
  recordOffspring({ unit_id: 'a2', lineage_id: 'LA', campaign_id: 'cA', generation: 1 });
  recordOffspring({ unit_id: 'b1', lineage_id: 'LB', campaign_id: 'cB', generation: 0 });
  assert.equal(listLineageEntries('cA').length, 2, 'cA sees only its 2');
  assert.equal(listLineageEntries('cB').length, 1, 'cB sees only its 1');
  assert.equal(listLineageEntries().length, 3, 'no-arg = all (back-compat)');
});

test('scoping: getTribesEmergent campaignId filter (cross-campaign isolation)', () => {
  _resetLineageRegistry();
  for (let i = 0; i < 3; i++)
    recordOffspring({ unit_id: `x${i}`, lineage_id: 'SHARED', campaign_id: 'cX', generation: i });
  for (let i = 0; i < 3; i++)
    recordOffspring({ unit_id: `y${i}`, lineage_id: 'SHARED', campaign_id: 'cY', generation: i });
  // Same lineage_id across 2 campaigns: scoped each sees 3 (a tribe); unscoped sees 6.
  const tX = getTribesEmergent({ campaignId: 'cX' }).find((t) => t.tribe_id === 'SHARED');
  assert.equal(tX.members_count, 3, 'cX tribe isolated to its 3 members');
  const tAll = getTribesEmergent().find((t) => t.tribe_id === 'SHARED');
  assert.equal(tAll.members_count, 6, 'no-arg = global (back-compat)');
});

test('prune: per-campaign FIFO cap evicts oldest', () => {
  _resetLineageRegistry();
  const cap = LINEAGE_REGISTRY_MAX_PER_CAMPAIGN;
  for (let i = 0; i < cap + 5; i++) {
    recordOffspring({ unit_id: `u${i}`, lineage_id: 'L', campaign_id: 'cP', generation: i });
  }
  assert.equal(listLineageEntries('cP').length, cap, 'campaign capped at MAX');
  // oldest (u0..u4) evicted, newest retained
  const ids = listLineageEntries('cP').map((e) => e.unit_id);
  assert.ok(!ids.includes('u0'), 'oldest evicted');
  assert.ok(ids.includes(`u${cap + 4}`), 'newest retained');
});
```

- [ ] **Step 2: Run RED** — `node --test tests/api/epigenomeRegistryScope.test.js` → FAIL (campaign_id not stored / no filter / cap export missing).

- [ ] **Step 3: Implement in `metaProgression.js`**

(a) Add near `_offspringRegistry` (line ~1022):

```js
const LINEAGE_REGISTRY_MAX_PER_CAMPAIGN = 1000; // FIFO cap per campaign (anti-unbounded-growth)
```

(b) In `recordOffspring` normalized object, add two fields (after `epigenome`):

```js
    campaign_id: typeof entry.campaign_id === 'string' && entry.campaign_id ? entry.campaign_id : null,
    created_at: Number.isFinite(entry.created_at) ? entry.created_at : Date.now(),
```

Then, AFTER `_offspringRegistry.set(normalized.unit_id, normalized);` and before `return normalized;`, add the FIFO prune:

```js
// Anti-unbounded-growth: cap entries per campaign, evict oldest by created_at.
if (normalized.campaign_id) {
  const sameCampaign = [];
  for (const e of _offspringRegistry.values()) {
    if (e.campaign_id === normalized.campaign_id) sameCampaign.push(e);
  }
  if (sameCampaign.length > LINEAGE_REGISTRY_MAX_PER_CAMPAIGN) {
    sameCampaign.sort((a, b) => (a.created_at ?? 0) - (b.created_at ?? 0));
    const evict = sameCampaign.length - LINEAGE_REGISTRY_MAX_PER_CAMPAIGN;
    for (let i = 0; i < evict; i++) _offspringRegistry.delete(sameCampaign[i].unit_id);
  }
}
```

(c) Add an internal filter helper (near the readers):

```js
function _registryEntries(campaignId) {
  const out = [];
  for (const e of _offspringRegistry.values()) {
    if (!campaignId || e.campaign_id === campaignId) out.push(e);
  }
  return out;
}
```

(d) `getLineageChain(lineageId, campaignId)` — change signature to accept optional `campaignId`; iterate `_registryEntries(campaignId)` instead of `_offspringRegistry.values()` when filtering by lineage. (Members must be lineage_id-matched AND campaign-scoped when campaignId given.)

(e) `getTribesEmergent(opts = {})` — read `const campaignId = opts.campaignId || null;` and build `byLineage` from `_registryEntries(campaignId)` instead of `_offspringRegistry.values()`. (Everything else unchanged.)

(f) `listLineageEntries(campaignId)` — change to `return _registryEntries(campaignId).map((e) => ({ ...e, parents: [...(e.parents || [])] }));`

(g) `getTribeForUnit(unitId)` — unchanged externally; internally it already looks up the unit's own entry then calls `getTribesEmergent()`. To keep its tribe scoped to the unit's campaign, change its internal call to `getTribesEmergent({ campaignId: entry.campaign_id || null })` so the member count reflects the unit's campaign (prevents cross-campaign inflation). If `entry.campaign_id` is null (legacy), passes null = global (back-compat).

(h) Export `LINEAGE_REGISTRY_MAX_PER_CAMPAIGN` in `module.exports`.

- [ ] **Step 4: Run GREEN** — `node --test tests/api/epigenomeRegistryScope.test.js` (3 pass).

- [ ] **Step 5: Wire `/mating/roll` bridge to pass campaign_id (meta.js ~300)** — in the `recordOffspring({...})` bridge call, add `campaign_id: campaignId,` (the `campaignId` var already exists in that handler scope). Also update `/tribes` (meta.js 356) to optionally scope: read `const campaignId = req.query.campaign_id || opts.campaignId || null;` and pass `campaignId` into BOTH `computeSpeciesMean(listLineageEntries(campaignId))` and `getTribesEmergent({ speciesMean, divergenceThreshold, campaignId })`.

- [ ] **Step 6: Regression** — `node --test tests/api/*.test.js` → 0 fail (existing speciation/lineage/mating-wire tests use no campaignId → unaffected).

- [ ] **Step 7: Commit** — `feat(epigenome): per-campaign registry scoping + FIFO prune` + the meta.js bridge/tribes wiring; trailers. `git add apps/backend/services/metaProgression.js apps/backend/routes/meta.js tests/api/epigenomeRegistryScope.test.js`.

---

## Task 2: Prisma DI seam + route-level e2e coverage

**Files:** `apps/backend/routes/meta.js`, `apps/backend/routes/session.js`, Test `tests/api/epigenomeRouteE2E.test.js`

- [ ] **Step 1: Write failing test** — create `tests/api/epigenomeRouteE2E.test.js` (mounts the meta router directly with a FAKE prisma; proves hydration reads persisted parent epigenome end-to-end):

```js
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const request = require('supertest');
const { createMetaRouter } = require('../../apps/backend/routes/meta');
const meta = require('../../apps/backend/services/metaProgression');

function fakePrisma(seed = {}) {
  const rows = new Map(Object.entries(seed)); // `${c}:${u}` -> { campaignId, unitId, epigenome }
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
      async upsert() {
        return null;
      },
    },
  };
}

function appWith(prisma) {
  const app = express();
  app.use(express.json());
  app.use('/api/meta', createMetaRouter({ prisma }));
  return app;
}

test('mating/roll hydrates parent epigenome from injected prisma (e2e route)', async () => {
  meta._resetLineageRegistry();
  const prisma = fakePrisma({
    'cE:pa': {
      campaignId: 'cE',
      unitId: 'pa',
      epigenome: { utility: 1.0, liberty: 0.5, morality: 0.5 },
    },
    'cE:pb': {
      campaignId: 'cE',
      unitId: 'pb',
      epigenome: { utility: 1.0, liberty: 0.5, morality: 0.5 },
    },
  });
  const app = appWith(prisma);
  // NOTE: parents passed WITHOUT inline epigenome -> route must hydrate from prisma.
  const res = await request(app)
    .post('/api/meta/mating/roll')
    .send({
      campaign_id: 'cE',
      parent_a: { id: 'pa' },
      parent_b: { id: 'pb' },
      biome_id: 'dune',
    });
  assert.equal(res.status, 200);
  // hydrated utility 1.0 both -> offspring epigenome biased on utility (deviation > 0)
  assert.ok(res.body.offspring.epigenome, 'offspring carries epigenome from hydrated parents');
  assert.ok(res.body.offspring.epigenome.utility > 0.5, 'utility-biased from hydrated parents');
  // bridge recorded with campaign_id
  const entries = meta.listLineageEntries('cE');
  assert.ok(entries.length >= 1, 'offspring recorded scoped to campaign cE');
});
```

- [ ] **Step 2: Run RED** — `node --test tests/api/epigenomeRouteE2E.test.js` → FAIL (route uses `require('../db/prisma')`, ignores injected `opts.prisma`; hydration no-ops → offspring.epigenome undefined OR not utility-biased).

- [ ] **Step 3: Add the DI seam in `meta.js`** — in the `/mating/roll` hydration block (~257), change:

```js
const { prisma } = require('../db/prisma');
```

to:

```js
const prisma = opts.prisma || require('../db/prisma').prisma;
```

(`opts` is in scope from `createMetaRouter(opts)`.)

- [ ] **Step 4: Add the same DI seam in `session.js`** — in the epigenome accumulation block (~2952), change `const { prisma } = require('../db/prisma');` to `const prisma = options.prisma || require('../db/prisma').prisma;` (`options` is in scope from `createSessionRouter(options)`). This makes session-end accumulation injectable too (covered by Task-1 regression + the existing inline-helper; a full session-lifecycle e2e is deferred — the seam is the deliverable here).

- [ ] **Step 5: Run GREEN** — `node --test tests/api/epigenomeRouteE2E.test.js` (1 pass).

- [ ] **Step 6: Regression** — `node --test tests/api/*.test.js` → 0 fail (the `opts.prisma || require(...)` fallback preserves prod behavior when no prisma injected).

- [ ] **Step 7: Commit** — `feat(epigenome): prisma DI seam + route-level e2e hydration test` + trailers. `git add apps/backend/routes/meta.js apps/backend/routes/session.js tests/api/epigenomeRouteE2E.test.js`.

---

## Task 3: PR

- [ ] Push + PR with summary; full `node --test tests/api/*.test.js` green; update-branch → checks → squash merge (no `--admin`).

## Self-Review

- Back-compat: every reader's campaignId is OPTIONAL (omitted = today's global behavior); DI seam is `opts.prisma || require(...)` (prod unchanged). Existing tests untouched → must stay green (verify each task's regression step).
- Scoping correctness: same lineage_id across 2 campaigns no longer inflates a tribe when scoped; `/tribes?campaign_id=` scopes; bridge passes campaign_id.
- Prune: per-campaign FIFO cap (1000, start-value) evicts oldest by created_at; no cross-campaign eviction.
- e2e: mating route hydration proven against an injected fake prisma model (was previously only inline-fed).

## Deferred (still)

- Full session-lifecycle e2e for session-end accumulation (the DI seam is added; a create→play→end supertest is heavier — inline-helper + seam suffice for now).
- Persisting `_offspringRegistry` across process restarts (still in-memory; Sprint D non-goal).
- Prune cap value (1000/campaign) = start-value.
