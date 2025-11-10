import datetime
import importlib.util
import sys
import types
from pathlib import Path
from typing import Dict, List, Tuple


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
    # Inseriamo stubs minimi per pymongo per evitare di installare la dipendenza
    # opzionale durante il test. In questo modo il modulo oggetto del test può
    # essere importato senza effettuare connessioni reali.
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
    monkeypatch.setitem(sys.modules, "pymongo", pymongo_stub)

    collection_module = types.ModuleType("pymongo.collection")

    class _StubCollection:  # pragma: no cover - type placeholder
        pass

    collection_module.Collection = _StubCollection
    monkeypatch.setitem(sys.modules, "pymongo.collection", collection_module)

    scripts_root = Path(__file__).resolve().parents[2] / "scripts"
    scripts_spec = importlib.util.spec_from_file_location(
        "scripts", scripts_root / "__init__.py", submodule_search_locations=[str(scripts_root)]
    )
    scripts_module = importlib.util.module_from_spec(scripts_spec)
    monkeypatch.setitem(sys.modules, "scripts", scripts_module)
    assert scripts_spec.loader is not None
    scripts_spec.loader.exec_module(scripts_module)

    db_root = scripts_root / "db"
    db_spec = importlib.util.spec_from_file_location(
        "scripts.db", db_root / "__init__.py", submodule_search_locations=[str(db_root)]
    )
    db_module = importlib.util.module_from_spec(db_spec)
    monkeypatch.setitem(sys.modules, "scripts.db", db_module)
    assert db_spec.loader is not None
    db_spec.loader.exec_module(db_module)

    sys.modules.pop("scripts.db.seed_evo_generator", None)

    import scripts.db.seed_evo_generator as seed_evo_generator

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
