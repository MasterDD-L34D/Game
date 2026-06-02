'use strict';
// fase-1b-3b Nido economy + breeding meta-step. Exercises two canonical Nido seams
// that the combat-recruit (fase-1b-3a) does not:
//   (1) AFFINITY ECONOMY -- earn affinity/trust to satisfy the canonical recruit gate
//       (metaProgression RECRUIT_AFFINITY_MIN=0, RECRUIT_TRUST_MIN=2) and recruit
//       WITHOUT the affinity_at_recruit bypass.
//   (2) BREEDING -- /api/meta/mating/roll producing an offspring spec.
//
// Runs on the DEFAULT meta store: the /affinity + /trust endpoints ignore campaign_id,
// so earned affinity cannot reach the campaign-scoped recruit store without an engine
// change (verified by probe: earn+recruit succeeds with no campaign_id; the same with a
// campaign_id returns gate_not_met). The courtship NPCs therefore prove the
// economy/breeding seams; they are NOT the units that fight (that is the campaign-scoped
// combat-recruit in the runner). Offspring are not resolved into combat (deferred to a
// later slice / fase-2). Additive: failures surface in `failures`, never throw.

const greedyPolicy = require('./greedy-policy');

async function applyNidoEconomy(http, { step, biomeId } = {}) {
  const out = { earnedRecruits: [], offspring: 0, affinityProven: false, failures: [] };

  // (1) Affinity economy: earn affinity + trust, then recruit through the EARNED gate.
  const c = greedyPolicy.chooseCourtship({ step });
  await http.post('/api/meta/affinity', { npc_id: c.npcId, delta: c.affinityDelta });
  const tr = await http.post('/api/meta/trust', { npc_id: c.npcId, delta: c.trustDelta });
  // can_recruit flipped true purely from the earned affinity/trust (no bypass involved).
  out.affinityProven = !!(tr && tr.body && tr.body.can_recruit === true);

  // No affinity_at_recruit bypass and no campaign_id (the default store where the
  // affinity/trust were earned) -> proves the canonical recruit economy.
  const rec = await http.post('/api/meta/recruit', { npc_id: c.npcId, species_id: c.speciesId });
  const earnedOk =
    rec.status === 200 &&
    rec.body &&
    rec.body.success === true &&
    rec.body.npc &&
    rec.body.npc.recruited === true;
  if (earnedOk) out.earnedRecruits.push(c.npcId);
  else {
    out.failures.push({
      phase: 'earned_recruit',
      npcId: c.npcId,
      status: rec.status,
      reason: rec.body && rec.body.reason,
    });
  }

  // (2) Breeding: roll a squad-mate mating once two courtship NPCs exist (step >= 2).
  const mating = greedyPolicy.chooseMating({ step });
  if (mating) {
    const m = await http.post('/api/meta/mating/roll', {
      parent_a: { id: mating.parentA },
      parent_b: { id: mating.parentB },
      biome_id: biomeId,
    });
    if (m.status === 200 && m.body && m.body.success === true && m.body.offspring)
      out.offspring += 1;
    else
      out.failures.push({ phase: 'mating', status: m.status, success: m.body && m.body.success });
  }

  return out;
}

module.exports = { applyNidoEconomy };
