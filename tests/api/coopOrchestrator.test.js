// M16 — coopOrchestrator skeleton unit tests.
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  CoopOrchestrator,
  characterToUnit,
  PHASES,
} = require('../../apps/backend/services/coop/coopOrchestrator');

test('PHASES covers lobby→character_creation→world_setup→combat→debrief→ended', () => {
  assert.deepEqual(PHASES, [
    'lobby',
    'character_creation',
    'world_setup',
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

// ─────────────────────────────────────────────────────────────────
// Wave 3 negative-tests (audit 2026-04-24 §coop-phase-validator)
// ─────────────────────────────────────────────────────────────────

test('Wave 3 #1 — confirmWorld() from lobby throws not_in_world_setup', () => {
  // Phase-skip negative: confirmWorld() must reject when phase is lobby
  // (no run started). Audit list §1.
  const co = new CoopOrchestrator({ roomCode: 'ABCD', hostId: 'p_h' });
  assert.equal(co.phase, 'lobby');
  assert.throws(
    () => co.confirmWorld({ scenarioId: 'enc_tutorial_01' }),
    /not_in_world_setup/,
    'confirmWorld() in lobby phase must throw not_in_world_setup',
  );
  // Phase invariato post-throw
  assert.equal(co.phase, 'lobby');
});

test('Wave 3 #1b — confirmWorld() from character_creation throws not_in_world_setup', () => {
  // Defensive: confirmWorld() must also reject mid character_creation
  // (caratteri non ancora completati). Strengthen audit §1.
  const co = new CoopOrchestrator({ roomCode: 'ABCD', hostId: 'p_h' });
  co.startRun();
  assert.equal(co.phase, 'character_creation');
  assert.throws(() => co.confirmWorld({ scenarioId: 'enc_tutorial_01' }), /not_in_world_setup/);
  assert.equal(co.phase, 'character_creation');
});

test('Wave 3 #5 — startRun() from combat phase throws cannot_start_from_phase', () => {
  // Audit list §5: startRun() from combat phase untested.
  // Expected: throws `cannot_start_from_phase:combat` per existing
  // guard in coopOrchestrator.js:90.
  const co = new CoopOrchestrator({ roomCode: 'ABCD', hostId: 'p_h' });
  co.startRun();
  const all = ['p_a'];
  co.submitCharacter('p_a', { name: 'Aria', form_id: 'istj' }, { allPlayerIds: all });
  co.confirmWorld({ scenarioId: 'enc_tutorial_01' });
  assert.equal(co.phase, 'combat');
  assert.throws(
    () => co.startRun({ scenarioStack: ['enc_other'] }),
    /cannot_start_from_phase:combat/,
    'startRun() in combat must throw',
  );
  assert.equal(co.phase, 'combat'); // phase invariato
});

test('Wave 3 #5b — startRun() from character_creation + world_setup + debrief throws', () => {
  // Defensive sweep: startRun() reject from all non-(lobby|ended) phases.
  // Documented contract via guard `if (this.phase !== 'lobby' && this.phase !== 'ended')`.
  const all = ['p_a'];

  // Phase character_creation
  const coCC = new CoopOrchestrator({ roomCode: 'ABCD', hostId: 'p_h' });
  coCC.startRun();
  assert.throws(() => coCC.startRun(), /cannot_start_from_phase:character_creation/);

  // Phase world_setup
  const coWS = new CoopOrchestrator({ roomCode: 'ABCD', hostId: 'p_h' });
  coWS.startRun();
  coWS.submitCharacter('p_a', { name: 'Aria', form_id: 'istj' }, { allPlayerIds: all });
  assert.equal(coWS.phase, 'world_setup');
  assert.throws(() => coWS.startRun(), /cannot_start_from_phase:world_setup/);

  // Phase debrief
  const coDB = new CoopOrchestrator({ roomCode: 'ABCD', hostId: 'p_h' });
  coDB.startRun();
  coDB.submitCharacter('p_a', { name: 'Aria', form_id: 'istj' }, { allPlayerIds: all });
  coDB.confirmWorld({ scenarioId: 'enc_tutorial_01' });
  coDB.endCombat({ outcome: 'victory' });
  assert.equal(coDB.phase, 'debrief');
  assert.throws(() => coDB.startRun(), /cannot_start_from_phase:debrief/);
});

test('Wave 3 #5c — startRun() from ended phase succeeds (re-run after run completion)', () => {
  // Companion contract: phase=ended is the SECOND legal entry to startRun()
  // (lobby + ended). Verify re-run path lavora end-to-end.
  const co = new CoopOrchestrator({ roomCode: 'ABCD', hostId: 'p_h' });
  co.startRun({ scenarioStack: ['enc_tutorial_01'] });
  const all = ['p_a'];
  co.submitCharacter('p_a', { name: 'Aria', form_id: 'istj' }, { allPlayerIds: all });
  co.confirmWorld({ scenarioId: 'enc_tutorial_01' });
  co.endCombat({ outcome: 'victory' });
  co.submitDebriefChoice('p_a', { choice: 'skip' }, { allPlayerIds: all });
  assert.equal(co.phase, 'ended');

  // Re-run from ended must work
  const run2 = co.startRun({ scenarioStack: ['enc_tutorial_02'] });
  assert.equal(co.phase, 'character_creation');
  assert.ok(run2.id.startsWith('run_'));
  assert.deepEqual(run2.scenarioStack, ['enc_tutorial_02']);
  // Characters cleared on new run (verified via internal state)
  assert.equal(co.characters.size, 0);
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
