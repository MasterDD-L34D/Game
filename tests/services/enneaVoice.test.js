'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const enneaVoice = require('../../apps/backend/services/narrative/enneaVoice');

// Deterministic RNG for reproducibility.
function seededRand(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

test('enneaVoice — loads catalog with all 9 ennea archetype palettes', () => {
  enneaVoice._resetVoiceCache();
  const archetypes = enneaVoice.listSupportedArchetypes();
  for (const expected of [
    'Riformatore(1)',
    'Coordinatore(2)',
    'Conquistatore(3)',
    'Individualista(4)',
    'Architetto(5)',
    'Lealista(6)',
    'Esploratore(7)',
    'Cacciatore(8)',
    'Stoico(9)',
  ]) {
    assert.ok(archetypes.includes(expected), `${expected} loaded`);
  }
  assert.equal(archetypes.length, 9, 'exactly 9 ennea archetypes supported');
});

test('enneaVoice — listSupportedBeats returns canonical beat ids', () => {
  enneaVoice._resetVoiceCache();
  const beats = enneaVoice.listSupportedBeats();
  for (const expected of [
    'combat_attack_committed',
    'combat_defense_braced',
    'exploration_new_tile',
    'low_hp_warning',
    'victory_solo',
    'defeat_critical',
    'idle_round_start',
  ]) {
    assert.ok(beats.includes(expected), `beat ${expected} present`);
  }
});

test('getCandidateArchetypes — filtra solo triggered + supportati', () => {
  const ennea = [
    { id: 'Architetto(5)', triggered: true },
    { id: 'Esploratore(7)', triggered: false },
    { id: 'Conquistatore(3)', triggered: true }, // ora supportato (9/9 coverage)
    { id: 'Cacciatore(8)', triggered: true },
    { id: 'BogusArchetype(99)', triggered: true }, // non in FILE_BY_ARCHETYPE
  ];
  const candidates = enneaVoice.getCandidateArchetypes(ennea);
  assert.deepEqual(candidates, ['Architetto(5)', 'Conquistatore(3)', 'Cacciatore(8)']);
});

test('getCandidateArchetypes — null/undefined input safe', () => {
  assert.deepEqual(enneaVoice.getCandidateArchetypes(null), []);
  assert.deepEqual(enneaVoice.getCandidateArchetypes(undefined), []);
  assert.deepEqual(enneaVoice.getCandidateArchetypes([]), []);
});

test('selectEnneaVoice — returns null when no triggered candidate', () => {
  const out = enneaVoice.selectEnneaVoice(
    [{ id: 'Architetto(5)', triggered: false }],
    'combat_attack_committed',
  );
  assert.equal(out, null);
});

test('selectEnneaVoice — returns null when beat_id unknown', () => {
  const out = enneaVoice.selectEnneaVoice(
    [{ id: 'Architetto(5)', triggered: true }],
    'beat_inesistente',
  );
  assert.equal(out, null);
});

test('selectEnneaVoice — picks Type 5 line for Architetto triggered', () => {
  const out = enneaVoice.selectEnneaVoice(
    [{ id: 'Architetto(5)', triggered: true }],
    'combat_attack_committed',
    { rand: seededRand(42) },
  );
  assert.ok(out, 'selection non null');
  assert.equal(out.archetype_id, 'Architetto(5)');
  assert.equal(out.ennea_type, 5);
  assert.equal(out.beat_id, 'combat_attack_committed');
  assert.match(out.line_id, /^v5_atk_/);
  assert.ok(out.text && out.text.length > 0, 'text non vuoto');
});

test('selectEnneaVoice — picks Type 7 line for Esploratore triggered', () => {
  const out = enneaVoice.selectEnneaVoice(
    [{ id: 'Esploratore(7)', triggered: true }],
    'exploration_new_tile',
    { rand: seededRand(99) },
  );
  assert.ok(out);
  assert.equal(out.archetype_id, 'Esploratore(7)');
  assert.equal(out.ennea_type, 7);
  assert.match(out.line_id, /^v7_exp_/);
});

test('selectEnneaVoice — priority opt forces preferred archetype first', () => {
  const ennea = [
    { id: 'Architetto(5)', triggered: true },
    { id: 'Esploratore(7)', triggered: true },
  ];
  const out = enneaVoice.selectEnneaVoice(ennea, 'combat_attack_committed', {
    rand: seededRand(1),
    priority: ['Esploratore(7)'],
  });
  assert.equal(out.archetype_id, 'Esploratore(7)');
});

test('selectEnneaVoice — deterministico con stesso seed', () => {
  const ennea = [{ id: 'Architetto(5)', triggered: true }];
  const a = enneaVoice.selectEnneaVoice(ennea, 'idle_round_start', { rand: seededRand(7) });
  const b = enneaVoice.selectEnneaVoice(ennea, 'idle_round_start', { rand: seededRand(7) });
  assert.equal(a.line_id, b.line_id);
  assert.equal(a.text, b.text);
});

test('buildVoiceTelemetryEvent — payload completo con turn', () => {
  const selection = {
    archetype_id: 'Architetto(5)',
    ennea_type: 5,
    beat_id: 'victory_solo',
    line_id: 'v5_vct_confirmed',
    text: 'Ipotesi confermata.',
  };
  const evt = enneaVoice.buildVoiceTelemetryEvent('unit_1', selection, { turn: 4 });
  assert.equal(evt.event_type, 'ennea_voice_type_used');
  assert.equal(evt.actor_id, 'unit_1');
  assert.equal(evt.archetype_id, 'Architetto(5)');
  assert.equal(evt.ennea_type, 5);
  assert.equal(evt.beat_id, 'victory_solo');
  assert.equal(evt.line_id, 'v5_vct_confirmed');
  assert.equal(evt.turn, 4);
  assert.ok(evt.timestamp, 'timestamp presente');
});

test('buildVoiceTelemetryEvent — null selection returns null', () => {
  assert.equal(enneaVoice.buildVoiceTelemetryEvent('unit_1', null), null);
});

test('selectEnneaVoice — Architetto triggered ma beat assente nel palette = null', () => {
  // Caso difensivo: se il YAML non ha quel beat, fallback nullo non crash.
  const ennea = [{ id: 'Architetto(5)', triggered: true }];
  const out = enneaVoice.selectEnneaVoice(ennea, 'beat_che_non_esiste_nel_yaml', {
    rand: seededRand(1),
  });
  assert.equal(out, null);
});

test('listSupportedBeats — 7 canonical beats per palette', () => {
  enneaVoice._resetVoiceCache();
  const beats = enneaVoice.listSupportedBeats();
  assert.equal(beats.length, 7, 'exactly 7 beat types defined');
});

test('selectEnneaVoice — picks Type 1 line for Riformatore triggered', () => {
  const out = enneaVoice.selectEnneaVoice(
    [{ id: 'Riformatore(1)', triggered: true }],
    'combat_attack_committed',
    { rand: seededRand(11) },
  );
  assert.ok(out);
  assert.equal(out.archetype_id, 'Riformatore(1)');
  assert.equal(out.ennea_type, 1);
  assert.match(out.line_id, /^v1_atk_/);
});

test('selectEnneaVoice — picks Type 8 line for Cacciatore triggered', () => {
  const out = enneaVoice.selectEnneaVoice(
    [{ id: 'Cacciatore(8)', triggered: true }],
    'victory_solo',
    { rand: seededRand(33) },
  );
  assert.ok(out);
  assert.equal(out.archetype_id, 'Cacciatore(8)');
  assert.equal(out.ennea_type, 8);
  assert.match(out.line_id, /^v8_vct_/);
});

test('selectEnneaVoice — 9/9 archetype roundtrip — every archetype trigger returns line', () => {
  enneaVoice._resetVoiceCache();
  const archetypes = enneaVoice.listSupportedArchetypes();
  assert.equal(archetypes.length, 9);
  for (const archetypeId of archetypes) {
    const out = enneaVoice.selectEnneaVoice(
      [{ id: archetypeId, triggered: true }],
      'idle_round_start',
      { rand: seededRand(7) },
    );
    assert.ok(out, `archetype ${archetypeId} returns selection`);
    assert.equal(out.archetype_id, archetypeId);
    assert.ok(out.text && out.text.length > 0, `${archetypeId} text non vuoto`);
  }
});

test('selectEnneaVoice — every beat returns line for every archetype', () => {
  enneaVoice._resetVoiceCache();
  const archetypes = enneaVoice.listSupportedArchetypes();
  const beats = enneaVoice.listSupportedBeats();
  for (const archetypeId of archetypes) {
    for (const beatId of beats) {
      const out = enneaVoice.selectEnneaVoice([{ id: archetypeId, triggered: true }], beatId, {
        rand: seededRand(101),
      });
      assert.ok(out, `${archetypeId} × ${beatId} returns selection`);
      assert.equal(out.archetype_id, archetypeId);
      assert.equal(out.beat_id, beatId);
    }
  }
});
