'use strict';
// fase-2c routing wiring: a meta-network traversal harness that exercises the GAP-C
// next-node routing (selectNextNodes) over the real graph via GET /api/campaign/meta-
// network/next. Flag-gated (META_NETWORK_ROUTING=true) -> de-risks the routing graph in
// TEST without enabling it in the live campaign (the runner's act/chapter campaign is
// unchanged; PROD-enable stays a master-dd verdict, goal doc fase-2c). Covers eligibility,
// anti-revisit, season arc-conditions, parallel-edge dedup, and terminal walk.
process.env.IDEA_ENGINE_DISABLE_STATUS_REFRESH = '1';
const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { createApp } = require('../../apps/backend/app');
const { nextNodes, traverse } = require('../../tools/sim/meta-network-driver');

function httpFor(app) {
  return {
    get: (p, query) =>
      request(app)
        .get(p)
        .query(query || {})
        .then((r) => ({ status: r.status, body: r.body })),
  };
}

// Run fn with META_NETWORK_ROUTING set to `value`, restoring the prior value after. The
// endpoint reads process.env at request time (campaign.js:215), so this scopes the flag.
async function withFlag(value, fn) {
  const prev = process.env.META_NETWORK_ROUTING;
  if (value === undefined) delete process.env.META_NETWORK_ROUTING;
  else process.env.META_NETWORK_ROUTING = value;
  try {
    return await fn();
  } finally {
    if (prev === undefined) delete process.env.META_NETWORK_ROUTING;
    else process.env.META_NETWORK_ROUTING = prev;
  }
}

test('nextNodes: flag OFF -> enabled:false no-op (band-safe, matches live default)', async (t) => {
  const { app, close } = createApp({ databasePath: null });
  t.after(async () => close && (await close().catch(() => {})));
  await withFlag(undefined, async () => {
    const res = await nextNodes(httpFor(app), { from: 'BADLANDS' });
    assert.equal(res.enabled, false);
    assert.deepEqual(res.candidates, []);
  });
});

test('nextNodes: flag ON from BADLANDS -> eligible candidates, weight-desc deterministic', async (t) => {
  const { app, close } = createApp({ databasePath: null });
  t.after(async () => close && (await close().catch(() => {})));
  await withFlag('true', async () => {
    const res = await nextNodes(httpFor(app), { from: 'BADLANDS' });
    assert.equal(res.enabled, true);
    assert.equal(res.reason, 'eligible');
    // BADLANDS -> FORESTA_TEMPERATA (w0.55) + DESERTO_CALDO (w0.4); weight DESC order.
    assert.deepEqual(
      res.candidates.map((c) => c.node_id),
      ['FORESTA_TEMPERATA', 'DESERTO_CALDO'],
    );
  });
});

test('nextNodes: season arc-condition gates the winter bridge (fail-closed without season)', async (t) => {
  const { app, close } = createApp({ databasePath: null });
  t.after(async () => close && (await close().catch(() => {})));
  await withFlag('true', async () => {
    const http = httpFor(app);
    // From FORESTA_TEMPERATA the CRYOSTEPPE edge carries conditions.season:[winter].
    const noSeason = await nextNodes(http, { from: 'FORESTA_TEMPERATA' });
    assert.ok(
      noSeason.blocked.some((b) => b.node_id === 'CRYOSTEPPE' && b.blocked_by === 'season'),
      `CRYOSTEPPE blocked by season when season absent; blocked=${JSON.stringify(noSeason.blocked)}`,
    );
    assert.ok(!noSeason.candidates.some((c) => c.node_id === 'CRYOSTEPPE'));
    // With season=winter the bridge opens.
    const winter = await nextNodes(http, { from: 'FORESTA_TEMPERATA', season: 'winter' });
    assert.ok(
      winter.candidates.some((c) => c.node_id === 'CRYOSTEPPE'),
      `CRYOSTEPPE eligible in winter; candidates=${JSON.stringify(winter.candidates.map((c) => c.node_id))}`,
    );
  });
});

test('nextNodes: parallel edges to one target collapse to a single candidate', async (t) => {
  const { app, close } = createApp({ databasePath: null });
  t.after(async () => close && (await close().catch(() => {})));
  await withFlag('true', async () => {
    // CRYOSTEPPE -> BADLANDS has TWO edges (trophic_spillover + corridor); the player picks
    // a NODE, so they collapse to one candidate keeping both edge_types.
    const res = await nextNodes(httpFor(app), { from: 'CRYOSTEPPE' });
    const badlands = res.candidates.filter((c) => c.node_id === 'BADLANDS');
    assert.equal(badlands.length, 1, 'BADLANDS appears exactly once');
    assert.deepEqual(badlands[0].edge_types.slice().sort(), ['corridor', 'trophic_spillover']);
  });
});

test('nextNodes: anti-revisit excludes an already-cleared target', async (t) => {
  const { app, close } = createApp({ databasePath: null });
  t.after(async () => close && (await close().catch(() => {})));
  await withFlag('true', async () => {
    const res = await nextNodes(httpFor(app), { from: 'BADLANDS', cleared: ['FORESTA_TEMPERATA'] });
    assert.ok(res.excluded.includes('FORESTA_TEMPERATA'), 'cleared target excluded');
    assert.deepEqual(
      res.candidates.map((c) => c.node_id),
      ['DESERTO_CALDO'],
    );
  });
});

test('traverse: flag ON walks the graph from BADLANDS, covers nodes, terminates clean', async (t) => {
  const { app, close } = createApp({ databasePath: null });
  t.after(async () => close && (await close().catch(() => {})));
  await withFlag('true', async () => {
    const res = await traverse(httpFor(app), { start: 'BADLANDS' });
    assert.equal(res.enabled, true);
    assert.equal(res.path[0], 'BADLANDS');
    assert.ok(
      res.coverage.nodes_visited >= 3,
      `covers multiple nodes, got ${res.coverage.nodes_visited}`,
    );
    // Greedy weight-desc walk ends when no fresh candidate remains.
    assert.ok(
      ['terminal', 'all_cleared', 'all_blocked'].includes(res.terminalReason),
      `clean terminal, got ${res.terminalReason}`,
    );
    // Every recorded reason is a real selectNextNodes reason (the graph was exercised).
    for (const s of res.steps) {
      assert.ok(
        ['eligible', 'filtered', 'terminal', 'all_cleared', 'all_blocked'].includes(s.reason),
      );
    }
  });
});

test('traverse: flag OFF -> enabled:false no-op', async (t) => {
  const { app, close } = createApp({ databasePath: null });
  t.after(async () => close && (await close().catch(() => {})));
  await withFlag(undefined, async () => {
    const res = await traverse(httpFor(app), { start: 'BADLANDS' });
    assert.equal(res.enabled, false);
    assert.equal(res.terminalReason, 'flag_off');
  });
});

test('traverse: a CRYOSTEPPE/winter walk CROSSES the winter bridge (Codex #2572 P2)', async (t) => {
  // From BADLANDS the greedy walk never reaches CRYOSTEPPE, so a winter run from there leaves
  // the season-gated bridge unexercised. Starting at CRYOSTEPPE makes the gate decisive:
  // in winter, step 1 takes the CRYOSTEPPE -> FORESTA_TEMPERATA winter bridge (w0.55 > the
  // BADLANDS alternative); without a season that edge is locked and the walk picks BADLANDS.
  const { app, close } = createApp({ databasePath: null });
  t.after(async () => close && (await close().catch(() => {})));
  await withFlag('true', async () => {
    const http = httpFor(app);
    const winter = await traverse(http, { start: 'CRYOSTEPPE', season: 'winter' });
    assert.equal(winter.path[0], 'CRYOSTEPPE');
    assert.equal(winter.path[1], 'FORESTA_TEMPERATA', `winter bridge crossed; path=${winter.path}`);
    const locked = await traverse(http, { start: 'CRYOSTEPPE', season: null });
    assert.equal(locked.path[1], 'BADLANDS', `bridge locked without season; path=${locked.path}`);
  });
});
