// Validation su /declare-intent (sprint 2026-04-18).
//
// Copre rigetto 400 per intent player invalidi:
//   - out of range (attack)
//   - target dead
//   - target alleato (friendly fire)
//   - target inesistente
//   - AP insufficienti (include il caso "move troppo lontano per gli AP": il gate
//     prezza l'in-grid move a resolveMoveApCost = max(1, dist - move_bonus), quindi
//     un over-far move e' rigettato come AP_INSUFFICIENT -- NON con un codice a
//     parte. Il vecchio ramo MOVE_TOO_FAR era irraggiungibile per ogni pending sum
//     non-negativo ed e' stato rimosso.)
//   - move fuori griglia
//   - move su cella occupata
//   - gate AP a prova di poison: un ap_cost negativo/NaN su uno skip non abbassa il
//     pending sum sotto zero, quindi non riesuma il ramo MOVE_TOO_FAR rimosso
//
// SIS intents bypassano (validazione interna a declareSistemaIntents).

process.env.IDEA_ENGINE_DISABLE_STATUS_REFRESH = '1';

const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { createApp } = require('../../apps/backend/app');
const { startSession, twoUnits } = require('./sessionTestHelpers');

async function declare(app, sid, actorId, action) {
  return request(app)
    .post('/api/session/declare-intent')
    .send({ session_id: sid, actor_id: actorId, action });
}

test('validation: attack fuori range rigettato (OUT_OF_RANGE)', async (t) => {
  const { app, close } = createApp({ databasePath: null });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });
  // p1 at (2,2) range 2, sis at (5,5) → distanza 6 > 2
  const sid = await startSession(app, twoUnits({ p1Pos: { x: 2, y: 2 }, sisPos: { x: 5, y: 5 } }));
  const r = await declare(app, sid, 'p1', {
    id: 'p1-atk',
    type: 'attack',
    actor_id: 'p1',
    target_id: 'sis',
    ap_cost: 1,
  });
  assert.equal(r.status, 400);
  assert.equal(r.body.code, 'OUT_OF_RANGE');
  assert.match(r.body.error, /fuori range/);
});

test('validation: attack contro alleato rigettato (FRIENDLY_FIRE)', async (t) => {
  const { app, close } = createApp({ databasePath: null });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });
  const units = [
    {
      id: 'p1',
      species: 'velox',
      job: 'skirmisher',
      hp: 10,
      max_hp: 10,
      ap: 2,
      attack_range: 2,
      initiative: 14,
      position: { x: 0, y: 0 },
      controlled_by: 'player',
      status: {},
    },
    {
      id: 'p2',
      species: 'carapax',
      job: 'vanguard',
      hp: 10,
      max_hp: 10,
      ap: 2,
      attack_range: 1,
      initiative: 10,
      position: { x: 1, y: 0 },
      controlled_by: 'player',
      status: {},
    },
    {
      id: 'sis',
      species: 'lupo',
      job: 'vanguard',
      hp: 10,
      max_hp: 10,
      ap: 2,
      attack_range: 1,
      initiative: 8,
      position: { x: 5, y: 5 },
      controlled_by: 'sistema',
      status: {},
    },
  ];
  const sid = await startSession(app, units);
  const r = await declare(app, sid, 'p1', {
    id: 'p1-atk',
    type: 'attack',
    actor_id: 'p1',
    target_id: 'p2',
    ap_cost: 1,
  });
  assert.equal(r.status, 400);
  assert.equal(r.body.code, 'FRIENDLY_FIRE');
});

test('validation: target inesistente rigettato (TARGET_NOT_FOUND)', async (t) => {
  const { app, close } = createApp({ databasePath: null });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });
  const sid = await startSession(app, twoUnits());
  const r = await declare(app, sid, 'p1', {
    id: 'p1-atk',
    type: 'attack',
    actor_id: 'p1',
    target_id: 'ghost',
    ap_cost: 1,
  });
  assert.equal(r.status, 400);
  assert.equal(r.body.code, 'TARGET_NOT_FOUND');
});

test('validation: AP insufficienti rigettato (AP_INSUFFICIENT)', async (t) => {
  const { app, close } = createApp({ databasePath: null });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });
  // p1 ap=2 at (2,2); move 3 tiles to (2,5) -- empty (sis at default (3,2)), in-grid.
  // The budget gate uses the SERVER move cost max(1, dist) = 3 > 2, so the client
  // ap_cost:0 (claiming a free move) cannot bypass it. AP_INSUFFICIENT precedes
  // MOVE_TOO_FAR here because the AP gate runs before the move-type checks.
  const sid = await startSession(app, twoUnits({ p1Pos: { x: 2, y: 2 } }));
  const r = await declare(app, sid, 'p1', {
    id: 'p1-mv',
    type: 'move',
    actor_id: 'p1',
    ap_cost: 0,
    move_to: { x: 2, y: 5 },
  });
  assert.equal(r.status, 400);
  assert.equal(r.body.code, 'AP_INSUFFICIENT');
});

test('validation: una chiave decoy `action` non azzera il costo dei pending', async (t) => {
  const { app, close } = createApp({ databasePath: null });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });
  // Regressione (OWASP A04, CWE-840): la route pre-scarta i wrapper intent con
  // .map(i => i.action) e passa azioni RAW. Se apBreakdown ri-scarta su `.action`,
  // quella chiave e' controllata dal client: un attacco con `action: true` viene
  // prezzato sull'inner (0) invece che come attacco (1), quindi il pending sum
  // resta 0 per sempre e p1 accoda attacchi illimitati con 2 AP.
  const sid = await startSession(app, twoUnits({ p1Pos: { x: 2, y: 2 }, sisPos: { x: 3, y: 2 } }));
  const decoy = (id) => ({ id, type: 'attack', actor_id: 'p1', target_id: 'sis', action: true });

  const first = await declare(app, sid, 'p1', decoy('p1-a1'));
  assert.equal(first.status, 200, `1st attack (0+1<=2) accepted, got ${first.status}`);
  const second = await declare(app, sid, 'p1', decoy('p1-a2'));
  assert.equal(second.status, 200, `2nd attack (1+1<=2) accepted, got ${second.status}`);

  // 3rd: pending DEVE essere 2 (i due attacchi), 2 + 1 = 3 > 2 -> rigetto.
  const third = await declare(app, sid, 'p1', decoy('p1-a3'));
  assert.equal(third.status, 400, 'decoy `action` key must not zero the pending sum');
  assert.equal(third.body.code, 'AP_INSUFFICIENT');
  assert.equal(
    third.body.error,
    'AP insufficienti: costo totale 3 (pending 2 + nuovo 1), disponibili 2',
  );
});

test('validation: AP_INSUFFICIENT riporta total/pending/cost/available distinti', async (t) => {
  const { app, close } = createApp({ databasePath: null });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });
  // Pinna la SHAPE del messaggio, che i test su `code` non vedono. I 4 numeri
  // arrivano da apLedger.apBreakdown: qui sono resi tutti diversi (4/1/3/2) in
  // modo che uno scambio posizionale nel template (es. total al posto di cost)
  // faccia fallire l'assert invece di passare inosservato.
  // p1 ap=2 at (2,2), sis at (3,2). Attack (costo canon 1) passa il gate e resta
  // pending; poi move di 3 celle costa 3 lato server -> 1 + 3 = 4 > 2.
  const sid = await startSession(app, twoUnits({ p1Pos: { x: 2, y: 2 }, sisPos: { x: 3, y: 2 } }));
  const first = await declare(app, sid, 'p1', {
    id: 'p1-atk',
    type: 'attack',
    actor_id: 'p1',
    target_id: 'sis',
    ap_cost: 1,
  });
  assert.equal(first.status, 200, `pending intent must be accepted, got ${first.status}`);

  const r = await declare(app, sid, 'p1', {
    id: 'p1-mv',
    type: 'move',
    actor_id: 'p1',
    ap_cost: 0,
    move_to: { x: 2, y: 5 },
  });
  assert.equal(r.status, 400);
  assert.equal(r.body.code, 'AP_INSUFFICIENT');
  assert.equal(
    r.body.error,
    'AP insufficienti: costo totale 4 (pending 1 + nuovo 3), disponibili 2',
  );
});

test('validation: move fuori griglia rigettato (OUT_OF_GRID)', async (t) => {
  const { app, close } = createApp({ databasePath: null });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });
  const sid = await startSession(app, twoUnits({ p1Pos: { x: 2, y: 2 } }));
  const r = await declare(app, sid, 'p1', {
    id: 'p1-mv',
    type: 'move',
    actor_id: 'p1',
    ap_cost: 1,
    move_to: { x: 99, y: 99 },
  });
  assert.equal(r.status, 400);
  assert.equal(r.body.code, 'OUT_OF_GRID');
});

test('validation: move su cella occupata rigettato (CELL_OCCUPIED)', async (t) => {
  const { app, close } = createApp({ databasePath: null });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });
  const sid = await startSession(app, twoUnits({ p1Pos: { x: 2, y: 2 }, sisPos: { x: 3, y: 2 } }));
  const r = await declare(app, sid, 'p1', {
    id: 'p1-mv',
    type: 'move',
    actor_id: 'p1',
    ap_cost: 1,
    move_to: { x: 3, y: 2 },
  });
  assert.equal(r.status, 400);
  assert.equal(r.body.code, 'CELL_OCCUPIED');
});

test('validation happy path: attack in range accettato', async (t) => {
  const { app, close } = createApp({ databasePath: null });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });
  const sid = await startSession(app, twoUnits({ p1Pos: { x: 2, y: 2 }, sisPos: { x: 3, y: 2 } }));
  const r = await declare(app, sid, 'p1', {
    id: 'p1-atk',
    type: 'attack',
    actor_id: 'p1',
    target_id: 'sis',
    ap_cost: 1,
  });
  assert.equal(r.status, 200);
  assert.equal(r.body.round_phase, 'planning');
});

test('validation happy path: move within range accettato', async (t) => {
  const { app, close } = createApp({ databasePath: null });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });
  const sid = await startSession(app, twoUnits({ p1Pos: { x: 2, y: 2 } }));
  const r = await declare(app, sid, 'p1', {
    id: 'p1-mv',
    type: 'move',
    actor_id: 'p1',
    ap_cost: 1,
    move_to: { x: 2, y: 3 },
  });
  assert.equal(r.status, 200);
});

// AP gate poison-resistance (PR #3252 follow-up). The pending-sum cost of an
// intent is server-authoritative (apLedger.resolveIntentApCost), but the skip/pass
// fallback used to trust the client ap_cost verbatim (Number(act.ap_cost || 0)). A
// negative or non-numeric ap_cost on a skip drove pendingForActor below zero, which
// BOTH inflated AP at execute-time AND revived the (otherwise unreachable)
// MOVE_TOO_FAR branch: with a poisoned pending sum an over-far in-grid move slipped
// past AP_INSUFFICIENT. resolveIntentApCost now floors the client value >= 0
// (NaN-safe), so the pending sum stays >= 0 and the over-far move is rejected as
// AP_INSUFFICIENT as usual.
for (const poison of [-100, 'abc']) {
  test(`validation: negative/NaN skip ap_cost (${JSON.stringify(
    poison,
  )}) cannot poison the AP gate`, async (t) => {
    const { app, close } = createApp({ databasePath: null });
    t.after(async () => {
      if (typeof close === 'function') await close().catch(() => {});
    });
    // p1 ap=2 at (2,2); SIS parked far so no destination cell is occupied.
    const sid = await startSession(
      app,
      twoUnits({ p1Pos: { x: 2, y: 2 }, sisPos: { x: 5, y: 5 } }),
    );
    // Poison the pending sum with a skip carrying a hostile ap_cost.
    const skip = await declare(app, sid, 'p1', {
      id: 'p1-skip',
      type: 'skip',
      actor_id: 'p1',
      ap_cost: poison,
    });
    assert.equal(skip.status, 200, 'skip is a valid 0-AP intent, accepted');
    // A 3-tile move (server cost 3 > 2 AP) must still be rejected as AP_INSUFFICIENT,
    // proving the poison did not drop the pending sum below zero.
    const far = await declare(app, sid, 'p1', {
      id: 'p1-mv',
      type: 'move',
      actor_id: 'p1',
      ap_cost: 0,
      move_to: { x: 2, y: 5 },
    });
    assert.equal(far.status, 400, 'over-far move must be rejected');
    assert.equal(
      far.body.code,
      'AP_INSUFFICIENT',
      'over-far move is over-budget, not a resurrected MOVE_TOO_FAR',
    );
  });
}
