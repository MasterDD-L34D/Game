// QW4 (2026-04-26) — render.js lifecycle_phase + aspect_token visibility.
//
// Test pure helper exports da apps/play/src/render.js:
//   - getLifecyclePhaseStyle(phase) → { sizeMul, tint, badge }
//   - getAspectTokenOverlay(token)   → { glyph, color } | null
//
// Skiv (Arenavenator vagans / dune_stalker) è la creatura canonical che usa
// queste fasi: data/core/species/dune_stalker_lifecycle.yaml definisce 5 fasi
// (hatchling → juvenile → mature → apex → legacy) + 4 mutation_morphology token.
// Sistema multi-creature: qualsiasi unit con `lifecycle_phase` field riceve
// scaling + tint + badge senza modifica al render layer.
//
// Canvas drawing è coperto solo indirettamente: helpers sono pure → testabili
// senza jsdom / canvas mock. Visual smoke = launcher live (fuori scope test).

'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');

async function loadRender() {
  return import('../../apps/play/src/render.js');
}

describe('getLifecyclePhaseStyle — 5 phases canonical da dune_stalker_lifecycle.yaml', () => {
  test('hatchling → sizeMul 0.6, badge HJG, tint definito', async () => {
    const { getLifecyclePhaseStyle } = await loadRender();
    const s = getLifecyclePhaseStyle('hatchling');
    assert.equal(s.sizeMul, 0.6);
    assert.equal(s.badge, 'HJG');
    assert.ok(s.tint && typeof s.tint === 'string');
  });

  test('juvenile → sizeMul 0.8, badge JUV', async () => {
    const { getLifecyclePhaseStyle } = await loadRender();
    const s = getLifecyclePhaseStyle('juvenile');
    assert.equal(s.sizeMul, 0.8);
    assert.equal(s.badge, 'JUV');
  });

  test('mature → sizeMul 1.0, badge MTR', async () => {
    const { getLifecyclePhaseStyle } = await loadRender();
    const s = getLifecyclePhaseStyle('mature');
    assert.equal(s.sizeMul, 1.0);
    assert.equal(s.badge, 'MTR');
  });

  test('apex → sizeMul 1.15 (largest), badge APX', async () => {
    const { getLifecyclePhaseStyle } = await loadRender();
    const s = getLifecyclePhaseStyle('apex');
    assert.equal(s.sizeMul, 1.15);
    assert.equal(s.badge, 'APX');
  });

  test('legacy → sizeMul 1.0 (retired), badge LGC', async () => {
    const { getLifecyclePhaseStyle } = await loadRender();
    const s = getLifecyclePhaseStyle('legacy');
    assert.equal(s.sizeMul, 1.0);
    assert.equal(s.badge, 'LGC');
  });

  test('size scaling è strettamente crescente da hatchling ad apex', async () => {
    const { getLifecyclePhaseStyle } = await loadRender();
    const ordered = ['hatchling', 'juvenile', 'mature', 'apex'];
    const sizes = ordered.map((p) => getLifecyclePhaseStyle(p).sizeMul);
    for (let i = 1; i < sizes.length; i += 1) {
      assert.ok(
        sizes[i] > sizes[i - 1],
        `${ordered[i]} (${sizes[i]}) deve essere > ${ordered[i - 1]} (${sizes[i - 1]})`,
      );
    }
  });

  test('le 5 phase hanno tint colors distinti (fingerprint visivo)', async () => {
    const { getLifecyclePhaseStyle } = await loadRender();
    const phases = ['hatchling', 'juvenile', 'mature', 'apex', 'legacy'];
    const tints = phases.map((p) => getLifecyclePhaseStyle(p).tint);
    const unique = new Set(tints);
    assert.equal(unique.size, 5, 'ogni phase deve avere tint univoco');
  });

  test('le 5 phase hanno badge abbrev distinti (3 char)', async () => {
    const { getLifecyclePhaseStyle } = await loadRender();
    const phases = ['hatchling', 'juvenile', 'mature', 'apex', 'legacy'];
    const badges = phases.map((p) => getLifecyclePhaseStyle(p).badge);
    const unique = new Set(badges);
    assert.equal(unique.size, 5, 'ogni phase deve avere badge univoco');
    badges.forEach((b) => assert.equal(b.length, 3, `badge "${b}" deve essere 3 char`));
  });
});

describe('getLifecyclePhaseStyle — fallback safe (no breaking change)', () => {
  test('phase undefined → default (sizeMul 1.0, no tint, no badge)', async () => {
    const { getLifecyclePhaseStyle } = await loadRender();
    const s = getLifecyclePhaseStyle(undefined);
    assert.equal(s.sizeMul, 1.0);
    assert.equal(s.tint, null);
    assert.equal(s.badge, null);
  });

  test('phase null → default', async () => {
    const { getLifecyclePhaseStyle } = await loadRender();
    const s = getLifecyclePhaseStyle(null);
    assert.equal(s.sizeMul, 1.0);
    assert.equal(s.badge, null);
  });

  test('phase empty string → default', async () => {
    const { getLifecyclePhaseStyle } = await loadRender();
    const s = getLifecyclePhaseStyle('');
    assert.equal(s.sizeMul, 1.0);
    assert.equal(s.badge, null);
  });

  test('phase sconosciuta → default (no crash)', async () => {
    const { getLifecyclePhaseStyle } = await loadRender();
    const s = getLifecyclePhaseStyle('unknown_phase_xyz');
    assert.equal(s.sizeMul, 1.0);
    assert.equal(s.tint, null);
  });

  test('phase non-string (number) → default', async () => {
    const { getLifecyclePhaseStyle } = await loadRender();
    const s = getLifecyclePhaseStyle(42);
    assert.equal(s.sizeMul, 1.0);
  });

  test('phase case-insensitive (HATCHLING == hatchling)', async () => {
    const { getLifecyclePhaseStyle } = await loadRender();
    const upper = getLifecyclePhaseStyle('HATCHLING');
    const lower = getLifecyclePhaseStyle('hatchling');
    assert.equal(upper.sizeMul, lower.sizeMul);
    assert.equal(upper.badge, lower.badge);
  });
});

describe('getAspectTokenOverlay — mutation morphology marker da YAML', () => {
  test('claws_glass → glyph + color definiti', async () => {
    const { getAspectTokenOverlay } = await loadRender();
    const o = getAspectTokenOverlay('claws_glass');
    assert.ok(o, 'claws_glass dovrebbe ritornare overlay');
    assert.ok(o.glyph && typeof o.glyph === 'string');
    assert.ok(o.color && typeof o.color === 'string');
  });

  test('claws_glacial → overlay distinto da claws_glass', async () => {
    const { getAspectTokenOverlay } = await loadRender();
    const glass = getAspectTokenOverlay('claws_glass');
    const glacial = getAspectTokenOverlay('claws_glacial');
    assert.ok(glacial);
    assert.notEqual(glass.color, glacial.color, 'token diversi → color diversi');
  });

  test('scales_chameleon → overlay disponibile', async () => {
    const { getAspectTokenOverlay } = await loadRender();
    const o = getAspectTokenOverlay('scales_chameleon');
    assert.ok(o);
  });

  test('ears_radar → overlay disponibile', async () => {
    const { getAspectTokenOverlay } = await loadRender();
    const o = getAspectTokenOverlay('ears_radar');
    assert.ok(o);
  });

  test('i 4 token canonici hanno tutti glyph distinti', async () => {
    const { getAspectTokenOverlay } = await loadRender();
    const tokens = ['claws_glass', 'claws_glacial', 'scales_chameleon', 'ears_radar'];
    const glyphs = tokens.map((t) => getAspectTokenOverlay(t).glyph);
    const unique = new Set(glyphs);
    assert.equal(unique.size, 4, 'ogni token deve avere glyph univoco');
  });

  test('token sconosciuto → null (no-op safe)', async () => {
    const { getAspectTokenOverlay } = await loadRender();
    assert.equal(getAspectTokenOverlay('not_a_real_token'), null);
  });

  test('token undefined / null / empty → null', async () => {
    const { getAspectTokenOverlay } = await loadRender();
    assert.equal(getAspectTokenOverlay(undefined), null);
    assert.equal(getAspectTokenOverlay(null), null);
    assert.equal(getAspectTokenOverlay(''), null);
  });

  test('token non-string → null (no crash)', async () => {
    const { getAspectTokenOverlay } = await loadRender();
    assert.equal(getAspectTokenOverlay(42), null);
    assert.equal(getAspectTokenOverlay({}), null);
  });

  test('token case-insensitive', async () => {
    const { getAspectTokenOverlay } = await loadRender();
    const upper = getAspectTokenOverlay('CLAWS_GLASS');
    const lower = getAspectTokenOverlay('claws_glass');
    assert.deepEqual(upper, lower);
  });
});
