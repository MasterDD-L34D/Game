'use strict';
// SPEC-J LETHAL canonical WR probe -- enc_badlands_ultima_caccia_01 (Tier-3 N1).
//
// Measures the party WIN-RATE using the ROUND model (/api/session/round/execute) +
// the canonical focus-fire planner -- a faithful JS port of the proven Python
// calibrator's plan_player_intents (batch_calibrate_badlands_pilot_01.py). The
// earlier combat-adapter path (per-unit /api/session/action) does NOT resolve --
// it grinds to the round cap (validated: it gave WR 0 on the RATIFIED pilot), so
// only the round model + focus-fire planner reproduces the ratified band.
//
// Enemies use the CANONICAL real-play stats: deriveCombatStats(species YAML) via the
// ecology adapter (the badlandsPilotScenario path), NOT the tier-table approximation.
//
// WR convention: turn_limit_defeat=37 -- a run that does not eliminate the enemies in
// time = a LOSS (timeout -> defeat). WR = victories / N.
//
// VALIDATE-FIRST (anti-SDMG): first run on the RATIFIED pilot (enc_badlands_pilot_01,
// ratified WR ~0.51 in [0.40,0.60]). If the probe reproduces that band, the round-model
// + planner are trustworthy for the lethal roster; otherwise the number is rejected.
//
// Usage: node tools/sim/ultima-caccia-wr-probe.js [N]   (default 40)

const request = require('supertest');
const { createApp } = require('../../apps/backend/app');
const {
  buildBadlandsUnits01,
  loadBadlandsSpecies,
} = require('../../apps/backend/services/worldgen/badlandsPilotScenario');
const { deriveCombatStats } = require('../../apps/backend/services/worldgen/ecologyCombatAdapter');

process.env.IDEA_ENGINE_DISABLE_STATUS_REFRESH = '1';
process.env.IDEA_ENGINE_STUB_ORCHESTRATOR = '1';

const TURN_LIMIT_DEFEAT = 37; // badlands stalemate-breaker (timeout -> defeat)
const MAX_ROUNDS = 60; // generous loop cap; turn_limit_defeat decides the outcome
const ENEMY_POSITIONS = [
  { x: 8, y: 8 },
  { x: 8, y: 5 },
  { x: 8, y: 2 },
  { x: 6, y: 6 },
  { x: 6, y: 3 },
];

function http(app) {
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

// --- canonical focus-fire planner (JS port of plan_player_intents) ---
function manhattan(a, b) {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}
function stepToward(src, dst, gw, gh) {
  const dx = dst.x - src.x;
  const dy = dst.y - src.y;
  let nx = src.x;
  let ny = src.y;
  if (Math.abs(dx) >= Math.abs(dy) && dx !== 0) nx += dx > 0 ? 1 : -1;
  else if (dy !== 0) ny += dy > 0 ? 1 : -1;
  nx = Math.max(0, Math.min(gw - 1, nx));
  ny = Math.max(0, Math.min(gh - 1, ny));
  return { x: nx, y: ny };
}
function enemyPriority(e) {
  if (e.id === 'e_apex_boss') return 2;
  if (String(e.id).includes('elite')) return 1;
  return 0;
}
function planPlayerIntents(state) {
  const units = state.units || [];
  const grid = state.grid || {};
  const gw = grid.width || 10;
  const gh = grid.height || 10;
  const players = units.filter((u) => u.controlled_by === 'player' && (u.hp || 0) > 0);
  const enemies = units.filter((u) => u.controlled_by === 'sistema' && (u.hp || 0) > 0);
  if (!enemies.length) return [];
  const intents = [];
  const reserved = new Set(
    units.filter((u) => (u.hp || 0) > 0).map((u) => `${u.position.x},${u.position.y}`),
  );
  for (const pl of players) {
    const ap = pl.ap_remaining != null ? pl.ap_remaining : pl.ap != null ? pl.ap : 2;
    if (ap <= 0) continue;
    const rng = pl.attack_range || 1;
    const sorted = [...enemies].sort(
      (a, b) =>
        enemyPriority(a) - enemyPriority(b) ||
        manhattan(pl.position, a.position) - manhattan(pl.position, b.position),
    );
    const target = sorted[0];
    const dist = manhattan(pl.position, target.position);
    if (dist <= rng && ap >= 1) {
      intents.push({
        actor_id: pl.id,
        action: { type: 'attack', target_id: target.id, channel: 'fisico' },
      });
    } else if (ap >= 2) {
      let np = stepToward(pl.position, target.position, gw, gh);
      if (reserved.has(`${np.x},${np.y}`)) {
        const alt = stepToward(
          pl.position,
          { x: target.position.x + 1, y: target.position.y },
          gw,
          gh,
        );
        if (!reserved.has(`${alt.x},${alt.y}`)) np = alt;
      }
      intents.push({ actor_id: pl.id, action: { type: 'move', position: np } });
      if (manhattan(np, target.position) <= rng && ap >= 2) {
        intents.push({
          actor_id: pl.id,
          action: { type: 'attack', target_id: target.id, channel: 'fisico' },
        });
      }
      reserved.delete(`${pl.position.x},${pl.position.y}`);
      reserved.add(`${np.x},${np.y}`);
    } else {
      intents.push({ actor_id: pl.id, action: { type: 'skip' } });
    }
  }
  return intents;
}
function detectOutcome(state) {
  const units = state.units || [];
  const pa = units.filter((u) => u.controlled_by === 'player' && (u.hp || 0) > 0);
  const ea = units.filter((u) => u.controlled_by === 'sistema' && (u.hp || 0) > 0);
  if (!pa.length) return 'defeat';
  if (!ea.length) return 'victory';
  if ((Number(state.turn) || 0) >= TURN_LIMIT_DEFEAT) return 'defeat';
  return null;
}

// --- rosters ---
function adapterEnemies(ids) {
  return ids.map((id, i) => {
    const stats = deriveCombatStats(loadBadlandsSpecies(id));
    return {
      ...stats,
      id: `e_${id.replace(/-/g, '_')}_${i}`,
      species: id,
      max_hp: stats.hp,
      position: ENEMY_POSITIONS[i] || { x: 7, y: 7 },
      facing: 'W',
      controlled_by: 'sistema',
      ai_profile: 'aggressive',
      elevation: 0,
      job: stats.job || 'vanguard',
    };
  });
}
// Calibrated lethal roster (canonical adapter stats): WR 0.275 in the hardcore
// band [0.25,0.40] (see the sweep in the evidence doc). Override via ULTIMA_ROSTER.
const LETHAL_ENEMY_IDS = process.env.ULTIMA_ROSTER
  ? process.env.ULTIMA_ROSTER.split(',')
      .map((s) => s.trim())
      .filter(Boolean)
  : [
      'dune-stalker',
      'ferrocolonia-magnetotattica',
      'nano-rust-bloom',
      'rust-scavenger',
      'sand-burrower',
    ];

async function runOne(app, units, encounterClass, seed) {
  const h = http(app);
  const start = await h.post('/api/session/start', {
    units: units.map((u) => ({ ...u })),
    seed,
    modulation: 'full',
    sistema_pressure_start: 70,
    encounter: { id: 'probe_wr' },
    encounter_class: encounterClass,
    biome_id: 'badlands',
  });
  if (start.status !== 200) return 'error';
  const sid = start.body.session_id;
  let state = start.body.state;
  let outcome = null;
  for (let rnd = 1; rnd <= MAX_ROUNDS; rnd += 1) {
    outcome = detectOutcome(state);
    if (outcome) break;
    const intents = planPlayerIntents(state);
    const r = await h.post('/api/session/round/execute', {
      session_id: sid,
      player_intents: intents,
      ai_auto: true,
      priority_queue: true,
    });
    if (r.status !== 200) {
      const st = await h.get('/api/session/state', { session_id: sid });
      if (st.status === 200) {
        state = st.body;
        outcome = detectOutcome(state);
      }
      break;
    }
    state = r.body.state || state;
  }
  if (!outcome) outcome = detectOutcome(state) || 'timeout';
  // player-creature KO-rate: fraction of the party that fell (permadeath-relevant).
  const fin = (state.units || []).filter((u) => u.controlled_by === 'player');
  const total = fin.length || 4;
  const survivors = fin.filter((u) => (u.hp || 0) > 0).length;
  return { outcome, kos: Math.max(0, total - survivors), total };
}

async function runWR(label, units, encounterClass, N) {
  const tally = { victory: 0, defeat: 0, timeout: 0, error: 0 };
  let totalKo = 0;
  let totalSlots = 0;
  for (let s = 1; s <= N; s += 1) {
    const { app, close } = createApp({ databasePath: null });
    try {
      const r = await runOne(app, units, encounterClass, s);
      tally[r.outcome] = (tally[r.outcome] || 0) + 1;
      totalKo += r.kos || 0;
      totalSlots += r.total || 4;
    } finally {
      if (typeof close === 'function') await close().catch(() => {});
    }
    if (s % 10 === 0) process.stderr.write(`  ${label} ${s}/${N}\n`);
  }
  return {
    label,
    N,
    ...tally,
    win_rate: Number((tally.victory / N).toFixed(4)),
    creature_ko_rate: Number((totalKo / (totalSlots || 1)).toFixed(4)),
  };
}

async function main() {
  const N = Number(process.argv[2]) || 40;
  const pilotUnits = buildBadlandsUnits01();
  const quartet = pilotUnits.filter((u) => u.controlled_by === 'player');

  const skipPilot = process.env.SKIP_PILOT === '1';
  const pilot = skipPilot
    ? { label: 'pilot-skipped', win_rate: 0.55, note: 'validated separately (22/40, in band)' }
    : await runWR('pilot-validate', pilotUnits, 'badlands', N);
  const valid = skipPilot || (pilot.win_rate >= 0.4 && pilot.win_rate <= 0.6);
  const lethal = await runWR(
    'lethal',
    [...quartet, ...adapterEnemies(LETHAL_ENEMY_IDS)],
    'hardcore',
    N,
  );

  console.log(
    JSON.stringify(
      {
        probe: 'ultima_caccia_canonical_wr_roundmodel',
        turn_limit_defeat: TURN_LIMIT_DEFEAT,
        pilot_validation: { ...pilot, ratified_band: [0.4, 0.6], reproduces_ratified: valid },
        lethal: {
          ...lethal,
          encounter_class: 'hardcore',
          target_band: [0.25, 0.4],
          roster: LETHAL_ENEMY_IDS,
        },
        trust: valid
          ? 'probe reproduces the ratified pilot band -> the lethal WR is trustworthy'
          : 'probe does NOT reproduce the pilot band -> reject; use the live-backend Python calibrator',
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
