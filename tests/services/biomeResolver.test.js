// CAP-11 — Test biomeResolver (audit Impronta CAP-10).
// Coverage: 16/16 combo lookup + modulation rules + edge cases.

'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  resolveBiome,
  lookupKey,
  lookupDistribution,
  resetCache,
  VALID_LOCOMOTION,
  VALID_OFFENSE,
  VALID_DEFENSE,
  VALID_SENSES,
} = require('../../apps/backend/services/imprint/biomeResolver');

test.beforeEach(() => resetCache());

test('lookupKey: produce chiave 4-char dalle scelte', () => {
  assert.equal(
    lookupKey({ locomotion: 'VELOCE', offense: 'PROFONDA', defense: 'DURA', senses: 'LONTANO' }),
    'V_P_D_L',
  );
  assert.equal(
    lookupKey({
      locomotion: 'SILENZIOSA',
      offense: 'RAPIDA',
      defense: 'FLESSIBILE',
      senses: 'ACUTO',
    }),
    'S_R_F_A',
  );
});

test('lookupKey: rifiuta valori invalidi', () => {
  assert.throws(
    () => lookupKey({ locomotion: 'BOH', offense: 'P', defense: 'D', senses: 'L' }),
    /invalid locomotion/,
  );
  assert.throws(
    () => lookupKey({ locomotion: 'VELOCE', offense: 'NULL', defense: 'D', senses: 'L' }),
    /invalid offense/,
  );
});

test('VALID_* sets esposti per validation upstream', () => {
  assert.ok(VALID_LOCOMOTION.has('VELOCE'));
  assert.ok(VALID_LOCOMOTION.has('SILENZIOSA'));
  assert.ok(VALID_OFFENSE.has('PROFONDA'));
  assert.ok(VALID_OFFENSE.has('RAPIDA'));
  assert.ok(VALID_DEFENSE.has('DURA'));
  assert.ok(VALID_DEFENSE.has('FLESSIBILE'));
  assert.ok(VALID_SENSES.has('LONTANO'));
  assert.ok(VALID_SENSES.has('ACUTO'));
});

test('resolveBiome: 16/16 combo coperti dal lookup base', () => {
  const locos = ['VELOCE', 'SILENZIOSA'];
  const offs = ['PROFONDA', 'RAPIDA'];
  const defs = ['DURA', 'FLESSIBILE'];
  const senses = ['LONTANO', 'ACUTO'];

  let count = 0;
  let fallbacks = 0;
  for (const l of locos) {
    for (const o of offs) {
      for (const d of defs) {
        for (const s of senses) {
          const r = resolveBiome({ locomotion: l, offense: o, defense: d, senses: s });
          assert.ok(r.biome_id, `combo ${l}/${o}/${d}/${s} → biome_id mancante`);
          assert.ok(r.base_biome_id, `combo ${l}/${o}/${d}/${s} → base_biome_id mancante`);
          if (r._fallback) fallbacks += 1;
          count += 1;
        }
      }
    }
  }

  assert.equal(count, 16, '16 combo totali');
  assert.equal(fallbacks, 0, '0 combo dovrebbero usare fallback (lookup completo)');
});

test('resolveBiome: distribuzione canalizzazione <20%', () => {
  const dist = lookupDistribution();
  const total = Object.values(dist).reduce((a, b) => a + b, 0);
  assert.equal(total, 16, '16 combo totali nella distribuzione');

  const max = Math.max(...Object.values(dist));
  const maxPercent = (max / total) * 100;
  assert.ok(
    maxPercent < 20,
    `canalizzazione ${maxPercent.toFixed(1)}% ≥ 20% (audit F-1 target). Distribution: ${JSON.stringify(dist)}`,
  );

  const numBiomes = Object.keys(dist).length;
  assert.ok(numBiomes >= 5 && numBiomes <= 8, `numero biomi ${numBiomes} fuori range [5,8]`);
});

test('resolveBiome: lookup specifico — V_P_D_L base_biome → savana', () => {
  // Test base_biome_id (invariante a modulation). biome_id può variare con team.
  const r = resolveBiome({
    locomotion: 'VELOCE',
    offense: 'PROFONDA',
    defense: 'DURA',
    senses: 'LONTANO',
  });
  assert.equal(r.base_biome_id, 'savana');
});

test('resolveBiome: lookup specifico — S_P_F_A base_biome → caverna_risonante', () => {
  const r = resolveBiome({
    locomotion: 'SILENZIOSA',
    offense: 'PROFONDA',
    defense: 'FLESSIBILE',
    senses: 'ACUTO',
  });
  assert.equal(r.base_biome_id, 'caverna_risonante');
});

test('resolveBiome: modulation cryo_dominance attivo se 3+ player DURA', () => {
  const choices = { locomotion: 'VELOCE', offense: 'PROFONDA', defense: 'DURA', senses: 'LONTANO' };
  const team = [
    choices,
    choices,
    choices, // 3 DURA
    { locomotion: 'VELOCE', offense: 'PROFONDA', defense: 'FLESSIBILE', senses: 'LONTANO' }, // 1 FLESSIBILE
  ];
  const r = resolveBiome(choices, { team_composition: team });
  assert.equal(r.base_biome_id, 'savana');
  assert.equal(r.biome_id, 'savana_arida_dura', 'modulation hardened applicata');
  assert.ok(r.applied_modulations.includes('cryo_dominance'));
});

test('resolveBiome: cryo_dominance NON attivo se solo 2 player DURA, ma long_range_focus si', () => {
  const choicesDura = {
    locomotion: 'VELOCE',
    offense: 'PROFONDA',
    defense: 'DURA',
    senses: 'LONTANO',
  };
  const choicesFlex = {
    locomotion: 'VELOCE',
    offense: 'PROFONDA',
    defense: 'FLESSIBILE',
    senses: 'LONTANO',
  };
  const team = [choicesDura, choicesDura, choicesFlex, choicesFlex]; // 2 DURA, 4 LONTANO, 4 PROFONDA
  const r = resolveBiome(choicesDura, { team_composition: team });
  // base savana → cryo no, long_range si (4 LONTANO ≥ 3) → savana_aperta_orizzonte
  assert.equal(r.base_biome_id, 'savana');
  assert.equal(r.biome_id, 'savana_aperta_orizzonte');
  assert.ok(!r.applied_modulations.includes('cryo_dominance'));
  assert.ok(r.applied_modulations.includes('long_range_focus'));
});

test('resolveBiome: variant applicato solo se mappato nel biome_variants', () => {
  // base palude → cryo_dominance ha variant palude_indurita; silent_majority/long_range no → skip silenziosamente
  const choicesA = {
    locomotion: 'SILENZIOSA',
    offense: 'PROFONDA',
    defense: 'DURA',
    senses: 'LONTANO',
  };
  const choicesB = {
    locomotion: 'VELOCE',
    offense: 'PROFONDA',
    defense: 'DURA',
    senses: 'LONTANO',
  };
  const team = [choicesA, choicesA, choicesA, choicesB]; // 3 SILENZIOSA, 4 DURA, 4 LONTANO, 4 PROFONDA

  const r = resolveBiome(choicesA, { team_composition: team });
  // S_P_D_L → palude_tossica base. Solo cryo_dominance ha variant per palude → palude_indurita.
  // Altri modulation match (silent_majority, long_range_focus, deep_strike) MA non hanno variant per palude → skip.
  assert.equal(r.base_biome_id, 'palude_tossica');
  assert.equal(r.biome_id, 'palude_indurita');
  assert.ok(r.applied_modulations.includes('cryo_dominance'));
  assert.ok(
    !r.applied_modulations.includes('silent_majority'),
    'silent_majority skipped: no variant per palude',
  );
});

test('resolveBiome: senza team_composition usa fallback 4 stesse scelte', () => {
  const choices = { locomotion: 'VELOCE', offense: 'PROFONDA', defense: 'DURA', senses: 'LONTANO' };
  const r = resolveBiome(choices);
  // 4 stesse scelte → tutte DURA → cryo_dominance attivo
  assert.equal(r.biome_id, 'savana_arida_dura');
});

test('resolveBiome: throw su scelta invalida', () => {
  assert.throws(
    () =>
      resolveBiome({ locomotion: 'BOH', offense: 'PROFONDA', defense: 'DURA', senses: 'LONTANO' }),
    /invalid/,
  );
});

test('resolveBiome: case-insensitive su valori scelte', () => {
  const r = resolveBiome({
    locomotion: 'veloce',
    offense: 'profonda',
    defense: 'dura',
    senses: 'lontano',
  });
  assert.equal(r.biome_id, 'savana_arida_dura'); // 4 same DURA → cryo_dominance
});
