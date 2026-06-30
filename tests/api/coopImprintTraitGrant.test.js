'use strict';

// D6 imprint axis->trait grant wired into the coop branco-trait slot. W4 flag-unification
// (grilling 2026-06-30): the imprint now feeds the single slot through the unified
// brancoTraitProducer under ONE flag FORM_PULSE_TRAIT_V2_ENABLED (the old
// IMPRINT_TRAIT_GRANT_ENABLED is collapsed away). OFF = byte-identical (imprint stays
// cosmetic). Stacking B preserved: ONE slot, imprint competes via the weighted argmax,
// Form-Pulse precedence on a tie.

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

// W4: the imprint participates under the SINGLE unified flag FORM_PULSE_TRAIT_V2_ENABLED
// (threshold -> 0 + imprint enters the argmax). IMPRINT_BEAT_ENABLED is kept set so the
// beat semantics stay consistent, but it no longer gates the grant.
function withFlags(on, fn) {
  const prevBeat = process.env.IMPRINT_BEAT_ENABLED;
  const prevV2 = process.env.FORM_PULSE_TRAIT_V2_ENABLED;
  if (on) {
    process.env.IMPRINT_BEAT_ENABLED = 'true';
    process.env.FORM_PULSE_TRAIT_V2_ENABLED = 'true';
  }
  try {
    fn();
  } finally {
    if (prevBeat === undefined) delete process.env.IMPRINT_BEAT_ENABLED;
    else process.env.IMPRINT_BEAT_ENABLED = prevBeat;
    if (prevV2 === undefined) delete process.env.FORM_PULSE_TRAIT_V2_ENABLED;
    else process.env.FORM_PULSE_TRAIT_V2_ENABLED = prevV2;
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

test('flag ON, weak Form-Pulse lean -> imprint weight outvotes it for the slot', () => {
  withFlags(true, () => {
    const co = party();
    const ALL = { allPlayerIds: ['p_a', 'p_b'] };
    // Under the unified flag the threshold is 0, so even a 0.1 lean emerges from Form-Pulse...
    co.submitFormPulse('p_a', { axes: { solitary_swarm: 0.1 } }, ALL);
    co.submitFormPulse('p_b', { axes: { solitary_swarm: 0.1 } }, ALL);
    assert.equal(co.emergentBrancoTrait.trait_id, 'legame_di_branco', 'weak lean still emerges');
    assert.equal(co.emergentBrancoTrait.source, 'formpulse');
    // ...but the imprint weight (PROPOSED 0.5) outvotes a 0.1 lean once the tuple lands.
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
