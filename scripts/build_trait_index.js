#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const DEFAULT_TRAITS_DIR = path.join(ROOT, 'data', 'traits');
const DEFAULT_OUTPUT = path.join(DEFAULT_TRAITS_DIR, 'index.csv');

const TRAIT_ID_PATTERN = /^[a-z0-9_]+$/;
const SLUG_PATTERN = /^[a-z0-9_]+$/;
const SPECIES_ID_PATTERN = /^[a-z0-9_-]+$/;
const LABEL_PATTERN = /^(i18n:[a-z0-9._]+|\S(?:.*\S)?)$/;
const FAMILY_PATTERN =
  /^[A-Za-z0-9'’À-ÖØ-öø-ÿ][A-Za-z0-9'’À-ÖØ-öø-ÿ _-]+\/[A-Za-z0-9'’À-ÖØ-öø-ÿ][A-Za-z0-9'’À-ÖØ-öø-ÿ _-]+$/;
const UCUM_PATTERN = /^[A-Za-z0-9%*/._^()\[\]\-·⋅]+$/;
const SLOT_PATTERN = /^[A-Z]$/;
const ENVO_PATTERN = /^http:\/\/purl\.obolibrary\.org\/obo\/ENVO_\d+$/;

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
  const ignoredFiles = new Set(['index.json', 'species_affinity.json']);
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
        if (ignoredFiles.has(baseName)) {
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
  const [family, type] = trimmed
    .split('/')
    .map((part) => part && part.trim())
    .filter(Boolean);
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

function deriveCompletionFlags(trait, biomeTags, usageTags) {
  const flags = {};
  if (
    trait &&
    typeof trait === 'object' &&
    trait.completion_flags &&
    typeof trait.completion_flags === 'object'
  ) {
    for (const [key, value] of Object.entries(trait.completion_flags)) {
      if (typeof value === 'boolean') {
        flags[key] = value;
      }
    }
  }

  const requisiti =
    trait && Array.isArray(trait.requisiti_ambientali) ? trait.requisiti_ambientali : [];
  const hasBiomeInformation = biomeTags.length > 0 || requisiti.length > 0;
  if (flags.has_biome === undefined) {
    flags.has_biome = Boolean(hasBiomeInformation);
  }

  const speciesAffinity =
    trait && Array.isArray(trait.species_affinity) ? trait.species_affinity : [];
  if (flags.has_species_link === undefined) {
    flags.has_species_link = speciesAffinity.length > 0;
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
    if (token === '--traits-dir') {
      const next = argv[i + 1];
      if (!next) {
        throw new Error('Argomento mancante per --traits-dir');
      }
      args.traitsDir = path.resolve(ROOT, next);
      i += 1;
      continue;
    }
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
    2,
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
    console.error(
      'Uso: node scripts/build_trait_index.js [--traits-dir <path>] [--output <path>] [--format json|csv]',
    );
    process.exitCode = 1;
    return;
  }

  if (args.help) {
    console.log(
      'Uso: node scripts/build_trait_index.js [--traits-dir <path>] [--output <path>] [--format json|csv]',
    );
    console.log(
      'Scandisce data/traits/ e crea un indice con id, label, categoria e stato di completezza.',
    );
    return;
  }

  const traitsDir = args.traitsDir || DEFAULT_TRAITS_DIR;
  if (!fs.existsSync(traitsDir)) {
    console.error(`Directory dei trait non trovata: ${traitsDir}`);
    process.exitCode = 1;
    return;
  }

  if (args.traitsDir && args.output === DEFAULT_OUTPUT) {
    args.output = path.join(args.traitsDir, path.basename(DEFAULT_OUTPUT));
  }

  const traitFiles = walkTraitFiles(traitsDir);
  traitFiles.sort((a, b) => a.localeCompare(b));

  const errors = [];
  const warnings = [];

  const records = [];
  for (const filePath of traitFiles) {
    let data;
    try {
      data = readJson(filePath);
    } catch (error) {
      errors.push(`[ERROR] ${error.message}`);
      continue;
    }

    const relPath = toRelative(filePath);
    if (typeof data.id !== 'string' || !TRAIT_ID_PATTERN.test(data.id)) {
      errors.push(`[ERROR] ${relPath}: id deve essere uno slug lower_snake_case (^[a-z0-9_]+$)`);
    } else {
      const expectedId = path.basename(filePath, '.json');
      if (data.id !== expectedId) {
        errors.push(
          `[ERROR] ${relPath}: id '${data.id}' deve coincidere con il nome file '${expectedId}'`,
        );
      }
    }
    const category = normalizeCategory(data.famiglia_tipologia);
    if (
      typeof data.famiglia_tipologia !== 'string' ||
      !FAMILY_PATTERN.test(data.famiglia_tipologia)
    ) {
      errors.push(
        `[ERROR] ${relPath}: famiglia_tipologia deve seguire il formato Macro/Sotto con caratteri alfanumerici o spazi`,
      );
    }
    if (typeof data.label !== 'string' || !LABEL_PATTERN.test(data.label)) {
      errors.push(
        `[ERROR] ${relPath}: label deve essere una stringa i18n o testo senza spazi iniziali/finali`,
      );
    }

    const biomeTags = normalizeStringArray(data.biome_tags);
    biomeTags.forEach((tag) => {
      if (!SLUG_PATTERN.test(tag)) {
        errors.push(`[ERROR] ${relPath}: biome_tags contiene un valore non valido: ${tag}`);
      }
    });

    const usageTags = normalizeStringArray(data.usage_tags);
    usageTags.forEach((tag) => {
      if (!SLUG_PATTERN.test(tag)) {
        errors.push(`[ERROR] ${relPath}: usage_tags contiene un valore non valido: ${tag}`);
      }
    });

    if (Array.isArray(data.slot)) {
      data.slot.forEach((slotValue, index) => {
        if (typeof slotValue !== 'string' || !SLOT_PATTERN.test(slotValue)) {
          errors.push(
            `[ERROR] ${relPath}: slot[${index}] deve essere una lettera maiuscola singola (A-Z)`,
          );
        }
      });
    }

    if (Array.isArray(data.sinergie)) {
      data.sinergie.forEach((traitId, index) => {
        if (typeof traitId === 'string' && !SLUG_PATTERN.test(traitId)) {
          errors.push(`[ERROR] ${relPath}: sinergie[${index}] deve essere uno slug (^[a-z0-9_]+$)`);
        }
      });
    }

    if (Array.isArray(data.conflitti)) {
      data.conflitti.forEach((traitId, index) => {
        if (typeof traitId === 'string' && !SLUG_PATTERN.test(traitId)) {
          errors.push(
            `[ERROR] ${relPath}: conflitti[${index}] deve essere uno slug (^[a-z0-9_]+$)`,
          );
        }
      });
    }

    if (
      typeof data.data_origin === 'string' &&
      data.data_origin.trim() &&
      !SLUG_PATTERN.test(data.data_origin.trim())
    ) {
      errors.push(
        `[ERROR] ${relPath}: data_origin deve essere uno slug (^[a-z0-9_]+$): ${data.data_origin}`,
      );
    }

    if (Array.isArray(data.metrics)) {
      data.metrics.forEach((metric, index) => {
        if (!metric || typeof metric !== 'object') {
          warnings.push(`[WARN] ${relPath}: metrics[${index}] non è un oggetto valido`);
          return;
        }
        if (typeof metric.name === 'string' && !/^\S(?:.*\S)?$/.test(metric.name)) {
          errors.push(
            `[ERROR] ${relPath}: metrics[${index}].name deve essere privo di spazi ai bordi`,
          );
        }
        if (typeof metric.unit === 'string' && !UCUM_PATTERN.test(metric.unit)) {
          errors.push(
            `[ERROR] ${relPath}: metrics[${index}].unit deve rispettare la sintassi UCUM (simboli standard, niente spazi)`,
          );
        }
      });
    }

    if (Array.isArray(data.species_affinity)) {
      data.species_affinity.forEach((entry, index) => {
        if (!entry || typeof entry !== 'object') {
          warnings.push(`[WARN] ${relPath}: species_affinity[${index}] non è un oggetto valido`);
          return;
        }
        if (typeof entry.species_id === 'string' && !SPECIES_ID_PATTERN.test(entry.species_id)) {
          errors.push(
            `[ERROR] ${relPath}: species_affinity[${index}].species_id deve usare slug o trattini (^[a-z0-9_-]+$)`,
          );
        }
        if (Array.isArray(entry.roles)) {
          entry.roles.forEach((role) => {
            if (typeof role === 'string' && !SLUG_PATTERN.test(role)) {
              errors.push(
                `[ERROR] ${relPath}: species_affinity[${index}].roles contiene un valore non valido: ${role}`,
              );
            }
          });
        }
      });
    }

    if (data.applicability && typeof data.applicability === 'object') {
      const envoTerms = Array.isArray(data.applicability.envo_terms)
        ? data.applicability.envo_terms
        : [];
      envoTerms.forEach((term, index) => {
        if (typeof term === 'string' && !ENVO_PATTERN.test(term)) {
          errors.push(
            `[ERROR] ${relPath}: applicability.envo_terms[${index}] deve essere un URI ENVO valido`,
          );
        }
      });
    }

    const completionFlags = deriveCompletionFlags(data, biomeTags, usageTags);
    const record = {
      id: data.id || path.basename(filePath, '.json'),
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

  if (warnings.length > 0) {
    warnings.forEach((warning) => {
      console.warn(warning);
    });
  }

  if (errors.length > 0) {
    errors.forEach((message) => {
      console.error(message);
    });
    process.exitCode = 1;
    return;
  }

  let outputData;
  if (args.format === 'csv') {
    outputData = formatAsCsv(records);
  } else if (args.format === 'json') {
    outputData = formatAsJson(
      records.map((trait) => ({
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
      })),
    );
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
