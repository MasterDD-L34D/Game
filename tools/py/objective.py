#!/usr/bin/env python3
"""Composite objective metric evaluation (G2 P1).

Parses + evaluates a linear weighted-sum metric string like
``0.50*win_rate + 0.25*kd_ratio + 0.25*pe_ratio`` against a metrics dict.
Safe parser (no eval): each term is ``<coef>*<metric_name>``.
"""

from __future__ import annotations

import re

_TERM = re.compile(r"([0-9]*\.?[0-9]+)\s*\*\s*([A-Za-z_]\w*)")


def evaluate_metric(expr, metrics):  # noqa: ANN001
    """Evaluate a linear ``<coef>*<metric> + ...`` expression.

    Raises KeyError if a referenced metric is absent from ``metrics``.
    """
    total = 0.0
    terms = _TERM.findall(expr or "")
    for coef, name in terms:
        if name not in metrics:
            raise KeyError(name)
        total += float(coef) * float(metrics[name])
    return total
