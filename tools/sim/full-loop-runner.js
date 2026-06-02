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

async function runFullLoop(http, opts = {}) {
  const { playerId, branchKey = 'cave_path', seed, peEarned = 3, maxChapters = 15 } = opts;
  // Roster GROWS as the Nido recruits: it starts as the authored party and gains a
  // faithful combat unit per cleared chapter. knownIds is the matching id universe so a
  // recruited survivor is never flagged as a "foreign" combatant by the identity
  // invariant (starters U recruited-so-far).
  const roster = [...(opts.roster || [])];
  const knownIds = roster.map((u) => u.id);

  const startRes = await driver.start(http, { playerId });
  if (startRes.status !== 201) {
    return {
      completed: false,
      chapters: [],
      violations: [{ step: 0, v: [`start status ${startRes.status} != 201`] }],
      finalRoster: [],
      recruited: [],
      metaViolations: [],
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
    chapters.push({
      step,
      encounter: enc,
      outcome: combat.outcome,
      survivors: aliveIds.length,
      rosterIds: combat.rosterIds,
      enemiesSource,
      rounds: combat.rounds,
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
  };
}

module.exports = { runFullLoop, enemiesForChapter };
