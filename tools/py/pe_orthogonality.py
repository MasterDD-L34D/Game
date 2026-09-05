#!/usr/bin/env python3
"""Orthogonality analysis for PE_ratio selection (G2 follow-up PR1). The PRIMARY criterion
is |Pearson(candidate, won)| -- LOWER is better (less collinear with WR = better anti-false-
balanced third axis). The SECONDARY check is discrimination (a trivialized run must score
LOWER tension than the ratified run). Pure; hand-rolled Pearson (no numpy)."""
from __future__ import annotations

import math

DEFAULT_MAX_CORR = 0.6  # negative-result threshold: all candidates above -> reject source


def pearson(xs, ys):
    n = len(xs)
    if n == 0 or n != len(ys):
        return 0.0
    mx, my = sum(xs) / n, sum(ys) / n
    sx = sum((x - mx) ** 2 for x in xs)
    sy = sum((y - my) ** 2 for y in ys)
    if sx == 0 or sy == 0:
        return 0.0  # zero variance -> undefined correlation -> 0
    cov = sum((x - mx) * (y - my) for x, y in zip(xs, ys))
    return cov / math.sqrt(sx * sy)


def analyze_candidate(values, wons):
    wbin = [1.0 if w else 0.0 for w in wons]
    return {
        "n": len(values),
        "abs_corr": abs(pearson(values, wbin)),
        "mean": (sum(values) / len(values)) if values else 0.0,
    }


def selection_report(per_candidate, wons, *, ratified_value=None, eased_value=None,
                     max_corr=DEFAULT_MAX_CORR):
    ratified_value = ratified_value or {}
    eased_value = eased_value or {}
    rows = []
    for name, values in per_candidate.items():
        a = analyze_candidate(values, wons)
        rv, ev = ratified_value.get(name), eased_value.get(name)
        disc = None
        if rv is not None and ev is not None:
            disc = {"gap": rv - ev, "correct_direction": rv > ev}
        rows.append({"name": name, **a, "discrimination": disc})
    rows.sort(key=lambda r: r["abs_corr"])  # least collinear first
    best = rows[0] if rows else None
    if best is None or best["abs_corr"] > max_corr:
        selected, verdict = None, (
            f"negative-result: min abs_corr {best['abs_corr']:.3f} > {max_corr} -- reject pressure source"
            if best else "no candidates")
    else:
        selected, verdict = best["name"], f"selected {best['name']} (abs_corr {best['abs_corr']:.3f})"
    return {"ranked": rows, "selected": selected, "verdict": verdict, "max_corr": max_corr}
