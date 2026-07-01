'use strict';
// SPEC-I N=40 gates probe (ER1 role-gap / ER6 stresswave events).
//
// Both effects shipped flag-gated OFF (spec sez.8) -- gate PASSED 2026-06-10:
// the N=40 evidence below ratified the flip to default ON (opt-out 'false');
// the probe pins the flag per-arm explicitly either way:
//   ER1 -- `ERMES_ROLE_GAP_ENABLED` (#2704): party missing a BIOME_ROLE_DEMANDS role
//          -> +1 (PROPOSED) on ONE enemy stat (max-headroom BIOME_ECO_FIELD, ER2 +/-2
//          shared cap) at /api/session/start. The full-loop band roster uses job
//          `skirmisher` (not an ERMES role) -> ER1 is a NO-OP in the band sim. This
//          probe is the party role-aware harness: canonical role jobs from
//          BIOME_ROLE_DEMANDS (esploratore/guerriero/custode/tessitore) on the same
//          probe roster, gap-party vs complete-party arms.
//   ER6 -- `STRESSWAVE_EVENTS_ENABLED` (#2712): biomes.yaml stresswave wave
//          (baseline + escalation_rate * turn) one-shot event thresholds; mechanical:
//          `rescue` (+RESCUE_HEAL_HP player units) + `overrun` (+OVERRUN_BUDGET_BONUS
//          reinforcement budget, consume-once). abisso_vulcanico: baseline 0.36
//          esc 0.06, rescue 0.58 (turn 4), overrun 0.82 (turn 8).
//
// Paired arms over the SAME seeds (fp-delta-probe #2701 / overcharge-probe #2713
// pattern), replicate control arm = per-seed noise floor. The flag env vars are read
// per-request/per-call by the backend, so the probe toggles process.env between arms
// (one in-process app per arm, persistent listener, fetch keep-alive, 127.0.0.1
// explicit -- L-074).
//
// GOVERNANCE (L-069): this probe only REPORTS paired deltas as evidence for the
// SPEC-I sez.8 N=40 gates. It never flips the flags; the verdict is master-dd's.
//
// Usage:
//   node tools/sim/spec-i-gates-probe.js --effect er1 --runs 40 --seed-base 51000 \
//     --scaling '{...}' --out reports/sim/er1-role-gap-n40-<date>
//   node tools/sim/spec-i-gates-probe.js --effect er6 --runs 40 --seed-base 52000 \
//     --scaling '{...}' --out reports/sim/er6-stresswave-n40-<date>
//
// PROTOCOLLO EVIDENCE-GRADE (pack 06-10 + 06-11): UN processo per arm
// (`--arms off` / `--arms off2` / `--arms on` in invocazioni separate) poi
// `--aggregate --out <dir>` -- il batch same-process contamina le armi via
// stato modulo-globale combat (+0.20 fantasma, pack 06-10; -17pp fantasma,
// pack 06-11). Per ER6 su board authored: `--modulation duo_hardcore`
// (senza: roster 4 -> grid 6x6 -> entry tiles 10x10 off-grid -> spawner
// muto). Floor check per-gamba: scarta la gamba se off2-off e' anomalo
// (TKT-SIM-PROBE-ENTROPY: atollo +0.33 tra armi identiche, 2026-06-11).
//
// Caveat (carried into the reports): scenario-enemies builds the WAVE-1 roster only
// (authored later waves are not staged by the sim); the shared policy does basic
// attacks + zone pursuit, so deltas are the sim-fidelity floor of the real swing.

const fs = require('node:fs');
const path = require('node:path');
const { runEncounter } = require('./combat-adapter');
const { buildScenarioEnemies } = require('./scenario-enemies');
const { aggregateActionEconomy, pairDelta, meanSdCi, probeRoster } = require('./overcharge-probe');

// ---------------------------------------------------------------------------
// Pure helpers (unit-tested)
// ---------------------------------------------------------------------------

// Probe roster with canonical ERMES role jobs (same stats as the overcharge probe
// roster -- ap:2 canon -- only the job string changes; jobs carry no stat effects
// at /start, so cross-arm rosters differ ONLY in the ER1 filter input).
function rosterWithJobs(jobs) {
  const roster = probeRoster();
  return roster.map((u, i) => ({ ...u, job: jobs[i % jobs.length] }));
}

// ER1 proof (anti-pattern #14: assert the effect actually fired): max
// attack_mod_bonus across sistema units. ER1 writes the max-headroom
// BIOME_ECO_FIELD, which on a med-band biome with no other eco delta is
// attack_mod_bonus (first field iterated, all headroom equal). No decay wipes it
// without a status.attack_mod_buff key, so the post-run state still carries it.
function maxEnemyAtkBonus(units) {
  let max = 0;
  for (const u of units || []) {
    if (!u || u.controlled_by !== 'sistema') continue;
    const v = Number(u.attack_mod_bonus) || 0;
    if (v > max) max = v;
  }
  return max;
}

// ER6 per-run event extraction from the adapter's collectedEvents. The overrun
// bonus cannot raise total spawns past the policy max_total_spawns cap: its
// observable is the spawn TIMING (the capped pool fills earlier), so the spawn
// turns ride along.
function extractStresswave(events) {
  const out = { rescue_turn: null, overrun_turn: null, spawns: 0, spawn_turns: [] };
  for (const ev of events || []) {
    if (!ev) continue;
    if (ev.action_type === 'stresswave_event') {
      if (ev.result === 'rescue' && out.rescue_turn === null) out.rescue_turn = Number(ev.turn);
      if (ev.result === 'overrun' && out.overrun_turn === null) out.overrun_turn = Number(ev.turn);
    } else if (ev.action_type === 'reinforcement_spawn') {
      out.spawns += 1;
      out.spawn_turns.push(Number(ev.turn));
    }
  }
  return out;
}

// ER6 arm aggregate: event frequency + timing + spawn pressure on top of the base
// action-economy aggregate.
function aggregateStresswave(runs) {
  const rs = Array.isArray(runs) ? runs : [];
  const n = rs.length;
  const rescue = rs.filter((r) => r && r.rescue_turn !== null);
  const overrun = rs.filter((r) => r && r.overrun_turn !== null);
  return {
    rescue_rate: n ? rescue.length / n : null,
    rescue_turn: meanSdCi(rescue.map((r) => r.rescue_turn)),
    overrun_rate: n ? overrun.length / n : null,
    overrun_turn: meanSdCi(overrun.map((r) => r.overrun_turn)),
    spawns: meanSdCi(rs.map((r) => r.spawns)),
    // Timing observables for the capped-pool overrun effect.
    last_spawn_turn: meanSdCi(
      rs.filter((r) => r && (r.spawn_turns || []).length).map((r) => Math.max(...r.spawn_turns)),
    ),
  };
}

// ER7 per-run spawn-composition extraction. The cross-run biome population shapes
// the reinforcement pool (depleted role excluded, abundant role weighted up); the
// observable is therefore the SPECIES MIX of what actually spawned. The raw
// reinforcement_spawn event carries actor_id = `reinf_<n>_<unit_id>` (the species
// is the suffix), so we tally species per run.
function extractSpawnComposition(events) {
  const out = { spawns: 0, spawn_species: {} };
  for (const ev of events || []) {
    if (!ev || ev.action_type !== 'reinforcement_spawn') continue;
    const m = /^reinf_\d+_(.+)$/.exec(String(ev.actor_id || ''));
    const species = m ? m[1] : String(ev.actor_id || 'unknown');
    out.spawns += 1;
    out.spawn_species[species] = (out.spawn_species[species] || 0) + 1;
  }
  return out;
}

// ER7 arm aggregate: spawn composition by species + by trophic role + the
// prey/meso/apex shares (the effect-fired proof, anti-pattern #14). The role map
// is the SAME `ecosystemResolver.getSpeciesRoles` the consumer uses, so a depleted
// prey arm shows prey_share -> 0 and an abundant apex arm shows apex_share bumped.
function aggregateEr7(runs, biomeId) {
  const rs = Array.isArray(runs) ? runs : [];
  const n = rs.length || 1;
  let roleMap = {};
  try {
    roleMap =
      require('../../apps/backend/services/worldgen/ecosystemResolver').getSpeciesRoles(biomeId) ||
      {};
  } catch {
    roleMap = {};
  }
  const speciesTotals = {};
  const roleTotals = { prey: 0, mesopredator: 0, apex: 0, other: 0 };
  let spawnTotal = 0;
  for (const r of rs) {
    const sp = (r && r.spawn_species) || {};
    for (const [species, c] of Object.entries(sp)) {
      speciesTotals[species] = (speciesTotals[species] || 0) + c;
      const role = roleMap[species];
      const bucket = role === 'prey' || role === 'mesopredator' || role === 'apex' ? role : 'other';
      roleTotals[bucket] += c;
      spawnTotal += c;
    }
  }
  const bySpecies = {};
  for (const [s, t] of Object.entries(speciesTotals)) bySpecies[s] = t / n;
  const byRole = {};
  for (const [role, t] of Object.entries(roleTotals)) byRole[role] = t / n;
  return {
    spawns_per_run: spawnTotal / n,
    by_species: bySpecies,
    by_role: byRole,
    prey_share: spawnTotal ? roleTotals.prey / spawnTotal : 0,
    meso_share: spawnTotal ? roleTotals.mesopredator / spawnTotal : 0,
    apex_share: spawnTotal ? roleTotals.apex / spawnTotal : 0,
  };
}

// ER7 campaign seed: a fixed cross-run population state per arm. The spawner reads
// campaign.biomePopulation[biomeId] (per-role discrete state); the season-tick that
// produces it is exercised separately (er7-season-trace.js). Every role defaults to
// `stable`; `overrides` pins the arm's pressure (e.g. { prey: 'depleted' }).
function buildBiomePopulation(biomeId, overrides) {
  const merged = { apex: 'stable', mesopredator: 'stable', prey: 'stable', ...(overrides || {}) };
  const pop = {};
  for (const [role, state] of Object.entries(merged)) pop[role] = { state, seasons: 0 };
  return { [biomeId]: pop };
}

// ---------------------------------------------------------------------------
// Effect definitions
// ---------------------------------------------------------------------------

// badlands BIOME_ROLE_DEMANDS = { guerriero: 1, esploratore: 1 } (ermesExporter).
// gap party = one demanded role present + one missing (esploratore) -> negative gap;
// complete party = both demanded roles -> no step even with the flag ON.
const ER1_GAP_JOBS = ['guerriero', 'custode'];
const ER1_FULL_JOBS = ['guerriero', 'esploratore'];

const EFFECTS = {
  er1: {
    flag: 'ERMES_ROLE_GAP_ENABLED',
    // Measurement point: LONG elimination fight on the badlands biome. The
    // authored badlands encounter (enc_sabotage_01) is win-by-clock (hold the
    // zone 3 turns vs a 12-turn limit): pilots showed WR pinned at 1.0 at any
    // overlay (the +1 to-hit never gets enough enemy attack rolls to matter),
    // while the eco-apply proof still fired (enemy attack_mod_bonus 1.0 on
    // on_gap, 0 elsewhere). ER1's axis (enemy to-hit via the pseudoRng
    // miss-streak cycle) needs a fight long enough for streak cycles to land:
    // elimination on enc_hardcore_reinf_01 with the badlands biome override.
    // pressure stays 0 (Calm) -> the (bugged, see er6) spawner never ticks in.
    scenario: 'enc_hardcore_reinf_01',
    biomeId: 'badlands',
    seedPrefix: 'er1',
    // Post-flip 2026-06-10 (default engine ON): every arm pins the flag
    // EXPLICITLY -- off arms opt-out with 'false', on arms pin 'true'.
    arms: {
      off_gap: { env: { ERMES_ROLE_GAP_ENABLED: 'false' }, jobs: ER1_GAP_JOBS },
      // control replicate = noise floor
      off_gap2: { env: { ERMES_ROLE_GAP_ENABLED: 'false' }, jobs: ER1_GAP_JOBS },
      on_gap: { env: { ERMES_ROLE_GAP_ENABLED: 'true' }, jobs: ER1_GAP_JOBS },
      off_full: { env: { ERMES_ROLE_GAP_ENABLED: 'false' }, jobs: ER1_FULL_JOBS },
      on_full: { env: { ERMES_ROLE_GAP_ENABLED: 'true' }, jobs: ER1_FULL_JOBS },
    },
    deltas: [
      ['off_gap2 - off_gap (noise floor)', 'off_gap', 'off_gap2'],
      ['on_gap - off_gap (ER1 effect)', 'off_gap', 'on_gap'],
      ['on_full - off_full (no-op check)', 'off_full', 'on_full'],
    ],
  },
  er6: {
    flag: 'STRESSWAVE_EVENTS_ENABLED',
    scenario: 'enc_hardcore_reinf_01',
    biomeId: 'abisso_vulcanico',
    seedPrefix: 'er6',
    collectEvents: ['stresswave_event', 'reinforcement_spawn'],
    // The spawner tier gates on session.pressure = /start pressure_start (never
    // updated in-fight): without a floor the pool NEVER spawns and the overrun
    // budget bonus is structurally a no-op. 30 = Alert tier (reinforcement_budget
    // 1/tick): the pool drips 1 spawn per cooldown window (r3/r6/r9/r12 to the
    // max_total 4 cap), so the overrun +1 at t8 lands on the r9 tick and fills
    // the cap EARLY (last spawn r9 vs r12) -- the observable. At Escalated (50,
    // budget 2) the cap fills before t8 and the bonus is a no-op again.
    // Measurement-point choice (L-069), override with --pressure-start.
    //
    // FIXED 2026-06-11 (#2730): l'array-vs-{x,y} position drift scoperto dal
    // pilot di questo probe e' chiuso -- lo spawner spawna con PG vivi.
    // Evidence re-run (2026-06-11-spec-i-er6-overrun-n40): griglia tick
    // t2/5/8/11 al tier Alert, cap 4 -> l'overrun +1 morde SOLO se il
    // crossing atterra on-grid <=t8 (abisso t8: (2,5,8,8) vs (2,5,8,11)
    // 40/40); a t9+ il bonus cade su un tick gia' cap-clamped = no-op
    // (atollo). RICHIEDE --modulation duo_hardcore: senza, il roster 4
    // auto-scala la grid a 6x6 e gli entry tiles authored 10x10 sono
    // off-grid (spawner muto a prescindere dal fix).
    pressureStart: 30,
    // Post-flip 2026-06-10 (default engine ON): every arm pins the flag
    // EXPLICITLY -- off arms opt-out with 'false', on arms pin 'true'.
    arms: {
      off: { env: { STRESSWAVE_EVENTS_ENABLED: 'false' } },
      off2: { env: { STRESSWAVE_EVENTS_ENABLED: 'false' } }, // noise floor
      on: { env: { STRESSWAVE_EVENTS_ENABLED: 'true' } },
    },
    deltas: [
      ['off2 - off (noise floor)', 'off', 'off2'],
      ['on - off (ER6 effect)', 'off', 'on'],
    ],
  },
  er7: {
    flag: 'BIOME_POPULATION_ENABLED',
    // Measurement-point (L-069): the authored hardcore/sabotage badlands encounters
    // carry an OFF-foodweb reinforcement pool (predoni_nomadi), so the population
    // shaping (applyPopulationToPool) is a STRUCTURAL no-op there -- the same
    // trap as ER1 (band roster) / ER6 (6x6 grid). enc_badlands_foodweb_probe_01
    // is a probe-only encounter whose pool IS the badlands foodweb (prey
    // sand-burrower/rust-scavenger weak, meso echo-wing med, apex
    // dune-stalker/ferrimordax-rutilus strong) so the depleted-exclusion +
    // abundant-boost actually bite, and the differentiated stats make the WR band
    // gate informative (excluding weak prey / boosting strong apex shifts
    // difficulty). Same 10x10 + Alert-floor setup as ER6.
    scenario: 'enc_badlands_foodweb_probe_01',
    biomeId: 'badlands',
    seedPrefix: 'er7',
    collectEvents: ['reinforcement_spawn'],
    extractEvents: extractSpawnComposition,
    // ER7 reads campaign.biomePopulation[biomeId]; seed a fixed per-arm state.
    seedCampaign: true,
    pressureStart: 30,
    modulation: 'duo_hardcore',
    // off arms pin the flag 'false' (engine default ON since #2725 is ER1/ER6;
    // ER7's own flag stays OFF default -- pin both ways for hygiene). off carries
    // the same depleted campaign so the ONLY cross-arm difference vs on_depleted is
    // the flag. on_abundant uses an apex-abundant campaign; its baseline is still
    // `off` (flag-off = shaping skipped REGARDLESS of the campaign state).
    arms: {
      off: { env: { BIOME_POPULATION_ENABLED: 'false' }, popState: { prey: 'depleted' } },
      off2: { env: { BIOME_POPULATION_ENABLED: 'false' }, popState: { prey: 'depleted' } },
      on_depleted: { env: { BIOME_POPULATION_ENABLED: 'true' }, popState: { prey: 'depleted' } },
      on_abundant: { env: { BIOME_POPULATION_ENABLED: 'true' }, popState: { apex: 'abundant' } },
    },
    deltas: [
      ['off2 - off (noise floor)', 'off', 'off2'],
      ['on_depleted - off (prey exclusion)', 'off', 'on_depleted'],
      ['on_abundant - off (apex boost)', 'off', 'on_abundant'],
    ],
  },
};

// ---------------------------------------------------------------------------
// Arm runner (one in-process app per arm -- overcharge-probe pattern)
// ---------------------------------------------------------------------------

async function runArm({ effect, armName, armDef, runs, seedBase, scaling, onRun }) {
  // Flag env toggle scoped to the arm (the backend reads it per-request/per-call).
  const saved = {};
  for (const [k, v] of Object.entries(armDef.env || {})) {
    saved[k] = process.env[k];
    process.env[k] = v;
  }
  const { createApp } = require('../../apps/backend/app');
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
    const enemiesProto = buildScenarioEnemies(effect.scenario, scaling || {});
    if (!enemiesProto || !enemiesProto.length) {
      throw new Error(
        `scenario "${effect.scenario}" did not yield a YAML roster (anti-#14: no fallback)`,
      );
    }
    // ER7: seed a fixed cross-run population state for this arm. The spawner reads
    // campaign.biomePopulation[biomeId]; one campaign per arm, shared by all seeds
    // (the population is the arm's fixed condition; combat never mutates it here).
    let campaignId = null;
    if (effect.seedCampaign && armDef.popState) {
      const campaignStore = require('../../apps/backend/services/campaign/campaignStore');
      const camp = campaignStore.createCampaign('er7-probe', 'def', {
        biomePopulation: buildBiomePopulation(effect.biomeId, armDef.popState),
      });
      campaignId = camp.id;
    }
    for (let i = 0; i < runs; i += 1) {
      const seed = `${effect.seedPrefix}-${seedBase + i}`;
      const roster = armDef.jobs ? rosterWithJobs(armDef.jobs) : probeRoster();
      const enemies = enemiesProto.map((u) => ({ ...u, status: { ...(u.status || {}) } }));
      // eslint-disable-next-line no-await-in-loop
      const res = await runEncounter(http, {
        roster,
        enemies,
        scenarioId: effect.scenario,
        biomeId: effect.biomeId,
        seed,
        maxRounds: 160,
        ...(campaignId ? { campaignId } : {}),
        ...(effect.collectEvents ? { collectEvents: effect.collectEvents } : {}),
        ...(effect.pressureStart != null ? { pressureStart: effect.pressureStart } : {}),
        ...(effect.modulation ? { modulation: effect.modulation } : {}),
        // ER1 eco-apply proof reads the FIRST poll (pre-any-action): post-run
        // state is polluted by dynamic AI ability buffs on the same field.
        ...(armDef.jobs ? { captureFirstState: true } : {}),
        // #3157 F4: endSession INTENTIONALLY OMITTED here -- ER7 arms share one
        // campaign as a FIXED population condition across seeds ("combat never
        // mutates it here", above); /end would run the wound-persist pipeline on
        // campaign.woundedBiomes and contaminate later seeds' measurements.
        // Truncated logs from this probe are the accepted cost.
      });
      const rec = {
        seed,
        outcome: res.outcome,
        rounds: res.rounds,
        playerAttacks: res.playerAttacks,
        survivors: (res.survivorIds || []).length,
      };
      if (effect.collectEvents)
        Object.assign(rec, (effect.extractEvents || extractStresswave)(res.collectedEvents));
      if (armDef.jobs) rec.enemy_atk_bonus = maxEnemyAtkBonus(res.firstStateUnits);
      records.push(rec);
      if (onRun) onRun(rec, i, armName);
    }
    return records;
  } finally {
    await new Promise((resolve) => server.close(resolve));
    if (typeof close === 'function') await close().catch(() => {});
    for (const [k, v] of Object.entries(saved)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  }
}

// ---------------------------------------------------------------------------
// CLI + report
// ---------------------------------------------------------------------------

function parseArgs(argv) {
  const args = {
    effect: '',
    runs: 40,
    seedBase: 51000,
    out: '',
    commit: process.env.GIT_COMMIT || 'unknown',
    // Difficulty overlay (scenario-enemies knobs) so the baseline sits OFF the
    // win-rate ceiling (greedy sim saturates authored fights). Measurement-point
    // choice only, NOT a band ratification (L-069).
    scaling: {},
    // Report-only WR reference band (task gate: badlands [0.40, 0.60]).
    band: [0.4, 0.6],
  };
  for (let i = 2; i < argv.length; i += 1) {
    const tok = argv[i];
    const next = () => argv[(i += 1)];
    if (tok === '--effect') args.effect = String(next()).toLowerCase();
    else if (tok === '--runs') args.runs = Math.max(1, Number(next()));
    else if (tok === '--seed-base') args.seedBase = Number(next());
    else if (tok === '--out') args.out = next();
    else if (tok === '--commit') args.commit = next();
    else if (tok === '--scaling') args.scaling = JSON.parse(next());
    else if (tok === '--band') args.band = String(next()).split(',').map(Number);
    // Measurement-point overrides (pilot probes): scenario/biome stay coupled to
    // the effect defaults unless explicitly re-pointed.
    else if (tok === '--scenario') args.scenario = next();
    else if (tok === '--biome') args.biome = next();
    // Pilot helper: run a subset of arms (comma list), e.g. --arms off_gap.
    else if (tok === '--arms') args.arms = String(next()).split(',');
    else if (tok === '--pressure-start') args.pressureStart = Number(next());
    // Party modulation preset (10x10 board for the authored entry tiles) --
    // useful for the post-spawner-fix re-run.
    else if (tok === '--modulation') args.modulation = next();
    // Rebuild summary/report from per-arm runs.jsonl (process-isolated arms).
    else if (tok === '--aggregate') args.aggregate = true;
  }
  return args;
}

function fmt(x, digits = 2) {
  return x === null || x === undefined || Number.isNaN(x) ? 'n/a' : Number(x).toFixed(digits);
}

function renderReport({ effectKey, effect, args, summaries, deltas, extras }) {
  const lines = [];
  lines.push(`# SPEC-I ${effectKey.toUpperCase()} probe (flag \`${effect.flag}\`, N=${args.runs})`);
  lines.push('');
  lines.push(
    `Scenario \`${effect.scenario}\` | biome \`${effect.biomeId}\` | scaling ${JSON.stringify(
      args.scaling || {},
    )} | commit \`${args.commit}\` | seed base ${args.seedBase}.`,
  );
  lines.push('');
  lines.push('| arm | n | win rate (Wilson CI95) | timeouts | rounds (tick) | survivors |');
  lines.push('| --- | --- | --- | --- | --- | --- |');
  for (const [arm, s] of Object.entries(summaries)) {
    lines.push(
      `| ${arm} | ${s.n} | ${fmt(s.win_rate)} [${fmt(s.win_ci95[0])}, ${fmt(s.win_ci95[1])}] | ${
        s.timeouts
      } | ${fmt(s.rounds.mean, 1)} +/- ${fmt(s.rounds.sd, 1)} | ${fmt(s.survivors.mean, 1)} |`,
    );
  }
  lines.push('');
  if (extras && extras.er1) {
    lines.push('ER1 eco-apply proof (max enemy attack_mod_bonus, per arm mean):');
    lines.push('');
    for (const [arm, v] of Object.entries(extras.er1)) lines.push(`- ${arm}: ${fmt(v.mean)}`);
    lines.push('');
    lines.push(
      `Reference band (report-only, task gate): WR [${fmt(args.band[0])}, ${fmt(args.band[1])}].`,
    );
    lines.push('');
  }
  if (extras && extras.er6) {
    lines.push(
      '| arm | rescue rate | rescue turn | overrun rate | overrun turn | spawns | last spawn turn |',
    );
    lines.push('| --- | --- | --- | --- | --- | --- | --- |');
    for (const [arm, v] of Object.entries(extras.er6)) {
      lines.push(
        `| ${arm} | ${fmt(v.rescue_rate)} | ${fmt(v.rescue_turn.mean, 1)} | ${fmt(
          v.overrun_rate,
        )} | ${fmt(v.overrun_turn.mean, 1)} | ${fmt(v.spawns.mean, 1)} | ${fmt(
          v.last_spawn_turn.mean,
          1,
        )} |`,
      );
    }
    lines.push('');
  }
  if (extras && extras.er7) {
    lines.push('ER7 spawn composition (mean per run -- effect-fired proof, anti-#14):');
    lines.push('');
    lines.push(
      '| arm | spawns/run | prey share | meso share | apex share | by species (mean/run) |',
    );
    lines.push('| --- | --- | --- | --- | --- | --- |');
    for (const [arm, v] of Object.entries(extras.er7)) {
      const sp = Object.entries(v.by_species || {})
        .map(([s, c]) => `${s}:${fmt(c, 2)}`)
        .join(', ');
      lines.push(
        `| ${arm} | ${fmt(v.spawns_per_run, 1)} | ${fmt(v.prey_share)} | ${fmt(v.meso_share)} | ${fmt(
          v.apex_share,
        )} | ${sp} |`,
      );
    }
    lines.push('');
    lines.push(
      `Reference band (report-only, task gate): WR [${fmt(args.band[0])}, ${fmt(args.band[1])}].`,
    );
    lines.push('');
  }
  lines.push('## Paired deltas (same seeds)');
  lines.push('');
  lines.push('| pair | pairs | win-rate delta | rounds delta (CI95) | flips L->W / W->L |');
  lines.push('| --- | --- | --- | --- | --- |');
  for (const [name, d] of Object.entries(deltas)) {
    lines.push(
      `| ${name} | ${d.pairs} | ${fmt(d.win_rate_delta)} | ${fmt(d.rounds_delta.mean, 1)} [${fmt(
        d.rounds_delta.ci95[0],
        1,
      )}, ${fmt(d.rounds_delta.ci95[1], 1)}] | ${d.flips.loss_to_win} / ${d.flips.win_to_loss} |`,
    );
  }
  lines.push('');
  lines.push('Read the effect rows AGAINST the noise-floor row (control replicate): the');
  lines.push('session seed pins the start RNG but residual non-seeded randomness keeps');
  lines.push('same-seed replays from being identical, so a real effect must clear the floor.');
  lines.push('');
  lines.push('Evidence only -- the flag flip is a master-dd verdict (L-069, spec sez.8).');
  lines.push('');
  return lines.join('\n');
}

// Rebuild the cross-arm summary/report from per-arm runs.jsonl files. Used by
// --aggregate after PROCESS-ISOLATED arm runs: a single process running arms
// sequentially shares module-global combat state (e.g. the pseudoRng miss-streak
// maps), which inflates inter-arm noise -- the first same-process batch showed a
// +0.20 win-rate gap between two mechanically identical arms. One process per
// arm (--arms <one>) + --aggregate removes that channel.
function aggregateDir(args, effect) {
  const outDir = args.out;
  const armRuns = {};
  for (const armName of Object.keys(effect.arms)) {
    const p = path.join(outDir, armName, 'runs.jsonl');
    if (!fs.existsSync(p)) continue;
    armRuns[armName] = fs
      .readFileSync(p, 'utf8')
      .split('\n')
      .filter(Boolean)
      .map((l) => JSON.parse(l));
  }
  const summaries = Object.fromEntries(
    Object.entries(armRuns).map(([arm, runs]) => [arm, aggregateActionEconomy(runs)]),
  );
  const deltas = Object.fromEntries(
    effect.deltas
      .filter(([, c, l]) => armRuns[c] && armRuns[l])
      .map(([label, c, l]) => [label, pairDelta(armRuns[c], armRuns[l])]),
  );
  const extras = {};
  if (args.effect === 'er1') {
    extras.er1 = Object.fromEntries(
      Object.entries(armRuns).map(([arm, runs]) => [
        arm,
        meanSdCi(runs.map((r) => r.enemy_atk_bonus)),
      ]),
    );
  }
  if (args.effect === 'er6') {
    extras.er6 = Object.fromEntries(
      Object.entries(armRuns).map(([arm, runs]) => [arm, aggregateStresswave(runs)]),
    );
  }
  if (args.effect === 'er7') {
    extras.er7 = Object.fromEntries(
      Object.entries(armRuns).map(([arm, runs]) => [arm, aggregateEr7(runs, effect.biomeId)]),
    );
  }
  fs.writeFileSync(
    path.join(outDir, 'summary.json'),
    JSON.stringify({ args, isolated_arms: true, summaries, deltas, extras }, null, 2),
  );
  fs.writeFileSync(
    path.join(outDir, 'report.md'),
    renderReport({ effectKey: args.effect, effect, args, summaries, deltas, extras }),
  );
  process.stdout.write(
    `[spec-i-${args.effect}] aggregated ${Object.keys(armRuns).length} arms -> ${outDir}\n`,
  );
}

async function main() {
  // Hermetic gates (full-loop-batch pattern): no orchestrator spawn, no status poll.
  process.env.IDEA_ENGINE_STUB_ORCHESTRATOR = process.env.IDEA_ENGINE_STUB_ORCHESTRATOR || '1';
  process.env.IDEA_ENGINE_DISABLE_STATUS_REFRESH =
    process.env.IDEA_ENGINE_DISABLE_STATUS_REFRESH || '1';
  const args = parseArgs(process.argv);
  const effectDef = EFFECTS[args.effect];
  if (!effectDef) {
    console.error(`unknown --effect "${args.effect}" (use: ${Object.keys(EFFECTS).join(' | ')})`);
    process.exitCode = 1;
    return;
  }
  const effect = {
    ...effectDef,
    ...(args.scenario ? { scenario: args.scenario } : {}),
    ...(args.biome ? { biomeId: args.biome } : {}),
    ...(Number.isFinite(args.pressureStart) ? { pressureStart: args.pressureStart } : {}),
    ...(args.modulation ? { modulation: args.modulation } : {}),
  };
  if (args.aggregate) {
    if (!args.out) {
      console.error('--aggregate requires --out <dir> (the per-arm runs.jsonl root)');
      process.exitCode = 1;
      return;
    }
    return aggregateDir(args, effect);
  }
  // Guard: the probe owns the flag for the whole batch. Every arm pins it
  // explicitly ('true'/'false'), so a pre-set env would be silently masked --
  // refuse instead of measuring an ambiguous environment.
  if (process.env[effect.flag] !== undefined) {
    console.error(
      `${effect.flag} is already set in the environment -- unset it (the probe owns the toggle)`,
    );
    process.exitCode = 1;
    return;
  }
  const outDir = args.out || path.join('reports', 'sim', `spec-i-${args.effect}-probe`);
  const armRuns = {};
  const armEntries = Object.entries(effect.arms).filter(
    ([name]) => !args.arms || args.arms.includes(name),
  );
  for (const [armName, armDef] of armEntries) {
    const dir = path.join(outDir, armName);
    fs.mkdirSync(dir, { recursive: true });
    // eslint-disable-next-line no-await-in-loop
    const runs = await runArm({
      effect,
      armName,
      armDef,
      runs: args.runs,
      seedBase: args.seedBase,
      scaling: args.scaling,
      onRun: (rec, i, arm) =>
        process.stdout.write(
          `[spec-i-${args.effect}] ${arm} ${i + 1}/${args.runs} seed=${rec.seed} outcome=${
            rec.outcome
          }${rec.rescue_turn != null ? ` rescue@t${rec.rescue_turn}` : ''}${
            rec.overrun_turn != null ? ` overrun@t${rec.overrun_turn}` : ''
          }${rec.enemy_atk_bonus ? ` atk_bonus=${rec.enemy_atk_bonus}` : ''}\n`,
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
  const deltas = Object.fromEntries(
    effect.deltas.map(([label, controlArm, liveArm]) => [
      label,
      pairDelta(armRuns[controlArm], armRuns[liveArm]),
    ]),
  );
  const extras = {};
  if (args.effect === 'er1') {
    extras.er1 = Object.fromEntries(
      Object.entries(armRuns).map(([arm, runs]) => [
        arm,
        meanSdCi(runs.map((r) => r.enemy_atk_bonus)),
      ]),
    );
  }
  if (args.effect === 'er6') {
    extras.er6 = Object.fromEntries(
      Object.entries(armRuns).map(([arm, runs]) => [arm, aggregateStresswave(runs)]),
    );
  }
  if (args.effect === 'er7') {
    extras.er7 = Object.fromEntries(
      Object.entries(armRuns).map(([arm, runs]) => [arm, aggregateEr7(runs, effect.biomeId)]),
    );
  }
  fs.writeFileSync(
    path.join(outDir, 'summary.json'),
    JSON.stringify({ args, summaries, deltas, extras }, null, 2),
  );
  fs.writeFileSync(
    path.join(outDir, 'report.md'),
    renderReport({ effectKey: args.effect, effect, args, summaries, deltas, extras }),
  );
  process.stdout.write(`[spec-i-${args.effect}] done -> ${outDir}\n`);
}

module.exports = {
  rosterWithJobs,
  maxEnemyAtkBonus,
  extractStresswave,
  aggregateStresswave,
  extractSpawnComposition,
  aggregateEr7,
  buildBiomePopulation,
  EFFECTS,
  ER1_GAP_JOBS,
  ER1_FULL_JOBS,
};

if (require.main === module) {
  main().catch((err) => {
    console.error('[spec-i-gates-probe] FATAL:', err && err.stack ? err.stack : err);
    process.exitCode = 1;
  });
}
