const express = require('express');
const path = require('node:path');
const { evaluateTraitStyle } = require('../services/traitStyleGuide');
const { TraitRepository } = require('../services/traitRepository');

function createTraitRouter(options = {}) {
  const router = express.Router();
  const dataRoot = options.dataRoot || path.resolve(__dirname, '..', '..', 'data');
  const repository = new TraitRepository({
    dataRoot,
    schemaPath: options.schemaPath,
  });
  const authToken =
    options.token || process.env.TRAIT_EDITOR_TOKEN || process.env.TRAITS_API_TOKEN || null;

  function isAutoApplicableFix(fix) {
    if (!fix || typeof fix !== 'object') {
      return false;
    }
    if (typeof fix.autoApplicable === 'boolean') {
      return Boolean(fix.autoApplicable);
    }
    const type = fix.type || 'set';
    if (type === 'remove') {
      return true;
    }
    if (
      (type === 'set' || type === 'append') &&
      Object.prototype.hasOwnProperty.call(fix, 'value')
    ) {
      return true;
    }
    return false;
  }

  function handleError(res, error, fallbackMessage) {
    if (error && error.statusCode) {
      const payload = { error: error.message || fallbackMessage };
      if (error.details) {
        payload.details = error.details;
      }
      res.status(error.statusCode).json(payload);
      return;
    }
    res.status(500).json({ error: error?.message || fallbackMessage });
  }

  function ensureAuthorised(req, res, next) {
    if (!authToken) {
      next();
      return;
    }
    const headerToken = String(req.get('X-Trait-Editor-Token') || '').trim();
    const bearerToken = String(req.get('Authorization') || '')
      .replace(/^Bearer\s+/i, '')
      .trim();
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

  function parseBoolean(input) {
    if (typeof input === 'string') {
      const normalised = input.trim().toLowerCase();
      if (normalised === 'true' || normalised === '1') {
        return true;
      }
      if (normalised === 'false' || normalised === '0' || normalised === '') {
        return false;
      }
    }
    return Boolean(input);
  }

  router.get('/schema', async (req, res) => {
    try {
      const schema = await repository.loadSchema();
      res.json({ schema });
    } catch (error) {
      handleError(res, error, 'Errore caricamento schema trait');
    }
  });

  router.post('/validate', ensureAuthorised, async (req, res) => {
    const body = req.body && typeof req.body === 'object' ? req.body : {};
    const payload =
      body.payload && typeof body.payload === 'object'
        ? body.payload
        : body.payload === undefined
          ? body
          : {};
    if (!payload || typeof payload !== 'object') {
      res.status(400).json({ error: 'Payload JSON richiesto' });
      return;
    }
    const traitId = body.traitId || payload.id || null;
    const candidate = JSON.parse(JSON.stringify(payload));
    if (traitId && (candidate.id === undefined || candidate.id === null)) {
      candidate.id = traitId;
    }
    try {
      const schemaPayload = repository.prepareForValidation(candidate, traitId);
      const validate = await repository.getValidator();
      const valid = Boolean(validate(schemaPayload));
      const errors = valid ? [] : validate.errors || [];
      const style = evaluateTraitStyle(candidate, { traitId });
      const rawSuggestions = Array.isArray(style.suggestions) ? style.suggestions : [];
      const suggestions = rawSuggestions.map((entry) => {
        if (!entry || typeof entry !== 'object') {
          return entry;
        }
        const fix = entry.fix && typeof entry.fix === 'object' ? entry.fix : null;
        if (!fix) {
          return entry;
        }
        const autoApplicable = isAutoApplicableFix(fix);
        if (fix.autoApplicable === autoApplicable) {
          return entry;
        }
        return {
          ...entry,
          fix: { ...fix, autoApplicable },
        };
      });
      const corrections = suggestions
        .filter(
          (item) => item && typeof item === 'object' && item.fix && typeof item.fix === 'object',
        )
        .map((item) => {
          const fix = item.fix;
          const hasValue = Object.prototype.hasOwnProperty.call(fix, 'value');
          const correction = {
            path: item.path || '',
            message: item.message,
            action: fix.type || (hasValue ? 'set' : 'note'),
            severity: item.severity || 'warning',
            autoApplicable: isAutoApplicableFix(fix),
          };
          if (hasValue) {
            correction.value = fix.value;
          }
          if (typeof fix.note === 'string' && fix.note.trim()) {
            correction.note = fix.note;
          }
          return correction;
        });
      const styleSummary =
        style && style.summary && typeof style.summary === 'object' ? { ...style.summary } : {};
      styleSummary.corrections = {
        total: corrections.length,
        actionable: corrections.filter((item) => item.autoApplicable).length,
      };
      res.json({
        valid,
        errors,
        suggestions,
        corrections,
        summary: {
          schemaErrors: errors.length,
          style: styleSummary,
        },
      });
    } catch (error) {
      handleError(res, error, 'Errore validazione trait');
    }
  });

  router.get('/', ensureAuthorised, async (req, res) => {
    const includeDrafts = String(
      req.query.includeDrafts || req.query.include_drafts || 'false',
    ).toLowerCase();
    const shouldIncludeDrafts = includeDrafts === 'true' || includeDrafts === '1';
    try {
      const traits = await repository.listTraits(shouldIncludeDrafts);
      res.json({ traits });
    } catch (error) {
      handleError(res, error, 'Errore caricamento lista trait');
    }
  });

  router.get('/index', ensureAuthorised, async (req, res) => {
    try {
      const index = await repository.getIndex();
      res.json({ index });
    } catch (error) {
      handleError(res, error, 'Errore caricamento indice trait');
    }
  });

  router.post('/', ensureAuthorised, async (req, res) => {
    const body = req.body && typeof req.body === 'object' ? req.body : {};
    const traitPayload =
      body.trait && typeof body.trait === 'object'
        ? body.trait
        : Object.keys(body).length > 0
          ? { ...body }
          : {};
    if (!traitPayload || typeof traitPayload !== 'object' || Object.keys(traitPayload).length === 0) {
      res.status(400).json({ error: 'Payload trait richiesto' });
      return;
    }
    try {
      const created = await repository.createTrait(traitPayload, {
        category: body.category || body.targetCategory || null,
        draft: parseBoolean(body.draft) || parseBoolean(body.isDraft),
        traitId: body.traitId || body.slug || body.id || null,
      });
      res.status(201).json(created);
    } catch (error) {
      handleError(res, error, 'Errore creazione trait');
    }
  });

  router.post('/clone', ensureAuthorised, async (req, res) => {
    const body = req.body && typeof req.body === 'object' ? req.body : {};
    const sourceId = String(body.sourceId || body.source || '').trim();
    if (!sourceId) {
      res.status(400).json({ error: 'sourceId richiesto per la clonazione' });
      return;
    }
    const overrides = body.overrides && typeof body.overrides === 'object' ? body.overrides : {};
    try {
      const cloned = await repository.cloneTrait(sourceId, {
        overrides,
        category: body.category || body.targetCategory || overrides.category || null,
        draft: parseBoolean(body.draft),
        traitId: body.traitId || body.slug || overrides.traitId || overrides.slug || null,
      });
      res.status(201).json(cloned);
    } catch (error) {
      handleError(res, error, 'Errore clonazione trait');
    }
  });

  router.get('/:traitId', ensureAuthorised, async (req, res) => {
    try {
      const result = await repository.getTrait(req.params.traitId);
      res.json(result);
    } catch (error) {
      handleError(res, error, 'Errore caricamento trait');
    }
  });

  router.put('/:traitId', ensureAuthorised, async (req, res) => {
    const payload = req.body || {};
    if (!payload || typeof payload !== 'object') {
      res.status(400).json({ error: 'Payload JSON richiesto' });
      return;
    }
    try {
      const updated = await repository.updateTrait(req.params.traitId, payload);
      res.json(updated);
    } catch (error) {
      handleError(res, error, 'Errore salvataggio trait');
    }
  });

  router.delete('/:traitId', ensureAuthorised, async (req, res) => {
    try {
      const deleted = await repository.deleteTrait(req.params.traitId);
      res.json(deleted);
    } catch (error) {
      handleError(res, error, 'Errore eliminazione trait');
    }
  });

  return router;
}

module.exports = {
  createTraitRouter,
};
