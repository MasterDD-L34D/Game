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

// fase-2c: `policy` is pluggable (greedy by default). mbtiPolicy varies the courted species
// per temperament while keeping the same gate-satisfying deltas, so the earned-affinity
// economy + breeding seams stay exercised under any policy.
async function applyNidoEconomy(http, { step, biomeId, runId, policy = greedyPolicy } = {}) {
  const out = {
    earnedRecruits: [],
    offspring: 0,
    // Per-offspring lineage records for the diversity metric (the breeding analog of
    // roster_composition). parentSpecies is the policy-sensitive signal; lineageId/tier are
    // captured from the /mating/roll response for provenance.
    offspringLineages: [],
    affinityProven: false,
    failures: [],
  };

  // (1) Affinity economy: earn affinity + trust, then recruit through the EARNED gate.
  // runId scopes the courtship ids per run (Codex #2566 P2) so repeated sims on one
  // process don't collide on the default meta store.
  const c = policy.chooseCourtship({ step, runId });
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
  const mating = policy.chooseMating({ step, runId });
  if (mating) {
    const m = await http.post('/api/meta/mating/roll', {
      parent_a: { id: mating.parentA },
      parent_b: { id: mating.parentB },
      biome_id: biomeId,
    });
    if (m.status === 200 && m.body && m.body.success === true && m.body.offspring) {
      out.offspring += 1;
      // Capture the offspring lineage. parentSpecies = the cross that bred: parentA is the
      // PREVIOUS step's courted species, parentB is this step's (chooseMating pairs courtship
      // s-1 + s). This is the POLICY-SENSITIVE signal (mbti courts a different species order ->
      // a different cross). The canonical lineage_id + tier come from the response (provenance);
      // the diversity metric keys on parentSpecies, NOT lineage_id (a hash of the per-run
      // courtship ids -> unique per run + identical across policies -> useless as a P4 signal).
      const off = m.body.offspring;
      const parentA = policy.chooseCourtship({ step: step - 1, runId });
      out.offspringLineages.push({
        parentSpecies: [parentA && parentA.speciesId, c.speciesId],
        lineageId: (off && off.lineage_id) || null,
        tier: off && off.tier != null ? off.tier : null,
      });
    } else {
      out.failures.push({ phase: 'mating', status: m.status, success: m.body && m.body.success });
    }
  }

  return out;
}

module.exports = { applyNidoEconomy };
