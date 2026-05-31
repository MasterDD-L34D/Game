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
CANONICAL_DATA_DIR = REPO_ROOT / "data/core"


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


# Provenance tag written by apply_biome_affinity.py onto species whose
# biome_affinity came from THIS heuristic (a proposal under review, not editorial
# ground truth). Must mirror apply_biome_affinity.PROV_TAG.
D4_PROVENANCE_TAG = "d4-heuristic-suggest+master-dd-approve"


def editorial_assigned(assigned: list) -> list:
    """The assigned species forming the heuristic's TRUSTED ground truth:
    everything except entries whose biome_affinity this tool itself wrote (tagged
    D4_PROVENANCE_TAG in _provenance). Stable regardless of how many suggestions
    apply_biome_affinity.py has merged. The golden-set gate and trait training run
    against this set so a post-apply checkout still regenerates the draft instead
    of self-poisoning (the applied suggestions would otherwise drag predictable
    accuracy below the gate and block regeneration)."""
    return [
        s for s in assigned
        if (s.get("_provenance") or {}).get("biome_affinity") != D4_PROVENANCE_TAG
    ]


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
    "palust": "palude",
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
    "abyss": "frattura_abissale_sinaptica",
    "abiss": "frattura_abissale_sinaptica",
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


GATE_THRESHOLD = 0.60  # >=60% top-1 on PREDICTABLE species (non-singleton biomes)


def singleton_biomes(assigned: list) -> set:
    """Biomes represented by exactly 1 assigned species (unpredictable in
    leave-one-out: removing the species removes the only training example)."""
    counts = Counter(
        s["biome_affinity"] for s in assigned
        if isinstance(s.get("biome_affinity"), str) and s["biome_affinity"].strip()
    )
    return {b for b, n in counts.items() if n == 1}


def predictable_accuracy(assigned: list, gs_result: dict) -> dict:
    """Recompute accuracy excluding species whose biome is a singleton (LOO can
    never predict them). gs_result is the output of golden_set_validate."""
    singles = singleton_biomes(assigned)
    predictable = [s for s in assigned if s["biome_affinity"] not in singles]
    missed_ids = {m["species_id"] for m in gs_result["misses"]}
    correct = sum(1 for s in predictable if s["species_id"] not in missed_ids)
    total = len(predictable)
    return {
        "predictable_total": total,
        "predictable_correct": correct,
        "predictable_accuracy": (correct / total) if total else 0.0,
        "singleton_biomes": sorted(singles),
    }


def _confidence(ranked: list) -> float:
    if not ranked:
        return 0.0
    if len(ranked) == 1:
        return 0.5
    top, second = ranked[0][1], ranked[1][1]
    if top <= 0:
        return 0.0
    return max(0.0, min(1.0, (top - second) / top))


def _reasoning(species: dict, ranked: list) -> str:
    if not ranked:
        return "no signal (no trait votes, no keyword match) -- needs manual assignment"
    traits = ", ".join(species.get("trait_refs", []) or []) or "none"
    top = ranked[0]
    return f"top biome {top[0]} (score {top[1]:.2f}) from traits [{traits}] + clade {species.get('clade_tag')}"


def generate_draft(missing: list, trait_biome_map: dict, valid_biomes: list) -> list:
    draft = []
    for s in missing:
        ranked = score_species(s, trait_biome_map, valid_biomes)
        suggested = ranked[0][0] if ranked else None
        draft.append({
            "species_id": s.get("species_id"),
            "suggested_biome": suggested,
            "confidence": round(_confidence(ranked), 3),
            "reasoning": _reasoning(s, ranked),
            "alternatives": [b for b, _ in ranked[:3]],
        })
    return draft


def _assert_safe_output(out_path: Path) -> None:
    """Hard-refuse writing into canonical data (enforces the DRAFT-only contract
    in code, not just by convention). Blocks e.g.
    --out data/core/species/species_catalog.json from clobbering the canonical
    catalog via a mistaken or malicious override."""
    resolved = out_path.resolve()
    canonical_dir = CANONICAL_DATA_DIR.resolve()
    if resolved == CATALOG_PATH.resolve():
        raise SystemExit(f"[REFUSED] --out is the canonical catalog, never written: {resolved}")
    if resolved == canonical_dir or canonical_dir in resolved.parents:
        raise SystemExit(f"[REFUSED] --out resolves inside canonical data dir {canonical_dir}: {resolved}")


def main(argv=None):
    ap = argparse.ArgumentParser(description="D4 biome-affinity heuristic (DRAFT only)")
    ap.add_argument("--out", default=str(REPO_ROOT / "docs/planning/2026-05-30-biome-affinity-draft.json"))
    ap.add_argument("--gate", type=float, default=GATE_THRESHOLD)
    args = ap.parse_args(argv)
    _assert_safe_output(Path(args.out))

    species = load_catalog()
    assigned, missing = split_by_biome_affinity(species)
    valid = load_biome_ids()

    # Gate + trait training measure heuristic quality against the EDITORIAL ground
    # truth only (exclude this tool's own prior suggestions), so the gate is stable
    # whether or not apply_biome_affinity.py has already merged suggestions.
    editorial = editorial_assigned(assigned)

    gs = golden_set_validate(editorial, valid)
    pa = predictable_accuracy(editorial, gs)
    print(f"[golden-set] total top-1 {gs['top1_accuracy']:.1%} ({gs['top1_correct']}/{gs['total']})")
    print(f"[golden-set] predictable top-1 {pa['predictable_accuracy']:.1%} ({pa['predictable_correct']}/{pa['predictable_total']}) gate={args.gate:.0%}")
    print(f"[golden-set] singleton biomes (LOO-unpredictable, excluded): {pa['singleton_biomes']}")
    if len(editorial) != len(assigned):
        print(f"[golden-set] editorial truth {len(editorial)}/{len(assigned)} assigned ({len(assigned) - len(editorial)} D4-applied excluded)")

    if pa["predictable_accuracy"] < args.gate:
        print("[GATE FAIL] predictable accuracy below threshold. NOT generating draft.")
        for m in gs["misses"]:
            print(f"  - {m['species_id']}: actual={m['actual']} predicted={m['predicted']}")
        return 1

    tmap = build_trait_biome_map(editorial)
    draft = generate_draft(missing, tmap, valid)
    out_path = Path(args.out)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump({
            "golden_set": {
                "total_accuracy": gs["top1_accuracy"], "total_correct": gs["top1_correct"], "total": gs["total"],
                "predictable_accuracy": pa["predictable_accuracy"], "predictable_correct": pa["predictable_correct"],
                "predictable_total": pa["predictable_total"], "singleton_biomes": pa["singleton_biomes"],
                "gate": args.gate,
            },
            "draft": draft,
        }, f, ensure_ascii=False, indent=2)
    print(f"[GATE PASS] draft of {len(draft)} suggestions written to {out_path}")
    return 0


if __name__ == "__main__":
    import sys
    sys.exit(main())
