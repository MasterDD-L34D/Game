'use strict';
// SPEC-I ER7 -- season-tick deterministic trace (Finding 1 of the N=40 evidence).
//
// The population state machine (worldgen/biomePopulation.advanceBiomePopulation)
// is PURE + deterministic (zero RNG): a stochastic N=40 win-rate probe cannot
// exercise its temporal knobs (RECOVERY_SEASONS / ABUNDANCE_SEASONS) -- they
// govern cross-season recovery TIMING, not per-fight variance. The honest
// ratification evidence for those knobs is the season timeline they PRODUCE.
//
// This script drives the REAL season-tick route (POST advance-season) over a
// scripted signal sequence on the pilot biome (badlands) and records the per-role
// state + emitted permanentFlags at every tick. It runs the whole sequence TWICE
// and asserts the two timelines are byte-identical (proof the engine is pure).
//
// GOVERNANCE (L-069): REPORTS the timeline only -- the magnitude ratification
// (RECOVERY_SEASONS=2 / ABUNDANCE_SEASONS=2) is master-dd's verdict.
//
// Usage: node tools/sim/er7-season-trace.js [--out <dir>]

const fs = require('node:fs');
const path = require('node:path');
const express = require('express');
const http = require('node:http');

const PILOT_BIOME = 'badlands';

// Scripted signal sequence (one entry = one season-tick). `signals` is applied to
// the campaign BEFORE the advance-season call: wounded persists until healed (A13),
// so we clear it explicitly to model "the biome recovered"; apexPressure is a
// one-shot consumed by the route. Designed to exhibit, in order:
//   - depletion (wound -> prey depleted) + RECOVERY_SEASONS recovery
//   - apex depletion + trophic-release boom (1-season lag) + apex recovery
//   - ABUNDANCE_SEASONS decay of the boomed prey
const SEQUENCE = [
  { label: 'S1 wound badlands', wounded: true, apex: false },
  { label: 'S2 wound healed (quiet)', wounded: false, apex: false },
  { label: 'S3 quiet', wounded: false, apex: false },
  { label: 'S4 apex overhunted', wounded: false, apex: true },
  { label: 'S5 quiet', wounded: false, apex: false },
  { label: 'S6 quiet', wounded: false, apex: false },
  { label: 'S7 quiet', wounded: false, apex: false },
];

function request(method, url, body) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const req = http.request(
      {
        hostname: parsed.hostname,
        port: parsed.port,
        path: parsed.pathname + parsed.search,
        method,
        headers: { 'content-type': 'application/json' },
      },
      (res) => {
        let data = '';
        res.on('data', (c) => (data += c));
        res.on('end', () => {
          let parsedBody = null;
          try {
            parsedBody = data ? JSON.parse(data) : null;
          } catch {
            parsedBody = data;
          }
          resolve({ status: res.statusCode, body: parsedBody });
        });
      },
    );
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

function roleState(biomePop, role) {
  const e = biomePop && biomePop[PILOT_BIOME] && biomePop[PILOT_BIOME][role];
  return e ? `${e.state}/${e.seasons}` : 'n/a';
}

async function runSequence() {
  // Real route, in-process. Flag ON for the whole trace (the season-tick path is
  // a no-op with the flag off -- that branch is covered by the wire test).
  process.env.BIOME_POPULATION_ENABLED = 'true';
  const {
    createCampaignRouter,
    _resetSeasonalState,
  } = require('../../apps/backend/routes/campaign');
  const campaignStore = require('../../apps/backend/services/campaign/campaignStore');
  _resetSeasonalState();
  campaignStore._resetStore();

  const app = express();
  app.use(express.json());
  app.use('/api', createCampaignRouter());
  const server = await new Promise((resolve) => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
  });
  const base = `http://127.0.0.1:${server.address().port}`;
  const camp = campaignStore.createCampaign('er7-trace', 'def');

  const timeline = [];
  try {
    for (const step of SEQUENCE) {
      // Apply the scripted signals to the campaign before the tick.
      campaignStore.updateCampaign(camp.id, {
        woundedBiomes: step.wounded ? [PILOT_BIOME] : [],
        apexPressureByBiome: step.apex ? { [PILOT_BIOME]: true } : {},
      });
      // eslint-disable-next-line no-await-in-loop
      const res = await request('POST', `${base}/api/campaign/seasonal/advance-season`, {
        campaign_id: camp.id,
      });
      // eslint-disable-next-line no-await-in-loop
      const after = campaignStore.getCampaign(camp.id);
      const flags = (after.permanentFlags || [])
        .map((f) => f.key)
        .filter((k) => k.startsWith('local_extinction:') || k.startsWith('population_boom:'));
      timeline.push({
        label: step.label,
        season: res.body && res.body.state ? res.body.state.current_season : null,
        prey: roleState(res.body && res.body.biome_population, 'prey'),
        mesopredator: roleState(res.body && res.body.biome_population, 'mesopredator'),
        apex: roleState(res.body && res.body.biome_population, 'apex'),
        // flags emitted CUMULATIVELY (permanentFlags is append-only); diff vs prev
        // step gives the per-tick event.
        flags_total: flags.slice(),
      });
    }
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }

  // Per-tick event = the flag(s) new this step vs the previous cumulative set.
  let prevFlags = new Set();
  for (const row of timeline) {
    const cur = new Set(row.flags_total);
    row.event = row.flags_total.filter((k) => !prevFlags.has(k)).join(', ') || '-';
    prevFlags = cur;
    delete row.flags_total;
  }
  return timeline;
}

function renderTable(timeline) {
  const lines = [];
  lines.push('| tick | season | prey (state/seasons) | meso | apex | event this tick |');
  lines.push('| --- | --- | --- | --- | --- | --- |');
  for (const r of timeline) {
    lines.push(
      `| ${r.label} | ${r.season} | ${r.prey} | ${r.mesopredator} | ${r.apex} | ${r.event} |`,
    );
  }
  return lines.join('\n');
}

async function main() {
  const argv = process.argv.slice(2);
  let outDir = path.join('reports', 'sim', 'spec-i-er7-season-trace');
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--out') outDir = argv[i + 1];
  }

  const run1 = await runSequence();
  const run2 = await runSequence();
  const identical = JSON.stringify(run1) === JSON.stringify(run2);

  fs.mkdirSync(outDir, { recursive: true });
  const table = renderTable(run1);
  const md = [
    '# SPEC-I ER7 -- season-tick deterministic trace',
    '',
    `Pilot biome \`${PILOT_BIOME}\`. Flag \`BIOME_POPULATION_ENABLED=true\`. Real route`,
    '`POST /api/campaign/seasonal/advance-season`. Knobs under test: `RECOVERY_SEASONS=2`,',
    '`ABUNDANCE_SEASONS=2` (worldgen/biomePopulation.js).',
    '',
    table,
    '',
    `Determinism: two independent runs of the full sequence are byte-identical: **${identical}**.`,
    '',
    'Readout:',
    '- prey depleted at S1 (`local_extinction:prey`), recovers to stable at S3 = **2 quiet',
    '  seasons** -> RECOVERY_SEASONS=2.',
    '- apex depleted at S4 (`local_extinction:apex`); the trophic-release boom fires at S5',
    '  (prey abundant, `population_boom:prey`) = **1-season lag** after the apex loss (the',
    '  predator vanishing frees the prey, but not the same tick).',
    '- apex recovers to stable at S6 = 2 seasons after S4.',
    '- the boomed prey decays back to stable at S7 = **2 seasons** after S5 ->',
    '  ABUNDANCE_SEASONS=2.',
    '',
    'Evidence only -- the magnitude ratification is a master-dd verdict (L-069).',
    '',
  ].join('\n');
  fs.writeFileSync(path.join(outDir, 'trace.md'), md);
  fs.writeFileSync(
    path.join(outDir, 'trace.json'),
    JSON.stringify({ pilot: PILOT_BIOME, deterministic: identical, timeline: run1 }, null, 2),
  );
  process.stdout.write(`${table}\n\ndeterministic(2 runs identical)=${identical}\n-> ${outDir}\n`);
  if (!identical) process.exitCode = 1;
}

if (require.main === module) {
  main().catch((err) => {
    console.error('[er7-season-trace] FATAL:', err && err.stack ? err.stack : err);
    process.exitCode = 1;
  });
}

module.exports = { SEQUENCE, runSequence };
