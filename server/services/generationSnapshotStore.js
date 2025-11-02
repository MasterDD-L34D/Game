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

async function readJson(filePath, fsImpl = fs) {
  try {
    const content = await fsImpl.readFile(filePath, 'utf8');
    return JSON.parse(content);
  } catch (error) {
    if (error && error.code === 'ENOENT') {
      return null;
    }
    throw error;
  }
}

async function writeJson(filePath, payload, fsImpl = fs) {
  const targetDir = path.dirname(filePath);
  await fsImpl.mkdir(targetDir, { recursive: true });
  await fsImpl.writeFile(filePath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
}

function delay(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function createFileLock(filePath, fsImpl, options = {}) {
  const lockPath = `${filePath}.lock`;
  const retryDelayMs = options.retryDelayMs ?? 25;
  const maxWaitMs = options.maxWaitMs ?? 2000;
  const staleAfterMs = options.staleAfterMs ?? 120000;

  async function acquire() {
    const start = Date.now();
    const lockDir = path.dirname(lockPath);
    if (lockDir) {
      await fsImpl.mkdir(lockDir, { recursive: true });
    }
    while (true) {
      try {
        const handle = await fsImpl.open(lockPath, 'wx');
        return handle;
      } catch (error) {
        if (error?.code !== 'EEXIST') {
          throw error;
        }
      }
      if (staleAfterMs) {
        try {
          const stats = await fsImpl.stat(lockPath);
          const age = Date.now() - Number(stats.mtimeMs || 0);
          if (Number.isFinite(age) && age >= staleAfterMs) {
            await fsImpl.unlink(lockPath);
            continue;
          }
        } catch (statError) {
          if (statError?.code === 'ENOENT') {
            continue;
          }
          throw statError;
        }
      }
      if (Date.now() - start >= maxWaitMs) {
        const timeoutError = new Error(
          `Timeout acquisizione lock per snapshot ${path.basename(filePath)}`,
        );
        timeoutError.code = 'LOCK_TIMEOUT';
        throw timeoutError;
      }
      await delay(retryDelayMs);
    }
  }

  async function withLock(callback) {
    const handle = await acquire();
    let lastError;
    try {
      return await callback();
    } catch (error) {
      lastError = error;
      throw error;
    } finally {
      try {
        await handle.close();
      } catch (closeError) {
        if (!lastError) {
          lastError = closeError;
        }
      }
      try {
        await fsImpl.unlink(lockPath);
      } catch (unlinkError) {
        if (unlinkError?.code !== 'ENOENT' && !lastError) {
          throw unlinkError;
        }
      }
    }
  }

  return { withLock };
}

async function readSnapshotCandidate(filePath, fsImpl) {
  if (!filePath) {
    return { snapshot: null, corrupted: false };
  }
  try {
    const snapshot = await readJson(filePath, fsImpl);
    if (!snapshot) {
      return { snapshot: null, corrupted: false };
    }
    return { snapshot, corrupted: false };
  } catch (error) {
    if (error instanceof SyntaxError) {
      return { snapshot: null, corrupted: true };
    }
    throw error;
  }
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
  const fsImpl = options.fs || fs;
  const lockOptions = options.lock || {};
  const lock = createFileLock(datasetPath, fsImpl, lockOptions);
  const tempPath = `${datasetPath}.tmp`;
  const backupPath = `${datasetPath}.bak`;
  let cachedSnapshot = null;
  let staticSnapshot = options.staticDataset ? clone(options.staticDataset) : null;

  async function loadStaticSnapshot() {
    if (staticSnapshot) {
      return staticSnapshot;
    }
    const fallback = await readJson(path.resolve(datasetPath), fsImpl);
    staticSnapshot = fallback ? clone(fallback) : null;
    return staticSnapshot;
  }

  async function loadSnapshotFromDisk() {
    const primary = await readSnapshotCandidate(datasetPath, fsImpl);
    if (primary.snapshot) {
      return clone(primary.snapshot);
    }
    const tempCandidate = await readSnapshotCandidate(tempPath, fsImpl);
    if (tempCandidate.snapshot) {
      return clone(tempCandidate.snapshot);
    }
    const backupCandidate = await readSnapshotCandidate(backupPath, fsImpl);
    if (backupCandidate.snapshot) {
      return clone(backupCandidate.snapshot);
    }
    return null;
  }

  async function persistSnapshot(snapshot) {
    await fsImpl.mkdir(path.dirname(datasetPath), { recursive: true });
    const payload = `${JSON.stringify(snapshot, null, 2)}\n`;
    await fsImpl.writeFile(tempPath, payload, 'utf8');
    try {
      await fsImpl.rename(datasetPath, backupPath);
    } catch (renameError) {
      if (renameError?.code !== 'ENOENT') {
        throw renameError;
      }
    }
    await fsImpl.rename(tempPath, datasetPath);
    try {
      await fsImpl.unlink(tempPath);
    } catch (cleanupError) {
      if (cleanupError?.code !== 'ENOENT') {
        throw cleanupError;
      }
    }
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
    return lock.withLock(async () => {
      const current = await resolveBaseSnapshotForPatch();
      const next = applySnapshotPatch(current, patch);
      cachedSnapshot = clone(next);
      await persistSnapshot(next);
      return clone(next);
    });
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
