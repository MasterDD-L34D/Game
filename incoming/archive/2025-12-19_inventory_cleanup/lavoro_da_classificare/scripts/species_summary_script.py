#!/usr/bin/env python3
"""Generate a Markdown summary for the Evo species dataset."""
from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Dict, List, Tuple

ECOTYPE_SUFFIX = "_ecotypes.json"
CATALOG_FILENAME = "species_catalog.json"


def _load_species_payload(path: Path) -> Dict:
    with path.open("r", encoding="utf-8") as handle:
        data = json.load(handle)
    if not isinstance(data, dict) or "species" not in data:
        raise ValueError(f"File {path} does not contain a 'species' object")
    return data["species"]


def _load_ecotype_payload(path: Path) -> Dict:
    with path.open("r", encoding="utf-8") as handle:
        data = json.load(handle)
    if not isinstance(data, dict) or "ecotypes" not in data:
        raise ValueError(f"File {path} does not contain an 'ecotypes' list")
    return data


def _collect_dataset(root: Path) -> Tuple[List[Dict], Dict[str, Dict]]:
    species_payloads: List[Dict] = []
    ecotype_payloads: Dict[str, Dict] = {}

    for file_path in sorted(root.glob("*.json")):
        name = file_path.name
        if name == CATALOG_FILENAME:
            continue
        if name.endswith(ECOTYPE_SUFFIX):
            payload = _load_ecotype_payload(file_path)
            key = payload.get("species") or name.replace(ECOTYPE_SUFFIX, "")
            ecotype_payloads[key] = payload
            continue
        species_payloads.append(_load_species_payload(file_path))

    return species_payloads, ecotype_payloads


def _format_list(values: List[str]) -> str:
    if not values:
        return "—"
    return ", ".join(values)


def build_summary(input_dir: Path) -> str:
    species_entries, ecotype_entries = _collect_dataset(input_dir)
    total_species = len(species_entries)
    species_with_ecotypes = 0
    total_ecotypes = 0
    biome_classes = set()
    missing_ecotype_defs: List[str] = []

    lines: List[str] = []
    lines.append("# Evo Species Summary")
    lines.append("")
    lines.append(f"*Dataset directory*: `{input_dir}`")
    lines.append("")

    for payload in species_entries:
        sci_name = payload.get("scientific_name", "")
        ecotype_payload = ecotype_entries.get(sci_name) or ecotype_entries.get(sci_name.strip())
        if ecotype_payload:
            species_with_ecotypes += 1
            ecotypes = ecotype_payload.get("ecotypes", []) or []
            total_ecotypes += len(ecotypes)
            for entry in ecotypes:
                biome = entry.get("biome_class")
                if biome:
                    biome_classes.add(biome)
        else:
            missing_ecotype_defs.append(sci_name or "<unknown>")

    lines.append(f"- **Total species**: {total_species}")
    lines.append(f"- **Species with ecotype definitions**: {species_with_ecotypes}")
    lines.append(f"- **Total ecotypes**: {total_ecotypes}")
    if biome_classes:
        lines.append(f"- **Biome classes covered**: {', '.join(sorted(biome_classes))}")
    lines.append("")

    if missing_ecotype_defs:
        lines.append("> ⚠️ Ecotype definitions missing for: " + ", ".join(sorted(missing_ecotype_defs)))
        lines.append("")

    lines.append("## Species Overview")
    lines.append("")
    header = "| Scientific name | Common names | Macro class | Habitat | Ecotypes | Traits |"
    separator = "| --- | --- | --- | --- | --- | --- |"
    lines.append(header)
    lines.append(separator)

    for payload in species_entries:
        sci_name = payload.get("scientific_name", "—")
        common = _format_list(payload.get("common_names", []))
        macro_class = payload.get("classification", {}).get("macro_class", "—")
        habitat = payload.get("classification", {}).get("habitat", "—")
        traits = payload.get("trait_refs", []) or []
        ecotype_labels = payload.get("ecotypes", []) or []
        lines.append(
            f"| {sci_name} | {common} | {macro_class} | {habitat} | {len(ecotype_labels)} ({_format_list(ecotype_labels)}) | {len(traits)} |"
        )

    lines.append("")

    if ecotype_entries:
        lines.append("## Ecotype Details")
        lines.append("")
        for sci_name, payload in sorted(ecotype_entries.items()):
            lines.append(f"### {sci_name}")
            ecotypes = payload.get("ecotypes", []) or []
            if not ecotypes:
                lines.append("- No ecotypes defined")
                lines.append("")
                continue
            for entry in ecotypes:
                label = entry.get("label", "Unnamed ecotype")
                biome = entry.get("biome_class", "—")
                traits = entry.get("trait_adjustments", []) or []
                lines.append(f"- **{label}** — biome: `{biome}`, trait adjustments: {len(traits)}")
            lines.append("")

    return "\n".join(lines).strip() + "\n"


def main() -> None:
    parser = argparse.ArgumentParser(description="Generate a Markdown summary for Evo species JSON datasets.")
    parser.add_argument("--input", type=str, required=True, help="Directory containing the species JSON payloads.")
    parser.add_argument("--output", type=str, required=True, help="Path where the Markdown summary will be written.")
    args = parser.parse_args()

    input_dir = Path(args.input).resolve()
    if not input_dir.exists() or not input_dir.is_dir():
        raise SystemExit(f"Input directory not found: {input_dir}")

    summary = build_summary(input_dir)
    output_path = Path(args.output)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(summary, encoding="utf-8")
    print(f"Wrote species summary for {input_dir} to {output_path}")


if __name__ == "__main__":
    main()
