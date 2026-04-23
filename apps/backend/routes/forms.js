// M12 Phase A — Forms routes.
//
// Endpoints:
//   GET  /api/v1/forms/registry           — list all 16 MBTI forms + metadata
//   GET  /api/v1/forms/:id                — single form detail
//   POST /api/v1/forms/evaluate           — eligibility for a target form
//   POST /api/v1/forms/options            — scored list of all forms for a unit
//   POST /api/v1/forms/evolve             — execute transition (mutates unit state)
//
// NOTE: routes operate on a caller-supplied unit snapshot. Persistence is
// deferred to M12.B (integration with meta progression / session store).

'use strict';

const { Router } = require('express');
const { FormEvolutionEngine } = require('../services/forms/formEvolution');

function createFormsRouter(opts = {}) {
  const engine = opts.engine || new FormEvolutionEngine(opts);
  const router = Router();

  router.get('/registry', (_req, res) => {
    res.json(engine.snapshot());
  });

  router.get('/:id', (req, res) => {
    const form = engine.getForm(req.params.id);
    if (!form) return res.status(404).json({ error: 'form_not_found' });
    res.json(form);
  });

  router.post('/evaluate', (req, res) => {
    const {
      unit,
      vc_snapshot: vcSnapshot,
      target_form_id: targetFormId,
      current_round: currentRound = 0,
      extra_pe: extraPe = 0,
    } = req.body || {};
    if (!unit || typeof unit !== 'object') {
      return res.status(400).json({ error: 'unit (object) required' });
    }
    if (!targetFormId || typeof targetFormId !== 'string') {
      return res.status(400).json({ error: 'target_form_id (string) required' });
    }
    const report = engine.evaluate(unit, vcSnapshot || {}, targetFormId, {
      currentRound: Number(currentRound) || 0,
      extraPe: Number(extraPe) || 0,
    });
    res.json(report);
  });

  router.post('/options', (req, res) => {
    const {
      unit,
      vc_snapshot: vcSnapshot,
      current_round: currentRound = 0,
      extra_pe: extraPe = 0,
    } = req.body || {};
    if (!unit || typeof unit !== 'object') {
      return res.status(400).json({ error: 'unit (object) required' });
    }
    const scored = engine.evaluateAll(unit, vcSnapshot || {}, {
      currentRound: Number(currentRound) || 0,
      extraPe: Number(extraPe) || 0,
    });
    res.json({ unit_id: unit.id || null, options: scored });
  });

  router.post('/evolve', (req, res) => {
    const {
      unit,
      vc_snapshot: vcSnapshot,
      target_form_id: targetFormId,
      current_round: currentRound = 0,
      extra_pe: extraPe = 0,
    } = req.body || {};
    if (!unit || typeof unit !== 'object') {
      return res.status(400).json({ error: 'unit (object) required' });
    }
    if (!targetFormId || typeof targetFormId !== 'string') {
      return res.status(400).json({ error: 'target_form_id (string) required' });
    }
    // Clone so caller's object isn't mutated when the route is tested as a
    // pure function via supertest without a persistence layer.
    const unitCopy = { ...unit };
    const result = engine.evolve(unitCopy, vcSnapshot || {}, targetFormId, {
      currentRound: Number(currentRound) || 0,
      extraPe: Number(extraPe) || 0,
    });
    if (!result.ok) {
      return res.status(409).json(result);
    }
    res.json(result);
  });

  return router;
}

module.exports = { createFormsRouter };
