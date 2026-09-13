const { test } = require('node:test');
const assert = require('node:assert');
const {
  filterForTvMirror,
  TV_VISIBLE_TIERS,
} = require('../../../apps/backend/services/deviceInput/tierFilter');

test('TV sees only public + aggregated', () => {
  assert.deepEqual([...TV_VISIBLE_TIERS].sort(), ['aggregated', 'public']);
});

test('private and secret are stripped from TV payload', () => {
  const events = [
    { type: 'a', tier: 'public' },
    { type: 'b', tier: 'private' },
    { type: 'c', tier: 'aggregated' },
    { type: 'd', tier: 'secret' },
  ];
  const out = filterForTvMirror(events);
  assert.deepEqual(
    out.map((e) => e.type),
    ['a', 'c'],
  );
});

test('missing tier is treated as not-TV-visible (fail-closed)', () => {
  const out = filterForTvMirror([{ type: 'x' }]);
  assert.equal(out.length, 0);
});
