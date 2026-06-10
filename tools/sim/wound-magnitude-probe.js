'use strict';
// OD-058 D2 N=40 magnitude probe (issue #2531, gate D2 "N=40 post-build: magnitudo X
// per tier").
//
// Measures the per-tier / per-location combat impact of the woundSystem maluses
// (SPEC-D2 §8.1: -1 / -1 / -2 lieve/media/grave) now that the flag-gated read-apply
// (WOUND_LOCATION_V2) actually consumes computeWoundMaluses. Without the read-apply a
// seeded wound changed NOTHING in combat -- the staged engine #2535 had no consumer
// (anti-pattern #14); this probe runs each wound arm with the flag ON and seeds the
// wound on EVERY player unit via the /start status passthrough.
//
// Arms (same seeds across all arms, paired; control replicate = noise floor):
//   control    -- flag OFF, no wounds (status quo baseline);
//   control2   -- control replicate (per-seed noise floor);
//   atk_lieve  -- arti_anteriori lieve  (attack_mod -1)  [media = same -1 by design,
//                 lieve/media differ only in persistence -> one in-encounter arm];
//   atk_grave  -- arti_anteriori grave  (attack_mod -2);
//   def_grave  -- torso grave           (defense_mod -2, player easier to hit);
//   acc_lieve  -- testa lieve           (accuracy -1, folded into to-hit);
//   ap_grave   -- testa grave           (ap -1 at refill, 2-AP budget -> 1);
//   mob_grave  -- arti_posteriori grave (mobility -2: NO engine consumer, expected
//                 == noise floor; the arm DOCUMENTS the inert stat).
//
// GOVERNANCE (L-069): evidence-only. The magnitude ratification (and the live-cutover
// flip of WOUND_LOCATION_V2) is master-dd's verdict.
//
// Usage:
//   node tools/sim/wound-magnitude-probe.js --runs 40 --seed-base 42000 \
//     --out reports/sim/wound-magnitude-n40-<date>

const fs = require('node:fs');
const path = require('node:path');
const { runEncounter } = require('./combat-adapter');
const { buildScenarioEnemies } = require('./scenario-enemies');
const { aggregateActionEconomy, pairDelta, probeRoster } = require('./overcharge-probe');
const { woundEffect } = require('../../apps/backend/services/combat/woundSystem');

// Arm spec: wound = { location, severity } | null; flag = WOUND_LOCATION_V2 state.
const ARMS = {
  control: { wound: null, flag: false },
  control2: { wound: null, flag: false },
  atk_lieve: { wound: { location: 'arti_anteriori', severity: 'lieve' }, flag: true },
  atk_grave: { wound: { location: 'arti_anteriori', severity: 'grave' }, flag: true },
  def_grave: { wound: { location: 'torso', severity: 'grave' }, flag: true },
  acc_lieve: { wound: { location: 'testa', severity: 'lieve' }, flag: true },
  ap_grave: { wound: { location: 'testa', severity: 'grave' }, flag: true },
  mob_grave: { wound: { location: 'arti_posteriori', severity: 'grave' }, flag: true },
};

// Wound entries for an arm: stat/malus derived by woundSystem.woundEffect (never
// hand-rolled), shaped exactly like applyWound writes them. Null for control arms.
function armWoundEntries(arm) {
  if (!arm || !arm.wound) return null;
  const { location, severity } = arm.wound;
  const { stat, malus } = woundEffect(location, severity);
  return [{ location, severity, stat, malus }];
}

async function runArm({ scenario, runs, seedBase, arm, scaling, onRun }) {
  const { createApp } = require('../../apps/backend/app');
  const prevFlag = process.env.WOUND_LOCATION_V2;
  if (arm.flag) process.env.WOUND_LOCATION_V2 = 'true';
  else delete process.env.WOUND_LOCATION_V2;
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
  try {
    const enemiesProto = buildScenarioEnemies(scenario, scaling || {});
    if (!enemiesProto || !enemiesProto.length) {
      throw new Error(`scenario "${scenario}" did not yield a YAML roster (anti-#14: no fallback)`);
    }
    const woundEntries = armWoundEntries(arm);
    for (let i = 0; i < runs; i += 1) {
      const seed = `wd-${seedBase + i}`;
      // Seed the wound on EVERY player unit (clear, symmetric signal). The /start
      // normaliseUnit copies status verbatim, so the entries reach the session.
      const roster = probeRoster().map((u) =>
        woundEntries
          ? { ...u, status: { ...u.status, wounds: woundEntries.map((w) => ({ ...w })) } }
          : u,
      );
      const enemies = enemiesProto.map((u) => ({ ...u, status: { ...(u.status || {}) } }));
      // eslint-disable-next-line no-await-in-loop
      const res = await runEncounter(http, {
        roster,
        enemies,
        scenarioId: scenario,
        seed,
        maxRounds: 160,
      });
      const rec = {
        seed,
        outcome: res.outcome,
        rounds: res.rounds,
        playerAttacks: res.playerAttacks,
        overchargeUses: res.overchargeUses,
        survivors: (res.survivorIds || []).length,
      };
      records.push(rec);
      if (onRun) onRun(rec, i);
    }
    return records;
  } finally {
    await new Promise((resolve) => server.close(resolve));
    if (typeof close === 'function') await close().catch(() => {});
    if (prevFlag === undefined) delete process.env.WOUND_LOCATION_V2;
    else process.env.WOUND_LOCATION_V2 = prevFlag;
  }
}

function parseArgs(argv) {
  const args = {
    runs: 40,
    seedBase: 42000,
    scenario: 'enc_hardcore_reinf_01',
    out: '',
    commit: process.env.GIT_COMMIT || 'unknown',
    // Same measurement-point overlay as the D1 probe: baseline 0.90, room to move
    // in BOTH directions (L-069: measurement point, not a ratified band).
    scaling: { countAdd: 6, hpAdd: 4, modAdd: 6, dcAdd: 2 },
  };
  for (let i = 2; i < argv.length; i += 1) {
    const tok = argv[i];
    const next = () => argv[(i += 1)];
    if (tok === '--runs') args.runs = Math.max(1, Number(next()));
    else if (tok === '--seed-base') args.seedBase = Number(next());
    else if (tok === '--scenario') args.scenario = next();
    else if (tok === '--out') args.out = next();
    else if (tok === '--commit') args.commit = next();
    else if (tok === '--scaling') args.scaling = JSON.parse(next());
  }
  return args;
}

function fmt(x, digits = 2) {
  return x === null || x === undefined || Number.isNaN(x) ? 'n/a' : Number(x).toFixed(digits);
}

function renderReport({ args, summaries, deltas }) {
  const lines = [];
  lines.push(`# Wound magnitude probe (OD-058 D2, N=${args.runs})`);
  lines.push('');
  lines.push(
    `Scenario \`${args.scenario}\` | scaling ${JSON.stringify(args.scaling)} | roster 2x skirmisher ap:2, wound su OGNI player unit | commit \`${args.commit}\` | seed base ${args.seedBase}.`,
  );
  lines.push('');
  lines.push('| arm | n | win rate (Wilson CI95) | rounds | survivors |');
  lines.push('| --- | --- | --- | --- | --- |');
  for (const [arm, s] of Object.entries(summaries)) {
    lines.push(
      `| ${arm} | ${s.n} | ${fmt(s.win_rate)} [${fmt(s.win_ci95[0])}, ${fmt(s.win_ci95[1])}] | ${fmt(
        s.rounds.mean,
        1,
      )} +/- ${fmt(s.rounds.sd, 1)} | ${fmt(s.survivors.mean, 2)} |`,
    );
  }
  lines.push('');
  lines.push('## Paired deltas vs control (same seeds)');
  lines.push('');
  lines.push('| arm | win-rate delta | rounds delta (CI95) | flips L->W / W->L |');
  lines.push('| --- | --- | --- | --- |');
  for (const [name, d] of Object.entries(deltas)) {
    lines.push(
      `| ${name} | ${fmt(d.win_rate_delta)} | ${fmt(d.rounds_delta.mean, 1)} [${fmt(
        d.rounds_delta.ci95[0],
        1,
      )}, ${fmt(d.rounds_delta.ci95[1], 1)}] | ${d.flips.loss_to_win} / ${d.flips.win_to_loss} |`,
    );
  }
  lines.push('');
  lines.push('Leggere ogni arm contro la riga noise-floor (control2). mob_grave atteso ==');
  lines.push('floor: mobility non ha consumer engine (stat inerte, documentata).');
  lines.push('Evidence only -- ratifica magnitudo + flip flag = master-dd (L-069).');
  lines.push('');
  return lines.join('\n');
}

async function main() {
  process.env.IDEA_ENGINE_STUB_ORCHESTRATOR = process.env.IDEA_ENGINE_STUB_ORCHESTRATOR || '1';
  process.env.IDEA_ENGINE_DISABLE_STATUS_REFRESH =
    process.env.IDEA_ENGINE_DISABLE_STATUS_REFRESH || '1';
  const args = parseArgs(process.argv);
  const outDir = args.out || path.join('reports', 'sim', 'wound-magnitude-probe');
  const armRuns = {};
  for (const [armName, arm] of Object.entries(ARMS)) {
    const dir = path.join(outDir, armName);
    fs.mkdirSync(dir, { recursive: true });
    // eslint-disable-next-line no-await-in-loop
    const runs = await runArm({
      scenario: args.scenario,
      runs: args.runs,
      seedBase: args.seedBase,
      arm,
      scaling: args.scaling,
      onRun: (rec, i) =>
        process.stdout.write(
          `[wound-probe] ${armName} ${i + 1}/${args.runs} seed=${rec.seed} outcome=${rec.outcome}\n`,
        ),
    });
    armRuns[armName] = runs;
    fs.writeFileSync(path.join(dir, 'runs.jsonl'), runs.map((r) => JSON.stringify(r)).join('\n'));
    fs.writeFileSync(
      path.join(dir, 'summary.json'),
      JSON.stringify({ arm: armName, args, summary: aggregateActionEconomy(runs) }, null, 2),
    );
  }
  const summaries = Object.fromEntries(
    Object.entries(armRuns).map(([arm, runs]) => [arm, aggregateActionEconomy(runs)]),
  );
  const deltas = {};
  for (const armName of Object.keys(ARMS)) {
    if (armName === 'control') continue;
    const label = armName === 'control2' ? 'control2 (noise floor)' : armName;
    deltas[label] = pairDelta(armRuns.control, armRuns[armName]);
  }
  fs.writeFileSync(
    path.join(outDir, 'summary.json'),
    JSON.stringify({ args, summaries, deltas }, null, 2),
  );
  fs.writeFileSync(path.join(outDir, 'report.md'), renderReport({ args, summaries, deltas }));
  process.stdout.write(`[wound-probe] done -> ${outDir}\n`);
}

module.exports = { ARMS, armWoundEntries };

if (require.main === module) {
  main().catch((err) => {
    console.error('[wound-probe] FATAL:', err && err.stack ? err.stack : err);
    process.exitCode = 1;
  });
}
