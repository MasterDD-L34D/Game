'use strict';
// fase-2c mbtiPolicy: a pluggable meta-policy whose Nido choices are guided by MBTI
// temperament (Keirsey group -> role_class ordering of the canonical recruit pool), so the
// full-loop band-batch can measure whether temperament moves the meta-loop (tests P4). Same
// contract as greedy-policy; the divergence is WHICH species each temperament prioritises.
const test = require('node:test');
const assert = require('node:assert/strict');
const { makeMbtiPolicy, temperamentOf } = require('../../tools/sim/mbti-policy');
const { RECRUIT_SPECIES_POOL } = require('../../tools/sim/greedy-policy');

test('makeMbtiPolicy: returns the policy contract (3 methods + mbti tag)', () => {
  const p = makeMbtiPolicy('INTJ');
  assert.equal(p.mbti, 'INTJ');
  assert.equal(typeof p.chooseRecruits, 'function');
  assert.equal(typeof p.chooseCourtship, 'function');
  assert.equal(typeof p.chooseMating, 'function');
});

test('temperamentOf: maps the 4 Keirsey groups', () => {
  assert.equal(temperamentOf('INTJ'), 'NT'); // Analyst
  assert.equal(temperamentOf('ENFP'), 'NF'); // Diplomat
  assert.equal(temperamentOf('ISTJ'), 'SJ'); // Sentinel
  assert.equal(temperamentOf('ESFP'), 'SP'); // Explorer
});

test('mbtiPolicy: different temperaments recruit different species at the same step (P4)', () => {
  const intj = makeMbtiPolicy('INTJ'); // NT -> power-first (APEX)
  const esfp = makeMbtiPolicy('ESFP'); // SP -> opportunistic (HAZARD)
  const a = intj.chooseRecruits({ step: 1 })[0].speciesId;
  const b = esfp.chooseRecruits({ step: 1 })[0].speciesId;
  assert.notEqual(a, b, 'temperaments diverge on the first recruit');
  // both still draw from the canonical pool (no invented species).
  assert.ok(RECRUIT_SPECIES_POOL.includes(a), `${a} in canonical pool`);
  assert.ok(RECRUIT_SPECIES_POOL.includes(b), `${b} in canonical pool`);
});

test('mbtiPolicy: same temperament group -> identical ordering (deterministic)', () => {
  const intj = makeMbtiPolicy('INTJ');
  const entj = makeMbtiPolicy('ENTJ'); // also NT
  assert.equal(
    intj.chooseRecruits({ step: 1 })[0].speciesId,
    entj.chooseRecruits({ step: 1 })[0].speciesId,
  );
  assert.equal(
    intj.chooseRecruits({ step: 3 })[0].speciesId,
    entj.chooseRecruits({ step: 3 })[0].speciesId,
  );
});

test('mbtiPolicy: chooseCourtship keeps the canonical recruit gate satisfiable + run-scoped', () => {
  for (const t of ['INTJ', 'ENFP', 'ISTJ', 'ESFP']) {
    const c = makeMbtiPolicy(t).chooseCourtship({ step: 2, runId: 'run9' });
    assert.ok(c.trustDelta >= 2, `${t} trustDelta satisfies RECRUIT_TRUST_MIN`);
    assert.ok(c.affinityDelta >= 0, `${t} affinityDelta satisfies RECRUIT_AFFINITY_MIN`);
    assert.ok(c.npcId.includes('run9'), `${t} courtship id is run-scoped (no cross-run collision)`);
    assert.ok(RECRUIT_SPECIES_POOL.includes(c.speciesId), `${t} courts a canonical species`);
  }
});

test('mbtiPolicy: chooseMating null at step 1, run-scoped distinct parents at step>=2', () => {
  const p = makeMbtiPolicy('INTJ');
  assert.equal(p.chooseMating({ step: 1, runId: 'run9' }), null);
  const m = p.chooseMating({ step: 2, runId: 'run9' });
  assert.notEqual(m.parentA, m.parentB, 'distinct parents');
  assert.ok(m.parentA.includes('run9') && m.parentB.includes('run9'), 'run-scoped parents');
});

test('mbtiPolicy: unknown/garbage mbti defaults gracefully (no throw, canonical pick)', () => {
  const p = makeMbtiPolicy('XYZ');
  const pick = p.chooseRecruits({ step: 1 })[0];
  assert.ok(RECRUIT_SPECIES_POOL.includes(pick.speciesId));
});

test('mbtiPolicy: invalid MBTI normalizes the recorded label (Codex #2569 P2)', () => {
  // A mistyped type already falls back to the NT ordering, but it must NOT be recorded as a
  // fake archetype: the .mbti label has to reflect the type actually PLAYED (INTJ default),
  // so provenance/reports never show a nonexistent 'XXXX' archetype.
  assert.equal(makeMbtiPolicy('XXXX').mbti, 'INTJ', 'garbage 4-char normalized');
  assert.equal(makeMbtiPolicy('xyz').mbti, 'INTJ', 'malformed normalized');
  assert.equal(makeMbtiPolicy('ESFP').mbti, 'ESFP', 'valid type preserved');
  assert.equal(makeMbtiPolicy('esfp').mbti, 'ESFP', 'valid type case-normalized');
});
