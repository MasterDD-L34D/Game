// tests/ai/threatPreviewThreatsOnly.test.js -- telegraph threats-only (spec sez. 4.4).
// Flag ON: righe solo per attack su player + move dentro objective.target_zone
// (objective zone-based). Move/retreat ordinari NON telegrafati (si vedono in
// board). Cap presentazione = intentsCapForPressure. Flag OFF: byte-identical.
'use strict';
process.env.IDEA_ENGINE_DISABLE_STATUS_REFRESH = '1';
const test = require('node:test');
const assert = require('node:assert/strict');
const { buildThreatPreview } = require('../../apps/backend/services/ai/threatPreview');

const FLAG = 'SISTEMA_TELEGRAPH_THREATS_ONLY';
function withFlag(value, fn) {
  const prev = process.env[FLAG];
  if (value === undefined) delete process.env[FLAG];
  else process.env[FLAG] = value;
  try {
    return fn();
  } finally {
    if (prev === undefined) delete process.env[FLAG];
    else process.env[FLAG] = prev;
  }
}

function fakeSession() {
  const units = [
    { id: 's1', controlled_by: 'sistema', hp: 5, position: { x: 1, y: 1 } },
    { id: 's2', controlled_by: 'sistema', hp: 5, position: { x: 2, y: 2 } },
    { id: 's3', controlled_by: 'sistema', hp: 5, position: { x: 3, y: 3 } },
    { id: 'p1', controlled_by: 'player', hp: 9, position: { x: 5, y: 5 } },
  ];
  return {
    units,
    sistema_pressure: 50,
    encounter: { objective: { type: 'capture_point', target_zone: [7, 7, 9, 9] } },
    roundState: {
      pending_intents: [
        { unit_id: 's1', action: { type: 'attack', target_id: 'p1' } },
        { unit_id: 's2', action: { type: 'move', move_to: { x: 8, y: 8 } } },
        { unit_id: 's3', action: { type: 'move', move_to: { x: 4, y: 4 } } },
      ],
    },
  };
}

test('OFF: tutte le righe SIS come oggi (3)', () => {
  withFlag(undefined, () => {
    assert.equal(buildThreatPreview(fakeSession()).length, 3);
  });
});

test('ON: attack + move-in-zona si, move ordinario no', () => {
  withFlag('true', () => {
    const rows = buildThreatPreview(fakeSession());
    const ids = rows.map((r) => r.actor_id).sort();
    assert.deepEqual(ids, ['s1', 's2'], 'move ordinario (s3) non telegrafato');
  });
});

test('ON: objective non zone-based -> solo attack', () => {
  withFlag('true', () => {
    const s = fakeSession();
    s.encounter.objective = { type: 'elimination' };
    const rows = buildThreatPreview(s);
    assert.deepEqual(
      rows.map((r) => r.actor_id),
      ['s1'],
      'niente zona -> solo attack',
    );
  });
});

test('ON: cap presentazione = tier (Escalated 3), attack prioritari', () => {
  withFlag('true', () => {
    const s = fakeSession();
    s.roundState.pending_intents = [1, 2, 3, 4, 5].map((i) => ({
      unit_id: `s${i}`,
      action: { type: 'attack', target_id: 'p1' },
    }));
    s.units = [
      ...[1, 2, 3, 4, 5].map((i) => ({
        id: `s${i}`,
        controlled_by: 'sistema',
        hp: 5,
        position: { x: i, y: i },
      })),
      { id: 'p1', controlled_by: 'player', hp: 9, position: { x: 5, y: 5 } },
    ];
    assert.equal(buildThreatPreview(s).length, 3);
  });
});

test('ON: retreat mai telegrafato anche in zona', () => {
  withFlag('true', () => {
    const s = fakeSession();
    s.roundState.pending_intents = [
      { unit_id: 's1', action: { type: 'retreat', move_to: { x: 8, y: 8 } } },
    ];
    assert.equal(buildThreatPreview(s).length, 0);
  });
});

test('ON: attack sopravvive al taglio anche se dichiarato ULTIMO', () => {
  withFlag('true', () => {
    // 3 zone-entry dichiarate PRIMA + 1 attack dichiarato ULTIMO, cap tier 3
    // (pressure 50, Escalated): senza la sort attack-first la slice(0, 3)
    // scarterebbe l'attack. Pinna la priorita' di presentazione.
    const s = fakeSession();
    s.units = [
      ...[1, 2, 3, 4].map((i) => ({
        id: `s${i}`,
        controlled_by: 'sistema',
        hp: 5,
        position: { x: i, y: i },
      })),
      { id: 'p1', controlled_by: 'player', hp: 9, position: { x: 5, y: 5 } },
    ];
    s.roundState.pending_intents = [
      { unit_id: 's1', action: { type: 'move', move_to: { x: 7, y: 7 } } },
      { unit_id: 's2', action: { type: 'move', move_to: { x: 8, y: 8 } } },
      { unit_id: 's3', action: { type: 'move', move_to: { x: 9, y: 9 } } },
      { unit_id: 's4', action: { type: 'attack', target_id: 'p1' } },
    ];
    const rows = buildThreatPreview(s);
    assert.equal(rows.length, 3, 'cap tier Escalated = 3');
    assert.equal(rows[0].intent_type, 'attack', 'attack prioritario sopravvive alla slice');
  });
});
