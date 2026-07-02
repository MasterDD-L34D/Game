// SPRINT_015: test suite per apps/backend/services/ai/policy.js
//
// Copre:
//   - manhattanDistance (purezza)
//   - stepAway (tutti i casi di bordo)
//   - selectAiPolicy:
//     * REGOLA_001 attack/approach (HP pieno, range match/mismatch)
//     * REGOLA_002 retreat (HP <= 30%)
//     * REGOLA_003 kite (actor range > target range)
//   - checkEmotionalOverrides:
//     * priorita' stunned > rage > panic
//     * durata 0 = inattivo
//     * nessun status = null
//     * rage in/fuori range → intent attack/approach
//     * priorita' assoluta su HP check (rage con HP basso)

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  DEFAULT_ATTACK_RANGE,
  LOW_HP_RETREAT_THRESHOLD,
  manhattanDistance,
  stepAway,
  selectAiPolicy,
  checkEmotionalOverrides,
} = require('../../apps/backend/services/ai/policy');

// ─────────────────────────────────────────────────────────────────
// manhattanDistance
// ─────────────────────────────────────────────────────────────────

test('manhattanDistance: 0 fra cella e se stessa', () => {
  assert.equal(manhattanDistance({ x: 2, y: 3 }, { x: 2, y: 3 }), 0);
});

test('manhattanDistance: cardinal 1', () => {
  assert.equal(manhattanDistance({ x: 0, y: 0 }, { x: 1, y: 0 }), 1);
  assert.equal(manhattanDistance({ x: 0, y: 0 }, { x: 0, y: 1 }), 1);
});

test('manhattanDistance: diagonale = 2', () => {
  assert.equal(manhattanDistance({ x: 0, y: 0 }, { x: 1, y: 1 }), 2);
});

test('manhattanDistance: simmetrica', () => {
  const a = { x: 1, y: 2 };
  const b = { x: 4, y: 5 };
  assert.equal(manhattanDistance(a, b), manhattanDistance(b, a));
});

test('manhattanDistance: input null/undefined → 0', () => {
  assert.equal(manhattanDistance(null, { x: 1, y: 1 }), 0);
  assert.equal(manhattanDistance({ x: 1, y: 1 }, undefined), 0);
});

// ─────────────────────────────────────────────────────────────────
// stepAway
// ─────────────────────────────────────────────────────────────────

test('stepAway: preferisce asse x se |dx| >= |dy|', () => {
  // from (3,3), target (1,3): dx=2, dy=0 → step verso +x
  assert.deepEqual(stepAway({ x: 3, y: 3 }, { x: 1, y: 3 }), { x: 4, y: 3 });
});

test('stepAway: preferisce asse y se |dy| > |dx|', () => {
  // from (3,3), target (3,1): dx=0, dy=2 → step verso +y
  assert.deepEqual(stepAway({ x: 3, y: 3 }, { x: 3, y: 1 }), { x: 3, y: 4 });
});

test('stepAway: diagonale (pari) preferisce x', () => {
  // from (3,3), target (2,2): dx=1, dy=1 (pari) → asse x vince per |dx|>=|dy|
  assert.deepEqual(stepAway({ x: 3, y: 3 }, { x: 2, y: 2 }), { x: 4, y: 3 });
});

test('stepAway: fallback a asse y se x bloccato al bordo', () => {
  // from (5,3), target (3,3): +x andrebbe a 6 (fuori) → fallback y
  // ma dy=0 → null
  assert.equal(stepAway({ x: 5, y: 3 }, { x: 3, y: 3 }), null);
});

test('stepAway: con dy > 0 e x bloccato, usa y', () => {
  // from (5,2), target (3,4): dx=2, dy=-2. |dx|=|dy| → preferisce x.
  // x: newX = 6 → fuori. Fallback y: newY = 1 (−2 sign) → (5,1)
  assert.deepEqual(stepAway({ x: 5, y: 2 }, { x: 3, y: 4 }), { x: 5, y: 1 });
});

test('stepAway: gridSize custom 8 permette bordo diverso', () => {
  // con grid 8, (5,3) da (3,3) → +x a 6 (in grid 8)
  assert.deepEqual(stepAway({ x: 5, y: 3 }, { x: 3, y: 3 }, 8), { x: 6, y: 3 });
});

test('stepAway: angolato totalmente ritorna null', () => {
  // from (0,0), target (5,5): vuole -x (a -1) e -y (a -1), entrambi out
  assert.equal(stepAway({ x: 0, y: 0 }, { x: 5, y: 5 }), null);
});

test('stepAway: stesse coordinate ritorna null', () => {
  assert.equal(stepAway({ x: 3, y: 3 }, { x: 3, y: 3 }), null);
});

// ─────────────────────────────────────────────────────────────────
// selectAiPolicy — REGOLA_001 default
// ─────────────────────────────────────────────────────────────────

function baseActor(overrides = {}) {
  return {
    id: 'sistema',
    hp: 10,
    max_hp: 10,
    attack_range: 2,
    position: { x: 0, y: 0 },
    status: null,
    ...overrides,
  };
}
function baseTarget(overrides = {}) {
  return {
    id: 'player',
    hp: 10,
    max_hp: 10,
    attack_range: 2,
    position: { x: 1, y: 0 },
    ...overrides,
  };
}

test('selectAiPolicy R001: in range → attack', () => {
  const actor = baseActor({ position: { x: 2, y: 2 } });
  const target = baseTarget({ position: { x: 3, y: 2 } }); // dist 1
  assert.deepEqual(selectAiPolicy(actor, target), {
    rule: 'REGOLA_001',
    intent: 'attack',
  });
});

test('selectAiPolicy R001: fuori range → approach', () => {
  const actor = baseActor({ position: { x: 0, y: 0 } });
  const target = baseTarget({ position: { x: 5, y: 5 } }); // dist 10
  assert.deepEqual(selectAiPolicy(actor, target), {
    rule: 'REGOLA_001',
    intent: 'approach',
  });
});

test('selectAiPolicy R001: actor senza attack_range usa DEFAULT_ATTACK_RANGE', () => {
  const actor = baseActor({ attack_range: undefined, position: { x: 0, y: 0 } });
  const target = baseTarget({ position: { x: 2, y: 0 } }); // dist 2 == DEFAULT
  assert.equal(selectAiPolicy(actor, target).intent, 'attack');
});

// ─────────────────────────────────────────────────────────────────
// selectAiPolicy — REGOLA_002 retreat
// ─────────────────────────────────────────────────────────────────

test('selectAiPolicy R002: HP <= 30% → retreat', () => {
  const actor = baseActor({ hp: 3, max_hp: 10 }); // 30% esatto
  const target = baseTarget();
  assert.deepEqual(selectAiPolicy(actor, target), {
    rule: 'REGOLA_002',
    intent: 'retreat',
  });
});

test('selectAiPolicy R002: HP 31% NON triggera retreat', () => {
  const actor = baseActor({ hp: 4, max_hp: 10 }); // 40%
  const target = baseTarget({ position: { x: 1, y: 0 } }); // dist 1
  assert.equal(selectAiPolicy(actor, target).rule, 'REGOLA_001');
});

test('selectAiPolicy R002: HP 0 → retreat (edge case)', () => {
  // Un SIS morto potrebbe vedere HP=0. In teoria il caller filtra i morti,
  // ma il policy deve essere robusto.
  const actor = baseActor({ hp: 0, max_hp: 10 });
  assert.equal(selectAiPolicy(actor, baseTarget()).rule, 'REGOLA_002');
});

test('selectAiPolicy R002: senza max_hp fa fallback al default', () => {
  const actor = baseActor({ hp: 2, max_hp: undefined }); // 2/10 = 20% col fallback
  assert.equal(selectAiPolicy(actor, baseTarget()).rule, 'REGOLA_002');
});

// ─────────────────────────────────────────────────────────────────
// selectAiPolicy — REGOLA_003 kite
// ─────────────────────────────────────────────────────────────────

test('selectAiPolicy R003: actor range > target range, in safe zone → attack', () => {
  // actor r3, target r1, dist 3 (>= target+1=2 && <= actor=3)
  const actor = baseActor({ attack_range: 3, position: { x: 5, y: 3 } });
  const target = baseTarget({ attack_range: 1, position: { x: 2, y: 3 } });
  assert.deepEqual(selectAiPolicy(actor, target), {
    rule: 'REGOLA_003',
    intent: 'attack',
  });
});

test('selectAiPolicy R003: in target range → retreat (kite)', () => {
  // actor r3, target r1, dist 1 (dentro target range + buffer)
  const actor = baseActor({ attack_range: 3, position: { x: 3, y: 3 } });
  const target = baseTarget({ attack_range: 1, position: { x: 2, y: 3 } });
  assert.deepEqual(selectAiPolicy(actor, target), {
    rule: 'REGOLA_003',
    intent: 'retreat',
  });
});

test('selectAiPolicy R003: fuori actor range → approach', () => {
  // actor r3, target r1, dist 5
  const actor = baseActor({ attack_range: 3, position: { x: 5, y: 3 } });
  const target = baseTarget({ attack_range: 1, position: { x: 0, y: 3 } });
  assert.deepEqual(selectAiPolicy(actor, target), {
    rule: 'REGOLA_003',
    intent: 'approach',
  });
});

test('selectAiPolicy R003: range uguali → fallback a R001 (no kite)', () => {
  const actor = baseActor({ attack_range: 2, position: { x: 3, y: 3 } });
  const target = baseTarget({ attack_range: 2, position: { x: 1, y: 3 } });
  assert.equal(selectAiPolicy(actor, target).rule, 'REGOLA_001');
});

test('selectAiPolicy R003: range inferiore → fallback a R001', () => {
  const actor = baseActor({ attack_range: 1, position: { x: 3, y: 3 } });
  const target = baseTarget({ attack_range: 3, position: { x: 1, y: 3 } });
  assert.equal(selectAiPolicy(actor, target).rule, 'REGOLA_001');
});

// ─────────────────────────────────────────────────────────────────
// checkEmotionalOverrides
// ─────────────────────────────────────────────────────────────────

test('checkEmotionalOverrides: nessuno status → null', () => {
  const actor = baseActor({ status: null });
  assert.equal(checkEmotionalOverrides(actor, baseTarget()), null);
});

test('checkEmotionalOverrides: status presente ma tutti 0 → null', () => {
  const actor = baseActor({
    status: { panic: 0, rage: 0, stunned: 0 },
  });
  assert.equal(checkEmotionalOverrides(actor, baseTarget()), null);
});

test('checkEmotionalOverrides: stunned ha priorita' + ' assoluta', () => {
  const actor = baseActor({
    status: { panic: 5, rage: 5, stunned: 1 },
  });
  assert.deepEqual(checkEmotionalOverrides(actor, baseTarget()), {
    rule: 'STATO_STUNNED',
    intent: 'skip',
  });
});

test('checkEmotionalOverrides: rage supera panic', () => {
  const actor = baseActor({
    status: { panic: 3, rage: 2, stunned: 0 },
    position: { x: 2, y: 2 },
  });
  const target = baseTarget({ position: { x: 3, y: 2 } }); // dist 1
  const result = checkEmotionalOverrides(actor, target);
  assert.equal(result.rule, 'STATO_RAGE');
  assert.equal(result.intent, 'attack');
});

test('checkEmotionalOverrides: rage fuori range → approach', () => {
  const actor = baseActor({
    status: { rage: 2 },
    position: { x: 0, y: 0 },
  });
  const target = baseTarget({ position: { x: 5, y: 5 } });
  assert.equal(checkEmotionalOverrides(actor, target).intent, 'approach');
});

test('checkEmotionalOverrides: panic forza retreat', () => {
  const actor = baseActor({
    status: { panic: 2, rage: 0, stunned: 0 },
  });
  assert.deepEqual(checkEmotionalOverrides(actor, baseTarget()), {
    rule: 'STATO_PANIC',
    intent: 'retreat',
  });
});

test('selectAiPolicy: rage override HP retreat (REGOLA_002)', () => {
  // HP basso normalmente triggera R002, ma rage batte tutto
  const actor = baseActor({
    hp: 2,
    max_hp: 10,
    status: { rage: 3 },
    position: { x: 0, y: 0 },
  });
  const target = baseTarget({ position: { x: 1, y: 0 } }); // dist 1
  const result = selectAiPolicy(actor, target);
  assert.equal(result.rule, 'STATO_RAGE');
  assert.equal(result.intent, 'attack');
});

test('selectAiPolicy: panic override HP safe (sopra soglia)', () => {
  // HP 100% normalmente niente retreat, ma panic forza retreat
  const actor = baseActor({
    hp: 10,
    max_hp: 10,
    status: { panic: 2 },
  });
  assert.equal(selectAiPolicy(actor, baseTarget()).rule, 'STATO_PANIC');
});

test('selectAiPolicy: stunned override tutto', () => {
  const actor = baseActor({
    hp: 10,
    max_hp: 10,
    attack_range: 3, // R003 kite condition
    status: { stunned: 1 },
  });
  const target = baseTarget({ attack_range: 1 });
  assert.equal(selectAiPolicy(actor, target).rule, 'STATO_STUNNED');
  assert.equal(selectAiPolicy(actor, target).intent, 'skip');
});
