#!/usr/bin/env python3
"""
check_biome_feature.py

Script di supporto per validare la coerenza di una feature Bioma + Specie + Trait.

NON modifica file.
Lavora in sola lettura e restituisce un report di problemi/warning.

Uso:
    python tools/traits/check_biome_feature.py --biome frattura_abissale_sinaptica --dry-run --verbose
"""

import argparse
import importlib.util
import json
import sys
from pathlib import Path

yaml_spec = importlib.util.find_spec("yaml")
if yaml_spec:
    import yaml  # type: ignore
else:
    yaml = None  # type: ignore


ROOT = Path(__file__).resolve().parents[2]  # presumendo tools/traits dentro repo root/tools/traits


def load_json(path: Path):
    if not path.exists():
        return None, f"File JSON mancante: {path}"
    try:
        return json.loads(path.read_text(encoding="utf-8")), None
    except Exception as e:  # noqa: BLE001
        return None, f"Errore parsing JSON {path}: {e}"


def load_yaml(path: Path):
    if not path.exists():
        return None, f"File YAML mancante: {path}"
    if yaml is None:
        return None, f"PyYAML non disponibile, impossibile parse YAML {path}"
    try:
        return yaml.safe_load(path.read_text(encoding="utf-8")), None
    except Exception as e:  # noqa: BLE001
        return None, f"Errore parsing YAML {path}: {e}"


def check_biome_feature(biome_slug: str, verbose: bool = False):
    """
    Esegue controlli base su:
    - biomi
    - biome_pools
    - trait index/glossary
    - species/species_affinity
    """

    issues = []
    warnings = []

    # Percorsi chiave (adatta se il layout cambia)
    biomes_path = ROOT / "data/core/biomes.yaml"
    biome_aliases_path = ROOT / "data/core/biome_aliases.yaml"
    biome_pools_path = ROOT / "data/core/traits/biome_pools.json"
    glossary_path = ROOT / "data/core/traits/glossary.json"
    index_path = ROOT / "data/traits/index.json"
    species_affinity_path = ROOT / "data/traits/species_affinity.json"
    species_path = ROOT / "data/core/species.yaml"

    # Caricamenti
    biomes, err = load_yaml(biomes_path)
    if err:
        issues.append(err)

    biome_aliases, err = load_yaml(biome_aliases_path)
    if err:
        warnings.append(err)

    biome_pools, err = load_json(biome_pools_path)
    if err:
        issues.append(err)

    glossary, err = load_json(glossary_path)
    if err:
        issues.append(err)

    index, err = load_json(index_path)
    if err:
        issues.append(err)

    species_affinity, err = load_json(species_affinity_path)
    if err:
        warnings.append(err)  # alcune repo potrebbero non usarlo

    species, err = load_yaml(species_path)
    if err:
        issues.append(err)

    if issues:
        return issues, warnings  # problemi strutturali blocca-tutto

    # 1) Bioma esiste?
    if not isinstance(biomes, dict) or "biomes" not in biomes:
        issues.append("Struttura biomes.yaml inattesa: manca chiave 'biomes'.")
    else:
        if biome_slug not in biomes["biomes"]:
            issues.append(f"Bioma '{biome_slug}' non trovato in data/core/biomes.yaml.")

    # 2) Pools per il bioma esistono?
    pools_for_biome = []
    if biome_pools and isinstance(biome_pools, dict) and "pools" in biome_pools:
        for pool in biome_pools["pools"]:
            if isinstance(pool, dict) and "id" in pool and biome_slug in json.dumps(pool):
                pools_for_biome.append(pool["id"])
    if verbose:
        print(f"[INFO] Pools che citano '{biome_slug}': {pools_for_biome}")

    # 3) Trait definiti vs trait nel pool / trait_plan specie
    trait_ids_glossary = set(glossary.get("traits", {}).keys()) if glossary else set()
    trait_ids_index = set(index.get("traits", {}).keys()) if index else set()
    trait_ids_known = trait_ids_glossary | trait_ids_index

    missing_traits = set()

    # dai pool
    if biome_pools and isinstance(biome_pools, dict) and "pools" in biome_pools:
        for pool in biome_pools["pools"]:
            if pool.get("id") in pools_for_biome:
                for section in ("core", "support"):
                    for trait_id in pool.get("traits", {}).get(section, []):
                        if trait_id not in trait_ids_known:
                            missing_traits.add(trait_id)

    # dalle species
    if isinstance(species, dict) and "species" in species:
        for spc in species["species"]:
            if spc.get("biome_affinity") == biome_slug:
                trait_plan = spc.get("trait_plan", {})
                for section in ("core", "optional", "temp"):
                    for trait_id in trait_plan.get(section, []):
                        if trait_id not in trait_ids_known:
                            missing_traits.add(trait_id)

    if missing_traits:
        issues.append(
            f"Slug trait usati ma non trovati in glossary/index: {sorted(missing_traits)}"
        )

    # 4) Species ↔ biome_affinity
    species_for_biome = []
    if isinstance(species, dict) and "species" in species:
        for spc in species["species"]:
            if spc.get("biome_affinity") == biome_slug:
                species_for_biome.append(spc.get("id"))
    if not species_for_biome:
        warnings.append(f"Nessuna species con biome_affinity='{biome_slug}' trovata.")
    elif verbose:
        print(f"[INFO] Species con biome_affinity={biome_slug}: {species_for_biome}")

    # 5) species_affinity coerenza (se presente)
    if species_affinity and isinstance(species_affinity, dict):
        for trait_id, entries in species_affinity.items():
            for entry in entries:
                species_id = entry.get("species_id")
                if species_id and species_id not in species_for_biome:
                    # warning, non necessariamente errore
                    warnings.append(
                        f"species_affinity: trait '{trait_id}' associato a species_id '{species_id}' "
                        f"che non ha biome_affinity={biome_slug}."
                    )

    return issues, warnings


def main():
    parser = argparse.ArgumentParser(
        description="Check coerenza per feature Bioma + Specie + Trait."
    )
    parser.add_argument("--biome", required=True, help="Slug del bioma da controllare")
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Flag decorativo: lo script NON modifica comunque nessun file.",
    )
    parser.add_argument(
        "--verbose",
        action="store_true",
        help="Stampa dettagli aggiuntivi sui controlli.",
    )
    args = parser.parse_args()

    issues, warnings = check_biome_feature(args.biome, verbose=args.verbose)

    if args.verbose:
        print("\n=== RISULTATO CHECK BIOME FEATURE ===")

    if issues:
        print("\n[ERROR] Problemi riscontrati:")
        for issue in issues:
            print(f"  - {issue}")
    else:
        print("\n[OK] Nessun problema bloccante rilevato.")

    if warnings:
        print("\n[WARN] Warning da valutare:")
        for warning in warnings:
            print(f"  - {warning}")

    if issues:
        sys.exit(1)
    sys.exit(0)


if __name__ == "__main__":
    main()
