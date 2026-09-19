// M12 Phase A+B — Forms routes.
//
// Phase A endpoints (stateless, caller-supplied unit):
//   GET  /api/v1/forms/registry
//   GET  /api/v1/forms/:id
//   POST /api/v1/forms/evaluate
//   POST /api/v1/forms/options
//   POST /api/v1/forms/evolve
//
// Phase B endpoints (session-scoped persistence + pack roll):
//   GET  /api/v1/forms/session/:sid               — list unit states for session
//   GET  /api/v1/forms/session/:sid/:unitId       — single unit state
//   POST /api/v1/forms/session/:sid/:unitId/seed  — init unit state
//   POST /api/v1/forms/session/:sid/:unitId/evolve — evolve + persist + deduct PE
//   POST /api/v1/forms/pack/roll                  — roll pack (optional d20 seed)
//   DELETE /api/v1/forms/session/:sid             — clear session scope

'use strict';

const { Router } = require('express');
const { FormEvolutionEngine } = require('../services/forms/formEvolution');
const { createFormSessionStore } = require('../services/forms/formSessionStore');
const { loadPacks, rollPack, seededRng } = require('../services/forms/packRoller');
const { resolveStarterBioma, listStarterBiomas } = require('../services/forms/formPackRecommender');

function createFormsRouter(opts = {}) {
  const engine = opts.engine || new FormEvolutionEngine(opts);
  const store = opts.store || createFormSessionStore({ prisma: opts.prisma || null });
  const packs = opts.packs || loadPacks();
  const router = Router();

  router.get('/registry', (_req, res) => {
    res.json(engine.snapshot());
  });

  // QW2 / M-017 — list 16 form -> starter bioma map. MUST stay before /:id.
  router.get('/starter-biomas', (_req, res) => {
    res.json({ count: 16, items: listStarterBiomas() });
  });

  // QW2 / M-017 — single form starter bioma resolution. MUST stay before /:id.
  router.get('/:formId/starter-bioma', (req, res) => {
    const resolved = resolveStarterBioma(req.params.formId);
    if (!resolved) return res.status(404).json({ error: 'form not found' });
    res.json({ form_id: req.params.formId, ...resolved });
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

  // ========================================================================
  // Phase B — session-scoped persistence routes
  // ========================================================================

  router.get('/session/:sid', (req, res) => {
    const units = store.listSession(req.params.sid);
    res.json({ session_id: req.params.sid, units });
  });

  router.get('/session/:sid/:unitId', (req, res) => {
    const state = store.getUnitState(req.params.sid, req.params.unitId);
    if (!state) return res.status(404).json({ error: 'unit_state_not_found' });
    res.json(state);
  });

  router.post('/session/:sid/:unitId/seed', (req, res) => {
    try {
      const state = store.seedUnit(req.params.sid, req.params.unitId, req.body || {});
      res.status(201).json(state);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });

  router.delete('/session/:sid', (req, res) => {
    const removed = store.clearSession(req.params.sid);
    res.json({ session_id: req.params.sid, removed });
  });

  router.post('/session/:sid/:unitId/evolve', (req, res) => {
    const sid = req.params.sid;
    const unitId = req.params.unitId;
    const {
      vc_snapshot: vcSnapshot,
      target_form_id: targetFormId,
      current_round: currentRound = 0,
      extra_pe: extraPe = 0,
      seed_pe: seedPe = null,
    } = req.body || {};
    if (!targetFormId) return res.status(400).json({ error: 'target_form_id required' });

    let state = store.getUnitState(sid, unitId);
    if (!state) {
      state = store.seedUnit(sid, unitId, {
        current_form_id: null,
        pe: Number.isFinite(seedPe) ? seedPe : 0,
      });
    }
    // Build engine-compatible unit snapshot.
    const unitSnapshot = {
      id: unitId,
      current_form_id: state.current_form_id,
      pe: state.pe,
      last_evolve_round: state.last_evolve_round,
      evolve_count: state.evolve_count,
    };
    const result = engine.evolve(unitSnapshot, vcSnapshot || {}, targetFormId, {
      currentRound: Number(currentRound) || 0,
      extraPe: Number(extraPe) || 0,
    });
    if (!result.ok) return res.status(409).json(result);
    const persisted = store.applyDelta(sid, unitId, result.delta);
    res.json({ ok: true, state: persisted, delta: result.delta, report: result.report });
  });

  // ========================================================================
  // Phase B — pack roll (data/packs.yaml)
  // ========================================================================

  router.post('/pack/roll', (req, res) => {
    const { form_id: formId = null, job_id: jobId = null, seed = null } = req.body || {};
    const rng = typeof seed === 'number' && Number.isFinite(seed) ? seededRng(seed) : Math.random;
    try {
      const result = rollPack({ packs, formId, jobId, rng });
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  router.get('/pack/costs', (_req, res) => {
    res.json({
      costs: packs.pi_shop?.costs || {},
      caps: packs.pi_shop?.caps || {},
      budget_curve: packs.pi_shop?.budget_curve || {},
    });
  });

  return router;
}

module.exports = { createFormsRouter };
