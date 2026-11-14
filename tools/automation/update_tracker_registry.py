#!/usr/bin/env python3
"""Synchronise Evo tracker files from ``integration_batches.yml``.

The script mirrors the conventions used by :mod:`tools.automation.evo_batch_runner`
by reusing the shared logging helpers and providing a CLI tailored for
repository automation.  Given the batch registry in
``incoming/lavoro_da_classificare/integration_batches.yml`` it updates the
status markers inside ``TASKS_BREAKDOWN.md`` and ``tasks.yml`` so that the
tracker reflects the current state of each batch.
"""

from __future__ import annotations

import argparse
import datetime as _dt
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, Iterable, Optional, Sequence, Tuple

import yaml

from tools.automation import configure_logging, get_logger


LOGGER = get_logger(__name__)

DEFAULT_BATCHES_FILE = Path("incoming/lavoro_da_classificare/integration_batches.yml")
DEFAULT_TASKS_FILE = Path("incoming/lavoro_da_classificare/tasks.yml")
DEFAULT_BREAKDOWN_FILE = Path("docs/incoming/lavoro_da_classificare/TASKS_BREAKDOWN.md")

_STATUS_MAP = {
    "completato": "done",
    "completata": "done",
    "in_corso": "in_progress",
    "in corso": "in_progress",
    "pianificato": "planned",
    "pianificata": "planned",
    "da_fare": "todo",
    "da fare": "todo",
    "nuovo": "todo",
    "bloccato": "blocked",
    "bloccata": "blocked",
}

_COMPLETED = {"done", "completed", "shipped", "merged"}

_MARKER_BY_STATUS = {
    "done": "x",
    "completed": "x",
    "shipped": "x",
    "merged": "x",
    "in_progress": "~",
    "planned": " ",
    "todo": " ",
    "blocked": "!",
}


@dataclass
class Batch:
    """Representation of a batch entry inside ``integration_batches.yml``."""

    batch_id: str
    status: str
    completed_at: Optional[_dt.date]

    @property
    def normalised_status(self) -> str:
        return normalise_status(self.status)


def normalise_status(status: Optional[str]) -> str:
    """Return the tracker-friendly representation of *status*."""

    if not status:
        return ""
    key = status.lower().replace("-", "_").strip()
    return _STATUS_MAP.get(key, key)


def marker_for_status(status: str) -> str:
    """Return the checkbox marker to use inside the Markdown breakdown."""

    if not status:
        return " "
    return _MARKER_BY_STATUS.get(status, "x" if status in _COMPLETED else " ")


def load_batches(path: Path) -> Dict[str, Batch]:
    """Read *path* and return the batches keyed by their identifier."""

    LOGGER.debug("Loading batches from %%s", path)
    try:
        with path.open("r", encoding="utf-8") as handle:
            data = yaml.safe_load(handle) or {}
    except FileNotFoundError as exc:
        raise SystemExit(f"Unable to locate batches registry: {path}") from exc

    batches: Dict[str, Batch] = {}
    for entry in data.get("batches", []):
        batch_id = entry.get("id")
        status = entry.get("status") or ""
        completed_at = parse_date(entry.get("completed_at"))
        if not batch_id:
            LOGGER.warning("Skipping batch without identifier: %s", entry)
            continue
        batches[batch_id] = Batch(batch_id=batch_id, status=status, completed_at=completed_at)
    LOGGER.debug("Loaded %d batch entries", len(batches))
    return batches


def parse_date(value: Optional[object]) -> Optional[_dt.date]:
    if not value:
        return None
    if isinstance(value, _dt.datetime):
        return value.date()
    if isinstance(value, _dt.date):
        return value
    try:
        return _dt.datetime.fromisoformat(value).date()
    except ValueError:
        try:
            return _dt.date.fromisoformat(value)
        except ValueError:
            LOGGER.debug("Unable to parse completed_at value: %s", value)
            return None


def select_batches(batches: Dict[str, Batch], names: Optional[Sequence[str]]) -> Dict[str, Batch]:
    if not names:
        return batches
    selected: Dict[str, Batch] = {}
    for name in names:
        batch = batches.get(name)
        if not batch:
            raise SystemExit(f"Unknown batch '{name}'. Available: {', '.join(sorted(batches))}")
        selected[name] = batch
    return selected


def update_tasks_yaml(
    content: str,
    batches: Dict[str, Batch],
    *,
    preserve_trailing_newline: bool,
    update_meta: bool,
) -> Tuple[str, bool]:
    lines = content.splitlines()
    changed = False
    current_batch: Optional[str] = None

    latest_date: Optional[_dt.date] = (
        most_recent_completion(batches.values()) if update_meta else None
    )

    for idx, line in enumerate(lines):
        stripped = line.lstrip()
        indent = len(line) - len(stripped)

        if stripped.startswith("- id:"):
            current_batch = None
        elif stripped.startswith("batch:"):
            current_batch = stripped.split(":", 1)[1].strip()
        elif stripped.startswith("status:") and current_batch and current_batch in batches:
            new_status = batches[current_batch].normalised_status or stripped.split(":", 1)[1].strip()
            if stripped.split(":", 1)[1].strip() != new_status:
                LOGGER.debug(
                    "Updating status for task batch %s: %s -> %s",
                    current_batch,
                    stripped.split(":", 1)[1].strip(),
                    new_status,
                )
                lines[idx] = f"{' ' * indent}status: {new_status}"
                changed = True

        if latest_date and stripped.startswith("last_update:"):
            new_value = latest_date.strftime("%Y-%m-%d")
            if stripped.split(":", 1)[1].strip() != new_value:
                LOGGER.debug("Updating tracker last_update: %s", new_value)
                lines[idx] = f"{' ' * indent}last_update: {new_value}"
                changed = True
                latest_date = None  # avoid updating multiple times

    updated = "\n".join(lines)
    if preserve_trailing_newline and not updated.endswith("\n"):
        updated += "\n"
    return updated, changed


def most_recent_completion(batches: Iterable[Batch]) -> Optional[_dt.date]:
    dates = [batch.completed_at for batch in batches if batch.completed_at]
    if not dates:
        return None
    return max(dates)


def update_breakdown(
    content: str,
    batches: Dict[str, Batch],
    *,
    preserve_trailing_newline: bool,
) -> Tuple[str, bool]:
    lines = content.splitlines()
    changed = False
    current_batch: Optional[str] = None

    for idx, line in enumerate(lines):
        header = line.strip()
        if header.startswith("## Batch "):
            current_batch = extract_batch_from_header(header)
            continue
        if not current_batch or current_batch not in batches:
            continue
        if line.lstrip().startswith("- ["):
            marker = marker_for_status(batches[current_batch].normalised_status)
            prefix, rest = line.split("[", 1)
            current_marker = rest[:1]
            if current_marker != marker:
                LOGGER.debug(
                    "Updating checkbox for batch %s: %s -> %s",
                    current_batch,
                    current_marker,
                    marker,
                )
                lines[idx] = f"{prefix}[{marker}]{rest[1:]}"
                changed = True

    updated = "\n".join(lines)
    if preserve_trailing_newline and not updated.endswith("\n"):
        updated += "\n"
    return updated, changed


def extract_batch_from_header(header: str) -> Optional[str]:
    start = header.find("`")
    end = header.rfind("`")
    if start != -1 and end != -1 and end > start:
        return header[start + 1 : end]
    if header.startswith("## Batch "):
        return header[len("## Batch ") :].strip()
    return None


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--batches-file", type=Path, default=DEFAULT_BATCHES_FILE)
    parser.add_argument("--tasks-file", type=Path, default=DEFAULT_TASKS_FILE)
    parser.add_argument("--breakdown-file", type=Path, default=DEFAULT_BREAKDOWN_FILE)
    parser.add_argument("--batch", action="append", dest="batches", help="Limit the update to the selected batch identifier(s).")
    parser.add_argument("--check", action="store_true", help="Fail if the tracker files are not up-to-date.")
    parser.add_argument("--verbose", action="store_true", help="Enable debug logging output.")
    return parser


def main(argv: Optional[Sequence[str]] = None) -> int:
    args = build_parser().parse_args(argv)
    configure_logging(verbose=args.verbose, logger=LOGGER)

    batches = load_batches(args.batches_file)
    if not batches:
        LOGGER.info("No batches found in registry: nothing to update.")
        return 0

    selected_batches = select_batches(batches, args.batches)

    tasks_content = args.tasks_file.read_text(encoding="utf-8") if args.tasks_file.exists() else ""
    update_meta = len(selected_batches) == len(batches)

    tasks_new, tasks_changed = update_tasks_yaml(
        tasks_content,
        selected_batches,
        preserve_trailing_newline=tasks_content.endswith("\n"),
        update_meta=update_meta,
    )

    breakdown_content = (
        args.breakdown_file.read_text(encoding="utf-8") if args.breakdown_file.exists() else ""
    )
    breakdown_new, breakdown_changed = update_breakdown(
        breakdown_content,
        selected_batches,
        preserve_trailing_newline=breakdown_content.endswith("\n"),
    )

    any_change = tasks_changed or breakdown_changed

    if args.check:
        if any_change:
            LOGGER.error(
                "Tracker files are out-of-date. Re-run without --check to apply the updates."
            )
            return 1
        LOGGER.info("Tracker files are up-to-date.")
        return 0

    if tasks_changed:
        LOGGER.info("Writing updated tasks file to %s", args.tasks_file)
        args.tasks_file.write_text(tasks_new, encoding="utf-8")
    if breakdown_changed:
        LOGGER.info("Writing updated breakdown file to %s", args.breakdown_file)
        args.breakdown_file.write_text(breakdown_new, encoding="utf-8")

    if not any_change:
        LOGGER.info("Tracker already up-to-date.")
    return 0


if __name__ == "__main__":  # pragma: no cover
    raise SystemExit(main())
