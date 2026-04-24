// V4 PI-Pacchetti tematici route expose.
//
// Endpoints:
//   GET  /api/forms/:formId/packs          — static form recommendation
//   POST /api/forms/:formId/recommend      — d20/d12 dynamic recommendation

'use strict';

const { Router } = require('express');
const { getFormPacks, recommendPacks } = require('../services/forms/formPackRecommender');

function createFormPackRouter() {
  const router = Router();

  router.get('/forms/:formId/packs', (req, res) => {
    const p = getFormPacks(req.params.formId);
    if (!p) return res.status(404).json({ error: 'form not found' });
    res.json(p);
  });

  router.post('/forms/:formId/recommend', (req, res) => {
    const formId = req.params.formId;
    const { job_id, d20_roll, d12_roll } = req.body || {};
    const result = recommendPacks({
      form_id: formId,
      job_id: job_id || 'any',
      d20_roll: d20_roll ?? null,
      d12_roll: d12_roll ?? null,
    });
    if (result.error) return res.status(500).json(result);
    res.json(result);
  });

  return router;
}

module.exports = { createFormPackRouter };
