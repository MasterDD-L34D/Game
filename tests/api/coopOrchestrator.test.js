// M16 — coopOrchestrator skeleton unit tests.
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  CoopOrchestrator,
  characterToUnit,
  PHASES,
} = require('../../apps/backend/services/coop/coopOrchestrator');

test('PHASES covers V1 (lobby→character_creation→world_setup→combat→debrief→ended) + V2 imprint (CAP-15)', () => {
  // V1 phases canonical (M16) + V2 'imprint' phase added by CAP-15.
  // Ordering: V1 stati prima, poi 'imprint' inserito tra world_setup e combat.
  // V1 flow: lobby → character_creation → world_setup → combat → debrief → ended
  // V2 flow: lobby → imprint → combat → debrief → ended (CAP-15)
  assert.deepEqual(PHASES, [
    'lobby',
    'character_creation',
    'world_setup',
    'imprint',
    'combat',
    'debrief',
    'ended',
  ]);
});

test('startRun transitions lobby → character_creation', () => {
  const co = new CoopOrchestrator({ roomCode: 'ABCD', hostId: 'p_h' });
  assert.equal(co.phase, 'lobby');
  const run = co.startRun({ scenarioStack: ['enc_tutorial_01'] });
  assert.equal(co.phase, 'character_creation');
  assert.ok(run.id.startsWith('run_'));
  assert.deepEqual(run.scenarioStack, ['enc_tutorial_01']);
});

test('submitCharacter stores spec + advances when all players ready', () => {
  const co = new CoopOrchestrator({ roomCode: 'ABCD', hostId: 'p_h' });
  co.startRun();
  const all = ['p_a', 'p_b'];
  co.submitCharacter('p_a', { name: 'Aria', form_id: 'istj_custode' }, { allPlayerIds: all });
  assert.equal(co.phase, 'character_creation');
  co.submitCharacter('p_b', { name: 'Bruno', form_id: 'enfp_catalysta' }, { allPlayerIds: all });
  assert.equal(co.phase, 'world_setup');
  const list = co.characterReadyList(all);
  assert.equal(list.length, 2);
  assert.ok(list.every((c) => c.ready));
});

test('submitCharacter rejects invalid spec', () => {
  const co = new CoopOrchestrator({ roomCode: 'ABCD', hostId: 'p_h' });
  co.startRun();
  assert.throws(() => co.submitCharacter('p_a', { name: 'X' }), /spec_invalid/);
  assert.throws(() => co.submitCharacter('p_a', { form_id: 'istj' }), /spec_invalid/);
  assert.throws(() => co.submitCharacter(null, { name: 'X', form_id: 'y' }), /player_id_required/);
});

test('confirmWorld transitions world_setup → combat', () => {
  const co = new CoopOrchestrator({ roomCode: 'ABCD', hostId: 'p_h' });
  co.startRun();
  const all = ['p_a'];
  co.submitCharacter('p_a', { name: 'Aria', form_id: 'istj' }, { allPlayerIds: all });
  const res = co.confirmWorld({ scenarioId: 'enc_tutorial_01' });
  assert.equal(co.phase, 'combat');
  assert.equal(res.scenario_id, 'enc_tutorial_01');
});

test('endCombat + submitDebriefChoice advance scenario or end', () => {
  const co = new CoopOrchestrator({ roomCode: 'ABCD', hostId: 'p_h' });
  co.startRun({ scenarioStack: ['enc_tutorial_01', 'enc_tutorial_02'] });
  const all = ['p_a'];
  co.submitCharacter('p_a', { name: 'Aria', form_id: 'istj' }, { allPlayerIds: all });
  co.confirmWorld();
  co.endCombat({ outcome: 'victory', xpEarned: 10 });
  assert.equal(co.phase, 'debrief');
  const result = co.submitDebriefChoice('p_a', { choice: 'skip' }, { allPlayerIds: all });
  assert.equal(result.action, 'next_scenario');
  assert.equal(co.phase, 'world_setup');
  assert.equal(co.run.currentIndex, 1);
});

test('run ends after last scenario', () => {
  const co = new CoopOrchestrator({ roomCode: 'ABCD', hostId: 'p_h' });
  co.startRun({ scenarioStack: ['enc_tutorial_01'] });
  const all = ['p_a'];
  co.submitCharacter('p_a', { name: 'Aria', form_id: 'istj' }, { allPlayerIds: all });
  co.confirmWorld();
  co.endCombat({ outcome: 'victory' });
  const result = co.submitDebriefChoice('p_a', { choice: 'skip' }, { allPlayerIds: all });
  assert.equal(result.action, 'ended');
  assert.equal(co.phase, 'ended');
});

test('buildSessionStartPayload produces units with owner_id', () => {
  const co = new CoopOrchestrator({ roomCode: 'ABCD', hostId: 'p_h' });
  co.startRun();
  const all = ['p_a', 'p_b'];
  co.submitCharacter(
    'p_a',
    { name: 'Aria', form_id: 'istj_custode', species_id: 'scagliato', job_id: 'guerriero' },
    { allPlayerIds: all },
  );
  co.submitCharacter('p_b', { name: 'Bruno', form_id: 'enfp' }, { allPlayerIds: all });
  co.confirmWorld();
  const payload = co.buildSessionStartPayload();
  assert.equal(payload.units.length, 2);
  assert.equal(payload.units[0].owner_id, 'p_a');
  assert.equal(payload.units[0].name, 'Aria');
  assert.equal(payload.units[0].controlled_by, 'player');
  assert.equal(payload.units[1].owner_id, 'p_b');
});

test('characterToUnit standalone helper', () => {
  const u = characterToUnit({
    player_id: 'p_a',
    name: 'Aria',
    form_id: 'istj',
    species_id: 'scagliato',
    job_id: 'vanguard',
  });
  assert.equal(u.owner_id, 'p_a');
  assert.equal(u.controlled_by, 'player');
  assert.equal(u.name, 'Aria');
  assert.equal(u.species, 'scagliato');
  assert.equal(u.job, 'vanguard');
});

test('F-3: submitCharacter rejects playerId not in allPlayerIds', () => {
  const co = new CoopOrchestrator({ roomCode: 'ABCD', hostId: 'p_h' });
  co.startRun();
  const all = ['p_a', 'p_b'];
  assert.throws(
    () => co.submitCharacter('p_ghost', { name: 'Ghost', form_id: 'istj' }, { allPlayerIds: all }),
    /player_not_in_room/,
  );
  // Empty allPlayerIds list means permissive (backward-compatible behavior).
  const ok = co.submitCharacter('p_anon', { name: 'Anon', form_id: 'istj' }, { allPlayerIds: [] });
  assert.equal(ok.player_id, 'p_anon');
});

test('F-2: forceAdvance from character_creation → world_setup', () => {
  const co = new CoopOrchestrator({ roomCode: 'ABCD', hostId: 'p_h' });
  co.startRun();
  assert.equal(co.phase, 'character_creation');
  const result = co.forceAdvance({ reason: 'player_dropped' });
  assert.equal(co.phase, 'world_setup');
  assert.equal(result.action, 'forced_to_world_setup');
  const kinds = co.log.map((e) => e.kind);
  assert.ok(kinds.includes('force_advance'));
});

test('F-2: forceAdvance from debrief delegates to advanceScenarioOrEnd', () => {
  const co = new CoopOrchestrator({ roomCode: 'ABCD', hostId: 'p_h' });
  co.startRun({ scenarioStack: ['enc_01', 'enc_02'] });
  const all = ['p_a'];
  co.submitCharacter('p_a', { name: 'Aria', form_id: 'istj' }, { allPlayerIds: all });
  co.confirmWorld();
  co.endCombat({ outcome: 'victory' });
  assert.equal(co.phase, 'debrief');
  const result = co.forceAdvance({ reason: 'player_dropped_in_debrief' });
  assert.equal(co.phase, 'world_setup');
  assert.equal(result.action, 'next_scenario');
});

test('F-2: forceAdvance rejected from combat/lobby/ended', () => {
  const co = new CoopOrchestrator({ roomCode: 'ABCD', hostId: 'p_h' });
  assert.throws(() => co.forceAdvance(), /force_advance_not_allowed_from:lobby/);
  co.startRun();
  co.submitCharacter('p_a', { name: 'Aria', form_id: 'istj' }, { allPlayerIds: ['p_a'] });
  co.confirmWorld();
  assert.throws(() => co.forceAdvance(), /force_advance_not_allowed_from:combat/);
});

test('log captures phase_change + run_started events', () => {
  const co = new CoopOrchestrator({ roomCode: 'ABCD' });
  co.startRun();
  const kinds = co.log.map((e) => e.kind);
  assert.ok(kinds.includes('phase_change'));
  assert.ok(kinds.includes('run_started'));
});
