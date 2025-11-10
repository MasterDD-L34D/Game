import datetime
import sys
import types
from pathlib import Path
from typing import Dict, List, Tuple

PROJECT_ROOT = Path(__file__).resolve().parents[2]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

SCRIPTS_DIR = PROJECT_ROOT / "scripts"
if str(SCRIPTS_DIR) not in sys.path:
    sys.path.insert(0, str(SCRIPTS_DIR))

DB_SCRIPTS_DIR = SCRIPTS_DIR / "db"
if str(DB_SCRIPTS_DIR) not in sys.path:
    sys.path.insert(0, str(DB_SCRIPTS_DIR))

if "pymongo" not in sys.modules:
    pymongo_stub = types.ModuleType("pymongo")

    class _StubMongoClient:
        def __init__(self, *args, **kwargs):
            pass

    class _StubReplaceOne:
        def __init__(self, *args, **kwargs):
            self.args = args
            self.kwargs = kwargs

    pymongo_stub.MongoClient = _StubMongoClient
    pymongo_stub.ReplaceOne = _StubReplaceOne
    sys.modules["pymongo"] = pymongo_stub

if "pymongo.collection" not in sys.modules:
    collection_module = types.ModuleType("pymongo.collection")

    class _StubCollection:  # pragma: no cover - type placeholder
        pass

    collection_module.Collection = _StubCollection
    sys.modules["pymongo.collection"] = collection_module

from scripts.db import seed_evo_generator


class FakeCollection:
    def __init__(self, name: str):
        self.name = name


class FakeDatabase:
    def __init__(self):
        self._collections: Dict[str, FakeCollection] = {}

    def __getitem__(self, name: str) -> FakeCollection:
        if name not in self._collections:
            self._collections[name] = FakeCollection(name)
        return self._collections[name]


class FakeMongoClient:
    def __init__(self):
        self._databases: Dict[str, FakeDatabase] = {}

    def __getitem__(self, name: str) -> FakeDatabase:
        if name not in self._databases:
            self._databases[name] = FakeDatabase()
        return self._databases[name]


def test_seed_database_populates_biome_pools(monkeypatch):
    calls: List[Tuple[str, List[dict]]] = []

    def fake_bulk_upsert(collection, documents):
        docs = list(documents)
        calls.append((collection.name, docs))

    monkeypatch.setattr(seed_evo_generator, "bulk_upsert", fake_bulk_upsert)

    client = FakeMongoClient()
    seed_evo_generator.seed_database(client, "test-database", dry_run=False)

    assert calls, "bulk_upsert deve essere invocato per le collezioni principali"
    collection_names = [name for name, _ in calls]
    assert "biome_pools" in collection_names, "il seed deve scrivere la collezione biome_pools"

    biome_pool_docs = next(docs for name, docs in calls if name == "biome_pools")
    assert biome_pool_docs, "biome_pools non deve essere vuota"

    metadata = biome_pool_docs[0].get("metadata", {})
    assert metadata.get("schema_version"), "il metadata deve riportare la versione di schema"
    assert isinstance(metadata.get("updated_at"), datetime.datetime)
