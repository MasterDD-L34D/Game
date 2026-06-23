// apps/backend/services/combat/statusModifiers.js
//
// M-future Status Engine Extension (2026-04-25 audit balance-auditor).
// Wires 7 NEW status names runtime-active that previously were silently
// no-op (apply_status writes unit.status[stato], but downstream consumers
// did not read these names). Closes audit P0 status orphan finding —
// unlocks 68/267 ancestor traits runtime value.
//
// Statuses supportati:
//   • linked           +1 attack_mod actor (only if ally adjacent)
//   • fed              +1 HP regen at turn end (cap max_hp)
//   • healing          +1 HP regen at turn end (HoT, decay 1/turn handled
//                      by universal status decay loop in
//                      sessionRoundBridge.applyEndOfRoundSideEffects)
//   • attuned          +1 defense_mod target side
//   • sensed           +1 attack_mod actor (accuracy proxy)
//   • telepatic_link   reveal — log marker only (no stat effect)
//   • frenzy           +1 attack_mod actor, -1 defense_mod actor when
//                      attacked (rage variant, 2 turns canonical)
//
// Decay: integer keys decremented 1/round by the existing universal loop
// in sessionRoundBridge.js. No new decay code path required.
//
// Pattern reference: piggyback on the enrage pattern in session.js:
//   1. compute deltas (pre-attack)
//   2. apply to actor.attack_mod_bonus + target.defense_mod_bonus
//   3. resolveAttack runs
//   4. revert deltas post-attack
// This avoids persistent mutation of canonical bonuses written by the
// ability executor.

'use strict';

// OD-058 D2 read-apply (#2531): location-wound maluses, applied flag-gated inside
// computeStatusModifiers. Same-dir require, no cycle (woundSystem is pure/standalone).
const woundSystem = require('./woundSystem');

// Action 5a (2026-04-29) — wounded_perma severity 3-tier attack_mod scaling.
// Battle Brothers attrition pattern: ferita compromettente compromette accuracy.
// Mapping integer (attack_mod e' integer scale d20 — 1 step ~5-7% hit chance):
//   light  → 0   (graffio leggero, default backward-compat — NO regression)
//   medium → -1  (~ -5/-15% intent ADR §Action 5a)
//   severe → -2  (~ -30% intent: ferita grave compromesso totale)
// Default `light` se field assente in unit.status.wounded_perma.
const WOUNDED_PERMA_ATTACK_PENALTY = Object.freeze({
  light: 0,
  medium: -1,
  severe: -2,
});

// Action 5b (2026-04-29) — bleeding/fracture severity 3-tier slow_down trigger.
// User verdetto Q2 2026-04-28: `minor` NO trigger (graffio leggero neutral, NO
// double-penalty oltre HP drain). `medium` + `major` SI trigger.
// Convention: unit.status.bleeding_severity / fracture_severity ∈ enum.
const BLEEDING_FRACTURE_SLOW_DOWN_THRESHOLD = Object.freeze({
  minor: false, // NO trigger — graffio neutral
  medium: true, // trigger — ferita compromettente
  major: true, // trigger — ferita grave totale
});

function manhattanDistance(a, b) {
  if (!a || !b) return Infinity;
  return Math.abs(Number(a.x) - Number(b.x)) + Math.abs(Number(a.y) - Number(b.y));
}

function isPositive(value) {
  return Number(value) > 0;
}

function normalizeWoundedSeverity(value) {
  const s = String(value || '').toLowerCase();
  return s in WOUNDED_PERMA_ATTACK_PENALTY ? s : 'light';
}

function normalizeBleedingFractureSeverity(value) {
  const s = String(value || '').toLowerCase();
  return s in BLEEDING_FRACTURE_SLOW_DOWN_THRESHOLD ? s : 'minor';
}

/**
 * Action 5a — read wounded_perma severity off unit.status (object map shape:
 * { hp_penalty, stacks, severity }) and return integer attack_mod penalty.
 * Returns 0 if no wound active OR severity unknown (defaults light → 0).
 *
 * @param {object} unit
 * @returns {{ penalty: number, severity: string, active: boolean }}
 */
function computeWoundedPermaAttackPenalty(unit) {
  const status = (unit && unit.status) || {};
  // OD-058 D2 double-apply guard: the location-based woundSystem (unit.status.wounds)
  // supersedes this legacy wounded_perma attack penalty. When the new model carries any
  // wound, yield here so attack_mod is NOT penalized by BOTH systems. (Zero current
  // behavior change: nothing populates unit.status.wounds until the D2 live cutover PR.)
  if (Array.isArray(status.wounds) && status.wounds.length > 0) {
    return { penalty: 0, severity: 'light', active: false, superseded: true };
  }
  const wp = status.wounded_perma;
  if (!wp || typeof wp !== 'object') {
    return { penalty: 0, severity: 'light', active: false };
  }
  const severity = normalizeWoundedSeverity(wp.severity);
  const penalty = WOUNDED_PERMA_ATTACK_PENALTY[severity] || 0;
  return { penalty, severity, active: true };
}

// True when the unit carries the `ferito` status, in EITHER shape: object-map
// (`status.ferito` = turns-remaining N or boolean true) or the back-compat array
// (`status = ['ferito', ...]`). Mirrors traitEffects.hasActorStatus without the
// cross-module require (statusModifiers stays leaf).
function _isFerito(unit) {
  const st = unit && unit.status;
  if (!st) return false;
  if (Array.isArray(st)) return st.includes('ferito');
  return isPositive(st.ferito);
}

/**
 * Action 5b — slow_down trigger when ANY of: panic > 0, confused > 0,
 * bleeding ≥ medium severity, fracture ≥ medium severity, OR the unit carries
 * the `nocicezione` interoception trait while Ferito (OD-024 engine #1). Returns
 * action_speed reduction amount (1 = "1 tier slower", 0 = no penalty).
 *
 * Reads unit.status object-map shape (panic/confused/bleeding/fracture =
 * turns remaining N; bleeding_severity/fracture_severity = enum string).
 * Default severity `minor` se field absent (NO trigger — backward-compat).
 *
 * @param {object} unit
 * @returns {{ amount: number, triggers: string[] }}
 */
function computeSlowDownPenalty(unit) {
  const status = (unit && unit.status) || {};
  const triggers = [];
  if (isPositive(status.panic)) triggers.push('panic');
  if (isPositive(status.confused)) triggers.push('confused');
  if (isPositive(status.bleeding)) {
    const sev = normalizeBleedingFractureSeverity(status.bleeding_severity);
    if (BLEEDING_FRACTURE_SLOW_DOWN_THRESHOLD[sev]) {
      triggers.push(`bleeding:${sev}`);
    }
  }
  if (isPositive(status.fracture)) {
    const sev = normalizeBleedingFractureSeverity(status.fracture_severity);
    if (BLEEDING_FRACTURE_SLOW_DOWN_THRESHOLD[sev]) {
      triggers.push(`fracture:${sev}`);
    }
  }
  // OD-024 engine #1 (action-timing): the `nocicezione` interoception trait makes a
  // unit act 1 tier slower WHILE Ferito ("ritardi quando Ferito" -- master-dd ratified
  // 2026-06-21: passive -1 initiative). Joins the existing slow triggers under the SAME
  // canonical "1 tier slower" cap (return below) -- NO new magnitude in the resolver,
  // and it does NOT cumulate with bleeding/fracture. The sentience grant flag
  // (SENTIENCE_INTEROCEPTION_GRANT_ENABLED) gates WHO carries nocicezione, so this is
  // band-neutral until that flag flips (no unit carries the trait today).
  const traits = Array.isArray(unit && unit.traits) ? unit.traits : [];
  if (traits.includes('nocicezione') && _isFerito(unit)) {
    triggers.push('nocicezione:ferito');
  }
  return { amount: triggers.length > 0 ? 1 : 0, triggers };
}

/**
 * Computes status-driven attack/defense modifiers for a single attack.
 *
 * @param {object} actor       Attacking unit (has actor.status, actor.position).
 * @param {object} target      Defending unit (has target.status, target.position).
 * @param {Array}  units       Full unit roster (for adjacency scans).
 * @returns {{
 *   attackDelta: number,      // delta to add to actor.attack_mod_bonus
 *   defenseDelta: number,     // delta to add to target.defense_mod_bonus
 *   log: Array<{status, side, effect}>
 * }}
 */
function computeStatusModifiers(actor, target, units = []) {
  const log = [];
  let attackDelta = 0;
  let defenseDelta = 0;

  const actorStatus = (actor && actor.status) || {};
  const targetStatus = (target && target.status) || {};

  // ─── Actor-side actor-attack buffs ──────────────────────────────
  if (isPositive(actorStatus.linked)) {
    // Requires same-faction ally adjacent (manhattan <= 1, hp > 0,
    // not the actor itself). If alone, no bonus — design intent.
    const hasAllyAdjacent = (units || []).some(
      (u) =>
        u &&
        u.id !== actor.id &&
        Number(u.hp || 0) > 0 &&
        u.controlled_by === actor.controlled_by &&
        manhattanDistance(u.position, actor.position) === 1,
    );
    if (hasAllyAdjacent) {
      attackDelta += 1;
      log.push({ status: 'linked', side: 'actor', effect: '+1 attack_mod (ally adjacent)' });
    }
  }
  if (isPositive(actorStatus.sensed)) {
    attackDelta += 1;
    log.push({ status: 'sensed', side: 'actor', effect: '+1 attack_mod (accuracy)' });
  }
  if (isPositive(actorStatus.frenzy)) {
    attackDelta += 1;
    log.push({ status: 'frenzy', side: 'actor', effect: '+1 attack_mod (rage variant)' });
  }
  if (isPositive(actorStatus.telepatic_link)) {
    // No stat effect — narrative reveal marker only.
    log.push({ status: 'telepatic_link', side: 'actor', effect: 'reveal (no stat delta)' });
  }
  if (isPositive(actorStatus.nucleo_intatto)) {
    // nuclei_di_controllo (creature-trait slice 2): an intact control nucleus
    // coordinates the unit's strikes -> +1 attack_mod. Lost once the weak-point
    // is broken (combat/nucleiWeakPoint applies danno_nucleo, which clears this).
    attackDelta += 1;
    log.push({ status: 'nucleo_intatto', side: 'actor', effect: '+1 attack_mod (nucleo intatto)' });
  }
  if (isPositive(actorStatus.coordinamento)) {
    // nuclei_di_controllo coordinamento aura (creature-trait slice 3): an ally
    // within range 2 of an intact nucleus carrier strikes in concert -> +1
    // attack_mod. Producer = combat/allyAuraMark.refreshNucleiCoordinamento.
    attackDelta += 1;
    log.push({ status: 'coordinamento', side: 'actor', effect: '+1 attack_mod (coordinamento)' });
  }
  if (isPositive(actorStatus.risonanza_memetica)) {
    // corteccia_memetica ripple (creature-trait slice 3): a single-use +1 atk
    // broadcast to allies in range 3 when the treant takes a heavy blow. Spent on
    // the ally's next attack (combat/cortecciaMemetica.consumeRisonanza clears it).
    attackDelta += 1;
    log.push({
      status: 'risonanza_memetica',
      side: 'actor',
      effect: '+1 attack_mod (risonanza memetica)',
    });
  }

  // ─── Target-side target-defense buffs/debuffs ───────────────────
  if (isPositive(targetStatus.attuned)) {
    defenseDelta += 1;
    log.push({ status: 'attuned', side: 'target', effect: '+1 defense_mod' });
  }
  if (isPositive(targetStatus.frenzy)) {
    // Frenzy on the defender: lowered guard. -1 defense_mod (attacker
    // gets an easier hit). This is the "rage variant" downside.
    defenseDelta -= 1;
    log.push({ status: 'frenzy', side: 'target', effect: '-1 defense_mod (rage exposure)' });
  }
  if (isPositive(targetStatus.sbilanciato)) {
    // GAP-3 (parity-sweep 2026-06-07) — spinta/shield_bash unbalances the target:
    // lowered guard, -1 defense_mod (attacker gets an easier hit). Canonical
    // intensity 1 (combat.schema.json). Writer = shield_bash (jobs.yaml); this is
    // the missing read-path (Python resolver had it, dropped in Node migration).
    defenseDelta -= 1;
    log.push({ status: 'sbilanciato', side: 'target', effect: '-1 defense_mod (spinta exposure)' });
  }
  if (isPositive(targetStatus.danno_nucleo)) {
    // nuclei_di_controllo broken state: the unit hunkers around its damaged
    // nucleus -> +1 defense_mod (harder to hit), trading away the intact attack
    // aura. Set by combat/nucleiWeakPoint on a MoS>=5 hit.
    defenseDelta += 1;
    log.push({
      status: 'danno_nucleo',
      side: 'target',
      effect: '+1 defense_mod (nucleo danneggiato)',
    });
  }

  // ─── OD-058 D2 read-apply (flag-gated, #2531) — location wounds → deltas ───
  // Actor wounds: attack_mod (arti_anteriori) + accuracy (testa lieve/media) both
  // reduce the d20 to-hit, so they fold into attackDelta (logged separately).
  // Target wounds: defense_mod (torso) lowers the DC (easier to hit).
  // mobility (arti_posteriori) has NO engine consumer (no move-range stat) ->
  // intentionally inert here; ap is applied at refill (sessionHelpers.applyApRefill).
  // Flag OFF (default) = zero delta, status quo byte-identical.
  if (woundSystem.isReadApplyEnabled()) {
    const wmActor = woundSystem.computeWoundMaluses(actor);
    if (wmActor.attack_mod !== 0) {
      attackDelta += wmActor.attack_mod;
      log.push({
        status: 'wound',
        side: 'actor',
        effect: `${wmActor.attack_mod} attack_mod (location wound)`,
      });
    }
    if (wmActor.accuracy !== 0) {
      attackDelta += wmActor.accuracy;
      log.push({
        status: 'wound',
        side: 'actor',
        effect: `${wmActor.accuracy} accuracy (testa wound, to-hit)`,
      });
    }
    const wmTarget = woundSystem.computeWoundMaluses(target);
    if (wmTarget.defense_mod !== 0) {
      defenseDelta += wmTarget.defense_mod;
      log.push({
        status: 'wound',
        side: 'target',
        effect: `${wmTarget.defense_mod} defense_mod (location wound)`,
      });
    }
  }

  // ─── Action 5a — wounded_perma severity → actor attack_mod penalty ────
  const wpActor = computeWoundedPermaAttackPenalty(actor);
  if (wpActor.active && wpActor.penalty !== 0) {
    attackDelta += wpActor.penalty;
    log.push({
      status: 'wounded_perma',
      side: 'actor',
      effect: `${wpActor.penalty >= 0 ? '+' : ''}${wpActor.penalty} attack_mod (severity: ${wpActor.severity})`,
    });
  }

  // ─── Action 5b — slow_down trigger flags (consumed by roundOrchestrator) ─
  const actorSlow = computeSlowDownPenalty(actor);
  const targetSlow = computeSlowDownPenalty(target);
  if (actorSlow.amount > 0) {
    log.push({
      status: 'slow_down',
      side: 'actor',
      effect: `-1 action_speed tier (${actorSlow.triggers.join(',')})`,
    });
  }
  if (targetSlow.amount > 0) {
    log.push({
      status: 'slow_down',
      side: 'target',
      effect: `-1 action_speed tier (${targetSlow.triggers.join(',')})`,
    });
  }

  return {
    attackDelta,
    defenseDelta,
    actorSlowDown: actorSlow.amount > 0,
    targetSlowDown: targetSlow.amount > 0,
    actorSlowDownTriggers: actorSlow.triggers,
    targetSlowDownTriggers: targetSlow.triggers,
    log,
  };
}

/**
 * Apply per-turn HP regen from `fed` / `healing` status. Run at turn end
 * before universal status decay (so the decremented value still triggers
 * regen on its last live turn). Caps regen to max_hp; KO units excluded.
 *
 * Returns log array with one entry per regen tick.
 *
 * @param {object} unit Unit with status, hp, max_hp.
 * @returns {Array<{unit_id, status, amount, hp_before, hp_after}>}
 */
function applyTurnRegen(unit) {
  if (!unit || !unit.status || Number(unit.hp || 0) <= 0) return [];
  const max = Number(unit.max_hp || unit.hp);
  const events = [];

  for (const statusName of ['fed', 'healing']) {
    if (!isPositive(unit.status[statusName])) continue;
    if (unit.hp >= max) continue;
    const hpBefore = unit.hp;
    unit.hp = Math.min(max, unit.hp + 1);
    events.push({
      unit_id: unit.id,
      status: statusName,
      amount: unit.hp - hpBefore,
      hp_before: hpBefore,
      hp_after: unit.hp,
    });
  }
  return events;
}

/**
 * 2026-05-20 — list status penalty tiers (A6 pattern, gap-fill Explore
 * quick-win wave 3 #2). Used by readonly diagnostic route + frontend
 * combat UI per preload penalty tier table (avoids client-side duplication).
 *
 * @returns {{
 *   wounded_perma_attack_penalty: Array<{severity, penalty}>,
 *   bleeding_fracture_slow_down_threshold: Array<{severity, triggers_slow_down}>,
 * }}
 */
function listStatusPenalties() {
  return {
    wounded_perma_attack_penalty: Object.entries(WOUNDED_PERMA_ATTACK_PENALTY).map(
      ([severity, penalty]) => ({ severity, penalty }),
    ),
    bleeding_fracture_slow_down_threshold: Object.entries(
      BLEEDING_FRACTURE_SLOW_DOWN_THRESHOLD,
    ).map(([severity, triggers_slow_down]) => ({ severity, triggers_slow_down })),
  };
}

module.exports = {
  computeStatusModifiers,
  applyTurnRegen,
  computeWoundedPermaAttackPenalty,
  computeSlowDownPenalty,
  listStatusPenalties,
  // Exported for tests
  manhattanDistance,
  WOUNDED_PERMA_ATTACK_PENALTY,
  BLEEDING_FRACTURE_SLOW_DOWN_THRESHOLD,
};
