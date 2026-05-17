// OD-001 Path A Sprint B (2026-04-26): /api/meta/recruit endpoint extension.
// Tests the Wildermyth-style "defeat-then-recruit" affinity-bypass payload.
//
// Coverage:
//   1. Existing gate behavior preserved (no bypass payload → gate_not_met).
//   2. affinity_at_recruit >= threshold bypasses gate → success on first call.
//   3. source_session_id echoed in response when provided.
//   4. Invalid affinity_at_recruit (non-numeric) does NOT trigger bypass.
//   5. Already-recruited NPG → success false even with bypass.
//   6. /api/meta/compat returns compat_forme dictionary (or empty obj).

'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { createApp } = require('../../apps/backend/app');

test('recruit without bypass — gate denied at trust 0', async () => {
  const { app, close } = createApp({ databasePath: null });
  try {
    const res = await request(app)
      .post('/api/meta/recruit')
      .send({ npc_id: 'npc_no_bypass_01' })
      .expect(200);
    assert.equal(res.body.success, false);
    assert.equal(res.body.reason, 'gate_not_met');
  } finally {
    await close();
  }
});

test('recruit with affinity_at_recruit=1 — bypass applies → success', async () => {
  const { app, close } = createApp({ databasePath: null });
  try {
    const res = await request(app)
      .post('/api/meta/recruit')
      .send({
        npc_id: 'npc_bypass_01',
        source_session_id: 'sess_test_01',
        affinity_at_recruit: 1,
      })
      .expect(200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.npc.recruited, true);
    assert.equal(res.body.affinity_bypass_applied, true);
    assert.equal(res.body.source_session_id, 'sess_test_01');
  } finally {
    await close();
  }
});

test('recruit with affinity_at_recruit=2 — bypass also applies (any positive >=1)', async () => {
  const { app, close } = createApp({ databasePath: null });
  try {
    const res = await request(app)
      .post('/api/meta/recruit')
      .send({ npc_id: 'npc_bypass_high', affinity_at_recruit: 2 })
      .expect(200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.affinity_bypass_applied, true);
  } finally {
    await close();
  }
});

test('recruit with affinity_at_recruit=0 — bypass NOT applied → gate fail', async () => {
  const { app, close } = createApp({ databasePath: null });
  try {
    const res = await request(app)
      .post('/api/meta/recruit')
      .send({ npc_id: 'npc_no_bypass_zero', affinity_at_recruit: 0 })
      .expect(200);
    assert.equal(res.body.success, false);
    assert.equal(res.body.reason, 'gate_not_met');
    assert.equal(res.body.affinity_bypass_applied, undefined);
  } finally {
    await close();
  }
});

test('recruit with non-numeric affinity_at_recruit — ignored, gate fails', async () => {
  const { app, close } = createApp({ databasePath: null });
  try {
    const res = await request(app)
      .post('/api/meta/recruit')
      .send({ npc_id: 'npc_garbage_aff', affinity_at_recruit: 'lots' })
      .expect(200);
    assert.equal(res.body.success, false);
    assert.equal(res.body.reason, 'gate_not_met');
  } finally {
    await close();
  }
});

test('recruit twice with bypass — second call returns gate_not_met (already recruited)', async () => {
  const { app, close } = createApp({ databasePath: null });
  try {
    const first = await request(app)
      .post('/api/meta/recruit')
      .send({ npc_id: 'npc_double', affinity_at_recruit: 1 })
      .expect(200);
    assert.equal(first.body.success, true);
    const second = await request(app)
      .post('/api/meta/recruit')
      .send({ npc_id: 'npc_double', affinity_at_recruit: 1 })
      .expect(200);
    assert.equal(second.body.success, false);
    assert.equal(second.body.reason, 'gate_not_met');
  } finally {
    await close();
  }
});

test('recruit 400 on missing npc_id', async () => {
  const { app, close } = createApp({ databasePath: null });
  try {
    await request(app).post('/api/meta/recruit').send({}).expect(400);
  } finally {
    await close();
  }
});

test('GET /api/meta/compat returns compat_forme shape', async () => {
  const { app, close } = createApp({ databasePath: null });
  try {
    const res = await request(app).get('/api/meta/compat').expect(200);
    assert.equal(typeof res.body, 'object');
    assert.equal(typeof res.body.compat_forme, 'object');
    // mating.yaml shape: every entry has likes/dislikes lists.
    // If file present (canonical worktree) → ISTJ entry exists and has likes.
    // Tolerant on empty result for environments without the YAML file.
    if (res.body.compat_forme.ISTJ) {
      assert.ok(Array.isArray(res.body.compat_forme.ISTJ.likes));
    }
  } finally {
    await close();
  }
});
