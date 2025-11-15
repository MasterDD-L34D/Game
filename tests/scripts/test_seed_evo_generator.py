import datetime
import importlib.util
import sys
import types
from pathlib import Path
from typing import Dict, List


class FakeCollection:
    def __init__(self, name: str):
        self.name = name
        self._bulk_write_calls: List[List[object]] = []

    @property
    def bulk_write_calls(self) -> List[List[object]]:
        return self._bulk_write_calls

    def bulk_write(self, requests, ordered=False):  # pragma: no cover - behaviour tested via side effects
        ops = list(requests)
        self._bulk_write_calls.append(ops)

        class _Result:
            def __init__(self, upserted: int, modified: int):
                self.upserted_count = upserted
                self.modified_count = modified

        return _Result(upserted=len(ops), modified=0)


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


def import_seed_module(monkeypatch):
    pymongo_stub = types.ModuleType("pymongo")

    class _StubMongoClient:
        def __init__(self, *args, **kwargs):
            pass

    class _StubReplaceOne:
        def __init__(self, filter_doc, replacement, **kwargs):
            self.filter = filter_doc
            self.replacement = replacement
            self.options = kwargs

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

    return seed_evo_generator


def test_seed_database_populates_biome_pools(monkeypatch):
    seed_evo_generator = import_seed_module(monkeypatch)

    client = FakeMongoClient()
    seed_evo_generator.seed_database(client, "test-database", dry_run=False)

    biome_collection = client["test-database"]["biome_pools"]
    assert biome_collection.bulk_write_calls, "bulk_write deve essere invocato per biome_pools"

    operations = biome_collection.bulk_write_calls[0]
    assert operations, "biome_pools non deve essere vuota"

    first_replacement = operations[0].replacement
    metadata = first_replacement.get("metadata", {})
    assert metadata.get("schema_version"), "il metadata deve riportare la versione di schema"
    assert isinstance(metadata.get("updated_at"), datetime.datetime)

    for op in operations:
        replacement_id = op.replacement.get("_id")
        assert replacement_id, "ogni documento deve avere un _id impostato"
        assert op.filter == {"_id": replacement_id}
        assert op.options.get("upsert") is True


def test_seed_database_dry_run_skips_writes(monkeypatch):
    seed_evo_generator = import_seed_module(monkeypatch)

    client = FakeMongoClient()
    seed_evo_generator.seed_database(client, "test-database", dry_run=True)

    biome_collection = client["test-database"]["biome_pools"]
    assert biome_collection.bulk_write_calls == [], "dry_run deve saltare le scritture su MongoDB"


def test_load_traits_includes_reference_only_entries(monkeypatch):
    seed_evo_generator = import_seed_module(monkeypatch)

    traits = seed_evo_generator.load_traits()
    trait_ids = {doc["_id"] for doc in traits}

    assert "armatura_pietra_planare" in trait_ids


def test_load_traits_matches_catalog_sources(monkeypatch):
    seed_evo_generator = import_seed_module(monkeypatch)

    traits = seed_evo_generator.load_traits()
    trait_ids = {doc["_id"] for doc in traits}

    glossary = seed_evo_generator.load_json(seed_evo_generator.CATALOG_ROOT / "trait_glossary.json")
    reference = seed_evo_generator.load_json(seed_evo_generator.CATALOG_ROOT / "trait_reference.json")

    expected_ids = set(glossary.get("traits", {})) | set(reference.get("traits", {}))
    assert trait_ids == expected_ids


def test_load_biomes_includes_network_biomes(monkeypatch):
    seed_evo_generator = import_seed_module(monkeypatch)

    biomes = seed_evo_generator.load_biomes()
    biome_ids = {doc["_id"] for doc in biomes}

    assert "rovine_planari" in biome_ids


def test_load_biomes_normalizes_source_paths(monkeypatch):
    seed_evo_generator = import_seed_module(monkeypatch)

    biomes = seed_evo_generator.load_biomes()
    biome_map = {doc["_id"]: doc for doc in biomes}

    badlands = biome_map["badlands"]
    assert badlands["source_path"] == "packs/evo_tactics_pack/data/ecosystems/badlands.biome.yaml"
    manifest_links = badlands["profile"].get("manifest", {}).get("foodweb_links", {})
    assert manifest_links.get("path") == "packs/evo_tactics_pack/data/foodwebs/badlands_foodweb.yaml"
    assert badlands["profile"].get("foodweb", {}).get("path") == "packs/evo_tactics_pack/data/foodwebs/badlands_foodweb.yaml"

    rovine = biome_map["rovine_planari"]
    assert rovine["source_path"] == "packs/evo_tactics_pack/data/ecosystems/rovine_planari.biome.yaml"
    assert rovine["profile"].get("foodweb", {}).get("path") == "packs/evo_tactics_pack/data/foodwebs/rovine_planari_foodweb.yaml"
    assert rovine["connections"], "le connessioni del meta-network devono essere importate"
