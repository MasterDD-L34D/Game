"""Phase 0.2/0.3 -- promote_gameplay_to_canon: --catalog/--out + stub-upgrade.

Fix the downgrade-on-rerun bug (docs/guide/derived-artifacts-reproducibility.md):
a species that gained a *_lifecycle.yaml gets a bare game-canonical-stub at the
merge stage; promote must UPGRADE that stub with its gameplay data (preserving
the lifecycle_yaml link) instead of skipping it. Richer entries are left
untouched. --catalog/--out make the (previously in-place-only) writer dry-testable.

Run: PYTHONPATH=tools/etl python -m pytest tests/test_promote_gameplay_to_canon.py
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(REPO_ROOT / "tools" / "etl"))

import promote_gameplay_to_canon as p  # noqa: E402

# echo_wing has BOTH packs/.../badlands/echo-wing.yaml and a lifecycle YAML, so a
# fresh merge stubs it and (pre-fix) promote skips it -> the downgrade case.
STUB = {
    "species_id": "echo_wing",
    "source": "game-canonical-stub",
    "lifecycle_yaml": "data/core/species/echo_wing_lifecycle.yaml",
    "sentience_index": "T1",
}


def _write_cat(tmp_path, entries):
    cp = tmp_path / "species_catalog.json"
    cp.write_text(
        json.dumps({"catalog": entries, "stats": {}}, ensure_ascii=False), encoding="utf-8"
    )
    return cp


def _entry(cat_path, sid):
    out = json.loads(cat_path.read_text(encoding="utf-8"))
    return next(e for e in out["catalog"] if e["species_id"] == sid)


def test_catalog_flag_writes_to_given_path(tmp_path):
    cp = _write_cat(tmp_path, [])
    assert p.main(["--biome", "badlands", "--catalog", str(cp)]) == 0
    out = json.loads(cp.read_text(encoding="utf-8"))
    assert any(e["species_id"] == "echo_wing" for e in out["catalog"]), "new species still added"


def test_promote_upgrades_bare_lifecycle_stub(tmp_path):
    cp = _write_cat(tmp_path, [dict(STUB)])
    p.main(["--biome", "badlands", "--catalog", str(cp)])
    ew = _entry(cp, "echo_wing")
    assert ew["source"] == "gameplay-promote", "bare stub must be upgraded, not skipped"
    assert ew.get("_promote_stub") is True
    assert ew["lifecycle_yaml"] == "data/core/species/echo_wing_lifecycle.yaml", "link preserved"
    out = json.loads(cp.read_text(encoding="utf-8"))
    assert sum(1 for e in out["catalog"] if e["species_id"] == "echo_wing") == 1, "no duplicate"


def test_promote_leaves_rich_entry_untouched(tmp_path):
    rich = {
        "species_id": "echo_wing",
        "source": "pack-v2-full-plus",
        "sentience_index": "T2",
        "scientific_name": "Echo wing",
        "lifecycle_yaml": "data/core/species/echo_wing_lifecycle.yaml",
    }
    cp = _write_cat(tmp_path, [rich])
    p.main(["--biome", "badlands", "--catalog", str(cp)])
    ew = _entry(cp, "echo_wing")
    assert ew["source"] == "pack-v2-full-plus", "richer non-stub entry untouched"
    assert ew["scientific_name"] == "Echo wing"


def test_out_flag_does_not_touch_input(tmp_path):
    cp = _write_cat(tmp_path, [])
    outp = tmp_path / "out.json"
    p.main(["--biome", "badlands", "--catalog", str(cp), "--out", str(outp)])
    assert outp.exists()
    assert json.loads(cp.read_text(encoding="utf-8"))["catalog"] == [], "input left untouched"
