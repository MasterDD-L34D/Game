#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const TRAITS_DIR = path.join(ROOT, 'data', 'traits');
const SPECIES_AFFINITY_PATH = path.join(TRAITS_DIR, 'species_affinity.json');
const DEFAULT_OUTPUT = path.join(TRAITS_DIR, 'index.csv');

function readJson(filePath) {
  try {
    const src = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(src);
  } catch (error) {
    throw new Error(`Impossibile leggere ${filePath}: ${error.message}`);
  }
}

function walkTraitFiles(startDir) {
  const result = [];
  if (!fs.existsSync(startDir)) {
    return result;
  }
  const stack = [startDir];
  while (stack.length > 0) {
    const currentDir = stack.pop();
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        stack.push(fullPath);
      } else if (entry.isFile() && entry.name.endsWith('.json')) {
        const baseName = entry.name.toLowerCase();
        if (baseName === 'index.json') {
          continue;
        }
        result.push(fullPath);
      }
    }
  }
  return result;
}

function toRelative(filePath) {
  return path.relative(ROOT, filePath).replace(/\\/g, '/');
}

function normalizeCategory(value) {
  if (!value || typeof value !== 'string') {
    return { family: null, type: null, raw: null };
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return { family: null, type: null, raw: null };
  }
  const [family, type] = trimmed.split('/').map((part) => part && part.trim()).filter(Boolean);
  return {
    family: family || null,
    type: type || null,
    raw: trimmed,
  };
}

function pickCompleteness(trait) {
  if (!trait || typeof trait !== 'object') {
    return null;
  }
  const direct = trait.completezza ?? trait.completeness ?? trait.status ?? trait.state;
  if (direct != null) {
    return direct;
  }
  if (trait.meta && typeof trait.meta === 'object') {
    const meta = trait.meta;
    if (meta.completezza != null) return meta.completezza;
    if (meta.completeness != null) return meta.completeness;
    if (meta.status != null) return meta.status;
    if (meta.state != null) return meta.state;
  }
  return null;
}

function normalizeStringArray(value) {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .filter((item) => typeof item === 'string')
    .map((item) => item.trim())
    .filter(Boolean);
}

function pickDataOrigin(trait) {
  if (!trait || typeof trait !== 'object') {
    return null;
  }
  if (typeof trait.data_origin === 'string' && trait.data_origin.trim()) {
    return trait.data_origin.trim();
  }
  if (trait.meta && typeof trait.meta === 'object') {
    const candidate = trait.meta.expansion;
    if (typeof candidate === 'string' && candidate.trim()) {
      return candidate.trim();
    }
  }
  if (Array.isArray(trait.requisiti_ambientali)) {
    for (const requirement of trait.requisiti_ambientali) {
      if (!requirement || typeof requirement !== 'object') {
        continue;
      }
      const meta = requirement.meta;
      if (meta && typeof meta === 'object') {
        const candidate = meta.expansion;
        if (typeof candidate === 'string' && candidate.trim()) {
          return candidate.trim();
        }
      }
    }
  }
  return null;
}

function loadSpeciesAffinityRegistry(filePath) {
  if (!fs.existsSync(filePath)) {
    return new Map();
  }

  const payload = readJson(filePath);
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return new Map();
  }

  const entries = Object.entries(payload).filter(([, value]) => Array.isArray(value) && value.length > 0);
  return new Map(entries);
}

function deriveCompletionFlags(traitId, trait, biomeTags, usageTags, speciesAffinityRegistry) {
  const flags = {};
  if (trait && typeof trait === 'object' && trait.completion_flags && typeof trait.completion_flags === 'object') {
    for (const [key, value] of Object.entries(trait.completion_flags)) {
      if (typeof value === 'boolean') {
        flags[key] = value;
      }
    }
  }

  const requisiti = trait && Array.isArray(trait.requisiti_ambientali) ? trait.requisiti_ambientali : [];
  const hasBiomeInformation = biomeTags.length > 0 || requisiti.length > 0;
  if (flags.has_biome === undefined) {
    flags.has_biome = Boolean(hasBiomeInformation);
  }

  const speciesAffinity = trait && Array.isArray(trait.species_affinity) ? trait.species_affinity : [];
  const registryAffinity = speciesAffinityRegistry.get(traitId) || [];
  if (flags.has_species_link === undefined) {
    flags.has_species_link = speciesAffinity.length > 0 || registryAffinity.length > 0;
  }

  if (flags.has_usage_tags === undefined && usageTags.length > 0) {
    flags.has_usage_tags = true;
  }

  return flags;
}

function parseArgs(argv) {
  const args = { output: DEFAULT_OUTPUT };
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === '--output' || token === '-o') {
      const next = argv[i + 1];
      if (!next) {
        throw new Error('Argomento mancante per --output');
      }
      args.output = path.resolve(ROOT, next);
      i += 1;
    } else if (token === '--format') {
      const next = argv[i + 1];
      if (!next) {
        throw new Error('Argomento mancante per --format');
      }
      args.format = next.toLowerCase();
      i += 1;
    } else if (token === '--help' || token === '-h') {
      args.help = true;
    } else {
      throw new Error(`Argomento sconosciuto: ${token}`);
    }
  }
  if (!args.format) {
    const ext = path.extname(args.output).toLowerCase();
    if (ext === '.json') {
      args.format = 'json';
    } else if (ext === '.csv') {
      args.format = 'csv';
    } else {
      args.format = 'json';
      args.output = `${args.output}.json`;
    }
  }
  return args;
}

function formatAsJson(traits) {
  return JSON.stringify(
    {
      generated_at: new Date().toISOString(),
      total: traits.length,
      traits,
    },
    null,
    2
  );
}

function escapeCsv(value) {
  if (value == null) {
    return '';
  }
  const str = String(value);
  if (/[",\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function formatAsCsv(traits) {
  const header = [
    'id',
    'label',
    'category',
    'type',
    'path',
    'completeness',
    'data_origin',
    'biome_tags',
    'usage_tags',
    'has_biome',
    'has_species_link',
  ];
  const lines = [header.join(',')];
  for (const trait of traits) {
    const row = [
      escapeCsv(trait.id),
      escapeCsv(trait.label),
      escapeCsv(trait.category.raw || ''),
      escapeCsv(trait.category.type || ''),
      escapeCsv(trait.path),
      escapeCsv(trait.completeness ?? ''),
      escapeCsv(trait.dataOrigin ?? ''),
      escapeCsv(trait.biomeTags.length > 0 ? trait.biomeTags.join(';') : ''),
      escapeCsv(trait.usageTags.length > 0 ? trait.usageTags.join(';') : ''),
      escapeCsv(trait.completionFlags.has_biome ?? ''),
      escapeCsv(trait.completionFlags.has_species_link ?? ''),
    ];
    lines.push(row.join(','));
  }
  return lines.join('\n');
}

function main() {
  let args;
  try {
    args = parseArgs(process.argv.slice(2));
  } catch (error) {
    console.error(error.message);
    console.error('Uso: node scripts/build_trait_index.js [--output <path>] [--format json|csv]');
    process.exitCode = 1;
    return;
  }

  if (args.help) {
    console.log('Uso: node scripts/build_trait_index.js [--output <path>] [--format json|csv]');
    console.log('Scandisce data/traits/ e crea un indice con id, label, categoria e stato di completezza.');
    return;
  }

  const traitFiles = walkTraitFiles(TRAITS_DIR);
  traitFiles.sort((a, b) => a.localeCompare(b));

  const speciesAffinityRegistry = loadSpeciesAffinityRegistry(SPECIES_AFFINITY_PATH);

  const records = [];
  for (const filePath of traitFiles) {
    let data;
    try {
      data = readJson(filePath);
    } catch (error) {
      console.error(error.message);
      process.exitCode = 1;
      return;
    }

    const category = normalizeCategory(data.famiglia_tipologia);
    const biomeTags = normalizeStringArray(data.biome_tags);
    const usageTags = normalizeStringArray(data.usage_tags);
    const traitId = data.id || path.basename(filePath, '.json');
    const completionFlags = deriveCompletionFlags(traitId, data, biomeTags, usageTags, speciesAffinityRegistry);
    const record = {
      id: traitId,
      label: data.label || null,
      category,
      path: toRelative(filePath),
      completeness: pickCompleteness(data),
      dataOrigin: pickDataOrigin(data),
      biomeTags,
      usageTags,
      completionFlags,
    };
    records.push(record);
  }

  let outputData;
  if (args.format === 'csv') {
    outputData = formatAsCsv(records);
  } else if (args.format === 'json') {
    outputData = formatAsJson(records.map((trait) => ({
      id: trait.id,
      label: trait.label,
      categoria: trait.category.raw,
      tipo: trait.category.type,
      famiglia: trait.category.family,
      path: trait.path,
      completeness: trait.completeness ?? null,
      data_origin: trait.dataOrigin ?? null,
      biome_tags: trait.biomeTags,
      usage_tags: trait.usageTags,
      completion_flags: trait.completionFlags,
    })));
  } else {
    console.error(`Formato non supportato: ${args.format}`);
    process.exitCode = 1;
    return;
  }

  try {
    fs.mkdirSync(path.dirname(args.output), { recursive: true });
    fs.writeFileSync(args.output, outputData, 'utf8');
  } catch (error) {
    console.error(`Impossibile scrivere ${args.output}: ${error.message}`);
    process.exitCode = 1;
    return;
  }

  console.log(`Indice generato (${args.format.toUpperCase()}): ${toRelative(args.output)}`);
  console.log(`Totale trait: ${records.length}`);
}

if (require.main === module) {
  main();
}
