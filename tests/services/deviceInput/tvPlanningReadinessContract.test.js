// SPEC-B contract-test (sez. 3.5 Planning combat, criterio acceptance #2):
// during the WEGO planning phase the TV (public mirror) must show ONLY the
// aggregated group readiness (N/M) + the phase-state -- NEVER per-player
// readiness ("chi ha finito / chi sta pianificando" = timing-tell, NOT TV data),
// NEVER the private preview, NEVER the behavioral secret signals.
//
// SPEC-A provides the MECHANISM (deviceInputLedger tierFilter); SPEC-B is the
// CONTRACT that names what each tier may carry. tierFilter.test.js proves the
// generic strip; THIS test pins the planning-phase invariant on the REAL device-
// event shape so a per-player readiness mis-tagged public/aggregated (leaking the
// top-level playerId to the TV) fails CI.
//
// Identity lives at TOP-LEVEL `playerId` (validateDeviceEvent constructs
// { kind, type, playerId, tier, payload? }), and a `decision` event DEFAULTS to
// tier `public` -- so a readiness decision that forgets the explicit private
// override would leak the player's identity to the TV. The leak-guard below
// asserts on the real field (playerId), not a payload key.

const { test } = require('node:test');
const assert = require('node:assert');
const { filterForTvMirror } = require('../../../apps/backend/services/deviceInput/tierFilter');
const { validateDeviceEvent } = require('../../../apps/backend/services/deviceInput/eventSchema');

// Validate a device event through the canonical schema (real wire shape, top-level
// playerId). Throws if the fixture is malformed so the test exercises the contract.
function dev(ev) {
  const res = validateDeviceEvent(ev);
  assert.ok(res.ok, `fixture invalid: ${res.error}`);
  return res.event;
}

// A representative planning-phase event set (tiers per SPEC-B sez. 3.5).
// Server aggregates (phase-state, N/M tally) are NOT device events -> no playerId;
// per-player events are validated device events -> top-level playerId.
function planningPhaseEvents() {
  return [
    // public: server-emitted phase state + table tension (no plan, no readiness, no identity)
    {
      type: 'planning_phase_state',
      tier: 'public',
      payload: { open: true, time_to_commit_ms: 30000 },
    },
    { type: 'table_tension', tier: 'public', payload: { mood: 'teso' } },
    // aggregated: server-computed group readiness count only (N/M), the ONLY TV readiness
    { type: 'planning_readiness_tally', tier: 'aggregated', payload: { ready: 2, total: 4 } },
    // private: per-player readiness (timing-tell) -- explicit private override REQUIRED
    // (a `decision` defaults to public!), carries top-level playerId
    dev({
      kind: 'decision',
      type: 'player_readiness',
      playerId: 'p1',
      tier: 'private',
      payload: { ready: true },
    }),
    dev({
      kind: 'decision',
      type: 'player_readiness',
      playerId: 'p2',
      tier: 'private',
      payload: { ready: false },
    }),
    // private: the non-canonical preview is private exploration, never TV (invariant sez. 3.5)
    dev({
      kind: 'decision',
      type: 'planning_preview',
      playerId: 'p1',
      tier: 'private',
      payload: { draft_intent: 'move 3,4' },
    }),
    // secret: behavioral signals (SPEC-A sez. 6) -- default tier secret
    dev({ kind: 'signal', type: 'commit_latency', playerId: 'p1', value: 1200 }),
    dev({ kind: 'signal', type: 'hesitation_score', playerId: 'p2', value: 0.7 }),
  ];
}

// True if any TV-surviving event leaks a player identity (real top-level field OR
// a payload key). This is the contract guard SPEC-B 3.5 enforces.
function leaksIdentity(tvEvents) {
  return tvEvents.some(
    (e) =>
      (typeof e.playerId === 'string' && e.playerId) ||
      (e.payload && Object.prototype.hasOwnProperty.call(e.payload, 'player_id')) ||
      (e.payload && Object.prototype.hasOwnProperty.call(e.payload, 'playerId')),
  );
}

test('SPEC-B 3.5: TV planning mirror carries phase-state + aggregated tally only', () => {
  const tv = filterForTvMirror(planningPhaseEvents());
  const types = tv.map((e) => e.type).sort();
  assert.deepEqual(types, ['planning_phase_state', 'planning_readiness_tally', 'table_tension']);
});

test('SPEC-B 3.5: per-player readiness NEVER reaches the TV (no identity leak)', () => {
  const tv = filterForTvMirror(planningPhaseEvents());
  assert.equal(
    tv.some((e) => e.type === 'player_readiness'),
    false,
    'player_readiness must be stripped from the TV mirror',
  );
  // The real failure mode: a TV-surviving event carrying top-level playerId.
  assert.equal(leaksIdentity(tv), false, 'no TV event may carry a player identity');
});

test('SPEC-B 3.5: guard CATCHES a readiness decision mis-tagged public (leak regression)', () => {
  // A `decision` defaults to tier public; a readiness event that forgets the
  // explicit private override survives the TV filter carrying top-level playerId.
  // This proves the guard above actually detects the leak (not a vacuous pass).
  const leaked = dev({
    kind: 'decision',
    type: 'player_readiness',
    playerId: 'p3',
    payload: { ready: true },
  });
  assert.equal(leaked.tier, 'public', 'sanity: a decision defaults to public');
  const tv = filterForTvMirror([leaked]);
  assert.equal(tv.length, 1, 'a public-tagged readiness reaches the TV mirror');
  assert.equal(leaksIdentity(tv), true, 'the guard detects the leaked top-level playerId');
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
