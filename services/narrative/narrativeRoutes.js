// I1 pattern: Express routes per narrative service.
//
// Endpoints:
//   GET  /api/v1/narrative/stories        — lista storie disponibili
//   POST /api/v1/narrative/start          — avvia storia, ritorna primo testo + scelte
//   POST /api/v1/narrative/choice         — seleziona scelta, ritorna testo + scelte
//   POST /api/v1/narrative/bind-session   — bind dati sessione a storia attiva
//   POST /api/v1/narrative/qbn/draw       — draw QBN event from quality state
//   POST /api/v1/narrative/qbn/choice     — apply player choice to QBN history
//
// Le storie sono gestite in-memory (Map storyId → Story instance).
// Per persistenza tra restart, usare saveState/loadState.

'use strict';

const { Router } = require('express');
const crypto = require('node:crypto');
const {
  loadStory,
  bindSessionData,
  runUntilChoice,
  makeChoice,
  listStories,
  saveState,
  selectDriftBriefing,
} = require('./narrativeEngine');
const {
  drawEvent: qbnDrawEvent,
  applyChoice: qbnApplyChoice,
  listEventIds: qbnListEventIds,
} = require('../../apps/backend/services/narrative/qbnEngine');

function createNarrativeRouter() {
  const router = Router();
  const activeStories = new Map();

  // GET /stories — lista storie .ink.json disponibili
  router.get('/stories', (_req, res) => {
    res.json({ stories: listStories() });
  });

  // POST /start — { storyFile: "briefing_default.ink.json", sessionData?: {} }
  router.post('/start', (req, res) => {
    try {
      const { storyFile, sessionData } = req.body || {};
      if (!storyFile) {
        return res.status(400).json({ error: 'storyFile required' });
      }
      const story = loadStory(storyFile);
      if (sessionData) {
        bindSessionData(story, sessionData);
      }
      const storyId = crypto.randomUUID();
      activeStories.set(storyId, story);
      const result = runUntilChoice(story);
      res.json({ storyId, ...result });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // POST /choice — { storyId, choiceIndex }
  router.post('/choice', (req, res) => {
    try {
      const { storyId, choiceIndex } = req.body || {};
      const story = activeStories.get(storyId);
      if (!story) {
        return res.status(404).json({ error: 'story not found' });
      }
      if (typeof choiceIndex !== 'number') {
        return res.status(400).json({ error: 'choiceIndex required (number)' });
      }
      const result = makeChoice(story, choiceIndex);
      if (result.ended) {
        activeStories.delete(storyId);
      }
      res.json({ storyId, ...result });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // POST /bind-session — { storyId, sessionData }
  router.post('/bind-session', (req, res) => {
    try {
      const { storyId, sessionData } = req.body || {};
      const story = activeStories.get(storyId);
      if (!story) {
        return res.status(404).json({ error: 'story not found' });
      }
      bindSessionData(story, sessionData || {});
      res.json({ ok: true, storyId });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // POST /save — { storyId } → { stateJson }
  router.post('/save', (req, res) => {
    try {
      const { storyId } = req.body || {};
      const story = activeStories.get(storyId);
      if (!story) {
        return res.status(404).json({ error: 'story not found' });
      }
      res.json({ storyId, stateJson: saveState(story) });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // ── Drift briefing (Bundle B.1 — Citizen Sleeper drift gating) ─────
  //
  // POST /briefing/drift
  //   body: { session_id?, scenario_id, vc_snapshot?, fallback? }
  //   → { variant, text, source, scenario_id, session_id }
  //
  // Selects pre-mission briefing variant (tech / empatic / neutral) basato su
  // MBTI T_F mean del vc_snapshot fornito. session_id è opzionale (telemetry
  // tag only — il route non accede direttamente al session store per
  // mantenere boundary clean tra narrative e session router).
  //
  // Caller pattern: client legge GET /api/session/:id/vc → estrae snapshot →
  // POST /api/v1/narrative/briefing/drift con vc_snapshot inline.
  router.post('/briefing/drift', (req, res) => {
    try {
      const body = req.body || {};
      const { session_id = null, scenario_id, vc_snapshot = null, fallback = null } = body;
      if (!scenario_id || typeof scenario_id !== 'string') {
        return res.status(400).json({ error: 'scenario_id required (string)' });
      }
      if (vc_snapshot !== null && (typeof vc_snapshot !== 'object' || Array.isArray(vc_snapshot))) {
        return res.status(400).json({ error: 'vc_snapshot must be object or null' });
      }
      const result = selectDriftBriefing(scenario_id, vc_snapshot, { fallback });
      if (!result) {
        return res.status(404).json({
          error: 'no briefing pack entry for scenario_id',
          scenario_id,
        });
      }
      res.json({
        session_id,
        scenario_id,
        variant: result.variant,
        text: result.text,
        source: result.source,
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // ── QBN sub-routes (Quality-Based Narrative) ────────────────────────

  // GET /qbn/events — list event ids in pack (introspection)
  router.get('/qbn/events', (_req, res) => {
    res.json({ events: qbnListEventIds() });
  });

  // POST /qbn/draw — { vcSnapshot?, runState?, history?, seed? } → { event, eligible_count }
  router.post('/qbn/draw', (req, res) => {
    try {
      const result = qbnDrawEvent(req.body || {});
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // POST /qbn/choice — { history, event_id, choice_id, session_index } → { history }
  router.post('/qbn/choice', (req, res) => {
    try {
      const { history, event_id, choice_id, session_index } = req.body || {};
      if (!event_id) return res.status(400).json({ error: 'event_id required' });
      const next = qbnApplyChoice(history || {}, event_id, choice_id ?? null, session_index ?? 0);
      res.json({ history: next });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  return router;
}

module.exports = { createNarrativeRouter };
