// ADR-2026-05-29-ermes-runtime-bridge TKT-BR-10 -- debrief input scaffold.
//
// Produce prototypes/ermes_lab/inputs/<session_id>.json (schema evo_debrief_for_ermes
// v1.0.0, audit sezione 5.3 C). Consumer: prototypes/ermes_lab/suggestions.py (BR-07)
// che lo legge + il latest_eco_pressure_report per emettere JSON-Patch DISCRETI.
//
// NB: modulo dedicato (NON bolt-on su apps/backend/report.js che e' il codex-report
// builder, concern distinto). Hook atteso: chiamato dal session/coop combat-end
// handler con runState aggregato.
//
// Schema (audit 5.3 C):
//   { schema, schema_version, session_id, biomes_visited[], trait_usage[],
//     encounter_fires{}, outcomes{} }

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DEFAULT_INPUTS_DIR = path.resolve(__dirname, '../../../../prototypes/ermes_lab/inputs');
const SCHEMA = 'evo_debrief_for_ermes';
const SCHEMA_VERSION = '1.0.0';

/**
 * Build the debrief-for-ermes payload from session runState (pure function).
 *
 * @param {string} sessionId
 * @param {object} runState -- aggregated session stats
 * @param {Array<string>} [runState.biomesVisited]
 * @param {Array<object>} [runState.traitUsageStats] -- [{trait_id, fires, ...}]
 * @param {object} [runState.encounterFireStats] -- {ambush: N, scavenger: N, ...}
 * @param {object} [runState.outcomes] -- {wins, losses, wipes}
 * @returns {object} payload
 */
function buildDebriefPayload(sessionId, runState = {}) {
  return {
    schema: SCHEMA,
    schema_version: SCHEMA_VERSION,
    session_id: sessionId || 'unknown',
    biomes_visited: Array.isArray(runState.biomesVisited) ? runState.biomesVisited : [],
    trait_usage: Array.isArray(runState.traitUsageStats) ? runState.traitUsageStats : [],
    encounter_fires:
      runState.encounterFireStats && typeof runState.encounterFireStats === 'object'
        ? runState.encounterFireStats
        : {},
    outcomes:
      runState.outcomes && typeof runState.outcomes === 'object'
        ? runState.outcomes
        : { wins: 0, losses: 0, wipes: 0 },
  };
}

/**
 * Write the debrief payload to prototypes/ermes_lab/inputs/<session_id>.json.
 * Idempotent: overwrites same session_id file. Soft-fail safe (returns null on
 * write error -- non-blocking del session-end flow, ADR-21c precedent).
 *
 * @param {string} sessionId
 * @param {object} runState
 * @param {object} [opts]
 * @param {string} [opts.inputsDir] -- override target dir
 * @returns {string|null} written file path or null on soft-fail
 */
function writeErmesDebriefInput(sessionId, runState = {}, opts = {}) {
  if (!sessionId) return null;
  const inputsDir = opts.inputsDir || DEFAULT_INPUTS_DIR;
  const payload = buildDebriefPayload(sessionId, runState);
  try {
    fs.mkdirSync(inputsDir, { recursive: true });
    const safeId = String(sessionId).replace(/[^a-zA-Z0-9_-]/g, '_');
    const target = path.join(inputsDir, `${safeId}.json`);
    fs.writeFileSync(target, JSON.stringify(payload, null, 2), 'utf8');
    return target;
  } catch (_err) {
    return null; // soft-fail: debrief input is best-effort, not session-critical
  }
}

module.exports = {
  buildDebriefPayload,
  writeErmesDebriefInput,
  SCHEMA,
  SCHEMA_VERSION,
  DEFAULT_INPUTS_DIR,
};
