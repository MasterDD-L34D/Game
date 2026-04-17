/**
 * Party config loader — memoized.
 * Legge data/core/party.yaml al boot. Fallback a config minimale se YAML
 * mancante (backward compat).
 * ADR-2026-04-17.
 */

const fs = require('node:fs');
const path = require('node:path');

const DEFAULT_CONFIG_PATH = path.resolve(__dirname, '..', '..', 'data', 'core', 'party.yaml');

const FALLBACK = {
  max_players_coop: 4,
  max_deployed_per_encounter: 4,
  max_roster_total: 8,
  grid_scaling: { deployed_1_4: '6x6' },
  defaults: { tutorial: 2, standard: 4, boss: 4, hardcore: 4 },
  modulation: {
    quartet: { description: '4 player × 1 PG', pg_per_player: [1, 1, 1, 1], deployed: 4 },
  },
};

let _memoized = null;

function loadFromDisk(configPath = DEFAULT_CONFIG_PATH) {
  let yaml;
  try {
    yaml = require('js-yaml');
  } catch {
    return FALLBACK;
  }
  try {
    const raw = fs.readFileSync(configPath, 'utf8');
    const parsed = yaml.load(raw);
    return (parsed && parsed.party) || FALLBACK;
  } catch {
    return FALLBACK;
  }
}

function getPartyConfig() {
  if (_memoized === null) _memoized = loadFromDisk();
  return _memoized;
}

function resetCache() {
  _memoized = null;
}

/**
 * Calcola grid size [w, h] da deployed count usando party.grid_scaling.
 * Ricava soglie da chiavi "deployed_N_M" e ritorna tuple "WxH" → [w, h].
 */
function gridSizeFor(deployedCount) {
  const cfg = getPartyConfig();
  const scaling = cfg.grid_scaling || {};
  // Default fallback
  let best = '6x6';
  for (const [key, size] of Object.entries(scaling)) {
    const m = /^deployed_(\d+)_(\d+)$/.exec(key);
    if (!m) continue;
    const lo = Number(m[1]);
    const hi = Number(m[2]);
    if (deployedCount >= lo && deployedCount <= hi) {
      best = size;
      break;
    }
  }
  const mm = /^(\d+)x(\d+)$/.exec(best);
  if (!mm) return [6, 6];
  return [Number(mm[1]), Number(mm[2])];
}

/**
 * Ritorna modulation preset by name oppure null.
 */
function getModulation(name) {
  const cfg = getPartyConfig();
  const preset = (cfg.modulation || {})[name];
  return preset || null;
}

/**
 * Lista nomi modulation preset disponibili.
 */
function listModulations() {
  const cfg = getPartyConfig();
  return Object.entries(cfg.modulation || {}).map(([id, data]) => ({
    id,
    description: data.description,
    pg_per_player: data.pg_per_player,
    deployed: data.deployed,
    players: (data.pg_per_player || []).length,
  }));
}

module.exports = {
  getPartyConfig,
  gridSizeFor,
  getModulation,
  listModulations,
  loadFromDisk,
  resetCache,
  DEFAULT_CONFIG_PATH,
  FALLBACK,
};
