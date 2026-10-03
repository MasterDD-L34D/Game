#!/usr/bin/env python3
"""M6-#2: assegna `resistance_archetype` field a tutte le species YAML
in packs/evo_tactics_pack/data/species/.

Heuristic-based: match keyword su id + morphotype + biomes + description.
Scrive field dopo `schema_version:` (preserva comments + format).

Convention archetypes (vedi species_resistances.yaml):
- corazzato: tanker armored (fisico/taglio resist, psionico/mentale vuln)
- bioelettrico: electrical (elettrico/ionico resist, fisico vuln)
- psionico: mind-based (psionico/mentale resist, fisico/taglio vuln)
- termico: heat-adapted (fuoco resist, ionico/gelo vuln)
- adattivo: neutral default

Usage: python3 tools/py/assign_resistance_archetype.py [--dry-run]
"""
from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
SPECIES_ROOT = REPO_ROOT / "packs" / "evo_tactics_pack" / "data" / "species"

# Mapping heuristic (ordered, first match wins)
ARCHETYPE_RULES = [
    # corazzato: armored/shield/tank
    (
        "corazzato",
        [
            r"corazzat",
            r"armored",
            r"bipede_corazzato",
            r"anfibio_corazzato",
            r"ferrocolonia",
            r"guardiano",
            r"cacciatore_corazzato",
            r"warden",
            r"tank",
        ],
    ),
    # bioelettrico: electric/magnetic/ionic
    (
        "bioelettrico",
        [
            r"magnet",
            r"ferroso",
            r"elettric",
            r"ionic",
            r"fulmin",
            r"magnetotattic",
        ],
    ),
    # psionico: mind/telepathic/echo/sentient
    (
        "psionico",
        [
            r"psion",
            r"sentien",
            r"echo-?wing",
            r"echo-?seer",
            r"telepathic",
            r"mentale",
            r"spirit",
            r"spectr",
        ],
    ),
    # termico: heat/fire/thermal/cryo
    (
        "termico",
        [
            r"thermo",
            r"termic",
            r"fuoco",
            r"calore",
            r"brinastorm",
            r"ondata-termica",
            r"pyro",
            r"noctule-termico",
            r"cryo",
            r"glacial",
            r"crysalis",
        ],
    ),
]

DEFAULT_ARCHETYPE = "adattivo"


def classify(path: Path) -> str:
    """Return archetype for species at `path`."""
    text = path.read_text(encoding="utf-8").lower()
    # Compose search corpus: file path + content (first ~60 righe)
    corpus = f"{path.name.lower()} {text[:3000]}"
    for archetype, patterns in ARCHETYPE_RULES:
        for p in patterns:
            if re.search(p, corpus):
                return archetype
    return DEFAULT_ARCHETYPE


def inject_field(content: str, archetype: str) -> str:
    """Insert `resistance_archetype: <value>` after schema_version line.
    Idempotent: skip se field già presente.
    """
    if re.search(r"^resistance_archetype:", content, flags=re.MULTILINE):
        return content  # already present

    # Insert after `schema_version: ...` line
    pattern = re.compile(r"(^schema_version:.*$)", flags=re.MULTILINE)
    replacement = rf"\1\nresistance_archetype: {archetype}"
    if pattern.search(content):
        return pattern.sub(replacement, content, count=1)
    # Fallback: prepend at top (after front-matter if any)
    return f"resistance_archetype: {archetype}\n{content}"


def main(argv=None):
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true", help="print only, no write")
    parser.add_argument(
        "--summary",
        action="store_true",
        help="print archetype distribution summary",
    )
    args = parser.parse_args(argv)

    yaml_files = sorted(SPECIES_ROOT.rglob("*.yaml"))
    print(f"Found {len(yaml_files)} species YAML files")

    dist: dict[str, int] = {}
    changes: list[tuple[Path, str]] = []

    for path in yaml_files:
        content = path.read_text(encoding="utf-8")
        # Skip if already has field
        if re.search(r"^resistance_archetype:", content, flags=re.MULTILINE):
            # Extract existing
            m = re.search(r"^resistance_archetype:\s*(\w+)", content, flags=re.MULTILINE)
            if m:
                existing = m.group(1)
                dist[existing] = dist.get(existing, 0) + 1
            continue
        archetype = classify(path)
        changes.append((path, archetype))
        dist[archetype] = dist.get(archetype, 0) + 1

    print(f"\nDistribution:")
    for arch, count in sorted(dist.items(), key=lambda x: -x[1]):
        print(f"  {arch:15s}: {count}")

    if args.dry_run:
        print(f"\n[DRY-RUN] Would write {len(changes)} files:")
        for path, arch in changes[:10]:
            print(f"  {arch:15s} → {path.relative_to(REPO_ROOT)}")
        if len(changes) > 10:
            print(f"  ... +{len(changes) - 10} more")
        return 0

    # Write mode
    for path, archetype in changes:
        content = path.read_text(encoding="utf-8")
        new_content = inject_field(content, archetype)
        path.write_text(new_content, encoding="utf-8")

    print(f"\n✓ Wrote {len(changes)} files with resistance_archetype field")
    return 0


if __name__ == "__main__":
    sys.exit(main())
