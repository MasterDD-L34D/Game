// Resistance Engine — Node native implementation (M6-#1, ADR-2026-04-19).
//
// Context: parallel-agent audit 2026-04-19 scoprì che Node session engine
// (apps/backend/routes/session.js) non implementava channel resistance logic,
// mentre Python rules engine (ex-services/rules/resolver.py, rimosso #2059) sì. Spike 2026-04-19
// validò che resistance è la leva calibrazione hardcore-06 (84.6% → 20% win
// rate con flat 50% resist).
//
// User direction 2026-04-19: "1 solo gioco online, senza master" → runtime
// canonico = Node. Portiamo resistance a Node (non tracciamento Python bridge).
//
// Convention ADR-2026-04-19:
// - species_resistances.yaml: scale 100-neutral (80=resist, 100=neutro, 120=vuln)
// - trait_mechanics.yaml trait resistances: delta (+20=resist, -20=vuln)
// - mergeResistances è unico convertitore species→delta
// - applyResistance accetta solo delta format
//
// Semantic parity con ex-Python services/rules/resolver.py (apply_resistance +
// merge_resistances). Python rimosso PR #2059 (ADR-2026-04-19 Phase 3 closed).

'use strict';

const fs = require('node:fs');
const path = require('node:path');
const yaml = require('js-yaml');

const RESISTANCE_MIN = -100;
const RESISTANCE_MAX = 100;

/**
 * Load species_resistances.yaml → dict {species_archetypes, default_archetype}.
 *
 * Shape atteso:
 * ```yaml
 * species_archetypes:
 *   corazzato:
 *     resistances: {fisico: 80, taglio: 80, psionico: 120, ...}
 *   ...
 * default_archetype: adattivo
 * ```
 *
 * Valori pct in scala 100-neutral.
 *
 * @param {string} filePath path assoluto o relativo a repo root
 * @returns {object} data dict
 */
function loadSpeciesResistances(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8');
  const data = yaml.load(raw);
  if (!data || typeof data !== 'object') {
    throw new Error(`species_resistances atteso dict root, trovato: ${typeof data}`);
  }
  return data;
}

/**
 * Extract archetype resistance dict {channel: pct} (scala 100-neutral).
 * Fallback a default_archetype quando archetypeId non matcha.
 *
 * @param {string|null|undefined} archetypeId es. "corazzato"
 * @param {object|null|undefined} data output di loadSpeciesResistances
 * @returns {object|null} dict channel→pct (100-neutral), o null se no data
 */
function getArchetypeResistances(archetypeId, data) {
  if (!data || typeof data !== 'object') return null;
  const archetypes = data.species_archetypes || {};
  if (typeof archetypes !== 'object') return null;

  let lookupId = archetypeId && archetypes[archetypeId] ? archetypeId : null;
  if (!lookupId) {
    const defaultId = data.default_archetype || 'adattivo';
    lookupId = archetypes[defaultId] ? defaultId : null;
  }
  if (!lookupId) return null;

  const entry = archetypes[lookupId];
  if (!entry || typeof entry !== 'object' || !entry.resistances) return null;
  const result = {};
  for (const [ch, pct] of Object.entries(entry.resistances)) {
    result[String(ch)] = Number(pct);
  }
  return result;
}

/**
 * Merge trait resistances (delta format) + species archetype (100-neutral)
 * → list delta format `[{channel, modifier_pct}]` consumibile da applyResistance.
 *
 * Species baseline convertito: merged[ch] = 100 - pct (80→+20 resist, 120→-20 vuln).
 * Trait delta sommato al baseline.
 *
 * Semantic parity con Python resolver.py:merge_resistances.
 *
 * @param {Array} traitResistances lista `[{channel, modifier_pct}]` (delta)
 * @param {object|null} speciesResistances dict channel→pct (100-neutral) o null
 * @returns {Array} lista `[{channel, modifier_pct}]` (delta, clampata ±100)
 */
function mergeResistances(traitResistances, speciesResistances) {
  const merged = {};

  // 1. Species baseline (100-neutral) → delta conversion
  if (speciesResistances && typeof speciesResistances === 'object') {
    for (const [ch, pct] of Object.entries(speciesResistances)) {
      merged[ch] = 100 - Number(pct);
    }
  }

  // 2. Trait delta sum al baseline
  if (Array.isArray(traitResistances)) {
    for (const res of traitResistances) {
      if (!res || typeof res !== 'object') continue;
      const ch = res.channel;
      const mod = Number(res.modifier_pct);
      if (typeof ch !== 'string' || !Number.isFinite(mod)) continue;
      merged[ch] = (merged[ch] || 0) + mod;
    }
  }

  // 3. Clamp + filter zero + sort
  const result = [];
  for (const [ch, pct] of Object.entries(merged)) {
    const clamped = Math.max(RESISTANCE_MIN, Math.min(RESISTANCE_MAX, pct));
    if (clamped !== 0) {
      result.push({ channel: ch, modifier_pct: clamped });
    }
  }
  result.sort((a, b) => a.channel.localeCompare(b.channel));
  return result;
}

/**
 * Apply resistance al damage per il canale dell'attacco.
 *
 * Formula: `floor(damage * (1 - pct/100))` per pct ∈ [-100, 100] (delta).
 * - pct=+20 → factor=0.8 (resist 20%)
 * - pct=-20 → factor=1.2 (amplify/vuln 20%)
 * - pct=+100 → factor=0 (immune)
 * - pct=-100 → factor=2 (double damage)
 *
 * Canale null o non matched nella lista resistances → damage passa invariato.
 *
 * Semantic parity con Python resolver.py:apply_resistance.
 *
 * @param {number} damage danno pre-resistance (int)
 * @param {Array|null|undefined} resistances lista `[{channel, modifier_pct}]` (delta)
 * @param {string|null|undefined} channel canale attacco es. "fisico"
 * @returns {number} damage post-resistance (int, floor)
 */
function applyResistance(damage, resistances, channel) {
  if (!Number.isFinite(damage) || damage <= 0) return damage;
  if (!channel || typeof channel !== 'string') return damage;
  if (!Array.isArray(resistances)) return damage;

  for (const res of resistances) {
    if (!res || typeof res !== 'object') continue;
    if (res.channel !== channel) continue;
    const pct = Number(res.modifier_pct);
    if (!Number.isFinite(pct)) continue;
    const factor = (100 - pct) / 100;
    const adjusted = Math.floor(damage * factor);
    // Clamp a 0 (nessun damage negativo anche con vuln oltre 100)
    return Math.max(0, adjusted);
  }
  return damage;
}

/**
 * Resolve resistance dict per unit combining species_archetype + unit traits.
 * Helper che compone merged resistances ready-to-use.
 *
 * @param {string|null} archetypeId
 * @param {object|null} speciesData loadSpeciesResistances output
 * @param {Array} traitResistances lista trait `[{channel, modifier_pct}]`
 * @returns {Array} resistances delta list ready per applyResistance
 */
function computeUnitResistances(archetypeId, speciesData, traitResistances) {
  const archetype = getArchetypeResistances(archetypeId, speciesData);
  return mergeResistances(traitResistances || [], archetype);
}

// Default path canonical (override-able via env var GAME_SPECIES_RESISTANCES_PATH)
const DEFAULT_SPECIES_RESISTANCES_PATH = path.join(
  process.cwd(),
  'packs',
  'evo_tactics_pack',
  'data',
  'balance',
  'species_resistances.yaml',
);

module.exports = {
  loadSpeciesResistances,
  getArchetypeResistances,
  mergeResistances,
  applyResistance,
  computeUnitResistances,
  DEFAULT_SPECIES_RESISTANCES_PATH,
  RESISTANCE_MIN,
  RESISTANCE_MAX,
};
