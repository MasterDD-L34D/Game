'use strict';
// radici_ancora_planare band probe (carrier-vs-non-carrier).
//
// radici is an ALWAYS-ON slice (flag-independent): a carrier that does NOT move is
// anchored (status ancorato, DR2 at the mitigation seam); a move breaks the anchor.
// So its band is NOT a MOVE_TERRAIN_COST_ENABLED ON/OFF question -- it is carrier vs
// non-carrier. This measures the win-rate impact of the DR2 anchor with a defensive
// roster that HOLDS (attack_range 3 -> can fight without moving -> keeps the anchor)
// while enemies advance and attack it.
//
// FIX (Codex P1 2026-06-29): original probe placed enemies at corners (dist 4+ from
// carriers) while attack_range was 3 -> policy's closest-enemy check fired stepToward
// -> MOVE on first activation -> breakAnchor cleared the anchor before any enemy
// landed a hit -> the "band-neutral" result was an artifact of carriers moving, NOT
// evidence of a held-DR measurement. Fix: enemies placed at dist 2 (cardinal) from
// carriers so the nearest-enemy is ALREADY within range 3 -> policy fires ATTACK
// (no move -> anchor holds). anchor_dr_last is tracked per-run to assert DR2 bites.
//
// Paired-seed (same seed carrier vs non-carrier -> only the trait differs), in-process
// (supertest createApp, NO prod), node 22. Elimination outcome.
//
// Usage: node tools/sim/radici-band-probe.js [N] [enemyScale]

const request = require('supertest');
const { createApp } = require('../../apps/backend/app');
const { runEncounter } = require('./combat-adapter');

process.env.IDEA_ENGINE_DISABLE_STATUS_REFRESH = '1';

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

// Defensive radici party: 3 sessile carriers that HOLD (attack_range 3 -> fight without
// moving -> the anchor stays up). withRadici toggles the trait (the only difference).
function roster(withRadici) {
  return [
    ['ferrocolonia', { x: 2, y: 2 }],
    ['cactus_weaver', { x: 3, y: 2 }],
    ['sentinella_radice', { x: 2, y: 3 }],
  ].map(([id, position]) => ({
    id,
    species: id,
    job: 'warden',
    hp: 16,
    max_hp: 16,
    ap: 2,
    mod: 5,
    dc: 10,
    attack_range: 3,
    initiative: 10,
    position,
    controlled_by: 'player',
    traits: withRadici ? ['radici_ancora_planare'] : [],
    status: {},
  }));
}

// Enemies placed at dist-2 cardinal positions from the carrier cluster so EVERY
// carrier has at least one enemy within attack_range 3 from turn 1. The policy
// fires ATTACK (not stepToward) on the first activation -> no MOVE -> no
// breakAnchor -> the anchor (status.ancorato) stays up and DR2 bites when enemies
// reach and hit the carriers. Enemies still need 1-2 move actions to close to
// attack_range 1 before they can hit back, giving the carrier a clean held-DR
// measurement window.
//   (0,2) dist-to-(2,2) = 2  ✓ in range-3
//   (5,2) dist-to-(3,2) = 2  ✓ in range-3
//   (2,0) dist-to-(2,2) = 2  ✓ in range-3
//   (2,5) dist-to-(2,3) = 2  ✓ in range-3
function enemies(scale) {
  const defs = [
    ['raider_a', 10, 3, 11, { x: 0, y: 2 }],
    ['raider_b', 10, 3, 11, { x: 5, y: 2 }],
    ['raider_c', 10, 3, 11, { x: 2, y: 0 }],
    ['raider_d', 10, 3, 11, { x: 2, y: 5 }],
  ];
  return defs.map(([id, hp, mod, dc, position]) => ({
    id,
    species: 'velox',
    hp: Math.round(hp * scale),
    max_hp: Math.round(hp * scale),
    ap: 3,
    mod: Math.round(mod * scale),
    dc,
    attack_range: 1,
    initiative: 8,
    position,
    controlled_by: 'sistema',
    status: {},
  }));
}

// Drive two paired single-unit sessions (same seed, same enemy) to assert anchor
// invariants: compare total damage taken by a carrier WITH radici vs WITHOUT radici.
// If DR2 is biting, the carrier with radici takes strictly less damage over N rounds
// of enemy attacks.
//
// Approach: carrier is player with initiative 10; enemy has initiative 8 and is
// adjacent (dist 1, attack_range 1). We call /session/turn/end on each player turn
// immediately (no player action), triggering handleTurnEndViaRound which runs the
// enemy AI attack via performAttack. DR2 bites iff the radici carrier ends with
// more hp than the non-radici carrier.
//
// Returns { anchorApplied: bool, damageWithRadici: number, damageWithout: number,
//           dr2Confirmed: bool }
async function verifyAnchorInvariant() {
  const SEED = 42;
  const ROUNDS = 5;
  const unitDef = (withRadici) => ({
    id: 'ferr_v',
    species: 'ferrocolonia',
    job: 'warden',
    hp: 60,
    max_hp: 60,
    ap: 2,
    mod: 5,
    dc: 10,
    attack_range: 3,
    initiative: 10,
    position: { x: 2, y: 2 },
    controlled_by: 'player',
    traits: withRadici ? ['radici_ancora_planare'] : [],
    status: {},
  });
  const foeUnit = {
    id: 'raider_v',
    species: 'velox',
    hp: 200,
    max_hp: 200,
    ap: 3,
    mod: 20, // high mod -> reliable hits every round
    dc: 2,
    attack_range: 1,
    initiative: 8,
    position: { x: 3, y: 2 }, // adjacent to carrier (dist=1, no move needed)
    controlled_by: 'sistema',
    status: {},
  };

  async function driveSession(withRadici) {
    delete process.env.MOVE_TERRAIN_COST_ENABLED;
    const { app, close } = createApp({ databasePath: null });
    try {
      const http = supertestHttp(app);
      const start = await http.post('/api/session/start', {
        units: [unitDef(withRadici), foeUnit],
        seed: SEED,
      });
      if (start.status !== 200 && start.status !== 201)
        return { hpFinal: 60, anchorApplied: false };
      const sessionId = start.body.session_id || start.body.id;
      let anchorApplied = false;
      for (let round = 0; round < ROUNDS; round += 1) {
        const st = await http.get('/api/session/state', { session_id: sessionId });
        const units = (st.body && st.body.units) || [];
        const carrier = units.find((u) => u.id === 'ferr_v');
        if (!carrier || (carrier.hp ?? 0) <= 0) break;
        // Check anchor status
        if (carrier.status && typeof carrier.status === 'object' && carrier.status.ancorato) {
          anchorApplied = true;
        }
        // End the player's turn immediately (no action) -> enemy AI fires via
        // handleTurnEndViaRound, performing its attack on the carrier.
        await http.post('/api/session/turn/end', { session_id: sessionId });
      }
      const st2 = await http.get('/api/session/state', { session_id: sessionId });
      const units2 = (st2.body && st2.body.units) || [];
      const carrierFinal = units2.find((u) => u.id === 'ferr_v');
      return { hpFinal: (carrierFinal && carrierFinal.hp) || 0, anchorApplied };
    } finally {
      if (typeof close === 'function') await close().catch(() => {});
    }
  }

  const withR = await driveSession(true);
  const withoutR = await driveSession(false);
  const startHp = 60;
  const damageWithRadici = startHp - withR.hpFinal;
  const damageWithout = startHp - withoutR.hpFinal;
  // DR2 confirmed if carrier WITH radici took less total damage (held position, no move).
  const dr2Confirmed = withR.hpFinal > withoutR.hpFinal;
  return {
    anchorApplied: withR.anchorApplied,
    damageWithRadici,
    damageWithout,
    dr2Confirmed,
  };
}

async function runArm(withRadici, seed, scale) {
  delete process.env.MOVE_TERRAIN_COST_ENABLED; // radici is flag-independent
  const { app, close } = createApp({ databasePath: null });
  try {
    const http = supertestHttp(app);
    const r = await runEncounter(http, {
      roster: roster(withRadici),
      enemies: enemies(scale),
      seed,
      maxRounds: 30,
      gridSize: 6,
      endSession: true, // #3157 F4: close the session so the log gets session_end
    });
    return { outcome: r.outcome, rounds: r.rounds, survivors: (r.survivorIds || []).length };
  } finally {
    if (typeof close === 'function') await close().catch(() => {});
  }
}

function summarize(arr) {
  const wins = arr.filter((r) => r.outcome === 'victory').length;
  const avgSurv = arr.reduce((s, r) => s + (r.survivors || 0), 0) / (arr.length || 1);
  return {
    wins,
    defeats: arr.filter((r) => r.outcome === 'defeat').length,
    timeouts: arr.filter((r) => r.outcome === 'timeout').length,
    win_rate: Number((wins / arr.length).toFixed(4)),
    avg_survivors: Number(avgSurv.toFixed(2)),
  };
}

async function main() {
  const N = Number(process.argv[2]) || 40;
  const scale = Number(process.argv[3]) || 1.0;

  // Step 0: anchor invariant check -- compare damage taken by an anchored carrier
  // (with radici, status.ancorato up, no move) vs a non-carrier (identical setup,
  // same seed). DR2 is confirmed if the carrier WITH radici takes less total damage
  // over ROUNDS identical enemy attacks.
  process.stderr.write(`  [verify] running anchor invariant check (paired-session DR2 probe)...\n`);
  const inv = await verifyAnchorInvariant();
  if (!inv.anchorApplied) {
    process.stderr.write(
      `  [verify] WARNING: status.ancorato never seen on radici carrier -- anchor producer NOT firing.\n`,
    );
  } else {
    process.stderr.write(`  [verify] status.ancorato confirmed on radici carrier.\n`);
  }
  if (!inv.dr2Confirmed) {
    process.stderr.write(
      `  [verify] WARNING: DR2 NOT confirmed -- damage_with_radici (${inv.damageWithRadici}) >= damage_without (${inv.damageWithout}). Carriers may still be moving.\n`,
    );
  } else {
    process.stderr.write(
      `  [verify] DR2 biting confirmed: dmg_with_radici=${inv.damageWithRadici} < dmg_without=${inv.damageWithout} (diff=${inv.damageWithout - inv.damageWithRadici}).\n`,
    );
  }

  const withR = [];
  const without = [];
  for (let s = 1; s <= N; s += 1) {
    withR.push(await runArm(true, s, scale));
    without.push(await runArm(false, s, scale));
    if (s % 10 === 0) process.stderr.write(`  ${s}/${N}\n`);
  }
  const a = summarize(withR);
  const b = summarize(without);
  console.log(
    JSON.stringify(
      {
        N,
        enemyScale: scale,
        anchor_invariant: {
          anchor_applied: inv.anchorApplied,
          damage_with_radici: inv.damageWithRadici,
          damage_without_radici: inv.damageWithout,
          dr2_confirmed: inv.dr2Confirmed,
          note: inv.dr2Confirmed
            ? `DR2 biting confirmed: anchored carrier took ${inv.damageWithout - inv.damageWithRadici} less damage than non-carrier (honest measurement)`
            : 'DR2 NOT confirmed -- re-check probe setup',
        },
        with_radici: a,
        without_radici: b,
        wr_delta: Number((a.win_rate - b.win_rate).toFixed(4)),
        survivors_delta: Number((a.avg_survivors - b.avg_survivors).toFixed(2)),
        node: process.version,
      },
      null,
      2,
    ),
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
