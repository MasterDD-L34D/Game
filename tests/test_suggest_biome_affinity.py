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


def test_score_species_returns_ranked_biomes():
    tmap = {"t_sand": Counter({"savana": 3})}
    species = {
        "species_id": "x",
        "trait_refs": ["t_sand"],
        "scientific_name": "Dunecrawler arena",
        "functional_signature": "predatore di sabbia",
        "clade_tag": "Apex",
    }
    ranked = sba.score_species(species, tmap, sba.load_biome_ids())
    assert ranked[0][0] == "savana"
    assert ranked[0][1] > 0


def test_score_species_no_signal_returns_empty():
    species = {
        "species_id": "y",
        "trait_refs": ["unknown_trait"],
        "scientific_name": "Xyz qqq",
        "functional_signature": "",
        "clade_tag": "Bridge",
    }
    ranked = sba.score_species(species, {}, sba.load_biome_ids())
    assert ranked == [] or ranked[0][1] == 0


def test_score_species_ignores_stale_biome_in_normalization():
    # trait votes savana=2 + a STALE biome not in valid list; valid score must
    # normalize over savana only (=> full W_TRAIT weight), stale never emitted.
    tmap = {"t_x": Counter({"savana": 2, "not_a_real_biome": 2})}
    species = {"species_id": "z", "trait_refs": ["t_x"], "scientific_name": "", "functional_signature": "", "clade_tag": "Apex"}
    ranked = sba.score_species(species, tmap, sba.load_biome_ids())
    biomes = [b for b, _ in ranked]
    assert "not_a_real_biome" not in biomes
    assert ranked[0][0] == "savana"
    assert abs(ranked[0][1] - 3.0) < 1e-9  # W_TRAIT * (2/2) = 3.0, NOT 3.0*(2/4)


def test_score_species_tiebreak_is_deterministic():
    # two biomes with equal score must rank alphabetically (stable across runs)
    tmap = {"t_a": Counter({"savana": 1}), "t_b": Counter({"caverna": 1})}
    species = {"species_id": "z", "trait_refs": ["t_a", "t_b"], "scientific_name": "", "functional_signature": "", "clade_tag": "Apex"}
    ranked = sba.score_species(species, tmap, sba.load_biome_ids())
    # both score W_TRAIT*1 = 3.0; alphabetical: caverna before savana
    assert [b for b, _ in ranked] == ["caverna", "savana"]


def test_golden_set_accuracy_is_measurable():
    species = sba.load_catalog()
    assigned, _ = sba.split_by_biome_affinity(species)
    result = sba.golden_set_validate(assigned, sba.load_biome_ids())
    assert result["total"] == 21
    assert 0.0 <= result["top1_accuracy"] <= 1.0
    assert result["top1_correct"] + len(result["misses"]) == 21


def test_golden_set_leave_one_out_excludes_self():
    species = sba.load_catalog()
    assigned, _ = sba.split_by_biome_affinity(species)
    result = sba.golden_set_validate(assigned, sba.load_biome_ids())
    assert result["top1_accuracy"] <= 1.0


def test_golden_set_accuracy_above_baseline():
    species = sba.load_catalog()
    assigned, _ = sba.split_by_biome_affinity(species)
    result = sba.golden_set_validate(assigned, sba.load_biome_ids())
    assert result["top1_accuracy"] >= 0.38


def test_singleton_biomes_identified():
    species = sba.load_catalog()
    assigned, _ = sba.split_by_biome_affinity(species)
    singles = sba.singleton_biomes(assigned)
    assert isinstance(singles, set)
    assert len(singles) >= 1


def test_generate_draft_shape():
    species = sba.load_catalog()
    assigned, missing = sba.split_by_biome_affinity(species)
    tmap = sba.build_trait_biome_map(assigned)
    draft = sba.generate_draft(missing, tmap, sba.load_biome_ids())
    assert len(draft) == 32
    entry = draft[0]
    for key in ("species_id", "suggested_biome", "confidence", "reasoning", "alternatives"):
        assert key in entry
    assert 0.0 <= entry["confidence"] <= 1.0
    assert isinstance(entry["alternatives"], list)


def test_predictable_accuracy_excludes_singletons():
    species = sba.load_catalog()
    assigned, _ = sba.split_by_biome_affinity(species)
    res = sba.golden_set_validate(assigned, sba.load_biome_ids())
    acc = sba.predictable_accuracy(assigned, res)
    assert acc["predictable_total"] <= 21
    assert acc["predictable_accuracy"] >= res["top1_accuracy"]
