// CAP-15 — Test coopOrchestrator V2 imprint phase.
// 5-phase machine V2: lobby → imprint → combat → debrief → ended.
// Backward-compat V1 (6-phase) testato altrove (tests/api/coopOrchestrator.test.js).

'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { CoopOrchestrator } = require('../../apps/backend/services/coop/coopOrchestrator');

function makeOrch() {
  return new CoopOrchestrator({ roomCode: 'TEST', hostId: 'host1' });
}

test('startImprint: lobby → imprint phase', () => {
  const o = makeOrch();
  assert.equal(o.phase, 'lobby');
  const run = o.startImprint({ scenarioStack: ['enc_tutorial_01'] });
  assert.equal(o.phase, 'imprint');
  assert.equal(run.mode, 'imprint_v2');
  assert.equal(run.scenarioStack[0], 'enc_tutorial_01');
});

test('startImprint: cannot start from non-lobby/ended phase', () => {
  const o = makeOrch();
  o.startImprint();
  assert.throws(() => o.startImprint(), /cannot_start_from_phase:imprint/);
});

test('submitImprintChoice: stores choice and emits event', () => {
  const o = makeOrch();
  o.startImprint();
  const events = [];
  o.on((e) => events.push(e));
  const c = o.submitImprintChoice(
    'p1',
    { axis: 'locomotion', value: 'VELOCE' },
    { allPlayerIds: ['p1', 'p2', 'p3', 'p4'] },
  );
  assert.equal(c.axis, 'locomotion');
  assert.equal(c.value, 'VELOCE');
  assert.equal(c.player_id, 'p1');
  assert.ok(events.some((e) => e.kind === 'imprint_choice'));
});

test('submitImprintChoice: rejects invalid axis', () => {
  const o = makeOrch();
  o.startImprint();
  assert.throws(
    () => o.submitImprintChoice('p1', { axis: 'fly', value: 'VELOCE' }, { allPlayerIds: ['p1'] }),
    /invalid_axis/,
  );
});

test('submitImprintChoice: rejects ghost client (F-3 style)', () => {
  const o = makeOrch();
  o.startImprint();
  assert.throws(
    () =>
      o.submitImprintChoice(
        'ghost',
        { axis: 'locomotion', value: 'VELOCE' },
        { allPlayerIds: ['p1', 'p2'] },
      ),
    /player_not_in_room/,
  );
});

test('submitImprintChoice: rejects when not in imprint phase', () => {
  const o = makeOrch();
  // Still in lobby
  assert.throws(
    () =>
      o.submitImprintChoice(
        'p1',
        { axis: 'locomotion', value: 'VELOCE' },
        { allPlayerIds: ['p1'] },
      ),
    /not_in_imprint/,
  );
});

test('submitImprintChoice: 4 player coverage → auto-advance to combat', () => {
  const o = makeOrch();
  o.startImprint();
  const all = ['p1', 'p2', 'p3', 'p4'];
  const events = [];
  o.on((e) => events.push(e));

  o.submitImprintChoice('p1', { axis: 'locomotion', value: 'VELOCE' }, { allPlayerIds: all });
  assert.equal(o.phase, 'imprint');
  o.submitImprintChoice('p2', { axis: 'offense', value: 'PROFONDA' }, { allPlayerIds: all });
  assert.equal(o.phase, 'imprint');
  o.submitImprintChoice('p3', { axis: 'defense', value: 'DURA' }, { allPlayerIds: all });
  assert.equal(o.phase, 'imprint');
  o.submitImprintChoice('p4', { axis: 'senses', value: 'LONTANO' }, { allPlayerIds: all });
  // 4 axes coperti → auto-advance combat
  assert.equal(o.phase, 'combat');

  const completeEvent = events.find((e) => e.kind === 'imprint_complete');
  assert.ok(completeEvent, 'imprint_complete event emitted');
  assert.deepEqual(completeEvent.payload.choices, {
    locomotion: 'VELOCE',
    offense: 'PROFONDA',
    defense: 'DURA',
    senses: 'LONTANO',
  });
});

test('submitImprintChoice: 4 player ma 2 sullo stesso axis → no advance, emit incomplete', () => {
  const o = makeOrch();
  o.startImprint();
  const all = ['p1', 'p2', 'p3', 'p4'];
  const events = [];
  o.on((e) => events.push(e));

  o.submitImprintChoice('p1', { axis: 'locomotion', value: 'VELOCE' }, { allPlayerIds: all });
  o.submitImprintChoice('p2', { axis: 'locomotion', value: 'SILENZIOSA' }, { allPlayerIds: all }); // duplicate axis
  o.submitImprintChoice('p3', { axis: 'defense', value: 'DURA' }, { allPlayerIds: all });
  o.submitImprintChoice('p4', { axis: 'senses', value: 'LONTANO' }, { allPlayerIds: all });

  // 4 player MA solo 3 axes coperti (locomotion, defense, senses) — offense missing
  assert.equal(o.phase, 'imprint', 'no auto-advance');
  const incomplete = events.find((e) => e.kind === 'imprint_axes_incomplete');
  assert.ok(incomplete, 'imprint_axes_incomplete event emitted');
  assert.deepEqual(incomplete.payload.missing, ['offense']);
});

test('imprintReadyList: ready-state snapshot per allPlayerIds', () => {
  const o = makeOrch();
  o.startImprint();
  const all = ['p1', 'p2', 'p3', 'p4'];

  o.submitImprintChoice('p1', { axis: 'locomotion', value: 'VELOCE' }, { allPlayerIds: all });
  o.submitImprintChoice('p3', { axis: 'defense', value: 'DURA' }, { allPlayerIds: all });

  const list = o.imprintReadyList(all);
  assert.equal(list.length, 4);
  assert.equal(list[0].ready, true);
  assert.equal(list[0].axis, 'locomotion');
  assert.equal(list[1].ready, false);
  assert.equal(list[2].ready, true);
  assert.equal(list[2].axis, 'defense');
  assert.equal(list[3].ready, false);
});

test('getImprintChoicesAggregate: ritorna null se 4 axes non coperti', () => {
  const o = makeOrch();
  o.startImprint();
  o.submitImprintChoice(
    'p1',
    { axis: 'locomotion', value: 'VELOCE' },
    { allPlayerIds: ['p1', 'p2'] },
  );
  assert.equal(o.getImprintChoicesAggregate(), null);
});

test('getImprintChoicesAggregate: ritorna oggetto 4 axes quando completo', () => {
  const o = makeOrch();
  o.startImprint();
  const all = ['p1', 'p2', 'p3', 'p4'];
  o.submitImprintChoice('p1', { axis: 'locomotion', value: 'SILENZIOSA' }, { allPlayerIds: all });
  o.submitImprintChoice('p2', { axis: 'offense', value: 'RAPIDA' }, { allPlayerIds: all });
  o.submitImprintChoice('p3', { axis: 'defense', value: 'FLESSIBILE' }, { allPlayerIds: all });
  o.submitImprintChoice('p4', { axis: 'senses', value: 'ACUTO' }, { allPlayerIds: all });
  const agg = o.getImprintChoicesAggregate();
  assert.deepEqual(agg, {
    locomotion: 'SILENZIOSA',
    offense: 'RAPIDA',
    defense: 'FLESSIBILE',
    senses: 'ACUTO',
  });
});

test('V1 backward-compat: startRun + submitCharacter invariati', () => {
  const o = makeOrch();
  o.startRun({ scenarioStack: ['enc_tutorial_01'] });
  assert.equal(o.phase, 'character_creation', 'V1 phase invariata');
  const c = o.submitCharacter(
    'p1',
    { name: 'Lupo', form_id: 'wolf', species_id: 'canis' },
    { allPlayerIds: ['p1'] },
  );
  assert.equal(c.name, 'Lupo');
  assert.equal(c.form_id, 'wolf');
  // 1 player atteso → auto-advance world_setup
  assert.equal(o.phase, 'world_setup', 'V1 auto-advance world_setup');
});

test('V1 e V2 mutuamente esclusivi nello stesso run', () => {
  const o = makeOrch();
  o.startImprint();
  // V2 attiva: submitCharacter (V1) deve fallire perché phase != character_creation
  assert.throws(
    () => o.submitCharacter('p1', { name: 'X', form_id: 'y' }, { allPlayerIds: ['p1'] }),
    /not_in_character_creation/,
  );
});
