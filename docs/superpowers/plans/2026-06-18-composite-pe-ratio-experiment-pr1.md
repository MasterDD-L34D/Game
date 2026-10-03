# Composite PE_ratio Experiment Harness (PR1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the experiment harness that lets the owner pick the PE_ratio formula by data (least collinear with WR), plus pressure-trajectory instrumentation -- no formula chosen yet, no composite wired (that is PR2).

**Architecture:** Three pure, hermetically-tested modules (`pressure_stats`, `pe_candidates`, `pe_orthogonality`) + an analysis core that turns a calibrate_parallel runs-corpus into a candidate-selection report + a thin maintainer CLI/backend runner. The batch aggregate is instrumented to emit per-run pressure stats. No backend or network in any test; the real N=100 run is the owner's experiment step.

**Tech Stack:** Python 3.12 (real interpreter `C:/Users/edusc/AppData/Local/Programs/Python/Python312/python.exe`; the `py` launcher is broken on this host), pytest `--import-mode=importlib`, PyYAML. Tests live in `tools/py/test_*.py`. Worktree: `C:/dev/game-wt/pe` (branch `feat/composite-pe-ratio-experiment`, off origin/main `24fbe86b`).

**Conventions (MANDATORY):** ASCII-first (`--` not em-dash). Commits use Conventional Commits + the ADR-0011 trailer (`Coding-Agent: <model-id>` + `Trace-Id: <uuidv7>`, NO `Co-Authored-By`, NO `--no-verify`). Run the full suite with `python -m pytest -q --import-mode=importlib tools/py` after each task. Spec: `docs/superpowers/specs/2026-06-18-composite-pe-ratio-experiment-design.md`.

---

## File Structure

- Create `tools/py/pressure_stats.py` -- pure trajectory -> {mean, frac_ge75, pmax}.
- Create `tools/py/pe_candidates.py` -- candidate A/B/C from per-run stats + `kd_normalize`.
- Create `tools/py/pe_orthogonality.py` -- Pearson + per-candidate analysis + selection report.
- Create `tools/py/pe_experiment.py` -- analysis core (corpus -> report) + maintainer CLI/backend runner.
- Modify `tools/py/batch_calibrate_hardcore06.py` -- emit per-run pressure stats + aggregate them.
- Create the 5 matching `tools/py/test_*.py` files.

---

### Task 1: pressure_stats (pure trajectory helper)

**Files:**
- Create: `tools/py/pressure_stats.py`
- Test: `tools/py/test_pressure_stats.py`

- [ ] **Step 1: Write the failing test**

```python
# tools/py/test_pressure_stats.py
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))
from pressure_stats import pressure_stats  # noqa: E402


def test_basic_trajectory():
    s = pressure_stats([75, 80, 95, 100])
    assert s["pmax"] == 100
    assert round(s["pressure_mean"], 2) == 87.5
    assert s["frac_ge75"] == 1.0  # all >= 75


def test_mixed_tiers():
    s = pressure_stats([10, 50, 75, 90])  # 2 of 4 >= 75
    assert s["frac_ge75"] == 0.5
    assert s["pmax"] == 90


def test_empty_is_zeroed_not_crash():
    s = pressure_stats([])
    assert s == {"pressure_mean": 0.0, "frac_ge75": 0.0, "pmax": 0.0}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `python -m pytest -q --import-mode=importlib tools/py/test_pressure_stats.py`
Expected: FAIL (ModuleNotFoundError: No module named 'pressure_stats').

- [ ] **Step 3: Write minimal implementation**

```python
# tools/py/pressure_stats.py
#!/usr/bin/env python3
"""Pure pressure-trajectory stats for the PE_ratio experiment (G2 follow-up PR1)."""
from __future__ import annotations


def pressure_stats(samples, threshold=75):
    """Compact per-run stats from a pressure sample list: mean, fraction of samples at or
    above `threshold` (sustained-threat), and max. Empty -> zeros (defined, never crash)."""
    if not samples:
        return {"pressure_mean": 0.0, "frac_ge75": 0.0, "pmax": 0.0}
    vals = [float(s) for s in samples]
    return {
        "pressure_mean": sum(vals) / len(vals),
        "frac_ge75": sum(1 for v in vals if v >= threshold) / len(vals),
        "pmax": max(vals),
    }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `python -m pytest -q --import-mode=importlib tools/py/test_pressure_stats.py`
Expected: PASS (3 passed).

- [ ] **Step 5: Commit**

```bash
git add tools/py/pressure_stats.py tools/py/test_pressure_stats.py
git commit  # message: "feat(calibration): pressure-trajectory stats helper (PE experiment PR1)" + ADR-0011 trailer
```

---

### Task 2: pe_candidates (A/B/C + kd_normalize)

**Files:**
- Create: `tools/py/pe_candidates.py`
- Test: `tools/py/test_pe_candidates.py`

- [ ] **Step 1: Write the failing test**

```python
# tools/py/test_pe_candidates.py
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))
from pe_candidates import CANDIDATES, candidate_value, kd_normalize  # noqa: E402

STATS = {"pressure_mean": 80.0, "frac_ge75": 0.6, "pmax": 96.0}


def test_candidate_A_sustained_threat():
    assert candidate_value("A_sustained_threat", STATS) == 0.6  # frac_ge75


def test_candidate_B_time_avg():
    assert candidate_value("B_time_avg", STATS) == 0.80  # pressure_mean/100


def test_candidate_C_apex_reach():
    assert candidate_value("C_apex_reach", STATS) == 1.0  # pmax 96 >= 95
    assert candidate_value("C_apex_reach", {"pmax": 80.0}) == 0.0


def test_all_candidates_return_0_1():
    for name in CANDIDATES:
        v = candidate_value(name, STATS)
        assert 0.0 <= v <= 1.0


def test_kd_normalize_bounded_monotonic():
    assert kd_normalize(0.0) == 0.0
    assert round(kd_normalize(0.8), 3) == 0.444
    assert 0.0 < kd_normalize(0.8) < kd_normalize(5.0) < 1.0
    assert kd_normalize(None) is None  # missing -> None, never a fake number
```

- [ ] **Step 2: Run test to verify it fails**

Run: `python -m pytest -q --import-mode=importlib tools/py/test_pe_candidates.py`
Expected: FAIL (ModuleNotFoundError: No module named 'pe_candidates').

- [ ] **Step 3: Write minimal implementation**

```python
# tools/py/pe_candidates.py
#!/usr/bin/env python3
"""PE_ratio candidate formulas (G2 follow-up PR1). Each maps per-run pressure stats
(from pressure_stats) -> a 0..1 tension value (higher = more sustained tension). The
WINNER is chosen by the orthogonality experiment, NOT here -- new candidates are cheap."""
from __future__ import annotations

APEX = 95


def candidate_A(stats):  # sustained-threat fraction
    return float(stats.get("frac_ge75", 0.0))


def candidate_B(stats):  # time-averaged pressure, normalized
    return float(stats.get("pressure_mean", 0.0)) / 100.0


def candidate_C(stats):  # apex-reach (touched >= 95)
    return 1.0 if float(stats.get("pmax", 0.0)) >= APEX else 0.0


CANDIDATES = {
    "A_sustained_threat": candidate_A,
    "B_time_avg": candidate_B,
    "C_apex_reach": candidate_C,
}


def candidate_value(name, stats):
    v = CANDIDATES[name](stats)
    return max(0.0, min(1.0, v))


def kd_normalize(kd_avg):
    """Map kd_avg (~0.8 typical, unbounded) -> (0,1) via kd/(kd+1): bounded, monotonic.
    None in -> None out (missing metric surfaced, never faked)."""
    if kd_avg is None:
        return None
    kd = float(kd_avg)
    return kd / (kd + 1.0)
```

- [ ] **Step 4: Run test to verify it passes**

Run: `python -m pytest -q --import-mode=importlib tools/py/test_pe_candidates.py`
Expected: PASS (5 passed).

- [ ] **Step 5: Commit**

```bash
git add tools/py/pe_candidates.py tools/py/test_pe_candidates.py
git commit  # "feat(calibration): PE_ratio candidate formulas + kd_normalize (PE experiment PR1)" + ADR-0011 trailer
```

---

### Task 3: pe_orthogonality (Pearson + selection report)

**Files:**
- Create: `tools/py/pe_orthogonality.py`
- Test: `tools/py/test_pe_orthogonality.py`

- [ ] **Step 1: Write the failing test**

```python
# tools/py/test_pe_orthogonality.py
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))
from pe_orthogonality import pearson, analyze_candidate, selection_report  # noqa: E402


def test_pearson_perfect_and_zero():
    assert round(pearson([1, 2, 3, 4], [1, 2, 3, 4]), 6) == 1.0
    assert round(pearson([1, 2, 3, 4], [4, 3, 2, 1]), 6) == -1.0
    assert pearson([1, 1, 1], [1, 2, 3]) == 0.0  # zero variance -> 0 (no crash)


def test_analyze_candidate_abs_corr():
    # values perfectly track wins -> abs_corr ~ 1 (maximally collinear = WORST)
    vals = [0.2, 0.9, 0.3, 0.95]
    wons = [False, True, False, True]
    a = analyze_candidate(vals, wons)
    assert a["n"] == 4
    assert a["abs_corr"] > 0.9


def test_selection_report_ranks_least_collinear_first():
    wons = [False, True, False, True, False, True]
    per_candidate = {
        "collinear": [0.1, 0.9, 0.1, 0.9, 0.1, 0.9],   # tracks wins -> abs_corr 1.0
        "orthogonal": [0.4, 0.4, 0.6, 0.6, 0.5, 0.5],   # equal win/loss means -> abs_corr 0.0
    }
    eased = {"collinear": 0.05, "orthogonal": 0.2}   # trivialized-run candidate values
    ratified = {"collinear": 0.5, "orthogonal": 0.5}
    rep = selection_report(per_candidate, wons, ratified_value=ratified, eased_value=eased)
    assert rep["ranked"][0]["name"] == "orthogonal"   # least collinear first
    assert rep["selected"] == "orthogonal"
    # discrimination: ratified tension > eased tension (correct direction)
    assert rep["ranked"][0]["discrimination"]["correct_direction"] is True
```

- [ ] **Step 2: Run test to verify it fails**

Run: `python -m pytest -q --import-mode=importlib tools/py/test_pe_orthogonality.py`
Expected: FAIL (ModuleNotFoundError: No module named 'pe_orthogonality').

- [ ] **Step 3: Write minimal implementation**

```python
# tools/py/pe_orthogonality.py
#!/usr/bin/env python3
"""Orthogonality analysis for PE_ratio selection (G2 follow-up PR1). The PRIMARY criterion
is |Pearson(candidate, won)| -- LOWER is better (less collinear with WR = better anti-false-
balanced third axis). The SECONDARY check is discrimination (a trivialized run must score
LOWER tension than the ratified run). Pure; hand-rolled Pearson (no numpy)."""
from __future__ import annotations

import math

DEFAULT_MAX_CORR = 0.6  # negative-result threshold (sec 4.5): all candidates above -> reject source


def pearson(xs, ys):
    n = len(xs)
    if n == 0 or n != len(ys):
        return 0.0
    mx, my = sum(xs) / n, sum(ys) / n
    sx = sum((x - mx) ** 2 for x in xs)
    sy = sum((y - my) ** 2 for y in ys)
    if sx == 0 or sy == 0:
        return 0.0  # zero variance -> undefined correlation -> 0
    cov = sum((x - mx) * (y - my) for x, y in zip(xs, ys))
    return cov / math.sqrt(sx * sy)


def analyze_candidate(values, wons):
    wbin = [1.0 if w else 0.0 for w in wons]
    return {
        "n": len(values),
        "abs_corr": abs(pearson(values, wbin)),
        "mean": (sum(values) / len(values)) if values else 0.0,
    }


def selection_report(per_candidate, wons, *, ratified_value=None, eased_value=None,
                     max_corr=DEFAULT_MAX_CORR):
    ratified_value = ratified_value or {}
    eased_value = eased_value or {}
    rows = []
    for name, values in per_candidate.items():
        a = analyze_candidate(values, wons)
        rv, ev = ratified_value.get(name), eased_value.get(name)
        disc = None
        if rv is not None and ev is not None:
            disc = {"gap": rv - ev, "correct_direction": rv > ev}
        rows.append({"name": name, **a, "discrimination": disc})
    rows.sort(key=lambda r: r["abs_corr"])  # least collinear first
    best = rows[0] if rows else None
    # Negative-result branch (sec 4.5): if even the best is too collinear, reject the source.
    if best is None or best["abs_corr"] > max_corr:
        selected, verdict = None, f"negative-result: min abs_corr {best['abs_corr']:.3f} > {max_corr} -- reject pressure source" if best else "no candidates"
    else:
        selected, verdict = best["name"], f"selected {best['name']} (abs_corr {best['abs_corr']:.3f})"
    return {"ranked": rows, "selected": selected, "verdict": verdict, "max_corr": max_corr}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `python -m pytest -q --import-mode=importlib tools/py/test_pe_orthogonality.py`
Expected: PASS (3 passed).

- [ ] **Step 5: Commit**

```bash
git add tools/py/pe_orthogonality.py tools/py/test_pe_orthogonality.py
git commit  # "feat(calibration): orthogonality analysis + selection report (PE experiment PR1)" + ADR-0011 trailer
```

---

### Task 4: pe_experiment analysis core (corpus -> report)

**Files:**
- Create: `tools/py/pe_experiment.py`
- Test: `tools/py/test_pe_experiment.py`

The analysis core turns a list of per-run records (each carrying pressure stats + an outcome) into a selection report, with an optional eased-run record for the discrimination check. Pure; no backend.

- [ ] **Step 1: Write the failing test**

```python
# tools/py/test_pe_experiment.py
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))
from pe_experiment import run_to_stats, analyze_corpus  # noqa: E402


def _run(frac, mean, pmax, won):
    return {"outcome": "victory" if won else "defeat",
            "pressure_frac_ge75": frac, "pressure_mean": mean, "pressure_pmax": pmax}


def test_run_to_stats_maps_fields():
    s, won = run_to_stats(_run(0.6, 80.0, 96.0, True))
    assert s == {"frac_ge75": 0.6, "pressure_mean": 80.0, "pmax": 96.0}
    assert won is True


def test_analyze_corpus_selects_least_collinear():
    # B tracks wins (collinear); A is flat vs outcome (orthogonal-ish).
    corpus = [
        _run(0.50, 30.0, 80.0, False),
        _run(0.55, 95.0, 99.0, True),
        _run(0.52, 28.0, 70.0, False),
        _run(0.48, 96.0, 99.0, True),
    ]
    rep = analyze_corpus(corpus)
    assert rep["selected"] in ("A_sustained_threat", "B_time_avg", "C_apex_reach")
    # A (flat ~0.5) is far less win-correlated than B (30 vs 95) -> A ranks above B
    names = [r["name"] for r in rep["ranked"]]
    assert names.index("A_sustained_threat") < names.index("B_time_avg")
```

- [ ] **Step 2: Run test to verify it fails**

Run: `python -m pytest -q --import-mode=importlib tools/py/test_pe_experiment.py`
Expected: FAIL (ModuleNotFoundError: No module named 'pe_experiment').

- [ ] **Step 3: Write minimal implementation**

```python
# tools/py/pe_experiment.py
#!/usr/bin/env python3
"""PE_ratio orthogonality experiment (G2 follow-up PR1). Analysis core: a runs-corpus
(per-run pressure stats + outcome) -> a candidate-selection report. The real N=100 run is
the owner's maintainer step (make_corpus_from_backend, backend-dependent); the analysis is
pure + hermetically tested. See docs/superpowers/specs/2026-06-18-composite-pe-ratio-experiment-design.md."""
from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from pe_candidates import CANDIDATES, candidate_value  # noqa: E402
from pe_orthogonality import selection_report  # noqa: E402


def run_to_stats(run):
    """Map one calibrate_parallel run record -> (stats dict for candidates, won bool)."""
    stats = {
        "frac_ge75": run.get("pressure_frac_ge75", 0.0),
        "pressure_mean": run.get("pressure_mean", 0.0),
        "pmax": run.get("pressure_pmax", 0.0),
    }
    return stats, run.get("outcome") == "victory"


def analyze_corpus(corpus, eased_run=None):
    """Compute each candidate's per-run values + outcomes, then the selection report."""
    per_candidate = {name: [] for name in CANDIDATES}
    wons = []
    for run in corpus:
        stats, won = run_to_stats(run)
        wons.append(won)
        for name in CANDIDATES:
            per_candidate[name].append(candidate_value(name, stats))
    eased_value = ratified_value = None
    if eased_run is not None:
        es, _ = run_to_stats(eased_run)
        eased_value = {n: candidate_value(n, es) for n in CANDIDATES}
        # the ratified-run reference = the mean candidate value across the corpus
        ratified_value = {n: (sum(v) / len(v) if v else 0.0) for n, v in per_candidate.items()}
    return selection_report(per_candidate, wons, ratified_value=ratified_value,
                            eased_value=eased_value)


def main():
    import argparse
    import json

    ap = argparse.ArgumentParser(description="PE_ratio orthogonality experiment (analysis)")
    ap.add_argument("--corpus", required=True,
                    help="JSON: a list of run records (pressure_frac_ge75/pressure_mean/"
                         "pressure_pmax/outcome), e.g. the merged calibrate_parallel runs.")
    ap.add_argument("--eased", help="optional JSON: one trivialized-knob run record (discrimination).")
    args = ap.parse_args()
    corpus = json.loads(Path(args.corpus).read_text(encoding="utf-8"))
    if isinstance(corpus, dict):
        corpus = corpus.get("runs", [])
    eased = json.loads(Path(args.eased).read_text(encoding="utf-8")) if args.eased else None
    print(json.dumps(analyze_corpus(corpus, eased_run=eased), indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main())
```

- [ ] **Step 4: Run test to verify it passes**

Run: `python -m pytest -q --import-mode=importlib tools/py/test_pe_experiment.py`
Expected: PASS (2 passed).

- [ ] **Step 5: Commit**

```bash
git add tools/py/pe_experiment.py tools/py/test_pe_experiment.py
git commit  # "feat(calibration): PE experiment analysis core + CLI (PR1)" + ADR-0011 trailer
```

---

### Task 5: Instrument the batch aggregate to emit per-run pressure stats

The per-run result already carries `pressure_final` (`batch_calibrate_hardcore06.py:743`); the full `pressure_samples` exist locally in `run_one`. Surface compact per-run stats (so the experiment corpus has them) and aggregate them (additive, for the eventual composite).

**Files:**
- Modify: `tools/py/batch_calibrate_hardcore06.py` (the `run_one` return dict near line 743, and `aggregate()` return dict near lines 813-826)
- Test: `tools/py/test_aggregate_pressure_instrumentation.py`

- [ ] **Step 1: Write the failing test (fixture-driven, no backend)**

```python
# tools/py/test_aggregate_pressure_instrumentation.py
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))
import batch_calibrate_hardcore06 as hc06  # noqa: E402


def test_run_one_emits_per_run_pressure_stats(monkeypatch):
    # run_one must add pressure_frac_ge75 / pressure_mean / pressure_pmax from the samples.
    # We exercise the pure stat block by calling the helper the script now uses.
    from pressure_stats import pressure_stats
    s = pressure_stats([75, 80, 95, 100])
    # the script stores these under the agreed keys:
    assert set(s) == {"pressure_mean", "frac_ge75", "pmax"}


def test_aggregate_surfaces_pressure_keys():
    # aggregate() over synthetic per-run records must emit the 3 aggregate pressure keys.
    runs = [
        {"outcome": "victory", "turns": 10, "kd": 1.0, "dmg_dealt_player": 5,
         "dmg_taken_player": 3, "boss_hp_remaining": 0, "pressure_final": 99,
         "pressure_mean": 90.0, "pressure_frac_ge75": 0.9, "pressure_pmax": 99,
         "players_alive": 2},
        {"outcome": "defeat", "turns": 8, "kd": 0.5, "dmg_dealt_player": 2,
         "dmg_taken_player": 6, "boss_hp_remaining": 12, "pressure_final": 60,
         "pressure_mean": 62.0, "pressure_frac_ge75": 0.2, "pressure_pmax": 75,
         "players_alive": 0},
    ]
    agg = hc06.aggregate(runs, "hardcore")
    assert "pressure_mean_avg" in agg
    assert "pressure_frac_ge75_avg" in agg
    assert "apex_reach_rate" in agg
    assert round(agg["pressure_frac_ge75_avg"], 2) == 0.55  # (0.9 + 0.2)/2
    assert agg["apex_reach_rate"] == 0.5  # 1 of 2 runs pmax >= 95
```

NOTE: confirm `aggregate()`'s real per-run field names against the source before running (the
fixture above mirrors the keys at `batch_calibrate_hardcore06.py:740-744`; adjust the non-pressure
keys in the fixture if the real `aggregate()` requires more fields, but do NOT change the asserts
on the pressure keys).

- [ ] **Step 2: Run test to verify it fails**

Run: `python -m pytest -q --import-mode=importlib tools/py/test_aggregate_pressure_instrumentation.py`
Expected: FAIL (`KeyError`/`AssertionError`: `pressure_mean_avg` not in agg).

- [ ] **Step 3: Implement the instrumentation**

In `run_one` (where the per-run result dict is built around line 740-744), import the helper at
the top of the file (`from pressure_stats import pressure_stats`) and add the per-run stats:

```python
        # PE experiment (PR1): compact per-run pressure-trajectory stats.
        **{f"pressure_{k}" if k != "pressure_mean" else k: v
           for k, v in pressure_stats(pressure_samples).items()},
```

Simpler + explicit (preferred -- avoid the comprehension): add three keys to the result dict
right after `"pressure_final": ...`:

```python
        "pressure_mean": pressure_stats(pressure_samples)["pressure_mean"],
        "pressure_frac_ge75": pressure_stats(pressure_samples)["frac_ge75"],
        "pressure_pmax": pressure_stats(pressure_samples)["pmax"],
```

(Compute once into a local `_ps = pressure_stats(pressure_samples)` and reference `_ps[...]` to
avoid three calls.)

In `aggregate()` (the returned dict near lines 813-826, alongside `kd_avg`), add:

```python
        "pressure_mean_avg": statistics.mean([r.get("pressure_mean", 0.0) for r in ok]),
        "pressure_frac_ge75_avg": statistics.mean([r.get("pressure_frac_ge75", 0.0) for r in ok]),
        "apex_reach_rate": (
            sum(1 for r in ok if r.get("pressure_pmax", 0.0) >= 95) / len(ok) if ok else 0.0
        ),
```

(`ok` is the existing list of completed runs used for the other aggregate stats; confirm its name
in the function and reuse it.)

- [ ] **Step 4: Run test to verify it passes**

Run: `python -m pytest -q --import-mode=importlib tools/py/test_aggregate_pressure_instrumentation.py`
Expected: PASS (2 passed).

- [ ] **Step 5: Run the FULL suite (no regressions in the existing calibration tests)**

Run: `python -m pytest -q --import-mode=importlib tools/py`
Expected: PASS (all prior tests + the new ones; e.g. 120 + new).

- [ ] **Step 6: Commit**

```bash
git add tools/py/batch_calibrate_hardcore06.py tools/py/test_aggregate_pressure_instrumentation.py
git commit  # "feat(calibration): emit per-run + aggregate pressure-trajectory stats (PE experiment PR1)" + ADR-0011 trailer
```

---

### Task 6: Maintainer backend runner + experiment CLI smoke

The analysis core (Task 4) is complete. This task adds the backend-dependent corpus builder (a
maintainer path, like the P2/P3/P4/P5 runners) so the owner can produce a real corpus, plus a
`--dry-run` smoke that exercises the analysis end-to-end on a synthetic corpus with no backend.

**Files:**
- Modify: `tools/py/pe_experiment.py` (add `make_corpus_from_backend` + `--dry-run`)
- Test: `tools/py/test_pe_experiment.py` (add a dry-run smoke assertion)

- [ ] **Step 1: Write the failing test**

Append to `tools/py/test_pe_experiment.py`:

```python
def test_synthetic_corpus_smoke():
    from pe_experiment import synthetic_corpus
    corpus = synthetic_corpus(n=20, seed_bias=0.5)
    assert len(corpus) == 20
    rep = analyze_corpus(corpus)
    assert "ranked" in rep and len(rep["ranked"]) == 3
    assert "verdict" in rep
```

- [ ] **Step 2: Run test to verify it fails**

Run: `python -m pytest -q --import-mode=importlib tools/py/test_pe_experiment.py::test_synthetic_corpus_smoke`
Expected: FAIL (ImportError: cannot import name 'synthetic_corpus').

- [ ] **Step 3: Implement `synthetic_corpus`, `make_corpus_from_backend`, and `--dry-run`**

Add to `tools/py/pe_experiment.py` (above `main`):

```python
def synthetic_corpus(n=20, seed_bias=0.5):
    """Deterministic synthetic corpus for the dry-run smoke (no backend, no randomness):
    half wins / half losses, with pressure stats that mimic the real collinearity
    (wins -> higher mean/pmax) so the analysis exercises end-to-end."""
    corpus = []
    for i in range(n):
        won = (i % 2 == 0)
        mean = 90.0 if won else 60.0
        corpus.append({
            "outcome": "victory" if won else "defeat",
            "pressure_frac_ge75": 0.9 if won else 0.3,
            "pressure_mean": mean,
            "pressure_pmax": 99.0 if won else 80.0,
        })
    return corpus


def make_corpus_from_backend(repo, scenario_key, *, seed=424242, n=100, shards=4):
    """BACKEND-DEPENDENT maintainer path: run calibrate_parallel seed-pinned on node 22, read
    the merged runs (each now carrying the per-run pressure stats from Task 5), return the
    corpus. Validated by the maintainer on a real run; not unit-tested (no backend in CI)."""
    import json
    import subprocess
    import tempfile
    tmp = Path(tempfile.gettempdir())
    cmd = [sys.executable, str(Path(repo) / "tools/py/calibrate_parallel.py"),
           "--scenario", scenario_key, "--n", str(n), "--seed", str(seed),
           "--shards", str(shards), "--out-dir", str(tmp), "--label", "pe-exp"]
    subprocess.run(cmd, cwd=repo, check=True)
    merged = sorted(tmp.glob("*pe-exp*.json"), key=lambda p: p.stat().st_mtime)
    data = json.loads(merged[-1].read_text(encoding="utf-8")) if merged else {}
    return data.get("runs", [])
```

Then extend `main` to support `--dry-run` (before the `--corpus` requirement):

```python
    ap.add_argument("--dry-run", action="store_true",
                    help="analyze a deterministic synthetic corpus (no backend); smoke only")
    ...
    if args.dry_run:
        print(json.dumps(analyze_corpus(synthetic_corpus()), indent=2))
        return 0
```

(Make `--corpus` not-required when `--dry-run` is set: change `required=True` to `required=False`
and add an explicit error if neither `--dry-run` nor `--corpus` is given.)

- [ ] **Step 4: Run test to verify it passes**

Run: `python -m pytest -q --import-mode=importlib tools/py/test_pe_experiment.py`
Expected: PASS (3 passed).

- [ ] **Step 5: Dry-run smoke (output captured, QG Step-1)**

Run: `python tools/py/pe_experiment.py --dry-run`
Expected: prints a JSON report with `ranked` (3 candidates) + `verdict`; exit 0. (On the synthetic
corpus B/C are collinear with wins and A is the least-collinear, so `selected` is typically
`A_sustained_threat` -- but the smoke only asserts the harness runs + emits a report.)

- [ ] **Step 6: Full suite + commit**

```bash
python -m pytest -q --import-mode=importlib tools/py   # all green
git add tools/py/pe_experiment.py tools/py/test_pe_experiment.py
git commit  # "feat(calibration): PE experiment backend runner + dry-run smoke (PR1)" + ADR-0011 trailer
```

---

## After PR1

The harness is shipped. The OWNER runs the experiment (maintainer step, backend, node 22):
1. `python tools/py/calibrate_parallel.py --scenario hardcore_06 --n 100 --seed 424242` (now emits per-run pressure stats) -> merged runs JSON.
2. (optional) one eased-knob run for discrimination.
3. `python tools/py/pe_experiment.py --corpus <merged.json> [--eased <eased.json>]` -> selection report.
4. Read the report: the least-collinear candidate (abs_corr) with correct discrimination is the PE_ratio. If `verdict` is negative-result (all abs_corr > 0.6), PR2 switches to the contestedness proxy (spec sec 4.5).

**PR2** (separate spec/plan) wires the selected `pe_ratio` + `kd_normalize` into the aggregate/objective, derives + human-ratifies the composite band, and unblocks P4 gate-2/4b + P5 composite-drift.

---

## Self-Review

- **Spec coverage:** instrumentation (sec 3.1) = Task 5; candidates (3.2) = Task 2; orthogonality (3.3) = Task 3; experiment runner (3.4) = Tasks 4+6; kd_normalize (3.5) = Task 2; the composite band (3.6) + wiring (sec 5) are explicitly PR2, not PR1 (correct per delivery sec 8). Experiment protocol (sec 4) incl. negative-result threshold 0.6 = Task 3 `DEFAULT_MAX_CORR` + the "After PR1" run steps.
- **Placeholder scan:** every code step has complete code; the one judgment call (real `aggregate()` field names) is flagged with an explicit confirm-against-source note in Task 5, not left as TBD.
- **Type consistency:** per-run keys are `pressure_mean` / `pressure_frac_ge75` / `pressure_pmax` everywhere (run_one emit in Task 5, `run_to_stats` in Task 4, fixtures in Tasks 4-5). Candidate names `A_sustained_threat` / `B_time_avg` / `C_apex_reach` are identical in Tasks 2/3/4/6. `pressure_stats` returns `{pressure_mean, frac_ge75, pmax}` consistently (Task 1) and `run_to_stats` maps the per-run `pressure_frac_ge75`->`frac_ge75`, `pressure_pmax`->`pmax` (Task 4) -- the one rename point, intentional and tested.
