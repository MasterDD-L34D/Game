// TKT-P4 (ENNEAVOICE-FE + DIALOGUE-COLORS + CONVICTION-BADGES) — backend wire.
//
// buildDebriefSummary already attached ennea_voices (engine LIVE). This sprint
// also attaches:
//   - inner_voices (innerVoice.evaluateVoiceTriggers, MBTI-tinted)
//   - mbti_surface.conviction_badges (mbtiSurface.buildConvictionBadgesMap)
//   - MBTI color tags on BOTH ennea + inner voice text (mbtiPalette.mbtiTaggedLine)
// so the debrief payload carries everything the panel renders.
//
// No new engine — pure composition of existing pure selectors + real YAML data.

'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { buildDebriefSummary } = require('../../apps/backend/services/rewardEconomy');

function makeVcSnapshot() {
  return {
    turns_played: 6,
    per_actor: {
      p_a: {
        aggregate_indices: { aggression: 0.7 },
        mbti_type: 'INTJ',
        mbti_axes: {
          E_I: { value: 0.5, coverage: 'full' }, // deadband → no badge/pole
          S_N: { value: 0.92, coverage: 'full' }, // decisive
          T_F: { value: 0.08, coverage: 'full' }, // decisive
          J_P: { value: 0.5, coverage: 'full' },
        },
        ennea_archetypes: [{ id: 'Architetto(5)', triggered: true }],
      },
    },
  };
}

const VICTORY_SESSION = {
  session_id: 's-test-1',
  outcome: 'victory',
  events: [],
  damage_taken: {},
};
const PE_RESULT = { per_actor: { p_a: { pe_total: 7 } }, session_total: 7 };

test('ennea_voices text is MBTI color-tagged (TKT-P4-DIALOGUE-COLORS)', () => {
  const debrief = buildDebriefSummary(VICTORY_SESSION, makeVcSnapshot(), PE_RESULT);
  assert.ok(Array.isArray(debrief.ennea_voices), 'ennea_voices array');
  assert.ok(debrief.ennea_voices.length >= 1, 'at least one ennea voice');
  const v = debrief.ennea_voices[0];
  assert.ok(v.mbti_pole, 'ennea voice carries a dominant mbti_pole');
  assert.match(v.text, /<mbti axis="[EISNTFJP]">/, 'ennea text wrapped via mbtiTaggedLine');
});

test('inner_voices attached + color-tagged (TKT-P4-DIALOGUE-COLORS)', () => {
  const debrief = buildDebriefSummary(VICTORY_SESSION, makeVcSnapshot(), PE_RESULT);
  assert.ok(Array.isArray(debrief.inner_voices), 'inner_voices array');
  assert.ok(debrief.inner_voices.length >= 1, 'at least one inner voice');
  for (const v of debrief.inner_voices) {
    assert.equal(v.actor_id, 'p_a');
    assert.match(v.mbti_pole, /^[EISNTFJP]$/, 'inner voice carries pole letter');
    assert.match(v.text, /<mbti axis="[EISNTFJP]">/, 'inner text wrapped via mbtiTaggedLine');
    assert.ok(v.voice_id, 'voice_id present');
  }
});

test('mbti_surface.conviction_badges attached (TKT-P4-CONVICTION-BADGES)', () => {
  const debrief = buildDebriefSummary(VICTORY_SESSION, makeVcSnapshot(), PE_RESULT);
  assert.ok(
    debrief.mbti_surface && typeof debrief.mbti_surface === 'object',
    'mbti_surface object',
  );
  const badges = debrief.mbti_surface.conviction_badges;
  assert.ok(badges && typeof badges === 'object', 'conviction_badges map');
  assert.ok(Array.isArray(badges.p_a), 'badges for decisive actor p_a');
  assert.ok(badges.p_a.length >= 1, 'at least one badge for decisive axes');
  const b = badges.p_a[0];
  assert.match(b.letter, /^[EISNTFJP]$/, 'badge has letter');
  assert.match(b.color, /^#[0-9a-fA-F]{6}$/, 'badge has hex color');
});

test('graceful: empty per_actor → empty voices + empty conviction map', () => {
  const debrief = buildDebriefSummary(
    VICTORY_SESSION,
    { turns_played: 0, per_actor: {} },
    {
      per_actor: {},
      session_total: 0,
    },
  );
  assert.deepEqual(debrief.ennea_voices, []);
  assert.deepEqual(debrief.inner_voices, []);
  assert.deepEqual(debrief.mbti_surface.conviction_badges, {});
});

test('defeat outcome still attaches inner_voices + conviction (beat = defeat)', () => {
  const debrief = buildDebriefSummary(
    { ...VICTORY_SESSION, outcome: 'defeat' },
    makeVcSnapshot(),
    PE_RESULT,
  );
  assert.ok(Array.isArray(debrief.inner_voices));
  assert.ok(debrief.mbti_surface.conviction_badges.p_a.length >= 1);
});
