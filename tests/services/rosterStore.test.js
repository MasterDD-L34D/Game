// N2 roster-display — rosterStore (mirror creatureEpigenomeStore): DI,
// prisma-gated, best-effort. Run-keyed party_rosters persistence.
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { createRosterStore } = require('../../apps/backend/services/campaign/rosterStore');

// In-memory fake of the prisma partyRoster delegate (compound-key upsert).
function fakePrisma() {
  const rows = [];
  return {
    _rows: rows,
    partyRoster: {
      async findMany({ where }) {
        return rows.filter((r) => r.campaignId === where.campaignId);
      },
      async upsert({ where, update, create }) {
        const k = where.campaignId_unitId;
        const hit = rows.find((r) => r.campaignId === k.campaignId && r.unitId === k.unitId);
        if (hit) {
          Object.assign(hit, update);
          return hit;
        }
        const row = { ...create };
        rows.push(row);
        return row;
      },
    },
  };
}

test('upsert then get round-trips a clean snake_case row', async () => {
  const store = createRosterStore(fakePrisma());
  await store.upsert('run_1', {
    player_id: 'p1',
    species_id: 'umbra_alaris',
    job_id: 'custode',
    traits: ['t_a', 't_b'],
  });
  const rows = await store.get('run_1');
  assert.equal(rows.length, 1);
  assert.deepEqual(rows[0], {
    unit_id: 'pg_p1',
    species: 'umbra_alaris',
    job: 'custode',
    tier: 'base',
    hp_base: 22,
    traits: ['t_a', 't_b'],
    acquired_traits: [],
    xp_total: 0,
    level: 1,
  });
});

test('upsert is idempotent on (campaignId, unitId) — updates, no duplicate', async () => {
  const fp = fakePrisma();
  const store = createRosterStore(fp);
  await store.upsert('run_1', { player_id: 'p1', species_id: 'a', job_id: 'guerriero' });
  await store.upsert('run_1', { player_id: 'p1', species_id: 'b', job_id: 'tessitore' });
  const rows = await store.get('run_1');
  assert.equal(rows.length, 1);
  assert.equal(rows[0].species, 'b');
  assert.equal(rows[0].job, 'tessitore');
});

test('get is empty-safe: unknown campaign -> []', async () => {
  const store = createRosterStore(fakePrisma());
  assert.deepEqual(await store.get('run_none'), []);
});

test('no-prisma store: get -> [], upsert -> no throw (no-op)', async () => {
  const store = createRosterStore(null);
  assert.deepEqual(await store.get('run_1'), []);
  await store.upsert('run_1', { player_id: 'p1' }); // must not throw
});

test('get with empty campaignId -> []', async () => {
  const store = createRosterStore(fakePrisma());
  assert.deepEqual(await store.get(''), []);
});
