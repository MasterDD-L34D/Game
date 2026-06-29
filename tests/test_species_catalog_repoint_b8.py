"""Regression tests for the B8-part-2 species.yaml -> species_catalog.json repoint.

data/core/species.yaml was removed in #2271. Three scripts still read it and,
because each swallows the missing file (returns {} / [] / exits 0), they
SILENTLY lose all species instead of crashing -- the "degraded" half of B8
(PR #3075 fixed the four BROKEN/crashing scripts):

  1. scripts/generator.py            -> dataset_species_total / species_with_trait_plan = 0
  2. scripts/build-idea-taxonomy.js  -> core species slugs absent from idea-taxonomy.json
  3. tools/py/validate_datasets.py   -> validate_species_ecology() a no-op (no entries)

Canonical SoT is data/core/species/species_catalog.json (top-level "catalog"
list; each entry keyed by species_id, biome_affinity same field, trait_refs
flat slug list, ecology block in the species_id namespace).

Mirrors tests/test_species_catalog_repoint.py (#3075, the BROKEN-script half).
"""

from __future__ import annotations

import importlib.util
import json
import subprocess
import sys
from pathlib import Path

import pytest

PROJECT_ROOT = Path(__file__).resolve().parents[1]
CATALOG_PATH = PROJECT_ROOT / "data" / "core" / "species" / "species_catalog.json"

# A catalog species_id that is NOT present in the packs species walk, so it can
# only appear downstream once the catalog is actually read.
SENTINEL_SPECIES_ID = "anguis_magnetica"
SENTINEL_SLUG = "anguis-magnetica"  # addSlug() turns "_" into "-"


def _load_module(name: str, rel_path: str):
    spec = importlib.util.spec_from_file_location(name, PROJECT_ROOT / rel_path)
    assert spec and spec.loader, rel_path
    module = importlib.util.module_from_spec(spec)
    # Register before exec so dataclasses can resolve cls.__module__ via sys.modules.
    sys.modules[name] = module
    spec.loader.exec_module(module)
    return module


@pytest.fixture(scope="module")
def catalog_species_ids() -> set[str]:
    data = json.loads(CATALOG_PATH.read_text(encoding="utf-8"))
    ids = {e["species_id"] for e in data["catalog"] if e.get("species_id")}
    assert SENTINEL_SPECIES_ID in ids, "sentinel must exist in the canonical catalog"
    return ids


# --- 1. scripts/generator.py -------------------------------------------------


def test_generator_load_species_dataset_reads_catalog(catalog_species_ids: set[str]) -> None:
    gen = _load_module("b8_generator", "scripts/generator.py")
    data_root = gen._normalize_data_root(gen.DEFAULT_DATA_ROOT)
    species = gen._load_species_dataset(data_root)
    assert species, "species dataset must NOT be silently empty"
    ids = {s.get("species_id") for s in species}
    assert ids == catalog_species_ids


def test_generator_profile_species_metrics_nonzero(tmp_path: Path) -> None:
    gen = _load_module("b8_generator", "scripts/generator.py")
    out = tmp_path / "profile.json"
    profile = gen.generate_profile(
        gen.DEFAULT_DATA_ROOT, gen.DEFAULT_MATRIX_PATH, None, out
    )
    metrics = profile["metrics"]
    assert metrics["dataset_species_total"] > 0
    assert metrics["species_with_trait_plan"] > 0


# Legacy fallback: mock/deploy snapshots (e.g. config/cli/generator.yaml ->
# data/derived/mock/prod_snapshot) still ship species.yaml without a catalog.
# The repoint must NOT crash there (Codex #3079 P2); mirror species_loader.

LEGACY_SNAPSHOT_YAML = (
    "species:\n"
    "  - id: legacy_one\n"
    "    biome_affinity: savana\n"
    "    trait_plan:\n"
    "      core: [t_a]\n"
)


def test_generator_falls_back_to_legacy_species_yaml(tmp_path: Path) -> None:
    gen = _load_module("b8_generator", "scripts/generator.py")
    (tmp_path / "species.yaml").write_text(LEGACY_SNAPSHOT_YAML, encoding="utf-8")
    data_root = gen._normalize_data_root(tmp_path)
    assert data_root == tmp_path
    species = gen._load_species_dataset(data_root)
    assert [s.get("id") for s in species] == ["legacy_one"]


def test_generator_profile_counts_legacy_trait_plan(tmp_path: Path) -> None:
    gen = _load_module("b8_generator", "scripts/generator.py")
    (tmp_path / "species.yaml").write_text(LEGACY_SNAPSHOT_YAML, encoding="utf-8")
    out = tmp_path / "p.json"
    profile = gen.generate_profile(tmp_path, gen.DEFAULT_MATRIX_PATH, None, out)
    metrics = profile["metrics"]
    assert metrics["dataset_species_total"] == 1
    assert metrics["species_with_trait_plan"] == 1  # legacy trait_plan mapping


def test_generator_real_snapshot_does_not_crash() -> None:
    snap = PROJECT_ROOT / "data" / "derived" / "mock" / "prod_snapshot"
    if not (snap / "species.yaml").exists():
        pytest.skip("prod_snapshot not present")
    gen = _load_module("b8_generator", "scripts/generator.py")
    species = gen._load_species_dataset(gen._normalize_data_root(snap))
    assert species, "legacy snapshot must load via species.yaml fallback"


# --- 2. scripts/build-idea-taxonomy.js --------------------------------------


def test_build_idea_taxonomy_includes_core_species() -> None:
    script = PROJECT_ROOT / "scripts" / "build-idea-taxonomy.js"
    out_file = PROJECT_ROOT / "docs" / "public" / "idea-taxonomy.json"
    original = out_file.read_bytes() if out_file.exists() else None
    try:
        proc = subprocess.run(
            ["node", str(script)],
            cwd=str(PROJECT_ROOT),
            capture_output=True,
            text=True,
            check=False,
        )
        assert proc.returncode == 0, proc.stderr
        data = json.loads(out_file.read_text(encoding="utf-8"))
        assert SENTINEL_SLUG in data["species"], "core catalog species lost"
        assert "species_catalog.json" in json.dumps(data["sources"]["species"])
    finally:
        # keep the working tree clean (script rewrites generatedAt every run)
        if original is not None:
            out_file.write_bytes(original)


# --- 3. tools/py/validate_datasets.py ---------------------------------------


def test_validate_datasets_collects_species_from_catalog(catalog_species_ids: set[str]) -> None:
    vd = _load_module("b8_validate_datasets", "tools/py/validate_datasets.py")
    entries = vd._collect_species_entries()
    assert entries, "ecology validator must NOT be a silent no-op"
    ids = {sid for sid, _, _ in entries}
    assert ids == catalog_species_ids
    # ecology block must be reachable for the ADR-2026-05-02 cross-ref validator
    assert any(isinstance(entry.get("ecology"), dict) for _, entry, _ in entries)
