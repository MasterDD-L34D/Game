#!/usr/bin/env python3
"""PE_ratio candidate formulas (G2 follow-up PR1). Each maps per-run pressure stats
(from pressure_stats) -> a 0..1 tension value (higher = more sustained tension). The
WINNER is chosen by the orthogonality experiment, NOT here -- new candidates are cheap."""
from __future__ import annotations

APEX = 95


def candidate_A(stats):  # sustained-threat fraction
    return float(stats.get("frac_ge75", 0.0))


def candidate_B(stats):  # time-averaged pressure, normalized
    return float(stats.get("pressure_mean", 0.0)) / 100.0


def candidate_C(stats):  # apex-reach (touched >= 95)
    return 1.0 if float(stats.get("pmax", 0.0)) >= APEX else 0.0


# Per-run contestedness forms (sec 4.5): mirror the aggregate D/E/F but read a
# SINGLE run record (rounds / dmg_taken_player / dmg_dealt_player), so the
# orthogonality experiment (pe_experiment) can correlate them per-run vs `won`.
# (The _AGGREGATE_FORM D/E/F below feed the composite; these feed the SELECTION.)
# TURN_TENSION_NORM is defined below -- resolved at call time, not import time.
def candidate_D(stats):  # turns-to-resolve tension
    return float(stats.get("rounds", 0.0)) / TURN_TENSION_NORM


def candidate_E(stats):  # damage-taken margin (self-normalizing)
    taken = float(stats.get("dmg_taken_player", 0.0))
    dealt = float(stats.get("dmg_dealt_player", 0.0))
    total = taken + dealt
    return taken / total if total > 0 else 0.0


def candidate_F(stats):  # combined (geometric mean of D,E)
    d = max(0.0, min(1.0, candidate_D(stats)))
    return (d * candidate_E(stats)) ** 0.5


CANDIDATES = {
    "A_sustained_threat": candidate_A,
    "B_time_avg": candidate_B,
    "C_apex_reach": candidate_C,
    "D_turns_contest": candidate_D,
    "E_dmg_margin": candidate_E,
    "F_contest_combined": candidate_F,
}


def candidate_value(name, stats):
    v = CANDIDATES[name](stats)
    return max(0.0, min(1.0, v))


# --- Contestedness candidates (design sec 4.5 / handoff 2026-06-20) --------------
# PE-from-pressure was REJECTED (saturates ~0.81-0.94 on every high-pressure oracle =
# ~zero discrimination). Contestedness = a challenge-skill MARGIN from turns + damage,
# which does NOT saturate (curb-stomp = few turns + low party-damage; nail-biter = many
# turns + high party-damage). Read off keys aggregate() ALREADY emits: turns_avg,
# dmg_taken_avg, dmg_dealt_avg (no new instrumentation -- a rollup of the raw event
# stream). AGGREGATE-only: the composite + orthogonality experiment correlate per-config
# aggregates, and the per-run candidate_value() form receives pressure_stats (no
# turns/damage), so a per-run contestedness form is intentionally absent.
#
# Normalizers are PROVISIONAL (master-dd ratifies the SELECTION + the band, SDMG):
#   D = turns_avg / TURN_TENSION_NORM (capped 1.0) -- arbitrary cap, tunable.
#   E = dmg_taken / (dmg_taken + dmg_dealt) -- SELF-normalizing margin, no constant.
#   F = sqrt(D*E) -- combined (geometric mean): both must be high for high tension.
TURN_TENSION_NORM = 40.0  # = MAX_ROUNDS; a fight at the round cap reads as max tension.


def _dmg_taken_margin(agg):
    """Fraction of total combat damage the party absorbed (0..1, self-normalizing)."""
    taken = float(agg.get("dmg_taken_avg", 0.0))
    dealt = float(agg.get("dmg_dealt_avg", 0.0))
    total = taken + dealt
    return taken / total if total > 0 else 0.0


def _turns_tension(agg):
    return float(agg.get("turns_avg", 0.0)) / TURN_TENSION_NORM


# Aggregate form: the same candidate read off the run-SET aggregate keys that
# batch_calibrate aggregate() already emits (mean of per-run frac_ge75; mean
# pressure/100; fraction of runs that reached apex). Linear candidates (A,B)
# satisfy mean(candidate)==candidate(mean); C's per-run binary aggregates to the
# apex_reach_rate fraction. This is the form the composite_metric consumes.
_AGGREGATE_FORM = {
    "A_sustained_threat": lambda agg: float(agg.get("pressure_frac_ge75_avg", 0.0)),
    "B_time_avg": lambda agg: float(agg.get("pressure_mean_avg", 0.0)) / 100.0,
    "C_apex_reach": lambda agg: float(agg.get("apex_reach_rate", 0.0)),
    # contestedness (sec 4.5) -- the non-saturating alternate PE source.
    "D_turns_contest": _turns_tension,
    "E_dmg_margin": _dmg_taken_margin,
    "F_contest_combined": lambda agg: (_turns_tension(agg) * _dmg_taken_margin(agg)) ** 0.5,
}


def pe_ratio_aggregate(agg, candidate):
    """pe_ratio (0..1) for the selected candidate, read off an aggregate() dict.
    KeyError on an unknown candidate (surfaces a bad config instead of faking 0)."""
    fn = _AGGREGATE_FORM.get(candidate)
    if fn is None:
        raise KeyError(f"unknown pe_ratio candidate {candidate!r}")
    return max(0.0, min(1.0, fn(agg)))


def attach_composite_terms(agg, candidate=None):
    """Idempotently add the two normalized composite terms to an aggregate() dict
    so objective.evaluate_metric can compute `0.50*win_rate+0.25*kd_ratio+0.25*pe_ratio`.
      kd_ratio = kd_normalize(kd_avg)   (None if kd_avg absent -- surfaced, never faked)
      pe_ratio = the experiment-selected candidate read off the aggregate pressure keys
                 (0.0 if a scenario emits no pressure trajectory, e.g. hardcore_07).
    No-op on an {'error': ...} dict. Returns the same dict for chaining."""
    if not isinstance(agg, dict) or "error" in agg:
        return agg
    agg.setdefault("kd_ratio", kd_normalize(agg.get("kd_avg")))
    agg.setdefault("pe_ratio", pe_ratio_aggregate(agg, candidate or SELECTED_CANDIDATE))
    return agg


# SELECTED (PROVISIONAL) by the PR2 experiment (seed-pinned, node 22, 2026-06-19).
# B_time_avg (= pressure_mean_avg/100) chosen on a PRINCIPLED basis, NOT the noisy
# |corr| ranking: on every ratified balance oracle pressure runs HIGH (pe_ratio
# 0.81-0.94 multi-oracle), so the candidates near-SATURATE and the |corr| ranking is
# noise between near-flat values (N-sensitive: B@N=100 0.197, A@N=40 0.092). B is the
# only CONTINUOUS candidate (real variance); A (sustained-threat fraction) pins ~1.0
# and C (apex-reach) is binary -- both degenerate on high-pressure oracles. min|corr|
# << 0.6 so pressure is not formally rejected, but the signal is MARGINAL.
#
# 🔴 OPEN (master-dd, NOT a blocker for this wiring): the per-run trajectory was
# extended to badlands_elite + foresta_pilot (PR2b) so pe_ratio is now REAL on all 3
# oracles (no longer 0.0). The composite BAND is PROPOSED ([0.236, 0.815] at k=2.0,
# mean 0.526) but NOT written to the manifest (SDMG, human-ratified). Because pe_ratio
# is ~0.8-0.94 everywhere it adds little DISCRIMINATION -> master-dd may instead switch
# to the design's alternate tension source (turns-to-resolve + dmg_taken contestedness,
# sec 4.5), telemetered on every oracle, which avoids the high-pressure saturation.
# Evidence:
# docs/playtest/2026-06-19-pe-ratio-experiment-n100.md.
SELECTED_CANDIDATE = "B_time_avg"


def kd_normalize(kd_avg):
    """Map kd_avg (~0.8 typical, unbounded) -> (0,1) via kd/(kd+1): bounded, monotonic.
    None in -> None out (missing metric surfaced, never faked)."""
    if kd_avg is None:
        return None
    kd = float(kd_avg)
    return kd / (kd + 1.0)
