// Tutorial encounter route — serves pre-built scenario definitions.
//
// GET /enc_tutorial_01 → scenario metadata + units ready for POST /api/session/start
//
// Registered via pluginLoader as tutorialPlugin at /api/tutorial.

'use strict';

const { Router } = require('express');
const { TUTORIAL_SCENARIO, buildTutorialUnits } = require('../services/tutorialScenario');

function createTutorialRouter() {
  const router = Router();

  router.get('/enc_tutorial_01', (_req, res) => {
    res.json({
      ...TUTORIAL_SCENARIO,
      units: buildTutorialUnits(),
      usage: 'POST the units array to /api/session/start to begin a playable session.',
    });
  });

  router.get('/', (_req, res) => {
    res.json({
      scenarios: [
        {
          id: TUTORIAL_SCENARIO.id,
          name: TUTORIAL_SCENARIO.name,
          href: `/api/tutorial/${TUTORIAL_SCENARIO.id}`,
        },
      ],
    });
  });

  return router;
}

module.exports = { createTutorialRouter };
