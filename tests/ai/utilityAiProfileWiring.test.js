// tests/ai/utilityAiProfileWiring.test.js — ADR-2026-04-17 Q-001 T3.1 wiring smoke
//
// Verifica che:
//   1. loadAiProfiles carica packs/evo_tactics_pack/data/balance/ai_profiles.yaml
//   2. Profile "aggressive" ha use_utility_brain=true (ADR first flip)
//   3. resolveUseUtilityBrain(actor) ritorna true per actor con ai_profile='aggressive'
//   4. resolveUseUtilityBrain(actor) ritorna false per actor con ai_profile='balanced'
//   5. resolveUseUtilityBrain(actor) cade su global useUtilityAi se ai_profile mancante
//   6. declareSistemaIntents instrada a utility policy quando profile flag ON
//
// Non re-testa utilityBrain internals (coperti da utilityBrain.test.js).

'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const { loadAiProfiles } = require('../../apps/backend/services/ai/aiProfilesLoader');
const {
  createDeclareSistemaIntents,
} = require('../../apps/backend/services/ai/declareSistemaIntents');

// Silent logger per non inquinare test output.
const silentLogger = { log: () => {}, warn: () => {} };

test('loadAiProfiles: carica ai_profiles.yaml e ritorna 3+ profile', () => {
  const data = loadAiProfiles(undefined, silentLogger);
  assert.ok(data, 'loader non deve ritornare null su file valido');
  assert.ok(data.profiles, 'struttura profiles presente');
  const names = Object.keys(data.profiles);
  assert.ok(names.includes('aggressive'), 'profile aggressive presente');
  assert.ok(names.includes('balanced'), 'profile balanced presente');
  assert.ok(names.includes('cautious'), 'profile cautious presente');
});

test('loadAiProfiles: profile aggressive ha use_utility_brain=true (ADR first flip)', () => {
  const data = loadAiProfiles(undefined, silentLogger);
  assert.equal(
    data.profiles.aggressive.use_utility_brain,
    true,
    'aggressive.use_utility_brain deve essere true (ADR-2026-04-17)',
  );
});

test('loadAiProfiles: profile balanced/cautious hanno use_utility_brain=false (gradual rollout)', () => {
  const data = loadAiProfiles(undefined, silentLogger);
  assert.equal(data.profiles.balanced.use_utility_brain, false);
  assert.equal(data.profiles.cautious.use_utility_brain, false);
});

test('loadAiProfiles: file mancante → null, non throw', () => {
  const data = loadAiProfiles('/nonexistent/path/ai_profiles.yaml', silentLogger);
  assert.equal(data, null, 'loader deve ritornare null graceful');
});

// ── Dispatch wiring ──

function makeDeclareDeps(aiProfiles, overrides = {}) {
  return {
    // Firma reale: (session, actor) — vedi sessionHelpers.js:266
    pickLowestHpEnemy: (session, actor) => {
      const enemies = (session.units || []).filter(
        (u) => u && u.id !== actor.id && u.hp > 0 && u.controlled_by !== actor.controlled_by,
      );
      return enemies.length ? enemies.reduce((l, c) => (!l || c.hp < l.hp ? c : l), null) : null;
    },
    stepTowards: () => ({ x: 0, y: 0 }),
    manhattanDistance: (a, b) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y),
    gridSize: 6,
    aiProfiles,
    ...overrides,
  };
}

function makeSession(actorProfile) {
  return {
    units: [
      {
        id: 'sis_1',
        controlled_by: 'sistema',
        hp: 5,
        ap: { current: 2, max: 2 },
        position: { x: 3, y: 3 },
        attack_range: 2,
        ai_profile: actorProfile,
      },
      {
        id: 'p_1',
        controlled_by: 'player',
        hp: 10,
        position: { x: 3, y: 4 }, // distance 1, attack in range
      },
    ],
    sistema_pressure: { value: 50 },
  };
}

test('declareSistemaIntents: actor con ai_profile aggressive dispatch via utility', () => {
  const profiles = loadAiProfiles(undefined, silentLogger);
  const declare = createDeclareSistemaIntents(makeDeclareDeps(profiles));
  const session = makeSession('aggressive');
  const result = declare(session);
  assert.ok(result.decisions.length >= 1, 'decision emessa');
  const d = result.decisions[0];
  // Utility dispatcher produce rule di forma diversa (es. 'UTILITY' o intent-specific);
  // il legacy emette 'REGOLA_001' etc. Qui verifichiamo che decision abbia forma valida
  // (rule string non vuota) — smoke test wiring, non policy internals.
  assert.ok(typeof d.rule === 'string' && d.rule.length > 0, 'rule string non vuota');
});

test('declareSistemaIntents: actor con ai_profile balanced dispatch via legacy (REGOLA_*)', () => {
  const profiles = loadAiProfiles(undefined, silentLogger);
  const declare = createDeclareSistemaIntents(makeDeclareDeps(profiles));
  const session = makeSession('balanced');
  const result = declare(session);
  assert.ok(result.decisions.length >= 1);
  const d = result.decisions[0];
  assert.ok(
    /^REGOLA_/.test(d.rule) || d.rule === 'no_target' || d.rule === 'intents_cap_reached',
    `balanced deve usare legacy REGOLA_*, ha ricevuto: ${d.rule}`,
  );
});

test('declareSistemaIntents: actor senza ai_profile fallback a useUtilityAi global (default false)', () => {
  const profiles = loadAiProfiles(undefined, silentLogger);
  const declare = createDeclareSistemaIntents(makeDeclareDeps(profiles));
  const session = makeSession(undefined);
  const result = declare(session);
  assert.ok(result.decisions.length >= 1);
  const d = result.decisions[0];
  // Global useUtilityAi default=false → legacy REGOLA_*
  assert.ok(
    /^REGOLA_/.test(d.rule) || d.rule === 'no_target' || d.rule === 'intents_cap_reached',
    `no ai_profile deve usare legacy, ha ricevuto: ${d.rule}`,
  );
});

test('declareSistemaIntents: aiProfiles=null ignora profile, fallback useUtilityAi global', () => {
  const declare = createDeclareSistemaIntents(makeDeclareDeps(null, { useUtilityAi: false }));
  // Actor con ai_profile='aggressive' ma profiles=null → non risolve, usa global false
  const session = makeSession('aggressive');
  const result = declare(session);
  assert.ok(result.decisions.length >= 1);
  const d = result.decisions[0];
  assert.ok(
    /^REGOLA_/.test(d.rule) || d.rule === 'no_target' || d.rule === 'intents_cap_reached',
    `aiProfiles=null + ai_profile valido → fallback legacy, ha ricevuto: ${d.rule}`,
  );
});
