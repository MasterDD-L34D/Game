// M8 Plan-Reveal P0 — threatPreview.js unit tests.
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { buildThreatPreview, _iconFor } = require('../../apps/backend/services/ai/threatPreview');

function _session(units, pendingIntents) {
  return { units, roundState: { pending_intents: pendingIntents } };
}

test('buildThreatPreview: empty roundState → []', () => {
  assert.deepEqual(buildThreatPreview({}), []);
  assert.deepEqual(buildThreatPreview({ roundState: null }), []);
  assert.deepEqual(buildThreatPreview(null), []);
});

test('buildThreatPreview: no pending_intents → []', () => {
  assert.deepEqual(buildThreatPreview(_session([], [])), []);
  assert.deepEqual(buildThreatPreview(_session([], null)), []);
});

test('buildThreatPreview: attack intent → fist + target tile', () => {
  const session = _session(
    [
      { id: 'e_nomad_1', controlled_by: 'sistema', hp: 3, position: { x: 3, y: 2 } },
      { id: 'p_scout', controlled_by: 'player', hp: 10, position: { x: 1, y: 2 } },
    ],
    [
      {
        unit_id: 'e_nomad_1',
        action: { type: 'attack', target_id: 'p_scout' },
      },
    ],
  );
  const result = buildThreatPreview(session);
  assert.equal(result.length, 1);
  assert.deepEqual(result[0], {
    actor_id: 'e_nomad_1',
    intent_type: 'attack',
    intent_icon: 'fist',
    target_id: 'p_scout',
    threat_tiles: [{ x: 1, y: 2 }],
  });
});

test('buildThreatPreview: move intent → arrow + destination tile', () => {
  const session = _session(
    [{ id: 'e_hunter', controlled_by: 'sistema', hp: 6, position: { x: 3, y: 3 } }],
    [
      {
        unit_id: 'e_hunter',
        action: { type: 'move', move_to: { x: 2, y: 3 } },
      },
    ],
  );
  const result = buildThreatPreview(session);
  assert.equal(result.length, 1);
  assert.equal(result[0].intent_icon, 'move');
  assert.deepEqual(result[0].threat_tiles, [{ x: 2, y: 3 }]);
});

test('buildThreatPreview: skip intent → shield + no tiles', () => {
  const session = _session(
    [{ id: 'e_nomad_1', controlled_by: 'sistema', hp: 3, position: { x: 3, y: 2 } }],
    [{ unit_id: 'e_nomad_1', action: { type: 'skip' } }],
  );
  const result = buildThreatPreview(session);
  assert.equal(result[0].intent_icon, 'shield');
  assert.deepEqual(result[0].threat_tiles, []);
});

test('buildThreatPreview: skips player-controlled intents', () => {
  const session = _session(
    [
      { id: 'p_scout', controlled_by: 'player', hp: 10, position: { x: 1, y: 2 } },
      { id: 'e_nomad_1', controlled_by: 'sistema', hp: 3, position: { x: 3, y: 2 } },
    ],
    [
      { unit_id: 'p_scout', action: { type: 'attack', target_id: 'e_nomad_1' } },
      { unit_id: 'e_nomad_1', action: { type: 'attack', target_id: 'p_scout' } },
    ],
  );
  const result = buildThreatPreview(session);
  assert.equal(result.length, 1);
  assert.equal(result[0].actor_id, 'e_nomad_1');
});

test('buildThreatPreview: skips dead units', () => {
  const session = _session(
    [{ id: 'e_nomad_1', controlled_by: 'sistema', hp: 0, position: { x: 3, y: 2 } }],
    [{ unit_id: 'e_nomad_1', action: { type: 'attack', target_id: 'p_scout' } }],
  );
  assert.deepEqual(buildThreatPreview(session), []);
});

test('buildThreatPreview: unknown type → unknown + ?', () => {
  const session = _session(
    [{ id: 'e_nomad_1', controlled_by: 'sistema', hp: 3, position: { x: 3, y: 2 } }],
    [{ unit_id: 'e_nomad_1', action: { type: 'freakshow' } }],
  );
  const result = buildThreatPreview(session);
  assert.equal(result[0].intent_type, 'freakshow');
  assert.equal(result[0].intent_icon, '?');
});

test('_iconFor: map exact strings', () => {
  assert.equal(_iconFor('attack'), 'fist');
  assert.equal(_iconFor('move'), 'move');
  assert.equal(_iconFor('approach'), 'move');
  assert.equal(_iconFor('retreat'), 'move');
  assert.equal(_iconFor('skip'), 'shield');
  assert.equal(_iconFor('defend'), 'shield');
  assert.equal(_iconFor('overwatch'), 'shield');
  assert.equal(_iconFor(''), '?');
  assert.equal(_iconFor(null), '?');
  assert.equal(_iconFor(undefined), '?');
});
