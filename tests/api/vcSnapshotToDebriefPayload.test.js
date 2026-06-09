// 2026-05-15 Bundle C cross-stack parity — Game/-side debrief_payload serializer.
// Mirrors Godot v2 DebriefState.to_debrief_payload + #276 schema parity snapshot.

'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  vcSnapshotToDebriefPayload,
  CANONICAL_AXIS_KEYS,
} = require('../../apps/backend/services/coop/vcSnapshotToDebriefPayload');

function _snap(perActor) {
  return { session_id: 'test', per_actor: perActor, meta: {} };
}

function _fullActor(opts = {}) {
  return {
    raw_metrics: {},
    aggregate_indices: {},
    mbti_axes: {},
    mbti_type: 'INTJ',
    ennea_archetypes: opts.ennea ?? [
      { id: 'enn_conquistatore', triggered: true, condition: { gt: ['agg', 50] } },
    ],
    conviction_axis: opts.axis ?? {
      utility: 60,
      liberty: 50,
      morality: 55,
      events_classified: 4,
    },
    sentience: opts.sent ?? { tier: 'T3', source: 'species_catalog' },
  };
}

test('null/non-object input returns empty per_actor', () => {
  assert.deepEqual(vcSnapshotToDebriefPayload(null), { per_actor: {} });
  assert.deepEqual(vcSnapshotToDebriefPayload(undefined), { per_actor: {} });
  assert.deepEqual(vcSnapshotToDebriefPayload(42), { per_actor: {} });
});

test('snapshot without per_actor returns empty', () => {
  assert.deepEqual(vcSnapshotToDebriefPayload({}), { per_actor: {} });
});

test('full actor serializes all 3 layers', () => {
  const out = vcSnapshotToDebriefPayload(_snap({ pg_alice: _fullActor() }));
  const entry = out.per_actor.pg_alice;
  assert.equal(entry.sentience_tier, 'T3');
  assert.deepEqual(entry.conviction_axis, { utility: 60, liberty: 50, morality: 55 });
  assert.equal(entry.ennea_archetype, 'enn_conquistatore');
});

test('conviction_axis drops events_classified (4 keys → 3 canonical)', () => {
  const out = vcSnapshotToDebriefPayload(_snap({ pg: _fullActor() }));
  const axis = out.per_actor.pg.conviction_axis;
  assert.deepEqual(Object.keys(axis).sort(), CANONICAL_AXIS_KEYS.slice().sort());
  assert.equal('events_classified' in axis, false);
});

test('conviction_axis missing canonical key → axis omitted (back-compat)', () => {
  const actor = _fullActor({ axis: { utility: 60, liberty: 50 } }); // morality missing
  const out = vcSnapshotToDebriefPayload(_snap({ pg: actor }));
  assert.equal('conviction_axis' in out.per_actor.pg, false);
});

test('conviction_axis float values rounded to int', () => {
  const actor = _fullActor({
    axis: { utility: 60.7, liberty: 50.2, morality: 55.5, events_classified: 0 },
  });
  const out = vcSnapshotToDebriefPayload(_snap({ pg: actor }));
  const axis = out.per_actor.pg.conviction_axis;
  assert.equal(axis.utility, 61);
  assert.equal(axis.liberty, 50);
  assert.equal(axis.morality, 56);
});

test('ennea_archetypes empty array → ennea_archetype omitted', () => {
  const out = vcSnapshotToDebriefPayload(_snap({ pg: _fullActor({ ennea: [] }) }));
  assert.equal('ennea_archetype' in out.per_actor.pg, false);
});

test('ennea_archetypes first object .name picked', () => {
  const out = vcSnapshotToDebriefPayload(
    _snap({
      pg: _fullActor({
        ennea: [
          { id: 'enn_mediatore', triggered: true, condition: {} },
          { id: 'enn_stoico', triggered: true, condition: {} },
        ],
      }),
    }),
  );
  assert.equal(out.per_actor.pg.ennea_archetype, 'enn_mediatore');
});

test('ennea_archetypes bare-string fallback supported', () => {
  const out = vcSnapshotToDebriefPayload(_snap({ pg: _fullActor({ ennea: ['Riformatore'] }) }));
  assert.equal(out.per_actor.pg.ennea_archetype, 'Riformatore');
});

test('sentience without tier → sentience_tier omitted', () => {
  const out = vcSnapshotToDebriefPayload(
    _snap({ pg: _fullActor({ sent: { source: 'default-fallback' } }) }),
  );
  assert.equal('sentience_tier' in out.per_actor.pg, false);
});

test('actor with zero meaningful surface omitted entirely', () => {
  const empty = {
    raw_metrics: {},
    aggregate_indices: {},
    mbti_axes: {},
    mbti_type: 'INTJ',
    ennea_archetypes: [],
    conviction_axis: { utility: 50 }, // missing 2 canonical keys → axis dropped
    sentience: { source: 'default-fallback' }, // tier missing
  };
  const out = vcSnapshotToDebriefPayload(_snap({ pg_empty: empty }));
  assert.equal('pg_empty' in out.per_actor, false);
});

test('multi-actor preserves all units with meaningful data', () => {
  const out = vcSnapshotToDebriefPayload(
    _snap({
      pg_a: _fullActor({ sent: { tier: 'T2', source: 'species_catalog' } }),
      pg_b: _fullActor({ sent: { tier: 'T5', source: 'species_catalog' } }),
    }),
  );
  assert.equal(Object.keys(out.per_actor).length, 2);
  assert.equal(out.per_actor.pg_a.sentience_tier, 'T2');
  assert.equal(out.per_actor.pg_b.sentience_tier, 'T5');
});

test('JSON roundtrip preserves schema (HTTP POST contract)', () => {
  const out = vcSnapshotToDebriefPayload(_snap({ pg: _fullActor() }));
  const roundtrip = JSON.parse(JSON.stringify(out));
  assert.deepEqual(roundtrip, out);
});

test('integration: buildVcSnapshot output → debrief_payload schema', () => {
  // Real-world integration: feed actual vcScoring output through serializer.
  const { buildVcSnapshot } = require('../../apps/backend/services/vcScoring');
  const session = {
    units: [{ id: 'pg_skiv', species_id: 'dune_stalker', applied_traits: [] }],
    events: Array.from({ length: 6 }, (_, i) => ({
      action_type: 'attack',
      actor_id: 'pg_skiv',
      target_id: 'enemy',
      turn: i + 1,
      damage_dealt: 5,
    })),
  };
  const snap = buildVcSnapshot(session, {});
  const payload = vcSnapshotToDebriefPayload(snap);
  // dune_stalker has sentience tier T2 in species_catalog.
  assert.equal(payload.per_actor.pg_skiv.sentience_tier, 'T2');
  // Conviction axis baseline.
  assert.equal(payload.per_actor.pg_skiv.conviction_axis.utility, 50);
});

test('untriggered ennea entries are filtered out (real vcScoring shape)', () => {
  const actor = _fullActor({
    ennea: [
      { id: 'enn_riformatore', triggered: false, condition: {}, reason: 'missing:agg' },
      { id: 'enn_mediatore', triggered: false, condition: {} },
    ],
  });
  const out = vcSnapshotToDebriefPayload(_snap({ pg: actor }));
  assert.equal('ennea_archetype' in out.per_actor.pg, false);
});

test('mixed triggered/untriggered picks first triggered', () => {
  const actor = _fullActor({
    ennea: [
      { id: 'enn_a', triggered: false, condition: {} },
      { id: 'enn_b', triggered: true, condition: {} },
      { id: 'enn_c', triggered: true, condition: {} },
    ],
  });
  const out = vcSnapshotToDebriefPayload(_snap({ pg: actor }));
  assert.equal(out.per_actor.pg.ennea_archetype, 'enn_b');
});

// Opt 3 OUTPUT (#2679) -- additive personality_axes fold.
test('personality_axes: folded additively when actor has signal', () => {
  const actor = _fullActor();
  actor.mbti_axes = {
    T_F: { value: 0.9, coverage: 'full' },
    E_I: { value: 0.2, coverage: 'full' },
    S_N: { value: 0.7, coverage: 'full' },
    J_P: { value: 0.6, coverage: 'full' },
  };
  actor.raw_metrics = { action_switch_rate: 0.25, setup_ratio: 0.8 };
  const out = vcSnapshotToDebriefPayload(_snap({ u1: actor }), {
    u1: { speed: 3.5, hp_max: 13 },
  });
  const axes = out.per_actor.u1.personality_axes;
  assert.ok(axes, 'personality_axes expected');
  assert.ok(Math.abs(axes.symbiosis_predation - 0.9) < 1e-9);
  assert.ok(Math.abs(axes.solitary_swarm - 0.8) < 1e-9);
  // speed 3.5 in [1,6] -> 0.5; hp 13 in [6,20] -> 0.5 -> agile_robust 0.5
  assert.ok(Math.abs(axes.agile_robust - 0.5) < 1e-9);
});

test('personality_axes: omitted when no derivable signal (back-compat)', () => {
  const actor = _fullActor({ sent: { tier: 'T1', source: 'default-fallback' } });
  actor.mbti_axes = { T_F: null, E_I: null, S_N: null, J_P: null };
  actor.raw_metrics = {};
  const out = vcSnapshotToDebriefPayload(_snap({ u1: actor }));
  assert.equal('personality_axes' in out.per_actor.u1, false);
  assert.equal(out.per_actor.u1.sentience_tier, 'T1');
});

test('personality_axes: no unitStats arg -> agile_robust neutral (back-compat single-arg call)', () => {
  const actor = _fullActor();
  actor.mbti_axes = { T_F: { value: 1, coverage: 'full' } };
  const out = vcSnapshotToDebriefPayload(_snap({ u1: actor }));
  const axes = out.per_actor.u1.personality_axes;
  assert.ok(axes);
  assert.equal(axes.symbiosis_predation, 1);
  assert.equal(axes.agile_robust, 0.5);
});
