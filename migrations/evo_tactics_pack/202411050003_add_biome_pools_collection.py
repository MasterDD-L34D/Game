"""Create biome_pools collection and indexes for Evo Tactics Pack."""

from __future__ import annotations

from pymongo.database import Database

MIGRATION_ID = "202411050003"
DESCRIPTION = "Create biome_pools collection with query indexes"


def _ensure_collection(db: Database, name: str):
    if name in db.list_collection_names():
        return db[name]
    db.create_collection(name)
    return db[name]


def upgrade(db: Database) -> None:
    collection = _ensure_collection(db, "biome_pools")

    collection.create_index(
        [("hazard.severity", 1)],
        name="hazard_severity_idx",
    )
    collection.create_index(
        [("climate_tags", 1)],
        name="climate_tags_idx",
    )
    collection.create_index(
        [("role_templates.role", 1)],
        name="role_templates_role_idx",
    )
    collection.create_index(
        [("traits.core", 1)],
        name="traits_core_idx",
    )


def downgrade(db: Database) -> None:
    indexes = [
        "hazard_severity_idx",
        "climate_tags_idx",
        "role_templates_role_idx",
        "traits_core_idx",
    ]
    collection = db["biome_pools"]
    for index in indexes:
        try:
            collection.drop_index(index)
        except Exception:
            pass
    try:
        db.drop_collection("biome_pools")
    except Exception:
        pass
