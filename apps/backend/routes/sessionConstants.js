// Session engine constants — extracted from session.js for token optimization.
// Shared by session.js, sessionHelpers.js, and sessionRoundBridge.js.

'use strict';

// M16 (ADR-2026-04-16): default flippato a true.
function isRoundModelEnabled() {
  const val = String(process.env.USE_ROUND_MODEL || 'true').toLowerCase();
  return val !== 'false';
}

const GRID_SIZE = 6;
const DEFAULT_HP = 10;
const DEFAULT_AP = 2;
const DEFAULT_MOD = 3;
const DEFAULT_DC = 12;
const DEFAULT_GUARDIA = 1;
const DEFAULT_INITIATIVE = 10;
const DEFAULT_FACING = 'S';
const VALID_FACINGS = new Set(['N', 'S', 'E', 'W']);

const JOB_INITIATIVE = {
  skirmisher: 15,
  ranger: 14,
  invoker: 12,
  artificer: 11,
  warden: 9,
  vanguard: 8,
  harvester: 8,
};

const JOB_STATS = {
  vanguard: { attack_range: 1 },
  skirmisher: { attack_range: 2 },
  warden: { attack_range: 2 },
  artificer: { attack_range: 2 },
  harvester: { attack_range: 1 },
  ranger: { attack_range: 3 },
  invoker: { attack_range: 3 },
};

const ASSIST_WINDOW_TURNS = 2;

module.exports = {
  isRoundModelEnabled,
  GRID_SIZE,
  DEFAULT_HP,
  DEFAULT_AP,
  DEFAULT_MOD,
  DEFAULT_DC,
  DEFAULT_GUARDIA,
  DEFAULT_INITIATIVE,
  DEFAULT_FACING,
  VALID_FACINGS,
  JOB_INITIATIVE,
  JOB_STATS,
  ASSIST_WINDOW_TURNS,
};
