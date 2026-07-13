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
 * @returns {Object} ledger: the 4 verbatim resolvers + apAvailable and the
 *   pending-sum gate (apBreakdown, plus its boolean form canAfford).
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
  //   - anything else (skip/pass/...) -> legacy client default (falsy -> 1), but
  //     floored non-negative and NaN-safe. A negative/non-numeric client ap_cost
  //     would otherwise deduct a negative cost at execute-time and INFLATE
  //     ap_remaining (max(0, ap - (-N)) = ap + N; OWASP A04). The floor closes that.
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
      return Math.max(1, Number(action.ap_cost || 1) || 1);
    }
    return Math.max(0, Number(action.ap_cost || 1) || 0);
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
  // move in the pending sum closes that. An over-far single in-grid move is caught
  // by AP_INSUFFICIENT (its server cost already exceeds the budget) -- there is no
  // separate MOVE_TOO_FAR ceiling in validatePlayerIntent anymore; it was
  // unreachable for any non-negative pending sum and was removed. skip/off-grid/
  // other floor the client ap_cost at 0 (non-negative, NaN-safe): a negative/
  // non-numeric value would poison the pending sum (P < 0), revive that dead
  // branch, AND inflate AP at execute-time.
  function resolveIntentApCost(actor, act) {
    if (act && (act.type === 'attack' || act.ability_id)) {
      return resolveActionApCost(actor, act);
    }
    if (act && act.type === 'move' && isValidGridDest(act.move_to)) {
      return resolveMoveApCost(actor, actor && actor.position, act.move_to);
    }
    return Math.max(0, Number(act && act.ap_cost) || 0);
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
   * Recover the inner action from an intent wrapper ({unit_id, action}), while
   * refusing to unwrap anything that is ALREADY priceable.
   *
   * The guard is load-bearing, not defensive noise. Callers hand this function
   * raw ACTION objects, and on a raw action `.action` is a client-controlled
   * key: an unguarded `a.action ? a.action : a` lets an attacker post
   * {type:'attack', action:true} and have it priced as the inner value (0)
   * instead of as an attack (1). The pending sum then stays 0 forever and a
   * 1-AP unit queues unlimited attacks -- the exact multi-intent exploit the
   * gate exists to stop (OWASP A04 / CWE-840, caught pre-merge on PR #3252).
   *
   * A genuine wrapper carries neither `type` nor `ability_id`, so keying the
   * unwrap on their ABSENCE makes it unreachable for any action the resolvers
   * price server-side. An action with neither is already priced from its own
   * client `ap_cost` floored at 0, so unwrapping it cannot go below that floor.
   *
   * @param {*} a - a raw action, or an {unit_id, action} intent wrapper.
   * @returns {*} the action to price.
   */
  function unwrapIntent(a) {
    if (!a || typeof a !== 'object') return a;
    if (a.type || a.ability_id) return a; // already priceable -- never downgrade
    return a.action ? a.action : a;
  }

  /**
   * Priced breakdown of the pending-sum affordability gate (the P1-3
   * multi-intent hardening, reusable for the Sistema declare-side).
   *
   * This is the ONLY place the pending sum is computed. Callers that must
   * report the numbers (routes/sessionRoundBridge.js validatePlayerIntent
   * formats them into the AP_INSUFFICIENT message) read them off this object
   * instead of recomputing -- a recompute would resurrect the second AP
   * authority this ledger exists to remove.
   *
   * @param {Object|null} actor - priced via resolveIntentApCost + apAvailable.
   * @param {Array<Object>} declaredActions - array of raw ACTION objects
   *   ({type, ap_cost, move_to, ability_id, ...}), already pre-filtered to
   *   THIS actor. A naked {unit_id, action} intent wrapper carries no type or
   *   ability_id, so it would price at 0 and fail OPEN -- as insurance,
   *   unwrapIntent recovers the inner action. See unwrapIntent for why that
   *   insurance must never fire on an action that is already priceable.
   * @param {Object} action - the candidate raw action to admit.
   * @returns {{pending: number, cost: number, total: number,
   *   available: number, affordable: boolean}} pending = sum over
   *   declaredActions, cost = candidate, total = pending + cost,
   *   available = apAvailable(actor), affordable = total <= available.
   */
  function apBreakdown(actor, declaredActions, action) {
    const pending = (declaredActions || []).reduce(
      (sum, a) => sum + resolveIntentApCost(actor, unwrapIntent(a)),
      0,
    );
    const cost = resolveIntentApCost(actor, action);
    const total = pending + cost;
    const available = apAvailable(actor);
    return { pending, cost, total, available, affordable: total <= available };
  }

  /**
   * Boolean form of apBreakdown: true when pending + candidate fits in
   * apAvailable(actor). Fails CLOSED on an unknown actor or NaN AP (any
   * comparison against NaN is false).
   *
   * @param {Object|null} actor
   * @param {Array<Object>} declaredActions
   * @param {Object} action
   * @returns {boolean}
   */
  function canAfford(actor, declaredActions, action) {
    return apBreakdown(actor, declaredActions, action).affordable;
  }

  return {
    resolveMoveApCost,
    resolveActionApCost,
    resolveIntentApCost,
    isValidGridDest,
    apAvailable,
    apBreakdown,
    canAfford,
  };
}

module.exports = { createApLedger };
