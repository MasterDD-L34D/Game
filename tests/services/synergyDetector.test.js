// Synergy Combo Detection — pure unit tests for the detector module + buildSynergyPreview.

'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  DEFAULT_BONUS_DAMAGE,
  loadSynergyCatalog,
  resetCache,
  partsForActor,
  applicableSynergies,
  effectFor,
  detectSynergyTrigger,
  recordSynergyFire,
  resetRoundSynergyTracker,
} = require('../../apps/backend/services/combat/synergyDetector');
const { buildSynergyPreview } = require('../../apps/backend/routes/sessionHelpers');

function freshSession() {
  return { turn: 1, damage_taken: {} };
}

test('loadSynergyCatalog: parses catalog.synergies + species.default_parts', () => {
  resetCache();
  const cat = loadSynergyCatalog();
  assert.ok(Array.isArray(cat.synergies));
  assert.ok(cat.synergies.length >= 1, 'expected at least one synergy in YAML');
  // echo_backstab is the seed canonical synergy in species.yaml
  const echo = cat.synergies.find((s) => s.id === 'echo_backstab');
  assert.ok(echo, 'echo_backstab must exist');
  assert.deepEqual(echo.when_all.sort(), ['offense.sand_claws', 'senses.echolocation'].sort());
  // dune_stalker species default_parts includes both required slots
  assert.ok(cat.speciesParts.dune_stalker instanceof Set);
  assert.ok(cat.speciesParts.dune_stalker.has('senses.echolocation'));
  assert.ok(cat.speciesParts.dune_stalker.has('offense.sand_claws'));
});

test('partsForActor: explicit actor.parts override beats species lookup', () => {
  resetCache();
  const actor = {
    id: 'u1',
    species: 'dune_stalker', // would resolve via catalog if no override
    parts: { offense: ['ice_fang'], senses: ['nightvision'] },
  };
  const parts = partsForActor(actor);
  assert.ok(parts.has('offense.ice_fang'));
  assert.ok(parts.has('senses.nightvision'));
  assert.ok(!parts.has('senses.echolocation'), 'override must not leak species defaults');
});

test('partsForActor: falls back to species default_parts when no actor.parts', () => {
  resetCache();
  const actor = { id: 'u1', species: 'dune_stalker' };
  const parts = partsForActor(actor);
  assert.ok(parts.has('senses.echolocation'));
  assert.ok(parts.has('offense.sand_claws'));
});

test('partsForActor: unknown species + no parts → empty', () => {
  resetCache();
  const parts = partsForActor({ id: 'u1', species: 'no_such_species' });
  assert.equal(parts.size, 0);
});

test('partsForActor: null/undefined actor → empty', () => {
  resetCache();
  assert.equal(partsForActor(null).size, 0);
  assert.equal(partsForActor(undefined).size, 0);
});

test('applicableSynergies: dune_stalker triggers echo_backstab from species defaults', () => {
  resetCache();
  const synergies = applicableSynergies({ id: 'u1', species: 'dune_stalker' });
  const ids = synergies.map((s) => s.id);
  assert.ok(ids.includes('echo_backstab'));
});

test('applicableSynergies: missing one part → no fire', () => {
  resetCache();
  const actor = {
    id: 'u1',
    parts: { senses: ['echolocation'] }, // sand_claws missing
  };
  const synergies = applicableSynergies(actor);
  assert.equal(synergies.length, 0);
});

test('applicableSynergies: empty parts → empty list', () => {
  resetCache();
  assert.equal(applicableSynergies({ id: 'u1' }).length, 0);
});

test('effectFor: explicit effect.bonus_damage wins', () => {
  assert.deepEqual(effectFor({ effect: { bonus_damage: 3 } }), { bonus_damage: 3 });
});

test('effectFor: missing effect → DEFAULT_BONUS_DAMAGE', () => {
  assert.deepEqual(effectFor({}), { bonus_damage: DEFAULT_BONUS_DAMAGE });
  assert.deepEqual(effectFor(null), { bonus_damage: DEFAULT_BONUS_DAMAGE });
});

test('effectFor: non-finite bonus_damage falls back on default', () => {
  assert.deepEqual(effectFor({ effect: { bonus_damage: 'lots' } }), {
    bonus_damage: DEFAULT_BONUS_DAMAGE,
  });
});

test('effectFor: negative bonus clamps to 0', () => {
  assert.deepEqual(effectFor({ effect: { bonus_damage: -5 } }), { bonus_damage: 0 });
});

test('detectSynergyTrigger: empty actor/target → no trigger', () => {
  resetCache();
  const sess = freshSession();
  assert.deepEqual(detectSynergyTrigger(sess, null, { id: 't1' }), {
    triggered: false,
    synergies: [],
    bonus_damage: 0,
  });
  assert.deepEqual(detectSynergyTrigger(sess, { id: 'a1' }, null), {
    triggered: false,
    synergies: [],
    bonus_damage: 0,
  });
});

test('detectSynergyTrigger: dune_stalker fires echo_backstab with default bonus', () => {
  resetCache();
  const sess = freshSession();
  const out = detectSynergyTrigger(
    sess,
    { id: 'a1', species: 'dune_stalker' },
    { id: 't1', hp: 5 },
  );
  assert.equal(out.triggered, true);
  assert.equal(out.bonus_damage, 1);
  assert.equal(out.synergies.length, 1);
  assert.equal(out.synergies[0].id, 'echo_backstab');
});

test('detectSynergyTrigger: cooldown — same actor cannot fire twice in same turn', () => {
  resetCache();
  const sess = freshSession();
  const actor = { id: 'a1', species: 'dune_stalker' };
  const target = { id: 't1', hp: 5 };
  const first = detectSynergyTrigger(sess, actor, target);
  assert.equal(first.triggered, true);
  recordSynergyFire(sess, actor, target, first, 1);
  const second = detectSynergyTrigger(sess, actor, target);
  assert.equal(second.triggered, false, 'cooldown blocks re-trigger same turn');
  assert.equal(second.bonus_damage, 0);
});

test('detectSynergyTrigger: cooldown lifts when turn advances', () => {
  resetCache();
  const sess = freshSession();
  const actor = { id: 'a1', species: 'dune_stalker' };
  const target = { id: 't1', hp: 5 };
  const first = detectSynergyTrigger(sess, actor, target);
  recordSynergyFire(sess, actor, target, first, 1);
  sess.turn += 1;
  const next = detectSynergyTrigger(sess, actor, target);
  assert.equal(next.triggered, true, 'new turn → cooldown clear');
});

test('recordSynergyFire: appends to last_round_synergies with bonus_applied', () => {
  resetCache();
  const sess = freshSession();
  const actor = { id: 'a1', species: 'dune_stalker' };
  const target = { id: 't1', hp: 5 };
  const trig = detectSynergyTrigger(sess, actor, target);
  recordSynergyFire(sess, actor, target, trig, 1);
  assert.ok(Array.isArray(sess.last_round_synergies));
  assert.equal(sess.last_round_synergies.length, 1);
  const log = sess.last_round_synergies[0];
  assert.equal(log.actor_id, 'a1');
  assert.equal(log.target_id, 't1');
  assert.equal(log.bonus_applied, 1);
  assert.equal(log.synergies[0].id, 'echo_backstab');
});

test('recordSynergyFire: untriggered info → still bumps cooldown but no log entry', () => {
  resetCache();
  const sess = freshSession();
  const actor = { id: 'a1' };
  recordSynergyFire(sess, actor, { id: 't1' }, { triggered: false }, 0);
  assert.equal(sess._synergy_last_fire.a1, sess.turn);
  assert.deepEqual(sess.last_round_synergies, []);
});

test('resetRoundSynergyTracker: archives + clears', () => {
  resetCache();
  const sess = freshSession();
  const actor = { id: 'a1', species: 'dune_stalker' };
  const target = { id: 't1', hp: 5 };
  const trig = detectSynergyTrigger(sess, actor, target);
  recordSynergyFire(sess, actor, target, trig, 1);
  assert.equal(sess.last_round_synergies.length, 1);
  resetRoundSynergyTracker(sess);
  assert.deepEqual(sess.last_round_synergies, []);
  assert.deepEqual(sess._synergy_last_fire, {});
  assert.ok(Array.isArray(sess.previous_round_synergies));
  assert.equal(sess.previous_round_synergies.length, 1);
});

test('resetRoundSynergyTracker: empty round does NOT overwrite previous archive', () => {
  resetCache();
  const sess = freshSession();
  sess.previous_round_synergies = [{ marker: 'keep_me' }];
  sess.last_round_synergies = []; // empty current
  resetRoundSynergyTracker(sess);
  // previous was not overwritten because last_round was empty
  assert.equal(sess.previous_round_synergies[0].marker, 'keep_me');
});

test('detectSynergyTrigger: actor without species and without parts → no fire', () => {
  resetCache();
  const out = detectSynergyTrigger(freshSession(), { id: 'a1' }, { id: 't1' });
  assert.equal(out.triggered, false);
});

test('detectSynergyTrigger: explicit actor.parts can fire even on unknown species', () => {
  resetCache();
  const actor = {
    id: 'a1',
    species: 'unknown_x',
    parts: { senses: ['echolocation'], offense: ['sand_claws'] },
  };
  const out = detectSynergyTrigger(freshSession(), actor, { id: 't1', hp: 5 });
  assert.equal(out.triggered, true);
  assert.equal(out.synergies[0].id, 'echo_backstab');
});

// ── buildSynergyPreview ─────────────────────────────────────────────────────

test('buildSynergyPreview: unit with applicable synergy appears as ready', () => {
  resetCache();
  const session = {
    turn: 1,
    units: [{ id: 'p1', species: 'dune_stalker', hp: 10, controlled_by: 'player' }],
  };
  const preview = buildSynergyPreview(session);
  assert.ok(Array.isArray(preview));
  const entry = preview.find((s) => s.unit_id === 'p1');
  assert.ok(entry, 'p1 should appear in preview');
  assert.equal(entry.ready, true);
  assert.equal(entry.on_cooldown, false);
  assert.ok(entry.synergies.length >= 1);
  assert.equal(entry.synergies[0].id, 'echo_backstab');
});

test('buildSynergyPreview: on_cooldown=true when unit fired this turn', () => {
  resetCache();
  const session = {
    turn: 3,
    _synergy_last_fire: { p1: 3 },
    units: [{ id: 'p1', species: 'dune_stalker', hp: 10, controlled_by: 'player' }],
  };
  const preview = buildSynergyPreview(session);
  const entry = preview.find((s) => s.unit_id === 'p1');
  assert.ok(entry);
  assert.equal(entry.ready, false);
  assert.equal(entry.on_cooldown, true);
});

test('buildSynergyPreview: dead units excluded', () => {
  resetCache();
  const session = {
    turn: 1,
    units: [{ id: 'p1', species: 'dune_stalker', hp: 0, controlled_by: 'player' }],
  };
  const preview = buildSynergyPreview(session);
  assert.equal(preview.length, 0, 'dead unit should not appear');
});

test('buildSynergyPreview: unit with no synergies not included', () => {
  resetCache();
  const session = {
    turn: 1,
    units: [{ id: 'p2', species: 'unknown_no_synergy', hp: 8, controlled_by: 'player' }],
  };
  const preview = buildSynergyPreview(session);
  assert.ok(!preview.find((s) => s.unit_id === 'p2'));
});

test('buildSynergyPreview: empty units array → empty preview', () => {
  const preview = buildSynergyPreview({ turn: 1, units: [] });
  assert.deepEqual(preview, []);
});

test('buildSynergyPreview: cooldown expires next turn (different turn → ready again)', () => {
  resetCache();
  const session = {
    turn: 4,
    _synergy_last_fire: { p1: 3 }, // fired turn 3, now turn 4
    units: [{ id: 'p1', species: 'dune_stalker', hp: 10, controlled_by: 'player' }],
  };
  const preview = buildSynergyPreview(session);
  const entry = preview.find((s) => s.unit_id === 'p1');
  assert.ok(entry);
  assert.equal(entry.ready, true);
  assert.equal(entry.on_cooldown, false);
});
