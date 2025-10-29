"""Generatore di incontri dinamici basato sui dati dei biomi."""

from __future__ import annotations

import os
import sys
from pathlib import Path
from typing import Dict, List, Optional, Union

from game_utils import choice, create_rng, load_yaml, resolve_seed, roll_die, sample

DEFAULT_VC = {
    'aggro': 'low',
    'cohesion': 'mid',
    'setup': 'mid',
    'explore': 'low',
    'risk': 'mid',
}


_REPO_ROOT = Path(__file__).resolve().parents[2]
_DEFAULT_BIOMES_CANDIDATES = (
    _REPO_ROOT / 'data' / 'core' / 'biomes.yaml',
    _REPO_ROOT / 'data' / 'biomes.yaml',
)


def _resolve_candidate(path: Path) -> Path:
    """Return the most appropriate biome file for the provided path."""

    if path.is_file():
        return path

    if path.is_dir():
        for relative in ('biomes.yaml', 'core/biomes.yaml'):
            candidate = path / relative
            if candidate.exists():
                return candidate
        return path / 'biomes.yaml'

    # Assume the caller passed a path-like string that should point to the file.
    return path


def _default_biomes_path() -> Path:
    override = os.environ.get('GAME_CLI_BIOMES_PATH')
    if override:
        return _resolve_candidate(Path(override))

    data_root = os.environ.get('GAME_CLI_DATA_ROOT')
    if data_root:
        return _resolve_candidate(Path(data_root))

    for candidate in _DEFAULT_BIOMES_CANDIDATES:
        if candidate.exists():
            return candidate

    # Default to the new core location even if it does not exist yet, so the error is explicit.
    return _DEFAULT_BIOMES_CANDIDATES[0]


def generate(
    biome_key: str,
    path: Optional[Union[str, Path]] = None,
    party_power: int = 20,
    party_vc: Optional[Dict[str, str]] = None,
    seed: Optional[str] = None,
):
    dataset_path = Path(path) if path is not None else _default_biomes_path()
    data = load_yaml(dataset_path)
    biomes: Dict[str, Dict[str, object]] = data.get('biomes', {})
    if biome_key not in biomes:
        raise KeyError(f"Bioma sconosciuto: {biome_key}")
    biome = biomes[biome_key]

    diff_base = int(biome.get('diff_base', 0) or 0)
    mod = int(biome.get('mod_biome', 0) or 0)
    affixes_raw = biome.get('affixes', [])
    if not isinstance(affixes_raw, list):
        raise ValueError(f"Affissi del bioma '{biome_key}' non validi")
    affixes: List[str] = list(affixes_raw)
    vc = party_vc or DEFAULT_VC

    rng = create_rng(resolve_seed(seed, env_var='ENCOUNTER_SEED'))

    tb = party_power + diff_base + mod

    roles = ['front', 'skirm', 'control', 'support', 'objective']

    groups = []
    remaining = tb
    while remaining > 0:
        span = min(7, remaining)
        chunk = span if remaining <= 7 else roll_die(rng, span)
        role = choice(roles, rng)
        affix_count = min(2, len(affixes))
        aff = sample(affixes, affix_count, rng) if affix_count else []
        groups.append({'power': chunk, 'role': role, 'affixes': aff})
        remaining -= chunk

    return {'biome': biome_key, 'tb': tb, 'TB': tb, 'groups': groups, 'party_vc': vc}
if __name__ == '__main__':
    from game_cli import main as cli_main

    sys.exit(cli_main(['generate-encounter', *sys.argv[1:]]))
