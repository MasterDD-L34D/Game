'use strict';

class QualityServiceError extends Error {
  constructor(message, statusCode = 400) {
    super(message);
    this.name = 'QualityServiceError';
    this.statusCode = statusCode;
  }
}

function createLogEntry(scope, level, message) {
  return {
    scope,
    level,
    message,
    timestamp: new Date().toISOString(),
  };
}

function validationLogs(scope, result = {}) {
  const logs = [];
  const messages = Array.isArray(result.messages) ? result.messages : [];
  for (const entry of messages) {
    if (!entry) continue;
    if (typeof entry === 'string') {
      logs.push(createLogEntry(scope, 'info', entry));
      continue;
    }
    const level = entry.level || entry.severity || 'info';
    const text = entry.message || entry.text || '';
    if (text) {
      logs.push(createLogEntry(scope, level, text));
    }
  }
  if (Array.isArray(result.discarded) && result.discarded.length) {
    logs.push(createLogEntry(scope, 'warning', `Elementi scartati: ${result.discarded.length}`));
  }
  if (Array.isArray(result.corrected) && result.corrected.length) {
    logs.push(createLogEntry(scope, 'success', `Correzioni applicate: ${result.corrected.length}`));
  }
  return logs;
}

function generationLogs(scope, batch = {}) {
  const logs = [];
  const results = Array.isArray(batch.results) ? batch.results : [];
  for (const result of results) {
    const meta = result && result.meta ? result.meta : {};
    const requestId = meta.request_id || meta.requestId || 'entry';
    logs.push(createLogEntry(scope, 'success', `Rigenerazione completata per ${requestId}`));
    const messages = result && result.validation ? result.validation.messages : [];
    if (Array.isArray(messages) && messages.length) {
      logs.push(
        createLogEntry(scope, 'info', `${messages.length} messaggi di validazione disponibili`),
      );
    }
  }
  const errors = Array.isArray(batch.errors) ? batch.errors : [];
  for (const error of errors) {
    if (!error) continue;
    const requestId = error.request_id || error.requestId || error.index;
    logs.push(
      createLogEntry(
        scope,
        'error',
        `Rigenerazione fallita (${requestId}): ${error.error || 'errore sconosciuto'}`,
      ),
    );
  }
  if (!logs.length) {
    logs.push(createLogEntry(scope, 'info', 'Rigenerazione completata'));
  }
  return logs;
}

async function applyQualitySuggestion({ suggestion } = {}, dependencies = {}) {
  const { runtimeValidator, generationOrchestrator } = dependencies;
  if (!suggestion || !suggestion.id) {
    throw new QualityServiceError("Suggerimento richiesto per l'applicazione", 400);
  }
  const scope = suggestion.scope || 'general';
  const action = suggestion.action || 'fix';
  const payload = suggestion.payload || {};
  const logScope = scope === 'biomes' ? 'biome' : scope;

  if (!runtimeValidator) {
    throw new QualityServiceError('Runtime validator non configurato', 500);
  }

  let result = {};
  let logs = [];

  if (action === 'fix') {
    if (scope === 'species') {
      const entries = Array.isArray(payload.entries) ? payload.entries : [];
      result = await runtimeValidator.validateSpeciesBatch(entries, {
        biomeId: payload.biomeId,
      });
    } else if (scope === 'biome' || scope === 'biomes') {
      result = await runtimeValidator.validateBiome(payload.biome, {
        defaultHazard: payload.defaultHazard,
      });
    } else if (scope === 'foodweb') {
      result = await runtimeValidator.validateFoodweb(payload.foodweb);
    } else {
      throw new QualityServiceError(`Scope non supportato per fix: ${scope}`, 400);
    }
    logs = validationLogs(logScope, result);
  } else if (action === 'regenerate') {
    if (scope === 'species') {
      if (
        !generationOrchestrator ||
        typeof generationOrchestrator.generateSpeciesBatch !== 'function'
      ) {
        throw new QualityServiceError('Orchestrator rigenerazione non disponibile', 500);
      }
      const entries = Array.isArray(payload.entries) ? payload.entries : [];
      result = await generationOrchestrator.generateSpeciesBatch({ batch: entries });
      logs = generationLogs(logScope, result);
    } else {
      result = { status: 'scheduled', scope };
      logs = [createLogEntry(logScope, 'info', 'Rigenerazione pianificata')];
    }
  } else {
    throw new QualityServiceError(`Azione non supportata: ${action}`, 400);
  }

  return {
    suggestion: { id: suggestion.id, scope, action },
    result,
    logs,
  };
}

module.exports = {
  applyQualitySuggestion,
  QualityServiceError,
  createLogEntry,
  validationLogs,
  generationLogs,
};
