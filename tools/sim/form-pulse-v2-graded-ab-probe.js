'use strict';
// W6 -- Form-Pulse trait v2 GRADED cross-biome A/B probe.
//
// The flip-readiness gate (build-spec docs/planning/2026-06-30-form-pulse-trait-v2-flip-readiness-
// build-spec.md, verdict 7): the passive-AI WR-only proxy could not validate the flip; this probe
// is the graded, power-sensitive combat measurement that produces the master-dd ratify evidence for
// `FORM_PULSE_TRAIT_V2_ENABLED` (offset value(s) + imprint weight `w` + imprint picks). L-069: this
// REPORTS; the flip + the values are the owner's verdict. It NEVER flips a flag.
//
// THE FLAG HAS TWO COUPLED EFFECTS (grilling verdict 1 = "net-neutral within-band"):
//   (buff) v2 grants the team MORE combat-effective traits -- the always-emerge shared branco +
//          one per-player minor + (via the unified producer) a tuple-determined imprint pick that
//          can win the branco slot at weight `w`. More player power.
//   (offset) at POST /start, formPulseV2EnemyHpOffset scales ENEMY HP up, proportional to
//          countGrantedV2BuffPower(playerUnits) (the count of granted branco/minor/imprint pool ids
//          on the team). anchor=1.4 (FORM_PULSE_V2_ENEMY_HP_OFFSET), reference=4
//          (FORM_PULSE_V2_REFERENCE_BUFF). Meant to CLAW BACK the buff so net stays band-neutral.
//
// To ratify the offset the two effects must be DECOUPLED, so the probe runs THREE arms on paired
// seeds (the trait synthesis is pure -> I control the roster traits independently of the env flag,
// which only gates the /start offset):
//   A baseline      = baseline-granted roster (branco only if |avg|>=0.30, NO minor/imprint), flag OFF.
//   B v2 no-offset  = v2-granted roster (always-branco + minor + imprint), flag OFF  -> pure player buff.
//   C v2 full       = v2-granted roster,                                    flag ON  -> buff + offset = the real flip.
// Signals:  player_buff = B-A ;  offset_claws_back = C-B ;  NET FLIP = C-A (should be ~band-neutral
// if the offset is well-tuned; a residual tells master-dd which way to move the anchor).
//
// MEASUREMENT POINT (power-sensitive, NOT saturated -- inc-2 evidence): the canonical badlands party
// (enc_badlands_pilot_01) vs the enc_badlands_ultima_caccia_01 wave-1 hardcore roster. Baseline sits
// at WR 0 / enemy_hp_remaining ~0.71 / ko_rate ~0.42 -- so a ~1.2 power/creature buff MOVES the
// graded channels (enemy_hp_remaining + ko_rate are the sensitive ones; WR/hp_remaining secondary).
// Reused from focus-fire-ab-probe.js so the fight is a proven unsaturated contest. Cross-biome via
// the biomeId enemy-HP multiplier (different contest levels per biome).
//
// POSITIVE CONTROL (avoid the D8 false-null): before measuring, assert the mechanic FIRES --
// countGrantedV2BuffPower(v2 roster) > 0 and the flag-ON /start actually raises enemy max_hp (offset
// applied). If it does not, THROW (a band-neutral would be a broken-probe artifact, not a real null).
//
// In-process (createApp + ONE persistent 127.0.0.1 listener + fetch keep-alive, NO prod port,
// node 22). Sim NOT bit-repro cross node-version (bands as ranges, ~+-0.05). Flag stays OFF in prod
// -- this measures, never flips.
//
// Confirming-sweep modes (master-dd ratify 2026-07-01): FORM_PULSE_V2_ENEMY_HP_OFFSET=1.25 (anchor
// A/B), --attrition (tougher enemy DPR -> un-mask the defensive buff on ko_rate), --w-resweep
// (pure-synthesis high-N party-stratified imprint-win curve), --drift-floor (order-drift control).
//
// Usage: node tools/sim/form-pulse-v2-graded-ab-probe.js [--n 40] [--seed 20260701]
//          [--biomes savana,badlands,...] [--w-sweep] [--w-resweep] [--attrition]
//          [--drift-floor] [--out reports/sim/<dir>]

const fs = require('node:fs');
const path = require('node:path');
const request = require('supertest');
const { createApp } = require('../../apps/backend/app');
const { runEncounter } = require('./combat-adapter');

const { aggregateFormPulses } = require('../../apps/backend/services/formPulseVc');
const {
  EMERGENCE_THRESHOLD,
  PROPOSED_BRANCO_TRAIT_MAPPING,
  emergePlayerMinorTrait,
  countGrantedV2BuffPower,
} = require('../../apps/backend/services/identity/brancoTraitEmergence');
const {
  produceBrancoTrait,
  resolveImprintWeight,
} = require('../../apps/backend/services/identity/brancoTraitProducer');
const {
  PROPOSED_IMPRINT_TRAIT_MAPPING,
} = require('../../apps/backend/services/imprint/imprintTraitGrant');

process.env.IDEA_ENGINE_DISABLE_STATUS_REFRESH = '1';
process.env.IDEA_ENGINE_STUB_ORCHESTRATOR = '1';

const V2_FLAG = 'FORM_PULSE_TRAIT_V2_ENABLED';
const AXES = Object.keys(PROPOSED_BRANCO_TRAIT_MAPPING); // 5 form-pulse creature axes
// Imprint tuple axes + their wired poles (from PROPOSED_IMPRINT_TRAIT_MAPPING, 8/8 wired).
const IMPRINT_POLES = Object.fromEntries(
  Object.entries(PROPOSED_IMPRINT_TRAIT_MAPPING).map(([axis, poles]) => [axis, Object.keys(poles)]),
);

// ---------------------------------------------------------------------------
// http + measurement-point roster/enemies (mirror focus-fire-ab-probe.js hardcore)
// ---------------------------------------------------------------------------
// Persistent listening server + fetch keep-alive (spec-i-gates-probe pattern, L-074). request(app)
// per call spins a fresh temp server each time -> thousands of ephemeral ports -> Windows EADDRINUSE
// on long cross-biome runs. One listener + a keep-alive agent reuses a single connection.
async function makeServerHttp(app) {
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
  const closeServer = () => new Promise((resolve) => server.close(resolve));
  return { http, closeServer };
}

const TIER_HP = { base: 7, elite: 10, apex: 14 };
const TIER_MOD = { base: 1, elite: 2, apex: 4 };
// Attrition mode (confirming sweep 3, master-dd ratify): the default fight is LOW-attrition (party
// survives ~0.92 HP) -> the defensive half of the v2 buff (damage_reduction / pelle_elastomera /
// risposta_di_fuga) is ceiling-masked. ATTRITION boosts enemy to-hit (+MOD) + damage so the party is
// ground below ~0.7 HP, un-masking the defensive grants on the hp_remaining channel.
let ATTRITION = false;
function hardcoreEnemies() {
  const modBoost = ATTRITION ? 6 : 0;
  const dmg = ATTRITION ? { min: 3, max: 6 } : { min: 1, max: 3 };
  return [
    ['dune-stalker', 'apex', { x: 5, y: 5 }, 'flanking'],
    ['echo-wing', 'elite', { x: 5, y: 4 }, 'aggressive'],
    ['echo-wing', 'elite', { x: 5, y: 6 }, 'aggressive'],
    ['rust-scavenger', 'base', { x: 6, y: 4 }, 'aggressive'],
    ['rust-scavenger', 'base', { x: 6, y: 6 }, 'aggressive'],
  ].map(([species, tier, position, aiProfile], i) => ({
    id: `sis_${i + 1}`,
    species,
    species_id: species,
    hp: TIER_HP[tier],
    max_hp: TIER_HP[tier],
    ap: 2,
    ap_max: 2,
    mod: TIER_MOD[tier] + modBoost,
    dc: tier === 'apex' ? 14 : tier === 'elite' ? 12 : 11,
    attack_range: 1,
    damage: dmg,
    initiative: tier === 'apex' ? 14 : 10,
    position,
    ai_profile: aiProfile,
    controlled_by: 'sistema',
    status: {},
  }));
}

const CANON_PARTY_SCENARIO = 'enc_badlands_pilot_01';
let _party = null;
async function fetchCanonicalParty() {
  if (_party) return _party;
  const { app, close } = createApp({ databasePath: null });
  try {
    const r = await request(app).get(`/api/tutorial/${CANON_PARTY_SCENARIO}`);
    if (r.status !== 200) throw new Error(`canon party fetch ${r.status}`);
    _party = (r.body.units || []).filter((u) => u.controlled_by === 'player');
    if (!_party.length) throw new Error('canon party empty');
    return _party;
  } finally {
    if (typeof close === 'function') await close().catch(() => {});
  }
}

// ---------------------------------------------------------------------------
// Deterministic LCG (reproducible; the report must replay). Mirror fp-trait-delta-probe.
// ---------------------------------------------------------------------------
function lcg(seed) {
  let s = seed >>> 0;
  return () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296;
}

// One team's form-pulse bars (one bar-set per party unit) + a team imprint tuple. Seeded.
function synthTeamInputs(nPlayers, rnd) {
  const players = {};
  for (let p = 0; p < nPlayers; p += 1) {
    const bars = {};
    for (const ax of AXES) bars[ax] = Math.round((2 * rnd() - 1) * 1000) / 1000;
    players[`p${p}`] = bars;
  }
  // team imprint tuple: one random wired pole per imprint axis (the aggregated team imprint).
  const imprintTuple = {};
  for (const [axis, poles] of Object.entries(IMPRINT_POLES)) {
    imprintTuple[axis] = poles[Math.floor(rnd() * poles.length)];
  }
  return { players, imprintTuple };
}

// Derive the granted trait ids for both arms from one team's inputs. Pure (engine funcs only, no
// co-op). w = imprint weight for the unified producer (v2 branco can be a form OR an imprint pick).
function deriveGrants(inputs, w) {
  const { players, imprintTuple } = inputs;
  const agg = aggregateFormPulses(
    Object.fromEntries(Object.entries(players).map(([pid, axes]) => [pid, { axes }])),
  );
  // baseline: branco only if |avg|>=0.30 (no minor, no imprint) -- today's pre-flip behavior.
  const baseBranco = produceBrancoTrait({
    aggregate: agg,
    combined: false,
    threshold: EMERGENCE_THRESHOLD,
  });
  // v2: always-emerge (threshold 0) combined producer (form-pulse vs imprint@w) + per-player minor.
  // nPlayers -> the W6 party-normalization (one w hits the imprint-win target across team sizes).
  const v2Branco = produceBrancoTrait({
    aggregate: agg,
    imprintTuple,
    combined: true,
    threshold: 0,
    w,
    nPlayers: Object.keys(players).length,
  });
  const brancoAxis = v2Branco && v2Branco.axis;
  const minors = Object.values(players).map((axes) => emergePlayerMinorTrait(axes, brancoAxis));
  return {
    baselineBrancoId: baseBranco ? baseBranco.trait_id : null,
    v2BrancoId: v2Branco ? v2Branco.trait_id : null,
    v2BrancoSource: v2Branco ? v2Branco.source || 'formpulse' : null, // 'formpulse' | 'imprint'
    minorIds: minors.map((m) => (m ? m.trait_id : null)),
  };
}

// Attach granted trait ids onto a fresh copy of the party. sharedBrancoId -> ALL units; minorIds[i]
// -> unit i (v2 only). Preserves each unit's own authored traits (grants are additive).
function attachTraits(party, sharedBrancoId, minorIds) {
  return party.map((u, i) => {
    const base = Array.isArray(u.traits) ? u.traits.slice() : [];
    if (sharedBrancoId && !base.includes(sharedBrancoId)) base.push(sharedBrancoId);
    const minor = minorIds && minorIds[i];
    if (minor && !base.includes(minor)) base.push(minor);
    return { ...u, hp: u.max_hp ?? u.hp, traits: base, status: {} };
  });
}

// ---------------------------------------------------------------------------
// Single run
// ---------------------------------------------------------------------------
async function runOne(http, roster, biomeId, seed) {
  const r = await runEncounter(http, {
    roster,
    enemies: hardcoreEnemies(),
    biomeId,
    seed,
    maxRounds: 40,
    gridSize: 10,
  });
  const rosterN = (r.rosterIds || []).length || roster.length;
  const kos = Number.isFinite(r.units_lost)
    ? r.units_lost
    : Math.max(0, rosterN - (r.survivorIds || []).length);
  return {
    outcome: r.outcome,
    rounds: r.rounds,
    kos,
    rosterN,
    hp_remaining_pct: r.hp_remaining_pct,
    enemy_hp_remaining_pct: r.enemy_hp_remaining_pct,
  };
}

function summarize(arr) {
  const n = arr.length || 1;
  const wins = arr.filter((r) => r.outcome === 'victory').length;
  const totalKo = arr.reduce((s, r) => s + r.kos, 0);
  const totalSlots = arr.reduce((s, r) => s + r.rosterN, 0) || 1;
  return {
    N: arr.length,
    win_rate: Number((wins / n).toFixed(4)),
    creature_ko_rate: Number((totalKo / totalSlots).toFixed(4)),
    mean_enemy_hp_remaining_pct: Number(
      (arr.reduce((s, r) => s + (r.enemy_hp_remaining_pct || 0), 0) / n).toFixed(4),
    ),
    mean_hp_remaining_pct: Number(
      (arr.reduce((s, r) => s + (r.hp_remaining_pct || 0), 0) / n).toFixed(4),
    ),
    avg_rounds: Number((arr.reduce((s, r) => s + (r.rounds || 0), 0) / n).toFixed(2)),
  };
}

// Signed delta (a - b) on the graded channels. enemy_hp_remaining DOWN = stronger team; we report
// raw signed so the direction is legible.
function armDelta(a, b) {
  return {
    win_rate: Number((a.win_rate - b.win_rate).toFixed(4)),
    enemy_hp_remaining: Number(
      (a.mean_enemy_hp_remaining_pct - b.mean_enemy_hp_remaining_pct).toFixed(4),
    ),
    creature_ko_rate: Number((a.creature_ko_rate - b.creature_ko_rate).toFixed(4)),
    hp_remaining: Number((a.mean_hp_remaining_pct - b.mean_hp_remaining_pct).toFixed(4)),
  };
}

// ---------------------------------------------------------------------------
// Positive control: the mechanic must FIRE (else a band-neutral is a broken probe, not a null).
// ---------------------------------------------------------------------------
async function positiveControl(http, party, w) {
  const rnd = lcg(999983);
  // find a team whose v2 grant is non-empty (almost always; loop a few seeds for safety)
  let grants = null;
  for (let i = 0; i < 8 && !grants; i += 1) {
    const g = deriveGrants(synthTeamInputs(party.length, rnd), w);
    if (g.v2BrancoId || g.minorIds.some(Boolean)) grants = g;
  }
  if (!grants) throw new Error('positive-control: v2 synthesis produced no grants in 8 seeds');
  const v2Roster = attachTraits(party, grants.v2BrancoId, grants.minorIds);
  const buff = countGrantedV2BuffPower(v2Roster);
  if (!(buff > 0)) {
    throw new Error(
      `positive-control: countGrantedV2BuffPower=${buff} on the v2 roster (expected >0)`,
    );
  }
  // offset must raise enemy max_hp when the flag is ON vs OFF, same roster+biome.
  const startOff = async (flag) => {
    const prev = process.env[V2_FLAG];
    if (flag) process.env[V2_FLAG] = 'true';
    else delete process.env[V2_FLAG];
    try {
      const r = await http.post('/api/session/start', {
        units: [...v2Roster, ...hardcoreEnemies()],
        biome_id: 'badlands',
        seed: 'fp-poscontrol',
      });
      const sid = r.body.session_id || r.body.id;
      const st = await http.get('/api/session/state', { session_id: sid });
      const foes = (st.body.units || []).filter((u) => u.controlled_by === 'sistema');
      return foes.reduce((s, u) => s + (Number(u.max_hp) || 0), 0);
    } finally {
      if (prev === undefined) delete process.env[V2_FLAG];
      else process.env[V2_FLAG] = prev;
    }
  };
  const enemyHpOff = await startOff(false);
  const enemyHpOn = await startOff(true);
  if (!(enemyHpOn > enemyHpOff)) {
    throw new Error(
      `positive-control: flag-ON enemy max_hp (${enemyHpOn}) did NOT exceed flag-OFF (${enemyHpOff}) -- the W1 offset did not fire; a band-neutral would be a broken probe`,
    );
  }
  return { buff, enemyHpOff, enemyHpOn, offset_ratio: Number((enemyHpOn / enemyHpOff).toFixed(3)) };
}

// ---------------------------------------------------------------------------
// Core: 3-arm cross-biome measurement
// ---------------------------------------------------------------------------
// driftFloor=true (order-drift control): arms B and C become BASELINE REPLICATES (same roster as A,
// flag OFF) in the SAME slot positions, so the reported "player_buff"/"net_flip" deltas are PURE
// same-process order-drift + non-seed noise at B's and C's exact run-distance from A. A real flag
// effect must EXCEED this floor. (Arm C runs 2 slots after A in the live design; the drift-floor's
// C-A quantifies exactly that positional bias.)
async function measureBiome(http, party, biomeId, N, seedBase, w, driftFloor = false) {
  const rnd = lcg(seedBase);
  const A = [];
  const B = [];
  const C = [];
  let impWins = 0;
  let grantedTeams = 0;
  for (let i = 0; i < N; i += 1) {
    const inputs = synthTeamInputs(party.length, rnd);
    const g = deriveGrants(inputs, w);
    if (g.v2BrancoSource === 'imprint') impWins += 1;
    if (g.v2BrancoId || g.minorIds.some(Boolean)) grantedTeams += 1;
    const seed = `fpg-${biomeId}-${seedBase + i}`;
    const rosterBaseline = attachTraits(party, g.baselineBrancoId, null);
    const rosterV2 = attachTraits(party, g.v2BrancoId, g.minorIds);
    const rosterB = driftFloor ? rosterBaseline : rosterV2;
    const rosterC = driftFloor ? rosterBaseline : rosterV2;
    // ARM A: baseline roster, flag OFF (no offset)
    delete process.env[V2_FLAG];
    // eslint-disable-next-line no-await-in-loop
    A.push(await runOne(http, rosterBaseline, biomeId, seed));
    // ARM B: v2 roster, flag OFF (traits present, NO offset -> pure player buff) [driftFloor: baseline replicate]
    // eslint-disable-next-line no-await-in-loop
    B.push(await runOne(http, rosterB, biomeId, seed));
    // ARM C: v2 roster, flag ON (offset applied -> the real flip) [driftFloor: baseline replicate, flag OFF]
    if (!driftFloor) process.env[V2_FLAG] = 'true';
    // eslint-disable-next-line no-await-in-loop
    C.push(await runOne(http, rosterC, biomeId, seed));
    delete process.env[V2_FLAG];
  }
  const sA = summarize(A);
  const sB = summarize(B);
  const sC = summarize(C);
  return {
    biome: biomeId,
    drift_floor: driftFloor,
    imprint_win_rate: Number((impWins / (N || 1)).toFixed(4)),
    granted_team_rate: Number((grantedTeams / (N || 1)).toFixed(4)),
    A_baseline: sA,
    B_v2_no_offset: sB,
    C_v2_full: sC,
    player_buff_B_minus_A: armDelta(sB, sA),
    offset_claws_C_minus_B: armDelta(sC, sB),
    net_flip_C_minus_A: armDelta(sC, sA),
  };
}

// ---------------------------------------------------------------------------
// PAIRED anchor sweep: per team, ONE baseline arm A (offset off) + one v2-full arm C at EACH anchor
// (same team, same seed, adjacent runs, same process). So `net C@anchor - A` for the different
// anchors share the SAME A and differ ONLY in the offset -> the anchor->net curve is drift-free and
// monotonic (unlike separate per-anchor runs whose ~+-0.06 residual noise made 1.25/1.30/1.40
// non-monotonic). This pins the anchor that actually nulls the offense over-compensation.
// ---------------------------------------------------------------------------
async function anchorSweep(http, party, biomeId, N, seedBase, w, anchors) {
  const rnd = lcg(seedBase);
  const A = [];
  const byAnchor = {};
  for (const a of anchors) byAnchor[a] = [];
  const savedAnchor = process.env.FORM_PULSE_V2_ENEMY_HP_OFFSET;
  for (let i = 0; i < N; i += 1) {
    const g = deriveGrants(synthTeamInputs(party.length, rnd), w);
    const seed = `fpanch-${biomeId}-${seedBase + i}`;
    const rosterBaseline = attachTraits(party, g.baselineBrancoId, null);
    const rosterV2 = attachTraits(party, g.v2BrancoId, g.minorIds);
    delete process.env[V2_FLAG];
    delete process.env.FORM_PULSE_V2_ENEMY_HP_OFFSET;
    // eslint-disable-next-line no-await-in-loop
    A.push(await runOne(http, rosterBaseline, biomeId, seed)); // arm A: baseline, no offset
    for (const a of anchors) {
      process.env[V2_FLAG] = 'true';
      process.env.FORM_PULSE_V2_ENEMY_HP_OFFSET = String(a);
      // eslint-disable-next-line no-await-in-loop
      byAnchor[a].push(await runOne(http, rosterV2, biomeId, seed)); // arm C @ anchor a
    }
    delete process.env[V2_FLAG];
  }
  if (savedAnchor === undefined) delete process.env.FORM_PULSE_V2_ENEMY_HP_OFFSET;
  else process.env.FORM_PULSE_V2_ENEMY_HP_OFFSET = savedAnchor;
  const sA = summarize(A);
  const net = {};
  for (const a of anchors) net[a] = armDelta(summarize(byAnchor[a]), sA);
  return { biome: biomeId, A_baseline: sA, net_by_anchor: net };
}

// ---------------------------------------------------------------------------
// w sweep (imprint weight): imprint win-rate + net graded impact as w varies (single biome).
// ---------------------------------------------------------------------------
async function wSweep(http, party, biomeId, N, seedBase, wValues) {
  const out = [];
  for (const w of wValues) {
    // eslint-disable-next-line no-await-in-loop
    const m = await measureBiome(http, party, biomeId, N, seedBase, w);
    out.push({
      w,
      imprint_win_rate: m.imprint_win_rate,
      net_flip_C_minus_A: m.net_flip_C_minus_A,
      C_v2_full: m.C_v2_full,
    });
  }
  return out;
}

// PURE-SYNTHESIS w re-sweep (no combat -> cheap high-N). The imprint_win_rate is a deterministic
// function of the synthesized teams (deriveGrants counts v2BrancoSource==='imprint'), so a high-N
// sweep firms the w ratify without a single encounter. Party-stratified: the win curve is
// party-size-dependent (a smaller team's averaged |avg| is noisier -> imprint competes differently).
function wResweep(nTeams, wGrid, partySizes, seed) {
  const out = [];
  for (const nPlayers of partySizes) {
    const row = { party_size: nPlayers, imprint_win_rate_by_w: {} };
    for (const w of wGrid) {
      const rnd = lcg(seed);
      let wins = 0;
      for (let i = 0; i < nTeams; i += 1) {
        const g = deriveGrants(synthTeamInputs(nPlayers, rnd), w);
        if (g.v2BrancoSource === 'imprint') wins += 1;
      }
      row.imprint_win_rate_by_w[w] = Number((wins / nTeams).toFixed(4));
    }
    out.push(row);
  }
  return out;
}

function parseArgs(argv) {
  const a = {
    n: 40,
    seed: 20260701,
    biomes: ['badlands', 'savana', 'caverna', 'abisso_vulcanico', 'palude'],
    wSweep: false,
    wResweep: false,
    resweepN: 4000,
    out: null,
  };
  for (let i = 2; i < argv.length; i += 1) {
    const t = argv[i];
    if (t === '--n') a.n = Math.max(1, Number(argv[(i += 1)]) || 40);
    else if (t === '--seed') a.seed = Number(argv[(i += 1)]) || a.seed;
    else if (t === '--biomes')
      a.biomes = String(argv[(i += 1)])
        .split(',')
        .filter(Boolean);
    else if (t === '--w-sweep') a.wSweep = true;
    else if (t === '--w-resweep') a.wResweep = true;
    else if (t === '--anchor-sweep') a.anchorSweep = true;
    else if (t === '--resweep-n') a.resweepN = Math.max(1, Number(argv[(i += 1)]) || 4000);
    else if (t === '--drift-floor') a.driftFloor = true;
    else if (t === '--attrition') a.attrition = true;
    else if (t === '--out') a.out = argv[(i += 1)];
  }
  return a;
}

async function main() {
  const args = parseArgs(process.argv);
  // Pure-synthesis w re-sweep: no combat, no app -> return early (confirming sweep for the w ratify).
  if (args.wResweep) {
    const wGrid = [0.3, 0.33, 0.35, 0.37, 0.38, 0.4, 0.42, 0.45, 0.5];
    const rows = wResweep(args.resweepN, wGrid, [2, 3, 4], args.seed);
    const report = {
      probe: 'form-pulse-v2-w-resweep',
      posture: 'pure synthesis (deterministic, no combat) -- firms the imprint weight w ratify',
      teams_per_cell: args.resweepN,
      seed: args.seed,
      target_band: '30-40% imprint-win',
      w_grid: wGrid,
      by_party_size: rows,
      node: process.version,
    };
    const json = JSON.stringify(report, null, 2);
    if (args.out) {
      fs.mkdirSync(args.out, { recursive: true });
      fs.writeFileSync(path.join(args.out, 'w-resweep.json'), json + '\n');
    }
    console.log(json);
    return;
  }
  if (process.env[V2_FLAG] !== undefined) {
    console.error(`${V2_FLAG} is already set -- unset it (the probe owns the toggle per arm)`);
    process.exitCode = 1;
    return;
  }
  ATTRITION = !!args.attrition; // confirming sweep 3: un-mask the defensive buff
  const w = resolveImprintWeight(process.env); // PROPOSED default 0.5 unless env override
  const party = await fetchCanonicalParty();
  const { app, close } = createApp({ databasePath: null });
  const { http, closeServer } = await makeServerHttp(app);
  try {
    const control = await positiveControl(http, party, w);
    process.stderr.write(
      `[fp-v2-graded] positive-control OK: buff=${control.buff}, offset ${control.enemyHpOff}->${control.enemyHpOn} (x${control.offset_ratio}) -> mechanic fires\n`,
    );
    // PAIRED anchor sweep (pins the balanced anchor drift-free): --anchor-sweep.
    if (args.anchorSweep) {
      const anchors = [1.15, 1.2, 1.25, 1.3, 1.35, 1.4];
      const rows = [];
      for (const biomeId of args.biomes) {
        // eslint-disable-next-line no-await-in-loop
        rows.push(await anchorSweep(http, party, biomeId, args.n, args.seed, w, anchors));
        process.stderr.write(`[fp-v2-graded] [ANCHOR-SWEEP] ${biomeId} done\n`);
      }
      const chans = ['enemy_hp_remaining', 'creature_ko_rate', 'hp_remaining'];
      const meanByAnchor = {};
      for (const a of anchors) {
        meanByAnchor[a] = {};
        for (const c of chans) {
          meanByAnchor[a][c] = Number(
            (rows.reduce((s, r) => s + r.net_by_anchor[a][c], 0) / rows.length).toFixed(4),
          );
        }
      }
      const report = {
        probe: 'form-pulse-v2-anchor-sweep (paired, drift-free)',
        posture: 'L-069 REPORTS; the balanced anchor is the master-dd verdict',
        party_size: party.length,
        n: args.n,
        seed: args.seed,
        imprint_weight_w: w,
        anchors,
        cross_biome_net_by_anchor: meanByAnchor,
        per_biome: rows,
        node: process.version,
      };
      const json = JSON.stringify(report, null, 2);
      if (args.out) {
        fs.mkdirSync(args.out, { recursive: true });
        fs.writeFileSync(path.join(args.out, 'anchor-sweep.json'), json + '\n');
      }
      console.log(json);
      return;
    }
    const biomes = [];
    for (const biomeId of args.biomes) {
      // eslint-disable-next-line no-await-in-loop
      const m = await measureBiome(http, party, biomeId, args.n, args.seed, w, args.driftFloor);
      biomes.push(m);
      process.stderr.write(
        `[fp-v2-graded]${args.driftFloor ? ' [DRIFT-FLOOR]' : ''} ${biomeId} done (impWin ${m.imprint_win_rate}, net enemy_hp ${m.net_flip_C_minus_A.enemy_hp_remaining})\n`,
      );
    }
    let sweep = null;
    if (args.wSweep) {
      sweep = await wSweep(http, party, args.biomes[0], args.n, args.seed, [0, 0.3, 0.5, 0.7, 1.0]);
    }
    // cross-biome aggregate of the net flip (mean over biomes, per channel).
    const chans = ['win_rate', 'enemy_hp_remaining', 'creature_ko_rate', 'hp_remaining'];
    const netAgg = {};
    for (const c of chans) {
      netAgg[c] = Number(
        (biomes.reduce((s, b) => s + b.net_flip_C_minus_A[c], 0) / (biomes.length || 1)).toFixed(4),
      );
    }
    const report = {
      probe: 'form-pulse-v2-graded-ab',
      spec: 'docs/planning/2026-06-30-form-pulse-trait-v2-flip-readiness-build-spec.md',
      posture: 'L-069 REPORTS; flip + offset/w/picks values = master-dd verdict',
      measurement_point:
        'enc_badlands_ultima_caccia_01 wave-1 hardcore (unsaturated) x canonical badlands party',
      party_size: party.length,
      n: args.n,
      seed: args.seed,
      imprint_weight_w: w,
      anchor_env: process.env.FORM_PULSE_V2_ENEMY_HP_OFFSET || '1.4 (default)',
      reference_env: process.env.FORM_PULSE_V2_REFERENCE_BUFF || '4 (default)',
      positive_control: control,
      biomes,
      cross_biome_net_flip_mean: netAgg,
      w_sweep: sweep,
      node: process.version,
    };
    const json = JSON.stringify(report, null, 2);
    if (args.out) {
      fs.mkdirSync(args.out, { recursive: true });
      fs.writeFileSync(path.join(args.out, 'report.json'), json + '\n');
      process.stderr.write(`[fp-v2-graded] -> ${args.out}/report.json\n`);
    }
    console.log(json);
  } finally {
    await closeServer().catch(() => {});
    if (typeof close === 'function') await close().catch(() => {});
    delete process.env[V2_FLAG];
  }
}

if (require.main === module) {
  main().catch((e) => {
    console.error('[fp-v2-graded-probe] FATAL:', e && e.stack ? e.stack : e);
    process.exitCode = 1;
  });
}

module.exports = { deriveGrants, attachTraits, synthTeamInputs, summarize, armDelta };
