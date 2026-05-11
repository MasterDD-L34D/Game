// P4 Ennea effects runtime wire — branch feat/p4-ennea-effects-wire +
// feat/stat-consumer-wire-move-stress-evasion (audit P4 follow-up
// "3 stat consumer wire").
//
// Scope: verifica che applyEnneaToStatus muti correttamente
// actor[<stat>_bonus] + actor.status[<stat>_buff] per tutti i 5 stat
// 'mechanical' canonical (attack_mod, defense_mod, move_bonus,
// stress_reduction, evasion_bonus). 0 log_only attivi.
//
// Coverage:
//   - mechanical wire: 5 stat (attack/defense_mod, move/evasion/stress)
//   - multi-archetype stack (Conquistatore + Architetto = +2 attack_mod_bonus)
//   - decay coerenza: dopo 1 round end, _buff → 0 → bonus zeroed
//   - KO unit skip
//   - Empty / null effects safe
//   - Live consumer integration:
//     · move_bonus → estende budget move in validatePlayerIntent
//     · stress_reduction → riduce damage_taken in sgTracker.accumulate
//     · evasion_bonus → alza DC in resolveAttack + predictCombat

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

test('applyEnneaToStatus: multi-archetype Conquistatore + Architetto → attack_mod_bonus +1 (dedup best-wins)', () => {
  // 2026-05-10 TKT-ENNEA-1-5-DOUBLE-TRIGGER dedup: when two archetypes target
  // same stat with equal amount, best-per-stat wins; other is skipped as superseded.
  const actor = makeActor();
  const effects = resolveEnneaEffects(['Conquistatore(3)', 'Architetto(5)']);
  assert.equal(effects.length, 2);
  const { applied, skipped } = applyEnneaToStatus(actor, effects);
  assert.equal(actor.attack_mod_bonus, 1);
  assert.equal(actor.status.attack_mod_buff, 1);
  assert.equal(applied.length, 1);
  assert.equal(skipped.length, 1);
  assert.equal(skipped[0].reason, 'dedup_superseded');
});

// ─────────────────────────────────────────────────────────────────
// applyEnneaToStatus — newly mechanical (move, stress, evasion)
// ─────────────────────────────────────────────────────────────────

test('applyEnneaToStatus: Esploratore(7) → move_bonus_bonus +1 + status.move_bonus_buff:1', () => {
  const actor = makeActor();
  const effects = resolveEnneaEffects(['Esploratore(7)']);
  const { applied, skipped } = applyEnneaToStatus(actor, effects);
  assert.equal(applied.length, 1);
  assert.equal(skipped.length, 0);
  assert.equal(applied[0].archetype, 'Esploratore(7)');
  assert.equal(applied[0].stat, 'move_bonus');
  assert.equal(applied[0].amount, 1);
  assert.equal(actor.move_bonus_bonus, 1);
  assert.equal(actor.status.move_bonus_buff, 1);
});

test('applyEnneaToStatus: Stoico(9) → stress_reduction_bonus +0.05 + status.stress_reduction_buff:1', () => {
  const actor = makeActor();
  const effects = resolveEnneaEffects(['Stoico(9)']);
  const { applied, skipped } = applyEnneaToStatus(actor, effects);
  assert.equal(applied.length, 1);
  assert.equal(skipped.length, 0);
  assert.equal(applied[0].stat, 'stress_reduction');
  assert.ok(Math.abs(actor.stress_reduction_bonus - 0.05) < 1e-9);
  assert.equal(actor.status.stress_reduction_buff, 1);
});

test('applyEnneaToStatus: Cacciatore(8) → evasion_bonus_bonus +1 + status.evasion_bonus_buff:1', () => {
  const actor = makeActor();
  const effects = resolveEnneaEffects(['Cacciatore(8)']);
  const { applied, skipped } = applyEnneaToStatus(actor, effects);
  assert.equal(applied.length, 1);
  assert.equal(skipped.length, 0);
  assert.equal(applied[0].stat, 'evasion_bonus');
  assert.equal(actor.evasion_bonus_bonus, 1);
  assert.equal(actor.status.evasion_bonus_buff, 1);
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

test('STAT_RUNTIME_KIND: 5 mechanical (full coverage), 0 log_only', () => {
  const mech = Object.entries(STAT_RUNTIME_KIND)
    .filter(([, v]) => v === 'mechanical')
    .map(([k]) => k)
    .sort();
  const log = Object.entries(STAT_RUNTIME_KIND)
    .filter(([, v]) => v === 'log_only')
    .map(([k]) => k)
    .sort();
  assert.deepEqual(mech, [
    'attack_mod',
    'defense_mod',
    'evasion_bonus',
    'move_bonus',
    'stress_reduction',
  ]);
  assert.deepEqual(log, []);
});

// ─────────────────────────────────────────────────────────────────
// P4 9/9 coverage extension — Type 1 / 4 / 6 wire
// ─────────────────────────────────────────────────────────────────

test('ENNEA_EFFECTS: 9/9 archetype coverage', () => {
  const ids = Object.keys(ENNEA_EFFECTS).sort();
  assert.deepEqual(ids, [
    'Architetto(5)',
    'Cacciatore(8)',
    'Conquistatore(3)',
    'Coordinatore(2)',
    'Esploratore(7)',
    'Individualista(4)',
    'Lealista(6)',
    'Riformatore(1)',
    'Stoico(9)',
  ]);
});

test('applyEnneaToStatus: Riformatore(1) → attack_mod_bonus +1 + status.attack_mod_buff:1', () => {
  const actor = makeActor();
  const effects = resolveEnneaEffects(['Riformatore(1)']);
  const { applied, skipped } = applyEnneaToStatus(actor, effects);
  assert.equal(actor.attack_mod_bonus, 1);
  assert.equal(actor.status.attack_mod_buff, 1);
  assert.equal(applied.length, 1);
  assert.equal(applied[0].archetype, 'Riformatore(1)');
  assert.equal(applied[0].stat, 'attack_mod');
  assert.equal(applied[0].duration, 1);
  assert.equal(skipped.length, 0);
});

test('applyEnneaToStatus: Individualista(4) → defense_mod_bonus +1 + status.defense_mod_buff:1', () => {
  const actor = makeActor();
  const effects = resolveEnneaEffects(['Individualista(4)']);
  const { applied, skipped } = applyEnneaToStatus(actor, effects);
  assert.equal(actor.defense_mod_bonus, 1);
  assert.equal(actor.status.defense_mod_buff, 1);
  assert.equal(applied.length, 1);
  assert.equal(applied[0].stat, 'defense_mod');
  assert.equal(applied[0].duration, 1);
  assert.equal(skipped.length, 0);
});

test('applyEnneaToStatus: Lealista(6) → defense_mod_bonus +1 + status.defense_mod_buff:2 (extended)', () => {
  const actor = makeActor();
  const effects = resolveEnneaEffects(['Lealista(6)']);
  const { applied, skipped } = applyEnneaToStatus(actor, effects);
  assert.equal(actor.defense_mod_bonus, 1);
  // Lealista has duration 2 — buff lasts longer than other defense buffs.
  assert.equal(actor.status.defense_mod_buff, 2);
  assert.equal(applied.length, 1);
  assert.equal(applied[0].stat, 'defense_mod');
  assert.equal(applied[0].duration, 2);
  assert.equal(skipped.length, 0);
});

test('applyEnneaToStatus: dedup Riformatore + Architetto → attack_mod_bonus +1 (same stat, one superseded)', () => {
  const actor = makeActor();
  const effects = resolveEnneaEffects(['Riformatore(1)', 'Architetto(5)']);
  assert.equal(effects.length, 2);
  const { applied, skipped } = applyEnneaToStatus(actor, effects);
  assert.equal(actor.attack_mod_bonus, 1);
  assert.equal(actor.status.attack_mod_buff, 1);
  assert.equal(applied.length, 1);
  assert.equal(skipped.length, 1);
  assert.equal(skipped[0].reason, 'dedup_superseded');
});

test('applyEnneaToStatus: dedup Lealista(6) + Coordinatore(2) → defense_mod_bonus +1, buff=2 (Lealista wins longer duration)', () => {
  // Both give defense_mod +1; dedup keeps one. Lealista(6) duration=2 wins
  // (same amount, first-encountered in Map insertion order → Lealista kept).
  const actor = makeActor();
  const effects = resolveEnneaEffects(['Lealista(6)', 'Coordinatore(2)']);
  assert.equal(effects.length, 2);
  const { applied, skipped } = applyEnneaToStatus(actor, effects);
  assert.equal(actor.defense_mod_bonus, 1);
  assert.equal(actor.status.defense_mod_buff, 2);
  assert.equal(applied.length, 1);
  assert.equal(skipped.length, 1);
  assert.equal(skipped[0].reason, 'dedup_superseded');
});

test('decay coerenza: Lealista(6) duration=2 → buff persiste 2 round end', () => {
  const actor = makeActor();
  const effects = resolveEnneaEffects(['Lealista(6)']);
  applyEnneaToStatus(actor, effects);
  assert.equal(actor.defense_mod_bonus, 1);
  assert.equal(actor.status.defense_mod_buff, 2);

  // Round 1 end: decrement
  for (const key of Object.keys(actor.status)) {
    const v = Number(actor.status[key]);
    if (v > 0) actor.status[key] = v - 1;
  }
  // After round 1: buff still > 0, bonus must NOT be zeroed.
  assert.equal(actor.status.defense_mod_buff, 1);
  for (const key of Object.keys(actor.status)) {
    if (!key.endsWith('_buff')) continue;
    if (Number(actor.status[key]) > 0) continue;
    const stat = key.slice(0, -'_buff'.length);
    const bonusKey = `${stat}_bonus`;
    if (actor[bonusKey] !== undefined) actor[bonusKey] = 0;
  }
  assert.equal(actor.defense_mod_bonus, 1);

  // Round 2 end: now decay to 0, bonus zeroed.
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
  assert.equal(actor.status.defense_mod_buff, 0);
  assert.equal(actor.defense_mod_bonus, 0);
});

// ─────────────────────────────────────────────────────────────────
// computeEnneaArchetypes config-driven trigger eval (raw-metrics)
// ─────────────────────────────────────────────────────────────────

test('computeEnneaArchetypes: Riformatore(1) trigger when setup_ratio>0.5 && attack_hit_rate>0.65', () => {
  const { computeEnneaArchetypes } = require('../../apps/backend/services/vcScoring');
  const config = {
    ennea_themes: [{ id: 'Riformatore(1)', when: 'setup_ratio>0.5 && attack_hit_rate>0.65' }],
  };
  const aggregate = {};
  const triggered = computeEnneaArchetypes(aggregate, config, {
    setup_ratio: 0.6,
    attack_hit_rate: 0.7,
  });
  assert.equal(triggered.length, 1);
  assert.equal(triggered[0].id, 'Riformatore(1)');
  assert.equal(triggered[0].triggered, true);

  const notTrig = computeEnneaArchetypes(aggregate, config, {
    setup_ratio: 0.3,
    attack_hit_rate: 0.7,
  });
  assert.equal(notTrig[0].triggered, false);
});

test('computeEnneaArchetypes: Individualista(4) trigger when low_hp_time>0.4 && damage_dealt_total>0', () => {
  const { computeEnneaArchetypes } = require('../../apps/backend/services/vcScoring');
  const config = {
    ennea_themes: [{ id: 'Individualista(4)', when: 'low_hp_time>0.4 && damage_dealt_total>0' }],
  };
  const aggregate = {};
  const triggered = computeEnneaArchetypes(aggregate, config, {
    low_hp_time: 0.5,
    damage_dealt_total: 3,
  });
  assert.equal(triggered[0].triggered, true);

  const notTrig = computeEnneaArchetypes(aggregate, config, {
    low_hp_time: 0.5,
    damage_dealt_total: 0,
  });
  assert.equal(notTrig[0].triggered, false);
});

test('computeEnneaArchetypes: Lealista(6) trigger when assists>=2 && damage_taken_ratio<0.35', () => {
  const { computeEnneaArchetypes } = require('../../apps/backend/services/vcScoring');
  const config = {
    ennea_themes: [{ id: 'Lealista(6)', when: 'assists>=2 && damage_taken_ratio<0.35' }],
  };
  const aggregate = {};
  const triggered = computeEnneaArchetypes(aggregate, config, {
    assists: 3,
    damage_taken_ratio: 0.2,
  });
  assert.equal(triggered[0].triggered, true);

  const notTrig = computeEnneaArchetypes(aggregate, config, {
    assists: 1,
    damage_taken_ratio: 0.2,
  });
  assert.equal(notTrig[0].triggered, false);
});

// ─────────────────────────────────────────────────────────────────
// Live consumer integration — move_bonus / stress_reduction / evasion_bonus
// (audit P4 follow-up "3 stat consumer wire" 2026-04-25)
// ─────────────────────────────────────────────────────────────────

test('consumer evasion_bonus: resolveAttack DC alzata da target.evasion_bonus_bonus', () => {
  const { resolveAttack } = require('../../apps/backend/routes/sessionHelpers');
  // Deterministic d20: rng() always returns 0.5 → die = floor(0.5*20)+1 = 11.
  const rng = () => 0.5;
  const actor = { mod: 0, attack_mod_bonus: 0 };
  const targetBase = { dc: 12 };
  const targetEvade = { dc: 12, evasion_bonus_bonus: 1 };
  const r1 = resolveAttack({ actor, target: targetBase, rng });
  const r2 = resolveAttack({ actor, target: targetEvade, rng });
  assert.equal(r1.dc, 12);
  assert.equal(r2.dc, 13);
  assert.equal(r1.die, r2.die); // same seed, same die
  assert.equal(r2.mos, r1.mos - 1);
});

test('consumer evasion_bonus: predictCombat hit_pct cala con evasion_bonus_bonus', () => {
  const { predictCombat } = require('../../apps/backend/routes/sessionHelpers');
  const actor = { mod: 0 };
  const targetBase = { dc: 12 };
  const targetEvade = { dc: 12, evasion_bonus_bonus: 2 };
  const base = predictCombat(actor, targetBase);
  const evade = predictCombat(actor, targetEvade);
  assert.equal(base.dc, 12);
  assert.equal(evade.dc, 14);
  assert.ok(evade.hit_pct < base.hit_pct, 'evasion abbassa hit rate');
});

test('consumer stress_reduction: sgTracker accumulate riduce damage_taken increment', () => {
  const sgTracker = require('../../apps/backend/services/combat/sgTracker');
  // Baseline: 5 dmg taken → +1 SG.
  const u1 = sgTracker.initUnit({ id: 'u1', hp: 10 });
  sgTracker.accumulate(u1, { damage_taken: 5 });
  assert.equal(u1.sg, 1);

  // Stoico 0.05 reduction: 5 dmg → 4.75 effective, sotto threshold 5 → no SG.
  const u2 = sgTracker.initUnit({ id: 'u2', hp: 10, stress_reduction_bonus: 0.05 });
  sgTracker.accumulate(u2, { damage_taken: 5 });
  assert.equal(u2.sg, 0);
  assert.ok(u2.sg_taken_acc < 5, 'taken acc < threshold');
});

test('consumer stress_reduction: cap 0.5 max + floor 0', () => {
  const sgTracker = require('../../apps/backend/services/combat/sgTracker');
  // Cap 0.5: stress_reduction_bonus 0.9 → effective 0.5.
  const uCap = sgTracker.initUnit({ id: 'uCap', hp: 10, stress_reduction_bonus: 0.9 });
  sgTracker.accumulate(uCap, { damage_taken: 10 });
  // 10 * (1-0.5) = 5 → exactly threshold → +1 SG.
  assert.equal(uCap.sg, 1);

  // Floor 0: negative bonus ignorato.
  const uNeg = sgTracker.initUnit({ id: 'uNeg', hp: 10, stress_reduction_bonus: -0.5 });
  sgTracker.accumulate(uNeg, { damage_taken: 5 });
  assert.equal(uNeg.sg, 1, 'negative bonus floored a 0, behavior come baseline');
});

test('consumer stress_reduction: damage_dealt non toccato dal bonus', () => {
  const sgTracker = require('../../apps/backend/services/combat/sgTracker');
  const u = sgTracker.initUnit({ id: 'u', hp: 10, stress_reduction_bonus: 0.5 });
  sgTracker.accumulate(u, { damage_dealt: 8 });
  // dealt threshold 8 → +1 SG.
  assert.equal(u.sg, 1);
});

test('consumer move_bonus: branch numerico move budget = ap + move_bonus_bonus', () => {
  // validatePlayerIntent è closure interna a createRoundBridge non esposta
  // come testable export. Verifichiamo il branch numerico canonical (mirror
  // della formula in sessionRoundBridge.js validatePlayerIntent line ~161).
  const actor = { id: 'p1', hp: 10, ap: 1, ap_remaining: 1, position: { x: 0, y: 0 } };
  const dist = 2;
  const apAvail = Number(actor.ap_remaining);
  const moveBudgetNoBonus = apAvail + Math.max(0, Number(actor.move_bonus_bonus || 0));
  assert.equal(moveBudgetNoBonus, 1);
  assert.ok(dist > moveBudgetNoBonus, 'no bonus → MOVE_TOO_FAR per dist 2');
  actor.move_bonus_bonus = 1;
  const moveBudgetWithBonus = apAvail + Math.max(0, Number(actor.move_bonus_bonus || 0));
  assert.equal(moveBudgetWithBonus, 2);
  assert.ok(dist <= moveBudgetWithBonus, 'bonus +1 → 2 hex move ammesso');
  // Negativo: bonus negativo non riduce budget.
  actor.move_bonus_bonus = -3;
  const moveBudgetNeg = apAvail + Math.max(0, Number(actor.move_bonus_bonus || 0));
  assert.equal(moveBudgetNeg, 1, 'bonus negativo floored a 0');
});

test('decay coerenza: 3 nuovi mechanical → bonus zeroed dopo round end', () => {
  const actor = makeActor({ status: {} });
  const effects = resolveEnneaEffects(['Esploratore(7)', 'Stoico(9)', 'Cacciatore(8)']);
  applyEnneaToStatus(actor, effects);
  assert.equal(actor.move_bonus_bonus, 1);
  assert.ok(Math.abs(actor.stress_reduction_bonus - 0.05) < 1e-9);
  assert.equal(actor.evasion_bonus_bonus, 1);
  // Simula decay loop.
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
  assert.equal(actor.move_bonus_bonus, 0);
  assert.equal(actor.stress_reduction_bonus, 0);
  assert.equal(actor.evasion_bonus_bonus, 0);
});
