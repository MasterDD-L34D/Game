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
import atexit
import importlib.util
import os
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Any, Callable, Dict, Iterable, List, Tuple

from bson import json_util
from pymongo import MongoClient as PyMongoClient
from pymongo.database import Database

from config_loader import load_mongo_config

try:
    import mongomock  # type: ignore
except ImportError:  # pragma: no cover - optional dependency
    mongomock = None

try:
    from mongita import MongitaClientDisk, MongitaClientMemory  # type: ignore
except ImportError:  # pragma: no cover - optional dependency
    MongitaClientDisk = None
    MongitaClientMemory = None

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
    try:
        cursor = collection.find({}, projection={"_id": True}).sort("_id", 1)
    except Exception:
        # Alcuni backend di test (es. Mongita) non supportano l'argomento `projection`.
        cursor = collection.find({}).sort("_id", 1)
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


def _load_mongomock_dump(client: "mongomock.MongoClient", dump_path: Path) -> None:  # type: ignore[name-defined]
    if not dump_path.is_file():
        return
    try:
        payload = json_util.loads(dump_path.read_text(encoding="utf-8"))
    except Exception as exc:  # pragma: no cover - corrupted dump
        print(f"Impossibile leggere il dump mongomock {dump_path}: {exc}")
        return

    for db_name, collections in payload.items():
        database = client[db_name]
        for collection_name, documents in collections.items():
            if not documents:
                continue
            database[collection_name].insert_many(documents)


def _dump_mongomock(client: "mongomock.MongoClient", dump_path: Path) -> None:  # type: ignore[name-defined]
    dump: Dict[str, Dict[str, List[Dict[str, Any]]]] = {}
    for db_name in client.list_database_names():
        if db_name in {"admin", "local"}:
            continue
        database = client[db_name]
        collections_dump: Dict[str, List[Dict[str, Any]]] = {}
        for collection_name in database.list_collection_names():
            documents = list(database[collection_name].find({}))
            collections_dump[collection_name] = documents
        dump[db_name] = collections_dump

    dump_path.parent.mkdir(parents=True, exist_ok=True)
    dump_path.write_text(json_util.dumps(dump, indent=2), encoding="utf-8")


def _create_client(mongo_url: str, mongo_options: Dict[str, Any]):
    """Create a Mongo client honoring special URLs for test environments."""

    if mongo_url.startswith("mongita://"):
        if MongitaClientDisk is None or MongitaClientMemory is None:
            raise RuntimeError(
                "L'URL mongita:// richiede la dipendenza opzionale 'mongita'. "
                "Installarla oppure utilizzare un'istanza MongoDB reale."
            )
        location = mongo_url[len("mongita://") :].strip()
        if location.lower() in {"memory", ""}:
            return MongitaClientMemory()
        storage_path = Path(location)
        if not storage_path.is_absolute():
            storage_path = (REPO_ROOT / storage_path).resolve()
        storage_path.parent.mkdir(parents=True, exist_ok=True)
        storage_path.mkdir(parents=True, exist_ok=True)
        return MongitaClientDisk(str(storage_path))

    if mongo_url.startswith("mongomock://"):
        if mongomock is None:
            raise RuntimeError(
                "L'URL mongomock:// richiede la dipendenza opzionale 'mongomock'. "
                "Installarla oppure utilizzare un'istanza MongoDB reale."
            )
        # mongomock non supporta le stesse opzioni di PyMongo, quindi scartiamo quelle
        # non riconosciute per evitare errori di tipo.
        supported_keys = {"tz_aware", "uuidRepresentation"}
        filtered_options = {key: value for key, value in mongo_options.items() if key in supported_keys}
        storage_target = mongo_url[len("mongomock://") :].strip()
        dump_path: Path | None = None
        if storage_target and storage_target.lower() != "memory":
            dump_path = Path(storage_target)
            if dump_path.is_dir():
                dump_path = dump_path / "mongomock_dump.json"
            if not dump_path.is_absolute():
                dump_path = (REPO_ROOT / dump_path).resolve()
        client = mongomock.MongoClient(**filtered_options)
        if dump_path is not None:
            _load_mongomock_dump(client, dump_path)
            atexit.register(_dump_mongomock, client, dump_path)
        return client

    return PyMongoClient(mongo_url, **mongo_options)


def main() -> None:
    parser = build_parser()
    args = parser.parse_args()

    migrations = discover_migrations(MIGRATIONS_DIR)
    if not migrations:
        print(f"No migrations found under {MIGRATIONS_DIR}")
        return

    mongo_url, database, mongo_options = resolve_connection_settings(args)
    client = _create_client(mongo_url, mongo_options)
    db = client[database]

    if args.command == "up":
        action_up(db, migrations)
    elif args.command == "down":
        action_down(db, migrations)
    elif args.command == "status":
        action_status(db, migrations)


if __name__ == "__main__":
    main()
