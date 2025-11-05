#!/usr/bin/env python3
"""Minimal migration runner for the Evo Tactics Pack schema.

The implementation is intentionally lightweight but mirrors the workflow of
`migrate-mongo`: migrations live inside `migrations/evo_tactics_pack`, each
module exposes a `MIGRATION_ID`, a human readable `DESCRIPTION` and two
functions `upgrade(db)` / `downgrade(db)`.

Usage::

    python scripts/db/run_migrations.py up
    python scripts/db/run_migrations.py down
    python scripts/db/run_migrations.py status

Connection settings can be configured via CLI arguments or through the
`MONGO_URL` and `MONGO_DB` environment variables.
"""

from __future__ import annotations

import argparse
import importlib.util
import os
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Any, Callable, Dict, Iterable, List, Tuple

from pymongo import MongoClient
from pymongo.database import Database

from config_loader import load_mongo_config

REPO_ROOT = Path(__file__).resolve().parents[2]
MIGRATIONS_DIR = REPO_ROOT / "migrations" / "evo_tactics_pack"
CHANGELOG_COLLECTION = "evo_schema_migrations"


@dataclass
class Migration:
    migration_id: str
    description: str
    path: Path
    upgrade: Callable[[Database], None]
    downgrade: Callable[[Database], None]


def load_migration(module_path: Path) -> Migration:
    spec = importlib.util.spec_from_file_location(module_path.stem, module_path)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"Cannot import migration module from {module_path}")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)  # type: ignore[arg-type]

    migration_id = getattr(module, "MIGRATION_ID", module_path.stem)
    description = getattr(module, "DESCRIPTION", "")
    upgrade = getattr(module, "upgrade")
    downgrade = getattr(module, "downgrade")

    if not callable(upgrade) or not callable(downgrade):
        raise RuntimeError(f"Migration {module_path} must define callable upgrade()/downgrade()")

    return Migration(
        migration_id=str(migration_id),
        description=str(description),
        path=module_path,
        upgrade=upgrade,
        downgrade=downgrade,
    )


def discover_migrations(directory: Path) -> List[Migration]:
    if not directory.exists():
        return []
    migrations: List[Migration] = []
    for path in sorted(directory.glob("*.py")):
        migrations.append(load_migration(path))
    return migrations


def get_applied_migrations(db: Database) -> List[str]:
    collection = db[CHANGELOG_COLLECTION]
    cursor = collection.find({}, projection={"_id": True}).sort("_id", 1)
    return [entry["_id"] for entry in cursor]


def record_migration(db: Database, migration: Migration) -> None:
    db[CHANGELOG_COLLECTION].insert_one(
        {
            "_id": migration.migration_id,
            "description": migration.description,
            "path": str(migration.path.relative_to(REPO_ROOT)),
            "applied_at": datetime.utcnow(),
        }
    )


def remove_migration_record(db: Database, migration_id: str) -> None:
    db[CHANGELOG_COLLECTION].delete_one({"_id": migration_id})


def action_up(db: Database, migrations: Iterable[Migration]) -> None:
    applied = set(get_applied_migrations(db))
    for migration in migrations:
        if migration.migration_id in applied:
            continue
        print(f"Applying migration {migration.migration_id} ({migration.description})")
        migration.upgrade(db)
        record_migration(db, migration)
    print("All pending migrations applied")


def action_down(db: Database, migrations: List[Migration]) -> None:
    applied = get_applied_migrations(db)
    if not applied:
        print("No migrations to rollback")
        return
    last_id = applied[-1]
    migration_map = {migration.migration_id: migration for migration in migrations}
    migration = migration_map.get(last_id)
    if migration is None:
        raise RuntimeError(f"Migration {last_id} not found in {MIGRATIONS_DIR}")
    print(f"Rolling back migration {migration.migration_id} ({migration.description})")
    migration.downgrade(db)
    remove_migration_record(db, migration.migration_id)


def action_status(db: Database, migrations: List[Migration]) -> None:
    applied = set(get_applied_migrations(db))
    for migration in migrations:
        state = "up" if migration.migration_id in applied else "down"
        print(f"{migration.migration_id} [{state}] - {migration.description}")


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Run Evo Tactics schema migrations")
    parser.add_argument("command", choices=["up", "down", "status"], help="Operation to perform")
    parser.add_argument("--mongo-url", default=os.environ.get("MONGO_URL", "mongodb://localhost:27017"))
    parser.add_argument("--database", default=os.environ.get("MONGO_DB", "evo_tactics"))
    parser.add_argument(
        "--config",
        help="Percorso del file JSON con la configurazione MongoDB (es. config/mongodb.dev.json)",
    )
    return parser


def resolve_connection_settings(args: argparse.Namespace) -> Tuple[str, str, Dict[str, Any]]:
    config = load_mongo_config(args.config) if args.config else None

    mongo_url = args.mongo_url or ""
    database = args.database or ""
    options: Dict[str, Any] = {}

    if config:
        mongo_url = config.mongo_url or mongo_url
        database = config.database or database
        options = dict(config.options)

    mongo_url = mongo_url.strip()
    database = database.strip()

    if not mongo_url:
        raise RuntimeError(
            "MongoDB URL non configurato: utilizzare --mongo-url oppure specificare 'mongoUrl' nel file di configurazione"
        )
    if not database:
        raise RuntimeError(
            "Nome del database MongoDB non configurato: utilizzare --database oppure specificare 'database' nel file"
        )

    return mongo_url, database, options


def main() -> None:
    parser = build_parser()
    args = parser.parse_args()

    migrations = discover_migrations(MIGRATIONS_DIR)
    if not migrations:
        print(f"No migrations found under {MIGRATIONS_DIR}")
        return

    mongo_url, database, mongo_options = resolve_connection_settings(args)
    client = MongoClient(mongo_url, **mongo_options)
    db = client[database]

    if args.command == "up":
        action_up(db, migrations)
    elif args.command == "down":
        action_down(db, migrations)
    elif args.command == "status":
        action_status(db, migrations)


if __name__ == "__main__":
    main()
