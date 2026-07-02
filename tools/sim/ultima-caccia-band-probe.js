'use strict';
// SPEC-J first-lethal band probe -- enc_badlands_ultima_caccia_01.
//
// In-process (supertest createApp, NO prod backend, node 22), single-arm
// elimination. Measures the win-rate band + the player-creature KO-rate (the
// permadeath-relevant metric: under LETHAL+consent every player KO becomes a
// real death, so the KO-rate IS the death-rate). The flag stays OFF here -- this
// probe never produces permadeath, it measures the combat band the lethal
// mission would run at.
//
// METHODOLOGY:
// - Enemies are the encounter's WAVE 1 expanded with the SAME tier->stat table
//   the canonical AI-sim harness uses (tests/smoke/ai-driven-sim.js
//   buildEnemiesFromYaml: base hp7/mod1, elite hp10/mod2, apex hp14/mod4,
//   damage {1,3}, ap 2, range 1). So this in-process band is comparable to a
//   live-harness run of the same scenario.
// - The player party is the CANONICAL badlands tier party, fetched from
//   GET /api/tutorial/enc_badlands_pilot_01 (same source the canonical Python
//   harness uses -- batch_calibrate_badlands_pilot_01.py:run_one). NOT hand-built,
//   so the only difference vs the badlands pilot calibration is the enemy roster:
//   our wave 1 (apex + 2 elite + 2 base) is harder than the pilot's wave 1
//   (apex + 2 elite), so the band should sit below the pilot's [0.40,0.60].
// - This is still a DIRECTION probe (N=10) / provisional band (N=40), NOT the
//   owner ratification: the absolute-band ratification + the permadeath flip are
//   owner-gated via the G2 Python calibration harness + master-dd (N-sample
//   discipline: N=10 = direction, N=40 = ratify; SDMG: even a canonical-party
//   in-process probe is a hypothesis, the specialist harness is the decider).
//
// DESIGN target (master-dd 2026-06-30): hardcore opt-in, party-WR 25-40%,
//   creature-KO-rate 25-40%.
//
// Usage: node tools/sim/ultima-caccia-band-probe.js [N]   (default N=40)

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

// Wave 1 of enc_badlands_ultima_caccia_01, expanded with the AI-sim tier table.
const TIER_HP = { base: 7, elite: 10, apex: 14 };
const TIER_MOD = { base: 1, elite: 2, apex: 4 };

// Enemy roster variant (env ULTIMA_ROSTER): 'full' = wave-1 as authored
// (apex+2elite+2base), 'minus_base' = drop 1 base, 'pilot' = apex+2elite (the
// badlands-pilot wave-1, [0.40,0.60] reference). Spawn positions match the
// authored encounter spawn_points 1:1 (Codex #3107 P2: midfield x~5-6, the
// canonical badlands engagement distance, so the probe band == the real mission).
const ROSTER_VARIANT = process.env.ULTIMA_ROSTER || 'full';

function enemies() {
  let defs = [
    ['dune-stalker', 'apex', { x: 5, y: 5 }, 'flanking'],
    ['echo-wing', 'elite', { x: 5, y: 4 }, 'aggressive'],
    ['echo-wing', 'elite', { x: 5, y: 6 }, 'aggressive'],
    ['rust-scavenger', 'base', { x: 6, y: 4 }, 'aggressive'],
    ['rust-scavenger', 'base', { x: 6, y: 6 }, 'aggressive'],
  ];
  if (ROSTER_VARIANT === 'minus_base') defs = defs.slice(0, 4);
  else if (ROSTER_VARIANT === 'pilot') defs = defs.slice(0, 3);
  return defs.map(([species, tier, position, aiProfile], i) => ({
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
    // Codex #3107 P2: emit the authored ai_profile so /session/start selects the
    // utility-brain behavior (flanking/aggressive), not the default policy.
    ai_profile: aiProfile,
    controlled_by: 'sistema',
    status: {},
  }));
}

// Canonical badlands tier party (player units only), fetched once from the
// tutorial scenario the badlands pilot calibration also uses.
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
  // Deep-clone so each run starts from full HP (runEncounter mutates units).
  return party.map((u) => ({ ...u, hp: u.max_hp ?? u.hp, status: {} }));
}

async function runOne(party, seed) {
  const { app, close } = createApp({ databasePath: null });
  try {
    const http = supertestHttp(app);
    const r = await runEncounter(http, {
      roster: roster(party),
      enemies: enemies(),
      seed,
      maxRounds: 40,
      gridSize: 10,
      endSession: true, // #3157 F4: close the session so the log gets session_end
    });
    const rosterN = (r.rosterIds || []).length || 4;
    const survivors = (r.survivorIds || []).length;
    const kos = Math.max(0, rosterN - survivors);
    return { outcome: r.outcome, rounds: r.rounds, kos, rosterN };
  } finally {
    if (typeof close === 'function') await close().catch(() => {});
  }
}

function summarize(arr) {
  const wins = arr.filter((r) => r.outcome === 'victory').length;
  const defeats = arr.filter((r) => r.outcome === 'defeat').length;
  const timeouts = arr.filter((r) => r.outcome === 'timeout').length;
  const totalKo = arr.reduce((s, r) => s + r.kos, 0);
  const totalSlots = arr.reduce((s, r) => s + r.rosterN, 0);
  const avgRounds = arr.reduce((s, r) => s + (r.rounds || 0), 0) / (arr.length || 1);
  return {
    N: arr.length,
    wins,
    defeats,
    timeouts,
    win_rate: Number((wins / arr.length).toFixed(4)),
    creature_ko_rate: Number((totalKo / (totalSlots || 1)).toFixed(4)),
    avg_rounds: Number(avgRounds.toFixed(2)),
  };
}

async function main() {
  const N = Number(process.argv[2]) || 40;
  const party = await fetchCanonicalParty();
  const runs = [];
  for (let s = 1; s <= N; s += 1) {
    runs.push(await runOne(party, s));
    if (s % 10 === 0) process.stderr.write(`  ${s}/${N}\n`);
  }
  const out = {
    scenario: 'enc_badlands_ultima_caccia_01',
    roster_variant: ROSTER_VARIANT,
    party_source: CANON_PARTY_SCENARIO,
    target_band: { win_rate: [0.25, 0.4], creature_ko_rate: [0.25, 0.4] },
    ...summarize(runs),
    node: process.version,
  };
  console.log(JSON.stringify(out, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
