#!/usr/bin/env python3
"""Sprint Q+ residue close — trait orphan ASSIGN wave 2 DEFENSIVE batch.

13 traits assigned per docs/research/2026-05-10-trait-orphan-a-keep-
assignment-proposal.md §Wave 2 DEFENSIVE.

Skip species_expansion targets (schema mismatch) — defer wave residue.
"""
from __future__ import annotations

import sys
from pathlib import Path

REPO = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(REPO / "scripts"))
from trait_orphan_assign_wave_0_1 import inject_into_species, SPECIES_FILES

ASSIGNMENTS_WAVE_2 = {
    # Wave 2 DEFENSIVE — species.yaml only (skip sp_ ones for now)
    "electromanta_abyssalis": ["epidermide_dielettrica"],
    "chemnotela_toxica": ["cuticole_neutralizzanti"],
    "simbionte_corallino_riflesso": ["carapace_luminiscente_abissale"],
    "proteus_plasma": ["cartilagini_biofibre"],
    "soniptera_resonans": ["cartilagini_flessoacustiche"],
    "dune_stalker": ["biofilm_iperarido"],
}


def main() -> int:
    total_added = 0
    for species_id, trait_ids in ASSIGNMENTS_WAVE_2.items():
        for fp in SPECIES_FILES:
            if not fp.exists():
                continue
            content = fp.read_text(encoding="utf-8")
            if f"  - id: {species_id}\n" not in content and f"  - id: {species_id}\r\n" not in content:
                continue
            new_content, added = inject_into_species(content, species_id, trait_ids)
            if added:
                fp.write_text(new_content, encoding="utf-8")
                print(f"OK {species_id} ({fp.name}): +{','.join(added)}")
                total_added += len(added)
            elif new_content == content:
                print(f"SKIP {species_id}: traits already present OR no trait_plan section")
            break
    print(f"\nTotal traits injected wave 2: {total_added}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
