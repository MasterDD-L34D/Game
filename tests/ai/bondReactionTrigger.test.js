// Beast Bond reaction trigger tests — Sprint 7 (AncientBeast Tier S #6 residuo).
//
// Scope: bondReactionTrigger.js — passive species-pair reactions post damage.
// Covers loader, evaluateBondTrigger eligibility gates, fireCounterAttack +
// fireShieldAlly side effects, cooldown, cap 1/round, no-op silent on missing
// data.

'use strict';

process.env.IDEA_ENGINE_DISABLE_STATUS_REFRESH = '1';

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const bondReactionTrigger = require('../../apps/backend/services/combat/bondReactionTrigger');
const {
  loadCreatureBonds,
  evaluateBondTrigger,
  triggerBondReaction,
  findBondsForPair,
  isOnCooldown,
  setCooldown,
  _resetCache,
} = bondReactionTrigger;

// ─────────────────────────────────────────────────────────────────
// Fixture builders
// ─────────────────────────────────────────────────────────────────

function makeUnit(overrides = {}) {
  return {
    id: 'u1',
    controlled_by: 'player',
    species_id: 'dune_stalker',
    position: { x: 0, y: 0 },
    hp: 10,
    max_hp: 10,
    attack_range: 2,
    status: {},
    ...overrides,
  };
}

function makeSession(units = [], overrides = {}) {
  return {
    session_id: 'sess_test',
    turn: 1,
    units,
    damage_taken: {},
    ...overrides,
  };
}

const COUNTER_BOND = {
  bond_id: 'pack_alpha',
  species_pair: ['dune_stalker', 'dune_stalker'],
  reaction_type: 'counter_attack',
  trigger_range: 1,
  cooldown_turns: 2,
};

const SHIELD_BOND = {
  bond_id: 'hive_link',
  species_pair: ['drone', 'queen'],
  reaction_type: 'shield_ally',
  trigger_range: 2,
  cooldown_turns: 3,
};

const CROSS_BOND = {
  bond_id: 'hunt_alliance',
  species_pair: ['dune_stalker', 'anguis_magnetica'],
  reaction_type: 'counter_attack',
  trigger_range: 1,
  cooldown_turns: 3,
};

// ─────────────────────────────────────────────────────────────────
// loadCreatureBonds
// ─────────────────────────────────────────────────────────────────

test('loadCreatureBonds parses canonical YAML', () => {
  _resetCache();
  const real = path.join(process.cwd(), 'data', 'core', 'companion', 'creature_bonds.yaml');
  const data = loadCreatureBonds(real);
  assert.ok(data, 'data not null');
  assert.equal(typeof data.version, 'number');
  assert.ok(Array.isArray(data.bonds));
  assert.ok(data.bonds.length >= 4, 'at least 4 canonical bonds');
  for (const b of data.bonds) {
    assert.ok(b.bond_id, 'bond_id present');
    assert.ok(Array.isArray(b.species_pair) && b.species_pair.length === 2);
    assert.ok(['counter_attack', 'shield_ally'].includes(b.reaction_type));
  }
});

test('loadCreatureBonds soft-fails to empty bonds[] on missing file', () => {
  _resetCache();
  const data = loadCreatureBonds('/path/that/definitely/does/not/exist.yaml');
  assert.deepEqual(data, { version: 0, bonds: [] });
});

// ─────────────────────────────────────────────────────────────────
// findBondsForPair
// ─────────────────────────────────────────────────────────────────

test('findBondsForPair matches order-insensitive', () => {
  const bonds = [COUNTER_BOND, CROSS_BOND, SHIELD_BOND];
  const m1 = findBondsForPair(bonds, 'dune_stalker', 'anguis_magnetica');
  const m2 = findBondsForPair(bonds, 'anguis_magnetica', 'dune_stalker');
  assert.equal(m1.length, 1);
  assert.equal(m2.length, 1);
  assert.equal(m1[0].bond_id, 'hunt_alliance');
});

test('findBondsForPair matches twin pack (identical species)', () => {
  const bonds = [COUNTER_BOND];
  const m = findBondsForPair(bonds, 'dune_stalker', 'dune_stalker');
  assert.equal(m.length, 1);
  assert.equal(m[0].bond_id, 'pack_alpha');
});

test('findBondsForPair returns empty when no match', () => {
  const bonds = [COUNTER_BOND];
  assert.deepEqual(findBondsForPair(bonds, 'foo', 'bar'), []);
  assert.deepEqual(findBondsForPair([], 'a', 'b'), []);
  assert.deepEqual(findBondsForPair(bonds, null, 'a'), []);
});

// ─────────────────────────────────────────────────────────────────
// cooldown helpers
// ─────────────────────────────────────────────────────────────────

test('setCooldown + isOnCooldown gate refire', () => {
  const actor = makeUnit();
  assert.equal(isOnCooldown(actor, COUNTER_BOND, 1), false);
  setCooldown(actor, COUNTER_BOND, 1);
  // bond cooldown 2 → expiry = 1 + 2 = 3
  assert.equal(isOnCooldown(actor, COUNTER_BOND, 1), true);
  assert.equal(isOnCooldown(actor, COUNTER_BOND, 2), true);
  assert.equal(
    isOnCooldown(actor, COUNTER_BOND, 3),
    false,
    'cooldown expires at currentTurn === expiry',
  );
});

// ─────────────────────────────────────────────────────────────────
// evaluateBondTrigger eligibility gates
// ─────────────────────────────────────────────────────────────────

test('evaluateBondTrigger fires when bonded ally adjacent + alive + same team', () => {
  const target = makeUnit({ id: 't', species_id: 'dune_stalker', position: { x: 5, y: 5 } });
  const ally = makeUnit({ id: 'a', species_id: 'dune_stalker', position: { x: 5, y: 6 } });
  const session = makeSession([target, ally]);
  const evaluated = evaluateBondTrigger(session, null, target, 4, [COUNTER_BOND]);
  assert.ok(evaluated);
  assert.equal(evaluated.ally.id, 'a');
  assert.equal(evaluated.bond.bond_id, 'pack_alpha');
});

test('evaluateBondTrigger skips when KO target / 0 damage / null inputs', () => {
  const target = makeUnit({ id: 't', hp: 0 });
  const session = makeSession([target]);
  assert.equal(evaluateBondTrigger(session, null, target, 4, [COUNTER_BOND]), null, 'KO target');
  assert.equal(
    evaluateBondTrigger(session, null, makeUnit(), 0, [COUNTER_BOND]),
    null,
    'zero damage',
  );
  assert.equal(evaluateBondTrigger(null, null, makeUnit(), 4, [COUNTER_BOND]), null);
  assert.equal(evaluateBondTrigger(session, null, null, 4, [COUNTER_BOND]), null);
  assert.equal(evaluateBondTrigger(session, null, makeUnit(), 4, []), null, 'empty bonds');
});

test('evaluateBondTrigger skips stunned ally + opposing team + out-of-range', () => {
  const target = makeUnit({ id: 't', species_id: 'dune_stalker', position: { x: 5, y: 5 } });
  const stunned = makeUnit({
    id: 'stun',
    species_id: 'dune_stalker',
    position: { x: 5, y: 6 },
    status: { stunned: 1 },
  });
  const enemyAdjacent = makeUnit({
    id: 'foe',
    species_id: 'dune_stalker',
    controlled_by: 'sistema',
    position: { x: 5, y: 4 },
  });
  const farAlly = makeUnit({
    id: 'far',
    species_id: 'dune_stalker',
    position: { x: 9, y: 9 },
  });
  const session = makeSession([target, stunned, enemyAdjacent, farAlly]);
  assert.equal(
    evaluateBondTrigger(session, null, target, 4, [COUNTER_BOND]),
    null,
    'stunned + cross-team + far filtered → no eligible ally',
  );
});

test('evaluateBondTrigger respects cap 1/round (ally._bond_round_used)', () => {
  const target = makeUnit({ id: 't', species_id: 'dune_stalker', position: { x: 5, y: 5 } });
  const ally = makeUnit({
    id: 'a',
    species_id: 'dune_stalker',
    position: { x: 5, y: 6 },
    _bond_round_used: 1,
  });
  const session = makeSession([target, ally], { turn: 1 });
  assert.equal(evaluateBondTrigger(session, null, target, 4, [COUNTER_BOND]), null);
});

test('evaluateBondTrigger respects bond cooldown', () => {
  const target = makeUnit({ id: 't', species_id: 'dune_stalker', position: { x: 5, y: 5 } });
  const ally = makeUnit({
    id: 'a',
    species_id: 'dune_stalker',
    position: { x: 5, y: 6 },
    _bond_cooldown: { pack_alpha: 5 },
  });
  const session = makeSession([target, ally], { turn: 3 });
  assert.equal(
    evaluateBondTrigger(session, null, target, 4, [COUNTER_BOND]),
    null,
    'cooldown expiry=5 > turn=3',
  );
});

// ─────────────────────────────────────────────────────────────────
// triggerBondReaction — counter_attack
// ─────────────────────────────────────────────────────────────────

test('triggerBondReaction counter_attack fires + applies -1 damage_step', () => {
  const target = makeUnit({ id: 't', species_id: 'dune_stalker', position: { x: 5, y: 5 } });
  const ally = makeUnit({
    id: 'a',
    species_id: 'dune_stalker',
    position: { x: 5, y: 6 },
    attack_range: 3,
  });
  const attacker = makeUnit({
    id: 'foe',
    species_id: 'goblin',
    controlled_by: 'sistema',
    position: { x: 4, y: 5 },
    hp: 8,
    max_hp: 8,
  });
  const session = makeSession([target, ally, attacker]);

  // Mirror reactionEngine.triggerOnMove contract: callback applies damage
  // pre-return; engine then refunds via damage_step_mod=-1.
  const performAttack = (a, t) => {
    t.hp = Math.max(0, t.hp - 4);
    return { result: { hit: true, mos: 3, die: 14, roll: 14 }, damageDealt: 4 };
  };
  const res = triggerBondReaction(session, attacker, target, 3, {
    bonds: [COUNTER_BOND],
    performAttack,
  });
  assert.ok(res, 'reaction fired');
  assert.equal(res.type, 'counter_attack');
  assert.equal(res.bond_id, 'pack_alpha');
  assert.equal(res.ally_id, 'a');
  assert.equal(res.damage_step_mod, -1);
  assert.equal(res.damage_dealt, 3, '4 base − 1 step_mod');
  assert.equal(attacker.hp, 5, 'attacker took 3 dmg (8 − 4 + 1 refund = 5)');
  assert.equal(ally._bond_round_used, session.turn, 'cap 1/round marker set');
  assert.equal(ally._bond_cooldown.pack_alpha, session.turn + 2, 'cooldown set');
});

test('triggerBondReaction counter_attack skipped when ally out of attack_range to attacker', () => {
  const target = makeUnit({ id: 't', species_id: 'dune_stalker', position: { x: 5, y: 5 } });
  const ally = makeUnit({
    id: 'a',
    species_id: 'dune_stalker',
    position: { x: 5, y: 6 },
    attack_range: 1,
  });
  const attacker = makeUnit({
    id: 'foe',
    species_id: 'goblin',
    controlled_by: 'sistema',
    position: { x: 0, y: 0 }, // distance 11 from ally → out of range
  });
  const session = makeSession([target, ally, attacker]);
  const performAttack = () => ({ result: { hit: true }, damageDealt: 3 });
  const res = triggerBondReaction(session, attacker, target, 3, {
    bonds: [COUNTER_BOND],
    performAttack,
  });
  assert.equal(res, null, 'counter not fired when attacker out of range');
  assert.equal(ally._bond_round_used, undefined, 'cap not consumed on miss-fire');
});

test('triggerBondReaction counter_attack -1 step_mod refund prevents 1-shot kill', () => {
  // Design intent: damage_step_mod=-1 = pulled punch. Even if callback
  // damage takes attacker to 0, the +1 refund brings them back to 1.
  // Attacker can only be killed by a follow-up regular attack.
  const target = makeUnit({ id: 't', species_id: 'dune_stalker', position: { x: 5, y: 5 } });
  const ally = makeUnit({
    id: 'a',
    species_id: 'dune_stalker',
    position: { x: 5, y: 6 },
    attack_range: 3,
  });
  const attacker = makeUnit({
    id: 'foe',
    species_id: 'goblin',
    controlled_by: 'sistema',
    position: { x: 4, y: 5 },
    hp: 2,
    max_hp: 8,
  });
  const session = makeSession([target, ally, attacker]);
  const performAttack = (a, t) => {
    t.hp = Math.max(0, t.hp - 5);
    return { result: { hit: true, mos: 4 }, damageDealt: 5 };
  };
  const res = triggerBondReaction(session, attacker, target, 3, {
    bonds: [COUNTER_BOND],
    performAttack,
  });
  assert.ok(res);
  assert.equal(res.attacker_killed, false, 'refund brings attacker back from 0 → 1');
  assert.equal(attacker.hp, 1, 'pulled-punch floor');
  assert.equal(res.damage_dealt, 4, 'callback 5 − 1 step_mod = 4');
});

// ─────────────────────────────────────────────────────────────────
// triggerBondReaction — shield_ally
// ─────────────────────────────────────────────────────────────────

test('triggerBondReaction shield_ally absorbs floor(damage/2) and restores target', () => {
  const target = makeUnit({
    id: 'queen',
    species_id: 'queen',
    position: { x: 5, y: 5 },
    hp: 4,
    max_hp: 10,
  });
  const ally = makeUnit({
    id: 'drone',
    species_id: 'drone',
    position: { x: 5, y: 7 }, // distance 2 → within trigger_range 2
    hp: 6,
    max_hp: 6,
  });
  const session = makeSession([target, ally], { turn: 2 });
  session.damage_taken = { queen: 6 };
  const res = triggerBondReaction(session, null, target, 6, {
    bonds: [SHIELD_BOND],
  });
  assert.ok(res);
  assert.equal(res.type, 'shield_ally');
  assert.equal(res.bond_id, 'hive_link');
  assert.equal(res.damage_absorbed, 3, 'floor(6/2)');
  assert.equal(target.hp, 7, 'target restored 4 + 3');
  assert.equal(ally.hp, 3, 'drone took 3');
  assert.equal(session.damage_taken.queen, 3, 'target damage_taken decremented');
  assert.equal(session.damage_taken.drone, 3, 'ally damage_taken incremented');
  assert.equal(ally._bond_round_used, 2);
  assert.equal(ally._bond_cooldown.hive_link, 5);
});

test('triggerBondReaction shield_ally no-op when transfer floors to 0', () => {
  const target = makeUnit({ id: 'q', species_id: 'queen', position: { x: 5, y: 5 } });
  const ally = makeUnit({
    id: 'd',
    species_id: 'drone',
    position: { x: 5, y: 6 },
  });
  const session = makeSession([target, ally]);
  const res = triggerBondReaction(session, null, target, 1, {
    bonds: [SHIELD_BOND],
  });
  assert.equal(res, null, 'damage 1 → floor(0.5)=0 → no-op');
  assert.equal(ally._bond_round_used, undefined, 'cap not consumed');
});

test('triggerBondReaction shield_ally detects ally_killed', () => {
  const target = makeUnit({
    id: 'queen',
    species_id: 'queen',
    position: { x: 5, y: 5 },
    hp: 2,
    max_hp: 10,
  });
  const ally = makeUnit({
    id: 'drone',
    species_id: 'drone',
    position: { x: 5, y: 6 },
    hp: 2,
    max_hp: 6,
  });
  const session = makeSession([target, ally]);
  const res = triggerBondReaction(session, null, target, 6, {
    bonds: [SHIELD_BOND],
  });
  assert.ok(res);
  assert.equal(res.damage_absorbed, 3);
  assert.equal(ally.hp, 0);
  assert.equal(res.ally_killed, true);
});

// ─────────────────────────────────────────────────────────────────
// triggerBondReaction — back-compat / no-op
// ─────────────────────────────────────────────────────────────────

test('triggerBondReaction returns null when bonds list empty', () => {
  const target = makeUnit({ id: 't', species_id: 'dune_stalker', position: { x: 5, y: 5 } });
  const ally = makeUnit({ id: 'a', species_id: 'dune_stalker', position: { x: 5, y: 6 } });
  const session = makeSession([target, ally]);
  assert.equal(triggerBondReaction(session, null, target, 4, { bonds: [] }), null);
});

test('triggerBondReaction returns null when no bonded ally available', () => {
  const target = makeUnit({ id: 't', species_id: 'dune_stalker', position: { x: 5, y: 5 } });
  const ally = makeUnit({ id: 'a', species_id: 'unrelated_species', position: { x: 5, y: 6 } });
  const session = makeSession([target, ally]);
  const performAttack = () => ({ result: { hit: true }, damageDealt: 3 });
  assert.equal(
    triggerBondReaction(session, null, target, 4, { bonds: [COUNTER_BOND], performAttack }),
    null,
  );
});

// ─────────────────────────────────────────────────────────────────
// Gate 5 surface: structured stdout emit (TKT-BOND-HUD-SURFACE)
// ─────────────────────────────────────────────────────────────────

test('triggerBondReaction emits structured component=bond-reaction stdout on shield_ally fire', () => {
  // Test pattern: override process.env to enable log + monkeypatch console.info
  // to capture emit. Restore both after.
  const target = makeUnit({ id: 't', species_id: 'queen', position: { x: 0, y: 0 }, hp: 8 });
  const ally = makeUnit({
    id: 'a',
    species_id: 'drone',
    position: { x: 1, y: 0 },
    hp: 10,
    max_hp: 10,
  });
  const session = makeSession([target, ally], { turn: 3, damage_taken: { t: 0, a: 0 } });

  const captured = [];
  const origInfo = console.info;
  const origNodeEnv = process.env.NODE_ENV;
  const origDisable = process.env.IDEA_ENGINE_DISABLE_BOND_LOG;
  // eslint-disable-next-line no-console
  console.info = (msg) => {
    captured.push(msg);
  };
  delete process.env.NODE_ENV;
  delete process.env.IDEA_ENGINE_DISABLE_BOND_LOG;
  try {
    const res = triggerBondReaction(session, null, target, 6, { bonds: [SHIELD_BOND] });
    assert.ok(res, 'reaction fired');
    assert.equal(captured.length, 1, 'one structured emit on fire');
    const parsed = JSON.parse(captured[0]);
    assert.equal(parsed.component, 'bond-reaction');
    assert.equal(parsed.event, 'bond_fired');
    assert.equal(parsed.bond_id, 'hive_link');
    assert.equal(parsed.bond_type, 'shield_ally');
    assert.equal(parsed.ally_id, 'a');
    assert.equal(parsed.target_id, 't');
    assert.equal(parsed.turn, 3);
    assert.equal(parsed.damage_absorbed, 3, 'floor(6/2)');
  } finally {
    // eslint-disable-next-line no-console
    console.info = origInfo;
    if (origNodeEnv !== undefined) process.env.NODE_ENV = origNodeEnv;
    if (origDisable !== undefined) process.env.IDEA_ENGINE_DISABLE_BOND_LOG = origDisable;
  }
});

test('triggerBondReaction structured emit is suppressed by IDEA_ENGINE_DISABLE_BOND_LOG', () => {
  const target = makeUnit({ id: 't', species_id: 'queen', position: { x: 0, y: 0 }, hp: 8 });
  const ally = makeUnit({
    id: 'a',
    species_id: 'drone',
    position: { x: 1, y: 0 },
    hp: 10,
    max_hp: 10,
  });
  const session = makeSession([target, ally], { turn: 1, damage_taken: { t: 0, a: 0 } });

  const captured = [];
  const origInfo = console.info;
  const origDisable = process.env.IDEA_ENGINE_DISABLE_BOND_LOG;
  // eslint-disable-next-line no-console
  console.info = (msg) => {
    captured.push(msg);
  };
  process.env.IDEA_ENGINE_DISABLE_BOND_LOG = '1';
  try {
    const res = triggerBondReaction(session, null, target, 6, { bonds: [SHIELD_BOND] });
    assert.ok(res, 'reaction still fires (log opt-out is surface-only)');
    assert.equal(captured.length, 0, 'no emit when disabled');
  } finally {
    // eslint-disable-next-line no-console
    console.info = origInfo;
    if (origDisable === undefined) {
      delete process.env.IDEA_ENGINE_DISABLE_BOND_LOG;
    } else {
      process.env.IDEA_ENGINE_DISABLE_BOND_LOG = origDisable;
    }
  }
});
