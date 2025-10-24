"""Funzioni di supporto per la generazione di numeri casuali deterministici."""
from __future__ import annotations

import os
from typing import Callable, List, Optional, Sequence, TypeVar

RandomFloatGenerator = Callable[[], float]
T = TypeVar("T")

_UINT32_MASK = 0xFFFFFFFF
_DEFAULT_ENV_SEED = "ROLL_PACK_SEED"


def hash_seed(seed: str) -> int:
    """Converte una stringa in un intero a 32 bit utilizzando hash mulberry32."""

    h = 1779033703 ^ len(seed)
    for ch in seed:
        h = (h ^ ord(ch)) * 3432918353 & _UINT32_MASK
        h = ((h << 13) | (h >> 19)) & _UINT32_MASK
    normalized = h & _UINT32_MASK
    return normalized or 0x6D2B79F5


def mulberry32(seed: int) -> RandomFloatGenerator:
    """Restituisce un generatore deterministico di float in [0,1)."""

    state = seed & _UINT32_MASK

    def rng() -> float:
        nonlocal state
        state = (state + 0x6D2B79F5) & _UINT32_MASK
        t = state
        t = ((t ^ (t >> 15)) * (t | 1)) & _UINT32_MASK
        t ^= ((t ^ (t >> 7)) * (t | 61) & _UINT32_MASK) + t
        t &= _UINT32_MASK
        return ((t ^ (t >> 14)) & _UINT32_MASK) / 4294967296

    return rng


def resolve_seed(seed: Optional[str], env_var: str = _DEFAULT_ENV_SEED) -> Optional[str]:
    """Restituisce il seed da utilizzare, privilegiando quello esplicito."""

    if seed:
        return seed
    return os.getenv(env_var)


def create_rng(seed: Optional[str]) -> RandomFloatGenerator:
    """Crea un generatore deterministico (mulberry32) oppure casuale standard."""

    if seed:
        return mulberry32(hash_seed(seed))

    import random

    return random.random


def roll_die(rng: RandomFloatGenerator, sides: int) -> int:
    """Lancia un dado a `sides` facce utilizzando il generatore fornito."""

    if sides <= 0:
        raise ValueError("Il numero di facce deve essere positivo")
    return 1 + int(rng() * sides)


def choice(options: Sequence[T], rng: RandomFloatGenerator) -> T:
    """Seleziona un elemento dalla sequenza utilizzando il generatore."""

    if not options:
        raise ValueError("La sequenza non può essere vuota")
    index = roll_die(rng, len(options)) - 1
    return options[index]


def sample(options: Sequence[T], k: int, rng: RandomFloatGenerator) -> List[T]:
    """Restituisce `k` elementi distinti dalla sequenza."""

    if k < 0:
        raise ValueError("k non può essere negativo")
    if k == 0:
        return []
    if k > len(options):
        raise ValueError("k non può superare la lunghezza della sequenza")
    pool = list(options)
    extracted: List[T] = []
    for _ in range(k):
        index = roll_die(rng, len(pool)) - 1
        extracted.append(pool.pop(index))
    return extracted


__all__ = [
    "RandomFloatGenerator",
    "choice",
    "create_rng",
    "hash_seed",
    "mulberry32",
    "resolve_seed",
    "roll_die",
    "sample",
]
