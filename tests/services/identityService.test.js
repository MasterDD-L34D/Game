// identityService -- SPEC-Q M-2 (identity-earned: name emergence by lifecycle stage).
// Mechanism (stage-gating + deterministic pick + creature_named emit) = objective/tested.
// Name-pool CONTENT = flagged PROPOSAL in data/core/identity/name_pool.yaml (ratify, not fiat).

'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const {
  emergeIdentity,
  pickName,
  emitCreatureNamed,
} = require('../../apps/backend/services/identity/identityService');
const { getChronicle } = require('../../apps/backend/services/chronicle/chronicleStore');

const POOL = ['Vega', 'Esca', 'Brace', 'Lama', 'Cardo'];

test('pickName: deterministic by seed, within pool', () => {
  const a = pickName(POOL, 'unit_1');
  const b = pickName(POOL, 'unit_1');
  assert.equal(a, b); // deterministic
  assert.ok(POOL.includes(a));
  // varies by seed: across many seeds, more than one distinct name appears (not constant)
  const names = new Set(Array.from({ length: 20 }, (_, i) => pickName(POOL, 'seed' + i)));
  assert.ok(names.size > 1);
});

test('pickName: empty pool -> null', () => {
  assert.equal(pickName([], 'x'), null);
  assert.equal(pickName(null, 'x'), null);
});

test('emergeIdentity: hatchling = anonymous (no name)', () => {
  const id = emergeIdentity({ id: 'u1' }, { stage: 'hatchling', pool: POOL });
  assert.equal(id.stage, 'hatchling');
  assert.equal(id.anonymous, true);
  assert.equal(id.name, null);
  assert.equal(id.mbti_reveal, false);
});

test('emergeIdentity: juvenile = named, no mbti reveal', () => {
  const id = emergeIdentity({ id: 'u1' }, { stage: 'juvenile', pool: POOL });
  assert.equal(id.anonymous, false);
  assert.ok(POOL.includes(id.name));
  assert.equal(id.mbti_reveal, false);
});

test('emergeIdentity: apex = named + mbti reveal', () => {
  const id = emergeIdentity({ id: 'u1' }, { stage: 'apex', pool: POOL });
  assert.ok(POOL.includes(id.name));
  assert.equal(id.mbti_reveal, true);
});

test('emergeIdentity: legacy = named + legacy flag', () => {
  const id = emergeIdentity({ id: 'u1' }, { stage: 'legacy', pool: POOL });
  assert.ok(POOL.includes(id.name));
  assert.equal(id.legacy, true);
});

test('emergeIdentity: same creature id -> same name (stable identity)', () => {
  const a = emergeIdentity({ id: 'u7' }, { stage: 'juvenile', pool: POOL });
  const b = emergeIdentity({ id: 'u7' }, { stage: 'apex', pool: POOL });
  assert.equal(a.name, b.name); // name stays stable across stage advances
});

test('emergeIdentity: named stage with empty pool -> anonymous (no {anonymous:false, name:null})', () => {
  const id = emergeIdentity({ id: 'u1' }, { stage: 'apex', pool: [] });
  assert.equal(id.stage, 'apex');
  assert.equal(id.anonymous, true);
  assert.equal(id.name, null);
  assert.equal(id.mbti_reveal, false);
  // legacy stage: same fallback, no legacy flag on anonymous identity
  const leg = emergeIdentity({ id: 'u1' }, { stage: 'legacy', pool: [] });
  assert.equal(leg.anonymous, true);
  assert.equal('legacy' in leg, false);
});

test('emergeIdentity: unknown/missing stage -> anonymous', () => {
  assert.equal(emergeIdentity({ id: 'u1' }, { stage: 'whoknows', pool: POOL }).anonymous, true);
  assert.equal(emergeIdentity({ id: 'u1' }, { pool: POOL }).anonymous, true);
});

test('emitCreatureNamed: appends creature_named when a name emerged', () => {
  const baseDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ident-'));
  const identity = emergeIdentity({ id: 'u1' }, { stage: 'apex', pool: POOL });
  const out = emitCreatureNamed('run1', { actor_id: 'u1', identity }, { baseDir });
  assert.equal(out.ok, true);
  const chron = getChronicle('run1', { baseDir });
  assert.equal(chron.length, 1);
  assert.equal(chron[0].type, 'creature_named');
  assert.equal(chron[0].actor_id, 'u1');
  assert.equal(chron[0].payload.name, identity.name);
  assert.equal(chron[0].payload.mbti_reveal, true);
});

test('emitCreatureNamed: anonymous identity -> no-op (no event)', () => {
  const baseDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ident-'));
  const identity = emergeIdentity({ id: 'u1' }, { stage: 'hatchling', pool: POOL });
  const out = emitCreatureNamed('run1', { actor_id: 'u1', identity }, { baseDir });
  assert.equal(out.ok, false);
  assert.equal(getChronicle('run1', { baseDir }).length, 0);
});
