// Player telemetry router — POST/GET REST endpoint per PlayerRunTelemetry.
//
// Genesis: CAP-12 (audit Impronta CAP-10 F-4).
// Mounted at /api/v1 (vedi app.js). Endpoint:
//   POST /api/v1/player/:playerId/telemetry
//   GET  /api/v1/player/:playerId/telemetry?limit=20
//   GET  /api/v1/run/:runId/telemetry

'use strict';

const express = require('express');
const store = require('../services/telemetry/playerRunTelemetryStore');

function createPlayerTelemetryRouter() {
  const router = express.Router();

  // POST /api/v1/player/:playerId/telemetry
  // Body: { unitId, runId, campaignId?, vcSnapshot, selectedForm?, outcome? }
  router.post('/player/:playerId/telemetry', async (req, res) => {
    try {
      const playerId = String(req.params.playerId || '').trim();
      if (!playerId) return res.status(400).json({ error: 'playerId path param required' });

      const body = req.body || {};
      const row = await store.create({
        playerId,
        unitId: body.unitId || body.unit_id,
        runId: body.runId || body.run_id,
        campaignId: body.campaignId || body.campaign_id || null,
        vcSnapshot: body.vcSnapshot || body.vc_snapshot,
        selectedForm: body.selectedForm || body.selected_form || null,
        outcome: body.outcome || null,
      });
      res.status(201).json({ ok: true, row });
    } catch (err) {
      const msg = err && err.message ? err.message : 'unknown error';
      const status = msg.includes('required') || msg.includes('invalid') ? 400 : 500;
      res.status(status).json({ ok: false, error: msg });
    }
  });

  // GET /api/v1/player/:playerId/telemetry?limit=20
  router.get('/player/:playerId/telemetry', async (req, res) => {
    try {
      const playerId = String(req.params.playerId || '').trim();
      if (!playerId) return res.status(400).json({ error: 'playerId path param required' });
      const limit = Number(req.query.limit) || 20;
      const rows = await store.listByPlayer(playerId, limit);
      res.json({ ok: true, count: rows.length, rows });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // GET /api/v1/run/:runId/telemetry
  router.get('/run/:runId/telemetry', async (req, res) => {
    try {
      const runId = String(req.params.runId || '').trim();
      if (!runId) return res.status(400).json({ error: 'runId path param required' });
      const rows = await store.listByRun(runId);
      res.json({ ok: true, count: rows.length, rows });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  return router;
}

module.exports = { createPlayerTelemetryRouter };
