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

function evaluateSingleTrait({ traitId, definition, actor, target, attackResult, side }) {
  if (!definition) {
    return { trait: traitId, triggered: false, effect: 'none' };
  }
  const trigger = definition.trigger || {};
  if (trigger.action_type && trigger.action_type !== 'attack') {
    return { trait: traitId, triggered: false, effect: 'none' };
  }
  if (trigger.on_result === 'hit' && !attackResult.hit) {
    return { trait: traitId, triggered: false, effect: 'none' };
  }
  if (trigger.on_result === 'miss' && attackResult.hit) {
    return { trait: traitId, triggered: false, effect: 'none' };
  }
  if (Number.isFinite(trigger.min_mos) && attackResult.mos < trigger.min_mos) {
    return { trait: traitId, triggered: false, effect: 'none' };
  }
  if (trigger.requires === 'posizione_sopraelevata' && !isElevated(actor, target)) {
    return { trait: traitId, triggered: false, effect: 'none' };
  }

  const effect = definition.effect || {};
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

module.exports = {
  loadActiveTraitRegistry,
  evaluateAttackTraits,
  isElevated,
  DEFAULT_REGISTRY_PATH,
};
