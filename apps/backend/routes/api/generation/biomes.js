function createBiomeGenerationRoute({
  biomeSynthesizer,
  catalogService,
  createGenerationHandler,
} = {}) {
  if (!createGenerationHandler || typeof createGenerationHandler !== 'function') {
    throw new Error('createGenerationHandler richiesto per la rotta biomi');
  }
  if (!biomeSynthesizer || typeof biomeSynthesizer.generate !== 'function') {
    throw new Error('biomeSynthesizer con metodo generate richiesto');
  }

  return createGenerationHandler(
    async (payload = {}) => {
      if (catalogService && typeof catalogService.ensureReady === 'function') {
        await catalogService.ensureReady();
      }
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
}

module.exports = {
  createBiomeGenerationRoute,
};
