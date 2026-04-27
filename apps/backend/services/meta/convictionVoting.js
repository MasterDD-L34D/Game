// Sprint δ Meta Systemic — Pattern 4 (Triangle Strategy conviction voting).
//
// Multi-player choice resolution with VC-axis weighted votes.
// Each voter contributes weight derived from VC axis alignment with choice.
//
// Pattern source: docs/research/2026-04-27-strategy-games-mechanics-extraction.md §8
// (Triangle Strategy Scales of Conviction). In Triangle Strategy, branching
// decisions are decided by liege council vote where each member's vote weight
// is derived from past character actions (conviction). We adapt this with VC
// axes (T_F or J_P) so voter weight reflects player MBTI personality slope.
//
// Tie-break: prefer status-quo choice (choice_id with `is_status_quo: true`),
// fallback to alphabetical first choice_id.
//
// Missing axis fallback: weight = 1.0 (neutral, equivalent to no influence).
//
// Used by: routes/conviction.js (POST /vote, GET /results).

'use strict';

const _activeBallots = new Map(); // session_id → { choices: Map<choice_id, choice_meta>, votes: Map<player_id, vote> }

const VC_AXIS_DEFAULT = 'T_F';

/**
 * Reset all in-memory ballots (test helper).
 */
function _resetBallots() {
  _activeBallots.clear();
}

/**
 * Initialize a ballot for a session with a list of choices.
 *
 * Each choice shape:
 *   { choice_id: string, label_it?: string, vc_axis?: 'T_F'|'J_P'|...,
 *     vc_target?: number (-1..1), is_status_quo?: boolean }
 *
 * `vc_target` represents the alignment direction this choice favors on the
 * specified axis. Voter weight is derived from |vc_axis_value - vc_target|
 * inverse — closer alignment ⇒ higher weight.
 *
 * @param {string} session_id
 * @param {object[]} choices
 * @returns {{ ok: boolean, ballot?: object, reason?: string }}
 */
function initBallot(session_id, choices) {
  if (!session_id || typeof session_id !== 'string') {
    return { ok: false, reason: 'session_id_required' };
  }
  if (!Array.isArray(choices) || choices.length < 2) {
    return { ok: false, reason: 'choices_min_two_required' };
  }
  const choiceMap = new Map();
  for (const c of choices) {
    if (!c.choice_id || typeof c.choice_id !== 'string') continue;
    choiceMap.set(c.choice_id, {
      choice_id: c.choice_id,
      label_it: c.label_it || c.choice_id,
      vc_axis: c.vc_axis || VC_AXIS_DEFAULT,
      vc_target: typeof c.vc_target === 'number' ? c.vc_target : 0,
      is_status_quo: c.is_status_quo === true,
    });
  }
  if (choiceMap.size < 2) {
    return { ok: false, reason: 'invalid_choices_after_validation' };
  }
  const ballot = {
    session_id,
    choices: choiceMap,
    votes: new Map(),
    created_at: new Date().toISOString(),
  };
  _activeBallots.set(session_id, ballot);
  return { ok: true, ballot };
}

/**
 * Compute single-vote weight for a player choice.
 *
 * Formula:
 *   weight = 1.0 + (1.0 - normalizedDistance)
 *   normalizedDistance = clamp(|vc_value - vc_target| / 2.0, 0, 1)
 *
 * Range: 1.0 (no alignment / missing axis) → 2.0 (perfect alignment).
 *
 * @param {object} choice — { vc_axis, vc_target }
 * @param {object} vc_snapshot — { axes: { T_F: number, J_P: number, ... } }
 * @returns {number}
 */
function computeVoteWeight(choice, vc_snapshot) {
  const axes = vc_snapshot?.axes || vc_snapshot || {};
  const value = Number(axes[choice.vc_axis]);
  if (Number.isNaN(value)) return 1.0; // fallback: missing axis = neutral weight
  const target = Number(choice.vc_target ?? 0);
  const distance = Math.abs(value - target);
  // Axes typically -1..1, distance max 2.0
  const normalized = Math.min(distance / 2.0, 1.0);
  return 1.0 + (1.0 - normalized);
}

/**
 * Cast a vote for a player on a session ballot.
 * Subsequent votes from same player_id replace previous vote.
 *
 * @param {string} session_id
 * @param {string} player_id
 * @param {string} choice_id
 * @param {object} vc_snapshot
 * @returns {{ ok: boolean, vote?: object, reason?: string }}
 */
function castVote(session_id, player_id, choice_id, vc_snapshot) {
  const ballot = _activeBallots.get(session_id);
  if (!ballot) return { ok: false, reason: 'ballot_not_found' };
  if (!player_id || typeof player_id !== 'string') {
    return { ok: false, reason: 'player_id_required' };
  }
  const choice = ballot.choices.get(choice_id);
  if (!choice) return { ok: false, reason: 'choice_not_found' };
  const weight = computeVoteWeight(choice, vc_snapshot);
  const vote = {
    player_id,
    choice_id,
    weight,
    cast_at: new Date().toISOString(),
  };
  ballot.votes.set(player_id, vote);
  return { ok: true, vote };
}

/**
 * Tally votes for a session ballot.
 *
 * @param {string} session_id
 * @returns {{
 *   ok: boolean,
 *   tally?: { choice_id: string, weight_total: number, voter_count: number }[],
 *   winner_choice_id?: string|null,
 *   tie?: boolean,
 *   reason?: string
 * }}
 */
function tally(session_id) {
  const ballot = _activeBallots.get(session_id);
  if (!ballot) return { ok: false, reason: 'ballot_not_found' };
  const totals = new Map();
  for (const choice_id of ballot.choices.keys()) {
    totals.set(choice_id, { choice_id, weight_total: 0, voter_count: 0 });
  }
  for (const vote of ballot.votes.values()) {
    const t = totals.get(vote.choice_id);
    if (!t) continue;
    t.weight_total += vote.weight;
    t.voter_count += 1;
  }
  const tallyArr = Array.from(totals.values()).sort(
    (a, b) => b.weight_total - a.weight_total || a.choice_id.localeCompare(b.choice_id),
  );
  let winner = null;
  let tie = false;
  if (tallyArr.length > 0) {
    const top = tallyArr[0];
    const second = tallyArr[1];
    if (top.weight_total === 0 && (!second || second.weight_total === 0)) {
      // No votes cast yet
      winner = null;
      tie = true;
    } else if (second && top.weight_total === second.weight_total) {
      // Tie: prefer status_quo
      const tied = tallyArr.filter((t) => t.weight_total === top.weight_total);
      const sq = tied.find((t) => ballot.choices.get(t.choice_id)?.is_status_quo);
      winner = sq ? sq.choice_id : top.choice_id;
      tie = true;
    } else {
      winner = top.choice_id;
    }
  }
  return {
    ok: true,
    tally: tallyArr,
    winner_choice_id: winner,
    tie,
  };
}

/**
 * Tally a list of votes directly without persistent ballot store.
 * Helper for stateless aggregations.
 *
 * @param {object[]} votes — [{ choice_id, weight }, ...]
 * @param {object[]} choices — [{ choice_id, is_status_quo? }]
 * @returns {{ winner_choice_id: string|null, tie: boolean, totals: object[] }}
 */
function tallyConviction(votes = [], choices = []) {
  const choiceMap = new Map();
  for (const c of choices) {
    if (!c.choice_id) continue;
    choiceMap.set(c.choice_id, c);
  }
  const totals = new Map();
  for (const c of choiceMap.keys()) totals.set(c, 0);
  for (const v of votes) {
    if (!totals.has(v.choice_id)) continue;
    totals.set(v.choice_id, totals.get(v.choice_id) + Number(v.weight ?? 1));
  }
  const totalsArr = Array.from(totals.entries())
    .map(([choice_id, weight]) => ({ choice_id, weight_total: weight }))
    .sort((a, b) => b.weight_total - a.weight_total || a.choice_id.localeCompare(b.choice_id));
  let winner = null;
  let tie = false;
  if (totalsArr.length > 0) {
    const top = totalsArr[0];
    const second = totalsArr[1];
    if (top.weight_total === 0) {
      winner = null;
      tie = true;
    } else if (second && top.weight_total === second.weight_total) {
      const tied = totalsArr.filter((t) => t.weight_total === top.weight_total);
      const sq = tied.find((t) => choiceMap.get(t.choice_id)?.is_status_quo);
      winner = sq ? sq.choice_id : top.choice_id;
      tie = true;
    } else {
      winner = top.choice_id;
    }
  }
  return { winner_choice_id: winner, tie, totals: totalsArr };
}

/**
 * Close ballot and return final result.
 *
 * @param {string} session_id
 * @returns {{ ok: boolean, result?: object, reason?: string }}
 */
function closeBallot(session_id) {
  const ballot = _activeBallots.get(session_id);
  if (!ballot) return { ok: false, reason: 'ballot_not_found' };
  const result = tally(session_id);
  _activeBallots.delete(session_id);
  return { ok: true, result };
}

module.exports = {
  initBallot,
  castVote,
  tally,
  tallyConviction,
  closeBallot,
  computeVoteWeight,
  _resetBallots,
  VC_AXIS_DEFAULT,
};
