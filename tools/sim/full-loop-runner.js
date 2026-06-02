'use strict';
// Full-loop AI-playtest runner — MVP fase-1b-1. Makes the AI play the WHOLE loop
// end-to-end: a campaign chain where each chapter's combat is REALLY played (not a
// faked `outcome:'victory'` stamp like campaignIntegration.test.js), the real
// outcome feeds /campaign/advance, branch nodes are chosen, and survivors carry
// across chapters (attrition). Per-step integration invariants are checked.
//
// Scope (fase-1b-1): the campaign+combat JOIN under AI-play + invariants. The Nido
// meta-step (recruit/mating/affinity) + scaled-enemy balance bands = fase-1b-2/fase-2.
// Enemies here are a weak deterministic set so the loop progresses to completion
// (the value is the integration, not the difficulty curve).

const driver = require('./campaign-driver');
const { runEncounter } = require('./combat-adapter');
const { checkInvariants } = require('./full-loop-invariants');

// Fresh per-mission copy of the alive roster: full HP + cleared status, original
// positions (each combat is a new session; survivors persist across missions, hp
// is restored between missions — typical campaign convention).
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

async function runFullLoop(
  http,
  { playerId, roster, branchKey = 'cave_path', seed, peEarned = 3, maxChapters = 15 } = {},
) {
  const sourceRosterIds = (roster || []).map((u) => u.id);
  const startRes = await driver.start(http, { playerId });
  if (startRes.status !== 201) {
    return {
      completed: false,
      chapters: [],
      violations: [{ step: 0, v: [`start status ${startRes.status} != 201`] }],
      finalRoster: [],
    };
  }
  const id = startRes.body.campaign.id;

  let aliveIds = [...sourceRosterIds];
  const chapters = [];
  const violations = [];
  let completed = false;

  for (let step = 1; step <= maxChapters; step += 1) {
    const sum = await driver.summary(http, id);
    const enc = sum.body?.current_encounter?.encounter_id || `chapter_${step}`;
    const aliveRoster = freshRoster(roster, aliveIds);
    if (aliveRoster.length === 0) {
      violations.push({ step, v: ['roster wiped before chapter'] });
      break;
    }

    const combat = await runEncounter(http, {
      roster: aliveRoster,
      enemies: enemiesForChapter(step),
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
      sourceRosterIds,
    });
    if (v.length) violations.push({ step, v });
    chapters.push({ step, encounter: enc, outcome: combat.outcome, survivors: aliveIds.length });

    if (adv.body && adv.body.choice_required) {
      await driver.choose(http, { id, branchKey });
    }
    if (adv.body && adv.body.campaign_completed) {
      completed = true;
      break;
    }
    if (adv.status !== 200) break;
  }

  return { completed, chapters, violations, finalRoster: aliveIds };
}

module.exports = { runFullLoop, enemiesForChapter };
