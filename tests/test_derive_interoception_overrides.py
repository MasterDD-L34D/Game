"""OD-024 D4 -- principled interoception_traits override DERIVE rule.

Rule-based populate (Approach A, master-dd ratified 2026-06-22): per-species
override = tier_default (D2) UNION ecological additions, written only where it
differs from the tier default. Additions: nocicezione if danger>=2; termocezione
if biome in THERMAL_BIOMES. prop+vest are the universal T1 floor (no gate). T0 /
below-gateway skipped (producer gates them out before reading the override).

Spec: docs/superpowers/specs/2026-06-22-od024-d4-interoception-overrides-rule-design.md
Run: PYTHONPATH=tools/py python -m pytest tests/test_derive_interoception_overrides.py
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(REPO_ROOT / "tools" / "etl"))

import derive_interoception_overrides as d


# ============================================================================
# tier_default (mirror of producer interoceptionForTier / D2 map)
# ============================================================================


def test_tier_default_cumulative():
    assert d.tier_default("T1") == ["propriocezione", "equilibrio_vestibolare"]
    assert d.tier_default("T2") == ["propriocezione", "equilibrio_vestibolare", "nocicezione"]
    assert d.tier_default("T3") == [
        "propriocezione",
        "equilibrio_vestibolare",
        "nocicezione",
        "termocezione",
    ]
    assert d.tier_default("T0") == []
    assert d.tier_default("garbage") == []


# ============================================================================
# derive_override (the rule)
# ============================================================================


def test_derive_adds_nocicezione_for_danger_T1():
    e = {"sentience_index": "T1", "risk_profile": {"danger_level": 2}, "biome_affinity": "savana"}
    assert d.derive_override(e) == ["propriocezione", "equilibrio_vestibolare", "nocicezione"]


def test_derive_adds_termocezione_for_thermal_biome_T1():
    e = {"sentience_index": "T1", "risk_profile": {"danger_level": 1}, "biome_affinity": "badlands"}
    assert d.derive_override(e) == ["propriocezione", "equilibrio_vestibolare", "termocezione"]


def test_derive_both_additions_T2_canonical_order():
    e = {"sentience_index": "T2", "risk_profile": {"danger_level": 3}, "biome_affinity": "deserto_caldo"}
    assert d.derive_override(e) == [
        "propriocezione",
        "equilibrio_vestibolare",
        "nocicezione",
        "termocezione",
    ]


def test_derive_none_when_equals_tier_default():
    e = {"sentience_index": "T1", "risk_profile": {"danger_level": 1}, "biome_affinity": "foresta_temperata"}
    assert d.derive_override(e) is None


def test_derive_none_for_T3_plus():
    # T3 already carries all 4 by tier -> additions can't exceed -> None.
    e = {"sentience_index": "T3", "risk_profile": {"danger_level": 3}, "biome_affinity": "abisso_vulcanico"}
    assert d.derive_override(e) is None


def test_derive_none_for_T0_below_gateway():
    e = {"sentience_index": "T0", "risk_profile": {"danger_level": 3}, "biome_affinity": "badlands"}
    assert d.derive_override(e) is None


def test_derive_non_thermal_ambiguous_biomes_no_termocezione():
    # atollo_obsidiana + canyons_risonanti ruled NON-thermal (master-dd 2026-06-22).
    for biome in ("atollo_obsidiana", "canyons_risonanti"):
        e = {"sentience_index": "T1", "risk_profile": {"danger_level": 1}, "biome_affinity": biome}
        assert d.derive_override(e) is None


# ============================================================================
# plan_overrides
# ============================================================================


def test_plan_overrides_selects_only_deviating():
    catalog = [
        {"species_id": "a", "sentience_index": "T1", "risk_profile": {"danger_level": 2}, "biome_affinity": "savana"},
        {"species_id": "b", "sentience_index": "T1", "risk_profile": {"danger_level": 1}, "biome_affinity": "foresta_temperata"},
    ]
    to_apply, skipped = d.plan_overrides(catalog)
    assert [sp["species_id"] for sp, _ in to_apply] == ["a"]
    assert any(sid == "b" for sid, _ in skipped)


def test_plan_idempotent_when_in_sync():
    catalog = [
        {
            "species_id": "a",
            "sentience_index": "T1",
            "risk_profile": {"danger_level": 2},
            "biome_affinity": "savana",
            "interoception_traits": ["propriocezione", "equilibrio_vestibolare", "nocicezione"],
        }
    ]
    to_apply, skipped = d.plan_overrides(catalog)
    assert to_apply == []
    assert any(sid == "a" and "in sync" in why for sid, why in skipped)


# ============================================================================
# apply_changes + main (IO)
# ============================================================================


def test_apply_changes_sets_field_and_provenance():
    sp = {"species_id": "a", "trait_refs": ["x"]}
    d.apply_changes([(sp, ["propriocezione", "nocicezione"])])
    assert sp["interoception_traits"] == ["propriocezione", "nocicezione"]
    assert sp["_provenance"]["interoception_traits"] == d.PROV_TAG
    assert sp["trait_refs"] == ["x"]  # other keys preserved


def test_main_apply_then_idempotent(tmp_path):
    cat = {
        "catalog": [
            {"species_id": "a", "sentience_index": "T1", "risk_profile": {"danger_level": 2}, "biome_affinity": "savana"},
            {"species_id": "b", "sentience_index": "T1", "risk_profile": {"danger_level": 1}, "biome_affinity": "palude"},
        ]
    }
    p = tmp_path / "c.json"
    p.write_text(json.dumps(cat), encoding="utf-8")
    assert d.main(["--apply", "--catalog", str(p)]) == 0
    after = json.loads(p.read_text(encoding="utf-8"))["catalog"]
    assert after[0]["interoception_traits"] == ["propriocezione", "equilibrio_vestibolare", "nocicezione"]
    assert "interoception_traits" not in after[1]
    # idempotent: second --apply finds nothing to apply, leaves file untouched.
    before = p.read_text(encoding="utf-8")
    assert d.main(["--apply", "--catalog", str(p)]) == 0
    assert p.read_text(encoding="utf-8") == before


def test_main_dry_run_does_not_write(tmp_path):
    cat = {"catalog": [{"species_id": "a", "sentience_index": "T1", "risk_profile": {"danger_level": 2}, "biome_affinity": "savana"}]}
    p = tmp_path / "c.json"
    p.write_text(json.dumps(cat), encoding="utf-8")
    before = p.read_text(encoding="utf-8")
    assert d.main(["--catalog", str(p)]) == 0  # dry-run default
    assert p.read_text(encoding="utf-8") == before
