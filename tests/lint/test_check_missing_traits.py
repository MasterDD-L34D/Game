"""Test 2-tier existence gate -- tools/py/check_missing_traits.py.

Tier-1 FAIL = phantom (trait in nessun registro). Tier-2 WARN = esiste in
glossary ma non in active_effects (non-combat), o specie senza trait_refs.
`--combat-strict` ri-promuove i Tier-2 a FAIL (audit combat legacy).
"""
import json
import subprocess
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
SCRIPT = REPO_ROOT / "tools/py/check_missing_traits.py"


def _run(args):
    return subprocess.run(
        [sys.executable, str(SCRIPT), *args],
        capture_output=True,
        text=True,
        cwd=REPO_ROOT,
    )


def _fixtures(tmp_path, trait_refs):
    """Catalog + active_effects (t_combat only) + glossary (t_combat + t_glossary_only)."""
    catalog = tmp_path / "catalog.json"
    catalog.write_text(json.dumps({"catalog": [{"species_id": "s1", "trait_refs": trait_refs}]}))
    active = tmp_path / "active_effects.yaml"
    active.write_text("traits:\n  t_combat:\n    tier: T1\n")
    glossary = tmp_path / "glossary.json"
    glossary.write_text(json.dumps({"traits": {"t_combat": {}, "t_glossary_only": {}}}))
    return ["--species", str(catalog), "--trait-reference", str(active), "--glossary", str(glossary)]


def test_phantom_ref_fails_strict(tmp_path):
    # Trait in nessun registro -> Tier-1 FAIL anche in default --strict.
    r = _run([*_fixtures(tmp_path, ["t_phantom"]), "--strict"])
    assert r.returncode == 1, r.stderr
    assert "phantom" in (r.stderr + r.stdout)


def test_glossary_only_warns_not_fails(tmp_path):
    # Esiste in glossary, non in active_effects -> Tier-2 WARN, exit 0.
    r = _run([*_fixtures(tmp_path, ["t_glossary_only"]), "--strict"])
    assert r.returncode == 0, r.stderr
    assert "WARN" in r.stderr and "t_glossary_only" in r.stderr


def test_combat_strict_escalates_to_fail(tmp_path):
    # --combat-strict ri-promuove il non-combat a FAIL (audit legacy).
    r = _run([*_fixtures(tmp_path, ["t_glossary_only"]), "--combat-strict", "--strict"])
    assert r.returncode == 1, r.stderr


def test_real_catalog_strict_is_clean(tmp_path):
    # Il vero gate: tutti i trait_refs del catalog esistono in glossary OR
    # active_effects -> default --strict deve uscire 0 (i 17 non-combat = WARN).
    r = _run(["--strict"])
    assert r.returncode == 0, f"gate non pulito (phantom ref reale?):\n{r.stderr}"
