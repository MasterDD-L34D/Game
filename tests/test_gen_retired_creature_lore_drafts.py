"""Tests for gen_retired_creature_lore_drafts -- salvage verdict 4.

Generate A.L.I.E.N.A. codex lore DRAFTs for the 13 ratified retired creatures,
weaving the SALVAGED KIT (genetic_traits) into the lore (the bare stub scaffold
would lose it). DRAFTs stay pending-review (HITL gate).

Run: PYTHONPATH=tools/py python -m pytest tests/test_gen_retired_creature_lore_drafts.py
"""
import sys
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "tools" / "py"))

import gen_retired_creature_lore_drafts as drv  # noqa: E402
import codex_aliena_lore_gen as gen  # noqa: E402

BIOMES = yaml.safe_load((ROOT / "data/core/biomes.yaml").read_text(encoding="utf-8"))
GRAMMAR = gen.load_grammar(str(ROOT / "data/codex/_grammar/aliena_lore.json"))


def test_normalize_trait_refs_unions_and_dedupes():
    species = {
        "genetic_traits": {
            "core": ["a", "b", "b"],
            "optional": ["c"],
            "synergy": [],
        },
        "derived_from_environment": {"suggested_traits": ["a", "d"]},
    }
    assert drv.normalize_trait_refs(species) == ["a", "b", "c", "d"]


def test_normalize_trait_refs_empty_for_no_kit():
    assert drv.normalize_trait_refs({}) == []


def test_all_13_ratified_ids_resolve_to_a_spec():
    specs = drv._index_specs()
    missing = [sid for sid in drv.RETIRED_IDS if sid not in specs]
    assert not missing, f"specs missing on disk: {missing}"
    assert len(drv.RETIRED_IDS) == 13


def test_build_draft_weaves_kit_and_stamps_pending():
    specs = drv._index_specs()
    path = specs["heliopteryx_radians"]
    draft = drv.build_draft(path, BIOMES, GRAMMAR)
    ce = draft["codex_entry"]
    # HITL gate: stamped pending-review (promote refuses this)
    assert ce["lore_review_status"] == "generated_pending_review"
    dims = ce["aliena_dimensions"]
    # the salvaged kit is woven into the evolutionary-lines prose (rich origin)
    l_content = dims["L_linee_evolutive"]["content"]
    assert "adattamento volo" in l_content
    # and preserved in the codex data (cross_ref carries the kit trait links)
    cross = dims["L_linee_evolutive"]["cross_ref"]
    assert "trait:adattamento_volo" in cross


def test_every_draft_dimension_is_leak_free():
    specs = drv._index_specs()
    for sid in drv.RETIRED_IDS:
        draft = drv.build_draft(specs[sid], BIOMES, GRAMMAR)
        ce = draft["codex_entry"]
        for key in gen.ALIENA_DIMENSION_KEYS:
            content = ce["aliena_dimensions"][key]["content"]
            assert content.strip(), f"{sid}/{key}: empty content"
            assert "#" not in content, f"{sid}/{key}: unresolved grammar symbol"
            assert "i18n:" not in content, f"{sid}/{key}: i18n ref leaked into prose"
            assert "TODO" not in content, f"{sid}/{key}: TODO leaked"


def test_no_secret_score_fields_serialized():
    forbidden = {"aggregate", "sub_scores", "coherence", "enforcement_factor"}
    specs = drv._index_specs()
    draft = drv.build_draft(specs["lithoconstructus_inhibens"], BIOMES, GRAMMAR)
    ce = draft["codex_entry"]
    assert not (forbidden & set(ce.keys()))
    for dim in ce["aliena_dimensions"].values():
        assert not (forbidden & set(dim.keys()))
