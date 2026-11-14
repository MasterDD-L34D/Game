// AI War pattern: threat assessment per il Sistema.
//
// Calcola un indice di minaccia composito dagli eventi di sessione.
// L'escalation tier guida REGOLA_004_THREAT in policy.js:
//   - passive:    giocatori non attaccano → Sistema diventa aggressivo
//   - normal:     comportamento default
//   - aggressive: giocatori stanno vincendo → Sistema gioca tattico
//   - critical:   Sistema in svantaggio grave → all-in disperato
//
// Vedi docs/planning/tactical-architecture-patterns.md (AI War pattern)

'use strict';

/**
 * Configurazione default per il threat assessment.
 * Sovrascrivibile via YAML (ai_intent_scores.yaml → threat).
 */
const DEFAULT_THREAT_CONFIG = {
  passivity_threshold_turns: 3,
  escalation_damage_ratio: 0.6,
  aggression_weight: 0.4,
  passivity_weight: 0.35,
  pressure_weight: 0.25,
};

/**
 * Conta i turni consecutivi senza attacchi player dalla fine della sessione.
 * Un "turno senza attacco" = nessun evento attack con actor controllato da player.
 *
 * @param {Array} events — session.events
 * @param {Array} units — session.units (per mappare actor_id → controlled_by)
 * @returns {number} turni consecutivi senza attacco player (dal piu recente)
 */
function countPassiveTurns(events, units) {
  if (!events || events.length === 0) return 0;

  const playerIds = new Set(
    (units || []).filter((u) => u.controlled_by === 'player').map((u) => u.id),
  );

  // Raggruppa eventi per turno, cerca attacchi player
  const turnAttacks = new Map();
  for (const ev of events) {
    if (ev.action_type !== 'attack') continue;
    const turn = ev.turn || 0;
    if (playerIds.has(ev.actor_id)) {
      turnAttacks.set(turn, (turnAttacks.get(turn) || 0) + 1);
    }
  }

  if (turnAttacks.size === 0 && events.length > 0) {
    // Nessun attacco player in tutta la sessione
    const maxTurn = Math.max(...events.map((e) => e.turn || 0), 0);
    return Math.max(maxTurn, 1);
  }

  // Conta turni consecutivi senza attacco dal piu recente
  const maxTurn = Math.max(...events.map((e) => e.turn || 0), 0);
  let passive = 0;
  for (let t = maxTurn; t >= 1; t--) {
    if (turnAttacks.has(t)) break;
    passive++;
  }
  return passive;
}

/**
 * Calcola il danno totale subito dalle unita SIS.
 *
 * @param {Array} events — session.events
 * @param {Array} units — session.units
 * @returns {number} danno totale subito da unita sistema
 */
function computeSisDamageTaken(events, units) {
  if (!events) return 0;
  const sisIds = new Set(
    (units || []).filter((u) => u.controlled_by === 'sistema').map((u) => u.id),
  );
  let total = 0;
  for (const ev of events) {
    if (ev.action_type === 'attack' && sisIds.has(ev.target_id)) {
      total += Number(ev.damage_dealt) || 0;
    }
  }
  return total;
}

/**
 * Calcola HP totale massimo delle unita SIS.
 *
 * @param {Array} units — session.units
 * @returns {number}
 */
function computeSisMaxHp(units) {
  return (units || [])
    .filter((u) => u.controlled_by === 'sistema')
    .reduce((sum, u) => sum + (Number(u.max_hp) || Number(u.hp) || 10), 0);
}

/**
 * Calcola l'indice di minaccia composito.
 *
 * @param {object} session — { events, units, turn }
 * @param {object} [config] — override della configurazione threat
 * @returns {{
 *   threat_level: number,
 *   player_aggression: number,
 *   player_passivity: number,
 *   damage_pressure: number,
 *   escalation_tier: 'passive'|'normal'|'aggressive'|'critical'
 * }}
 */
function computeThreatIndex(session, config) {
  const cfg = { ...DEFAULT_THREAT_CONFIG, ...config };
  const events = session.events || [];
  const units = session.units || [];
  const turn = session.turn || 1;

  // Player passivity: turni consecutivi senza attacco
  const passiveTurns = countPassiveTurns(events, units);
  // Normalizzato 0-1 (0 = molto attivo, 1 = molto passivo)
  const player_passivity = Math.min(passiveTurns / Math.max(cfg.passivity_threshold_turns, 1), 1);

  // Damage pressure: danno subito da SIS rispetto a HP totale
  const sisDamage = computeSisDamageTaken(events, units);
  const sisMaxHp = computeSisMaxHp(units);
  const damage_pressure = sisMaxHp > 0 ? Math.min(sisDamage / sisMaxHp, 1) : 0;

  // Player aggression: danno per turno normalizzato
  const damagePerTurn = turn > 0 ? sisDamage / turn : 0;
  const expectedDamagePerTurn = sisMaxHp > 0 ? sisMaxHp * 0.15 : 1.5;
  const player_aggression = Math.min(damagePerTurn / expectedDamagePerTurn, 1);

  // Composite threat level
  const threat_level = Math.min(
    cfg.aggression_weight * player_aggression +
      cfg.passivity_weight * (1 - player_passivity) +
      cfg.pressure_weight * damage_pressure,
    1,
  );

  // Escalation tier
  let escalation_tier = 'normal';
  if (passiveTurns >= cfg.passivity_threshold_turns) {
    escalation_tier = 'passive';
  } else if (damage_pressure >= cfg.escalation_damage_ratio) {
    escalation_tier = 'critical';
  } else if (player_aggression >= 0.7) {
    escalation_tier = 'aggressive';
  }

  return {
    threat_level,
    player_aggression,
    player_passivity,
    damage_pressure,
    escalation_tier,
  };
}

module.exports = {
  DEFAULT_THREAT_CONFIG,
  countPassiveTurns,
  computeSisDamageTaken,
  computeSisMaxHp,
  computeThreatIndex,
};
