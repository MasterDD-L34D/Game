'use strict';
// Generic grid-ratify band probe for board_scale:'grid_sized' encounters
// (L-069: any grid change -> N=10 direction probe -> N=40 ratify before the
// baseline moves). Generalizes tools/sim/dorsale-ferrosa-band-probe.js (the
// first grid_sized ratify, evidence docs/research/2026-07-06-dorsale-ferrosa-
// grid-ratify.md) so every future grid_sized encounter reuses one harness.
//
// METHODOLOGY (unchanged from the dorsale ratify -- comparable numbers):
// - In-process (supertest createApp). encounter_id threaded to /start: board =
//   authored grid_size (resolveBoardSize), YAML grid.terrain_features ->
//   session.grid -> LOS-real blockers (COMBAT_LOS_ENABLED default ON #3226).
// - Enemies = wave-1 from the YAML, canonical tier table, spawn_points 1:1.
// - Party = canonical tier party (default enc_badlands_pilot_01), repositioned
//   on the encounter's player_spawn.
// - Multi-unit round driver (allPlayersActPerRound -- never active_unit).
// - Checkpoint JSONL resume + TIME_WAIT drain gate (threshold 5000, 45s poll).
// - Calibration overlay knobs (hp/mod/dc/count/range) for de-ceiling arms;
//   defaults 0 = faithful arm.
//
// The ratified bands for grid_sized encounters are COMPLETION + PACE +
// REINFORCEMENT LIVENESS: lethality is a MODEL ceiling on this driver
// (intents_per_round caps sistema throughput -- see the dorsale evidence doc).
//
// Usage:
//   node tools/sim/grid-band-probe.js --encounter enc_badlands_canyon_lungo_01 --n 10
//   node tools/sim/grid-band-probe.js --encounter <id> --n 40 --out reports/sim/<id>-n40

const fs = require('node:fs');
const path = require('node:path');
const { execSync } = require('node:child_process');
const yaml = require('js-yaml');
const request = require('supertest');
const { createApp } = require('../../apps/backend/app');
const { runEncounter } = require('./combat-adapter');

process.env.IDEA_ENGINE_DISABLE_STATUS_REFRESH = '1';
process.env.IDEA_ENGINE_STUB_ORCHESTRATOR = '1';

const ENCOUNTER_DIR = path.resolve(__dirname, '..', '..', 'docs', 'planning', 'encounters');
const PRESSURE_START_DEFAULT = 50; // Escalated: reinforcement budget 2/tick

const TIER_HP = { base: 7, elite: 10, apex: 14 };
const TIER_MOD = { base: 1, elite: 2, apex: 4 };
const TIER_DC = { base: 11, elite: 12, apex: 14 };
const TIER_INITIATIVE = { base: 10, elite: 10, apex: 14 };

const DRAIN_EVERY = 10;
const DRAIN_THRESHOLD = 5000;
const DRAIN_POLL_MS = 45000;

function parseArgs(argv) {
  const args = {
    encounter: null,
    n: 10,
    seedBase: 1,
    out: null,
    pressure: PRESSURE_START_DEFAULT,
    partyScenario: 'enc_badlands_pilot_01',
    hpAdd: 0,
    modAdd: 0,
    dcAdd: 0,
    countMult: 1,
    rangeAdd: 0,
  };
  for (let i = 2; i < argv.length; i += 1) {
    const tok = argv[i];
    const next = () => argv[(i += 1)];
    if (tok === '--encounter') args.encounter = next();
    else if (tok === '--n') args.n = Math.max(1, Number(next()));
    else if (tok === '--seed-base') args.seedBase = Number(next());
    else if (tok === '--out') args.out = next();
    else if (tok === '--pressure') args.pressure = Number(next());
    else if (tok === '--party-scenario') args.partyScenario = next();
    else if (tok === '--hp-add') args.hpAdd = Number(next());
    else if (tok === '--mod-add') args.modAdd = Number(next());
    else if (tok === '--dc-add') args.dcAdd = Number(next());
    else if (tok === '--count-mult') args.countMult = Number(next());
    else if (tok === '--range-add') args.rangeAdd = Number(next());
    else if (tok.startsWith('--')) console.warn(`unknown arg: ${tok}`);
  }
  if (!args.encounter) {
    console.error('usage: node tools/sim/grid-band-probe.js --encounter <enc_id> [--n N] ...');
    process.exit(2);
  }
  if (!args.out) args.out = path.join('reports', 'sim', `${args.encounter}-band`);
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

function loadEncounterYaml(encounterId) {
  const file = path.join(ENCOUNTER_DIR, `${encounterId}.yaml`);
  const parsed = yaml.load(fs.readFileSync(file, 'utf8'));
  if (!parsed || parsed.encounter_id !== encounterId) {
    throw new Error(`encounter YAML mismatch at ${file}`);
  }
  return parsed;
}

// Expand wave-1 with the tier table, spawn_points 1:1 in authored order.
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
async function fetchCanonicalParty(partyScenario) {
  if (_party) return _party;
  const { app, close } = createApp({ databasePath: null });
  try {
    const r = await request(app).get(`/api/tutorial/${partyScenario}`);
    if (r.status !== 200) throw new Error(`canon party fetch ${r.status}`);
    _party = (r.body.units || []).filter((u) => u.controlled_by === 'player');
    if (!_party.length) throw new Error('canon party empty');
    return _party;
  } finally {
    if (typeof close === 'function') await close().catch(() => {});
  }
}

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

// One-shot wiring proof: start a real session with encounter_id and read back
// the board + terrain the runtime built. Fails hard on a party_sized-shaped
// board (the whole point of a grid_sized ratify).
async function wiringProof(enc, party) {
  const { app, close } = createApp({ databasePath: null });
  try {
    const r = await request(app)
      .post('/api/session/start')
      .send({
        units: [...roster(party, enc.player_spawn), ...enemiesFromYaml(enc)],
        encounter_id: enc.encounter_id,
        scenario_id: enc.encounter_id,
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
      scenarioId: enc.encounter_id,
      seed,
      maxRounds: 40,
      pressureStart: pressure,
      collectEvents: ['reinforcement_spawn'],
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
  const rounds = arr.map((r) => r.rounds || 0);
  const avgRounds = rounds.reduce((a, b) => a + b, 0) / (arr.length || 1);
  const sd =
    arr.length > 1
      ? Math.sqrt(rounds.reduce((a, b) => a + (b - avgRounds) ** 2, 0) / (rounds.length - 1))
      : 0;
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
    rounds_sd: Number(sd.toFixed(2)),
    rounds_min: rounds.length ? Math.min(...rounds) : 0,
    rounds_max: rounds.length ? Math.max(...rounds) : 0,
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
  fs.mkdirSync(args.out, { recursive: true });
  const jsonlPath = path.join(args.out, 'runs.jsonl');
  const enc = loadEncounterYaml(args.encounter);
  const party = await fetchCanonicalParty(args.partyScenario);

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
    `PROBE ${args.encounter}: N=${args.n} seedBase=${args.seedBase} pressure=${args.pressure} | checkpoint ${done.length} done, ${seeds.length} to run | out=${args.out}`,
  );

  await drainGate();
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
    scenario: args.encounter,
    grid: `${enc.grid_size[0]}x${enc.grid_size[1]} (board_scale=${enc.board_scale})`,
    party_source: args.partyScenario,
    pressure_start: args.pressure,
    scaling: {
      hpAdd: args.hpAdd,
      modAdd: args.modAdd,
      dcAdd: args.dcAdd,
      countMult: args.countMult,
      rangeAdd: args.rangeAdd,
    },
    objective: enc.objective && enc.objective.type,
    // Ratified band semantics for grid_sized encounters: completion + pace +
    // reinforcement liveness (lethality = model ceiling, see dorsale evidence).
    band_semantics: 'completion+pace+liveness (L-069)',
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
