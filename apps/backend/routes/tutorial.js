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
const {
  HARDCORE_SCENARIO_06,
  HARDCORE_SCENARIO_06_QUARTET,
  HARDCORE_SCENARIO_07_POD_RUSH,
  buildHardcoreUnits06,
  buildHardcoreUnits06Quartet,
  buildHardcoreUnits07,
} = require('../services/hardcoreScenario');
const { selectBriefing } = require('../services/narrative/briefingVariations');

// Optional briefing variation: when ?variant_seed=N is passed, swap the
// hardcoded briefing_pre/post with a YAML-pack variant (tutorial_briefings.yaml).
// Backward-compatible: omitting the param yields the original strings.
function applyBriefingVariation(scenario, req) {
  const seed = req.query?.variant_seed;
  if (seed === undefined || seed === null || seed === '') return scenario;
  const ctx = {
    seed,
    biome: scenario.biome_id,
    difficulty: scenario.difficulty_rating,
    replay: req.query.replay === 'true' || req.query.replay === '1',
    mbti_axes: parseMbtiAxes(req.query.mbti),
  };
  const pre = selectBriefing(scenario.id, 'pre', { ...ctx, fallback: scenario.briefing_pre });
  const post = selectBriefing(scenario.id, 'post', { ...ctx, fallback: scenario.briefing_post });
  return {
    ...scenario,
    briefing_pre: pre?.text || scenario.briefing_pre,
    briefing_post: post?.text || scenario.briefing_post,
    briefing_variants: {
      pre: { id: pre?.id, source: pre?.source },
      post: { id: post?.id, source: post?.source },
    },
  };
}

// Parses the optional `mbti=T:0.7,N:0.6` query into { T_F, S_N } floats.
function parseMbtiAxes(raw) {
  if (typeof raw !== 'string' || !raw.includes(':')) return undefined;
  const out = {};
  for (const pair of raw.split(',')) {
    const [k, v] = pair.split(':').map((s) => s.trim());
    const num = Number(v);
    if (Number.isNaN(num)) continue;
    if (k === 'T') out.T_F = Math.max(0, Math.min(1, num));
    else if (k === 'F') out.T_F = Math.max(0, Math.min(1, 1 - num));
    else if (k === 'N') out.S_N = Math.max(0, Math.min(1, num));
    else if (k === 'S') out.S_N = Math.max(0, Math.min(1, 1 - num));
    else if (k === 'E') out.E_I = Math.max(0, Math.min(1, num));
    else if (k === 'P') out.J_P = Math.max(0, Math.min(1, num));
  }
  return Object.keys(out).length ? out : undefined;
}

function createTutorialRouter() {
  const router = Router();

  router.get('/enc_tutorial_01', (req, res) => {
    res.json({
      ...applyBriefingVariation(TUTORIAL_SCENARIO, req),
      units: buildTutorialUnits(),
      usage: 'POST the units array to /api/session/start to begin a playable session.',
    });
  });

  router.get('/enc_tutorial_02', (req, res) => {
    res.json({
      ...applyBriefingVariation(TUTORIAL_SCENARIO_02, req),
      units: buildTutorialUnits02(),
      usage: 'POST the units array to /api/session/start to begin a playable session.',
    });
  });

  router.get('/enc_tutorial_03', (req, res) => {
    res.json({
      ...applyBriefingVariation(TUTORIAL_SCENARIO_03, req),
      units: buildTutorialUnits03(),
      usage: 'POST the units array to /api/session/start to begin a playable session.',
    });
  });

  router.get('/enc_tutorial_04', (req, res) => {
    res.json({
      ...applyBriefingVariation(TUTORIAL_SCENARIO_04, req),
      units: buildTutorialUnits04(),
      usage: 'POST the units array to /api/session/start to begin a playable session.',
    });
  });

  router.get('/enc_tutorial_05', (req, res) => {
    res.json({
      ...applyBriefingVariation(TUTORIAL_SCENARIO_05, req),
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

  // Iter 5 Option A variant — quartet 4p balanced (target wr 15-25%).
  router.get('/enc_tutorial_06_hardcore_quartet', (_req, res) => {
    res.json({
      ...HARDCORE_SCENARIO_06_QUARTET,
      units: buildHardcoreUnits06Quartet(),
      usage: 'POST units + modulation="quartet" → 4p vs 6 enemy (boss hp 22 balanced).',
    });
  });

  // M13 P6 (ADR-2026-04-24) — Assalto Spietato pod-rush + timer 10.
  router.get('/enc_tutorial_07_hardcore_pod_rush', (_req, res) => {
    res.json({
      ...HARDCORE_SCENARIO_07_POD_RUSH,
      units: buildHardcoreUnits07(),
      usage:
        'POST units + modulation="quartet" → 4p vs 3 iniziali + pod reinforcement. Timer 10 rounds, expire = escalate pressure +30.',
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
        {
          id: HARDCORE_SCENARIO_06_QUARTET.id,
          name: HARDCORE_SCENARIO_06_QUARTET.name,
          difficulty: HARDCORE_SCENARIO_06_QUARTET.difficulty_rating,
          href: `/api/tutorial/${HARDCORE_SCENARIO_06_QUARTET.id}`,
        },
      ],
    });
  });

  return router;
}

module.exports = { createTutorialRouter };
