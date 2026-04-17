// Jobs Loader — carica data/core/jobs.yaml e espone catalog + abilities.
//
// FRICTION #4 (playtest 2026-04-17): Skirmisher job abilities (dash_strike,
// evasive_maneuver, blade_flurry) specificate in YAML ma Master non aveva
// visibilità cost/trigger durante playtest → ability ignorate.
//
// Questo loader espone il catalog via GET /api/jobs → discoverability.
// Executor ability (POST /api/session/action action_type='ability') = PR separato.

'use strict';

const fs = require('node:fs');
const path = require('node:path');
const yaml = require('js-yaml');

const DEFAULT_JOBS_PATH = path.resolve(__dirname, '..', '..', '..', 'data', 'core', 'jobs.yaml');

/**
 * Carica data/core/jobs.yaml. Fallback silenzioso a struttura vuota se file mancante.
 *
 * @param {string} [yamlPath] override path.
 * @param {{ log?: Function, warn?: Function }} [logger] logger (default console).
 * @returns {{ version?: string, jobs: Record<string, object> } | null}
 */
function loadJobs(yamlPath = DEFAULT_JOBS_PATH, logger = console) {
  try {
    const text = fs.readFileSync(yamlPath, 'utf8');
    const parsed = yaml.load(text);
    if (!parsed || typeof parsed !== 'object' || !parsed.jobs) {
      logger.warn(`[jobs] struttura invalida in ${yamlPath}, uso null`);
      return null;
    }
    const count = Object.keys(parsed.jobs).length;
    logger.log(`[jobs] caricato ${yamlPath}: ${count} job`);
    return parsed;
  } catch (err) {
    if (err && err.code === 'ENOENT') {
      logger.warn(`[jobs] ${yamlPath} non trovato, uso null`);
    } else {
      logger.warn(
        `[jobs] errore caricamento ${yamlPath}: ${err && err.message ? err.message : err}`,
      );
    }
    return null;
  }
}

/**
 * Estrae lista abilities di un job come array (vs oggetto unlock_r1_1 / r1_2 / r2).
 * Ordina per rank asc.
 */
function extractAbilities(jobEntry) {
  if (!jobEntry || !jobEntry.abilities) return [];
  return Object.values(jobEntry.abilities)
    .filter((a) => a && a.ability_id)
    .sort((a, b) => (a.rank || 99) - (b.rank || 99));
}

module.exports = { loadJobs, extractAbilities, DEFAULT_JOBS_PATH };
