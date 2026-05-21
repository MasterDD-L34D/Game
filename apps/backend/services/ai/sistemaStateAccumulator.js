// M1 ADR-2026-05-18 Option B pilot — Sistema persistent learning accumulator.
// Pure function over a finished session: returns the next units_observed map.
// Per PG unit (controlled_by === 'player'): sightings += 1 (present this
// encounter); kills_vs_sistema += kills landed on sistema units this session;
// threat_level = 'high' once kills_vs_sistema >= HIGH_THREAT_KILLS.
// Deterministic, no I/O, does not mutate inputs. v0 threshold tuning-gated
// (anti-pattern #14/#15 — no balance claim).

'use strict';

const HIGH_THREAT_KILLS = 3;

function accumulate(priorUnitsObserved, session) {
  const out = {};
  // Deep-copy prior so we never mutate caller state.
  const prior =
    priorUnitsObserved && typeof priorUnitsObserved === 'object' ? priorUnitsObserved : {};
  for (const id of Object.keys(prior)) {
    const r = prior[id] || {};
    out[id] = {
      kills_vs_sistema: Number(r.kills_vs_sistema) || 0,
      sightings: Number(r.sightings) || 0,
      threat_level: r.threat_level === 'high' ? 'high' : 'normal',
    };
  }
  const units = Array.isArray(session && session.units) ? session.units : [];
  const events = Array.isArray(session && session.events) ? session.events : [];
  // controlled_by lookup for cross-referencing kill actor/target.
  const controlledBy = {};
  for (const u of units) {
    if (u && u.id != null) controlledBy[u.id] = u.controlled_by;
  }
  // sightings: every PG present this encounter.
  for (const u of units) {
    if (!u || u.controlled_by !== 'player' || u.id == null) continue;
    const rec = (out[u.id] = out[u.id] || {
      kills_vs_sistema: 0,
      sightings: 0,
      threat_level: 'normal',
    });
    rec.sightings += 1;
  }
  // kills_vs_sistema: kill events where a PG killed a SIS unit.
  // NOTE: controlledBy is built from session.units, so a kill by a PG that is
  // absent from the final units snapshot is intentionally NOT credited (only
  // units present in the session are tracked). Intended; not a dropped event.
  for (const ev of events) {
    if (!ev || ev.action_type !== 'kill') continue;
    if (controlledBy[ev.actor_id] !== 'player') continue;
    if (controlledBy[ev.target_id] !== 'sistema') continue;
    const rec = (out[ev.actor_id] = out[ev.actor_id] || {
      kills_vs_sistema: 0,
      sightings: 0,
      threat_level: 'normal',
    });
    rec.kills_vs_sistema += 1;
  }
  // threat_level is ALWAYS recomputed from final kills_vs_sistema; the prior
  // record's threat_level value is ignored (recompute-always invariant). If
  // HIGH_THREAT_KILLS is ever tuned, units re-evaluate against the new threshold.
  for (const id of Object.keys(out)) {
    out[id].threat_level = out[id].kills_vs_sistema >= HIGH_THREAT_KILLS ? 'high' : 'normal';
  }
  return out;
}

module.exports = { accumulate, HIGH_THREAT_KILLS };
