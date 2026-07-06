'use strict';
// Grid-ratify band probe -- enc_badlands_dorsale_ferrosa_01 (16x12 grid_sized).
//
// L-069 re-ratify harness for the FIRST board_scale:'grid_sized' encounter
// (fase-2c wiring #3199 + ADR-2026-07-03): any grid change -> N=10 direction
// probe -> N=40 ratify before the baseline (grid_ratify_baseline.json) moves.
//
// METHODOLOGY (mirror ultima-caccia-band-probe.js, badlands family):
// - In-process (supertest createApp, no prod backend). encounter_id is threaded
//   to /api/session/start so the YAML loads: board = authored 16x12
//   (resolveBoardSize), terrain_features -> session.grid -> LOS-real chokepoints
//   (COMBAT_LOS_ENABLED default ON since #3226; prod repositioning = step).
// - Enemies = the encounter's WAVE 1 read from the YAML itself and expanded
//   with the canonical AI-sim tier table (base hp7/mod1, elite hp10/mod2,
//   apex hp14/mod4; dc 11/12/14), spawn_points mapped 1:1 (Codex #3107 parity:
//   the probed band == the real mission).
// - Party = the CANONICAL badlands tier party (GET /api/tutorial/
//   enc_badlands_pilot_01, same source as the badlands pilot calibration),
//   repositioned on the encounter's authored player_spawn tiles.
// - pressure_start 50 (Escalated, reinforcement budget 2/tick) so the
//   reinforcementSpawner (pool + curated entry tiles) is LIVE in the measured
//   fight -- the encounter's push-economy is part of its difficulty.
// - Seeds seedBase..seedBase+N-1, paired across re-runs. CHECKPOINT: one JSONL
//   line per run, flushed immediately; a re-run skips seeds already present
//   (idempotent resume after a crash / drain stop).
// - EADDRINUSE drain-gate (Windows): an N=40 run leaks ~16k TIME_WAIT sockets;
//   every DRAIN_EVERY seeds the probe polls netstat and waits until
//   TIME_WAIT < 3000 (45s poll), mirroring the LOS-flip ratify operating gate.
//
// This is a DIRECTION probe at N=10 / ratify EVIDENCE at N=40 (L-069); the
// authored values stay PROPOSED (SDMG) -- master-dd reads the numbers.
//
// Usage:
//   node tools/sim/dorsale-ferrosa-band-probe.js --n 10
//   node tools/sim/dorsale-ferrosa-band-probe.js --n 40 --out reports/sim/dorsale-ferrosa-n40

const fs = require('node:fs');
const path = require('node:path');
const { execSync } = require('node:child_process');
const yaml = require('js-yaml');
const request = require('supertest');
const { createApp } = require('../../apps/backend/app');
const { runEncounter } = require('./combat-adapter');

process.env.IDEA_ENGINE_DISABLE_STATUS_REFRESH = '1';
process.env.IDEA_ENGINE_STUB_ORCHESTRATOR = '1';

const ENCOUNTER_ID = 'enc_badlands_dorsale_ferrosa_01';
const ENCOUNTER_YAML = path.resolve(
  __dirname,
  '..',
  '..',
  'docs',
  'planning',
  'encounters',
  `${ENCOUNTER_ID}.yaml`,
);
const CANON_PARTY_SCENARIO = 'enc_badlands_pilot_01';
const PRESSURE_START_DEFAULT = 50; // Escalated: reinforcement budget 2/tick

const TIER_HP = { base: 7, elite: 10, apex: 14 };
const TIER_MOD = { base: 1, elite: 2, apex: 4 };
const TIER_DC = { base: 11, elite: 12, apex: 14 };
const TIER_INITIATIVE = { base: 10, elite: 10, apex: 14 };

// TIME_WAIT drain gate (see docs/research/2026-07-06-los-flip-ratify-n40.md +
// memoria operativa EADDRINUSE): poll 45s, win32 only. Threshold 5000: a
// 10-seed chunk's decay tail sits ~3000-6000 for a few minutes (measured
// 2026-07-06), so a 3000 gate spends several 45s cycles idle between chunks;
// 5000 opens sooner and still leaves ~11k of the ~16k dynamic-port range.
const DRAIN_EVERY = 10;
const DRAIN_THRESHOLD = 5000;
const DRAIN_POLL_MS = 45000;

function parseArgs(argv) {
  const args = {
    n: 10,
    seedBase: 1,
    out: path.join('reports', 'sim', 'dorsale-ferrosa-band'),
    pressure: PRESSURE_START_DEFAULT,
    // Calibration overlay (mirror scenario-enemies/full-loop knobs): the v2
    // round-driver is player-favored at faithful tier stats (WR ceiling 1.0),
    // so the MEASURABLE band lives in a calibrated arm -- same de-ceiling move
    // as the LOS flip ratify (enemyScale banda dura) and the full-loop band
    // batch (hpAdd 3 / modAdd 1 / dcAdd 1 static overlay). Defaults 0 =
    // faithful arm, byte-identical.
    hpAdd: 0,
    modAdd: 0,
    dcAdd: 0,
    countMult: 1,
    // enemyRange axis (mirror los-repos-probe enemyRange 4 banda dura): melee
    // sistema never converts on the v2 round-driver; the ranged arm is ALSO the
    // one where the LOS chokepoints/cover of the 16x12 layout get exercised.
    rangeAdd: 0,
    // D4 roster-scaling A/B (spec 2026-07-06-sistema-intents-roster-scaling):
    // --intents-scaling sets SISTEMA_INTENTS_ROSTER_SCALING_ENABLED=true for
    // the in-process app (the backend reads the flag per-call); --intents-k
    // sets the divisor env. 0 = env untouched -> backend default (3).
    intentsScaling: false,
    intentsK: 0,
  };
  for (let i = 2; i < argv.length; i += 1) {
    const tok = argv[i];
    const next = () => argv[(i += 1)];
    if (tok === '--n') args.n = Math.max(1, Number(next()));
    else if (tok === '--seed-base') args.seedBase = Number(next());
    else if (tok === '--out') args.out = next();
    else if (tok === '--pressure') args.pressure = Number(next());
    else if (tok === '--hp-add') args.hpAdd = Number(next());
    else if (tok === '--mod-add') args.modAdd = Number(next());
    else if (tok === '--dc-add') args.dcAdd = Number(next());
    else if (tok === '--count-mult') args.countMult = Number(next());
    else if (tok === '--range-add') args.rangeAdd = Number(next());
    else if (tok === '--intents-scaling') args.intentsScaling = true;
    else if (tok === '--intents-k') args.intentsK = Number(next());
    else if (tok.startsWith('--')) console.warn(`unknown arg: ${tok}`);
  }
  return args;
}

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

function loadEncounterYaml() {
  const parsed = yaml.load(fs.readFileSync(ENCOUNTER_YAML, 'utf8'));
  if (!parsed || parsed.encounter_id !== ENCOUNTER_ID) {
    throw new Error(`encounter YAML mismatch at ${ENCOUNTER_YAML}`);
  }
  return parsed;
}

// Expand the encounter's wave-1 with the tier table, spawn_points 1:1 in
// authored order (no hand-copied roster -> zero drift vs the YAML).
function enemiesFromYaml(enc, scaling = {}) {
  const hpAdd = Number(scaling.hpAdd) || 0;
  const modAdd = Number(scaling.modAdd) || 0;
  const dcAdd = Number(scaling.dcAdd) || 0;
  const countMult = Number(scaling.countMult) || 1;
  const rangeAdd = Number(scaling.rangeAdd) || 0;
  const wave1 = [...enc.waves].sort((a, b) => (a.turn_trigger || 0) - (b.turn_trigger || 0))[0];
  const sp = wave1.spawn_points;
  const out = [];
  let i = 0;
  for (const def of wave1.units) {
    const count = Math.max(1, Math.round((def.count || 1) * countMult));
    for (let k = 0; k < count; k += 1) {
      const tier = def.tier || 'base';
      const pos = sp[i % sp.length];
      i += 1;
      out.push({
        id: `sis_${i}`,
        species: def.species,
        species_id: def.species,
        hp: TIER_HP[tier] + hpAdd,
        max_hp: TIER_HP[tier] + hpAdd,
        ap: 2,
        ap_max: 2,
        mod: TIER_MOD[tier] + modAdd,
        dc: TIER_DC[tier] + dcAdd,
        attack_range: 1 + rangeAdd,
        damage: { min: 1, max: 3 },
        initiative: TIER_INITIATIVE[tier],
        position: { x: pos[0], y: pos[1] },
        ai_profile: def.ai_profile,
        controlled_by: 'sistema',
        status: {},
      });
    }
  }
  return out;
}

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

// Fresh roster per run, repositioned on the encounter's authored player_spawn.
function roster(party, playerSpawn) {
  return party.map((u, i) => {
    const spawn = playerSpawn[i % playerSpawn.length];
    return {
      ...u,
      hp: u.max_hp ?? u.hp,
      status: {},
      position: { x: spawn[0], y: spawn[1] },
    };
  });
}

function countTimeWait() {
  try {
    const out = execSync('netstat -ano -p tcp', { maxBuffer: 64 * 1024 * 1024 }).toString();
    return out.split('\n').filter((l) => l.includes('TIME_WAIT')).length;
  } catch {
    return 0;
  }
}

async function drainGate() {
  if (process.platform !== 'win32') return;
  let tw = countTimeWait();
  while (tw >= DRAIN_THRESHOLD) {
    process.stderr.write(`[drain] TIME_WAIT=${tw} >= ${DRAIN_THRESHOLD}, wait 45s...\n`);
    await new Promise((r) => setTimeout(r, DRAIN_POLL_MS));
    tw = countTimeWait();
  }
}

// One-shot wiring proof (observable evidence, not an assumption): start a real
// session with encounter_id and read back the board + terrain the runtime built.
async function wiringProof(enc, party) {
  const { app, close } = createApp({ databasePath: null });
  try {
    const r = await request(app)
      .post('/api/session/start')
      .send({
        units: [...roster(party, enc.player_spawn), ...enemiesFromYaml(enc)],
        encounter_id: ENCOUNTER_ID,
        scenario_id: ENCOUNTER_ID,
        seed: 999999,
      });
    if (r.status !== 200 && r.status !== 201) {
      throw new Error(`wiring proof start ${r.status}: ${JSON.stringify(r.body).slice(0, 400)}`);
    }
    const grid = r.body.state && r.body.state.grid;
    return {
      grid_width: grid && grid.width,
      grid_height: grid && grid.height,
      terrain_features:
        grid && Array.isArray(grid.terrain_features) ? grid.terrain_features.length : 0,
      combat_los_enabled_env: process.env.COMBAT_LOS_ENABLED || '(unset -> default ON #3226)',
    };
  } finally {
    if (typeof close === 'function') await close().catch(() => {});
  }
}

async function runOne(enc, party, seed, pressure, scaling) {
  const { app, close } = createApp({ databasePath: null });
  try {
    const http = supertestHttp(app);
    const r = await runEncounter(http, {
      roster: roster(party, enc.player_spawn),
      enemies: enemiesFromYaml(enc, scaling),
      scenarioId: ENCOUNTER_ID,
      seed,
      maxRounds: 40,
      pressureStart: pressure,
      collectEvents: ['reinforcement_spawn'],
      // Multi-unit driver (LOS-repos v2): act EVERY live player unit per round.
      // The legacy active-unit loop moves ONE unit one tile per round -- on a
      // 16x12 board that starves min_units_in_zone=2 forever (co-op semantics
      // memo 2026-07-05: never drive via active_unit).
      allPlayersActPerRound: true,
      endSession: true,
    });
    const rosterN = (r.rosterIds || []).length || 4;
    const survivors = (r.survivorIds || []).length;
    return {
      seed,
      outcome: r.outcome,
      rounds: r.rounds,
      kos: Math.max(0, rosterN - survivors),
      rosterN,
      reinforcements: (r.collectedEvents || []).length,
    };
  } finally {
    if (typeof close === 'function') await close().catch(() => {});
  }
}

function wilson(p, n, z = 1.96) {
  if (!n) return [0, 0];
  const z2 = z * z;
  const denom = 1 + z2 / n;
  const centre = p + z2 / (2 * n);
  const margin = z * Math.sqrt((p * (1 - p) + z2 / (4 * n)) / n);
  return [
    Number(Math.max(0, (centre - margin) / denom).toFixed(3)),
    Number(Math.min(1, (centre + margin) / denom).toFixed(3)),
  ];
}

function summarize(arr) {
  const wins = arr.filter((r) => r.outcome === 'victory').length;
  const defeats = arr.filter((r) => r.outcome === 'defeat').length;
  const timeouts = arr.filter((r) => r.outcome === 'timeout').length;
  const totalKo = arr.reduce((s, r) => s + r.kos, 0);
  const totalSlots = arr.reduce((s, r) => s + r.rosterN, 0);
  const avgRounds = arr.reduce((s, r) => s + (r.rounds || 0), 0) / (arr.length || 1);
  const avgReinf = arr.reduce((s, r) => s + (r.reinforcements || 0), 0) / (arr.length || 1);
  const wr = wins / (arr.length || 1);
  return {
    N: arr.length,
    wins,
    defeats,
    timeouts,
    win_rate: Number(wr.toFixed(4)),
    wr_ci95_wilson: wilson(wr, arr.length),
    creature_ko_rate: Number((totalKo / (totalSlots || 1)).toFixed(4)),
    avg_rounds: Number(avgRounds.toFixed(2)),
    avg_reinforcements: Number(avgReinf.toFixed(2)),
  };
}

function readCheckpoint(jsonlPath) {
  if (!fs.existsSync(jsonlPath)) return [];
  return fs
    .readFileSync(jsonlPath, 'utf8')
    .split('\n')
    .filter(Boolean)
    .map((l) => JSON.parse(l));
}

async function main() {
  const args = parseArgs(process.argv);
  // D4 roster-scaling arm: env set BEFORE any app run; the backend reads the
  // flag at call-time so the in-process createApp picks it up per-request.
  if (args.intentsScaling) process.env.SISTEMA_INTENTS_ROSTER_SCALING_ENABLED = 'true';
  if (args.intentsK >= 1) process.env.SISTEMA_INTENTS_ROSTER_K = String(args.intentsK);
  fs.mkdirSync(args.out, { recursive: true });
  const jsonlPath = path.join(args.out, 'runs.jsonl');
  const enc = loadEncounterYaml();
  const party = await fetchCanonicalParty();

  const proof = await wiringProof(enc, party);
  console.log(`WIRING PROOF: ${JSON.stringify(proof)}`);
  if (proof.grid_width !== enc.grid_size[0] || proof.grid_height !== enc.grid_size[1]) {
    throw new Error(
      `board NOT authored-sized: got ${proof.grid_width}x${proof.grid_height}, want ${enc.grid_size[0]}x${enc.grid_size[1]}`,
    );
  }

  const done = readCheckpoint(jsonlPath);
  const doneSeeds = new Set(done.map((r) => r.seed));
  const seeds = [];
  for (let s = args.seedBase; s < args.seedBase + args.n; s += 1) {
    if (!doneSeeds.has(s)) seeds.push(s);
  }
  console.log(
    `PROBE ${ENCOUNTER_ID}: N=${args.n} seedBase=${args.seedBase} pressure=${args.pressure} | checkpoint ${done.length} done, ${seeds.length} to run | out=${args.out}`,
  );

  await drainGate(); // pre-batch: earlier runs may have left the port pool hot
  let sinceDrain = 0;
  for (const seed of seeds) {
    if (sinceDrain >= DRAIN_EVERY) {
      await drainGate();
      sinceDrain = 0;
    }
    const r = await runOne(enc, party, seed, args.pressure, args);
    fs.appendFileSync(jsonlPath, JSON.stringify(r) + '\n');
    sinceDrain += 1;
    process.stdout.write(
      `[seed ${seed}] ${r.outcome} rounds=${r.rounds} kos=${r.kos}/${r.rosterN} reinf=${r.reinforcements}\n`,
    );
  }

  const all = readCheckpoint(jsonlPath).filter(
    (r) => r.seed >= args.seedBase && r.seed < args.seedBase + args.n,
  );
  const out = {
    scenario: ENCOUNTER_ID,
    grid: `${enc.grid_size[0]}x${enc.grid_size[1]} (board_scale=${enc.board_scale})`,
    party_source: CANON_PARTY_SCENARIO,
    pressure_start: args.pressure,
    scaling: {
      hpAdd: args.hpAdd,
      modAdd: args.modAdd,
      dcAdd: args.dcAdd,
      countMult: args.countMult,
      rangeAdd: args.rangeAdd,
      intentsScaling: args.intentsScaling,
      intentsK: args.intentsScaling ? args.intentsK || 3 : null,
    },
    objective: enc.objective && enc.objective.type,
    // Ratified N=40 2026-07-06 (evidence: docs/research/2026-07-06-dorsale-
    // ferrosa-grid-ratify.md): the L-069 baseline for this grid is completion
    // + pace + reinforcement-liveness. Lethality (WR/KO) is a MODEL ceiling on
    // the AI-vs-AI round driver (intents_per_round cap), not a map property.
    ratified_bands: {
      completion: 1.0,
      pace_rounds: [10, 18],
      reinforcements_at_cap: 4,
    },
    wiring_proof: proof,
    ...summarize(all),
    node: process.version,
  };
  fs.writeFileSync(path.join(args.out, 'summary.json'), JSON.stringify(out, null, 2));
  console.log(JSON.stringify(out, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
