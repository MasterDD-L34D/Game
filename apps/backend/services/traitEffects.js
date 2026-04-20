// SPRINT_002 fase 2 — trait engine minimo.
//
// Responsabilita':
//   1. Caricare (al boot) le definizioni meccaniche dei trait vivi da
//      data/core/traits/active_effects.yaml.
//   2. Esporre una funzione pura `evaluateAttackTraits({ ... })` che,
//      data un'azione di attacco gia' risolta, ritorna:
//        - trait_effects: array di { trait, triggered, effect } per il log
//        - damage_modifier: intero da applicare al danno base (positivo
//          aumenta, negativo riduce)
//
// Trait gestiti oggi:
//   - zampe_a_molla (actor): mos >= 5 AND attacker sopraelevato -> +1 danno
//   - pelle_elastomera (target): ogni hit -> -1 danno (min 0)
//
// Trait non definiti nel YAML vengono ignorati silenziosamente: il log
// continuera' a contenere `{ trait, triggered: false, effect: "none" }`
// solo se la lista dei trait dell'attore/target contiene un id non
// definito, cosi' la pipeline di analytics puo' tracciare la gap.

const fs = require('node:fs');
const path = require('node:path');
const yaml = require('js-yaml');

const DEFAULT_REGISTRY_PATH = path.resolve(
  __dirname,
  '..',
  '..',
  '..',
  'data',
  'core',
  'traits',
  'active_effects.yaml',
);

// M11 pilot (ADR-2026-04-21c, issue #1674) — trait environmental costs.
// YAML pilot 4 trait × 3 biomi, 12 cell, stat delta ±1/±2. Session-scoped
// compute (no Prisma, no new economy channel).
const BIOME_COST_DEFAULT_PATH = path.resolve(
  __dirname,
  '..',
  '..',
  '..',
  'data',
  'core',
  'balance',
  'trait_environmental_costs.yaml',
);

const BIOME_COST_STATS_ALLOWED = new Set(['attack_mod', 'defense_mod', 'mobility']);

let _biomeCostCache = null;

function loadActiveTraitRegistry(yamlPath = DEFAULT_REGISTRY_PATH, logger = console) {
  try {
    const text = fs.readFileSync(yamlPath, 'utf8');
    const parsed = yaml.load(text);
    const traits = parsed && typeof parsed === 'object' ? parsed.traits || {} : {};
    const count = Object.keys(traits).length;
    logger.log(`[trait-effects] ${count} trait attivi caricati da ${yamlPath}`);
    return traits;
  } catch (err) {
    if (err && err.code === 'ENOENT') {
      logger.warn(`[trait-effects] ${yamlPath} non trovato, trait engine in modalita' no-op`);
      return {};
    }
    logger.warn(`[trait-effects] errore caricamento ${yamlPath}:`, err.message || err);
    return {};
  }
}

// Convenzione "posizione_sopraelevata": dato che la griglia 6x6 e' 2D,
// consideriamo l'attaccante "sopraelevato" se la sua y e' strettamente
// maggiore di quella del target (convention proxy per terreno sopraelevato,
// documentata in data/core/traits/active_effects.yaml).
function isElevated(actor, target) {
  if (!actor || !target || !actor.position || !target.position) return false;
  return Number(actor.position.y) > Number(target.position.y);
}

function manhattan(a, b) {
  if (!a || !b) return 0;
  return Math.abs(Number(a.x) - Number(b.x)) + Math.abs(Number(a.y) - Number(b.y));
}

function isMelee(actor, target) {
  if (!actor?.position || !target?.position) return false;
  return manhattan(actor.position, target.position) === 1;
}

// Valida i trigger che NON dipendono dallo stato post-attack
// (on_result, min_mos, requires). Ritorna true se tutti i check
// statici passano, false se uno blocca.
function passesBasicTriggers(trigger, actor, target, attackResult) {
  if (trigger.action_type && trigger.action_type !== 'attack') return false;
  if (trigger.on_result === 'hit' && !attackResult.hit) return false;
  if (trigger.on_result === 'miss' && attackResult.hit) return false;
  if (Number.isFinite(trigger.min_mos) && attackResult.mos < trigger.min_mos) return false;
  if (trigger.requires === 'posizione_sopraelevata' && !isElevated(actor, target)) return false;
  if (trigger.melee_only === true && !isMelee(actor, target)) return false;
  return true;
}

function evaluateSingleTrait({ traitId, definition, actor, target, attackResult, side }) {
  if (!definition) {
    return { trait: traitId, triggered: false, effect: 'none' };
  }
  const trigger = definition.trigger || {};
  if (!passesBasicTriggers(trigger, actor, target, attackResult)) {
    return { trait: traitId, triggered: false, effect: 'none' };
  }
  // Status traits hanno un trigger aggiuntivo on_kill che richiede
  // il contesto post-attack — questi sono gestiti in evaluateStatusTraits.
  // Qui skip per non loggare false positive.
  const effect = definition.effect || {};
  if (effect.kind === 'apply_status') {
    return { trait: traitId, triggered: false, effect: 'deferred_status' };
  }

  const logTag = effect.log_tag || definition.id || traitId;

  if (effect.kind === 'extra_damage' && side === 'actor') {
    const amount = Number(effect.amount) || 0;
    return {
      trait: traitId,
      triggered: true,
      effect: logTag,
      damage_delta: amount,
    };
  }

  if (effect.kind === 'damage_reduction' && side === 'target') {
    const amount = Number(effect.amount) || 0;
    return {
      trait: traitId,
      triggered: true,
      effect: logTag,
      damage_delta: -amount,
    };
  }

  return { trait: traitId, triggered: false, effect: 'none' };
}

function evaluateAttackTraits({ registry, actor, target, attackResult }) {
  const traitEffects = [];
  let damageModifier = 0;

  const actorTraits = Array.isArray(actor?.traits) ? actor.traits : [];
  for (const traitId of actorTraits) {
    const definition = registry ? registry[traitId] : null;
    const applies = definition?.applies_to || 'actor';
    if (applies !== 'actor') continue;
    const evaluation = evaluateSingleTrait({
      traitId,
      definition,
      actor,
      target,
      attackResult,
      side: 'actor',
    });
    if (evaluation.triggered && Number.isFinite(evaluation.damage_delta)) {
      damageModifier += evaluation.damage_delta;
    }
    traitEffects.push({
      trait: evaluation.trait,
      triggered: evaluation.triggered,
      effect: evaluation.effect,
    });
  }

  const targetTraits = Array.isArray(target?.traits) ? target.traits : [];
  for (const traitId of targetTraits) {
    const definition = registry ? registry[traitId] : null;
    const applies = definition?.applies_to || 'actor';
    if (applies !== 'target') continue;
    const evaluation = evaluateSingleTrait({
      traitId,
      definition,
      actor,
      target,
      attackResult,
      side: 'target',
    });
    if (evaluation.triggered && Number.isFinite(evaluation.damage_delta)) {
      damageModifier += evaluation.damage_delta;
    }
    traitEffects.push({
      trait: evaluation.trait,
      triggered: evaluation.triggered,
      effect: evaluation.effect,
    });
  }

  return { trait_effects: traitEffects, damage_modifier: damageModifier };
}

// SPRINT_018: valutazione dei trait che applicano stati emotivi al termine
// di un attacco. Chiamato da performAttack DOPO l'applicazione del danno,
// cosi' i trigger possono dipendere da `killOccurred` (on_kill) oltre che
// dai check basic (on_result, min_mos, melee_only, ecc.).
//
// Ritorna:
//   {
//     trait_effects: [ { trait, triggered, effect } ... ]   // per il log
//     status_applies: [ { trait, target_side, stato, turns, log_tag } ]
//   }
//
// Il caller (session.js performAttack) itera su status_applies e muta
// actor.status / target.status di conseguenza.
function evaluateStatusTraits({ registry, actor, target, attackResult, killOccurred }) {
  const traitEffects = [];
  const statusApplies = [];

  const processTraits = (unitTraits, appliesToSide) => {
    for (const traitId of unitTraits || []) {
      const definition = registry ? registry[traitId] : null;
      if (!definition) continue;
      const applies = definition.applies_to || 'actor';
      if (applies !== appliesToSide) continue;
      const effect = definition.effect || {};
      if (effect.kind !== 'apply_status') continue;

      const trigger = definition.trigger || {};
      // Check basic triggers
      if (!passesBasicTriggers(trigger, actor, target, attackResult)) {
        traitEffects.push({ trait: traitId, triggered: false, effect: 'none' });
        continue;
      }
      // Post-attack trigger: on_kill
      if (trigger.on_kill === true && !killOccurred) {
        traitEffects.push({ trait: traitId, triggered: false, effect: 'none' });
        continue;
      }
      // Passed all checks — trait si attiva
      const logTag = effect.log_tag || traitId;
      statusApplies.push({
        trait: traitId,
        target_side: effect.target_side || 'target',
        stato: effect.stato,
        turns: Number(effect.turns) || 1,
        log_tag: logTag,
      });
      traitEffects.push({ trait: traitId, triggered: true, effect: logTag });
    }
  };

  processTraits(actor?.traits, 'actor');
  processTraits(target?.traits, 'target');

  return { trait_effects: traitEffects, status_applies: statusApplies };
}

// M11 pilot (ADR-2026-04-21c, issue #1674) — biome penalty loader.
// Carica `trait_environmental_costs.yaml` (4 trait × 3 biomi = 12 cell).
// Cache singleton: chiamate successive ritornano cached (idempotent).
// Soft-fail su ENOENT → registry vuoto, biome penalty no-op.
function loadTraitEnvironmentalCosts(yamlPath = BIOME_COST_DEFAULT_PATH, logger = console) {
  if (_biomeCostCache !== null) return _biomeCostCache;
  try {
    const text = fs.readFileSync(yamlPath, 'utf8');
    const parsed = yaml.load(text);
    _biomeCostCache = parsed && typeof parsed === 'object' ? parsed : {};
    return _biomeCostCache;
  } catch (err) {
    if (err && err.code === 'ENOENT') {
      logger.warn(`[trait-env-costs] ${yamlPath} non trovato, biome penalty no-op`);
      _biomeCostCache = {};
      return _biomeCostCache;
    }
    logger.warn(`[trait-env-costs] errore ${yamlPath}:`, err.message || err);
    _biomeCostCache = {};
    return _biomeCostCache;
  }
}

// Reset cache (per test isolation).
function _resetBiomeCostCache() {
  _biomeCostCache = null;
}

// Applica penalty/bonus biome-specific a unit.attack_mod_bonus /
// unit.defense_mod_bonus / unit.mobility basato su trait × biome_id.
//
// Mutates `unit` in place. Idempotent via marker `_biome_costs_applied`:
// chiamate ripetute su stessa unit sono no-op. Per rebase (hot-swap biome)
// il caller deve resettare il marker esplicitamente.
//
// @param unit — { traits: [], mod, attack_mod_bonus, defense_mod_bonus, mobility, ... }
// @param biomeId — 'savana' | 'caverna_risonante' | 'rovine_planari' | ...
// @param data — optional pre-loaded registry (dependency injection per test)
// @returns array { trait, biome, delta: { stat: n, ... } } applied per log.
function applyBiomeTraitCosts(unit, biomeId, data) {
  if (!unit || !biomeId) return [];
  if (unit._biome_costs_applied) return [];
  const registry = data || loadTraitEnvironmentalCosts();
  const traitCosts = registry && registry.trait_costs ? registry.trait_costs : null;
  if (!traitCosts) return [];

  const unitTraits = Array.isArray(unit.traits) ? unit.traits : [];
  const applied = [];

  for (const traitId of unitTraits) {
    const traitEntry = traitCosts[traitId];
    if (!traitEntry) continue;
    const cell = traitEntry[biomeId];
    // Cell vuota (biome neutral per questo trait) → skip, no delta.
    if (!cell || typeof cell !== 'object' || Object.keys(cell).length === 0) continue;

    const delta = {};
    for (const [stat, rawValue] of Object.entries(cell)) {
      if (stat === 'rationale') continue;
      if (!BIOME_COST_STATS_ALLOWED.has(stat)) continue;
      const n = Number(rawValue);
      if (!Number.isFinite(n) || n === 0) continue;

      if (stat === 'attack_mod') {
        unit.attack_mod_bonus = Number(unit.attack_mod_bonus || 0) + n;
      } else if (stat === 'defense_mod') {
        unit.defense_mod_bonus = Number(unit.defense_mod_bonus || 0) + n;
      } else if (stat === 'mobility') {
        unit.mobility = Number(unit.mobility || 0) + n;
      }
      delta[stat] = n;
    }

    if (Object.keys(delta).length > 0) {
      applied.push({ trait: traitId, biome: biomeId, delta });
    }
  }

  unit._biome_costs_applied = true;
  unit._biome_costs_log = applied;
  return applied;
}

module.exports = {
  loadActiveTraitRegistry,
  evaluateAttackTraits,
  evaluateStatusTraits,
  isElevated,
  DEFAULT_REGISTRY_PATH,
  // M11 pilot — biome penalty
  loadTraitEnvironmentalCosts,
  applyBiomeTraitCosts,
  BIOME_COST_DEFAULT_PATH,
  _resetBiomeCostCache,
};
