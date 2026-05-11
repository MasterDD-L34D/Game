// TKT-M14-B Phase A — Conviction system (Triangle Strategy pattern).
//
// Reference: docs/research/triangle-strategy-transfer-plan.md Mechanic 1.
// Museum cards consulted: M-2026-04-25-009 (Triangle Strategy transfer),
// M-2026-04-25-010 (MBTI gates ghost), M-2026-04-25-002 (Ennea registry).
//
// 3-axis psychological tracker DISTINCT da MBTI (already in vcScoring.js)
// e da Ennea (already in vcScoring.js computeEnneaArchetypes). Conviction
// modella scelte morali / tattiche di alto livello che TS-style influenzano
// recruit gating + dialogue branching:
//
//   Utility  — pragmatismo / autoconservazione / efficienza
//   Liberty  — libertà individuale / rischio / dissenso
//   Morality — correttezza etica / mercy / sacrificio
//
// Range per axis: 0..100 (baseline 50, neutro).
//
// PURE engine: nessun side-effect, nessuna I/O, additive su buildVcSnapshot
// (chiamato post-loop quando vcScoring computa per_actor). Phase A scope:
// engine + integration in buildVcSnapshot. Phase B (defer): dialogue YAML.
// Phase C (defer): API endpoint extension.
//
// === Event → delta mapping ===
//
// Triangle Strategy mappa scelte dialogue → Utility/Liberty/Morality. In
// Evo-Tactics non abbiamo (ancora) dialogue ramificate, ma il raw event log
// in `session.events` contiene azioni con semantica morale derivabile:
//
//   - attack con result="kill" + flag `mercy`/`coup_de_grace` → Mor / Util
//   - assist (heal/buff) → Mor + Util (cura > efficienza)
//   - move evasion + retreat (low_hp) → Util (autoconservazione)
//   - first_blood + aggressive opening → Lib (risk-taking)
//   - kill su unità debole (HP low) senza mercy → Util (efficienza fredda)
//   - refuse_order action (TODO: not in event log yet) → Lib
//   - sacrifice action (TODO: not in event log yet) → Mor
//
// Tre ACCEPTANCE CRITERIA dal ticket §2:
//   AC1: kill mercy ↑ util  → implementato come "kill con flag mercy ↑ Mor,
//        kill senza mercy su low_hp target ↑ Util" (more nuanced).
//   AC2: refuse order ↑ lib → modeled via "high evasion + retreat events" proxy.
//   AC3: execute ↑ mor     → modeled via "kill su target high_hp + first_blood" proxy.
//
// I proxy sono volutamente CONSERVATIVI: senza dialogue ramificate, deltas
// sono piccoli (1-5 per evento) e bounded a 0..100. Schema permette future
// extension con flag espliciti (event.flags.mercy, event.flags.refuse).

const AXIS_KEYS = ['utility', 'liberty', 'morality'];

const BASELINE = 50;
const MIN_VALUE = 0;
const MAX_VALUE = 100;

// Delta tunables (small to avoid axis saturation on long sessions).
const DELTA = {
  KILL_MERCY: { morality: +5, utility: -2 }, // explicit mercy flag
  KILL_LOW_HP_NO_MERCY: { utility: +3, morality: -1 }, // pragma kill of weak
  KILL_HIGH_HP_FIRST_BLOOD: { morality: +2, liberty: +2 }, // execution / decisive
  ASSIST: { morality: +2, utility: +1 }, // heal / buff partner
  MOVE_EVASION: { liberty: +1, utility: +1 }, // mordi-e-fuggi
  RETREAT_LOW_HP: { utility: +2, morality: -1 }, // self-preservation
  FIRST_BLOOD: { liberty: +1 }, // aggressive opening
  REFUSE_ORDER: { liberty: +4 }, // explicit flag (future)
  SACRIFICE: { morality: +5, utility: -3 }, // explicit flag (future)
};

// Recruit gating thresholds (AC2 from ticket §2).
//   NPC con utility >= UTILITY_HIGH rifiuta player liberty-aligned (lib >= LIBERTY_HIGH).
//   NPC con morality <= MORALITY_LOW rifiuta player morality-aligned.
const THRESHOLDS = {
  UTILITY_HIGH: 80,
  LIBERTY_HIGH: 70,
  MORALITY_HIGH: 70,
  MORALITY_LOW: 30,
};

function clamp(value, min = MIN_VALUE, max = MAX_VALUE) {
  return Math.max(min, Math.min(max, value));
}

function initialAxis() {
  return { utility: BASELINE, liberty: BASELINE, morality: BASELINE };
}

/**
 * Apply a delta object to an axis state in place (returning a new object).
 * Bounds enforced 0..100.
 */
function applyDelta(axis, delta) {
  const next = { ...axis };
  for (const key of AXIS_KEYS) {
    const d = Number(delta?.[key]) || 0;
    if (d === 0) continue;
    next[key] = clamp(Number(next[key]) + d);
  }
  return next;
}

/**
 * Classify a single event into a delta object (or null if no semantic match).
 *
 * Conservative: returns null for events that don't carry moral semantics.
 *
 * @param {object} event - raw event from session.events.
 * @returns {object|null} delta keyed by axis.
 */
function classifyEvent(event) {
  if (!event || typeof event !== 'object') return null;

  // Future-explicit flags (Phase B+ when dialogue lands).
  if (event.action_type === 'refuse_order') return { ...DELTA.REFUSE_ORDER };
  if (event.action_type === 'sacrifice') return { ...DELTA.SACRIFICE };

  const flags = event.flags || {};
  // Kill semantic split.
  if (event.action_type === 'kill' || (event.action_type === 'attack' && event.result === 'kill')) {
    if (flags.mercy === true) return { ...DELTA.KILL_MERCY };
    // Pragma kill on low HP target (no mercy flag, target was weak).
    if (Number.isFinite(event.target_hp_before) && event.target_hp_before <= 3) {
      return { ...DELTA.KILL_LOW_HP_NO_MERCY };
    }
    if (event.first_blood === true || flags.first_blood === true) {
      return { ...DELTA.KILL_HIGH_HP_FIRST_BLOOD };
    }
    // Generic kill: small util bias.
    return { utility: +1 };
  }

  // First blood opener.
  if (
    event.action_type === 'attack' &&
    (event.first_blood === true || flags.first_blood === true)
  ) {
    return { ...DELTA.FIRST_BLOOD };
  }

  // Assist (heal / buff).
  if (event.action_type === 'assist' || event.action_type === 'heal') {
    return { ...DELTA.ASSIST };
  }

  // Evasion move (mordi-e-fuggi flagged by vcScoring evasion_ratio raw upstream).
  if (event.action_type === 'move' && flags.evasion === true) {
    return { ...DELTA.MOVE_EVASION };
  }

  // Retreat (move flagged when actor low HP).
  if (event.action_type === 'move' && flags.retreat === true) {
    return { ...DELTA.RETREAT_LOW_HP };
  }

  return null;
}

/**
 * Evaluate conviction across a full event log + units roster.
 *
 * Pure aggregator: starts every actor at BASELINE (50/50/50), folds each
 * event with semantic match into the actor's axis. Returns per-actor map.
 *
 * @param {Array} events - session.events (action_type + actor_id + result + flags).
 * @param {Array} [units] - session.units (for actor enumeration if events empty).
 * @returns {Object<string, { utility, liberty, morality, events_classified }>}
 */
function evaluateConviction(events, units = []) {
  const perActor = {};

  // Seed actors from units roster (so even no-event actors get baseline).
  if (Array.isArray(units)) {
    for (const unit of units) {
      if (unit && unit.id) {
        perActor[unit.id] = { ...initialAxis(), events_classified: 0 };
      }
    }
  }

  if (!Array.isArray(events)) return perActor;

  for (const event of events) {
    if (!event || !event.actor_id) continue;
    const delta = classifyEvent(event);
    if (!delta) continue;
    if (!perActor[event.actor_id]) {
      perActor[event.actor_id] = { ...initialAxis(), events_classified: 0 };
    }
    const cur = perActor[event.actor_id];
    const next = applyDelta(
      { utility: cur.utility, liberty: cur.liberty, morality: cur.morality },
      delta,
    );
    perActor[event.actor_id] = {
      ...next,
      events_classified: cur.events_classified + 1,
    };
  }

  return perActor;
}

/**
 * Recruit gate predicate: given an NPC's conviction snapshot + player's,
 * return { eligible: bool, reason: string|null }.
 *
 * AC2 dal ticket §2: NPC con utility>=80% rifiuta player liberty-aligned.
 *
 * @param {object} npcConviction - { utility, liberty, morality }
 * @param {object} playerConviction - { utility, liberty, morality }
 * @returns {{ eligible: boolean, reason: string|null }}
 */
function checkRecruitGate(npcConviction, playerConviction) {
  if (!npcConviction || !playerConviction) {
    return { eligible: false, reason: 'missing_conviction_snapshot' };
  }
  const npcUtil = Number(npcConviction.utility) || 0;
  const npcMor = Number(npcConviction.morality) || 0;
  const playerLib = Number(playerConviction.liberty) || 0;
  const playerMor = Number(playerConviction.morality) || 0;

  // AC2 canonical gate: pragma NPC refuses liberty-aligned recruit.
  if (npcUtil >= THRESHOLDS.UTILITY_HIGH && playerLib >= THRESHOLDS.LIBERTY_HIGH) {
    return { eligible: false, reason: 'utility_high_vs_liberty_high' };
  }
  // Low-morality NPC refuses high-morality recruit.
  if (npcMor <= THRESHOLDS.MORALITY_LOW && playerMor >= THRESHOLDS.MORALITY_HIGH) {
    return { eligible: false, reason: 'morality_low_vs_morality_high' };
  }
  return { eligible: true, reason: null };
}

/**
 * Build conviction snapshot keyed by unit_id, in shape ready to attach to
 * vcSnapshot.per_actor[uid].conviction_axis (additive, doesn't mutate
 * existing fields).
 *
 * @param {object} session - { events, units }
 * @returns {Object<string, { utility, liberty, morality, events_classified }>}
 */
function buildConvictionSnapshot(session) {
  const events = Array.isArray(session?.events) ? session.events : [];
  const units = Array.isArray(session?.units) ? session.units : [];
  return evaluateConviction(events, units);
}

module.exports = {
  AXIS_KEYS,
  BASELINE,
  MIN_VALUE,
  MAX_VALUE,
  DELTA,
  THRESHOLDS,
  initialAxis,
  applyDelta,
  classifyEvent,
  evaluateConviction,
  checkRecruitGate,
  buildConvictionSnapshot,
};
