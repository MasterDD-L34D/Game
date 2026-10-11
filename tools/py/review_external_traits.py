#!/usr/bin/env python3
"""Pipeline di revisione per i trait generati da sorgenti esterne.

Il comando analizza il contenuto di ``data/traits/_drafts`` e applica una
serie di controlli automatici:

* elenca i file di bozza e riporta metadati utili (origine editoriale,
  campi mancanti, errori di convalida);
* valuta criteri di promozione (tutti i campi obbligatori compilati e
  validazione contro lo schema canonico) e sposta automaticamente i trait
  idonei nella relativa cartella di destinazione in ``data/traits``;
* aggiorna il campo ``completion_flags`` per annotare l'esito della revisione;
* sposta le bozze rifiutate in ``data/traits/_hold`` e registra un log
  esplicativo in ``logs/trait_review.log``.

Esempio di utilizzo::

    python tools/py/review_external_traits.py --dry-run

    python tools/py/review_external_traits.py \
        --draft-dir data/traits/_drafts \
        --traits-dir data/traits \
        --schema config/schemas/trait.schema.json

La modalità ``--dry-run`` permette di verificare l'esito della revisione
senza effettuare modifiche ai file o muoverli di directory.
"""

from __future__ import annotations

import argparse
import json
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Iterable, List, Sequence

from jsonschema import Draft202012Validator, exceptions as jsonschema_exceptions

REPO_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_DRAFT_DIR = REPO_ROOT / "data" / "traits" / "_drafts"
DEFAULT_TRAITS_DIR = REPO_ROOT / "data" / "traits"
DEFAULT_SCHEMA_PATH = REPO_ROOT / "config" / "schemas" / "trait.schema.json"
DEFAULT_LOG_PATH = REPO_ROOT / "logs" / "trait_review.log"
HOLD_DIR_NAME = "_hold"
PLACEHOLDER_TOKENS = ("todo", "da definire", "tbd")
REQUIRED_FIELDS: Sequence[str] = (
    "id",
    "label",
    "famiglia_tipologia",
    "fattore_mantenimento_energetico",
    "tier",
    "slot",
    "sinergie",
    "conflitti",
    "mutazione_indotta",
    "uso_funzione",
    "spinta_selettiva",
)


@dataclass
class ReviewOutcome:
    """Risultato della revisione di un singolo file di bozza."""

    trait_id: str
    origin: str
    missing_fields: List[str]
    schema_errors: List[str]
    status: str
    reason: str
    source_path: Path
    destination_path: Path | None


def load_json(path: Path) -> dict:
    try:
        with path.open("r", encoding="utf-8") as handle:
            return json.load(handle)
    except json.JSONDecodeError as exc:  # pragma: no cover - logico ma raro
        raise ValueError(f"JSON non valido in {path}: {exc}") from exc


def ensure_validator(schema_path: Path) -> Draft202012Validator:
    try:
        with schema_path.open("r", encoding="utf-8") as handle:
            schema = json.load(handle)
    except json.JSONDecodeError as exc:
        raise ValueError(f"Schema non valido ({schema_path}): {exc}") from exc
    return Draft202012Validator(schema)


def normalize_category(famiglia_tipologia: str) -> str:
    base = famiglia_tipologia.split("/", 1)[0]
    sanitized = "".join(
        ch.lower() if ch.isalnum() else "_" for ch in base.strip()
    )
    while "__" in sanitized:
        sanitized = sanitized.replace("__", "_")
    return sanitized.strip("_")


def infer_destination(payload: dict, traits_dir: Path) -> Path | None:
    famiglia = payload.get("famiglia_tipologia")
    trait_id = payload.get("id")
    if not isinstance(famiglia, str) or not famiglia.strip():
        return None
    if not isinstance(trait_id, str) or not trait_id:
        return None
    category = normalize_category(famiglia)
    if not category:
        return None
    return traits_dir / category / f"{trait_id}.json"


def detect_missing_fields(payload: dict) -> List[str]:
    missing: List[str] = []
    for field in REQUIRED_FIELDS:
        value = payload.get(field)
        if field in {"slot", "sinergie", "conflitti"}:
            if not isinstance(value, list):
                missing.append(field)
        elif not isinstance(value, str) or not value.strip():
            missing.append(field)
        elif any(token in value.strip().lower() for token in PLACEHOLDER_TOKENS):
            missing.append(field)
    return missing


def collect_schema_errors(
    payload: dict, validator: Draft202012Validator
) -> List[str]:
    try:
        errors = sorted(validator.iter_errors(payload), key=lambda err: err.json_path)
    except jsonschema_exceptions.SchemaError as exc:  # pragma: no cover
        raise ValueError(f"Errore nel validator: {exc}") from exc
    formatted: List[str] = []
    for error in errors:
        location = " / ".join(str(part) for part in error.absolute_path) or "<root>"
        formatted.append(f"{location}: {error.message}")
    return formatted


def update_completion_flags(payload: dict, approved: bool) -> None:
    flags = payload.get("completion_flags")
    if not isinstance(flags, dict):
        flags = {}
        payload["completion_flags"] = flags
    flags["reviewed"] = True
    flags["review_passed"] = approved


def write_json(path: Path, payload: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as handle:
        json.dump(payload, handle, ensure_ascii=False, indent=2)
        handle.write("\n")


def log_review(log_path: Path, outcome: ReviewOutcome) -> None:
    log_path.parent.mkdir(parents=True, exist_ok=True)
    timestamp = datetime.now().isoformat(timespec="seconds")
    line = (
        f"{timestamp}\t{outcome.trait_id}\t{outcome.status}\t{outcome.reason}\n"
    )
    with log_path.open("a", encoding="utf-8") as handle:
        handle.write(line)


def review_draft(
    path: Path,
    validator: Draft202012Validator,
    traits_dir: Path,
    log_path: Path,
    dry_run: bool,
) -> ReviewOutcome:
    payload = load_json(path)
    trait_id = payload.get("id") or path.stem
    origin = payload.get("data_origin") or "<sconosciuta>"

    missing_fields = detect_missing_fields(payload)
    schema_errors = collect_schema_errors(payload, validator)

    reason_parts: List[str] = []
    if missing_fields:
        reason_parts.append("Campi mancanti: " + ", ".join(sorted(missing_fields)))
    if schema_errors:
        sample = "; ".join(schema_errors[:3])
        if len(schema_errors) > 3:
            sample += f" (+{len(schema_errors) - 3} altri)"
        reason_parts.append(f"Errori schema: {sample}")

    destination = infer_destination(payload, traits_dir)
    if destination is None:
        reason_parts.append("Destinazione non determinabile")
    elif not destination.parent.exists():
        reason_parts.append(
            "Cartella di destinazione assente: "
            f"{destination.parent.relative_to(traits_dir)}"
        )
        destination = None

    status = "approved"
    if missing_fields or schema_errors or destination is None:
        status = "rejected"

    if status == "approved" and destination is not None and destination.exists():
        status = "rejected"
        reason_parts.append(f"File già presente: {destination.relative_to(traits_dir)}")

    reason = "; ".join(reason_parts) if reason_parts else "OK"

    approved = status == "approved"
    update_completion_flags(payload, approved=approved)

    final_destination: Path | None = destination if approved else None

    if not dry_run:
        if approved and destination is not None:
            write_json(destination, payload)
            path.unlink()
            final_destination = destination
        else:
            hold_dir = traits_dir / HOLD_DIR_NAME
            hold_path = hold_dir / path.name
            write_json(hold_path, payload)
            path.unlink()
            final_destination = hold_path

        log_review(
            log_path,
            ReviewOutcome(
                trait_id=trait_id,
                origin=origin,
                missing_fields=missing_fields,
                schema_errors=schema_errors,
                status=status,
                reason=reason,
                source_path=path,
                destination_path=final_destination,
            ),
        )

    return ReviewOutcome(
        trait_id=trait_id,
        origin=origin,
        missing_fields=missing_fields,
        schema_errors=schema_errors,
        status=status,
        reason=reason,
        source_path=path,
        destination_path=final_destination,
    )


def print_summary(outcomes: Sequence[ReviewOutcome]) -> None:
    if not outcomes:
        print("Nessuna bozza trovata.")
        return

    header = f"{'ID':<32}  {'Origine':<30}  {'Status':<9}  Note"
    print(header)
    print("-" * len(header))
    for outcome in outcomes:
        origin = (outcome.origin or "<n/d>")[:30]
        note = outcome.reason
        print(f"{outcome.trait_id:<32}  {origin:<30}  {outcome.status:<9}  {note}")


def iter_drafts(directory: Path) -> Iterable[Path]:
    return sorted(directory.glob("*.json"))


def main() -> None:
    parser = argparse.ArgumentParser(description="Revisione delle bozze di trait esterni.")
    parser.add_argument(
        "--draft-dir",
        type=Path,
        default=DEFAULT_DRAFT_DIR,
        help="Directory contenente le bozze da revisionare.",
    )
    parser.add_argument(
        "--traits-dir",
        type=Path,
        default=DEFAULT_TRAITS_DIR,
        help="Directory radice dei trait finali.",
    )
    parser.add_argument(
        "--schema",
        type=Path,
        default=DEFAULT_SCHEMA_PATH,
        help="Percorso dello schema JSON per la validazione.",
    )
    parser.add_argument(
        "--log-file",
        type=Path,
        default=DEFAULT_LOG_PATH,
        help="File di log per tracciare gli esiti della revisione.",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Esegue i controlli senza modificare o spostare i file.",
    )
    args = parser.parse_args()

    if not args.draft_dir.exists():
        raise SystemExit(f"Directory bozze non trovata: {args.draft_dir}")

    validator = ensure_validator(args.schema)

    outcomes: List[ReviewOutcome] = []
    for draft_path in iter_drafts(args.draft_dir):
        outcome = review_draft(
            draft_path,
            validator=validator,
            traits_dir=args.traits_dir,
            log_path=args.log_file,
            dry_run=args.dry_run,
        )
        outcomes.append(outcome)

    print_summary(outcomes)


if __name__ == "__main__":
    main()
