const express = require('express');

const DEFAULT_EVO_TACTICS_API_BASE =
  process.env.EVO_TACTICS_API_BASE || 'https://api.evo-tactics.dev/';
const BIOME_GENERATION_ROUTE_PATH = '/api/v1/generation/biomes';
const OFFICIAL_BIOME_GENERATION_URL = new URL(
  BIOME_GENERATION_ROUTE_PATH,
  DEFAULT_EVO_TACTICS_API_BASE,
).toString();

function createGenerationHandler(executor, options = {}) {
  const mapResult = typeof options.mapResult === 'function' ? options.mapResult : (value) => value;
  const resolveStatus =
    typeof options.resolveStatus === 'function' ? options.resolveStatus : () => 500;
  const defaultError =
    typeof options.defaultError === 'string' ? options.defaultError : 'Errore generazione';

  return async function generationRoute(req, res) {
    const payload = req.body || {};
    try {
      const result = await executor(payload, req, res);
      const responseBody = mapResult(result, payload, req, res);
      if (responseBody === undefined) {
        res.status(204).end();
        return;
      }
      res.json(responseBody);
    } catch (error) {
      const status = resolveStatus(error, req, res);
      const statusCode = Number.isInteger(status) && status >= 100 ? status : 500;
      const message = error && error.message ? error.message : defaultError;
      res.status(statusCode).json({ error: message });
    }
  };
}

function createGenerationRoutes({ biomeSynthesizer, generationOrchestrator }) {
  if (!biomeSynthesizer || typeof biomeSynthesizer.generate !== 'function') {
    throw new Error('biomeSynthesizer con metodo generate richiesto');
  }
  if (!generationOrchestrator) {
    throw new Error('generationOrchestrator richiesto');
  }

  const traitErrorStatus = (error) => {
    const message = error && error.message ? String(error.message) : '';
    return message.includes('trait_ids') ? 400 : 500;
  };

  const biomes = createGenerationHandler(
    async (payload) => {
      const result = await biomeSynthesizer.generate({
        count: payload.count,
        constraints: payload.constraints || {},
        seed: payload.seed,
      });
      return result;
    },
    {
      mapResult: (result) => ({ biomes: result.biomes, meta: result.constraints }),
      defaultError: 'Errore generazione biomi',
    },
  );

  const species = createGenerationHandler(
    (payload) => generationOrchestrator.generateSpecies(payload),
    {
      resolveStatus: traitErrorStatus,
      defaultError: 'Errore generazione specie',
    },
  );

  const speciesBatch = createGenerationHandler(
    (payload) => generationOrchestrator.generateSpeciesBatch(payload),
    {
      resolveStatus: traitErrorStatus,
      defaultError: 'Errore generazione batch specie',
    },
  );

  return { biomes, species, speciesBatch };
}

function createGenerationRouter(dependencies) {
  const router = express.Router();
  const routes = createGenerationRoutes(dependencies);

  router.post('/biomes', routes.biomes);
  router.post('/species', routes.species);
  router.post('/species/batch', routes.speciesBatch);

  return router;
}

module.exports = {
  createGenerationHandler,
  createGenerationRoutes,
  createGenerationRouter,
  DEFAULT_EVO_TACTICS_API_BASE,
  BIOME_GENERATION_ROUTE_PATH,
  OFFICIAL_BIOME_GENERATION_URL,
};
