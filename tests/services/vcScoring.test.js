// SPRINT_023: test suite per apps/backend/services/vcScoring.js
//
// Scope: metriche derivate dagli eventi del session engine.
// Target:
//   - computeRawMetrics: attacks_started, hits, close_engage, kills,
//     first_blood, kill_pressure, damage_taken, 1vX, new_tiles,
//     evasion_ratio, low_hp_time
//   - buildVcSnapshot: payload completo con aggregate indices + MBTI +
//     Ennea archetypes
//   - Edge cases: sessione vuota, nessun evento, unica unita', eventi
//     mid-combat con kill e assist

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const {
  loadTelemetryConfig,
  buildVcSnapshot,
  deriveMbtiType,
} = require('../../apps/backend/services/vcScoring');

const CONFIG_PATH = path.resolve(__dirname, '..', '..', 'data', 'core', 'telemetry.yaml');
const telemetryConfig = loadTelemetryConfig(CONFIG_PATH, {
  log: () => {},
  warn: () => {},
});

// ─────────────────────────────────────────────────────────────────
// Fixture builders
// ─────────────────────────────────────────────────────────────────

function makeUnit(overrides = {}) {
  return {
    id: 'unit_1',
    species: 'velox',
    job: 'skirmisher',
    hp: 10,
    max_hp: 10,
    ap: 2,
    attack_range: 2,
    position: { x: 0, y: 0 },
    controlled_by: 'player',
    ...overrides,
  };
}

function makeSession({ units, events = [] } = {}) {
  return {
    session_id: 'test-session',
    turn: 1,
    units: units || [
      makeUnit(),
      makeUnit({
        id: 'unit_2',
        species: 'carapax',
        job: 'vanguard',
        attack_range: 1,
        controlled_by: 'sistema',
        position: { x: 5, y: 5 },
      }),
    ],
    events,
    grid: { width: 6, height: 6 },
    cap_pt_used: 0,
    cap_pt_max: 1,
  };
}

function makeAttackEvent({
  turn = 1,
  actor_id = 'unit_1',
  target_id = 'unit_2',
  position_from = { x: 2, y: 2 },
  target_position_at_attack = { x: 3, y: 2 },
  result = 'hit',
  damage_dealt = 2,
  mos = 3,
  target_hp_before = 10,
  target_hp_after = 8,
}) {
  return {
    turn,
    action_type: 'attack',
    actor_id,
    target_id,
    position_from,
    target_position_at_attack,
    result,
    damage_dealt,
    mos,
    target_hp_before,
    target_hp_after,
  };
}

function makeMoveEvent({
  turn = 1,
  actor_id = 'unit_1',
  position_from = { x: 0, y: 0 },
  position_to = { x: 1, y: 0 },
}) {
  return {
    turn,
    action_type: 'move',
    actor_id,
    position_from,
    position_to,
  };
}

function makeKillEvent({ turn = 1, actor_id = 'unit_1', target_id = 'unit_2' }) {
  return {
    turn,
    action_type: 'kill',
    actor_id,
    target_id,
  };
}

// ─────────────────────────────────────────────────────────────────
// Sessione vuota
// ─────────────────────────────────────────────────────────────────

test('buildVcSnapshot: sessione vuota → per_actor con unit ma 0 metriche', () => {
  const snapshot = buildVcSnapshot(makeSession({ events: [] }), telemetryConfig);
  assert.ok(snapshot.per_actor.unit_1);
  assert.equal(snapshot.per_actor.unit_1.raw_metrics.attacks_started, 0);
  assert.equal(snapshot.per_actor.unit_1.raw_metrics.kills, 0);
  assert.equal(snapshot.per_actor.unit_1.raw_metrics.first_blood, 0);
});

test('buildVcSnapshot: nessun unit → per_actor vuoto', () => {
  const snapshot = buildVcSnapshot(makeSession({ units: [], events: [] }), telemetryConfig);
  assert.deepEqual(snapshot.per_actor, {});
});

// ─────────────────────────────────────────────────────────────────
// attacks_started + hit_rate
// ─────────────────────────────────────────────────────────────────

test('attacks_started: conta attacchi per attore', () => {
  const events = [
    makeAttackEvent({ result: 'hit' }),
    makeAttackEvent({ result: 'miss', damage_dealt: 0 }),
    makeAttackEvent({ result: 'hit' }),
  ];
  const snapshot = buildVcSnapshot(makeSession({ events }), telemetryConfig);
  assert.equal(snapshot.per_actor.unit_1.raw_metrics.attacks_started, 3);
  assert.equal(snapshot.per_actor.unit_1.raw_metrics.attack_hit_rate, 2 / 3);
});

test('attack_hit_rate: 0 se nessun attacco', () => {
  const snapshot = buildVcSnapshot(makeSession({ events: [] }), telemetryConfig);
  assert.equal(snapshot.per_actor.unit_1.raw_metrics.attack_hit_rate, 0);
});

// ─────────────────────────────────────────────────────────────────
// close_engage (mutual range — sprint-007)
// ─────────────────────────────────────────────────────────────────

test('close_engage: attacco in mutual range (dist <= target.attack_range)', () => {
  // Target is vanguard r1, attack from dist 1 → mutual range → close_engage
  const events = [
    makeAttackEvent({
      position_from: { x: 2, y: 2 },
      target_position_at_attack: { x: 3, y: 2 },
    }),
  ];
  const snapshot = buildVcSnapshot(makeSession({ events }), telemetryConfig);
  // 1 attack, 1 close_engage → ratio 1.0
  assert.equal(snapshot.per_actor.unit_1.raw_metrics.close_engage, 1);
});

test('close_engage: 0 se attacco fuori mutual range', () => {
  // Target vanguard r1, attack dist 2 → NON in mutual range
  const events = [
    makeAttackEvent({
      position_from: { x: 1, y: 2 },
      target_position_at_attack: { x: 3, y: 2 },
    }),
  ];
  const snapshot = buildVcSnapshot(makeSession({ events }), telemetryConfig);
  assert.equal(snapshot.per_actor.unit_1.raw_metrics.close_engage, 0);
});

// ─────────────────────────────────────────────────────────────────
// first_blood + kill_pressure
// ─────────────────────────────────────────────────────────────────

test('first_blood: primo kill della sessione assegna first_blood=1', () => {
  const events = [makeAttackEvent({ damage_dealt: 10, target_hp_after: 0 }), makeKillEvent({})];
  const snapshot = buildVcSnapshot(makeSession({ events }), telemetryConfig);
  assert.equal(snapshot.per_actor.unit_1.raw_metrics.first_blood, 1);
  assert.equal(snapshot.per_actor.unit_1.raw_metrics.kills, 1);
});

test('first_blood: seconda unita' + ' a uccidere non ottiene first_blood', () => {
  const units = [
    makeUnit({ id: 'unit_1' }),
    makeUnit({ id: 'unit_2' }),
    makeUnit({ id: 'unit_3', controlled_by: 'sistema' }),
  ];
  const events = [
    makeKillEvent({ turn: 1, actor_id: 'unit_1', target_id: 'unit_3' }),
    makeKillEvent({ turn: 2, actor_id: 'unit_2', target_id: 'unit_3' }),
  ];
  const snapshot = buildVcSnapshot(makeSession({ units, events }), telemetryConfig);
  assert.equal(snapshot.per_actor.unit_1.raw_metrics.first_blood, 1);
  assert.equal(snapshot.per_actor.unit_2.raw_metrics.first_blood, 0);
});

test('kill_pressure: kills / maxTurn', () => {
  const events = [
    makeAttackEvent({ turn: 5, damage_dealt: 10, target_hp_after: 0 }),
    makeKillEvent({ turn: 5 }),
  ];
  const snapshot = buildVcSnapshot(makeSession({ events }), telemetryConfig);
  assert.equal(snapshot.per_actor.unit_1.raw_metrics.kill_pressure, 1 / 5);
});

// ─────────────────────────────────────────────────────────────────
// damage_taken + damage_taken_ratio
// ─────────────────────────────────────────────────────────────────

test('damage_taken: somma del damage subito', () => {
  const events = [
    makeAttackEvent({ actor_id: 'unit_2', target_id: 'unit_1', damage_dealt: 3 }),
    makeAttackEvent({ actor_id: 'unit_2', target_id: 'unit_1', damage_dealt: 2 }),
  ];
  const snapshot = buildVcSnapshot(makeSession({ events }), telemetryConfig);
  assert.equal(snapshot.per_actor.unit_1.raw_metrics.damage_taken, 5);
});

test('damage_taken_ratio: frazione del danno totale della sessione', () => {
  const events = [
    makeAttackEvent({ actor_id: 'unit_2', target_id: 'unit_1', damage_dealt: 3 }),
    makeAttackEvent({ actor_id: 'unit_1', target_id: 'unit_2', damage_dealt: 7 }),
  ];
  const snapshot = buildVcSnapshot(makeSession({ events }), telemetryConfig);
  // unit_1 damage_taken = 3, total damage = 10 → ratio 0.3
  assert.equal(snapshot.per_actor.unit_1.raw_metrics.damage_taken_ratio, 3 / 10);
});

// ─────────────────────────────────────────────────────────────────
// 1vX (sprint-011)
// ─────────────────────────────────────────────────────────────────

test('1vX: attacchi 1v1 isolati contano 1.0', () => {
  // Solo 2 unita' totali, ogni attacco e' in 1vX situation
  const events = [makeAttackEvent({ turn: 1 }), makeAttackEvent({ turn: 2 })];
  const snapshot = buildVcSnapshot(makeSession({ events }), telemetryConfig);
  assert.equal(snapshot.per_actor.unit_1.raw_metrics['1vX'], 1);
});

// ─────────────────────────────────────────────────────────────────
// new_tiles (sprint-011)
// ─────────────────────────────────────────────────────────────────

test('new_tiles: conta celle uniche visitate', () => {
  const events = [
    makeMoveEvent({ position_from: { x: 0, y: 0 }, position_to: { x: 1, y: 0 } }),
    makeMoveEvent({ position_from: { x: 1, y: 0 }, position_to: { x: 2, y: 0 } }),
  ];
  const snapshot = buildVcSnapshot(makeSession({ events }), telemetryConfig);
  // Visitate: (0,0), (1,0), (2,0) = 3 celle uniche. Normalizzato su 36.
  assert.equal(snapshot.per_actor.unit_1.raw_metrics.new_tiles_count, 3);
});

test('new_tiles: celle duplicate contate una volta sola', () => {
  const events = [
    makeMoveEvent({ position_from: { x: 0, y: 0 }, position_to: { x: 1, y: 0 } }),
    makeMoveEvent({ position_from: { x: 1, y: 0 }, position_to: { x: 0, y: 0 } }),
  ];
  const snapshot = buildVcSnapshot(makeSession({ events }), telemetryConfig);
  // Visited: (0,0), (1,0) = 2 uniche
  assert.equal(snapshot.per_actor.unit_1.raw_metrics.new_tiles_count, 2);
});

// ─────────────────────────────────────────────────────────────────
// evasion_ratio (sprint-005 fase 2)
// ─────────────────────────────────────────────────────────────────

test('evasion_ratio: attack seguito da move che aumenta distanza', () => {
  const events = [
    makeAttackEvent({
      turn: 1,
      position_from: { x: 2, y: 2 },
      target_position_at_attack: { x: 3, y: 2 },
    }),
    makeMoveEvent({
      turn: 1,
      position_from: { x: 2, y: 2 },
      position_to: { x: 1, y: 2 },
    }),
  ];
  const snapshot = buildVcSnapshot(makeSession({ events }), telemetryConfig);
  // attack da (2,2) a (3,2), poi move (2,2)→(1,2). Distanza pre=1, post=2 → evasion
  assert.equal(snapshot.per_actor.unit_1.raw_metrics.evasion_ratio, 1);
});

test("evasion_ratio: move verso target NON e' evasion", () => {
  const events = [
    makeAttackEvent({
      turn: 1,
      position_from: { x: 1, y: 2 },
      target_position_at_attack: { x: 3, y: 2 },
    }),
    makeMoveEvent({
      turn: 1,
      position_from: { x: 1, y: 2 },
      position_to: { x: 2, y: 2 },
    }),
  ];
  const snapshot = buildVcSnapshot(makeSession({ events }), telemetryConfig);
  assert.equal(snapshot.per_actor.unit_1.raw_metrics.evasion_ratio, 0);
});

// ─────────────────────────────────────────────────────────────────
// Aggregate indices + Ennea triggers
// ─────────────────────────────────────────────────────────────────

test('buildVcSnapshot: include aggregate_indices (aggro, risk, ecc.)', () => {
  const snapshot = buildVcSnapshot(makeSession({ events: [] }), telemetryConfig);
  assert.ok(snapshot.per_actor.unit_1.aggregate_indices);
  assert.ok('aggro' in snapshot.per_actor.unit_1.aggregate_indices);
  assert.ok('risk' in snapshot.per_actor.unit_1.aggregate_indices);
});

test('buildVcSnapshot: include ennea_archetypes array', () => {
  const snapshot = buildVcSnapshot(makeSession({ events: [] }), telemetryConfig);
  assert.ok(Array.isArray(snapshot.per_actor.unit_1.ennea_archetypes));
  // Il config ha 6 Ennea themes (Conquistatore, Coordinatore, Esploratore,
  // Architetto, Stoico, Cacciatore)
  assert.ok(snapshot.per_actor.unit_1.ennea_archetypes.length >= 5);
});

test('buildVcSnapshot: meta include coverage (full/partial/null)', () => {
  const snapshot = buildVcSnapshot(makeSession({ events: [] }), telemetryConfig);
  assert.ok(snapshot.meta.coverage);
  assert.ok(Array.isArray(snapshot.meta.coverage.full));
  assert.ok(Array.isArray(snapshot.meta.coverage.partial));
  assert.ok(Array.isArray(snapshot.meta.coverage.null));
});

test('buildVcSnapshot: session_id propagato', () => {
  const snapshot = buildVcSnapshot(makeSession({ events: [] }), telemetryConfig);
  assert.equal(snapshot.session_id, 'test-session');
});

test('buildVcSnapshot: turns_played = max(event.turn)', () => {
  const events = [makeAttackEvent({ turn: 3 }), makeAttackEvent({ turn: 7 })];
  const snapshot = buildVcSnapshot(makeSession({ events }), telemetryConfig);
  assert.equal(snapshot.meta.turns_played, 7);
});

// ─────────────────────────────────────────────────────────────────
// deriveMbtiType dead-band (VC Calibration iter1 + bot fix 2026-04-17)
// ─────────────────────────────────────────────────────────────────

test('deriveMbtiType: axes tutti chiari → tipo 4-lettere', () => {
  const axes = {
    E_I: { value: 0.2 }, // < 0.45 → E
    S_N: { value: 0.8 }, // > 0.55 → S
    T_F: { value: 0.8 }, // > 0.55 → T
    J_P: { value: 0.2 }, // < 0.45 → P
  };
  assert.equal(deriveMbtiType(axes), 'ESTP');
});

test('deriveMbtiType: axis null → null (no partial type)', () => {
  const axes = {
    E_I: { value: 0.2 },
    S_N: { value: 0.8 },
    T_F: null,
    J_P: { value: 0.2 },
  };
  assert.equal(deriveMbtiType(axes), null);
});

test('deriveMbtiType: axis in dead-band → null (no X char in output)', () => {
  // Bot review fix: dead-band axes MUST propagate null so mating fallback
  // `partyMember.mbti_type || 'NEUTRA'` triggers correctly. Returning
  // a string with 'X' would bypass fallback and cause compat lookup miss.
  const axes = {
    E_I: { value: 0.5 }, // dead-band
    S_N: { value: 0.8 },
    T_F: { value: 0.8 },
    J_P: { value: 0.2 },
  };
  assert.equal(deriveMbtiType(axes), null);
});

test('deriveMbtiType: multipli dead-band → null', () => {
  const axes = {
    E_I: { value: 0.5 },
    S_N: { value: 0.5 },
    T_F: { value: 0.5 },
    J_P: { value: 0.5 },
  };
  assert.equal(deriveMbtiType(axes), null);
});

test('deriveMbtiType: nessun X in output string (ever)', () => {
  // Property test: per qualsiasi combinazione valid/dead-band, output
  // non deve mai contenere 'X'.
  const samples = [
    { E_I: 0.1, S_N: 0.5, T_F: 0.5, J_P: 0.5 },
    { E_I: 0.5, S_N: 0.1, T_F: 0.5, J_P: 0.5 },
    { E_I: 0.5, S_N: 0.5, T_F: 0.1, J_P: 0.5 },
    { E_I: 0.5, S_N: 0.5, T_F: 0.5, J_P: 0.1 },
    { E_I: 0.45, S_N: 0.55, T_F: 0.5, J_P: 0.5 },
  ];
  for (const s of samples) {
    const axes = Object.fromEntries(Object.entries(s).map(([k, v]) => [k, { value: v }]));
    const type = deriveMbtiType(axes);
    if (type !== null) {
      assert.ok(!type.includes('X'), `type ${type} must not contain X`);
    }
  }
});

// ─────────────────────────────────────────────────────────────────
// Sprint 2026-04-26 — dead-band adattivo per session brevi
// ─────────────────────────────────────────────────────────────────

test('deriveMbtiType: short session (events_count < 30) usa dead-band largo 0.35-0.65', () => {
  // Value 0.40 cade in dead-band largo (0.35..0.65) → letter null.
  // Value 0.40 NON cade in dead-band stretto (0.45..0.55) → letter 'lo' (E).
  const axes = {
    E_I: { value: 0.4 },
    S_N: { value: 0.8 },
    T_F: { value: 0.8 },
    J_P: { value: 0.2 },
  };
  // Short session: dead-band largo → axis E_I in band → null
  assert.equal(deriveMbtiType(axes, { events_count: 10 }), null);
  // Long session: dead-band stretto → 0.4 < 0.45 → 'E' → tipo completo
  assert.equal(deriveMbtiType(axes, { events_count: 50 }), 'ESTP');
});

test('deriveMbtiType: short session value 0.30 fuori dead-band largo → letter assigned', () => {
  // 0.30 < 0.35 anche in short → resta classificato.
  const axes = {
    E_I: { value: 0.3 },
    S_N: { value: 0.8 },
    T_F: { value: 0.8 },
    J_P: { value: 0.2 },
  };
  assert.equal(deriveMbtiType(axes, { events_count: 5 }), 'ESTP');
});

test('deriveMbtiType: events_count omesso → comportamento iter1 (dead-band stretto, backward compat)', () => {
  const axes = {
    E_I: { value: 0.4 },
    S_N: { value: 0.8 },
    T_F: { value: 0.8 },
    J_P: { value: 0.2 },
  };
  // No opts → dead-band stretto (legacy)
  assert.equal(deriveMbtiType(axes), 'ESTP');
});

// ─────────────────────────────────────────────────────────────────
// Sprint 2026-04-26 — Stoico + Architetto fire-able (proxy reformulation)
// ─────────────────────────────────────────────────────────────────

test('Stoico(9) fires: kills<1 && damage_taken>0 && total_actions>5', () => {
  // 6 attacks, all miss, took damage from u2 → Stoico endurance proxy.
  const events = [];
  for (let i = 1; i <= 6; i += 1) {
    events.push({
      actor_id: 'unit_1',
      action_type: 'attack',
      target_id: 'unit_2',
      result: 'miss',
      turn: i,
    });
  }
  events.push({
    actor_id: 'unit_2',
    action_type: 'attack',
    target_id: 'unit_1',
    result: 'hit',
    damage_dealt: 5,
    turn: 1,
    target_hp_before: 10,
    target_hp_after: 5,
  });
  const snap = buildVcSnapshot(makeSession({ events }), telemetryConfig);
  const stoico = snap.per_actor.unit_1.ennea_archetypes.find((a) => a.id === 'Stoico(9)');
  assert.ok(stoico, 'Stoico(9) presente nella lista archetipi');
  assert.equal(stoico.triggered, true, 'Stoico deve fire con 6 attack miss + danno preso');
});

test('Stoico(9) NO fire: con kill', () => {
  // 1 attack, hit, killed target → kills>=1 → no Stoico.
  const events = [
    {
      actor_id: 'unit_1',
      action_type: 'attack',
      target_id: 'unit_2',
      result: 'hit',
      damage_dealt: 10,
      turn: 1,
      target_hp_before: 10,
      target_hp_after: 0,
    },
    { actor_id: 'unit_1', action_type: 'kill', target_id: 'unit_2', turn: 1 },
    {
      actor_id: 'unit_2',
      action_type: 'attack',
      target_id: 'unit_1',
      result: 'hit',
      damage_dealt: 3,
      turn: 1,
      target_hp_before: 10,
      target_hp_after: 7,
    },
  ];
  const snap = buildVcSnapshot(makeSession({ events }), telemetryConfig);
  const stoico = snap.per_actor.unit_1.ennea_archetypes.find((a) => a.id === 'Stoico(9)');
  assert.equal(stoico.triggered, false);
});

test('Architetto(5) fires: setup_ratio>0.4 && damage_taken_ratio<0.2', () => {
  // 2 move + 2 attack pattern (move-attack-move-attack) + low damage taken.
  const events = [
    {
      actor_id: 'unit_1',
      action_type: 'move',
      position_from: { x: 0, y: 0 },
      position_to: { x: 1, y: 0 },
      turn: 1,
    },
    {
      actor_id: 'unit_1',
      action_type: 'attack',
      target_id: 'unit_2',
      result: 'hit',
      damage_dealt: 3,
      turn: 1,
      target_hp_before: 10,
      target_hp_after: 7,
    },
    {
      actor_id: 'unit_1',
      action_type: 'move',
      position_from: { x: 1, y: 0 },
      position_to: { x: 2, y: 0 },
      turn: 2,
    },
    {
      actor_id: 'unit_1',
      action_type: 'attack',
      target_id: 'unit_2',
      result: 'hit',
      damage_dealt: 3,
      turn: 2,
      target_hp_before: 7,
      target_hp_after: 4,
    },
    {
      actor_id: 'unit_2',
      action_type: 'attack',
      target_id: 'unit_1',
      result: 'hit',
      damage_dealt: 1,
      turn: 1,
      target_hp_before: 10,
      target_hp_after: 9,
    },
  ];
  const snap = buildVcSnapshot(makeSession({ events }), telemetryConfig);
  const arch = snap.per_actor.unit_1.ennea_archetypes.find((a) => a.id === 'Architetto(5)');
  assert.ok(arch, 'Architetto(5) presente nella lista archetipi');
  assert.equal(arch.triggered, true, 'Architetto deve fire con setup metodico + low damage taken');
});

test('Architetto(5) NO fire: high damage taken', () => {
  // setup_ratio buono ma damage_taken_ratio alto (> 0.2) → no Architetto.
  const events = [
    {
      actor_id: 'unit_1',
      action_type: 'move',
      position_from: { x: 0, y: 0 },
      position_to: { x: 1, y: 0 },
      turn: 1,
    },
    {
      actor_id: 'unit_1',
      action_type: 'attack',
      target_id: 'unit_2',
      result: 'hit',
      damage_dealt: 1,
      turn: 1,
      target_hp_before: 10,
      target_hp_after: 9,
    },
    {
      actor_id: 'unit_2',
      action_type: 'attack',
      target_id: 'unit_1',
      result: 'hit',
      damage_dealt: 8,
      turn: 1,
      target_hp_before: 10,
      target_hp_after: 2,
    },
  ];
  const snap = buildVcSnapshot(makeSession({ events }), telemetryConfig);
  const arch = snap.per_actor.unit_1.ennea_archetypes.find((a) => a.id === 'Architetto(5)');
  assert.equal(arch.triggered, false);
});
