// Unit tests for QBN narrative engine — narrative-design-illuminator P0.

process.env.IDEA_ENGINE_DISABLE_STATUS_REFRESH = '1';

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const os = require('node:os');

const {
  applyChoice,
  clearCache,
  createRng,
  drawEvent,
  extractQualities,
  hashSeed,
  listEventIds,
  loadPack,
  matchConditions,
  weightedPick,
} = require('../../apps/backend/services/narrative/qbnEngine');

// ── createRng / hashSeed (parity with briefingVariations) ──

test('createRng: deterministic with same seed', () => {
  assert.equal(createRng(7)(), createRng(7)());
});

test('createRng: zero seed coerced (no degenerate sequence)', () => {
  assert.notEqual(createRng(0)(), 0);
});

test('hashSeed: deterministic + 32-bit unsigned', () => {
  const h = hashSeed('campaign-123');
  assert.equal(h, hashSeed('campaign-123'));
  assert.ok(h >= 0 && h < 2 ** 32);
});

// ── extractQualities ──

test('extractQualities: empty input → defaults 0.5 across MBTI', () => {
  const q = extractQualities({});
  assert.equal(q.mbti_t, 0.5);
  assert.equal(q.mbti_f, 0.5);
  assert.equal(q.mbti_n, 0.5);
  assert.equal(q.mbti_s, 0.5);
  assert.equal(q.mbti_e, 0.5);
  assert.equal(q.mbti_i, 0.5);
  assert.equal(q.mbti_j, 0.5);
  assert.equal(q.mbti_p, 0.5);
  assert.equal(q.turns_played, 0);
  assert.equal(q.victories, 0);
  assert.ok(q.ennea_set instanceof Set);
});

test('extractQualities: averages MBTI across actors', () => {
  const q = extractQualities({
    vcSnapshot: {
      per_actor: {
        a: { mbti_axes: { T_F: 0.8, S_N: 0.4, E_I: 0.6, J_P: 0.3 } },
        b: { mbti_axes: { T_F: 0.6, S_N: 0.6, E_I: 0.4, J_P: 0.7 } },
      },
    },
  });
  // Avg T_F = (0.8 + 0.6) / 2 = 0.7
  assert.ok(Math.abs(q.mbti_t - 0.7) < 0.001);
  assert.ok(Math.abs(q.mbti_f - 0.3) < 0.001);
  // Avg S_N = 0.5 → mbti_n = 0.5, mbti_s = 0.5
  assert.ok(Math.abs(q.mbti_n - 0.5) < 0.001);
});

test('extractQualities: unions ennea archetypes across actors', () => {
  const q = extractQualities({
    vcSnapshot: {
      per_actor: {
        a: { mbti_axes: { T_F: 0.5 }, ennea_archetypes: [3, 5] },
        b: { mbti_axes: { T_F: 0.5 }, ennea_archetypes: [5, 8] },
      },
    },
  });
  assert.ok(q.ennea_set.has(3));
  assert.ok(q.ennea_set.has(5));
  assert.ok(q.ennea_set.has(8));
  assert.equal(q.ennea_set.size, 3);
});

test('extractQualities: reads turns_played + victories', () => {
  const q = extractQualities({ runState: { turns_played: 12, victories: 3 } });
  assert.equal(q.turns_played, 12);
  assert.equal(q.victories, 3);
});

test('extractQualities: vcSnapshot.turns_played fallback', () => {
  const q = extractQualities({ vcSnapshot: { turns_played: 7 } });
  assert.equal(q.turns_played, 7);
});

// ── matchConditions ──

function _q(overrides = {}) {
  return {
    mbti_t: 0.5,
    mbti_f: 0.5,
    mbti_n: 0.5,
    mbti_s: 0.5,
    mbti_e: 0.5,
    mbti_i: 0.5,
    mbti_j: 0.5,
    mbti_p: 0.5,
    ennea_set: new Set(),
    turns_played: 0,
    victories: 0,
    ...overrides,
  };
}

test('matchConditions: no conditions → always pass', () => {
  assert.equal(matchConditions({ id: 'x' }, _q()), true);
});

test('matchConditions: mbti_t_min threshold', () => {
  const ev = { id: 'x', conditions: { mbti_t_min: 0.65 } };
  assert.equal(matchConditions(ev, _q({ mbti_t: 0.7 })), true);
  assert.equal(matchConditions(ev, _q({ mbti_t: 0.6 })), false);
});

test('matchConditions: ennea_any (at least one)', () => {
  const ev = { id: 'x', conditions: { ennea_any: [3, 5] } };
  assert.equal(matchConditions(ev, _q({ ennea_set: new Set([3]) })), true);
  assert.equal(matchConditions(ev, _q({ ennea_set: new Set([5, 8]) })), true);
  assert.equal(matchConditions(ev, _q({ ennea_set: new Set([8]) })), false);
  assert.equal(matchConditions(ev, _q()), false);
});

test('matchConditions: ennea_all (every must be present)', () => {
  const ev = { id: 'x', conditions: { ennea_all: [3, 5] } };
  assert.equal(matchConditions(ev, _q({ ennea_set: new Set([3, 5]) })), true);
  assert.equal(matchConditions(ev, _q({ ennea_set: new Set([3]) })), false);
});

test('matchConditions: min_turns_played + min_victories', () => {
  const ev = {
    id: 'x',
    conditions: { min_turns_played: 5, min_victories: 1 },
  };
  assert.equal(matchConditions(ev, _q({ turns_played: 6, victories: 1 })), true);
  assert.equal(matchConditions(ev, _q({ turns_played: 4, victories: 1 })), false);
  assert.equal(matchConditions(ev, _q({ turns_played: 6, victories: 0 })), false);
});

test('matchConditions: max_repeats blocks after seen N times', () => {
  const ev = { id: 'x', conditions: { max_repeats: 1 } };
  const history = { seen: { x: 1 } };
  assert.equal(matchConditions(ev, _q(), history), false);
  assert.equal(matchConditions(ev, _q(), { seen: { x: 0 } }), true);
});

test('matchConditions: cooldown blocks within N sessions', () => {
  const ev = { id: 'x', cooldown: 3 };
  const history = {
    last_seen_session: { x: 5 },
    session_index: 6, // delta 1 < 3
  };
  assert.equal(matchConditions(ev, _q(), history), false);
  history.session_index = 9; // delta 4 >= 3
  assert.equal(matchConditions(ev, _q(), history), true);
});

test('matchConditions: requires_seen prereq', () => {
  const ev = { id: 'x', conditions: { requires_seen: ['y'] } };
  assert.equal(matchConditions(ev, _q(), { seen: { y: 1 } }), true);
  assert.equal(matchConditions(ev, _q(), { seen: {} }), false);
});

test('matchConditions: excludes_seen mutex', () => {
  const ev = { id: 'x', conditions: { excludes_seen: ['z'] } };
  assert.equal(matchConditions(ev, _q(), { seen: { z: 1 } }), false);
  assert.equal(matchConditions(ev, _q(), { seen: {} }), true);
});

// ── weightedPick ──

test('weightedPick: empty → null', () => {
  assert.equal(weightedPick([], createRng(1)), null);
});

test('weightedPick: deterministic with seed', () => {
  const events = [
    { id: 'a', weight: 1 },
    { id: 'b', weight: 1 },
    { id: 'c', weight: 1 },
  ];
  assert.equal(weightedPick(events, createRng(7)).id, weightedPick(events, createRng(7)).id);
});

test('weightedPick: weight 0 deprioritized', () => {
  const events = [
    { id: 'a', weight: 0 },
    { id: 'b', weight: 100 },
  ];
  let bCount = 0;
  for (let i = 0; i < 50; i++) {
    if (weightedPick(events, createRng(i + 1)).id === 'b') bCount++;
  }
  assert.ok(bCount >= 48);
});

// ── loadPack ──

test('loadPack: real pack loads with events array', () => {
  clearCache();
  const pack = loadPack();
  assert.ok(pack !== null);
  assert.ok(Array.isArray(pack.events));
  assert.ok(pack.events.length >= 8);
});

test('loadPack: missing path → null', () => {
  assert.equal(loadPack('/nonexistent.yaml'), null);
});

test('loadPack: malformed YAML → null', () => {
  const tmp = path.join(os.tmpdir(), `qbn_bad_${Date.now()}.yaml`);
  fs.writeFileSync(tmp, ': not: yaml: [oops', 'utf-8');
  assert.equal(loadPack(tmp), null);
  fs.unlinkSync(tmp);
});

test('loadPack: missing events key → null', () => {
  const tmp = path.join(os.tmpdir(), `qbn_empty_${Date.now()}.yaml`);
  fs.writeFileSync(tmp, 'foo: bar', 'utf-8');
  assert.equal(loadPack(tmp), null);
  fs.unlinkSync(tmp);
});

// ── drawEvent ──

const STUB_PACK = {
  events: [
    {
      id: 'ev_t',
      title: 'T-event',
      text: 'For T-leaning players.',
      weight: 1,
      conditions: { mbti_t_min: 0.6 },
    },
    {
      id: 'ev_f',
      title: 'F-event',
      text: 'For F-leaning players.',
      weight: 1,
      conditions: { mbti_f_min: 0.6 },
    },
    {
      id: 'ev_universal',
      title: 'Universal',
      text: 'Always available.',
      weight: 5,
    },
    {
      id: 'ev_ennea3',
      title: 'Ennea 3',
      text: 'For type 3.',
      weight: 1,
      conditions: { ennea_any: [3] },
    },
    {
      id: 'ev_locked',
      title: 'Locked',
      text: 'Needs a prior event.',
      weight: 1,
      conditions: { requires_seen: ['ev_universal'] },
    },
  ],
};

test('drawEvent: returns null when no events eligible', () => {
  const r = drawEvent({ seed: 1 }, { events: [] });
  assert.equal(r.event, null);
  assert.match(r.reason, /no_eligible|pack_missing/);
});

test('drawEvent: pack_missing when null pack', () => {
  // No real pack — simulate by passing falsy.
  // We can't easily un-cache the real one, so use a tiny invalid override.
  const r = drawEvent({ seed: 1 }, { events: null });
  assert.equal(r.event, null);
});

test('drawEvent: T-leaning input picks T-flavored event over F (eligibility filter)', () => {
  let tHits = 0;
  let fHits = 0;
  for (let s = 1; s < 30; s++) {
    const r = drawEvent(
      {
        vcSnapshot: { per_actor: { a: { mbti_axes: { T_F: 0.8 } } } },
        seed: s,
      },
      STUB_PACK,
    );
    if (r.event?.id === 'ev_t') tHits++;
    if (r.event?.id === 'ev_f') fHits++;
  }
  assert.ok(tHits > 0, 'T-event should be reachable');
  assert.equal(fHits, 0, 'F-event should be filtered out for T-leaning input');
});

test('drawEvent: deterministic with same seed', () => {
  const input = {
    vcSnapshot: { per_actor: { a: { mbti_axes: { T_F: 0.8 } } } },
    seed: 42,
  };
  const r1 = drawEvent(input, STUB_PACK);
  const r2 = drawEvent(input, STUB_PACK);
  assert.equal(r1.event?.id, r2.event?.id);
});

test('drawEvent: hash string seeds', () => {
  const input1 = { vcSnapshot: {}, seed: 'campaign-A' };
  const input2 = { vcSnapshot: {}, seed: 'campaign-A' };
  assert.equal(drawEvent(input1, STUB_PACK).event?.id, drawEvent(input2, STUB_PACK).event?.id);
});

test('drawEvent: requires_seen blocks until prereq seen', () => {
  // ev_locked requires ev_universal. With empty history, locked should not appear.
  let lockedHits = 0;
  for (let s = 1; s < 20; s++) {
    const r = drawEvent({ seed: s, history: { seen: {} } }, STUB_PACK);
    if (r.event?.id === 'ev_locked') lockedHits++;
  }
  assert.equal(lockedHits, 0);

  // With ev_universal seen, locked becomes eligible.
  let postHits = 0;
  for (let s = 1; s < 30; s++) {
    const r = drawEvent({ seed: s, history: { seen: { ev_universal: 1 } } }, STUB_PACK);
    if (r.event?.id === 'ev_locked') postHits++;
  }
  assert.ok(postHits > 0);
});

test('drawEvent: ennea_any condition triggers when archetype present', () => {
  let hits = 0;
  for (let s = 1; s < 30; s++) {
    const r = drawEvent(
      {
        vcSnapshot: {
          per_actor: { a: { mbti_axes: {}, ennea_archetypes: [3] } },
        },
        seed: s,
      },
      STUB_PACK,
    );
    if (r.event?.id === 'ev_ennea3') hits++;
  }
  assert.ok(hits > 0);
});

test('drawEvent: returns eligible_count for telemetry', () => {
  const r = drawEvent({ seed: 1 }, STUB_PACK);
  assert.ok(typeof r.eligible_count === 'number');
  assert.ok(r.eligible_count > 0);
});

// ── applyChoice ──

test('applyChoice: increments seen + updates last_seen_session', () => {
  const h = applyChoice({}, 'ev_x', 'choice_a', 5);
  assert.equal(h.seen['ev_x'], 1);
  assert.equal(h.last_seen_session['ev_x'], 5);
  assert.equal(h.session_index, 5);
  assert.deepEqual(h.last_choice, { event_id: 'ev_x', choice_id: 'choice_a' });
});

test('applyChoice: subsequent calls accumulate seen counter', () => {
  const h1 = applyChoice({}, 'ev_x', null, 1);
  const h2 = applyChoice(h1, 'ev_x', null, 2);
  assert.equal(h2.seen['ev_x'], 2);
});

test('applyChoice: immutable — original history not mutated', () => {
  const h = { seen: { ev_y: 1 }, session_index: 3 };
  const h2 = applyChoice(h, 'ev_x', null, 4);
  assert.equal(h.seen['ev_x'], undefined);
  assert.equal(h.session_index, 3);
  assert.equal(h2.seen['ev_x'], 1);
});

test('applyChoice: preserves prior last_choice when choiceId null', () => {
  const h = applyChoice({ last_choice: { event_id: 'ev_y', choice_id: 'c' } }, 'ev_x', null, 2);
  assert.deepEqual(h.last_choice, { event_id: 'ev_y', choice_id: 'c' });
});

// ── listEventIds + real pack data integrity ──

test('listEventIds: real pack returns >=8 ids', () => {
  clearCache();
  const ids = listEventIds();
  assert.ok(ids.length >= 8);
  assert.ok(ids.every((s) => typeof s === 'string'));
});

test('real pack: event ids unique', () => {
  clearCache();
  const ids = listEventIds();
  assert.equal(new Set(ids).size, ids.length);
});

test('real pack: every event has non-empty text + title', () => {
  clearCache();
  const pack = loadPack();
  for (const ev of pack.events) {
    assert.ok(typeof ev.id === 'string' && ev.id.length > 0, `bad id: ${ev}`);
    assert.ok(typeof ev.title === 'string' && ev.title.length > 0, `bad title: ${ev.id}`);
    assert.ok(typeof ev.text === 'string' && ev.text.length > 30, `bad text: ${ev.id}`);
  }
});

test('real pack: at least one universal event (no conditions, no requires_seen)', () => {
  clearCache();
  const pack = loadPack();
  const universal = pack.events.filter(
    (e) => !e.conditions || (Object.keys(e.conditions).length === 1 && e.conditions.max_repeats),
  );
  assert.ok(
    universal.length >= 1,
    'pack should have at least one always-eligible event for fallback',
  );
});

test('real pack: drawEvent returns event for empty input (universal fallback)', () => {
  clearCache();
  const r = drawEvent({ seed: 42 });
  assert.ok(r.event !== null, 'real pack should produce SOME event for empty input');
});
