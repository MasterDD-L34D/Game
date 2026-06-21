// OD-024 ai-station 2026-06-21 -- sentience interoception trait GRANT (producer).
//
// Gate-5 closure: the 4 RFC sentience v0.1 interoception traits
// (propriocezione / equilibrio_vestibolare / nocicezione / termocezione) FIRE
// end-to-end through traitEffects.js (proven by interoception-traits-runtime
// .test.js) but NO producer assigned them to any unit, so they never appeared
// in real play. This validates the producer that grants the gateway set to a
// character/unit whose species sentience_index qualifies (>= T1), flag-gated
// OFF so it is band-neutral until master-dd flips it post N=40.
//
// Mechanism (a): tier-based grant -- reuses the already-wired sentience tier
// (vcScoring._resolveSentienceTiers / species_catalog.json sentience_index).

'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const yaml = require('js-yaml');

const grant = require('../../apps/backend/services/sentience/sentienceInteroceptionGrant');
const traitEffects = require('../../apps/backend/services/traitEffects');

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const ACTIVE_EFFECTS = yaml.load(
  fs.readFileSync(path.join(REPO_ROOT, 'data', 'core', 'traits', 'active_effects.yaml'), 'utf8'),
);
const REGISTRY = ACTIVE_EFFECTS.traits;

const GATEWAY_IDS = ['propriocezione', 'equilibrio_vestibolare', 'nocicezione', 'termocezione'];
// D2 progressive subsets (cumulative): T1 = spatial body-sense; T2 adds pain; T3+ = all 4.
const T1_SET = ['propriocezione', 'equilibrio_vestibolare'];
const T2_SET = ['propriocezione', 'equilibrio_vestibolare', 'nocicezione'];

const FLAG_ON = { SENTIENCE_INTEROCEPTION_GRANT_ENABLED: 'true' };
const FLAG_OFF = {};

// Synthetic catalog -> deterministic tier behavior decoupled from data churn.
const CATALOG = {
  syn_t0: { species_id: 'syn_t0', sentience_index: 'T0' },
  syn_t1: { species_id: 'syn_t1', sentience_index: 'T1' },
  syn_t2: { species_id: 'syn_t2', sentience_index: 'T2' },
  syn_t3: { species_id: 'syn_t3', sentience_index: 'T3' },
  // D4 per-species override: T1 tier but data authors exactly one interoception trait.
  syn_override: {
    species_id: 'syn_override',
    sentience_index: 'T1',
    interoception_traits: ['termocezione'],
  },
  // override carrying a bad id -> filtered to the whitelist (here: only termocezione).
  syn_override_bad: {
    species_id: 'syn_override_bad',
    sentience_index: 'T1',
    interoception_traits: ['termocezione', 'not_a_real_trait'],
  },
};

function spec(speciesId, traits = []) {
  return { name: 'Tester', form_id: 'INTJ', species_id: speciesId, traits };
}

describe('OD-024 producer -- exported contract', () => {
  test('exposes the canonical 4-id gateway set', () => {
    assert.deepEqual([...grant.INTEROCEPTION_TRAIT_IDS].sort(), [...GATEWAY_IDS].sort());
  });

  test('all gateway ids exist in active_effects.yaml (yaml is SoT)', () => {
    for (const id of grant.INTEROCEPTION_TRAIT_IDS) {
      assert.ok(REGISTRY[id], `${id} must be defined in active_effects.yaml`);
    }
  });
});

describe('OD-024 producer -- flag gate (band-neutral default)', () => {
  test('flag OFF: T1 species spec unchanged (no grant)', () => {
    const out = grant.applySentienceInteroceptionGrant(spec('syn_t1'), {
      env: FLAG_OFF,
      catalog: CATALOG,
      registry: REGISTRY,
    });
    assert.deepEqual(out.traits, []);
  });

  test('flag OFF returns the SAME object reference (pure no-op)', () => {
    const input = spec('syn_t1');
    const out = grant.applySentienceInteroceptionGrant(input, {
      env: FLAG_OFF,
      catalog: CATALOG,
      registry: REGISTRY,
    });
    assert.equal(out, input);
  });
});

describe('OD-024 producer -- progressive tier gating (flag ON, D2)', () => {
  test('T1 species grants only the gateway subset (propriocezione + vestibolare)', () => {
    const out = grant.applySentienceInteroceptionGrant(spec('syn_t1'), {
      env: FLAG_ON,
      catalog: CATALOG,
      registry: REGISTRY,
    });
    assert.deepEqual([...out.traits].sort(), [...T1_SET].sort());
  });

  test('T2 species adds nocicezione (3 traits)', () => {
    const out = grant.applySentienceInteroceptionGrant(spec('syn_t2'), {
      env: FLAG_ON,
      catalog: CATALOG,
      registry: REGISTRY,
    });
    assert.deepEqual([...out.traits].sort(), [...T2_SET].sort());
  });

  test('T3 species grants the full set of 4 (progressive ceiling)', () => {
    const out = grant.applySentienceInteroceptionGrant(spec('syn_t3'), {
      env: FLAG_ON,
      catalog: CATALOG,
      registry: REGISTRY,
    });
    assert.deepEqual([...out.traits].sort(), [...GATEWAY_IDS].sort());
  });

  test('T0 species (below gateway) grants nothing', () => {
    const out = grant.applySentienceInteroceptionGrant(spec('syn_t0'), {
      env: FLAG_ON,
      catalog: CATALOG,
      registry: REGISTRY,
    });
    assert.deepEqual(out.traits, []);
  });
});

describe('OD-024 producer -- progressive map helper (interoceptionForTier)', () => {
  test('T1 -> [propriocezione, equilibrio_vestibolare]', () => {
    assert.deepEqual([...grant.interoceptionForTier('T1')].sort(), [...T1_SET].sort());
  });
  test('T2 -> + nocicezione (cumulative)', () => {
    assert.deepEqual([...grant.interoceptionForTier('T2')].sort(), [...T2_SET].sort());
  });
  test('T3 -> all 4', () => {
    assert.deepEqual([...grant.interoceptionForTier('T3')].sort(), [...GATEWAY_IDS].sort());
  });
  test('T6 (above ceiling) -> still all 4, never more', () => {
    assert.deepEqual([...grant.interoceptionForTier('T6')].sort(), [...GATEWAY_IDS].sort());
  });
  test('T0 / unknown -> empty set', () => {
    assert.deepEqual(grant.interoceptionForTier('T0'), []);
    assert.deepEqual(grant.interoceptionForTier('garbage'), []);
  });
});

describe('OD-024 producer -- per-species override (D4)', () => {
  test('override replaces the tier subset (T1 species grants exactly termocezione)', () => {
    const out = grant.applySentienceInteroceptionGrant(spec('syn_override'), {
      env: FLAG_ON,
      catalog: CATALOG,
      registry: REGISTRY,
    });
    assert.deepEqual(out.traits, ['termocezione']);
  });

  test('override is filtered to the gateway whitelist (bad id dropped)', () => {
    const out = grant.applySentienceInteroceptionGrant(spec('syn_override_bad'), {
      env: FLAG_ON,
      catalog: CATALOG,
      registry: REGISTRY,
    });
    assert.deepEqual(out.traits, ['termocezione']);
    assert.ok(!out.traits.includes('not_a_real_trait'));
  });

  test('absent/empty override falls back to the progressive tier subset', () => {
    // perSpeciesOverride contract: null when absent or empty.
    assert.equal(grant.perSpeciesOverride({ sentience_index: 'T1' }), null);
    assert.equal(grant.perSpeciesOverride({ interoception_traits: [] }), null);
    // and a plain T1 entry (no override) still gets the tier subset.
    const out = grant.applySentienceInteroceptionGrant(spec('syn_t1'), {
      env: FLAG_ON,
      catalog: CATALOG,
      registry: REGISTRY,
    });
    assert.deepEqual([...out.traits].sort(), [...T1_SET].sort());
  });
});

describe('OD-024 producer -- fail-closed (flag ON)', () => {
  test('null species_id grants nothing', () => {
    const out = grant.applySentienceInteroceptionGrant(spec(null), {
      env: FLAG_ON,
      catalog: CATALOG,
      registry: REGISTRY,
    });
    assert.deepEqual(out.traits, []);
  });

  test('unknown species_id (not in catalog) grants nothing', () => {
    const out = grant.applySentienceInteroceptionGrant(spec('does_not_exist'), {
      env: FLAG_ON,
      catalog: CATALOG,
      registry: REGISTRY,
    });
    assert.deepEqual(out.traits, []);
  });

  test('non-object spec returned unchanged', () => {
    assert.equal(grant.applySentienceInteroceptionGrant(null, { env: FLAG_ON }), null);
  });
});

describe('OD-024 producer -- no-dup + immutability + id validation', () => {
  test('does not duplicate already-present interoception traits', () => {
    const out = grant.applySentienceInteroceptionGrant(spec('syn_t1', ['propriocezione']), {
      env: FLAG_ON,
      catalog: CATALOG,
      registry: REGISTRY,
    });
    const counts = out.traits.filter((t) => t === 'propriocezione').length;
    assert.equal(counts, 1, 'propriocezione present exactly once');
    assert.deepEqual([...out.traits].sort(), [...T1_SET].sort()); // T1 subset, no dup
  });

  test('preserves pre-existing non-interoception traits', () => {
    const out = grant.applySentienceInteroceptionGrant(spec('syn_t3', ['coda_balanciere']), {
      env: FLAG_ON,
      catalog: CATALOG,
      registry: REGISTRY,
    });
    assert.ok(out.traits.includes('coda_balanciere'));
    for (const id of GATEWAY_IDS) assert.ok(out.traits.includes(id)); // T3 = full set
  });

  test('returns a NEW object, never mutates input spec', () => {
    const input = spec('syn_t1');
    const out = grant.applySentienceInteroceptionGrant(input, {
      env: FLAG_ON,
      catalog: CATALOG,
      registry: REGISTRY,
    });
    assert.notEqual(out, input);
    assert.deepEqual(input.traits, [], 'input.traits untouched');
  });

  test('only grants ids that exist in the injected registry (yaml is SoT)', () => {
    const partial = { ...REGISTRY };
    delete partial.termocezione;
    // syn_t3 wants all 4; with termocezione absent from the registry it drops to 3.
    const out = grant.applySentienceInteroceptionGrant(spec('syn_t3'), {
      env: FLAG_ON,
      catalog: CATALOG,
      registry: partial,
    });
    assert.ok(!out.traits.includes('termocezione'), 'absent id not granted');
    assert.deepEqual([...out.traits].sort(), [
      'equilibrio_vestibolare',
      'nocicezione',
      'propriocezione',
    ]);
  });
});

describe('OD-024 producer -- real species_catalog (default loaders)', () => {
  test('anguis_magnetica (T1, real catalog) grants the T1 subset with flag ON', () => {
    // No catalog/registry injected -> exercises the real disk loaders.
    const out = grant.applySentienceInteroceptionGrant(spec('anguis_magnetica'), { env: FLAG_ON });
    assert.deepEqual([...out.traits].sort(), [...T1_SET].sort());
  });

  test('proteus_plasma (T0, real catalog) grants nothing with flag ON', () => {
    const out = grant.applySentienceInteroceptionGrant(spec('proteus_plasma'), { env: FLAG_ON });
    assert.deepEqual(out.traits, []);
  });
});

describe('OD-024 producer -- end-to-end firing (Gate-5 proof)', () => {
  test('granted actor-side traits actually fire through evaluateAttackTraits', () => {
    // Produce -> a T3 unit now carries the full gateway set (incl. nocicezione).
    const granted = grant.applySentienceInteroceptionGrant(spec('syn_t3'), {
      env: FLAG_ON,
      catalog: CATALOG,
      registry: REGISTRY,
    });
    // Feed the produced traits into the combat trait engine as the actor.
    const actor = { id: 'a1', traits: granted.traits, status: { ferito: true }, x: 0, y: 0 };
    const target = { id: 't1', traits: [], status: {}, x: 1, y: 0 };
    const result = traitEffects.evaluateAttackTraits({
      registry: REGISTRY,
      actor,
      target,
      attackResult: { hit: true, mos: 5, result: 'hit' },
    });
    // propriocezione (+1, actor) + nocicezione (+1, actor while ferito) = +2.
    assert.equal(result.damage_modifier, 2, 'granted actor-side traits fire for +2');
    const fired = (result.trait_effects || []).map((e) => e.trait);
    assert.ok(fired.includes('propriocezione'));
    assert.ok(fired.includes('nocicezione'));
  });
});
