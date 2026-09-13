// T2 privacy -- arco Ennea Combat Pulse: consenso profilazione stile
// per-player nel coop store. Precedente session-scoped:
// routes/session.js device-event `session.profilingConsent`. Qui la pref
// e' per-player e room-scoped: stampata sul character record cosi'
// characterToUnit la porta nel payload /session/start (additive, mirror
// del pattern default_parts: campo ASSENTE quando il consenso e' attivo,
// presente solo su opt-out -- back-compat totale).
// Consumer runtime Godot: unit.profiling_opt_out gate in
// GGv2 scripts/ai/ennea_effects.gd:206.
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  CoopOrchestrator,
  characterToUnit,
} = require('../../apps/backend/services/coop/coopOrchestrator');

const ALL = { allPlayerIds: ['p_a', 'p_b'] };

function mk(n) {
  return { name: n, form_id: 'f', species_id: 's', job_id: 'guerriero' };
}

function partyOrch() {
  const co = new CoopOrchestrator({ roomCode: 'PRIV', hostId: 'p_h' });
  co.startOnboarding({ scenarioStack: ['enc_demo'] });
  co._setPhase('character_creation');
  co.submitCharacter('p_a', mk('A'), ALL);
  co.submitCharacter('p_b', mk('B'), ALL);
  return co;
}

test('default: nessuna pref -> unit senza campo profiling_opt_out (back-compat)', () => {
  const co = partyOrch();
  const { units } = co.buildSessionStartPayload();
  assert.equal(units.length, 2);
  for (const u of units) {
    assert.equal('profiling_opt_out' in u, false);
  }
});

test('setProfilingConsent(false) -> character stampato + unit porta profiling_opt_out', () => {
  const co = partyOrch();
  const snap = co.setProfilingConsent('p_a', false);
  assert.deepEqual(snap, { player_id: 'p_a', profiling_opt_out: true });
  assert.equal(co.characters.get('p_a').profiling_opt_out, true);
  const { units } = co.buildSessionStartPayload();
  const ua = units.find((u) => u.owner_id === 'p_a');
  const ub = units.find((u) => u.owner_id === 'p_b');
  assert.equal(ua.profiling_opt_out, true);
  assert.equal('profiling_opt_out' in ub, false, 'pref di p_a non tocca p_b');
});

test('re-enable -> campo assente di nuovo (nessun residuo opt-out)', () => {
  const co = partyOrch();
  co.setProfilingConsent('p_a', false);
  const snap = co.setProfilingConsent('p_a', true);
  assert.deepEqual(snap, { player_id: 'p_a', profiling_opt_out: false });
  assert.equal('profiling_opt_out' in co.characters.get('p_a'), false);
  const { units } = co.buildSessionStartPayload();
  const ua = units.find((u) => u.owner_id === 'p_a');
  assert.equal('profiling_opt_out' in ua, false);
});

test('pref settata PRIMA di submitCharacter -> applicata al submit', () => {
  const co = new CoopOrchestrator({ roomCode: 'PRIV', hostId: 'p_h' });
  co.startOnboarding({ scenarioStack: ['enc_demo'] });
  co._setPhase('character_creation');
  co.setProfilingConsent('p_a', false);
  co.submitCharacter('p_a', mk('A'), { allPlayerIds: ['p_a'] });
  const { units } = co.buildSessionStartPayload();
  assert.equal(units[0].profiling_opt_out, true);
});

test('characterToUnit: passthrough additive (host-forward /session/start parity)', () => {
  const base = { name: 'A', form_id: 'f', species_id: 's', player_id: 'p_a' };
  const withOptOut = characterToUnit({ ...base, profiling_opt_out: true });
  assert.equal(withOptOut.profiling_opt_out, true);
  const without = characterToUnit(base);
  assert.equal('profiling_opt_out' in without, false);
  // Solo boolean true stampa il campo: valori truthy sporchi non passano.
  const dirty = characterToUnit({ ...base, profiling_opt_out: 'yes' });
  assert.equal('profiling_opt_out' in dirty, false);
});

test('player_id vuoto -> throw player_id_required', () => {
  const co = partyOrch();
  assert.throws(() => co.setProfilingConsent('', false), /player_id_required/);
});
