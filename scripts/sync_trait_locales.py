#!/usr/bin/env python3
"""Sincronizza i testi dei trait con i file di localizzazione."""
from __future__ import annotations

import argparse
import json
import os
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, Iterable, List

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_TRAITS_DIR = ROOT / "data" / "traits"
DEFAULT_LOCALES_DIR = ROOT / "locales"
DEFAULT_LANGUAGE = "it"
DEFAULT_FALLBACK = None
DEFAULT_SCHEMA_PATH = ROOT / "config" / "i18n" / "trait_locales.schema.json"
TEXT_FIELDS = (
    "label",
    "description",
    "flavor_text",
    "mutazione_indotta",
    "spinta_selettiva",
    "uso_funzione",
    "debolezza",
    "fattore_mantenimento_energetico",
)
EXCLUDED_FILES = {"index.json", "species_affinity.json"}


@dataclass
class SyncResult:
    """Risultato dell'operazione di sincronizzazione."""

    updated_traits: List[Path]
    locale_updated: bool


@dataclass
class TraitSyncOutcome:
    """Esito della sincronizzazione per un singolo tratto."""

    trait_id: str
    trait_updated: bool
    locale_updated: bool


def iter_trait_files(traits_dir: Path) -> Iterable[Path]:
    """Restituisce i file JSON dei trait da processare."""

    for path in sorted(traits_dir.rglob("*.json")):
        if path.name in EXCLUDED_FILES:
            continue
        yield path


def load_json(path: Path) -> Dict:
    with path.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def dump_json(path: Path, payload: Dict) -> None:
    text = json.dumps(payload, ensure_ascii=False, indent=2)
    path.write_text(f"{text}\n", encoding="utf-8")


def ensure_locale_bundle(
    locale_path: Path, language: str, fallback: str | None, schema_path: Path
) -> Dict:
    """Carica o inizializza il bundle di localizzazione."""

    relative_schema = os.path.relpath(schema_path, locale_path.parent)

    if locale_path.exists():
        bundle = load_json(locale_path)
        bundle.setdefault("$schema", Path(relative_schema).as_posix())
        bundle["language"] = language
        bundle["fallback"] = fallback
        bundle.setdefault("entries", {})
        return bundle

    bundle = {
        "$schema": Path(relative_schema).as_posix(),
        "language": language,
        "fallback": fallback,
        "entries": {},
    }
    return bundle


def normalise_entries(entries: Dict[str, Dict[str, str]]) -> Dict[str, Dict[str, str]]:
    """Restituisce una copia ordinata delle entry per avere diff stabili."""

    ordered: Dict[str, Dict[str, str]] = {}
    for trait_id in sorted(entries):
        fields = entries[trait_id]
        ordered[trait_id] = {key: fields[key] for key in sorted(fields)}
    return ordered


def sync_trait(
    path: Path,
    bundle_entries: Dict[str, Dict[str, str]],
    dry_run: bool,
    *,
    language: str,
    source_language: str,
) -> TraitSyncOutcome:
    """Aggiorna un singolo trait e restituisce lo stato dettagliato."""

    data = load_json(path)
    trait_id = data.get("id") or path.stem
    entry = bundle_entries.setdefault(trait_id, {})
    trait_updated = False
    locale_updated = False

    is_source_language = language == source_language

    for field in TEXT_FIELDS:
        value = data.get(field)

        if isinstance(value, str):
            stripped = value.strip()

            if stripped.startswith("i18n:"):
                localized = entry.get(field)
                if localized and localized != value:
                    trait_updated = True
                    if not dry_run:
                        data[field] = localized
                continue

            if stripped:
                current_value = entry.get(field)

                if is_source_language:
                    if current_value != stripped:
                        entry[field] = stripped
                        locale_updated = True
                else:
                    if current_value is None:
                        entry[field] = stripped
                        locale_updated = True
            else:
                if field in entry:
                    entry.pop(field)
                    locale_updated = True
        else:
            if field in entry:
                entry.pop(field)
                locale_updated = True

    if entry:
        bundle_entries[trait_id] = entry
    else:
        if trait_id in bundle_entries:
            bundle_entries.pop(trait_id, None)
            locale_updated = True

    if trait_updated and not dry_run:
        dump_json(path, data)

    return TraitSyncOutcome(
        trait_id=trait_id,
        trait_updated=trait_updated,
        locale_updated=locale_updated,
    )


def sync_locales(
    traits_dir: Path,
    locales_dir: Path,
    language: str,
    fallback: str | None,
    dry_run: bool,
    schema_path: Path,
) -> SyncResult:
    """Esegue la sincronizzazione completa."""

    locale_path = locales_dir / language / "traits.json"
    locale_path.parent.mkdir(parents=True, exist_ok=True)
    bundle = ensure_locale_bundle(locale_path, language, fallback, schema_path)
    entries = bundle.setdefault("entries", {})

    updated_traits: List[Path] = []
    valid_ids: set[str] = set()
    locale_dirty = False
    source_language = DEFAULT_LANGUAGE
    for trait_path in iter_trait_files(traits_dir):
        outcome = sync_trait(
            trait_path,
            entries,
            dry_run=dry_run,
            language=language,
            source_language=source_language,
        )
        valid_ids.add(outcome.trait_id)
        if outcome.trait_updated:
            updated_traits.append(trait_path)
        if outcome.locale_updated:
            locale_dirty = True

    # Rimuove eventuali ID non più presenti.
    for trait_id in list(entries.keys()):
        if trait_id not in valid_ids:
            entries.pop(trait_id)
            locale_dirty = True

    bundle["entries"] = normalise_entries(entries)
    if dry_run:
        locale_dirty = False
    elif locale_dirty:
        dump_json(locale_path, bundle)

    return SyncResult(updated_traits=updated_traits, locale_updated=locale_dirty)


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--traits-dir",
        type=Path,
        default=DEFAULT_TRAITS_DIR,
        help="Cartella principale dei trait (default: data/traits).",
    )
    parser.add_argument(
        "--locales-dir",
        type=Path,
        default=DEFAULT_LOCALES_DIR,
        help="Cartella di destinazione per i file di localizzazione (default: locales).",
    )
    parser.add_argument(
        "--language",
        default=DEFAULT_LANGUAGE,
        help="Lingua da sincronizzare (default: it).",
    )
    parser.add_argument(
        "--fallback",
        default=DEFAULT_FALLBACK,
        help="Lingua di fallback (default: nessuna).",
    )
    parser.add_argument(
        "--schema",
        type=Path,
        default=DEFAULT_SCHEMA_PATH,
        help="Percorso dello schema JSON per i bundle (default: config/i18n/trait_locales.schema.json).",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Mostra i file che verrebbero aggiornati senza applicare modifiche.",
    )
    return parser


def main() -> None:
    parser = build_parser()
    args = parser.parse_args()

    traits_dir = args.traits_dir.resolve()
    locales_dir = args.locales_dir.resolve()
    schema_path = args.schema.resolve()

    if not traits_dir.exists():
        raise SystemExit(f"Directory trait non trovata: {traits_dir}")
    if not schema_path.exists():
        raise SystemExit(f"Schema non trovato: {schema_path}")

    fallback: str | None
    if isinstance(args.fallback, str) and args.fallback.lower() in {"", "none", "null"}:
        fallback = None
    else:
        fallback = args.fallback

    result = sync_locales(
        traits_dir=traits_dir,
        locales_dir=locales_dir,
        language=args.language,
        fallback=fallback,
        dry_run=args.dry_run,
        schema_path=schema_path,
    )

    if args.dry_run:
        if not result.updated_traits:
            print("Nessuna modifica necessaria.")
        else:
            print("Verrebbero aggiornati i seguenti trait:")
            for path in result.updated_traits:
                print(f" - {path.relative_to(ROOT)}")
    else:
        print("Trait aggiornati:")
        for path in result.updated_traits:
            print(f" - {path.relative_to(ROOT)}")
        if result.locale_updated:
            print("File locale aggiornato.")


if __name__ == "__main__":
    main()
