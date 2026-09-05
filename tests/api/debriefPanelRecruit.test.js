// OD-001 Path A Sprint B (2026-04-26): debriefPanel recruit helpers tests.
//
// Coverage:
//   1. computeRecruitAffinity — base scoring (regular vs boss)
//   2. MBTI same-type resonance (+2)
//   3. MBTI compat likes (+1) / dislikes (-1)
//   4. Missing MBTI on either side → only baseline (no compat term)
//   5. Threshold export sanity
//   6. Pure helper does not throw on null/invalid input

'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');

async function loadHelpers() {
  return import('../../apps/play/src/debriefPanel.js');
}

test('computeRecruitAffinity — regular kill baseline +1', async () => {
  const { computeRecruitAffinity } = await loadHelpers();
  const out = computeRecruitAffinity({ id: 'e1', mbti_type: null, hp: 0 }, { mbti_type: null }, {});
  assert.equal(out.affinity, 1);
  assert.ok(out.reasons.some((r) => r.includes('regular defeat')));
});

test('computeRecruitAffinity — boss baseline +1', async () => {
  const { computeRecruitAffinity } = await loadHelpers();
  const out = computeRecruitAffinity({ id: 'boss', is_boss: true, hp: 0 }, { mbti_type: null }, {});
  assert.equal(out.affinity, 1);
  assert.ok(out.reasons.some((r) => r.includes('boss defeated')));
});

test('computeRecruitAffinity — same MBTI grants +2 resonance', async () => {
  const { computeRecruitAffinity } = await loadHelpers();
  const out = computeRecruitAffinity(
    { id: 'e1', mbti_type: 'INTJ', hp: 0 },
    { mbti_type: 'INTJ' },
    {},
  );
  // baseline +1 (regular) + 2 (resonance) = 3
  assert.equal(out.affinity, 3);
  assert.ok(out.reasons.some((r) => r.includes('risonanza')));
});

test('computeRecruitAffinity — compat likes grants +1', async () => {
  const { computeRecruitAffinity } = await loadHelpers();
  const compat = { INTJ: { likes: ['ENTJ'], dislikes: ['ESFP'] } };
  const out = computeRecruitAffinity(
    { id: 'e1', mbti_type: 'ENTJ', hp: 0 },
    { mbti_type: 'INTJ' },
    compat,
  );
  // baseline +1 + likes +1 = 2
  assert.equal(out.affinity, 2);
  assert.ok(out.reasons.some((r) => r.includes('like')));
});

test('computeRecruitAffinity — compat dislikes grants -1', async () => {
  const { computeRecruitAffinity } = await loadHelpers();
  const compat = { INTJ: { likes: ['ENTJ'], dislikes: ['ESFP'] } };
  const out = computeRecruitAffinity(
    { id: 'e1', mbti_type: 'ESFP', hp: 0 },
    { mbti_type: 'INTJ' },
    compat,
  );
  // baseline +1 - dislike 1 = 0 (UI: NOT eligible since threshold=1)
  assert.equal(out.affinity, 0);
  assert.ok(out.reasons.some((r) => r.includes('dislike')));
});

test('computeRecruitAffinity — missing MBTI ignores compat term', async () => {
  const { computeRecruitAffinity } = await loadHelpers();
  const compat = { INTJ: { likes: ['ENTJ'] } };
  const out = computeRecruitAffinity(
    { id: 'e1', hp: 0 }, // no mbti_type
    { mbti_type: 'INTJ' },
    compat,
  );
  assert.equal(out.affinity, 1); // baseline only
});

test('computeRecruitAffinity — null/invalid input returns 0 affinity', async () => {
  const { computeRecruitAffinity } = await loadHelpers();
  assert.equal(computeRecruitAffinity(null, null, {}).affinity, 0);
  assert.equal(computeRecruitAffinity(undefined, null, {}).affinity, 0);
});

test('RECRUIT_AFFINITY_UI_THRESHOLD exported as 1', async () => {
  const { RECRUIT_AFFINITY_UI_THRESHOLD } = await loadHelpers();
  assert.equal(RECRUIT_AFFINITY_UI_THRESHOLD, 1);
});

test('api.metaRecruit — backward compat (no extra args)', async () => {
  const { api } = await import('../../apps/play/src/api.js');
  const calls = [];
  const original = globalThis.fetch;
  globalThis.fetch = async (url, opts = {}) => {
    calls.push({ url, opts });
    return {
      ok: true,
      status: 200,
      async json() {
        return { success: true };
      },
      async text() {
        return '{}';
      },
    };
  };
  try {
    await api.metaRecruit('npc_compat_legacy');
    assert.equal(calls[0].url, '/api/meta/recruit');
    const body = JSON.parse(calls[0].opts.body);
    assert.equal(body.npc_id, 'npc_compat_legacy');
    assert.equal(body.source_session_id, undefined);
    assert.equal(body.affinity_at_recruit, undefined);
  } finally {
    if (original) globalThis.fetch = original;
    else delete globalThis.fetch;
  }
});

test('api.metaRecruit — passes sourceSessionId + affinityAtRecruit when provided', async () => {
  const { api } = await import('../../apps/play/src/api.js');
  const calls = [];
  const original = globalThis.fetch;
  globalThis.fetch = async (url, opts = {}) => {
    calls.push({ url, opts });
    return {
      ok: true,
      status: 200,
      async json() {
        return { success: true };
      },
      async text() {
        return '{}';
      },
    };
  };
  try {
    await api.metaRecruit('npc_e2e', 'sess_xyz', 2);
    const body = JSON.parse(calls[0].opts.body);
    assert.equal(body.npc_id, 'npc_e2e');
    assert.equal(body.source_session_id, 'sess_xyz');
    assert.equal(body.affinity_at_recruit, 2);
  } finally {
    if (original) globalThis.fetch = original;
    else delete globalThis.fetch;
  }
});
