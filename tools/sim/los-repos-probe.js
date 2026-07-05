'use strict';
// LOS repositioning isolation probe (probe v2) -- the CORRECT control for the
// stepToRegainLos repositioning heuristic. Fixes the two measurement defects an
// adversarial (SDMG) falsification found in probe v1 (tools/sim/los-n-probe.js):
//
//   Defect 1 -- WRONG CONTROL. v1 toggled COMBAT_LOS_ENABLED (flag ON vs OFF).
//   Flag OFF removes the LOS constraint ENTIRELY (free shots through walls), so
//   the win-rate gap measures the COST of the LOS constraint, not the VALUE of
//   the repositioning heuristic. This probe holds LOS *ON in both arms* and
//   toggles ONLY the repositioning step: repos-ON = real stepToRegainLos;
//   repos-OFF = the same helper stubbed to always return null (the dumb
//   pre-repositioning fallback -> selectPlayerAction's plain stepToward).
//
//   Defect 2 -- TURN-STARVED FIXTURE. In v1's 3v3 only ONE roster unit ever
//   acted across all rounds. Root cause (ground-truthed, not inferred):
//     * turn_order sorts by initiative desc (sessionHelpers.buildTurnOrder);
//       all 3 players share initiative so turn_order[0] is the permanent head.
//     * The player POST /action handler (routes/session.js ~2861) NEVER advances
//       session.active_unit. The only writer is advanceThroughAiTurns
//       (routes/session.js ~2097), which BREAKS the moment the active unit is a
//       player (line ~2087: controlled_by !== 'sistema'). /turn/end ->
//       handleTurnEndViaRound resolves the whole sistema round as a batch but
//       also never re-points active_unit off the player.
//     * Net: active_unit is pinned to turn_order[0] for the entire fight; a v1
//       adapter loop that only acts on active_unit drives that ONE unit forever.
//   FIX: the /action handler does NOT gate on active_unit (verified: a
//   non-active player unit's attack returns 200 and lands damage). So this probe
//   drives EVERY live player unit each round (AP-gated), not just active_unit --
//   >=2-3 units genuinely act, so each unit's repositioning is exercised.
//
// Paired-seed (same seed both arms), in-process (supertest createApp, NO prod
// DB). Per-arm CHILD PROCESS: the repos-OFF stub must be installed BEFORE the
// consumers (combat-policy.js:23, declareSistemaIntents.js) destructure
// stepToRegainLos at require-time, so each arm runs in a fresh module graph
// (execFileSync self-spawn) where the child mutates
// require('.../losReposition').stepToRegainLos on the cached exports object
// BEFORE requiring the adapter/app. (Verified: the destructured binding in the
// consumer picks up the mutated property.)
//
// This is a DIRECTION PROBE (SDMG hypothesis, owner-gated flip). It does NOT
// flip any production flag or touch production code. A ~0 delta on this FAIR
// fixture is real evidence the greedy 1-tile heuristic is inert (feeding the
// multi-tile-lookahead decision); a positive delta means the heuristic works
// and v1's negative was a fixture artifact.
//
// Usage:
//   node tools/sim/los-repos-probe.js [N]                 (parent: runs both arms)
//   node tools/sim/los-repos-probe.js --child <arm> <seed> (internal, self-spawned)

const path = require('path');
const { execFileSync } = require('child_process');

// ---------------------------------------------------------------------------
// Fixture (shared by parent positive-control + child runs)
// ---------------------------------------------------------------------------
// 12x12 grid, 3 ISOLATED firing lanes at rows y=1, y=5, y=9. Two full-width
// horizontal LOS-separator walls (y=3, y=7) confine each attacker's line of
// sight to its OWN lane -- so there is no cross-lane diagonal "escape-hatch"
// target that would let a blocked unit shoot someone else instead of
// repositioning (that escape hatch is exactly why a naive 3-in-a-row fixture
// barely fires the heuristic). Within each lane a single blocker tile at x=3
// sits on the straight shot between the attacker (x=1) and the enemy (x=5): the
// same-row shot is LOS-blocked, but a 1-tile lateral step to open ground (x=1
// stays clear) reopens a clear, in-range firing line -- a real reopening move
// for stepToRegainLos to find (NOT a full wall, where it could never fire).
// NOTE: with MOVE_TERRAIN_COST_ENABLED OFF (default) blocker terrain blocks LOS
// but NOT movement, so the separators isolate SIGHT, not paths -- this is a LOS
// isolation, which is precisely what the LOS heuristic operates on. All three
// los.yaml blocker_terrain_types appear across the lanes.
const GRID_SIZE = 12;
const TERRAIN = (() => {
  const t = [];
  for (let x = 0; x < GRID_SIZE; x += 1) {
    t.push({ x, y: 3, type: 'roccia' });
    t.push({ x, y: 7, type: 'roccia' });
  }
  t.push({ x: 3, y: 1, type: 'roccia' });
  t.push({ x: 3, y: 5, type: 'vegetazione_densa' });
  t.push({ x: 3, y: 9, type: 'obstacle' });
  return t;
})();

function roster() {
  // attack_range 5: reaches the lane enemy at x=5 AND, from the lateral reopening
  // tile (x=1), keeps a clear in-range shot. Lower would make the reopened tile
  // out of range (repositioning fires but never helps -> ro=0 control catches it).
  const defs = [
    ['ranged_1', 5, { x: 1, y: 1 }],
    ['ranged_2', 5, { x: 1, y: 5 }],
    ['ranged_3', 5, { x: 1, y: 9 }],
  ];
  return defs.map(([id, range, position]) => ({
    id,
    species: id,
    job: 'ranged',
    hp: 11,
    max_hp: 11,
    ap: 3,
    mod: 6,
    dc: 10,
    attack_range: range,
    initiative: 12,
    position,
    controlled_by: 'player',
    traits: [],
    status: {},
  }));
}

// Enemies: same-lane at x=5, range 2 (must close 2 tiles -> pressure, but low
// enough there is no melee-rush death spiral that would confound the pace read),
// tanky (hp 20) so the fight lasts long enough for a repositioning tempo edge to
// accumulate into a measurable avg_rounds delta. Symmetric per lane (no rigging).
function enemies(scale) {
  const defs = [
    ['foe_1', 20, 6, 12, { x: 5, y: 1 }],
    ['foe_2', 20, 6, 12, { x: 5, y: 5 }],
    ['foe_3', 20, 6, 12, { x: 5, y: 9 }],
  ];
  return defs.map(([id, hp, mod, dc, position]) => ({
    id,
    species: id,
    hp: Math.round(hp * scale),
    max_hp: Math.round(hp * scale),
    ap: 3,
    mod: Math.round(mod * scale),
    dc,
    attack_range: 2,
    initiative: 10,
    position,
    controlled_by: 'sistema',
    status: {},
  }));
}

function supertestHttp(app) {
  // Lazy-require supertest so the parent (which never touches the app) does not
  // need it resolvable before a child run.
  const request = require('supertest');
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

function dist(a, b) {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

// ---------------------------------------------------------------------------
// Parent-side POSITIVE CONTROLS (run once, before the batch)
// ---------------------------------------------------------------------------
// (1) Blocked-pairs: with LOS ON, >=2 attacker->enemy in-range pairs are
//     LOS-blocked at start (else the repos branch never triggers).
// (2) Reopening-steps-exist: the REAL stepToRegainLos returns a non-null,
//     clear, in-range tile for each blocked attacker (else repositioning could
//     never help even if wired). Uses the production helpers, not a re-impl.
function positiveControls() {
  process.env.COMBAT_LOS_ENABLED = 'true';
  const { losClearOnGrid } = require('../../apps/backend/services/combat/losForGrid');
  const { stepToRegainLos } = require('../../apps/backend/services/combat/losReposition');
  const grid = { terrain_features: TERRAIN, width: GRID_SIZE, height: GRID_SIZE };
  const attackers = roster();
  const foes = enemies(1.0);

  const blockedPairs = [];
  for (const a of attackers) {
    for (const e of foes) {
      const d = dist(a.position, e.position);
      if (d > (a.attack_range || 1)) continue;
      const clear = losClearOnGrid(grid, a.position, e.position);
      if (!clear) blockedPairs.push({ attacker: a.id, enemy: e.id, dist: d });
    }
  }

  const occAll = new Set([...attackers, ...foes].map((u) => `${u.position.x},${u.position.y}`));
  const reopening = [];
  for (const a of attackers) {
    const occ = new Set(occAll);
    occ.delete(`${a.position.x},${a.position.y}`);
    const tile = stepToRegainLos(a, foes, grid, { occupied: occ });
    let clearInRange = false;
    if (tile) {
      for (const e of foes) {
        if (
          dist(tile, e.position) <= (a.attack_range || 1) &&
          losClearOnGrid(grid, tile, e.position)
        ) {
          clearInRange = true;
          break;
        }
      }
    }
    reopening.push({ attacker: a.id, repos_tile: tile, reopens_clear_in_range: clearInRange });
  }
  delete process.env.COMBAT_LOS_ENABLED;

  const reopeningOk = reopening.filter((r) => r.reopens_clear_in_range).length;
  return {
    blocked_pairs: blockedPairs,
    blocked_pairs_count: blockedPairs.length,
    reopening_steps: reopening,
    reopening_steps_ok: reopeningOk,
  };
}

// ---------------------------------------------------------------------------
// Child arm: run N seeds for one arm, print a JSON line the parent parses.
// ---------------------------------------------------------------------------
async function childMain(arm, N, scale) {
  // BOTH arms hold LOS ON. Set BEFORE requiring anything that reads the flag.
  process.env.COMBAT_LOS_ENABLED = 'true';
  process.env.IDEA_ENGINE_DISABLE_STATUS_REFRESH = '1';
  process.env.IDEA_ENGINE_STUB_ORCHESTRATOR = '1';

  // POSITIVE CONTROL FOR THE CONTROL ITSELF: instrument stepToRegainLos on the
  // cached exports object BEFORE any consumer require. repos-OFF -> replace with
  // a null-returning stub + counter (proves the stub bites). repos-ON -> wrap
  // the real helper with a fire-counter (proves the real helper returns a
  // non-null tile > 0 times). The consumers (combat-policy.js:23,
  // declareSistemaIntents.js) destructure this property at THEIR require-time,
  // which happens AFTER this mutation -> they see our instrumented version.
  const losRepos = require('../../apps/backend/services/combat/losReposition');
  const counters = { stub_calls: 0, real_calls: 0, real_nonnull: 0 };
  if (arm === 'off') {
    losRepos.stepToRegainLos = () => {
      counters.stub_calls += 1;
      return null;
    };
  } else {
    const real = losRepos.stepToRegainLos;
    losRepos.stepToRegainLos = (...args) => {
      counters.real_calls += 1;
      const tile = real(...args);
      if (tile) counters.real_nonnull += 1;
      return tile;
    };
  }

  // Require the consumers AFTER the mutation so their destructured binding picks
  // up the instrumented stepToRegainLos.
  const { createApp } = require('../../apps/backend/app');
  const { selectPlayerAction } = require('./combat-policy');

  // Drive ONE encounter, acting on EVERY live player unit each round (not just
  // active_unit -- the /action handler does not gate on active_unit). Returns
  // { outcome, rounds, actionsByUnit }.
  async function runOne(http, seed) {
    const start = await http.post('/api/session/start', {
      units: [...roster(), ...enemies(scale)],
      seed,
      // board_scale:'grid_sized' + grid_size (ADR-2026-07-03) so the board is the
      // authored 12x12 -- WITHOUT it, resolveBoardSize auto-scales a 3-player
      // party to 6x6 (services/party/loader.js), which strands lane y=9 off-grid
      // and rejects its reposition move ("posizione fuori griglia"). grid.
      // terrain_features carries the blockers onto session.grid.
      encounter: {
        board_scale: 'grid_sized',
        grid_size: [GRID_SIZE, GRID_SIZE],
        grid: { width: GRID_SIZE, height: GRID_SIZE, terrain_features: TERRAIN },
      },
    });
    if (start.status !== 200 && start.status !== 201) {
      return { outcome: 'error', rounds: 0, actionsByUnit: {}, error: start.body };
    }
    const sessionId = start.body.session_id || start.body.id;
    const rosterIds = roster().map((u) => u.id);
    const actionsByUnit = Object.fromEntries(rosterIds.map((id) => [id, 0]));
    const maxRounds = 40;

    let outcome = 'timeout';
    let rounds = 0;
    while (rounds < maxRounds) {
      rounds += 1;
      let st = await http.get('/api/session/state', { session_id: sessionId });
      let units = (st.body && st.body.units) || [];
      const foesAlive = () => units.filter((u) => u.controlled_by === 'sistema' && (u.hp ?? 0) > 0);
      const playersAlive = () =>
        units.filter((u) => u.controlled_by === 'player' && (u.hp ?? 0) > 0);
      if (foesAlive().length === 0) {
        outcome = 'victory';
        break;
      }
      if (playersAlive().length === 0) {
        outcome = 'defeat';
        break;
      }

      // Player phase: iterate every live player unit; let each spend its AP
      // (attack / reposition / approach) via /action, regardless of active_unit.
      for (const rid of rosterIds) {
        // Re-read the actor from the freshest units each pass; it may have died
        // to an overwatch/reaction mid-phase.
        let guard = 6; // AP is 3; cap the per-unit action loop defensively.
        while (guard > 0) {
          guard -= 1;
          const actor = units.find((u) => u.id === rid);
          if (!actor || (actor.hp ?? 0) <= 0) break;
          if ((actor.ap_remaining ?? actor.ap ?? 0) < 1) break;
          const foes = foesAlive();
          if (foes.length === 0) break;
          const action = selectPlayerAction(actor, units, null, {
            terrainFeatures: TERRAIN,
            gridSize: GRID_SIZE,
          });
          if (!action) break;
          const wire =
            action.action_type === 'move'
              ? { action_type: 'move', position: action.target_position }
              : action;
          const act = await http.post('/api/session/action', {
            session_id: sessionId,
            actor_id: rid,
            ...wire,
          });
          if (!act || act.status < 200 || act.status >= 300) break; // out of AP / blocked
          actionsByUnit[rid] += 1;
          // Refresh the board so the next action (and the next unit) sees moves/kills.
          st = await http.get('/api/session/state', { session_id: sessionId });
          units = (st.body && st.body.units) || units;
        }
      }

      // End of player phase -> resolve the sistema round (enemies act as a batch)
      // and refill AP for all units (applyApRefill in applyEndOfRoundSideEffects).
      await http.post('/api/session/turn/end', { session_id: sessionId });
      st = await http.get('/api/session/state', { session_id: sessionId });
      units = (st.body && st.body.units) || units;
    }

    // best-effort session close (mirrors v1 endSession)
    try {
      const declared = outcome === 'timeout' || outcome === 'defeat' ? { outcome } : {};
      await http.post('/api/session/end', { session_id: sessionId, ...declared });
    } catch {
      /* /end is best-effort */
    }
    return { outcome, rounds, actionsByUnit };
  }

  const results = [];
  let firstSeedActions = null;
  for (let s = 1; s <= N; s += 1) {
    const { app, close } = createApp({ databasePath: null });
    try {
      const http = supertestHttp(app);
      const r = await runOne(http, s);
      results.push({ outcome: r.outcome, rounds: r.rounds });
      if (s === 1) firstSeedActions = r.actionsByUnit;
    } finally {
      if (typeof close === 'function') await close().catch(() => {});
    }
  }

  const summary = summarize(results);
  // Emit a single parseable line the parent consumes.
  process.stdout.write(
    `__ARM_RESULT__ ${JSON.stringify({
      arm,
      summary,
      counters,
      first_seed_actions: firstSeedActions,
    })}\n`,
  );
}

function summarize(arr) {
  const wins = arr.filter((r) => r.outcome === 'victory').length;
  const defeats = arr.filter((r) => r.outcome === 'defeat').length;
  const timeouts = arr.filter((r) => r.outcome === 'timeout').length;
  const avgRounds = arr.reduce((s, r) => s + (r.rounds || 0), 0) / (arr.length || 1);
  return {
    wins,
    defeats,
    timeouts,
    win_rate: Number((wins / (arr.length || 1)).toFixed(4)),
    avg_rounds: Number(avgRounds.toFixed(2)),
  };
}

// ---------------------------------------------------------------------------
// Parent: spawn one child per arm (fresh module graph each), print the report.
// ---------------------------------------------------------------------------
function runArmChild(arm, N, scale) {
  const out = execFileSync(
    process.execPath,
    [__filename, '--child', arm, String(N), String(scale)],
    { cwd: path.resolve(__dirname, '..', '..'), encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 },
  );
  const line = out.split('\n').find((l) => l.startsWith('__ARM_RESULT__'));
  if (!line) {
    throw new Error(`child arm '${arm}' produced no result line. stdout tail:\n${out.slice(-800)}`);
  }
  return JSON.parse(line.slice('__ARM_RESULT__'.length).trim());
}

function main() {
  const N = Number(process.argv[2]) || 10;
  const scale = Number(process.argv[3]) || 1.0;

  const controls = positiveControls();
  console.log('=== POSITIVE CONTROL: fixture validity (LOS ON) ===');
  console.log(JSON.stringify(controls, null, 2));
  console.log('=== END fixture-validity control ===');

  const on = runArmChild('on', N, scale);
  const off = runArmChild('off', N, scale);

  const out = {
    N,
    enemyScale: scale,
    positive_control: controls,
    // Turn-participation control: per-unit action counts for seed 1 of each arm.
    // Fixture is VALID only if >=2 player units have >0 actions.
    turn_participation_seed1: {
      repos_on: on.first_seed_actions,
      repos_off: off.first_seed_actions,
    },
    // Control-for-the-control: the stub/fire counters prove the toggle bites.
    repositioning_counters: {
      repos_on: on.counters, // real_nonnull > 0 => real helper returned a tile
      repos_off: off.counters, // stub_calls > 0 => stub was reached
    },
    repos_on: on.summary,
    repos_off: off.summary,
    wr_delta: Number((on.summary.win_rate - off.summary.win_rate).toFixed(4)),
    rounds_delta: Number((on.summary.avg_rounds - off.summary.avg_rounds).toFixed(2)),
    node: process.version,
  };
  console.log(JSON.stringify(out, null, 2));
}

if (process.argv[2] === '--child') {
  const arm = process.argv[3];
  const N = Number(process.argv[4]) || 10;
  const scale = Number(process.argv[5]) || 1.0;
  childMain(arm, N, scale).catch((e) => {
    console.error(e);
    process.exit(1);
  });
} else {
  try {
    main();
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}
