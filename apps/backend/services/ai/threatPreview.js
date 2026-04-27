// M8 Plan-Reveal P0 — threat_preview builder (ADR-2026-04-18).
//
// Transforms session.roundState.pending_intents (SIS side) into a
// UI-friendly payload consumed by the frontend during declare phase:
//
//   {
//     actor_id: 'e_nomad_1',
//     intent_type: 'attack' | 'move' | 'skip' | 'unknown',
//     intent_icon: 'fist' | 'move' | 'shield' | '?',
//     target_id: 'p_scout' | null,
//     threat_tiles: [{ x, y }],
//   }
//
// `threat_tiles` per attack = cella del target (dove sta cadendo il colpo).
// `threat_tiles` per move = cella di destinazione (dove SIS sta andando).
// `threat_tiles` per skip = [].
//
// NB: legge solo da `session.roundState.pending_intents` → richiede che
// `declareSistemaIntents` sia già stato chiamato (flow /round/begin-planning).
// No side effects, no mutazioni.

'use strict';

const INTENT_ICON_MAP = {
  attack: 'fist',
  move: 'move',
  approach: 'move',
  retreat: 'move',
  skip: 'shield',
  defend: 'shield',
  overwatch: 'shield',
};

function _iconFor(type) {
  if (!type || typeof type !== 'string') return '?';
  return INTENT_ICON_MAP[type] || '?';
}

function _unitById(session, id) {
  if (!session || !Array.isArray(session.units) || !id) return null;
  return session.units.find((u) => u && u.id === id) || null;
}

function _threatTilesFor(session, intent) {
  const action = intent && intent.action ? intent.action : {};
  const type = action.type;

  if (type === 'attack' && action.target_id) {
    const target = _unitById(session, action.target_id);
    if (target && target.position) {
      return [{ x: Number(target.position.x), y: Number(target.position.y) }];
    }
  }
  if ((type === 'move' || type === 'approach' || type === 'retreat') && action.move_to) {
    return [{ x: Number(action.move_to.x), y: Number(action.move_to.y) }];
  }
  return [];
}

/**
 * Build threat_preview payload from session roundState.
 *
 * @param {object} session — shape `{ units, roundState: { pending_intents } }`
 * @returns {Array} threat_preview rows (vuoto se roundState o intents assenti)
 */
function buildThreatPreview(session) {
  if (!session || !session.roundState) return [];
  const pending = session.roundState.pending_intents;
  if (!Array.isArray(pending) || pending.length === 0) return [];

  // 2026-04-27 PR-Y2 — StS damage forecast inline su intent.
  // Lazy require predictCombat (evitare circular dep + missing module risk).
  let predictCombatFn = null;
  try {
    // eslint-disable-next-line global-require
    ({ predictCombat: predictCombatFn } = require('../../routes/sessionHelpers'));
  } catch {
    predictCombatFn = null;
  }

  const preview = [];
  for (const intent of pending) {
    if (!intent || !intent.unit_id) continue;
    const actor = _unitById(session, intent.unit_id);
    if (!actor || actor.controlled_by !== 'sistema') continue; // only SIS entries
    if (Number(actor.hp || 0) <= 0) continue; // skip dead units

    const action = intent.action || {};
    const intentType = action.type || 'unknown';

    // PR-Y2 — expected_damage solo per attack (move/skip = null).
    let expectedDamage = null;
    let hitPct = null;
    if (intentType === 'attack' && action.target_id && predictCombatFn) {
      const target = _unitById(session, action.target_id);
      if (target && Number(target.hp || 0) > 0) {
        try {
          const pred = predictCombatFn(actor, target, 1000);
          expectedDamage = pred?.expected_damage ?? null;
          hitPct = pred?.hit_pct ?? null;
        } catch {
          // best-effort
        }
      }
    }

    preview.push({
      actor_id: actor.id,
      intent_type: intentType,
      intent_icon: _iconFor(intentType),
      target_id: action.target_id || null,
      threat_tiles: _threatTilesFor(session, intent),
      expected_damage: expectedDamage,
      hit_pct: hitPct,
    });
  }
  return preview;
}

module.exports = {
  buildThreatPreview,
  // exposed per testing
  _iconFor,
};
