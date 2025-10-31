const DEFAULT_STATUS = {
  fetchedAt: null,
  error: null,
};

function createTraitDiagnosticsSync(options = {}) {
  const orchestrator = options.orchestrator;
  if (!orchestrator || typeof orchestrator.fetchTraitDiagnostics !== 'function') {
    throw new Error('Trait diagnostics orchestrator mancante');
  }

  let cache = null;
  let status = { ...DEFAULT_STATUS };
  let loadingPromise = null;

  async function load() {
    if (loadingPromise) {
      return loadingPromise;
    }
    loadingPromise = orchestrator
      .fetchTraitDiagnostics()
      .then((payload) => {
        const diagnostics = payload?.diagnostics || payload || {};
        cache = diagnostics;
        status = {
          fetchedAt: new Date().toISOString(),
          error: null,
        };
        return diagnostics;
      })
      .catch((error) => {
        status = {
          fetchedAt: status.fetchedAt,
          error: error instanceof Error ? error.message : String(error),
        };
        throw error;
      })
      .finally(() => {
        loadingPromise = null;
      });
    return loadingPromise;
  }

  async function ensureLoaded() {
    if (cache) {
      return cache;
    }
    try {
      return await load();
    } catch (error) {
      if (options.suppressErrors) {
        return null;
      }
      throw error;
    }
  }

  function getDiagnostics() {
    return cache;
  }

  function getStatus() {
    return { ...status, loading: Boolean(loadingPromise) };
  }

  return {
    load,
    ensureLoaded,
    getDiagnostics,
    getStatus,
  };
}

module.exports = { createTraitDiagnosticsSync };
