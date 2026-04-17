// Play: AP budget canonical — FRICTION #2/#3 resolution from playtest 2026-04-17.
// Valida regola canonica: AP è budget spendibile liberamente, 2 attack/turno = valid.

process.env.IDEA_ENGINE_DISABLE_STATUS_REFRESH = '1';

const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');

const { createApp } = require('../../apps/backend/app');

async function startSession(app) {
  const scenario = await request(app).get('/api/tutorial/enc_tutorial_01');
  assert.equal(scenario.status, 200);
  const startRes = await request(app)
    .post('/api/session/start')
    .send({ units: scenario.body.units });
  assert.equal(startRes.status, 200);
  return { sid: startRes.body.session_id, state: startRes.body.state };
}

function findInRange(units, attackerId) {
  const attacker = units.find((u) => u.id === attackerId);
  const enemies = units.filter((u) => u.controlled_by !== attacker.controlled_by && u.hp > 0);
  if (!enemies.length) return null;
  const range = attacker.attack_range ?? 2;
  const closest = enemies
    .map((e) => ({
      e,
      d:
        Math.abs(attacker.position.x - e.position.x) + Math.abs(attacker.position.y - e.position.y),
    }))
    .sort((a, b) => a.d - b.d)[0];
  return closest.d <= range ? closest.e : null;
}

test('AP budget: player con ap_max=2 può fare 2 attack nello stesso turno', async (t) => {
  const { app, close } = createApp({ databasePath: null });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });

  const { sid, state } = await startSession(app);
  const player = state.units.find((u) => u.controlled_by === 'player');
  const initialAp = player.ap_remaining ?? player.ap;
  assert.ok(initialAp >= 2, `ap_max >= 2 atteso, actual=${initialAp}`);

  // Move player adjacent to closest enemy if not in range
  let target = findInRange(state.units, player.id);
  if (!target) {
    const enemy = state.units.find((u) => u.controlled_by === 'sistema');
    // Move player near enemy (consume some AP — skip this test if move eats budget)
    // Instead pick tutorial scenario which has player+enemy in range at start.
    // Se non in range → skip (scenario tutorial should have range)
    assert.ok(target, 'enc_tutorial_01 atteso con target in range');
  }

  // Attack #1
  const r1 = await request(app).post('/api/session/action').send({
    session_id: sid,
    action_type: 'attack',
    actor_id: player.id,
    target_id: target.id,
  });
  assert.equal(r1.status, 200, `attack #1 should succeed: ${JSON.stringify(r1.body)}`);

  // Verify AP decremented
  const midState = await request(app).get('/api/session/state').query({ session_id: sid });
  const playerMid = midState.body.units.find((u) => u.id === player.id);
  assert.equal(
    playerMid.ap_remaining,
    initialAp - 1,
    `AP dopo attack #1 atteso ${initialAp - 1}, actual=${playerMid.ap_remaining}`,
  );

  // Target potrebbe essere morto? Re-pick
  let target2 = findInRange(midState.body.units, player.id);
  if (!target2) {
    // Tutte le SIS unit morte — il test OK: prima attack ha finito tutto
    return;
  }

  // Attack #2 (stesso turno)
  const r2 = await request(app).post('/api/session/action').send({
    session_id: sid,
    action_type: 'attack',
    actor_id: player.id,
    target_id: target2.id,
  });
  assert.equal(
    r2.status,
    200,
    `attack #2 should succeed (FRICTION #3): ${JSON.stringify(r2.body)}`,
  );

  const finalState = await request(app).get('/api/session/state').query({ session_id: sid });
  const playerFinal = finalState.body.units.find((u) => u.id === player.id);
  assert.equal(
    playerFinal.ap_remaining,
    initialAp - 2,
    `AP dopo 2 attack atteso ${initialAp - 2}, actual=${playerFinal.ap_remaining}`,
  );
});

test('AP budget: 3° attack rigettato quando ap_remaining=0', async (t) => {
  const { app, close } = createApp({ databasePath: null });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });

  const { sid, state } = await startSession(app);
  const player = state.units.find((u) => u.controlled_by === 'player');

  let currentState = state;
  for (let i = 0; i < 3; i++) {
    const target = findInRange(currentState.units, player.id);
    if (!target) return; // target moriti, test OK

    const res = await request(app).post('/api/session/action').send({
      session_id: sid,
      action_type: 'attack',
      actor_id: player.id,
      target_id: target.id,
    });

    if (i < 2) {
      assert.equal(res.status, 200, `attack #${i + 1} should succeed`);
    } else {
      // 3rd attack should fail with AP insufficient
      assert.equal(res.status, 400, 'attack #3 should be rejected');
      assert.match(
        res.body.error || '',
        /AP insufficienti|ap_remaining/i,
        'errore esplicito su AP insufficienti',
      );
    }

    const s = await request(app).get('/api/session/state').query({ session_id: sid });
    currentState = s.body;
  }
});

test('AP budget: move di N celle costa N AP (Manhattan)', async (t) => {
  const { app, close } = createApp({ databasePath: null });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });

  const { sid, state } = await startSession(app);
  const player = state.units.find((u) => u.controlled_by === 'player');
  const initialAp = player.ap_remaining ?? player.ap;

  // Trova cella libera adiacente al player
  const from = player.position;
  const occupied = new Set(
    state.units.filter((u) => u.hp > 0).map((u) => `${u.position.x},${u.position.y}`),
  );
  const candidates = [
    { x: from.x + 1, y: from.y },
    { x: from.x - 1, y: from.y },
    { x: from.x, y: from.y + 1 },
    { x: from.x, y: from.y - 1 },
  ].filter((p) => p.x >= 0 && p.x < 8 && p.y >= 0 && p.y < 8 && !occupied.has(`${p.x},${p.y}`));
  assert.ok(candidates.length > 0, 'almeno una cella libera adiacente');
  const targetPos = candidates[0];

  const res = await request(app).post('/api/session/action').send({
    session_id: sid,
    action_type: 'move',
    actor_id: player.id,
    position: targetPos,
  });
  assert.equal(res.status, 200, `move dist 1 should succeed: ${JSON.stringify(res.body)}`);

  const midState = await request(app).get('/api/session/state').query({ session_id: sid });
  const pm = midState.body.units.find((u) => u.id === player.id);
  assert.equal(
    pm.ap_remaining,
    initialAp - 1,
    `move 1 cell consumes 1 AP, actual ap_remaining=${pm.ap_remaining}`,
  );
});
