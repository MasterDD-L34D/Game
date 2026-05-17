// 2026-05-15 Bundle C cross-stack parity — vcScoring snapshot → debrief_payload
// flatten transform. Mirror Godot v2 DebriefState.to_debrief_payload (PR #274).
//
// Provides Game/-side serializer for host-driven endCombat OR future
// server-driven debrief_payload broadcast (parity with #2276 surface).
//
// Input shape (vcScoring.buildVcSnapshot per_actor):
//   {
//     raw_metrics, aggregate_indices, mbti_axes, mbti_type,
//     ennea_archetypes: Array<{name?: string, ...}>,
//     conviction_axis: { utility, liberty, morality, events_classified },
//     sentience: { tier: "T0"-"T6", source: string }
//   }
//
// Output shape (debrief_payload schema PINNED Godot v2 #276):
//   {
//     per_actor: {
//       <uid>: {
//         sentience_tier: "T0"-"T6",
//         conviction_axis: { utility, liberty, morality },  // 3 keys, int
//         ennea_archetype: "<canonical IT name>"             // single primary
//       }
//     }
//   }
//
// Cross-stack contract: PR #276 schema parity snapshot Godot v2.
'use strict';

const CANONICAL_AXIS_KEYS = ['utility', 'liberty', 'morality'];

/**
 * Flatten vcScoring buildVcSnapshot per_actor to debrief_payload schema.
 *
 * @param {object} vcSnapshot — output of vcScoring.buildVcSnapshot(session, config)
 * @returns {object} debrief_payload `{per_actor: {<uid>: {...3 layers...}}}`
 */
function vcSnapshotToDebriefPayload(vcSnapshot) {
  const payload = { per_actor: {} };
  if (!vcSnapshot || typeof vcSnapshot !== 'object') return payload;
  const perActor = vcSnapshot.per_actor;
  if (!perActor || typeof perActor !== 'object') return payload;

  for (const [uid, actorData] of Object.entries(perActor)) {
    if (!actorData || typeof actorData !== 'object') continue;
    const entry = {};

    // Sentience: tier flatten (skip source meta).
    const sent = actorData.sentience;
    if (sent && typeof sent === 'object' && typeof sent.tier === 'string') {
      entry.sentience_tier = sent.tier;
    }

    // Conviction: keep 3 canonical keys only, coerce to int (drop events_classified).
    const axis = actorData.conviction_axis;
    if (axis && typeof axis === 'object') {
      const flatAxis = {};
      for (const key of CANONICAL_AXIS_KEYS) {
        if (key in axis && typeof axis[key] === 'number') {
          flatAxis[key] = Math.round(axis[key]);
        }
      }
      if (Object.keys(flatAxis).length === CANONICAL_AXIS_KEYS.length) {
        entry.conviction_axis = flatAxis;
      }
    }

    // Ennea: primary triggered archetype. Real vcScoring shape is
    // {id, triggered, condition, reason?} (NOT {.name}). Pick first triggered
    // entry; if none, omit ennea_archetype. Codex P2 fix on PR #2277.
    const ennea = actorData.ennea_archetypes;
    if (Array.isArray(ennea) && ennea.length > 0) {
      // Pick first triggered entry (NOT [0] which may be untriggered).
      const primary = ennea.find((e) => e && typeof e === 'object' && e.triggered === true);
      if (primary && typeof primary.id === 'string') {
        entry.ennea_archetype = primary.id;
      }
      // Defensive bare-string fallback (legacy back-compat; real buildVcSnapshot
      // never emits bare strings).
      else if (typeof ennea[0] === 'string') {
        entry.ennea_archetype = ennea[0];
      }
    }

    // Skip unit with zero meaningful surface (preserve back-compat).
    if (Object.keys(entry).length > 0) {
      payload.per_actor[uid] = entry;
    }
  }
  return payload;
}

module.exports = { vcSnapshotToDebriefPayload, CANONICAL_AXIS_KEYS };
