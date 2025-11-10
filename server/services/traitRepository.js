const fs = require('node:fs/promises');
const path = require('node:path');
const Ajv = require('ajv/dist/2020');

const REPO_ROOT = path.resolve(__dirname, '..', '..');

const DEFAULT_SCHEMA_PATH = path.resolve(REPO_ROOT, 'config', 'schemas', 'trait.schema.json');

const DEFAULT_VERSION_RETENTION = {
  maxEntries: 50,
  maxAgeDays: 365,
};

class TraitRepository {
  constructor(options = {}) {
    this.dataRoot = options.dataRoot || path.resolve(__dirname, '..', '..', 'data');
    this.traitsRoot = path.join(this.dataRoot, 'traits');
    this.versionRoot = path.join(this.traitsRoot, '_versions');
    this.schemaPath = options.schemaPath || DEFAULT_SCHEMA_PATH;
    const retention = options.versionRetention || {};
    this.versionRetention = {
      maxEntries:
        typeof retention.maxEntries === 'number' && retention.maxEntries > 0
          ? Math.floor(retention.maxEntries)
          : DEFAULT_VERSION_RETENTION.maxEntries,
      maxAgeDays:
        typeof retention.maxAgeDays === 'number' && retention.maxAgeDays > 0
          ? Number(retention.maxAgeDays)
          : DEFAULT_VERSION_RETENTION.maxAgeDays,
    };
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

  static #normaliseString(value) {
    if (typeof value !== 'string') {
      return null;
    }
    const trimmed = value.trim();
    return trimmed || null;
  }

  static #generateEtagFromStat(stat) {
    const sizeHex = Number(stat.size || 0).toString(16);
    const mtimeHex = Math.floor(Number(stat.mtimeMs || Date.now())).toString(16);
    return `"${sizeHex}-${mtimeHex}"`;
  }

  static #parseDateLike(value) {
    if (typeof value !== 'string' || !value) {
      return Number.NaN;
    }
    const direct = Date.parse(value);
    if (!Number.isNaN(direct)) {
      return direct;
    }
    const restored = value.replace(
      /^(\d{4}-\d{2}-\d{2})T(\d{2})-(\d{2})-(\d{2})-(\d{3})Z$/,
      '$1T$2:$3:$4.$5Z',
    );
    const reparsed = Date.parse(restored);
    if (!Number.isNaN(reparsed)) {
      return reparsed;
    }
    return Number.NaN;
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

  async #getFileState(filePath) {
    const stat = await fs.stat(filePath);
    const savedAt = stat.mtime.toISOString();
    return {
      savedAt,
      version: savedAt,
      etag: TraitRepository.#generateEtagFromStat(stat),
    };
  }

  #normaliseMetadata(rawPayload, overrides = {}) {
    const meta =
      rawPayload &&
      typeof rawPayload === 'object' &&
      rawPayload.meta &&
      typeof rawPayload.meta === 'object'
        ? rawPayload.meta
        : {};
    const author =
      TraitRepository.#normaliseString(overrides.author) ||
      TraitRepository.#normaliseString(meta.author);
    const version =
      TraitRepository.#normaliseString(overrides.version) ||
      TraitRepository.#normaliseString(meta.version);
    const etag =
      TraitRepository.#normaliseString(overrides.etag) ||
      TraitRepository.#normaliseString(meta.etag);
    return {
      author: author || null,
      version: version || null,
      etag: etag || null,
    };
  }

  async #ensureVersionDirectory(traitId) {
    const directory = path.join(this.versionRoot, traitId);
    await fs.mkdir(directory, { recursive: true });
    return directory;
  }

  async #loadVersionManifest(traitId) {
    const manifestPath = path.join(this.versionRoot, traitId, 'manifest.json');
    const loaded = await this.#readJsonFile(manifestPath, null);
    let entries = Array.isArray(loaded?.entries) ? loaded.entries.filter(Boolean) : [];
    const directory = path.join(this.versionRoot, traitId);
    let directoryEntries = [];
    try {
      directoryEntries = await fs.readdir(directory, { withFileTypes: true });
    } catch (error) {
      if (!error || error.code !== 'ENOENT') {
        throw error;
      }
      return { entries: [] };
    }
    const knownIds = new Set(entries.map((entry) => entry.id));
    for (const entry of directoryEntries) {
      if (!entry.isFile()) {
        continue;
      }
      if (!entry.name.endsWith('.json')) {
        continue;
      }
      if (entry.name === 'manifest.json') {
        continue;
      }
      const id = entry.name.replace(/\.json$/i, '');
      if (knownIds.has(id)) {
        continue;
      }
      entries.push({
        id,
        createdAt: null,
        author: null,
        version: null,
        etag: null,
        path: path.relative(this.dataRoot, path.join(directory, entry.name)),
      });
    }
    return { entries };
  }

  async #saveVersionManifest(traitId, manifest) {
    const manifestPath = path.join(this.versionRoot, traitId, 'manifest.json');
    await this.#writeJsonFile(manifestPath, {
      entries: Array.isArray(manifest.entries) ? manifest.entries : [],
    });
  }

  async #applyRetention(traitId, entries) {
    const now = Date.now();
    const retention = this.versionRetention || {};
    let filtered = entries.slice();
    let removed = [];
    if (retention.maxAgeDays && retention.maxAgeDays > 0) {
      const maxAgeMs = Number(retention.maxAgeDays) * 24 * 60 * 60 * 1000;
      const { keep, drop } = filtered.reduce(
        (acc, entry) => {
          const createdAtValue = TraitRepository.#parseDateLike(entry.createdAt || entry.id || '');
          if (Number.isNaN(createdAtValue) || now - createdAtValue <= maxAgeMs) {
            acc.keep.push(entry);
          } else {
            acc.drop.push(entry);
          }
          return acc;
        },
        { keep: [], drop: [] },
      );
      filtered = keep;
      removed = removed.concat(drop);
    }
    if (
      retention.maxEntries &&
      retention.maxEntries > 0 &&
      filtered.length > retention.maxEntries
    ) {
      const sorted = filtered.slice().sort((a, b) => {
        const dateA = TraitRepository.#parseDateLike(a.createdAt || a.id || '');
        const dateB = TraitRepository.#parseDateLike(b.createdAt || b.id || '');
        if (Number.isNaN(dateA) && Number.isNaN(dateB)) {
          return 0;
        }
        if (Number.isNaN(dateA)) {
          return 1;
        }
        if (Number.isNaN(dateB)) {
          return -1;
        }
        return dateB - dateA;
      });
      const keep = sorted.slice(0, retention.maxEntries);
      const drop = sorted.slice(retention.maxEntries);
      const keepIds = new Set(keep.map((entry) => entry.id));
      filtered = filtered.filter((entry) => keepIds.has(entry.id));
      removed = removed.concat(drop);
    }
    if (removed.length > 0) {
      await Promise.all(
        removed.map(async (entry) => {
          if (!entry || !entry.path) {
            return;
          }
          const absolute = path.join(this.dataRoot, entry.path);
          try {
            await fs.unlink(absolute);
          } catch (error) {
            if (!error || error.code !== 'ENOENT') {
              throw error;
            }
          }
        }),
      );
      // Remove directories that may now be empty
      const versionDir = path.join(this.versionRoot, traitId);
      try {
        const remaining = await fs.readdir(versionDir);
        if (remaining.length === 0) {
          await fs.rmdir(versionDir);
        }
      } catch (error) {
        if (!error || (error.code !== 'ENOENT' && error.code !== 'ENOTEMPTY')) {
          throw error;
        }
      }
    }
    return filtered;
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
    const fileState = await this.#getFileState(resolved.filePath);
    return {
      trait,
      meta: {
        id: trait.id || normalisedId,
        path: path.relative(this.dataRoot, resolved.filePath),
        category: resolved.category,
        isDraft: resolved.isDraft,
        savedAt: fileState.savedAt,
        version: fileState.version,
        etag: fileState.etag,
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

  async #snapshotVersion(traitId, existing, context = {}) {
    if (!existing) {
      return null;
    }
    const isoTimestamp = new Date().toISOString();
    const safeTimestamp = isoTimestamp.replace(/[:.]/g, '-');
    const versionDirectory = await this.#ensureVersionDirectory(traitId);
    const fileName = `${safeTimestamp}.json`;
    const versionPath = path.join(versionDirectory, fileName);
    await this.#writeJsonFile(versionPath, existing);
    const manifest = await this.#loadVersionManifest(traitId);
    const entry = {
      id: fileName.replace(/\.json$/i, ''),
      createdAt: isoTimestamp,
      author: context.author || null,
      version: context.version || null,
      etag: context.etag || null,
      path: path.relative(this.dataRoot, versionPath),
      category: context.category || null,
      sourcePath: context.sourcePath || null,
    };
    const filtered = manifest.entries.filter((item) => item && item.id !== entry.id);
    const withCurrent = [entry, ...filtered];
    const retained = await this.#applyRetention(traitId, withCurrent);
    const sorted = retained.slice().sort((a, b) => {
      const dateA = TraitRepository.#parseDateLike(a.createdAt || a.id || '');
      const dateB = TraitRepository.#parseDateLike(b.createdAt || b.id || '');
      if (Number.isNaN(dateA) && Number.isNaN(dateB)) {
        return 0;
      }
      if (Number.isNaN(dateA)) {
        return 1;
      }
      if (Number.isNaN(dateB)) {
        return -1;
      }
      return dateB - dateA;
    });
    await this.#saveVersionManifest(traitId, { entries: sorted });
    return entry;
  }

  async #updateIndexEntry(trait, { remove = false } = {}) {
    const indexPath = path.join(this.traitsRoot, 'index.json');
    const indexData = (await this.#readJsonFile(indexPath, null)) || {
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
    const metadata = this.#normaliseMetadata(rawPayload, { author: options.author });
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
    const state = await this.#getFileState(filePath);
    return {
      trait: validated,
      meta: {
        id: traitId,
        path: path.relative(this.dataRoot, filePath),
        category: draft ? '_drafts' : category,
        savedAt: state.savedAt,
        version: state.version,
        etag: state.etag,
        created: true,
        isDraft: draft,
        ...(metadata.author ? { savedBy: metadata.author } : {}),
      },
    };
  }

  async updateTrait(traitId, rawPayload, options = {}) {
    const normalisedId = TraitRepository.normaliseTraitId(traitId);
    const resolved = await this.resolveTraitPath(normalisedId);
    if (!resolved) {
      throw TraitRepository.createHttpError(404, 'Trait non trovato');
    }
    const metadata = this.#normaliseMetadata(rawPayload, {
      author: options.author,
      version: options.expectedVersion,
      etag: options.expectedEtag,
    });
    if (!metadata.version && !metadata.etag) {
      throw TraitRepository.createHttpError(
        428,
        'Versione o ETag richiesto per aggiornare il trait',
      );
    }
    const payload = this.#stripMetaFields(rawPayload);
    payload.id = normalisedId;
    const validated = await this.#validateTraitPayload(payload, { traitId: normalisedId });
    const existing = await this.#readJsonFile(resolved.filePath, null);
    const currentState = await this.#getFileState(resolved.filePath);
    if (metadata.version && metadata.version !== currentState.version) {
      throw TraitRepository.createHttpError(
        412,
        'Versione del trait non aggiornata: ricaricare prima di salvare',
      );
    }
    if (metadata.etag && metadata.etag !== currentState.etag) {
      throw TraitRepository.createHttpError(
        412,
        'ETag del trait non aggiornato: ricaricare prima di salvare',
      );
    }
    if (existing) {
      await this.#snapshotVersion(normalisedId, existing, {
        author: metadata.author,
        version: currentState.version,
        etag: currentState.etag,
        category: resolved.category,
        sourcePath: path.relative(this.dataRoot, resolved.filePath),
      });
    }
    await this.#writeJsonFile(resolved.filePath, validated);
    if (!resolved.isDraft) {
      await this.#updateIndexEntry(validated, { remove: false });
    }
    const newState = await this.#getFileState(resolved.filePath);
    return {
      trait: validated,
      meta: {
        id: normalisedId,
        path: path.relative(this.dataRoot, resolved.filePath),
        category: resolved.category,
        savedAt: newState.savedAt,
        version: newState.version,
        etag: newState.etag,
        versioned: Boolean(existing),
        isDraft: resolved.isDraft,
        ...(metadata.author ? { savedBy: metadata.author } : {}),
        ...(options.restoreFrom ? { restoredFrom: options.restoreFrom } : {}),
      },
    };
  }

  async cloneTrait(sourceId, options = {}) {
    const { trait: sourceTrait, meta } = await this.getTrait(sourceId);
    const overrides =
      options.overrides && typeof options.overrides === 'object' ? options.overrides : {};
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
      author: options.author,
    });
    created.meta.clonedFrom = meta.id;
    return created;
  }

  async listTraitVersions(traitId) {
    const normalisedId = TraitRepository.normaliseTraitId(traitId);
    const manifest = await this.#loadVersionManifest(normalisedId);
    const entries = manifest.entries.slice().sort((a, b) => {
      const dateA = TraitRepository.#parseDateLike(a.createdAt || a.id || '');
      const dateB = TraitRepository.#parseDateLike(b.createdAt || b.id || '');
      if (Number.isNaN(dateA) && Number.isNaN(dateB)) {
        return 0;
      }
      if (Number.isNaN(dateA)) {
        return 1;
      }
      if (Number.isNaN(dateB)) {
        return -1;
      }
      return dateB - dateA;
    });
    return entries.map((entry) => ({
      id: entry.id,
      traitId: normalisedId,
      createdAt: entry.createdAt || null,
      author: entry.author || null,
      version: entry.version || null,
      etag: entry.etag || null,
      path:
        entry.path ||
        path.relative(this.dataRoot, path.join(this.versionRoot, normalisedId, `${entry.id}.json`)),
      category: entry.category || null,
      sourcePath: entry.sourcePath || null,
    }));
  }

  async #resolveVersionEntry(traitId, versionId) {
    const manifest = await this.#loadVersionManifest(traitId);
    const normalisedVersionId = String(versionId || '').replace(/\.json$/i, '');
    const entry = manifest.entries.find((item) => item && item.id === normalisedVersionId);
    if (!entry) {
      throw TraitRepository.createHttpError(404, 'Versione trait non trovata');
    }
    const relativePath =
      entry.path ||
      path.relative(this.dataRoot, path.join(this.versionRoot, traitId, `${entry.id}.json`));
    const absolutePath = path.join(this.dataRoot, relativePath);
    const trait = await this.#readJsonFile(absolutePath, null);
    if (!trait) {
      throw TraitRepository.createHttpError(404, 'Dati versione trait non disponibili');
    }
    return {
      entry: {
        ...entry,
        path: relativePath,
      },
      trait,
      filePath: absolutePath,
    };
  }

  async getTraitVersion(traitId, versionId) {
    const normalisedId = TraitRepository.normaliseTraitId(traitId);
    const { entry, trait } = await this.#resolveVersionEntry(normalisedId, versionId);
    return {
      trait,
      meta: {
        id: entry.id,
        traitId: normalisedId,
        createdAt: entry.createdAt || null,
        author: entry.author || null,
        version: entry.version || null,
        etag: entry.etag || null,
        path: entry.path,
        category: entry.category || null,
        sourcePath: entry.sourcePath || null,
      },
    };
  }

  async restoreTraitVersion(traitId, versionId, options = {}) {
    const normalisedId = TraitRepository.normaliseTraitId(traitId);
    const resolved = await this.resolveTraitPath(normalisedId);
    if (!resolved) {
      throw TraitRepository.createHttpError(404, 'Trait non trovato');
    }
    const { entry, trait } = await this.#resolveVersionEntry(normalisedId, versionId);
    const currentState = await this.#getFileState(resolved.filePath);
    const expectedVersion =
      TraitRepository.#normaliseString(options.expectedVersion) || currentState.version;
    const expectedEtag =
      TraitRepository.#normaliseString(options.expectedEtag) || currentState.etag;
    const author =
      TraitRepository.#normaliseString(options.author) ||
      TraitRepository.#normaliseString(entry.author) ||
      null;
    const payload = JSON.parse(JSON.stringify(trait));
    payload.meta = {
      version: expectedVersion,
      etag: expectedEtag,
      ...(author ? { author } : {}),
      restoredFrom: entry.id,
    };
    return this.updateTrait(normalisedId, payload, {
      author,
      expectedVersion,
      expectedEtag,
      restoreFrom: entry.id,
    });
  }

  async deleteTrait(traitId, options = {}) {
    const normalisedId = TraitRepository.normaliseTraitId(traitId);
    const resolved = await this.resolveTraitPath(normalisedId);
    if (!resolved) {
      throw TraitRepository.createHttpError(404, 'Trait non trovato');
    }
    const author = TraitRepository.#normaliseString(options.author) || null;
    const existing = await this.#readJsonFile(resolved.filePath, null);
    let currentState = null;
    if (existing) {
      currentState = await this.#getFileState(resolved.filePath);
      await this.#snapshotVersion(normalisedId, existing, {
        author,
        version: currentState.version,
        etag: currentState.etag,
        category: resolved.category,
        sourcePath: path.relative(this.dataRoot, resolved.filePath),
      });
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
        ...(author ? { savedBy: author } : {}),
        ...(currentState ? { version: currentState.version, etag: currentState.etag } : {}),
      },
    };
  }

  async buildIndexDocument(options = {}) {
    const indexPath = path.join(this.traitsRoot, 'index.json');
    const legacyIndex = await this.#readJsonFile(indexPath, null);
    if (!legacyIndex) {
      throw TraitRepository.createHttpError(404, 'Indice trait non disponibile');
    }

    const schemaVersion =
      typeof legacyIndex.schema_version === 'string' && legacyIndex.schema_version.trim()
        ? legacyIndex.schema_version
        : null;
    const glossaryPath =
      typeof legacyIndex.trait_glossary === 'string' && legacyIndex.trait_glossary.trim()
        ? legacyIndex.trait_glossary
        : null;
    const traits =
      legacyIndex.traits &&
      typeof legacyIndex.traits === 'object' &&
      !Array.isArray(legacyIndex.traits)
        ? legacyIndex.traits
        : {};

    const directories = await this.listTraitDirectories(true);
    const traitMeta = {};
    for (const directory of directories) {
      const directoryPath = path.join(this.traitsRoot, directory);
      let entries;
      try {
        entries = await fs.readdir(directoryPath, { withFileTypes: true });
      } catch (error) {
        if (error && error.code === 'ENOENT') {
          continue;
        }
        throw error;
      }
      for (const entry of entries) {
        if (!entry.isFile()) {
          continue;
        }
        if (!entry.name.endsWith('.json')) {
          continue;
        }
        if (
          entry.name === 'index.json' ||
          entry.name === 'index.csv' ||
          entry.name === 'species_affinity.json'
        ) {
          continue;
        }
        const traitId = entry.name.replace(/\.json$/i, '');
        const filePath = path.join(directoryPath, entry.name);
        let fileState;
        try {
          fileState = await this.#getFileState(filePath);
        } catch (error) {
          if (error && error.code === 'ENOENT') {
            continue;
          }
          throw error;
        }
        traitMeta[traitId] = {
          id: traitId,
          path: path.relative(this.dataRoot, filePath),
          category: directory === '_drafts' ? null : directory,
          isDraft: directory === '_drafts',
          updatedAt: fileState.savedAt,
          version: fileState.version,
          etag: fileState.etag,
        };
      }
    }

    const schemaRelative = path.relative(REPO_ROOT, this.schemaPath);
    const schemaPath = schemaRelative.startsWith('..') ? this.schemaPath : schemaRelative;

    const meta = {
      schema: {
        version: schemaVersion,
        path: schemaPath,
      },
      glossary: {
        path: glossaryPath,
      },
      traits: traitMeta,
    };

    const includeLegacy = options.includeLegacy !== false;
    const document = {
      traits,
      meta,
    };
    if (includeLegacy) {
      document.legacy = {
        schema_version: schemaVersion,
        trait_glossary: glossaryPath,
        traits,
      };
    }
    return document;
  }

  async getIndex(options = {}) {
    return this.buildIndexDocument(options);
  }
}

module.exports = {
  TraitRepository,
};
