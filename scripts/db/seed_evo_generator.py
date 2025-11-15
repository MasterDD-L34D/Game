#!/usr/bin/env python3
"""Seed data for the Evo Tactics Pack MongoDB collections.

The script reads the generated JSON catalog under
`packs/evo_tactics_pack/docs/catalog` and upserts the information inside the
`biomes`, `species`, `traits` and `biome_pools` collections. It also hydrates
metadata that is useful for the runtime services (e.g. environment-specific
trait suggestions).

Usage examples::

    python scripts/db/seed_evo_generator.py \
        --mongo-url mongodb://localhost:27017 --database evo_tactics

    python scripts/db/seed_evo_generator.py --dry-run

The MongoDB connection string and database name can also be provided via the
`MONGO_URL` and `MONGO_DB` environment variables.
"""

from __future__ import annotations

import argparse
import json
import os
from collections import defaultdict
from collections.abc import Mapping, MutableMapping
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, Iterable, List, Tuple

import yaml

from pymongo import MongoClient, ReplaceOne
from pymongo.collection import Collection

from config_loader import load_mongo_config

REPO_ROOT = Path(__file__).resolve().parents[2]
CATALOG_ROOT = REPO_ROOT / "packs" / "evo_tactics_pack" / "docs" / "catalog"
BIOME_POOLS_PATH = REPO_ROOT / "data" / "core" / "traits" / "biome_pools.json"
ECOSYSTEM_NETWORK_ROOT = REPO_ROOT / "packs" / "evo_tactics_pack" / "data" / "ecosystems" / "network"


def as_repo_relative(path: Path) -> str:
    resolved = path.resolve(strict=False)
    try:
        return resolved.relative_to(REPO_ROOT).as_posix()
    except ValueError:
        return resolved.as_posix()


def normalize_repo_path(value: str | None, *, base: Path | None = None) -> str | None:
    if not value or not isinstance(value, str):
        return None
    candidate = Path(value)
    if not candidate.is_absolute():
        anchor = base if base is not None else REPO_ROOT
        candidate = (anchor / candidate).resolve(strict=False)
    else:
        candidate = candidate.resolve(strict=False)
    return as_repo_relative(candidate)


def parse_datetime(value: str | None) -> datetime | None:
    if not value:
        return None
    try:
        # `datetime.fromisoformat` non gestisce "Z" in Python < 3.11.
        return datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return None


def load_json(path: Path) -> Any:
    with path.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def load_yaml(path: Path) -> Any:
    with path.open("r", encoding="utf-8") as handle:
        return yaml.safe_load(handle)


def load_biomes() -> List[Dict[str, Any]]:
    catalog_path = CATALOG_ROOT / "catalog_data.json"
    catalog = load_json(catalog_path)

    generated_at = parse_datetime(catalog.get("generated_at"))
    ecosystem = catalog.get("ecosistema", {})
    top_level_biomes = ecosystem.get("biomi", [])
    detailed_biomes: Mapping[str, Mapping[str, Any]] = {
        biome.get("id"): biome for biome in catalog.get("biomi", [])
    }

    connections_by_network: MutableMapping[str, List[Mapping[str, Any]]] = defaultdict(list)
    for connection in ecosystem.get("connessioni", []):
        network_id = connection.get("from")
        if not network_id:
            continue
        connections_by_network[network_id].append(connection)

    def normalize_manifest(manifest: Mapping[str, Any] | None) -> Mapping[str, Any] | None:
        if not isinstance(manifest, Mapping):
            return manifest
        normalized = dict(manifest)
        foodweb_links = normalized.get("foodweb_links")
        if isinstance(foodweb_links, Mapping):
            normalized_links = dict(foodweb_links)
            normalized_path = normalize_repo_path(normalized_links.get("path"), base=CATALOG_ROOT)
            if normalized_path:
                normalized_links["path"] = normalized_path
            normalized["foodweb_links"] = normalized_links
        return normalized

    def normalize_foodweb(foodweb: Mapping[str, Any] | None, *, base: Path) -> Mapping[str, Any] | None:
        if not isinstance(foodweb, Mapping):
            return foodweb
        normalized = dict(foodweb)
        normalized_path = normalize_repo_path(normalized.get("path"), base=base)
        if normalized_path:
            normalized["path"] = normalized_path
        return normalized

    docs_by_id: Dict[str, Dict[str, Any]] = {}
    for biome in top_level_biomes:
        biome_id = biome.get("id")
        detail = detailed_biomes.get(biome_id, {})
        source_path = normalize_repo_path(biome.get("path"), base=CATALOG_ROOT)
        doc = {
            "_id": biome_id,
            "label": biome.get("label"),
            "network_id": biome.get("network_id"),
            "profile": {
                "biome_profile": biome.get("biome_profile"),
                "weight": biome.get("weight"),
                "manifest": normalize_manifest(detail.get("manifest")),
                "foodweb": normalize_foodweb(detail.get("foodweb"), base=CATALOG_ROOT),
            },
            "source_path": source_path,
            "generated_at": generated_at,
            "connections": connections_by_network.get(biome.get("network_id"), []),
        }
        if biome_id:
            docs_by_id[biome_id] = doc

    if ECOSYSTEM_NETWORK_ROOT.exists():
        for network_path in sorted(ECOSYSTEM_NETWORK_ROOT.glob("*.yaml")):
            network_payload = load_yaml(network_path)
            network = network_payload.get("network", {}) if isinstance(network_payload, Mapping) else {}
            nodes = network.get("nodes", []) if isinstance(network, Mapping) else []
            edges = network.get("edges", []) if isinstance(network, Mapping) else []

            edges_by_origin: MutableMapping[str, List[Mapping[str, Any]]] = defaultdict(list)
            for edge in edges:
                if not isinstance(edge, Mapping):
                    continue
                origin = edge.get("from")
                if not origin:
                    continue
                edges_by_origin[origin].append(edge)

            for node in nodes:
                if not isinstance(node, Mapping):
                    continue

                network_id = node.get("id")
                biome_profile_value = node.get("biome_id")
                node_weight = node.get("weight")
                ecosystem_path = node.get("path")

                doc_id: str | None = None
                label: str | None = None
                foodweb_path: str | None = None
                source_path: str | None = None

                ecosystem_fs_path: Path | None = None
                if ecosystem_path:
                    ecosystem_fs_path = (REPO_ROOT / ecosystem_path).resolve()
                    if ecosystem_fs_path.exists():
                        ecosystem_payload = load_yaml(ecosystem_fs_path)
                        if isinstance(ecosystem_payload, Mapping):
                            ecosystem = ecosystem_payload.get("ecosistema", {})
                            if isinstance(ecosystem, Mapping):
                                doc_id = ecosystem.get("biome_id") or ecosystem.get("id")
                                if not network_id:
                                    network_id = ecosystem.get("id")
                                label = ecosystem.get("label")
                            links = ecosystem_payload.get("links", {})
                            if isinstance(links, Mapping):
                                foodweb_path = links.get("foodweb")

                        biome_path: Path | None = None
                        if ecosystem_fs_path.name.endswith(".ecosystem.yaml"):
                            candidate = ecosystem_fs_path.with_name(
                                ecosystem_fs_path.name.replace(".ecosystem.", ".biome.")
                            )
                            if candidate.exists():
                                biome_path = candidate
                        if biome_path:
                            source_path = as_repo_relative(biome_path)
                        else:
                            source_path = as_repo_relative(ecosystem_fs_path)

                if not doc_id and network_id:
                    doc_id = str(network_id).lower()
                if not doc_id and biome_profile_value:
                    doc_id = str(biome_profile_value)
                if not doc_id or not network_id:
                    continue

                doc = docs_by_id.get(doc_id)
                if not doc:
                    profile = {
                        "biome_profile": biome_profile_value,
                        "weight": node_weight,
                        "manifest": None,
                        "foodweb": {"path": normalize_repo_path(foodweb_path)} if foodweb_path else None,
                    }
                    doc = {
                        "_id": doc_id,
                        "label": label,
                        "network_id": network_id,
                        "profile": profile,
                        "source_path": source_path,
                        "generated_at": generated_at,
                        "connections": [],
                    }
                    docs_by_id[doc_id] = doc
                else:
                    doc.setdefault("profile", {})
                    profile = doc["profile"]
                    if biome_profile_value and profile.get("biome_profile") is None:
                        profile["biome_profile"] = biome_profile_value
                    if profile.get("weight") is None and node_weight is not None:
                        profile["weight"] = node_weight
                    if foodweb_path and not profile.get("foodweb"):
                        profile["foodweb"] = {"path": foodweb_path}
                    doc["profile"] = profile
                    if doc.get("network_id") is None:
                        doc["network_id"] = network_id
                    if label and not doc.get("label"):
                        doc["label"] = label
                    if source_path and not doc.get("source_path"):
                        doc["source_path"] = source_path

                doc.setdefault("generated_at", generated_at)
                if source_path:
                    doc["source_path"] = source_path

                if doc.get("profile") and isinstance(doc["profile"], Mapping):
                    profile = dict(doc["profile"])
                    if profile.get("foodweb") and isinstance(profile["foodweb"], Mapping):
                        normalized_path = normalize_repo_path(profile["foodweb"].get("path"))
                        if normalized_path:
                            profile["foodweb"] = dict(profile["foodweb"])
                            profile["foodweb"]["path"] = normalized_path
                    doc["profile"] = profile

                connections = doc.get("connections") or []
                existing_edges = {
                    (edge.get("from"), edge.get("to"), edge.get("type"))
                    for edge in connections
                    if isinstance(edge, Mapping)
                }
                for edge in edges_by_origin.get(network_id, []):
                    key = (edge.get("from"), edge.get("to"), edge.get("type"))
                    if key not in existing_edges:
                        connections.append(edge)
                        existing_edges.add(key)
                doc["connections"] = connections

    docs = sorted(docs_by_id.values(), key=lambda item: item.get("_id") or "")
    return docs


def load_species() -> List[Dict[str, Any]]:
    species_dir = CATALOG_ROOT / "species"
    docs: List[Dict[str, Any]] = []
    for path in sorted(species_dir.glob("*.json")):
        if path.name == "index.json":
            continue
        payload = load_json(path)
        payload["_id"] = payload.get("id")
        last_synced_at = payload.get("last_synced_at")
        parsed_synced_at = parse_datetime(last_synced_at)
        if parsed_synced_at:
            payload["last_synced_at"] = parsed_synced_at
        docs.append(payload)
    return docs


def build_environment_lookup(env_rules: Iterable[Mapping[str, Any]]) -> Mapping[str, List[Mapping[str, Any]]]:
    lookup: MutableMapping[str, List[Mapping[str, Any]]] = defaultdict(list)
    for rule in env_rules:
        suggest = rule.get("suggest", {}) or {}
        traits = suggest.get("traits") or []
        if not traits:
            continue
        entry = {
            "conditions": rule.get("when", {}),
            "effects": suggest.get("effects"),
            "jobs_bias": suggest.get("jobs_bias"),
            "services_links": suggest.get("services_links"),
            "weight": rule.get("weight"),
            "require_capability_all": rule.get("require_capability_all"),
            "require_capability_any": rule.get("require_capability_any"),
        }
        for trait_id in traits:
            lookup[trait_id].append(entry)
    return lookup


def load_traits() -> List[Dict[str, Any]]:
    glossary = load_json(CATALOG_ROOT / "trait_glossary.json")
    reference = load_json(CATALOG_ROOT / "trait_reference.json")
    env_traits = load_json(CATALOG_ROOT / "env_traits.json")

    glossary_traits: Mapping[str, Mapping[str, Any]] = glossary.get("traits", {})
    reference_traits: Mapping[str, Mapping[str, Any]] = reference.get("traits", {})
    env_lookup = build_environment_lookup(env_traits.get("rules", []))

    glossary_version = glossary.get("schema_version")
    reference_version = reference.get("schema_version")
    glossary_updated_at = parse_datetime(glossary.get("updated_at"))

    docs: List[Dict[str, Any]] = []
    trait_ids = sorted(set(glossary_traits) | set(reference_traits))
    for trait_id in trait_ids:
        glossary_data = glossary_traits.get(trait_id, {})
        labels = {
            "it": glossary_data.get("label_it") or reference_traits.get(trait_id, {}).get("label"),
            "en": glossary_data.get("label_en"),
        }
        descriptions = {
            "it": glossary_data.get("description_it"),
            "en": glossary_data.get("description_en"),
        }
        merged = {
            "_id": trait_id,
            "labels": labels,
            "descriptions": descriptions,
            "reference": reference_traits.get(trait_id, {}),
            "environment_recommendations": env_lookup.get(trait_id, []),
            "source": {
                "glossary_version": glossary_version,
                "reference_version": reference_version,
                "glossary_updated_at": glossary_updated_at,
            },
        }
        docs.append(merged)

    return docs


def load_biome_pools() -> List[Dict[str, Any]]:
    payload = load_json(BIOME_POOLS_PATH)
    schema_version = payload.get("schema_version")
    updated_at = parse_datetime(payload.get("updated_at"))
    pools = payload.get("pools") or []

    docs: List[Dict[str, Any]] = []
    for entry in pools:
        if not isinstance(entry, Mapping):
            continue
        doc = dict(entry)
        pool_id = doc.get("id")
        if not pool_id:
            continue
        doc["_id"] = pool_id
        metadata = doc.get("metadata", {})
        if isinstance(metadata, Mapping):
            metadata = dict(metadata)
        else:
            metadata = {}
        metadata.setdefault("schema_version", schema_version)
        metadata.setdefault("updated_at", updated_at)
        doc["metadata"] = metadata
        docs.append(doc)

    return docs


def bulk_upsert(collection: Collection, documents: Iterable[Mapping[str, Any]]) -> None:
    requests = []
    for document in documents:
        document_id = document.get("_id")
        if not document_id:
            continue
        requests.append(ReplaceOne({"_id": document_id}, document, upsert=True))
    if not requests:
        return
    result = collection.bulk_write(requests, ordered=False)
    inserted = result.upserted_count
    modified = result.modified_count
    print(f"[{collection.name}] upserted: {inserted}, modified: {modified}")


def seed_database(client: MongoClient, database_name: str, dry_run: bool = False) -> None:
    db = client[database_name]

    biomes = load_biomes()
    species = load_species()
    traits = load_traits()
    biome_pools = load_biome_pools()

    print(
        "Found"
        f" {len(biomes)} biomes,"
        f" {len(species)} species,"
        f" {len(traits)} traits,"
        f" {len(biome_pools)} biome pools"
    )

    if dry_run:
        print("Dry run enabled: data was not written to MongoDB")
        return

    bulk_upsert(db["biomes"], biomes)
    bulk_upsert(db["species"], species)
    bulk_upsert(db["traits"], traits)
    bulk_upsert(db["biome_pools"], biome_pools)


def resolve_connection_settings(args: argparse.Namespace) -> Tuple[str, str, Dict[str, Any], Dict[str, Any]]:
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

    extras = config.extras if config else {}
    return mongo_url, database, options, extras


def build_arg_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Seed MongoDB with Evo Tactics catalog data")
    parser.add_argument(
        "--mongo-url",
        default=os.environ.get("MONGO_URL", "mongodb://localhost:27017"),
        help="MongoDB connection string",
    )
    parser.add_argument(
        "--database",
        default=os.environ.get("MONGO_DB", "evo_tactics"),
        help="Target database name",
    )
    parser.add_argument(
        "--config",
        help="Percorso del file JSON con la configurazione MongoDB (es. config/mongodb.dev.json)",
    )
    parser.add_argument(
        "--dry-run",
        dest="dry_run",
        action="store_true",
        help="Do not write anything, only print stats",
    )
    parser.add_argument(
        "--no-dry-run",
        dest="dry_run",
        action="store_false",
        help="Force data writes even if the configuration suggests a dry run",
    )
    parser.set_defaults(dry_run=None)
    return parser


def main() -> None:
    parser = build_arg_parser()
    args = parser.parse_args()

    mongo_url, database, mongo_options, extras = resolve_connection_settings(args)

    dry_run_flag = args.dry_run
    if dry_run_flag is None:
        seed_config = extras.get("seed") if isinstance(extras, Mapping) else {}
        if isinstance(seed_config, Mapping) and "dryRun" in seed_config:
            dry_run_flag = bool(seed_config.get("dryRun"))
        else:
            dry_run_flag = False

    client = MongoClient(mongo_url, **mongo_options)
    seed_database(client, database, dry_run=bool(dry_run_flag))


if __name__ == "__main__":
    main()
