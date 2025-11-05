"""Add mandatory pack identifier to sessions and supporting index."""

from __future__ import annotations

from pymongo.database import Database

MIGRATION_ID = "202411050002"
DESCRIPTION = "Backfill sessions.pack_id and add pack/status index"
DEFAULT_PACK_ID = "evo_tactics_pack"


def upgrade(db: Database) -> None:
    db["sessions"].update_many(
        {"pack_id": {"$exists": False}},
        {"$set": {"pack_id": DEFAULT_PACK_ID}},
    )
    db["sessions"].create_index(
        [("pack_id", 1), ("status", 1)],
        name="pack_status_idx",
    )


def downgrade(db: Database) -> None:
    try:
        db["sessions"].drop_index("pack_status_idx")
    except Exception:
        pass
    db["sessions"].update_many(
        {"pack_id": DEFAULT_PACK_ID},
        {"$unset": {"pack_id": ""}},
    )
