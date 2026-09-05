# OD-024 D4 derive interoception overrides -- Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development or superpowers:executing-plans. Steps use `- [ ]` checkboxes.

**Goal:** Populate per-species `interoception_traits` overrides into `data/core/species/species_catalog.json` from a ratified rule (tier-floor + ecological boosts), via a new rule-based ETL tool.

**Architecture:** New `tools/etl/derive_interoception_overrides.py` mirrors `apply_biome_affinity.py` / `apply_interoception_traits.py`: pure rule core (compute override from a catalog entry) + DRY-RUN/`--apply` IO wrapper that writes the field in place. Reuses `tools/etl/interoception_field.py` (whitelist + filter). Flag `SENTIENCE_INTEROCEPTION_GRANT_ENABLED` stays OFF -> band-neutral despite the catalog diff.

**Tech Stack:** Python 3.12 (`C:/Users/edusc/AppData/Local/Programs/Python/Python312/python.exe`), pytest, node (`run-test-api.cjs` regression).

Spec: `docs/superpowers/specs/2026-06-22-od024-d4-interoception-overrides-rule-design.md`.

---

## Ratified constants

- `NOCICEPTION_DANGER_THRESHOLD = 2`
- `THERMAL_BIOMES = {deserto_caldo, abisso_vulcanico, dorsale_termale_tropicale, pianura_salina_iperarida, cryosteppe, caldera_glaciale, mezzanotte_orbitale, stratosfera_tempestosa, badlands}`
- `TIER_INTEROCEPTION_MAP = {T1: [propriocezione, equilibrio_vestibolare], T2: [nocicezione], T3: [termocezione]}` (cumulative; mirror of producer).
- Expected impact: 33 overrides (30 T1, 3 T2); 41 stay on tier default; T0 skipped.

---

### Task 1: pure rule core (TDD)

**Files:**

- Create: `tools/etl/derive_interoception_overrides.py`
- Test: `tests/test_derive_interoception_overrides.py`

- [ ] **Step 1: failing tests** (`tests/test_derive_interoception_overrides.py`)

```python
import sys
from pathlib import Path
REPO_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(REPO_ROOT / "tools" / "etl"))
import derive_interoception_overrides as d

def test_tier_default_cumulative():
    assert d.tier_default("T1") == ["propriocezione", "equilibrio_vestibolare"]
    assert d.tier_default("T2") == ["propriocezione", "equilibrio_vestibolare", "nocicezione"]
    assert d.tier_default("T3") == ["propriocezione", "equilibrio_vestibolare", "nocicezione", "termocezione"]
    assert d.tier_default("T0") == []
    assert d.tier_default("garbage") == []

def test_derive_adds_nocicezione_for_danger_T1():
    e = {"sentience_index": "T1", "risk_profile": {"danger_level": 2}, "biome_affinity": "savana"}
    assert d.derive_override(e) == ["propriocezione", "equilibrio_vestibolare", "nocicezione"]

def test_derive_adds_termocezione_for_thermal_biome_T1():
    e = {"sentience_index": "T1", "risk_profile": {"danger_level": 1}, "biome_affinity": "badlands"}
    assert d.derive_override(e) == ["propriocezione", "equilibrio_vestibolare", "termocezione"]

def test_derive_both_additions_T2():
    e = {"sentience_index": "T2", "risk_profile": {"danger_level": 3}, "biome_affinity": "deserto_caldo"}
    assert d.derive_override(e) == ["propriocezione", "equilibrio_vestibolare", "nocicezione", "termocezione"]

def test_derive_none_when_equals_tier_default():
    # T1, low danger, non-thermal -> no addition -> None (no override row)
    e = {"sentience_index": "T1", "risk_profile": {"danger_level": 1}, "biome_affinity": "foresta_temperata"}
    assert d.derive_override(e) is None

def test_derive_none_for_T3_plus():
    # T3 already has all 4 by tier -> additions cannot exceed -> None
    e = {"sentience_index": "T3", "risk_profile": {"danger_level": 3}, "biome_affinity": "abisso_vulcanico"}
    assert d.derive_override(e) is None

def test_derive_none_for_T0():
    e = {"sentience_index": "T0", "risk_profile": {"danger_level": 3}, "biome_affinity": "badlands"}
    assert d.derive_override(e) is None

def test_plan_overrides_counts(tmp_catalog=None):
    catalog = [
        {"species_id": "a", "sentience_index": "T1", "risk_profile": {"danger_level": 2}, "biome_affinity": "savana"},
        {"species_id": "b", "sentience_index": "T1", "risk_profile": {"danger_level": 1}, "biome_affinity": "foresta_temperata"},
    ]
    to_apply, skipped = d.plan_overrides(catalog)
    assert [sp["species_id"] for sp, _ in to_apply] == ["a"]

def test_plan_idempotent_when_in_sync():
    catalog = [{"species_id": "a", "sentience_index": "T1", "risk_profile": {"danger_level": 2},
                "biome_affinity": "savana", "interoception_traits": ["propriocezione", "equilibrio_vestibolare", "nocicezione"]}]
    to_apply, skipped = d.plan_overrides(catalog)
    assert to_apply == []
```

- [ ] **Step 2: run -> FAIL** `PYTHONPATH=tools/py <py> -m pytest tests/test_derive_interoception_overrides.py -q` (ModuleNotFound).

- [ ] **Step 3: implement core** (`tools/etl/derive_interoception_overrides.py`)

```python
from interoception_field import INTEROCEPTION_TRAIT_IDS, filter_interoception

NOCICEPTION_DANGER_THRESHOLD = 2
THERMAL_BIOMES = frozenset({
    "deserto_caldo", "abisso_vulcanico", "dorsale_termale_tropicale",
    "pianura_salina_iperarida", "cryosteppe", "caldera_glaciale",
    "mezzanotte_orbitale", "stratosfera_tempestosa", "badlands",
})
TIER_INTEROCEPTION_MAP = {  # cumulative; mirror producer interoceptionForTier (D2)
    "T1": ["propriocezione", "equilibrio_vestibolare"],
    "T2": ["nocicezione"],
    "T3": ["termocezione"],
}

def _rank(t):
    return int(t[1]) if isinstance(t, str) and len(t) == 2 and t[0] == "T" and t[1].isdigit() else None

def tier_default(tier):
    r = _rank(tier)
    if r is None:
        return []
    out = []
    for k, ids in TIER_INTEROCEPTION_MAP.items():
        if _rank(k) <= r:
            out += ids
    return filter_interoception(out)

def derive_override(entry):
    r = _rank(entry.get("sentience_index"))
    if r is None or r < 1:   # T0/unknown -> producer gates out -> no override
        return None
    base = tier_default(entry.get("sentience_index"))
    additions = set()
    if (entry.get("risk_profile") or {}).get("danger_level", 1) >= NOCICEPTION_DANGER_THRESHOLD:
        additions.add("nocicezione")
    if entry.get("biome_affinity") in THERMAL_BIOMES:
        additions.add("termocezione")
    full = filter_interoception(list(base) + [a for a in INTEROCEPTION_TRAIT_IDS if a in additions])
    return full if full != base else None

def plan_overrides(catalog):
    to_apply, skipped = [], []
    for sp in catalog:
        override = derive_override(sp)
        if override is None:
            skipped.append((sp.get("species_id"), "tier-default or below-gateway"))
        elif sp.get("interoception_traits") == override:
            skipped.append((sp.get("species_id"), "already in sync"))
        else:
            to_apply.append((sp, override))
    return to_apply, skipped
```

- [ ] **Step 4: run -> PASS.**
- [ ] **Step 5: commit** (`git add` tool+test; ADR-0011 trailer).

### Task 2: IO wrapper + CLI (TDD)

**Files:** Modify `tools/etl/derive_interoception_overrides.py`; extend test file.

- [ ] **Step 1: failing tests** -- `apply_changes` sets field+`_provenance`(`PROV_TAG`), preserves other keys; `main(["--apply","--catalog",tmp])` writes 1 entry on a 2-entry temp catalog then is idempotent on re-run; dry-run default writes nothing.

```python
def test_apply_changes_sets_field_and_provenance():
    sp = {"species_id": "a"}
    d.apply_changes([(sp, ["propriocezione", "nocicezione"])])
    assert sp["interoception_traits"] == ["propriocezione", "nocicezione"]
    assert sp["_provenance"]["interoception_traits"] == d.PROV_TAG

def test_main_apply_then_idempotent(tmp_path):
    import json
    cat = {"catalog": [
        {"species_id": "a", "sentience_index": "T1", "risk_profile": {"danger_level": 2}, "biome_affinity": "savana"},
        {"species_id": "b", "sentience_index": "T1", "risk_profile": {"danger_level": 1}, "biome_affinity": "palude"},
    ]}
    p = tmp_path / "c.json"; p.write_text(json.dumps(cat), encoding="utf-8")
    assert d.main(["--apply", "--catalog", str(p)]) == 0
    after = json.loads(p.read_text(encoding="utf-8"))["catalog"]
    assert after[0]["interoception_traits"] == ["propriocezione", "equilibrio_vestibolare", "nocicezione"]
    assert "interoception_traits" not in after[1]
    mtime = p.stat().st_mtime_ns
    assert d.main(["--apply", "--catalog", str(p)]) == 0  # idempotent: nothing to apply
```

- [ ] **Step 2: run -> FAIL.**
- [ ] **Step 3: implement** `PROV_TAG="d4-derived-rule"`, `CATALOG_PATH`, `apply_changes` (mirror `apply_interoception_traits.apply_changes`), `main(argv)` (mirror: dry-run default, `--apply` gate, `if not to_apply: return 0` before write, `json.dump(..., ensure_ascii=False, indent=2); f.write("\n")`).
- [ ] **Step 4: run -> PASS.** Also run the full combined ETL pytest.
- [ ] **Step 5: commit.**

### Task 3: regenerate the real catalog

**Files:** Modify `data/core/species/species_catalog.json` (generated, via tool -- NOT hand-edit).

- [ ] **Step 1:** dry-run `<py> tools/etl/derive_interoception_overrides.py` -> expect "33 to apply".
- [ ] **Step 2:** `<py> tools/etl/derive_interoception_overrides.py --apply`.
- [ ] **Step 3:** verify diff scoped -- `git diff data/core/species/species_catalog.json` shows ONLY added `interoception_traits` + `_provenance` lines (no other field churn); count `+ "interoception_traits"` == 33.
- [ ] **Step 4:** schema validates (jsonschema check from D4 PR); `derive ... --apply` re-run = "nothing to apply" (idempotent).
- [ ] **Step 5: commit** the regenerated catalog.

### Task 4: full regression + band-neutral

- [ ] **Step 1:** `PYTHONPATH=tools/py <py> -m pytest tests/ tools/py -q` -> green (catch any catalog-reading test reacting; re-baseline only if a snapshot legitimately reacts -- document it).
- [ ] **Step 2:** `node scripts/run-test-api.cjs` -> green (synergyCombo flake known; re-run once if it alone fails). Producer band-neutral: `sentience-interoception-grant` + `coopSentienceGrant` still green with flag OFF.
- [ ] **Step 3:** `npx prettier --check` touched JSON (catalog + any). Python ASCII-clean.

### Task 5: review + PR

- [ ] **Step 1:** compensating adversarial review (cavecrew-reviewer) of the tool+catalog diff (Codex rate-limited).
- [ ] **Step 2:** PR off origin/main. Note: catalog CHANGES (33 overrides) but band-neutral (flag OFF); touches `data/core` (regenerate-or-die honored: tool-generated) + the spec/plan/registry. master-dd manual merge (>50 LOC outside apps/backend). N=40 gates the D7 flip (owner).

## Self-review

- Spec coverage: rule (Task 1), write path (Task 2), populate (Task 3), regression/band-neutral (Task 4), review/PR (Task 5). All covered.
- No placeholders: all code shown.
- Type consistency: `tier_default`/`derive_override`/`plan_overrides`/`apply_changes`/`main` + `PROV_TAG` consistent across tasks; mirror `interoception_field` API (`INTEROCEPTION_TRAIT_IDS`, `filter_interoception`).
