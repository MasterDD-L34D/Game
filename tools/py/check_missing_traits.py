#!/usr/bin/env python3
"""Verifica che ogni trait referenziato dalle specie ESISTA in canon (2-tier).

Tier-1 (FAIL): un trait_ref che non e' in NESSUN registro canonico -- ne'
active_effects (resolver combat) ne' glossary (label+lore). Quello e' un
phantom reference = bug reale.

Tier-2 (WARN, non-fallante): un trait che esiste in glossary/taxonomy ma NON
in active_effects (non-combat o non ancora autorato come meccanica combat);
oppure una specie senza trait_refs. Sono gap di content owner-gated, non
reference rotte. `--combat-strict` li ri-promuove a FAIL (audit combat).

Esistenza-faithful: allinea questo tool advisory al guard CI gia' enforced
`tests/scripts/speciesTraitReferences.test.js`, che usa glossary come registro
di esistenza. active_effects da solo era il reference outlier (combat-only).
"""

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
  # ADR-2026-05-15 Phase 4c — auto-detect format:
  # - .yaml (data/core/traits/active_effects.yaml) → legacy ids (artigli_*)
  # - .json (data/traits/index.json) → TR-NNNN format
  # Catalog trait_refs use legacy ids, so YAML reference preferred when
  # validating catalog. JSON reference per Pack v2 species YAML legacy.
  if path.suffix.lower() in (".yaml", ".yml"):
    import yaml as _yaml
    payload = _yaml.safe_load(path.read_text(encoding="utf-8")) or {}
    traits = payload.get("traits") if isinstance(payload, dict) else None
    if isinstance(traits, dict):
      return {trait_id for trait_id in traits.keys()}
    return set()
  payload = json.loads(path.read_text(encoding="utf-8"))
  traits = payload.get("traits") if isinstance(payload, dict) else None
  if isinstance(traits, dict):
    return {trait_id for trait_id in traits.keys()}
  return set()


def load_glossary_ids(path: Path) -> Set[str]:
  """Trait ids nel glossary canonico (registro di ESISTENZA, SOURCE).

  Un trait con entry glossary (label_it/en + descrizione) ESISTE in canon
  anche se non e' combat-resolvable. Mirrorato dal guard CI
  `tests/scripts/speciesTraitReferences.test.js`. Assente -> set vuoto.
  """
  if not path.exists():
    return set()
  payload = json.loads(path.read_text(encoding="utf-8"))
  traits = payload.get("traits") if isinstance(payload, dict) else None
  return set(traits.keys()) if isinstance(traits, dict) else set()


def _extract_traits_from_catalog(path: Path) -> tuple[Set[str], list[str]]:
  """Extract trait_refs from species_catalog.json v0.4.x (Phase 4c migration).

  Catalog stores flat trait_refs (no core/optional/synergies distinction).
  missing_core check downgraded to "no trait_refs at all" warning.
  """
  data = json.loads(path.read_text(encoding="utf-8"))
  used: Set[str] = set()
  missing_core: list[str] = []
  for entry in data.get("catalog", []) or []:
    sid = entry.get("species_id") or entry.get("id")
    refs = entry.get("trait_refs") or []
    if isinstance(refs, list):
      used.update(t for t in refs if isinstance(t, str) and t)
    if not refs and sid:
      missing_core.append(str(sid))
  return (used, missing_core)


def extract_species_traits(path: Path) -> tuple[Set[str], list[str]]:
  # ADR-2026-05-15 Phase 4c — catalog SOT primary, YAML fallback transition.
  # If path points to JSON catalog (.json suffix), parse as catalog v0.4.x
  # (trait_refs flat list). Otherwise YAML walk (legacy trait_plan dict).
  if path.suffix == ".json":
    return _extract_traits_from_catalog(path)
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
    # ADR-2026-05-15 Phase 4c — default catalog SOT (legacy YAML still accepted).
    # NOTE: catalog trait_refs use legacy IDs (artigli_sette_vie etc.), NOT
    # TR-NNNN format. Default --trait-reference adjusted accordingly per
    # Codex review 2026-05-15 (avoid false "missing TR-1101" errors).
    # default=None (not a list) so passing --species REPLACES the catalog
    # instead of appending to it (argparse append-with-list-default footgun).
    default=None,
    help="File catalog JSON (canonical) o YAML legacy (deprecated). Puo' essere passato piu' volte; sostituisce il default se passato.",
  )
  parser.add_argument(
    "--trait-reference",
    type=Path,
    # ADR-2026-05-15 Phase 4c — default active_effects.yaml (legacy ids
    # artigli_sette_vie etc.) per catalog trait_refs match. Pre-Phase-4c
    # default data/traits/index.json had TR-NNNN format (different scope).
    default=Path("data/core/traits/active_effects.yaml"),
    help="Percorso al trait reference (YAML active_effects o JSON index).",
  )
  parser.add_argument(
    "--strict",
    action="store_true",
    # Codex review 2026-05-15: catalog v0.4.x has 71 placeholder trait IDs
    # (TR-NNNN from species_expansion slot_* incoming docx_2026-04-16). These
    # are REAL gaps (master-dd backlog) ma noise per CI. Default non-strict
    # exit 0 with warning. --strict per CI gate enforcement.
    help="Exit 1 quando un trait_ref e' phantom (in nessun registro). I gap non-combat / no-trait restano WARN salvo --combat-strict.",
  )
  parser.add_argument(
    "--glossary",
    type=Path,
    default=Path("data/core/traits/glossary.json"),
    help="Registro di esistenza canonico (label+lore). Un trait qui presente ESISTE anche senza def combat.",
  )
  parser.add_argument(
    "--combat-strict",
    action="store_true",
    help="Ri-promuove a FAIL i trait in glossary-ma-non-active_effects + le specie senza trait_refs (audit combat-resolvability, comportamento legacy). Richiede --trait-reference YAML (active_effects).",
  )
  args = parser.parse_args(list(argv))
  if args.species is None:
    args.species = [Path("data/core/species/species_catalog.json")]

  # L'audit combat-strict misura la combat-resolvability: la reference DEVE essere
  # il resolver combat (active_effects YAML). Un index JSON (taxonomy) contiene i
  # trait non-combat -> li nasconderebbe da combat_unauthored = audit falso-verde.
  if args.combat_strict and args.trait_reference.suffix.lower() not in (".yaml", ".yml"):
    print(
      f"--combat-strict richiede un --trait-reference YAML (active_effects); "
      f"l'index JSON ({args.trait_reference}) e' la taxonomy, non il resolver combat. "
      f"Rimuovi --combat-strict oppure passa data/core/traits/active_effects.yaml.",
      file=sys.stderr,
    )
    return 2

  combat_reference = load_trait_reference(args.trait_reference)
  if not combat_reference:
    print(f"Trait reference vuoto o non valido: {args.trait_reference}", file=sys.stderr)
    return 1

  glossary_ids = load_glossary_ids(args.glossary)
  existence = combat_reference | glossary_ids

  used_traits: Set[str] = set()
  missing_core_contexts: list[str] = []
  for species_path in args.species:
    if not species_path.exists():
      print(f"File specie mancante: {species_path}", file=sys.stderr)
      return 1
    used, missing_core = extract_species_traits(species_path)
    used_traits.update(used)
    missing_core_contexts.extend(missing_core)

  # Tier-1 (FAIL): phantom = referenziato ma in NESSUN registro.
  truly_missing = sorted(t for t in used_traits if t not in existence)
  # Tier-2 (WARN): esiste in glossary/taxonomy ma non e' combat-resolvable.
  combat_unauthored = sorted(t for t in used_traits if t in existence and t not in combat_reference)
  no_trait_species = sorted(set(missing_core_contexts))

  failures: list[str] = []
  warnings: list[str] = []

  if truly_missing:
    failures.append("Trait inesistenti (in nessun registro -- phantom ref): " + ", ".join(truly_missing))

  if combat_unauthored:
    msg = f"{len(combat_unauthored)} trait esistono in glossary ma non in active_effects (non-combat / non ancora autorati): " + ", ".join(combat_unauthored)
    (failures if args.combat_strict else warnings).append(msg)

  if no_trait_species:
    msg = f"{len(no_trait_species)} specie senza trait_refs (content gap owner-gated): " + ", ".join(no_trait_species)
    (failures if args.combat_strict else warnings).append(msg)

  for w in warnings:
    print(f"[check_missing_traits] WARN: {w}", file=sys.stderr)

  if failures:
    print("\n".join(failures), file=sys.stderr)
    if args.strict:
      return 1
    print("[check_missing_traits] non-strict mode: exit 0 (use --strict per CI gate).", file=sys.stderr)
    return 0

  return 0


if __name__ == "__main__":
  sys.exit(main(sys.argv[1:]))
