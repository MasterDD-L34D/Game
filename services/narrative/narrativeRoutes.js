// I1 pattern: Express routes per narrative service.
//
// Endpoints:
//   GET  /api/v1/narrative/stories        — lista storie disponibili
//   POST /api/v1/narrative/start          — avvia storia, ritorna primo testo + scelte
//   POST /api/v1/narrative/choice         — seleziona scelta, ritorna testo + scelte
//   POST /api/v1/narrative/bind-session   — bind dati sessione a storia attiva
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
} = require('./narrativeEngine');

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

  return router;
}

module.exports = { createNarrativeRouter };
