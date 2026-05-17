const express = require('express');

const { createAtlasController } = require('../controllers/atlasController.js');

function withDeprecationHeaders(handler, linkHeader) {
  return async function handleWithDeprecation(req, res, next) {
    res.set('Deprecation', 'true');
    if (linkHeader) {
      res.set('Link', linkHeader);
    }
    return handler(req, res, next);
  };
}

function createAtlasRouter(options = {}) {
  const router = express.Router();
  const controller = createAtlasController(options);

  router.get('/dataset', controller.dataset);
  router.get('/telemetry', controller.telemetry);
  router.get('/generator', controller.generator);
  if (typeof controller.orchestrator === 'function') {
    router.get('/orchestrator', controller.orchestrator);
  }
  router.get('/', controller.bundle);

  return router;
}

function createAtlasLegacyRouter(options = {}) {
  const router = express.Router();
  const controller = createAtlasController(options);
  const successorLink = '</api/v1/atlas/dataset>; rel="successor-version"';

  router.get('/atlas', withDeprecationHeaders(controller.bundle, successorLink));
  router.get('/atlas/dataset', withDeprecationHeaders(controller.dataset));
  router.get('/atlas/telemetry', withDeprecationHeaders(controller.telemetry));
  router.get('/atlas/generator', withDeprecationHeaders(controller.generator));
  if (typeof controller.orchestrator === 'function') {
    router.get('/atlas/orchestrator', withDeprecationHeaders(controller.orchestrator));
  }

  return router;
}

module.exports = {
  createAtlasRouter,
  createAtlasLegacyRouter,
};
