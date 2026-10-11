"""CI guard species ecology block (ADR-2026-05-02 + ADR-2026-05-15 Phase 4c.6).

Background: la PR pulverator-ecology-2026-05-02 introduce un blocco
``ecology`` opzionale per codificare food web + pack size + mutualismi
machine-readable. Questo test garantisce che:

1. Pulverator gregarius esista nel canonical species catalog
   con tutti i campi richiesti (id, ecology.trophic_tier, pack_size).
2. Ogni species_id citato nei sotto-campi
   ``prey_of / preys_on / competes_with / scavenges_from /
   mutualism_with[].species_id`` referenzi una entry esistente
   (no orphan refs).
3. La consistenza bidirectional regge: A.preys_on -> B implica
   B.prey_of -> A.
4. La regola self-reference forbidden non sia violata.

ADR-2026-05-15 Phase 4c.6 migration: data/core/species.yaml +
species_expansion.yaml RIMOSSI. Canonical SOT = data/core/species/
species_catalog.json (catalog v0.4.x con ecology field preserved via
ETL legacy YAML absorb). Historical snapshot in
docs/archive/historical-snapshots/2026-05-15_species-deprecation/.

Run: ``PYTHONPATH=tools/py pytest tests/scripts/test_species_validator.py``
Wirato anche tramite ``python3 tools/py/game_cli.py validate-datasets``
(CI dataset-checks).
"""

from __future__ import annotations

import sys
from pathlib import Path

import pytest

REPO_ROOT = Path(__file__).resolve().parents[2]

# Ensure tools/py importable regardless of pytest discovery.
sys.path.insert(0, str(REPO_ROOT / "tools" / "py"))


@pytest.fixture(scope="module")
def species_entries() -> list[dict]:
    """Flat list di tutte le species via Phase 4c canonical loader.

    Catalog primary (data/core/species/species_catalog.json v0.4.x) +
    YAML fallback (deprecated, files removed Phase 4c.6).
    """
    from lib.species_loader import load_species_canonical
    species_list, _src = load_species_canonical()
    # Filter dicts only (loader normalizes shape)
    return [e for e in species_list if isinstance(e, dict)]


@pytest.fixture(scope="module")
def species_index(species_entries: list[dict]) -> dict[str, dict]:
    return {e["id"]: e for e in species_entries if isinstance(e, dict) and e.get("id")}


def test_pulverator_gregarius_present(species_index: dict[str, dict]) -> None:
    assert "pulverator_gregarius" in species_index, (
        "Pulverator gregarius deve essere presente in species_expansion.yaml "
        "(ADR-2026-05-02)"
    )
    entry = species_index["pulverator_gregarius"]
    assert entry.get("genus") == "Pulverator"
    assert entry.get("epithet") == "gregarius"
    assert entry.get("biome_affinity") == "savana"
    ecology = entry.get("ecology")
    assert isinstance(ecology, dict), "Pulverator deve avere blocco ecology"
    assert ecology.get("trophic_tier") == "apex"
    pack = ecology.get("pack_size") or {}
    assert pack.get("min") == 3 and pack.get("max") == 5, (
        "Pulverator pack size canonical 3-5 (signature Howl-Strike combo)"
    )
    assert "dune_stalker" in (ecology.get("competes_with") or [])
    assert "dune_stalker" in (ecology.get("scavenges_from") or [])


def test_dune_stalker_ecology_backfill(species_index: dict[str, dict]) -> None:
    """dune_stalker deve avere ecology backfillato per chiudere la reciprocita'."""
    entry = species_index.get("dune_stalker")
    assert entry is not None, "dune_stalker deve esistere in species.yaml"
    ecology = entry.get("ecology")
    assert isinstance(ecology, dict), "dune_stalker deve avere blocco ecology"
    assert ecology.get("trophic_tier") == "apex"
    assert "pulverator_gregarius" in (ecology.get("competes_with") or []), (
        "dune_stalker.competes_with deve includere pulverator_gregarius "
        "(reciprocita' competizione apex savana)"
    )


def test_no_orphan_species_refs(species_index: dict[str, dict]) -> None:
    """Ogni species_id citato in ecology deve esistere come id reale."""
    valid_ids = set(species_index.keys())
    list_fields = ("prey_of", "preys_on", "competes_with", "scavenges_from")
    orphans: list[str] = []

    for sid, entry in species_index.items():
        ecology = entry.get("ecology")
        if not isinstance(ecology, dict):
            continue
        for field in list_fields:
            for ref in ecology.get(field, []) or []:
                if ref not in valid_ids:
                    orphans.append(f"{sid}.ecology.{field} -> {ref}")
        for idx, mut in enumerate(ecology.get("mutualism_with", []) or []):
            target = (mut or {}).get("species_id")
            if target and target not in valid_ids:
                orphans.append(f"{sid}.ecology.mutualism_with[{idx}].species_id -> {target}")

    assert orphans == [], f"Orphan species_id refs nel blocco ecology: {orphans}"


def test_no_self_references(species_index: dict[str, dict]) -> None:
    """species non puo' riferire se stessa nei campi ecology."""
    list_fields = ("prey_of", "preys_on", "competes_with", "scavenges_from")
    self_refs: list[str] = []

    for sid, entry in species_index.items():
        ecology = entry.get("ecology")
        if not isinstance(ecology, dict):
            continue
        for field in list_fields:
            if sid in (ecology.get(field, []) or []):
                self_refs.append(f"{sid}.ecology.{field} contiene se stessa")
        for idx, mut in enumerate(ecology.get("mutualism_with", []) or []):
            if (mut or {}).get("species_id") == sid:
                self_refs.append(f"{sid}.ecology.mutualism_with[{idx}] e' se stessa")

    assert self_refs == [], f"Self-references invalide: {self_refs}"


def test_bidirectional_preys_on_consistency(species_index: dict[str, dict]) -> None:
    """A.preys_on -> B implica B.prey_of -> A."""
    asymmetries: list[str] = []
    for sid, entry in species_index.items():
        ecology = entry.get("ecology")
        if not isinstance(ecology, dict):
            continue
        for prey_id in ecology.get("preys_on", []) or []:
            target = species_index.get(prey_id)
            if target is None:
                continue  # orphan caught dal test dedicato
            target_ecology = target.get("ecology") or {}
            target_prey_of = target_ecology.get("prey_of") or []
            if sid not in target_prey_of:
                asymmetries.append(
                    f"{sid}.preys_on contiene {prey_id} ma {prey_id}.prey_of "
                    f"non contiene {sid}"
                )
    assert asymmetries == [], (
        "Asimmetria bidirectional preys_on/prey_of: " + "; ".join(asymmetries)
    )


def test_pack_size_sane(species_index: dict[str, dict]) -> None:
    """pack_size.min <= pack_size.max e min >= 1."""
    bad: list[str] = []
    for sid, entry in species_index.items():
        ecology = entry.get("ecology")
        if not isinstance(ecology, dict):
            continue
        pack = ecology.get("pack_size")
        if pack is None:
            continue
        pmin = pack.get("min")
        pmax = pack.get("max")
        if not isinstance(pmin, int) or not isinstance(pmax, int):
            bad.append(f"{sid}: pack_size.min/max non int")
            continue
        if pmin < 1 or pmax < pmin:
            bad.append(f"{sid}: pack_size {pmin}-{pmax} non valido")
    assert bad == [], f"pack_size invalidi: {bad}"


def test_validate_datasets_passes() -> None:
    """L'integrazione con validate_datasets.py deve restare verde."""
    from validate_datasets import validate_species_ecology  # type: ignore

    errors = validate_species_ecology()
    assert errors == [], (
        "validate_species_ecology() ha emesso errori: " + "\n".join(errors)
    )
