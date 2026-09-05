#!/usr/bin/env python3
"""Re-populate synthetic *-trait-keeper species so every env_to_traits rule has
a real covering species (heals ``rules_missing_species_total`` to 0 honestly).

Background
----------
Each biome dir ships one synthetic ``<biome>-trait-keeper.yaml`` whose purpose is
to CARRY that biome's env-suggested traits, guaranteeing the trait-coverage gate
(``report_trait_coverage.py``) finds >=1 species per (suggested-trait, biome) rule
combo. The keepers were emptied (~M6: ``derived_from_environment: {}``) and the
stale 287-entry ``species_affinity.json`` masked the gap. The honest 72-entry
re-baseline (slice gamma) exposed 131 uncovered rule combos. This driver
re-populates the keepers from the env_to_traits registry (NOT git, whose old
keepers only held ~1 trait each).

Coverage mechanics (tools/py/game_utils/trait_coverage.py)
----------------------------------------------------------
A rule combo ``(biome_class, None)`` is COVERED when a species with
``environment_affinity.biome_class == biome_class`` (or ``biomes:[biome_class]``)
lists the trait in ``derived_from_environment.suggested_traits`` AND the trait is
in ``trait_reference.json.traits`` (``target_traits``). Rules with no biome_class
(empty ``when`` / koppen / hazard / salinita) yield combo ``(None, None)``,
covered by a species with NO biome carrying the trait -> the ``global`` keeper.

Canon-safety + pack-validator split
-----------------------------------
Two gates pull in opposite directions:
  * ``validate_species_v1_7.py`` (pack validator, in ``validate-datasets`` CI):
    treats a missing ``biomes`` field as a FATAL error for a "complete" keeper
    (one that carries spawn_rules/balance, e.g. badlands).
  * ``check-canon-consistency.cjs`` (HARD gate): a ``biomes:[X]`` entry must be a
    canonical biome id OR a pack alias; it does NOT inspect
    ``environment_affinity.biome_class``.
So we SPLIT by canon-resolvability (pack biomes.yaml ids UNION aliases):
  * biome_class that RESOLVES -> write ``biomes:[biome_class]`` (satisfies the
    pack validator AND passes canon).
  * biome_class that does NOT resolve (laguna_bioreattiva, mangrovieto_cinetico,
    canopia_psionica_leggera, falde_magnetiche_psioniche, orbita_psionica_inversa)
    -> write ``environment_affinity.biome_class`` (covers via the coverage engine
    fallback, which the canon biome-refs gate does not inspect).
The coverage engine reads ``biomes`` first, then falls back to
``environment_affinity.biome_class`` -- either yields the (biome_class, None) combo.

CAVEAT (canon-blind refs, owner decision): these 5 biome_class names come from
``env_to_traits.yaml`` but are NOT recognized by the canon biome-refs gate (3 are
declared in ``data/core/biome_aliases.yaml`` which that gate does not read; 2 --
laguna_bioreattiva, mangrovieto_cinetico -- are only in the pack env registry).
A ``biomes:[X]`` representation would FAIL canon for all 5, so there is no
canon-passing inline form available; ``environment_affinity`` is used to cover the
rule WITHOUT asserting a canon violation. Registering these 5 as inline
``biomes.yaml`` aliases (so the canon gate exercises the refs) is a master-dd call.

NOTE (validator scope): the pack validator ``validate_species_v1_7.py`` would
reject every keeper stub as FATAL -- a bare stub for missing ``biomes`` plus ~10
other required fields (schema_version, receipt, display_name, role_trofico,
functional_tags, vc, playable_unit, spawn_rules[.densita], balance[.encounter_role]);
even the populated ``biomes:[X]`` keepers still fail on those other fields. The
keepers escape rejection only because ``validate-ecosystem-pack``
(run_all_validators) globs a hardcoded subset of biome dirs that excludes them, so
the "green" pack-validation signal means "not inspected", not "valid", for stubs.

Deterministic + committed (salvage idiom, cf. gen_retired_creature_specs.py).
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path

import yaml

REPO_ROOT = Path(__file__).resolve().parents[2]

DEFAULT_ENV_TRAITS = REPO_ROOT / "packs/evo_tactics_pack/docs/catalog/env_traits.json"
DEFAULT_TRAIT_REFERENCE = REPO_ROOT / "packs/evo_tactics_pack/docs/catalog/trait_reference.json"
DEFAULT_GLOSSARY = REPO_ROOT / "data/core/traits/glossary.json"
DEFAULT_SPECIES_ROOT = REPO_ROOT / "packs/evo_tactics_pack/data/species"
DEFAULT_PACK_BIOMES = REPO_ROOT / "packs/evo_tactics_pack/data/biomes.yaml"

GLOBAL_KEEPER_ID = "global-trait-keeper"


def _load_json(path: Path) -> dict:
    with path.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def load_canon_biome_ids(pack_biomes_path: Path) -> set[str]:
    """Canonical pack biome ids UNION declared aliases (matches the canon gate)."""
    with pack_biomes_path.open("r", encoding="utf-8") as handle:
        data = yaml.safe_load(handle) or {}
    biomes = data.get("biomes", {}) or {}
    ids: set[str] = set()
    for key, val in biomes.items():
        ids.add(str(key))
        if isinstance(val, dict):
            for alias in val.get("aliases") or []:
                ids.add(str(alias))
    return ids


def build_buckets(
    env_traits: dict, target_traits: set[str], glossary: set[str]
) -> tuple[dict[str, list[str]], list[str]]:
    """Return (biome_buckets, global_bucket) of glossary-valid target traits.

    biome_buckets: biome_class -> sorted suggested traits (combo (biome_class, None)).
    global_bucket: sorted suggested traits for combo (None, None).
    """
    biome_sets: dict[str, set[str]] = {}
    global_set: set[str] = set()

    for rule in env_traits.get("rules", []):
        when = rule.get("when") or {}
        biome_class = when.get("biome_class")
        morphotype = when.get("morphotype")
        suggested = (rule.get("suggest") or {}).get("traits") or []
        target_hits = [t for t in suggested if t in target_traits]
        if not target_hits:
            continue
        if biome_class is not None:
            biome_sets.setdefault(biome_class, set()).update(target_hits)
        elif morphotype is None:
            # No biome_class AND no morphotype -> combo (None, None) -> global keeper.
            global_set.update(target_hits)
        # (morphotype-only rules carry no traits in the current registry; skipped.)

    # Fail loud if any carried trait lacks a glossary entry (the species<->glossary
    # CI guard would otherwise reject the keeper).
    all_traits = set(global_set)
    for traits in biome_sets.values():
        all_traits |= traits
    orphans = sorted(t for t in all_traits if t not in glossary)
    if orphans:
        raise SystemExit(
            "Refusing to write keepers: suggested traits missing glossary entries:\n  "
            + "\n  ".join(orphans)
        )

    biome_buckets = {bc: sorted(ts) for bc, ts in biome_sets.items()}
    return biome_buckets, sorted(global_set)


def _write_yaml(path: Path, data: dict) -> None:
    text = yaml.safe_dump(
        data, sort_keys=False, allow_unicode=True, default_flow_style=False, width=4096
    )
    with path.open("w", encoding="utf-8", newline="\n") as handle:
        handle.write(text)


def repopulate(
    species_root: Path,
    biome_buckets: dict[str, list[str]],
    global_bucket: list[str],
    canon_biome_ids: set[str],
    *,
    dry_run: bool = False,
) -> list[tuple[str, str, int]]:
    """Populate keepers; return [(keeper_id, biome_class_or_'global', n_traits)]."""
    changed: list[tuple[str, str, int]] = []
    for keeper_path in sorted(species_root.rglob("*-trait-keeper.yaml")):
        with keeper_path.open("r", encoding="utf-8") as handle:
            data = yaml.safe_load(handle) or {}
        keeper_id = str(data.get("id") or keeper_path.stem)
        biome_class = keeper_path.parent.name

        if biome_class in biome_buckets:
            traits = biome_buckets[biome_class]
            if biome_class in canon_biome_ids:
                # Canonical/alias biome -> real biomes field (pack validator + canon both happy).
                data["biomes"] = [biome_class]
                data.pop("environment_affinity", None)
                tag = biome_class
            else:
                # Non-canon biome -> environment_affinity fallback (canon gate ignores it).
                data.pop("biomes", None)
                data["environment_affinity"] = {"biome_class": biome_class}
                tag = f"{biome_class}(env_affinity)"
            data["derived_from_environment"] = {"suggested_traits": list(traits)}
            changed.append((keeper_id, tag, len(traits)))
        elif keeper_id == GLOBAL_KEEPER_ID:
            # No biome -> combo (None, None) -> covers koppen/hazard/salinita/aggregate rules.
            data.pop("biomes", None)
            data.pop("environment_affinity", None)
            data["derived_from_environment"] = {"suggested_traits": list(global_bucket)}
            changed.append((keeper_id, "global(None,None)", len(global_bucket)))
        else:
            # Keeper dir whose name is NOT an env_to_traits biome_class -> this keeper
            # carries nothing (the 22 such dirs, e.g. abisso_luminescente). Left inert.
            # NB: foresta_temperata also has an env rule but no keeper dir; its single
            # suggested trait (peli_idrofobici) is NOT in trait_reference.json.traits so
            # it produces ZERO countable rule combos -> needs no keeper. (foresta_miceliale
            # and mezzanotte_orbitale DO produce combos and now have their own keepers
            # above, so coverage is in-biome real-species, not cross-biome overlay-masked.)
            continue

        if not dry_run:
            _write_yaml(keeper_path, data)
    return changed


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--env-traits", type=Path, default=DEFAULT_ENV_TRAITS)
    parser.add_argument("--trait-reference", type=Path, default=DEFAULT_TRAIT_REFERENCE)
    parser.add_argument("--glossary", type=Path, default=DEFAULT_GLOSSARY)
    parser.add_argument("--species-root", type=Path, default=DEFAULT_SPECIES_ROOT)
    parser.add_argument("--pack-biomes", type=Path, default=DEFAULT_PACK_BIOMES)
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args(argv)

    env_traits = _load_json(args.env_traits)
    target_traits = set(_load_json(args.trait_reference).get("traits", {}).keys())
    glossary = set(_load_json(args.glossary).get("traits", {}).keys())
    canon_biome_ids = load_canon_biome_ids(args.pack_biomes)

    biome_buckets, global_bucket = build_buckets(env_traits, target_traits, glossary)
    changed = repopulate(
        args.species_root,
        biome_buckets,
        global_bucket,
        canon_biome_ids,
        dry_run=args.dry_run,
    )

    print(f"{'DRY-RUN ' if args.dry_run else ''}populated {len(changed)} keepers:")
    for keeper_id, biome, n in changed:
        print(f"  {keeper_id:<42} <- {biome:<28} ({n} traits)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
