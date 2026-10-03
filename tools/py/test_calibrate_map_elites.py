#!/usr/bin/env python3
"""Unit tests for calibrate_map_elites v2 (no backend).

v2 redesign after the 2026-07-02 interrupted overnight (negative result doc:
docs/research/2026-07-02-map-elites-hc06-overnight-negative-result.md):
  - F1 fix: axes WR x turns_avg (defeat_rate was collinear, wr+defeat=1.00 in
    25/25 v1 trials; turns buckets calibrated on the v1 corpus 21.8-24.9 under
    client-pinned cap 25 + knob range extension to cap 35).
  - F3 fix: per-iter checkpoint JSONL + --resume-from replay (kill-safe).
  - SPRT optional trial truncation (Wilson CI95 vs unpopulated WR columns).
  - build_shard_cmd grows skip_health param (v2 runs WITHOUT --skip-health so
    the batch client's periodic re-check aborts early on backend death).
"""
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

import calibrate_map_elites as me  # noqa: E402
import calibrate_parallel as cp  # noqa: E402


# ── axes ──────────────────────────────────────────────────────────────────

def test_feature_cell_wr_x_turns():
    # wr 0.25 -> bucket 2 (0.20-0.30); turns 23.0 -> bucket 1 (22-24)
    assert me.feature_cell(0.25, 23.0) == (2, 1)
    # low wr, turns at cap-25 regime
    assert me.feature_cell(0.05, 24.9) == (0, 2)
    # turns beyond old cap (knob live 25-35 after curves_path fix)
    assert me.feature_cell(0.15, 31.0) == (1, 4)


def test_feature_cell_edges():
    # top edge inclusive on both axes
    assert me.feature_cell(1.0, 36.0) == (4, 4)
    # below/above range -> None coordinate
    assert me.feature_cell(0.5, 99.0)[1] is None


def test_cell_fitness_normalized_by_bucket_width():
    # exact cell center -> fitness 0
    wr_idx, t_idx = me.feature_cell(0.25, 23.0)
    assert me.cell_fitness(0.25, 23.0, wr_idx, t_idx) == 0.0
    # one full wr-bucket-width off-center horizontally == one full
    # turns-bucket-width off-center vertically (normalized units)
    f_wr = me.cell_fitness(0.30, 23.0, wr_idx, t_idx)   # +0.05 = half wr bucket
    f_t = me.cell_fitness(0.25, 24.0, wr_idx, t_idx)    # +1.0 = half turns bucket
    assert abs(f_wr - f_t) < 1e-9
    assert me.cell_fitness(0.25, 23.0, None, None) == float("inf")


# ── placement (single SoT used by main loop AND checkpoint replay) ────────

def _entry(i, wr, turns, origin="random", knobs=None):
    return {"iter": i, "knobs": knobs or {"boss_hp_multiplier": 0.7},
            "wr": wr, "turns": turns, "origin": origin, "n_eff": 40}


def test_place_in_map_populate_and_replace():
    fmap = {}
    r1 = me.place_in_map(fmap, _entry(0, 0.22, 23.9))  # off-center
    assert r1 == "populated"
    cell = me.feature_cell(0.22, 23.9)
    assert fmap[cell]["iter_first"] == 0
    # better (more central) sample replaces
    r2 = me.place_in_map(fmap, _entry(1, 0.25, 23.0))
    assert r2 == "replaced"
    assert fmap[cell]["features"] == [0.25, 23.0]
    assert fmap[cell]["iter_first"] == 0 and fmap[cell]["iter_last"] == 1
    # worse sample does not replace
    r3 = me.place_in_map(fmap, _entry(2, 0.21, 23.8))
    assert r3 is None
    assert fmap[cell]["iter_last"] == 1


def test_place_in_map_out_of_range_skipped():
    fmap = {}
    assert me.place_in_map(fmap, _entry(0, 0.5, 99.0)) == "skipped"
    assert fmap == {}


def test_place_in_map_truncated_populates_but_never_replaces():
    # SPRT-truncated evals carry low N (noise): allowed to open an empty cell,
    # NEVER to evict an occupant (edm-run iter 49: N=11 replaced a full-N cell).
    fmap = {}
    e0 = _entry(0, 0.22, 23.9)  # off-center occupant
    e0["sprt_truncated"] = True
    assert me.place_in_map(fmap, e0) == "populated"  # empty cell: ok
    e1 = _entry(1, 0.25, 23.0)  # better fitness BUT truncated
    e1["sprt_truncated"] = True
    assert me.place_in_map(fmap, e1) is None  # occupied: no eviction
    assert fmap[me.feature_cell(0.22, 23.9)]["iter_last"] == 0
    # full-N eval still replaces normally
    assert me.place_in_map(fmap, _entry(2, 0.25, 23.0)) == "replaced"


# ── checkpoint + resume (F3 fix) ─────────────────────────────────────────

def test_checkpoint_roundtrip(tmp_path):
    ck = tmp_path / "checkpoint.jsonl"
    fmap = {}
    entries = [_entry(0, 0.22, 23.9), _entry(1, 0.25, 23.0), _entry(2, 0.55, 22.0)]
    for e in entries:
        me.place_in_map(fmap, e)
        me.append_checkpoint(ck, e)
    fmap2, next_iter = me.load_checkpoint(ck)
    assert next_iter == 3
    assert fmap2 == fmap  # replay reproduces identical archive


def test_checkpoint_resume_preserves_replacement_semantics(tmp_path):
    ck = tmp_path / "checkpoint.jsonl"
    # worse-then-better in same cell: replay must keep the better one
    for e in [_entry(0, 0.21, 23.8), _entry(1, 0.25, 23.0)]:
        me.append_checkpoint(ck, e)
    fmap, next_iter = me.load_checkpoint(ck)
    cell = me.feature_cell(0.25, 23.0)
    assert fmap[cell]["features"] == [0.25, 23.0]
    assert next_iter == 2


def test_load_checkpoint_missing_file(tmp_path):
    fmap, next_iter = me.load_checkpoint(tmp_path / "nope.jsonl")
    assert fmap == {} and next_iter == 0


def test_checkpoint_tolerates_truncated_last_line(tmp_path):
    # kill mid-write: last line is garbage -> skip it, keep the rest
    ck = tmp_path / "checkpoint.jsonl"
    me.append_checkpoint(ck, _entry(0, 0.25, 23.0))
    with open(ck, "a", encoding="utf-8") as f:
        f.write('{"iter": 1, "knobs": {"boss_hp_mul')  # truncated
    fmap, next_iter = me.load_checkpoint(ck)
    assert next_iter == 1
    assert len(fmap) == 1


# ── SPRT truncation (optional --sprt) ─────────────────────────────────────

def test_sprt_truncate_when_no_unpopulated_wr_column_reachable():
    # populate EVERY cell in wr columns 3+4 (wr >= 0.30) so a high-WR trial
    # can only land on already-populated cells.
    fmap = {}
    for wr_idx in (3, 4):
        for t_idx in range(len(me.TURNS_BUCKETS)):
            fmap[(wr_idx, t_idx)] = {"dummy": True}
    # 35 wins / 40 -> CI95 well above 0.30: only columns 3-4 reachable
    assert me.sprt_should_truncate(fmap, wins=35, n=40) is True
    # empty map: everything reachable -> never truncate
    assert me.sprt_should_truncate({}, wins=35, n=40) is False


def test_sprt_no_truncate_when_ci_spans_empty_column():
    fmap = {(4, t): {"dummy": True} for t in range(len(me.TURNS_BUCKETS))}
    # 15/40 = wr 0.375, CI95 spans into column 2-3 (unpopulated) -> continue
    assert me.sprt_should_truncate(fmap, wins=15, n=40) is False


def test_sprt_respects_min_n():
    fmap = {(w, t): {"d": 1} for w in range(5) for t in range(5)}
    assert me.sprt_should_truncate(fmap, wins=3, n=5, min_n=10) is False


# ── build_shard_cmd skip_health passthrough (calibrate_parallel) ──────────

def test_build_shard_cmd_skip_health_default_kept():
    cmd = cp.build_shard_cmd("s.py", "http://127.0.0.1:3390", 10, "o.json", "o.jsonl")
    assert "--skip-health" in cmd  # back-compat default


def test_build_shard_cmd_skip_health_off():
    cmd = cp.build_shard_cmd("s.py", "http://127.0.0.1:3390", 10, "o.json", "o.jsonl",
                             skip_health=False)
    assert "--skip-health" not in cmd
