// A13 N=40 evidence (SPEC-I gate) -- full-loop a13 threading: the runner links each
// chapter's session to the campaign (campaign_id + biome_id from the encounter YAML),
// fires the session-end pipeline (wound write-side), captures the biome_wounded
// telegraph, and -- opt-in -- retries a failed chapter (the REAL product flow,
// campaign.js /advance retry:true) so the wound->retry-same-biome loop is exercisable.
// Default (a13 off) stays byte-identical: one-attempt-per-mission, no /end, no link.
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { runFullLoop } = require('../../tools/sim/full-loop-runner');

const ROSTER = [
  {
    id: 'hero_a',
    max_hp: 30,
    job: 'skirmisher',
    position: { x: 1, y: 1 },
    controlled_by: 'player',
  },
];

// Stateful fake: attempt N of the current encounter decides the fight's outcome.
// outcomes[i] = 'win' | 'lose' for the i-th SESSION started. 'lose' = hero dead at
// first poll (defeat); 'win' = foe dead at first poll (victory). Campaign completes
// on the first victorious advance.
function makeFakeHttp({ outcomes, encounterId = 'enc_savana_01' }) {
  const calls = [];
  let session = 0;
  return {
    calls,
    post: async (p, body) => {
      calls.push({ method: 'post', p, body });
      if (p === '/api/campaign/start') return { status: 201, body: { campaign: { id: 'c1' } } };
      if (p === '/api/session/start') {
        session += 1;
        return { status: 200, body: { session_id: `s${session}` } };
      }
      if (p === '/api/campaign/advance') {
        const won = outcomes[session - 1] === 'win';
        return { status: 200, body: won ? { campaign_completed: true } : { retry: true } };
      }
      if (p === '/api/session/end') return { status: 200, body: { outcome: 'x' } };
      return { status: 200, body: {} };
    },
    get: async (p, query) => {
      calls.push({ method: 'get', p, query });
      if (p === '/api/session/state') {
        const lose = outcomes[session - 1] === 'lose';
        return {
          status: 200,
          body: {
            biome_wounded: session > 1, // wounded telegraph from the 2nd session on
            units: [
              { id: 'hero_a', controlled_by: 'player', hp: lose ? 0 : 30 },
              { id: 'foe_1', controlled_by: 'sistema', hp: lose ? 5 : 0 },
            ],
            active_unit: 'hero_a',
          },
        };
      }
      if (p === '/api/campaign/summary') {
        return { status: 200, body: { current_encounter: { encounter_id: encounterId } } };
      }
      return { status: 200, body: {} };
    },
  };
}

test('a13: chapter sessions linked (campaign_id + biome_id from encounter YAML) + /end fired', async () => {
  const http = makeFakeHttp({ outcomes: ['win'] });
  const res = await runFullLoop(http, {
    playerId: 'p',
    roster: ROSTER,
    maxChapters: 3,
    a13: true,
  });
  assert.equal(res.completed, true);
  const start = http.calls.find((c) => c.p === '/api/session/start');
  assert.equal(start.body.campaign_id, 'c1');
  // enc_savana_01 -> biome savana (real repo YAML via encounter-biome).
  assert.equal(start.body.biome_id, 'savana');
  assert.ok(
    http.calls.find((c) => c.p === '/api/session/end'),
    'session end fired (wound write-side trigger)',
  );
  assert.equal(res.chapters[0].biome_id, 'savana');
  assert.equal(res.chapters[0].biome_wounded, false);
  assert.equal(res.chapters[0].attempt, 1);
});

test('a13 retry: defeat -> retry same chapter (roster restored), wounded telegraph captured', async () => {
  const http = makeFakeHttp({ outcomes: ['lose', 'win'] });
  const res = await runFullLoop(http, {
    playerId: 'p',
    roster: ROSTER,
    maxChapters: 5,
    a13: true,
    a13MaxRetries: 1,
  });
  assert.equal(
    res.completed,
    true,
    `retry then win completes; chapters=${JSON.stringify(res.chapters)}`,
  );
  assert.equal(res.chapters.length, 2, 'two attempts recorded');
  assert.equal(res.chapters[0].outcome, 'defeat');
  assert.equal(res.chapters[0].attempt, 1);
  assert.equal(res.chapters[1].outcome, 'victory');
  assert.equal(res.chapters[1].attempt, 2, 'second attempt of the SAME encounter');
  assert.equal(res.chapters[1].encounter, res.chapters[0].encounter);
  // The retry fights the wounded biome (telegraph from the 2nd session on).
  assert.equal(res.chapters[1].biome_wounded, true);
  // Roster restored for the retry: the second /session/start carries the hero again.
  const starts = http.calls.filter((c) => c.p === '/api/session/start');
  assert.equal(starts.length, 2);
  assert.ok(starts[1].body.units.some((u) => u.id === 'hero_a' && u.hp === 30));
});

test('a13 retry bound: retries exhausted -> run fails (no infinite retry)', async () => {
  const http = makeFakeHttp({ outcomes: ['lose', 'lose', 'lose'] });
  const res = await runFullLoop(http, {
    playerId: 'p',
    roster: ROSTER,
    maxChapters: 5,
    a13: true,
    a13MaxRetries: 1,
  });
  assert.equal(res.completed, false);
  assert.equal(res.chapters.length, 2, 'initial attempt + exactly one retry');
});

test('default (a13 off): no campaign link, no /end, one attempt per mission (status quo)', async () => {
  const http = makeFakeHttp({ outcomes: ['lose', 'win'] });
  const res = await runFullLoop(http, {
    playerId: 'p',
    roster: ROSTER,
    maxChapters: 5,
  });
  assert.equal(res.completed, false, 'defeat ends the run (slice-a cap)');
  assert.equal(res.chapters.length, 1);
  const start = http.calls.find((c) => c.p === '/api/session/start');
  assert.equal('campaign_id' in start.body, false);
  assert.equal('biome_id' in start.body, false);
  assert.equal(
    http.calls.find((c) => c.p === '/api/session/end'),
    undefined,
  );
  assert.equal('attempt' in res.chapters[0], false, 'chapter shape unchanged when a13 off');
});
