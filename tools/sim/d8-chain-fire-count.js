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

// Positive control for the INSTRUMENT (closes the false-null hole): prove the patched wrappers
// actually intercept session.js's LIVE calls -- otherwise a monkeypatch that failed to bind would
// ALSO report 0, masking a broken instrument as a real null. Reuse the terrainReactionsWire
// acqua->folgore sequence: p1 (2 AP, mod 99 = always hit) puddles the sis tile with an acqua attack
// then electrifies it with folgore in the SAME turn -> reactTile fires twice AND the electrified
// branch calls chainLightningStrike. If either counter fails to move, THROW (a 0 measurement below
// would be untrustworthy). Counters are reset afterwards so this does not pollute the N=40 count.
async function selfTestInstrument(h) {
  const before = { ...counters };
  const priorRound = process.env.USE_ROUND_MODEL;
  process.env.USE_ROUND_MODEL = 'true'; // round model (matches the wire test); restored below
  try {
    const units = [
      {
        id: 'p1',
        species: 'velox',
        job: 'skirmisher',
        hp: 10,
        max_hp: 10,
        ap: 2,
        attack_range: 2,
        initiative: 14,
        position: { x: 2, y: 2 },
        controlled_by: 'player',
        mod: 99,
        status: {},
      },
      {
        id: 'sis',
        species: 'carapax',
        job: 'vanguard',
        hp: 100,
        max_hp: 100,
        ap: 2,
        attack_range: 1,
        initiative: 10,
        position: { x: 3, y: 2 },
        controlled_by: 'sistema',
        status: {},
      },
    ];
    const start = await h.post('/api/session/start', { units });
    const sid = start.body.session_id || start.body.id;
    await h.post('/api/session/action', {
      session_id: sid,
      actor_id: 'p1',
      action_type: 'attack',
      target_id: 'sis',
      channel: 'acqua',
    });
    const strike = await h.post('/api/session/action', {
      session_id: sid,
      actor_id: 'p1',
      action_type: 'attack',
      target_id: 'sis',
      channel: 'folgore',
    });
    const electrified =
      strike.body &&
      strike.body.terrain_reaction &&
      strike.body.terrain_reaction.new_state === 'electrified';
    const dReact = counters.reactTile_calls - before.reactTile_calls;
    const dChain = counters.chain_branch_calls - before.chain_branch_calls;
    if (dReact <= 0 || dChain <= 0 || !electrified) {
      throw new Error(
        `instrument self-test FAILED: reactTile+${dReact} chain_branch+${dChain} electrified=${electrified} -- the monkeypatch did NOT intercept session.js, so a 0 measurement would be a FALSE null`,
      );
    }
    process.stderr.write(
      `[d8-chain-fire-count] instrument self-test OK: reactTile+${dReact}, chain_branch+${dChain}, electrified -> patch binds, a 0 measurement is a REAL null\n`,
    );
  } finally {
    if (priorRound === undefined) delete process.env.USE_ROUND_MODEL;
    else process.env.USE_ROUND_MODEL = priorRound;
    for (const k of Object.keys(counters)) counters[k] = 0; // reset: exclude the self-test from the measurement
  }
}

async function main() {
  const N = Math.max(1, Number(process.argv[2]) || 40);
  const { app, close } = createApp({ databasePath: null });
  try {
    const h = http(app);
    await selfTestInstrument(h); // fail loud if the instrument cannot count > 0
    const proto = buildScenarioEnemies(MP.scenario, {});
    if (!proto || !proto.length)
      throw new Error(`measurement point "${MP.scenario}" yielded no roster`);
    for (let i = 0; i < N; i += 1) {
      const roster = probeRoster();
      const enemies = proto.map((u) => ({ ...u, status: { ...(u.status || {}) } }));
      // eslint-disable-next-line no-await-in-loop
      const res = await runEncounter(h, {
        roster,
        enemies,
        scenarioId: MP.scenario,
        biomeId: MP.biomeId,
        seed: `d8fire-${8000 + i}`,
        maxRounds: 160,
        pressureStart: MP.pressureStart,
        modulation: 'duo_hardcore',
        endSession: true, // #3157 F4: close the session so the log gets session_end
      });
      // Codex #3136 P2: runEncounter returns { outcome:'error' } instead of throwing on a
      // /start or wiring failure. Aborting here prevents a harness/setup error from silently
      // producing all-zero counters and a FALSE `chain_non_exercised: true` proof.
      if (!res || res.outcome === 'error') {
        throw new Error(
          `d8-chain-fire-count: encounter ${i} failed (outcome=${res && res.outcome}) -- refusing to emit a 0-fire proof on a harness error: ${JSON.stringify(res && res.error)}`,
        );
      }
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
