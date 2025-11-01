const fs = require('node:fs/promises');
const path = require('node:path');

const DEFAULT_DATASET_PATH = path.resolve(
  __dirname,
  '..',
  '..',
  'data',
  'flow-shell',
  'atlas-snapshot.json',
);

function clone(value) {
  if (value === null || value === undefined) {
    return value;
  }
  return JSON.parse(JSON.stringify(value));
}

async function readJson(filePath) {
  try {
    const content = await fs.readFile(filePath, 'utf8');
    return JSON.parse(content);
  } catch (error) {
    if (error && error.code === 'ENOENT') {
      return null;
    }
    throw error;
  }
}

async function writeJson(filePath, payload) {
  const targetDir = path.dirname(filePath);
  await fs.mkdir(targetDir, { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
}

function mergeSection(baseSection, patchSection) {
  const base = baseSection && typeof baseSection === 'object' ? baseSection : {};
  const patch = patchSection && typeof patchSection === 'object' ? patchSection : {};
  const result = { ...base };
  for (const [key, value] of Object.entries(patch)) {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      result[key] = mergeSection(base[key], value);
    } else {
      result[key] = clone(value);
    }
  }
  return result;
}

function buildRuntimeSummary(result, error) {
  if (error) {
    return {
      lastBlueprintId: null,
      fallbackUsed: null,
      validationMessages: 0,
      lastRequestId: null,
      error: error.message || String(error),
    };
  }
  if (!result) {
    return null;
  }
  const validationMessages = Array.isArray(result?.validation?.messages)
    ? result.validation.messages.length
    : 0;
  const fallbackUsed = Boolean(
    result?.meta?.fallback_used ?? result?.meta?.fallbackUsed ?? result?.meta?.fallback_active,
  );
  return {
    lastBlueprintId: result?.blueprint?.id || null,
    fallbackUsed,
    validationMessages,
    lastRequestId: result?.meta?.request_id || result?.meta?.requestId || null,
  };
}

function applySnapshotPatch(currentSnapshot, patch = {}) {
  const next = { ...clone(currentSnapshot) };

  if (Object.prototype.hasOwnProperty.call(patch, 'runtime')) {
    next.runtime = patch.runtime ? { ...patch.runtime } : null;
  }

  if (patch.overview) {
    next.overview = mergeSection(next.overview, patch.overview);
  }

  if (patch.species) {
    next.species = mergeSection(next.species, patch.species);
  }

  if (patch.speciesStatus) {
    next.species = mergeSection(next.species, patch.speciesStatus);
  }

  if (patch.biomeSummary) {
    next.biomeSummary = mergeSection(next.biomeSummary, patch.biomeSummary);
  }

  if (patch.encounterSummary) {
    next.encounterSummary = mergeSection(next.encounterSummary, patch.encounterSummary);
  }

  const reservedKeys = new Set([
    'runtime',
    'overview',
    'species',
    'speciesStatus',
    'biomeSummary',
    'encounterSummary',
  ]);

  Object.entries(patch).forEach(([key, value]) => {
    if (reservedKeys.has(key)) {
      return;
    }
    if (value === undefined) {
      return;
    }
    next[key] = clone(value);
  });

  return next;
}

function createGenerationSnapshotStore(options = {}) {
  const datasetPath = options.datasetPath || DEFAULT_DATASET_PATH;
  let cachedSnapshot = null;
  let staticSnapshot = options.staticDataset ? clone(options.staticDataset) : null;

  async function loadStaticSnapshot() {
    if (staticSnapshot) {
      return staticSnapshot;
    }
    const fallback = await readJson(datasetPath);
    staticSnapshot = fallback ? clone(fallback) : null;
    return staticSnapshot;
  }

  async function loadSnapshotFromDisk() {
    const snapshot = await readJson(datasetPath);
    return snapshot ? clone(snapshot) : null;
  }

  async function persistSnapshot(snapshot) {
    await writeJson(datasetPath, snapshot);
  }

  async function getSnapshot({ refresh = false } = {}) {
    if (refresh) {
      cachedSnapshot = null;
    }
    if (cachedSnapshot) {
      return clone(cachedSnapshot);
    }
    let snapshot = await loadSnapshotFromDisk();
    if (!snapshot) {
      snapshot = (await loadStaticSnapshot()) || {};
    }
    cachedSnapshot = clone(snapshot);
    return clone(snapshot);
  }

  async function resolveBaseSnapshotForPatch() {
    const diskSnapshot = await loadSnapshotFromDisk();
    if (diskSnapshot) {
      cachedSnapshot = clone(diskSnapshot);
      return diskSnapshot;
    }
    const fallbackSnapshot = await loadStaticSnapshot();
    const base = fallbackSnapshot ? clone(fallbackSnapshot) : {};
    cachedSnapshot = clone(base);
    return base;
  }

  async function applyPatch(patch = {}) {
    const current = await resolveBaseSnapshotForPatch();
    const next = applySnapshotPatch(current, patch);
    cachedSnapshot = clone(next);
    await persistSnapshot(next);
    return clone(next);
  }

  async function recordRuntime(result, error) {
    const summary = buildRuntimeSummary(result, error);
    if (!summary) {
      return getSnapshot();
    }
    return applyPatch({ runtime: summary });
  }

  async function invalidate() {
    cachedSnapshot = null;
  }

  return {
    getSnapshot,
    applyPatch,
    recordRuntime,
    invalidate,
    get datasetPath() {
      return datasetPath;
    },
  };
}

module.exports = {
  createGenerationSnapshotStore,
  buildRuntimeSummary,
  __internals__: {
    clone,
    mergeSection,
    applySnapshotPatch,
    readJson,
    writeJson,
  },
};
