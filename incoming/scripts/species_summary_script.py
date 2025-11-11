#!/usr/bin/env python3
"""
Species Summary Script for Evo‑Tactics

This script traverses a directory of species YAML files (e.g. `data/species` or `packs/evo_tactics_pack/data/species`) and extracts
basic information about each species into a CSV summary.  It is intended to help designers audit
and compare species definitions across biomes.

Usage:
  python species_summary_script.py --root <path-to-species-root> --output <output-csv>

The script expects each YAML file to contain fields defined by the Evo‑Tactics schema
(`id`, `display_name`, `biomes`, `role_trofico`, `functional_tags`, `morphotype`, `flags`,
`playable_unit`, and `derived_from_environment` with `suggested_traits` and `optional_traits`).
Missing fields are tolerated but logged.
"""
import argparse
import csv
import os
import sys
from pathlib import Path

try:
    import yaml  # PyYAML is required
except ImportError:
    print("PyYAML is required. Install with `pip install pyyaml`.", file=sys.stderr)
    sys.exit(1)

def extract_species_info(file_path: Path):
    """Parse a species YAML file and return a dict of key information."""
    with open(file_path, 'r', encoding='utf-8') as f:
        data = yaml.safe_load(f)
    info = {
        'id': data.get('id'),
        'display_name': data.get('display_name'),
        'biomes': ','.join(data.get('biomes', [])),
        'role_trofico': data.get('role_trofico'),
        'morphotype': data.get('morphotype'),
        'playable_unit': data.get('playable_unit', False),
    }
    flags = data.get('flags', {})
    for flag_name in ['apex', 'keystone', 'sentient', 'bridge', 'threat', 'event']:
        info[f'flag_{flag_name}'] = flags.get(flag_name, False)
    # Traits
    traits_section = data.get('derived_from_environment', {})
    info['suggested_traits'] = ','.join(traits_section.get('suggested_traits', []))
    info['optional_traits'] = ','.join(traits_section.get('optional_traits', []))
    return info

def walk_species_files(root_dir: Path):
    """Yield Path objects for all .yaml files under root_dir."""
    for path in root_dir.rglob('*.yaml'):
        yield path

def main():
    parser = argparse.ArgumentParser(description="Generate a species summary CSV from Evo‑Tactics YAML files.")
    parser.add_argument('--root', required=True, help='Root directory containing species YAML files')
    parser.add_argument('--output', required=True, help='Path to output CSV file')
    args = parser.parse_args()
    root_dir = Path(args.root)
    if not root_dir.exists():
        print(f"Error: root directory {root_dir} does not exist", file=sys.stderr)
        sys.exit(1)

    rows = []
    for yaml_file in walk_species_files(root_dir):
        try:
            info = extract_species_info(yaml_file)
            info['file'] = str(yaml_file.relative_to(root_dir))
            rows.append(info)
        except Exception as e:
            print(f"Error parsing {yaml_file}: {e}", file=sys.stderr)
    # Write CSV
    fieldnames = [
        'id', 'display_name', 'biomes', 'role_trofico', 'morphotype',
        'flag_apex', 'flag_keystone', 'flag_sentient', 'flag_bridge', 'flag_threat', 'flag_event',
        'playable_unit', 'suggested_traits', 'optional_traits', 'file'
    ]
    with open(args.output, 'w', newline='', encoding='utf-8') as outcsv:
        writer = csv.DictWriter(outcsv, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)
    print(f"Generated summary for {len(rows)} species.")

if __name__ == '__main__':
    main()
