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
 * True se l'encounter opta un grid autorato valido: board_scale === 'grid_sized' e grid_size e'
 * un array [w, h] di due interi entro i bound schema (4..20). Mirror di encounter.schema.json
 * (grid_size: items integer 4..20, arity 2). ADR-2026-07-03.
 */
function isAuthoredGrid(encounter) {
  if (!encounter || encounter.board_scale !== 'grid_sized') return false;
  const gs = encounter.grid_size;
  return (
    Array.isArray(gs) &&
    gs.length === 2 &&
    Number.isInteger(gs[0]) &&
    Number.isInteger(gs[1]) &&
    gs[0] >= 4 &&
    gs[0] <= 20 &&
    gs[1] >= 4 &&
    gs[1] <= 20
  );
}

/**
 * Risolve la board size [w, h] per una sessione: unico punto che decide la board (ADR-2026-07-03).
 * - board_scale === 'grid_sized' con grid_size valido -> board = grid_size autorato (nuovo array,
 *   nessun aliasing dell'encounter).
 * - altrimenti ('party_sized'/assente/invalido) -> party fill-ratio: la modulation (se preset noto)
 *   determina il deployed effettivo, poi gridSizeFor. Byte-identical al path legacy (ADR-2026-04-17).
 */
function resolveBoardSize(deployedCount, encounter, modulation) {
  if (isAuthoredGrid(encounter)) {
    return [encounter.grid_size[0], encounter.grid_size[1]];
  }
  let effectiveDeployed = deployedCount;
  if (modulation) {
    const preset = getModulation(modulation);
    if (preset) effectiveDeployed = preset.deployed;
  }
  return gridSizeFor(effectiveDeployed);
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
  resolveBoardSize,
  isAuthoredGrid,
  getModulation,
  listModulations,
  loadFromDisk,
  resetCache,
  DEFAULT_CONFIG_PATH,
  FALLBACK,
};
