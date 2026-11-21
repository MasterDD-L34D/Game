// M13 P3 — Progression routes.
// ADR-2026-04-24-p3-character-progression (pending).
//
// Endpoints (scoped by optional campaign_id query param):
//   GET  /api/v1/progression/registry                 — snapshot (xp thresholds + jobs)
//   GET  /api/v1/progression/jobs/:jobId/perks        — perk tree for job
//   GET  /api/v1/progression/:unitId?campaign_id=X    — unit state
//   POST /api/v1/progression/:unitId/seed             — seed { job, xp_total? }
//   POST /api/v1/progression/:unitId/xp               — grant xp { amount }
//   POST /api/v1/progression/:unitId/pick             — pick perk { level, choice: 'a'|'b' }
//   GET  /api/v1/progression/:unitId/effective        — derived stats + passives + ability mods
//   DELETE /api/v1/progression/campaign/:campaignId   — clear scope

'use strict';

const { Router } = require('express');
const { ProgressionEngine } = require('../services/progression/progressionEngine');
const { createProgressionStore } = require('../services/progression/progressionStore');

function createProgressionRouter(opts = {}) {
  const engine = opts.engine || new ProgressionEngine(opts);
  const store = opts.store || createProgressionStore({ prisma: opts.prisma || null });
  const router = Router();

  router.get('/registry', (_req, res) => {
    res.json(engine.snapshot());
  });

  router.get('/jobs/:jobId/perks', (req, res) => {
    const jobId = req.params.jobId;
    const jobPerks = engine.perks?.jobs?.[jobId];
    if (!jobPerks) return res.status(404).json({ error: 'job_not_found' });
    res.json({ job_id: jobId, perks: jobPerks.perks || {} });
  });

  router.get('/:unitId', (req, res) => {
    const campaignId = req.query.campaign_id || null;
    const state = store.get(campaignId, req.params.unitId);
    if (!state) return res.status(404).json({ error: 'unit_progression_not_found' });
    res.json(state);
  });

  router.post('/:unitId/seed', (req, res) => {
    const { job, xp_total: xpTotal = 0, campaign_id: campaignId = null } = req.body || {};
    if (!job) return res.status(400).json({ error: 'job required' });
    if (!engine.perks?.jobs?.[job]) {
      return res.status(400).json({ error: `unknown job "${job}"` });
    }
    const seeded = engine.seed(req.params.unitId, job, { xpTotal: Number(xpTotal) || 0 });
    const persisted = store.set(campaignId, req.params.unitId, seeded);
    res.status(201).json(persisted);
  });

  router.post('/:unitId/xp', (req, res) => {
    const { amount, campaign_id: campaignId = null } = req.body || {};
    if (!Number.isFinite(Number(amount))) {
      return res.status(400).json({ error: 'amount (number) required' });
    }
    const unit = store.get(campaignId, req.params.unitId);
    if (!unit) return res.status(404).json({ error: 'unit_progression_not_found' });
    const result = engine.applyXp(unit, Number(amount));
    const persisted = store.set(campaignId, req.params.unitId, result.unit);
    res.json({
      ok: true,
      state: persisted,
      delta: {
        xp_granted: result.xp_granted,
        xp_before: result.xp_before,
        xp_after: result.xp_after,
        level_before: result.level_before,
        level_after: result.level_after,
        leveled_up: result.leveled_up,
      },
      pending_level_ups: engine.pendingLevelUps(persisted),
    });
  });

  router.post('/:unitId/pick', (req, res) => {
    const { level, choice, campaign_id: campaignId = null, available_pi } = req.body || {};
    if (!Number.isFinite(Number(level))) {
      return res.status(400).json({ error: 'level (number) required' });
    }
    if (!['a', 'b', 'hybrid'].includes(choice)) {
      return res.status(400).json({ error: "choice must be 'a', 'b', or 'hybrid'" });
    }
    const unit = store.get(campaignId, req.params.unitId);
    if (!unit) return res.status(404).json({ error: 'unit_progression_not_found' });
    try {
      // Skiv #6: hybrid path needs available_pi; engine throws on insufficient.
      const result = engine.pickPerk(unit, Number(level), choice, { available_pi });
      const persisted = store.set(campaignId, req.params.unitId, result.unit);
      res.json({
        ok: true,
        state: persisted,
        picked_perk: result.picked_perk,
        pick: result.pick,
        pi_cost: result.pi_cost ?? null,
      });
    } catch (err) {
      const status = String(err.message || '').startsWith('insufficient_pi') ? 402 : 409;
      res.status(status).json({ ok: false, error: err.message });
    }
  });

  router.get('/:unitId/effective', (req, res) => {
    const campaignId = req.query.campaign_id || null;
    const unit = store.get(campaignId, req.params.unitId);
    if (!unit) return res.status(404).json({ error: 'unit_progression_not_found' });
    res.json({
      unit_id: unit.unit_id,
      level: unit.level,
      xp_total: unit.xp_total,
      stats: engine.effectiveStats(unit),
      passives: engine.listPassives(unit),
      ability_mods: engine.listAbilityMods(unit),
    });
  });

  router.delete('/campaign/:campaignId', (req, res) => {
    const removed = store.clearCampaign(req.params.campaignId);
    res.json({ campaign_id: req.params.campaignId, removed });
  });

  return router;
}

module.exports = { createProgressionRouter };
