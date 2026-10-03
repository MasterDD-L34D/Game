#!/usr/bin/env python3
"""
apply_phase3_polish_d5_d6_v2_fixes.py
Fine-grained Italian grammar/typo fixes post-D.5+D.6 polish batch (PR #2272 merged).

Issues found in fine-grained narrative review pass:
1. sp_nebulocornis_mollis visual: "occcupa" (typo c×3) → "occupa"
2. sp_cinerastra_nodosa visual: "nodul sporgente" (apocope errata) → "nodulo sporgente"
3. sp_cavatympa_sonans symbiosis: "si ricovrano" (coniug. errata) → "si ricoverano"
4. sp_ferriscroba_detrita visual: "Toglietelo" → "Toglietela" (specie femm.)
5. psionerva_montis visual: "il psionico" → "lo psionico" (art. ps impura)
6. symbiotica_thermalis symbiosis: "Il pulso termico" → "Il polso termico"
7. sp_arenaceros_placidus symbiosis: "exsudate" → "essudati" (italianizzazione)

All fixes are unique substring replacements verified pre-apply.
"""

import json
import sys
from pathlib import Path

CATALOG_PATH = Path(__file__).parent.parent.parent / "data/core/species/species_catalog.json"

FIXES = [
    # (description, old_substring, new_substring)
    ("sp_nebulocornis_mollis typo c×3", "occcupa", "occupa"),
    ("sp_cinerastra_nodosa apocope", "nodul sporgente", "nodulo sporgente"),
    ("sp_cavatympa_sonans coniug.", "si ricovrano", "si ricoverano"),
    ("sp_ferriscroba_detrita specie femm.", "Toglietelo e la rete trofica", "Toglietela e la rete trofica"),
    ("psionerva_montis art. ps impura", "il freddo e il psionico", "il freddo e lo psionico"),
    ("symbiotica_thermalis pulso→polso", "Il pulso termico che irradia", "Il polso termico che irradia"),
    ("sp_arenaceros_placidus italianizz.", "luce solare in exsudate", "luce solare in essudati"),
]


def apply_fixes(catalog_path: Path) -> int:
    with open(catalog_path, encoding="utf-8") as f:
        text = f.read()

    applied = 0
    skipped = []
    for desc, old, new in FIXES:
        count = text.count(old)
        if count == 0:
            skipped.append((desc, old, "not-found"))
            continue
        if count > 1:
            skipped.append((desc, old, f"multiple-{count}"))
            continue
        text = text.replace(old, new)
        applied += 1
        print(f"  OK: {desc:40} '{old}' → '{new}'")

    if skipped:
        print("\nSkipped:")
        for desc, old, reason in skipped:
            print(f"  SKIP: {desc:40} '{old}' ({reason})")

    # Parse + write back (preserves JSON structure + reformats consistently)
    data = json.loads(text)
    with open(catalog_path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    print(f"\nApplied {applied}/{len(FIXES)} fixes. Catalog rewritten UTF-8.")
    return applied


if __name__ == "__main__":
    path = Path(sys.argv[1]) if len(sys.argv) > 1 else CATALOG_PATH
    if not path.exists():
        print(f"ERROR: {path} not found", file=sys.stderr)
        sys.exit(1)
    n = apply_fixes(path)
    sys.exit(0 if n == len(FIXES) else 1)
