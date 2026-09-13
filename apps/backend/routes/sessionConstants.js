// Session engine constants — extracted from session.js for token optimization.
// Shared by session.js, sessionHelpers.js, and sessionRoundBridge.js.

'use strict';

// M16 (ADR-2026-04-16): default flippato a true.
function isRoundModelEnabled() {
  const val = String(process.env.USE_ROUND_MODEL || 'true').toLowerCase();
  return val !== 'false';
}

const GRID_SIZE = 6;
// M7 Quick Win (balance-auditor 2026-04-19): DPR asymmetry fix.
// Evidence: enemy BOSS mod=5 vs player default cd=12 hp=10 → skirmisher killed
// in 2 attacks (75% hit, 4.88 avg dmg). Ratio player/enemy DPR 0.65x.
// Bump hp 10→14 + dc 12→13: enemy BOSS kill time 2→~3.5 atk, player survival
// vs boss focus-fire +40%. 0 defeat baseline rimosso senza calibration archaeology.
const DEFAULT_HP = 14;
const DEFAULT_AP = 2;
const DEFAULT_MOD = 3;
const DEFAULT_DC = 13;
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

// M6-Z: default resistance_archetype per job (player units).
// vanguard = tank corazzato (vuln psionico), warden = caster psionico (vuln fisico),
// skirmisher/ranger/invoker/artificer/harvester = adattivo (neutral default).
// Enemies scenario sovrascrivono via scenario config (hardcoreScenario).
const JOB_ARCHETYPE = {
  vanguard: 'corazzato',
  warden: 'psionico',
  skirmisher: 'adattivo',
  ranger: 'adattivo',
  invoker: 'psionico',
  artificer: 'adattivo',
  harvester: 'adattivo',
};

// M6-Z: mapping archetype → canale exploit vuln (per enemy AI channel choice).
// Derivato da species_resistances.yaml: per ogni archetype, canale con pct > 100 (vuln).
const ARCHETYPE_VULN_CHANNEL = {
  corazzato: 'psionico', // corazzato.psionico: 120 (vuln)
  bioelettrico: 'fisico', // bioelettrico.fisico: 120
  psionico: 'fisico', // psionico.fisico: 120
  termico: 'ionico', // termico.ionico: 120
  adattivo: null, // no vuln = default fisico fallback
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
  JOB_ARCHETYPE,
  ARCHETYPE_VULN_CHANNEL,
  ASSIST_WINDOW_TURNS,
};
