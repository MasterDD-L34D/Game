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
const DEFAULT_JOBS_EXPANSION_PATH = path.resolve(
  __dirname,
  '..',
  '..',
  '..',
  'data',
  'core',
  'jobs_expansion.yaml',
);

/**
 * Carica data/core/jobs.yaml + (additivamente) data/core/jobs_expansion.yaml.
 * Fallback silenzioso a struttura vuota se file mancanti.
 *
 * Job expansion sono identificati dal campo per-job `status: 'expansion'`
 * (canonical, presente in entrambi i YAML — non aggiungiamo sentinel).
 * Conflitto su jobId duplicato: la versione base vince, l'expansion viene
 * loggata come override ignorato.
 *
 * @param {string} [yamlPath] override path canonico jobs.yaml.
 * @param {{ log?: Function, warn?: Function, expansionPath?: string }} [logger]
 * @returns {{ version?: string, jobs: Record<string, object> } | null}
 */
function loadJobs(yamlPath = DEFAULT_JOBS_PATH, logger = console) {
  let parsed = null;
  try {
    const text = fs.readFileSync(yamlPath, 'utf8');
    parsed = yaml.load(text);
    if (!parsed || typeof parsed !== 'object' || !parsed.jobs) {
      logger.warn(`[jobs] struttura invalida in ${yamlPath}, uso null`);
      return null;
    }
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

  const expansionPath = (logger && logger.expansionPath) || DEFAULT_JOBS_EXPANSION_PATH;
  try {
    const expText = fs.readFileSync(expansionPath, 'utf8');
    const expParsed = yaml.load(expText);
    if (expParsed && typeof expParsed === 'object' && expParsed.jobs) {
      let merged = 0;
      for (const [jobId, jobBody] of Object.entries(expParsed.jobs)) {
        if (parsed.jobs[jobId]) {
          logger.warn(`[jobs] expansion override ignored for base job: ${jobId}`);
          continue;
        }
        parsed.jobs[jobId] = jobBody;
        merged += 1;
      }
      logger.log(
        `[jobs] caricato ${yamlPath}: ${Object.keys(parsed.jobs).length - merged} base + ${merged} expansion = ${Object.keys(parsed.jobs).length} job`,
      );
      return parsed;
    }
  } catch (err) {
    if (!(err && err.code === 'ENOENT')) {
      logger.warn(
        `[jobs] errore caricamento expansion ${expansionPath}: ${err && err.message ? err.message : err}`,
      );
    }
  }

  const count = Object.keys(parsed.jobs).length;
  logger.log(`[jobs] caricato ${yamlPath}: ${count} job (no expansion)`);
  return parsed;
}

/**
 * FRICTION #6 (playtest 2026-04-17-02): effective_reach derivata.
 * Distance Manhattan massima a cui l'ability puo' colpire un target,
 * combinando move_distance (se presente) + range/attack_range.
 *
 * Map per effect_type:
 *   - move_attack: move_distance + (attack_range del job, default 2)
 *   - attack_move: attack_range (move dopo, no contributo)
 *   - ranged_attack: ability.range || attack_range
 *   - aoe_*, surge_aoe: ability.range (se centro va su cell remota)
 *   - heal/team_heal: ability.range
 *   - drain_attack/multi_attack/attack_push/execution_attack: attack_range
 *   - buff/team_buff/shield/reaction: 0 (self/cast-on-allies in range custom)
 */
function computeEffectiveReach(ability, jobAttackRange) {
  const ar = Number(jobAttackRange || 2);
  const range = Number(ability.range || 0);
  const moveDist = Number(ability.move_distance || 0);
  switch (ability.effect_type) {
    case 'move_attack':
      return moveDist + ar;
    case 'attack_move':
    case 'multi_attack':
    case 'attack_push':
    case 'drain_attack':
    case 'execution_attack':
      return ar;
    case 'ranged_attack':
      return range || ar;
    case 'aoe_buff':
    case 'aoe_debuff':
    case 'surge_aoe':
    case 'heal':
    case 'team_heal':
    case 'team_buff':
    case 'debuff':
      return range || ar;
    case 'buff':
    case 'shield':
    case 'reaction':
    case 'aggro_pull':
      return 0;
    default:
      return range || ar;
  }
}

/**
 * Estrae lista abilities di un job come array (vs oggetto unlock_r1_1 / r1_2 / r2).
 * Ordina per rank asc. Aggiunge effective_reach per ogni ability.
 */
function extractAbilities(jobEntry) {
  if (!jobEntry || !jobEntry.abilities) return [];
  const ar = Number(jobEntry.attack_range || 2);
  return Object.values(jobEntry.abilities)
    .filter((a) => a && a.ability_id)
    .sort((a, b) => (a.rank || 99) - (b.rank || 99))
    .map((a) => ({ ...a, effective_reach: computeEffectiveReach(a, ar) }));
}

module.exports = {
  loadJobs,
  extractAbilities,
  computeEffectiveReach,
  DEFAULT_JOBS_PATH,
  DEFAULT_JOBS_EXPANSION_PATH,
};
