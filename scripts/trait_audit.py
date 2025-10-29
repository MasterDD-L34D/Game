#!/usr/bin/env python3
"""Audit trait data consistency across catalog, packs, and appendices."""
from __future__ import annotations

import argparse
import json
import sys
import textwrap
import unicodedata
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, Iterable, List, Tuple

import re

import yaml

REPO_ROOT = Path(__file__).resolve().parents[1]
TRAIT_REFERENCE_PATH = REPO_ROOT / "packs" / "evo_tactics_pack" / "docs" / "catalog" / "trait_reference.json"
PACKS_DATA_PATH = REPO_ROOT / "data" / "packs.yaml"
APPENDIX_PATH = REPO_ROOT / "appendici"
DEFAULT_REPORT_PATH = REPO_ROOT / "logs" / "trait_audit.md"


@dataclass
class Issue:
    kind: str  # "blocking" or "warning"
    message: str


def slugify(value: str) -> str:
    """Create a normalized slug for trait lookup."""
    normalized = unicodedata.normalize("NFKD", value)
    without_marks = "".join(ch for ch in normalized if not unicodedata.combining(ch))
    lowered = without_marks.lower()
    replaced = "".join(ch if ch.isalnum() else "_" for ch in lowered)
    while "__" in replaced:
        replaced = replaced.replace("__", "_")
    return replaced.strip("_")


def load_trait_reference() -> Tuple[Dict[str, dict], Dict[str, str], List[Issue]]:
    issues: List[Issue] = []
    if not TRAIT_REFERENCE_PATH.exists():
        issues.append(Issue("blocking", f"File mancante: {TRAIT_REFERENCE_PATH}"))
        return {}, {}, issues

    data = json.loads(TRAIT_REFERENCE_PATH.read_text(encoding="utf-8"))
    traits = data.get("traits", {})

    slug_map: Dict[str, str] = {}
    for trait_id, payload in traits.items():
        slug_map.setdefault(slugify(trait_id), trait_id)
        label = payload.get("label")
        if isinstance(label, str) and label.strip():
            slug_map.setdefault(slugify(label), trait_id)
        else:
            issues.append(
                Issue(
                    "warning",
                    f"Trait '{trait_id}' privo di label leggibile (campo 'label').",
                )
            )
    return traits, slug_map, issues


def load_packs_data() -> dict:
    if not PACKS_DATA_PATH.exists():
        raise FileNotFoundError(f"File mancante: {PACKS_DATA_PATH}")
    return yaml.safe_load(PACKS_DATA_PATH.read_text(encoding="utf-8"))


def extract_trait_references_from_packs(packs_data: dict) -> Iterable[Tuple[str, str, str]]:
    forms = packs_data.get("forms", {})
    for form_label, slots in forms.items():
        if not isinstance(slots, dict):
            continue
        for slot_letter, entries in slots.items():
            if not isinstance(entries, list):
                continue
            for entry in entries:
                if not isinstance(entry, str):
                    continue
                if not entry.startswith("trait_T"):
                    continue
                parts = entry.split(":", 1)
                if len(parts) != 2:
                    continue
                slot_descriptor, raw_name = parts
                tier_num = slot_descriptor.replace("trait_T", "", 1)
                expected_tier = f"T{tier_num}"
                yield (raw_name, expected_tier, f"forms.{form_label}.{slot_letter}")


def parse_appendix_traits() -> Iterable[Tuple[str, str, str]]:
    for appendix in sorted(APPENDIX_PATH.glob("*")):
        if not appendix.is_file():
            continue
        for line in appendix.read_text(encoding="utf-8").splitlines():
            if "Tier" not in line:
                continue
            match = None
            for candidate in (
                r"Tier\s*(\d)",
                r"tier\s*(\d)",
            ):
                match = re.search(candidate, line)
                if match:
                    break
            if not match:
                continue
            tier_value = match.group(1)
            expected_tier = f"T{tier_value}"
            if ":" not in line:
                continue
            descriptor, remainder = line.split(":", 1)
            context = f"{appendix.relative_to(REPO_ROOT)}::{descriptor.strip()}"
            sentence = remainder.split(".")[0]
            normalized = sentence.replace(" e ", ",").replace("+", ",")
            candidates = [part.strip() for part in normalized.split(",")]
            for name in candidates:
                if not name:
                    continue
                if name.startswith("("):
                    continue
                cleaned = name.strip("*- +")
                cleaned = re.sub(r"^(le|i|gli|la|il|lo|l')\s+", "", cleaned, flags=re.IGNORECASE)
                if not cleaned:
                    continue
                # Avoid generic descriptors that are not traits
                if cleaned.lower().startswith("sinergie") or cleaned.lower().startswith("core"):
                    continue
                yield (cleaned, expected_tier, context)


def check_traits() -> Tuple[List[Issue], str]:
    issues: List[Issue] = []
    traits, slug_map, load_issues = load_trait_reference()
    issues.extend(load_issues)
    if not traits:
        return issues, format_report(issues)

    packs_data = load_packs_data()

    # Index trait usage to validate declared slots
    usage_by_trait: Dict[str, set] = {trait_id: set() for trait_id in traits}

    for raw_name, expected_tier, context in extract_trait_references_from_packs(packs_data):
        slug = slugify(raw_name.replace("_", " "))
        trait_id = slug_map.get(slug)
        if not trait_id:
            issues.append(
                Issue(
                    "blocking",
                    f"Tratto '{raw_name}' (slug '{slug}') usato in {context} ma assente nel catalogo.",
                )
            )
            continue
        data = traits[trait_id]
        actual_tier = data.get("tier")
        if actual_tier != expected_tier:
            issues.append(
                Issue(
                    "blocking",
                    f"Tier atteso {expected_tier} per '{data.get('label', trait_id)}' in {context}, trovato {actual_tier}.",
                )
            )
        slot_letter = context.split(".")[-1]
        raw_slots = data.get("slot", []) or []
        invalid_tokens = [
            token
            for token in raw_slots
            if isinstance(token, str) and ":" in token
        ]
        if invalid_tokens:
            issues.append(
                Issue(
                    "blocking",
                    f"Tratto '{data.get('label', trait_id)}' dichiara tassonomie nel campo 'slot'"
                    " (valori: "
                    + ", ".join(sorted(set(invalid_tokens)))
                    + "). Spostare questi descrittori in 'slot_profile' mantenendo solo le lettere degli slot.",
                )
            )
        declared_slots = [
            (token.strip().upper())
            for token in raw_slots
            if isinstance(token, str) and token.strip() and ":" not in token
        ]
        if slot_letter not in declared_slots:
            issues.append(
                Issue(
                    "blocking",
                    f"Tratto '{data.get('label', trait_id)}' manca del riferimento allo slot '{slot_letter}' dichiarato in {context}.",
                )
            )
        usage_by_trait[trait_id].add(slot_letter)

    # Cross-check appendix tiers
    for raw_name, expected_tier, context in parse_appendix_traits():
        slug = slugify(raw_name.replace("_", " "))
        trait_id = slug_map.get(slug)
        if not trait_id:
            issues.append(
                Issue(
                    "blocking",
                    f"Tratto '{raw_name}' citato in {context} non presente nel catalogo.",
                )
            )
            continue
        actual_tier = traits[trait_id].get("tier")
        if actual_tier != expected_tier:
            issues.append(
                Issue(
                    "blocking",
                    f"Tier atteso {expected_tier} per '{traits[trait_id].get('label', trait_id)}' in {context}, trovato {actual_tier}.",
                )
            )

    # Validate declared slots exist in usage (warning if unused)
    for trait_id, data in traits.items():
        declared_slots = data.get("slot", []) or []
        used_slots = usage_by_trait.get(trait_id, set())
        for slot_letter in declared_slots:
            if slot_letter and slot_letter not in used_slots:
                issues.append(
                    Issue(
                        "warning",
                        f"Tratto '{data.get('label', trait_id)}' dichiara slot '{slot_letter}' ma non è referenziato in alcun pack/form attuale.",
                    )
                )

    # Validate sinergie references
    for trait_id, data in traits.items():
        for synergy in data.get("sinergie", []) or []:
            if synergy not in traits:
                issues.append(
                    Issue(
                        "blocking",
                        f"Tratto '{data.get('label', trait_id)}' dichiara sinergia '{synergy}' non definita.",
                    )
                )
                continue
            if trait_id not in traits[synergy].get("sinergie", []):
                issues.append(
                    Issue(
                        "warning",
                        f"Sinergia non reciproca: '{data.get('label', trait_id)}' → '{traits[synergy].get('label', synergy)}'.",
                    )
                )

    # Warn for missing descriptive fields
    descriptive_fields = ["mutazione_indotta", "spinta_selettiva", "uso_funzione"]
    for trait_id, data in traits.items():
        for field in descriptive_fields:
            value = data.get(field)
            if not isinstance(value, str) or not value.strip():
                issues.append(
                    Issue(
                        "warning",
                        f"Tratto '{data.get('label', trait_id)}' privo del campo descrittivo '{field}'.",
                    )
                )

    report_text = format_report(issues)
    return issues, report_text


def format_report(issues: Iterable[Issue]) -> str:
    blocking = [issue for issue in issues if issue.kind == "blocking"]
    warnings = [issue for issue in issues if issue.kind == "warning"]

    lines = ["# Trait Data Audit", ""]
    lines.append(f"- Errori bloccanti: {len(blocking)}")
    lines.append(f"- Warning: {len(warnings)}")
    lines.append("")

    if blocking:
        lines.append("## Errori bloccanti")
        lines.append("")
        for issue in sorted(blocking, key=lambda x: x.message.lower()):
            wrapped = textwrap.fill(issue.message, width=100)
            lines.append(f"- {wrapped}")
        lines.append("")

    if warnings:
        lines.append("## Warning")
        lines.append("")
        for issue in sorted(warnings, key=lambda x: x.message.lower()):
            wrapped = textwrap.fill(issue.message, width=100)
            lines.append(f"- {wrapped}")
        lines.append("")

    return "\n".join(lines).rstrip() + "\n"


def run(args: argparse.Namespace) -> int:
    issues, report_text = check_traits()
    blocking = [issue for issue in issues if issue.kind == "blocking"]

    if args.check:
        if blocking:
            for issue in blocking:
                print(f"[BLOCCANTE] {issue.message}", file=sys.stderr)
        expected_path = Path(args.output or DEFAULT_REPORT_PATH)
        if not expected_path.exists():
            print(
                f"Report mancante ({expected_path}). Eseguire lo script senza --check per generarlo.",
                file=sys.stderr,
            )
            return 1
        current_text = expected_path.read_text(encoding="utf-8")
        if current_text != report_text:
            print("Il report generato non coincide con quello salvato. Aggiornare con lo script.", file=sys.stderr)
            import difflib

            diff = difflib.unified_diff(
                current_text.splitlines(),
                report_text.splitlines(),
                fromfile=str(expected_path),
                tofile="generated",
                lineterm="",
            )
            for line in diff:
                print(line, file=sys.stderr)
            return 1
        print("Audit dei tratti: nessuna regressione rilevata.")
        return 1 if blocking else 0

    output_path = Path(args.output or DEFAULT_REPORT_PATH)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(report_text, encoding="utf-8")

    for issue in blocking:
        print(f"[BLOCCANTE] {issue.message}", file=sys.stderr)
    for warning in (issue for issue in issues if issue.kind == "warning"):
        print(f"[WARNING] {warning.message}", file=sys.stderr)

    print(f"Report scritto in {output_path}")
    return 1 if blocking else 0


def parse_args(argv: List[str]) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", help="Percorso del report generato (default: logs/trait_audit.md)")
    parser.add_argument("--check", action="store_true", help="Verifica il report senza riscriverlo")
    return parser.parse_args(argv)


def main(argv: List[str] | None = None) -> int:
    args = parse_args(argv or sys.argv[1:])
    return run(args)


if __name__ == "__main__":
    sys.exit(main())
