'use strict';

process.env.IDEA_ENGINE_DISABLE_STATUS_REFRESH = '1';

const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { createFlaggedApp, turnEnd, twoUnits } = require('./sessionTestHelpers');

// enc_tutorial_03 is a DRAFT node-encounter (docs/planning/encounters-draft/), elimination
// objective. Static loadEncounter ignores drafts -> no encounter payload -> objective no_objective.
// graph_mode:true unions the draft dir -> the encounter (with its objective) loads.

test('session/start graph_mode:true loads a draft node-encounter', async (t) => {
  const handle = createFlaggedApp('true');
  t.after(async () => {
    handle.restore();
    if (typeof handle.close === 'function') await handle.close().catch(() => {});
  });

  const res = await request(handle.app)
    .post('/api/session/start')
    .send({ units: twoUnits(), encounter_id: 'enc_tutorial_03', graph_mode: true })
    .expect(200);
  const endRes = await turnEnd(handle.app, res.body.session_id);

  assert.equal(endRes.status, 200);
  assert.notEqual(
    endRes.body.objective_state.reason,
    'no_objective',
    'draft encounter objective loaded in graph mode',
  );
});

test('session/start without graph_mode does NOT load a draft (static path unchanged)', async (t) => {
  const handle = createFlaggedApp('true');
  t.after(async () => {
    handle.restore();
    if (typeof handle.close === 'function') await handle.close().catch(() => {});
  });

  const res = await request(handle.app)
    .post('/api/session/start')
    .send({ units: twoUnits(), encounter_id: 'enc_tutorial_03' }) // no graph_mode
    .expect(200);
  const endRes = await turnEnd(handle.app, res.body.session_id);

  assert.equal(endRes.status, 200);
  assert.equal(
    endRes.body.objective_state.reason,
    'no_objective',
    'draft NOT loaded without graph_mode -> no encounter payload',
  );
});
