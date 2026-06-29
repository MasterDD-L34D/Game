"""Regression tests for scripts/evo_pack_pipeline.py :: sync_core.

Guards the post-#2271 foot-gun: data/core/species.yaml was removed and
data/core/species/ is a FLAT tree (lifecycle YAMLs + species_catalog.json),
while packs/evo_tactics_pack/data/species/ is a BIOME-SUBDIR tree authored
in-pack (gen_retired_creature_specs.py, codex_draft_scaffold.py) and consumed
by run_all_validators.py / derive_env_traits. sync_core MUST NOT copy the flat
core species over the pack biome tree (that rmtree+overwrite corrupts the pack),
and a single missing core source MUST NOT crash the whole pipeline.

Run: python -m pytest tests/scripts/test_evo_pack_pipeline_sync_core.py
"""

from __future__ import annotations

import sys
from pathlib import Path

import pytest

REPO_ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(REPO_ROOT / "scripts"))

import evo_pack_pipeline as pipeline  # noqa: E402


def _make_core(core_root: Path, *, include: set[str]) -> None:
    """Build a fake data/core layout. `include` selects which sources exist.

    Mirrors reality post-#2271: no species.yaml; species/ is FLAT.
    """
    core_root.mkdir(parents=True, exist_ok=True)
    if "biomes" in include:
        (core_root / "biomes.yaml").write_text("biomes: core\n", encoding="utf-8")
    if "biome_aliases" in include:
        (core_root / "biome_aliases.yaml").write_text("aliases: core\n", encoding="utf-8")
    if "telemetry" in include:
        (core_root / "telemetry.yaml").write_text("telemetry: core\n", encoding="utf-8")
    if "mating" in include:
        (core_root / "mating.yaml").write_text("mating: core\n", encoding="utf-8")
    if "species_dir" in include:
        sp = core_root / "species"
        sp.mkdir(parents=True, exist_ok=True)
        (sp / "dune_stalker_lifecycle.yaml").write_text("id: dune_stalker\n", encoding="utf-8")
        (sp / "species_catalog.json").write_text("{}\n", encoding="utf-8")


def _make_pack(pack_root: Path) -> None:
    """Build a fake pack with an authored biome-subdir species tree."""
    biome_dir = pack_root / "data" / "species" / "badlands"
    biome_dir.mkdir(parents=True, exist_ok=True)
    (biome_dir / "rust_scavenger.yaml").write_text("id: rust_scavenger\n", encoding="utf-8")


def test_preserves_authored_pack_species_tree(tmp_path):
    """sync_core must leave the pack biome tree intact and never inject flat
    core species files into pack/data/species (no corruption)."""
    core_root = tmp_path / "core"
    pack_root = tmp_path / "pack"
    _make_core(core_root, include={"biomes", "biome_aliases", "telemetry", "mating", "species_dir"})
    _make_pack(pack_root)

    pipeline.sync_core(core_root, pack_root)  # must not raise

    pack_species = pack_root / "data" / "species"
    # authored biome file survived
    survivor = pack_species / "badlands" / "rust_scavenger.yaml"
    assert survivor.exists(), "authored pack biome species file was destroyed"
    assert survivor.read_text(encoding="utf-8") == "id: rust_scavenger\n"
    # flat core species files were NOT copied into the pack tree
    assert not (pack_species / "dune_stalker_lifecycle.yaml").exists()
    assert not (pack_species / "species_catalog.json").exists()
    # the removed species.yaml mapping must not resurrect a pack/data/species.yaml
    assert not (pack_root / "data" / "species.yaml").exists()


def test_syncs_present_core_files(tmp_path):
    """The legitimate file sources still mirror core -> pack."""
    core_root = tmp_path / "core"
    pack_root = tmp_path / "pack"
    _make_core(core_root, include={"biomes", "biome_aliases", "telemetry", "mating", "species_dir"})
    _make_pack(pack_root)

    pipeline.sync_core(core_root, pack_root)

    data = pack_root / "data"
    assert (data / "biomes.yaml").read_text(encoding="utf-8") == "biomes: core\n"
    assert (data / "biome_aliases.yaml").read_text(encoding="utf-8") == "aliases: core\n"
    assert (data / "telemetry.yaml").read_text(encoding="utf-8") == "telemetry: core\n"
    assert (data / "mating.yaml").read_text(encoding="utf-8") == "mating: core\n"


def test_missing_required_source_raises(tmp_path):
    """A missing REQUIRED core source must fail loudly. Skipping would let a
    misspelled --core-root silently reuse stale pack data and still emit
    success/manifests (Codex P2 on PR #3078). The pre-check also runs before
    any copy, so no partial sync happens on error."""
    core_root = tmp_path / "core"
    pack_root = tmp_path / "pack"
    # telemetry.yaml intentionally absent
    _make_core(core_root, include={"biomes", "biome_aliases", "mating", "species_dir"})
    _make_pack(pack_root)

    with pytest.raises(pipeline.PipelineError):
        pipeline.sync_core(core_root, pack_root)

    # fail-before-mutation: nothing synced when a required source is missing
    assert not (pack_root / "data" / "biomes.yaml").exists()


def test_all_species_mappings_dropped():
    """Structural guard: sync_core source code must not map data/core/species*
    into the pack (prevents anyone re-introducing the corruption mapping)."""
    import inspect

    src = inspect.getsource(pipeline.sync_core)
    assert '"species.yaml"' not in src, "species.yaml mapping reintroduced"
    assert 'core_root / "species"' not in src, "core species-dir mapping reintroduced"
