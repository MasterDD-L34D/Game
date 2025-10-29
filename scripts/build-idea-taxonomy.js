#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');
const yaml = require('js-yaml');

const ROOT = path.resolve(__dirname, '..');
const OUTPUT_FILE = path.join(ROOT, 'docs', 'public', 'idea-taxonomy.json');

function readYaml(filePath) {
  try {
    const src = fs.readFileSync(filePath, 'utf8');
    return yaml.load(src) || {};
  } catch (error) {
    if (error.code === 'ENOENT') {
      return {};
    }
    throw new Error(`Impossibile leggere YAML ${filePath}: ${error.message}`);
  }
}

function readJson(filePath) {
  try {
    const src = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(src);
  } catch (error) {
    if (error.code === 'ENOENT') {
      return {};
    }
    throw new Error(`Impossibile leggere JSON ${filePath}: ${error.message}`);
  }
}

function walkFiles(startDir, extensions = new Set(['.yaml', '.yml'])) {
  const result = [];
  if (!fs.existsSync(startDir)) {
    return result;
  }
  const stack = [startDir];
  while (stack.length) {
    const current = stack.pop();
    const entries = fs.readdirSync(current, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(fullPath);
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase();
        if (extensions.has(ext)) {
          result.push(fullPath);
        }
      }
    }
  }
  return result;
}

function toRelative(filePath) {
  return path.relative(ROOT, filePath);
}

function uniqueSorted(iterable) {
  const source = Array.isArray(iterable) ? iterable : Array.from(iterable || []);
  return Array.from(
    new Set(
      source
        .map((value) => (value == null ? '' : String(value).trim()))
        .filter(Boolean)
    )
  ).sort((a, b) => a.localeCompare(b));
}

function collectBiomes() {
  const filePath = path.join(ROOT, 'data', 'biomes.yaml');
  let content = '';
  try {
    content = fs.readFileSync(filePath, 'utf8');
  } catch (error) {
    if (error.code !== 'ENOENT') {
      throw new Error(`Impossibile leggere ${filePath}: ${error.message}`);
    }
  }

  const slugs = new Set();
  if (content) {
    const lines = content.split(/\r?\n/);
    let inside = false;
    for (const line of lines) {
      if (!inside) {
        if (/^biomes\s*:/i.test(line.trim())) {
          inside = true;
        }
        continue;
      }
      if (/^[^\s#]/.test(line)) {
        // reached a new top-level key
        break;
      }
      const match = line.match(/^ {2}([a-z0-9_]+):\s*$/i);
      if (match) {
        slugs.add(match[1]);
      }
    }
  }

  const aliasConfig = readYaml(path.join(ROOT, 'data', 'biome_aliases.yaml'));
  const aliases = aliasConfig.aliases || {};
  return {
    list: uniqueSorted(slugs),
    aliases: Object.entries(aliases).reduce((acc, [alias, details]) => {
      const canonical = (details && (details.canonical || details.target)) || '';
      if (alias && canonical) {
        acc[String(alias).trim()] = String(canonical).trim();
      }
      return acc;
    }, {}),
  };
}

function collectEcosystems() {
  const dirs = [
    path.join(ROOT, 'packs', 'evo_tactics_pack', 'data', 'ecosistemi'),
    path.join(ROOT, 'packs', 'evo_tactics_pack', 'data', 'ecosystems'),
  ];
  const slugs = new Set();
  for (const dir of dirs) {
    for (const file of walkFiles(dir)) {
      const base = path.basename(file).replace(/\.ya?ml$/i, '');
      if (!base) continue;
      const normalized = base.split('.')[0];
      if (normalized) {
        slugs.add(normalized.trim());
      }
    }
  }
  return uniqueSorted(slugs);
}

function collectSpecies() {
  const slugs = new Set();
  const aliasMap = {};

  function addSlug(value) {
    if (!value) return;
    const raw = String(value).trim();
    if (!raw) return;
    const canonical = raw.replace(/_/g, '-');
    const lowerCanonical = canonical.toLowerCase();
    slugs.add(lowerCanonical);

    const lowerRaw = raw.toLowerCase();
    if (lowerRaw !== lowerCanonical) {
      if (!aliasMap[lowerRaw]) {
        aliasMap[lowerRaw] = lowerCanonical;
      }
    }
    if (lowerCanonical.includes('-')) {
      const underscoreAlias = lowerCanonical.replace(/-/g, '_');
      if (underscoreAlias !== lowerCanonical && !aliasMap[underscoreAlias]) {
        aliasMap[underscoreAlias] = lowerCanonical;
      }
    }
  }

  const mainCatalog = readYaml(path.join(ROOT, 'data', 'species.yaml'));
  if (Array.isArray(mainCatalog.species)) {
    for (const item of mainCatalog.species) {
      if (item && typeof item === 'object' && item.id) {
        addSlug(item.id);
      }
    }
  }

  for (const file of walkFiles(path.join(ROOT, 'packs', 'evo_tactics_pack', 'data', 'species'))) {
    try {
      const payload = readYaml(file);
      if (payload && typeof payload === 'object' && payload.id) {
        addSlug(payload.id);
      } else {
        const base = path.basename(file).replace(/\.ya?ml$/i, '');
        addSlug(base);
      }
    } catch (error) {
      throw new Error(`Errore parsing specie ${file}: ${error.message}`);
    }
  }

  return {
    list: uniqueSorted(slugs),
    aliases: aliasMap,
  };
}

function collectTraits() {
  const glossary = readJson(path.join(ROOT, 'data', 'traits', 'glossary.json'));
  const traits = glossary.traits || {};
  return uniqueSorted(Object.keys(traits));
}

function collectGameFunctions() {
  const config = readYaml(path.join(ROOT, 'data', 'game_functions.yaml'));
  const functions = Array.isArray(config.functions) ? config.functions : [];
  return uniqueSorted(functions);
}

function buildTaxonomy() {
  const { list: biomes, aliases: biomeAliases } = collectBiomes();
  const ecosystems = collectEcosystems();
  const { list: species, aliases: speciesAliases } = collectSpecies();
  const traits = collectTraits();
  const gameFunctions = collectGameFunctions();

  return {
    generatedAt: new Date().toISOString(),
    sources: {
      biomes: toRelative(path.join(ROOT, 'data', 'biomes.yaml')),
      biomeAliases: toRelative(path.join(ROOT, 'data', 'biome_aliases.yaml')),
      ecosystems: [
        toRelative(path.join(ROOT, 'packs', 'evo_tactics_pack', 'data', 'ecosistemi')),
        toRelative(path.join(ROOT, 'packs', 'evo_tactics_pack', 'data', 'ecosystems')),
      ],
      species: [
        toRelative(path.join(ROOT, 'data', 'species.yaml')),
        toRelative(path.join(ROOT, 'packs', 'evo_tactics_pack', 'data', 'species')),
      ],
      traits: toRelative(path.join(ROOT, 'data', 'traits', 'glossary.json')),
      gameFunctions: toRelative(path.join(ROOT, 'data', 'game_functions.yaml')),
    },
    biomes,
    biomeAliases,
    ecosystems,
    species,
    speciesAliases,
    traits,
    gameFunctions,
  };
}

function main() {
  const taxonomy = buildTaxonomy();
  fs.mkdirSync(path.dirname(OUTPUT_FILE), { recursive: true });
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(taxonomy, null, 2) + '\n', 'utf8');
  console.log(`Idea taxonomy aggiornata → ${toRelative(OUTPUT_FILE)}`);
  console.log(
    `Biomi: ${taxonomy.biomes.length}, Ecosistemi: ${taxonomy.ecosystems.length}, Specie: ${taxonomy.species.length}, Tratti: ${taxonomy.traits.length}, Funzioni: ${taxonomy.gameFunctions.length}`
  );
}

if (require.main === module) {
  main();
}
