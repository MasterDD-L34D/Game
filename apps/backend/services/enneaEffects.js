// P4: Ennea theme effects activation.
//
// Quando un archetipo Ennea viene triggerato nel VC snapshot,
// questo modulo applica gli effetti in-game corrispondenti.
// Effetti sono buff/debuff temporanei applicati all'actor.
//
// Gate 5 exemption (2026-05-05 audit): ennea effects fire into session raw
// event log (action_type='ennea_effects') — surface = vcScoring telemetry
// input + debrief MBTI/Ennea badge (vcSnapshot-driven). Dedicated in-combat
// HUD panel for ennea effect visualization deferred to P4 sprint.
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
  // P4 9/9 coverage extension (2026-04-25, branch feat/p4-ennea-9-of-9-coverage):
  // Type 1 / 4 / 6 wire. Tutti e 3 mechanical (attack_mod / defense_mod) per
  // massimizzare runtime impact. Trigger basati su raw metrics derivabili
  // (setup_ratio, attack_hit_rate, low_hp_time, assists, damage_taken_ratio).
  'Riformatore(1)': {
    label: 'Disciplina Etica',
    buffs: [{ stat: 'attack_mod', amount: 1, duration: 1 }],
    description:
      'Bonus attacco per attacchi metodici e precisi (high setup_ratio + attack_hit_rate)',
  },
  'Individualista(4)': {
    label: 'Profondita Emotiva',
    buffs: [{ stat: 'defense_mod', amount: 1, duration: 1 }],
    description:
      'Bonus difesa per resilienza emotiva sotto pressione (low_hp_time alto + contributo attivo)',
  },
  'Lealista(6)': {
    label: 'Vigilanza Difensiva',
    buffs: [{ stat: 'defense_mod', amount: 1, duration: 2 }],
    description:
      'Bonus difesa esteso per supporto team con anticipazione minacce (assists alti + risk basso)',
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
 *
 * 2026-05-10 dedup logic (audit cross-domain BACKLOG TKT-ENNEA-1-5-DOUBLE-TRIGGER):
 * quando multipli archetype Ennea co-fire e targetano stessa stat (es.
 * Riformatore(1)+Architetto(5) entrambi attack_mod +1), buff
 * stackavano linearmente → +2 attack_mod doppio buff non intended.
 * Fix: dedup per-stat, mantenere SOLO buff più forte per ogni stat
 * tra tutti gli ennea source attivi. Preserve per-archetype trail
 * via `source` field per debug; consumer runtime usa primo entry per stat.
 * Tie-break: quando amounts uguali, vince il buff con duration più alta
 * (es. Lealista duration=2 vince su Coordinatore duration=1).
 */
function applyEnneaBuffs(actor, effects) {
  if (!actor || !effects || effects.length === 0) return;
  if (!actor.buffs) actor.buffs = [];
  const bestPerStat = new Map();
  for (const effect of effects) {
    for (const buff of effect.buffs || []) {
      const existing = bestPerStat.get(buff.stat);
      const candidate = {
        source: `ennea:${effect.archetype}`,
        stat: buff.stat,
        amount: buff.amount,
        duration: buff.duration,
      };
      const newAmt = buff.amount || 0;
      const newDur = buff.duration || 1;
      const beats =
        !existing ||
        newAmt > (existing.amount || 0) ||
        (newAmt === (existing.amount || 0) && newDur > (existing.duration || 1));
      if (beats) {
        bestPerStat.set(buff.stat, candidate);
      }
    }
  }
  for (const dedupedBuff of bestPerStat.values()) {
    actor.buffs.push(dedupedBuff);
  }
}

/**
 * Stat → mappatura runtime consumer.
 * - 'mechanical': stat consumato live in resolveAttack / resolveX.
 *   Pattern: increment actor[<stat>_bonus] + set status[<stat>_buff].
 *   Decay loop in sessionRoundBridge.applyEndOfRoundSideEffects azzera
 *   bonus quando _buff scende a 0.
 * - 'log_only': stat dichiarato canonical ma nessun consumer runtime.
 *   Loggato per audit trail, NON applicato.
 *
 * 9/9 mechanical wire (audit P4 follow-up "3 stat consumer wire", branch
 * feat/stat-consumer-wire-move-stress-evasion):
 *   - move_bonus: extends per-round move budget in validatePlayerIntent
 *     (sessionRoundBridge line ~161). dist <= apAvail + move_bonus_bonus.
 *   - stress_reduction: scales damage_taken increment in sgTracker.accumulate
 *     (combat/sgTracker.js). adjusted = max(0, taken*(1-min(0.5,bonus))).
 *   - evasion_bonus: adds to target DC in resolveAttack + predictCombat
 *     (sessionHelpers line ~153/178). dc = baseDc + defense_mod_bonus +
 *     evasion_bonus_bonus.
 */
const STAT_RUNTIME_KIND = {
  attack_mod: 'mechanical',
  defense_mod: 'mechanical',
  evasion_bonus: 'mechanical',
  move_bonus: 'mechanical',
  stress_reduction: 'mechanical',
};

/**
 * Applica ennea effects come (bonus + status_buff) coerenti col decay loop
 * esistente in sessionRoundBridge.applyEndOfRoundSideEffects.
 *
 * Per stat 'mechanical' (attack_mod, defense_mod):
 *   - actor[<stat>_bonus] += amount   ← consumato live in resolveAttack
 *   - actor.status[<stat>_buff] = max(corrente, duration)  ← stacking-safe
 * Decay automatico: prossimo end-of-round, decay decrementa _buff a 0,
 * poi bonus-zero loop azzera <stat>_bonus. Buff persiste 1 round.
 *
 * Per stat 'log_only' (evasion_bonus, move_bonus, stress_reduction):
 *   - skip mutazione, ritorna in skipped[] con reason='no_consumer'.
 *
 * @param {object} actor — unit oggetto; muta in place
 * @param {Array<{archetype, label, buffs}>} effects — output di resolveEnneaEffects
 * @returns {{applied: Array, skipped: Array}}
 */
function applyEnneaToStatus(actor, effects) {
  const applied = [];
  const skipped = [];
  if (!actor || !Array.isArray(effects) || effects.length === 0) {
    return { applied, skipped };
  }
  // KO units skip — mirror applyTurnRegen pattern.
  if (Number(actor.hp || 0) <= 0) {
    for (const effect of effects) {
      for (const buff of effect.buffs || []) {
        skipped.push({
          archetype: effect.archetype,
          stat: buff.stat,
          reason: 'actor_ko',
        });
      }
    }
    return { applied, skipped };
  }
  if (!actor.status) actor.status = {};
  // 2026-05-10 dedup logic (audit cross-domain BACKLOG TKT-ENNEA-1-5-DOUBLE-TRIGGER):
  // applyEnneaToStatus è canonical runtime path da sessionRoundBridge.
  // Quando multipli archetype Ennea co-fire e targetano stessa stat
  // (es. Riformatore(1)+Architetto(5) entrambi attack_mod +1), bonus
  // stackava linearmente → +2 attack_mod doppio buff non intended.
  // Dedup pre-apply: per ogni stat, mantenere SOLO buff più forte
  // (highest amount, tie-break by duration). Source archetype preservato.
  const bestPerStat = new Map();
  for (const effect of effects) {
    for (const buff of effect.buffs || []) {
      const existing = bestPerStat.get(buff.stat);
      const newAmt = Number(buff.amount) || 0;
      const newDur = Number(buff.duration) || 1;
      const beats =
        !existing ||
        newAmt > (Number(existing.buff.amount) || 0) ||
        (newAmt === (Number(existing.buff.amount) || 0) &&
          newDur > (Number(existing.buff.duration) || 1));
      if (beats) {
        bestPerStat.set(buff.stat, { effect, buff });
      }
    }
  }
  // Skip-track tutti i buff scartati da dedup come superseded per audit.
  for (const effect of effects) {
    for (const buff of effect.buffs || []) {
      const winner = bestPerStat.get(buff.stat);
      if (!winner || winner.effect !== effect || winner.buff !== buff) {
        skipped.push({
          archetype: effect.archetype,
          stat: buff.stat,
          amount: Number(buff.amount) || 0,
          duration: Number(buff.duration) || 1,
          reason: 'dedup_superseded',
        });
      }
    }
  }
  for (const { effect, buff } of bestPerStat.values()) {
    const stat = buff.stat;
    const amount = Number(buff.amount) || 0;
    const duration = Number(buff.duration) || 1;
    const kind = STAT_RUNTIME_KIND[stat] || 'log_only';
    if (kind === 'mechanical') {
      const bonusKey = `${stat}_bonus`;
      const buffKey = `${stat}_buff`;
      actor[bonusKey] = (Number(actor[bonusKey]) || 0) + amount;
      actor.status[buffKey] = Math.max(Number(actor.status[buffKey]) || 0, duration);
      applied.push({
        archetype: effect.archetype,
        stat,
        amount,
        duration,
        bonus_after: actor[bonusKey],
      });
    } else {
      skipped.push({
        archetype: effect.archetype,
        stat,
        amount,
        duration,
        reason: 'no_consumer',
      });
    }
  }
  return { applied, skipped };
}

module.exports = {
  ENNEA_EFFECTS,
  STAT_RUNTIME_KIND,
  resolveEnneaEffects,
  applyEnneaBuffs,
  applyEnneaToStatus,
};
