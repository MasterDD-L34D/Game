#!/usr/bin/env node

/**
 * Rigenera il mirror `packs/evo_tactics_pack/docs/catalog/trait_reference.json`
 * proiettando l'indice unico `data/traits/index.json` (sorgente autorevole).
 *
 * Il mirror e' una proiezione "lean" dell'indice: mantiene solo i campi consumati
 * dagli strumenti a valle (build_trait_baseline / report_trait_coverage /
 * trait_audit) e sostituisce il glossario inline con un puntatore al file
 * condiviso. Rendendolo GENERATO (non piu' hand-maintained) il drift packs<->index
 * viene intercettato dal guard esistente "Verify evo-pack catalog is regenerated
 * (no drift)" in CI, perche' questo script e' agganciato alla catena `sync:evo-pack`
 * PRIMA di sync_evo_pack_assets.js (che propaga a docs/ + public/).
 *
 * Uso: node scripts/sync_trait_reference.js [--check]
 *   --check  Non scrive: esce con codice 1 se il mirror committato e' fuori sync.
 */

const path = require('node:path');

const { readJsonFile, writeJsonFileFormatted } = require('./utils/jsonio');

const ROOT = path.resolve(__dirname, '..');
const INDEX_PATH = path.join(ROOT, 'data', 'traits', 'index.json');
const MIRROR_PATH = path.join(
  ROOT,
  'packs',
  'evo_tactics_pack',
  'docs',
  'catalog',
  'trait_reference.json',
);

// Puntatore al glossario condiviso: il mirror NON inlina l'oggetto glossario
// (a differenza dell'indice) perche' build_trait_baseline lo risolve come path.
const TRAIT_GLOSSARY_POINTER = 'data/core/traits/glossary.json';

// L'indice ospita anche entry meta/legacy che NON sono tratti di creatura (es.
// `traits_aggregate`, un dump normalizzato dei TR-* per pipeline legacy). Il mirror
// alimenta report_trait_coverage / build_trait_baseline, che le tratterebbero come
// tratti reali e ne pretenderebbero copertura di specie: vanno escluse alla fonte.
// Nota: il prefisso e' `Meta/` con lo slash, quindi non intercetta `Metabolico/...`.
const META_FAMILY_PREFIX = 'Meta/';

function isMetaEntry(trait) {
  return String(trait?.famiglia_tipologia ?? '').startsWith(META_FAMILY_PREFIX);
}

// Campi proiettati, nell'ordine canonico del mirror. I campi solo-indice
// (biome_tags, completion_flags, conflitti, data_origin, id, species_affinity)
// sono volutamente esclusi: preservano il contratto lean consumato a valle.
const MIRROR_FIELDS = [
  'label',
  'famiglia_tipologia',
  'fattore_mantenimento_energetico',
  'tier',
  'slot',
  'slot_profile',
  'usage_tags',
  'sinergie',
  'requisiti_ambientali',
  'mutazione_indotta',
  'uso_funzione',
  'spinta_selettiva',
  'debolezza',
  'sinergie_pi',
];

function projectMirror(indexPayload) {
  const traits = indexPayload?.traits ?? {};
  const projected = {};
  for (const id of Object.keys(traits).sort()) {
    const source = traits[id] ?? {};
    if (isMetaEntry(source)) {
      continue;
    }
    const entry = {};
    for (const field of MIRROR_FIELDS) {
      if (field in source) {
        entry[field] = source[field];
      }
    }
    projected[id] = entry;
  }
  return {
    schema_version: indexPayload.schema_version,
    trait_glossary: TRAIT_GLOSSARY_POINTER,
    traits: projected,
  };
}

async function main() {
  const check = process.argv.slice(2).includes('--check');
  const indexPayload = readJsonFile(INDEX_PATH);
  const mirror = projectMirror(indexPayload);

  // Self-check: la proiezione deve coprire l'indice meno le entry meta, senza campi estranei.
  const indexTraits = indexPayload.traits ?? {};
  const indexCount = Object.keys(indexTraits).length;
  const metaCount = Object.values(indexTraits).filter(isMetaEntry).length;
  const expectedCount = indexCount - metaCount;
  const mirrorCount = Object.keys(mirror.traits).length;
  if (mirrorCount !== expectedCount) {
    throw new Error(
      `Proiezione incoerente: index=${indexCount} meta=${metaCount} attesi=${expectedCount} mirror=${mirrorCount}`,
    );
  }
  for (const [id, entry] of Object.entries(mirror.traits)) {
    for (const field of Object.keys(entry)) {
      if (!MIRROR_FIELDS.includes(field)) {
        throw new Error(`Campo estraneo "${field}" nel trait ${id}`);
      }
    }
  }

  if (check) {
    let current;
    try {
      current = readJsonFile(MIRROR_PATH);
    } catch {
      current = null;
    }
    const drift = JSON.stringify(current) !== JSON.stringify(mirror);
    if (drift) {
      console.error(
        "trait_reference.json e' fuori sync con data/traits/index.json. " +
          "Esegui 'node scripts/sync_trait_reference.js' e committa il risultato.",
      );
      process.exitCode = 1;
      return;
    }
    console.log(`Mirror gia\' sincronizzato (${mirrorCount} tratti).`);
    return;
  }

  const written = await writeJsonFileFormatted(MIRROR_PATH, mirror, { ignoreKeys: [] });
  console.log(
    written
      ? `Aggiornato ${path.relative(ROOT, MIRROR_PATH)} (${mirrorCount} tratti da index.json).`
      : `Nessun aggiornamento: ${path.relative(ROOT, MIRROR_PATH)} gia\' allineato.`,
  );
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}

module.exports = { projectMirror, isMetaEntry, MIRROR_FIELDS };
