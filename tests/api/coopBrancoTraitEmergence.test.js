// #2674 plumbing -- branco-trait emergence wired into the coop path.
// Feeds CANONICAL creature-axis input (the vocabulary the mechanism expects);
// real phone MBTI axes do NOT trigger emergence (axis-contract = separate issue).
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { CoopOrchestrator } = require('../../apps/backend/services/coop/coopOrchestrator');

function partyOrch() {
  const co = new CoopOrchestrator({ roomCode: 'BRNC', hostId: 'p_h' });
  co.startOnboarding({ scenarioStack: ['enc_demo'] });
  co._setPhase('character_creation');
  const mk = (n) => ({ name: n, form_id: 'f', species_id: 's', job_id: 'guerriero' });
  co.submitCharacter('p_a', mk('A'), { allPlayerIds: ['p_a', 'p_b'] });
  co.submitCharacter('p_b', mk('B'), { allPlayerIds: ['p_a', 'p_b'] });
  return co;
}
const ALL = { allPlayerIds: ['p_a', 'p_b'] };

test('branco-trait emerges on all_ready (dominant solitary_swarm+ -> legame_di_branco)', () => {
  const co = partyOrch();
  co.submitFormPulse('p_a', { axes: { solitary_swarm: 0.8 } }, ALL);
  const status = co.submitFormPulse('p_b', { axes: { solitary_swarm: 0.8 } }, ALL);
  assert.equal(status.all_ready, true);
  assert.ok(status.emergent_branco_trait, 'return carries emergent_branco_trait');
  assert.equal(status.emergent_branco_trait.trait_id, 'legame_di_branco');
  assert.ok(co.characters.get('p_a').traits.includes('legame_di_branco'));
  assert.ok(co.characters.get('p_b').traits.includes('legame_di_branco'));
  assert.equal(co.emergentBrancoTrait.trait_id, 'legame_di_branco');
});

test('sub-threshold -> no emergent, characters untouched', () => {
  const co = partyOrch();
  co.submitFormPulse('p_a', { axes: { solitary_swarm: 0.1 } }, ALL);
  const status = co.submitFormPulse('p_b', { axes: { solitary_swarm: 0.1 } }, ALL);
  assert.equal(status.all_ready, true);
  assert.equal(status.emergent_branco_trait, null);
  assert.equal(co.emergentBrancoTrait, null);
  assert.equal(co.characters.get('p_a').traits.includes('legame_di_branco'), false);
});

test('idempotent re-submit -> trait present exactly once', () => {
  const co = partyOrch();
  co.submitFormPulse('p_a', { axes: { solitary_swarm: 0.8 } }, ALL);
  co.submitFormPulse('p_b', { axes: { solitary_swarm: 0.8 } }, ALL);
  co.submitFormPulse('p_b', { axes: { solitary_swarm: 0.8 } }, ALL);
  const traits = co.characters.get('p_a').traits.filter((t) => t === 'legame_di_branco');
  assert.equal(traits.length, 1);
});

test('re-submit changing dominant axis -> swap (old removed, new added)', () => {
  const co = partyOrch();
  co.submitFormPulse('p_a', { axes: { solitary_swarm: 0.8 } }, ALL);
  co.submitFormPulse('p_b', { axes: { solitary_swarm: 0.8 } }, ALL);
  co.submitFormPulse('p_a', { axes: { solitary_swarm: 0.0, symbiosis_predation: 0.9 } }, ALL);
  const st = co.submitFormPulse(
    'p_b',
    { axes: { solitary_swarm: 0.0, symbiosis_predation: 0.9 } },
    ALL,
  );
  assert.equal(st.emergent_branco_trait.trait_id, 'ferocia');
  assert.ok(co.characters.get('p_a').traits.includes('ferocia'));
  assert.equal(co.characters.get('p_a').traits.includes('legame_di_branco'), false);
});

// Codex #3083 P2 -- the single branco slot must not stack across scenario advance.
test('branco trait does NOT stack across scenario advance (slot emptied on advance)', () => {
  const co = new CoopOrchestrator({ roomCode: 'BSCN', hostId: 'p_h' });
  co.startOnboarding({ scenarioStack: ['enc_a', 'enc_b'] });
  co._setPhase('character_creation');
  const mk = (n) => ({ name: n, form_id: 'f', species_id: 's', job_id: 'guerriero' });
  co.submitCharacter('p_a', mk('A'), ALL);
  co.submitCharacter('p_b', mk('B'), ALL);

  // Scenario 1: solitary_swarm+ -> legame_di_branco granted to the party.
  co.submitFormPulse('p_a', { axes: { solitary_swarm: 0.8 } }, ALL);
  co.submitFormPulse('p_b', { axes: { solitary_swarm: 0.8 } }, ALL);
  assert.ok(co.characters.get('p_a').traits.includes('legame_di_branco'));

  // Advance to scenario 2 -- the party PERSISTS, the slot must be emptied.
  const adv = co.advanceScenarioOrEnd();
  assert.equal(adv.action, 'next_scenario');
  assert.equal(co.emergentBrancoTrait, null);
  assert.equal(
    co.characters.get('p_a').traits.includes('legame_di_branco'),
    false,
    'old branco trait stripped from the persisting party on advance',
  );

  // Scenario 2: a DIFFERENT dominant axis -> ferocia, and ONLY ferocia.
  co._setPhase('character_creation');
  co.submitFormPulse('p_a', { axes: { symbiosis_predation: 0.9 } }, ALL);
  co.submitFormPulse('p_b', { axes: { symbiosis_predation: 0.9 } }, ALL);
  const traits = co.characters.get('p_a').traits;
  assert.ok(traits.includes('ferocia'));
  assert.equal(
    traits.filter((t) => t === 'ferocia' || t === 'legame_di_branco').length,
    1,
    'exactly one branco trait occupies the slot (no cross-scenario stacking)',
  );
});
