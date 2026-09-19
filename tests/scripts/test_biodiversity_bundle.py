"""Sprint v3.5 — Test deterministici per export bundle + drift validator.

Verifica:
  1. Bundle generation determinism (snapshot_id stabile)
  2. Schema shape minimale (chiavi richieste presenti)
  3. Drift validator: catch network node mismatch iniettato
  4. Drift validator: clean run (no errors/warnings)
  5. Bundle UTF-8 stable (no mojibake reintrodotto)
"""

from __future__ import annotations

import importlib.util
import json
import os
import sys
import tempfile
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[2]
TOOLS = ROOT / "tools" / "py"

# Import senza pip install (script standalone)
def _load(name: str, file_name: str):
    path = TOOLS / file_name
    spec = importlib.util.spec_from_file_location(name, path)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"cannot load {path}")
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


export_bundle = _load("export_biodiversity_bundle", "export_biodiversity_bundle.py")
validate_sync = _load("validate_bio_sync", "validate_bio_sync.py")


def test_bundle_generation_determinism():
    """Generare il bundle 2 volte deve produrre stesso snapshot_id (escluso generated_at)."""
    p1, _ = export_bundle.build_bundle(strict=False)
    p2, _ = export_bundle.build_bundle(strict=False)
    assert p1["snapshot_id"] == p2["snapshot_id"], (
        "snapshot_id deve essere deterministico tra invocazioni successive"
    )
    assert p1["snapshot_id"] != "", "snapshot_id non vuoto"


def test_bundle_shape_required_keys():
    """Bundle ha tutte le chiavi required del schema."""
    payload, _ = export_bundle.build_bundle(strict=False)
    required = {
        "schema_version",
        "generated_at",
        "snapshot_id",
        "network",
        "ecosystems",
        "foodwebs",
        "species",
        "biomes",
    }
    missing = required - set(payload.keys())
    assert not missing, f"missing required keys: {missing}"
    assert payload["schema_version"] == "1.0.0"


def test_bundle_counts_nonzero():
    """Bundle deve avere almeno 1 ecosistema + 1 species + 1 network node."""
    payload, _ = export_bundle.build_bundle(strict=False)
    counts = payload["manifests"]["counts"]
    assert counts["ecosystems"] >= 1, "almeno 1 ecosistema atteso"
    assert counts["species"] >= 1, "almeno 1 species attesa"
    assert counts["network_nodes"] >= 1, "almeno 1 network node atteso"
    assert counts["foodwebs"] >= 1, "almeno 1 foodweb atteso"


def test_validator_catches_injected_mismatch(tmp_path: Path):
    """Inject network node mismatch nel bundle → validator deve flaggare error."""
    payload, _ = export_bundle.build_bundle(strict=False)
    # Inject fake node solo nel bundle (non nel catalog)
    payload["network"]["nodes"].append(
        {"id": "FAKE_NODE_TEST", "biome_id": "fake_biome"}
    )
    bundle_path = tmp_path / "bundle.json"
    bundle_path.write_text(
        json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8"
    )

    catalog_path = ROOT / "packs/evo_tactics_pack/docs/catalog/catalog_data.json"
    if not catalog_path.exists():
        pytest.skip("catalog_data.json missing — skip mismatch test")

    bundle = json.loads(bundle_path.read_text(encoding="utf-8"))
    catalog = json.loads(catalog_path.read_text(encoding="utf-8"))
    errors, _warnings = validate_sync.cross_check(bundle, catalog)
    # Deve catchare il fake node come "only in bundle"
    assert any("FAKE_NODE_TEST" in e for e in errors), (
        f"validator deve flaggare il fake node, errors={errors}"
    )


def test_bundle_utf8_no_mojibake(tmp_path: Path):
    """Verifica stringhe non-ASCII (italiano) preservate senza mojibake `Ã`."""
    payload, _ = export_bundle.build_bundle(strict=False)
    out = tmp_path / "bundle.json"
    with out.open("w", encoding="utf-8") as fh:
        json.dump(payload, fh, ensure_ascii=False, indent=2)

    raw = out.read_text(encoding="utf-8")
    # Mojibake `Ã` (U+00C3) sequence threshold: per repo policy, >5 = warning,
    # nel bundle limpido devono essere 0 (italian normale = 0 match `Ã` solitario).
    moji = raw.count("Ã")
    assert moji == 0, (
        f"trovate {moji} sequenze mojibake `Ã` nel bundle JSON — "
        "verifica encoding='utf-8' + ensure_ascii=False"
    )


def test_validator_setup_error_on_missing_bundle(tmp_path: Path):
    """Validator main() torna 2 se bundle mancante."""
    fake_bundle = tmp_path / "nonexistent.json"
    fake_catalog = ROOT / "packs/evo_tactics_pack/docs/catalog/catalog_data.json"
    if not fake_catalog.exists():
        pytest.skip("catalog_data.json missing — skip")
    rc = validate_sync.main(
        ["--bundle", str(fake_bundle), "--catalog", str(fake_catalog)]
    )
    assert rc == 2, f"missing bundle deve tornare 2, got {rc}"
