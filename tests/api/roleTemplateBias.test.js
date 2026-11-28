// QW3 Role-template biome spawn bias tests (M-013 worldgen).
//
// Tests the additive layer on top of V7 affix bias:
// role_templates from data/core/traits/biome_pools.json drive
// ecological-role weight boost. Backward compatible.

'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const {
  applyBiomeBias,
  matchRoleTemplate,
  roleTemplateBoost,
  extractEntryRoles,
  MAX_BOOST_TOTAL,
  ROLE_BOOST_PRIMARY,
  ROLE_BOOST_SUPPORT,
} = require('../../apps/backend/services/combat/biomeSpawnBias');

const poolLoader = require('../../apps/backend/services/combat/biomePoolLoader');

// Sample fixture mirroring data/core/traits/biome_pools.json schema.
const SAMPLE_TEMPLATES = [
  {
    role: 'apex',
    label: 'Predatore Risonante',
    functional_tags: ['criogenico', 'imboscata'],
    preferred_traits: ['criostasi_adattiva', 'ghiaccio_piezoelettrico'],
    tier: 4,
  },
  {
    role: 'keystone',
    label: 'Scultore di Cristalli',
    functional_tags: ['supporto', 'costruttore'],
    preferred_traits: ['capillari_criogenici', 'antenne_wideband'],
    tier: 3,
  },
  {
    role: 'bridge',
    label: 'Colportore Luminescente',
    functional_tags: ['logistica', 'mobilita'],
    preferred_traits: ['foliage_fotocatodico'],
    tier: 2,
  },
  {
    role: 'threat',
    label: 'Fiera del Whiteout',
    functional_tags: ['assalto', 'area_control'],
    preferred_traits: ['ghiandole_nebbia_ionica', 'criostasi_adattiva'],
    tier: 3,
  },
  {
    role: 'event',
    label: 'Cascata di Schegge',
    functional_tags: ['evento', 'stagionale'],
    preferred_traits: ['gusci_criovetro'],
    tier: 2,
  },
];

test('extractEntryRoles: handles role string', () => {
  assert.deepEqual(extractEntryRoles({ role: 'Apex' }), ['apex']);
});

test('extractEntryRoles: handles role_tags array', () => {
  assert.deepEqual(extractEntryRoles({ role_tags: ['Apex', 'Predator'] }), ['apex', 'predator']);
});

test('extractEntryRoles: handles both fields', () => {
  const out = extractEntryRoles({ role: 'keystone', role_tags: ['support'] });
  assert.deepEqual(out, ['keystone', 'support']);
});

test('extractEntryRoles: empty entry returns []', () => {
  assert.deepEqual(extractEntryRoles({}), []);
  assert.deepEqual(extractEntryRoles(null), []);
});

test('matchRoleTemplate: direct role match wins highest tier', () => {
  const entry = { role_tags: ['apex', 'keystone'] };
  const m = matchRoleTemplate(entry, SAMPLE_TEMPLATES);
  assert.equal(m.matched, true);
  assert.equal(m.role, 'apex');
  assert.equal(m.tier, 4);
  assert.equal(m.primary, true);
  assert.equal(m.via, 'role');
});

test('matchRoleTemplate: preferred_traits overlap', () => {
  const entry = { tags: ['ghiaccio_piezoelettrico'] };
  const m = matchRoleTemplate(entry, SAMPLE_TEMPLATES);
  assert.equal(m.matched, true);
  assert.equal(m.role, 'apex');
  assert.equal(m.via, 'preferred_traits');
});

test('matchRoleTemplate: functional_tags overlap', () => {
  const entry = { functional_tags: ['logistica'] };
  const m = matchRoleTemplate(entry, SAMPLE_TEMPLATES);
  assert.equal(m.matched, true);
  assert.equal(m.role, 'bridge');
  assert.equal(m.via, 'functional_tags');
});

test('matchRoleTemplate: no overlap returns matched=false', () => {
  const entry = { tags: ['unrelated_xyz'] };
  const m = matchRoleTemplate(entry, SAMPLE_TEMPLATES);
  assert.equal(m.matched, false);
});

test('matchRoleTemplate: empty templates returns matched=false', () => {
  assert.equal(matchRoleTemplate({ role: 'apex' }, []).matched, false);
  assert.equal(matchRoleTemplate({ role: 'apex' }, null).matched, false);
});

test('roleTemplateBoost: primary roles → 2.0 boost', () => {
  const r = roleTemplateBoost({ role: 'apex' }, SAMPLE_TEMPLATES);
  assert.equal(r.boost, ROLE_BOOST_PRIMARY);
});

test('roleTemplateBoost: support roles → 1.5 boost', () => {
  const r = roleTemplateBoost({ role: 'bridge' }, SAMPLE_TEMPLATES);
  assert.equal(r.boost, ROLE_BOOST_SUPPORT);
});

test('roleTemplateBoost: no match → 1.0', () => {
  const r = roleTemplateBoost({ tags: ['xyz'] }, SAMPLE_TEMPLATES);
  assert.equal(r.boost, 1.0);
  assert.equal(r.match.matched, false);
});

// ────────────────────────────────────────────────────────────────────────
// applyBiomeBias integration: role_templates additive layer
// ────────────────────────────────────────────────────────────────────────

test('applyBiomeBias: apex role → 2.0 boost (no affixes)', () => {
  const pool = [{ unit_id: 'predator_a', role_tags: ['apex'], weight: 1 }];
  const result = applyBiomeBias(pool, { role_templates: SAMPLE_TEMPLATES });
  assert.equal(result[0].weight, ROLE_BOOST_PRIMARY);
  assert.equal(result[0]._biome_bias.role_template_match.matched, true);
  assert.equal(result[0]._biome_bias.role_template_match.role, 'apex');
});

test('applyBiomeBias: bridge role → 1.5 boost (no affixes)', () => {
  const pool = [{ unit_id: 'courier', role_tags: ['bridge'], weight: 1 }];
  const result = applyBiomeBias(pool, { role_templates: SAMPLE_TEMPLATES });
  assert.equal(result[0].weight, ROLE_BOOST_SUPPORT);
});

test('applyBiomeBias: pool senza role_templates → fallback V7 affix-only', () => {
  // No biome_id, no role_templates inline → only affix layer applies (V7 baseline).
  const pool = [{ unit_id: 'u1', tags: ['fire'], weight: 1 }];
  const biome = { affixes: ['termico'] }; // V7 only
  const result = applyBiomeBias(pool, biome);
  assert.ok(result[0].weight > 1, 'V7 affix boost still works');
  assert.equal(result[0]._biome_bias.affix_matches, 1);
  // No role match expected
  assert.equal(result[0]._biome_bias.role_template_match.matched, false);
});

test('applyBiomeBias: biome senza pool entry → no-op safe', () => {
  // biome_id non esistente → loader returns []
  const pool = [{ unit_id: 'u1', tags: ['fire'], weight: 2 }];
  const biome = { biome_id: 'biome_nonexistente_xyz' };
  poolLoader.resetCache();
  const result = applyBiomeBias(pool, biome);
  // Nessun affix, nessun role template → backward compat, ritorna invariato
  assert.equal(result[0].weight, 2);
});

test('applyBiomeBias: biome_id reale → loader risolve role_templates', () => {
  poolLoader.resetCache();
  const pool = [
    // Apex template "Predatore Risonante" preferred_traits include ghiaccio_piezoelettrico.
    { unit_id: 'criostalker', tags: ['ghiaccio_piezoelettrico'], weight: 1 },
    { unit_id: 'unrelated', tags: ['unrelated_tag'], weight: 1 },
  ];
  const biome = { biome_id: 'cryosteppe_convergence' };
  const result = applyBiomeBias(pool, biome);
  assert.ok(
    result[0].weight > result[1].weight,
    'role_template match boosted vs unrelated baseline',
  );
  assert.equal(result[0]._biome_bias.role_template_match.role, 'apex');
});

test('applyBiomeBias: multi-role match → boost combinato capped a MAX_BOOST_TOTAL', () => {
  // Entry hits BOTH apex (via role_tags) AND has affix matches → combined boost capped.
  const pool = [
    {
      unit_id: 'super',
      role_tags: ['apex'],
      tags: ['fire', 'thermal', 'spore', 'sand'],
      weight: 1,
    },
  ];
  const biome = {
    affixes: ['termico', 'spore_diluite', 'sabbia'], // 3 matches → cap MAX_BOOST=3
    role_templates: SAMPLE_TEMPLATES, // apex → ×2
    npc_archetypes: { primary: [] },
  };
  const result = applyBiomeBias(pool, biome);
  // Without cap: 3 (affix) × 2 (role) = 6 → cap to MAX_BOOST_TOTAL=4
  assert.ok(
    result[0].weight <= MAX_BOOST_TOTAL,
    `weight ${result[0].weight} should be ≤ MAX_BOOST_TOTAL=${MAX_BOOST_TOTAL}`,
  );
  assert.equal(result[0]._biome_bias.boost, MAX_BOOST_TOTAL);
});

test('applyBiomeBias: affix + role overlap → no double-count (boost separato cap)', () => {
  // Entry matches affix (fire) AND role (apex). Multiplicative but capped.
  const pool = [{ unit_id: 'u', role_tags: ['apex'], tags: ['fire'], weight: 1 }];
  const biome = {
    affixes: ['termico'],
    role_templates: SAMPLE_TEMPLATES,
  };
  const result = applyBiomeBias(pool, biome);
  // 1 affix match → 1 + 1.5*1 = 2.5 (capped at MAX_BOOST=3)
  // role apex → ×2
  // Combined: 2.5 * 2 = 5.0 → cap MAX_BOOST_TOTAL=4
  assert.ok(result[0].weight <= MAX_BOOST_TOTAL);
  assert.equal(result[0]._biome_bias.role_template_match.matched, true);
  assert.ok(result[0]._biome_bias.affix_matches >= 1);
});

test('applyBiomeBias: cap totale rispettato sempre', () => {
  // Worst case: archetype primary (×3) + affix all match (×3) + role apex (×2) = 18
  const pool = [
    {
      unit_id: 'mega',
      archetype: 'apex_pred',
      role_tags: ['apex'],
      tags: ['fire', 'thermal', 'spore'],
      weight: 1,
    },
  ];
  const biome = {
    affixes: ['termico', 'spore_diluite'],
    role_templates: SAMPLE_TEMPLATES,
    npc_archetypes: { primary: ['apex_pred'] },
  };
  const result = applyBiomeBias(pool, biome);
  assert.ok(result[0].weight <= MAX_BOOST_TOTAL, `weight ${result[0].weight} ≤ ${MAX_BOOST_TOTAL}`);
});

test('applyBiomeBias: backward compat — biome con solo affixes (V7 path)', () => {
  // Esattamente come V7: nessun role_template/biome_id. Test V7 baseline non rotto.
  const pool = [{ unit_id: 'u1', tags: ['fire'], weight: 1 }];
  const biome = { affixes: ['termico'] };
  const result = applyBiomeBias(pool, biome);
  assert.ok(result[0].weight > 1);
  assert.equal(result[0]._biome_bias.role_template_match.matched, false);
});

// ────────────────────────────────────────────────────────────────────────
// Performance: loader memoization (no JSON re-parse per spawn)
// ────────────────────────────────────────────────────────────────────────

test('biomePoolLoader: memoization — load JSON una volta sola', () => {
  poolLoader.resetCache();
  const fs = require('node:fs');
  const originalRead = fs.readFileSync;
  let readCount = 0;
  fs.readFileSync = function patched(...args) {
    if (typeof args[0] === 'string' && args[0].includes('biome_pools.json')) {
      readCount += 1;
    }
    return originalRead.apply(this, args);
  };
  try {
    poolLoader.loadAllPools();
    poolLoader.loadAllPools();
    poolLoader.getPoolById('cryosteppe_convergence');
    poolLoader.getRoleTemplates('cryosteppe_convergence');
    assert.equal(readCount, 1, 'readFileSync invoked exactly once across 4 calls');
  } finally {
    fs.readFileSync = originalRead;
    poolLoader.resetCache();
  }
});

test('biomePoolLoader: getPoolById ritorna null per id sconosciuto', () => {
  poolLoader.resetCache();
  assert.equal(poolLoader.getPoolById('biome_inesistente_xyz'), null);
  assert.equal(poolLoader.getPoolById(''), null);
  assert.equal(poolLoader.getPoolById(null), null);
});

test('biomePoolLoader: getRoleTemplates ritorna [] safe per id mancante', () => {
  poolLoader.resetCache();
  const t = poolLoader.getRoleTemplates('biome_inesistente_xyz');
  assert.deepEqual(t, []);
});

test('biomePoolLoader: pools shipping hanno role_templates', () => {
  poolLoader.resetCache();
  const pools = poolLoader.loadAllPools();
  assert.ok(pools.length >= 8, 'expected ≥8 pools shipping');
  for (const pool of pools) {
    assert.ok(
      Array.isArray(pool.role_templates) && pool.role_templates.length > 0,
      `pool ${pool.id} missing role_templates`,
    );
  }
});

test('biomePoolLoader: path failure → cache vuota, no throw', () => {
  poolLoader.resetCache();
  const pools = poolLoader.loadAllPools({ poolsPath: '/nonexistent/path/xyz.json' });
  assert.deepEqual(pools, []);
  poolLoader.resetCache();
});
