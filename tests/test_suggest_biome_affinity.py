import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "tools", "py"))

import suggest_biome_affinity as sba


def test_load_catalog_returns_53_species():
    species = sba.load_catalog()
    assert len(species) == 53
    assert all("species_id" in s for s in species)


def test_split_assigned_vs_missing():
    species = sba.load_catalog()
    assigned, missing = sba.split_by_biome_affinity(species)
    assert len(assigned) == 21
    assert len(missing) == 32
    assert all(isinstance(s["biome_affinity"], str) and s["biome_affinity"] for s in assigned)


def test_valid_biome_ids_are_20():
    ids = sba.load_biome_ids()
    assert len(ids) == 20
    assert "savana" in ids
    assert "rovine_planari" in ids
