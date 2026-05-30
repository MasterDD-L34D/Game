"""D4 biome-affinity heuristic — suggest biome_affinity for the 32 unassigned
canonical species. DRAFT only; never writes the canonical catalog.

Ref: docs/superpowers/specs/2026-05-30-d4-biome-affinity-ecoyaml-design.md
"""

import json
import re
import argparse
from collections import Counter, defaultdict
from pathlib import Path

import yaml

REPO_ROOT = Path(__file__).resolve().parents[2]
CATALOG_PATH = REPO_ROOT / "data/core/species/species_catalog.json"
BIOMES_PATH = REPO_ROOT / "data/core/biomes.yaml"


def load_catalog(path: Path = CATALOG_PATH) -> list:
    with open(path, encoding="utf-8") as f:
        data = json.load(f)
    return data["catalog"]


def split_by_biome_affinity(species: list):
    assigned, missing = [], []
    for s in species:
        ba = s.get("biome_affinity")
        if isinstance(ba, str) and ba.strip():
            assigned.append(s)
        else:
            missing.append(s)
    return assigned, missing


def load_biome_ids(path: Path = BIOMES_PATH) -> list:
    with open(path, encoding="utf-8") as f:
        data = yaml.safe_load(f)
    return list(data["biomes"].keys())


def build_trait_biome_map(assigned: list) -> dict:
    """trait_id -> Counter({biome_id: vote_count}) from already-assigned species."""
    tmap = defaultdict(Counter)
    for s in assigned:
        biome = s.get("biome_affinity")
        if not (isinstance(biome, str) and biome.strip()):
            continue
        for trait in s.get("trait_refs", []) or []:
            tmap[trait][biome] += 1
    return dict(tmap)
