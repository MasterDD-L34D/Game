'use strict';
// W5 D8 -- chain-lightning FIRE COUNTER (the decisive non-exercise proof).
//
// The graded A/B (d8-chain-graded-probe.js) can only observe a DELTA; at a single-replicate noise
// floor a sub-1% same-seed drift is indistinguishable from a real effect. This script settles it
// DIRECTLY: it counts how many times the terrain-reaction system -- and specifically the chain --
// actually fires across N flag-ON hardcore encounters. If the count is 0, the flag gates dead code
// in the sim and ANY graded delta is noise by construction.
//
// Instrumentation: the chain lives behind session.js's electrified branch, which calls
// terrainReactions.chainLightningStrike only after reactTile returns an `electrified` state. We
// patch the terrainReactions exports BEFORE app.js (-> session.js) is required, so session.js's
// destructured bindings capture the counting wrappers (Node module-cache: the destructure reads the
// patched property value at first require). No prod code changes; flag ON so the branch is reachable.
//
// EXPECTED (recon): 0 across the board. reactTile is never even called -- the terrain block guards on
// `element && TERRAIN_ELEMENTS.includes(element)`, and neither faction ever emits a mapped elemental
// channel: the player policy (combat-policy) sends no channel (-> 'fisico'), and the enemy AI
// (declareSistemaIntents.pickExploitChannel) can only pick psionico/fisico/ionico from
// ARCHETYPE_VULN_CHANNEL -- never acqua or elettrico/folgore. So tile_state_map never gets a water
// tile, nothing ever electrifies, and the chain is structurally unreachable.
//
// In-process supertest (createApp, NO prod port, node 22). Result printed as a single sentinel line
// `D8_FIRE_COUNT=<json>` so it survives the backend's stdout boot logs (grep it out).
//
// Usage: node tools/sim/d8-chain-fire-count.js [N]   (default 40)

// -- patch BEFORE any require of app.js/session.js --
const tr = require('../../apps/backend/services/combat/terrainReactions');
const counters = {
  reactTile_calls: 0,
  reactTile_mapped_hits: 0,
  electrify_reactions: 0,
  chain_branch_calls: 0,
  chain_spreads: 0,
};
const origReact = tr.reactTile;
tr.reactTile = function (cur, inc) {
  counters.reactTile_calls += 1;
  const r = origReact(cur, inc);
  if (r && Array.isArray(r.effects) && r.effects.length && !r.effects.includes('no_reaction')) {
    counters.reactTile_mapped_hits += 1;
  }
  if (r && r.nextState && r.nextState.type === 'electrified') counters.electrify_reactions += 1;
  return r;
};
const origChain = tr.chainLightningStrike;
tr.chainLightningStrike = function (...a) {
  counters.chain_branch_calls += 1;
  const r = origChain(...a);
  if (r && Array.isArray(r.electrified_tiles) && r.electrified_tiles.length)
    counters.chain_spreads += 1;
  return r;
};

process.env.IDEA_ENGINE_DISABLE_STATUS_REFRESH = '1';
process.env.IDEA_ENGINE_STUB_ORCHESTRATOR = '1';
process.env.TERRAIN_CHAIN_LIGHTNING_ENABLED = 'true'; // flag ON so the chain branch is reachable

const request = require('supertest');
const { createApp } = require('../../apps/backend/app');
const { runEncounter } = require('./combat-adapter');
const { buildScenarioEnemies } = require('./scenario-enemies');
const { probeRoster } = require('./overcharge-probe');
const { EFFECTS } = require('./spec-i-gates-probe');

const MP = EFFECTS.er6; // busiest realistic fight = max enemy channel-attacks (the best shot at a reaction)

const http = (app) => ({
  post: (p, b) =>
    request(app)
      .post(p)
      .send(b)
      .then((r) => ({ status: r.status, body: r.body })),
  get: (p, q) =>
    request(app)
      .get(p)
      .query(q || {})
      .then((r) => ({ status: r.status, body: r.body })),
});

async function main() {
  const N = Math.max(1, Number(process.argv[2]) || 40);
  const { app, close } = createApp({ databasePath: null });
  try {
    const h = http(app);
    const proto = buildScenarioEnemies(MP.scenario, {});
    if (!proto || !proto.length)
      throw new Error(`measurement point "${MP.scenario}" yielded no roster`);
    for (let i = 0; i < N; i += 1) {
      const roster = probeRoster();
      const enemies = proto.map((u) => ({ ...u, status: { ...(u.status || {}) } }));
      // eslint-disable-next-line no-await-in-loop
      await runEncounter(h, {
        roster,
        enemies,
        scenarioId: MP.scenario,
        biomeId: MP.biomeId,
        seed: `d8fire-${8000 + i}`,
        maxRounds: 160,
        pressureStart: MP.pressureStart,
        modulation: 'duo_hardcore',
      });
    }
  } finally {
    if (typeof close === 'function') await close().catch(() => {});
  }
  const nonExercised = counters.chain_spreads === 0 && counters.chain_branch_calls === 0;
  process.stdout.write(
    `D8_FIRE_COUNT=${JSON.stringify({
      N,
      scenario: MP.scenario,
      biome: MP.biomeId,
      flag: process.env.TERRAIN_CHAIN_LIGHTNING_ENABLED,
      ...counters,
      chain_non_exercised: nonExercised,
      node: process.version,
    })}\n`,
  );
}

if (require.main === module) {
  main().catch((e) => {
    console.error('[d8-chain-fire-count] FATAL:', e && e.stack ? e.stack : e);
    process.exitCode = 1;
  });
}
