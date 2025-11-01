#!/usr/bin/env node

/**
 * Rigenera le liste di trait derivate dall'indice unico `data/traits/index.json`.
 * - Aggiorna i blocchi `types` dei cataloghi per puntare all'indice unificato con filtri espliciti.
 * - Sostituisce gli index legacy per tipologia con stub deprecati che reindirizzano al nuovo flusso.
 */

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const TRAIT_INDEX_PATH = path.join(ROOT, 'data', 'traits', 'index.json');
const DEFAULT_SOURCE = 'data/traits/index.json';

const CATALOG_TARGETS = [
  path.join(ROOT, 'data', 'traits', 'index.json'),
  path.join(ROOT, 'docs', 'evo-tactics-pack', 'trait-reference.json'),
  path.join(ROOT, 'docs', 'evo-tactics-pack', 'traits', 'index.json'),
  path.join(ROOT, 'packs', 'evo_tactics_pack', 'docs', 'catalog', 'trait_reference.json'),
];

function readJson(filePath) {
  try {
    const src = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(src);
  } catch (error) {
    throw new Error(`Impossibile leggere ${filePath}: ${error.message}`);
  }
}

function writeJson(filePath, payload, dryRun) {
  const text = `${JSON.stringify(payload, null, 2)}\n`;
  const current = fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf8') : null;
  if (current === text) {
    return false;
  }
  if (dryRun) {
    console.log(`[dry-run] Aggiornamento richiesto per ${path.relative(ROOT, filePath)}`);
    return false;
  }
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, text, 'utf8');
  console.log(`Aggiornato ${path.relative(ROOT, filePath)}`);
  return true;
}

function buildTypeMap(indexPayload) {
  const map = new Map();
  const traits = indexPayload?.traits ?? {};
  for (const [traitId, traitData] of Object.entries(traits)) {
    const coreType = traitData?.slot_profile?.core;
    if (!coreType) {
      continue;
    }
    if (!map.has(coreType)) {
      map.set(coreType, new Set());
    }
    map.get(coreType).add(traitId);
  }
  const sortedEntries = Array.from(map.entries())
    .map(([type, ids]) => [type, Array.from(ids).sort()])
    .sort((a, b) => a[0].localeCompare(b[0]));
  return new Map(sortedEntries);
}

function makeQuery(filters) {
  return {
    source: DEFAULT_SOURCE,
    filters,
  };
}

function syncCatalogTypes(filePath, typeMap, dryRun) {
  const payload = readJson(filePath);
  if (!payload || typeof payload !== 'object') {
    return false;
  }
  if (!payload.types || typeof payload.types !== 'object') {
    return false;
  }
  const nextTypes = {};
  for (const [type, ids] of typeMap.entries()) {
    const filters = { type: [type] };
    const currentQuery = payload.types?.[type]?.query;
    if (currentQuery && typeof currentQuery === 'object') {
      const existingFilters = currentQuery.filters;
      if (existingFilters && typeof existingFilters === 'object') {
        const mergedFilters = { ...existingFilters };
        if (Array.isArray(mergedFilters.type) && mergedFilters.type.length > 0) {
          mergedFilters.type = Array.from(new Set(mergedFilters.type.concat(type))).sort();
        } else {
          mergedFilters.type = [type];
        }
        if (Array.isArray(mergedFilters.biomes)) {
          mergedFilters.biomes = Array.from(new Set(mergedFilters.biomes)).sort();
        }
        if (Array.isArray(mergedFilters.species)) {
          mergedFilters.species = Array.from(new Set(mergedFilters.species)).sort();
        }
        nextTypes[type] = {
          query: makeQuery(mergedFilters),
          traits: ids,
          type,
        };
        continue;
      }
    }
    nextTypes[type] = {
      query: makeQuery(filters),
      traits: ids,
      type,
    };
  }
  return writeJson(filePath, { ...payload, types: nextTypes }, dryRun);
}

function syncDeprecatedTypeFile(type, ids, dryRun) {
  const filePath = path.join(ROOT, 'data', 'traits', type, 'index.json');
  const payload = {
    schema_version: '2.0',
    deprecated: true,
    note: 'Le liste per tipologia sono state unificate in data/traits/index.json. Utilizzare questo file solo come reindirizzamento.',
    redirect: DEFAULT_SOURCE,
    query: makeQuery({ type: [type] }),
    traits: ids,
    type,
  };
  return writeJson(filePath, payload, dryRun);
}

function parseArgs(argv) {
  const args = { dryRun: false, targets: [...CATALOG_TARGETS], skipDeprecated: false };
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === '--dry-run') {
      args.dryRun = true;
    } else if (token === '--skip-deprecated') {
      args.skipDeprecated = true;
    } else if (token === '--only-catalogs') {
      args.skipDeprecated = true;
    } else if (token === '--catalog' || token === '--target') {
      const next = argv[i + 1];
      if (!next) {
        throw new Error(`Argomento mancante per ${token}`);
      }
      args.targets.push(path.resolve(ROOT, next));
      i += 1;
    } else if (token === '--help' || token === '-h') {
      args.help = true;
    } else {
      throw new Error(`Argomento sconosciuto: ${token}`);
    }
  }
  return args;
}

function printHelp() {
  console.log(`Utilizzo: node scripts/sync_trait_lists.js [opzioni]\n\n` +
    `Opzioni:\n` +
    `  --dry-run           Mostra i file che verrebbero aggiornati senza scrivere su disco.\n` +
    `  --skip-deprecated   Non rigenera gli stub legacy nelle cartelle per tipologia.\n` +
    `  --only-catalogs     Alias di --skip-deprecated.\n` +
    `  --catalog <path>    Aggiunge un file catalogo extra da sincronizzare.\n` +
    `  --help              Mostra questo messaggio.\n`);
}

function main() {
  let args;
  try {
    args = parseArgs(process.argv.slice(2));
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
    return;
  }
  if (args.help) {
    printHelp();
    return;
  }

  const traitIndex = readJson(TRAIT_INDEX_PATH);
  const typeMap = buildTypeMap(traitIndex);
  const updatedFiles = new Set();

  for (const target of args.targets) {
    if (!fs.existsSync(target)) {
      console.warn(`Ignoro catalogo mancante: ${path.relative(ROOT, target)}`);
      continue;
    }
    const changed = syncCatalogTypes(target, typeMap, args.dryRun);
    if (changed) {
      updatedFiles.add(target);
    }
  }

  if (!args.skipDeprecated) {
    for (const [type, ids] of typeMap.entries()) {
      const changed = syncDeprecatedTypeFile(type, ids, args.dryRun);
      if (changed) {
        updatedFiles.add(path.join(ROOT, 'data', 'traits', type, 'index.json'));
      }
    }
  }

  if (updatedFiles.size === 0) {
    console.log(args.dryRun ? 'Nessun aggiornamento necessario.' : 'Liste già sincronizzate.');
  }
}

if (require.main === module) {
  main();
}
