"""OD-024 D4 -- interoception_traits source->catalog passthrough (ETL pipeline).

The producer read-path (perSpeciesOverride in
apps/backend/services/sentience/sentienceInteroceptionGrant.js) already ships and
is tested by tests/api/sentience-interoception-grant.test.js. This covers the
WRITE side: the generation pipeline must carry an optional
`interoception_traits: [<gateway ids>]` field from a source species record
through to the catalog entry, mirroring the trait_refs precedent but OMITTING the
key when the source lacks it (so the catalog stays diff-clean on current data --
no source authors the field yet).

Gateway whitelist (= producer INTEROCEPTION_TRAIT_IDS): propriocezione,
equilibrio_vestibolare, nocicezione, termocezione. A non-whitelist id is dropped
at write time (defensive -- a typo can never reach the catalog).

Run: PYTHONPATH=tools/py python -m pytest tests/test_interoception_field_passthrough.py
"""

from __future__ import annotations

import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent

# ETL stages live in tools/etl; the shared field helper alongside them.
sys.path.insert(0, str(REPO_ROOT / "tools" / "py"))
sys.path.insert(0, str(REPO_ROOT / "tools" / "etl"))

import merge_pack_v2_species as merge
import promote_gameplay_to_canon as promote


# ============================================================================
# shared helper: filter_interoception (tools/etl/interoception_field.py)
# ============================================================================


def test_filter_keeps_only_whitelisted_ids_in_order():
    from interoception_field import filter_interoception

    assert filter_interoception(
        ["termocezione", "not_a_real_trait", "propriocezione"]
    ) == ["termocezione", "propriocezione"]


def test_filter_dedups_preserving_first_occurrence():
    from interoception_field import filter_interoception

    assert filter_interoception(
        ["propriocezione", "propriocezione", "nocicezione"]
    ) == ["propriocezione", "nocicezione"]


def test_filter_empty_inputs_return_empty_list():
    from interoception_field import filter_interoception

    assert filter_interoception(None) == []
    assert filter_interoception([]) == []
    assert filter_interoception("propriocezione") == []  # non-list
    assert filter_interoception(["only_bad_ids"]) == []


def test_helper_exposes_canonical_four_gateway_ids():
    from interoception_field import INTEROCEPTION_TRAIT_IDS

    assert sorted(INTEROCEPTION_TRAIT_IDS) == sorted(
        ["propriocezione", "equilibrio_vestibolare", "nocicezione", "termocezione"]
    )


# ============================================================================
# merge_pack_v2_species.build_entry (pack-v2 source path)
# ============================================================================


def test_build_entry_carries_filtered_interoception_from_pack():
    pack = {
        "scientific_name": "Foo bar",
        "interoception_traits": ["propriocezione", "not_a_real_trait"],
    }
    entry = merge.build_entry("foo_bar", pack)
    assert entry["interoception_traits"] == ["propriocezione"]


def test_build_entry_omits_key_when_pack_lacks_field():
    entry = merge.build_entry("foo_bar", {"scientific_name": "Foo bar"})
    assert "interoception_traits" not in entry


def test_build_entry_reads_field_from_legacy_overlay_when_pack_absent():
    pack = {"scientific_name": "Foo bar"}
    legacy = {"interoception_traits": ["nocicezione"]}
    entry = merge.build_entry("foo_bar", pack, legacy=legacy)
    assert entry["interoception_traits"] == ["nocicezione"]


def test_build_entry_stub_branch_omits_key():
    # pack is None -> stub branch (Frattura Abissale / dune_stalker). No source
    # field -> the key must stay absent.
    entry = merge.build_entry("dune_stalker", None)
    assert "interoception_traits" not in entry


# ============================================================================
# merge_pack_v2_species.build_entry_from_legacy (legacy YAML residue path)
# ============================================================================


def test_build_entry_from_legacy_carries_filtered_interoception():
    legacy = {
        "genus": "Foo",
        "epithet": "bar",
        "interoception_traits": ["nocicezione", "termocezione", "bad_id"],
    }
    entry = merge.build_entry_from_legacy("foo_bar", legacy)
    assert entry["interoception_traits"] == ["nocicezione", "termocezione"]


def test_build_entry_from_legacy_omits_key_when_absent():
    entry = merge.build_entry_from_legacy("foo_bar", {"genus": "Foo", "epithet": "bar"})
    assert "interoception_traits" not in entry


# ============================================================================
# promote_gameplay_to_canon.derive_entry (gameplay YAML promote path)
# ============================================================================


def test_derive_entry_carries_filtered_interoception_from_gameplay_yaml():
    pack = {
        "role_trofico": "predator",
        "interoception_traits": ["equilibrio_vestibolare", "junk"],
    }
    entry = promote.derive_entry(pack, "badlands", "test-creature")
    assert entry["interoception_traits"] == ["equilibrio_vestibolare"]


def test_derive_entry_omits_key_when_gameplay_yaml_lacks_field():
    entry = promote.derive_entry({"role_trofico": "predator"}, "badlands", "test-creature")
    assert "interoception_traits" not in entry
