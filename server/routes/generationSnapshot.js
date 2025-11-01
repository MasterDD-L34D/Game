const fs = require('node:fs/promises');
const path = require('node:path');

const {
  createGenerationSnapshotStore,
  buildRuntimeSummary,
} = require('../services/generationSnapshotStore');
const { SchemaValidationError } = require('../middleware/schemaValidator');

const DEFAULT_DATASET_PATH = path.resolve(
  __dirname,
  '..',
  '..',
  'data',
  'flow-shell',
  'atlas-snapshot.json',
);

async function loadJson(filePath) {
  const content = await fs.readFile(filePath, 'utf8');
  return JSON.parse(content);
}

function shouldRefreshDataset(req) {
  const refresh = String(req?.query?.refresh || '').trim().toLowerCase();
  if (!refresh) {
    return false;
  }
  return refresh === '1' || refresh === 'true' || refresh === 'yes' || refresh === 'force';
}

function cloneDataset(dataset) {
  return JSON.parse(JSON.stringify(dataset));
}

function parseJsonMaybe(value) {
  if (typeof value !== 'string') {
    return value;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  try {
    return JSON.parse(trimmed);
  } catch (error) {
    console.warn('[generation-snapshot] impossibile parsare speciesStatus', error);
    return null;
  }
}

function extractSpeciesStatusUpdate(req) {
  if (!req) {
    return null;
  }
  const sources = [
    req.body?.speciesStatus,
    req.body?.species,
    req.query?.speciesStatus,
    req.query?.species,
  ];
  for (const source of sources) {
    if (source === undefined || source === null) {
      continue;
    }
    const parsed = parseJsonMaybe(source);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed;
    }
  }
  return null;
}

function computeBiomeSummary(biomes, fallback = {}) {
  const list = Array.isArray(biomes) ? biomes : [];
  if (!list.length && fallback) {
    return { ...fallback };
  }
  let validated = 0;
  for (const biome of list) {
    const validators = Array.isArray(biome?.validators) ? biome.validators : [];
    if (!validators.length) {
      validated += 1;
      continue;
    }
    const hasFailure = validators.some((entry) => String(entry?.status).toLowerCase() === 'failed');
    if (!hasFailure) {
      validated += 1;
    }
  }
  const pending = Math.max(list.length - validated, 0);
  return { validated, pending };
}

function computeEncounterSummary(encounter, fallback = {}) {
  const variants = Array.isArray(encounter?.variants) ? encounter.variants : [];
  if (!variants.length && fallback) {
    return { ...fallback };
  }
  const warnings = variants.reduce((acc, variant) => {
    const warningCount = Array.isArray(variant?.warnings) ? variant.warnings.length : 0;
    return acc + warningCount;
  }, 0);
  const seeds = variants.reduce((acc, variant) => {
    const slots = Array.isArray(variant?.slots) ? variant.slots : [];
    return acc + slots.reduce((slotAcc, slot) => slotAcc + (Number(slot?.quantity) || 0), 0);
  }, 0);
  return {
    variants: variants.length,
    seeds,
    warnings,
  };
}

function buildQualityRelease(baseQuality, diagnostics) {
  const quality = { ...(baseQuality || {}) };
  quality.checks = { ...(baseQuality?.checks || {}) };
  if (diagnostics && typeof diagnostics === 'object') {
    const summary = diagnostics.summary || diagnostics;
    if (summary && typeof summary === 'object') {
      const totalTraits = Number(summary.total_traits) || 0;
      const glossaryOk = Number(summary.glossary_ok) || 0;
      const conflicts = Number(summary.with_conflicts) || 0;
      quality.checks.traits = {
        passed: glossaryOk,
        total: totalTraits,
        conflicts,
      };
    }
    quality.traitDiagnosticsSummary = summary || null;
    quality.traitDiagnosticsGeneratedAt = diagnostics.generated_at || diagnostics.generatedAt || null;
  } else {
    quality.traitDiagnosticsSummary = null;
    quality.traitDiagnosticsGeneratedAt = null;
  }
  return quality;
}

function buildSnapshot({ dataset, diagnostics, runtime }) {
  const snapshot = cloneDataset(dataset);
  snapshot.biomeSummary = computeBiomeSummary(snapshot.biomes, snapshot.biomeSummary);
  snapshot.encounterSummary = computeEncounterSummary(snapshot.encounter, snapshot.encounterSummary);
  snapshot.qualityRelease = buildQualityRelease(snapshot.qualityRelease, diagnostics);
  if (runtime) {
    snapshot.runtime = runtime;
  }
  return snapshot;
}

function validateSnapshotPayload(snapshot, validator, schemaId) {
  if (!validator || !schemaId) {
    return null;
  }
  try {
    validator.validate(schemaId, snapshot);
    return null;
  } catch (error) {
    if (error instanceof SchemaValidationError) {
      return error;
    }
    throw error;
  }
}

function createGenerationSnapshotHandler(options = {}) {
  const datasetPath = options.datasetPath || DEFAULT_DATASET_PATH;
  const traitDiagnosticsSync = options.traitDiagnostics;
  const orchestrator = options.orchestrator;
  const snapshotStore =
    options.snapshotStore || createGenerationSnapshotStore({ datasetPath });
  let datasetCache = null;
  const schemaValidator = options.schemaValidator;
  const validationSchemaId = options.validationSchemaId;

  async function resolveDataset(req) {
    const refresh = shouldRefreshDataset(req);
    if (snapshotStore && typeof snapshotStore.getSnapshot === 'function') {
      return snapshotStore.getSnapshot({ refresh });
    }
    if (refresh) {
      datasetCache = null;
    }
    if (!datasetCache) {
      datasetCache = await loadJson(datasetPath);
    }
    return cloneDataset(datasetCache);
  }

  return async function generationSnapshotHandler(req, res) {
    try {
      const dataset = await resolveDataset(req);
      const speciesStatusUpdate = extractSpeciesStatusUpdate(req);
      const datasetForSnapshot = cloneDataset(dataset);
      if (speciesStatusUpdate) {
        datasetForSnapshot.species = {
          ...(datasetForSnapshot.species || {}),
          ...speciesStatusUpdate,
        };
      }

      let diagnostics = null;
      if (traitDiagnosticsSync && typeof traitDiagnosticsSync.ensureLoaded === 'function') {
        try {
          await traitDiagnosticsSync.ensureLoaded();
          diagnostics = typeof traitDiagnosticsSync.getDiagnostics === 'function'
            ? traitDiagnosticsSync.getDiagnostics()
            : null;
        } catch (diagError) {
          console.warn('[generation-snapshot] trait diagnostics non disponibili', diagError);
        }
      }

      let runtimeSummary = null;
      const initialRequest = dataset?.initialSpeciesRequest;
      if (
        orchestrator &&
        typeof orchestrator.generateSpecies === 'function' &&
        initialRequest &&
        Array.isArray(initialRequest.trait_ids) &&
        initialRequest.trait_ids.length
      ) {
        try {
          const result = await orchestrator.generateSpecies(initialRequest);
          runtimeSummary = buildRuntimeSummary(result);
        } catch (runtimeError) {
          console.warn('[generation-snapshot] anteprima orchestrator fallita', runtimeError);
          runtimeSummary = buildRuntimeSummary(null, runtimeError);
        }
      }

      const snapshot = buildSnapshot({
        dataset: datasetForSnapshot,
        diagnostics,
        runtime: runtimeSummary,
      });

      if (snapshotStore && typeof snapshotStore.applyPatch === 'function') {
        const patch = {};
        if (runtimeSummary) {
          patch.runtime = runtimeSummary;
        }
        if (speciesStatusUpdate) {
          patch.speciesStatus = speciesStatusUpdate;
        }
        if (Object.keys(patch).length) {
          try {
            await snapshotStore.applyPatch(patch);
          } catch (storeError) {
            console.warn('[generation-snapshot] salvataggio snapshot fallito', storeError);
          }
        }
      } else if (speciesStatusUpdate && datasetCache) {
        datasetCache.species = {
          ...(datasetCache.species || {}),
          ...speciesStatusUpdate,
        };
      }

      const validationError = validateSnapshotPayload(snapshot, schemaValidator, validationSchemaId);
      if (validationError) {
        console.error('[generation-snapshot] snapshot non conforme allo schema', {
          issues: validationError.details || [],
        });
        res.status(500).json({
          error: 'Snapshot non conforme allo schema',
          details: validationError.details || [],
        });
        return;
      }

      res.json(snapshot);
    } catch (error) {
      console.error('[generation-snapshot] errore ricomposizione snapshot', error);
      res.status(500).json({
        error: error.message || 'Errore composizione snapshot orchestrator',
      });
    }
  };
}

module.exports = {
  createGenerationSnapshotHandler,
  __internals__: {
    loadJson,
    computeBiomeSummary,
    computeEncounterSummary,
    buildQualityRelease,
    buildRuntimeSummary,
    buildSnapshot,
    shouldRefreshDataset,
    extractSpeciesStatusUpdate,
    parseJsonMaybe,
  },
};
