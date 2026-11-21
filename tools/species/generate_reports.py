#!/usr/bin/env python3
"""Generate Evo species summary and ecotype mapping reports."""

from __future__ import annotations

import argparse
import json
from collections import Counter, defaultdict
from pathlib import Path
from typing import Dict, Iterable, List


def collect_species(root: Path) -> List[Dict[str, object]]:
    species: List[Dict[str, object]] = []
    for path in sorted(root.glob("*.json")):
        if path.name.startswith("species_catalog"):
            continue
        payload = json.loads(path.read_text(encoding="utf-8"))
        entry = payload.get("species")
        if isinstance(entry, dict):
            species.append(entry)
    return species


def summarise_species(records: Iterable[Dict[str, object]]) -> Dict[str, Counter]:
    macro_counter: Counter[str] = Counter()
    sentience_counter: Counter[str] = Counter()
    danger_counter: Counter[str] = Counter()
    habitat_counter: Counter[str] = Counter()
    for record in records:
        classification = record.get("classification", {}) or {}
        macro = classification.get("macro_class")
        if macro:
            macro_counter[macro] += 1
        habitat = classification.get("habitat")
        if habitat:
            habitat_counter[habitat] += 1
        sentience = record.get("sentience_index")
        if sentience:
            sentience_counter[sentience] += 1
        risk_profile = record.get("risk_profile") or {}
        danger = risk_profile.get("danger_level")
        if danger is not None:
            danger_counter[str(danger)] += 1
    return {
        "macro": macro_counter,
        "sentience": sentience_counter,
        "danger": danger_counter,
        "habitat": habitat_counter,
    }


def build_ecotype_map(records: Iterable[Dict[str, object]]) -> Dict[str, List[str]]:
    mapping: Dict[str, List[str]] = defaultdict(list)
    for record in records:
        name = record.get("scientific_name") or "unknown"
        for ecotype in record.get("ecotypes") or []:
            mapping[ecotype].append(name)
    for key in mapping:
        mapping[key] = sorted(set(mapping[key]))
    return dict(sorted(mapping.items()))


def render_table(counter: Counter[str]) -> str:
    lines = ["| Value | Count |", "| --- | ---: |"]
    for key, count in counter.most_common():
        lines.append(f"| {key} | {count} |")
    return "\n".join(lines)


def write_summary(path: Path, species_count: int, summary: Dict[str, Counter], source: Path) -> None:
    lines = [
        "# Evo Species Summary",
        "",
        f"*Source*: `{source}`",
        f"*Total species analysed*: **{species_count}**",
        "",
        "## Macro class distribution",
        render_table(summary["macro"]),
        "",
        "## Sentience tiers",
        render_table(summary["sentience"]),
        "",
        "## Danger levels",
        render_table(summary["danger"]),
        "",
        "## Habitat coverage",
        render_table(summary["habitat"]),
        ""
    ]
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text("\n".join(lines) + "\n", encoding="utf-8")


def write_ecotype_map(path: Path, mapping: Dict[str, List[str]]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    serialisable = {key: value for key, value in mapping.items()}
    path.write_text(json.dumps(serialisable, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def parse_args(argv: List[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--species-root",
        type=Path,
        default=Path("incoming/lavoro_da_classificare/species"),
        help="Directory containing Evo species JSON files.",
    )
    parser.add_argument(
        "--summary",
        type=Path,
        default=Path("reports/species/species_summary.md"),
        help="Path where the Markdown summary will be written.",
    )
    parser.add_argument(
        "--ecotypes",
        type=Path,
        default=Path("reports/species/species_ecotype_map.json"),
        help="Path where the ecotype mapping JSON will be written.",
    )
    return parser.parse_args(argv)


def main(argv: List[str] | None = None) -> int:
    args = parse_args(argv)
    if not args.species_root.exists():
        raise SystemExit(f"Species directory not found: {args.species_root}")
    records = collect_species(args.species_root)
    summary = summarise_species(records)
    mapping = build_ecotype_map(records)
    write_summary(args.summary, len(records), summary, args.species_root)
    write_ecotype_map(args.ecotypes, mapping)
    print(f"Generated summary for {len(records)} species from {args.species_root}.")
    print(f"Summary: {args.summary}")
    print(f"Ecotype map: {args.ecotypes}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
