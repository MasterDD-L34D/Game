'use strict';

// D6 (aa01 L'Impronta, 2026-06-30) -- imprint axis->trait grant wired into the coop
// branco-trait slot (stacking B: imprint feeds the single slot as a Form-Pulse
// fallback). Flag IMPRINT_TRAIT_GRANT_ENABLED + IMPRINT_BEAT_ENABLED default OFF =
// byte-identical (imprint stays cosmetic, no trait granted).

const test = require('node:test');
const assert = require('node:assert/strict');
const { CoopOrchestrator } = require('../../apps/backend/services/coop/coopOrchestrator');

function party(roomCode = 'IMTG') {
  const co = new CoopOrchestrator({ roomCode, hostId: 'p_h' });
  co.startOnboarding({ scenarioStack: ['enc_demo'] });
  co._setPhase('character_creation');
  const mk = (n) => ({ name: n, form_id: 'f', species_id: 's', job_id: 'guerriero' });
  co.submitCharacter('p_a', mk('A'), { allPlayerIds: ['p_a', 'p_b'] });
  co.submitCharacter('p_b', mk('B'), { allPlayerIds: ['p_a', 'p_b'] });
  return co;
}

// Complete the 4-axis imprint with a chosen locomotion pole (others = defaults).
function completeImprint(co, locomotion) {
  const assignment = co.openImprint({ connectedPlayerIds: ['p_a', 'p_b'] }).assignment;
  const VALUES = { locomotion, offense: 'PROFONDA', defense: 'DURA', senses: 'LONTANO' };
  for (const [pid, axes] of Object.entries(assignment)) {
    for (const axis of axes) co.submitImprintMark(pid, { axis, value: VALUES[axis] });
  }
}

function withFlags(on, fn) {
  const prevBeat = process.env.IMPRINT_BEAT_ENABLED;
  const prevGrant = process.env.IMPRINT_TRAIT_GRANT_ENABLED;
  if (on) {
    process.env.IMPRINT_BEAT_ENABLED = 'true';
    process.env.IMPRINT_TRAIT_GRANT_ENABLED = 'true';
  }
  try {
    fn();
  } finally {
    if (prevBeat === undefined) delete process.env.IMPRINT_BEAT_ENABLED;
    else process.env.IMPRINT_BEAT_ENABLED = prevBeat;
    if (prevGrant === undefined) delete process.env.IMPRINT_TRAIT_GRANT_ENABLED;
    else process.env.IMPRINT_TRAIT_GRANT_ENABLED = prevGrant;
  }
}

test('flag OFF (default): imprint completes but grants NO trait (byte-identical)', () => {
  const co = party();
  completeImprint(co, 'VELOCE');
  assert.equal(co.imprintTuple.locomotion, 'VELOCE', 'tuple still stamped (cosmetic hint)');
  assert.equal(co.emergentBrancoTrait, null, 'no branco trait without the flag');
  assert.equal(
    (co.characters.get('p_a').traits || []).includes('coda_stabilizzatrice_vortex'),
    false,
  );
});

test('flag ON, no Form-Pulse: imprint VELOCE fills the slot (coda_stabilizzatrice_vortex)', () => {
  withFlags(true, () => {
    const co = party();
    completeImprint(co, 'VELOCE');
    assert.ok(co.emergentBrancoTrait, 'slot filled by the imprint fallback');
    assert.equal(co.emergentBrancoTrait.trait_id, 'coda_stabilizzatrice_vortex');
    assert.equal(co.emergentBrancoTrait.source, 'imprint');
    assert.ok(co.characters.get('p_a').traits.includes('coda_stabilizzatrice_vortex'));
    assert.ok(co.characters.get('p_b').traits.includes('coda_stabilizzatrice_vortex'));
  });
});

test('flag ON, SILENZIOSA -> cartilagini_flessoacustiche', () => {
  withFlags(true, () => {
    const co = party();
    completeImprint(co, 'SILENZIOSA');
    assert.equal(co.emergentBrancoTrait.trait_id, 'cartilagini_flessoacustiche');
    assert.ok(co.characters.get('p_a').traits.includes('cartilagini_flessoacustiche'));
  });
});

test('flag ON, Form-Pulse present -> Form-Pulse PRECEDENCE (imprint ignored)', () => {
  withFlags(true, () => {
    const co = party();
    const ALL = { allPlayerIds: ['p_a', 'p_b'] };
    co.submitFormPulse('p_a', { axes: { solitary_swarm: 0.8 } }, ALL);
    co.submitFormPulse('p_b', { axes: { solitary_swarm: 0.8 } }, ALL); // -> legame_di_branco
    completeImprint(co, 'VELOCE');
    assert.equal(co.emergentBrancoTrait.trait_id, 'legame_di_branco', 'Form-Pulse wins the slot');
    assert.equal(
      co.characters.get('p_a').traits.includes('coda_stabilizzatrice_vortex'),
      false,
      'imprint trait NOT granted while Form-Pulse holds the slot',
    );
  });
});

test('flag ON, sub-threshold Form-Pulse -> imprint fallback fills the empty slot', () => {
  withFlags(true, () => {
    const co = party();
    const ALL = { allPlayerIds: ['p_a', 'p_b'] };
    co.submitFormPulse('p_a', { axes: { solitary_swarm: 0.1 } }, ALL);
    co.submitFormPulse('p_b', { axes: { solitary_swarm: 0.1 } }, ALL); // sub-threshold -> null
    assert.equal(co.emergentBrancoTrait, null, 'Form-Pulse yields nothing');
    completeImprint(co, 'VELOCE');
    assert.equal(co.emergentBrancoTrait.trait_id, 'coda_stabilizzatrice_vortex');
    assert.equal(co.emergentBrancoTrait.source, 'imprint');
  });
});

test('cancelImprint clears the stamped tuple', () => {
  const co = party();
  co.openImprint({ connectedPlayerIds: ['p_a', 'p_b'] });
  co.submitImprintMark('p_a', { axis: 'locomotion', value: 'VELOCE' });
  co.cancelImprint();
  assert.equal(co.imprintTuple, null);
});
