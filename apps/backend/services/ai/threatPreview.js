// M8 Plan-Reveal P0 — threat_preview builder (ADR-2026-04-18).
//
// Transforms session.roundState.pending_intents (SIS side) into a
// UI-friendly payload consumed by the frontend during declare phase:
//
//   {
//     actor_id: 'e_nomad_1',
//     intent_type: 'attack' | 'move' | 'skip' | 'hidden' | 'unknown',
//     intent_icon: 'fist' | 'move' | 'shield' | '?',
//     target_id: 'p_scout' | null,
//     threat_tiles: [{ x, y }],
//   }
//
// `threat_tiles` per attack = cella del target (dove sta cadendo il colpo).
// `threat_tiles` per move = cella di destinazione (dove SIS sta andando).
// `threat_tiles` per skip = [].
//
// Contratto threats-only (Codex P2 PR #3258): con SISTEMA_TELEGRAPH_THREATS_ONLY
// ogni unita' SIS viva con intent pendente ha SEMPRE una riga; intent non-threat
// o tagliato dal cap -> riga mascherata `intent_type: 'hidden'` (icon '?', zero
// campi informativi). Riga assente = "preview non disponibile" (pre-declare /
// legacy flow), MAI "intent filtrato": i consumer con fallback-attacco su riga
// assente (apps/play archiviato, render.js/main.js) non devono mentire proprio
// sulle unita' che il flag vuole nascondere.
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
  hidden: '?',
};

function _iconFor(type) {
  if (!type || typeof type !== 'string') return '?';
  return INTENT_ICON_MAP[type] || '?';
}

// Riga mascherata threats-only (contratto in testa al file). Costruita da zero,
// mai derivata mascherando una riga threat: un downgrade da attack che
// conservasse target/expected_damage/threat_tiles renderebbe il mask cosmetico.
function _hiddenRow(actorId) {
  return {
    actor_id: actorId,
    intent_type: 'hidden',
    intent_icon: _iconFor('hidden'),
    target_id: null,
    threat_tiles: [],
    expected_damage: null,
    hit_pct: null,
  };
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

  // Threats-only (spec sistema-symmetry sez. 4.4): col Sistema simmetrico le
  // azioni/round salgono (~14 a regime); si telegrafano SOLO le minacce --
  // attack su unita' player, move dentro objective.target_zone (zone-based).
  // Il movimento ordinario si vede sulla board. Il tier cap (che non gata piu'
  // l'azione quando la dichiarazione e' a budget) diventa il tetto di
  // PRESENTAZIONE. ADR-2026-04-18: il plan-reveal promette le MINACCE prima
  // della risoluzione, non ogni passo (lettura da ratificare nell'ADR di
  // chiusura arco). Default OFF -> byte-identical.
  const threatsOnly = process.env.SISTEMA_TELEGRAPH_THREATS_ONLY === 'true';
  const ZONE_OBJECTIVES = new Set(['capture_point', 'sabotage', 'escape', 'escort']);
  const objective = session.encounter && session.encounter.objective;
  const zone =
    threatsOnly &&
    objective &&
    ZONE_OBJECTIVES.has(objective.type) &&
    Array.isArray(objective.target_zone) &&
    objective.target_zone.length === 4
      ? objective.target_zone
      : null;
  const inZone = (pos) =>
    zone && pos && pos.x >= zone[0] && pos.y >= zone[1] && pos.x <= zone[2] && pos.y <= zone[3];

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
  const hidden = [];
  for (const intent of pending) {
    if (!intent || !intent.unit_id) continue;
    const actor = _unitById(session, intent.unit_id);
    if (!actor || actor.controlled_by !== 'sistema') continue; // only SIS entries
    if (Number(actor.hp || 0) <= 0) continue; // skip dead units

    const action = intent.action || {};
    const intentType = action.type || 'unknown';

    if (threatsOnly) {
      const isThreat =
        intentType === 'attack' ||
        ((intentType === 'move' || intentType === 'approach') && inZone(action.move_to));
      if (!isThreat) {
        hidden.push(_hiddenRow(actor.id));
        continue;
      }
    }

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
  if (threatsOnly) {
    // Cap di presentazione: attack prima, poi zone-entry; taglio al tier cap.
    // Lazy require per evitare cicli (declareSistemaIntents richiede sessionHelpers).
    let cap = preview.length;
    try {
      // eslint-disable-next-line global-require
      const { intentsCapForPressure } = require('./declareSistemaIntents');
      // Chiamata a 2 argomenti VOLUTA: senza aliveSistema il roster-scaling non
      // entra (guard Number.isFinite) -> cap = solo tier. Non "correggere" a 3 arg.
      cap = intentsCapForPressure(session.sistema_pressure, session.pressure_tier_floor);
    } catch {
      /* cap lookup best-effort: senza, nessun taglio */
    }
    preview.sort(
      (a, b) => (a.intent_type === 'attack' ? -1 : 1) - (b.intent_type === 'attack' ? -1 : 1),
    );
    // Oltre-cap: downgrade a riga hidden, non drop (contratto in testa al file).
    // Il cap resta il tetto delle MINACCE telegrafate; le righe hidden non
    // contano contro il cap perche' non presentano nulla.
    const kept = preview.slice(0, cap);
    for (const cut of preview.slice(cap)) hidden.push(_hiddenRow(cut.actor_id));
    return kept.concat(hidden);
  }
  return preview;
}

module.exports = {
  buildThreatPreview,
  // exposed per testing
  _iconFor,
};
