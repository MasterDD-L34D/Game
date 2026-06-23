'use strict';
// fp-trait-delta-probe (N=40) -- Form-Pulse trait system v2 GRANT-POWER report.
//
// Sibling of fp-delta-probe.js (which ratifies the VC nudge cap). This probe ratifies the
// TRAIT-GRANT side of v2 (spec docs/planning/2026-06-23-aa01-form-pulse-player-trait-spec-draft.md):
// the always-emerge branco trait (threshold 0) + the per-player COMPLEMENT minor traits, vs
// the baseline (branco only when |avg| >= 0.30, no minor traits). It quantifies the P6-Fairness
// signal the spec flags: "how much combat power does v2 add per team?".
//
// Method (paired by construction, mirror fp-delta-probe): N synthetic co-op teams (2-4 players,
// each 5 random bars in [-1,1], seeded LCG -> reproducible). For each team apply the REAL engine
// (aggregateFormPulses + emergeBrancoTrait + emergePlayerMinorTrait) under BOTH arms; the only
// difference is the v2 flag (threshold 0 + minor grants), so the measured delta IS the feature.
// Combat power = a proxy from data/core/traits/active_effects.yaml effect magnitudes.
//
// L-069 posture: this probe REPORTS; the threshold/mapping ratification is a master-dd verdict.
//
// Usage: node tools/sim/fp-trait-delta-probe.js [--n 40] [--seed 1234] [--out reports/sim/<dir>]

const fs = require('node:fs');
const path = require('node:path');
const yaml = require('js-yaml');

const { aggregateFormPulses } = require('../../apps/backend/services/formPulseVc');
const {
  EMERGENCE_THRESHOLD,
  PROPOSED_BRANCO_TRAIT_MAPPING,
  emergeBrancoTrait,
  emergePlayerMinorTrait,
} = require('../../apps/backend/services/identity/brancoTraitEmergence');

const AXES = Object.keys(PROPOSED_BRANCO_TRAIT_MAPPING);

function arg(name, dflt) {
  const i = process.argv.indexOf(name);
  return i !== -1 && process.argv[i + 1] != null ? process.argv[i + 1] : dflt;
}

const N = parseInt(arg('--n', '40'), 10);
const SEED = parseInt(arg('--seed', '20260623'), 10);
const OUT = arg('--out', `reports/sim/fp-trait-n40-${SEED}`);

// Deterministic LCG (reproducible N -- no Math.random; the report must replay).
function lcg(seed) {
  let s = seed >>> 0;
  return () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296;
}
const rnd = lcg(SEED);

// EFFECTIVE-power proxy (harsh-review #2992 hardening): map a granted trait_id to an expected
// combat-power scalar from active_effects.yaml -- base effect magnitude, then DISCOUNTED by how
// reliably the trait fires (a MoS>=5 / elevation / unwired-enemy-tag gate fires far less often
// than an on-hit effect) and SCALED by tier (T2/T3 ceilings exceed the raw amount). Still a
// heuristic: it cannot model encounter terrain / enemy composition -- the offset it informs is
// DIRECTIONAL, ratify with a real combat A/B or N=200.
const TRAITS = yaml.load(
  fs.readFileSync(path.resolve(__dirname, '../../data/core/traits/active_effects.yaml'), 'utf8'),
).traits;
function traitPower(traitId) {
  const t = TRAITS[traitId];
  if (!t) return 0;
  let base;
  if (!t.effect) {
    // No `.effect` key: ally-synergy traits (e.g. legame_di_branco) use triggers_on_ally_attack
    // -- a per-creature conditional buff, ~2 power; otherwise an unmodelled trait ~0.5.
    base =
      t.triggers_on_ally_attack || (t.trigger && t.trigger.triggers_on_ally_attack) ? 2.0 : 0.5;
  } else {
    const amt = Number(t.effect.amount);
    switch (t.effect.kind) {
      case 'extra_damage':
      case 'damage_reduction':
      case 'heal':
      case 'buff_stat':
      case 'attack_bonus':
        base = Number.isFinite(amt) ? amt : 1;
        break;
      case 'apply_status':
        base = 1.5;
        break;
      case 'persistent_marker':
        base = 1;
        break;
      default:
        base = 0.5;
    }
  }
  const tr = t.trigger || {};
  let mult = 1;
  if (Number(tr.min_mos) >= 5) mult *= 0.6; // MoS>=5 is uncommon
  if (tr.requires === 'posizione_sopraelevata') mult *= 0.25; // elevation terrain is rare
  if (tr.requires_target_tag) mult *= 0; // enemy-tag system not wired -> engine-inert
  if (t.tier === 'T3') mult *= 1.6;
  else if (t.tier === 'T2') mult *= 1.2;
  return base * mult;
}

function randomTeam() {
  const n = 2 + Math.floor(rnd() * 3); // 2..4 players
  const players = {};
  for (let p = 0; p < n; p++) {
    const bars = {};
    for (const ax of AXES) bars[ax] = Math.round((2 * rnd() - 1) * 1000) / 1000;
    players[`p${p}`] = bars;
  }
  return players;
}

// One team -> { n, brancoEmergedBaseline, brancoEmergedV2, minorCount, powerBaseline, powerV2 }.
function evalTeam(players) {
  const n = Object.keys(players).length;
  const agg = aggregateFormPulses(
    Object.fromEntries(Object.entries(players).map(([pid, axes]) => [pid, { axes }])),
  );
  const baseBranco = emergeBrancoTrait(agg, { threshold: EMERGENCE_THRESHOLD });
  const v2Branco = emergeBrancoTrait(agg, { threshold: 0 });
  const brancoAxis = v2Branco && v2Branco.axis;

  // baseline: branco (only if >= 0.30) applied to all n creatures; no minor traits.
  const powerBaseline = baseBranco ? n * traitPower(baseBranco.trait_id) : 0;

  // v2: branco (always) applied to all n + one COMPLEMENT minor per player.
  let minorPower = 0;
  let minorCount = 0;
  for (const axes of Object.values(players)) {
    const minor = emergePlayerMinorTrait(axes, brancoAxis);
    if (minor) {
      minorPower += traitPower(minor.trait_id);
      minorCount += 1;
    }
  }
  const powerV2 = (v2Branco ? n * traitPower(v2Branco.trait_id) : 0) + minorPower;

  return {
    n,
    brancoEmergedBaseline: !!baseBranco,
    brancoEmergedV2: !!v2Branco,
    minorCount,
    powerBaseline,
    powerV2,
    powerAdded: powerV2 - powerBaseline,
    powerAddedPerCreature: (powerV2 - powerBaseline) / n,
  };
}

function stats(xs) {
  const n = xs.length;
  const mean = xs.reduce((a, b) => a + b, 0) / n;
  const variance = xs.reduce((a, b) => a + (b - mean) ** 2, 0) / Math.max(1, n - 1);
  const std = Math.sqrt(variance);
  const ci95 = 1.96 * (std / Math.sqrt(n));
  return { n, mean, std, ci95_lo: mean - ci95, ci95_hi: mean + ci95 };
}

const samples = [];
for (let i = 0; i < N; i++) samples.push(evalTeam(randomTeam()));

const report = {
  probe: 'fp-trait-delta-probe',
  spec: 'docs/planning/2026-06-23-aa01-form-pulse-player-trait-spec-draft.md',
  posture: 'L-069 REPORTS; ratification = master-dd verdict (N=40, MA3)',
  n: N,
  seed: SEED,
  baseline_branco_emergence_rate: samples.filter((s) => s.brancoEmergedBaseline).length / N,
  v2_branco_emergence_rate: samples.filter((s) => s.brancoEmergedV2).length / N,
  mean_minor_traits_per_team: stats(samples.map((s) => s.minorCount)).mean,
  team_power_baseline: stats(samples.map((s) => s.powerBaseline)),
  team_power_v2: stats(samples.map((s) => s.powerV2)),
  power_added_per_team: stats(samples.map((s) => s.powerAdded)),
  power_added_per_creature: stats(samples.map((s) => s.powerAddedPerCreature)),
};

fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(report, null, 2) + '\n');
fs.writeFileSync(
  path.join(OUT, 'samples.jsonl'),
  samples.map((s) => JSON.stringify(s)).join('\n') + '\n',
);

const pct = (x) => `${(100 * x).toFixed(1)}%`;
const f2 = (x) => x.toFixed(2);
console.log(`\nfp-trait-delta-probe  N=${N}  seed=${SEED}`);
console.log(
  `  branco emergence: baseline ${pct(report.baseline_branco_emergence_rate)} -> v2 ${pct(report.v2_branco_emergence_rate)} (threshold 0)`,
);
console.log(`  minor traits/team (mean): ${f2(report.mean_minor_traits_per_team)}`);
console.log(
  `  team power: baseline ${f2(report.team_power_baseline.mean)} -> v2 ${f2(report.team_power_v2.mean)}`,
);
console.log(
  `  POWER ADDED / team: ${f2(report.power_added_per_team.mean)} ` +
    `(CI95 ${f2(report.power_added_per_team.ci95_lo)}..${f2(report.power_added_per_team.ci95_hi)})`,
);
console.log(
  `  power added / creature: ${f2(report.power_added_per_creature.mean)} ` +
    `(CI95 ${f2(report.power_added_per_creature.ci95_lo)}..${f2(report.power_added_per_creature.ci95_hi)})`,
);
console.log(`  -> ${OUT}/report.json\n`);
