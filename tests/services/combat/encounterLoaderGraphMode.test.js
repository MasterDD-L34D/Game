'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  loadEncounter,
  listEncounters,
  _resetCache,
} = require('../../../apps/backend/services/combat/encounterLoader');

test('static loadEncounter (no opts) stays encounters/-only', () => {
  _resetCache();
  assert.ok(loadEncounter('enc_savana_01'), 'live encounter loads in static mode');
  assert.equal(loadEncounter('enc_tutorial_03'), null, 'draft NOT loaded in static mode');
});

test('graphMode loadEncounter unions encounters-draft/', () => {
  _resetCache();
  const draft = loadEncounter('enc_tutorial_03', { graphMode: true });
  assert.ok(draft, 'draft encounter loads in graph mode');
  assert.equal(draft.encounter_id, 'enc_tutorial_03');
  assert.ok(loadEncounter('enc_savana_01', { graphMode: true }), 'live still loads in graph mode');
});

test('live dir wins on id collision (graph mode resolves the live copy)', () => {
  _resetCache();
  const g = loadEncounter('enc_savana_01', { graphMode: true });
  const s = loadEncounter('enc_savana_01');
  assert.equal(g.encounter_id, s.encounter_id);
});

test('listEncounters graphMode includes drafts; static does not', () => {
  _resetCache();
  assert.equal(listEncounters().includes('enc_tutorial_03'), false);
  assert.equal(listEncounters({ graphMode: true }).includes('enc_tutorial_03'), true);
});
