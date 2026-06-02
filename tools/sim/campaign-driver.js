'use strict';
// Thin wrappers over the /api/campaign/* seam (shapes verified against
// tests/api/campaignIntegration.test.js). Injected `http` (supertest in tests,
// fetch in production) keeps the full-loop runner unit-testable.

function start(http, { playerId, campaignDefId } = {}) {
  return http.post('/api/campaign/start', {
    player_id: playerId,
    ...(campaignDefId ? { campaign_def_id: campaignDefId } : {}),
  });
}

function summary(http, id) {
  return http.get('/api/campaign/summary', { id });
}

function advance(http, { id, outcome, peEarned = 0, survivors } = {}) {
  return http.post('/api/campaign/advance', {
    id,
    outcome,
    pe_earned: peEarned,
    ...(survivors ? { survivors } : {}),
  });
}

function choose(http, { id, branchKey } = {}) {
  return http.post('/api/campaign/choose', { id, branch_key: branchKey });
}

module.exports = { start, summary, advance, choose };
