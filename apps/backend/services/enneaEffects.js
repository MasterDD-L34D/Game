// P4: Ennea theme effects activation.
//
// Quando un archetipo Ennea viene triggerato nel VC snapshot,
// questo modulo applica gli effetti in-game corrispondenti.
// Effetti sono buff/debuff temporanei applicati all'actor.
//
// Integrazione: chiamato alla fine di ogni round dal round bridge,
// dopo il VC snapshot aggiornato.

'use strict';

/**
 * Mappa Ennea archetype → combat buff/debuff.
 * Effetti conservativi — baseline per playtest.
 */
const ENNEA_EFFECTS = {
  'Conquistatore(3)': {
    label: 'Pressione Coordinata',
    buffs: [{ stat: 'attack_mod', amount: 1, duration: 1 }],
    description: 'Bonus attacco per aggressivita sostenuta',
  },
  'Coordinatore(2)': {
    label: 'Sinergia di Squadra',
    buffs: [{ stat: 'defense_mod', amount: 1, duration: 1 }],
    description: 'Bonus difesa per coesione team',
  },
  'Esploratore(7)': {
    label: 'Rotte Opzionali',
    buffs: [{ stat: 'move_bonus', amount: 1, duration: 1 }],
    description: 'Bonus movimento per esplorazione attiva',
  },
  'Architetto(5)': {
    label: 'Setup Tattico',
    buffs: [{ stat: 'attack_mod', amount: 1, duration: 1 }],
    description: 'Bonus attacco per preparazione meticolosa',
  },
  'Stoico(9)': {
    label: 'Equilibrio Interiore',
    buffs: [{ stat: 'stress_reduction', amount: 0.05, duration: 1 }],
    description: 'Riduzione stress per stabilita emotiva',
  },
  'Cacciatore(8)': {
    label: 'Mordi e Fuggi',
    buffs: [{ stat: 'evasion_bonus', amount: 1, duration: 1 }],
    description: 'Bonus evasione per tattica hit-and-run',
  },
};

/**
 * Dato un array di ennea archetypes triggerati, restituisce gli effetti da applicare.
 *
 * @param {string[]} activeArchetypes — es. ["Conquistatore(3)", "Stoico(9)"]
 * @returns {Array<{archetype: string, label: string, buffs: object[]}>}
 */
function resolveEnneaEffects(activeArchetypes = []) {
  const effects = [];
  for (const archId of activeArchetypes) {
    const def = ENNEA_EFFECTS[archId];
    if (def) {
      effects.push({
        archetype: archId,
        label: def.label,
        buffs: def.buffs,
      });
    }
  }
  return effects;
}

/**
 * Applica ennea buff a un actor (muta in place).
 * Aggiunge a actor.buffs[] come buff temporanei.
 */
function applyEnneaBuffs(actor, effects) {
  if (!actor || !effects || effects.length === 0) return;
  if (!actor.buffs) actor.buffs = [];
  for (const effect of effects) {
    for (const buff of effect.buffs || []) {
      actor.buffs.push({
        source: `ennea:${effect.archetype}`,
        stat: buff.stat,
        amount: buff.amount,
        duration: buff.duration,
      });
    }
  }
}

module.exports = {
  ENNEA_EFFECTS,
  resolveEnneaEffects,
  applyEnneaBuffs,
};
