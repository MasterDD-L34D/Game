// Tutorial encounter route — serves pre-built scenario definitions.
//
// GET /enc_tutorial_01 → primo scenario (2v2 elimination, savana, diff 1/5)
// GET /enc_tutorial_02 → secondo scenario (2v3 con cacciatore corazzato, diff 2/5)
// GET /enc_tutorial_03 → terzo scenario (caverna, hazard tiles, diff 3/5)
// GET /              → lista scenari disponibili
//
// Registered via pluginLoader as tutorialPlugin at /api/tutorial.

'use strict';

const { Router } = require('express');
const {
  TUTORIAL_SCENARIO,
  TUTORIAL_SCENARIO_02,
  TUTORIAL_SCENARIO_03,
  TUTORIAL_SCENARIO_04,
  TUTORIAL_SCENARIO_05,
  buildTutorialUnits,
  buildTutorialUnits02,
  buildTutorialUnits03,
  buildTutorialUnits04,
  buildTutorialUnits05,
} = require('../services/tutorialScenario');
const { HARDCORE_SCENARIO_06, buildHardcoreUnits06 } = require('../services/hardcoreScenario');

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

  router.get('/enc_tutorial_03', (_req, res) => {
    res.json({
      ...TUTORIAL_SCENARIO_03,
      units: buildTutorialUnits03(),
      usage: 'POST the units array to /api/session/start to begin a playable session.',
    });
  });

  router.get('/enc_tutorial_04', (_req, res) => {
    res.json({
      ...TUTORIAL_SCENARIO_04,
      units: buildTutorialUnits04(),
      usage: 'POST the units array to /api/session/start to begin a playable session.',
    });
  });

  router.get('/enc_tutorial_05', (_req, res) => {
    res.json({
      ...TUTORIAL_SCENARIO_05,
      units: buildTutorialUnits05(),
      usage: 'POST the units array to /api/session/start to begin a playable session.',
    });
  });

  router.get('/enc_tutorial_06_hardcore', (_req, res) => {
    res.json({
      ...HARDCORE_SCENARIO_06,
      units: buildHardcoreUnits06(),
      usage: 'POST the units array to /api/session/start with modulation="full" to begin.',
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
        {
          id: TUTORIAL_SCENARIO_03.id,
          name: TUTORIAL_SCENARIO_03.name,
          difficulty: TUTORIAL_SCENARIO_03.difficulty_rating,
          href: `/api/tutorial/${TUTORIAL_SCENARIO_03.id}`,
        },
        {
          id: TUTORIAL_SCENARIO_04.id,
          name: TUTORIAL_SCENARIO_04.name,
          difficulty: TUTORIAL_SCENARIO_04.difficulty_rating,
          href: `/api/tutorial/${TUTORIAL_SCENARIO_04.id}`,
        },
        {
          id: TUTORIAL_SCENARIO_05.id,
          name: TUTORIAL_SCENARIO_05.name,
          difficulty: TUTORIAL_SCENARIO_05.difficulty_rating,
          href: `/api/tutorial/${TUTORIAL_SCENARIO_05.id}`,
        },
        {
          id: HARDCORE_SCENARIO_06.id,
          name: HARDCORE_SCENARIO_06.name,
          difficulty: HARDCORE_SCENARIO_06.difficulty_rating,
          href: `/api/tutorial/${HARDCORE_SCENARIO_06.id}`,
        },
      ],
    });
  });

  return router;
}

module.exports = { createTutorialRouter };
