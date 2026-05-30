// tests/api/jobPerkCategoryAPerformAttack.test.js
//
// TKT-JOB-PHASEC Category A — verify the two expansion perks fire inside
// performAttack (the live combat resolver the /round/execute priority_queue
// path traverses via handleLegacyAttackViaRound/realResolveAction):
//   - random_double_dmg_chance (ABERRANT ab_r3_chaos_attack): payload.chance to x2.
//   - apex_first_strike (STALKER st_r6_apex_predator): first strike bypasses DR.
//
// Same seam as beastBondInPerformAttack.test.js — calls the exported performAttack
// from createSessionRouter's test handle with units that already carry
// _perk_passives (in production these are attached at /start by
// applyProgressionToUnits from the real ProgressionEngine; reachability of the
// two tags via genuine level-7 progression is independently confirmed).
//
// Determinism: createSessionRouter({ rng }) threads a constant rng so the hit +
// damage rolls are identical across runs; only the perk effect differs. For
// random_double_dmg_chance we use chance:1 so the perk always fires regardless
// of the exact rng value.

'use strict';

process.env.IDEA_ENGINE_DISABLE_STATUS_REFRESH = '1';

const test = require('node:test');
const assert = require('node:assert/strict');

const { createSessionRouter } = require('../../apps/backend/routes/session');

function makeSession(units) {
  return {
    session_id: 'phasec-a',
    units,
    turn: 1,
    active_unit: units[0].id,
    events: [],
    damage_taken: {},
    log: [],
    encounter: {},
  };
}

function attacker(perks) {
  return {
    id: 'atk',
    controlled_by: 'player',
    hp: 30,
    max_hp: 30,
    mod: 20, // high to-hit so every attack lands
    damage: 5,
    position: { x: 1, y: 1 },
    attack_range: 5,
    _perk_passives: perks || [],
  };
}

function enemy(extra) {
  // hp huge so it survives the hit (no kill short-circuit) and never clamps.
  return Object.assign(
    {
      id: 'foe',
      controlled_by: 'sistema',
      hp: 200,
      max_hp: 200,
      mod: 0,
      dc: 0,
      position: { x: 1, y: 2 },
    },
    extra || {},
  );
}

// Run one attack, return damage dealt (target hp delta).
function damageOf(perks, enemyExtra, firstStrikeUsed) {
  const router = createSessionRouter({ rng: () => 0.99 });
  const a = attacker(perks);
  if (firstStrikeUsed) a._first_strike_used = true;
  const e = enemy(enemyExtra);
  const session = makeSession([a, e]);
  const before = e.hp;
  router.performAttack(session, a, e, { channel: 'fisico' });
  return before - e.hp;
}

test('Category A: random_double_dmg_chance (chance:1) doubles damage in performAttack', () => {
  const base = damageOf([], {});
  const doubled = damageOf(
    [
      {
        tag: 'random_double_dmg_chance',
        payload: { chance: 1 },
        source_perk_id: 'ab_r3_chaos_attack',
      },
    ],
    {},
  );
  assert.ok(base > 0, `base damage should be > 0 (got ${base})`);
  assert.equal(doubled, base * 2, `expected ${base * 2}, got ${doubled}`);
});

test('Category A: random_double_dmg_chance (chance:0) never doubles', () => {
  const base = damageOf([], {});
  const noDouble = damageOf(
    [
      {
        tag: 'random_double_dmg_chance',
        payload: { chance: 0 },
        source_perk_id: 'ab_r3_chaos_attack',
      },
    ],
    {},
  );
  assert.equal(noDouble, base, `chance 0 must not change damage (base ${base}, got ${noDouble})`);
});

test('Category A: apex_first_strike bypasses target resistance on first strike', () => {
  // Pre-set _resistances (array) so performAttack uses these, not lazy archetype
  // compute: fisico -50% -> factor 0.5.
  const RES = [{ channel: 'fisico', modifier_pct: 50 }];
  const apex = damageOf(
    [
      {
        tag: 'apex_first_strike',
        payload: { ignore_dr: true },
        source_perk_id: 'st_r6_apex_predator',
      },
    ],
    { _resistances: RES },
  );
  const noApex = damageOf([], { _resistances: RES });
  assert.ok(apex > noApex, `apex (full ${apex}) > resisted (${noApex})`);
  assert.equal(
    noApex,
    Math.floor(apex * 0.5),
    `resisted = floor(full*0.5): full ${apex}, resisted ${noApex}`,
  );
});

test('Category A: apex_first_strike does NOT bypass when first strike already used', () => {
  const RES = [{ channel: 'fisico', modifier_pct: 50 }];
  const apexUsed = damageOf(
    [
      {
        tag: 'apex_first_strike',
        payload: { ignore_dr: true },
        source_perk_id: 'st_r6_apex_predator',
      },
    ],
    { _resistances: RES },
    /* firstStrikeUsed */ true,
  );
  const noApex = damageOf([], { _resistances: RES }, true);
  assert.equal(
    apexUsed,
    noApex,
    `not-first-strike apex = resisted damage (apex ${apexUsed}, base ${noApex})`,
  );
});
