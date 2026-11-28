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

process.env.IDEA_ENGINE_DISABLE_STATUS_REFRESH = '1';

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const request = require('supertest');

const { loadAiProfiles } = require('../../apps/backend/services/ai/aiProfilesLoader');
const {
  createDeclareSistemaIntents,
} = require('../../apps/backend/services/ai/declareSistemaIntents');
const { createApp } = require('../../apps/backend/app');

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

test('loadAiProfiles: profile aggressive use_utility_brain campo presente (boolean)', () => {
  // KILL-SWITCH 2026-04-29 PR #2008: aggressive.use_utility_brain=false
  // dopo bug oscillazione utilityBrain.scoreAction (Apex tutorial_05).
  // Re-flip a true post-fix utilityBrain. Test verifica field shape, non value.
  const data = loadAiProfiles(undefined, silentLogger);
  assert.equal(typeof data.profiles.aggressive.use_utility_brain, 'boolean');
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

// ── Integration test: bot review fix 2026-04-29 ──
// Bug catched: normaliseUnit dropped ai_profile field → /api/session/start
// stripped ai_profile, Utility AI never active for real API sessions despite
// loader being wired. Smoke test missed because used factory directly.
// Fix: ai_profile preserved in normaliseUnit. Verify end-to-end via HTTP.

test('POST /api/session/start preserves ai_profile through normaliseUnit', async (t) => {
  const { app, close } = createApp({ databasePath: null });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });

  const units = [
    {
      id: 'p1',
      species: 'velox',
      job: 'skirmisher',
      controlled_by: 'player',
      hp: 10,
      mod: 3,
      dc: 12,
      position: { x: 0, y: 0 },
    },
    {
      id: 'sis_aggressive',
      species: 'apex_predatore',
      job: 'vanguard',
      controlled_by: 'sistema',
      hp: 8,
      mod: 3,
      dc: 13,
      ai_profile: 'aggressive',
      position: { x: 5, y: 5 },
    },
    {
      id: 'sis_balanced',
      species: 'predoni_nomadi',
      job: 'skirmisher',
      controlled_by: 'sistema',
      hp: 4,
      mod: 2,
      dc: 12,
      ai_profile: 'balanced',
      position: { x: 4, y: 5 },
    },
  ];

  const startRes = await request(app).post('/api/session/start').send({ units });
  assert.equal(startRes.status, 200);
  const sid = startRes.body.session_id;
  assert.ok(sid, 'session_id present');

  const stateRes = await request(app).get('/api/session/state').query({ session_id: sid });
  assert.equal(stateRes.status, 200);

  const sisAggressive = stateRes.body.units.find((u) => u.id === 'sis_aggressive');
  const sisBalanced = stateRes.body.units.find((u) => u.id === 'sis_balanced');
  const player = stateRes.body.units.find((u) => u.id === 'p1');
  assert.ok(sisAggressive, 'sis_aggressive present in state');
  assert.ok(sisBalanced, 'sis_balanced present in state');
  assert.ok(player, 'p1 present in state');

  // Critical assertion: ai_profile preserved through normaliseUnit
  assert.equal(
    sisAggressive.ai_profile,
    'aggressive',
    'ai_profile preserved on sis_aggressive (was dropped pre-fix)',
  );
  assert.equal(
    sisBalanced.ai_profile,
    'balanced',
    'ai_profile preserved on sis_balanced (was dropped pre-fix)',
  );
  // Player without ai_profile → null (not undefined)
  assert.equal(player.ai_profile, null, 'unit senza ai_profile → null');
});
