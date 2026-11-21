#!/usr/bin/env python3
"""Composite objective metric evaluation (G2 P1).

Parses + evaluates a linear weighted-sum metric string like the canonical
``0.70*win_rate + 0.30*kd_ratio`` (the manifest `composite_metric`) against a metrics
dict. Generic: the formula is config (canonical-suite.yaml), not hardcoded here -- the
PE_ratio term was dropped 2026-06-23 (falsified, see that file) with no code change here.
Safe parser (no eval): each term is ``<coef>*<metric_name>``.
"""

from __future__ import annotations

import re

# A term is exactly ``<coef>*<metric_name>`` (with optional surrounding space).
# Anchored: the WHOLE term must match, so trailing garbage / unsupported operators
# (e.g. '-') surface as an error instead of being silently mis-evaluated.
_TERM = re.compile(r"^\s*([0-9]*\.?[0-9]+)\s*\*\s*([A-Za-z_]\w*)\s*$")


def evaluate_metric(expr, metrics):  # noqa: ANN001
    """Evaluate a linear ``<coef>*<metric> + ...`` expression (weighted sum, '+' only).

    Raises ValueError on a malformed/empty expression (so bad YAML config surfaces
    instead of producing a false calibration score); KeyError if a referenced
    metric is absent from ``metrics``.
    """
    if not expr or not expr.strip():
        raise ValueError(f"empty objective expression: {expr!r}")
    total = 0.0
    for part in expr.split("+"):
        m = _TERM.match(part)
        if not m:
            raise ValueError(f"malformed objective term {part!r} in {expr!r}")
        coef, name = m.group(1), m.group(2)
        if name not in metrics:
            raise KeyError(name)
        total += float(coef) * float(metrics[name])
    return total
