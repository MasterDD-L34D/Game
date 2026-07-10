'use strict';
// apLedger -- single authority for AP costs (player + Sistema).
// Extracted VERBATIM from the sessionRoundBridge closure (spec
// docs/superpowers/specs/2026-07-10-sistema-symmetry-design.md sez. 4.1).
// Factory: injected deps, zero state, zero Express.

/**
 * Build an AP-cost ledger bound to the given grid deps.
 *
 * @param {Object} deps
 * @param {Function} deps.manhattanDistance - (a, b) -> integer tile distance.
 * @param {number} deps.gridSize - NUMBER (scalar, square-grid) contract
 *   inherited verbatim from the bridge (falls back to 6 when falsy).
 *   Rectangular {width,height} support is explicitly a follow-up of the
 *   Sistema task and MUST NOT be added here.
 * @returns {Object} ledger: the 4 verbatim resolvers + apAvailable/canAfford.
 */
function createApLedger({ manhattanDistance, gridSize }) {
  // Server-authoritative move AP cost (security fix 2026-07-05). The resolver
  // must NOT trust action.ap_cost for moves: the shipped client posts ap_cost:1
  // for any destination, so a raw request could move N tiles for 1 AP. Cost =
  // max(1, Manhattan(from,to) - move_bonus), mirroring the legacy /session/action
  // path (routes/session.js). Terrain-weighted cost stays on that legacy path;
  // the round path uses the Manhattan basis by design (band-neutral).
  function resolveMoveApCost(actor, from, to) {
    const dist = typeof manhattanDistance === 'function' ? manhattanDistance(from, to) : 0;
    const moveBonus = Math.max(0, Number((actor && actor.move_bonus_bonus) || 0));
    return Math.max(1, dist - moveBonus);
  }

  // Canon basic-attack AP cost. The client (apps/play lobbyBridge + ability panel)
  // and the legacy attack wrapper all use 1; jobs.yaml basic attacks are cost_ap:1.
  const ATTACK_BASE_AP_COST = 1;

  // Server-authoritative AP cost for non-move round actions, mirroring
  // resolveMoveApCost. validatePlayerIntent only checks the TOTAL declared
  // ap_cost against the AP budget -- never a per-action minimum -- so a raw-HTTP
  // client can post a negative/fractional ap_cost on an attack (gain or undercharge
  // AP) or ap_cost:1 for a 2-AP ability (undercharge by half) and be undercharged
  // (OWASP A04, same class as the move undercharge). The client value is advisory:
  //   - attack             -> ATTACK_BASE_AP_COST (canon), client value ignored
  //   - ability_id present -> registry cost_ap (same source the ability executor
  //                           deducts); unknown ability floors at 1 AP
  //   - anything else (skip/pass/...) -> legacy client default; no server cost
  //     source exists for these, so behavior is preserved (out of scope).
  // NOTE: the round-bridge `else` branch deducts this cost but does NOT execute
  // the ability effect (effects run on /round/execute -> abilityExecutor, which
  // self-deducts cost_ap). If a future change dispatches the effect on the bridge
  // path too, drop this deduction there to avoid double-charging.
  function resolveActionApCost(actor, action) {
    if (!action || typeof action !== 'object') return 1;
    if (action.type === 'attack') return ATTACK_BASE_AP_COST;
    if (action.ability_id) {
      let spec = null;
      try {
        spec = require('../abilityExecutor').findAbility(action.ability_id);
      } catch {
        /* ability registry optional -- fall back to floored client value */
      }
      // Floor at 0 to mirror abilityExecutor's clamp (no ability refunds AP even
      // if a future jobs.yaml entry ships a negative/NaN cost_ap); cost_ap:0 (e.g.
      // intercept) is a legitimate 0-AP reaction and passes through.
      if (spec && spec.cost_ap != null) return Math.max(0, Number(spec.cost_ap) || 0);
      return Math.max(1, Number(action.ap_cost || 1));
    }
    return Number(action.ap_cost || 1);
  }

  // True when a move destination is a valid, in-grid cell (mirrors the NO_DEST +
  // OUT_OF_GRID checks in validatePlayerIntent). Used to decide whether the budget
  // gate can trust a server-authoritative move cost: an off-grid / malformed dest
  // keeps the advisory client value so its own OUT_OF_GRID / NO_DEST rejection
  // fires first (clearer error, and no NaN from manhattanDistance on a bad dest).
  function isValidGridDest(dest) {
    if (!dest || typeof dest.x !== 'number' || typeof dest.y !== 'number') return false;
    if (!Number.isFinite(dest.x) || !Number.isFinite(dest.y)) return false;
    const size = gridSize || 6;
    return dest.x >= 0 && dest.x < size && dest.y >= 0 && dest.y < size;
  }

  // Declare-time budget cost of an intent, for validatePlayerIntent. Attack/ability
  // use the server-authoritative resolveActionApCost, and a move to a valid in-grid
  // cell uses resolveMoveApCost -- so a client cannot pass the budget gate by
  // declaring ap_cost:0/negative and over-declare free actions. The resolver charges
  // the real cost per action but floors ap_remaining at 0, so an un-gated
  // over-declaration still executes N actions while paying for fewer (OWASP A04):
  // for moves this means N short moves at ap_cost:0 all clear the pending-sum gate
  // and the (N+1)th still resolves for free. Charging max(1, dist - move_bonus) per
  // move in the pending sum closes that. AP_INSUFFICIENT now precedes MOVE_TOO_FAR
  // for a single over-far in-grid move (both 400 rejections; the over-far move IS
  // over-budget). skip/off-grid/other keep the client value: skip legitimately
  // costs 0, and an off-grid dest is rejected by OUT_OF_GRID before this matters.
  function resolveIntentApCost(actor, act) {
    if (act && (act.type === 'attack' || act.ability_id)) {
      return resolveActionApCost(actor, act);
    }
    if (act && act.type === 'move' && isValidGridDest(act.move_to)) {
      return resolveMoveApCost(actor, actor && actor.position, act.move_to);
    }
    return Number((act && act.ap_cost) || 0);
  }

  /**
   * Spendable AP for an actor.
   *
   * Fallback chain: ap_remaining when present (the round-model ledger field),
   * else ap (legacy/pre-round shape), else 0. A null/absent actor, or one
   * missing both fields, resolves to 0 so downstream gates fail CLOSED
   * (nothing is affordable for an unknown actor).
   *
   * @param {Object|null} actor
   * @returns {number} spendable AP (0 when unknowable).
   */
  function apAvailable(actor) {
    return Number(
      actor && actor.ap_remaining != null ? actor.ap_remaining : (actor && actor.ap) || 0,
    );
  }

  /**
   * Pending-sum affordability gate (the P1-3 multi-intent hardening,
   * reusable for the Sistema declare-side).
   *
   * Keep in lockstep with the hand-rolled pending-sum gate in
   * routes/sessionRoundBridge.js validatePlayerIntent (extraction
   * follow-up: rewire that gate onto this ledger).
   *
   * @param {Object|null} actor - priced via resolveIntentApCost + apAvailable.
   * @param {Array<Object>} declaredActions - array of raw ACTION objects
   *   ({type, ap_cost, move_to, ability_id, ...}), NOT {unit_id, action}
   *   intent wrappers, already pre-filtered to THIS actor. Passing intent
   *   wrappers would price everything at 0 and fail OPEN -- as insurance,
   *   an element carrying an `.action` key is unwrapped before pricing.
   * @param {Object} action - the candidate raw action to admit.
   * @returns {boolean} true when pending + candidate fits in apAvailable(actor).
   */
  function canAfford(actor, declaredActions, action) {
    const pending = (declaredActions || []).reduce((sum, a) => {
      const act = a && a.action ? a.action : a;
      return sum + resolveIntentApCost(actor, act);
    }, 0);
    return pending + resolveIntentApCost(actor, action) <= apAvailable(actor);
  }

  return {
    resolveMoveApCost,
    resolveActionApCost,
    resolveIntentApCost,
    isValidGridDest,
    apAvailable,
    canAfford,
  };
}

module.exports = { createApLedger };
