// OD-001 Path A — V3 Mating/Nido frontend API client + helpers tests.
//
// Coverage:
//   1. apps/play/src/api.js — 7 metaXxx methods exist + call /api/meta/* with
//      correct method + body shape (mock fetch).
//   2. apps/play/src/debriefPanel.js — findRecruitableEnemies pure helper
//      (DOM-free, JSDom not required).
//   3. apps/play/src/nestHub.js — module loads without DOM (init early-exit).

'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');

async function loadApiModule() {
  // ESM dynamic import — same pattern as formsPanelInfer.test.js.
  return import('../../apps/play/src/api.js');
}

async function loadDebriefHelper() {
  return import('../../apps/play/src/debriefPanel.js');
}

async function loadNestHub() {
  return import('../../apps/play/src/nestHub.js');
}

// Helper: install a fetch mock that records calls + returns canned JSON.
function installFetchMock(responses = []) {
  const calls = [];
  const responseQueue = [...responses];
  const original = globalThis.fetch;
  globalThis.fetch = async (url, opts = {}) => {
    calls.push({ url, opts });
    const next = responseQueue.shift() || { ok: true, status: 200, body: {} };
    return {
      ok: next.ok,
      status: next.status,
      async json() {
        return next.body;
      },
      async text() {
        return JSON.stringify(next.body);
      },
    };
  };
  return {
    calls,
    restore() {
      if (original) globalThis.fetch = original;
      else delete globalThis.fetch;
    },
  };
}

test('api exports 7 OD-001 meta methods', async () => {
  const { api } = await loadApiModule();
  for (const name of [
    'metaNpgList',
    'metaAffinity',
    'metaTrust',
    'metaRecruit',
    'metaMating',
    'metaNestGet',
    'metaNestSetup',
  ]) {
    assert.equal(typeof api[name], 'function', `api.${name} should be a function`);
  }
});

test('api.metaNpgList GETs /api/meta/npg and returns parsed payload', async () => {
  const { api } = await loadApiModule();
  const mock = installFetchMock([
    { ok: true, status: 200, body: { npcs: [{ npc_id: 'a', affinity: 1 }], nest: { level: 0 } } },
  ]);
  try {
    const res = await api.metaNpgList();
    assert.equal(mock.calls.length, 1);
    assert.equal(mock.calls[0].url, '/api/meta/npg');
    // jsonFetch wraps in { ok, status, data }
    assert.equal(res.ok, true);
    assert.equal(res.data.nest.level, 0);
    assert.equal(res.data.npcs[0].npc_id, 'a');
  } finally {
    mock.restore();
  }
});

test('api.metaAffinity POSTs npc_id+delta', async () => {
  const { api } = await loadApiModule();
  const mock = installFetchMock([{ ok: true, status: 200, body: { npc: {}, can_recruit: false } }]);
  try {
    await api.metaAffinity('npc_skiv', 2);
    assert.equal(mock.calls.length, 1);
    assert.equal(mock.calls[0].url, '/api/meta/affinity');
    assert.equal(mock.calls[0].opts.method, 'POST');
    const body = JSON.parse(mock.calls[0].opts.body);
    assert.deepEqual(body, { npc_id: 'npc_skiv', delta: 2 });
  } finally {
    mock.restore();
  }
});

test('api.metaTrust POSTs npc_id+delta', async () => {
  const { api } = await loadApiModule();
  const mock = installFetchMock([{ ok: true, status: 200, body: { npc: {}, can_mate: false } }]);
  try {
    await api.metaTrust('npc_x', -1);
    assert.equal(mock.calls[0].url, '/api/meta/trust');
    const body = JSON.parse(mock.calls[0].opts.body);
    assert.deepEqual(body, { npc_id: 'npc_x', delta: -1 });
  } finally {
    mock.restore();
  }
});

test('api.metaRecruit POSTs npc_id', async () => {
  const { api } = await loadApiModule();
  const mock = installFetchMock([{ ok: true, status: 200, body: { success: true } }]);
  try {
    await api.metaRecruit('enemy_01');
    assert.equal(mock.calls[0].url, '/api/meta/recruit');
    assert.equal(mock.calls[0].opts.method, 'POST');
    const body = JSON.parse(mock.calls[0].opts.body);
    assert.deepEqual(body, { npc_id: 'enemy_01' });
  } finally {
    mock.restore();
  }
});

test('api.metaMating POSTs npc_id + party_member', async () => {
  const { api } = await loadApiModule();
  const mock = installFetchMock([{ ok: true, status: 200, body: { success: false } }]);
  try {
    await api.metaMating('npc_alpha', { mbti_type: 'INTJ', trait_ids: ['t1', 't2'] });
    assert.equal(mock.calls[0].url, '/api/meta/mating');
    const body = JSON.parse(mock.calls[0].opts.body);
    assert.equal(body.npc_id, 'npc_alpha');
    assert.equal(body.party_member.mbti_type, 'INTJ');
    assert.deepEqual(body.party_member.trait_ids, ['t1', 't2']);
  } finally {
    mock.restore();
  }
});

test('api.metaNestGet GETs /api/meta/nest', async () => {
  const { api } = await loadApiModule();
  const mock = installFetchMock([
    { ok: true, status: 200, body: { level: 1, biome: 'savana', requirements_met: true } },
  ]);
  try {
    const res = await api.metaNestGet();
    assert.equal(mock.calls[0].url, '/api/meta/nest');
    assert.equal(res.data.biome, 'savana');
  } finally {
    mock.restore();
  }
});

test('api.metaNestSetup POSTs biome + requirements_met (default true)', async () => {
  const { api } = await loadApiModule();
  const mock = installFetchMock([
    { ok: true, status: 200, body: { level: 1, biome: 'foresta_pluviale' } },
  ]);
  try {
    await api.metaNestSetup('foresta_pluviale');
    const body = JSON.parse(mock.calls[0].opts.body);
    assert.equal(body.biome, 'foresta_pluviale');
    assert.equal(body.requirements_met, true);
  } finally {
    mock.restore();
  }
});

test('api.metaNestSetup honors explicit requirements_met=false', async () => {
  const { api } = await loadApiModule();
  const mock = installFetchMock([{ ok: true, status: 200, body: {} }]);
  try {
    await api.metaNestSetup('default', false);
    const body = JSON.parse(mock.calls[0].opts.body);
    assert.equal(body.requirements_met, false);
  } finally {
    mock.restore();
  }
});

test('findRecruitableEnemies — empty/null world returns []', async () => {
  const { findRecruitableEnemies } = await loadDebriefHelper();
  assert.deepEqual(findRecruitableEnemies(null), []);
  assert.deepEqual(findRecruitableEnemies({}), []);
  assert.deepEqual(findRecruitableEnemies({ units: null }), []);
});

test('findRecruitableEnemies — filters out alive units', async () => {
  const { findRecruitableEnemies } = await loadDebriefHelper();
  const world = {
    units: [
      { id: 'e1', team: 'enemy', hp: 5, hp_max: 10 },
      { id: 'e2', team: 'enemy', hp: 0, hp_max: 8 },
    ],
  };
  const out = findRecruitableEnemies(world);
  assert.equal(out.length, 1);
  assert.equal(out[0].id, 'e2');
});

test('findRecruitableEnemies — filters out player/ally team', async () => {
  const { findRecruitableEnemies } = await loadDebriefHelper();
  const world = {
    units: [
      { id: 'p1', team: 'player', hp: 0 }, // dead but ally → skip
      { id: 'a1', team: 'ally', hp: 0 },
      { id: 'e1', team: 'enemy', hp: 0, mbti_type: 'INTJ' },
    ],
  };
  const out = findRecruitableEnemies(world);
  assert.equal(out.length, 1);
  assert.equal(out[0].id, 'e1');
  assert.equal(out[0].mbti_type, 'INTJ');
});

test('findRecruitableEnemies — preserves name + hp_max + mbti_type', async () => {
  const { findRecruitableEnemies } = await loadDebriefHelper();
  const out = findRecruitableEnemies({
    units: [{ id: 'foo', name: 'Skiv', team: 'wild', hp: 0, hp_max: 12, mbti_type: 'ENFP' }],
  });
  assert.equal(out[0].name, 'Skiv');
  assert.equal(out[0].team, 'wild');
  assert.equal(out[0].hp_max, 12);
  assert.equal(out[0].mbti_type, 'ENFP');
});

test('nestHub module exports init/open/close functions and is DOM-safe', async () => {
  // Ensure no `document` global leaks; module body uses `typeof document` guards.
  const wasDoc = globalThis.document;
  delete globalThis.document;
  try {
    const mod = await loadNestHub();
    assert.equal(typeof mod.initNestHub, 'function');
    assert.equal(typeof mod.openNestHub, 'function');
    assert.equal(typeof mod.closeNestHub, 'function');
    // initNestHub should not throw without a DOM.
    const handle = mod.initNestHub({
      getPartyMember: () => ({ mbti_type: 'INFP', trait_ids: [] }),
    });
    assert.equal(typeof handle.refresh, 'function');
  } finally {
    if (wasDoc) globalThis.document = wasDoc;
  }
});
