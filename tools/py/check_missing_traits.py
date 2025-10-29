#!/usr/bin/env python3
"""Verifica che tutti i trait referenziati dalle specie esistano nel trait reference."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Iterable, Set

import yaml


def ensure_list(value: object) -> list[str]:
  if isinstance(value, list):
    return [item for item in value if isinstance(item, str) and item]
  if isinstance(value, str) and value:
    return [value]
  return []


def load_trait_reference(path: Path) -> Set[str]:
  payload = json.loads(path.read_text(encoding="utf-8"))
  traits = payload.get("traits") if isinstance(payload, dict) else None
  if isinstance(traits, dict):
    return {trait_id for trait_id in traits.keys()}
  return set()


def extract_species_traits(path: Path) -> tuple[Set[str], list[str]]:
  data = yaml.safe_load(path.read_text(encoding="utf-8"))
  used: Set[str] = set()
  missing_core: list[str] = []

  def walk(node: object, context: str = path.name) -> None:
    if isinstance(node, dict):
      label = str(node.get("id") or node.get("name") or context)
      if "trait_plan" in node and isinstance(node["trait_plan"], dict):
        plan = node["trait_plan"]
        core = ensure_list(plan.get("core"))
        optional = ensure_list(plan.get("optional"))
        synergy = ensure_list(plan.get("synergies"))
        used.update(core)
        used.update(optional)
        used.update(synergy)
        if not core:
          missing_core.append(label)
      for key, value in node.items():
        if key == "trait_plan":
          continue
        walk(value, f"{label}.{key}")
    elif isinstance(node, list):
      for index, value in enumerate(node):
        walk(value, f"{context}[{index}]")

  walk(data)
  return used, missing_core


def main(argv: Iterable[str]) -> int:
  parser = argparse.ArgumentParser(description=__doc__)
  parser.add_argument(
    "--species",
    action="append",
    type=Path,
    default=[Path("data/core/species.yaml")],
    help="File YAML da controllare (può essere passato più volte).",
  )
  parser.add_argument(
    "--trait-reference",
    type=Path,
    default=Path("packs/evo_tactics_pack/docs/catalog/trait_reference.json"),
    help="Percorso al trait reference JSON.",
  )
  args = parser.parse_args(list(argv))

  reference = load_trait_reference(args.trait_reference)
  if not reference:
    print(f"Trait reference vuoto o non valido: {args.trait_reference}", file=sys.stderr)
    return 1

  used_traits: Set[str] = set()
  missing_core_contexts: list[str] = []
  for species_path in args.species:
    if not species_path.exists():
      print(f"File specie mancante: {species_path}", file=sys.stderr)
      return 1
    used, missing_core = extract_species_traits(species_path)
    used_traits.update(used)
    missing_core_contexts.extend(missing_core)

  missing_traits = sorted(trait for trait in used_traits if trait not in reference)

  errors: list[str] = []
  if missing_traits:
    trait_list = ", ".join(missing_traits)
    errors.append(f"Trait mancanti nel reference: {trait_list}")
  if missing_core_contexts:
    contexts = ", ".join(sorted(set(missing_core_contexts)))
    errors.append(f"Specie senza trait core definiti: {contexts}")

  if errors:
    print("\n".join(errors), file=sys.stderr)
    return 1

  return 0


if __name__ == "__main__":
  sys.exit(main(sys.argv[1:]))
