const { createAtlasController, createAtlasLoader, __internals__ } = require('../controllers/atlasController.js');
const { createAtlasRouter, createAtlasLegacyRouter } = require('./atlas.js');

function createNebulaRouter(options = {}) {
  return createAtlasLegacyRouter(options);
}

function createAtlasV1Router(options = {}) {
  return createAtlasRouter(options);
}

module.exports = {
  createNebulaRouter,
  createAtlasV1Router,
  createAtlasController,
  createAtlasLoader,
  __internals__,
};
