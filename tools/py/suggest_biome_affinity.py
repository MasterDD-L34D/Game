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


# Keyword (lowercased substring) -> biome_id. Lexical signal from
# scientific_name + functional_signature. Conservative: only unambiguous roots.
KEYWORD_BIOME = {
    "arena": "savana",
    "dune": "savana",
    "sand": "savana",
    "hydro": "palude",
    "hydrus": "palude",
    "palud": "palude",
    "salina": "pianura_salina_iperarida",
    "sali": "pianura_salina_iperarida",
    "ferr": "badlands",
    "rust": "badlands",
    "magnet": "atollo_obsidiana",
    "obsidian": "atollo_obsidiana",
    "cryo": "caldera_glaciale",
    "glaci": "caldera_glaciale",
    "gel": "caldera_glaciale",
    "myco": "foresta_miceliale",
    "spore": "foresta_miceliale",
    "acid": "foresta_acida",
    "caver": "caverna",
    "litho": "canyons_risonanti",
    "rupi": "canyons_risonanti",
    "synap": "frattura_abissale_sinaptica",
    "neural": "frattura_abissale_sinaptica",
    "reef": "reef_luminescente",
    "coral": "reef_luminescente",
    "volcan": "abisso_vulcanico",
    "vulcan": "abisso_vulcanico",
    "therm": "dorsale_termale_tropicale",
}


def keyword_biome_scores(text: str, valid_biomes: list) -> dict:
    """Lowercased substring match -> {biome_id: hit_count}, filtered to valid biomes."""
    if not text:
        return {}
    low = text.lower()
    scores = Counter()
    for kw, biome in KEYWORD_BIOME.items():
        if kw in low and biome in valid_biomes:
            scores[biome] += 1
    return dict(scores)


# Signal weights (calibrated against golden-set in later task).
W_TRAIT = 3.0
W_KEYWORD = 2.0


def score_species(species: dict, trait_biome_map: dict, valid_biomes: list) -> list:
    """Return [(biome_id, score), ...] sorted by score desc, then biome id asc
    (deterministic tie-break). Only score > 0 and biomes in valid_biomes."""
    valid = set(valid_biomes)
    scores = Counter()

    # Primary: trait votes (normalized over VALID biomes only)
    for trait in species.get("trait_refs", []) or []:
        votes = trait_biome_map.get(trait)
        if not votes:
            continue
        valid_total = sum(cnt for b, cnt in votes.items() if b in valid)
        if valid_total <= 0:
            continue
        for biome, cnt in votes.items():
            if biome in valid:
                scores[biome] += W_TRAIT * (cnt / valid_total)

    # Secondary: keyword match on scientific_name + functional_signature
    text = " ".join(
        str(species.get(k, "") or "")
        for k in ("scientific_name", "functional_signature")
    )
    for biome, hits in keyword_biome_scores(text, valid_biomes).items():
        scores[biome] += W_KEYWORD * hits

    # Deterministic: score desc, then biome id asc
    ranked = sorted(
        ((b, sc) for b, sc in scores.items() if sc > 0),
        key=lambda x: (-x[1], x[0]),
    )
    return ranked


def golden_set_validate(assigned: list, valid_biomes: list) -> dict:
    """Leave-one-out: for each assigned species, rebuild the trait map WITHOUT it,
    score it, and check whether top-1 prediction matches its known biome_affinity."""
    top1_correct = 0
    misses = []
    for i, s in enumerate(assigned):
        others = assigned[:i] + assigned[i + 1:]
        tmap = build_trait_biome_map(others)
        ranked = score_species(s, tmap, valid_biomes)
        predicted = ranked[0][0] if ranked else None
        actual = s["biome_affinity"]
        if predicted == actual:
            top1_correct += 1
        else:
            misses.append({
                "species_id": s.get("species_id"),
                "actual": actual,
                "predicted": predicted,
                "ranked": ranked[:3],
            })
    total = len(assigned)
    return {
        "top1_correct": top1_correct,
        "total": total,
        "top1_accuracy": (top1_correct / total) if total else 0.0,
        "misses": misses,
    }
