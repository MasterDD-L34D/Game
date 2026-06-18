#!/usr/bin/env python3
"""Pure pressure-trajectory stats for the PE_ratio experiment (G2 follow-up PR1)."""
from __future__ import annotations


def pressure_stats(samples, threshold=75):
    """Compact per-run stats from a pressure sample list: mean, fraction of samples at or
    above `threshold` (sustained-threat), and max. Empty -> zeros (defined, never crash)."""
    if not samples:
        return {"pressure_mean": 0.0, "frac_ge75": 0.0, "pmax": 0.0}
    vals = [float(s) for s in samples]
    return {
        "pressure_mean": sum(vals) / len(vals),
        "frac_ge75": sum(1 for v in vals if v >= threshold) / len(vals),
        "pmax": max(vals),
    }
