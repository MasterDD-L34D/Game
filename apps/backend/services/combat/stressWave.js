'use strict';
// =============================================================================
// SPEC-I ER6 -- StressWave event-trigger bounded (RATIFICATO 2026-06-10, opz. C).
//
// I dati `stresswave` di biomes.yaml (20/28 biomi: baseline, escalation_rate,
// event_thresholds) erano engine-dead. ER6 li wira come EVENT-TRIGGER bounded:
// la wave cresce session-local (`baseline + escalation_rate * turno`, NESSUN
// feed continuo di sistema_pressure -- doctrine sez.3) e al PRIMO crossing di
// ogni soglia scatta UN evento one-shot:
//   - `rescue`  -> soccorso player: +RESCUE_HEAL_HP alle unit player vive
//                  (cap max_hp). Canvas: "Protocollo di soccorso".
//   - `overrun` -> +OVERRUN_BUDGET_BONUS al reinforcement budget SIS per UN
//                  solo tick dello spawner (consume-once, vedi
//                  reinforcementSpawner opts.budgetBonus). Canvas: "Overrun".
//   - soglie rare (support/salvage/hive_alert/sync_window): registrate come
//     evento/telegraph, nessun effetto meccanico finche' un fork non le wira.
//
// GOVERNANCE: flag `STRESSWAVE_EVENTS_ENABLED` default OFF -- spec sez.8: un
// effetto passa ON solo post playtest N=40 GREEN (verdetto master-dd).
// Magnitudini RESCUE_HEAL_HP / OVERRUN_BUDGET_BONUS = PROPOSED, ratify N=40.
// Telegraph: evento nel raw event stream (`action_type: 'stresswave_event'`,
// pattern reinforcement_spawn) + `session.stresswave_event_latest` (public
// tier, diegetico -- mai il numero wave, ER3).
// =============================================================================

const { getBiomeStressProfile } = require('./biomeModifiers');

// PROPOSED (ratify N=40, pattern ER1): heal one-shot del soccorso.
const RESCUE_HEAL_HP = 2;
// PROPOSED (ratify N=40): bonus budget one-shot dell'ondata.
const OVERRUN_BUDGET_BONUS = 1;
// Eventi con effetto meccanico wired; le altre soglie = telegraph-only.
const MECHANICAL_EVENTS = new Set(['rescue', 'overrun']);

function isEnabled() {
  return process.env.STRESSWAVE_EVENTS_ENABLED === 'true';
}

function clamp01(x) {
  if (!Number.isFinite(x)) return 0;
  return Math.max(0, Math.min(1, x));
}

// Wave session-local: funzione pura del turno (nessuno stato incrementale).
function computeWave(cfg, turn) {
  if (!cfg || typeof cfg !== 'object') return 0;
  const baseline = Number(cfg.baseline) || 0;
  const rate = Number(cfg.escalation_rate) || 0;
  const t = Math.max(0, Number(turn) || 0);
  return clamp01(baseline + rate * t);
}

// Soglie croccate e non ancora scattate, in ordine di soglia crescente
// (se la wave salta piu' soglie in un turno, scattano tutte, dal basso).
function checkCrossings(cfg, turn, triggered = {}) {
  if (!cfg || typeof cfg.event_thresholds !== 'object' || cfg.event_thresholds === null) {
    return [];
  }
  const wave = computeWave(cfg, turn);
  return Object.entries(cfg.event_thresholds)
    .filter(([event, threshold]) => {
      const th = Number(threshold);
      return Number.isFinite(th) && wave >= th && !triggered[event];
    })
    .sort((a, b) => Number(a[1]) - Number(b[1]))
    .map(([event, threshold]) => ({ event, threshold: Number(threshold), wave }));
}

// Tick per-turno (chiamato dai turn-advance sites accanto a sgBeginTurnAll).
// Best-effort: niente throw, flag OFF o bioma senza dati -> null.
function applyStressWaveTick(session, opts = {}) {
  try {
    if (!isEnabled()) return null;
    if (!session || !session.biome_id) return null;
    const profile = getBiomeStressProfile(session.biome_id, opts.registry);
    const cfg = profile && profile.stresswave;
    if (!cfg) return null;

    if (!session.stresswaveTriggered) session.stresswaveTriggered = {};
    const crossings = checkCrossings(cfg, session.turn, session.stresswaveTriggered);
    if (!crossings.length) return null;

    const fired = [];
    for (const { event, wave } of crossings) {
      session.stresswaveTriggered[event] = true;
      fired.push(event);

      if (event === 'rescue') {
        for (const u of session.units || []) {
          if (u && u.controlled_by === 'player' && Number(u.hp || 0) > 0) {
            const cap = Number.isFinite(Number(u.max_hp)) ? Number(u.max_hp) : Infinity;
            u.hp = Math.min(cap, Number(u.hp) + RESCUE_HEAL_HP);
          }
        }
      } else if (event === 'overrun') {
        session._stresswaveOverrunBonus =
          (Number(session._stresswaveOverrunBonus) || 0) + OVERRUN_BUDGET_BONUS;
      }
      // soglie non-mechanical: solo telegraph/log (vedi MECHANICAL_EVENTS).

      // Telegraph diegetico (public tier): ultimo evento + raw event additive
      // (action_type custom ammesso nel raw stream, pattern reinforcement_spawn).
      session.stresswave_event_latest = { event, turn: session.turn };
      if (Array.isArray(session.events)) {
        session.events.push({
          action_type: 'stresswave_event',
          turn: session.turn,
          actor_id: null,
          target_id: null,
          damage_dealt: 0,
          result: event,
          position_from: null,
          position_to: null,
        });
      }
    }
    return { fired, wave: crossings[crossings.length - 1].wave };
  } catch {
    return null; // mai bloccare il turn flow
  }
}

module.exports = {
  computeWave,
  checkCrossings,
  applyStressWaveTick,
  RESCUE_HEAL_HP,
  OVERRUN_BUDGET_BONUS,
  MECHANICAL_EVENTS,
};
