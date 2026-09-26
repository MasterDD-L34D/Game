'use strict';

// OD-024 engine #2 (D6) -- stamina/fatica sprint subsystem. Pure module.
// Spec: docs/superpowers/specs/2026-06-22-od024-engine2-stamina-fatigue-design.md
//
// A unit that over-commits a round to movement ("sprint" = ended the round with all
// AP spent on >=2 voluntary tiles) accrues 1 fatica; at/over a per-unit threshold the
// unit loses 1 AP next round; fatica decays 1 per non-sprint round. `propriocezione`
// bearers get +1 tolerance (penalised one sprint later -- hardier, NOT immune).
//
// Flag-gated OFF (STAMINA_FATIGUE_ENABLED): callers guard on isFatigueEnabled, so with
// the flag OFF nothing accrues, no penalty applies, and `unit.fatica` is never written
// -> band-neutral incl. serialization (the publicSessionView spread emits it only when
// the field exists). The four numeric knobs are RATIFIED-PROVISIONAL (master-dd ratifies
// on PR); YAML-promotion path noted in spec sez.8.

const FLAG = 'STAMINA_FATIGUE_ENABLED';
const SPRINT_MIN_TILES = 2; // with ap_remaining==0 -> "all-AP-on-move" sprint
const FATIGUE_PENALTY_THRESHOLD = 1; // fatica >= threshold -> -1 AP next round
const PROPRIOCEZIONE_TOLERANCE = 1; // propriocezione: threshold +1 (hardier, not immune)
const FATIGUE_DECAY = 1; // -1 fatica per non-sprint round
const AP_PENALTY = 1; // -1 AP next round when over threshold

function isFatigueEnabled(env = process.env) {
  return Boolean(env) && env[FLAG] === 'true';
}

function hasPropriocezione(unit) {
  return Array.isArray(unit && unit.traits) && unit.traits.includes('propriocezione');
}

// Sprint = ended the round having spent ALL AP on movement, >=2 voluntary tiles.
function isSprintRound(unit) {
  if (!unit) return false;
  const apRemaining = Number(unit.ap_remaining ?? unit.ap ?? 0);
  const tiles = Number(unit._tiles_voluntary_round || 0);
  return apRemaining === 0 && tiles >= SPRINT_MIN_TILES;
}

// Round-boundary update: +1 on a sprint round, else decay; always reset the per-round
// voluntary-tile accumulator. Clamps fatica >= 0.
function accrueOrDecay(unit) {
  if (!unit) return;
  const current = Number(unit.fatica || 0);
  const next = isSprintRound(unit) ? current + 1 : Math.max(0, current - FATIGUE_DECAY);
  unit.fatica = Math.max(0, next);
  unit._tiles_voluntary_round = 0;
}

function penaltyThreshold(unit) {
  return FATIGUE_PENALTY_THRESHOLD + (hasPropriocezione(unit) ? PROPRIOCEZIONE_TOLERANCE : 0);
}

function fatiguePenalty(unit) {
  if (!unit) return 0;
  return Number(unit.fatica || 0) >= penaltyThreshold(unit) ? AP_PENALTY : 0;
}

module.exports = {
  FLAG,
  SPRINT_MIN_TILES,
  FATIGUE_PENALTY_THRESHOLD,
  PROPRIOCEZIONE_TOLERANCE,
  FATIGUE_DECAY,
  AP_PENALTY,
  isFatigueEnabled,
  hasPropriocezione,
  isSprintRound,
  accrueOrDecay,
  penaltyThreshold,
  fatiguePenalty,
};
