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

    // Ennea: primary archetype (first fired). Array of objects with .name field.
    const ennea = actorData.ennea_archetypes;
    if (Array.isArray(ennea) && ennea.length > 0) {
      const primary = ennea[0];
      if (primary && typeof primary === 'object' && typeof primary.name === 'string') {
        entry.ennea_archetype = primary.name;
      } else if (typeof primary === 'string') {
        // Defensive: accept bare-string array shape too.
        entry.ennea_archetype = primary;
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
