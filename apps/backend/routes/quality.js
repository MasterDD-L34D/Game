'use strict';

const express = require('express');
const { applyQualitySuggestion, QualityServiceError } = require('../services/quality');

function createQualityRouter({ runtimeValidator, generationOrchestrator, schemaValidator } = {}) {
  const router = express.Router();
  if (!schemaValidator) {
    throw new Error('Schema validator richiesto per le rotte quality');
  }

  const validateSuggestionPayload = schemaValidator.createMiddleware(
    'quality://suggestions/apply/request',
  );

  router.post('/suggestions/apply', validateSuggestionPayload, async (req, res) => {
    try {
      const payload = await applyQualitySuggestion(req.body || {}, {
        runtimeValidator,
        generationOrchestrator,
      });
      res.json(payload);
    } catch (error) {
      if (error instanceof QualityServiceError || error.statusCode) {
        const status = error.statusCode || 400;
        res.status(status).json({ error: error.message });
        return;
      }
      res.status(500).json({ error: error.message || 'Errore applicazione suggerimento' });
    }
  });

  return router;
}

module.exports = {
  createQualityRouter,
};
