// M13 P3 — progressionEngine unit tests.

'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');

const {
  ProgressionEngine,
  computeLevel,
  applyXp,
  pickPerk,
  computePendingLevelUps,
} = require('../../apps/backend/services/progression/progressionEngine');

test('computeLevel maps XP to correct level', () => {
  const curve = { level_xp_thresholds: { 1: 0, 2: 10, 3: 25, 4: 50 }, max_level: 4 };
  assert.equal(computeLevel(0, curve), 1);
  assert.equal(computeLevel(9, curve), 1);
  assert.equal(computeLevel(10, curve), 2);
  assert.equal(computeLevel(24, curve), 2);
  assert.equal(computeLevel(25, curve), 3);
  assert.equal(computeLevel(1000, curve), 4);
});

test('ProgressionEngine seed + applyXp chains into level up', () => {
  const engine = new ProgressionEngine();
  const unit = engine.seed('u1', 'skirmisher');
  assert.equal(unit.level, 1);
  assert.equal(unit.xp_total, 0);
  assert.deepEqual(unit.picked_perks, []);

  const r1 = engine.applyXp(unit, 10);
  assert.equal(r1.leveled_up, true);
  assert.equal(r1.unit.level, 2);
  assert.equal(r1.xp_after, 10);

  const r2 = engine.applyXp(r1.unit, 15);
  assert.equal(r2.leveled_up, true);
  assert.equal(r2.unit.level, 3);
});

test('applyXp caps at max_level', () => {
  const curve = {
    level_xp_thresholds: { 1: 0, 2: 10 },
    max_level: 2,
  };
  const r = applyXp({ xp_total: 0, level: 1 }, 9999, { curve });
  assert.equal(r.unit.level, 2);
  assert.equal(r.unit.xp_total, 9999);
});

test('pendingLevelUps lists unpicked levels only', () => {
  const engine = new ProgressionEngine();
  const unit = engine.seed('u1', 'skirmisher', { xpTotal: 50 });
  // Level 4 reached → pending level_2, 3, 4
  const pending = engine.pendingLevelUps(unit);
  assert.equal(pending.length, 3);
  assert.deepEqual(
    pending.map((p) => p.level),
    [2, 3, 4],
  );
  // Pick level 2
  const picked = engine.pickPerk(unit, 2, 'a');
  const pending2 = engine.pendingLevelUps(picked.unit);
  assert.equal(pending2.length, 2);
  assert.deepEqual(
    pending2.map((p) => p.level),
    [3, 4],
  );
});

test('pickPerk rejects invalid choice + duplicate + below-level', () => {
  const engine = new ProgressionEngine();
  const unit = engine.seed('u1', 'skirmisher', { xpTotal: 10 }); // level 2
  assert.throws(() => engine.pickPerk(unit, 2, 'x'), /invalid choice/);
  assert.throws(() => engine.pickPerk(unit, 3, 'a'), /unit level 2/);
  const picked = engine.pickPerk(unit, 2, 'a');
  assert.throws(() => engine.pickPerk(picked.unit, 2, 'b'), /already picked/);
});

test('pickPerk records id + choice + appends', () => {
  const engine = new ProgressionEngine();
  let unit = engine.seed('u1', 'skirmisher', { xpTotal: 25 }); // level 3
  const r1 = engine.pickPerk(unit, 2, 'a');
  assert.equal(r1.picked_perk.id, 'sk_r1_flank_specialist');
  assert.equal(r1.pick.level, 2);
  assert.equal(r1.pick.choice, 'a');
  const r2 = engine.pickPerk(r1.unit, 3, 'b');
  assert.equal(r2.picked_perk.id, 'sk_r2_opportunist');
  assert.equal(r2.unit.picked_perks.length, 2);
});

test('effectiveStats sums stat_bonus additively', () => {
  const engine = new ProgressionEngine();
  let unit = engine.seed('u1', 'skirmisher', { xpTotal: 50 }); // level 4
  // Level 3 perk_a: +1 AP, -1 HP
  const r1 = engine.pickPerk(unit, 3, 'a');
  const stats = engine.effectiveStats(r1.unit);
  assert.equal(stats.ap, 1);
  assert.equal(stats.hp_max, -1);
});

test('listPassives returns tag + payload + source', () => {
  const engine = new ProgressionEngine();
  const unit = engine.seed('u1', 'skirmisher', { xpTotal: 10 }); // level 2
  const picked = engine.pickPerk(unit, 2, 'a'); // flank_specialist
  const passives = engine.listPassives(picked.unit);
  assert.equal(passives.length, 1);
  assert.equal(passives[0].tag, 'flank_bonus');
  assert.equal(passives[0].payload.damage, 2);
  assert.equal(passives[0].source_perk_id, 'sk_r1_flank_specialist');
});

test('listAbilityMods returns delta per ability', () => {
  const engine = new ProgressionEngine();
  const unit = engine.seed('u1', 'skirmisher', { xpTotal: 10 });
  const picked = engine.pickPerk(unit, 2, 'b'); // run_and_gun: dash_strike move +1
  const mods = engine.listAbilityMods(picked.unit);
  assert.equal(mods.length, 1);
  assert.equal(mods[0].ability_id, 'dash_strike');
  assert.equal(mods[0].field, 'move_distance');
  assert.equal(mods[0].delta, 1);
});

test('getPerkPair returns a+b for each job×level', () => {
  const engine = new ProgressionEngine();
  const pair = engine.getPerkPair('warden', 5);
  assert.ok(pair);
  assert.ok(pair.perk_a);
  assert.ok(pair.perk_b);
  assert.notEqual(pair.perk_a.id, pair.perk_b.id);
  assert.equal(engine.getPerkPair('skirmisher', 99), null);
  assert.equal(engine.getPerkPair('nope_job', 2), null);
});

test('snapshot exposes jobs + thresholds', () => {
  const engine = new ProgressionEngine();
  const snap = engine.snapshot();
  assert.ok(snap.jobs.includes('skirmisher'));
  assert.ok(snap.jobs.includes('harvester'));
  assert.equal(snap.jobs.length, 7);
  assert.equal(snap.xp_max_level, 7);
  assert.equal(snap.xp_thresholds[2], 10);
});

test('all 7 jobs have perks for levels 2-7 (14 perks each, 98 total)', () => {
  const engine = new ProgressionEngine();
  let total = 0;
  for (const jobId of [
    'skirmisher',
    'vanguard',
    'warden',
    'artificer',
    'invoker',
    'ranger',
    'harvester',
  ]) {
    for (let l = 2; l <= 7; l += 1) {
      const pair = engine.getPerkPair(jobId, l);
      assert.ok(pair, `missing pair for ${jobId} level ${l}`);
      assert.ok(pair.perk_a.id, `missing perk_a.id for ${jobId} level ${l}`);
      assert.ok(pair.perk_b.id, `missing perk_b.id for ${jobId} level ${l}`);
      total += 2;
    }
  }
  assert.equal(total, 84); // 7 × 6 × 2
});

test('all perk ids are globally unique', () => {
  const engine = new ProgressionEngine();
  const ids = [];
  for (const job of Object.values(engine.perks.jobs)) {
    for (const lvl of Object.values(job.perks || {})) {
      if (lvl.perk_a?.id) ids.push(lvl.perk_a.id);
      if (lvl.perk_b?.id) ids.push(lvl.perk_b.id);
    }
  }
  const unique = new Set(ids);
  assert.equal(unique.size, ids.length, `duplicate perk ids: ${ids.length - unique.size}`);
});
