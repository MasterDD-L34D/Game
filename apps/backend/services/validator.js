'use strict';

class ValidatorServiceError extends Error {
  constructor(message, statusCode = 400) {
    super(message);
    this.name = 'ValidatorServiceError';
    this.statusCode = statusCode;
  }
}

async function validateRuntime({ kind, payload = {} } = {}, { runtimeValidator } = {}) {
  if (!runtimeValidator) {
    throw new ValidatorServiceError('Runtime validator non configurato', 500);
  }
  if (!kind) {
    throw new ValidatorServiceError("Campo 'kind' richiesto", 400);
  }

  if (kind === 'species') {
    const entries = Array.isArray(payload.entries) ? payload.entries : [];
    return runtimeValidator.validateSpeciesBatch(entries, {
      biomeId: payload.biomeId,
    });
  }

  if (kind === 'biome') {
    return runtimeValidator.validateBiome(payload.biome, {
      defaultHazard: payload.defaultHazard,
    });
  }

  if (kind === 'foodweb') {
    return runtimeValidator.validateFoodweb(payload.foodweb);
  }

  throw new ValidatorServiceError(`kind non supportato: ${kind}`, 400);
}

module.exports = {
  validateRuntime,
  ValidatorServiceError,
};
