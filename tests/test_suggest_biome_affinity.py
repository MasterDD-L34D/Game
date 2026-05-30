import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "tools", "py"))

from collections import Counter

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


def test_build_trait_biome_map_from_assigned():
    species = sba.load_catalog()
    assigned, _ = sba.split_by_biome_affinity(species)
    tmap = sba.build_trait_biome_map(assigned)
    assert isinstance(tmap, dict)
    assert len(tmap) > 0
    sample_trait = next(iter(tmap))
    assert isinstance(tmap[sample_trait], Counter)


def test_trait_map_vote_counts_match_assigned():
    fake_assigned = [
        {"trait_refs": ["t_sand"], "biome_affinity": "savana"},
        {"trait_refs": ["t_sand", "t_other"], "biome_affinity": "savana"},
    ]
    tmap = sba.build_trait_biome_map(fake_assigned)
    assert tmap["t_sand"]["savana"] == 2
    assert tmap["t_other"]["savana"] == 1


def test_keyword_biome_scores_arena_hits_savana_or_sand():
    text = "Specie apex Arenavolux sagittalis, coda contrappeso"
    scores = sba.keyword_biome_scores(text, sba.load_biome_ids())
    assert scores.get("savana", 0) > 0


def test_keyword_biome_scores_empty_when_no_match():
    scores = sba.keyword_biome_scores("zzz qqq", sba.load_biome_ids())
    assert all(v == 0 for v in scores.values()) or scores == {}
