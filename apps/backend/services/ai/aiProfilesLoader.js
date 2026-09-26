// AI Profiles Loader — carica ai_profiles.yaml e espone struttura.
//
// ADR-2026-04-17 Q-001 T3.1: gradual rollout Utility AI via flag per-profile
// `use_utility_brain` in ai_profiles.yaml.
//
// Loader invocato al boot (side-effect log), passato a
// createDeclareSistemaIntents come dep opzionale.

'use strict';

const fs = require('node:fs');
const path = require('node:path');
const yaml = require('js-yaml');

const DEFAULT_PROFILES_PATH = path.resolve(
  __dirname,
  '..',
  '..',
  '..',
  '..',
  'packs',
  'evo_tactics_pack',
  'data',
  'balance',
  'ai_profiles.yaml',
);

/**
 * Carica ai_profiles.yaml e ritorna oggetto { profiles, sistema_resource_model, version }.
 * Fallback silenzioso a struttura vuota se file mancante o parse error.
 *
 * @param {string} [yamlPath] override path.
 * @param {{ log?: Function, warn?: Function }} [logger] logger (default console).
 * @returns {{ profiles: Record<string, { use_utility_brain?: boolean, overrides?: object, label?: string, description?: string }>, sistema_resource_model?: object, version?: string } | null}
 */
function loadAiProfiles(yamlPath = DEFAULT_PROFILES_PATH, logger = console) {
  try {
    const text = fs.readFileSync(yamlPath, 'utf8');
    const parsed = yaml.load(text);
    if (!parsed || typeof parsed !== 'object' || !parsed.profiles) {
      logger.warn(`[ai-profiles] struttura invalida in ${yamlPath}, uso null`);
      return null;
    }
    const utilityOn = Object.entries(parsed.profiles)
      .filter(([, p]) => p && p.use_utility_brain === true)
      .map(([name]) => name);
    logger.log(
      `[ai-profiles] caricato ${yamlPath}: ${Object.keys(parsed.profiles).length} profile, utility_brain ON: [${utilityOn.join(', ') || 'none'}]`,
    );
    return parsed;
  } catch (err) {
    if (err && err.code === 'ENOENT') {
      logger.warn(
        `[ai-profiles] ${yamlPath} non trovato, uso null (fallback a useUtilityAi global)`,
      );
    } else {
      logger.warn(
        `[ai-profiles] errore caricamento ${yamlPath}: ${err && err.message ? err.message : err}`,
      );
    }
    return null;
  }
}

module.exports = { loadAiProfiles, DEFAULT_PROFILES_PATH };
