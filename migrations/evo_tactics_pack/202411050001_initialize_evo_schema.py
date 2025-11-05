"""Initial schema definition for Evo Tactics Pack collections."""

from __future__ import annotations

from pymongo.database import Database

MIGRATION_ID = "202411050001"
DESCRIPTION = "Initialize core collections and indexes for Evo Tactics Pack"


def _ensure_collection(db: Database, name: str) -> None:
    if name in db.list_collection_names():
        return
    db.create_collection(name)


def upgrade(db: Database) -> None:
    _ensure_collection(db, "biomes")
    _ensure_collection(db, "species")
    _ensure_collection(db, "traits")
    _ensure_collection(db, "sessions")
    _ensure_collection(db, "activity_logs")

    db["biomes"].create_index("network_id", unique=True, sparse=True, name="network_id_unique")
    db["biomes"].create_index("connections.to", name="connections_to_idx")

    db["species"].create_index("biomes", name="biomes_idx")
    db["species"].create_index([("flags.apex", 1)], name="flags_apex_idx")
    db["species"].create_index([("flags.keystone", 1)], name="flags_keystone_idx")
    db["species"].create_index([("flags.event", 1)], name="flags_event_idx")
    db["species"].create_index([("playable_unit", 1), ("balance.encounter_role", 1)], name="playable_encounter_idx")

    db["traits"].create_index("reference.tier", name="tier_idx")
    db["traits"].create_index("reference.slot", name="slot_idx")

    db["sessions"].create_index([("status", 1), ("started_at", -1)], name="status_started_idx")
    db["sessions"].create_index([("player_id", 1), ("started_at", -1)], name="player_started_idx")
    db["sessions"].create_index([("biome_id", 1)], name="biome_idx")

    db["activity_logs"].create_index([("session_id", 1), ("timestamp", 1)], name="session_ts_idx")
    db["activity_logs"].create_index([("event_type", 1)], name="event_type_idx")
    db["activity_logs"].create_index([("pack_id", 1), ("subject_id", 1)], name="pack_subject_idx")


def downgrade(db: Database) -> None:
    index_map = {
        "biomes": ["network_id_unique", "connections_to_idx"],
        "species": [
            "biomes_idx",
            "flags_apex_idx",
            "flags_keystone_idx",
            "flags_event_idx",
            "playable_encounter_idx",
        ],
        "traits": ["tier_idx", "slot_idx"],
        "sessions": ["status_started_idx", "player_started_idx", "biome_idx"],
        "activity_logs": ["session_ts_idx", "event_type_idx", "pack_subject_idx"],
    }

    for name, indexes in index_map.items():
        collection = db[name]
        for index in indexes:
            try:
                collection.drop_index(index)
            except Exception:
                pass

    for name in ["activity_logs", "sessions", "traits", "species", "biomes"]:
        try:
            db.drop_collection(name)
        except Exception:
            pass
