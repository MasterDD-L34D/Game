#!/usr/bin/env python3
"""Validation pipeline for the Frattura Abissale Sinaptica dataset.

This script checks the cross-dataset coherence requested in the archivist/execution
plan: biome registration, aliases/terraform bands, pool integrity, trait presence,
species trait plans, and affinity alignment. It intentionally runs fast and in a
single pass so it can be orchestrated by run_frattura_abissale_pipeline.sh.
"""
from __future__ import annotations

import json
import sys
from collections import Counter
from pathlib import Path
from typing import Iterable, Mapping

import yaml

ROOT = Path(__file__).resolve().parents[2]

BIOME_SLUG = "frattura_abissale_sinaptica"
POOL_IDS = [
    "fotofase_synaptic_ridge",
    "crepuscolo_synapse_bloom",
    "frattura_void_choir",
]
SPECIES_IDS = [
    "polpo-araldo-sinaptico",
    "sciame-larve-neurali",
    "leviatano-risonante",
    "simbionte-corallino-riflesso",
]
TEMP_TRAITS = [
    "scintilla_sinaptica",
    "riverbero_memetico",
    "pelle_piezo_satura",
    "canto_risonante",
    "vortice_nera_flash",
]


def load_json(path: str | Path) -> dict:
    with open(ROOT / path, "r", encoding="utf-8") as handle:
        return json.load(handle)


def load_yaml(path: str | Path):
    with open(ROOT / path, "r", encoding="utf-8") as handle:
        return yaml.safe_load(handle)


def assert_true(condition: bool, message: str):
    if not condition:
        raise SystemExit(message)


def check_biome_and_aliases():
    biomes = load_yaml("data/core/biomes.yaml")
    biome_map = biomes.get("biomes", {}) or {}
    ids = list(biome_map.keys()) if isinstance(biome_map, dict) else []
    assert_true(BIOME_SLUG in ids, f"Biome {BIOME_SLUG} non presente in biomes.yaml")

    aliases = load_yaml("data/core/biome_aliases.yaml")
    alias_map = aliases.get("aliases", {}) or {}
    alias_targets = {val.get("canonical") for val in alias_map.values() if isinstance(val, dict)}
    assert_true(BIOME_SLUG in alias_targets, "Alias mancante per il bioma")

    terraform = load_yaml("biomes/terraforming_bands.yaml")
    profiles = terraform.get("profiles", {}) or {}
    assert_true(
        BIOME_SLUG in profiles,
        "Terraforming bands mancanti per il bioma",
    )


def check_pools_and_traits(index: Mapping[str, dict]):
    pools = load_json("data/core/traits/biome_pools.json")
    for pool_id in POOL_IDS:
        pool = next((p for p in pools.get("pools", []) if p.get("id") == pool_id), None)
        assert_true(pool is not None, f"Pool {pool_id} non trovato")
        traits = list(pool.get("traits", {}).get("core", [])) + list(pool.get("traits", {}).get("support", []))
        for slug in traits:
            assert_true(slug in index, f"Trait {slug} del pool {pool_id} non in index")


def flatten_trait_plan(species_entry: Mapping) -> Iterable[str]:
    plan = species_entry.get("trait_plan", {}) or {}
    for bucket in ("core", "support", "optional"):
        for slug in plan.get(bucket, []) or []:
            yield slug


def check_species_and_affinity(index: Mapping[str, dict]):
    species_data = load_yaml("data/core/species.yaml")
    species_map = {entry.get("id"): entry for entry in species_data.get("species", []) if entry.get("id")}
    for sid in SPECIES_IDS:
        entry = species_map.get(sid)
        assert_true(entry is not None, f"Specie {sid} mancante")
        assert_true(
            entry.get("biome_affinity") == BIOME_SLUG,
            f"Specie {sid} con biome_affinity errato",
        )
        for trait in flatten_trait_plan(entry):
            assert_true(trait in index, f"Trait {trait} del trait_plan di {sid} non in index")

    affinity = load_json("data/traits/species_affinity.json")
    affinity_ids = {
        entry.get("species_id")
        for values in affinity.values()
        if isinstance(values, list)
        for entry in values
        if isinstance(entry, dict) and entry.get("species_id")
    }
    for sid in SPECIES_IDS:
        assert_true(sid in affinity_ids, f"species_affinity non include {sid}")


def check_temp_traits(index: Mapping[str, dict]):
    for slug in TEMP_TRAITS:
        assert_true(slug in index, f"Trait temporaneo {slug} non presente in index")


def check_duplicates(index: Mapping[str, dict]):
    counts = Counter(index.keys())
    dupes = [slug for slug, count in counts.items() if count > 1]
    assert_true(not dupes, f"Slug duplicati in index: {dupes}")


def main():
    index_data = load_json("data/traits/index.json").get("traits", {})
    check_biome_and_aliases()
    check_pools_and_traits(index_data)
    check_temp_traits(index_data)
    check_species_and_affinity(index_data)
    check_duplicates(index_data)
    print("Frattura Abissale Sinaptica: validazioni passate")


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:  # noqa: BLE001 - surface clean error to caller
        import traceback

        traceback.print_exc()
        sys.stderr.write(f"[ERROR] {exc}\n")
        sys.exit(1)
