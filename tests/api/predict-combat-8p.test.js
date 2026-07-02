// TKT-11: predict_combat 8p aggregate sanity tests.
//
// Aggregate sanity scenarios per BACKLOG TKT-11:
//   - 8 players × 1 boss (HARDCORE_SCENARIO_06 shape)
//   - No NaN / Infinity in expected_damage / hit_pct / kill_probability
//   - Aggregate dmg vs boss HP makes sense
//   - Stack with elevation/evasion bonus from PR #1830 doesn't break aggregate
//   - Edge: boss with mod 0 vs 8p high accuracy → ~95-100% hit
//   - Edge: high DC vs low mod → ~5-25% hit
//   - Symmetry: boss→player vs player→boss (asymmetric stats)
//   - Reverse: 8 enemies vs 1 player tank
//
// predictCombat ritorna pure: { hit_pct, crit_pct, fumble_pct, avg_mos, avg_pt, dc, attack_mod, simulations }.
// Niente expected_damage / kill_probability nello shape — la prova "kill probability"
// la deriviamo aggregando avg_pt / hit_pct su 8 attaccanti vs HP boss.

process.env.IDEA_ENGINE_DISABLE_STATUS_REFRESH = '1';

const test = require('node:test');
const assert = require('node:assert/strict');
const { predictCombat } = require('../../apps/backend/routes/sessionHelpers');
const { HARDCORE_SCENARIO_06: _SCENARIO } = require('../../apps/backend/services/hardcoreScenario');

// hardcoreScenario.js non esporta buildHardcoreUnits06 in module.exports —
// rebuild scenario fixture inline per evitare coupling. Stat ricavate da:
// apps/backend/services/hardcoreScenario.js iter4 (2026-04-26).
function buildPlayers8p() {
  return [
    { id: 'p_scout_1', mod: 3, dc: 12, hp: 10 },
    { id: 'p_scout_2', mod: 3, dc: 12, hp: 10 },
    { id: 'p_scout_3', mod: 3, dc: 12, hp: 10 },
    { id: 'p_scout_4', mod: 3, dc: 12, hp: 10 },
    { id: 'p_tank_1', mod: 2, dc: 14, hp: 14 },
    { id: 'p_tank_2', mod: 2, dc: 14, hp: 14 },
    { id: 'p_support_1', mod: 3, dc: 13, hp: 11 },
    { id: 'p_support_2', mod: 3, dc: 13, hp: 11 },
  ];
}

function buildBoss() {
  // iter4: hp 40, mod 3, dc 14, guardia 4, elevation 1.
  return { id: 'e_apex_boss', mod: 3, dc: 14, hp: 40 };
}

// Helper: aggrega previsioni su N attaccanti vs 1 target.
// Non rappresenta una vera kill probability stocastica — è un proxy
// aggregato (sum di hit% × MoS-weighted base damage 1) usato come sanity check.
function aggregateAttackers(attackers, target) {
  const predictions = attackers.map((a) => predictCombat(a, target));
  const totalHitChance = predictions.reduce((s, p) => s + p.hit_pct / 100, 0);
  // Damage proxy: 1 base + avg_pt (PT spent ≈ extra dmg via spinta downstream).
  // Non è exact-runtime, ma scala con stat input — utile per sanity bands.
  const aggregateDamage = predictions.reduce((s, p) => s + (p.hit_pct / 100) * (1 + p.avg_pt), 0);
  return { predictions, totalHitChance, aggregateDamage };
}

// ─────────────────────────────────────────────────────────────────
// Scenario base: 8p vs boss
// ─────────────────────────────────────────────────────────────────

test('predictCombat 8p: no NaN / Infinity in any prediction field', () => {
  const players = buildPlayers8p();
  const boss = buildBoss();
  for (const player of players) {
    const pred = predictCombat(player, boss);
    for (const key of [
      'hit_pct',
      'crit_pct',
      'fumble_pct',
      'avg_mos',
      'avg_pt',
      'dc',
      'attack_mod',
    ]) {
      assert.ok(Number.isFinite(pred[key]), `${player.id}.${key} not finite: ${pred[key]}`);
      assert.ok(!Number.isNaN(pred[key]), `${player.id}.${key} is NaN`);
    }
  }
});

test('predictCombat 8p: hit% bands sane (mod 2-3 vs DC 14, expect 40-60%)', () => {
  const players = buildPlayers8p();
  const boss = buildBoss();
  for (const player of players) {
    const pred = predictCombat(player, boss);
    // mod 3 vs DC 14: roll ≥ 11 → 50%. mod 2 vs DC 14: roll ≥ 12 → 45%.
    assert.ok(pred.hit_pct >= 40, `${player.id} hit% too low: ${pred.hit_pct}`);
    assert.ok(pred.hit_pct <= 60, `${player.id} hit% too high: ${pred.hit_pct}`);
  }
});

test('predictCombat 8p aggregate: 8 attackers reduce boss HP 40 in finite turns', () => {
  const players = buildPlayers8p();
  const boss = buildBoss();
  const { aggregateDamage, totalHitChance } = aggregateAttackers(players, boss);
  // 8 × ~50% hit = ~4 expected hits/round. Aggregate damage proxy >= 4.
  assert.ok(totalHitChance >= 3.5, `8p aggregate hit chance too low: ${totalHitChance}`);
  assert.ok(totalHitChance <= 5.5, `8p aggregate hit chance too high: ${totalHitChance}`);
  assert.ok(aggregateDamage > 0, 'aggregate damage must be positive');
  // Sanity: 8 player non one-shot 40 HP boss in 1 round (proxy ≪ 40).
  assert.ok(
    aggregateDamage < 40,
    `8p one-round damage proxy ${aggregateDamage} should be < boss HP 40`,
  );
});

// ─────────────────────────────────────────────────────────────────
// Edge cases hit% bands
// ─────────────────────────────────────────────────────────────────

test('predictCombat 8p edge: boss mod 0 vs 8p high accuracy → ~95-100% hit', () => {
  // Squadra spec ops: mod 10 vs DC 10 → roll ≥ 0 → tutti tranne nat 1 (5% fumble).
  const sniper = { id: 'p_sniper', mod: 10 };
  const weakBoss = { dc: 10 };
  const pred = predictCombat(sniper, weakBoss);
  assert.ok(pred.hit_pct >= 95, `sniper hit% should be >=95: ${pred.hit_pct}`);
  assert.ok(pred.hit_pct <= 100, `sniper hit% should be <=100: ${pred.hit_pct}`);
});

test('predictCombat 8p edge: boss high DC vs 8p low mod → ~5-25% hit', () => {
  // Underdog: mod 0 vs DC 18 → roll ≥ 18 → 3/20 = 15%.
  const grunt = { id: 'p_grunt', mod: 0 };
  const tankyBoss = { dc: 18 };
  const pred = predictCombat(grunt, tankyBoss);
  assert.ok(pred.hit_pct >= 5, `grunt hit% should be >=5: ${pred.hit_pct}`);
  assert.ok(pred.hit_pct <= 25, `grunt hit% should be <=25: ${pred.hit_pct}`);
});

// ─────────────────────────────────────────────────────────────────
// Stack: evasion_bonus_bonus + defense_mod_bonus (PR #1830 ripple)
// ─────────────────────────────────────────────────────────────────

test('predictCombat 8p: evasion_bonus_bonus raises effective DC, lowers hit%', () => {
  const player = { id: 'p_scout_1', mod: 3 };
  const baseTarget = { dc: 14 };
  const evasiveTarget = { dc: 14, evasion_bonus_bonus: 3 };
  const baseP = predictCombat(player, baseTarget);
  const evasiveP = predictCombat(player, evasiveTarget);
  assert.equal(evasiveP.dc, 17, 'evasion_bonus_bonus should add to dc');
  assert.ok(evasiveP.hit_pct < baseP.hit_pct, 'evasion should lower hit%');
  assert.ok(Number.isFinite(evasiveP.hit_pct), 'no NaN with evasion stack');
});

test('predictCombat 8p: defense_mod_bonus + evasion_bonus_bonus stack additively on dc', () => {
  const player = { mod: 3 };
  const target = { dc: 14, defense_mod_bonus: 2, evasion_bonus_bonus: 1 };
  const pred = predictCombat(player, target);
  assert.equal(pred.dc, 17, 'dc must be 14+2+1=17');
  assert.ok(Number.isFinite(pred.hit_pct));
  // mod 3 vs DC 17: roll ≥ 14 → 7/20 = 35%.
  assert.equal(pred.hit_pct, 35);
});

test('predictCombat 8p: attack_mod_bonus raises actor effective mod', () => {
  const baseActor = { mod: 3 };
  const buffedActor = { mod: 3, attack_mod_bonus: 2 };
  const target = { dc: 14 };
  const baseP = predictCombat(baseActor, target);
  const buffedP = predictCombat(buffedActor, target);
  assert.equal(buffedP.attack_mod, 5, 'attack_mod = mod + attack_mod_bonus');
  assert.ok(buffedP.hit_pct > baseP.hit_pct, 'buff should raise hit%');
});

// ─────────────────────────────────────────────────────────────────
// Symmetry / asymmetry sanity
// ─────────────────────────────────────────────────────────────────

test('predictCombat 8p: asymmetric boss→player vs player→boss', () => {
  // boss attacca player tank, player tank attacca boss — stat asimmetriche.
  const boss = buildBoss(); // mod 3, dc 14
  const tank = { mod: 2, dc: 14 }; // p_tank_1 stats
  const bossAttacksTank = predictCombat(boss, tank); // mod 3 vs DC 14
  const tankAttacksBoss = predictCombat(tank, boss); // mod 2 vs DC 14
  assert.equal(bossAttacksTank.attack_mod, 3);
  assert.equal(tankAttacksBoss.attack_mod, 2);
  assert.equal(bossAttacksTank.dc, 14);
  assert.equal(tankAttacksBoss.dc, 14);
  // mod 3 vs DC 14: 50%. mod 2 vs DC 14: 45%. Asimmetria coerente.
  assert.ok(bossAttacksTank.hit_pct > tankAttacksBoss.hit_pct);
  assert.equal(bossAttacksTank.hit_pct, 50);
  assert.equal(tankAttacksBoss.hit_pct, 45);
});

// ─────────────────────────────────────────────────────────────────
// Reverse: 8 enemies vs 1 player tank
// ─────────────────────────────────────────────────────────────────

test('predictCombat 8p reverse: 8 enemies vs 1 tank — aggregate sane', () => {
  // Iter2 hardcore 06 enemies: 1 boss (mod 3) + 2 elite (mod 3) + 3 minion (mod 2).
  const enemies = [
    { id: 'e_apex_boss', mod: 3 },
    { id: 'e_elite_1', mod: 3 },
    { id: 'e_elite_2', mod: 3 },
    { id: 'e_minion_1', mod: 2 },
    { id: 'e_minion_2', mod: 2 },
    { id: 'e_minion_3', mod: 2 },
    { id: 'e_minion_4', mod: 2 },
    { id: 'e_minion_5', mod: 2 },
  ];
  const tank = { id: 'p_tank_1', dc: 14, hp: 14 };
  const { predictions, totalHitChance, aggregateDamage } = aggregateAttackers(enemies, tank);
  for (const pred of predictions) {
    assert.ok(Number.isFinite(pred.hit_pct));
    assert.ok(pred.hit_pct >= 0 && pred.hit_pct <= 100);
  }
  // 3 mod-3 (50%) + 5 mod-2 (45%) = 1.5 + 2.25 = 3.75 expected hits.
  assert.ok(totalHitChance >= 3.0, `reverse aggregate hit too low: ${totalHitChance}`);
  assert.ok(totalHitChance <= 4.5, `reverse aggregate hit too high: ${totalHitChance}`);
  // Tank hp 14 — proxy damage non > hp in 1 round (sanity).
  assert.ok(aggregateDamage > 0);
  assert.ok(
    aggregateDamage < 14,
    `8 enemies one-shotting tank in 1 round implausible: ${aggregateDamage}`,
  );
});

// ─────────────────────────────────────────────────────────────────
// Determinism: predictCombat è analytic enumeration over 20 d20 faces.
// Stesso input → stesso output (no rng).
// ─────────────────────────────────────────────────────────────────

test('predictCombat 8p: deterministic — same input → same output', () => {
  const player = { mod: 3 };
  const boss = buildBoss();
  const a = predictCombat(player, boss);
  const b = predictCombat(player, boss);
  assert.deepEqual(a, b, 'predictCombat must be deterministic across calls');
});
