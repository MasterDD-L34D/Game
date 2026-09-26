"""Task 0.1 -- build_species_trait_bridge deterministic + schema_version-aware.

Reproducibility fix (docs/guide/derived-artifacts-reproducibility.md): the bridge
must emit LF (not CRLF on Windows), preserve top-level key order (no global
re-sort of an EDITED index.json), and carry the schema_version wrapper on
species_affinity.json (the #2885 contract). A no-op regen must be byte-stable.

Run: PYTHONPATH=tools/py python -m pytest tests/test_build_species_trait_bridge.py
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(REPO_ROOT / "tools" / "py"))

import build_species_trait_bridge as b  # noqa: E402

PACK = REPO_ROOT / "packs" / "evo_tactics_pack" / "data" / "species"


def _run(tmp_path, schema_version="2.0"):
    out_aff = tmp_path / "species_affinity.json"
    if schema_version is not None:
        out_aff.write_text(
            json.dumps({"schema_version": schema_version}) + "\n", encoding="utf-8"
        )
    out_index = tmp_path / "index.json"
    # traits in deliberately NON-alphabetical order to detect a global re-sort.
    out_index.write_text(
        json.dumps(
            {
                "schema_version": "2.0",
                "traits": {"zzz_trait": {"id": "zzz_trait"}, "aaa_trait": {"id": "aaa_trait"}},
            },
            indent=2,
        )
        + "\n",
        encoding="utf-8",
    )
    rc = b.main(
        ["--species-root", str(PACK), "--trait-index", str(out_index), "--out-json", str(out_aff)]
    )
    assert rc == 0
    return out_aff, out_index


def test_affinity_lf_and_schema_version_first_then_sorted(tmp_path):
    out_aff, _ = _run(tmp_path)
    raw = out_aff.read_bytes()
    assert b"\r\n" not in raw, "must be LF, not CRLF"
    keys = list(json.loads(raw).keys())
    assert keys[0] == "schema_version", "schema_version must be the first key"
    traits = [k for k in keys if k != "schema_version"]
    assert traits == sorted(traits), "trait keys must be sorted"


def test_affinity_preserves_existing_schema_version(tmp_path):
    out_aff, _ = _run(tmp_path, schema_version="9.9")
    assert json.loads(out_aff.read_text(encoding="utf-8")).get("schema_version") == "9.9"


def test_affinity_default_schema_version_when_absent(tmp_path):
    out_aff, _ = _run(tmp_path, schema_version=None)
    assert json.loads(out_aff.read_text(encoding="utf-8")).get("schema_version") == "2.0"


def test_index_traits_order_preserved_not_resorted(tmp_path):
    _, out_index = _run(tmp_path)
    data = json.loads(out_index.read_text(encoding="utf-8"))
    assert b"\r\n" not in out_index.read_bytes(), "index must be LF"
    assert list(data["traits"].keys())[0] == "zzz_trait", "must NOT globally re-sort index traits"
