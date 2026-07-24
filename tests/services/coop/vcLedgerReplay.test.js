// OD-058 D3 -- coop vcSnapshot server-side replay (issue #2531, box D3.1).
//
// services/coop/vcLedgerReplay.js rebuilds the vcSnapshot + debrief_payload
// from the server-side event ledger (session.events) of the combat session
// linked to a coop run (coopStore.linkSession). The coop debrief stops being
// trust-the-host: /coop/combat/end derives the payload from the server's own
// ledger via the SAME vcScoring path used by the single-player flow
// (buildVcSnapshot -> vcSnapshotToDebriefPayload), so parity is by
// construction. Mirror of the Godot parity-contract pattern (#371), Node side.

'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const {
  loadTelemetryConfig,
  buildVcSnapshot,
} = require('../../../apps/backend/services/vcScoring');
const {
  vcSnapshotToDebriefPayload,
} = require('../../../apps/backend/services/coop/vcSnapshotToDebriefPayload');
const { PROPOSED_FP_VC_MAPPING } = require('../../../apps/backend/services/formPulseVc');
const {
  replayVcSnapshotFromLedger,
  replayDebriefFromLedger,
  unitStatsById,
  isLedgerReplayEnabled,
} = require('../../../apps/backend/services/coop/vcLedgerReplay');

const CONFIG_PATH = path.resolve(__dirname, '..', '..', '..', 'data', 'core', 'telemetry.yaml');
const cfg = loadTelemetryConfig(CONFIG_PATH, { log: () => {}, warn: () => {} });

// buildVcSnapshot stamps meta.generated_at = now -> strip the volatile field
// before deepEqual (two builds milliseconds apart must still be "the same").
function stripVolatile(snapshot) {
  if (!snapshot || typeof snapshot !== 'object') return snapshot;
  const out = { ...snapshot };
  if (out.meta && typeof out.meta === 'object') {
    const meta = { ...out.meta };
    delete meta.generated_at;
    out.meta = meta;
  }
  return out;
}

function mkSession({ events, formPulses } = {}) {
  const evts =
    events ||
    Array.from({ length: 12 }, (_, i) => ({
      turn: i + 1,
      action_type: 'attack',
      actor_id: 'unit_1',
      target_id: 'unit_2',
      position_from: { x: 2, y: 2 },
      target_position_at_attack: { x: 3, y: 2 },
      result: 'hit',
      damage_dealt: 2,
      mos: 3,
      target_hp_before: 10,
      target_hp_after: 8,
    }));
  const session = {
    session_id: 'ledger-replay-test',
    turn: 1,
    units: [
      {
        id: 'unit_1',
        controlled_by: 'player',
        hp: 10,
        max_hp: 10,
        speed: 4,
        position: { x: 0, y: 0 },
      },
      { id: 'unit_2', controlled_by: 'sistema', hp: 10, max_hp: 10, position: { x: 5, y: 5 } },
    ],
    events: evts,
    grid: { width: 6, height: 6 },
  };
  if (formPulses) session.formPulses = formPulses;
  return session;
}

// ---------------------------------------------------------------------------
// replayVcSnapshotFromLedger
// ---------------------------------------------------------------------------

test('replay: snapshot deepEqual buildVcSnapshot on the same ledger (parity by construction)', () => {
  const session = mkSession();
  const direct = buildVcSnapshot(session, cfg);
  const replayed = replayVcSnapshotFromLedger(session, { telemetryConfig: cfg });
  assert.deepEqual(stripVolatile(replayed), stripVolatile(direct));
});

test('replay: null/invalid session -> null (never throws)', () => {
  assert.equal(replayVcSnapshotFromLedger(null, { telemetryConfig: cfg }), null);
  assert.equal(replayVcSnapshotFromLedger(undefined, { telemetryConfig: cfg }), null);
  assert.equal(replayVcSnapshotFromLedger(42, { telemetryConfig: cfg }), null);
});

test('replay: formPulses option hydrates the snapshot WITHOUT mutating the session', () => {
  const [fpKey] = Object.entries(PROPOSED_FP_VC_MAPPING)[0];
  const fp = new Map([
    ['p1', { axes: { [fpKey]: 1 } }],
    ['p2', { axes: { [fpKey]: 1 } }],
  ]);
  const session = mkSession();
  const expected = buildVcSnapshot(Object.assign({}, session, { formPulses: fp }), cfg);
  const replayed = replayVcSnapshotFromLedger(session, { telemetryConfig: cfg, formPulses: fp });
  assert.deepEqual(stripVolatile(replayed), stripVolatile(expected));
  // /end-path parity (session.js:3622): hydration is read-only on the session.
  assert.equal('formPulses' in session, false, 'session must NOT be mutated by replay');
});

test('replay: session.formPulses wins over the option (mirror /end !session.formPulses guard)', () => {
  const [fpKey] = Object.entries(PROPOSED_FP_VC_MAPPING)[0];
  const own = new Map([['p1', { axes: { [fpKey]: 1 } }]]);
  const other = new Map([
    ['p1', { axes: { [fpKey]: -1 } }],
    ['p2', { axes: { [fpKey]: -1 } }],
  ]);
  const session = mkSession({ formPulses: own });
  const expected = buildVcSnapshot(session, cfg);
  const replayed = replayVcSnapshotFromLedger(session, { telemetryConfig: cfg, formPulses: other });
  assert.deepEqual(stripVolatile(replayed), stripVolatile(expected));
});

// ---------------------------------------------------------------------------
// replayDebriefFromLedger
// ---------------------------------------------------------------------------

test('replayDebrief: debrief_payload == serializer(snapshot, unitStatsById) + events_count', () => {
  const session = mkSession();
  const out = replayDebriefFromLedger(session, { telemetryConfig: cfg });
  assert.ok(out && typeof out === 'object');
  assert.equal(out.events_count, session.events.length);
  assert.equal(out.actor_events_count, session.events.length);
  assert.deepEqual(stripVolatile(out.vc_snapshot), stripVolatile(buildVcSnapshot(session, cfg)));
  assert.deepEqual(
    out.debrief_payload,
    vcSnapshotToDebriefPayload(out.vc_snapshot, unitStatsById(session)),
  );
  // Pinned Godot #276 shape: per_actor present.
  assert.ok(out.debrief_payload.per_actor && typeof out.debrief_payload.per_actor === 'object');
});

test('replayDebrief: empty ledger -> events_count 0 (caller decides the host fallback)', () => {
  const out = replayDebriefFromLedger(mkSession({ events: [] }), { telemetryConfig: cfg });
  assert.ok(out);
  assert.equal(out.events_count, 0);
  assert.equal(out.actor_events_count, 0);
});

test('replayDebrief: lifecycle-only ledger (session_start, actor null) -> actor_events_count 0', () => {
  // /session/start seeds a session_start event (turn 0, actor_id null): a
  // linked-but-never-fought-server-side session must NOT count as a
  // replayable ledger (Godot client-side combat keeps host fallback).
  const out = replayDebriefFromLedger(
    mkSession({
      events: [
        {
          action_type: 'session_start',
          turn: 0,
          actor_id: null,
          target_id: null,
          damage_dealt: 0,
          result: 'ok',
          position_from: null,
          position_to: null,
        },
      ],
    }),
    { telemetryConfig: cfg },
  );
  assert.ok(out);
  assert.equal(out.events_count, 1);
  assert.equal(out.actor_events_count, 0);
});

test('replayDebrief: null session -> null', () => {
  assert.equal(replayDebriefFromLedger(null, { telemetryConfig: cfg }), null);
});

// ---------------------------------------------------------------------------
// unitStatsById (moved from routes/session.js closure -- #2679 Q2-bis semantics)
// ---------------------------------------------------------------------------

test('unitStatsById: extracts speed + max_hp->hp_max, guards null/undefined', () => {
  const stats = unitStatsById({
    units: [
      { id: 'u1', speed: 4, max_hp: 12 },
      { id: 'u2', speed: null, max_hp: undefined },
      { id: 'u3', speed: 'fast', max_hp: 8 },
      { id: null, speed: 1, max_hp: 1 },
    ],
  });
  assert.deepEqual(stats, { u1: { speed: 4, hp_max: 12 }, u3: { hp_max: 8 } });
});

test('unitStatsById: no units -> empty object', () => {
  assert.deepEqual(unitStatsById(null), {});
  assert.deepEqual(unitStatsById({}), {});
});

// ---------------------------------------------------------------------------
// isLedgerReplayEnabled (kill switch COOP_VC_LEDGER_REPLAY, default ON)
// ---------------------------------------------------------------------------

test('isLedgerReplayEnabled: default ON, env 0/false/off -> OFF', () => {
  const prev = process.env.COOP_VC_LEDGER_REPLAY;
  try {
    delete process.env.COOP_VC_LEDGER_REPLAY;
    assert.equal(isLedgerReplayEnabled(), true);
    for (const off of ['0', 'false', 'off']) {
      process.env.COOP_VC_LEDGER_REPLAY = off;
      assert.equal(isLedgerReplayEnabled(), false, `expected OFF for "${off}"`);
    }
    process.env.COOP_VC_LEDGER_REPLAY = '1';
    assert.equal(isLedgerReplayEnabled(), true);
  } finally {
    if (prev === undefined) delete process.env.COOP_VC_LEDGER_REPLAY;
    else process.env.COOP_VC_LEDGER_REPLAY = prev;
  }
});
