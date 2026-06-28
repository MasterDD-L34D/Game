// 2026-06-21 OD-024 ai-station -- wiring test: submitCharacter applies the
// sentience interoception grant. Proves the producer is reached on the real
// character-creation path (not just unit-tested in isolation) and that the
// flag gate makes it band-neutral by default.

'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { CoopOrchestrator } = require('../../apps/backend/services/coop/coopOrchestrator');

const FLAG = 'SENTIENCE_INTEROCEPTION_GRANT_ENABLED';
const GATEWAY = ['propriocezione', 'equilibrio_vestibolare', 'nocicezione', 'termocezione'];
// D2 progressive: a T1 species gets only the gateway subset, not the higher-tier ids.
const T1_SET = ['propriocezione', 'equilibrio_vestibolare'];
const ABOVE_T1 = ['nocicezione', 'termocezione'];

function buildOrch() {
  const co = new CoopOrchestrator({ roomCode: 'SENT', hostId: 'p_h' });
  co.startOnboarding({ scenarioStack: ['enc_demo'] });
  co._setPhase('character_creation');
  return co;
}

// arboryxis_lenis is T1 + foresta_temperata in species_catalog.json with NO D4
// derived interoception override (interoception_traits: []) -> stays on the pure
// tier default, so the progressive gating (T1 subset granted, higher-tier ids
// withheld) is observable on real data. (Replaced the prior glowcap_weaver fixture:
// that id was a role_trofico=evento_ecologico stub PRUNED in the 2026-06-28 catalog
// re-baseline -- an event is not a usable species fixture. anguis_magnetica carries
// an override; lupus_temperatus/blight_micotico carry nocicezione (danger>=2).)
function t1Spec() {
  return { name: 'Arboryxis', form_id: 'INTJ', species_id: 'arboryxis_lenis', traits: [] };
}

function withFlag(value, fn) {
  const prev = process.env[FLAG];
  if (value === undefined) delete process.env[FLAG];
  else process.env[FLAG] = value;
  try {
    return fn();
  } finally {
    if (prev === undefined) delete process.env[FLAG];
    else process.env[FLAG] = prev;
  }
}

test('submitCharacter grants the T1 progressive subset when flag ON + species T1', () => {
  withFlag('true', () => {
    const co = buildOrch();
    const out = co.submitCharacter('p_h', t1Spec(), { allPlayerIds: ['p_h'] });
    for (const id of T1_SET) {
      assert.ok(out.traits.includes(id), `${id} should be granted at T1`);
    }
    for (const id of ABOVE_T1) {
      assert.ok(!out.traits.includes(id), `${id} is above T1 -> not granted progressively`);
    }
  });
});

test('submitCharacter does NOT grant interoception traits when flag OFF (default)', () => {
  withFlag(undefined, () => {
    const co = buildOrch();
    const out = co.submitCharacter('p_h', t1Spec(), { allPlayerIds: ['p_h'] });
    for (const id of GATEWAY) {
      assert.ok(!out.traits.includes(id), `${id} should NOT be granted with flag off`);
    }
  });
});
