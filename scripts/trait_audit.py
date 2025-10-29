#!/usr/bin/env python3
"""Audit trait data consistency across catalog, packs, and appendices."""
from __future__ import annotations

import argparse
import json
import sys
import textwrap
import unicodedata
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, Iterable, List, Tuple

import re

import yaml
from jsonschema import Draft202012Validator, RefResolver, exceptions

REPO_ROOT = Path(__file__).resolve().parents[1]
TRAIT_REFERENCE_PATH = REPO_ROOT / "packs" / "evo_tactics_pack" / "docs" / "catalog" / "trait_reference.json"
PACKS_DATA_PATH = REPO_ROOT / "data" / "packs.yaml"
APPENDIX_PATH = REPO_ROOT / "appendici"
DEFAULT_REPORT_PATH = REPO_ROOT / "logs" / "trait_audit.md"
SCHEMA_DIR = REPO_ROOT / "config" / "schemas"
SCHEMA_REPORT_PATH = REPO_ROOT / "reports" / "schema_validation.json"

SCHEMA_TARGETS = (
    (
        REPO_ROOT / "packs" / "evo_tactics_pack" / "docs" / "catalog" / "trait_reference.json",
        "https://game.schemas.local/catalog.schema.json",
    ),
    (REPO_ROOT / "data" / "biomes.yaml", "https://game.schemas.local/biome.schema.yaml"),
    (REPO_ROOT / "data" / "species.yaml", "https://game.schemas.local/species.schema.yaml"),
)


@dataclass
class Issue:
    kind: str  # "blocking" or "warning"
    message: str


def load_schema_documents() -> Dict[str, Dict[str, Any]]:
    store: Dict[str, Dict[str, Any]] = {}
    if not SCHEMA_DIR.exists():
        return store

    for path in sorted(SCHEMA_DIR.glob("*.schema.json")) + sorted(SCHEMA_DIR.glob("*.schema.yaml")):
        if path.suffix == ".json":
            schema: Dict[str, Any] = json.loads(path.read_text(encoding="utf-8"))
        else:
            schema = yaml.safe_load(path.read_text(encoding="utf-8"))
        schema_id = schema.get("$id") or f"https://game.schemas.local/{path.name}"
        schema.setdefault("$id", schema_id)
        store[schema_id] = schema
    return store


def load_structured_data(path: Path) -> Any:
    if path.suffix == ".json":
        return json.loads(path.read_text(encoding="utf-8"))
    if path.suffix in {".yaml", ".yml"}:
        return yaml.safe_load(path.read_text(encoding="utf-8"))
    raise ValueError(f"Formato non supportato per {path.suffix}")


def _format_error_path(error: exceptions.ValidationError) -> str:
    if not error.absolute_path:
        return "<root>"
    return "/" + "/".join(str(part) for part in error.absolute_path)


def validate_schemas() -> Tuple[List[Dict[str, Any]], List[Issue]]:
    store = load_schema_documents()
    entries: List[Dict[str, Any]] = []
    issues: List[Issue] = []

    for data_path, schema_id in SCHEMA_TARGETS:
        relative_path = str(data_path.relative_to(REPO_ROOT))
        entry: Dict[str, Any] = {
            "path": relative_path,
            "schema": schema_id,
            "errors": [],
            "warnings": [],
        }

        schema = store.get(schema_id)
        if not data_path.exists():
            message = f"File mancante per la validazione: {relative_path}."
            entry["errors"].append(message)
            issues.append(Issue("blocking", message))
            entries.append(_finalize_schema_entry(entry))
            continue

        if schema is None:
            message = f"Schema '{schema_id}' non caricato."
            entry["errors"].append(message)
            issues.append(Issue("blocking", message))
            entries.append(_finalize_schema_entry(entry))
            continue

        try:
            data = load_structured_data(data_path)
        except Exception as exc:  # noqa: BLE001 - vogliamo mostrare l'errore originale
            message = f"Errore di parsing per {relative_path}: {exc}."
            entry["errors"].append(message)
            issues.append(Issue("blocking", message))
            entries.append(_finalize_schema_entry(entry))
            continue

        Draft202012Validator.check_schema(schema)
        resolver = RefResolver.from_schema(schema, store=store)
        validator = Draft202012Validator(schema, resolver=resolver)

        validation_errors = sorted(validator.iter_errors(data), key=lambda err: list(err.absolute_path))
        for error in validation_errors:
            path_repr = _format_error_path(error)
            message = f"{relative_path}{path_repr}: {error.message}"
            entry["errors"].append(message)
            issues.append(Issue("blocking", message))

        entries.append(_finalize_schema_entry(entry))

    return entries, issues


def _finalize_schema_entry(entry: Dict[str, Any]) -> Dict[str, Any]:
    if entry["errors"]:
        entry["status"] = "error"
    elif entry["warnings"]:
        entry["status"] = "warning"
    else:
        entry["status"] = "ok"
    return entry


def build_schema_report(entries: List[Dict[str, Any]]) -> Dict[str, Any]:
    return {
        "generated_at": datetime.utcnow().replace(microsecond=0).isoformat() + "Z",
        "files": entries,
    }


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
        declared_slots = data.get("slot", []) or []
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
    trait_issues, report_text = check_traits()
    schema_entries, schema_issues = validate_schemas()
    issues = trait_issues + schema_issues
    blocking = [issue for issue in issues if issue.kind == "blocking"]
    schema_report = build_schema_report(schema_entries)

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

        if not SCHEMA_REPORT_PATH.exists():
            print(
                f"Report schema mancante ({SCHEMA_REPORT_PATH}). Eseguire lo script senza --check per generarlo.",
                file=sys.stderr,
            )
            return 1

        try:
            existing_schema_report = json.loads(SCHEMA_REPORT_PATH.read_text(encoding="utf-8"))
        except json.JSONDecodeError as exc:
            print(
                f"Impossibile leggere {SCHEMA_REPORT_PATH}: {exc}",
                file=sys.stderr,
            )
            return 1

        normalized_expected = dict(schema_report)
        normalized_existing = dict(existing_schema_report)
        normalized_expected["generated_at"] = None
        normalized_existing["generated_at"] = None

        if normalized_existing != normalized_expected:
            print(
                "Il report schema_validation.json non è aggiornato. Rieseguire l'audit senza --check.",
                file=sys.stderr,
            )
            import difflib

            diff = difflib.unified_diff(
                json.dumps(existing_schema_report, ensure_ascii=False, indent=2).splitlines(),
                json.dumps(schema_report, ensure_ascii=False, indent=2).splitlines(),
                fromfile=str(SCHEMA_REPORT_PATH),
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

    SCHEMA_REPORT_PATH.parent.mkdir(parents=True, exist_ok=True)
    SCHEMA_REPORT_PATH.write_text(
        json.dumps(schema_report, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )

    for issue in blocking:
        print(f"[BLOCCANTE] {issue.message}", file=sys.stderr)
    for warning in (issue for issue in issues if issue.kind == "warning"):
        print(f"[WARNING] {warning.message}", file=sys.stderr)

    print(f"Report scritto in {output_path}")
    print(f"Report schema scritto in {SCHEMA_REPORT_PATH}")
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
