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
    const { createNarrativeRouter } = require('../../services/narrative/narrativeRoutes');
    app.use('/api/v1/narrative', createNarrativeRouter());
    app.use('/api/narrative', createNarrativeRouter());
  },
};

const metaPlugin = {
  name: 'meta',
  register(app) {
    const { createMetaRouter } = require('../routes/meta');
    app.use('/api/v1/meta', createMetaRouter());
    app.use('/api/meta', createMetaRouter());
  },
};

/**
 * Lista plugin built-in. Aggiungere nuovi plugin qui.
 * Ordine = ordine di registrazione.
 */
const BUILTIN_PLUGINS = [narrativePlugin, metaPlugin];

module.exports = {
  loadPlugins,
  BUILTIN_PLUGINS,
  narrativePlugin,
  metaPlugin,
};
