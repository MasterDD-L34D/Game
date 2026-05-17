// 2026-04-26 — AI War Progress meter (P0 Tier S quick-win, P5 visibility).
//
// Source: docs/research/2026-04-26-tier-s-extraction-matrix.md (AI War: Fleet Command)
// Pattern donor: AI War 'AI Progress meter' visibility globale player-side.
//
// AI War lesson: player must SEE pressure escalation in real-time, not solo
// surface alle azioni passate. Meter mostra:
//   - tier name corrente (Calm/Alert/Escalated/Critical/Apex)
//   - pressure value 0..100
//   - next_tier_threshold per anticipazione
//   - intents_per_round cap (escalation visibility)
//   - threat_level human-readable
//
// Wire: surface in publicSessionView(session) -> session.ai_progress
// Frontend wire: deferred (apps/play/src/aiProgressMeter.js future PR)
// Co-op visibility: M11 host vede meter, players vedono aggregate via WS state

'use strict';

// Mirror sistema_pressure tier definitions da declareSistemaIntents.js.
// Centralizza qui per single source-of-truth + evitare circular dep.
const PRESSURE_TIERS = [
  { threshold: 0, name: 'Calm', threat: 'minimo', intents_per_round: 1 },
  { threshold: 25, name: 'Alert', threat: 'crescente', intents_per_round: 2 },
  { threshold: 50, name: 'Escalated', threat: 'serio', intents_per_round: 3 },
  { threshold: 75, name: 'Critical', threat: 'imminente', intents_per_round: 3 },
  { threshold: 95, name: 'Apex', threat: 'massimo', intents_per_round: 4 },
];

/**
 * Restituisce tier corrente per un pressure value.
 */
function tierForPressure(pressure) {
  const p = Number.isFinite(Number(pressure)) ? Math.max(0, Math.min(100, Number(pressure))) : 0;
  let current = PRESSURE_TIERS[0];
  for (const tier of PRESSURE_TIERS) {
    if (p >= tier.threshold) current = tier;
  }
  return { ...current, pressure_value: p };
}

/**
 * Trova il prossimo tier (per anticipazione) o null se Apex.
 */
function nextTier(pressure) {
  const p = Number.isFinite(Number(pressure)) ? Number(pressure) : 0;
  for (const tier of PRESSURE_TIERS) {
    if (tier.threshold > p) return tier;
  }
  return null;
}

/**
 * Compute progress meter state da session.
 * Returns { pressure, tier, next, intents_cap, distance_to_next, history }
 */
function getProgressMeterState(session) {
  if (!session || typeof session !== 'object') {
    return {
      pressure: 0,
      tier: PRESSURE_TIERS[0],
      next_tier: PRESSURE_TIERS[1],
      distance_to_next: 25,
      intents_per_round: 1,
      threat_level: 'minimo',
      history: [],
    };
  }

  const pressure = Number(session.sistema_pressure || 0);
  const tier = tierForPressure(pressure);
  const next = nextTier(pressure);
  const distance = next ? Math.max(0, next.threshold - pressure) : null;

  // History: ultimi 5 pressure changes da events log (se disponibile).
  // Filter eventi con pressure tracking; fallback array vuoto.
  const events = Array.isArray(session.events) ? session.events : [];
  const pressureHistory = events
    .filter((e) => e && typeof e.pressure === 'number')
    .slice(-5)
    .map((e) => ({
      turn: e.turn,
      pressure: e.pressure,
      action_type: e.action_type,
    }));

  return {
    pressure,
    tier: {
      name: tier.name,
      threat: tier.threat,
      threshold: tier.threshold,
    },
    next_tier: next ? { name: next.name, threshold: next.threshold } : null,
    distance_to_next: distance,
    intents_per_round: tier.intents_per_round,
    threat_level: tier.threat,
    history: pressureHistory,
  };
}

module.exports = {
  PRESSURE_TIERS,
  tierForPressure,
  nextTier,
  getProgressMeterState,
};
