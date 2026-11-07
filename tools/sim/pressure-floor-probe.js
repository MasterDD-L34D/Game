'use strict';
// A2 pressure_tier_floor N=40 band-verify probe (TKT-PRESSURE-TIER-ENCOUNTER).
//
// PR #2773 shipped the backend Sistema mirror of encounter.pressure_tier_floor
// flag-gated OFF (PRESSURE_TIER_FLOOR_ENABLED). When ON, the per-encounter floor
// raises the EFFECTIVE Sistema pressure (FLOOR_MIN = {1:0, 2:25, 3:50, 4:75,
// 5:95}) before every tier derivation:
//   - declareSistemaIntents.intentsCapForPressure(sistema_pressure, floor)
//       -> how many SIS units act per round (Calm 1 / Alert 2 / Escalated 3 /
//          Critical 3 / Apex 4). UNIVERSAL lever (board-independent).
//   - reinforcementSpawner tier (session.pressure ?? 0, floor) -> reinforcement
//       budget. Only bites for an encounter WITH a reinforcement_pool on a board
//       large enough that the authored entry tiles are on-grid (modulation).
// A session loaded via encounter_id with no pressure_start defaults to
// sistema_pressure 0 (Calm) (session.js:2070) -> the floor genuinely bites.
//
// This probe REPORTS evidence for the spec "Gate balance" (owner-gated, BLOCKING):
// N=40 band-verify per encounter_class with the flag ON vs the flag-OFF baseline.
// It NEVER flips the flag; the verdict + any floor re-tune is master-dd's (L-069).
//
// Protocol (ratify-grade, pack 06-10/06-11 + spec-i-gates-probe):
//   ONE process per (scenario, arm). The combat module keeps module-global state
//   (pseudoRng miss-streak maps) that contaminates sequential same-process arms
//   (+0.20 phantom win-rate gap, ER6 saga). Run each (scenario, arm) in its own
//   process, then --aggregate. Arms: off / off2 (noise floor) / on, flag pinned
//   EXPLICITLY per arm ('false'/'false'/'true').
//
// Anti-pattern #14 (assert the effect actually fired): each arm records a
// fireCheck (start a session, read publicSessionView.sistema_tier) so the report
// shows OFF tier vs ON tier per encounter -- the floor is proven to lift the tier
// through the real backend, independent of the combat outcome.
//
// Caveat (carried into the report): the shared greedy sim policy (probeRoster:
// 2 strong skirmishers) SATURATES authored fights, so the OFF absolute win rate
// sits above the calibrated damage_curves bands. The clean, ratifiable signal is
// the PAIRED on-vs-off delta read against the off2-off noise floor; the absolute
// band verdict is reported with that saturation caveat.
//
// Usage (per (scenario, arm), isolated):
//   node tools/sim/pressure-floor-probe.js --scenario enc_savana_01 --arm off \
//     --runs 40 --seed-base 60000 --out reports/sim/a2-pressure-n40-<date>
//   ... (repeat for off2 / on and every scenario) ...
//   node tools/sim/pressure-floor-probe.js --aggregate \
//     --out reports/sim/a2-pressure-n40-<date>

const fs = require('node:fs');
const path = require('node:path');
const yaml = require('js-yaml');
const { runEncounter } = require('./combat-adapter');
const { buildScenarioEnemies } = require('./scenario-enemies');
const { meanSdCi, wilson95, pairDelta, probeRoster } = require('./overcharge-probe');

const FLAG = 'PRESSURE_TIER_FLOOR_ENABLED';

// The 10 new-schema encounters that A1 (#2769) gave a pressure_tier_floor.
// class = encounter_class (damage_curves band key); floor = pressure_tier_floor;
// modulation = party preset to widen the board to the authored grid when the
// encounter has a reinforcement_pool (else the entry tiles land off-grid on the
// auto-scaled 6x6 and the spawner is structurally mute).
const ENCOUNTERS = [
  { id: 'enc_tutorial_01', class: 'tutorial', floor: 1, reinf: false, modulation: null },
  { id: 'enc_tutorial_02', class: 'tutorial', floor: 1, reinf: false, modulation: null },
  { id: 'enc_savana_01', class: 'standard', floor: 2, reinf: false, modulation: null },
  { id: 'enc_caverna_02', class: 'standard', floor: 2, reinf: false, modulation: null },
  { id: 'enc_capture_01', class: 'standard', floor: 2, reinf: false, modulation: null },
  { id: 'enc_escort_01', class: 'standard', floor: 2, reinf: false, modulation: null },
  { id: 'enc_survival_01', class: 'hardcore', floor: 3, reinf: false, modulation: null },
  {
    id: 'enc_savana_skiv_solo_vs_pack',
    class: 'hardcore',
    floor: 3,
    reinf: false,
    modulation: null,
  },
  {
    id: 'enc_hardcore_reinf_01',
    class: 'hardcore',
    floor: 4,
    reinf: true,
    modulation: 'duo_hardcore',
  },
  { id: 'enc_frattura_03', class: 'hardcore', floor: 4, reinf: false, modulation: null },
];

const ARMS = {
  off: { env: { [FLAG]: 'false' } },
  off2: { env: { [FLAG]: 'false' } }, // noise floor (replicate of off)
  on: { env: { [FLAG]: 'true' } },
};

const FLOOR_MIN = { 1: 0, 2: 25, 3: 50, 4: 75, 5: 95 };

function encounterFor(scenarioId) {
  return ENCOUNTERS.find((e) => e.id === scenarioId) || null;
}

// Player roster presets. `strong` = the canonical overcharge/spec-i probeRoster
// (hp30, mod20 to-hit, range 2) -- it SATURATES authored fights (>0.99 WR), so the
// floor's outcome impact is invisible on elimination/survival. `weak` = a realistic
// vulnerable melee party (hp16, mod5, range 1) so the OFF baseline is competitive
// and the floor's WR impact is measurable across objectives. The roster choice is a
// MEASUREMENT-POINT choice (L-069); the paired on-vs-off delta is roster-robust.
function weakRoster() {
  return [
    {
      id: 'hero_a',
      species: 'dune_stalker',
      job: 'skirmisher',
      hp: 16,
      max_hp: 16,
      speed: 4,
      ap: 2,
      mod: 5,
      attack_range: 1,
      initiative: 12,
      position: { x: 1, y: 1 },
      controlled_by: 'player',
      status: {},
    },
    {
      id: 'hero_b',
      species: 'velox',
      job: 'skirmisher',
      hp: 16,
      max_hp: 16,
      speed: 4,
      ap: 2,
      mod: 5,
      attack_range: 1,
      initiative: 10,
      position: { x: 1, y: 2 },
      controlled_by: 'player',
      status: {},
    },
  ];
}

function rosterFor(name) {
  return name === 'weak' ? weakRoster : probeRoster;
}

// ---------------------------------------------------------------------------
// Bands + verdict (mirror tools/py/batch_calibrate_hardcore06.py verdict_for)
// ---------------------------------------------------------------------------

function loadBands() {
  const p = path.resolve(__dirname, '..', '..', 'data', 'core', 'balance', 'damage_curves.yaml');
  try {
    const doc = yaml.load(fs.readFileSync(p, 'utf8'));
    const classes = (doc && doc.encounter_classes) || {};
    const out = {};
    for (const [cls, def] of Object.entries(classes)) {
      if (def && def.target_bands) out[cls] = def.target_bands;
    }
    return out;
  } catch {
    return {};
  }
}

function verdictFor(wr, dr, tr, bands) {
  if (!bands) return { verdict: 'UNKNOWN', reasons: ['no bands for class'] };
  let score = 0; // 0 green, 1 amber, 2 red
  const reasons = [];
  for (const [key, observed] of [
    ['win_rate', wr],
    ['defeat_rate', dr],
    ['timeout_rate', tr],
  ]) {
    const band = bands[key];
    if (!band) continue;
    const [lo, hi] = band;
    if (observed >= lo && observed <= hi) continue;
    const dist = Math.min(Math.abs(observed - lo), Math.abs(observed - hi));
    if (dist <= 0.05) {
      score = Math.max(score, 1);
      reasons.push(`${key}=${observed.toFixed(2)} near band [${lo},${hi}] (amber)`);
    } else {
      score = 2;
      reasons.push(`${key}=${observed.toFixed(2)} out of band [${lo},${hi}] (red)`);
    }
  }
  if (score === 0) return { verdict: 'GREEN', reasons: ['all rates in band'] };
  if (score === 1) return { verdict: 'AMBER', reasons };
  return { verdict: 'RED', reasons };
}

// ---------------------------------------------------------------------------
// Aggregation
// ---------------------------------------------------------------------------

function aggregateOutcomes(runs) {
  const rs = Array.isArray(runs) ? runs : [];
  const n = rs.length;
  const wins = rs.filter((r) => r && r.outcome === 'victory').length;
  const defeats = rs.filter((r) => r && r.outcome === 'defeat').length;
  const timeouts = rs.filter((r) => r && r.outcome === 'timeout').length;
  return {
    n,
    win_rate: n ? wins / n : null,
    win_ci95: wilson95(wins, n),
    defeat_rate: n ? defeats / n : null,
    defeat_ci95: wilson95(defeats, n),
    timeout_rate: n ? timeouts / n : null,
    wins,
    defeats,
    timeouts,
    rounds: meanSdCi(rs.map((r) => r.rounds)),
    survivors: meanSdCi(rs.map((r) => r.survivors)),
    spawns: meanSdCi(rs.map((r) => (Number.isFinite(r.spawns) ? r.spawns : 0))),
  };
}

// ---------------------------------------------------------------------------
// Fire check (anti-#14): start a session, read the live Sistema tier.
// ---------------------------------------------------------------------------

async function fireCheck(http, enc, scaling, makeRoster) {
  const enemiesProto = buildScenarioEnemies(enc.id, scaling || {});
  if (!enemiesProto || !enemiesProto.length) return null;
  const roster = (makeRoster || probeRoster)();
  const enemies = enemiesProto.map((u) => ({ ...u, status: { ...(u.status || {}) } }));
  const startBody = {
    units: [...roster, ...enemies],
    encounter_id: enc.id,
    scenario_id: enc.id,
    ...(enc.modulation ? { modulation: enc.modulation } : {}),
  };
  const start = await http.post('/api/session/start', startBody);
  if (start.status !== 200 && start.status !== 201) {
    return { error: `start ${start.status}` };
  }
  const sessionId = start.body.session_id || start.body.id;
  const st = await http.get('/api/session/state', { session_id: sessionId });
  await http.post('/api/session/end', { session_id: sessionId });
  const tier = st.body && st.body.sistema_tier;
  return {
    sistema_tier: tier && tier.label ? tier.label : null,
    sistema_pressure: st.body ? st.body.sistema_pressure : null,
    floor: enc.floor,
    expected_min: FLOOR_MIN[enc.floor],
  };
}

// ---------------------------------------------------------------------------
// Arm runner: one in-process app, persistent listener, keep-alive fetch.
// 127.0.0.1 explicit (L-074 Windows IPv6 localhost stall).
// ---------------------------------------------------------------------------

async function runArm({ scenario, arm, runs, seedBase, scaling, roster: rosterName, onRun }) {
  const makeRoster = rosterFor(rosterName);
  const enc = encounterFor(scenario);
  if (!enc) throw new Error(`unknown scenario "${scenario}" (not in ENCOUNTERS map)`);
  const armDef = ARMS[arm];
  if (!armDef) throw new Error(`unknown arm "${arm}" (use: ${Object.keys(ARMS).join(' | ')})`);

  const saved = {};
  for (const [k, v] of Object.entries(armDef.env || {})) {
    saved[k] = process.env[k];
    process.env[k] = v;
  }
  const { createApp } = require('../../apps/backend/app');
  const { app, close } = createApp({ databasePath: null });
  const server = await new Promise((resolve, reject) => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
    s.on('error', reject);
  });
  const base = `http://127.0.0.1:${server.address().port}`;
  const toRes = async (r) => ({ status: r.status, body: await r.json().catch(() => ({})) });
  const http = {
    post: (p, body) =>
      fetch(`${base}${p}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body || {}),
      }).then(toRes),
    get: (p, query) => {
      const qs = query ? `?${new URLSearchParams(query)}` : '';
      return fetch(`${base}${p}${qs}`).then(toRes);
    },
  };
  const records = [];
  let fire = null;
  try {
    const enemiesProto = buildScenarioEnemies(scenario, scaling || {});
    if (!enemiesProto || !enemiesProto.length) {
      throw new Error(`scenario "${scenario}" did not yield a YAML roster (anti-#14: no fallback)`);
    }
    // Anti-#14 fire check (one shot, before the batch).
    fire = await fireCheck(http, enc, scaling, makeRoster);
    for (let i = 0; i < runs; i += 1) {
      const seed = `pf-${seedBase + i}`;
      const roster = makeRoster();
      const enemies = enemiesProto.map((u) => ({ ...u, status: { ...(u.status || {}) } }));
      // eslint-disable-next-line no-await-in-loop
      const res = await runEncounter(http, {
        roster,
        enemies,
        scenarioId: scenario,
        seed,
        maxRounds: 160,
        ...(enc.modulation ? { modulation: enc.modulation } : {}),
        ...(enc.reinf ? { collectEvents: ['reinforcement_spawn'] } : {}),
        endSession: true, // #3157 F4: close the session so the log gets session_end
      });
      const spawns = enc.reinf
        ? (res.collectedEvents || []).filter((e) => e && e.action_type === 'reinforcement_spawn')
            .length
        : 0;
      const rec = {
        seed,
        outcome: res.outcome,
        rounds: res.rounds,
        survivors: (res.survivorIds || []).length,
        spawns,
      };
      records.push(rec);
      if (onRun) onRun(rec, i);
    }
    return { records, fire };
  } finally {
    await new Promise((resolve) => server.close(resolve));
    if (typeof close === 'function') await close().catch(() => {});
    for (const [k, v] of Object.entries(saved)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  }
}

// ---------------------------------------------------------------------------
// CLI + report
// ---------------------------------------------------------------------------

function parseArgs(argv) {
  const args = {
    scenario: '',
    arm: '',
    runs: 40,
    seedBase: 60000,
    out: '',
    commit: process.env.GIT_COMMIT || 'unknown',
    aggregate: false,
    // Difficulty overlay (scenario-enemies knobs: countMult/countAdd/hpMult/hpAdd/
    // modAdd/dcAdd) so the OFF baseline sits OFF the win-rate ceiling (the greedy
    // 2-skirmisher probe saturates authored fights ~1.0). Measurement-point choice
    // (L-069), NOT a band ratification. {} (default) = authored difficulty.
    scaling: {},
    // Player roster preset: 'strong' (default, saturating probeRoster) | 'weak'
    // (realistic vulnerable party for a competitive, de-saturated band-verify).
    roster: 'strong',
  };
  for (let i = 2; i < argv.length; i += 1) {
    const tok = argv[i];
    const next = () => argv[(i += 1)];
    if (tok === '--scenario') args.scenario = next();
    else if (tok === '--arm') args.arm = next();
    else if (tok === '--runs') args.runs = Math.max(1, Number(next()));
    else if (tok === '--seed-base') args.seedBase = Number(next());
    else if (tok === '--out') args.out = next();
    else if (tok === '--commit') args.commit = next();
    else if (tok === '--scaling') args.scaling = JSON.parse(next());
    else if (tok === '--roster') args.roster = next();
    else if (tok === '--aggregate') args.aggregate = true;
    else console.warn(`unknown arg: ${tok}`);
  }
  return args;
}

function fmt(x, digits = 2) {
  return x === null || x === undefined || Number.isNaN(x) ? 'n/a' : Number(x).toFixed(digits);
}

function pct(x) {
  return x === null || x === undefined || Number.isNaN(x)
    ? 'n/a'
    : `${(Number(x) * 100).toFixed(1)}%`;
}

// Read every <out>/<scenario>/<arm>/{runs.jsonl, fire.json}.
function readArmRuns(outDir, scenario, arm) {
  const p = path.join(outDir, scenario, arm, 'runs.jsonl');
  if (!fs.existsSync(p)) return null;
  return fs
    .readFileSync(p, 'utf8')
    .split('\n')
    .filter(Boolean)
    .map((l) => JSON.parse(l));
}

function readArmFire(outDir, scenario, arm) {
  const p = path.join(outDir, scenario, arm, 'fire.json');
  if (!fs.existsSync(p)) return null;
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch {
    return null;
  }
}

function aggregateDir(args) {
  const outDir = args.out;
  const bands = loadBands();
  const armNames = Object.keys(ARMS);

  // Per-scenario data.
  const perScenario = {};
  for (const enc of ENCOUNTERS) {
    const armRuns = {};
    const armFire = {};
    for (const arm of armNames) {
      const runs = readArmRuns(outDir, enc.id, arm);
      if (runs) armRuns[arm] = runs;
      const fire = readArmFire(outDir, enc.id, arm);
      if (fire) armFire[arm] = fire;
    }
    if (!Object.keys(armRuns).length) continue;
    const summaries = Object.fromEntries(
      Object.entries(armRuns).map(([a, r]) => [a, aggregateOutcomes(r)]),
    );
    const deltas = {};
    if (armRuns.off && armRuns.off2) deltas.noise = pairDelta(armRuns.off, armRuns.off2);
    if (armRuns.off && armRuns.on) deltas.effect = pairDelta(armRuns.off, armRuns.on);
    perScenario[enc.id] = { enc, summaries, deltas, fire: armFire };
  }

  // Per-class pooled (concat runs across encounters of the same class, per arm).
  const perClass = {};
  for (const enc of ENCOUNTERS) {
    const cls = enc.class;
    if (!perClass[cls]) perClass[cls] = {};
    for (const arm of armNames) {
      const runs = readArmRuns(outDir, enc.id, arm);
      if (!runs) continue;
      if (!perClass[cls][arm]) perClass[cls][arm] = [];
      perClass[cls][arm].push(...runs);
    }
  }
  const classSummaries = {};
  for (const [cls, armRuns] of Object.entries(perClass)) {
    const summaries = Object.fromEntries(
      Object.entries(armRuns).map(([a, r]) => [a, aggregateOutcomes(r)]),
    );
    const verdicts = {};
    for (const [a, s] of Object.entries(summaries)) {
      verdicts[a] = verdictFor(s.win_rate, s.defeat_rate, s.timeout_rate, bands[cls]);
    }
    classSummaries[cls] = { summaries, verdicts, band: bands[cls] || null };
  }

  const report = renderReport({ args, perScenario, classSummaries, bands });
  fs.writeFileSync(
    path.join(outDir, 'summary.json'),
    JSON.stringify({ args, isolated_arms: true, bands, perScenario, classSummaries }, null, 2),
  );
  fs.writeFileSync(path.join(outDir, 'report.md'), report);
  process.stdout.write(`[pressure-floor] aggregated -> ${outDir}\n`);
}

function renderReport({ args, perScenario, classSummaries, bands }) {
  const L = [];
  L.push(`# A2 pressure_tier_floor -- N=${args.runs} band-verify (flag \`${FLAG}\`)`);
  L.push('');
  L.push(
    `Roster \`${args.roster || 'strong'}\` | scaling ${JSON.stringify(args.scaling || {})} | commit \`${args.commit}\` | isolated arms (one process per scenario+arm).`,
  );
  L.push('');
  L.push('## Per-class pooled (flag OFF baseline vs flag ON) vs canonical bands');
  L.push('');
  L.push(
    '| class | band WR / defeat / timeout | arm | n | WR (Wilson CI95) | defeat | timeout | verdict |',
  );
  L.push('| --- | --- | --- | --- | --- | --- | --- | --- |');
  for (const [cls, data] of Object.entries(classSummaries)) {
    const b = data.band || {};
    const bandStr = b.win_rate
      ? `${fmt(b.win_rate[0])}-${fmt(b.win_rate[1])} / ${fmt(b.defeat_rate[0])}-${fmt(
          b.defeat_rate[1],
        )} / ${fmt(b.timeout_rate[0])}-${fmt(b.timeout_rate[1])}`
      : 'n/a';
    for (const arm of ['off', 'off2', 'on']) {
      const s = data.summaries[arm];
      if (!s) continue;
      const v = data.verdicts[arm];
      L.push(
        `| ${cls} | ${bandStr} | ${arm} | ${s.n} | ${pct(s.win_rate)} [${pct(s.win_ci95[0])}, ${pct(
          s.win_ci95[1],
        )}] | ${pct(s.defeat_rate)} | ${pct(s.timeout_rate)} | ${v ? v.verdict : 'n/a'} |`,
      );
    }
  }
  L.push('');
  L.push('## Per-encounter outcomes + paired delta (same seeds)');
  L.push('');
  L.push(
    '| encounter | class | floor | arm | n | WR | defeat | timeout | rounds | spawns | on-off WR delta | flips L->W / W->L |',
  );
  L.push('| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |');
  for (const [scn, data] of Object.entries(perScenario)) {
    const enc = data.enc;
    for (const arm of ['off', 'off2', 'on']) {
      const s = data.summaries[arm];
      if (!s) continue;
      let deltaStr = '';
      let flipStr = '';
      if (arm === 'on' && data.deltas.effect) {
        deltaStr = fmt(data.deltas.effect.win_rate_delta);
        flipStr = `${data.deltas.effect.flips.loss_to_win} / ${data.deltas.effect.flips.win_to_loss}`;
      } else if (arm === 'off2' && data.deltas.noise) {
        deltaStr = `(noise ${fmt(data.deltas.noise.win_rate_delta)})`;
        flipStr = `${data.deltas.noise.flips.loss_to_win} / ${data.deltas.noise.flips.win_to_loss}`;
      }
      L.push(
        `| ${scn} | ${enc.class} | ${enc.floor} | ${arm} | ${s.n} | ${pct(s.win_rate)} | ${pct(
          s.defeat_rate,
        )} | ${pct(s.timeout_rate)} | ${fmt(s.rounds.mean, 1)} | ${fmt(s.spawns.mean, 1)} | ${deltaStr} | ${flipStr} |`,
      );
    }
  }
  L.push('');
  L.push('## Fire check (anti-#14): the floor lifts the Sistema tier through the real backend');
  L.push('');
  L.push(
    '| encounter | floor | expected min pressure | off tier (pressure) | on tier (pressure) |',
  );
  L.push('| --- | --- | --- | --- | --- |');
  for (const [scn, data] of Object.entries(perScenario)) {
    const offF = data.fire.off || data.fire.off2;
    const onF = data.fire.on;
    L.push(
      `| ${scn} | ${data.enc.floor} | ${offF ? offF.expected_min : 'n/a'} | ${
        offF ? `${offF.sistema_tier} (${offF.sistema_pressure})` : 'n/a'
      } | ${onF ? `${onF.sistema_tier} (${onF.sistema_pressure})` : 'n/a'} |`,
    );
  }
  L.push('');
  L.push('Read the on-off WR delta AGAINST the off2-off noise floor: the session seed pins the');
  L.push('start RNG but residual non-seeded randomness keeps same-seed replays from being');
  L.push('identical, so a real floor effect must clear the noise floor.');
  L.push('');
  L.push('Caveat: the greedy 2-skirmisher probe saturates authored fights, so the OFF absolute');
  L.push('win rate sits above the calibrated damage_curves bands. The ratifiable signal is the');
  L.push('PAIRED on-vs-off delta + the fire-check tier lift; the absolute band verdict carries');
  L.push('the saturation caveat.');
  L.push('');
  L.push(
    'Evidence only -- the flag flip + any floor re-tune is a master-dd verdict (L-069, spec sez. Gate balance).',
  );
  L.push('');
  return L.join('\n');
}

async function main() {
  // Hermetic gates (full-loop-batch pattern): no orchestrator spawn, no status poll.
  process.env.IDEA_ENGINE_STUB_ORCHESTRATOR = process.env.IDEA_ENGINE_STUB_ORCHESTRATOR || '1';
  process.env.IDEA_ENGINE_DISABLE_STATUS_REFRESH =
    process.env.IDEA_ENGINE_DISABLE_STATUS_REFRESH || '1';
  const args = parseArgs(process.argv);

  if (args.aggregate) {
    if (!args.out) {
      console.error('--aggregate requires --out <dir> (the per-(scenario,arm) runs.jsonl root)');
      process.exitCode = 1;
      return;
    }
    return aggregateDir(args);
  }

  if (!args.scenario || !args.arm) {
    console.error('run mode requires --scenario <id> --arm <off|off2|on> (or --aggregate)');
    process.exitCode = 1;
    return;
  }
  // The probe owns the flag for the whole batch (every arm pins it explicitly):
  // a pre-set env would be silently masked -> refuse (spec-i pattern).
  if (process.env[FLAG] !== undefined) {
    console.error(
      `${FLAG} is already set in the environment -- unset it (the probe owns the toggle)`,
    );
    process.exitCode = 1;
    return;
  }
  const outDir = args.out || path.join('reports', 'sim', 'a2-pressure-floor-probe');
  const dir = path.join(outDir, args.scenario, args.arm);
  fs.mkdirSync(dir, { recursive: true });
  const { records, fire } = await runArm({
    scenario: args.scenario,
    arm: args.arm,
    runs: args.runs,
    seedBase: args.seedBase,
    scaling: args.scaling,
    roster: args.roster,
    onRun: (rec, i) =>
      process.stdout.write(
        `[pressure-floor] ${args.scenario} ${args.arm} ${i + 1}/${args.runs} seed=${rec.seed} outcome=${rec.outcome} rounds=${rec.rounds}${rec.spawns ? ` spawns=${rec.spawns}` : ''}\n`,
      ),
  });
  fs.writeFileSync(path.join(dir, 'runs.jsonl'), records.map((r) => JSON.stringify(r)).join('\n'));
  fs.writeFileSync(path.join(dir, 'fire.json'), JSON.stringify(fire, null, 2));
  fs.writeFileSync(
    path.join(dir, 'summary.json'),
    JSON.stringify(
      { scenario: args.scenario, arm: args.arm, args, fire, summary: aggregateOutcomes(records) },
      null,
      2,
    ),
  );
  process.stdout.write(
    `[pressure-floor] ${args.scenario}/${args.arm} done -> ${dir} (fire: ${fire ? `${fire.sistema_tier} @ ${fire.sistema_pressure}` : 'n/a'})\n`,
  );
}

module.exports = {
  ENCOUNTERS,
  ARMS,
  FLOOR_MIN,
  loadBands,
  verdictFor,
  aggregateOutcomes,
  encounterFor,
};

if (require.main === module) {
  main().catch((err) => {
    console.error('[pressure-floor-probe] FATAL:', err && err.stack ? err.stack : err);
    process.exitCode = 1;
  });
}
