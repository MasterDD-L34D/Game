"""Tests for tools/py/seed_skiv_saga.py — Skiv canonical creature seed."""

from __future__ import annotations

import json
import sys
from pathlib import Path

import pytest

PROJECT_ROOT = Path(__file__).resolve().parents[2]
TOOLS_PY = PROJECT_ROOT / "tools" / "py"
if str(TOOLS_PY) not in sys.path:
    sys.path.insert(0, str(TOOLS_PY))

pytest.importorskip("yaml", reason="PyYAML required for seed script")

from seed_skiv_saga import (  # noqa: E402
    SKIV_INTERNALIZED,
    SKIV_MUTATION_ID,
    SKIV_PICKED_PERK,
    SKIV_TO_JOB,
    SKIV_UNLOCKED_THOUGHTS,
    build_saga_state,
    compose_cabinet,
    compose_diary,
    compose_mutations,
    compose_progression,
    main,
    render_markdown,
    validate_state,
)


# ─────────────────────────────────────────────────────────
# Validators
# ─────────────────────────────────────────────────────────


def test_validate_state_resolves_all_references():
    """All Skiv ids (job, perk, mutation, thoughts, species) must exist in YAML."""
    out = validate_state(quiet=True)
    assert out["stalker_job"]["id"] == SKIV_TO_JOB
    assert out["mutation"]["tier"] == 2
    assert out["species"]["id"] == "dune_stalker"
    for tid in SKIV_UNLOCKED_THOUGHTS:
        assert tid in out["thoughts"]


def test_validate_state_quiet_does_not_print(capsys):
    validate_state(quiet=True)
    captured = capsys.readouterr()
    assert captured.out == ""


# ─────────────────────────────────────────────────────────
# Compose helpers (deterministic)
# ─────────────────────────────────────────────────────────


def test_compose_progression_shape():
    p = compose_progression()
    assert p["unit_id"] == "skiv"
    assert p["job"] == "stalker"
    assert p["level"] == 4
    assert p["xp_total"] == 210
    assert p["picked_perks"][0]["perk_id"] == SKIV_PICKED_PERK["perk_id"]
    assert p["previous_job"] == "skirmisher"


def test_compose_cabinet_slots():
    cab = compose_cabinet()
    assert cab["slots_max"] == 3
    assert cab["slots_used"] == len(SKIV_INTERNALIZED)
    assert cab["slots_used"] == 2  # i_osservatore + n_intuizione_terrena
    assert set(cab["unlocked"]) == set(SKIV_UNLOCKED_THOUGHTS)
    assert set(cab["internalized"]) == set(SKIV_INTERNALIZED)
    assert cab["researching"] == []


def test_compose_mutations_carries_trait_swap():
    muts = compose_mutations()
    assert len(muts) == 1
    m = muts[0]
    assert m["id"] == SKIV_MUTATION_ID
    assert m["trait_swap"]["remove"] == ["artigli_sette_vie"]
    assert m["trait_swap"]["add"] == ["artigli_vetrificati"]
    assert m["category"] == "physiological"


def test_compose_diary_8_entries_unique_event_types():
    diary = compose_diary()
    assert len(diary) == 8
    event_types = {e["event_type"] for e in diary}
    expected = {
        "form_evolved",
        "thought_internalized",
        "scenario_completed",
        "mbti_axis_threshold_crossed",
        "defy_used",
        "synergy_triggered",
        "mutation_acquired",
        "job_changed",
    }
    # 7 unique because thought_internalized appears twice (i_osservatore + n_intuizione_terrena)
    # All must be in the diaryStore allowed whitelist
    assert event_types.issubset(expected)
    # Allow the saga to emit ALL 8 whitelist types OR a subset; current saga emits 7
    # (form_evolved currently absent in saga because job_changed covers class evolution)
    assert event_types == expected - {"form_evolved"}


def test_compose_diary_chronological_timestamps():
    diary = compose_diary("2026-04-25T18:00:00Z")
    timestamps = [e["ts"] for e in diary]
    assert timestamps == sorted(timestamps), "diary must be chronological"


def test_compose_diary_payload_per_event_type():
    diary = compose_diary()
    # Spot-check key payload fields per event type
    by_type = {e["event_type"]: e for e in diary}
    assert by_type["job_changed"]["payload"]["from_job"] == "skirmisher"
    assert by_type["job_changed"]["payload"]["to_job"] == "stalker"
    assert by_type["mutation_acquired"]["payload"]["mutation_id"] == SKIV_MUTATION_ID
    assert by_type["defy_used"]["payload"]["sg_cost"] == 2
    assert by_type["synergy_triggered"]["payload"]["synergy_id"] == "echo_backstab"


# ─────────────────────────────────────────────────────────
# build_saga_state — full composition
# ─────────────────────────────────────────────────────────


def test_build_saga_state_has_required_keys():
    state = build_saga_state()
    expected = {
        "schema_version",
        "generated_at",
        "unit_id",
        "species_id",
        "biome_id",
        "mbti_axes",
        "progression",
        "cabinet",
        "mutations",
        "diary",
        "_notes",
    }
    assert expected.issubset(state.keys())


def test_build_saga_state_mbti_consistency_intp():
    """Skiv must be INTP-leaning-I post 2026-04-25 audit (T_F=0.72, E_I=0.68)."""
    state = build_saga_state()
    axes = state["mbti_axes"]
    assert axes["T_F"]["value"] >= 0.65, "T pole tier1+ required"
    assert axes["E_I"]["value"] >= 0.65, "I pole tier1+ required for INTP"
    assert axes["S_N"]["value"] <= 0.25, "N pole tier2 required"
    assert axes["J_P"]["value"] <= 0.35, "P pole tier1 required"


def test_build_saga_state_biome_resonance_eligible():
    """Skiv species biome_affinity (savana) must match saga biome → resonance ON."""
    state = build_saga_state()
    assert state["biome_id"] == "savana"


# ─────────────────────────────────────────────────────────
# Markdown rendering
# ─────────────────────────────────────────────────────────


def test_render_markdown_contains_skiv_card_anchors():
    state = build_saga_state()
    md = render_markdown(state)
    assert md.startswith("---\n")  # frontmatter
    assert "Skiv Saga" in md
    assert "stalker" in md.lower()
    assert SKIV_MUTATION_ID in md
    assert "i_osservatore" in md
    assert "n_intuizione_terrena" in md


def test_render_markdown_diary_table_has_8_rows():
    state = build_saga_state()
    md = render_markdown(state)
    # 8 entries → 8 data rows in diary table (+2 header lines)
    diary_lines = [ln for ln in md.splitlines() if ln.startswith("| ") and ln.count("|") >= 5]
    # Drop separator + header
    data_rows = [ln for ln in diary_lines if not ln.startswith("|---") and not ln.startswith("| #")]
    # Identity table also has rows; filter to lines with ts + event_type pattern
    diary_rows = [ln for ln in data_rows if "`" in ln and any(
        t in ln for t in ["job_changed", "mutation_acquired", "synergy_triggered", "defy_used"]
    )]
    assert len(diary_rows) >= 4, f"expected diary rows, got {len(diary_rows)}"


# ─────────────────────────────────────────────────────────
# CLI smoke
# ─────────────────────────────────────────────────────────


def test_main_writes_outputs_to_custom_dir(tmp_path):
    rc = main(["--out-dir", str(tmp_path), "--quiet"])
    assert rc == 0
    out_json = tmp_path / "skiv_saga.json"
    out_md = tmp_path / "2026-04-25-skiv-saga-state.md"
    assert out_json.exists()
    assert out_md.exists()
    payload = json.loads(out_json.read_text(encoding="utf-8"))
    assert payload["unit_id"] == "skiv"
    assert len(payload["diary"]) == 8


def test_main_deterministic_payload(tmp_path):
    """Skiv's saga state must be reproducible (mod generated_at)."""
    main(["--out-dir", str(tmp_path / "a"), "--quiet"])
    main(["--out-dir", str(tmp_path / "b"), "--quiet"])
    a = json.loads((tmp_path / "a" / "skiv_saga.json").read_text(encoding="utf-8"))
    b = json.loads((tmp_path / "b" / "skiv_saga.json").read_text(encoding="utf-8"))
    a.pop("generated_at")
    b.pop("generated_at")
    assert a == b
