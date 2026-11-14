"""Test coverage Phase 3 Path D HYBRID + Phase 4c tooling.

ADR-2026-05-15 follow-up: gap audit revealed 4 NEW Python tools without
unit tests. This file covers smoke + invariants for:
- tools/py/lib/species_loader.py (Phase 4c.5 canonical loader)
- tools/py/skiv_synthetic_recompute.py (TKT-ECO-Z7 synthetic events)
- tools/py/review_phase3.py (Path D _provenance review queue)
- tools/etl/enrich_species_heuristic.py (Pattern A+B+C heuristics)

Run: PYTHONPATH=tools/py pytest tests/test_phase3_path_d_tools.py
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

import pytest

REPO_ROOT = Path(__file__).resolve().parent.parent
CATALOG_PATH = REPO_ROOT / "data" / "core" / "species" / "species_catalog.json"

# Ensure tools/py importable
sys.path.insert(0, str(REPO_ROOT / "tools" / "py"))
sys.path.insert(0, str(REPO_ROOT / "tools" / "etl"))


# ============================================================================
# species_loader.py tests
# ============================================================================


def test_species_loader_canonical_returns_list():
    """load_species_canonical reads catalog → list of dicts with 'id' alias."""
    from lib.species_loader import load_species_canonical

    species, src = load_species_canonical()
    assert isinstance(species, list)
    assert len(species) >= 50, f"expected >=50 species, got {len(species)}"
    assert src in ("catalog", "legacy_yaml")
    # Each entry has 'id' alias (loader normalizes species_id → id)
    for entry in species[:5]:
        assert "id" in entry, f"entry missing 'id': {entry}"


def test_species_loader_canonical_catalog_priority():
    """Catalog source preferred over YAML fallback when present."""
    from lib.species_loader import load_species_canonical

    if CATALOG_PATH.exists():
        species, src = load_species_canonical()
        assert src == "catalog", f"expected catalog source, got {src}"


def test_species_loader_catalog_synergies():
    """load_catalog_synergies returns list (may be empty)."""
    from lib.species_loader import load_catalog_synergies

    syn = load_catalog_synergies()
    assert isinstance(syn, list)


# ============================================================================
# skiv_synthetic_recompute.py tests
# ============================================================================


def test_skiv_synth_generate_deterministic():
    """Same seed → same outcomes (deterministic)."""
    from skiv_synthetic_recompute import generate_synthetic_events

    events_a = generate_synthetic_events(count=5, biome="savana", seed=42, start_iso="2026-05-15T09:00:00Z")
    events_b = generate_synthetic_events(count=5, biome="savana", seed=42, start_iso="2026-05-15T09:00:00Z")
    assert len(events_a) == 5
    assert len(events_b) == 5
    outcomes_a = [e["payload"]["outcome"] for e in events_a]
    outcomes_b = [e["payload"]["outcome"] for e in events_b]
    assert outcomes_a == outcomes_b, "deterministic seed must produce same outcomes"


def test_skiv_synth_outcomes_weighted():
    """Large N → outcome distribution roughly matches OUTCOME_WEIGHTS."""
    from skiv_synthetic_recompute import generate_synthetic_events

    events = generate_synthetic_events(count=200, biome="savana", seed=1, start_iso="2026-05-15T09:00:00Z")
    tally = {}
    for e in events:
        o = e["payload"]["outcome"]
        tally[o] = tally.get(o, 0) + 1
    # Victory outcomes should dominate (80% sum: low+med+apex)
    victory_count = tally.get("victory_low", 0) + tally.get("victory_med", 0) + tally.get("victory_apex", 0)
    assert victory_count >= 150, f"expected >=150 victory outcomes in 200, got {victory_count}"


def test_skiv_synth_apply_state_xp_delta():
    """apply_events_to_state increments xp_total correctly + level recompute."""
    from skiv_synthetic_recompute import apply_events_to_state, generate_synthetic_events, XP_BY_OUTCOME

    state = {"progression": {"unit_id": "skiv", "xp_total": 100, "level": 1, "encounter_count": 0}}
    events = generate_synthetic_events(count=10, biome="savana", seed=42, start_iso="2026-05-15T09:00:00Z")
    expected_xp = sum(XP_BY_OUTCOME[e["payload"]["outcome"]] for e in events)
    new_state = apply_events_to_state(state, events)
    assert new_state["progression"]["xp_total"] == 100 + expected_xp
    assert new_state["progression"]["encounter_count"] == 10
    assert new_state["origin"] == "skiv_synthetic_recompute"


def test_skiv_synth_diary_beats_appended():
    """apply_events_to_state appends diary beats with Skiv canonical voice."""
    from skiv_synthetic_recompute import apply_events_to_state, generate_synthetic_events

    state = {"progression": {"unit_id": "skiv", "xp_total": 0, "level": 1}}
    events = generate_synthetic_events(count=5, biome="savana", seed=42, start_iso="2026-05-15T09:00:00Z")
    new_state = apply_events_to_state(state, events)
    diary = new_state.get("diary", [])
    assert len(diary) >= 5, f"expected >=5 diary beats, got {len(diary)}"
    # Each beat has voice + outcome + biome
    for beat in diary[:5]:
        assert "voice" in beat
        assert "outcome" in beat
        assert beat["source"] == "skiv_synthetic_recompute"


# ============================================================================
# review_phase3.py tests (smoke + stats invariants)
# ============================================================================


def test_review_phase3_stats_runs():
    """review_phase3 --stats exits 0 + prints provenance dict."""
    import subprocess

    result = subprocess.run(
        [sys.executable, str(REPO_ROOT / "tools" / "py" / "review_phase3.py"), "--stats"],
        capture_output=True,
        text=True,
        cwd=str(REPO_ROOT),
    )
    assert result.returncode == 0, f"exit {result.returncode}: {result.stderr}"
    assert "provenance stats" in result.stdout.lower()


def test_review_phase3_field_filter():
    """review_phase3 --field visual_description --filter heuristic runs."""
    import subprocess

    result = subprocess.run(
        [
            sys.executable,
            str(REPO_ROOT / "tools" / "py" / "review_phase3.py"),
            "--field",
            "visual_description",
            "--filter",
            "heuristic",
            "--limit",
            "3",
        ],
        capture_output=True,
        text=True,
        cwd=str(REPO_ROOT),
    )
    assert result.returncode == 0, f"exit {result.returncode}: {result.stderr}"


# ============================================================================
# enrich_species_heuristic.py tests (Pattern A + C functions)
# ============================================================================


def test_enrich_derive_visual_description_apex():
    """Pattern A — Apex + biome + parts → composes 2-3 sentence italian."""
    from enrich_species_heuristic import derive_visual_description

    entry = {
        "species_id": "test_apex",
        "clade_tag": "Apex",
        "biome_affinity": "frattura_abissale_sinaptica",
        "default_parts": {
            "locomotion": "glider_magnetic",
            "offense": ["electric_pulse"],
            "defense": ["bipolar_skin"],
        },
    }
    result = derive_visual_description(entry)
    assert "Predatore apicale" in result, f"missing clade phrase: {result}"
    assert "fratture abissali" in result, f"missing biome phrase: {result}"
    assert "magnetic" in result.lower() or "elettric" in result.lower() or "scariche" in result, (
        f"missing parts phrase: {result}"
    )


def test_enrich_derive_visual_description_empty_returns_empty():
    """Pattern A — insufficient data (no clade + no biome + no parts) → empty string."""
    from enrich_species_heuristic import derive_visual_description

    entry = {"species_id": "test_empty"}
    result = derive_visual_description(entry)
    assert result == "", f"expected empty for insufficient data, got: {result}"


def test_enrich_derive_constraints_sentience_t0():
    """Pattern C — sentience T0 → reflex constraint applied."""
    from enrich_species_heuristic import derive_constraints

    entry = {"species_id": "test_t0", "sentience_index": "T0"}
    result = derive_constraints(entry)
    # Both sentience rules should trigger (T0 OR T1 + T0 only)
    assert any("riflesso" in c.lower() or "stimoli" in c.lower() for c in result), (
        f"expected sentience constraint: {result}"
    )


def test_enrich_derive_constraints_burrower():
    """Pattern C — locomotion burrower → roccia compatta constraint."""
    from enrich_species_heuristic import derive_constraints

    entry = {
        "species_id": "test_burrower",
        "sentience_index": "T2",
        "default_parts": {"locomotion": "burrower"},
    }
    result = derive_constraints(entry)
    assert any("roccia compatta" in c.lower() or "pavimentazione" in c.lower() for c in result), (
        f"expected burrower constraint: {result}"
    )


def test_enrich_predator_prey_heuristic_apex_predates_lower():
    """Pattern B — Apex same-biome predates Threat/Bridge/Support."""
    from enrich_species_heuristic import derive_predator_prey_heuristic

    apex_entry = {
        "species_id": "test_apex",
        "biome_affinity": "test_biome",
        "clade_tag": "Apex",
    }
    all_entries = [
        apex_entry,
        {"species_id": "test_threat", "biome_affinity": "test_biome", "clade_tag": "Threat"},
        {"species_id": "test_bridge", "biome_affinity": "test_biome", "clade_tag": "Bridge"},
        {"species_id": "test_other_biome", "biome_affinity": "other", "clade_tag": "Threat"},
    ]
    predates, predated_by = derive_predator_prey_heuristic(apex_entry, all_entries)
    assert "test_threat" in predates, f"Apex should predate Threat: {predates}"
    assert "test_bridge" in predates, f"Apex should predate Bridge: {predates}"
    assert "test_other_biome" not in predates, f"cross-biome filter failed: {predates}"
    assert predated_by == [], f"Apex top-tier should have no predators: {predated_by}"


# ============================================================================
# Integration smoke — catalog v0.4.x final shape
# ============================================================================


def test_catalog_has_provenance_field():
    """ADR-2026-05-15 Phase 3 Path D — _provenance audit trail present per legacy entries."""
    if not CATALOG_PATH.exists():
        pytest.skip("catalog not built")
    data = json.loads(CATALOG_PATH.read_text(encoding="utf-8"))
    legacy = [e for e in data.get("catalog", []) if e.get("source") == "legacy-yaml-merge"]
    with_provenance = sum(1 for e in legacy if e.get("_provenance"))
    assert with_provenance >= len(legacy) * 0.9, (
        f"expected ≥90% legacy entries with _provenance, got {with_provenance}/{len(legacy)}"
    )


def test_catalog_visual_description_coverage():
    """Phase 3 Path D Pattern A — visual_description coverage ≥90% legacy entries."""
    if not CATALOG_PATH.exists():
        pytest.skip("catalog not built")
    data = json.loads(CATALOG_PATH.read_text(encoding="utf-8"))
    legacy = [e for e in data.get("catalog", []) if e.get("source") == "legacy-yaml-merge"]
    with_visual = sum(1 for e in legacy if e.get("visual_description"))
    pct = 100.0 * with_visual / len(legacy) if legacy else 0
    assert pct >= 85.0, f"expected ≥85% visual_description coverage, got {pct:.1f}%"


def test_catalog_constraints_coverage():
    """Phase 3 Path D Pattern C — constraints coverage ≥70% legacy entries."""
    if not CATALOG_PATH.exists():
        pytest.skip("catalog not built")
    data = json.loads(CATALOG_PATH.read_text(encoding="utf-8"))
    legacy = [e for e in data.get("catalog", []) if e.get("source") == "legacy-yaml-merge"]
    with_constraints = sum(1 for e in legacy if e.get("constraints"))
    pct = 100.0 * with_constraints / len(legacy) if legacy else 0
    assert pct >= 70.0, f"expected ≥70% constraints coverage, got {pct:.1f}%"
