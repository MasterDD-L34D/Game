'use strict';
// Full-loop AI-playtest runner. Makes the AI play the WHOLE loop end-to-end: a
// campaign chain where each chapter's combat is REALLY played (not a faked
// `outcome:'victory'` stamp), the real outcome feeds /campaign/advance, branch nodes
// are chosen, survivors carry across chapters (attrition), and a cleared chapter
// recruits an NPC into the Nido (fase-1b-2) that then FIGHTS the next mission as a
// faithful, canon-derived unit (fase-1b-3a). Per-step integration invariants checked.
//
// Scope: the campaign + combat + Nido-recruit JOIN under AI-play + invariants. Enemies
// here are a weak deterministic set so the loop progresses to completion (the value is
// the integration; scaled-enemy balance bands + mating/affinity = fase-1b-3b/fase-2).

const driver = require('./campaign-driver');
const { runEncounter } = require('./combat-adapter');
const { checkInvariants } = require('./full-loop-invariants');
const greedyPolicy = require('./greedy-policy');
const { resolveRecruitUnit } = require('./recruit-resolver');
const { applyNidoEconomy } = require('./nido-economy');
const { buildScenarioEnemies } = require('./scenario-enemies');

// Nido meta-step on a cleared chapter: the greedy policy recruits NPCs via the meta
// seam (POST /api/meta/recruit, affinity_at_recruit bypass -> getOrCreate NPC), then
// each recruit is resolved to a battle-ready PLAYER unit (recruit-resolver, faithful
// canonical stats) so it can join combat next mission (attrition replacement). Returns
// recruited ids + the resolved combat units + failures.
async function applyMetaStep(http, { id, step, rosterSize = 0 }) {
  const recruited = [];
  const units = [];
  const failures = [];
  const picks = greedyPolicy.chooseRecruits({ step });
  for (let i = 0; i < picks.length; i += 1) {
    const { npcId, speciesId } = picks[i];
    const r = await http.post('/api/meta/recruit', {
      npc_id: npcId,
      species_id: speciesId,
      affinity_at_recruit: 1,
      campaign_id: id,
    });
    // Count a recruit only when the metaProgression store actually marked the NPC
    // `recruited:true` (the canonical, DB-INDEPENDENT recruit state), not merely a 200
    // (Codex #2563 P2): the party_rosters upsert is best-effort/DB-dependent.
    const recruitedOk =
      r.status === 200 &&
      r.body &&
      r.body.success === true &&
      r.body.npc &&
      r.body.npc.recruited === true;
    if (recruitedOk) {
      recruited.push(npcId);
      // Recruits line up in column x:2 (starters/enemies use x:1), distinct rows, so a
      // growing roster never overlaps a starting position.
      const position = { x: 2, y: ((rosterSize + i) % 8) + 1 };
      units.push(resolveRecruitUnit({ npcId, speciesId, position }));
    } else {
      failures.push({ npcId, status: r.status, success: r.body && r.body.success });
    }
  }
  return { recruited, units, failures };
}

// Fresh per-mission copy of the alive roster: full HP + cleared status, original
// positions (each combat is a new session; survivors persist across missions, hp is
// restored between missions -- typical campaign convention).
function freshRoster(roster, aliveIds) {
  return roster
    .filter((u) => aliveIds.includes(u.id))
    .map((u) => ({ ...u, hp: u.max_hp ?? u.hp, status: {} }));
}

// Weak deterministic enemy for a chapter (MVP). fase-2 swaps in scaled scenario
// enemies (encounter YAML) for real attrition/completion bands.
function enemiesForChapter(step) {
  return [
    {
      id: `foe_${step}`,
      species: 'velox',
      hp: 4,
      max_hp: 4,
      ap: 1,
      mod: 0,
      dc: 1,
      attack_range: 1,
      initiative: 1,
      position: { x: 1, y: 4 },
      controlled_by: 'sistema',
      status: {},
    },
  ];
}

// fase-2b: sum a backend grants array by a numeric field (advance `xp_grants` -> `amount`,
// `mp_grants` -> `earned`). Tolerates a missing/empty array (non-victory advances grant
// nothing) so the economy accrual never invents a value.
function sumGrants(arr, field) {
  if (!Array.isArray(arr)) return 0;
  return arr.reduce((s, g) => s + (Number(g && g[field]) || 0), 0);
}

async function runFullLoop(http, opts = {}) {
  const { playerId, branchKey = 'cave_path', seed, peEarned = 3, maxChapters = 15 } = opts;
  // Roster GROWS as the Nido recruits: it starts as the authored party and gains a
  // faithful combat unit per cleared chapter. knownIds is the matching id universe so a
  // recruited survivor is never flagged as a "foreign" combatant by the identity
  // invariant (starters U recruited-so-far).
  const roster = [...(opts.roster || [])];
  const knownIds = roster.map((u) => u.id);
  // fase-2b: the AUTHORED starting party size (before any recruit grows the roster) is
  // the denominator for roster_attrition (survivors / initial-roster over the arc).
  const initialRosterSize = roster.length;

  const startRes = await driver.start(http, { playerId });
  if (startRes.status !== 201) {
    return {
      completed: false,
      chapters: [],
      violations: [{ step: 0, v: [`start status ${startRes.status} != 201`] }],
      finalRoster: [],
      recruited: [],
      metaViolations: [],
      initialRosterSize,
      economy: { peEarnedTotal: 0, xpGrantedTotal: 0, mpEarnedTotal: 0, piSpentTotal: 0 },
    };
  }
  const id = startRes.body.campaign.id;

  let aliveIds = [...knownIds];
  const chapters = [];
  const violations = [];
  const recruited = [];
  const metaViolations = [];
  // fase-1b-3b Nido economy + breeding (separate from the combat-recruit above):
  // earned-affinity recruits + mating offspring, proving those seams are AI-played.
  const economyRecruited = [];
  let offspring = 0;
  let economyAffinityProven = false;
  let completed = false;
  // fase-2b economy telemetry (read from the REAL advance response, never invented):
  //   peEarnedTotal  -- PE rewarded per cleared (victory) chapter (campaign-XP currency);
  //   xpGrantedTotal -- backend-granted survivor XP (advance.xp_grants[].amount);
  //   mpEarnedTotal  -- backend-granted mutation points (advance.mp_grants[].earned);
  //   piSpentTotal   -- PI sink (shop/build spend) is NOT wired in the loop yet -> 0
  //                     (a real surfaced gap for economy_flow, not a fabricated number).
  let peEarnedTotal = 0;
  let xpGrantedTotal = 0;
  let mpEarnedTotal = 0;

  for (let step = 1; step <= maxChapters; step += 1) {
    const sum = await driver.summary(http, id);
    const enc = sum.body?.current_encounter?.encounter_id || `chapter_${step}`;
    const aliveRoster = freshRoster(roster, aliveIds);
    if (aliveRoster.length === 0) {
      violations.push({ step, v: ['roster wiped before chapter'] });
      break;
    }

    // fase-2a scaled enemies: load the chapter's real encounter roster from YAML; fall
    // back to the weak-fixed enemy when the encounter has no YAML (cave_path: tutorial_03/
    // 04/05 + tutorial_06_hardcore) or an unsupported objective, so the loop still runs.
    const scaledEnemies = buildScenarioEnemies(enc);
    const enemies = scaledEnemies && scaledEnemies.length ? scaledEnemies : enemiesForChapter(step);
    const enemiesSource = scaledEnemies && scaledEnemies.length ? 'scenario' : 'fallback';

    const combat = await runEncounter(http, {
      roster: aliveRoster,
      enemies,
      scenarioId: enc,
      seed: seed ? `${seed}-${step}` : undefined,
      maxRounds: 40,
    });
    aliveIds = combat.survivorIds;
    const survivors = roster
      .filter((u) => aliveIds.includes(u.id))
      .map((u) => ({ id: u.id, job: u.job }));

    const adv = await driver.advance(http, { id, outcome: combat.outcome, peEarned, survivors });
    const v = checkInvariants({
      advanceStatus: adv.status,
      outcome: combat.outcome,
      peEarned,
      survivors: aliveIds,
      sourceRosterIds: knownIds,
    });
    if (v.length) violations.push({ step, v });
    // Accrue per-chapter economy from the real advance payload. PE is the victory reward
    // (gated on outcome); XP/MP grants are only emitted on victory, so the sums are 0 on
    // defeat/timeout without a special case.
    const xpGranted = sumGrants(adv.body && adv.body.xp_grants, 'amount');
    const mpEarned = sumGrants(adv.body && adv.body.mp_grants, 'earned');
    if (combat.outcome === 'victory') peEarnedTotal += peEarned;
    xpGrantedTotal += xpGranted;
    mpEarnedTotal += mpEarned;
    chapters.push({
      step,
      encounter: enc,
      outcome: combat.outcome,
      survivors: aliveIds.length,
      rosterIds: combat.rosterIds,
      enemiesSource,
      rounds: combat.rounds,
      xpGranted,
      mpEarned,
    });

    // Nido meta-step on a TRULY cleared chapter (Codex #2563 P2: gated on a 200 advance,
    // not just victory). Skipped on the campaign-completing chapter (Codex #2565 P2): a
    // recruit there has no next mission to fight, so it would inflate finalRoster +
    // recruit/attrition metrics with a unit that never entered combat. Recruited units
    // join the roster + alive pool so they fight the next mission -- recruit -> combat
    // feedback loop closed.
    const hasNextChapter = !(adv.body && adv.body.campaign_completed);
    if (adv.status === 200 && combat.outcome === 'victory' && hasNextChapter) {
      const meta = await applyMetaStep(http, { id, step, rosterSize: roster.length });
      recruited.push(...meta.recruited);
      for (const u of meta.units) {
        roster.push(u);
        aliveIds.push(u.id);
        knownIds.push(u.id);
      }
      if (meta.failures.length) metaViolations.push({ step, failures: meta.failures });

      // Nido economy + breeding seams (fase-1b-3b): earn affinity/trust -> recruit via
      // the canonical gate (no bypass) + roll a mating offspring. Default-store NPCs,
      // separate from the combat-recruit; offspring not resolved into combat (deferred).
      const econ = await applyNidoEconomy(http, { step, biomeId: 'badlands', runId: id });
      economyRecruited.push(...econ.earnedRecruits);
      offspring += econ.offspring;
      if (econ.affinityProven) economyAffinityProven = true;
      if (econ.failures.length) metaViolations.push({ step, econ: econ.failures });
    }

    if (adv.body && adv.body.choice_required) {
      await driver.choose(http, { id, branchKey });
    }
    if (adv.body && adv.body.campaign_completed) {
      completed = true;
      break;
    }
    if (adv.status !== 200) break;
  }

  return {
    completed,
    chapters,
    violations,
    finalRoster: aliveIds,
    recruited,
    metaViolations,
    economyRecruited,
    offspring,
    economyAffinityProven,
    initialRosterSize,
    economy: { peEarnedTotal, xpGrantedTotal, mpEarnedTotal, piSpentTotal: 0 },
  };
}

module.exports = { runFullLoop, enemiesForChapter, sumGrants };
