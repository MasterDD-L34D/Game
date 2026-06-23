'use strict';

// Form-Pulse trait system v2 (spec 2026-06-23) -- Piece 1: always-emerge (threshold -> 0),
// flag-gated. Default (flag OFF) keeps EMERGENCE_THRESHOLD = 0.30 (band-neutral); the v2 flag
// drops it to 0 so the branco ALWAYS receives the dominant-axis trait, even a weak lean.
// The pure mechanism (emergeBrancoTrait + opts.threshold) already exists; v2 only adds the
// flag + the threshold resolver.

const { test } = require('node:test');
const assert = require('node:assert/strict');
const {
  EMERGENCE_THRESHOLD,
  isFormPulseTraitV2Enabled,
  resolveEmergenceThreshold,
  emergeBrancoTrait,
  emergePlayerMinorTrait,
  PROPOSED_BRANCO_TRAIT_MAPPING,
  PROPOSED_MINOR_TRAIT_MAPPING,
} = require('../../apps/backend/services/identity/brancoTraitEmergence');
const { CoopOrchestrator } = require('../../apps/backend/services/coop/coopOrchestrator');

function withV2(value, fn) {
  const prev = process.env.FORM_PULSE_TRAIT_V2_ENABLED;
  if (value === undefined) delete process.env.FORM_PULSE_TRAIT_V2_ENABLED;
  else process.env.FORM_PULSE_TRAIT_V2_ENABLED = value;
  try {
    return fn();
  } finally {
    if (prev === undefined) delete process.env.FORM_PULSE_TRAIT_V2_ENABLED;
    else process.env.FORM_PULSE_TRAIT_V2_ENABLED = prev;
  }
}

function weakLeanStatus() {
  const orch = new CoopOrchestrator({ roomCode: 'FPV2', hostId: 'h', now: () => 1 });
  orch.startRun({ scenarioStack: ['enc_tutorial_01'] });
  return orch.submitFormPulse(
    'p1',
    { axes: { symbiosis_predation: 0.2 } },
    { allPlayerIds: ['p1'] },
  );
}

test('isFormPulseTraitV2Enabled: only true for env flag === "true"', () => {
  assert.equal(isFormPulseTraitV2Enabled({ FORM_PULSE_TRAIT_V2_ENABLED: 'true' }), true);
  assert.equal(isFormPulseTraitV2Enabled({ FORM_PULSE_TRAIT_V2_ENABLED: 'false' }), false);
  assert.equal(isFormPulseTraitV2Enabled({ FORM_PULSE_TRAIT_V2_ENABLED: '1' }), false);
  assert.equal(isFormPulseTraitV2Enabled({}), false);
  assert.equal(isFormPulseTraitV2Enabled(null), false);
});

test('resolveEmergenceThreshold: 0 when v2 ON, EMERGENCE_THRESHOLD when OFF (band-neutral)', () => {
  assert.equal(resolveEmergenceThreshold({ FORM_PULSE_TRAIT_V2_ENABLED: 'true' }), 0);
  assert.equal(resolveEmergenceThreshold({}), EMERGENCE_THRESHOLD);
  assert.equal(
    resolveEmergenceThreshold({ FORM_PULSE_TRAIT_V2_ENABLED: 'false' }),
    EMERGENCE_THRESHOLD,
  );
});

test('threshold 0 (v2 ON) emerges a WEAK lean that the default 0.30 would drop', () => {
  // symbiosis_predation avg 0.2 -> below 0.30 (default = no trait), but >= 0 (v2 = trait).
  const weak = { symbiosis_predation: 0.2 };
  assert.equal(emergeBrancoTrait(weak, { threshold: EMERGENCE_THRESHOLD }), null, 'OFF: no trait');
  const v2 = emergeBrancoTrait(weak, { threshold: 0 });
  assert.ok(v2, 'v2 ON: a trait emerges');
  assert.equal(v2.trait_id, 'ferocia');
  assert.equal(v2.axis, 'symbiosis_predation');
  assert.equal(v2.pole, '+');
});

test('threshold 0 flat-tie fallback: a perfectly flat aggregate emerges the first axis, pole +', () => {
  const flat = {
    solitary_swarm: 0,
    explore_caution: 0,
    symbiosis_predation: 0,
    memory_instinct: 0,
    agile_robust: 0,
  };
  const out = emergeBrancoTrait(flat, { threshold: 0 });
  assert.ok(out, 'flat aggregate still emerges at threshold 0');
  assert.equal(out.axis, 'solitary_swarm', 'first axis in mapping order');
  assert.equal(out.pole, '+', 'pole + on a zero (non-negative) average');
  assert.equal(out.trait_id, 'legame_di_branco');
});

test('orchestrator: v2 flag ON makes a weak lean emerge a branco trait (wired threshold)', () => {
  const status = withV2('true', weakLeanStatus);
  assert.ok(status.emergent_branco_trait, 'v2 ON: a weak lean emerges a trait');
  assert.equal(status.emergent_branco_trait.trait_id, 'ferocia');
});

test('orchestrator: v2 flag OFF leaves a weak lean with NO branco trait (band-neutral)', () => {
  const status = withV2(undefined, weakLeanStatus);
  assert.equal(status.emergent_branco_trait, null, 'OFF: weak lean -> no trait (0.30 default)');
});

// --- Piece 2: per-player minor trait (COMPLEMENT rule) ---

test('emergePlayerMinorTrait: own dominant axis (distinct from branco) -> its minor trait', () => {
  const out = emergePlayerMinorTrait(
    { agile_robust: -0.8, symbiosis_predation: 0.3 },
    'symbiosis_predation',
  );
  assert.equal(out.axis, 'agile_robust');
  assert.equal(out.pole, '-');
  assert.equal(out.trait_id, 'coda_stabilizzatrice_filo');
});

test('emergePlayerMinorTrait: dominant collides with branco -> 2nd-strongest (COMPLEMENT)', () => {
  const out = emergePlayerMinorTrait(
    { symbiosis_predation: 0.9, explore_caution: 0.4 },
    'symbiosis_predation',
  );
  assert.equal(out.axis, 'explore_caution', 'complements: skips the branco axis');
  assert.equal(out.pole, '+');
  assert.equal(out.trait_id, 'cuticole_cerose');
});

test('emergePlayerMinorTrait: empty / flat bars -> null', () => {
  assert.equal(emergePlayerMinorTrait({}, 'symbiosis_predation'), null);
  assert.equal(emergePlayerMinorTrait(null, null), null);
});

test('PROPOSED_MINOR_TRAIT_MAPPING is DISTINCT from the branco mapping (no shared ids)', () => {
  const branco = new Set(
    Object.values(PROPOSED_BRANCO_TRAIT_MAPPING).flatMap((p) => [p['+'], p['-']]),
  );
  for (const poles of Object.values(PROPOSED_MINOR_TRAIT_MAPPING)) {
    for (const id of [poles['+'], poles['-']]) {
      assert.ok(!branco.has(id), `minor id ${id} must not reuse a branco id`);
    }
  }
});

function twoPlayerRun() {
  const orch = new CoopOrchestrator({ roomCode: 'FPV2c', hostId: 'h', now: () => 1 });
  orch.startRun({ scenarioStack: ['enc_tutorial_01'] });
  const ALL = ['p1', 'p2'];
  for (const pid of ALL) {
    orch.submitCharacter(pid, { name: pid, form_id: 'INTJ' }, { allPlayerIds: ALL });
  }
  // Both lean symbiosis_predation+ -> branco axis = symbiosis_predation (ferocia).
  // p1's own strongest = symbiosis_predation (collides) -> complement via explore_caution+.
  // p2's own strongest = agile_robust- (distinct) -> its own minor.
  // Both players move all relevant bars (aggregate averages per-axis over submitters, so a
  // sparse axis would otherwise dominate). symbiosis_predation avg 0.7 wins -> branco ferocia.
  orch.submitFormPulse(
    'p1',
    { axes: { symbiosis_predation: 0.9, explore_caution: 0.4, agile_robust: 0.0 } },
    { allPlayerIds: ALL },
  );
  orch.submitFormPulse(
    'p2',
    { axes: { symbiosis_predation: 0.5, explore_caution: 0.0, agile_robust: -0.6 } },
    { allPlayerIds: ALL },
  );
  return orch;
}

test('orchestrator v2 ON: each character gets its COMPLEMENT minor trait', () => {
  const orch = withV2('true', twoPlayerRun);
  const p1 = orch.characters.get('p1');
  const p2 = orch.characters.get('p2');
  assert.ok(p1.traits.includes('ferocia'), 'branco trait applied to p1');
  assert.ok(p1.traits.includes('cuticole_cerose'), 'p1 complement minor (explore_caution+)');
  assert.ok(p2.traits.includes('ferocia'), 'branco trait applied to p2');
  assert.ok(
    p2.traits.includes('coda_stabilizzatrice_filo'),
    'p2 own-dominant minor (agile_robust-)',
  );
});

test('orchestrator v2 OFF: no per-player minor traits (band-neutral)', () => {
  const orch = withV2(undefined, twoPlayerRun);
  const p1 = orch.characters.get('p1');
  assert.ok(p1.traits.includes('ferocia'), 'branco still emerges (0.7 avg > 0.30)');
  assert.ok(!p1.traits.includes('cuticole_cerose'), 'no minor trait when v2 OFF');
});
