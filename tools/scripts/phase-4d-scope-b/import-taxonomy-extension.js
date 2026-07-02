/**
 * Phase 4d Scope B — canonical species_catalog.json loader for Game-Database.
 *
 * Drop-in extension for server/scripts/ingest/import-taxonomy.js:
 *   1. Append this file's content near other import helpers.
 *   2. Modify the main importSpecies(db) flow to call loadGameCanonicalSpeciesCatalog()
 *      FIRST, fallback to existing mirror logic if canonical not found.
 *   3. Export loadGameCanonicalSpeciesCatalog for tests.
 *
 * Cross-link:
 * - Game/ canonical SOT: data/core/species/species_catalog.json v0.4.x (53 species)
 * - ADR-2026-05-15-species-catalog-schema-fork-resolution.md
 * - ADR-2026-04-14-game-database-topology.md
 */

const path = require('path');
const fs = require('fs');

/**
 * Load canonical species catalog from Game/ sibling repo.
 * Returns array of Species-shaped entries or null if catalog not found.
 *
 * Path priority:
 *   1. process.env.GAME_CANONICAL_CATALOG_PATH (CI / test override)
 *   2. Default: ../Game/data/core/species/species_catalog.json (sibling layout)
 *
 * Schema map catalog v0.4.x → Game-Database Species:
 *   species_id          → slug
 *   legacy_slug         → legacy_slug
 *   scientific_name     → scientific_name
 *   common_names        → common_names[]
 *   classification      → classification{}
 *   clade_tag           → clade_tag (Apex|Threat|Bridge|Keystone|Support|Playable)
 *   role_tags           → role_tags[]
 *   ecotypes            → ecotypes[]
 *   biome_affinity      → biome_affinity
 *   sentience_index     → sentience_index (T0-T6)
 *   risk_profile        → risk_profile{danger_level, vectors[]}
 *   functional_signature→ functional_signature
 *   visual_description  → visual_description
 *   interactions        → interactions{predates_on, predated_by, symbiosis}
 *   ecology             → ecology{} (ADR-2026-05-02 block, may be null)
 *   pack_size           → pack_size{min, max}
 *   default_parts       → default_parts{locomotion, metabolism, offense, defense, senses}
 *   trait_refs          → trait_refs[]
 *   genus               → genus
 *   epithet             → epithet
 *   source              → source_provenance (pack-v2-full-plus|game-canonical-stub|legacy-yaml-merge)
 *   _provenance         → _provenance_audit (Path D HYBRID audit trail)
 */
function loadGameCanonicalSpeciesCatalog() {
  const defaultPath = path.resolve(
    __dirname,
    '..',
    '..',
    '..',
    '..',
    'Game',
    'data',
    'core',
    'species',
    'species_catalog.json',
  );
  const catalogPath = process.env.GAME_CANONICAL_CATALOG_PATH || defaultPath;

  if (!fs.existsSync(catalogPath)) {
    console.warn(
      `[import-taxonomy] canonical catalog not found at ${catalogPath}, falling back to mirror`,
    );
    return null;
  }

  try {
    const raw = fs.readFileSync(catalogPath, 'utf8');
    const data = JSON.parse(raw);
    const catalog = Array.isArray(data.catalog) ? data.catalog : [];

    if (catalog.length === 0) {
      console.warn('[import-taxonomy] canonical catalog is empty, falling back to mirror');
      return null;
    }

    return catalog.map((entry) => ({
      slug: entry.species_id,
      legacy_slug: entry.legacy_slug || entry.species_id,
      scientific_name: entry.scientific_name,
      common_names: entry.common_names || [],
      classification: entry.classification || {},
      clade_tag: entry.clade_tag,
      role_tags: entry.role_tags || [],
      ecotypes: entry.ecotypes || [],
      biome_affinity: entry.biome_affinity,
      sentience_index: entry.sentience_index,
      risk_profile: entry.risk_profile || {},
      functional_signature: entry.functional_signature || '',
      visual_description: entry.visual_description || '',
      interactions: entry.interactions || {},
      ecology: entry.ecology || null,
      pack_size: entry.pack_size || null,
      default_parts: entry.default_parts || null,
      trait_refs: entry.trait_refs || [],
      genus: entry.genus,
      epithet: entry.epithet,
      source_provenance: entry.source,
      _provenance_audit: entry._provenance || {},
      _imported_at: new Date().toISOString(),
      _catalog_version: data.version || 'unknown',
    }));
  } catch (err) {
    console.warn(`[import-taxonomy] canonical catalog load failed: ${err.message}`);
    return null;
  }
}

/**
 * Modified main import flow — call this from importSpecies(db).
 * Prefer canonical, fallback to mirror.
 */
async function importSpeciesCanonicalFirst(db) {
  const canonical = loadGameCanonicalSpeciesCatalog();

  if (canonical && canonical.length > 0) {
    console.log(`[import-taxonomy] canonical catalog: ${canonical.length} species`);
    for (const entry of canonical) {
      await db
        .collection('species')
        .updateOne({ slug: entry.slug }, { $set: entry }, { upsert: true });
    }
    console.log(`[import-taxonomy] canonical import complete: ${canonical.length} upserted`);
    return { source: 'canonical', count: canonical.length };
  }

  // FALLBACK: existing mirror logic (species-index.json + species/*.json)
  // Keep existing implementation here — do not modify.
  console.log('[import-taxonomy] using fallback mirror logic');
  // ... existing fallback code ...
  return { source: 'mirror', count: 0 };
}

module.exports = {
  loadGameCanonicalSpeciesCatalog,
  importSpeciesCanonicalFirst,
};
