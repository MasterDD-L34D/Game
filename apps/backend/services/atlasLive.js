// =============================================================================
// Atlas Live — In-match telemetry surfacing
//
// Calcola pressure, momentum e warning_signals dalla session state corrente.
// Esposto da /api/session/state e /api/session/turn/end.
//
// Pillar 1 (Tactica leggibile): leggibilita' real-time durante il match.
//
// Vedi docs/core/00D-ENGINES_AS_GAME_FEATURES.md §Atlas per il design intent.
// =============================================================================

'use strict';

const HP_LOW_THRESHOLD = 0.33; // unita' < 33% HP → low_hp warning
const HP_CRITICAL_THRESHOLD = 0.15;
const PRESSURE_VICTORY_THRESHOLD = 75; // pressure >= 75 → likely victory
const PRESSURE_DEFEAT_THRESHOLD = 25;

/**
 * Calcola match_pressure (0-100): score lato player.
 * 50 = parita', 100 = dominio player, 0 = dominio nemico.
 *
 * Componenti:
 *   - HP ratio (40%): hp_player_total / hp_total
 *   - Unit count ratio (30%): alive_player / alive_total
 *   - AP economy (15%): ap_player_avg / ap_max
 *   - Position (15%): center-of-mass advantage (semplificato)
 */
function computeMatchPressure(session) {
  const units = session.units || [];
  const players = units.filter((u) => u.controlled_by === 'player');
  const enemies = units.filter((u) => u.controlled_by === 'sistema');
  const alivePlayersList = players.filter((u) => (u.hp || 0) > 0);
  const aliveEnemiesList = enemies.filter((u) => (u.hp || 0) > 0);

  if (!alivePlayersList.length && !aliveEnemiesList.length) return 50;
  if (!aliveEnemiesList.length) return 100;
  if (!alivePlayersList.length) return 0;

  const hpPlayer = players.reduce((a, u) => a + Math.max(0, u.hp || 0), 0);
  const hpEnemy = enemies.reduce((a, u) => a + Math.max(0, u.hp || 0), 0);
  const hpMaxPlayer = players.reduce((a, u) => a + (u.max_hp || u.hp || 0), 0);
  const hpMaxEnemy = enemies.reduce((a, u) => a + (u.max_hp || u.hp || 0), 0);
  const hpRatioPlayer = hpMaxPlayer > 0 ? hpPlayer / hpMaxPlayer : 0;
  const hpRatioEnemy = hpMaxEnemy > 0 ? hpEnemy / hpMaxEnemy : 0;
  const hpScore = (hpRatioPlayer / Math.max(0.01, hpRatioPlayer + hpRatioEnemy)) * 100;

  const alivePlayers = players.filter((u) => (u.hp || 0) > 0).length;
  const aliveEnemies = enemies.filter((u) => (u.hp || 0) > 0).length;
  const totalAlive = alivePlayers + aliveEnemies;
  const unitScore = totalAlive > 0 ? (alivePlayers / totalAlive) * 100 : 50;

  const apPlayerAvg =
    alivePlayers > 0
      ? players
          .filter((u) => (u.hp || 0) > 0)
          .reduce((a, u) => a + (u.ap_remaining ?? u.ap ?? 0), 0) / alivePlayers
      : 0;
  const apMax = 4; // tipico ap_max in tutorial; per ora hardcoded
  const apScore = Math.min(100, (apPlayerAvg / apMax) * 100);

  // Position: distanza media center-of-mass player vs enemy.
  // Player vicino al center → momentum forward (semplificazione).
  const posScore = 50; // neutro per ora — calcolare con grid heatmap in iter futura

  const pressure = Math.round(0.4 * hpScore + 0.3 * unitScore + 0.15 * apScore + 0.15 * posScore);
  return Math.max(0, Math.min(100, pressure));
}

/**
 * Calcola momentum: tag qualitativo basato su pressure + trend.
 * Se non c'e' history di pressure, usa solo valore corrente.
 */
function computeMomentum(session, currentPressure) {
  const lastPressure = Number.isFinite(session._last_atlas_pressure)
    ? Number(session._last_atlas_pressure)
    : currentPressure;
  const delta = currentPressure - lastPressure;

  let label;
  if (currentPressure >= PRESSURE_VICTORY_THRESHOLD) label = 'player_dominant';
  else if (currentPressure >= 60) label = 'player_advantage';
  else if (currentPressure >= 40) label = 'even';
  else if (currentPressure >= PRESSURE_DEFEAT_THRESHOLD) label = 'enemy_advantage';
  else label = 'enemy_dominant';

  let trend;
  if (Math.abs(delta) < 5) trend = 'stable';
  else if (delta > 0) trend = 'rising';
  else trend = 'falling';

  return { label, trend, delta };
}

/**
 * Genera warning_signals: alert player-facing real-time.
 * Esempi: low_hp, focused_fire, almost_kill, victory_imminent.
 */
function computeWarningSignals(session, pressure) {
  const signals = [];
  const units = session.units || [];

  for (const u of units) {
    const hpRatio = (u.max_hp || u.hp || 1) > 0 ? (u.hp || 0) / (u.max_hp || u.hp || 1) : 0;
    if (u.hp <= 0) continue;
    if (u.controlled_by === 'player' && hpRatio <= HP_CRITICAL_THRESHOLD) {
      signals.push({
        severity: 'critical',
        type: 'low_hp',
        unit_id: u.id,
        message_it: `${u.id} in pericolo critico (HP ${u.hp})`,
        message_en: `${u.id} critical HP (${u.hp})`,
      });
    } else if (u.controlled_by === 'player' && hpRatio <= HP_LOW_THRESHOLD) {
      signals.push({
        severity: 'warning',
        type: 'low_hp',
        unit_id: u.id,
        message_it: `${u.id} ferito (HP ${u.hp})`,
        message_en: `${u.id} wounded (HP ${u.hp})`,
      });
    }
    if (u.controlled_by === 'sistema' && hpRatio <= HP_CRITICAL_THRESHOLD) {
      signals.push({
        severity: 'info',
        type: 'almost_kill',
        unit_id: u.id,
        message_it: `${u.id} sta per cadere (HP ${u.hp})`,
        message_en: `${u.id} almost dead (HP ${u.hp})`,
      });
    }
  }

  if (pressure >= PRESSURE_VICTORY_THRESHOLD) {
    signals.push({
      severity: 'info',
      type: 'victory_imminent',
      message_it: 'Vittoria probabile nei prossimi turni.',
      message_en: 'Victory likely in next rounds.',
    });
  } else if (pressure <= PRESSURE_DEFEAT_THRESHOLD) {
    signals.push({
      severity: 'critical',
      type: 'defeat_imminent',
      message_it: 'Sconfitta imminente — riconsidera la strategia.',
      message_en: 'Defeat imminent — reconsider strategy.',
    });
  }

  return signals;
}

/**
 * Wrapper principale: ritorna pacchetto Atlas live completo.
 * Side effect: aggiorna session._last_atlas_pressure per trend computation.
 */
function buildAtlasLive(session) {
  const pressure = computeMatchPressure(session);
  const momentum = computeMomentum(session, pressure);
  const warning_signals = computeWarningSignals(session, pressure);
  if (session && typeof session === 'object') {
    session._last_atlas_pressure = pressure;
  }
  return {
    match_pressure: pressure,
    momentum,
    warning_signals,
  };
}

module.exports = {
  buildAtlasLive,
  computeMatchPressure,
  computeMomentum,
  computeWarningSignals,
};
