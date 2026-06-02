'use strict';
// fase-2b meta-band-aggregator. PURE: given a list of full-loop run-results (runFullLoop
// output), computes the 5 meta band-metrics (spec §7) and places each vs a PROVISIONAL
// range. No I/O, no clock, no randomness -> deterministic + unit-testable.
//
// The ranges below are PROVISIONAL (Claude-derived from the cited industry sources in the
// goal doc / spec §7). They are NOT ratified: master-dd ratifies the EXACT band numbers
// post-N=40, exactly like the combat bands (L-069). The aggregator's job is the PROCESS
// (compute + place), not to assert canon. An anti-pattern guard (spec §7): these bands keep
// the design SPACE healthy (Quality-Diversity) -- do NOT optimize to a single best run.

const { roleOf } = require('./species-roles');

const PROVISIONAL_BANDS = {
  // % campaigns completed over N runs. XCOM Long War 2: completable-but-hard.
  completion_rate: [0.4, 0.7],
  // survivors / units-that-fought over the arc. Exclusive (>0 & <100%): real losses, no
  // wipe, not a cake-walk. XCOM-LW2 attrition + AI War scaling.
  roster_attrition: [0, 1],
  // build-power drift = (build power per chapter, last third) / (first third). Bounded:
  // neither runaway power-creep (>2x) nor collapse (<0.5x). Machinations / Hades-StS curve.
  economy_flow: [0.5, 2.0],
  // composite (recruit happens + earned-affinity gate fires + mating fires) -> monotonic,
  // non-stall. wesnoth recruit/retain + SoT 27-MATING_NIDO. No single [lo,hi].
  relationship_progress: null,
  // mean offspring per run >= threshold (breeding is exercised). Niche + Spore. >=1.
  offspring_viability: [1, null],
  // >= N distinct role_classes across the recruited roster (healthy spread, no collapse).
  // POLICY-SENSITIVE: the dominant role(s) diverge by temperament -> this is where P4 is
  // measurable (the quantity metrics above are policy-insensitive). >=3.
  roster_composition: [3, null],
  note:
    'WARN: Claude-derived PROVISIONAL ranges (spec §7) -- pending master-dd ratify post-N=40 ' +
    '(L-069). NOT canon. Keep the design space healthy (Quality-Diversity); do not optimize ' +
    'to a single best run.',
};

function mean(arr) {
  if (!arr || arr.length === 0) return 0;
  return arr.reduce((s, x) => s + (Number(x) || 0), 0) / arr.length;
}

// Build-power drift across one run's chapters: ratio of mean build power per chapter in the
// last third vs the first third. 1.0 = flat (healthy). Returns 1 when there is too little
// signal to measure (a single chapter can't drift).
function buildPowerDrift(chapters) {
  const bp = (chapters || []).map(
    (c) => (Number(c && c.xpGranted) || 0) + (Number(c && c.mpEarned) || 0),
  );
  if (bp.length < 2) return 1;
  const third = Math.max(1, Math.floor(bp.length / 3));
  const firstAvg = mean(bp.slice(0, third));
  const lastAvg = mean(bp.slice(-third));
  if (firstAvg === 0) return lastAvg === 0 ? 1 : Infinity;
  return lastAvg / firstAvg;
}

function round(x, dp = 3) {
  if (!Number.isFinite(x)) return x;
  const f = 10 ** dp;
  return Math.round(x * f) / f;
}

// Aggregate N run-results into the 5 band-metrics + placement. Tolerates [] (n=0 -> every
// metric out of band) and missing fields (treated as 0/empty), never throws.
function aggregate(runs) {
  const list = Array.isArray(runs) ? runs : [];
  const n = list.length;

  // 1. completion_rate
  const completed = list.filter((r) => r && r.completed === true).length;
  const completionValue = n === 0 ? 0 : round(completed / n);
  const [cLo, cHi] = PROVISIONAL_BANDS.completion_rate;
  const completion_rate = {
    value: completionValue,
    range: PROVISIONAL_BANDS.completion_rate,
    in_band: n > 0 && completionValue >= cLo && completionValue <= cHi,
    note: 'completed campaigns / N',
  };

  // 2. roster_attrition = survivors / units-that-fought (initial party + combat-recruits;
  // economy-recruits do not fight). In (0,1) exclusive.
  const survivorRatios = list.map((r) => {
    const fought = (Number(r && r.initialRosterSize) || 0) + ((r && r.recruited) || []).length;
    const survivors = ((r && r.finalRoster) || []).length;
    return fought === 0 ? 0 : survivors / fought;
  });
  const attritionValue = n === 0 ? 0 : round(mean(survivorRatios));
  const roster_attrition = {
    value: attritionValue,
    range: PROVISIONAL_BANDS.roster_attrition,
    in_band: n > 0 && attritionValue > 0 && attritionValue < 1,
    note: 'survivors / units-that-fought (exclusive: real losses, no wipe)',
  };

  // 3. economy_flow: PE earned + build power (XP + MP) + drift; PI sink surfaced.
  const peEarnedAvg = round(
    mean(list.map((r) => Number(r && r.economy && r.economy.peEarnedTotal) || 0)),
  );
  const buildPowerAvg = round(
    mean(
      list.map(
        (r) =>
          (Number(r && r.economy && r.economy.xpGrantedTotal) || 0) +
          (Number(r && r.economy && r.economy.mpEarnedTotal) || 0),
      ),
    ),
  );
  const driftAvg = n === 0 ? 1 : round(mean(list.map((r) => buildPowerDrift(r && r.chapters))));
  const piSinkExercised = list.some(
    (r) => (Number(r && r.economy && r.economy.piSpentTotal) || 0) > 0,
  );
  const piPickAttempts = list.reduce(
    (s, r) => s + (Number(r && r.economy && r.economy.piPickAttempts) || 0),
    0,
  );
  const piInsufficient = list.reduce(
    (s, r) => s + (Number(r && r.economy && r.economy.piInsufficient) || 0),
    0,
  );
  const [eLo, eHi] = PROVISIONAL_BANDS.economy_flow;
  // Codex #2568 P2: build-power drift defaults to the neutral 1 when there is nothing to
  // measure (empty chapters / zero grants), which sits INSIDE the band. Guard on a real
  // signal so a no-reward batch (backend regression that stops emitting XP/MP/PE, or an
  // all-failed batch) reads out-of-band instead of falsely certifying a healthy economy.
  const hasSignal = buildPowerAvg > 0;
  const economy_flow = {
    pe_earned_avg: peEarnedAvg,
    build_power_avg: buildPowerAvg,
    build_power_drift: driftAvg,
    pi_sink_exercised: piSinkExercised,
    pi_pick_attempts: piPickAttempts,
    pi_insufficient: piInsufficient,
    has_signal: hasSignal,
    range: PROVISIONAL_BANDS.economy_flow,
    in_band: n > 0 && hasSignal && driftAvg >= eLo && driftAvg <= eHi,
    note: !hasSignal
      ? 'NO economy signal across the batch (zero XP/MP/PE) -> cannot certify economy_flow'
      : piSinkExercised
        ? `PE earned + build-power drift; PI sink exercised (${piPickAttempts} attempts)`
        : piPickAttempts === 0
          ? 'PE earned + build-power drift; PI sink wired (no pick opportunities this batch)'
          : piInsufficient > 0
            ? `PE earned + build-power drift; PI sink WIRED but unaffordable (${piPickAttempts} attempts, ${piInsufficient} insufficient_pi at the PE->PI 5:1 rate)`
            : `PE earned + build-power drift; PI sink WIRED + attempted (${piPickAttempts}x) but no spend and no insufficiency -> picks blocked elsewhere (e.g. perk-job/level coverage)`,
  };

  // 4. relationship_progress: recruit rate + earned-affinity proof + mating, all firing =
  // monotonic, non-stall.
  const recruitRate = round(mean(list.map((r) => ((r && r.recruited) || []).length)));
  const affinityProvenRate =
    n === 0 ? 0 : round(list.filter((r) => r && r.economyAffinityProven === true).length / n);
  const matingRate = round(mean(list.map((r) => Number(r && r.offspring) || 0)));
  const relationship_progress = {
    recruit_rate: recruitRate,
    affinity_proven_rate: affinityProvenRate,
    mating_rate: matingRate,
    range: null,
    in_band: n > 0 && recruitRate > 0 && affinityProvenRate >= 0.9 && matingRate > 0,
    note: 'recruit + earned-affinity gate + mating all fire (monotonic, non-stall)',
  };

  // 5. offspring_viability: mean offspring per run >= threshold. Lineage diversity is NOT
  // tracked yet (offspring species not captured by the runner -> deferred), surfaced honestly.
  const offspringAvg = round(mean(list.map((r) => Number(r && r.offspring) || 0)));
  const [oLo] = PROVISIONAL_BANDS.offspring_viability;
  const offspring_viability = {
    offspring_avg: offspringAvg,
    viable_rate: 1, // the runner only counts mating rolls that returned a viable offspring
    lineage_diversity: null, // deferred: offspring species/lineage not captured by the runner
    range: PROVISIONAL_BANDS.offspring_viability,
    in_band: n > 0 && offspringAvg >= oLo,
    note: 'mean offspring per run >= threshold; lineage diversity not tracked yet (deferred)',
  };

  // 6. roster_composition: role_class profile of the recruited roster (recruitedSpecies ->
  // roleOf). POLICY-SENSITIVE -> the dominant role(s) diverge by temperament (mbtiPolicy
  // recruits a different role mix than greedy), so P4 is MEASURABLE here even though the
  // quantity metrics above are policy-insensitive. Band: >= 3 distinct roles = healthy spread.
  // UNKNOWN (a species outside the canonical role map -> a typo/unmapped recruit) is invalid
  // telemetry, NOT a real ecological role: it is tracked separately (unknown_count) and kept
  // OUT of role_profile / distinct_roles / dominance, so it can never inflate diversity or
  // appear dominant and mask a collapsed roster (Codex #2573 P2).
  const roleProfile = {};
  let unknownCount = 0;
  for (const r of list) {
    for (const sp of (r && r.recruitedSpecies) || []) {
      const role = roleOf(sp);
      if (role === 'UNKNOWN') {
        unknownCount += 1;
        continue;
      }
      roleProfile[role] = (roleProfile[role] || 0) + 1;
    }
  }
  const distinctRoles = Object.keys(roleProfile).length;
  const maxFreq = Math.max(0, ...Object.values(roleProfile));
  const dominantRoles = Object.keys(roleProfile)
    .filter((k) => roleProfile[k] === maxFreq)
    .sort();
  const [rcLo] = PROVISIONAL_BANDS.roster_composition;
  const roster_composition = {
    role_profile: roleProfile,
    distinct_roles: distinctRoles,
    dominant_roles: dominantRoles,
    unknown_count: unknownCount,
    range: PROVISIONAL_BANDS.roster_composition,
    in_band: n > 0 && distinctRoles >= rcLo,
    note: 'role_class profile of the recruited roster (UNKNOWN excluded, tracked as unknown_count); dominant_roles diverge by policy -> P4 measurable (composition, not quantity)',
  };

  return {
    n,
    provisional: true,
    metrics: {
      completion_rate,
      roster_attrition,
      economy_flow,
      relationship_progress,
      offspring_viability,
      roster_composition,
    },
  };
}

module.exports = { aggregate, buildPowerDrift, mean, PROVISIONAL_BANDS };
