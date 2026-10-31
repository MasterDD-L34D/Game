# D4 Biome-Affinity Heuristic Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Suggerire `biome_affinity` per le 32 specie canoniche che non ce l'hanno, via heuristic trait+keyword+clade, con golden-set quality gate (≥60% top-1 sulle 21 note) e review-gate master-dd (DRAFT separato, mai auto-merge sul catalogo).

**Architecture:** Python CLI puro in `tools/py/`. Legge `data/core/species/species_catalog.json` (`.catalog[]`, 53 specie). Costruisce un mapping trait→bioma invertendo le 21 specie già assegnate. Score per-specie = trait-vote (primario) + keyword-match su functional_signature/scientific_name (secondario) + clade tie-break. Gira prima in modalità golden-set (valida sulle 21); se ≥60% top-1, genera DRAFT JSON per le 32. NON tocca il catalogo (apply = step separato, fuori scope di questo plan).

**Tech Stack:** Python 3.12, stdlib (json, re, argparse, collections, pathlib). Test: pytest (`tests/test_*.py`, pattern repo `PYTHONPATH=tools/py pytest`).

---

## File Structure

- Create: `tools/py/suggest_biome_affinity.py` — CLI heuristic + golden-set + draft generator (single file, una responsabilità: suggerire biome_affinity)
- Create: `tests/test_suggest_biome_affinity.py` — unit + golden-set validation
- Output (runtime, non committato): `docs/planning/2026-05-30-biome-affinity-draft.json`

Lo split apply-script (merge nel catalogo) è un plan separato post-review master-dd. Questo plan si ferma al DRAFT.

---

## Data shapes (verificati 2026-05-30, ground-truth)

- `data/core/species/species_catalog.json` → `{ version, ..., catalog: [ {species_id, scientific_name, functional_signature, trait_refs:[], clade_tag, role_tags:[], biome_affinity (string|null|absent), ecology:{trophic_tier}}, ... ] }` (53 entry).
- `biome_affinity` = stringa singola = un biome_id. 21/53 popolate, 32 null/assenti.
- `data/core/biomes.yaml` → `.biomes` è un **object** (keys = 20 biome_id). Parse: `list(data["biomes"].keys())`.
- Esempio specie senza: `sp_arenavolux_sagittalis` → `trait_refs:["coda_contrappeso","midollo_iperattivo","pungiglione_paralizzante"]`, `clade_tag:"Apex"`, `functional_signature:"Specie apex con coda_contrappeso + midollo_iperattivo."`
- Esempio specie con (golden): `dune_stalker → "savana"`, `anguis_magnetica → "atollo_obsidiana"`.

---

## Task 1: Catalog loader + biome-id list

**Files:**

- Create: `tools/py/suggest_biome_affinity.py`
- Test: `tests/test_suggest_biome_affinity.py`

- [ ] **Step 1: Write the failing test**

```python
# tests/test_suggest_biome_affinity.py
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "tools", "py"))

import suggest_biome_affinity as sba


def test_load_catalog_returns_53_species():
    species = sba.load_catalog()
    assert len(species) == 53
    assert all("species_id" in s for s in species)


def test_split_assigned_vs_missing():
    species = sba.load_catalog()
    assigned, missing = sba.split_by_biome_affinity(species)
    assert len(assigned) == 21
    assert len(missing) == 32
    # assigned all have a non-empty string biome_affinity
    assert all(isinstance(s["biome_affinity"], str) and s["biome_affinity"] for s in assigned)


def test_valid_biome_ids_are_20():
    ids = sba.load_biome_ids()
    assert len(ids) == 20
    assert "savana" in ids
    assert "rovine_planari" in ids
```

- [ ] **Step 2: Run test to verify it fails**

Run: `PYTHONPATH=tools/py pytest tests/test_suggest_biome_affinity.py -v`
Expected: FAIL with `ModuleNotFoundError` or `AttributeError: module 'suggest_biome_affinity' has no attribute 'load_catalog'`

- [ ] **Step 3: Write minimal implementation**

```python
# tools/py/suggest_biome_affinity.py
"""D4 biome-affinity heuristic — suggest biome_affinity for the 32 unassigned
canonical species. DRAFT only; never writes the canonical catalog.

Ref: docs/superpowers/specs/2026-05-30-d4-biome-affinity-ecoyaml-design.md
"""

import json
import re
import argparse
from collections import Counter, defaultdict
from pathlib import Path

import yaml

REPO_ROOT = Path(__file__).resolve().parents[2]
CATALOG_PATH = REPO_ROOT / "data/core/species/species_catalog.json"
BIOMES_PATH = REPO_ROOT / "data/core/biomes.yaml"


def load_catalog(path: Path = CATALOG_PATH) -> list:
    with open(path, encoding="utf-8") as f:
        data = json.load(f)
    return data["catalog"]


def split_by_biome_affinity(species: list):
    assigned, missing = [], []
    for s in species:
        ba = s.get("biome_affinity")
        if isinstance(ba, str) and ba.strip():
            assigned.append(s)
        else:
            missing.append(s)
    return assigned, missing


def load_biome_ids(path: Path = BIOMES_PATH) -> list:
    with open(path, encoding="utf-8") as f:
        data = yaml.safe_load(f)
    return list(data["biomes"].keys())
```

- [ ] **Step 4: Run test to verify it passes**

Run: `PYTHONPATH=tools/py pytest tests/test_suggest_biome_affinity.py -v`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add tools/py/suggest_biome_affinity.py tests/test_suggest_biome_affinity.py
git commit -m "feat(worldgen): D4 catalog loader + biome-id list (suggest_biome_affinity)"
```

---

## Task 2: Trait→biome map (inverted from the 21 assigned)

**Files:**

- Modify: `tools/py/suggest_biome_affinity.py`
- Test: `tests/test_suggest_biome_affinity.py`

- [ ] **Step 1: Write the failing test**

```python
def test_build_trait_biome_map_from_assigned():
    species = sba.load_catalog()
    assigned, _ = sba.split_by_biome_affinity(species)
    tmap = sba.build_trait_biome_map(assigned)
    # tmap: trait -> Counter({biome: count})
    # every assigned species' traits contribute a vote to its biome
    assert isinstance(tmap, dict)
    # at least one trait maps somewhere
    assert len(tmap) > 0
    # votes are Counters keyed by biome id
    sample_trait = next(iter(tmap))
    assert isinstance(tmap[sample_trait], Counter)


def test_trait_map_vote_counts_match_assigned():
    # a trait appearing only in savana species votes only savana
    fake_assigned = [
        {"trait_refs": ["t_sand"], "biome_affinity": "savana"},
        {"trait_refs": ["t_sand", "t_other"], "biome_affinity": "savana"},
    ]
    tmap = sba.build_trait_biome_map(fake_assigned)
    assert tmap["t_sand"]["savana"] == 2
    assert tmap["t_other"]["savana"] == 1
```

Add to the imports at top of test file:

```python
from collections import Counter
```

- [ ] **Step 2: Run test to verify it fails**

Run: `PYTHONPATH=tools/py pytest tests/test_suggest_biome_affinity.py::test_build_trait_biome_map_from_assigned -v`
Expected: FAIL with `AttributeError: ... has no attribute 'build_trait_biome_map'`

- [ ] **Step 3: Write minimal implementation**

Append to `tools/py/suggest_biome_affinity.py`:

```python
def build_trait_biome_map(assigned: list) -> dict:
    """trait_id -> Counter({biome_id: vote_count}) from already-assigned species."""
    tmap = defaultdict(Counter)
    for s in assigned:
        biome = s.get("biome_affinity")
        if not (isinstance(biome, str) and biome.strip()):
            continue
        for trait in s.get("trait_refs", []) or []:
            tmap[trait][biome] += 1
    return dict(tmap)
```

- [ ] **Step 4: Run test to verify it passes**

Run: `PYTHONPATH=tools/py pytest tests/test_suggest_biome_affinity.py -v`
Expected: PASS (5 tests)

- [ ] **Step 5: Commit**

```bash
git add tools/py/suggest_biome_affinity.py tests/test_suggest_biome_affinity.py
git commit -m "feat(worldgen): D4 trait->biome map inverted from assigned species"
```

---

## Task 3: Keyword→biome signal (secondary)

**Files:**

- Modify: `tools/py/suggest_biome_affinity.py`
- Test: `tests/test_suggest_biome_affinity.py`

- [ ] **Step 1: Write the failing test**

```python
def test_keyword_biome_scores_arena_hits_savana_or_sand():
    text = "Specie apex Arenavolux sagittalis, coda contrappeso"
    scores = sba.keyword_biome_scores(text, sba.load_biome_ids())
    # "arena" keyword maps to savana per KEYWORD_BIOME table
    assert scores.get("savana", 0) > 0


def test_keyword_biome_scores_empty_when_no_match():
    scores = sba.keyword_biome_scores("zzz qqq", sba.load_biome_ids())
    assert all(v == 0 for v in scores.values()) or scores == {}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `PYTHONPATH=tools/py pytest tests/test_suggest_biome_affinity.py::test_keyword_biome_scores_arena_hits_savana_or_sand -v`
Expected: FAIL with `AttributeError: ... has no attribute 'keyword_biome_scores'`

- [ ] **Step 3: Write minimal implementation**

Append to `tools/py/suggest_biome_affinity.py`:

```python
# Keyword (lowercased substring) -> biome_id. Lexical signal from
# scientific_name + functional_signature. Conservative: only unambiguous roots.
KEYWORD_BIOME = {
    "arena": "savana",
    "dune": "savana",
    "sand": "savana",
    "hydro": "palude",
    "hydrus": "palude",
    "palud": "palude",
    "salina": "pianura_salina_iperarida",
    "sali": "pianura_salina_iperarida",
    "ferr": "badlands",
    "rust": "badlands",
    "magnet": "atollo_obsidiana",
    "obsidian": "atollo_obsidiana",
    "cryo": "caldera_glaciale",
    "glaci": "caldera_glaciale",
    "gel": "caldera_glaciale",
    "myco": "foresta_miceliale",
    "spore": "foresta_miceliale",
    "acid": "foresta_acida",
    "caver": "caverna",
    "litho": "canyons_risonanti",
    "rupi": "canyons_risonanti",
    "synap": "frattura_abissale_sinaptica",
    "neural": "frattura_abissale_sinaptica",
    "reef": "reef_luminescente",
    "coral": "reef_luminescente",
    "volcan": "abisso_vulcanico",
    "vulcan": "abisso_vulcanico",
    "therm": "dorsale_termale_tropicale",
}


def keyword_biome_scores(text: str, valid_biomes: list) -> dict:
    """Lowercased substring match -> {biome_id: hit_count}, filtered to valid biomes."""
    if not text:
        return {}
    low = text.lower()
    scores = Counter()
    for kw, biome in KEYWORD_BIOME.items():
        if kw in low and biome in valid_biomes:
            scores[biome] += 1
    return dict(scores)
```

- [ ] **Step 4: Run test to verify it passes**

Run: `PYTHONPATH=tools/py pytest tests/test_suggest_biome_affinity.py -v`
Expected: PASS (7 tests)

- [ ] **Step 5: Commit**

```bash
git add tools/py/suggest_biome_affinity.py tests/test_suggest_biome_affinity.py
git commit -m "feat(worldgen): D4 keyword->biome lexical signal"
```

---

## Task 4: Combined per-species scorer

**Files:**

- Modify: `tools/py/suggest_biome_affinity.py`
- Test: `tests/test_suggest_biome_affinity.py`

- [ ] **Step 1: Write the failing test**

```python
def test_score_species_returns_ranked_biomes():
    tmap = {"t_sand": Counter({"savana": 3})}
    species = {
        "species_id": "x",
        "trait_refs": ["t_sand"],
        "scientific_name": "Dunecrawler arena",
        "functional_signature": "predatore di sabbia",
        "clade_tag": "Apex",
    }
    ranked = sba.score_species(species, tmap, sba.load_biome_ids())
    # ranked = list of (biome, score) sorted desc
    assert ranked[0][0] == "savana"
    assert ranked[0][1] > 0


def test_score_species_no_signal_returns_empty():
    species = {
        "species_id": "y",
        "trait_refs": ["unknown_trait"],
        "scientific_name": "Xyz qqq",
        "functional_signature": "",
        "clade_tag": "Bridge",
    }
    ranked = sba.score_species(species, {}, sba.load_biome_ids())
    assert ranked == [] or ranked[0][1] == 0
```

- [ ] **Step 2: Run test to verify it fails**

Run: `PYTHONPATH=tools/py pytest tests/test_suggest_biome_affinity.py::test_score_species_returns_ranked_biomes -v`
Expected: FAIL with `AttributeError: ... has no attribute 'score_species'`

- [ ] **Step 3: Write minimal implementation**

Append to `tools/py/suggest_biome_affinity.py`:

```python
# Signal weights (calibrated against golden-set in Task 5).
W_TRAIT = 3.0
W_KEYWORD = 2.0


def score_species(species: dict, trait_biome_map: dict, valid_biomes: list) -> list:
    """Return [(biome_id, score), ...] sorted by score desc (only score > 0)."""
    scores = Counter()

    # Primary: trait votes
    for trait in species.get("trait_refs", []) or []:
        votes = trait_biome_map.get(trait)
        if votes:
            total = sum(votes.values())
            for biome, cnt in votes.items():
                scores[biome] += W_TRAIT * (cnt / total)

    # Secondary: keyword match on scientific_name + functional_signature
    text = " ".join(
        str(species.get(k, "") or "")
        for k in ("scientific_name", "functional_signature")
    )
    for biome, hits in keyword_biome_scores(text, valid_biomes).items():
        scores[biome] += W_KEYWORD * hits

    ranked = [(b, sc) for b, sc in scores.most_common() if sc > 0]
    return ranked
```

- [ ] **Step 4: Run test to verify it passes**

Run: `PYTHONPATH=tools/py pytest tests/test_suggest_biome_affinity.py -v`
Expected: PASS (9 tests)

- [ ] **Step 5: Commit**

```bash
git add tools/py/suggest_biome_affinity.py tests/test_suggest_biome_affinity.py
git commit -m "feat(worldgen): D4 combined per-species biome scorer"
```

---

## Task 5: Golden-set validation (the HARD gate)

**Files:**

- Modify: `tools/py/suggest_biome_affinity.py`
- Test: `tests/test_suggest_biome_affinity.py`

- [ ] **Step 1: Write the failing test**

```python
def test_golden_set_accuracy_is_measurable():
    species = sba.load_catalog()
    assigned, _ = sba.split_by_biome_affinity(species)
    result = sba.golden_set_validate(assigned, sba.load_biome_ids())
    # result: {top1_correct, total, top1_accuracy, misses:[...]}
    assert result["total"] == 21
    assert 0.0 <= result["top1_accuracy"] <= 1.0
    assert result["top1_correct"] + len(result["misses"]) == 21


def test_golden_set_leave_one_out_excludes_self():
    # a species must NOT vote for its own biome via its own traits during validation
    # (leave-one-out: rebuild trait map without the species under test)
    species = sba.load_catalog()
    assigned, _ = sba.split_by_biome_affinity(species)
    result = sba.golden_set_validate(assigned, sba.load_biome_ids())
    # sanity: leave-one-out accuracy is a real fraction, not trivially 1.0
    assert result["top1_accuracy"] <= 1.0
```

- [ ] **Step 2: Run test to verify it fails**

Run: `PYTHONPATH=tools/py pytest tests/test_suggest_biome_affinity.py::test_golden_set_accuracy_is_measurable -v`
Expected: FAIL with `AttributeError: ... has no attribute 'golden_set_validate'`

- [ ] **Step 3: Write minimal implementation**

Append to `tools/py/suggest_biome_affinity.py`:

```python
def golden_set_validate(assigned: list, valid_biomes: list) -> dict:
    """Leave-one-out: for each assigned species, rebuild the trait map WITHOUT it,
    score it, and check whether top-1 prediction matches its known biome_affinity."""
    top1_correct = 0
    misses = []
    for i, s in enumerate(assigned):
        others = assigned[:i] + assigned[i + 1:]
        tmap = build_trait_biome_map(others)
        ranked = score_species(s, tmap, valid_biomes)
        predicted = ranked[0][0] if ranked else None
        actual = s["biome_affinity"]
        if predicted == actual:
            top1_correct += 1
        else:
            misses.append({
                "species_id": s.get("species_id"),
                "actual": actual,
                "predicted": predicted,
                "ranked": ranked[:3],
            })
    total = len(assigned)
    return {
        "top1_correct": top1_correct,
        "total": total,
        "top1_accuracy": (top1_correct / total) if total else 0.0,
        "misses": misses,
    }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `PYTHONPATH=tools/py pytest tests/test_suggest_biome_affinity.py -v`
Expected: PASS (11 tests)

- [ ] **Step 5: Commit**

```bash
git add tools/py/suggest_biome_affinity.py tests/test_suggest_biome_affinity.py
git commit -m "feat(worldgen): D4 golden-set leave-one-out validation"
```

---

## Task 6: CLI — golden-set gate + draft generation

**Files:**

- Modify: `tools/py/suggest_biome_affinity.py`
- Test: `tests/test_suggest_biome_affinity.py`

- [ ] **Step 1: Write the failing test**

```python
def test_generate_draft_shape():
    species = sba.load_catalog()
    assigned, missing = sba.split_by_biome_affinity(species)
    tmap = sba.build_trait_biome_map(assigned)
    draft = sba.generate_draft(missing, tmap, sba.load_biome_ids())
    assert len(draft) == 32
    entry = draft[0]
    for key in ("species_id", "suggested_biome", "confidence", "reasoning", "alternatives"):
        assert key in entry
    assert 0.0 <= entry["confidence"] <= 1.0
    assert isinstance(entry["alternatives"], list)
```

- [ ] **Step 2: Run test to verify it fails**

Run: `PYTHONPATH=tools/py pytest tests/test_suggest_biome_affinity.py::test_generate_draft_shape -v`
Expected: FAIL with `AttributeError: ... has no attribute 'generate_draft'`

- [ ] **Step 3: Write minimal implementation**

Append to `tools/py/suggest_biome_affinity.py`:

```python
GATE_THRESHOLD = 0.60  # >=60% top-1 on golden set


def _confidence(ranked: list) -> float:
    """Normalized margin between top-1 and top-2 (0..1). Sole candidate -> 0.5 baseline."""
    if not ranked:
        return 0.0
    if len(ranked) == 1:
        return 0.5
    top, second = ranked[0][1], ranked[1][1]
    if top <= 0:
        return 0.0
    return max(0.0, min(1.0, (top - second) / top))


def generate_draft(missing: list, trait_biome_map: dict, valid_biomes: list) -> list:
    draft = []
    for s in missing:
        ranked = score_species(s, trait_biome_map, valid_biomes)
        suggested = ranked[0][0] if ranked else None
        draft.append({
            "species_id": s.get("species_id"),
            "suggested_biome": suggested,
            "confidence": round(_confidence(ranked), 3),
            "reasoning": _reasoning(s, ranked),
            "alternatives": [b for b, _ in ranked[:3]],
        })
    return draft


def _reasoning(species: dict, ranked: list) -> str:
    if not ranked:
        return "no signal (no trait votes, no keyword match)"
    traits = ", ".join(species.get("trait_refs", []) or []) or "none"
    top = ranked[0]
    return f"top biome {top[0]} (score {top[1]:.2f}) from traits [{traits}] + clade {species.get('clade_tag')}"


def main(argv=None):
    ap = argparse.ArgumentParser(description="D4 biome-affinity heuristic (DRAFT only)")
    ap.add_argument("--out", default=str(REPO_ROOT / "docs/planning/2026-05-30-biome-affinity-draft.json"))
    ap.add_argument("--gate", type=float, default=GATE_THRESHOLD)
    args = ap.parse_args(argv)

    species = load_catalog()
    assigned, missing = split_by_biome_affinity(species)
    valid = load_biome_ids()

    gs = golden_set_validate(assigned, valid)
    print(f"[golden-set] top-1 accuracy {gs['top1_accuracy']:.1%} ({gs['top1_correct']}/{gs['total']}) gate={args.gate:.0%}")

    if gs["top1_accuracy"] < args.gate:
        print("[GATE FAIL] heuristic below threshold. NOT generating draft. Misses:")
        for m in gs["misses"]:
            print(f"  - {m['species_id']}: actual={m['actual']} predicted={m['predicted']}")
        return 1

    tmap = build_trait_biome_map(assigned)
    draft = generate_draft(missing, tmap, valid)
    out_path = Path(args.out)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump({"golden_set": {"top1_accuracy": gs["top1_accuracy"], "correct": gs["top1_correct"], "total": gs["total"]},
                   "draft": draft}, f, ensure_ascii=False, indent=2)
    print(f"[GATE PASS] draft of {len(draft)} suggestions written to {out_path}")
    return 0


if __name__ == "__main__":
    import sys
    sys.exit(main())
```

- [ ] **Step 4: Run test to verify it passes**

Run: `PYTHONPATH=tools/py pytest tests/test_suggest_biome_affinity.py -v`
Expected: PASS (12 tests)

- [ ] **Step 5: Commit**

```bash
git add tools/py/suggest_biome_affinity.py tests/test_suggest_biome_affinity.py
git commit -m "feat(worldgen): D4 CLI golden-set gate + draft generation"
```

---

## Task 7: Run the gate live + record the verdict

**Files:**

- Run only (no code change); record outcome.

- [ ] **Step 1: Run the heuristic against real data**

Run: `PYTHONPATH=tools/py python tools/py/suggest_biome_affinity.py`
Expected: prints `[golden-set] top-1 accuracy XX.X% (n/21) gate=60%` then either:

- `[GATE PASS] draft of 32 suggestions written ...` (accuracy ≥60%), OR
- `[GATE FAIL] heuristic below threshold. NOT generating draft.` + list of misses (accuracy <60%)

- [ ] **Step 2: Branch on the verdict**

**If GATE PASS:**

- Draft is at `docs/planning/2026-05-30-biome-affinity-draft.json`.
- This plan is COMPLETE. Hand the draft to master-dd for review (apply-script = separate plan).
- Report: accuracy %, count of high-confidence (≥0.5) vs low-confidence suggestions.

**If GATE FAIL:**

- Do NOT generate or commit any draft.
- Report to master-dd: real accuracy %, the miss list, and the 3 options from the spec §3:
  (a) improve signals, (b) manual assignment, (c) abandon D4.
- STOP. The honest negative result is the deliverable — it prevents polluting canonical data
  with unreliable guesses (CLAUDE.md anti-pattern #14).

- [ ] **Step 3: Commit the verdict note (either way)**

```bash
# Write a short verdict to docs/playtest/ or docs/reports/ (NOT the canonical catalog)
git add docs/reports/2026-05-30-d4-golden-set-verdict.md
git commit -m "docs(worldgen): D4 golden-set gate verdict (accuracy + decision)"
```

---

## Self-Review

- **Spec coverage:** §2 heuristic (Tasks 2-4), §3 golden-set gate 60% (Tasks 5-6), §4 review-gate = DRAFT-only no auto-merge (Task 6 writes draft, apply deferred to separate plan), §6 tests (every task), §7 guards (no canonical write — verified: main() writes only to docs/planning draft). ECO-YAML-GEN (spec §5) = SEPARATE plan, gated on this draft's approval — correctly out of scope here.
- **Placeholder scan:** none — every step has full code.
- **Type consistency:** `load_catalog()` returns `.catalog` list everywhere; `build_trait_biome_map` → `dict[str, Counter]` consumed by `score_species`; `score_species` → `list[(biome, score)]` consumed by `golden_set_validate` + `generate_draft` + `_confidence` consistently. `biome_affinity` read as string throughout.

## Notes

- **Worktree:** implementation should run in an isolated worktree (CLAUDE.md discipline). Use `superpowers:using-git-worktrees` at execution time.
- **No canonical mutation:** this plan ONLY writes `docs/planning/2026-05-30-biome-affinity-draft.json`. The catalog `species_catalog.json` is untouched. apply = separate post-review plan.
- **Quality Gate (CLAUDE.md):** smoke = `PYTHONPATH=tools/py pytest tests/test_suggest_biome_affinity.py`; the live gate run (Task 7) is itself the research-investigation step.
