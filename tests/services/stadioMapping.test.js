// Stadio Phase A (2026-04-27) — 10 stadi I-X mapping a 5 macro-fasi (2:1 sub-divisione).
//
// Test pure logic per il mapping bidirezionale phase ↔ stadio + naming label
// canonical IT/EN. Carica dune_stalker_lifecycle.yaml come fixture fonte di
// verità e valida invarianti dello schema additive.
//
// Spec: docs/planning/2026-04-27-forme-10-stadi-naming-spec.md
// Style guide: docs/core/00E-NAMING_STYLEGUIDE.md §Stadio
//
// User correction 2026-04-27: Stadio I-X (10), NON I-IX.

'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

let yaml;
try {
  yaml = require('js-yaml');
} catch {
  yaml = null;
}

const LIFECYCLE_PATH = path.resolve(
  __dirname,
  '..',
  '..',
  'data',
  'core',
  'species',
  'dune_stalker_lifecycle.yaml',
);

function loadLifecycle() {
  if (!yaml) {
    return null;
  }
  const raw = fs.readFileSync(LIFECYCLE_PATH, 'utf8');
  return yaml.load(raw);
}

// Mapping canonical 2:1 da spec (Phase A).
// stadio integer → macro_phase string.
const STADIO_TO_PHASE = {
  1: 'hatchling',
  2: 'hatchling',
  3: 'juvenile',
  4: 'juvenile',
  5: 'mature',
  6: 'mature',
  7: 'apex',
  8: 'apex',
  9: 'legacy',
  10: 'legacy',
};

const ROMAN_BY_STADIO = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];

function stadioToPhase(stadio) {
  if (!Number.isInteger(stadio) || stadio < 1 || stadio > 10) return null;
  return STADIO_TO_PHASE[stadio];
}

function phaseToStadi(phase) {
  return Object.entries(STADIO_TO_PHASE)
    .filter(([_, p]) => p === phase)
    .map(([s]) => Number(s));
}

test('stadio mapping: 10 stadi totali coprono 5 macro-fasi (2:1)', () => {
  if (!yaml) return; // js-yaml not installed → skip silently
  const data = loadLifecycle();
  assert.ok(data, 'lifecycle YAML caricato');
  const phases = data.phases;
  const totalStadi = Object.values(phases).reduce(
    (acc, p) => acc + (Array.isArray(p.stadi) ? p.stadi.length : 0),
    0,
  );
  assert.equal(totalStadi, 10, 'YAML deve esporre esattamente 10 stadi totali');
  // Ogni macro-fase ha 2 stadi.
  for (const [name, phase] of Object.entries(phases)) {
    assert.ok(Array.isArray(phase.stadi), `phase ${name} deve avere stadi[]`);
    assert.equal(phase.stadi.length, 2, `phase ${name} deve avere 2 stadi (2:1 mapping)`);
  }
});

test('stadio mapping: ogni macro-phase mappa ai 2 stadi corretti', () => {
  assert.deepEqual(phaseToStadi('hatchling'), [1, 2]);
  assert.deepEqual(phaseToStadi('juvenile'), [3, 4]);
  assert.deepEqual(phaseToStadi('mature'), [5, 6]);
  assert.deepEqual(phaseToStadi('apex'), [7, 8]);
  assert.deepEqual(phaseToStadi('legacy'), [9, 10]);
});

test('stadio reverse mapping: ogni stadio → phase corretta', () => {
  // Boundary check: I-X tutti coperti.
  assert.equal(stadioToPhase(1), 'hatchling');
  assert.equal(stadioToPhase(2), 'hatchling');
  assert.equal(stadioToPhase(3), 'juvenile');
  assert.equal(stadioToPhase(6), 'mature');
  assert.equal(stadioToPhase(8), 'apex');
  assert.equal(stadioToPhase(10), 'legacy');
});

test('stadio out-of-range edge cases', () => {
  assert.equal(stadioToPhase(0), null);
  assert.equal(stadioToPhase(11), null);
  assert.equal(stadioToPhase(-1), null);
  assert.equal(stadioToPhase(null), null);
  assert.equal(stadioToPhase(undefined), null);
  assert.equal(stadioToPhase(2.5), null, 'fractional stadio rejected');
  assert.equal(stadioToPhase('5'), null, 'string stadio rejected (deve essere int)');
});

test('YAML stadi: ogni entry ha stadio + stadio_roman + tier label canonical IT/EN', () => {
  if (!yaml) return;
  const data = loadLifecycle();
  const phases = data.phases;
  for (const [phaseName, phase] of Object.entries(phases)) {
    for (const stadio of phase.stadi) {
      assert.ok(
        Number.isInteger(stadio.stadio) && stadio.stadio >= 1 && stadio.stadio <= 10,
        `phase ${phaseName}: stadio integer 1-10 required`,
      );
      assert.equal(
        stadio.stadio_roman,
        ROMAN_BY_STADIO[stadio.stadio - 1],
        `phase ${phaseName}: roman ${stadio.stadio_roman} must match integer ${stadio.stadio}`,
      );
      assert.ok(
        stadio.stadio_label_it && typeof stadio.stadio_label_it === 'string',
        `phase ${phaseName}: stadio_label_it required`,
      );
      assert.ok(
        stadio.stadio_label_en && typeof stadio.stadio_label_en === 'string',
        `phase ${phaseName}: stadio_label_en required`,
      );
    }
  }
});

test('YAML stadi: dune_stalker species-specific label coexists con tier generic', () => {
  if (!yaml) return;
  const data = loadLifecycle();
  const phases = data.phases;
  for (const [phaseName, phase] of Object.entries(phases)) {
    for (const stadio of phase.stadi) {
      assert.ok(
        stadio.dune_stalker_specific_label_it,
        `phase ${phaseName} stadio ${stadio.stadio_roman}: dune_stalker_specific_label_it required`,
      );
      assert.ok(
        stadio.dune_stalker_specific_label_en,
        `phase ${phaseName} stadio ${stadio.stadio_roman}: dune_stalker_specific_label_en required`,
      );
    }
  }
});

test('YAML stadi: tier label IT canonical (10 distinti)', () => {
  if (!yaml) return;
  const data = loadLifecycle();
  const phases = data.phases;
  const labels = [];
  for (const phase of Object.values(phases)) {
    for (const stadio of phase.stadi) {
      labels.push(stadio.stadio_label_it);
    }
  }
  assert.equal(labels.length, 10, '10 tier label IT totali');
  assert.equal(new Set(labels).size, 10, 'ogni tier label IT è univoca');
});

test('YAML stadi: tier label EN canonical (10 distinti)', () => {
  if (!yaml) return;
  const data = loadLifecycle();
  const phases = data.phases;
  const labels = [];
  for (const phase of Object.values(phases)) {
    for (const stadio of phase.stadi) {
      labels.push(stadio.stadio_label_en);
    }
  }
  assert.equal(labels.length, 10, '10 tier label EN totali');
  assert.equal(new Set(labels).size, 10, 'ogni tier label EN è univoca');
});

test('skiv_saga_anchor: current_stadio coerente con current_phase', () => {
  if (!yaml) return;
  const data = loadLifecycle();
  const anchor = data.skiv_saga_anchor;
  assert.ok(anchor, 'skiv_saga_anchor present');
  assert.ok(Number.isInteger(anchor.current_stadio), 'current_stadio integer required');
  assert.ok(anchor.current_stadio >= 1 && anchor.current_stadio <= 10, 'current_stadio in 1..10');
  // Mapping check: current_stadio deve essere coerente con current_phase.
  assert.equal(
    stadioToPhase(anchor.current_stadio),
    anchor.current_phase,
    `current_stadio ${anchor.current_stadio} → ${stadioToPhase(anchor.current_stadio)} but phase=${anchor.current_phase}`,
  );
});

test('Backward-compat: phase 5-fasi schema preserved alongside stadi 10', () => {
  if (!yaml) return;
  const data = loadLifecycle();
  const phases = data.phases;
  // 5-fasi legacy schema preserved (id + label_it + level_range).
  const expectedPhases = ['hatchling', 'juvenile', 'mature', 'apex', 'legacy'];
  for (const ph of expectedPhases) {
    assert.ok(phases[ph], `5-fasi legacy ${ph} preserved`);
    assert.ok(phases[ph].label_it, `${ph}.label_it preserved`);
    assert.ok(Array.isArray(phases[ph].level_range), `${ph}.level_range preserved`);
    // E nuovo additivo: stadi[].
    assert.ok(Array.isArray(phases[ph].stadi), `${ph}.stadi[] additive`);
  }
});
