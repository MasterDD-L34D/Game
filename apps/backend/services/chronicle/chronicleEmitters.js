// =============================================================================
// Chronicle emitters -- SPEC-Q M-7 wiring. Helpers that translate engine
// lifecycle events into chronicle_event appends (services/chronicle/chronicleStore).
//
// Keystone link (SPEC-P A3 failure-as-lore): a failed run is a narrative event.
// `emitRunFailed` is called best-effort at session end (routes/session.js) so the
// chronicle starts receiving real events. M-2 creature_named / M-3 mutation_lineage
// emitters land when those systems (identity service / named-mutation) are built.
// =============================================================================

'use strict';

const { appendEvent } = require('./chronicleStore');

// Loss outcomes that count as a narrative run failure (A3). Victory/draw/abandon excluded.
const DEFEAT_OUTCOMES = new Set(['wipe', 'timeout', 'defeat', 'objective_failed']);

/**
 * Append a `run_failed` chronicle event when a session ends in defeat.
 * Pure-ish: reads session.{campaign_id,outcome,encounter_id,turn}, never throws.
 * Returns the chronicleStore.appendEvent result, or { ok:false, error } for no-op.
 *
 * @param session  combat session (post outcome-normalization)
 * @param opts     { baseDir? } (test override; prod uses chronicleStore default)
 */
function emitRunFailed(session, opts = {}) {
  if (!session || typeof session !== 'object') return { ok: false, error: 'no_session' };
  const runId = session.campaign_id;
  if (!runId) return { ok: false, error: 'no_campaign_id' };
  if (!DEFEAT_OUTCOMES.has(session.outcome)) return { ok: false, error: 'not_a_defeat' };
  return appendEvent(
    runId,
    {
      type: 'run_failed',
      actor_id: null,
      tier: 'public',
      payload: {
        outcome: session.outcome,
        encounter_id: session.encounter_id || null,
        turn: Number.isFinite(Number(session.turn)) ? Number(session.turn) : null,
      },
    },
    { baseDir: opts.baseDir },
  );
}

module.exports = { emitRunFailed, DEFEAT_OUTCOMES };
