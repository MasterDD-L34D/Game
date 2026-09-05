// Sprint α (2026-04-28) — Bravado AP refill chain-kill.
//
// Pattern source: Hard West 2 — "Bravado" mechanic.
// Strategy research §2 rank #2.
//
// Goal: rewarda highrisk plays + chain decisions tattiche. Quando un PLAYER
// unit uccide un target, riceve +1 AP refill (cap a actor.ap max).
// Sistema actor (controlled_by !== 'player') NON triggera per asimmetria
// risk/reward (Pilastro 5 co-op vs Sistema).
//
// Pure module. Caller (damage step) chiama onKillRefill quando killOccurred.
// Back-compat: actor senza ap_remaining → no-op silent.
//
// API:
//   onKillRefill(actor, target) — return { refilled: number, new_ap: number }
//
// Note: cap = actor.ap (max). Zero exceed. Refill 0 se actor non player o
// target sopravvive (caller filtra).

'use strict';

const REFILL_AMOUNT = 1;

/**
 * Rifill AP su kill. Player-only.
 *
 * @param {object} actor — attacker (deve avere ap, ap_remaining, controlled_by)
 * @param {object} target — defender (deve avere hp)
 * @returns {{ refilled: number, new_ap: number, reason?: string }}
 */
function onKillRefill(actor, target) {
  if (!actor || typeof actor !== 'object') {
    return { refilled: 0, new_ap: 0, reason: 'no_actor' };
  }
  if (!target || typeof target !== 'object') {
    return { refilled: 0, new_ap: Number(actor.ap_remaining || 0), reason: 'no_target' };
  }
  // Solo player triggera (asimmetria risk/reward).
  if (actor.controlled_by !== 'player') {
    return { refilled: 0, new_ap: Number(actor.ap_remaining || 0), reason: 'not_player' };
  }
  // Kill check: target deve essere a 0 hp.
  if (Number(target.hp) !== 0) {
    return { refilled: 0, new_ap: Number(actor.ap_remaining || 0), reason: 'target_alive' };
  }
  const apMax = Number(actor.ap || 0);
  const apCurrent = Number(actor.ap_remaining || 0);
  if (apMax <= 0) {
    return { refilled: 0, new_ap: apCurrent, reason: 'no_ap_max' };
  }
  if (apCurrent >= apMax) {
    return { refilled: 0, new_ap: apCurrent, reason: 'capped' };
  }
  const refilled = Math.min(REFILL_AMOUNT, apMax - apCurrent);
  actor.ap_remaining = apCurrent + refilled;
  return { refilled, new_ap: actor.ap_remaining };
}

module.exports = {
  onKillRefill,
  REFILL_AMOUNT,
};
