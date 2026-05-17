"""Smoke + edge-case tests for tools/py/skiv_monitor.py.

Covers:
- map_event mapping (pr feat/p2-p6, fix, revert, issue, workflow)
- apply_delta clamping (HP cap, form_confidence 0-1)
- pure dedup via seen_event_ids ring
- mock pipeline end-to-end via process_events

Run: PYTHONPATH=tools/py pytest tests/test_skiv_monitor.py
"""
from __future__ import annotations

import copy
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "tools" / "py"))

import skiv_monitor as sm  # noqa: E402


def _state():
    return copy.deepcopy(sm.DEFAULT_STATE)


def _cursor():
    return copy.deepcopy(sm.DEFAULT_CURSOR)


def test_map_event_pr_p2_evolve():
    ev = {"id": "pr-1", "kind": "pr_merged", "ts": "2026-04-25T10:00:00Z",
          "title": "feat(p2): wire form evolution", "labels": ["feat/p2-evolution"]}
    out = sm.map_event(ev)
    assert out["category"] == "feat_p2"
    assert out["state_delta"].get("evolve_opportunity") == 1
    assert out["state_delta"].get("currencies.pe") == 5
    # Voice may come from static palette OR tracery grammar (50/50 deterministic).
    assert isinstance(out["voice"], str) and len(out["voice"]) > 0
    assert "#" not in out["voice"]  # no unresolved tracery symbols


def test_map_event_pr_p3_xp():
    ev = {"id": "pr-2", "kind": "pr_merged", "ts": "x",
          "title": "feat(p3): perk pair lvl 7", "labels": ["feat/p3"]}
    out = sm.map_event(ev)
    assert out["category"] == "feat_p3"
    assert out["state_delta"].get("xp") == 20
    assert out["state_delta"].get("perk_pending") == 1


def test_map_event_fix_heal_tick():
    ev = {"id": "pr-3", "kind": "pr_merged", "ts": "x",
          "title": "fix: clamp HP", "labels": []}
    out = sm.map_event(ev)
    assert out["category"] == "fix"
    assert out["state_delta"].get("gauges.hp") == 1


def test_map_event_revert_stress():
    ev = {"id": "pr-4", "kind": "pr_merged", "ts": "x",
          "title": "revert: bring back old engine", "labels": []}
    out = sm.map_event(ev)
    assert out["category"] == "revert"
    assert out["state_delta"].get("stress") == 1


def test_map_event_issue_open_close_workflow():
    open_ev = {"id": "iss-1-open", "kind": "issue_opened", "ts": "x", "title": "?"}
    close_ev = {"id": "iss-1-closed", "kind": "issue_closed", "ts": "x", "title": "?"}
    wf_fail = {"id": "wf-1", "kind": "workflow_failed", "ts": "x"}
    wf_pass = {"id": "wf-2", "kind": "workflow_passed", "ts": "x"}
    assert sm.map_event(open_ev)["state_delta"].get("curiosity") == 1
    assert sm.map_event(close_ev)["state_delta"].get("resolution_count") == 1
    assert sm.map_event(wf_fail)["state_delta"].get("stress") == 1
    assert sm.map_event(wf_pass)["state_delta"].get("composure") == 1


def test_apply_delta_clamps_hp_and_form_confidence():
    state = _state()
    sm.apply_delta(state, {"gauges.hp": -100})
    assert state["gauges"]["hp"] == 0  # clamped to lo
    state["gauges"]["hp"] = 12
    sm.apply_delta(state, {"gauges.hp": 999})
    assert state["gauges"]["hp"] == state["gauges"]["hp_max"]  # clamped to hp_max
    sm.apply_delta(state, {"form_confidence": 5.0})
    assert state["form_confidence"] == 1.0


def test_apply_delta_levels_up_when_xp_overflows():
    state = _state()
    state["xp"] = 0
    state["xp_next"] = 100
    state["level"] = 1
    sm.apply_delta(state, {"xp": 250})
    # Should pass level 1 (100 xp) → level 2; then xp_next * 1.25 = 125 → still has 150 left,
    # may pass level 3 too depending on rounding.
    assert state["level"] >= 2
    assert state["perk_pending"] >= 1


def test_process_events_dedup_via_seen_ring():
    state = _state()
    cursor = _cursor()
    events = [{"id": "pr-x", "kind": "pr_merged", "ts": "x", "title": "fix: a", "labels": []}]
    out1 = sm.process_events(events, state, cursor)
    out2 = sm.process_events(events, state, cursor)  # same event, should dedup
    assert len(out1) == 1
    assert len(out2) == 0


def test_render_card_includes_banner_and_voice():
    state = _state()
    state["last_voice"] = "Voice di test"
    out = sm.render_card(state, [])
    assert "S K I V" in out
    assert "Voice di test" in out
    assert sm.CLOSING in out


def test_pillar_detection_from_title_or_label():
    assert sm.detect_pillar([], "feat(p4): mbti axes") == 4
    assert sm.detect_pillar(["feat/p6-fairness"], "balance fix") == 6
    assert sm.detect_pillar([], "fix: typo") is None


def test_voice_palette_deterministic_for_same_seed():
    a = sm.voice_pick("feat_p2", "seed-x")
    b = sm.voice_pick("feat_p2", "seed-x")
    assert a == b


def test_unknown_category_falls_back_to_default():
    # 50% chance tracery, 50% static. Both should produce some string.
    out = sm.voice_pick("nonexistent", "any")
    assert isinstance(out, str) and len(out) > 0


# ──────────────────────────────────────────────────────────────────────
# Conventional Commits parser tests
# ──────────────────────────────────────────────────────────────────────

def test_parse_conventional_feat_basic():
    p = sm.parse_conventional_commit("feat: add new endpoint")
    assert p["type"] == "feat"
    assert p["scope"] is None
    assert p["breaking"] is False
    assert p["desc"] == "add new endpoint"


def test_parse_conventional_with_scope():
    p = sm.parse_conventional_commit("fix(combat): clamp HP on damage")
    assert p["type"] == "fix"
    assert p["scope"] == "combat"
    assert p["breaking"] is False


def test_parse_conventional_breaking():
    p = sm.parse_conventional_commit("feat(api)!: remove deprecated endpoint")
    assert p["type"] == "feat"
    assert p["scope"] == "api"
    assert p["breaking"] is True


def test_parse_conventional_all_types():
    for t in ["feat", "fix", "chore", "docs", "style", "refactor",
              "perf", "test", "build", "ci", "revert"]:
        p = sm.parse_conventional_commit(f"{t}: sample")
        assert p["type"] == t


def test_parse_conventional_non_conventional():
    p = sm.parse_conventional_commit("Random commit message no prefix")
    assert p["type"] is None
    assert p["desc"] == "Random commit message no prefix"


def test_parse_conventional_case_insensitive():
    p = sm.parse_conventional_commit("FEAT: uppercase type")
    assert p["type"] == "feat"


def test_parse_conventional_empty_or_invalid_input():
    for bad in [None, "", 123, [], {}]:
        p = sm.parse_conventional_commit(bad)
        assert p["type"] is None
        assert p["breaking"] is False


def test_map_event_uses_cc_parser_for_fix():
    ev = {"id": "pr-cc-1", "kind": "pr_merged", "ts": "x",
          "title": "fix(combat): clamp HP", "labels": []}
    out = sm.map_event(ev)
    assert out["category"] == "fix"
    assert out["state_delta"].get("gauges.hp") == 1


def test_map_event_breaking_change_adds_stress():
    ev = {"id": "pr-cc-2", "kind": "pr_merged", "ts": "x",
          "title": "feat!: drop legacy API", "labels": []}
    out = sm.map_event(ev)
    # Breaking change → +1 stress (cosmetic shock).
    assert out["state_delta"].get("stress") == 1


def test_map_event_perf_to_services_with_composure():
    ev = {"id": "pr-cc-3", "kind": "pr_merged", "ts": "x",
          "title": "perf: optimize hot path", "labels": []}
    out = sm.map_event(ev)
    assert out["category"] == "services"
    assert out["state_delta"].get("composure") == 1


# ──────────────────────────────────────────────────────────────────────
# Tracery + QBN + lifecycle wire tests
# ──────────────────────────────────────────────────────────────────────

def test_tracery_expand_voice_produces_string():
    import skiv_tracery
    out = skiv_tracery.expand_voice("feat_p2", "test-seed-1")
    assert isinstance(out, str) and len(out) > 0
    # Should not contain unresolved #symbol# references.
    assert "#" not in out


def test_tracery_deterministic_same_seed():
    import skiv_tracery
    a = skiv_tracery.expand_voice("feat_p3", "deterministic-seed")
    b = skiv_tracery.expand_voice("feat_p3", "deterministic-seed")
    assert a == b


def test_tracery_phase_voice_injection():
    import skiv_tracery
    # With phase_id, augmented grammar should accept phase_voice symbol.
    g = skiv_tracery._augment_with_lifecycle(skiv_tracery.SKIV_GRAMMAR)
    # If lifecycle YAML loaded, phase_voice symbols exist.
    if "phase_voice" in g:
        assert isinstance(g["phase_voice"], list)
        assert len(g["phase_voice"]) > 0


def test_qbn_select_storylet_default_catchall():
    import skiv_qbn
    out = skiv_qbn.select_storylet({}, {})
    assert out is not None
    assert "id" in out


def test_qbn_high_stress_picks_stress_storm():
    import skiv_qbn
    out = skiv_qbn.select_storylet({}, {"stress": 80})
    # Storylet 'stress_storm' should be picked when stress >= 60.
    assert out["id"] == "stress_storm"
