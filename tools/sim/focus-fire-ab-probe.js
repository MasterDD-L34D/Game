'use strict';
// W5 inc-1 focus-fire A/B probe -- paired-seed OFF vs ON on a hardcore badlands encounter.
//
// Purpose: prove the utility-AI focus-fire upgrade (combat-policy.js selectPlayerAction,
// opts.focusFire) moves a tactically-weak AI OFF the saturation-low floor (Gap A) so team-power
// deltas become measurable, WITHOUT saturating high. Reports win-rate, creature-KO-rate, and the
// new graded metrics (hp_remaining_pct, units_lost) for each arm + the paired delta.
//
// In-process (supertest createApp, NO prod backend, node 22). Same seed feeds both arms so the
// ONLY between-arm difference is the player policy. Sim is NOT bit-repro cross node-version ->
// read bands as ranges (~+-0.05 variance). This is a DIRECTION probe at N<=20, a PROVISIONAL
// band at N=40; owner ratifies exact numbers (SDMG).
//
// Roster/enemies mirror ultima-caccia-band-probe.js (canonical badlands party + wave-1 hardcore
// roster, AI-sim tier table). Usage: node tools/sim/focus-fire-ab-probe.js [N]   (default 40)

const request = require('supertest');
const { createApp } = require('../../apps/backend/app');
const { runEncounter } = require('./combat-adapter');

process.env.IDEA_ENGINE_DISABLE_STATUS_REFRESH = '1';
process.env.IDEA_ENGINE_STUB_ORCHESTRATOR = '1';

function supertestHttp(app) {
  return {
    post: (p, body) =>
      request(app)
        .post(p)
        .send(body)
        .then((r) => ({ status: r.status, body: r.body })),
    get: (p, query) =>
      request(app)
        .get(p)
        .query(query || {})
        .then((r) => ({ status: r.status, body: r.body })),
  };
}

const TIER_HP = { base: 7, elite: 10, apex: 14 };
const TIER_MOD = { base: 1, elite: 2, apex: 4 };

// Wave 1 of enc_badlands_ultima_caccia_01 (apex + 2 elite + 2 base), AI-sim tier table.
function enemies() {
  return [
    ['dune-stalker', 'apex', { x: 5, y: 5 }, 'flanking'],
    ['echo-wing', 'elite', { x: 5, y: 4 }, 'aggressive'],
    ['echo-wing', 'elite', { x: 5, y: 6 }, 'aggressive'],
    ['rust-scavenger', 'base', { x: 6, y: 4 }, 'aggressive'],
    ['rust-scavenger', 'base', { x: 6, y: 6 }, 'aggressive'],
  ].map(([species, tier, position, aiProfile], i) => ({
    id: `sis_${i + 1}`,
    species,
    species_id: species,
    hp: TIER_HP[tier],
    max_hp: TIER_HP[tier],
    ap: 2,
    ap_max: 2,
    mod: TIER_MOD[tier],
    dc: tier === 'apex' ? 14 : tier === 'elite' ? 12 : 11,
    attack_range: 1,
    damage: { min: 1, max: 3 },
    initiative: tier === 'apex' ? 14 : 10,
    position,
    ai_profile: aiProfile,
    controlled_by: 'sistema',
    status: {},
  }));
}

// Synthetic elimination cluster: 4 players vs 5 enemies packed within attack range with
// STAGGERED HP, no objective (alive-count). This isolates the focus-fire mechanism -- with
// several enemies simultaneously in range, concentrating damage on the lowest-HP target kills
// foes sooner, removing their future damage. NOT a calibration band; a mechanism sanity check.
function syntheticRoster() {
  return [
    ['sp1', { x: 2, y: 2 }],
    ['sp2', { x: 2, y: 3 }],
    ['sp3', { x: 3, y: 2 }],
    ['sp4', { x: 3, y: 3 }],
  ].map(([id, position]) => ({
    id,
    species: 'velox',
    hp: 14,
    max_hp: 14,
    ap: 2,
    ap_max: 2,
    mod: 14,
    attack_range: 3,
    initiative: 15,
    position,
    damage: { min: 1, max: 3 },
    controlled_by: 'player',
    status: {},
  }));
}
function syntheticEnemies() {
  return [
    ['se1', { x: 4, y: 2 }, 4],
    ['se2', { x: 4, y: 3 }, 7],
    ['se3', { x: 5, y: 2 }, 10],
    ['se4', { x: 5, y: 3 }, 13],
    ['se5', { x: 5, y: 4 }, 16],
  ].map(([id, position, hp]) => ({
    id,
    species: 'velox',
    hp,
    max_hp: hp,
    ap: 2,
    ap_max: 2,
    mod: 6,
    dc: 11,
    attack_range: 1,
    damage: { min: 1, max: 3 },
    initiative: 8,
    position,
    ai_profile: 'aggressive',
    controlled_by: 'sistema',
    status: {},
  }));
}

const CANON_PARTY_SCENARIO = 'enc_badlands_pilot_01';
let _party = null;
async function fetchCanonicalParty() {
  if (_party) return _party;
  const { app, close } = createApp({ databasePath: null });
  try {
    const r = await request(app).get(`/api/tutorial/${CANON_PARTY_SCENARIO}`);
    if (r.status !== 200) throw new Error(`canon party fetch ${r.status}`);
    _party = (r.body.units || []).filter((u) => u.controlled_by === 'player');
    if (!_party.length) throw new Error('canon party empty');
    return _party;
  } finally {
    if (typeof close === 'function') await close().catch(() => {});
  }
}

function roster(party) {
  return party.map((u) => ({ ...u, hp: u.max_hp ?? u.hp, status: {} }));
}

async function runOne(party, seed, focusFire, mode) {
  const { app, close } = createApp({ databasePath: null });
  try {
    const http = supertestHttp(app);
    const synthetic = mode === 'synthetic';
    const r = await runEncounter(http, {
      roster: synthetic ? syntheticRoster() : roster(party),
      enemies: synthetic ? syntheticEnemies() : enemies(),
      seed,
      maxRounds: 40,
      gridSize: synthetic ? 8 : 10,
      focusFire,
    });
    const rosterN = (r.rosterIds || []).length || 4;
    // Prefer the adapter's roster-scoped units_lost (a spawned minion is player-controlled but
    // NOT in the roster, so recomputing from survivorIds would undercount roster KOs). Fallback
    // to the survivor delta only if the field is absent (older adapter). (cavecrew W5 inc-1)
    const kos = Number.isFinite(r.units_lost)
      ? r.units_lost
      : Math.max(0, rosterN - (r.survivorIds || []).length);
    return {
      outcome: r.outcome,
      rounds: r.rounds,
      kos,
      rosterN,
      hp_remaining_pct: r.hp_remaining_pct,
      units_lost: r.units_lost,
    };
  } finally {
    if (typeof close === 'function') await close().catch(() => {});
  }
}

function summarize(arr) {
  const wins = arr.filter((r) => r.outcome === 'victory').length;
  const totalKo = arr.reduce((s, r) => s + r.kos, 0);
  const totalSlots = arr.reduce((s, r) => s + r.rosterN, 0);
  return {
    N: arr.length,
    wins,
    defeats: arr.filter((r) => r.outcome === 'defeat').length,
    timeouts: arr.filter((r) => r.outcome === 'timeout').length,
    win_rate: Number((wins / arr.length).toFixed(4)),
    creature_ko_rate: Number((totalKo / (totalSlots || 1)).toFixed(4)),
    mean_hp_remaining_pct: Number(
      (arr.reduce((s, r) => s + (r.hp_remaining_pct || 0), 0) / arr.length).toFixed(4),
    ),
    avg_rounds: Number((arr.reduce((s, r) => s + (r.rounds || 0), 0) / arr.length).toFixed(2)),
  };
}

async function main() {
  const N = Number(process.argv[2]) || 40;
  const mode = process.argv[3] === 'synthetic' ? 'synthetic' : 'hardcore';
  const party = mode === 'synthetic' ? null : await fetchCanonicalParty();
  const off = [];
  const on = [];
  for (let s = 1; s <= N; s += 1) {
    off.push(await runOne(party, s, false, mode));
    on.push(await runOne(party, s, true, mode));
    if (s % 10 === 0) process.stderr.write(`  ${s}/${N}\n`);
  }
  const sOff = summarize(off);
  const sOn = summarize(on);
  console.log(
    JSON.stringify(
      {
        scenario:
          mode === 'synthetic'
            ? 'synthetic elimination cluster (4p vs 5 staggered-HP foes)'
            : 'enc_badlands_ultima_caccia_01 (wave-1 hardcore)',
        mode,
        party_source: mode === 'synthetic' ? 'synthetic' : CANON_PARTY_SCENARIO,
        focus_fire_off: sOff,
        focus_fire_on: sOn,
        wr_delta: Number((sOn.win_rate - sOff.win_rate).toFixed(4)),
        ko_rate_delta: Number((sOn.creature_ko_rate - sOff.creature_ko_rate).toFixed(4)),
        node: process.version,
      },
      null,
      2,
    ),
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
