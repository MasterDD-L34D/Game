// =============================================================================
// Unit Diary routes — Skiv ticket #7 backend MVP.
//
// GET /api/diary/:unit_id            tail (default 50, max 500)
// GET /api/diary/:unit_id/summary    aggregate counts per event_type
// POST /api/diary/:unit_id           append entry (server-side helpers wire here)
//
// Storage handled by services/diary/diaryStore.js (JSONL append-only).
// =============================================================================

'use strict';

const express = require('express');
const {
  appendEntry,
  tailDiary,
  summary,
  ALLOWED_EVENT_TYPES,
} = require('../services/diary/diaryStore');

function createDiaryRouter(opts = {}) {
  const router = express.Router();
  const baseDir = opts.baseDir; // optional override (tests)

  router.get('/diary/:unit_id', (req, res, next) => {
    try {
      const unitId = req.params.unit_id;
      const limit = Number.parseInt(req.query.limit, 10);
      const reverse = req.query.reverse === 'true' || req.query.reverse === '1';
      const entries = tailDiary(unitId, {
        limit: Number.isFinite(limit) ? limit : 50,
        reverse,
        baseDir,
      });
      // Empty array is valid (no diary yet); return 200 with zero entries.
      res.json({ unit_id: unitId, count: entries.length, entries });
    } catch (err) {
      next(err);
    }
  });

  router.get('/diary/:unit_id/summary', (req, res, next) => {
    try {
      const unitId = req.params.unit_id;
      const out = summary(unitId, { baseDir });
      res.json(out);
    } catch (err) {
      next(err);
    }
  });

  router.post('/diary/:unit_id', (req, res, next) => {
    try {
      const unitId = req.params.unit_id;
      const body = req.body || {};
      const outcome = appendEntry(unitId, body, { baseDir });
      if (!outcome.ok) {
        const status = outcome.error === 'invalid_unit_id' ? 400 : 409;
        return res.status(status).json({
          error: outcome.error,
          detail: outcome.detail || null,
          allowed_event_types: Array.from(ALLOWED_EVENT_TYPES),
        });
      }
      res.status(201).json({ ok: true, unit_id: unitId, entry: outcome.entry });
    } catch (err) {
      next(err);
    }
  });

  return router;
}

module.exports = { createDiaryRouter };
