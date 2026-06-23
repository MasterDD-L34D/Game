// apps/backend/services/combat/pigmentiAurorali.js
//
// pigmenti_aurorali (creature-trait mechanics slice 7, trait 9 -- treant).
// Spec: docs/superpowers/specs/2026-06-22-creature-trait-mechanics-design.md
//
// Aurora pigments (Slay-the-Spire Glow). While the carrier is healthy (HP >= 50%),
// at end-of-round any ENEMY ending its turn adjacent (manhattan 1) is dazzled:
// `abbagliato` (-1 atk on its next attack, read in combat/statusModifiers). The glow
// dims as HP drops -- below the gate it does nothing.
//
// Lifecycle: abbagliato is set at END-OF-ROUND but read by the enemy's NEXT-round
// attack. The universal end-of-round status decay would zero a 1-turn status the same
// round it is set, so abbagliato is made DURABLE (sessionRoundBridge PERSISTENT_STATUS_
// KEYS, decay-proof) and SINGLE-USE -- consumeAbbagliato clears it on the dazzled unit's
// next attack. Net: exactly one -1 atk on the next attack, then gone (not a permanent
// dazzle). Same shape as risonanza_memetica's single-use consume (slice 3).
//
// (The ACTIVE mode -- 1 AP intensify to -2 + disorient on attackers -- is DEFERRED:
// a trait-granted ability needs the contract-schema effect_type + jobs.yaml
// re-baseline, owner-gated like filtri/matrice active. The slice-7 partner
// eco_sismico [tile timed-status] is DEFERRED too -- its tile-entry trigger needs the
// move/terrain substrate. Both surfaced in the slice-7 PR.)
//
// Pure (mutates adjacent enemies' status). Band-neutral: no sim unit carries
// pigmenti_aurorali, so applyEndRoundGlow is a no-op for every existing roster.

'use strict';

const PIGMENTI_TRAIT = 'pigmenti_aurorali';
const ABBAGLIATO = 'abbagliato';
// Durable sustained value (mirror the passive/coordinamento default). abbagliato is set
// at end-of-round but read by the enemy's NEXT-round attack -- the per-round status
// decay (sessionRoundBridge) would zero a small value before then, and PERSISTENT_STATUS_
// KEYS only guards the round wipe, NOT the decay loop. So abbagliato rides a high TTL
// (decays slowly) + PERSISTENT (wipe-exempt) and is removed by consumeAbbagliato on the
// dazzled unit's next attack -> net effect = exactly one -1 atk.
const ABBAGLIATO_TTL = 99;
const HP_GATE = 0.5; // glow only while HP >= 50% of max

// ACTIVE mode (1 AP): the carrier sets `pigmenti_intensificato` on itself (via the
// existing apply_status ability path). While intensified: (a) the end-of-round glow
// dazzles for -2 instead of -1 (abbagliato carries intensity 2, read in statusModifiers);
// (b) anyone who attacks the carrier is disoriented (disorient -> -2 atk, an existing
// status consumed in performAttack). The self-status decays normally (not persistent).
const PIGMENTI_INTENSIFICATO = 'pigmenti_intensificato';
const INTENSIFIED_ATK = 2; // abbagliato intensity while the glow is intensified
const DISORIENT = 'disorient';
const DISORIENT_TURNS = 2; // survives to the attacker's next attack, then decays

function hasTrait(unit, traitId) {
  const raw = unit && Array.isArray(unit.traits) ? unit.traits : [];
  for (const t of raw) {
    if (typeof t === 'string' && t === traitId) return true;
    if (t && typeof t === 'object' && t.id === traitId) return true;
  }
  return false;
}

function manhattanDistance(a, b) {
  if (!a || !b) return Infinity;
  return Math.abs(Number(a.x) - Number(b.x)) + Math.abs(Number(a.y) - Number(b.y));
}

/**
 * End-of-round glow sweep. While the carrier is at/above the HP gate, dazzle every
 * living adjacent enemy (opposite faction) with `abbagliato`. Pure; mutates the
 * dazzled enemies' status. Returns the applied events ([] on no-op).
 *
 * @param {object} opts
 * @param {object} opts.carrier the pigmenti carrier (needs position + controlled_by)
 * @param {Array}  opts.units   full roster
 * @returns {Array<{unit_id, stato, turns}>}
 */
function applyEndRoundGlow({ carrier, units }) {
  const events = [];
  if (!hasTrait(carrier, PIGMENTI_TRAIT)) return events;
  if (!carrier.position || !Array.isArray(units)) return events;
  // HP gate: glow dims below 50%.
  const max = Number(carrier.max_hp || carrier.hp || 0);
  const hp = Number(carrier.hp);
  if (!(max > 0) || !(hp >= HP_GATE * max)) return events;

  // Intensified glow (active) -> the dazzle is -2 (abbagliato intensity 2).
  const intensity =
    Number(carrier.status && carrier.status[PIGMENTI_INTENSIFICATO]) > 0 ? INTENSIFIED_ATK : 1;
  const faction = carrier.controlled_by;
  for (const enemy of units) {
    if (!enemy || enemy === carrier || enemy.id === carrier.id) continue;
    if (enemy.controlled_by === faction) continue; // allies untouched
    if (!(Number(enemy.hp) > 0)) continue;
    if (manhattanDistance(enemy.position, carrier.position) !== 1) continue;
    if (!enemy.status || typeof enemy.status !== 'object') enemy.status = {};
    const current = Number(enemy.status[ABBAGLIATO] || 0);
    if (current < ABBAGLIATO_TTL) enemy.status[ABBAGLIATO] = ABBAGLIATO_TTL;
    if (intensity > 1) {
      if (!enemy.status_intensity || typeof enemy.status_intensity !== 'object') {
        enemy.status_intensity = {};
      }
      enemy.status_intensity[ABBAGLIATO] = intensity;
    }
    events.push({ unit_id: enemy.id ?? null, stato: ABBAGLIATO, turns: ABBAGLIATO_TTL, intensity });
  }
  return events;
}

/**
 * On-attacked reaction (active mode): while the carrier is `pigmenti_intensificato`, the
 * dazzling burst disorients whoever attacks it. Sets `disorient` on the attacker (an
 * existing status -> -2 atk on its next attack, consumed in performAttack). Pure;
 * mutates the attacker's status. Returns the event (or null on no-op).
 *
 * @param {object} opts
 * @param {object} opts.carrier  the attacked pigmenti carrier
 * @param {object} opts.attacker the unit that attacked it (mutated)
 * @returns {{unit_id, stato, turns} | null}
 */
function disorientAttacker({ carrier, attacker }) {
  if (!hasTrait(carrier, PIGMENTI_TRAIT)) return null;
  if (!(Number(carrier.status && carrier.status[PIGMENTI_INTENSIFICATO]) > 0)) return null;
  if (!attacker || typeof attacker !== 'object') return null;
  if (attacker.id === carrier.id || !(Number(attacker.hp) > 0)) return null;
  if (!attacker.status || typeof attacker.status !== 'object') attacker.status = {};
  const current = Number(attacker.status[DISORIENT] || 0);
  if (current < DISORIENT_TURNS) attacker.status[DISORIENT] = DISORIENT_TURNS;
  return { unit_id: attacker.id ?? null, stato: DISORIENT, turns: DISORIENT_TURNS };
}

/**
 * Single-use spend of abbagliato. Returns true (and clears the status) when the unit
 * carried it, false otherwise. Called after the dazzled unit attacks.
 *
 * @param {object} unit (mutated)
 * @returns {boolean}
 */
function consumeAbbagliato(unit) {
  const st = unit && unit.status;
  if (st && !Array.isArray(st) && Number(st[ABBAGLIATO]) > 0) {
    delete st[ABBAGLIATO];
    if (unit.status_intensity) delete unit.status_intensity[ABBAGLIATO];
    return true;
  }
  return false;
}

module.exports = {
  applyEndRoundGlow,
  consumeAbbagliato,
  disorientAttacker,
  hasTrait,
  manhattanDistance,
  PIGMENTI_TRAIT,
  PIGMENTI_INTENSIFICATO,
  ABBAGLIATO,
  ABBAGLIATO_TTL,
  INTENSIFIED_ATK,
  DISORIENT,
  DISORIENT_TURNS,
  HP_GATE,
};
