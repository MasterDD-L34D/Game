// =============================================================================
// Chronicle routes -- SPEC-Q M-7 (per-branco cross-session narrative).
//
// GET  /api/chronicle/:run_id            tail (default 50, max 500); ?type= ?actor_id= ?limit= ?reverse=
// GET  /api/chronicle/:run_id/summary    aggregate counts per type + per tier
// POST /api/chronicle/:run_id            append a chronicle_event (server-side emitters wire here)
//
// Store: services/chronicle/chronicleStore.js (JSONL append-only, per run_id).
// =============================================================================

'use strict';

const express = require('express');
const {
  appendEvent,
  tailChronicle,
  summary,
  ALLOWED_EVENT_TYPES,
  ALLOWED_TIERS,
} = require('../services/chronicle/chronicleStore');

function createChronicleRouter(opts = {}) {
  const router = express.Router();
  const baseDir = opts.baseDir; // optional override (tests)

  router.get('/chronicle/:run_id', (req, res, next) => {
    try {
      const runId = req.params.run_id;
      const limit = Number.parseInt(req.query.limit, 10);
      const reverse = req.query.reverse === 'true' || req.query.reverse === '1';
      const events = tailChronicle(runId, {
        limit: Number.isFinite(limit) ? limit : 50,
        reverse,
        type: typeof req.query.type === 'string' ? req.query.type : undefined,
        actor_id: typeof req.query.actor_id === 'string' ? req.query.actor_id : undefined,
        baseDir,
      });
      res.json({ run_id: runId, count: events.length, events });
    } catch (err) {
      next(err);
    }
  });

  router.get('/chronicle/:run_id/summary', (req, res, next) => {
    try {
      res.json(summary(req.params.run_id, { baseDir }));
    } catch (err) {
      next(err);
    }
  });

  router.post('/chronicle/:run_id', (req, res, next) => {
    try {
      const runId = req.params.run_id;
      const outcome = appendEvent(runId, req.body || {}, { baseDir });
      if (!outcome.ok) {
        const status = outcome.error === 'invalid_run_id' ? 400 : 409;
        return res.status(status).json({
          error: outcome.error,
          detail: outcome.detail || null,
          allowed_event_types: Array.from(ALLOWED_EVENT_TYPES),
          allowed_tiers: Array.from(ALLOWED_TIERS),
        });
      }
      res.status(201).json({ ok: true, run_id: runId, event: outcome.event });
    } catch (err) {
      next(err);
    }
  });

  return router;
}

module.exports = { createChronicleRouter };
