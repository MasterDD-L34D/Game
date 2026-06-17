// SPEC-B contract-test (sez. 3.5 Planning combat, criterio acceptance #2):
// during the WEGO planning phase the TV (public mirror) must show ONLY the
// aggregated group readiness (N/M) + the phase-state -- NEVER per-player
// readiness ("chi ha finito / chi sta pianificando" = timing-tell, NOT TV data),
// NEVER the private preview, NEVER the behavioral secret signals.
//
// SPEC-A provides the MECHANISM (deviceInputLedger tierFilter); SPEC-B is the
// CONTRACT that names what each tier may carry. tierFilter.test.js proves the
// generic strip; THIS test pins the planning-phase invariant end-to-end so a
// future event mis-tagged `public`/`aggregated` (leaking per-player readiness to
// the TV) fails CI.

const { test } = require('node:test');
const assert = require('node:assert');
const { filterForTvMirror } = require('../../../apps/backend/services/deviceInput/tierFilter');

// A representative planning-phase event set (tiers per SPEC-B sez. 3.5).
function planningPhaseEvents() {
  return [
    // public: phase state + table tension only (no plan, no preview, no readiness)
    {
      type: 'planning_phase_state',
      tier: 'public',
      payload: { open: true, time_to_commit_ms: 30000 },
    },
    { type: 'table_tension', tier: 'public', payload: { mood: 'teso' } },
    // aggregated: group readiness count only (N/M) -- the ONLY readiness allowed on TV
    { type: 'planning_readiness_tally', tier: 'aggregated', payload: { ready: 2, total: 4 } },
    // private: per-player readiness (the timing-tell) MUST NOT reach the TV
    { type: 'player_readiness', tier: 'private', payload: { player_id: 'p1', ready: true } },
    { type: 'player_readiness', tier: 'private', payload: { player_id: 'p2', ready: false } },
    // private: the non-canonical preview is private exploration, never TV (invariant sez. 3.5)
    {
      type: 'planning_preview',
      tier: 'private',
      payload: { player_id: 'p1', draft_intent: 'move 3,4' },
    },
    // secret: behavioral signals (SPEC-A sez. 6)
    { type: 'commit_latency', tier: 'secret', payload: { player_id: 'p1', ms: 1200 } },
    { type: 'hesitation_score', tier: 'secret', payload: { player_id: 'p2', score: 0.7 } },
  ];
}

test('SPEC-B 3.5: TV planning mirror carries phase-state + aggregated tally only', () => {
  const tv = filterForTvMirror(planningPhaseEvents());
  const types = tv.map((e) => e.type).sort();
  assert.deepEqual(types, ['planning_phase_state', 'planning_readiness_tally', 'table_tension']);
});

test('SPEC-B 3.5: per-player readiness NEVER reaches the TV (timing-tell stripped)', () => {
  const tv = filterForTvMirror(planningPhaseEvents());
  // No event tagged as a per-player readiness survives.
  assert.equal(
    tv.some((e) => e.type === 'player_readiness'),
    false,
    'player_readiness must be stripped from the TV mirror',
  );
  // Defensive: no surviving TV event leaks a per-player identity in its payload
  // (the aggregated tally is counts-only). A future mis-tag that carried player_id
  // on a public/aggregated event would trip this.
  for (const e of tv) {
    assert.equal(
      e.payload && Object.prototype.hasOwnProperty.call(e.payload, 'player_id'),
      false,
      `${e.type} leaked player_id to the TV mirror`,
    );
  }
});

test('SPEC-B 3.5: the non-canonical planning preview is private, never TV', () => {
  const tv = filterForTvMirror(planningPhaseEvents());
  assert.equal(
    tv.some((e) => e.type === 'planning_preview'),
    false,
    'planning_preview is private exploration and must not appear on the TV',
  );
});

test('SPEC-B 3.5: aggregated readiness IS allowed on TV (counts only, N/M)', () => {
  const tv = filterForTvMirror(planningPhaseEvents());
  const tally = tv.find((e) => e.type === 'planning_readiness_tally');
  assert.ok(tally, 'the aggregated N/M tally is the one readiness signal allowed on TV');
  assert.equal(tally.payload.ready, 2);
  assert.equal(tally.payload.total, 4);
});
