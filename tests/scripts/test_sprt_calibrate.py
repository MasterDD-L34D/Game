"""Tests for tools/py/sprt_calibrate.py — Wald 1945 SPRT harness."""

from __future__ import annotations

import math

import pytest


pytest.importorskip("tools.py.sprt_calibrate", reason="PYTHONPATH=tools/py required")

from tools.py.sprt_calibrate import (  # noqa: E402
    SprtBand,
    SprtBinary,
    expected_samples,
    format_markdown,
    stream_sprt,
)


# ─────────────────────────────────────────────────────────
# SprtBinary
# ─────────────────────────────────────────────────────────


def test_sprt_binary_initial_state():
    sprt = SprtBinary(p0=0.3, p1=0.5)
    assert sprt.n == 0
    assert sprt.wins == 0
    assert sprt.llr == 0.0
    assert sprt.verdict() == "continue"


def test_sprt_binary_bounds_default():
    """Default α=β=0.05 → upper ≈ +2.94, lower ≈ -2.94."""
    sprt = SprtBinary(p0=0.3, p1=0.5)
    assert sprt.upper_bound == pytest.approx(math.log(0.95 / 0.05), rel=1e-6)
    assert sprt.lower_bound == pytest.approx(math.log(0.05 / 0.95), rel=1e-6)
    assert sprt.upper_bound == pytest.approx(-sprt.lower_bound)


def test_sprt_binary_win_increases_llr_when_p1_gt_p0():
    sprt = SprtBinary(p0=0.3, p1=0.5)
    sprt.update(True)
    assert sprt.llr > 0
    assert sprt.wins == 1
    assert sprt.n == 1


def test_sprt_binary_loss_decreases_llr_when_p1_gt_p0():
    sprt = SprtBinary(p0=0.3, p1=0.5)
    sprt.update(False)
    assert sprt.llr < 0
    assert sprt.wins == 0
    assert sprt.n == 1


def test_sprt_binary_accepts_h1_on_consistent_wins():
    """All-wins stream against (p0=0.3, p1=0.7) accepts H1 quickly."""
    sprt = SprtBinary(p0=0.3, p1=0.7, alpha=0.05, beta=0.05)
    verdict = "continue"
    for _ in range(50):
        verdict = sprt.update(True)
        if verdict != "continue":
            break
    assert verdict == "H1"
    assert sprt.n < 50  # stops early


def test_sprt_binary_accepts_h0_on_consistent_losses():
    """All-losses stream against (p0=0.3, p1=0.7) accepts H0 quickly."""
    sprt = SprtBinary(p0=0.3, p1=0.7, alpha=0.05, beta=0.05)
    verdict = "continue"
    for _ in range(50):
        verdict = sprt.update(False)
        if verdict != "continue":
            break
    assert verdict == "H0"
    assert sprt.n < 50


def test_sprt_binary_inverted_directions():
    """When p1 < p0, wins push LLR negative (toward H0)."""
    sprt = SprtBinary(p0=0.7, p1=0.3)
    sprt.update(True)
    assert sprt.llr < 0
    sprt2 = SprtBinary(p0=0.7, p1=0.3)
    sprt2.update(False)
    assert sprt2.llr > 0


def test_sprt_binary_validation_p0_p1_range():
    with pytest.raises(ValueError, match="p0"):
        SprtBinary(p0=0.0, p1=0.5)
    with pytest.raises(ValueError, match="p1"):
        SprtBinary(p0=0.3, p1=1.0)
    with pytest.raises(ValueError, match="differ"):
        SprtBinary(p0=0.3, p1=0.3)


def test_sprt_binary_validation_alpha_beta_range():
    with pytest.raises(ValueError, match="alpha"):
        SprtBinary(p0=0.3, p1=0.5, alpha=0.0)
    with pytest.raises(ValueError, match="alpha"):
        SprtBinary(p0=0.3, p1=0.5, alpha=0.5)
    with pytest.raises(ValueError, match="beta"):
        SprtBinary(p0=0.3, p1=0.5, beta=0.6)


def test_sprt_binary_win_rate_property():
    sprt = SprtBinary(p0=0.3, p1=0.5)
    assert sprt.win_rate == 0.0
    sprt.update(True)
    sprt.update(True)
    sprt.update(False)
    assert sprt.win_rate == pytest.approx(2 / 3)


# ─────────────────────────────────────────────────────────
# SprtBand
# ─────────────────────────────────────────────────────────


def test_sprt_band_validation_order():
    with pytest.raises(ValueError, match="p_low"):
        SprtBand(p_low=0.5, p_high=0.3)
    with pytest.raises(ValueError, match="p_low"):
        SprtBand(p_low=0.3, p_high=0.3)
    with pytest.raises(ValueError, match="delta"):
        SprtBand(p_low=0.3, p_high=0.5, delta=0.0)


def test_sprt_band_initial_state():
    band = SprtBand(p_low=0.3, p_high=0.5)
    assert band.n == 0
    assert band.wins == 0
    assert band.win_rate == 0.0
    assert band.last_verdict == "continue"


def test_sprt_band_in_band_on_target_wr():
    """Stream WR ≈ 0.40 → in_band verdict for [0.30, 0.50]."""
    band = SprtBand(p_low=0.30, p_high=0.50, delta=0.05)
    # Repeating 4-wins-out-of-10 pattern simulates WR=0.40.
    pattern = [True, True, True, True] + [False] * 6
    verdict = "continue"
    for _ in range(20):  # up to 200 outcomes
        for o in pattern:
            verdict = band.update(o)
            if verdict != "continue":
                break
        if verdict != "continue":
            break
    assert verdict == "in_band"


def test_sprt_band_below_on_too_low_wr():
    """Stream WR ≈ 0.10 → below verdict (too hard)."""
    band = SprtBand(p_low=0.30, p_high=0.50, delta=0.05)
    pattern = [True] + [False] * 9  # 10% wins
    verdict = "continue"
    for _ in range(20):
        for o in pattern:
            verdict = band.update(o)
            if verdict != "continue":
                break
        if verdict != "continue":
            break
    assert verdict == "below"


def test_sprt_band_above_on_too_high_wr():
    """Stream WR ≈ 0.85 → above verdict (too easy)."""
    band = SprtBand(p_low=0.30, p_high=0.50, delta=0.05)
    pattern = [True] * 17 + [False] * 3  # 85% wins
    verdict = "continue"
    for _ in range(20):
        for o in pattern:
            verdict = band.update(o)
            if verdict != "continue":
                break
        if verdict != "continue":
            break
    assert verdict == "above"


def test_sprt_band_continue_initial():
    """First sample alone insufficient for verdict."""
    band = SprtBand(p_low=0.30, p_high=0.50)
    assert band.update(True) == "continue"


def test_sprt_band_compose_priority():
    """Compose: 'below' beats 'continue'; 'above' beats 'continue'."""
    assert SprtBand._compose("H0", "continue") == "below"
    assert SprtBand._compose("continue", "H0") == "above"
    assert SprtBand._compose("H1", "H1") == "in_band"
    assert SprtBand._compose("H1", "continue") == "continue"
    assert SprtBand._compose("continue", "H1") == "continue"
    # Below takes priority over above (lower-bound failure first).
    assert SprtBand._compose("H0", "H0") == "below"


def test_sprt_band_proxies_n_wins_winrate():
    band = SprtBand(p_low=0.30, p_high=0.50)
    band.update(True)
    band.update(False)
    assert band.n == 2
    assert band.wins == 1
    assert band.win_rate == pytest.approx(0.5)


# ─────────────────────────────────────────────────────────
# expected_samples (Wald approximation)
# ─────────────────────────────────────────────────────────


def test_expected_samples_returns_positive():
    est = expected_samples(p0=0.3, p1=0.5)
    assert est["e_n_h0"] > 0
    assert est["e_n_h1"] > 0
    assert est["worst_case"] >= max(est["e_n_h0"], est["e_n_h1"])


def test_expected_samples_smaller_delta_more_samples():
    """Smaller (p0, p1) gap → larger expected sample size."""
    tight = expected_samples(p0=0.45, p1=0.55)
    loose = expected_samples(p0=0.30, p1=0.70)
    assert tight["worst_case"] > loose["worst_case"]


def test_expected_samples_validates_inputs():
    with pytest.raises(ValueError):
        expected_samples(p0=0.0, p1=0.5)
    with pytest.raises(ValueError):
        expected_samples(p0=0.3, p1=0.3)


# ─────────────────────────────────────────────────────────
# stream_sprt helper
# ─────────────────────────────────────────────────────────


def test_stream_sprt_terminates_early():
    sprt = SprtBinary(p0=0.3, p1=0.7)
    outcomes = iter([True] * 100)
    verdict = stream_sprt(outcomes, sprt)
    assert verdict == "H1"
    assert sprt.n < 100


def test_stream_sprt_returns_continue_on_exhaustion():
    """Insufficient samples → returns 'continue' verdict."""
    sprt = SprtBinary(p0=0.3, p1=0.5)
    verdict = stream_sprt([True, False], sprt)
    assert verdict == "continue"


def test_stream_sprt_with_band():
    sprt = SprtBand(p_low=0.30, p_high=0.50, delta=0.05)
    pattern = [True] * 17 + [False] * 3  # WR ~85%
    outcomes = (o for _ in range(20) for o in pattern)
    verdict = stream_sprt(outcomes, sprt)
    assert verdict == "above"


# ─────────────────────────────────────────────────────────
# Markdown report
# ─────────────────────────────────────────────────────────


def test_format_markdown_smoke():
    result = {
        "verdict": "in_band",
        "n": 18,
        "wins": 7,
        "win_rate": 38.9,
        "stopped_early": True,
        "runs": [
            {"run": 1, "outcome": "victory", "rounds": 12, "kd": 1.5},
            {"run": 2, "outcome": "defeat", "rounds": 20, "kd": 0.8},
        ],
    }
    expected = {"e_n_h0": 12.4, "e_n_h1": 14.7, "worst_case": 14.7}
    md = format_markdown(
        "enc_tutorial_06_hardcore", "greedy", 0.30, 0.50, result, expected
    )
    assert md.startswith("---\n")
    assert "title: SPRT calibration" in md
    assert "doc_owner: claude-code" in md
    assert "in_band" in md
    assert "## Sample-size budget" in md
    assert "## Per-run trace" in md
    assert "Wald 1945" in md


def test_format_markdown_below_verdict():
    result = {
        "verdict": "below",
        "n": 12,
        "wins": 1,
        "win_rate": 8.3,
        "stopped_early": True,
        "runs": [],
    }
    expected = {"e_n_h0": 10, "e_n_h1": 12, "worst_case": 12}
    md = format_markdown("enc_x", "greedy", 0.30, 0.50, result, expected)
    assert "below" in md
    assert "too hard" in md.lower()


def test_format_markdown_above_verdict():
    result = {
        "verdict": "above",
        "n": 9,
        "wins": 9,
        "win_rate": 100.0,
        "stopped_early": True,
        "runs": [],
    }
    expected = {"e_n_h0": 10, "e_n_h1": 12, "worst_case": 12}
    md = format_markdown("enc_x", "greedy", 0.30, 0.50, result, expected)
    assert "above" in md
    assert "too easy" in md.lower()
