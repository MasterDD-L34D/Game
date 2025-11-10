"""
species_summary_script.py
-------------------------

This utility script traverses the Evo‑Tactics repository to build a high‑level
summary of every species defined in the `species.yaml` index.  It extracts
core metadata from each species definition file – such as the species
identifier, display name, trophic role, morphotype, key flags (apex,
keystone, bridge, threat, event), whether the unit is playable, and the
lists of suggested and optional traits derived from the environment.

The script requires the `PyYAML` package to parse YAML files.  It does not
attempt to resolve localisation keys in the `description` fields; instead it
focuses on structural information that is useful for catalogue management
and quality audits.  Running the script produces a CSV file where each
species occupies a row and each extracted attribute is stored in its own
column.  Additional columns can be added as needed by extending the
``_extract_species_info`` helper.

Usage:

```
python species_summary_script.py \
  --root <path-to-repository-root> \
  --index packs/evo_tactics_pack/data/species.yaml \
  --output reports/species_summary.csv
```

The default values assume the script is executed from the root of the
repository.  If run from elsewhere, specify ``--root`` accordingly.

"""

import argparse
import csv
import os
from typing import Any, Dict, List, Optional

import yaml


def _extract_species_info(spec: Dict[str, Any], species_file_path: str) -> Dict[str, Any]:
    """Extract a subset of fields from a parsed species definition.

    Parameters
    ----------
    spec : Dict[str, Any]
        Parsed YAML content for the species.
    species_file_path : str
        Relative path to the species file.  Included for traceability.

    Returns
    -------
    Dict[str, Any]
        A dictionary of extracted values keyed by column names.
    """
    # Basic identifiers
    species_id = spec.get("id", "")
    display_name = spec.get("display_name", "")
    # Biomes are stored as a list; join with `|` for CSV readability
    biomes = "|".join(spec.get("biomes", []) or [])
    role = spec.get("role_trofico", "")
    morphotype = spec.get("morphotype", "")

    # Flags: ensure values default to False if missing
    flags: Dict[str, Any] = spec.get("flags", {})
    apex = bool(flags.get("apex", False))
    keystone = bool(flags.get("keystone", False))
    bridge = bool(flags.get("bridge", False))
    threat = bool(flags.get("threat", False))
    event = bool(flags.get("event", False))

    playable = bool(spec.get("playable_unit", False))

    # Traits suggestions
    derived = spec.get("derived_from_environment", {})
    suggested_traits = "|".join(derived.get("suggested_traits", []) or [])
    optional_traits = "|".join(derived.get("optional_traits", []) or [])

    return {
        "id": species_id,
        "display_name": display_name,
        "biomes": biomes,
        "role": role,
        "morphotype": morphotype,
        "apex": apex,
        "keystone": keystone,
        "bridge": bridge,
        "threat": threat,
        "event": event,
        "playable_unit": playable,
        "suggested_traits": suggested_traits,
        "optional_traits": optional_traits,
        "file": species_file_path,
    }


def build_species_summary(root: str, index_path: str) -> List[Dict[str, Any]]:
    """Parse the species index and each species file to assemble a summary.

    Parameters
    ----------
    root : str
        Root directory of the Evo‑Tactics repository.
    index_path : str
        Path to the YAML index listing species entries (relative to root).

    Returns
    -------
    List[Dict[str, Any]]
        List of dictionaries, one per species, containing the extracted fields.
    """
    index_full = os.path.join(root, index_path)
    with open(index_full, "r", encoding="utf-8") as f:
        index_data = yaml.safe_load(f)

    species_entries = index_data.get("species", []) or []
    summaries: List[Dict[str, Any]] = []

    for entry in species_entries:
        species_id = entry.get("id")
        rel_file = entry.get("file")
        if not rel_file:
            continue
        species_file_full = os.path.join(root, "packs/evo_tactics_pack/data", rel_file)
        if not os.path.exists(species_file_full):
            print(f"[WARN] Species file missing: {species_file_full}")
            continue
        with open(species_file_full, "r", encoding="utf-8") as sf:
            spec_data = yaml.safe_load(sf)
        summary = _extract_species_info(spec_data, rel_file)
        summaries.append(summary)

    return summaries


def write_csv(data: List[Dict[str, Any]], output_path: str) -> None:
    """Write a list of dictionaries to a CSV file.

    Parameters
    ----------
    data : List[Dict[str, Any]]
        Summarised species data.
    output_path : str
        Path to the output CSV file.
    """
    if not data:
        print("No data to write.")
        return
    fieldnames = list(data[0].keys())
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    with open(output_path, "w", newline="", encoding="utf-8") as csvfile:
        writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
        writer.writeheader()
        for row in data:
            writer.writerow(row)


def main() -> None:
    parser = argparse.ArgumentParser(description="Generate a CSV summary of Evo‑Tactics species.")
    parser.add_argument(
        "--root",
        type=str,
        default=".",
        help="Root directory of the repository (defaults to current working directory).",
    )
    parser.add_argument(
        "--index",
        type=str,
        default="packs/evo_tactics_pack/data/species.yaml",
        help="Relative path to the species index YAML file.",
    )
    parser.add_argument(
        "--output",
        type=str,
        default="reports/species_summary.csv",
        help="Path to the output CSV file.",
    )
    args = parser.parse_args()
    summary_data = build_species_summary(args.root, args.index)
    write_csv(summary_data, args.output)
    print(f"Wrote summary for {len(summary_data)} species to {args.output}")


if __name__ == "__main__":
    main()