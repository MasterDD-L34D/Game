#!/usr/bin/env python3
"""Unit tests for tools/py/objective.py (G2 P1 -- composite metric eval)."""

from __future__ import annotations

import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).parent))

from objective import evaluate_metric  # noqa: E402


def test_weighted_sum():
    m = {"win_rate": 0.4, "kd_ratio": 0.8, "pe_ratio": 0.6}
    # 0.50*0.4 + 0.25*0.8 + 0.25*0.6 = 0.20 + 0.20 + 0.15 = 0.55
    r = evaluate_metric("0.50*win_rate + 0.25*kd_ratio + 0.25*pe_ratio", m)
    assert abs(r - 0.55) < 1e-9


def test_single_term():
    assert abs(evaluate_metric("1.0*win_rate", {"win_rate": 0.42}) - 0.42) < 1e-9


def test_missing_metric_raises():
    with pytest.raises(KeyError):
        evaluate_metric("0.5*win_rate + 0.5*unknown", {"win_rate": 0.4})


def test_rejects_trailing_garbage():
    # Partial-match must not silently score; an unparseable term raises.
    with pytest.raises(ValueError):
        evaluate_metric("0.50*win_rate + bad", {"win_rate": 0.4})


def test_rejects_subtraction():
    # Only '+' weighted sums are supported; '-' is not silently treated as '+'.
    with pytest.raises(ValueError):
        evaluate_metric("0.50*win_rate - 0.25*kd_ratio", {"win_rate": 0.4, "kd_ratio": 0.8})


def test_rejects_empty():
    with pytest.raises(ValueError):
        evaluate_metric("", {})
