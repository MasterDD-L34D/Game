'use strict';
// W5 D6 -- imprint axis->trait GRANT graded re-ratify (per-pick fire-count + paired graded A/B).
//
// WHAT D6 IS (recon 2026-07-01, load-bearing): the imprint 4-tuple grants ONE branco-slot trait via
// the unified brancoTraitProducer (selectImprintAxis over PROPOSED_IMPRINT_TRAIT_MAPPING, 8 wired
// cells). The #3083 concern the N=40 ratify must close: are those 8 picks GENUINELY LIVE combat power
// in the sim, or do the situational (min_mos-gated) picks fire so rarely they are effectively inert
// (an engine-LIVE / surface-DEAD false-green that would pass a WR-only ratify at ~0 delta)?
//
// CRITICAL RECON FINDING -- D6's OWN flag is DEAD: W4 (grilling 2026-06-30) COLLAPSED
// IMPRINT_TRAIT_GRANT_ENABLED into FORM_PULSE_TRAIT_V2_ENABLED (brancoTraitProducer.js:18-23;
// coopOrchestrator._applyBrancoTraitEmergence passes `combined = isFormPulseTraitV2Enabled()`).
// `isImprintTraitGrantEnabled` survives only in comments -- NO live caller. So the imprint grant is a
// SUBSET of the W6 form-pulse-v2 bundle already measured (#3139): the W6 net-flip includes imprint-
// winning teams (~30-40% imprint_win_rate) with these very picks in the branco slot. D6 is therefore
// NOT a separately flippable flag; the residual, isolatable question is the PICK-LIVENESS one above.
//
// MECHANISM (like W6, the trait synthesis is pure -> we control the roster traits directly, bypassing
// coopOrchestrator + every flag): grant ONE imprint pick to the whole party and read the graded combat
// channels vs an empty-branco baseline on the SAME numeric seed. No env flag is needed -- the trait on
// the roster is evaluated by evaluateAttackTraits regardless of FORM_PULSE_TRAIT_V2 (that flag only
// gates the coopOrchestrator branco GRANT + the /start enemy-HP offset, neither of which we exercise;
// this measures the trait's raw power, NOT the offset -- the offset is W6's concern).
//
// ARMS (paired; a numeric seed re-seeds the combat RNG at every /start [session.js:2102] so same
// roster+seed = byte-identical regardless of run order -> the per-pick arms are all cleanly paired to
// ONE baseline, and the drift-floor is exactly 0):
//   A  baseline    = party, EMPTY branco slot (authored traits only).
//   Xk granted[k]  = party + imprint pick k on every unit (k in the 8 wired cells).
//   D  drift        = baseline replicate (same seed) -> proves determinism (delta must be exactly 0).
// Per-pick signal = mean(Xk) - mean(A) on the graded channels + a direct FIRE-COUNT.
//
// FIRE-COUNT (the decisive LIVE/inert proof, mirrors d8-chain-fire-count): monkeypatch
// evaluateAttackTraits BEFORE app.js (-> session.js) is required so session.js's destructured binding
// (session.js:41) captures the counting wrapper. Count, per granted pick, how often it returns
// triggered:true (i.e. the extra_damage / damage_reduction actually fires), and the party-hit
// denominator, so a min_mos-gated pick that fires ~never is exposed as near-inert even if its noisy
// graded delta looks non-zero.
//
// POSITIVE CONTROL (avoid a false null): a CLEAN no-gate extra_damage pick
// (occhi_analizzatori_di_tensione) MUST fire on party hits AND the evaluateStatusTraits patch MUST be
// invoked (>=1 call); if either fails, the instrument or the fight is broken -> THROW. The status-patch
// check makes the on_kill pick (ferocia)'s low fire-count a measured fact, not an unbound blind-spot.
//
// CHANNEL NOTE: extra_damage picks move enemy_hp_remaining DOWN; damage_reduction picks (defensive)
// move hp_remaining UP and only un-mask under attrition (the default badlands fight is low-attrition).
// Run --attrition to un-mask the defensive cells (same knob as the W6 probe).
//
// In-process (createApp + ONE persistent 127.0.0.1 listener + fetch keep-alive, NO prod port, node 22;
// sim NOT bit-repro cross node-version -> bands as ranges ~+-0.05). Flags stay OFF -- this measures.
//
// Usage: node tools/sim/d6-imprint-grant-graded-probe.js [--n 40] [--seed 20260701]
//          [--biomes badlands,savana,...] [--attrition] [--out reports/sim/<dir>]

// -- monkeypatch the trait engine BEFORE any require of app.js/session.js (module-cache binding) --
const traitEngine = require('../../apps/backend/services/traitEffects');
const {
  PROPOSED_IMPRINT_TRAIT_MAPPING,
} = require('../../apps/backend/services/imprint/imprintTraitGrant');

const IMPRINT_PICKS = Object.entries(PROPOSED_IMPRINT_TRAIT_MAPPING).flatMap(([axis, poles]) =>
  Object.entries(poles).map(([pole, trait_id]) => ({ axis, pole, trait_id })),
);
const TRACKED = new Set(IMPRINT_PICKS.map((p) => p.trait_id));
const fireCounts = {}; // trait_id -> times triggered:true returned
for (const p of IMPRINT_PICKS) fireCounts[p.trait_id] = 0;
let partyHitCalls = 0; // evaluateAttackTraits calls where a PLAYER actor landed a hit
let statusCalls = 0; // evaluateStatusTraits invocations (proves the on_kill/status patch binds)

// Count triggered:true tracked picks in a { trait_effects } return (both trait pipelines share the shape).
function _tallyFires(r) {
  if (r && Array.isArray(r.trait_effects)) {
    for (const te of r.trait_effects) {
      if (te && te.triggered && TRACKED.has(te.trait)) fireCounts[te.trait] += 1;
    }
  }
}
const _origEval = traitEngine.evaluateAttackTraits;
traitEngine.evaluateAttackTraits = function countingEvaluateAttackTraits(argObj) {
  const r = _origEval(argObj);
  const ar = argObj && argObj.attackResult;
  const actor = argObj && argObj.actor;
  if (actor && actor.controlled_by === 'player' && ar && ar.hit) partyHitCalls += 1;
  _tallyFires(r); // extra_damage / damage_reduction picks fire here
  return r;
};
// on_kill apply_status picks (ferocia) fire in evaluateStatusTraits, NOT evaluateAttackTraits --
// patch it too or ferocia's fire-count is a blind-spot 0 (session.js:42 destructures it here).
const _origStatus = traitEngine.evaluateStatusTraits;
traitEngine.evaluateStatusTraits = function countingEvaluateStatusTraits(argObj) {
  statusCalls += 1;
  const r = _origStatus(argObj);
  _tallyFires(r);
  return r;
};

process.env.IDEA_ENGINE_DISABLE_STATUS_REFRESH = '1';
process.env.IDEA_ENGINE_STUB_ORCHESTRATOR = '1';

const fs = require('node:fs');
const path = require('node:path');
const request = require('supertest');
const { createApp } = require('../../apps/backend/app');
const { runEncounter } = require('./combat-adapter');
// Reuse the W6 probe's validated helpers (single source of truth for the measurement geometry).
const { attachTraits, summarize, armDelta } = require('./form-pulse-v2-graded-ab-probe');

// ---------------------------------------------------------------------------
// http + measurement-point roster/enemies (mirror form-pulse-v2-graded-ab-probe hardcore).
// ---------------------------------------------------------------------------
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

async function runOne(http, roster, biomeId, seed) {
  const r = await runEncounter(http, {
    roster,
    enemies: hardcoreEnemies(),
    biomeId,
    seed,
    maxRounds: 40,
    gridSize: 10, // no-op without inline terrain (Codex #3139 P2); identical board across arms
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

// ---------------------------------------------------------------------------
// Positive control: a CLEAN no-gate extra_damage pick MUST fire on party hits, AND the
// evaluateStatusTraits patch MUST be invoked (so the on_kill pick ferocia's 0/low count is a real
// exercise fact, not a blind-spot from an unbound status patch -- cavecrew #3149).
// ---------------------------------------------------------------------------
const POSITIVE_CONTROL_PICK = 'occhi_analizzatori_di_tensione'; // senses/ACUTO, attack/extra_damage no-gate
async function positiveControl(http, party, biomeId) {
  const before = fireCounts[POSITIVE_CONTROL_PICK];
  const statusBefore = statusCalls;
  const roster = attachTraits(party, POSITIVE_CONTROL_PICK, null);
  // a few runs so a hit lands even on an unlucky seed
  for (let i = 0; i < 3; i += 1) {
    // eslint-disable-next-line no-await-in-loop
    await runOne(http, roster, biomeId, 777001 + i);
  }
  const fired = fireCounts[POSITIVE_CONTROL_PICK] - before;
  if (!(fired > 0)) {
    throw new Error(
      `positive-control: ${POSITIVE_CONTROL_PICK} (no-gate extra_damage) fired ${fired} times in 3 runs -- ` +
        `the evaluateAttackTraits patch did not bind or the party never lands a qualifying hit; a 0 fire-count would be a FALSE null`,
    );
  }
  // The status pipeline runs post-attack every time performAttack resolves a hit, so >=1 party attack
  // MUST have driven evaluateStatusTraits. A 0 here means the status patch failed to bind -> ferocia's
  // (on_kill) fire-count would be an unprovable blind-spot rather than a measured exercise fact.
  const statusInvoked = statusCalls - statusBefore;
  if (!(statusInvoked > 0)) {
    throw new Error(
      `positive-control: evaluateStatusTraits was invoked ${statusInvoked} times -- the status patch did NOT bind, ` +
        `so the on_kill pick (ferocia) count would be a FALSE blind-spot 0`,
    );
  }
  // reset the tracked counter for this pick so the control runs do not pollute the measurement
  fireCounts[POSITIVE_CONTROL_PICK] = 0;
  return {
    pick: POSITIVE_CONTROL_PICK,
    fired_in_control: fired,
    status_invoked_in_control: statusInvoked,
  };
}

// ---------------------------------------------------------------------------
// Core: per-pick paired graded measurement on one biome.
// ---------------------------------------------------------------------------
async function measureBiome(http, party, biomeId, N, seedBase) {
  const A = []; // baseline (empty branco)
  const D = []; // drift replicate (baseline, same seed) -> determinism floor
  const byPick = {};
  const pickHits = {}; // party-hit denominator accumulated during THIS biome's pick arms
  const pickFires = {}; // fires accumulated during THIS biome's pick arms (fireCounts is a GLOBAL
  // cumulative -> snapshot the per-arm delta so a multi-biome run does not carry earlier biomes'
  // fires into this biome's report / total (Codex P2 #3149).
  for (const p of IMPRINT_PICKS) {
    byPick[p.trait_id] = [];
    pickHits[p.trait_id] = 0;
    pickFires[p.trait_id] = 0;
  }
  const rosterBaseline = attachTraits(party, null, null);
  for (let i = 0; i < N; i += 1) {
    const seed = seedBase + i; // NUMERIC (session.js:2102) -> arms genuinely paired + reproducible
    // eslint-disable-next-line no-await-in-loop
    A.push(await runOne(http, rosterBaseline, biomeId, seed));
    // eslint-disable-next-line no-await-in-loop
    D.push(await runOne(http, rosterBaseline, biomeId, seed)); // replicate: must equal A exactly
    for (const p of IMPRINT_PICKS) {
      const hitsBefore = partyHitCalls;
      const firesBefore = fireCounts[p.trait_id];
      const roster = attachTraits(party, p.trait_id, null);
      // eslint-disable-next-line no-await-in-loop
      byPick[p.trait_id].push(await runOne(http, roster, biomeId, seed));
      pickHits[p.trait_id] += partyHitCalls - hitsBefore;
      pickFires[p.trait_id] += fireCounts[p.trait_id] - firesBefore;
    }
  }
  const sA = summarize(A);
  const sD = summarize(D);
  const picks = IMPRINT_PICKS.map((p) => {
    const sX = summarize(byPick[p.trait_id]);
    const fires = pickFires[p.trait_id];
    const hits = pickHits[p.trait_id] || 0;
    return {
      trait_id: p.trait_id,
      axis: p.axis,
      pole: p.pole,
      fires,
      party_hits: hits,
      // Denominator = party OFFENSIVE hits. A clean rate only for offense-on-hit picks (extra_damage);
      // for defensive (fires when the party is TARGET) and on_kill (fires on kills) picks it is a
      // category mismatch -> lean on absolute `fires` + `delta_vs_baseline`, not this (cavecrew #3149).
      fires_per_party_hit: Number((fires / (hits || 1)).toFixed(4)),
      granted: sX,
      delta_vs_baseline: armDelta(sX, sA),
    };
  });
  return {
    biome: biomeId,
    attrition: ATTRITION,
    baseline: sA,
    drift_replicate: sD,
    drift_floor: armDelta(sD, sA), // must be all-zero (determinism check)
    picks,
  };
}

function parseArgs(argv) {
  const a = {
    n: 40,
    seed: 20260701,
    biomes: ['badlands'],
    attrition: false,
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
    else if (t === '--attrition') a.attrition = true;
    else if (t === '--out') a.out = argv[(i += 1)];
  }
  return a;
}

async function main() {
  const args = parseArgs(process.argv);
  ATTRITION = !!args.attrition;
  const party = await fetchCanonicalParty();
  const partyTraits = party.map((u) => ({
    id: u.id,
    traits: Array.isArray(u.traits) ? u.traits : [],
  }));
  const { app, close } = createApp({ databasePath: null });
  const { http, closeServer } = await makeServerHttp(app);
  try {
    const control = await positiveControl(http, party, args.biomes[0]);
    process.stderr.write(
      `[d6-imprint-graded] positive-control OK: ${control.pick} fired ${control.fired_in_control}x -> instrument binds, a 0 fire-count is a REAL null\n`,
    );
    const biomes = [];
    for (const biomeId of args.biomes) {
      // eslint-disable-next-line no-await-in-loop
      const m = await measureBiome(http, party, biomeId, args.n, args.seed);
      biomes.push(m);
      const live = m.picks.filter((p) => p.fires > 0).length;
      process.stderr.write(
        `[d6-imprint-graded]${ATTRITION ? ' [ATTRITION]' : ''} ${biomeId} done (${live}/${m.picks.length} picks fired; drift enemy_hp ${m.drift_floor.enemy_hp_remaining})\n`,
      );
    }
    // cross-biome aggregate: per-pick mean fire-rate + mean graded delta.
    const aggByPick = IMPRINT_PICKS.map((p) => {
      const rows = biomes.map((b) => b.picks.find((x) => x.trait_id === p.trait_id));
      const mean = (sel) => Number((rows.reduce((s, r) => s + sel(r), 0) / rows.length).toFixed(4));
      const totalFires = rows.reduce((s, r) => s + r.fires, 0);
      const totalHits = rows.reduce((s, r) => s + r.party_hits, 0);
      return {
        trait_id: p.trait_id,
        axis: p.axis,
        pole: p.pole,
        total_fires: totalFires,
        total_party_hits: totalHits,
        fires_per_party_hit: Number((totalFires / (totalHits || 1)).toFixed(4)), // denominator caveat: see measureBiome

        mean_delta_enemy_hp_remaining: mean((r) => r.delta_vs_baseline.enemy_hp_remaining),
        mean_delta_creature_ko_rate: mean((r) => r.delta_vs_baseline.creature_ko_rate),
        mean_delta_hp_remaining: mean((r) => r.delta_vs_baseline.hp_remaining),
      };
    });
    const report = {
      probe: 'd6-imprint-grant-graded',
      spec: 'docs/planning/2026-06-23-aa01-imprint-axis-trait-grant-spec-draft.md',
      recon:
        "D6's own flag IMPRINT_TRAIT_GRANT_ENABLED is DEAD (W4-collapsed into FORM_PULSE_TRAIT_V2_ENABLED); " +
        'this isolates the imprint pick liveness/power that the W6 bundle folds in.',
      posture:
        'L-069 REPORTS; the mapping/w ratify = master-dd verdict (folds into the W6 owner TODO)',
      measurement_point:
        'enc_badlands_pilot_01 party vs hardcore roster (form-pulse-v2-graded geometry)',
      party_size: party.length,
      party_authored_traits: partyTraits,
      n: args.n,
      seed: args.seed,
      attrition: ATTRITION,
      positive_control: control,
      per_biome: biomes,
      cross_biome_by_pick: aggByPick,
      node: process.version,
    };
    const json = JSON.stringify(report, null, 2);
    if (args.out) {
      fs.mkdirSync(args.out, { recursive: true });
      fs.writeFileSync(path.join(args.out, 'report.json'), json + '\n');
      process.stderr.write(`[d6-imprint-graded] -> ${args.out}/report.json\n`);
    }
    console.log(json);
  } finally {
    await closeServer().catch(() => {});
    if (typeof close === 'function') await close().catch(() => {});
  }
}

if (require.main === module) {
  main().catch((e) => {
    console.error('[d6-imprint-graded-probe] FATAL:', e && e.stack ? e.stack : e);
    process.exitCode = 1;
  });
}

module.exports = { IMPRINT_PICKS, measureBiome };
