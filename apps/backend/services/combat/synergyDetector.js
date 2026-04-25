// =============================================================================
// Synergy Combo Detection — Pillar 1 (Tattica) + Pillar 4 (Identità)
//
// Pattern Skiv ticket #2: la `species.yaml` definisce `catalog.synergies[]`
// con `when_all: [slot.part, ...]`. Ogni specie ha `default_parts` da cui si
// derivano le combinazioni `slot.part`. Questo modulo fa il match runtime e
// emette bonus_damage quando le precondizioni di una synergy sono tutte vere
// per l'attaccante. Cooldown: 1 fire / actor / round (pattern reaction cap).
//
// Effect schema (additivo, opzionale per synergy):
//   effect:
//     bonus_damage: 1   # default DEFAULT_BONUS_DAMAGE se assente
//
// Tracking session:
//   - session._synergy_last_fire: { actor_id: turn }   cooldown
//   - session.last_round_synergies: [{ actor_id, target_id, synergies, bonus_applied, turn }]
//   - session.previous_round_synergies: archive snapshot al reset
//
// Pure: il detector non muta la session. Il record è esplicito.
// =============================================================================

'use strict';

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const DEFAULT_SPECIES_YAML = path.join(
  __dirname,
  '..',
  '..',
  '..',
  '..',
  'data',
  'core',
  'species.yaml',
);

const DEFAULT_BONUS_DAMAGE = 1;

let _cache = null;

function loadSynergyCatalog({ filepath = DEFAULT_SPECIES_YAML, force = false } = {}) {
  if (_cache && !force) return _cache;
  const raw = fs.readFileSync(filepath, 'utf8');
  const parsed = yaml.load(raw) || {};
  const synergies = (parsed.catalog && parsed.catalog.synergies) || [];
  const speciesParts = {}; // species_id -> Set<slot.part>
  for (const sp of parsed.species || []) {
    if (!sp.id || !sp.default_parts) continue;
    const set = new Set();
    for (const [slot, val] of Object.entries(sp.default_parts)) {
      if (Array.isArray(val)) {
        for (const part of val) {
          if (typeof part === 'string' && part) set.add(`${slot}.${part}`);
        }
      } else if (typeof val === 'string' && val) {
        set.add(`${slot}.${val}`);
      }
    }
    speciesParts[sp.id] = set;
  }
  _cache = { synergies, speciesParts };
  return _cache;
}

function resetCache() {
  _cache = null;
}

/**
 * Estrae il set di `slot.part` per un attore. Override `actor.parts` ha
 * precedenza, altrimenti deriva da `actor.species` via catalog.
 */
function partsForActor(actor, catalog = loadSynergyCatalog()) {
  if (!actor) return new Set();
  if (actor.parts && typeof actor.parts === 'object') {
    const set = new Set();
    for (const [slot, val] of Object.entries(actor.parts)) {
      if (Array.isArray(val)) {
        for (const part of val) {
          if (typeof part === 'string' && part) set.add(`${slot}.${part}`);
        }
      } else if (typeof val === 'string' && val) {
        set.add(`${slot}.${val}`);
      }
    }
    return set;
  }
  if (actor.species && catalog.speciesParts[actor.species]) {
    return catalog.speciesParts[actor.species];
  }
  return new Set();
}

function applicableSynergies(actor, opts = {}) {
  const catalog = opts.catalog || loadSynergyCatalog();
  const parts = partsForActor(actor, catalog);
  if (parts.size === 0) return [];
  const out = [];
  for (const syn of catalog.synergies) {
    if (!syn || !syn.id) continue;
    const required = Array.isArray(syn.when_all) ? syn.when_all : [];
    if (required.length === 0) continue;
    const allMatch = required.every((req) => parts.has(req));
    if (allMatch) {
      out.push({ id: syn.id, name: syn.name || syn.id, effect: syn.effect || null });
    }
  }
  return out;
}

function effectFor(synergy) {
  if (synergy && synergy.effect && Number.isFinite(synergy.effect.bonus_damage)) {
    return { bonus_damage: Math.max(0, Math.floor(synergy.effect.bonus_damage)) };
  }
  return { bonus_damage: DEFAULT_BONUS_DAMAGE };
}

/**
 * Rileva se l'attacco corrente trigghera una o più synergy per l'attaccante.
 * Cooldown: max 1 fire / actor / round (lookup turn in session._synergy_last_fire).
 * NON muta session — record separato via `recordSynergyFire`.
 */
function detectSynergyTrigger(session, actor, target, opts = {}) {
  const empty = { triggered: false, synergies: [], bonus_damage: 0 };
  if (!actor || !target) return empty;
  const turn = Number((session && session.turn) || 0);
  const lastFire =
    session && session._synergy_last_fire ? session._synergy_last_fire[actor.id] : undefined;
  if (lastFire !== undefined && lastFire === turn) return empty;
  const list = applicableSynergies(actor, opts);
  if (list.length === 0) return empty;
  let bonus = 0;
  const fired = [];
  for (const syn of list) {
    const eff = effectFor(syn);
    bonus += eff.bonus_damage || 0;
    fired.push({ id: syn.id, name: syn.name, bonus_damage: eff.bonus_damage || 0 });
  }
  return { triggered: fired.length > 0, synergies: fired, bonus_damage: bonus };
}

/**
 * Aggiorna cooldown + popola last_round_synergies. Da chiamare DOPO che
 * il damage step ha applicato il bonus, per registrare bonus_applied reale.
 */
function recordSynergyFire(session, actor, target, triggerInfo, bonusApplied) {
  if (!session || !actor) return;
  if (!session._synergy_last_fire) session._synergy_last_fire = {};
  session._synergy_last_fire[actor.id] = Number(session.turn) || 0;
  if (!Array.isArray(session.last_round_synergies)) session.last_round_synergies = [];
  if (triggerInfo && triggerInfo.triggered && target) {
    session.last_round_synergies.push({
      actor_id: String(actor.id),
      target_id: String(target.id),
      synergies: Array.isArray(triggerInfo.synergies) ? triggerInfo.synergies : [],
      bonus_damage: Number(triggerInfo.bonus_damage || 0),
      bonus_applied: Number(bonusApplied || 0),
      turn: Number(session.turn || 0),
    });
  }
}

/**
 * Reset tracker round (parallelo a resetRoundAttackTracker per focus_fire).
 * Archivia in previous_round_synergies, svuota cooldown e last_round_synergies.
 */
function resetRoundSynergyTracker(session) {
  if (!session) return;
  if (Array.isArray(session.last_round_synergies) && session.last_round_synergies.length > 0) {
    session.previous_round_synergies = session.last_round_synergies;
  }
  session.last_round_synergies = [];
  session._synergy_last_fire = {};
}

module.exports = {
  DEFAULT_BONUS_DAMAGE,
  loadSynergyCatalog,
  resetCache,
  partsForActor,
  applicableSynergies,
  effectFor,
  detectSynergyTrigger,
  recordSynergyFire,
  resetRoundSynergyTracker,
};
