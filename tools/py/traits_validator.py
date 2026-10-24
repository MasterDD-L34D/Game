#!/usr/bin/env python3
"""Validatore per l'inventario dei trait elencato in docs/catalog/traits_inventory.json."""
from __future__ import annotations

import argparse
import csv
import json
import sys
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import List, Sequence

import yaml

ROOT_DIR = Path(__file__).resolve().parents[2]
DEFAULT_INVENTORY = ROOT_DIR / "docs" / "catalog" / "traits_inventory.json"
DEFAULT_LOG_FILE = ROOT_DIR / "logs" / "traits_tracking.md"

ALLOWED_STATES = {"core", "mock"}
KNOWN_TYPES = {"reference", "specie", "evento"}
SUPPORTED_EXTENSIONS = {".json", ".yaml", ".yml", ".csv"}


@dataclass
class ResourceReport:
    """Risultato di validazione per una singola risorsa dell'inventario."""

    path: Path
    state: str
    type: str
    errors: List[str] = field(default_factory=list)
    warnings: List[str] = field(default_factory=list)

    def is_success(self) -> bool:
        return not self.errors

    def label(self) -> str:
        return str(self.path)


@dataclass
class InventoryReport:
    """Riepilogo complessivo della validazione dell'inventario."""

    generated_at: str | None
    resources: Sequence[ResourceReport]
    core_traits: Sequence[str]
    errors: List[str]
    warnings: List[str]

    @property
    def total_resources(self) -> int:
        return len(self.resources)

    @property
    def core_traits_total(self) -> int:
        return len(self.core_traits)

    @property
    def core_resources(self) -> int:
        return sum(1 for item in self.resources if item.state == "core")

    @property
    def mock_resources(self) -> int:
        return sum(1 for item in self.resources if item.state == "mock")

    @property
    def core_valid(self) -> int:
        return sum(1 for item in self.resources if item.state == "core" and item.is_success())

    @property
    def mock_valid(self) -> int:
        return sum(1 for item in self.resources if item.state == "mock" and item.is_success())

    @property
    def has_errors(self) -> bool:
        if self.errors:
            return True
        return any(item.errors for item in self.resources)


class TraitsInventoryValidator:
    """Esegue i controlli su schema e contenuti dell'inventario trait."""

    def __init__(self, inventory_path: Path) -> None:
        self.inventory_path = inventory_path
        self.root_dir = ROOT_DIR

    def validate(self) -> InventoryReport:
        errors: List[str] = []
        warnings: List[str] = []

        if not self.inventory_path.exists():
            raise FileNotFoundError(f"Inventario non trovato: {self.inventory_path}")

        try:
            with self.inventory_path.open("r", encoding="utf-8") as fh:
                payload = json.load(fh)
        except json.JSONDecodeError as exc:  # pragma: no cover - errore bloccante raro
            raise ValueError(
                f"Inventario {self._relative(self.inventory_path)} non è un JSON valido: {exc}"
            ) from exc

        generated_at = payload.get("generated_at")
        if generated_at is not None and not self._is_valid_iso_timestamp(generated_at):
            warnings.append(
                "Campo 'generated_at' non è in formato ISO 8601: "
                f"{generated_at!r}"
            )

        raw_core_traits = payload.get("core_traits")
        core_traits: List[str] = []
        if raw_core_traits is None:
            core_traits = []
        elif not isinstance(raw_core_traits, list):
            raise ValueError(
                "Campo 'core_traits' deve essere una lista di identificativi trait se presente."
            )
        else:
            seen: set[str] = set()
            for index, value in enumerate(raw_core_traits):
                if not isinstance(value, str) or not value.strip():
                    errors.append(
                        f"core_traits[{index}] deve essere una stringa non vuota"
                    )
                    continue
                normalized = value.strip()
                if normalized in seen:
                    warnings.append(
                        f"core_traits[{index}] duplicato: {normalized}"
                    )
                else:
                    seen.add(normalized)
                core_traits.append(normalized)

        resources_data = payload.get("resources")
        if not isinstance(resources_data, list):
            raise ValueError(
                "Campo 'resources' mancante o non è una lista nell'inventario trait."
            )

        resource_reports: List[ResourceReport] = []
        seen_paths: dict[Path, int] = {}

        for index, resource in enumerate(resources_data):
            report = self._validate_resource(resource, index, seen_paths)
            resource_reports.append(report)

        return InventoryReport(
            generated_at=generated_at,
            resources=resource_reports,
            core_traits=core_traits,
            errors=errors,
            warnings=warnings,
        )

    def _validate_resource(
        self,
        resource: object,
        index: int,
        seen_paths: dict[Path, int],
    ) -> ResourceReport:
        errors: List[str] = []
        warnings: List[str] = []

        if not isinstance(resource, dict):
            return ResourceReport(
                path=self.inventory_path,
                state="unknown",
                type="unknown",
                errors=[
                    f"Elemento resources[{index}] non è un oggetto JSON valido: {resource!r}"
                ],
                warnings=[],
            )

        path_value = resource.get("path")
        state_value = resource.get("state")
        type_value = resource.get("type")

        if not isinstance(path_value, str) or not path_value.strip():
            errors.append(
                f"Elemento resources[{index}] ha 'path' mancante o vuoto"
            )
            resource_path = self.inventory_path
        else:
            resource_path = self.root_dir / path_value

        if not isinstance(state_value, str):
            errors.append(
                f"{path_value or f'resources[{index}]'}: campo 'state' deve essere stringa"
            )
            state_value = "unknown"
        else:
            if state_value not in ALLOWED_STATES:
                errors.append(
                    f"{path_value or f'resources[{index}]'}: stato non riconosciuto {state_value!r}"
                )

        if not isinstance(type_value, str):
            errors.append(
                f"{path_value or f'resources[{index}]'}: campo 'type' deve essere stringa"
            )
            type_value = "unknown"
        elif type_value not in KNOWN_TYPES:
            warnings.append(
                f"{path_value or f'resources[{index}]'}: tipo non standard {type_value!r}"
            )

        if resource_path in seen_paths:
            errors.append(
                f"{path_value}: duplicato dell'elemento resources[{seen_paths[resource_path]}]"
            )
        else:
            seen_paths[resource_path] = index

        if resource_path != self.inventory_path:
            file_errors, file_warnings = self._validate_file(resource_path, state_value)
            errors.extend(file_errors)
            warnings.extend(file_warnings)

        return ResourceReport(
            path=resource_path,
            state=state_value,
            type=type_value,
            errors=errors,
            warnings=warnings,
        )

    def _validate_file(
        self,
        path: Path,
        state: str,
    ) -> tuple[List[str], List[str]]:
        errors: List[str] = []
        warnings: List[str] = []

        relative = self._relative(path)

        if not path.exists():
            message = f"Risorsa mancante: {relative}"
            if state == "core":
                errors.append(message)
            else:
                warnings.append(message)
            return errors, warnings

        if path.is_dir():
            errors.append(f"{relative}: atteso file, trovato directory")
            return errors, warnings

        try:
            size = path.stat().st_size
        except OSError as exc:  # pragma: no cover - errori filesystem rari
            errors.append(f"{relative}: impossibile leggere dimensione file ({exc})")
            return errors, warnings

        if size == 0:
            message = f"{relative}: file vuoto"
            if state == "core":
                errors.append(message)
            else:
                warnings.append(message)

        suffix = path.suffix.lower()
        if suffix not in SUPPORTED_EXTENSIONS:
            warnings.append(
                f"{relative}: estensione {suffix or '<nessuna>'} non gestita dal validatore"
            )
            return errors, warnings

        if suffix == ".json":
            self._validate_json(path, errors)
        elif suffix in {".yaml", ".yml"}:
            self._validate_yaml(path, errors)
        elif suffix == ".csv":
            self._validate_csv(path, errors, warnings)

        return errors, warnings

    def _validate_json(self, path: Path, errors: List[str]) -> None:
        try:
            with path.open("r", encoding="utf-8") as fh:
                data = json.load(fh)
        except json.JSONDecodeError as exc:
            errors.append(
                f"{self._relative(path)}: JSON non valido (linea {exc.lineno}, colonna {exc.colno})"
            )
            return

        if data is None:
            errors.append(f"{self._relative(path)}: JSON non può essere null")

    def _validate_yaml(self, path: Path, errors: List[str]) -> None:
        try:
            with path.open("r", encoding="utf-8") as fh:
                data = yaml.safe_load(fh)
        except yaml.YAMLError as exc:
            errors.append(f"{self._relative(path)}: YAML non valido ({exc})")
            return

        if data is None:
            errors.append(f"{self._relative(path)}: YAML vuoto")

    def _validate_csv(
        self,
        path: Path,
        errors: List[str],
        warnings: List[str],
    ) -> None:
        try:
            with path.open("r", encoding="utf-8", newline="") as fh:
                reader = csv.reader(fh)
                try:
                    header = next(reader)
                except StopIteration:
                    errors.append(f"{self._relative(path)}: CSV senza header")
                    return
                if not any(cell.strip() for cell in header):
                    errors.append(f"{self._relative(path)}: header CSV vuoto")
                    return
                row_count = sum(1 for _ in reader)
        except OSError as exc:  # pragma: no cover - errori filesystem rari
            errors.append(f"{self._relative(path)}: impossibile leggere CSV ({exc})")
            return

        if row_count == 0:
            warnings.append(f"{self._relative(path)}: CSV contiene solo header")

    def _relative(self, path: Path) -> str:
        try:
            return str(path.relative_to(self.root_dir))
        except ValueError:
            return str(path)

    @staticmethod
    def _is_valid_iso_timestamp(value: str) -> bool:
        try:
            datetime.fromisoformat(value.replace("Z", "+00:00"))
        except ValueError:
            return False
        return True


def append_log(report: InventoryReport, inventory_path: Path, log_path: Path) -> None:
    timestamp = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    inventory_rel = _relative_to_root(inventory_path)

    lines: List[str] = []
    lines.append(f"\n## {timestamp} · traits_validator.py")
    lines.append(f"- Inventario: `{inventory_rel}`")
    lines.append(
        "- Risorse totali: "
        f"{report.total_resources} (core: {report.core_valid}/{report.core_resources}, "
        f"mock: {report.mock_valid}/{report.mock_resources})"
    )
    if report.warnings or any(item.warnings for item in report.resources):
        lines.append("- ⚠️ Avvisi rilevati:")
        for warning in report.warnings:
            lines.append(f"  - {warning}")
        for item in report.resources:
            for warning in item.warnings:
                lines.append(f"  - {item.label()}: {warning}")
    else:
        lines.append("- Nessun avviso registrato.")

    issues: List[str] = []
    issues.extend(report.errors)
    for item in report.resources:
        for error in item.errors:
            issues.append(f"{item.label()}: {error}")

    if issues:
        lines.append("- ❌ Errori critici:")
        for issue in issues:
            lines.append(f"  - {issue}")
    else:
        lines.append("- ✅ Nessun errore critico.")

    log_path.parent.mkdir(parents=True, exist_ok=True)
    with log_path.open("a", encoding="utf-8") as fh:
        fh.write("\n".join(lines) + "\n")


def _relative_to_root(path: Path) -> str:
    try:
        return str(path.relative_to(ROOT_DIR))
    except ValueError:
        return str(path)


def print_summary(report: InventoryReport, inventory_path: Path) -> None:
    inventory_rel = _relative_to_root(inventory_path)
    print(f"Inventario: {inventory_rel}")
    print(
        "Core validi: "
        f"{report.core_valid}/{report.core_resources} · Mock validi: "
        f"{report.mock_valid}/{report.mock_resources}"
    )

    errors = list(report.errors)
    warnings = list(report.warnings)

    for item in report.resources:
        errors.extend(f"{item.label()}: {msg}" for msg in item.errors)
        warnings.extend(f"{item.label()}: {msg}" for msg in item.warnings)

    if warnings:
        print("\nAvvisi:")
        for warning in warnings:
            print(f" - {warning}")

    if errors:
        print("\nErrori:")
        for error in errors:
            print(f" - {error}")


def parse_args(argv: Sequence[str]) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Convalida i file elencati nell'inventario trait e aggiorna il log."
    )
    parser.add_argument(
        "--inventory",
        type=Path,
        default=DEFAULT_INVENTORY,
        help="Percorso del file inventory JSON da validare.",
    )
    parser.add_argument(
        "--log-file",
        type=Path,
        default=DEFAULT_LOG_FILE,
        help="Percorso del file di log Markdown da aggiornare.",
    )
    parser.add_argument(
        "--no-log",
        action="store_true",
        help="Non aggiornare il log Markdown (utile per esecuzioni locali).",
    )
    return parser.parse_args(argv)


def main(argv: Sequence[str] | None = None) -> int:
    args = parse_args(sys.argv[1:] if argv is None else argv)

    validator = TraitsInventoryValidator(args.inventory)
    report = validator.validate()

    print_summary(report, args.inventory)

    if not args.no_log:
        append_log(report, args.inventory, args.log_file)

    return 1 if report.has_errors else 0


if __name__ == "__main__":  # pragma: no cover - entrypoint CLI
    sys.exit(main())
