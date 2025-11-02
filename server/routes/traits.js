const express = require('express');
const fs = require('node:fs/promises');
const path = require('node:path');
const Ajv = require('ajv/dist/2020');
const { evaluateTraitStyle } = require('../services/traitStyleGuide');

const DEFAULT_SCHEMA_PATH = path.resolve(__dirname, '..', '..', 'config', 'schemas', 'trait.schema.json');

function createTraitRouter(options = {}) {
  const router = express.Router();
  const dataRoot = options.dataRoot || path.resolve(__dirname, '..', '..', 'data');
  const traitsRoot = path.resolve(dataRoot, 'traits');
  const schemaPath = options.schemaPath || DEFAULT_SCHEMA_PATH;
  const versionRoot = path.join(traitsRoot, '_versions');
  const authToken = options.token || process.env.TRAIT_EDITOR_TOKEN || process.env.TRAITS_API_TOKEN || null;
  const ajvOptions = {
    allErrors: true,
    strict: false,
    strictSchema: false,
    allowUnionTypes: true,
    validateFormats: false,
  };
  let schemaCache = null;
  let validator = null;

  async function readJsonFile(filePath, fallback = null) {
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

  async function writeJsonFile(filePath, payload) {
    const directory = path.dirname(filePath);
    await fs.mkdir(directory, { recursive: true });
    await fs.writeFile(filePath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  }

  function prepareForSchemaValidation(trait) {
    const candidate = JSON.parse(JSON.stringify(trait || {}));
    if (candidate && typeof candidate.tier === 'string') {
      const normalisedTier = candidate.tier.trim();
      if (normalisedTier) {
        candidate.tier = normalisedTier.toUpperCase();
      }
    }
    return candidate;
  }

  async function loadSchema() {
    if (schemaCache) {
      return schemaCache;
    }
    const loaded = await readJsonFile(schemaPath, null);
    if (!loaded) {
      throw new Error('Schema trait non disponibile');
    }
    schemaCache = loaded;
    return schemaCache;
  }

  async function getValidator() {
    if (validator) {
      return validator;
    }
    const schema = await loadSchema();
    const ajv = new Ajv(ajvOptions);
    validator = ajv.compile(schema);
    return validator;
  }

  async function listTraitDirectories(includeDrafts = false) {
    const entries = await fs.readdir(traitsRoot, { withFileTypes: true });
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

  async function loadTraitSummary(category, fileName) {
    const filePath = path.join(traitsRoot, category, fileName);
    const trait = await readJsonFile(filePath, null);
    if (!trait || typeof trait !== 'object') {
      return null;
    }
    const stat = await fs.stat(filePath);
    const id = trait.id || fileName.replace(/\.json$/i, '');
    return {
      id,
      label: trait.label || id,
      category,
      path: path.relative(dataRoot, filePath),
      updatedAt: stat.mtime.toISOString(),
      isDraft: category === '_drafts',
    };
  }

  async function listTraits(includeDrafts = false) {
    const directories = await listTraitDirectories(includeDrafts);
    const summaries = [];
    for (const directory of directories) {
      const directoryPath = path.join(traitsRoot, directory);
      const files = await fs.readdir(directoryPath, { withFileTypes: true });
      for (const file of files) {
        if (!file.isFile()) {
          continue;
        }
        if (!file.name.endsWith('.json')) {
          continue;
        }
        if (file.name === 'index.json' || file.name === 'index.csv' || file.name === 'species_affinity.json') {
          continue;
        }
        const summary = await loadTraitSummary(directory, file.name);
        if (summary) {
          summaries.push(summary);
        }
      }
    }
    summaries.sort((a, b) => a.label.localeCompare(b.label, 'it')); // prefer locale aware sort
    return summaries;
  }

  function normaliseTraitId(rawId) {
    const id = String(rawId || '').trim();
    if (!id) {
      throw createHttpError(400, 'Trait ID richiesto');
    }
    if (!/^[a-z0-9_]+$/.test(id)) {
      throw createHttpError(400, 'Trait ID non valido: utilizzare slug a-z0-9_');
    }
    return id;
  }

  function createHttpError(statusCode, message) {
    const error = new Error(message);
    error.statusCode = statusCode;
    return error;
  }

  async function resolveTraitPath(traitId) {
    const directories = await listTraitDirectories(true);
    for (const directory of directories) {
      const candidate = path.join(traitsRoot, directory, `${traitId}.json`);
      try {
        await fs.access(candidate);
        return { filePath: candidate, category: directory };
      } catch (error) {
        if (!error || error.code !== 'ENOENT') {
          throw error;
        }
      }
    }
    return null;
  }

  function ensureAuthorised(req, res, next) {
    if (!authToken) {
      next();
      return;
    }
    const headerToken = String(req.get('X-Trait-Editor-Token') || '').trim();
    const bearerToken = String(req.get('Authorization') || '').replace(/^Bearer\s+/i, '').trim();
    if (headerToken && headerToken === authToken) {
      next();
      return;
    }
    if (bearerToken && bearerToken === authToken) {
      next();
      return;
    }
    res.status(401).json({ error: 'Token mancante o non valido' });
  }

  router.get('/schema', async (req, res) => {
    try {
      const schema = await loadSchema();
      res.json({ schema });
    } catch (error) {
      res.status(500).json({ error: error.message || 'Errore caricamento schema trait' });
    }
  });

  router.post('/validate', ensureAuthorised, async (req, res) => {
    const body = req.body && typeof req.body === 'object' ? req.body : {};
    const payload =
      body.payload && typeof body.payload === 'object' ? body.payload : body.payload === undefined ? body : {};
    if (!payload || typeof payload !== 'object') {
      res.status(400).json({ error: 'Payload JSON richiesto' });
      return;
    }
    const traitId = body.traitId || payload.id || null;
    const candidate = JSON.parse(JSON.stringify(payload));
    if (traitId && (candidate.id === undefined || candidate.id === null)) {
      candidate.id = traitId;
    }
    const schemaPayload = prepareForSchemaValidation(candidate);
    try {
      const validate = await getValidator();
      const valid = Boolean(validate(schemaPayload));
      const errors = valid ? [] : validate.errors || [];
      const style = evaluateTraitStyle(candidate, { traitId });
      res.json({
        valid,
        errors,
        suggestions: style.suggestions,
        summary: {
          schemaErrors: errors.length,
          style: style.summary,
        },
      });
    } catch (error) {
      res.status(500).json({ error: error.message || 'Errore validazione trait' });
    }
  });

  router.get('/', ensureAuthorised, async (req, res) => {
    const includeDrafts = String(req.query.includeDrafts || req.query.include_drafts || 'false').toLowerCase();
    const shouldIncludeDrafts = includeDrafts === 'true' || includeDrafts === '1';
    try {
      const traits = await listTraits(shouldIncludeDrafts);
      res.json({ traits });
    } catch (error) {
      res.status(500).json({ error: error.message || 'Errore caricamento lista trait' });
    }
  });

  router.get('/:traitId', ensureAuthorised, async (req, res) => {
    let traitId;
    try {
      traitId = normaliseTraitId(req.params.traitId);
    } catch (error) {
      res.status(error.statusCode || 400).json({ error: error.message || 'ID trait non valido' });
      return;
    }
    try {
      const resolved = await resolveTraitPath(traitId);
      if (!resolved) {
        res.status(404).json({ error: 'Trait non trovato' });
        return;
      }
      const trait = await readJsonFile(resolved.filePath, null);
      if (!trait) {
        res.status(404).json({ error: 'Trait non trovato' });
        return;
      }
      res.json({
        trait,
        meta: {
          path: path.relative(dataRoot, resolved.filePath),
          category: resolved.category,
        },
      });
    } catch (error) {
      res.status(500).json({ error: error.message || 'Errore caricamento trait' });
    }
  });

  router.put('/:traitId', ensureAuthorised, async (req, res) => {
    let traitId;
    try {
      traitId = normaliseTraitId(req.params.traitId);
    } catch (error) {
      res.status(error.statusCode || 400).json({ error: error.message || 'ID trait non valido' });
      return;
    }
    const payload = req.body || {};
    if (!payload || typeof payload !== 'object') {
      res.status(400).json({ error: 'Payload JSON richiesto' });
      return;
    }
    payload.id = traitId;
    const schemaPayload = prepareForSchemaValidation(payload);
    try {
      const validate = await getValidator();
      const valid = validate(schemaPayload);
      if (!valid) {
        res.status(400).json({ error: 'Validazione fallita', details: validate.errors || [] });
        return;
      }
      const resolved = await resolveTraitPath(traitId);
      if (!resolved) {
        res.status(404).json({ error: 'Trait non trovato' });
        return;
      }
      const existing = await readJsonFile(resolved.filePath, null);
      if (existing) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const versionPath = path.join(versionRoot, traitId, `${timestamp}.json`);
        await writeJsonFile(versionPath, existing);
      }
      await writeJsonFile(resolved.filePath, schemaPayload);
      const stat = await fs.stat(resolved.filePath);
      res.json({
        trait: schemaPayload,
        meta: {
          path: path.relative(dataRoot, resolved.filePath),
          category: resolved.category,
          savedAt: stat.mtime.toISOString(),
          versioned: Boolean(existing),
        },
      });
    } catch (error) {
      res.status(500).json({ error: error.message || 'Errore salvataggio trait' });
    }
  });

  return router;
}

module.exports = {
  createTraitRouter,
};
