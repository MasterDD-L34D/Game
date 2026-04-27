// V1 pattern (bevy plugin modularity): plugin loader per servizi backend.
//
// Ogni plugin esporta { name, register(app, options) }.
// Il loader li carica in sequenza, log registrazione.
//
// Uso in app.js:
//   const { loadPlugins, BUILTIN_PLUGINS } = require('./services/pluginLoader');
//   loadPlugins(app, BUILTIN_PLUGINS, options);
//
// Plugin custom (es. narrative) si aggiungono a BUILTIN_PLUGINS o
// vengono caricati dinamicamente da una directory.
//
// Vedi docs/planning/tactical-architecture-patterns.md §V1

'use strict';

/**
 * Carica e registra una lista di plugin sull'app Express.
 *
 * @param {import('express').Express} app
 * @param {Array<{name: string, register: function}>} plugins
 * @param {object} [options] — opzioni globali passate a ogni plugin
 */
function loadPlugins(app, plugins, options = {}) {
  const loaded = [];
  for (const plugin of plugins) {
    if (!plugin || typeof plugin.register !== 'function') {
      console.warn(`[plugin-loader] skip invalid plugin:`, plugin);
      continue;
    }
    try {
      plugin.register(app, options);
      loaded.push(plugin.name || 'unnamed');
    } catch (err) {
      console.error(`[plugin-loader] failed to register '${plugin.name}':`, err.message);
    }
  }
  if (loaded.length > 0) {
    console.log(`[plugin-loader] ${loaded.length} plugins loaded: ${loaded.join(', ')}`);
  }
  return loaded;
}

// --- Built-in plugins ---

const narrativePlugin = {
  name: 'narrative',
  register(app) {
    const { createNarrativeRouter } = require('../../../services/narrative/narrativeRoutes');
    app.use('/api/v1/narrative', createNarrativeRouter());
    app.use('/api/narrative', createNarrativeRouter());
  },
};

const metaPlugin = {
  name: 'meta',
  register(app) {
    const { createMetaRouter } = require('../routes/meta');
    const { createMetaStore } = require('../services/metaProgression');
    const { prisma } = require('../db/prisma');
    // Share one store between /api/v1/meta and /api/meta. Pre-adapter, each
    // mount built its own Map → aliases saw divergent state (latent bug).
    const store = createMetaStore({ prisma, campaignId: null });
    app.use('/api/v1/meta', createMetaRouter({ store }));
    app.use('/api/meta', createMetaRouter({ store }));
  },
};

const tutorialPlugin = {
  name: 'tutorial',
  register(app) {
    const { createTutorialRouter } = require('../routes/tutorial');
    app.use('/api/tutorial', createTutorialRouter());
  },
};

const jobsPlugin = {
  name: 'jobs',
  register(app) {
    const { createJobsRouter } = require('../routes/jobs');
    app.use('/api/jobs', createJobsRouter());
  },
};

// M12 Phase A — form evolution engine + routes.
const formsPlugin = {
  name: 'forms',
  register(app) {
    const { createFormsRouter } = require('../routes/forms');
    const router = createFormsRouter();
    app.use('/api/v1/forms', router);
    app.use('/api/forms', router);
  },
};

// M13 P3 — character progression (XP + perk-pair) engine + routes.
const progressionPlugin = {
  name: 'progression',
  register(app) {
    const { createProgressionRouter } = require('../routes/progression');
    const router = createProgressionRouter();
    app.use('/api/v1/progression', router);
    app.use('/api/progression', router);
  },
};

// M14 Path A — Unit-self mutation framework (post-encounter mutation catalog).
// Decoupled from V3 mating per design semantics 2026-04-25.
const mutationsPlugin = {
  name: 'mutations',
  register(app, options = {}) {
    const { createMutationsRouter } = require('../routes/mutations');
    const router = createMutationsRouter(options.mutations || {});
    app.use('/api/v1/mutations', router);
    app.use('/api/mutations', router);
  },
};

// Sprint B Spore S5 (ADR-2026-04-26-spore-part-pack-slots) — generational
// lineage propagation. Pool indexato (species, biome) populated quando una
// unit entra in `legacy` lifecycle phase; nuove unit ereditano 1-2 mutation
// random senza pagare MP cost.
const lineagePlugin = {
  name: 'lineage',
  register(app) {
    const { createLineageRouter } = require('../routes/lineage');
    const router = createLineageRouter();
    app.use('/api/v1/lineage', router);
    app.use('/api/lineage', router);
  },
};

/**
 * Lista plugin built-in. Aggiungere nuovi plugin qui.
 * Ordine = ordine di registrazione.
 */
const BUILTIN_PLUGINS = [
  narrativePlugin,
  metaPlugin,
  tutorialPlugin,
  jobsPlugin,
  formsPlugin,
  progressionPlugin,
  mutationsPlugin,
  lineagePlugin,
];

module.exports = {
  loadPlugins,
  BUILTIN_PLUGINS,
  narrativePlugin,
  metaPlugin,
  tutorialPlugin,
  jobsPlugin,
  formsPlugin,
  progressionPlugin,
  mutationsPlugin,
  lineagePlugin,
};
