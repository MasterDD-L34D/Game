#!/usr/bin/env python3
"""Sprint Q+ residue close — trait orphan A=keep ASSIGN-A wave 0+1 batch.

22 traits assigned to species `trait_plan.optional` arrays via biome-aligned
mapping (per docs/research/2026-05-10-trait-orphan-a-keep-assignment-proposal.md
PR #2206).

Idempotent: skips trait_id already present in species trait_plan
(optional OR core). Re-run safe.

Wave 0 (6 traits) + Wave 1 (16 traits, pungiglione_paralizzante deferred
no canonical species).
"""
from __future__ import annotations

import re
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parents[1]

# Mapping wave 0 + wave 1 (skip pungiglione_paralizzante TBD species).
ASSIGNMENTS = {
    # Wave 0 — core engine
    "rupicapra_sensoria": ["zampe_a_molla", "coda_balanciere"],
    "elastovaranus_hydrus": ["pelle_elastomera"],
    "dune_stalker": ["ferocia"],
    "terracetus_ambulator": ["stordimento"],
    "gulogluteus_scutiger": ["martello_osseo"],
    "sp_lithoraptor_acutornis": ["intimidatore"],
    # Wave 1 ARTIGLI
    "psionerva_montis": ["artigli_sghiaccio_glaciale"],
    "chemnotela_toxica": ["artigli_acidofagi", "aculei_velenosi"],
    "sp_basaltocara_scutata": ["artigli_vetrificati"],
    "electromanta_abyssalis": ["artigli_induzione"],
    "sp_arenaceros_placidus": ["artigli_radice"],
    "umbra_alaris": ["artigli_scivolo_silente"],
    # Wave 1 DENTI
    "symbiotica_thermalis": ["denti_chelatanti"],
    "sp_ferrimordax_rutilus": ["denti_ossidoferro"],
    "sp_pyrosaltus_celeris": ["denti_silice_termici"],
    "sonaraptor_dissonans": ["denti_tuning_fork"],
    # Wave 1 ALI
    "sp_ventornis_longiala": ["ali_fulminee"],
    "soniptera_resonans": ["ali_ioniche"],
    "sp_sonapteryx_resonans": ["ali_membrana_sonica"],
    # Wave 1 CODA
    "sp_arenavolux_sagittalis": ["coda_contrappeso"],
}

SPECIES_FILES = [
    REPO / "data/core/species.yaml",
    REPO / "data/core/species_expansion.yaml",
]


def inject_into_species(content: str, species_id: str, trait_ids: list[str]) -> tuple[str, list[str]]:
    """Append trait_ids to species's trait_plan.optional list. Idempotent.

    Returns (new_content, added_traits_list).
    """
    # Find species block via regex anchor `^  - id: <id>$` then the next species
    # `^  - id:` OR EOF.
    pattern = re.compile(
        rf"(^  - id: {re.escape(species_id)}\s*$.*?)(?=^  - id: |\Z)",
        re.MULTILINE | re.DOTALL,
    )
    m = pattern.search(content)
    if not m:
        return content, []
    block = m.group(1)

    # Find trait_plan section. Trait_plan should have `core:` + `optional:`.
    tp_match = re.search(r"(    trait_plan:\s*$\n(?:.*?\n)*?)(?=^    [a-z_]+:|\Z)", block, re.MULTILINE)
    if not tp_match:
        # No trait_plan — skip (rare).
        return content, []
    trait_plan_block = tp_match.group(1)

    # Check existing trait_ids in core or optional (avoid dup).
    existing_traits = set(re.findall(r"^\s*- ([a-z_]+)\s*(?:#.*)?$", trait_plan_block, re.MULTILINE))
    new_traits = [t for t in trait_ids if t not in existing_traits]
    if not new_traits:
        return content, []

    # Try 3 patterns:
    # A) Inline list: `      optional: [a, b, c]` (one-line)
    # B) Block list:  `      optional:\n        - a\n        - b\n`
    # C) Empty/missing: append new optional block

    # Pattern A: inline (most common in species.yaml)
    inline_match = re.search(
        r"(      optional:\s*\[)([^\]]*?)(\]\s*$)", trait_plan_block, re.MULTILINE
    )
    if inline_match:
        prefix = inline_match.group(1)
        existing_list = inline_match.group(2).strip()
        suffix = inline_match.group(3)
        new_items = ", ".join(new_traits)
        if existing_list:
            new_list = existing_list + ", " + new_items
        else:
            new_list = new_items
        new_opt = f"{prefix}{new_list}{suffix}"
        new_trait_plan = trait_plan_block.replace(inline_match.group(0), new_opt, 1)
    else:
        # Pattern B: block style
        block_match = re.search(
            r"(      optional:\s*$\n((?:\s+- [a-z_]+\s*(?:#.*)?$\n)*))",
            trait_plan_block,
            re.MULTILINE,
        )
        if block_match:
            opt_section = block_match.group(1)
            addition = "".join(f"        - {t}\n" for t in new_traits)
            new_opt_section = opt_section + addition
            new_trait_plan = trait_plan_block.replace(opt_section, new_opt_section, 1)
        else:
            # Pattern C: append new optional block at end of trait_plan section
            addition = "      optional:\n" + "".join(f"        - {t}\n" for t in new_traits)
            new_trait_plan = trait_plan_block.rstrip() + "\n" + addition
    new_block = block.replace(trait_plan_block, new_trait_plan, 1)
    new_content = content.replace(block, new_block, 1)
    return new_content, new_traits


def main() -> int:
    total_added = 0
    for species_id, trait_ids in ASSIGNMENTS.items():
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
    print(f"\nTotal traits injected: {total_added}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
