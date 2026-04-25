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
    assert "guscio" in out["voice"] or "pelle" in out["voice"] or "zampe" in out["voice"]


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
    assert sm.voice_pick("nonexistent", "any") in sm.VOICE["default"]
