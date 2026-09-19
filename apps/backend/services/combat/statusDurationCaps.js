// apps/backend/services/combat/statusDurationCaps.js
//
// Cap canonici di durata per status. Estratti da routes/session.js (dove vivevano dal
// 2026-04-25) perche' servono anche al drain in combat/pendingStatusRemovals.js, e il
// bridge non puo' importare da routes/session.js senza ciclo.
//
// Origine (audit balance-auditor 2026-04-25): il cap totale di durata per tipo di status
// previene il "sustained rage" durante una kill chain -- 13 trait producono `rage` on_kill.
// La ri-applicazione avviene via `Math.max(current, turns)`, quindi il cap si impone con
// `Math.min(CAP, ...)` SUL VALORE FUSO, non sull'addendo.
//
// `rage`/`frenzy` a 5 turni (peer: le varianti a 3 turni di ferocia + 2 round di momentum
// massimo). `panic`/`stunned`/`confused` ereditano cap corti (3-4) per intento di design.
// Uno status non elencato qui NON ha cap: comportamento invariato.

'use strict';

const STATUS_DURATION_CAPS = {
  rage: 5,
  frenzy: 5,
  panic: 4,
  stunned: 3,
  confused: 3,
  bleeding: 5,
  marked: 2,
  slowed: 3,
  burning: 3,
  chilled: 2,
  disorient: 1,
};

/**
 * Cap per uno status, o null se non ne ha uno.
 *
 * @param {string} stato
 * @returns {number|null}
 */
function capFor(stato) {
  const cap = STATUS_DURATION_CAPS[stato];
  return Number.isFinite(Number(cap)) ? Number(cap) : null;
}

/**
 * Applica il cap a un valore gia' fuso (post `Math.max`).
 *
 * @param {string} stato
 * @param {number} value
 * @returns {number} `value` se lo status non ha cap
 */
function clampDuration(stato, value) {
  const cap = capFor(stato);
  const v = Number(value);
  if (cap === null || !Number.isFinite(v)) return v;
  return Math.min(cap, v);
}

module.exports = { STATUS_DURATION_CAPS, capFor, clampDuration };
