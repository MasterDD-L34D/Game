"""OD-024 D4 -- shared interoception_traits field helper for the species ETL.

Single Python SoT for the interoception gateway whitelist + the source->catalog
filter, imported by the catalog assemblers (merge_pack_v2_species.py +
promote_gameplay_to_canon.py). Mirrors the producer whitelist in
apps/backend/services/sentience/sentienceInteroceptionGrant.js
(INTEROCEPTION_TRAIT_IDS) -- keep the two in sync.

The filter normalizes a raw source value into a clean, whitelist-only,
order-preserving, de-duplicated list. Callers add the field to a catalog entry
ONLY when the result is non-empty, so a source without the field leaves the entry
(and therefore the regenerated catalog) byte-identical. D4 is infra-only:
ZERO species author the field in this work -> the passthrough is a no-op on
current data (band-neutral).
"""

from __future__ import annotations

# RFC sentience v0.1 interoception gateway trait ids (OD-024, RFC sez.5 MVP).
# Canonical 4 -- must match producer INTEROCEPTION_TRAIT_IDS (JS).
INTEROCEPTION_TRAIT_IDS = (
    "propriocezione",
    "equilibrio_vestibolare",
    "nocicezione",
    "termocezione",
)


def filter_interoception(value):
    """Normalize a raw source `interoception_traits` value for the catalog.

    Returns a list containing only canonical gateway ids, in first-seen order,
    de-duplicated. Any non-list input (None, str, ...) or all-unknown input
    yields []. Callers omit the catalog key when the result is empty so the
    field stays absent until a species actually authors it.
    """
    if not isinstance(value, list):
        return []
    out = []
    seen = set()
    for raw in value:
        if raw in INTEROCEPTION_TRAIT_IDS and raw not in seen:
            out.append(raw)
            seen.add(raw)
    return out
