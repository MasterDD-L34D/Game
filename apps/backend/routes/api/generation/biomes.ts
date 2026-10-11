import type { RequestHandler } from 'express';
import type { CatalogService } from '../../../services/catalog';
import type { createGenerationHandler as CreateHandler } from '../../generation';

type GenerationHandlerFactory = typeof CreateHandler;

type BiomeSynthesizer = {
  generate: (options: {
    count?: number;
    constraints?: Record<string, unknown>;
    seed?: unknown;
  }) => Promise<any>;
};

interface RouteOptions {
  biomeSynthesizer: BiomeSynthesizer;
  catalogService?: CatalogService;
  createGenerationHandler: GenerationHandlerFactory;
}

const implementation = require('./biomes.js') as {
  createBiomeGenerationRoute: (options: RouteOptions) => RequestHandler;
};

export const createBiomeGenerationRoute = implementation.createBiomeGenerationRoute;
