const fs = require('node:fs/promises');
const path = require('node:path');
const Ajv = require('ajv/dist/2020');

const DEFAULT_SCHEMA_PATH = path.resolve(
  __dirname,
  '..',
  '..',
  'config',
  'schemas',
  'trait.schema.json',
);

class TraitRepository {
  constructor(options = {}) {
    this.dataRoot = options.dataRoot || path.resolve(__dirname, '..', '..', 'data');
    this.traitsRoot = path.join(this.dataRoot, 'traits');
    this.versionRoot = path.join(this.traitsRoot, '_versions');
    this.schemaPath = options.schemaPath || DEFAULT_SCHEMA_PATH;
    this.ajvOptions = {
      allErrors: true,
      strict: false,
      strictSchema: false,
      allowUnionTypes: true,
      validateFormats: false,
    };
    this.validator = null;
    this.schemaCache = null;
  }

  static createHttpError(statusCode, message) {
    const error = new Error(message);
    error.statusCode = statusCode;
    return error;
  }

  static normaliseTraitId(rawId) {
    const id = String(rawId || '').trim();
    if (!id) {
      throw TraitRepository.createHttpError(400, 'Trait ID richiesto');
    }
    if (!/^[a-z0-9_]+$/.test(id)) {
      throw TraitRepository.createHttpError(400, 'Trait ID non valido: utilizzare slug a-z0-9_');
    }
    return id;
  }

  static slugify(value) {
    if (!value) {
      return '';
    }
    const normalised = String(value)
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .toLowerCase();
    return normalised
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .replace(/_{2,}/g, '_');
  }

  static deriveIdFromLabel(label) {
    if (typeof label !== 'string') {
      return '';
    }
    const trimmed = label.trim();
    if (!trimmed) {
      return '';
    }
    const i18nMatch = trimmed.match(/^i18n:traits\.([a-z0-9_]+)(?:\.[a-z0-9_]+)?$/i);
    if (i18nMatch) {
      return i18nMatch[1].toLowerCase();
    }
    return TraitRepository.slugify(trimmed);
  }

  static parseBoolean(value) {
    if (typeof value === 'string') {
      const normalised = value.trim().toLowerCase();
      if (normalised === 'true' || normalised === '1') {
        return true;
      }
      if (normalised === 'false' || normalised === '0' || normalised === '') {
        return false;
      }
    }
    return Boolean(value);
  }

  async #readJsonFile(filePath, fallback = null) {
    try {
      const content = await fs.readFile(filePath, 'utf8');
      return JSON.parse(content);
    } catch (error) {
      if (error && error.code === 'ENOENT') {
        return fallback;
      }
      throw error;
    }
  }

  async #writeJsonFile(filePath, payload) {
    const directory = path.dirname(filePath);
    await fs.mkdir(directory, { recursive: true });
    await fs.writeFile(filePath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  }

  #prepareForSchemaValidation(trait) {
    const candidate = JSON.parse(JSON.stringify(trait || {}));
    if (candidate && typeof candidate.tier === 'string') {
      const normalisedTier = candidate.tier.trim();
      if (normalisedTier) {
        candidate.tier = normalisedTier.toUpperCase();
      }
    }
    return candidate;
  }

  async loadSchema() {
    if (this.schemaCache) {
      return this.schemaCache;
    }
    const loaded = await this.#readJsonFile(this.schemaPath, null);
    if (!loaded) {
      throw new Error('Schema trait non disponibile');
    }
    this.schemaCache = loaded;
    return this.schemaCache;
  }

  async getValidator() {
    if (this.validator) {
      return this.validator;
    }
    const schema = await this.loadSchema();
    const ajv = new Ajv(this.ajvOptions);
    this.validator = ajv.compile(schema);
    return this.validator;
  }

  async listTraitDirectories(includeDrafts = false) {
    const entries = await fs.readdir(this.traitsRoot, { withFileTypes: true });
    return entries
      .filter((entry) => entry.isDirectory())
      .filter((entry) => {
        if (entry.name === '_versions') {
          return false;
        }
        if (entry.name === '_drafts') {
          return includeDrafts;
        }
        return true;
      })
      .map((entry) => entry.name);
  }

  async #loadTraitSummary(category, fileName) {
    const filePath = path.join(this.traitsRoot, category, fileName);
    const trait = await this.#readJsonFile(filePath, null);
    if (!trait || typeof trait !== 'object') {
      return null;
    }
    const stat = await fs.stat(filePath);
    const id = trait.id || fileName.replace(/\.json$/i, '');
    return {
      id,
      label: trait.label || id,
      category,
      path: path.relative(this.dataRoot, filePath),
      updatedAt: stat.mtime.toISOString(),
      isDraft: category === '_drafts',
    };
  }

  async listTraits(includeDrafts = false) {
    const directories = await this.listTraitDirectories(includeDrafts);
    const summaries = [];
    for (const directory of directories) {
      const directoryPath = path.join(this.traitsRoot, directory);
      const files = await fs.readdir(directoryPath, { withFileTypes: true });
      for (const file of files) {
        if (!file.isFile()) {
          continue;
        }
        if (!file.name.endsWith('.json')) {
          continue;
        }
        if (
          file.name === 'index.json' ||
          file.name === 'index.csv' ||
          file.name === 'species_affinity.json'
        ) {
          continue;
        }
        const summary = await this.#loadTraitSummary(directory, file.name);
        if (summary) {
          summaries.push(summary);
        }
      }
    }
    summaries.sort((a, b) => a.label.localeCompare(b.label, 'it'));
    return summaries;
  }

  async resolveTraitPath(traitId) {
    const directories = await this.listTraitDirectories(true);
    for (const directory of directories) {
      const candidate = path.join(this.traitsRoot, directory, `${traitId}.json`);
      try {
        await fs.access(candidate);
        return { filePath: candidate, category: directory, isDraft: directory === '_drafts' };
      } catch (error) {
        if (!error || error.code !== 'ENOENT') {
          throw error;
        }
      }
    }
    const draftPath = path.join(this.traitsRoot, '_drafts', `${traitId}.json`);
    try {
      await fs.access(draftPath);
      return { filePath: draftPath, category: '_drafts', isDraft: true };
    } catch (error) {
      if (!error || error.code !== 'ENOENT') {
        throw error;
      }
    }
    return null;
  }

  async getTrait(traitId) {
    const normalisedId = TraitRepository.normaliseTraitId(traitId);
    const resolved = await this.resolveTraitPath(normalisedId);
    if (!resolved) {
      throw TraitRepository.createHttpError(404, 'Trait non trovato');
    }
    const trait = await this.#readJsonFile(resolved.filePath, null);
    if (!trait) {
      throw TraitRepository.createHttpError(404, 'Trait non trovato');
    }
    return {
      trait,
      meta: {
        id: trait.id || normalisedId,
        path: path.relative(this.dataRoot, resolved.filePath),
        category: resolved.category,
        isDraft: resolved.isDraft,
      },
    };
  }

  async #generateUniqueId(baseId) {
    let candidate = baseId;
    let counter = 0;
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const resolved = await this.resolveTraitPath(candidate);
      if (!resolved) {
        return candidate;
      }
      counter += 1;
      candidate = `${baseId}_${counter}`;
    }
  }

  async #ensureCategoryDirectory(category, { draft = false } = {}) {
    if (draft) {
      const draftDir = path.join(this.traitsRoot, '_drafts');
      await fs.mkdir(draftDir, { recursive: true });
      return draftDir;
    }
    const safeCategory = String(category || '').trim();
    if (!safeCategory) {
      throw TraitRepository.createHttpError(400, 'Categoria richiesta per il salvataggio');
    }
    const categoryDir = path.join(this.traitsRoot, safeCategory);
    await fs.mkdir(categoryDir, { recursive: true });
    return categoryDir;
  }

  #prepareTraitForStorage(trait, traitId) {
    const prepared = this.#prepareForSchemaValidation(trait);
    prepared.id = traitId;
    return prepared;
  }

  prepareForValidation(trait, traitId) {
    const effectiveId =
      traitId || (trait && typeof trait.id === 'string' ? trait.id : undefined) || undefined;
    return this.#prepareTraitForStorage(trait, effectiveId);
  }

  async #validateTraitPayload(trait, { traitId } = {}) {
    const candidate = this.#prepareTraitForStorage(trait, traitId || trait.id);
    const validate = await this.getValidator();
    const valid = Boolean(validate(candidate));
    if (!valid) {
      const error = TraitRepository.createHttpError(400, 'Validazione fallita');
      error.details = validate.errors || [];
      throw error;
    }
    return candidate;
  }

  async #snapshotVersion(traitId, existing) {
    if (!existing) {
      return;
    }
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const versionPath = path.join(this.versionRoot, traitId, `${timestamp}.json`);
    await this.#writeJsonFile(versionPath, existing);
  }

  async #updateIndexEntry(trait, { remove = false } = {}) {
    const indexPath = path.join(this.traitsRoot, 'index.json');
    const indexData =
      (await this.#readJsonFile(indexPath, null)) || {
        schema_version: '2.0',
        trait_glossary: 'data/core/traits/glossary.json',
        traits: {},
      };
    if (!indexData.traits || typeof indexData.traits !== 'object') {
      indexData.traits = {};
    }
    if (remove) {
      delete indexData.traits[trait.id];
    } else {
      indexData.traits[trait.id] = trait;
    }
    const sorted = {};
    for (const key of Object.keys(indexData.traits).sort()) {
      sorted[key] = indexData.traits[key];
    }
    indexData.traits = sorted;
    await this.#writeJsonFile(indexPath, indexData);
  }

  async #deriveTraitIdFromPayload(payload, { traitId } = {}) {
    if (traitId) {
      return TraitRepository.normaliseTraitId(traitId);
    }
    if (payload && typeof payload.id === 'string') {
      return TraitRepository.normaliseTraitId(payload.id);
    }
    if (payload && typeof payload.slug === 'string') {
      return TraitRepository.normaliseTraitId(payload.slug);
    }
    const candidateFromLabel = TraitRepository.deriveIdFromLabel(payload && payload.label);
    if (candidateFromLabel) {
      return TraitRepository.normaliseTraitId(candidateFromLabel);
    }
    throw TraitRepository.createHttpError(400, 'Impossibile determinare ID trait');
  }

  #stripMetaFields(payload) {
    if (!payload || typeof payload !== 'object') {
      return {};
    }
    const allowed = { ...payload };
    delete allowed.category;
    delete allowed.traitId;
    delete allowed.slug;
    delete allowed.draft;
    delete allowed.meta;
    delete allowed.createdAt;
    delete allowed.updatedAt;
    delete allowed.isDraft;
    return allowed;
  }

  async createTrait(rawPayload, options = {}) {
    const payload = this.#stripMetaFields(rawPayload);
    const requestedId = options.traitId || rawPayload?.traitId || rawPayload?.slug;
    let traitId;
    try {
      traitId = await this.#deriveTraitIdFromPayload(payload, { traitId: requestedId });
    } catch (error) {
      if (error.statusCode) {
        throw error;
      }
      throw TraitRepository.createHttpError(400, error.message);
    }
    traitId = await this.#generateUniqueId(traitId);
    const category = options.category || rawPayload?.category || null;
    const draft =
      options.draft != null
        ? TraitRepository.parseBoolean(options.draft)
        : TraitRepository.parseBoolean(rawPayload?.draft);
    const storageDir = await this.#ensureCategoryDirectory(category, { draft });
    const filePath = path.join(storageDir, `${traitId}.json`);
    const validated = await this.#validateTraitPayload(payload, { traitId });
    await this.#writeJsonFile(filePath, validated);
    if (!draft) {
      await this.#updateIndexEntry(validated, { remove: false });
    }
    const stat = await fs.stat(filePath);
    return {
      trait: validated,
      meta: {
        id: traitId,
        path: path.relative(this.dataRoot, filePath),
        category: draft ? '_drafts' : category,
        savedAt: stat.mtime.toISOString(),
        created: true,
        isDraft: draft,
      },
    };
  }

  async updateTrait(traitId, rawPayload) {
    const normalisedId = TraitRepository.normaliseTraitId(traitId);
    const resolved = await this.resolveTraitPath(normalisedId);
    if (!resolved) {
      throw TraitRepository.createHttpError(404, 'Trait non trovato');
    }
    const payload = this.#stripMetaFields(rawPayload);
    payload.id = normalisedId;
    const validated = await this.#validateTraitPayload(payload, { traitId: normalisedId });
    const existing = await this.#readJsonFile(resolved.filePath, null);
    if (existing) {
      await this.#snapshotVersion(normalisedId, existing);
    }
    await this.#writeJsonFile(resolved.filePath, validated);
    if (!resolved.isDraft) {
      await this.#updateIndexEntry(validated, { remove: false });
    }
    const stat = await fs.stat(resolved.filePath);
    return {
      trait: validated,
      meta: {
        id: normalisedId,
        path: path.relative(this.dataRoot, resolved.filePath),
        category: resolved.category,
        savedAt: stat.mtime.toISOString(),
        versioned: Boolean(existing),
        isDraft: resolved.isDraft,
      },
    };
  }

  async cloneTrait(sourceId, options = {}) {
    const { trait: sourceTrait, meta } = await this.getTrait(sourceId);
    const overrides = options.overrides && typeof options.overrides === 'object' ? options.overrides : {};
    const categoryOverride = options.category || overrides.category || null;
    const draft =
      options.draft != null
        ? TraitRepository.parseBoolean(options.draft)
        : meta.isDraft === undefined
          ? false
          : Boolean(meta.isDraft);
    const base = JSON.parse(JSON.stringify(sourceTrait));
    for (const [key, value] of Object.entries(overrides)) {
      if (key === 'category' || key === 'traitId' || key === 'slug') {
        continue;
      }
      if (value === undefined) {
        continue;
      }
      base[key] = value;
    }
    const traitIdOverride = options.traitId || overrides.traitId || overrides.slug || overrides.id;
    const created = await this.createTrait(base, {
      category: categoryOverride || meta.category,
      draft,
      traitId: traitIdOverride,
    });
    created.meta.clonedFrom = meta.id;
    return created;
  }

  async deleteTrait(traitId) {
    const normalisedId = TraitRepository.normaliseTraitId(traitId);
    const resolved = await this.resolveTraitPath(normalisedId);
    if (!resolved) {
      throw TraitRepository.createHttpError(404, 'Trait non trovato');
    }
    const existing = await this.#readJsonFile(resolved.filePath, null);
    if (existing) {
      await this.#snapshotVersion(normalisedId, existing);
    }
    await fs.unlink(resolved.filePath);
    if (!resolved.isDraft) {
      await this.#updateIndexEntry({ id: normalisedId }, { remove: true });
    }
    return {
      meta: {
        id: normalisedId,
        path: path.relative(this.dataRoot, resolved.filePath),
        category: resolved.category,
        versioned: Boolean(existing),
        deleted: true,
        isDraft: resolved.isDraft,
      },
    };
  }

  async getIndex() {
    const indexPath = path.join(this.traitsRoot, 'index.json');
    const data = await this.#readJsonFile(indexPath, null);
    if (!data) {
      throw TraitRepository.createHttpError(404, 'Indice trait non disponibile');
    }
    return data;
  }
}

module.exports = {
  TraitRepository,
};
