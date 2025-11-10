const express = require('express');
const path = require('node:path');
const { evaluateTraitStyle } = require('../services/traitStyleGuide');
const { TraitRepository } = require('../services/traitRepository');
const { createAuthHandlers } = require('../middleware/auth');

function createTraitRouter(options = {}) {
  const router = express.Router();
  const dataRoot = options.dataRoot || path.resolve(__dirname, '..', '..', 'data');
  const repository =
    options.repository ||
    new TraitRepository({
      dataRoot,
      schemaPath: options.schemaPath,
    });

  const authConfig = {
    token: options.token,
    ...(options.auth || {}),
  };
  if (options.audit) {
    authConfig.audit = options.audit;
  }
  const authHandlers = createAuthHandlers(authConfig);
  const authenticate = authHandlers.authenticate;
  const requireRoles = authHandlers.requireRoles;
  const auditTrail = authHandlers.auditTrail;

  const readAccess = [authenticate, requireRoles(['reviewer', 'editor', 'admin'])];
  const validateAccess = [authenticate, requireRoles(['reviewer', 'editor', 'admin'])];
  const editAccess = [authenticate, requireRoles(['editor', 'admin'])];
  const adminAccess = [authenticate, requireRoles(['admin'])];

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

  function normaliseString(value) {
    if (typeof value !== 'string') {
      return null;
    }
    const trimmed = value.trim();
    return trimmed || null;
  }

  function extractMeta(payload) {
    if (!payload || typeof payload !== 'object') {
      return {};
    }
    const meta = payload.meta && typeof payload.meta === 'object' ? payload.meta : {};
    return meta;
  }

  function resolveAuthor(req, payload) {
    const meta = extractMeta(payload);
    return (
      normaliseString(req.get('X-Trait-Author')) ||
      normaliseString(payload?.author) ||
      normaliseString(meta.author) ||
      null
    );
  }

  function resolveExpectedVersion(req, payload) {
    const meta = extractMeta(payload);
    return (
      normaliseString(meta.version) ||
      normaliseString(payload?.expectedVersion) ||
      normaliseString(req.get('X-Trait-Version')) ||
      null
    );
  }

  function resolveExpectedEtag(req, payload) {
    const meta = extractMeta(payload);
    const metaEtag = normaliseString(meta.etag) || normaliseString(payload?.expectedEtag);
    const header = normaliseString(req.get('If-Match'));
    if (metaEtag) {
      return metaEtag;
    }
    if (!header || header === '*') {
      return null;
    }
    return header.replace(/^W\//i, '');
  }

  router.get('/schema', async (req, res) => {
    try {
      const schema = await repository.loadSchema();
      res.json({ schema });
    } catch (error) {
      handleError(res, error, 'Errore caricamento schema trait');
    }
  });

  router.post('/validate', ...validateAccess, async (req, res) => {
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

  router.get('/', ...readAccess, async (req, res) => {
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

  router.get('/index', ...readAccess, async (req, res) => {
    try {
      const document = await repository.getIndex({ includeLegacy: true });
      const response = {
        traits: document.traits,
        meta: document.meta,
      };
      if (document.legacy) {
        response.legacy = document.legacy;
        response.index = document.legacy;
      }
      res.json(response);
    } catch (error) {
      handleError(res, error, 'Errore caricamento indice trait');
    }
  });

  router.post('/', ...editAccess, async (req, res) => {
    const body = req.body && typeof req.body === 'object' ? req.body : {};
    const traitPayload =
      body.trait && typeof body.trait === 'object'
        ? body.trait
        : Object.keys(body).length > 0
          ? { ...body }
          : {};
    if (
      !traitPayload ||
      typeof traitPayload !== 'object' ||
      Object.keys(traitPayload).length === 0
    ) {
      res.status(400).json({ error: 'Payload trait richiesto' });
      return;
    }
    try {
      const author = resolveAuthor(req, traitPayload);
      const created = await repository.createTrait(traitPayload, {
        category: body.category || body.targetCategory || null,
        draft: parseBoolean(body.draft) || parseBoolean(body.isDraft),
        traitId: body.traitId || body.slug || body.id || null,
        author,
      });
      if (created?.meta?.etag) {
        res.set('ETag', created.meta.etag);
      }
      res.status(201).json(created);
      await auditTrail(req, 'trait.create', {
        traitId: created?.meta?.id || null,
        category: created?.meta?.category || null,
        draft: Boolean(created?.meta?.isDraft),
      });
    } catch (error) {
      handleError(res, error, 'Errore creazione trait');
    }
  });

  router.post('/clone', ...editAccess, async (req, res) => {
    const body = req.body && typeof req.body === 'object' ? req.body : {};
    const sourceId = String(body.sourceId || body.source || '').trim();
    if (!sourceId) {
      res.status(400).json({ error: 'sourceId richiesto per la clonazione' });
      return;
    }
    const overrides = body.overrides && typeof body.overrides === 'object' ? body.overrides : {};
    try {
      const author = resolveAuthor(req, body);
      const cloned = await repository.cloneTrait(sourceId, {
        overrides,
        category: body.category || body.targetCategory || overrides.category || null,
        draft: parseBoolean(body.draft),
        traitId: body.traitId || body.slug || overrides.traitId || overrides.slug || null,
        author,
      });
      if (cloned?.meta?.etag) {
        res.set('ETag', cloned.meta.etag);
      }
      res.status(201).json(cloned);
      await auditTrail(req, 'trait.clone', {
        sourceId,
        traitId: cloned?.meta?.id || null,
        category: cloned?.meta?.category || null,
        draft: Boolean(cloned?.meta?.isDraft),
      });
    } catch (error) {
      handleError(res, error, 'Errore clonazione trait');
    }
  });

  router.get('/:traitId/versions', ...readAccess, async (req, res) => {
    try {
      const versions = await repository.listTraitVersions(req.params.traitId);
      res.json({ versions });
    } catch (error) {
      handleError(res, error, 'Errore caricamento versioni trait');
    }
  });

  router.get('/:traitId/versions/:versionId', ...readAccess, async (req, res) => {
    try {
      const version = await repository.getTraitVersion(req.params.traitId, req.params.versionId);
      if (version?.meta?.etag) {
        res.set('ETag', version.meta.etag);
      }
      res.json(version);
    } catch (error) {
      handleError(res, error, 'Errore caricamento versione trait');
    }
  });

  router.post('/:traitId/versions/:versionId/restore', ...editAccess, async (req, res) => {
    const body = req.body && typeof req.body === 'object' ? req.body : {};
    try {
      const author = resolveAuthor(req, body);
      const expectedVersion = resolveExpectedVersion(req, body);
      const expectedEtag = resolveExpectedEtag(req, body);
      const restored = await repository.restoreTraitVersion(
        req.params.traitId,
        req.params.versionId,
        {
          author,
          expectedVersion,
          expectedEtag,
        },
      );
      if (restored?.meta?.etag) {
        res.set('ETag', restored.meta.etag);
      }
      res.json(restored);
      await auditTrail(req, 'trait.restore', {
        traitId: req.params.traitId,
        versionId: req.params.versionId,
      });
    } catch (error) {
      handleError(res, error, 'Errore ripristino versione trait');
    }
  });

  router.get('/:traitId', ...readAccess, async (req, res) => {
    try {
      const result = await repository.getTrait(req.params.traitId);
      if (result?.meta?.etag) {
        res.set('ETag', result.meta.etag);
      }
      res.json(result);
    } catch (error) {
      handleError(res, error, 'Errore caricamento trait');
    }
  });

  router.put('/:traitId', ...editAccess, async (req, res) => {
    const payload = req.body || {};
    if (!payload || typeof payload !== 'object') {
      res.status(400).json({ error: 'Payload JSON richiesto' });
      return;
    }
    try {
      const author = resolveAuthor(req, payload);
      const expectedVersion = resolveExpectedVersion(req, payload);
      const expectedEtag = resolveExpectedEtag(req, payload);
      const updated = await repository.updateTrait(req.params.traitId, payload, {
        author,
        expectedVersion,
        expectedEtag,
      });
      if (updated?.meta?.etag) {
        res.set('ETag', updated.meta.etag);
      }
      res.json(updated);
      await auditTrail(req, 'trait.update', {
        traitId: req.params.traitId,
        version: updated?.meta?.version || null,
        draft: Boolean(updated?.meta?.isDraft),
      });
    } catch (error) {
      handleError(res, error, 'Errore salvataggio trait');
    }
  });

  router.delete('/:traitId', ...adminAccess, async (req, res) => {
    try {
      const author = resolveAuthor(req, null);
      const deleted = await repository.deleteTrait(req.params.traitId, { author });
      res.json(deleted);
      await auditTrail(req, 'trait.delete', {
        traitId: req.params.traitId,
      });
    } catch (error) {
      handleError(res, error, 'Errore eliminazione trait');
    }
  });

  return router;
}

module.exports = {
  createTraitRouter,
};
