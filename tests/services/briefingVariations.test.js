// Unit tests for briefingVariations engine — narrative-design-illuminator P0.

process.env.IDEA_ENGINE_DISABLE_STATUS_REFRESH = '1';

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const os = require('node:os');

const {
  clearCache,
  createRng,
  hashSeed,
  loadPack,
  matchConditions,
  selectBriefing,
  listVariants,
  weightedPick,
} = require('../../apps/backend/services/narrative/briefingVariations');

// ── createRng ──

test('createRng: deterministic with same seed', () => {
  const r1 = createRng(42);
  const r2 = createRng(42);
  assert.equal(r1(), r2());
  assert.equal(r1(), r2());
});

test('createRng: different seeds produce different sequences', () => {
  const r1 = createRng(1);
  const r2 = createRng(2);
  assert.notEqual(r1(), r2());
});

test('createRng: returns floats in [0, 1)', () => {
  const rng = createRng(123);
  for (let i = 0; i < 100; i++) {
    const v = rng();
    assert.ok(v >= 0 && v < 1, `out of range: ${v}`);
  }
});

test('createRng: zero seed coerced to 1 (avoid degenerate sequence)', () => {
  const rng = createRng(0);
  // Should produce non-degenerate output
  assert.ok(rng() !== 0);
});

// ── hashSeed ──

test('hashSeed: deterministic for same string', () => {
  assert.equal(hashSeed('session-001'), hashSeed('session-001'));
});

test('hashSeed: different strings → different hashes (high prob)', () => {
  assert.notEqual(hashSeed('session-001'), hashSeed('session-002'));
});

test('hashSeed: returns 32-bit unsigned int', () => {
  const h = hashSeed('test');
  assert.equal(typeof h, 'number');
  assert.ok(h >= 0 && h < 2 ** 32);
});

// ── matchConditions ──

test('matchConditions: empty conditions → always true', () => {
  assert.equal(matchConditions(null, {}), true);
  assert.equal(matchConditions(undefined, {}), true);
  assert.equal(matchConditions({}, {}), true);
});

test('matchConditions: replay flag', () => {
  assert.equal(matchConditions({ replay: true }, { replay: true }), true);
  assert.equal(matchConditions({ replay: true }, { replay: false }), false);
  assert.equal(matchConditions({ replay: true }, {}), false);
  assert.equal(matchConditions({ replay: false }, { replay: true }), false);
});

test('matchConditions: biome match', () => {
  assert.equal(matchConditions({ biome: 'savana' }, { biome: 'savana' }), true);
  assert.equal(matchConditions({ biome: 'savana' }, { biome: 'caverna' }), false);
  assert.equal(matchConditions({ biome: 'savana' }, {}), false);
});

test('matchConditions: difficulty range', () => {
  assert.equal(matchConditions({ min_difficulty: 3 }, { difficulty: 5 }), true);
  assert.equal(matchConditions({ min_difficulty: 3 }, { difficulty: 1 }), false);
  assert.equal(matchConditions({ max_difficulty: 3 }, { difficulty: 1 }), true);
  assert.equal(matchConditions({ max_difficulty: 3 }, { difficulty: 5 }), false);
});

test('matchConditions: mbti_t_min threshold', () => {
  assert.equal(matchConditions({ mbti_t_min: 0.6 }, { mbti_axes: { T_F: 0.7 } }), true);
  assert.equal(matchConditions({ mbti_t_min: 0.6 }, { mbti_axes: { T_F: 0.5 } }), false);
  // No axes → defaults to 0.5 → fails 0.6
  assert.equal(matchConditions({ mbti_t_min: 0.6 }, {}), false);
});

test('matchConditions: mbti_f_min uses inverted T_F (1-T_F)', () => {
  assert.equal(matchConditions({ mbti_f_min: 0.6 }, { mbti_axes: { T_F: 0.3 } }), true);
  assert.equal(matchConditions({ mbti_f_min: 0.6 }, { mbti_axes: { T_F: 0.5 } }), false);
});

test('matchConditions: mbti_n_min uses S_N axis', () => {
  assert.equal(matchConditions({ mbti_n_min: 0.6 }, { mbti_axes: { S_N: 0.7 } }), true);
  assert.equal(matchConditions({ mbti_n_min: 0.6 }, { mbti_axes: { S_N: 0.4 } }), false);
});

// ── weightedPick ──

test('weightedPick: empty list → null', () => {
  assert.equal(weightedPick([], createRng(1)), null);
  assert.equal(weightedPick(null, createRng(1)), null);
});

test('weightedPick: single variant always picked', () => {
  const v = { id: 'a', text: 'foo', weight: 1 };
  assert.equal(weightedPick([v], createRng(42)), v);
});

test('weightedPick: weight 0 deprioritized', () => {
  const a = { id: 'a', text: 'A', weight: 0 };
  const b = { id: 'b', text: 'B', weight: 100 };
  // 100 trials with very lopsided weights → b dominates
  let bCount = 0;
  for (let i = 0; i < 100; i++) {
    const p = weightedPick([a, b], createRng(i + 1));
    if (p.id === 'b') bCount++;
  }
  assert.ok(bCount >= 95, `expected b ≥95, got ${bCount}`);
});

test('weightedPick: deterministic with seed', () => {
  const variants = [
    { id: 'a', text: 'A', weight: 1 },
    { id: 'b', text: 'B', weight: 1 },
    { id: 'c', text: 'C', weight: 1 },
  ];
  const p1 = weightedPick(variants, createRng(7));
  const p2 = weightedPick(variants, createRng(7));
  assert.equal(p1.id, p2.id);
});

// ── loadPack ──

test('loadPack: real pack loads with scenarios', () => {
  clearCache();
  const pack = loadPack();
  assert.ok(pack !== null, 'real pack should load');
  assert.ok(pack.scenarios.enc_tutorial_01, 'scenario 01 expected');
  assert.ok(Array.isArray(pack.scenarios.enc_tutorial_01.pre));
});

test('loadPack: missing path → null (graceful)', () => {
  const pack = loadPack('/nonexistent/path.yaml');
  assert.equal(pack, null);
});

test('loadPack: malformed YAML → null', () => {
  const tmp = path.join(os.tmpdir(), `briefings_bad_${Date.now()}.yaml`);
  fs.writeFileSync(tmp, 'not: valid: yaml: [unclosed', 'utf-8');
  const pack = loadPack(tmp);
  assert.equal(pack, null);
  fs.unlinkSync(tmp);
});

test('loadPack: missing scenarios key → null', () => {
  const tmp = path.join(os.tmpdir(), `briefings_empty_${Date.now()}.yaml`);
  fs.writeFileSync(tmp, 'foo: bar', 'utf-8');
  const pack = loadPack(tmp);
  assert.equal(pack, null);
  fs.unlinkSync(tmp);
});

// ── selectBriefing ──

test('selectBriefing: valid scenario+phase returns variant', () => {
  clearCache();
  const r = selectBriefing('enc_tutorial_01', 'pre', { seed: 42 });
  assert.ok(r);
  assert.equal(typeof r.text, 'string');
  assert.ok(r.text.length > 0);
  assert.equal(r.source, 'variation');
});

test('selectBriefing: deterministic with same seed', () => {
  clearCache();
  const r1 = selectBriefing('enc_tutorial_01', 'pre', { seed: 42 });
  const r2 = selectBriefing('enc_tutorial_01', 'pre', { seed: 42 });
  assert.equal(r1.id, r2.id);
  assert.equal(r1.text, r2.text);
});

test('selectBriefing: string seed hashed', () => {
  clearCache();
  const r1 = selectBriefing('enc_tutorial_01', 'pre', { seed: 'session-abc' });
  const r2 = selectBriefing('enc_tutorial_01', 'pre', { seed: 'session-abc' });
  assert.equal(r1.id, r2.id);
});

test('selectBriefing: unknown scenario falls back', () => {
  clearCache();
  const r = selectBriefing('enc_unknown', 'pre', {
    seed: 1,
    fallback: 'fallback text',
  });
  assert.equal(r.text, 'fallback text');
  assert.equal(r.source, 'fallback');
});

test('selectBriefing: unknown scenario without fallback → null', () => {
  clearCache();
  const r = selectBriefing('enc_unknown', 'pre', { seed: 1 });
  assert.equal(r, null);
});

test('selectBriefing: replay condition gates variants', () => {
  clearCache();
  const noReplay = selectBriefing('enc_tutorial_01', 'pre', { seed: 1 });
  // With replay=true, a different variant becomes eligible (variant 'replay').
  // Multiple seeds should sometimes hit it.
  let replayHits = 0;
  for (let s = 1; s < 50; s++) {
    const r = selectBriefing('enc_tutorial_01', 'pre', { seed: s, replay: true });
    if (r.id === 'replay') replayHits++;
  }
  assert.ok(replayHits > 0, 'replay variant should be reachable when replay=true');
  assert.notEqual(noReplay.id, 'replay');
});

test('selectBriefing: post phase returns post variants', () => {
  clearCache();
  const r = selectBriefing('enc_tutorial_05', 'post', { seed: 1 });
  assert.ok(r);
  assert.ok(['default', 'empathic', 'tactical'].includes(r.id));
});

test('selectBriefing: empathic variant reachable with mbti_f_min met', () => {
  clearCache();
  let empHits = 0;
  for (let s = 1; s < 30; s++) {
    const r = selectBriefing('enc_tutorial_01', 'pre', {
      seed: s,
      mbti_axes: { T_F: 0.2 }, // F-leaning
    });
    if (r.id === 'empathic') empHits++;
  }
  assert.ok(empHits > 0, 'empathic should be reachable for F-leaning player');
});

test('selectBriefing: pack override takes precedence over file load', () => {
  const customPack = {
    scenarios: {
      enc_x: {
        pre: [{ id: 'only', text: 'custom briefing', weight: 1 }],
      },
    },
  };
  const r = selectBriefing('enc_x', 'pre', { seed: 1 }, customPack);
  assert.equal(r.id, 'only');
  assert.equal(r.text, 'custom briefing');
});

test('selectBriefing: zero variants for phase → fallback', () => {
  const customPack = {
    scenarios: { enc_x: { pre: [] } },
  };
  const r = selectBriefing('enc_x', 'pre', { seed: 1, fallback: 'fb' }, customPack);
  assert.equal(r.text, 'fb');
  assert.equal(r.source, 'fallback');
});

test('selectBriefing: all variants gated out → fallback', () => {
  const customPack = {
    scenarios: {
      enc_x: {
        pre: [
          { id: 'a', text: 'A', conditions: { replay: true } },
          { id: 'b', text: 'B', conditions: { biome: 'mars' } },
        ],
      },
    },
  };
  const r = selectBriefing(
    'enc_x',
    'pre',
    { seed: 1, replay: false, biome: 'earth', fallback: 'fb' },
    customPack,
  );
  assert.equal(r.text, 'fb');
});

// ── listVariants ──

test('listVariants: real pack returns ids', () => {
  clearCache();
  const variants = listVariants('enc_tutorial_01', 'pre');
  assert.ok(variants.length >= 3);
  assert.ok(variants.every((v) => typeof v.id === 'string'));
  assert.ok(variants.every((v) => typeof v.weight === 'number'));
  assert.ok(variants.every((v) => typeof v.has_conditions === 'boolean'));
});

test('listVariants: unknown scenario → empty', () => {
  clearCache();
  assert.deepEqual(listVariants('enc_unknown', 'pre'), []);
});

// ── data integrity (real pack) ──

test('real pack: all 5 scenarios have pre and post variants', () => {
  clearCache();
  const pack = loadPack();
  const expected = [
    'enc_tutorial_01',
    'enc_tutorial_02',
    'enc_tutorial_03',
    'enc_tutorial_04',
    'enc_tutorial_05',
  ];
  for (const sid of expected) {
    assert.ok(pack.scenarios[sid], `missing scenario ${sid}`);
    assert.ok(Array.isArray(pack.scenarios[sid].pre), `missing pre for ${sid}`);
    assert.ok(Array.isArray(pack.scenarios[sid].post), `missing post for ${sid}`);
    assert.ok(pack.scenarios[sid].pre.length > 0, `empty pre for ${sid}`);
    assert.ok(pack.scenarios[sid].post.length > 0, `empty post for ${sid}`);
  }
});

test('real pack: every variant has unique id within its phase', () => {
  clearCache();
  const pack = loadPack();
  for (const [sid, scenario] of Object.entries(pack.scenarios)) {
    for (const phase of ['pre', 'post']) {
      const ids = scenario[phase].map((v) => v.id);
      const unique = new Set(ids);
      assert.equal(unique.size, ids.length, `duplicate ids in ${sid}.${phase}: ${ids}`);
    }
  }
});

test('real pack: every variant has non-empty text', () => {
  clearCache();
  const pack = loadPack();
  for (const [sid, scenario] of Object.entries(pack.scenarios)) {
    for (const phase of ['pre', 'post']) {
      for (const v of scenario[phase]) {
        assert.ok(typeof v.text === 'string', `${sid}.${phase}.${v.id} text not string`);
        assert.ok(v.text.length > 10, `${sid}.${phase}.${v.id} text too short`);
      }
    }
  }
});

test('real pack: at least one default variant per phase has no conditions', () => {
  clearCache();
  const pack = loadPack();
  for (const [sid, scenario] of Object.entries(pack.scenarios)) {
    for (const phase of ['pre', 'post']) {
      const unconditional = scenario[phase].filter((v) => !v.conditions);
      assert.ok(
        unconditional.length > 0,
        `${sid}.${phase} has no unconditional variant — missing safe fallback`,
      );
    }
  }
});
