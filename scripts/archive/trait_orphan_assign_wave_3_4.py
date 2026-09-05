#!/usr/bin/env python3
"""Sprint Q+ residue close — trait orphan ASSIGN wave 3+4 batch.

Wave 3 STATUS APPLIERS + Wave 4 SENSORY traits to species.yaml-style species
(skip species_expansion schema mismatch).

Per docs/research/2026-05-10-trait-orphan-a-keep-assignment-proposal.md.
"""
from __future__ import annotations

import sys
from pathlib import Path

REPO = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(REPO / "scripts"))
from trait_orphan_assign_wave_0_1 import inject_into_species, SPECIES_FILES

ASSIGNMENTS_WAVE_3_4 = {
    # Wave 3 STATUS APPLIERS — species.yaml only
    "umbra_alaris": ["ghiandole_inchiostro_luce"],
    "chemnotela_toxica": ["ghiandole_nebbia_acida", "enzimi_chelatori_rapidi"],
    "electromanta_abyssalis": ["ghiandole_nebbia_ionica", "filamenti_superconduttivi"],
    "symbiotica_thermalis": [
        "ghiandole_iodoattive",
        "enzimi_antipredatori_algali",
        "batteri_endosimbionti_chemio",
        "filamenti_termoconduzione",
    ],
    "psionerva_montis": ["enzimi_antifase_termica", "occhi_cristallo_modulare"],
    "polpo_araldo_sinaptico": ["tentacoli_uncinati"],
    "fusomorpha_palustris": ["spore_paniche"],
    "sciame_larve_neurali": ["canto_di_richiamo"],
    # Wave 4 SENSORY — species.yaml mappable subset
    "dune_stalker": ["antenne_dustsense"],
}


def main() -> int:
    total_added = 0
    for species_id, trait_ids in ASSIGNMENTS_WAVE_3_4.items():
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
    print(f"\nTotal traits injected wave 3+4: {total_added}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
