#!/usr/bin/env python3
"""Unit tests for tools/py/auto_ratify.py (G2 P4 -- safety-gated auto-ratify).

P4 ships the gate MACHINERY + atomic comment-preserving prod writer + provenance,
all FAIL-CLOSED, behind --auto-ratify (OFF) + a second --confirm-prod. The live prod
write is unreachable until (i) pe_ratio/kd_ratio wired (gate-2/4b), (ii) gate-3 baseline
harness exists, (iii) harsh-review SDMG falsification passes. These tests pin the
fail-closed contract derived from the verify+red-team workflow (8 P1 fail-open vectors).
See docs/superpowers/specs/2026-06-17-per-template-calibration-design.md sec 5.
"""

from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from auto_ratify import (  # noqa: E402
    FORENSIC_N,
    aggregate_gate_flags,
    gate_composite,
    gate_forensic_n,
    gate_seed_reverify,
    gate_wr_in_band,
    wilson_interval,
)

WR_BAND = [0.15, 0.30]


# --- Gate 1: N=100 forensic ----------------------------------------------------

def test_forensic_n_pass_at_100():
    assert gate_forensic_n({"n": 100}) is True
    assert gate_forensic_n({"n": 120}) is True


def test_forensic_n_fail_below_100():
    assert gate_forensic_n({"n": 40}) is False


def test_forensic_n_fail_closed_on_missing_or_nonint():
    assert gate_forensic_n({}) is False
    assert gate_forensic_n({"n": None}) is False
    assert gate_forensic_n({"n": "100"}) is False  # str, not int -> fail-closed


# --- Gate 2: composite (FAIL-CLOSED on None / missing band) --------------------

def test_composite_pass_when_computable_and_in_band():
    # objective == win_rate so composite is computable; composite_band = WR band here.
    r = {"win_rate": 0.22}
    assert gate_composite(r, objective_metric="1.0*win_rate", composite_band=WR_BAND) is True


def test_composite_fail_closed_when_term_missing():
    # pe_ratio absent -> evaluate_metric raises KeyError -> composite None -> FAIL-CLOSED.
    r = {"win_rate": 0.22, "kd_avg": 0.8}
    assert gate_composite(
        r, objective_metric="0.5*win_rate + 0.25*kd_ratio + 0.25*pe_ratio",
        composite_band=WR_BAND,
    ) is False


def test_composite_fail_closed_when_no_band():
    # A scalar composite with no band cannot be verified -> fail-closed (never assume pass).
    r = {"win_rate": 0.22}
    assert gate_composite(r, objective_metric="1.0*win_rate", composite_band=None) is False


def test_composite_fail_when_out_of_band():
    r = {"win_rate": 0.50}
    assert gate_composite(r, objective_metric="1.0*win_rate", composite_band=WR_BAND) is False


def test_composite_reads_metrics_subdict():
    # result may carry metrics under a 'metrics' key (orchestrator result shape).
    r = {"metrics": {"win_rate": 0.20}}
    assert gate_composite(r, objective_metric="1.0*win_rate", composite_band=WR_BAND) is True


# --- Gate 4b helper: WR in the existing band (stale-band structural signal) -----

def test_wr_in_band_pass_and_fail():
    assert gate_wr_in_band({"win_rate": 0.22}, WR_BAND) is True
    assert gate_wr_in_band({"win_rate": 0.51}, WR_BAND) is False  # #2719 signature


def test_wr_in_band_fail_closed_on_missing():
    assert gate_wr_in_band({}, WR_BAND) is False
    assert gate_wr_in_band({"win_rate": None}, WR_BAND) is False


# --- Gate 3: seed-pinned bit-identical re-verify (FAIL-CLOSED) ------------------

BASE = {"win_rate": 0.23, "kd_avg": 0.81, "defeat_rate": 0.77, "n": 100,
        "shards": 4, "seed": 424242}


def test_seed_reverify_pass_on_identical_same_node():
    assert gate_seed_reverify(BASE, dict(BASE), node_version="22") is True


def test_seed_reverify_fail_on_metric_drift():
    drift = dict(BASE, win_rate=0.24)
    assert gate_seed_reverify(BASE, drift, node_version="22") is False


def test_seed_reverify_fail_closed_no_baseline():
    # No stored baseline -> cannot verify -> never auto-true.
    assert gate_seed_reverify(None, dict(BASE), node_version="22") is False


def test_seed_reverify_fail_on_wrong_node():
    # Determinism is within-runtime only (CANONICAL sec 3 rule 8: node 22 canonical).
    assert gate_seed_reverify(BASE, dict(BASE), node_version="24") is False


def test_seed_reverify_fail_on_plan_mismatch():
    # Different shard count -> different per-run seed offsets -> not the same plan.
    diff_plan = dict(BASE, shards=8)
    assert gate_seed_reverify(BASE, diff_plan, node_version="22") is False


# --- Aggregate (R1 short-circuit / non-bool fail-open guard) --------------------

def test_aggregate_all_true_passes():
    assert aggregate_gate_flags({"g1": True, "g2": True, "g3": True}) is True


def test_aggregate_any_false_fails():
    assert aggregate_gate_flags({"g1": True, "g2": False, "g3": True}) is False


def test_aggregate_non_bool_is_fail_closed():
    # A gate returning None / a truthy dict must NOT pass the chain (R1 finding).
    assert aggregate_gate_flags({"g1": True, "g2": None}) is False
    assert aggregate_gate_flags({"g1": True, "g2": {"err": "x"}}) is False
    assert aggregate_gate_flags({"g1": True, "g2": 1}) is False  # int 1, not bool True
    assert aggregate_gate_flags({}) is False  # empty -> nothing verified -> fail-closed


# --- Wilson CI (real interval, never fabricated) -------------------------------

def test_wilson_interval_basic():
    lo, hi = wilson_interval(23, 100)
    assert 0.0 <= lo < 0.23 < hi <= 1.0
    assert round(lo, 3) == 0.158 and round(hi, 3) == 0.322  # Wilson 95% 23/100 z=1.96


def test_wilson_interval_edges():
    assert wilson_interval(0, 100)[0] == 0.0 or wilson_interval(0, 100)[0] >= 0.0
    lo, hi = wilson_interval(0, 0)  # no data -> degenerate, must not crash
    assert lo == 0.0 and hi == 0.0


def test_forensic_n_constant():
    assert FORENSIC_N == 100


# --- Group 2: atomic comment-preserving writer + write-surface invariant --------

import pytest  # noqa: E402

from auto_ratify import (  # noqa: E402
    atomic_ratify_write,
    replace_ratified_knob,
    replace_scenario_override_knob,
    validate_field_allowed,
)

DC = """# damage curves header comment (must survive)
schema_version: 1
scenario_overrides:
  enc_tutorial_06_hardcore:
    # boss hp lever, ratified 2026-06-14 node-22
    boss_hp_multiplier: 1.02
    rationale: "node-22 recal"
  enc_tutorial_07_hardcore_pod_rush:
    enemy_damage_multiplier_override: 2.5
    rationale: "re-center 2.1->2.5"
"""

MAN = """# manifest header (must survive)
version: 1
scenarios:
  - id: enc_tutorial_06_hardcore
    target_band: [0.15, 0.30]
    ratified_knob: { boss_hp_multiplier: 1.02 }
    status: ratified
  - id: enc_tutorial_07_hardcore_pod_rush
    target_band: [0.30, 0.50]
    ratified_knob: { enemy_damage_multiplier_override: 2.5 }
    status: ratified
"""

KNOB_SPACE_06 = {"boss_hp_multiplier": {"type": "float", "min": 0.5, "max": 1.3}}


def _load(text):
    import yaml
    return yaml.safe_load(text)


def test_replace_scenario_override_knob_updates_only_target():
    out = replace_scenario_override_knob(DC, "enc_tutorial_06_hardcore", "boss_hp_multiplier", 1.10)
    d = _load(out)
    assert d["scenario_overrides"]["enc_tutorial_06_hardcore"]["boss_hp_multiplier"] == 1.10
    # hc07 untouched
    assert d["scenario_overrides"]["enc_tutorial_07_hardcore_pod_rush"]["enemy_damage_multiplier_override"] == 2.5
    # comments + rationale preserved
    assert "header comment (must survive)" in out
    assert "boss hp lever, ratified 2026-06-14" in out
    assert 'rationale: "node-22 recal"' in out


def test_replace_scenario_override_knob_hc07_field():
    out = replace_scenario_override_knob(
        DC, "enc_tutorial_07_hardcore_pod_rush", "enemy_damage_multiplier_override", 2.2
    )
    d = _load(out)
    assert d["scenario_overrides"]["enc_tutorial_07_hardcore_pod_rush"]["enemy_damage_multiplier_override"] == 2.2
    assert d["scenario_overrides"]["enc_tutorial_06_hardcore"]["boss_hp_multiplier"] == 1.02  # hc06 untouched


def test_replace_scenario_override_knob_absent_field_raises():
    # Fail-closed: never silently add a new knob field to prod.
    with pytest.raises(KeyError):
        replace_scenario_override_knob(DC, "enc_tutorial_06_hardcore", "nonexistent_knob", 1.0)


def test_replace_scenario_override_unknown_scenario_raises():
    with pytest.raises(KeyError):
        replace_scenario_override_knob(DC, "enc_tutorial_99_ghost", "boss_hp_multiplier", 1.0)


def test_replace_ratified_knob_updates_value_preserving_band():
    out = replace_ratified_knob(MAN, "enc_tutorial_06_hardcore", "boss_hp_multiplier", 1.10)
    d = _load(out)
    assert d["scenarios"][0]["ratified_knob"] == {"boss_hp_multiplier": 1.10}
    # WRITE-SURFACE INVARIANT: target_band byte-identical pre/post (band never auto-updated)
    assert "target_band: [0.15, 0.30]" in out
    assert d["scenarios"][0]["target_band"] == [0.15, 0.30]
    # hc07 untouched
    assert d["scenarios"][1]["ratified_knob"] == {"enemy_damage_multiplier_override": 2.5}
    assert "header (must survive)" in out


def test_replace_ratified_knob_absent_field_raises():
    with pytest.raises(KeyError):
        replace_ratified_knob(MAN, "enc_tutorial_06_hardcore", "ghost_knob", 1.0)


def test_validate_field_allowed():
    # Allowlist derived from manifest knob_space, NOT the schema doc comment.
    assert validate_field_allowed("boss_hp_multiplier", KNOB_SPACE_06) is True
    with pytest.raises(ValueError):
        validate_field_allowed("target_band", KNOB_SPACE_06)  # never a writable knob
    with pytest.raises(ValueError):
        validate_field_allowed("unlisted", KNOB_SPACE_06)


def test_atomic_ratify_write_two_files_reconcile(tmp_path):
    prod = tmp_path / "damage_curves.yaml"
    man = tmp_path / "canonical-suite.yaml"
    prod.write_text(DC, encoding="utf-8")
    man.write_text(MAN, encoding="utf-8")
    res = atomic_ratify_write(
        "enc_tutorial_06_hardcore", "boss_hp_multiplier", 1.10,
        prod_path=str(prod), manifest_path=str(man), knob_space=KNOB_SPACE_06,
    )
    assert res["reconciled"] is True
    assert res["value"] == 1.10
    # both files updated + in sync + comments preserved
    pd, md = _load(prod.read_text(encoding="utf-8")), _load(man.read_text(encoding="utf-8"))
    assert pd["scenario_overrides"]["enc_tutorial_06_hardcore"]["boss_hp_multiplier"] == 1.10
    assert md["scenarios"][0]["ratified_knob"]["boss_hp_multiplier"] == 1.10
    assert md["scenarios"][0]["target_band"] == [0.15, 0.30]  # band untouched
    assert "header comment (must survive)" in prod.read_text(encoding="utf-8")


def test_atomic_ratify_write_disallowed_field_leaves_files_untouched(tmp_path):
    prod = tmp_path / "damage_curves.yaml"
    man = tmp_path / "canonical-suite.yaml"
    prod.write_text(DC, encoding="utf-8")
    man.write_text(MAN, encoding="utf-8")
    with pytest.raises(ValueError):
        atomic_ratify_write(
            "enc_tutorial_06_hardcore", "target_band", [0.1, 0.9],
            prod_path=str(prod), manifest_path=str(man), knob_space=KNOB_SPACE_06,
        )
    # FAIL-CLOSED: both originals untouched
    assert prod.read_text(encoding="utf-8") == DC
    assert man.read_text(encoding="utf-8") == MAN


# --- Group 3: provenance + evaluate_gates + auto_ratify orchestration -----------

from auto_ratify import (  # noqa: E402
    auto_ratify,
    build_provenance,
    evaluate_gates,
)

OBJ_WR = "1.0*win_rate"  # computable composite == WR for these tests


def _happy_result():
    # WR 0.22 in band, N=100; composite == WR computable.
    return {"win_rate": 0.22, "kd_avg": 0.81, "defeat_rate": 0.77, "n": 100,
            "shards": 4, "seed": 424242}


def test_evaluate_gates_all_pass_on_happy_path():
    r = _happy_result()
    g = evaluate_gates(
        r, band=WR_BAND, composite_band=WR_BAND, objective_metric=OBJ_WR,
        baseline=r, reverify=dict(r), node_version="22",
    )
    assert g["all_pass"] is True
    assert g["gates"] == {"forensic_n": True, "composite": True,
                          "seed_reverify": True, "band_reachable": True}


def test_evaluate_gates_blocked_when_composite_none():
    # The REAL today path: composite needs pe_ratio/kd_ratio -> None -> gate-2 fail-closed.
    r = _happy_result()
    g = evaluate_gates(
        r, band=WR_BAND, composite_band=WR_BAND,
        objective_metric="0.5*win_rate + 0.25*kd_ratio + 0.25*pe_ratio",
        baseline=r, reverify=dict(r), node_version="22",
    )
    assert g["gates"]["composite"] is False
    assert g["all_pass"] is False


def test_evaluate_gates_blocked_on_wrong_node():
    r = _happy_result()
    g = evaluate_gates(r, band=WR_BAND, composite_band=WR_BAND, objective_metric=OBJ_WR,
                       baseline=r, reverify=dict(r), node_version="24")
    assert g["gates"]["seed_reverify"] is False
    assert g["all_pass"] is False


def test_build_provenance_real_wilson_ci():
    prov = build_provenance(
        scenario_id="enc_tutorial_06_hardcore", field="boss_hp_multiplier", value=1.10,
        band=WR_BAND, seed=424242, n=100, wins=23, objective_metric=OBJ_WR,
        composite_band=WR_BAND, result=_happy_result(),
        gates={"forensic_n": True}, git_commit_val="abc123", coding_agent="claude-opus-4-8",
        trace_id="019e-7-xyz",
    )
    assert prov["ci"]["method"] == "wilson95"
    assert round(prov["ci"]["lo"], 3) == 0.158 and round(prov["ci"]["hi"], 3) == 0.322
    assert prov["ci_reason"] is None
    # composite = named formula + numeric value (NOT best_value_distance)
    assert prov["composite"]["formula"] == OBJ_WR
    assert prov["composite"]["value"] == 0.22
    assert prov["ratified_knob"] == {"boss_hp_multiplier": 1.10}
    assert prov["coding_agent"] == "claude-opus-4-8" and prov["trace_id"] == "019e-7-xyz"


def test_build_provenance_ci_null_when_no_counts():
    prov = build_provenance(
        scenario_id="x", field="boss_hp_multiplier", value=1.0, band=WR_BAND,
        seed=1, n=None, wins=None, objective_metric=OBJ_WR, composite_band=WR_BAND,
        result=_happy_result(), gates={}, git_commit_val=None, coding_agent=None, trace_id="t",
    )
    assert prov["ci"] is None
    assert "not computed" in prov["ci_reason"]  # honest gap, never fabricated


def test_build_provenance_composite_none_surfaced_not_faked():
    prov = build_provenance(
        scenario_id="x", field="boss_hp_multiplier", value=1.0, band=WR_BAND, seed=1, n=100,
        wins=23, objective_metric="0.5*win_rate + 0.5*pe_ratio", composite_band=WR_BAND,
        result=_happy_result(), gates={}, git_commit_val=None, coding_agent=None, trace_id="t",
    )
    assert prov["composite"]["value"] is None  # surfaced, not defaulted to a fake number


def test_auto_ratify_blocked_keeps_files_untouched(tmp_path):
    # Today path: composite None -> blocked -> NO write even with confirm_prod.
    prod = tmp_path / "dc.yaml"; man = tmp_path / "man.yaml"
    prod.write_text(DC, encoding="utf-8"); man.write_text(MAN, encoding="utf-8")
    out = auto_ratify(
        "enc_tutorial_06_hardcore", result=_happy_result(), band=WR_BAND, composite_band=WR_BAND,
        objective_metric="0.5*win_rate + 0.25*kd_ratio + 0.25*pe_ratio",
        knob_space=KNOB_SPACE_06, field="boss_hp_multiplier", value=1.10,
        baseline=_happy_result(), reverify=_happy_result(), node_version="22",
        seed=424242, wins=23, n=100, prod_path=str(prod), manifest_path=str(man),
        confirm_prod=True,  # even with confirm, blocked gates must prevent the write
    )
    assert out["action"] == "blocked"
    assert out["written"] is False
    assert prod.read_text(encoding="utf-8") == DC  # untouched
    assert man.read_text(encoding="utf-8") == MAN


def test_auto_ratify_proposal_when_gates_pass_but_no_confirm(tmp_path):
    prod = tmp_path / "dc.yaml"; man = tmp_path / "man.yaml"
    prod.write_text(DC, encoding="utf-8"); man.write_text(MAN, encoding="utf-8")
    out = auto_ratify(
        "enc_tutorial_06_hardcore", result=_happy_result(), band=WR_BAND, composite_band=WR_BAND,
        objective_metric=OBJ_WR, knob_space=KNOB_SPACE_06, field="boss_hp_multiplier", value=1.10,
        baseline=_happy_result(), reverify=_happy_result(), node_version="22",
        seed=424242, wins=23, n=100, prod_path=str(prod), manifest_path=str(man),
        confirm_prod=False,  # gates pass but no 2nd confirm -> proposal only
    )
    assert out["action"] == "proposal"
    assert out["written"] is False
    assert prod.read_text(encoding="utf-8") == DC  # still untouched (proposal != write)


def test_auto_ratify_writes_only_with_gates_and_confirm(tmp_path):
    prod = tmp_path / "dc.yaml"; man = tmp_path / "man.yaml"
    prod.write_text(DC, encoding="utf-8"); man.write_text(MAN, encoding="utf-8")
    out = auto_ratify(
        "enc_tutorial_06_hardcore", result=_happy_result(), band=WR_BAND, composite_band=WR_BAND,
        objective_metric=OBJ_WR, knob_space=KNOB_SPACE_06, field="boss_hp_multiplier", value=1.10,
        baseline=_happy_result(), reverify=_happy_result(), node_version="22",
        seed=424242, wins=23, n=100, prod_path=str(prod), manifest_path=str(man),
        confirm_prod=True,
    )
    assert out["action"] == "written"
    assert out["written"] is True
    assert out["provenance"]["gates_passed"]["atomic_write"] is True
    import yaml
    pd = yaml.safe_load(prod.read_text(encoding="utf-8"))
    assert pd["scenario_overrides"]["enc_tutorial_06_hardcore"]["boss_hp_multiplier"] == 1.10


# --- Group 4: CLI helpers ------------------------------------------------------

from auto_ratify import _node_major, gen_trace_id  # noqa: E402


def test_node_major_parses_version():
    assert _node_major("v22.15.0") == "22"
    assert _node_major("v24.3.1") == "24"
    assert _node_major("22.1.0") == "22"


def test_node_major_fail_closed_on_garbage():
    assert _node_major(None) is None
    assert _node_major("") is None
    assert _node_major("not-a-version") is None


def test_gen_trace_id_is_uuidv7_shaped():
    t = gen_trace_id()
    assert len(t) == 36 and t.count("-") == 4
    assert t[14] == "7"  # version nibble = 7
    assert t[19] in "89ab"  # variant


# --- Group 5: harsh-review SDMG fixes (P1 gate-3 vacuous, P2 suffix, P3 git) ----

from auto_ratify import _dirty_suffix  # noqa: E402


def test_seed_reverify_fail_closed_on_absent_plan_keys():
    # P1: a metrics-only pair (no shards/n/seed) must NOT pass vacuously (None==None).
    metrics_only = {"win_rate": 0.23, "kd_avg": 0.81, "defeat_rate": 0.77}
    assert gate_seed_reverify(metrics_only, dict(metrics_only), node_version="22") is False


def test_seed_reverify_fail_closed_on_absent_metric_key_in_reverify():
    # Symmetric presence guard: a key present in baseline but absent in reverify -> fail.
    rev = {k: v for k, v in BASE.items() if k != "kd_avg"}
    assert gate_seed_reverify(BASE, rev, node_version="22") is False


def test_replace_ratified_knob_suffix_sibling_not_mistargeted():
    # P2: field that is a SUFFIX of a sibling key must not mis-target the longer key.
    man = (
        "version: 1\n"
        "scenarios:\n"
        "  - id: enc_x\n"
        "    target_band: [0.30, 0.50]\n"
        "    ratified_knob: { secondary_enemy_damage_multiplier_override: 1.0, "
        "enemy_damage_multiplier_override: 2.5 }\n"
        "    status: ratified\n"
    )
    out = replace_ratified_knob(man, "enc_x", "enemy_damage_multiplier_override", 2.2)
    rk = _load(out)["scenarios"][0]["ratified_knob"]
    assert rk["enemy_damage_multiplier_override"] == 2.2  # intended key written
    assert rk["secondary_enemy_damage_multiplier_override"] == 1.0  # sibling untouched


def test_dirty_suffix_conservative_on_git_ambiguity():
    # P3: clean only when status succeeded AND empty; rc!=0 -> never false-clean.
    assert _dirty_suffix("", 0) == ""
    assert _dirty_suffix(" M file.py", 0) == "-dirty"
    assert _dirty_suffix("", 1) == "-unknown"  # git error -> conservative, not false-clean
