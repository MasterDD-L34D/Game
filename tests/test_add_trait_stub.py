"""Phase 1.5 -- add_trait_stub: atomic, deterministic trait-add through the iter.

Authoring a trait is CI-coupled to derived-sync: the per-trait DB file id must also
appear (as a full schema entry) in index.json.traits, and the glossary may need an
entry. This helper does the deterministic part in one step (no fabrication: design
fields empty + design_stub flag; derived from active_effects + glossary).

Run: PYTHONPATH=tools/py python -m pytest tests/test_add_trait_stub.py
"""

from __future__ import annotations

import json
import shutil
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(REPO_ROOT / "tools" / "py"))

import add_trait_stub as a  # noqa: E402

AE = REPO_ROOT / "data/core/traits/active_effects.yaml"


def _setup(tmp_path, index_traits=None):
    tdir = tmp_path / "traits"
    tdir.mkdir()
    idx = tmp_path / "index.json"
    idx.write_text(
        json.dumps({"schema_version": "2.0", "traits": index_traits or {}}, indent=2) + "\n",
        encoding="utf-8",
    )
    glos = tmp_path / "glossary.json"
    shutil.copyfile(REPO_ROOT / "data/core/traits/glossary.json", glos)
    return tdir, idx, glos


def test_build_stub_entry_derives_and_leaves_design_empty():
    ae = {"tier": "T3", "category": "mentale", "description_it": "Corteccia che anticipa. Extra."}
    entry = a.build_stub_entry("cervello_predittivo", ae, {"label_it": "Cervello Predittivo"})
    assert entry["id"] == "cervello_predittivo"
    # all free-text fields are i18n refs (trait style guide --fail-on error)
    assert entry["label"] == "i18n:traits.cervello_predittivo.label"
    assert entry["uso_funzione"] == "i18n:traits.cervello_predittivo.uso_funzione"
    assert entry["tier"] == "T3"  # from active_effects, NOT guessed
    assert "/" in entry["famiglia_tipologia"]  # schema requires Family/Subtype
    assert entry["slot"] == [] and entry["sinergie"] == [] and entry["conflitti"] == []
    assert entry["completion_flags"]["design_stub"] is True
    # trait_template_validator requirements (stricter than the schema gate):
    assert "-" not in entry["data_origin"], "data_origin must be a slug (^[a-z0-9_]+$)"
    assert all(isinstance(v, bool) for v in entry["completion_flags"].values()), "flags boolean-only"
    assert entry["mutazione_indotta"] and entry["spinta_selettiva"], "must be non-empty"


def test_apply_writes_pertrait_file_in_mapped_dir_and_gate_passes(tmp_path):
    tdir, idx, glos = _setup(tmp_path)
    res = a.apply(["ferocia"], traits_dir=tdir, index_path=idx, glossary_path=glos, active_effects_path=AE)
    # ferocia category=comportamentale -> strategia dir
    f = tdir / a.CATEGORY_DIR["comportamentale"] / "ferocia.json"
    assert f.exists(), "per-trait file written in mapped dir"
    assert "ferocia" in res["written"]
    # gate-valid
    sys.path.insert(0, str(REPO_ROOT / "tools" / "lint"))
    import trait_schema_gate as g
    assert g.main(["--check", str(f)]) == 0


def test_apply_inserts_full_index_entry(tmp_path):
    tdir, idx, glos = _setup(tmp_path)
    a.apply(["ferocia"], traits_dir=tdir, index_path=idx, glossary_path=glos, active_effects_path=AE)
    traits = json.loads(idx.read_text(encoding="utf-8"))["traits"]
    assert "ferocia" in traits, "id must be in index.json.traits (coverage)"
    assert traits["ferocia"]["tier"] and traits["ferocia"]["famiglia_tipologia"], "full entry, not bare key"


def test_apply_is_idempotent(tmp_path):
    tdir, idx, glos = _setup(tmp_path)
    a.apply(["ferocia"], traits_dir=tdir, index_path=idx, glossary_path=glos, active_effects_path=AE)
    before = idx.read_bytes()
    res2 = a.apply(["ferocia"], traits_dir=tdir, index_path=idx, glossary_path=glos, active_effects_path=AE)
    assert idx.read_bytes() == before, "re-run is byte-identical"
    assert "ferocia" in res2["skipped"]


def test_apply_adds_glossary_entry_for_interoception(tmp_path):
    tdir, idx, glos = _setup(tmp_path)
    # nocicezione: in active_effects, NOT in glossary -> helper must add a glossary entry
    a.apply(["nocicezione"], traits_dir=tdir, index_path=idx, glossary_path=glos, active_effects_path=AE)
    gtraits = json.loads(glos.read_text(encoding="utf-8"))["traits"]
    assert "nocicezione" in gtraits, "interoception trait gets a glossary entry"
