// Tutorial encounter route — serves pre-built scenario definitions.
//
// GET /enc_tutorial_01 → primo scenario (2v2 elimination, savana)
// GET /enc_tutorial_02 → secondo scenario (2v3 con cacciatore corazzato)
// GET /              → lista scenari disponibili
//
// Registered via pluginLoader as tutorialPlugin at /api/tutorial.

'use strict';

const { Router } = require('express');
const {
  TUTORIAL_SCENARIO,
  TUTORIAL_SCENARIO_02,
  buildTutorialUnits,
  buildTutorialUnits02,
} = require('../services/tutorialScenario');

function createTutorialRouter() {
  const router = Router();

  router.get('/enc_tutorial_01', (_req, res) => {
    res.json({
      ...TUTORIAL_SCENARIO,
      units: buildTutorialUnits(),
      usage: 'POST the units array to /api/session/start to begin a playable session.',
    });
  });

  router.get('/enc_tutorial_02', (_req, res) => {
    res.json({
      ...TUTORIAL_SCENARIO_02,
      units: buildTutorialUnits02(),
      usage: 'POST the units array to /api/session/start to begin a playable session.',
    });
  });

  router.get('/', (_req, res) => {
    res.json({
      scenarios: [
        {
          id: TUTORIAL_SCENARIO.id,
          name: TUTORIAL_SCENARIO.name,
          difficulty: TUTORIAL_SCENARIO.difficulty_rating,
          href: `/api/tutorial/${TUTORIAL_SCENARIO.id}`,
        },
        {
          id: TUTORIAL_SCENARIO_02.id,
          name: TUTORIAL_SCENARIO_02.name,
          difficulty: TUTORIAL_SCENARIO_02.difficulty_rating,
          href: `/api/tutorial/${TUTORIAL_SCENARIO_02.id}`,
        },
      ],
    });
  });

  return router;
}

module.exports = { createTutorialRouter };
