// P4 Ennea effects runtime wire — branch feat/p4-ennea-effects-wire.
//
// Scope: verifica che applyEnneaToStatus muti correttamente
// actor[<stat>_bonus] + actor.status[<stat>_buff] per stat 'mechanical'
// (attack_mod, defense_mod) e skippi log_only stat (evasion_bonus,
// move_bonus, stress_reduction) come M-future.
//
// Coverage:
//   - mechanical wire: attack_mod, defense_mod
//   - log_only skip: evasion_bonus, move_bonus, stress_reduction
//   - multi-archetype stack (Conquistatore + Architetto = +2 attack_mod_bonus)
//   - decay coerenza: dopo 1 round end, _buff → 0 → bonus zeroed
//   - KO unit skip
//   - Empty / null effects safe

'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  ENNEA_EFFECTS,
  STAT_RUNTIME_KIND,
  resolveEnneaEffects,
  applyEnneaToStatus,
} = require('../../apps/backend/services/enneaEffects');

function makeActor(overrides = {}) {
  return {
    id: 'unit_1',
    hp: 10,
    mod: 0,
    attack_mod_bonus: 0,
    defense_mod_bonus: 0,
    status: {},
    ...overrides,
  };
}

// ─────────────────────────────────────────────────────────────────
// resolveEnneaEffects — sanity
// ─────────────────────────────────────────────────────────────────

test('resolveEnneaEffects: filtra archetipi sconosciuti', () => {
  const effects = resolveEnneaEffects(['Conquistatore(3)', 'Sconosciuto(99)']);
  assert.equal(effects.length, 1);
  assert.equal(effects[0].archetype, 'Conquistatore(3)');
});

test('resolveEnneaEffects: array vuoto → []', () => {
  const effects = resolveEnneaEffects([]);
  assert.deepEqual(effects, []);
});

// ─────────────────────────────────────────────────────────────────
// applyEnneaToStatus — mechanical (attack_mod, defense_mod)
// ─────────────────────────────────────────────────────────────────

test('applyEnneaToStatus: Conquistatore(3) → attack_mod_bonus +1 + status.attack_mod_buff:1', () => {
  const actor = makeActor();
  const effects = resolveEnneaEffects(['Conquistatore(3)']);
  const { applied, skipped } = applyEnneaToStatus(actor, effects);
  assert.equal(actor.attack_mod_bonus, 1);
  assert.equal(actor.status.attack_mod_buff, 1);
  assert.equal(applied.length, 1);
  assert.equal(applied[0].archetype, 'Conquistatore(3)');
  assert.equal(applied[0].stat, 'attack_mod');
  assert.equal(applied[0].amount, 1);
  assert.equal(applied[0].duration, 1);
  assert.equal(applied[0].bonus_after, 1);
  assert.equal(skipped.length, 0);
});

test('applyEnneaToStatus: Coordinatore(2) → defense_mod_bonus +1 + status.defense_mod_buff:1', () => {
  const actor = makeActor();
  const effects = resolveEnneaEffects(['Coordinatore(2)']);
  const { applied, skipped } = applyEnneaToStatus(actor, effects);
  assert.equal(actor.defense_mod_bonus, 1);
  assert.equal(actor.status.defense_mod_buff, 1);
  assert.equal(applied.length, 1);
  assert.equal(applied[0].stat, 'defense_mod');
  assert.equal(skipped.length, 0);
});

test('applyEnneaToStatus: multi-archetype Conquistatore + Architetto → attack_mod_bonus +2 (stacking)', () => {
  const actor = makeActor();
  const effects = resolveEnneaEffects(['Conquistatore(3)', 'Architetto(5)']);
  assert.equal(effects.length, 2);
  const { applied, skipped } = applyEnneaToStatus(actor, effects);
  assert.equal(actor.attack_mod_bonus, 2);
  assert.equal(actor.status.attack_mod_buff, 1);
  assert.equal(applied.length, 2);
  assert.equal(skipped.length, 0);
});

// ─────────────────────────────────────────────────────────────────
// applyEnneaToStatus — log_only (evasion, move, stress)
// ─────────────────────────────────────────────────────────────────

test('applyEnneaToStatus: Esploratore(7) move_bonus → log_only skip', () => {
  const actor = makeActor();
  const effects = resolveEnneaEffects(['Esploratore(7)']);
  const { applied, skipped } = applyEnneaToStatus(actor, effects);
  assert.equal(applied.length, 0);
  assert.equal(skipped.length, 1);
  assert.equal(skipped[0].archetype, 'Esploratore(7)');
  assert.equal(skipped[0].stat, 'move_bonus');
  assert.equal(skipped[0].reason, 'no_consumer');
  // Nessuna mutazione bonus o status:
  assert.equal(actor.move_bonus_bonus, undefined);
  assert.equal(actor.status.move_bonus_buff, undefined);
});

test('applyEnneaToStatus: Stoico(9) stress_reduction → log_only skip', () => {
  const actor = makeActor();
  const effects = resolveEnneaEffects(['Stoico(9)']);
  const { skipped } = applyEnneaToStatus(actor, effects);
  assert.equal(skipped.length, 1);
  assert.equal(skipped[0].stat, 'stress_reduction');
  assert.equal(skipped[0].reason, 'no_consumer');
});

test('applyEnneaToStatus: Cacciatore(8) evasion_bonus → log_only skip', () => {
  const actor = makeActor();
  const effects = resolveEnneaEffects(['Cacciatore(8)']);
  const { skipped } = applyEnneaToStatus(actor, effects);
  assert.equal(skipped.length, 1);
  assert.equal(skipped[0].stat, 'evasion_bonus');
});

// ─────────────────────────────────────────────────────────────────
// Edge cases
// ─────────────────────────────────────────────────────────────────

test('applyEnneaToStatus: KO unit (hp=0) → skip apply, all effects in skipped[]', () => {
  const actor = makeActor({ hp: 0 });
  const effects = resolveEnneaEffects(['Conquistatore(3)']);
  const { applied, skipped } = applyEnneaToStatus(actor, effects);
  assert.equal(applied.length, 0);
  assert.equal(skipped.length, 1);
  assert.equal(skipped[0].reason, 'actor_ko');
  // Nessuna mutazione su KO:
  assert.equal(actor.attack_mod_bonus, 0);
});

test('applyEnneaToStatus: empty effects → no mutation', () => {
  const actor = makeActor();
  const { applied, skipped } = applyEnneaToStatus(actor, []);
  assert.equal(applied.length, 0);
  assert.equal(skipped.length, 0);
  assert.equal(actor.attack_mod_bonus, 0);
});

test('applyEnneaToStatus: null actor safe', () => {
  const effects = resolveEnneaEffects(['Conquistatore(3)']);
  const { applied, skipped } = applyEnneaToStatus(null, effects);
  assert.equal(applied.length, 0);
  assert.equal(skipped.length, 0);
});

// ─────────────────────────────────────────────────────────────────
// Decay coerenza — verifica integrazione col loop esistente
// in sessionRoundBridge.applyEndOfRoundSideEffects (line 663-676).
// Dopo apply: status.attack_mod_buff=1.
// Simuliamo decay (decrement -1) → status.attack_mod_buff=0 → bonus zeroed.
// ─────────────────────────────────────────────────────────────────

test('decay coerenza: dopo apply + 1 round end, attack_mod_buff=0 + bonus zeroed', () => {
  const actor = makeActor();
  const effects = resolveEnneaEffects(['Conquistatore(3)']);
  applyEnneaToStatus(actor, effects);
  assert.equal(actor.attack_mod_bonus, 1);
  assert.equal(actor.status.attack_mod_buff, 1);

  // Simula decay loop in sessionRoundBridge:
  //   1) decrement status: v - 1
  //   2) if _buff <= 0 → zero <stat>_bonus
  for (const key of Object.keys(actor.status)) {
    const v = Number(actor.status[key]);
    if (v > 0) actor.status[key] = v - 1;
  }
  for (const key of Object.keys(actor.status)) {
    if (!key.endsWith('_buff')) continue;
    if (Number(actor.status[key]) > 0) continue;
    const stat = key.slice(0, -'_buff'.length);
    const bonusKey = `${stat}_bonus`;
    if (actor[bonusKey] !== undefined) actor[bonusKey] = 0;
  }
  assert.equal(actor.status.attack_mod_buff, 0);
  assert.equal(actor.attack_mod_bonus, 0);
});

// ─────────────────────────────────────────────────────────────────
// STAT_RUNTIME_KIND — registry consistency
// ─────────────────────────────────────────────────────────────────

test('STAT_RUNTIME_KIND: tutti gli stat in ENNEA_EFFECTS sono mappati', () => {
  const usedStats = new Set();
  for (const def of Object.values(ENNEA_EFFECTS)) {
    for (const buff of def.buffs || []) {
      usedStats.add(buff.stat);
    }
  }
  for (const stat of usedStats) {
    assert.ok(
      stat in STAT_RUNTIME_KIND,
      `stat '${stat}' usato in ENNEA_EFFECTS ma non in STAT_RUNTIME_KIND`,
    );
  }
});

test('STAT_RUNTIME_KIND: 2 mechanical (attack_mod, defense_mod) + 3 log_only', () => {
  const mech = Object.entries(STAT_RUNTIME_KIND)
    .filter(([, v]) => v === 'mechanical')
    .map(([k]) => k)
    .sort();
  const log = Object.entries(STAT_RUNTIME_KIND)
    .filter(([, v]) => v === 'log_only')
    .map(([k]) => k)
    .sort();
  assert.deepEqual(mech, ['attack_mod', 'defense_mod']);
  assert.deepEqual(log, ['evasion_bonus', 'move_bonus', 'stress_reduction']);
});
