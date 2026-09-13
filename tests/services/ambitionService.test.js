// Action 6 (ADR-2026-04-28 §Action 6) — ambitionService backend test.
//
// Coverage 6 test:
//   1. loadAmbition canonical seed + missing
//   2. progressAmbition encounter sequence (5 victory) → progress = target
//   3. progressAmbition defeat outcome → progress unchanged
//   4. evaluateChoiceRitual fame_path → outcome standard_kill + bond_hearts_delta=0
//   5. evaluateChoiceRitual bond_path success (bond_hearts >= threshold) → alliance_emergent
//   6. evaluateChoiceRitual bond_path locked (bond_hearts < threshold) → locked beat
//   + getActiveAmbitions filter session
//   + threshold gate guard (progress < target → choice_incomplete)

'use strict';

const { test, describe, beforeEach } = require('node:test');
const assert = require('node:assert/strict');

const ambitionService = require('../../apps/backend/services/campaign/ambitionService');

const AMBITION_ID = 'skiv_pulverator_alliance';
const ENCOUNTER_ID = 'enc_savana_skiv_solo_vs_pack';

function progressFiveVictories(sid) {
  for (let i = 0; i < 5; i++) {
    ambitionService.progressAmbition(sid, AMBITION_ID, {
      encounter_id: ENCOUNTER_ID,
      outcome: 'victory',
    });
  }
}

describe('ambitionService.loadAmbition', () => {
  beforeEach(() => ambitionService._resetState());

  test('canonical Skiv-Pulverator seed loads + has progress_target', () => {
    const a = ambitionService.loadAmbition(AMBITION_ID);
    assert.ok(a, 'ambition should load');
    assert.equal(a.ambition_id, AMBITION_ID);
    assert.equal(a.progress_target, 5);
    assert.ok(a.choice_ritual);
    assert.equal(a.choice_ritual.bond_hearts_threshold, 3);
  });

  test('missing ambition_id → null (graceful)', () => {
    const a = ambitionService.loadAmbition('nonexistent_ambition_xyz');
    assert.equal(a, null);
  });
});

describe('ambitionService.progressAmbition', () => {
  beforeEach(() => ambitionService._resetState());

  test('5 victory encounters → progress reaches target + choice_ready', () => {
    const sid = 'sess-test-1';
    let last;
    for (let i = 0; i < 5; i++) {
      last = ambitionService.progressAmbition(sid, AMBITION_ID, {
        encounter_id: ENCOUNTER_ID,
        outcome: 'victory',
      });
    }
    assert.equal(last.progress, 5);
    assert.equal(last.progress_target, 5);
    assert.equal(last.choice_ready, true);
    assert.equal(last.completed, false);
  });

  test('defeat outcome → progress unchanged', () => {
    const sid = 'sess-test-2';
    const r = ambitionService.progressAmbition(sid, AMBITION_ID, {
      encounter_id: ENCOUNTER_ID,
      outcome: 'defeat',
    });
    assert.equal(r.progress, 0);
    assert.equal(r.choice_ready, false);
  });

  test('non-matching encounter_id → progress unchanged', () => {
    const sid = 'sess-test-3';
    const r = ambitionService.progressAmbition(sid, AMBITION_ID, {
      encounter_id: 'enc_unrelated_xyz',
      outcome: 'victory',
    });
    assert.equal(r.progress, 0);
  });
});

describe('ambitionService.evaluateChoiceRitual', () => {
  beforeEach(() => ambitionService._resetState());

  test('fame_path → outcome standard_kill + lineage_merge=false + narrative beat', () => {
    const sid = 'sess-fame';
    progressFiveVictories(sid);
    const r = ambitionService.evaluateChoiceRitual(sid, AMBITION_ID, 'fame_dominance', {
      bond_hearts: 0,
    });
    assert.equal(r.completed, true);
    assert.equal(r.outcome, 'standard_kill');
    assert.equal(r.lineage_merge, false);
    assert.ok(r.narrative_beat);
    assert.equal(r.narrative_beat.beat_id, 'skiv_pulverator_kill_outcome');
    assert.equal(r.narrative_beat.voice_line_skiv, 'Sabbia tace.');
  });

  test('bond_path success (bond_hearts=3) → alliance_emergent + lineage_merge=true', () => {
    const sid = 'sess-bond-ok';
    progressFiveVictories(sid);
    const r = ambitionService.evaluateChoiceRitual(sid, AMBITION_ID, 'bond_proposal', {
      bond_hearts: 3,
    });
    assert.equal(r.completed, true);
    assert.equal(r.outcome, 'alliance_emergent');
    assert.equal(r.lineage_merge, true);
    assert.equal(r.merge_lineage_on_bond, true);
    assert.ok(r.narrative_beat);
    assert.equal(r.narrative_beat.beat_id, 'skiv_pulverator_reconciliation');
    assert.equal(r.narrative_beat.voice_line_skiv, 'Sabbia segue branco doppio.');
  });

  test('bond_path locked (bond_hearts<3) → locked + locked_beat + state unmutated', () => {
    const sid = 'sess-bond-locked';
    progressFiveVictories(sid);
    const r = ambitionService.evaluateChoiceRitual(sid, AMBITION_ID, 'bond_proposal', {
      bond_hearts: 1,
    });
    assert.equal(r.locked, true);
    assert.equal(r.locked_reason, 'bond_hearts_below_threshold');
    assert.equal(r.bond_hearts, 1);
    assert.equal(r.bond_hearts_threshold, 3);
    assert.ok(r.narrative_beat);
    assert.equal(r.narrative_beat.beat_id, 'skiv_pulverator_choice_locked_low_bond');
    // state must remain unlocked → caller can retry once bond_hearts >= threshold.
    const entry = ambitionService.getProgress(sid, AMBITION_ID);
    assert.equal(entry.completed, false);
    assert.equal(entry.choice_made, null);
  });

  test('progress incomplete (<target) → error progress_incomplete', () => {
    const sid = 'sess-incomplete';
    ambitionService.progressAmbition(sid, AMBITION_ID, {
      encounter_id: ENCOUNTER_ID,
      outcome: 'victory',
    });
    const r = ambitionService.evaluateChoiceRitual(sid, AMBITION_ID, 'fame_dominance', {
      bond_hearts: 0,
    });
    assert.equal(r.error, 'progress_incomplete');
    assert.equal(r.progress, 1);
  });
});

describe('ambitionService.getActiveAmbitions', () => {
  beforeEach(() => ambitionService._resetState());

  test('seeded ambition appears in active list with progress + choice_ready flag', () => {
    const sid = 'sess-active';
    ambitionService.seedAmbition(sid, AMBITION_ID);
    const list = ambitionService.getActiveAmbitions(sid);
    assert.equal(list.length, 1);
    assert.equal(list[0].ambition_id, AMBITION_ID);
    assert.equal(list[0].progress, 0);
    assert.equal(list[0].progress_target, 5);
    assert.equal(list[0].choice_ready, false);
  });

  test('completed ambition (post fame ritual) → filtered out from active list', () => {
    const sid = 'sess-completed';
    progressFiveVictories(sid);
    ambitionService.evaluateChoiceRitual(sid, AMBITION_ID, 'fame_dominance', {
      bond_hearts: 0,
    });
    const list = ambitionService.getActiveAmbitions(sid);
    assert.equal(list.length, 0);
  });
});

describe('ambitionService.formatAmbitionLabel', () => {
  beforeEach(() => ambitionService._resetState());

  test('formats progress + target via {placeholders}', () => {
    const a = ambitionService.loadAmbition(AMBITION_ID);
    const label = ambitionService.formatAmbitionLabel(a, 2);
    assert.ok(label.includes('2/5'));
    assert.ok(label.includes('Alleanza Pulverator'));
  });
});
