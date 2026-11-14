const test = require('node:test');
const assert = require('node:assert/strict');
const d = require('../../tools/sim/campaign-driver');

function makeHttp() {
  const calls = [];
  const http = {
    post: (url, body) => {
      calls.push(['post', url, body]);
      return 'POST_RET';
    },
    get: (url, query) => {
      calls.push(['get', url, query]);
      return 'GET_RET';
    },
  };
  return { http, calls };
}

test('start()', () => {
  let { http, calls } = makeHttp();
  assert.equal(d.start(http, { playerId: 'p1', campaignDefId: 'c1' }), 'POST_RET');
  assert.deepEqual(calls[0], [
    'post',
    '/api/campaign/start',
    { player_id: 'p1', campaign_def_id: 'c1' },
  ]);

  ({ http, calls } = makeHttp());
  d.start(http, { playerId: 'p1' });
  assert.deepEqual(calls[0][2], { player_id: 'p1' });
  assert.equal('campaign_def_id' in calls[0][2], false);

  ({ http, calls } = makeHttp());
  d.start(http);
  assert.deepEqual(calls[0][2], { player_id: undefined });
});

test('summary()', () => {
  const { http, calls } = makeHttp();
  assert.equal(d.summary(http, 'x'), 'GET_RET');
  assert.deepEqual(calls[0], ['get', '/api/campaign/summary', { id: 'x' }]);
});

test('advance()', () => {
  let { http, calls } = makeHttp();
  d.advance(http, { id: 'x', outcome: 'victory' });
  assert.deepEqual(calls[0][2], { id: 'x', outcome: 'victory', pe_earned: 0 });
  assert.equal('survivors' in calls[0][2], false);

  ({ http, calls } = makeHttp());
  d.advance(http, { id: 'x', outcome: 'defeat', peEarned: 5, survivors: ['a'] });
  assert.deepEqual(calls[0][2], { id: 'x', outcome: 'defeat', pe_earned: 5, survivors: ['a'] });

  ({ http, calls } = makeHttp());
  d.advance(http, { id: 'x', outcome: 'v', survivors: [] });
  assert.equal('survivors' in calls[0][2], true);
});

test('choose() vs chooseNode()', () => {
  let { http, calls } = makeHttp();
  d.choose(http, { id: 'x', branchKey: 'b1' });
  assert.deepEqual(calls[0], ['post', '/api/campaign/choose', { id: 'x', branch_key: 'b1' }]);

  ({ http, calls } = makeHttp());
  d.chooseNode(http, { id: 'x', nodeId: 'n1' });
  assert.deepEqual(calls[0], ['post', '/api/campaign/choose', { id: 'x', node_id: 'n1' }]);
});
