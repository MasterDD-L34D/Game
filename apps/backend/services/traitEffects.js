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

// Sprint γ Tech Baseline (Frostpunk pattern §5) — dirty flag fast path.
// Cached evaluateAttackTraits result reused se actor+target traits non sono
// mutati. Cache key per attack-result hash. Soft-fail safe (always recompute
// se cache miss o invalid input).
const dirtyFlagTracker = require('./perf/dirtyFlagTracker');

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

// Per-tag enemy gate (audit follow-up 2026-04-25) — wires runtime-inert
// ancestor traits gated by enemy taxonomy: predator / irascible / wildlife.
// Source files: data/core/species.yaml + data/core/species_expansion.yaml
// (clade_tag + role_tags). Lazy-cached singleton, soft-fail su ENOENT.
const SPECIES_DEFAULT_PATHS = [
  path.resolve(__dirname, '..', '..', '..', 'data', 'core', 'species.yaml'),
  path.resolve(__dirname, '..', '..', '..', 'data', 'core', 'species_expansion.yaml'),
];

const PREDATOR_ROLE_TAGS = new Set(['predator', 'apex', 'ambusher']);
let _speciesTagIndexCache = null;

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

function hasAllyAdjacent(actor, allUnits) {
  if (!actor?.position || !Array.isArray(allUnits)) return false;
  const side = actor.controlled_by;
  for (const u of allUnits) {
    if (!u || u === actor || u.id === actor.id) continue;
    if (u.controlled_by !== side) continue;
    if ((u.hp?.current ?? u.hp ?? 0) <= 0) continue;
    if (!u.position) continue;
    if (manhattan(actor.position, u.position) === 1) return true;
  }
  return false;
}

function hasTargetStatus(target, statusName) {
  if (!target || !statusName) return false;
  const status = target.status || {};
  const entry = status[statusName];
  if (!entry) return false;
  if (typeof entry === 'object' && Number.isFinite(entry.turns)) return entry.turns > 0;
  return Boolean(entry);
}

// 2026-05-14 OD-024 ai-station — actor status gate for interoception traits
// (nocicezione `requires: ferito`). Symmetric to hasTargetStatus but checks
// actor.status. RFC sentience v0.1 interoception_trait `ferito` = canonical
// status name in Game/ status system.
function hasActorStatus(actor, statusName) {
  if (!actor || !statusName) return false;
  const status = actor.status || {};
  // Support both Dict pattern (status[name] = entry) AND Array pattern
  // (status = ['ferito', 'stordito']) for back-compat across call sites.
  if (Array.isArray(status)) {
    return status.includes(statusName);
  }
  const entry = status[statusName];
  if (!entry) return false;
  if (typeof entry === 'object' && Number.isFinite(entry.turns)) return entry.turns > 0;
  return Boolean(entry);
}

// Per-tag enemy gate — carica species.yaml + species_expansion.yaml e
// costruisce indice { species_id: { clade_tag, role_tags: Set } }.
// Lazy + cached. Soft-fail: file mancante → indice vuoto, gate ritorna
// `wildlife` come default conservativo.
function loadSpeciesTagIndex(yamlPaths = SPECIES_DEFAULT_PATHS, logger = console) {
  if (_speciesTagIndexCache !== null) return _speciesTagIndexCache;
  const index = Object.create(null);
  for (const yamlPath of yamlPaths) {
    try {
      const text = fs.readFileSync(yamlPath, 'utf8');
      const parsed = yaml.load(text);
      // Top-level key varia: species.yaml usa `species`, species_expansion.yaml
      // usa `species_examples`. Accetta entrambe.
      const list =
        parsed && Array.isArray(parsed.species)
          ? parsed.species
          : parsed && Array.isArray(parsed.species_examples)
            ? parsed.species_examples
            : [];
      for (const sp of list) {
        if (!sp || !sp.id) continue;
        const roleTags = Array.isArray(sp.role_tags)
          ? sp.role_tags.map((t) => String(t).toLowerCase())
          : [];
        index[sp.id] = {
          clade_tag: sp.clade_tag || null,
          role_tags: new Set(roleTags),
        };
      }
    } catch (err) {
      if (err && err.code === 'ENOENT') {
        logger.warn(`[enemy-tag-gate] ${yamlPath} non trovato, skip`);
        continue;
      }
      logger.warn(`[enemy-tag-gate] errore ${yamlPath}:`, err.message || err);
    }
  }
  _speciesTagIndexCache = index;
  return _speciesTagIndexCache;
}

function _resetSpeciesTagIndexCache() {
  _speciesTagIndexCache = null;
}

// Inferisce i tag enemy ('predator' | 'irascible' | 'wildlife') del target
// basandosi su species + clade_tag + role_tags. Tassonomia:
//   - predator: role_tags include predator/apex/ambusher OR clade_tag=Apex
//   - irascible: clade_tag=Threat AND role_tags presenti AND non predator
//                (es. [threat, forager], [threat, omnivore])
//   - wildlife: tutto il resto fra organici (Bridge/Keystone/Support, o
//     Threat senza role_tags). Default conservativo se species ignota.
//
// Ritorna sempre un array (mai null). Multi-tag possibile (un Apex predator
// e' solo 'predator'; un Threat ambiguo puo' essere predator+wildlife).
function inferEnemyTags(target, index = null) {
  if (!target || !target.species) return ['wildlife'];
  const idx = index || loadSpeciesTagIndex();
  const entry = idx[target.species];
  if (!entry) return ['wildlife'];
  const tags = new Set();
  const clade = entry.clade_tag;
  const roles = entry.role_tags || new Set();

  let isPredator = false;
  for (const r of roles) {
    if (PREDATOR_ROLE_TAGS.has(r)) {
      isPredator = true;
      break;
    }
  }
  if (!isPredator && clade === 'Apex') isPredator = true;
  if (isPredator) tags.add('predator');

  // Irascible: Threat clade NON predator, con role_tags non-predator
  // (forager, omnivore, ecc.). Conservativo: richiede role_tags.
  if (!isPredator && clade === 'Threat' && roles.size > 0) {
    tags.add('irascible');
  }

  // Wildlife: organici non classificati (Bridge/Keystone/Support, o Threat
  // senza role_tags fallback). Esclude Playable.
  if (!tags.size && clade && clade !== 'Playable') {
    tags.add('wildlife');
  }

  // Fallback conservativo: nessun match → wildlife
  if (!tags.size) tags.add('wildlife');
  return Array.from(tags);
}

// Valida i trigger che NON dipendono dallo stato post-attack
// (on_result, min_mos, requires). Ritorna true se tutti i check
// statici passano, false se uno blocca.
function passesBasicTriggers(trigger, actor, target, attackResult, ctx = {}) {
  if (trigger.action_type && trigger.action_type !== 'attack') return false;
  if (trigger.on_result === 'hit' && !attackResult.hit) return false;
  if (trigger.on_result === 'miss' && attackResult.hit) return false;
  if (Number.isFinite(trigger.min_mos) && attackResult.mos < trigger.min_mos) return false;
  if (trigger.requires === 'posizione_sopraelevata' && !isElevated(actor, target)) return false;
  // 2026-05-14 OD-024 ai-station — actor-status gate for interoception trait
  // nocicezione (`requires: ferito`). Generic predicate: when `requires` is
  // not a recognized positional/contextual gate, treat as actor status name.
  // Conservative whitelist: only `ferito` recognized to avoid silently
  // matching arbitrary strings. Phase B3 may extend to other status names.
  if (trigger.requires === 'ferito' && !hasActorStatus(actor, 'ferito')) return false;
  if (trigger.melee_only === true && !isMelee(actor, target)) return false;
  if (trigger.requires_ally_adjacent === true && !hasAllyAdjacent(actor, ctx.allUnits))
    return false;
  if (
    typeof trigger.requires_target_status === 'string' &&
    !hasTargetStatus(target, trigger.requires_target_status)
  )
    return false;
  if (typeof trigger.requires_target_tag === 'string') {
    const tags = inferEnemyTags(target, ctx.speciesTagIndex || null);
    if (!tags.includes(trigger.requires_target_tag)) return false;
  }
  if (typeof trigger.requires_actor_tag === 'string') {
    const tags = inferEnemyTags(actor, ctx.speciesTagIndex || null);
    if (!tags.includes(trigger.requires_actor_tag)) return false;
  }
  return true;
}

function evaluateSingleTrait({ traitId, definition, actor, target, attackResult, side, ctx = {} }) {
  if (!definition) {
    return { trait: traitId, triggered: false, effect: 'none' };
  }
  const trigger = definition.trigger || {};
  if (!passesBasicTriggers(trigger, actor, target, attackResult, ctx)) {
    return { trait: traitId, triggered: false, effect: 'none' };
  }
  // Status traits hanno un trigger aggiuntivo on_kill che richiede
  // il contesto post-attack — questi sono gestiti in evaluateStatusTraits.
  // Qui skip per non loggare false positive.
  const effect = definition.effect || {};
  if (effect.kind === 'apply_status') {
    return { trait: traitId, triggered: false, effect: 'deferred_status' };
  }
  // 2026-05-10 audit cross-domain BACKLOG TKT-TRAIT-EFFECT-KIND-MISS:
  // persistent_marker (es. wounded_perma) è handled da dedicated service
  // apps/backend/services/combat/woundedPerma.js — NON dispatch via attack
  // pipeline. Recognize esplicitamente per chiudere gap Engine LIVE /
  // attack-handler MISS. Trait apply happens runtime via session.js
  // session.lastMissionWoundedPerma map + woundedPerma.applyWound.
  if (effect.kind === 'persistent_marker') {
    return { trait: traitId, triggered: false, effect: 'deferred_marker' };
  }
  // 2026-05-10 reactive ally-attack traits (legame_di_branco / pack_tactics
  // / spirito_combattivo) NON hanno effect.kind blocco, usano top-level
  // triggers_on_ally_attack data. Handler dedicato:
  // apps/backend/services/combat/beastBondReaction.js (post-attack reactor).
  // Recognize qui per chiudere "unknown effect.kind" audit false positive.
  if (definition.triggers_on_ally_attack) {
    return { trait: traitId, triggered: false, effect: 'deferred_ally_attack_react' };
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

  // 2026-05-14 OD-024 ai-station — attack_bonus kind for interoception trait
  // propriocezione (RFC sentience v0.1). Behaviorally equivalent to
  // extra_damage on the actor's own attack: +amount damage_delta on hit.
  // Distinct kind name preserves design semantic (proprioception → balance
  // boost on attack, not raw "extra damage"). Phase B3 may differentiate
  // when fold into vc_scoring conviction axis.
  if (effect.kind === 'attack_bonus' && side === 'actor') {
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

  // 2026-05-10 TKT-TRAIT-HEAL-HANDLER (verdict #C2 = B new heal handler).
  // Heal kind canonical wired runtime: actor restores hp post-action.
  // Pattern: amount = hp restored, dice = "1d4+2" optional alternative.
  // Side: actor (self-heal). Trigger.action_type defines when (passive,
  // melee_attack, etc). Returns hp_delta positive marker; consumer in
  // session.js applies hp restore + cap to max_hp.
  if (effect.kind === 'heal' && side === 'actor') {
    const baseAmount = Number(effect.amount) || 0;
    let healAmount = baseAmount;
    // Optional dice expression (es. "1d4+2") — RNG-driven heal.
    if (typeof effect.dice === 'string' && /^\d+d\d+(\+\d+)?$/.test(effect.dice)) {
      const match = effect.dice.match(/^(\d+)d(\d+)(?:\+(\d+))?$/);
      if (match) {
        const numDice = Number(match[1]);
        const sides = Number(match[2]);
        const bonus = Number(match[3] || 0);
        let roll = 0;
        for (let i = 0; i < numDice; i += 1) {
          roll += Math.floor((ctx?.rng ? ctx.rng() : Math.random()) * sides) + 1;
        }
        healAmount = roll + bonus;
      }
    }
    return {
      trait: traitId,
      triggered: true,
      effect: logTag,
      hp_delta: healAmount,
    };
  }

  return { trait: traitId, triggered: false, effect: 'none' };
}

function evaluateAttackTraits({ registry, actor, target, attackResult, allUnits = [] }) {
  // Sprint γ — dirty flag fast path (Frostpunk §5).
  // Skip recompute se actor.traits e target.traits non dirty AND cache exists.
  // Cache key tied to result + mos (granular invalidation).
  const cacheKey = `${attackResult?.result || 'na'}_${attackResult?.mos ?? 0}`;
  const actorClean =
    actor && !dirtyFlagTracker.isDirty(actor, 'traits') && actor._trait_eval_cache?.[cacheKey];
  const targetClean =
    target && !dirtyFlagTracker.isDirty(target, 'traits') && target._trait_eval_cache?.[cacheKey];
  if (actorClean && targetClean) {
    return {
      trait_effects: [...actorClean.trait_effects, ...targetClean.trait_effects],
      damage_modifier: actorClean.damage_modifier + targetClean.damage_modifier,
      _cache_hit: true,
    };
  }

  const traitEffects = [];
  let damageModifier = 0;
  const ctx = { allUnits };

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
      ctx,
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
      ctx,
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
function evaluateStatusTraits({
  registry,
  actor,
  target,
  attackResult,
  killOccurred,
  allUnits = [],
}) {
  const traitEffects = [];
  const statusApplies = [];
  const ctx = { allUnits };

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
      if (!passesBasicTriggers(trigger, actor, target, attackResult, ctx)) {
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

/**
 * Evaluate movement-triggered buff_stat traits for a unit.
 *
 * Handles traits with trigger.action_type === 'movement' and
 * effect.kind === 'buff_stat'. Currently only 'move_bonus' stat is
 * wired (reduces AP cost of movement by effect.amount per trait).
 *
 * @param {{ registry: object, actor: object }} opts
 * @returns {{ move_bonus: number, trait_effects: Array }}
 */
function evaluateMovementTraits({ registry, actor } = {}) {
  if (!registry || !actor) return { move_bonus: 0, trait_effects: [] };
  const traitIds = Array.isArray(actor.traits) ? actor.traits : [];
  let moveBonus = 0;
  const traitEffects = [];
  for (const traitId of traitIds) {
    const definition = registry[traitId];
    if (!definition) continue;
    const trigger = definition.trigger || {};
    if (trigger.action_type !== 'movement') continue;
    const effect = definition.effect || {};
    if (effect.kind !== 'buff_stat') continue;
    if (effect.stat !== 'move_bonus') continue;
    const amount = Number(effect.amount) || 0;
    if (amount <= 0) continue;
    moveBonus += amount;
    traitEffects.push({
      trait: traitId,
      triggered: true,
      effect: effect.log_tag || traitId,
      stat: 'move_bonus',
      amount,
    });
  }
  return { move_bonus: moveBonus, trait_effects: traitEffects };
}

module.exports = {
  loadActiveTraitRegistry,
  evaluateAttackTraits,
  evaluateStatusTraits,
  evaluateMovementTraits,
  isElevated,
  DEFAULT_REGISTRY_PATH,
  // M11 pilot — biome penalty
  loadTraitEnvironmentalCosts,
  applyBiomeTraitCosts,
  BIOME_COST_DEFAULT_PATH,
  _resetBiomeCostCache,
  // Per-tag enemy gate (audit follow-up 2026-04-25)
  loadSpeciesTagIndex,
  inferEnemyTags,
  SPECIES_DEFAULT_PATHS,
  _resetSpeciesTagIndexCache,
};
