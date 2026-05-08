// M16 — coopOrchestrator skeleton unit tests.
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  CoopOrchestrator,
  characterToUnit,
  PHASES,
} = require('../../apps/backend/services/coop/coopOrchestrator');

// B-NEW-5 fix 2026-05-08 — idempotent submitCharacter so phone retry +
// WS reconnect flush does not flood character_ready emissions (lobby
// XHPV shipped 19 events in 175s, 5 within 700ms).
test('submitCharacter idempotent on identical spec (no re-emit, reuse prior)', () => {
  const co = new CoopOrchestrator({ roomCode: 'IDMP', hostId: 'p_h' });
  co.startOnboarding({ scenarioStack: ['enc_demo'] });
  co._setPhase('character_creation');
  const events = [];
  co.on((evt) => {
    if (evt.kind === 'character_ready') events.push(evt.payload);
  });
  const spec = {
    name: 'Liev',
    form_id: 'form_umbra_alaris',
    species_id: 'umbra_alaris',
    job_id: 'custode',
  };
  const first = co.submitCharacter('p_h', spec, { allPlayerIds: ['p_h', 'p_a'] });
  const second = co.submitCharacter('p_h', spec, { allPlayerIds: ['p_h', 'p_a'] });
  // 2nd call returns the SAME submitted_at (prior reused); no fresh emit.
  assert.equal(events.length, 1);
  assert.equal(second.submitted_at, first.submitted_at);
  assert.equal(second._deduplicated, true);
  assert.equal(first._deduplicated, undefined);
});

// Codex P2 #2134: dedupe must run BEFORE phase gate. Last ready player
// retry burst arrives after auto-advance to world_setup → pre-fix threw
// not_in_character_creation → phone shows spurious error toast post-success.
test('submitCharacter idempotent dedupe runs after phase advance to world_setup', () => {
  const co = new CoopOrchestrator({ roomCode: 'IDMP', hostId: 'p_h' });
  co.startOnboarding({ scenarioStack: ['enc_demo'] });
  co._setPhase('character_creation');
  const events = [];
  co.on((evt) => {
    if (evt.kind === 'character_ready') events.push(evt.payload);
  });
  const spec = {
    name: 'Solo',
    form_id: 'form_solo',
    species_id: 's_solo',
    job_id: 'guerriero',
  };
  // Single-player roster: first submit auto-advances to world_setup.
  const first = co.submitCharacter('p_solo', spec, { allPlayerIds: ['p_solo'] });
  assert.equal(co.phase, 'world_setup');
  // Retry of identical spec post auto-advance must dedupe, NOT throw.
  const second = co.submitCharacter('p_solo', spec, { allPlayerIds: ['p_solo'] });
  assert.equal(second._deduplicated, true);
  assert.equal(second.submitted_at, first.submitted_at);
  // Only 1 event emitted total.
  assert.equal(events.length, 1);
});

test('submitCharacter throws not_in_character_creation only when no prior + wrong phase', () => {
  const co = new CoopOrchestrator({ roomCode: 'IDMP', hostId: 'p_h' });
  co.startOnboarding({ scenarioStack: ['enc_demo'] });
  co._setPhase('world_setup');
  // Fresh player, no prior submission, wrong phase → throw.
  assert.throws(
    () =>
      co.submitCharacter(
        'p_new',
        { name: 'A', form_id: 'f', species_id: 's', job_id: 'guerriero' },
        { allPlayerIds: ['p_new'] },
      ),
    /not_in_character_creation/,
  );
});

test('submitCharacter re-emits when spec changes (name swap)', () => {
  const co = new CoopOrchestrator({ roomCode: 'IDMP', hostId: 'p_h' });
  co.startOnboarding({ scenarioStack: ['enc_demo'] });
  co._setPhase('character_creation');
  const events = [];
  co.on((evt) => {
    if (evt.kind === 'character_ready') events.push(evt.payload);
  });
  co.submitCharacter(
    'p_h',
    { name: 'Liev', form_id: 'form_a', species_id: 's_a', job_id: 'guerriero' },
    { allPlayerIds: ['p_h', 'p_b'] },
  );
  co.submitCharacter(
    'p_h',
    { name: 'Renamed', form_id: 'form_a', species_id: 's_a', job_id: 'guerriero' },
    { allPlayerIds: ['p_h', 'p_b'] },
  );
  assert.equal(events.length, 2);
  assert.equal(events[1].name, 'Renamed');
});

// B-NEW-1 fix 2026-05-08 — worldTally now exposes connected-only quorum
// flags so phone smoke does not stall when a peer drops mid-vote.
test('worldTally exposes connected-only quorum when connectedPlayerIds passed', () => {
  const co = new CoopOrchestrator({ roomCode: 'QUOR', hostId: 'p_h' });
  co.startOnboarding({ scenarioStack: ['enc_demo'] });
  co._setPhase('world_setup');
  const allIds = ['p_a', 'p_b'];
  const connectedIds = ['p_a']; // p_b dropped silently
  co.voteWorld('p_a', { accept: true, allPlayerIds: allIds, connectedPlayerIds: connectedIds });
  const tally = co.worldTally(allIds, connectedIds);
  assert.equal(tally.accept, 1);
  assert.equal(tally.connected_total, 1);
  assert.equal(tally.connected_accept, 1);
  assert.equal(tally.connected_reject, 0);
  assert.equal(tally.connected_pending, 0);
  assert.equal(tally.all_connected_accepted, true);
  // Legacy total/pending unchanged for back-compat callers.
  assert.equal(tally.total, 2);
  assert.equal(tally.pending, 1);
});

test('worldTally all_connected_accepted false when at least one connected reject', () => {
  const co = new CoopOrchestrator({ roomCode: 'QUOR', hostId: 'p_h' });
  co.startOnboarding({ scenarioStack: ['enc_demo'] });
  co._setPhase('world_setup');
  const allIds = ['p_a', 'p_b'];
  co.voteWorld('p_a', { accept: true, allPlayerIds: allIds, connectedPlayerIds: allIds });
  co.voteWorld('p_b', { accept: false, allPlayerIds: allIds, connectedPlayerIds: allIds });
  const tally = co.worldTally(allIds, allIds);
  assert.equal(tally.connected_total, 2);
  assert.equal(tally.connected_accept, 1);
  assert.equal(tally.connected_reject, 1);
  assert.equal(tally.all_connected_accepted, false);
});

test('worldTally all_connected_accepted false when zero connected players', () => {
  const co = new CoopOrchestrator({ roomCode: 'QUOR', hostId: 'p_h' });
  co.startOnboarding({ scenarioStack: ['enc_demo'] });
  co._setPhase('world_setup');
  const tally = co.worldTally(['p_a'], []);
  assert.equal(tally.connected_total, 0);
  assert.equal(tally.all_connected_accepted, false);
});

test('worldTally back-compat omits connected_* fields when arg missing', () => {
  const co = new CoopOrchestrator({ roomCode: 'QUOR', hostId: 'p_h' });
  co.startOnboarding({ scenarioStack: ['enc_demo'] });
  co._setPhase('world_setup');
  const tally = co.worldTally(['p_a']);
  assert.equal(tally.connected_total, undefined);
  assert.equal(tally.all_connected_accepted, undefined);
});

test('PHASES covers lobby→onboarding→character_creation→world_setup→combat→debrief→ended', () => {
  // 2026-05-06 narrative onboarding port — `onboarding` inserted between
  // lobby and character_creation per canonical 51-ONBOARDING-60S.md.
  assert.deepEqual(PHASES, [
    'lobby',
    'onboarding',
    'character_creation',
    'world_setup',
    'combat',
    'debrief',
    'ended',
  ]);
});

test('startOnboarding transitions lobby → onboarding', () => {
  const co = new CoopOrchestrator({ roomCode: 'ABCD', hostId: 'p_h' });
  assert.equal(co.phase, 'lobby');
  const run = co.startOnboarding({ scenarioStack: ['enc_tutorial_01'] });
  assert.equal(co.phase, 'onboarding');
  assert.ok(run.id.startsWith('run_'));
});

test('submitOnboardingChoice host-only + auto-advance to character_creation', () => {
  const co = new CoopOrchestrator({ roomCode: 'ABCD', hostId: 'p_h' });
  co.startOnboarding();
  const choice = {
    option_key: 'option_a',
    trait_id: 'zampe_a_molla',
    label: 'Come veloce e sfuggente',
    narrative: 'Non saremo mai abbastanza forti.',
    auto_selected: false,
  };
  // Non-host rejected with host_only.
  assert.throws(() => co.submitOnboardingChoice('p_other', choice, { hostId: 'p_h' }), /host_only/);
  // Host accepted, auto-advance to character_creation.
  const result = co.submitOnboardingChoice('p_h', choice, { hostId: 'p_h' });
  assert.equal(co.phase, 'character_creation');
  assert.equal(result.option_key, 'option_a');
  assert.equal(result.trait_id, 'zampe_a_molla');
  assert.equal(co.onboardingChoice.trait_id, 'zampe_a_molla');
});

test('submitOnboardingChoice rejects invalid choice + wrong phase', () => {
  const co = new CoopOrchestrator({ roomCode: 'ABCD', hostId: 'p_h' });
  // wrong phase: no run started
  assert.throws(
    () => co.submitOnboardingChoice('p_h', { option_key: 'a', trait_id: 't' }),
    /not_in_onboarding/,
  );
  co.startOnboarding();
  // missing trait_id
  assert.throws(() => co.submitOnboardingChoice('p_h', { option_key: 'a' }), /choice_invalid/);
  // missing option_key
  assert.throws(() => co.submitOnboardingChoice('p_h', { trait_id: 't' }), /choice_invalid/);
});

test('startRun (legacy) still skips onboarding → character_creation', () => {
  // Backwards-compat: web v1 callers (REST /coop/run/start) skip
  // onboarding entirely. Sprint M.6 only Godot phone uses startOnboarding.
  const co = new CoopOrchestrator({ roomCode: 'ABCD', hostId: 'p_h' });
  co.startRun();
  assert.equal(co.phase, 'character_creation');
  assert.equal(co.onboardingChoice, null);
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

// ─────────────────────────────────────────────────────────────────
// W7 phone smoke fix — submitNextMacro drain (2026-05-06)
// ─────────────────────────────────────────────────────────────────

test('W7 — submitNextMacro advance from debrief delegates to advanceScenarioOrEnd', () => {
  const co = new CoopOrchestrator({ roomCode: 'ABCD', hostId: 'p_h' });
  co.startRun({ scenarioStack: ['enc_a', 'enc_b'] });
  const all = ['p_h', 'p_a'];
  co.submitCharacter('p_h', { name: 'Host', form_id: 'istj' }, { allPlayerIds: all });
  co.submitCharacter('p_a', { name: 'Aria', form_id: 'enfp' }, { allPlayerIds: all });
  co.confirmWorld();
  co.endCombat({ outcome: 'victory' });
  assert.equal(co.phase, 'debrief');
  const result = co.submitNextMacro('p_h', { choice: 'advance' }, { hostId: 'p_h' });
  assert.equal(result.choice, 'advance');
  assert.equal(co.phase, 'world_setup');
  assert.equal(result.advance.action, 'next_scenario');
  assert.equal(co.run.lastMacro.choice, 'advance');
});

test('W7 — submitNextMacro retreat from debrief forces ended + records outcome', () => {
  const co = new CoopOrchestrator({ roomCode: 'ABCD', hostId: 'p_h' });
  co.startRun({ scenarioStack: ['enc_a', 'enc_b', 'enc_c'] });
  const all = ['p_h'];
  co.submitCharacter('p_h', { name: 'Host', form_id: 'istj' }, { allPlayerIds: all });
  co.confirmWorld();
  co.endCombat({ outcome: 'victory' });
  const result = co.submitNextMacro('p_h', { choice: 'retreat' }, { hostId: 'p_h' });
  assert.equal(co.phase, 'ended');
  assert.equal(co.run.outcome, 'victory'); // pre-existing outcome preserved
  assert.equal(result.advance.reason, 'retreat');
});

test('W7 — submitNextMacro retreat preserves run.outcome=retreated when null', () => {
  const co = new CoopOrchestrator({ roomCode: 'ABCD', hostId: 'p_h' });
  co.startRun({ scenarioStack: ['enc_a'] });
  const all = ['p_h'];
  co.submitCharacter('p_h', { name: 'Host', form_id: 'istj' }, { allPlayerIds: all });
  co.confirmWorld();
  // Simulate debrief without endCombat outcome (defensive scenario).
  co.phase = 'debrief';
  co.run.outcome = null;
  co.submitNextMacro('p_h', { choice: 'retreat' }, { hostId: 'p_h' });
  assert.equal(co.run.outcome, 'retreated');
  assert.equal(co.phase, 'ended');
});

test('W7 — submitNextMacro rejects non-host + invalid choice + wrong phase', () => {
  const co = new CoopOrchestrator({ roomCode: 'ABCD', hostId: 'p_h' });
  co.startRun({ scenarioStack: ['enc_a'] });
  const all = ['p_h', 'p_a'];
  co.submitCharacter('p_h', { name: 'Host', form_id: 'istj' }, { allPlayerIds: all });
  co.submitCharacter('p_a', { name: 'Aria', form_id: 'enfp' }, { allPlayerIds: all });
  co.confirmWorld();
  // Wrong phase: combat → reject not_in_post_combat_phase. Codex P2 #2075
  // expanded gate to {debrief, world_setup, ended}; combat still rejected.
  assert.throws(
    () => co.submitNextMacro('p_h', { choice: 'advance' }, { hostId: 'p_h' }),
    /not_in_post_combat_phase:combat/,
  );
  co.endCombat({ outcome: 'victory' });
  // Non-host rejected.
  assert.throws(
    () => co.submitNextMacro('p_a', { choice: 'advance' }, { hostId: 'p_h' }),
    /host_only/,
  );
  // Invalid choice.
  assert.throws(
    () => co.submitNextMacro('p_h', { choice: 'sideways' }, { hostId: 'p_h' }),
    /macro_choice_invalid/,
  );
  // Missing playerId.
  assert.throws(
    () => co.submitNextMacro(null, { choice: 'advance' }, { hostId: 'p_h' }),
    /player_id_required/,
  );
});

test('W7 — submitNextMacro from world_setup post-debrief auto-advance is no-op (Codex P2 #2075)', () => {
  // Reproduce Codex P2 scenario: last lineage_choice triggers
  // advanceScenarioOrEnd → phase=world_setup. Subsequent host next_macro
  // must succeed as no-op (not throw not_in_post_combat_phase).
  const co = new CoopOrchestrator({ roomCode: 'ABCD', hostId: 'p_h' });
  co.startRun({ scenarioStack: ['enc_a', 'enc_b'] });
  const all = ['p_h'];
  co.submitCharacter('p_h', { name: 'Host', form_id: 'istj' }, { allPlayerIds: all });
  co.confirmWorld();
  co.endCombat({ outcome: 'victory' });
  // submitDebriefChoice last submission → auto-advance to world_setup.
  const advance = co.submitDebriefChoice('p_h', { choice: 'skip' }, { allPlayerIds: all });
  assert.equal(advance.action, 'next_scenario');
  assert.equal(co.phase, 'world_setup');
  // Now host next_macro advance — must succeed as no-op, NOT throw.
  const r = co.submitNextMacro('p_h', { choice: 'advance' }, { hostId: 'p_h' });
  assert.equal(r.advance.action, 'noop_post_advance');
  assert.equal(r.choice, 'advance');
  assert.equal(co.phase, 'world_setup');
  // Retreat from world_setup also valid → forces ended.
  const r2 = co.submitNextMacro('p_h', { choice: 'retreat' }, { hostId: 'p_h' });
  assert.equal(co.phase, 'ended');
  assert.equal(r2.advance.reason, 'retreat');
});

test('W7 — submitNextMacro from ended phase no-ops cleanly', () => {
  const co = new CoopOrchestrator({ roomCode: 'ABCD', hostId: 'p_h' });
  co.startRun({ scenarioStack: ['enc_a'] });
  const all = ['p_h'];
  co.submitCharacter('p_h', { name: 'Host', form_id: 'istj' }, { allPlayerIds: all });
  co.confirmWorld();
  co.endCombat({ outcome: 'victory' });
  co.submitDebriefChoice('p_h', { choice: 'skip' }, { allPlayerIds: all });
  assert.equal(co.phase, 'ended');
  // Already ended — advance/retreat both no-op or already_ended.
  const r = co.submitNextMacro('p_h', { choice: 'retreat' }, { hostId: 'p_h' });
  assert.equal(r.advance.action, 'already_ended');
});

// ─────────────────────────────────────────────────────────────────
// W4 phone smoke fix — submitFormPulse drain (2026-05-06)
// ─────────────────────────────────────────────────────────────────

test('W4 — submitFormPulse stores per-player axes + returns ready_set', () => {
  const co = new CoopOrchestrator({ roomCode: 'ABCD', hostId: 'p_h' });
  co.startRun();
  const all = ['p_a', 'p_b'];
  const r1 = co.submitFormPulse('p_a', { axes: { alpha: 0.5, beta: 0.3 } }, { allPlayerIds: all });
  assert.equal(r1.ready_count, 1);
  assert.equal(r1.total, 2);
  assert.equal(r1.all_ready, false);
  assert.deepEqual(r1.submitted, ['p_a']);
  const r2 = co.submitFormPulse('p_b', { axes: { alpha: 0.2 } }, { allPlayerIds: all });
  assert.equal(r2.ready_count, 2);
  assert.equal(r2.all_ready, true);
});

test('W4 — submitFormPulse drops non-numeric axes + accepts re-submit overwrite', () => {
  const co = new CoopOrchestrator({ roomCode: 'ABCD', hostId: 'p_h' });
  co.startRun();
  const all = ['p_a'];
  co.submitFormPulse(
    'p_a',
    { axes: { alpha: 0.7, beta: 'bad', gamma: NaN, delta: '0.4' } },
    { allPlayerIds: all },
  );
  const list = co.formPulseList(all);
  assert.equal(list[0].player_id, 'p_a');
  assert.equal(list[0].ready, true);
  // 'bad' string + NaN dropped; '0.4' string coerces via Number().
  assert.deepEqual(list[0].axes, { alpha: 0.7, delta: 0.4 });
  // Re-submit overwrites.
  co.submitFormPulse('p_a', { axes: { alpha: 0.1 } }, { allPlayerIds: all });
  const list2 = co.formPulseList(all);
  assert.deepEqual(list2[0].axes, { alpha: 0.1 });
});

test('W4 — submitFormPulse throws when run not started or playerId missing', () => {
  const co = new CoopOrchestrator({ roomCode: 'ABCD', hostId: 'p_h' });
  // No run yet.
  assert.throws(() => co.submitFormPulse('p_a', { axes: { alpha: 0.5 } }), /run_not_started/);
  co.startRun();
  assert.throws(() => co.submitFormPulse(null, { axes: { alpha: 0.5 } }), /player_id_required/);
});

test('W4 — formPulses cleared on advanceScenarioOrEnd', () => {
  const co = new CoopOrchestrator({ roomCode: 'ABCD', hostId: 'p_h' });
  co.startRun({ scenarioStack: ['enc_a', 'enc_b'] });
  const all = ['p_a'];
  co.submitCharacter('p_a', { name: 'Aria', form_id: 'istj' }, { allPlayerIds: all });
  co.submitFormPulse('p_a', { axes: { alpha: 0.9 } }, { allPlayerIds: all });
  assert.equal(co.formPulses.size, 1);
  co.confirmWorld();
  co.endCombat({ outcome: 'victory' });
  co.submitDebriefChoice('p_a', { choice: 'skip' }, { allPlayerIds: all });
  // Next scenario started → formPulses reset.
  assert.equal(co.phase, 'world_setup');
  assert.equal(co.formPulses.size, 0);
});

test('log captures phase_change + run_started events', () => {
  const co = new CoopOrchestrator({ roomCode: 'ABCD' });
  co.startRun();
  const kinds = co.log.map((e) => e.kind);
  assert.ok(kinds.includes('phase_change'));
  assert.ok(kinds.includes('run_started'));
});
