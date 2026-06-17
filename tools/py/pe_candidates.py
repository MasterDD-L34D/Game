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


CANDIDATES = {
    "A_sustained_threat": candidate_A,
    "B_time_avg": candidate_B,
    "C_apex_reach": candidate_C,
}


def candidate_value(name, stats):
    v = CANDIDATES[name](stats)
    return max(0.0, min(1.0, v))


def kd_normalize(kd_avg):
    """Map kd_avg (~0.8 typical, unbounded) -> (0,1) via kd/(kd+1): bounded, monotonic.
    None in -> None out (missing metric surfaced, never faked)."""
    if kd_avg is None:
        return None
    kd = float(kd_avg)
    return kd / (kd + 1.0)
