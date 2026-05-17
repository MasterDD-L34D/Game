// 2026-05-15 Bundle C follow-up — coopOrchestrator.endCombat optional
// debrief_payload extension test. Closes Phone DebriefView parity wire
// (mirror Godot v2 #269 PhoneDebriefView psicologico labels).
//
// Schema:
//   debriefPayload.per_actor[uid] = {
//     sentience_tier: "T0"-"T6",
//     conviction_axis: {utility, liberty, morality},
//     ennea_archetype: "<canonical name>"
//   }

'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { CoopOrchestrator } = require('../../apps/backend/services/coop/coopOrchestrator');

function _setupAtCombat() {
  const co = new CoopOrchestrator({ roomCode: 'DPLD', hostId: 'p_h' });
  co.startRun({ scenarioStack: ['enc_demo_01'] });
  co.submitCharacter(
    'p_h',
    { name: 'Aria', form_id: 'istj', species_id: 'scagliato', job_id: 'guerriero' },
    { allPlayerIds: ['p_h'] },
  );
  co.confirmWorld();
  return co;
}

test('endCombat without debriefPayload (back-compat): run.debrief absent', () => {
  const co = _setupAtCombat();
  co.endCombat({ outcome: 'victory', xpEarned: 10 });
  assert.equal(co.phase, 'debrief');
  assert.equal(co.run.debrief, undefined, 'run.debrief NOT set on back-compat path');
});

test('endCombat with debriefPayload attaches to run.debrief', () => {
  const co = _setupAtCombat();
  const payload = {
    per_actor: {
      pg_alice: {
        sentience_tier: 'T2',
        conviction_axis: { utility: 58, liberty: 52, morality: 46 },
        ennea_archetype: 'Conquistatore',
      },
    },
  };
  co.endCombat({ outcome: 'victory', debriefPayload: payload });
  assert.deepEqual(co.run.debrief, payload);
});

test('endCombat emits combat_ended with debrief field when payload provided', () => {
  const co = _setupAtCombat();
  const events = [];
  co.on((evt) => {
    if (evt.kind === 'combat_ended') events.push(evt.payload);
  });
  const payload = { per_actor: { pg_a: { sentience_tier: 'T3' } } };
  co.endCombat({ outcome: 'victory', debriefPayload: payload });
  assert.equal(events.length, 1);
  assert.deepEqual(events[0].debrief, payload);
  assert.equal(events[0].outcome, 'victory');
});

test('endCombat back-compat path does NOT include debrief field in emit', () => {
  const co = _setupAtCombat();
  const events = [];
  co.on((evt) => {
    if (evt.kind === 'combat_ended') events.push(evt.payload);
  });
  co.endCombat({ outcome: 'victory' });
  assert.equal(events.length, 1);
  assert.equal('debrief' in events[0], false, 'no debrief field on back-compat emit');
});

test('endCombat rejects non-object debriefPayload silently (back-compat default)', () => {
  const co = _setupAtCombat();
  co.endCombat({ outcome: 'victory', debriefPayload: 'invalid_string' });
  assert.equal(co.run.debrief, undefined, 'string payload ignored');
});

test('endCombat accepts empty Dict debriefPayload (valid, empty per_actor)', () => {
  const co = _setupAtCombat();
  co.endCombat({ outcome: 'victory', debriefPayload: {} });
  assert.deepEqual(co.run.debrief, {});
});

test('endCombat phase advance unaffected by debriefPayload presence', () => {
  const co = _setupAtCombat();
  co.endCombat({
    outcome: 'defeat',
    xpEarned: 0,
    debriefPayload: { per_actor: {} },
  });
  assert.equal(co.phase, 'debrief');
  assert.equal(co.run.outcome, 'defeat');
});
