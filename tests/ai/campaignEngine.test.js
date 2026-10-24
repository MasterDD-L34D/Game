// M10 Phase C — campaignEngine.js unit tests.
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  computeProgress,
  getCurrentEncounter,
  getNextEncounter,
  canAdvance,
  canChoose,
  getBranchPath,
  summariseCampaign,
  _totalPlayableEncounters,
} = require('../../apps/backend/services/campaign/campaignEngine');

const {
  loadCampaign,
  _resetCache,
} = require('../../apps/backend/services/campaign/campaignLoader');

function _baseCampaign(overrides = {}) {
  return {
    id: 'test-uuid',
    playerId: 'p1',
    campaignDefId: 'default_campaign_mvp',
    currentChapter: 1,
    currentAct: 0,
    branchChoices: [],
    completionPct: 0.0,
    finalState: null,
    chapters: [],
    partyRoster: [],
    createdAt: '2026-04-20T00:00:00Z',
    updatedAt: '2026-04-20T00:00:00Z',
    ...overrides,
  };
}

test('_totalPlayableEncounters: default_campaign_mvp = 9', () => {
  _resetCache();
  const def = loadCampaign('default_campaign_mvp');
  // 5 tutorial (Act 0) + 4 Act 1 (savana + 2 branch alts only 1 playable at a time) + boss
  // Real count: 5 + 4 = 9 playable encounter entries (excl. choice node)
  const total = _totalPlayableEncounters(def);
  assert.equal(total, 9);
});

test('computeProgress: zero chapters = 0.0', () => {
  _resetCache();
  const def = loadCampaign('default_campaign_mvp');
  const camp = _baseCampaign();
  assert.equal(computeProgress(camp, def), 0);
});

test('computeProgress: 5 victory over 9 = 0.55', () => {
  _resetCache();
  const def = loadCampaign('default_campaign_mvp');
  const camp = _baseCampaign({
    chapters: [
      { outcome: 'victory' },
      { outcome: 'victory' },
      { outcome: 'victory' },
      { outcome: 'victory' },
      { outcome: 'victory' },
    ],
  });
  const prog = computeProgress(camp, def);
  assert.ok(prog >= 0.55 && prog <= 0.56, `got ${prog}`);
});

test('computeProgress: finalState completed = 1.0', () => {
  _resetCache();
  const def = loadCampaign('default_campaign_mvp');
  const camp = _baseCampaign({ finalState: 'completed' });
  assert.equal(computeProgress(camp, def), 1.0);
});

test('computeProgress: defeat chapters not counted', () => {
  _resetCache();
  const def = loadCampaign('default_campaign_mvp');
  const camp = _baseCampaign({
    chapters: [{ outcome: 'defeat' }, { outcome: 'timeout' }, { outcome: 'victory' }],
  });
  const prog = computeProgress(camp, def);
  assert.ok(prog >= 0.11 && prog <= 0.12, `got ${prog}`);
});

test('getCurrentEncounter: chapter 1 Act 0 = enc_tutorial_01', () => {
  _resetCache();
  const def = loadCampaign('default_campaign_mvp');
  const camp = _baseCampaign();
  const enc = getCurrentEncounter(camp, def);
  assert.ok(enc);
  assert.equal(enc.encounter_id, 'enc_tutorial_01');
});

test('getNextEncounter: chapter 1 victory → chapter 2 = enc_tutorial_02', () => {
  _resetCache();
  const def = loadCampaign('default_campaign_mvp');
  const camp = _baseCampaign();
  const next = getNextEncounter(camp, def);
  assert.equal(next.next_encounter_id, 'enc_tutorial_02');
});

test('getNextEncounter: Act 0 last (ch 5) → Act 1 transition = enc_savana_01', () => {
  _resetCache();
  const def = loadCampaign('default_campaign_mvp');
  const camp = _baseCampaign({ currentChapter: 5, currentAct: 0 });
  const next = getNextEncounter(camp, def);
  assert.equal(next.next_encounter_id, 'enc_savana_01');
  assert.equal(next.next_act, 1);
});

test('getNextEncounter: chapter 6 → chapter 7 choice_node required', () => {
  _resetCache();
  const def = loadCampaign('default_campaign_mvp');
  const camp = _baseCampaign({ currentChapter: 6, currentAct: 1 });
  const next = getNextEncounter(camp, def);
  assert.equal(next.choice_required, true);
  assert.ok(next.choice_node);
  assert.equal(next.choice_node.option_a.branch_key, 'cave_path');
});

test('getNextEncounter: boss defeated → campaign_completed', () => {
  _resetCache();
  const def = loadCampaign('default_campaign_mvp');
  const camp = _baseCampaign({
    currentChapter: 9,
    currentAct: 1,
    branchChoices: ['cave_path'],
  });
  const next = getNextEncounter(camp, def);
  assert.equal(next.campaign_completed, true);
});

test('canAdvance: false if finalState set', () => {
  const camp = _baseCampaign({ finalState: 'completed' });
  assert.equal(canAdvance(camp), false);
});

test('canAdvance: true default', () => {
  const camp = _baseCampaign();
  assert.equal(canAdvance(camp), true);
});

test('canChoose: false if not at choice_node', () => {
  _resetCache();
  const def = loadCampaign('default_campaign_mvp');
  const camp = _baseCampaign();
  assert.equal(canChoose(camp, def), false);
});

test('canChoose: true at Act 1 chapter 7 (choice_node)', () => {
  _resetCache();
  const def = loadCampaign('default_campaign_mvp');
  const camp = _baseCampaign({ currentChapter: 7, currentAct: 1 });
  assert.equal(canChoose(camp, def), true);
});

test('getBranchPath: empty default', () => {
  const camp = _baseCampaign();
  assert.deepEqual(getBranchPath(camp), []);
});

test('getBranchPath: returns cave_path after choice', () => {
  const camp = _baseCampaign({ branchChoices: ['cave_path'] });
  assert.deepEqual(getBranchPath(camp), ['cave_path']);
});

test('summariseCampaign: null campaign returns null', () => {
  assert.equal(summariseCampaign(null, null), null);
});

test('summariseCampaign: default campaign full shape', () => {
  _resetCache();
  const def = loadCampaign('default_campaign_mvp');
  const camp = _baseCampaign();
  const summary = summariseCampaign(camp, def);
  assert.ok(summary);
  assert.ok(summary.campaign);
  assert.ok(summary.current_encounter);
  assert.equal(summary.current_encounter.encounter_id, 'enc_tutorial_01');
  assert.equal(summary.next_encounter.next_encounter_id, 'enc_tutorial_02');
  assert.equal(summary.progress, 0.0);
  assert.equal(summary.can_advance, true);
  assert.equal(summary.can_choose, false);
  assert.deepEqual(summary.branch_path, []);
  assert.equal(summary.completion_status, 'in_progress');
});

test('summariseCampaign: finalized campaign status completed', () => {
  _resetCache();
  const def = loadCampaign('default_campaign_mvp');
  const camp = _baseCampaign({ finalState: 'completed', completionPct: 1.0 });
  const summary = summariseCampaign(camp, def);
  assert.equal(summary.completion_status, 'completed');
  assert.equal(summary.can_advance, false);
  assert.equal(summary.progress, 1.0);
});
