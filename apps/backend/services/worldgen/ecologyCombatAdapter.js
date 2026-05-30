// TKT-ADAPTER-ECO-COMBAT (keystone Wave 3) — ecology -> combat stat adapter.
//
// Spec: docs/superpowers/specs/2026-05-30-ecologia-combat-adapter-spec.md (#2457)
// Census origine: docs/superpowers/specs/2026-05-30-ecologia-combat-disconnect-strategy.md (#2454)
//
// Problema: 0/53 specie canoniche hanno hp/mod/dc (solo 6 tutorial). Questo adapter
// e il ponte mancante: deriva stat di combat DETERMINISTICHE da threat_tier + role_trofico
// (via role_class), passando through genetic_traits.core + jobs_bias.
//
// IMPORTANTE: l'output e BASE stats (pre-encounter). I trait NON sono bakati: la lista
// `traits` viene applicata a runtime da traitEffects.js. Le class-multiplier (hardcore/boss)
// le applica DOWNSTREAM damageCurves.applyEnemyDamageMultiplier. Pipeline:
//   adapter (base) -> encounter staging (position/elevation) -> damageCurves (class mult) -> combat.
//
// Le tabelle knob (HP_BASE/MOD_BASE/DC_BASE/GUARDIA_BASE/ROLE) sono CALIBRABILI: un file
// YAML override (env ECOLOGY_ADAPTER_PATH, pattern DAMAGE_CURVES_PATH) puo rimpiazzare i
// default per la calibrazione N=40 del pilota badlands senza toccare questo modulo.

'use strict';

const fs = require('node:fs');
const yaml = require('js-yaml');

// Default knob tables (baseline ancorato al ground-truth tutorial: T1~4 / T2~7 / T3=11).
// Override-abili via ECOLOGY_ADAPTER_PATH YAML per calibrazione. Vedi spec sez. 3-4.
const DEFAULT_KNOBS = {
  HP_BASE: { T0: 2, T1: 4, T2: 7, T3: 11, T4: 16, T5: 22 },
  MOD_BASE: { T0: 1, T1: 2, T2: 2, T3: 3, T4: 3, T5: 4 },
  DC_BASE: { T0: 10, T1: 11, T2: 12, T3: 13, T4: 14, T5: 15 },
  GUARDIA_BASE: { T0: 0, T1: 0, T2: 0, T3: 1, T4: 1, T5: 2 },
  // role_class -> modificatori. hp_mult moltiplica HP_BASE; dc_adj/guardia_adj additivi.
  ROLE: {
    APEX: { hp_mult: 1.15, dc_adj: 1, guardia_adj: 0 },
    TANK: { hp_mult: 1.3, dc_adj: 0, guardia_adj: 1 },
    PREDATOR: { hp_mult: 1.0, dc_adj: 0, guardia_adj: 0 }, // default baseline
    PREY: { hp_mult: 0.9, dc_adj: 0, guardia_adj: 0 },
    SUPPORT: { hp_mult: 1.0, dc_adj: 0, guardia_adj: 0 },
    HAZARD: { hp_mult: 0.8, dc_adj: 0, guardia_adj: 0 },
  },
  // role_trofico -> role_class (estendibile; vedi spec sez. 4).
  ROLE_TROFICO_MAP: {
    predatore_apex_boss: 'APEX',
    predatore_terziario_apex: 'APEX',
    difensore_territoriale: 'TANK',
    predatore_tutorial_tank: 'TANK',
    predatore_tutorial_secondario: 'PREDATOR',
    predatore_acquatico_agile: 'PREDATOR',
    predatore_regolatore_simbionte: 'PREDATOR',
    erbivoro_primario: 'PREY',
    dispersore_ponte: 'PREY',
    ingegneri_ecosistema: 'SUPPORT',
    minaccia_microbica: 'HAZARD',
    evento_ecologico: 'HAZARD',
  },
};

const DEFAULT_ROLE_CLASS = 'PREDATOR';
const DEFAULT_TIER = 'T1';

// Optional YAML override path (calibration staging). null = use DEFAULT_KNOBS as-is.
const DEFAULT_PATH = process.env.ECOLOGY_ADAPTER_PATH || null;

let _cached = null;

/** Shallow-per-table merge of override knobs onto defaults (only provided keys win). */
function mergeKnobs(base, ov) {
  if (!ov || typeof ov !== 'object') return base;
  const mergedRole = { ...base.ROLE };
  if (ov.ROLE && typeof ov.ROLE === 'object') {
    for (const [k, v] of Object.entries(ov.ROLE)) {
      mergedRole[k] = { ...(base.ROLE[k] || {}), ...v };
    }
  }
  return {
    HP_BASE: { ...base.HP_BASE, ...(ov.HP_BASE || {}) },
    MOD_BASE: { ...base.MOD_BASE, ...(ov.MOD_BASE || {}) },
    DC_BASE: { ...base.DC_BASE, ...(ov.DC_BASE || {}) },
    GUARDIA_BASE: { ...base.GUARDIA_BASE, ...(ov.GUARDIA_BASE || {}) },
    ROLE: mergedRole,
    ROLE_TROFICO_MAP: { ...base.ROLE_TROFICO_MAP, ...(ov.ROLE_TROFICO_MAP || {}) },
  };
}

/**
 * Load + cache the knob tables. If ECOLOGY_ADAPTER_PATH (or filePath) points to a YAML,
 * its keys override the defaults (calibration). Soft-fail to DEFAULT_KNOBS on any error.
 */
function loadKnobs(filePath = DEFAULT_PATH) {
  if (_cached !== null) return _cached;
  if (!filePath) {
    _cached = DEFAULT_KNOBS;
    return _cached;
  }
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    _cached = mergeKnobs(DEFAULT_KNOBS, yaml.load(raw) || {});
  } catch (err) {
    console.warn(`[eco-adapter] knob override non caricato (${err.message}). Uso default.`);
    _cached = DEFAULT_KNOBS;
  }
  return _cached;
}

/** Reset knob cache (per test / calibration re-load). */
function _resetCache() {
  _cached = null;
}

/** Normalize threat_tier ('T3' | 3 | '3') -> 'T0'..'T5', or null if invalid. */
function normalizeTier(t) {
  if (t == null) return null;
  if (typeof t === 'number') {
    return Number.isInteger(t) && t >= 0 && t <= 5 ? `T${t}` : null;
  }
  const s = String(t).trim().toUpperCase();
  if (/^T[0-5]$/.test(s)) return s;
  const n = parseInt(s.replace(/^T/, ''), 10);
  return Number.isInteger(n) && n >= 0 && n <= 5 ? `T${n}` : null;
}

/** Map a role_trofico string to a role_class. Unknown/missing -> PREDATOR (baseline). */
function roleClassFor(roleTrofico) {
  if (!roleTrofico) return DEFAULT_ROLE_CLASS;
  return DEFAULT_KNOBS.ROLE_TROFICO_MAP[roleTrofico] || DEFAULT_ROLE_CLASS;
}

/** attack_range from morphotype: flyer/ranged morphotypes -> 2, else melee 1. */
function attackRangeFor(morphotype) {
  if (morphotype && /volat|planat|alato|aviano|ranged|aeri/i.test(String(morphotype))) {
    return 2;
  }
  return 1;
}

/**
 * Derive deterministic BASE combat stats for a species from its ecology fields.
 *
 * @param {object} species { id|species_id, threat_tier, role_trofico, genetic_traits:{core}, jobs_bias[], morphotype? }
 * @param {object} [opts] { knobs } optional knob injection (else loadKnobs())
 * @returns {object} combat-stat object (base) + `_adapter` provenance {tier, role_class, warnings}
 */
function deriveCombatStats(species, opts = {}) {
  const knobs = opts.knobs || loadKnobs();
  const warnings = [];
  const sp = species || {};
  const id = sp.id || sp.species_id || 'unknown';

  let tier = normalizeTier(sp.threat_tier);
  if (!tier) {
    warnings.push(`threat_tier mancante/invalido (${sp.threat_tier}) -> default ${DEFAULT_TIER}`);
    tier = DEFAULT_TIER;
  }

  const roleClass = roleClassFor(sp.role_trofico);
  const role = knobs.ROLE[roleClass] || knobs.ROLE[DEFAULT_ROLE_CLASS];

  const hpBase = knobs.HP_BASE[tier] != null ? knobs.HP_BASE[tier] : knobs.HP_BASE[DEFAULT_TIER];
  const hp = Math.max(1, Math.round(hpBase * (role.hp_mult != null ? role.hp_mult : 1.0)));
  const mod = knobs.MOD_BASE[tier] != null ? knobs.MOD_BASE[tier] : knobs.MOD_BASE[DEFAULT_TIER];
  const dcBase = knobs.DC_BASE[tier] != null ? knobs.DC_BASE[tier] : knobs.DC_BASE[DEFAULT_TIER];
  const dc = dcBase + (role.dc_adj || 0);
  const guardiaBase = knobs.GUARDIA_BASE[tier] != null ? knobs.GUARDIA_BASE[tier] : 0;
  const guardia = guardiaBase + (role.guardia_adj || 0);

  const traits = Array.isArray(sp.genetic_traits && sp.genetic_traits.core)
    ? sp.genetic_traits.core.slice()
    : [];
  const job = Array.isArray(sp.jobs_bias) && sp.jobs_bias.length ? sp.jobs_bias[0] : null;

  return {
    id,
    species: id,
    hp,
    ap: 2, // boss/fast override = encounter staging, non adapter
    mod, // BASE pre-trait; traitEffects.js + damageCurves applicano a valle
    dc,
    guardia,
    attack_range: attackRangeFor(sp.morphotype),
    traits,
    job,
    _adapter: { tier, role_class: roleClass, warnings },
  };
}

module.exports = {
  deriveCombatStats,
  roleClassFor,
  attackRangeFor,
  normalizeTier,
  loadKnobs,
  mergeKnobs,
  DEFAULT_KNOBS,
  DEFAULT_PATH,
  _resetCache,
};
