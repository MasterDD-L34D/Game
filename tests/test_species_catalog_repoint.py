"""Regression guard for the species.yaml -> species_catalog.json repoint (B8, #2271).

`data/core/species.yaml` was removed in #2271 (split into the JSON catalog
`data/core/species/species_catalog.json`). Several QA/audit scripts kept loading
the removed monolith -> hard crash (frattura, evo_pack_pipeline) or permanent
false "Missing file" health issues (data_health). These tests pin the repoint so
the dead path cannot silently reappear.
"""
import importlib.util
import json
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
CATALOG = REPO_ROOT / "data" / "core" / "species" / "species_catalog.json"


def _load_module(rel_path: str, name: str):
    spec = importlib.util.spec_from_file_location(name, REPO_ROOT / rel_path)
    module = importlib.util.module_from_spec(spec)
    # register before exec: dataclass field resolution needs the module in
    # sys.modules (data_health uses @dataclass with annotation lookup).
    sys.modules[name] = module
    spec.loader.exec_module(module)
    return module


def test_canonical_catalog_exists_and_shaped():
    assert CATALOG.exists(), "canonical species catalog missing"
    data = json.loads(CATALOG.read_text(encoding="utf-8"))
    assert isinstance(data.get("catalog"), list) and data["catalog"], "catalog list empty"
    entry = data["catalog"][0]
    assert "species_id" in entry and "biome_affinity" in entry and "trait_refs" in entry


def test_data_health_species_rules_point_at_existing_paths():
    dh = _load_module("tools/audit/data_health.py", "data_health_under_test")
    paths = {str(rule.path).replace("\\", "/") for rule in dh.EXPECTED_DATASETS}
    # the removed monolith + the never-existed pack/core path must not reappear
    assert "data/core/species.yaml" not in paths
    assert "packs/evo_tactics_pack/data/core/species.yaml" not in paths
    species_rules = [r for r in dh.EXPECTED_DATASETS if "species" in str(r.path)]
    assert species_rules, "expected at least one species DatasetRule"
    for rule in species_rules:
        assert rule.absolute_path().exists(), f"data_health rule path missing: {rule.path}"


def test_frattura_species_resolve_from_catalog():
    fr = _load_module("scripts/qa/frattura_abissale_validations.py", "frattura_under_test")
    data = fr.load_json("data/core/species/species_catalog.json")
    species_map = {
        e.get("species_id"): e for e in data.get("catalog", []) if e.get("species_id")
    }
    for sid in fr.SPECIES_IDS:
        assert sid in species_map, f"{sid} not resolvable from catalog"
        assert species_map[sid].get("biome_affinity") == fr.BIOME_SLUG
        # trait_refs is the flat slug list the repoint reads
        assert isinstance(species_map[sid].get("trait_refs", []), list)
