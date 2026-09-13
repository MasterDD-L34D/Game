// tests/api/jobs.test.js — FRICTION #4 discoverability endpoint + expansion wire
//
// Verifica base (7 job canonici):
//   - GET /api/jobs → lista 11 job (7 base + 4 expansion stalker/symbiont/beastmaster/aberrant)
//   - GET /api/jobs/skirmisher → dettaglio con abilities [dash_strike, evasive_maneuver, blade_flurry]
//   - GET /api/jobs/nonexistent → 404
//   - GET /api/jobs/skirmisher expose cost_ap/cost_pi/cost_pp per ability
// Verifica expansion (sprint 2026-04-25):
//   - GET /api/jobs/{stalker,symbiont,beastmaster,aberrant} → 3 abilities + status='expansion'
//   - progressionLoader.loadPerks() merges jobs_expansion.yaml.perks

'use strict';

process.env.IDEA_ENGINE_DISABLE_STATUS_REFRESH = '1';

const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');

const { createApp } = require('../../apps/backend/app');

test('GET /api/jobs ritorna 11 job (7 base + 4 expansion) con signature_mechanic + ability_ids', async (t) => {
  const { app, close } = createApp({ databasePath: null });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });

  const res = await request(app).get('/api/jobs');
  assert.equal(res.status, 200);
  assert.ok(res.body.jobs, 'body.jobs presente');
  assert.equal(res.body.count, 11, 'expected 11 job in catalog (7 base + 4 expansion)');
  const ids = res.body.jobs.map((j) => j.id).sort();
  assert.deepEqual(ids, [
    'aberrant',
    'artificer',
    'beastmaster',
    'harvester',
    'invoker',
    'ranger',
    'skirmisher',
    'stalker',
    'symbiont',
    'vanguard',
    'warden',
  ]);
  const skirm = res.body.jobs.find((j) => j.id === 'skirmisher');
  assert.ok(skirm.signature_mechanic);
  assert.ok(skirm.signature_mechanic.toLowerCase().includes('hit-and-run'));
  // Sprint 8 r3/r4 progression: 5 abilities/job (2 r1 + 1 r2 + 1 r3 + 1 r4),
  // sorted by rank ascending in extractAbilities.
  assert.deepEqual(skirm.ability_ids, [
    'dash_strike',
    'evasive_maneuver',
    'blade_flurry',
    'phantom_step',
    'dervish_whirlwind',
  ]);
  // Expansion job sentinel: status='expansion' bubbled from YAML
  const expansionIds = res.body.jobs
    .filter((j) => j.status === 'expansion')
    .map((j) => j.id)
    .sort();
  assert.deepEqual(expansionIds, ['aberrant', 'beastmaster', 'stalker', 'symbiont']);
});

test('GET /api/jobs/skirmisher ritorna abilities con cost + effect_type', async (t) => {
  const { app, close } = createApp({ databasePath: null });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });

  const res = await request(app).get('/api/jobs/skirmisher');
  assert.equal(res.status, 200);
  assert.equal(res.body.id, 'skirmisher');
  assert.equal(res.body.role, 'damage');
  assert.ok(Array.isArray(res.body.abilities));
  assert.equal(res.body.abilities.length, 5, 'r3/r4 progression — 5 ability/job');
  const dash = res.body.abilities.find((a) => a.ability_id === 'dash_strike');
  assert.ok(dash, 'dash_strike presente');
  assert.equal(dash.cost_ap, 2);
  assert.equal(dash.cost_pi, 3);
  assert.equal(dash.effect_type, 'move_attack');
  assert.equal(dash.move_distance, 2);
  assert.equal(dash.rank, 1);
});

test('GET /api/jobs/vanguard abilities includono shield_bash + taunt + fortify + aegis + bulwark', async (t) => {
  const { app, close } = createApp({ databasePath: null });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });

  const res = await request(app).get('/api/jobs/vanguard');
  assert.equal(res.status, 200);
  const ids = res.body.abilities.map((a) => a.ability_id);
  assert.deepEqual(ids, ['shield_bash', 'taunt', 'fortify', 'aegis_stance', 'bulwark_aegis']);
  const fortify = res.body.abilities.find((a) => a.ability_id === 'fortify');
  assert.equal(fortify.rank, 2);
  assert.equal(fortify.cost_pt, 3);
  // Sprint 8 r3/r4 ladder check: cost_pi 14 (r3) + 22 (r4)
  const aegis = res.body.abilities.find((a) => a.ability_id === 'aegis_stance');
  assert.equal(aegis.rank, 3);
  assert.equal(aegis.cost_pi, 14);
  const bulwark = res.body.abilities.find((a) => a.ability_id === 'bulwark_aegis');
  assert.equal(bulwark.rank, 4);
  assert.equal(bulwark.cost_pi, 22);
});

test('GET /api/jobs/nonexistent → 404 con error message', async (t) => {
  const { app, close } = createApp({ databasePath: null });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });

  const res = await request(app).get('/api/jobs/nonexistent');
  assert.equal(res.status, 404);
  assert.ok(res.body.error);
  assert.ok(res.body.error.includes('nonexistent'));
});

// EXPANSION jobs (data/core/jobs_expansion.yaml — wave 2026-04-25 sprint).
// Loader merge additivo: 4 nuovi job + 48 perks (12/job).

test('GET /api/jobs/stalker (expansion) ritorna 5 abilities con effect_type validi (Sprint 8.1 r3/r4)', async (t) => {
  const { app, close } = createApp({ databasePath: null });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });

  const res = await request(app).get('/api/jobs/stalker');
  assert.equal(res.status, 200);
  assert.equal(res.body.id, 'stalker');
  assert.equal(res.body.status, 'expansion');
  assert.equal(res.body.role, 'damage');
  assert.equal(res.body.abilities.length, 5);
  const ids = res.body.abilities.map((a) => a.ability_id);
  assert.deepEqual(ids, [
    'alpha_strike',
    'silent_step',
    'deathmark',
    'shadow_mark',
    'shadow_assassinate',
  ]);
});

test('GET /api/jobs/symbiont (expansion) abilities + role support (Sprint 8.1 r3/r4)', async (t) => {
  const { app, close } = createApp({ databasePath: null });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });

  const res = await request(app).get('/api/jobs/symbiont');
  assert.equal(res.status, 200);
  assert.equal(res.body.status, 'expansion');
  assert.equal(res.body.role, 'support');
  const ids = res.body.abilities.map((a) => a.ability_id);
  assert.deepEqual(ids, [
    'symbiotic_bond',
    'shared_vitality',
    'synaptic_burst',
    'bond_amplify',
    'unity_surge',
  ]);
});

test('GET /api/jobs/beastmaster (expansion) abilities + role control (Sprint 8.1 r3/r4)', async (t) => {
  const { app, close } = createApp({ databasePath: null });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });

  const res = await request(app).get('/api/jobs/beastmaster');
  assert.equal(res.status, 200);
  assert.equal(res.body.status, 'expansion');
  assert.equal(res.body.role, 'control');
  const ids = res.body.abilities.map((a) => a.ability_id);
  assert.deepEqual(ids, [
    'summon_companion',
    'pack_command',
    'feral_sacrifice',
    'feral_dominion',
    'apex_pack',
  ]);
});

test('GET /api/jobs/aberrant (expansion) abilities + role damage (Sprint 8.1 r3/r4)', async (t) => {
  const { app, close } = createApp({ databasePath: null });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });

  const res = await request(app).get('/api/jobs/aberrant');
  assert.equal(res.status, 200);
  assert.equal(res.body.status, 'expansion');
  assert.equal(res.body.role, 'damage');
  const ids = res.body.abilities.map((a) => a.ability_id);
  assert.deepEqual(ids, [
    'mutation_burst',
    'phenotype_shift',
    'aberrant_overdrive',
    'stabilized_mutation',
    'perfect_mutation',
  ]);
});

test('progressionLoader.loadPerks() merges expansion perks (stalker level_2)', async () => {
  const {
    loadPerks,
    resetProgressionCache,
  } = require('../../apps/backend/services/progression/progressionLoader');
  resetProgressionCache();
  const perks = loadPerks();
  assert.ok(perks.jobs, 'perks.jobs presente');
  assert.ok(perks.jobs.stalker, 'stalker job perks merged');
  assert.ok(perks.jobs.stalker.perks, 'stalker.perks normalized');
  const lvl2 = perks.jobs.stalker.perks.level_2;
  assert.ok(lvl2, 'stalker level_2 entry');
  assert.ok(lvl2.perk_a && lvl2.perk_a.id, 'stalker level_2 perk_a.id');
  assert.ok(lvl2.perk_b && lvl2.perk_b.id, 'stalker level_2 perk_b.id');
  // Expansion perks coexist with base perks (skirmisher non rotto)
  assert.ok(perks.jobs.skirmisher, 'base skirmisher perks ancora presenti');
  assert.ok(perks.jobs.skirmisher.perks?.level_2?.perk_a?.id, 'skirmisher level_2 ancora intatto');
});

// Sprint 8 Ability r3/r4 tier progressive (AncientBeast Tier S #6 final closure).
// Schema integrity + cost ladder canonical + effect_type compat per i 14 nuovi
// ability sui 7 base job (2 nuove ability/job: r3 mid-tier + r4 capstone).

const SUPPORTED_EFFECT_TYPES = new Set([
  'move_attack',
  'attack_move',
  'buff',
  'heal',
  'multi_attack',
  'attack_push',
  'debuff',
  'ranged_attack',
  'drain_attack',
  'execution_attack',
  'shield',
  'team_buff',
  'team_heal',
  'aoe_buff',
  'aoe_debuff',
  'surge_aoe',
  'reaction',
  'aggro_pull',
]);

const BASE_JOB_IDS = [
  'skirmisher',
  'vanguard',
  'warden',
  'artificer',
  'invoker',
  'ranger',
  'harvester',
];

test('r3/r4 progression: tutti i 7 base job hanno 5 abilities con rank 1-1-2-3-4 sorted', async (t) => {
  const { app, close } = createApp({ databasePath: null });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });

  for (const jobId of BASE_JOB_IDS) {
    const res = await request(app).get(`/api/jobs/${jobId}`);
    assert.equal(res.status, 200, `${jobId} reachable`);
    assert.equal(res.body.abilities.length, 5, `${jobId} ha 5 abilities`);
    const ranks = res.body.abilities.map((a) => Number(a.rank));
    assert.deepEqual(ranks, [1, 1, 2, 3, 4], `${jobId} rank progression sorted asc`);
  }
});

test('r3/r4 cost ladder canonical: cost_pi 14 (r3) + 22 (r4) per tutti i base job', async (t) => {
  const { app, close } = createApp({ databasePath: null });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });

  for (const jobId of BASE_JOB_IDS) {
    const res = await request(app).get(`/api/jobs/${jobId}`);
    assert.equal(res.status, 200);
    const r3 = res.body.abilities.find((a) => Number(a.rank) === 3);
    const r4 = res.body.abilities.find((a) => Number(a.rank) === 4);
    assert.ok(r3, `${jobId} ha ability r3`);
    assert.ok(r4, `${jobId} ha ability r4`);
    assert.equal(r3.cost_pi, 14, `${jobId} r3 cost_pi=14`);
    assert.equal(r4.cost_pi, 22, `${jobId} r4 cost_pi=22`);
    assert.ok(
      SUPPORTED_EFFECT_TYPES.has(r3.effect_type),
      `${jobId} r3 effect_type supportato (${r3.effect_type})`,
    );
    assert.ok(
      SUPPORTED_EFFECT_TYPES.has(r4.effect_type),
      `${jobId} r4 effect_type supportato (${r4.effect_type})`,
    );
    // Capstone monotonic gate: r4 cost_ap >= r3 cost_ap (escalating commitment).
    assert.ok(
      Number(r4.cost_ap || 0) >= Number(r3.cost_ap || 0),
      `${jobId} r4 cost_ap (${r4.cost_ap}) monotonic >= r3 (${r3.cost_ap})`,
    );
  }
});

test('r3/r4 ability_id naming: lowercase snake_case + globally unique', async (t) => {
  const { app, close } = createApp({ databasePath: null });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });

  const seen = new Set();
  for (const jobId of BASE_JOB_IDS) {
    const res = await request(app).get(`/api/jobs/${jobId}`);
    for (const a of res.body.abilities) {
      assert.match(a.ability_id, /^[a-z][a-z0-9_]*$/, `${jobId}.${a.ability_id} naming snake_case`);
      assert.ok(!seen.has(a.ability_id), `${a.ability_id} unique across base jobs`);
      seen.add(a.ability_id);
    }
  }
});

test('r3/r4 specifiche key per effect_type: damage_step_mod / heal_dice / aoe_size presenti', async (t) => {
  const { app, close } = createApp({ databasePath: null });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });

  // skirmisher.phantom_step (move_attack r3) → damage_step_mod
  const skirm = await request(app).get('/api/jobs/skirmisher');
  const phantom = skirm.body.abilities.find((a) => a.ability_id === 'phantom_step');
  assert.equal(phantom.move_distance, 3);
  assert.equal(phantom.damage_step_mod, 1);
  assert.equal(phantom.effective_reach, 5, 'move_distance 3 + attack_range 2');

  // invoker.apocalypse_ray (surge_aoe r4) → damage_dice + aoe_size + cost_sg
  const invoker = await request(app).get('/api/jobs/invoker');
  const apocalypse = invoker.body.abilities.find((a) => a.ability_id === 'apocalypse_ray');
  assert.equal(apocalypse.aoe_size, 3);
  assert.equal(apocalypse.cost_sg, 100);
  assert.deepEqual(apocalypse.damage_dice, { count: 3, sides: 8, modifier: 5 });

  // harvester.lifegrove (team_heal r4) → heal_dice + remove_status
  const harv = await request(app).get('/api/jobs/harvester');
  const grove = harv.body.abilities.find((a) => a.ability_id === 'lifegrove');
  assert.deepEqual(grove.heal_dice, { count: 3, sides: 6, modifier: 0 });
  assert.equal(grove.remove_status, 'bleeding');

  // ranger.headshot (execution_attack r4) → execute_threshold + multiplier + conditional_status
  const ranger = await request(app).get('/api/jobs/ranger');
  const headshot = ranger.body.abilities.find((a) => a.ability_id === 'headshot');
  assert.equal(headshot.damage_step_mod, 5);
  assert.equal(headshot.execute_threshold_hp_pct, 0.5);
  assert.equal(headshot.execute_damage_multiplier, 2);
  assert.ok(headshot.conditional_status, 'conditional_status presente');
  assert.equal(headshot.conditional_status.status_id, 'stunned');

  // warden.void_collapse (aoe_debuff r4) → aoe_size + range
  const warden = await request(app).get('/api/jobs/warden');
  const collapse = warden.body.abilities.find((a) => a.ability_id === 'void_collapse');
  assert.equal(collapse.aoe_size, 4);
  assert.equal(collapse.range, 3);
  assert.equal(collapse.debuff_amount, -3);
});

test('jobs.yaml version bump 0.1.0 → 0.2.0 (Sprint 8 r3/r4)', async () => {
  const { loadJobs } = require('../../apps/backend/services/jobsLoader');
  const data = loadJobs();
  assert.equal(data.version, '0.2.0', 'version reflects Sprint 8 r3/r4 ladder');
});

// Sprint 8.1 (2026-05-05) — Expansion job r3/r4 gap-fill.
// Estende cost ladder canonical (r3=14 / r4=22) ai 4 expansion job
// (stalker / symbiont / beastmaster / aberrant). Stesso vincolo
// effect_type ∈ 18/18 supportati (zero nuovi runtime).

const EXPANSION_JOB_IDS = ['stalker', 'symbiont', 'beastmaster', 'aberrant'];

test('Sprint 8.1 r3/r4 progression: tutti i 4 expansion job hanno 5 abilities con rank 1-1-2-3-4 sorted', async (t) => {
  const { app, close } = createApp({ databasePath: null });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });

  for (const jobId of EXPANSION_JOB_IDS) {
    const res = await request(app).get(`/api/jobs/${jobId}`);
    assert.equal(res.status, 200, `${jobId} reachable`);
    assert.equal(res.body.abilities.length, 5, `${jobId} ha 5 abilities`);
    const ranks = res.body.abilities.map((a) => Number(a.rank));
    assert.deepEqual(ranks, [1, 1, 2, 3, 4], `${jobId} rank progression sorted asc`);
  }
});

test('Sprint 8.1 r3/r4 cost ladder canonical: cost_pi 14 (r3) + 22 (r4) per tutti i expansion job', async (t) => {
  const { app, close } = createApp({ databasePath: null });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });

  for (const jobId of EXPANSION_JOB_IDS) {
    const res = await request(app).get(`/api/jobs/${jobId}`);
    assert.equal(res.status, 200);
    const r3 = res.body.abilities.find((a) => Number(a.rank) === 3);
    const r4 = res.body.abilities.find((a) => Number(a.rank) === 4);
    assert.ok(r3, `${jobId} ha ability r3`);
    assert.ok(r4, `${jobId} ha ability r4`);
    assert.equal(r3.cost_pi, 14, `${jobId} r3 cost_pi=14`);
    assert.equal(r4.cost_pi, 22, `${jobId} r4 cost_pi=22`);
    assert.ok(
      SUPPORTED_EFFECT_TYPES.has(r3.effect_type),
      `${jobId} r3 effect_type supportato (${r3.effect_type})`,
    );
    assert.ok(
      SUPPORTED_EFFECT_TYPES.has(r4.effect_type),
      `${jobId} r4 effect_type supportato (${r4.effect_type})`,
    );
    // Capstone monotonic gate: r4 cost_ap >= r3 cost_ap.
    assert.ok(
      Number(r4.cost_ap || 0) >= Number(r3.cost_ap || 0),
      `${jobId} r4 cost_ap (${r4.cost_ap}) monotonic >= r3 (${r3.cost_ap})`,
    );
  }
});

test('Sprint 8.1 r3/r4 expansion ability_id naming: lowercase snake_case + globally unique (no collision base)', async (t) => {
  const { app, close } = createApp({ databasePath: null });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });

  // Collect all base abilities IDs first
  const baseIds = new Set();
  for (const jobId of BASE_JOB_IDS) {
    const res = await request(app).get(`/api/jobs/${jobId}`);
    for (const a of res.body.abilities) {
      baseIds.add(a.ability_id);
    }
  }
  // Expansion abilities must not collide with base.
  const seen = new Set();
  for (const jobId of EXPANSION_JOB_IDS) {
    const res = await request(app).get(`/api/jobs/${jobId}`);
    for (const a of res.body.abilities) {
      assert.match(a.ability_id, /^[a-z][a-z0-9_]*$/, `${jobId}.${a.ability_id} naming snake_case`);
      assert.ok(
        !baseIds.has(a.ability_id),
        `${a.ability_id} in expansion ${jobId} collide con base job`,
      );
      assert.ok(!seen.has(a.ability_id), `${a.ability_id} unique across expansion jobs`);
      seen.add(a.ability_id);
    }
  }
});

test('Sprint 8.1 jobs_expansion.yaml version bump 0.2.0 → 0.3.0 (r3/r4 gap-fill)', async () => {
  const path = require('node:path');
  const fs = require('node:fs');
  const yaml = require('js-yaml');
  const file = path.join(process.cwd(), 'data', 'core', 'jobs_expansion.yaml');
  const data = yaml.load(fs.readFileSync(file, 'utf8'));
  assert.equal(data.version, '0.3.0', 'expansion version reflects Sprint 8.1 r3/r4 ladder');
});
