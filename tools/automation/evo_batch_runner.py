#!/usr/bin/env python3
"""Batch runner for Evo-Tactics integration tasks.

This utility reads ``incoming/lavoro_da_classificare/tasks.yml`` and allows
operators to list, plan, and execute the commands associated with each batch.

The script is designed to automate the "from here" execution of the integration
plan. It understands task dependencies, skips commands that require manual
inputs (identified by ``<placeholder>`` markers), and can optionally execute the
shell commands recorded in the tracker. Use ``--batch all`` to aggregate every
batch in a single run and ``--auto`` to ignore status gates while marking
dependency chains as completed when their commands succeed.
"""

from __future__ import annotations

import argparse
import dataclasses
import re
import subprocess
from pathlib import Path
from typing import Dict, Iterable, List, Optional, Sequence, Set

import yaml

from tools.automation import configure_logging, get_logger


LOGGER = get_logger(__name__)

# Status names considered to be completed and therefore eligible to unblock
# dependent tasks. The tracker currently uses lowercase strings.
COMPLETED_STATUSES: Set[str] = {"done", "completed", "shipped", "merged"}

# Statuses that are allowed to run automatically. Tasks marked as "blocked" or
# any other unrecognised status are skipped with a warning.
RUNNABLE_STATUSES: Set[str] = {"todo", "in_progress", "planned"}

# Pattern used to detect placeholder markers that still require human input.
PLACEHOLDER_PATTERN = re.compile(r"<[^>]+>")


@dataclasses.dataclass
class Task:
    """Representation of a task entry from ``tasks.yml``."""

    id: str
    batch: str
    title: str
    status: str
    commands: Sequence[str]
    depends_on: Sequence[str]

    raw: Dict[str, object]

    def has_placeholders(self) -> bool:
        return any(PLACEHOLDER_PATTERN.search(cmd or "") for cmd in self.commands)


class TaskRegistry:
    """Loads and queries task information."""

    def __init__(self, tasks_file: Path) -> None:
        self.tasks_file = tasks_file
        self._data = self._load_yaml(tasks_file)
        self._tasks: Dict[str, Task] = self._parse_tasks(self._data)

    @staticmethod
    def _load_yaml(path: Path) -> Dict[str, object]:
        try:
            with path.open("r", encoding="utf-8") as handle:
                return yaml.safe_load(handle) or {}
        except FileNotFoundError as exc:
            raise SystemExit(f"Unable to locate tasks file: {path}") from exc

    @staticmethod
    def _parse_tasks(data: Dict[str, object]) -> Dict[str, Task]:
        parsed: Dict[str, Task] = {}
        for entry in data.get("tasks", []):
            task = Task(
                id=entry.get("id"),
                batch=entry.get("batch"),
                title=entry.get("title", ""),
                status=(entry.get("status") or "").lower(),
                commands=tuple(entry.get("commands", []) or []),
                depends_on=tuple(entry.get("depends_on", []) or []),
                raw=entry,
            )
            parsed[task.id] = task
        return parsed

    def batches(self) -> List[str]:
        values = {task.batch for task in self._tasks.values() if task.batch}
        return sorted(values)

    def tasks_for_batch(self, batch: str) -> List[Task]:
        return [task for task in self._tasks.values() if task.batch == batch]

    def get(self, task_id: str) -> Optional[Task]:
        return self._tasks.get(task_id)

    def all_tasks(self) -> List[Task]:
        return list(self._tasks.values())


def topological_sort(tasks: Iterable[Task]) -> List[Task]:
    """Return tasks ordered by their intra-batch dependencies."""

    tasks_by_id: Dict[str, Task] = {task.id: task for task in tasks}
    remaining: Dict[str, Task] = dict(tasks_by_id)
    ordered: List[Task] = []

    while remaining:
        progressed = False
        for task_id, task in list(remaining.items()):
            intra_deps = [dep for dep in task.depends_on if dep in remaining]
            if intra_deps:
                continue
            ordered.append(task)
            del remaining[task_id]
            progressed = True
        if not progressed:
            cycle = ", ".join(sorted(remaining))
            raise RuntimeError(
                "Detected a dependency cycle inside the batch involving: " + cycle
            )
    return ordered


def topological_sort_all(tasks: Iterable[Task]) -> List[Task]:
    """Return tasks ordered by dependencies, even across batches."""

    tasks_by_id: Dict[str, Task] = {task.id: task for task in tasks}
    remaining: Dict[str, Task] = dict(tasks_by_id)
    ordered: List[Task] = []

    while remaining:
        progressed = False
        for task_id, task in list(remaining.items()):
            blocking = [dep for dep in task.depends_on if dep in remaining]
            if blocking:
                continue
            ordered.append(task)
            del remaining[task_id]
            progressed = True
        if not progressed:
            cycle = ", ".join(sorted(remaining))
            raise RuntimeError(
                "Detected a dependency cycle inside the selected tasks involving: "
                + cycle
            )
    return ordered


def describe_task(task: Task, registry: TaskRegistry) -> str:
    deps = ", ".join(task.depends_on) if task.depends_on else "—"
    manual_flag = " (manual placeholders)" if task.has_placeholders() else ""
    return (
        f"[{task.id}] {task.title}{manual_flag}\n"
        f"  status: {task.status or 'unknown'}\n"
        f"  depends on: {deps}\n"
        f"  commands: {len(task.commands) or 'none'}"
    )


def ensure_dependencies_satisfied(
    task: Task,
    registry: TaskRegistry,
    *,
    auto_mode: bool,
    completed_in_session: Optional[Set[str]] = None,
) -> bool:
    missing: List[str] = []
    completed_in_session = completed_in_session or set()
    for dep in task.depends_on:
        other = registry.get(dep)
        if not other:
            continue  # dependency outside tracker scope
        if auto_mode:
            if other.id in completed_in_session:
                continue
            if not other.commands:
                continue
            if other.status in COMPLETED_STATUSES:
                continue
            missing.append(f"{dep} ({other.status or 'unknown'})")
        else:
            if other.status not in COMPLETED_STATUSES:
                missing.append(f"{dep} ({other.status or 'unknown'})")
    if missing:
        LOGGER.warning(
            "⚠️  Skipping %s because dependencies are not complete: %s",
            task.id,
            ", ".join(missing),
        )
        return False
    return True


def run_command(command: str, execute: bool, ignore_errors: bool) -> bool:
    if not execute:
        LOGGER.info("  → [dry-run] %s", command)
        return True
    LOGGER.info("  → %s", command)
    try:
        subprocess.run(command, shell=True, check=True)
        return True
    except subprocess.CalledProcessError as exc:
        LOGGER.error("  ✖ command failed with exit code %s", exc.returncode)
        if ignore_errors:
            return False
        raise


def plan_batch(args: argparse.Namespace) -> int:
    registry = TaskRegistry(args.tasks_file)
    if args.batch == "all":
        batches = registry.batches()
        ordered_tasks = topological_sort_all(registry.all_tasks())
        print(
            "Combined batches (" + ", ".join(batches) + ") include "
            f"{len(ordered_tasks)} task(s):\n"
        )
    else:
        if args.batch not in registry.batches():
            LOGGER.error(
                "Unknown batch '%s'. Available: all, %s",
                args.batch,
                ", ".join(registry.batches()),
            )
            return 1
        ordered_tasks = topological_sort(registry.tasks_for_batch(args.batch))
        print(f"Batch '{args.batch}' includes {len(ordered_tasks)} task(s):\n")

    for task in ordered_tasks:
        print(describe_task(task, registry))
        print()
    return 0


def run_batch(args: argparse.Namespace) -> int:
    registry = TaskRegistry(args.tasks_file)
    if args.batch == "all":
        tasks = topological_sort_all(registry.all_tasks())
    else:
        if args.batch not in registry.batches():
            LOGGER.error(
                "Unknown batch '%s'. Available: all, %s",
                args.batch,
                ", ".join(registry.batches()),
            )
            return 1
        tasks = topological_sort(registry.tasks_for_batch(args.batch))

    if not tasks:
        if args.batch == "all":
            LOGGER.info("No tasks found in the tracker.")
        else:
            LOGGER.info("No tasks found for batch '%s'.", args.batch)
        return 0

    skipped_for_status: List[str] = []
    manual_commands: List[str] = []
    executed_commands = 0
    failed_commands = 0
    completed_in_session: Set[str] = set()

    for task in tasks:
        if (not args.auto) and task.status and task.status not in RUNNABLE_STATUSES:
            skipped_for_status.append(f"{task.id} ({task.status})")
            continue
        if not ensure_dependencies_satisfied(
            task,
            registry,
            auto_mode=args.auto,
            completed_in_session=completed_in_session,
        ):
            continue
        if not task.commands:
            LOGGER.info("ℹ️  Task %s has no commands recorded; skipping.", task.id)
            if args.auto:
                completed_in_session.add(task.id)
            continue
        task_successful = True
        task_had_manual = False
        for command in task.commands:
            if PLACEHOLDER_PATTERN.search(command or ""):
                manual_commands.append(f"{task.id}: {command}")
                task_successful = False
                task_had_manual = True
                continue
            ok = run_command(command, execute=args.execute, ignore_errors=args.ignore_errors)
            if ok:
                executed_commands += 1
            else:
                failed_commands += 1
                task_successful = False
        if args.auto and task_successful and not task_had_manual:
            completed_in_session.add(task.id)
    if skipped_for_status:
        LOGGER.info("\nSkipped tasks due to status: %s", ", ".join(skipped_for_status))
    if manual_commands:
        LOGGER.info("\nCommands requiring manual intervention:")
        for cmd in manual_commands:
            LOGGER.info("  - %s", cmd)
    LOGGER.info(
        "\nSummary: %s command(s) executed%s; %s failure(s).",
        executed_commands,
        "" if args.execute else " (dry-run)",
        failed_commands,
    )
    return 0 if (failed_commands == 0 or args.ignore_errors) else 1


def list_batches(args: argparse.Namespace) -> int:
    registry = TaskRegistry(args.tasks_file)
    for batch in registry.batches():
        print(batch)
    return 0


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--tasks-file",
        type=Path,
        default=Path("incoming/lavoro_da_classificare/tasks.yml"),
        help="Path to the Evo-Tactics task registry.",
    )
    parser.add_argument(
        "--verbose",
        action="store_true",
        help="Enable debug logging output.",
    )

    subparsers = parser.add_subparsers(dest="command", required=True)

    batches_parser = subparsers.add_parser("list", help="List available batches")
    batches_parser.set_defaults(func=list_batches)

    plan_parser = subparsers.add_parser("plan", help="Show tasks for a batch")
    plan_parser.add_argument(
        "--batch",
        required=True,
        help="Batch identifier to inspect (use 'all' to aggregate every batch)",
    )
    plan_parser.set_defaults(func=plan_batch)

    run_parser = subparsers.add_parser("run", help="Execute commands for a batch")
    run_parser.add_argument(
        "--batch",
        required=True,
        help="Batch identifier to execute (use 'all' to run every batch)",
    )
    run_parser.add_argument(
        "--execute",
        action="store_true",
        help="Run the commands instead of performing a dry-run.",
    )
    run_parser.add_argument(
        "--ignore-errors",
        action="store_true",
        help="Continue even if a command exits with a non-zero status.",
    )
    run_parser.add_argument(
        "--auto",
        action="store_true",
        help=(
            "Force automation by ignoring task status gates and considering "
            "dependencies satisfied when they were executed in this session."
        ),
    )
    run_parser.set_defaults(func=run_batch)

    return parser


def parse_args(argv: Optional[Sequence[str]] = None) -> argparse.Namespace:
    """Return the parsed CLI arguments."""

    parser = build_parser()
    return parser.parse_args(argv)


def main(argv: Optional[Sequence[str]] = None) -> int:
    args = parse_args(argv)
    configure_logging(verbose=args.verbose, logger=LOGGER)
    return args.func(args)


if __name__ == "__main__":
    raise SystemExit(main())
