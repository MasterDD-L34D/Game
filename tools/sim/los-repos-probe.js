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
// FLIP MODE (probe v2.1 -- the ratify control, added for the owner flip
// decision). The repos-mode arms above answer "does the repositioning heuristic
// do anything" (LOS ON both, toggle only stepToRegainLos). The FLIP decision
// needs a DIFFERENT question: "what does turning the LOS mechanic ON actually
// cost the balance, on a FAIR fixture?" So `flip` mode compares:
//   arm on  = COMBAT_LOS_ENABLED='true' + REAL stepToRegainLos (production
//             behavior IF the flag is flipped on).
//   arm off = flag DELETED entirely -> losClearOnGrid always returns true, no
//             LOS constraint at all (today's live behavior, flag defaults OFF).
// Same fixture, same paired seeds, same child isolation. This is the honest
// flip-vs-nothing delta -- NOT v1's turn-starved -0.30 artifact. LOS is SUPPOSED
// to change balance (it is a mechanic); the ratify measures the SIZE and SHAPE
// of that shift for the owner.
//
// GEOMETRY (probe v2.2 -- step-vs-budget differentiation). The default 'lane'
// fixture has a SINGLE blocker tile per lane, so a 1-tile lateral step already
// reopens LOS -- it can measure "does repositioning help at all" but CANNOT
// separate the shipped greedy step from the budget-aware lookahead (both solve
// it). 'wide' widens each lane's blocker to a 3-tile vertical segment: no
// single lateral step reopens LOS (every 1-step tile stays in the segment's
// shadow); the cheapest reopening tile sits ON the segment's center (cost 2,
// terrain blocks sight not movement, endpoints excluded) -- reachable only by
// the budget lookahead. Combine with COMBAT_LOS_REPOSITION_MODE=step (clamps
// the budget to 1) to run the shipped-greedy arm on the same geometry:
//   repos + wide + MODE unset  -> budget lookahead vs no-repositioning
//   repos + wide + MODE=step   -> shipped greedy   vs no-repositioning
// The wide positive control INVERTS the reopening check: budget-1 must find
// NOTHING (else the fixture is not wide) and budget-2 must reopen (else the
// lookahead could never help and the probe would measure nothing).
//
// Usage:
//   node tools/sim/los-repos-probe.js [N] [repos|flip] [lane|wide] [enemyScale] [enemyRange]
//     repos (default) -- LOS ON both, toggle stepToRegainLos (heuristic isolation)
//     flip            -- flag ON+real-repos vs flag OFF (true balance cost of LOS)
//     lane  (default) -- 1-tile blocker per lane (1-step reopening exists); the
//                        geometry token is position-independent (parsed then
//                        filtered out before the positional args).
//     wide            -- 3-tile blocker segment per lane (budget>=2 required)
//     enemyScale      -- optional, default 1.0, applies to BOTH modes (de-ceiling
//                        the flip-mode fixture: at scale 1.0 the fixture is
//                        structurally un-losable -- players range 5 vs enemy
//                        range 2 -- so WR ceilings 1.0/1.0 and masks any
//                        lethality shift from the LOS constraint).
//   node tools/sim/los-repos-probe.js --child <arm> <N> <scale> <mode> <geometry> <enemyRange>  (internal)

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
const LANE_TYPES = { 1: 'roccia', 5: 'vegetazione_densa', 9: 'obstacle' };
function terrainFor(geometry) {
  const t = [];
  for (let x = 0; x < GRID_SIZE; x += 1) {
    t.push({ x, y: 3, type: 'roccia' });
    t.push({ x, y: 7, type: 'roccia' });
  }
  for (const laneY of [1, 5, 9]) {
    t.push({ x: 3, y: laneY, type: LANE_TYPES[laneY] });
    if (geometry === 'wide') {
      // wide-shadow: widen the blocker to a 3-tile vertical segment. Every
      // 1-step lateral tile stays in its shadow; the cheapest reopening tile
      // is the segment's center itself (cost 2, standing ON blocker terrain --
      // it blocks sight, not movement; squareLos excludes endpoints).
      t.push({ x: 3, y: laneY - 1, type: LANE_TYPES[laneY] });
      t.push({ x: 3, y: laneY + 1, type: LANE_TYPES[laneY] });
    }
  }
  return t;
}
// Set once per process from the parsed geometry (parent main + child entry).
let TERRAIN = terrainFor('lane');

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
function enemies(scale, enemyRange = 2) {
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
    attack_range: enemyRange,
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
  // Windows ephemeral-port retry: supertest binds a fresh listener per request,
  // and under concurrent sim storms (parallel probe sessions / the documented
  // 4915x EADDRINUSE flake family) the dynamic-port range (49152+) can collide
  // TRANSIENTLY on connect. Retry the identical request a few times with a tiny
  // backoff -- the request itself is idempotent at the socket level (it never
  // reached the app), so determinism is unaffected.
  const RETRYABLE = new Set(['EADDRINUSE', 'ECONNRESET', 'EADDRNOTAVAIL']);
  const withRetry = async (mk) => {
    let lastErr;
    for (let attempt = 0; attempt < 12; attempt += 1) {
      try {
        return await mk();
      } catch (e) {
        lastErr = e;
        if (!RETRYABLE.has(e && e.code)) throw e;
        // Up to ~4s cumulative: enough to ride out a TIME_WAIT-saturated
        // ephemeral range under a concurrent sim batch, still fail-fast on a
        // genuinely stuck host.
        await new Promise((r) => setTimeout(r, Math.min(700, 50 * (attempt + 1))));
      }
    }
    throw lastErr;
  };
  return {
    post: (p, body) =>
      withRetry(() =>
        request(app)
          .post(p)
          .send(body)
          .then((r) => ({ status: r.status, body: r.body })),
      ),
    get: (p, query) =>
      withRetry(() =>
        request(app)
          .get(p)
          .query(query || {})
          .then((r) => ({ status: r.status, body: r.body })),
      ),
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
function positiveControls(enemyRange = 2) {
  process.env.COMBAT_LOS_ENABLED = 'true';
  // The fixture-validity controls ask about the GEOMETRY (does a budget-1 /
  // budget-2 reopening tile exist?), not about the arm under test -- so they
  // must run with the repositioning MODE knob cleared even when the parent was
  // invoked with COMBAT_LOS_REPOSITION_MODE=step for the shipped-greedy arm
  // (the clamp would blank the budget-2 probe and fail the wide gate).
  const savedMode = process.env.COMBAT_LOS_REPOSITION_MODE;
  delete process.env.COMBAT_LOS_REPOSITION_MODE;
  const { losClearOnGrid } = require('../../apps/backend/services/combat/losForGrid');
  const { stepToRegainLos } = require('../../apps/backend/services/combat/losReposition');
  const { occupiedSetFromUnits } = require('../../apps/backend/services/combat/occupancy');
  const grid = { terrain_features: TERRAIN, width: GRID_SIZE, height: GRID_SIZE };
  const attackers = roster();
  const foes = enemies(1.0, enemyRange);

  const blockedPairs = [];
  for (const a of attackers) {
    for (const e of foes) {
      const d = dist(a.position, e.position);
      if (d > (a.attack_range || 1)) continue;
      const clear = losClearOnGrid(grid, a.position, e.position);
      if (!clear) blockedPairs.push({ attacker: a.id, enemy: e.id, dist: d });
    }
  }

  const occAll = occupiedSetFromUnits([...attackers, ...foes]);
  const reopensClearInRange = (a, tile) => {
    if (!tile) return false;
    for (const e of foes) {
      if (
        dist(tile, e.position) <= (a.attack_range || 1) &&
        losClearOnGrid(grid, tile, e.position)
      ) {
        return true;
      }
    }
    return false;
  };
  const reopening = [];
  for (const a of attackers) {
    const occ = new Set(occAll);
    occ.delete(`${a.position.x},${a.position.y}`);
    // budget 1 = the shipped greedy step; budget 2 = the lookahead's cheapest
    // wide-shadow solve. On 'lane' the budget-1 tile must exist; on 'wide' it
    // must NOT (else the fixture is not wide) while budget-2 must reopen.
    const tile1 = stepToRegainLos(a, foes, grid, { occupied: occ, budget: 1 });
    const tile2 = stepToRegainLos(a, foes, grid, { occupied: occ, budget: 2 });
    reopening.push({
      attacker: a.id,
      budget1_tile: tile1,
      budget1_reopens: reopensClearInRange(a, tile1),
      budget2_tile: tile2,
      budget2_reopens: reopensClearInRange(a, tile2),
    });
  }
  delete process.env.COMBAT_LOS_ENABLED;
  if (savedMode !== undefined) process.env.COMBAT_LOS_REPOSITION_MODE = savedMode;

  return {
    blocked_pairs: blockedPairs,
    blocked_pairs_count: blockedPairs.length,
    reopening_steps: reopening,
    reopening_budget1_ok: reopening.filter((r) => r.budget1_reopens).length,
    reopening_budget2_ok: reopening.filter((r) => r.budget2_reopens).length,
  };
}

// Fail-fast fixture-validity gates (a ~0 delta is only evidence on a fixture
// where the mechanic actually bites):
//   lane -> the greedy 1-step reopening must exist for all 3 attackers.
//   wide -> NO attacker may have a 1-step reopening (else the fixture is not
//           wide and step-vs-budget cannot be separated), while the budget-2
//           reopening must exist for all 3.
function assertFixtureValidity(geometry, controls) {
  if (controls.blocked_pairs_count < 2) {
    throw new Error(
      `positive control FAILED (${geometry}): only ${controls.blocked_pairs_count} blocked pairs -- LOS never engages`,
    );
  }
  if (geometry === 'wide') {
    if (controls.reopening_budget1_ok !== 0) {
      throw new Error(
        `positive control FAILED (wide): ${controls.reopening_budget1_ok} attackers still have a 1-step reopening -- fixture not wide`,
      );
    }
    if (controls.reopening_budget2_ok !== 3) {
      throw new Error(
        `positive control FAILED (wide): budget-2 reopening exists for ${controls.reopening_budget2_ok}/3 attackers`,
      );
    }
  } else if (controls.reopening_budget1_ok !== 3) {
    throw new Error(
      `positive control FAILED (lane): 1-step reopening exists for ${controls.reopening_budget1_ok}/3 attackers`,
    );
  }
}

// ---------------------------------------------------------------------------
// Child arm: run N seeds for one arm, print a JSON line the parent parses.
// ---------------------------------------------------------------------------
async function childMain(arm, N, scale, mode, enemyRange) {
  // LOS flag: in repos mode BOTH arms hold LOS ON (the heuristic-isolation
  // control). In flip mode arm 'off' DELETES the flag entirely -> no LOS
  // constraint at all (today's live behavior). Set BEFORE requiring anything
  // that reads the flag.
  const losOff = mode === 'flip' && arm === 'off';
  if (losOff) {
    // Post-flip (default ON): the no-LOS arm must OPT OUT explicitly.
    process.env.COMBAT_LOS_ENABLED = 'false';
  } else {
    process.env.COMBAT_LOS_ENABLED = 'true';
  }
  process.env.IDEA_ENGINE_DISABLE_STATUS_REFRESH = '1';
  process.env.IDEA_ENGINE_STUB_ORCHESTRATOR = '1';

  // POSITIVE CONTROL FOR THE CONTROL ITSELF: instrument stepToRegainLos on the
  // cached exports object BEFORE any consumer require. repos-mode OFF -> replace
  // with a null-returning stub + counter (proves the stub bites). Every other
  // arm (repos-ON, flip-ON, flip-OFF) -> wrap the real helper with a fire-
  // counter (proves whether the real helper returns a non-null tile). In flip-
  // OFF the wrap is instructive: with LOS off no shot is ever blocked, so
  // real_nonnull should be ~0 -- evidence the mechanic (and its detours) are
  // absent in the live-behavior arm. The consumers (combat-policy.js:23,
  // declareSistemaIntents.js) destructure this property at THEIR require-time,
  // which happens AFTER this mutation -> they see our instrumented version.
  const losRepos = require('../../apps/backend/services/combat/losReposition');
  const counters = { stub_calls: 0, real_calls: 0, real_nonnull: 0 };
  if (mode === 'repos' && arm === 'off') {
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
      units: [...roster(), ...enemies(scale, enemyRange)],
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
function runArmChild(arm, N, scale, mode, geometry, enemyRange) {
  const out = execFileSync(
    process.execPath,
    [__filename, '--child', arm, String(N), String(scale), mode, geometry, String(enemyRange)],
    { cwd: path.resolve(__dirname, '..', '..'), encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 },
  );
  const line = out.split('\n').find((l) => l.startsWith('__ARM_RESULT__'));
  if (!line) {
    throw new Error(`child arm '${arm}' produced no result line. stdout tail:\n${out.slice(-800)}`);
  }
  return JSON.parse(line.slice('__ARM_RESULT__'.length).trim());
}

function main() {
  // Geometry token first (position-independent), then the legacy positional
  // args over what remains: N, then mode (repos|flip) or enemy-scale.
  const args = process.argv.slice(2);
  const geometry = args.includes('wide') ? 'wide' : 'lane';
  const rest = args.filter((a) => a !== 'wide' && a !== 'lane');
  const N = Number(rest[0]) || 10;
  const modeArg = rest[1];
  const mode = modeArg === 'flip' ? 'flip' : 'repos';
  // rest[2] is the enemyScale arg for BOTH modes when modeArg was the mode token
  // (i.e. 'flip'); for the legacy `<N> <scale>` repos form modeArg IS the scale
  // and rest[2] is unused. Default 1.0 -> behavior unchanged when omitted.
  // (Positional args index into `rest`, NOT process.argv: the geometry token is
  // position-independent and already filtered out above.)
  const scale = mode === 'repos' && modeArg ? Number(modeArg) || 1.0 : Number(rest[2]) || 1.0;
  // rest[3]: optional enemy attack_range (default 2 = unchanged fixture). Range 4-5
  // makes the fixture SYMMETRIC (enemies shoot across the same blockers -> LOS
  // constrains both sides) and de-ceilings WR (flag-OFF enemies shoot through
  // walls from turn 1 = real lethality pressure). Validator condition C1.
  const enemyRange = Number(rest[3]) || 2;
  TERRAIN = terrainFor(geometry);

  const controls = positiveControls(enemyRange);
  console.log(`=== POSITIVE CONTROL: fixture validity (LOS ON, geometry=${geometry}) ===`);
  console.log(JSON.stringify(controls, null, 2));
  console.log('=== END fixture-validity control ===');
  assertFixtureValidity(geometry, controls);

  const on = runArmChild('on', N, scale, mode, geometry, enemyRange);
  const off = runArmChild('off', N, scale, mode, geometry, enemyRange);

  // Arm labels reflect the semantic per mode:
  //   repos -> on = real repositioning,  off = stubbed repositioning (LOS ON both)
  //   flip  -> on = flag ON + real repos, off = flag OFF (no LOS constraint)
  const out = {
    N,
    mode,
    geometry,
    // The repositioning heuristic the 'on' arm ran: COMBAT_LOS_REPOSITION_MODE
    // is inherited by the child processes ('step' clamps the budget to 1 =
    // shipped greedy; unset = budget-aware lookahead).
    reposition_mode: process.env.COMBAT_LOS_REPOSITION_MODE || 'budget',
    enemyScale: scale,
    enemyRange,
    positive_control: controls,
    // In flip mode the 'off' arm ran with LOS disabled: no shot is ever blocked,
    // so blocked-pair enforcement is 0 by construction (the control above still
    // proves the fixture HAS blockable pairs that the flag-ON arm must contend
    // with). In repos mode both arms hold LOS ON.
    los_off_arm_note:
      mode === 'flip'
        ? 'flip/off arm ran with COMBAT_LOS_ENABLED unset -> losClearOnGrid always true, 0 blocked-pair enforcement (free shots through walls, = live behavior)'
        : 'both arms LOS ON',
    // Turn-participation control: per-unit action counts for seed 1 of each arm.
    // Fixture is VALID only if >=2 player units have >0 actions.
    turn_participation_seed1: {
      arm_on: on.first_seed_actions,
      arm_off: off.first_seed_actions,
    },
    // Control-for-the-control: the stub/fire counters prove the toggle bites.
    repositioning_counters: {
      arm_on: on.counters, // real_nonnull > 0 => real helper returned a tile
      arm_off: off.counters, // repos-off: stub_calls > 0; flip-off: real_nonnull ~0 (LOS off)
    },
    arm_on: on.summary,
    arm_off: off.summary,
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
  const mode = process.argv[6] === 'flip' ? 'flip' : 'repos';
  TERRAIN = terrainFor(process.argv[7] === 'wide' ? 'wide' : 'lane');
  const enemyRange = Number(process.argv[8]) || 2;
  childMain(arm, N, scale, mode, enemyRange).catch((e) => {
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
