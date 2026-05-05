// Sprint δ Meta Systemic — Pattern 4 wiring (conviction voting routes).
//
// Gate 5 NOTE (2026-05-05 audit): conviction voting API is registered but FE
// only reads conviction_badge from vcSnapshot. Full voting flow (init/vote/
// results/close) has NO FE caller. NOT exempted — requires FE wire (~4h).
// TKT-GATE5-CONVICTION: wire conviction voting UI or formally deprecate route.
//
// Endpoints:
//   POST /api/v1/conviction/init   → init ballot for session
//   POST /api/v1/conviction/vote   → cast/update player vote
//   GET  /api/v1/conviction/results?session_id=... → current tally
//   POST /api/v1/conviction/close  → finalize + return outcome

'use strict';

const { Router } = require('express');
const { initBallot, castVote, tally, closeBallot } = require('../services/meta/convictionVoting');

function createConvictionRouter() {
  const router = Router();

  router.post('/v1/conviction/init', (req, res) => {
    const { session_id, choices } = req.body || {};
    const result = initBallot(session_id, choices);
    if (!result.ok) {
      return res.status(400).json({ error: result.reason });
    }
    res.json({
      session_id,
      ballot_size: result.ballot.choices.size,
    });
  });

  router.post('/v1/conviction/vote', (req, res) => {
    const { session_id, player_id, choice_id, vc_snapshot } = req.body || {};
    const result = castVote(session_id, player_id, choice_id, vc_snapshot || {});
    if (!result.ok) {
      const status = result.reason === 'ballot_not_found' ? 404 : 400;
      return res.status(status).json({ error: result.reason });
    }
    res.json({ vote: result.vote });
  });

  router.get('/v1/conviction/results', (req, res) => {
    const session_id = req.query.session_id;
    if (!session_id || typeof session_id !== 'string') {
      return res.status(400).json({ error: 'session_id_required' });
    }
    const result = tally(session_id);
    if (!result.ok) {
      return res.status(404).json({ error: result.reason });
    }
    res.json(result);
  });

  router.post('/v1/conviction/close', (req, res) => {
    const { session_id } = req.body || {};
    const result = closeBallot(session_id);
    if (!result.ok) {
      return res.status(404).json({ error: result.reason });
    }
    res.json(result.result);
  });

  return router;
}

module.exports = { createConvictionRouter };
