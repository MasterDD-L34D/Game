// M10 Phase A — campaignLoader.js unit tests.

'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const {
  loadCampaign,
  validateCampaign,
  getActs,
  getEncountersForAct,
  resolveBranch,
  extractAllEncounterIds,
  _resetCache,
  CAMPAIGN_DIR,
} = require('../../apps/backend/services/campaign/campaignLoader');

test('loadCampaign: default_campaign_mvp loads successfully', () => {
  _resetCache();
  const data = loadCampaign('default_campaign_mvp');
  assert.ok(data, 'should load');
  assert.equal(data.campaign_id, 'default_campaign_mvp');
  assert.equal(data.schema_version, '1.0');
});

test('loadCampaign: missing campaign returns null', () => {
  _resetCache();
  assert.equal(loadCampaign('nonexistent_xyz'), null);
});

test('validateCampaign: rejects empty acts', () => {
  assert.throws(() => {
    validateCampaign({ schema_version: '1.0', campaign_id: 'x', acts: [] });
  }, /acts array empty/);
});

test('validateCampaign: rejects missing campaign_id', () => {
  assert.throws(() => {
    validateCampaign({ schema_version: '1.0', acts: [{ act_idx: 0, encounters: [] }] });
  }, /campaign_id missing/);
});

test('validateCampaign: rejects >1 choice node per act', () => {
  assert.throws(() => {
    validateCampaign({
      schema_version: '1.0',
      campaign_id: 'x',
      acts: [
        {
          act_idx: 0,
          encounters: [
            {
              is_choice_node: true,
              choice: { option_a: { branch_key: 'a' }, option_b: { branch_key: 'b' } },
            },
            {
              is_choice_node: true,
              choice: { option_a: { branch_key: 'c' }, option_b: { branch_key: 'd' } },
            },
          ],
        },
      ],
    });
  }, /more than 1 choice_node/);
});

test('getActs: returns 2 acts for default campaign', () => {
  _resetCache();
  const data = loadCampaign('default_campaign_mvp');
  const acts = getActs(data);
  assert.equal(acts.length, 2);
  assert.equal(acts[0].act_idx, 0);
  assert.equal(acts[1].act_idx, 1);
});

test('getActs: Act 0 is tutorial onboarding (5 encounters)', () => {
  _resetCache();
  const data = loadCampaign('default_campaign_mvp');
  const acts = getActs(data);
  const act0 = acts[0];
  assert.equal(act0.name, 'Primi Passi');
  assert.equal(act0.encounters.length, 5);
  assert.equal(act0.encounters[0].encounter_id, 'enc_tutorial_01');
  assert.equal(act0.encounters[4].encounter_id, 'enc_tutorial_05');
});

test('getActs: Act 1 has choice node + branch encounters + boss', () => {
  _resetCache();
  const data = loadCampaign('default_campaign_mvp');
  const acts = getActs(data);
  const act1 = acts[1];
  assert.equal(act1.name, 'La Caccia');
  // 1 pre-choice + 1 choice_node + 2 branch encounters + 1 boss = 5 entries
  assert.equal(act1.encounters.length, 5);
  const choiceEnc = act1.encounters.find((e) => e.is_choice_node);
  assert.ok(choiceEnc, 'choice node exists');
  assert.equal(choiceEnc.choice.option_a.branch_key, 'cave_path');
  assert.equal(choiceEnc.choice.option_b.branch_key, 'ruins_path');
});

test('resolveBranch: cave_path → enc_caverna_02', () => {
  _resetCache();
  const data = loadCampaign('default_campaign_mvp');
  assert.equal(resolveBranch(data, 1, 'cave_path'), 'enc_caverna_02');
});

test('resolveBranch: ruins_path → enc_capture_01', () => {
  _resetCache();
  const data = loadCampaign('default_campaign_mvp');
  assert.equal(resolveBranch(data, 1, 'ruins_path'), 'enc_capture_01');
});

test('resolveBranch: unknown branch returns null', () => {
  _resetCache();
  const data = loadCampaign('default_campaign_mvp');
  assert.equal(resolveBranch(data, 1, 'nonexistent'), null);
});

test('getEncountersForAct: filter by branch cave_path', () => {
  _resetCache();
  const data = loadCampaign('default_campaign_mvp');
  const encs = getEncountersForAct(data, 1, 'cave_path');
  const ids = encs.filter((e) => e.encounter_id).map((e) => e.encounter_id);
  // Should include cave branch encounter + non-branch encounters
  assert.ok(ids.includes('enc_savana_01'));
  assert.ok(ids.includes('enc_caverna_02'));
  assert.ok(!ids.includes('enc_capture_01')); // ruins branch excluded
});

test('extractAllEncounterIds: all referenced IDs present', () => {
  _resetCache();
  const data = loadCampaign('default_campaign_mvp');
  const ids = extractAllEncounterIds(data);
  // Expected: 5 tutorial + enc_savana_01 + enc_caverna_02 + enc_capture_01 + enc_tutorial_06_hardcore
  const expected = [
    'enc_tutorial_01',
    'enc_tutorial_02',
    'enc_tutorial_03',
    'enc_tutorial_04',
    'enc_tutorial_05',
    'enc_savana_01',
    'enc_caverna_02',
    'enc_capture_01',
    'enc_tutorial_06_hardcore',
  ];
  for (const id of expected) {
    assert.ok(ids.includes(id), `missing ${id}`);
  }
});

test('loadCampaign: caching — second call returns same instance', () => {
  _resetCache();
  const a = loadCampaign('default_campaign_mvp');
  const b = loadCampaign('default_campaign_mvp');
  assert.equal(a, b, 'cached instance');
});

// ─── Codex P2 fixes ─────────────────────────────────────────────────

test('loadCampaign: cache keyed by dir + id (no cross-dir leakage)', () => {
  _resetCache();
  const fs = require('node:fs');
  const os = require('node:os');
  const path = require('node:path');
  // Create 2 tmp dirs with different campaign content (same id)
  const tmpA = fs.mkdtempSync(path.join(os.tmpdir(), 'camp-a-'));
  const tmpB = fs.mkdtempSync(path.join(os.tmpdir(), 'camp-b-'));
  const minimal = (name) =>
    `schema_version: '1.0'\ncampaign_id: test_id\nname: '${name}'\nacts:\n  - act_idx: 0\n    encounters: []\n`;
  fs.writeFileSync(path.join(tmpA, 'test_id.yaml'), minimal('from_A'));
  fs.writeFileSync(path.join(tmpB, 'test_id.yaml'), minimal('from_B'));

  const a = loadCampaign('test_id', tmpA);
  const b = loadCampaign('test_id', tmpB);
  assert.equal(a.name, 'from_A');
  assert.equal(b.name, 'from_B', 'different dir → different data (not stale cached)');

  fs.rmSync(tmpA, { recursive: true, force: true });
  fs.rmSync(tmpB, { recursive: true, force: true });
});

test('validateCampaign: rejects duplicate act_idx', () => {
  assert.throws(() => {
    validateCampaign({
      schema_version: '1.0',
      campaign_id: 'dup_act',
      acts: [
        { act_idx: 0, encounters: [] },
        { act_idx: 0, encounters: [] }, // duplicate
      ],
    });
  }, /act_idx=0 duplicated/);
});

test('validateCampaign: rejects negative act_idx', () => {
  assert.throws(() => {
    validateCampaign({
      schema_version: '1.0',
      campaign_id: 'neg_act',
      acts: [{ act_idx: -1, encounters: [] }],
    });
  }, /not non-negative integer/);
});

test('validateCampaign: rejects non-integer act_idx', () => {
  assert.throws(() => {
    validateCampaign({
      schema_version: '1.0',
      campaign_id: 'float_act',
      acts: [{ act_idx: 1.5, encounters: [] }],
    });
  }, /not non-negative integer/);
});
