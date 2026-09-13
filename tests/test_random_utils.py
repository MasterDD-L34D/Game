"""Test di regressione per gli helper RNG deterministici."""

from __future__ import annotations

import sys
from pathlib import Path

import pytest

PROJECT_ROOT = Path(__file__).resolve().parents[1]
TOOLS_PY = PROJECT_ROOT / 'tools' / 'py'
if str(TOOLS_PY) not in sys.path:
    sys.path.insert(0, str(TOOLS_PY))

from game_utils.random_utils import (  # noqa: E402
    choice,
    create_rng,
    hash_seed,
    mulberry32,
    resolve_seed,
    roll_die,
    sample,
)


def test_hash_seed_is_stable_and_non_zero() -> None:
    base = hash_seed('demo')
    assert base == hash_seed('demo')
    assert base != hash_seed('Demo')
    assert hash_seed('') != 0


def test_mulberry32_produces_reproducible_sequence() -> None:
    rng_a = mulberry32(hash_seed('demo'))
    rng_b = mulberry32(hash_seed('demo'))
    sequence_a = [rng_a() for _ in range(5)]
    sequence_b = [rng_b() for _ in range(5)]
    assert sequence_a == pytest.approx(sequence_b)


def test_roll_die_and_choice_guardrails() -> None:
    deterministic = iter([0.0, 0.9])

    def rng() -> float:
        return next(deterministic)

    assert roll_die(rng, 6) == 1
    assert roll_die(rng, 6) == 6
    with pytest.raises(ValueError):
        roll_die(rng, 0)
    with pytest.raises(ValueError):
        choice([], rng)


def test_sample_enforces_uniqueness_and_bounds() -> None:
    rng = create_rng('demo')
    population = ['a', 'b', 'c', 'd']
    drawn = sample(population, 3, rng)
    assert sorted(drawn) == sorted(set(drawn))
    with pytest.raises(ValueError):
        sample(population, 5, rng)
    with pytest.raises(ValueError):
        sample(population, -1, rng)


def test_create_rng_uses_seed_for_reproducibility() -> None:
    rng_a = create_rng('fixed')
    rng_b = create_rng('fixed')
    assert [rng_a() for _ in range(3)] == pytest.approx([rng_b() for _ in range(3)])


def test_resolve_seed_prefers_argument_and_env(monkeypatch: pytest.MonkeyPatch) -> None:
    env_key = 'TEST_RANDOM_UTILS_SEED'
    monkeypatch.delenv(env_key, raising=False)
    assert resolve_seed(None, env_key) is None
    monkeypatch.setenv(env_key, 'from-env')
    assert resolve_seed(None, env_key) == 'from-env'
    assert resolve_seed('direct', env_key) == 'direct'
