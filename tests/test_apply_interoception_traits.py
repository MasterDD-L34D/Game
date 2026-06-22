"""OD-024 D4 -- operational populate path for interoception_traits.

The ETL assemblers (merge_pack_v2 / promote) only carry the field on a full
rebuild, which is obsolete (ADR-2026-05-15: merge_pack_v2 "becomes obsolete";
catalog is the SoT, mutated in-place by tools/py/apply_*.py). This is the LIVE
operational sync: read an authored `interoception_traits` field from
data/core/species.yaml (+ species_expansion.yaml) and write it into the matching
species_catalog.json entries IN PLACE -- mirror of tools/py/apply_biome_affinity.py.

DRY-RUN by default; idempotent; whitelist-filtered; no-op on current data (no
species authors the field yet -> catalog stays diff-clean).

Run: PYTHONPATH=tools/py python -m pytest tests/test_apply_interoception_traits.py
"""

from __future__ import annotations

import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(REPO_ROOT / "tools" / "etl"))

import apply_interoception_traits as apply_tool


# ============================================================================
# plan_interoception_changes (pure planner)
# ============================================================================


def test_plan_applies_source_value_to_matching_entry():
    catalog = [{"species_id": "foo"}, {"species_id": "bar"}]
    source = {"foo": ["propriocezione"]}
    to_apply, skipped = apply_tool.plan_interoception_changes(catalog, source)
    assert [(sp["species_id"], traits) for sp, traits in to_apply] == [
        ("foo", ["propriocezione"])
    ]


def test_plan_skips_species_not_in_catalog():
    catalog = [{"species_id": "foo"}]
    source = {"ghost": ["nocicezione"]}
    to_apply, skipped = apply_tool.plan_interoception_changes(catalog, source)
    assert to_apply == []
    assert any(sid == "ghost" and "not in catalog" in why for sid, why in skipped)


def test_plan_is_idempotent_when_already_in_sync():
    catalog = [{"species_id": "foo", "interoception_traits": ["propriocezione"]}]
    source = {"foo": ["propriocezione"]}
    to_apply, skipped = apply_tool.plan_interoception_changes(catalog, source)
    assert to_apply == []
    assert any(sid == "foo" for sid, why in skipped)


def test_plan_empty_source_is_a_noop():
    catalog = [{"species_id": "foo"}, {"species_id": "bar"}]
    to_apply, skipped = apply_tool.plan_interoception_changes(catalog, {})
    assert to_apply == []


# ============================================================================
# apply_changes (mutation + provenance)
# ============================================================================


def test_apply_changes_sets_field_and_provenance():
    sp = {"species_id": "foo"}
    apply_tool.apply_changes([(sp, ["propriocezione", "termocezione"])])
    assert sp["interoception_traits"] == ["propriocezione", "termocezione"]
    assert sp["_provenance"]["interoception_traits"] == apply_tool.PROV_TAG


def test_apply_changes_preserves_other_keys():
    sp = {"species_id": "foo", "trait_refs": ["x"], "sentience_index": "T2"}
    apply_tool.apply_changes([(sp, ["nocicezione"])])
    assert sp["trait_refs"] == ["x"]
    assert sp["sentience_index"] == "T2"
    assert sp["interoception_traits"] == ["nocicezione"]


# ============================================================================
# load_source_interoception (species.yaml + expansion parsing + whitelist filter)
# ============================================================================


def test_load_source_filters_whitelist_and_drops_empty(tmp_path):
    species_yaml = tmp_path / "species.yaml"
    species_yaml.write_text(
        "species:\n"
        "  - id: foo\n"
        "    interoception_traits: [propriocezione, not_real]\n"
        "  - id: bar\n"
        "    interoception_traits: [only_bad]\n"
        "  - id: baz\n",
        encoding="utf-8",
    )
    source = apply_tool.load_source_interoception(species_yaml, None)
    assert source == {"foo": ["propriocezione"]}  # bar dropped (all bad), baz absent


def test_load_source_reads_expansion_examples(tmp_path):
    species_yaml = tmp_path / "species.yaml"
    species_yaml.write_text("species: []\n", encoding="utf-8")
    expansion = tmp_path / "species_expansion.yaml"
    expansion.write_text(
        "species_examples:\n"
        "  - id: qux\n"
        "    interoception_traits: [termocezione]\n",
        encoding="utf-8",
    )
    source = apply_tool.load_source_interoception(species_yaml, expansion)
    assert source == {"qux": ["termocezione"]}


# ============================================================================
# current-data invariant: real sources author nothing -> no-op (diff-clean)
# ============================================================================


def test_real_sources_author_nothing_so_plan_is_empty():
    species_yaml = REPO_ROOT / "data" / "core" / "species.yaml"
    expansion = REPO_ROOT / "data" / "core" / "species_expansion.yaml"
    source = apply_tool.load_source_interoception(species_yaml, expansion)
    assert source == {}, f"expected no authored field on current data, got {source}"
