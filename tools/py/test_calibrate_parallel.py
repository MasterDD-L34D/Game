#!/usr/bin/env python3
"""Unit tests for calibrate_parallel shard-command construction (no backend).

Covers the --policy passthrough (PE_ratio contestedness multi-policy re-run): the
sharded orchestrator must forward a single Restricted-Play policy
{random,greedy,lookahead2,utility} to the underlying batch_calibrate_*.py so the
per-combat corpora span the canonical multi-policy regime (canonical-suite.yaml
policies: [random, greedy, lookahead2, utility]), not greedy-only.
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

import calibrate_parallel as cp  # noqa: E402


def _adjacent(seq, a, b):
    """True if value b immediately follows value a in seq."""
    for i, v in enumerate(seq[:-1]):
        if v == a and seq[i + 1] == b:
            return True
    return False


def test_build_shard_cmd_includes_policy_when_set():
    cmd = cp.build_shard_cmd(
        "tools/py/batch_calibrate_foresta_pilot_01.py",
        "http://127.0.0.1:3501", 10, "out.json", "out.jsonl",
        policy="lookahead2",
    )
    assert _adjacent(cmd, "--policy", "lookahead2"), cmd


def test_build_shard_cmd_omits_policy_by_default():
    # Back-compat: no --policy => batch script default (greedy) flat path.
    cmd = cp.build_shard_cmd(
        "tools/py/batch_calibrate_foresta_pilot_01.py",
        "http://127.0.0.1:3501", 10, "out.json", "out.jsonl",
    )
    assert "--policy" not in cmd, cmd


def test_build_shard_cmd_threads_seed_and_extra_args():
    cmd = cp.build_shard_cmd(
        "tools/py/batch_calibrate_foresta_pilot_01.py",
        "http://127.0.0.1:3501", 40, "out.json", "out.jsonl",
        seed=424242, policy="random",
        extra_args=["--encounter-class", "foresta_pilot"],
    )
    assert _adjacent(cmd, "--seed", "424242"), cmd
    assert _adjacent(cmd, "--policy", "random"), cmd
    assert _adjacent(cmd, "--encounter-class", "foresta_pilot"), cmd
    # --skip-health always present (shards pre-checked healthy by the orchestrator).
    assert "--skip-health" in cmd, cmd


def test_build_shard_cmd_random_policy_is_a_valid_restricted_play_policy():
    # Guard: the 4 canonical Restricted-Play policies must all be forwardable.
    for pol in ("random", "greedy", "lookahead2", "utility"):
        cmd = cp.build_shard_cmd(
            "tools/py/batch_calibrate_foresta_pilot_01.py",
            "http://127.0.0.1:3501", 10, "out.json", "out.jsonl", policy=pol,
        )
        assert _adjacent(cmd, "--policy", pol), (pol, cmd)


def test_arg_parser_accepts_restricted_play_policies():
    parser = cp.build_arg_parser()
    for pol in ("random", "greedy", "lookahead2", "utility"):
        args = parser.parse_args(["--scenario", "foresta_pilot_01", "--n", "10", "--policy", pol])
        assert args.policy == pol


def test_arg_parser_rejects_policy_all():
    # 'all' must NOT be a valid orchestrator passthrough (nested triangulation
    # output does not compose with shard JSONL merge -- run once per policy instead).
    import pytest
    parser = cp.build_arg_parser()
    with pytest.raises(SystemExit):
        parser.parse_args(["--scenario", "foresta_pilot_01", "--n", "10", "--policy", "all"])


def test_arg_parser_policy_defaults_to_none():
    # Default None => greedy passthrough omitted => back-compat single-policy.
    parser = cp.build_arg_parser()
    args = parser.parse_args(["--scenario", "foresta_pilot_01", "--n", "10"])
    assert args.policy is None
