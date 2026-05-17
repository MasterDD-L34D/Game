// Sprint 11 (Surface-DEAD #6) — Biome chip HUD surface.
//
// Pure transforms (labelForBiome + iconForBiome + formatBiomeChip) +
// side-effect renderBiomeChip via fake DOM container.

'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');

async function loadModule() {
  return import('../../apps/play/src/biomeChip.js');
}

describe('labelForBiome', () => {
  test('canonical biome ids → IT label', async () => {
    const { labelForBiome } = await loadModule();
    assert.equal(labelForBiome('savana'), 'Savana');
    assert.equal(labelForBiome('caverna'), 'Caverna');
    assert.equal(labelForBiome('foresta'), 'Foresta');
    assert.equal(labelForBiome('pianura_aperta'), 'Pianura aperta');
    assert.equal(labelForBiome('rovine_planari'), 'Rovine planari');
    assert.equal(labelForBiome('abisso_vulcanico'), 'Abisso vulcanico');
    assert.equal(labelForBiome('atollo_obsidiana'), 'Atollo di Obsidiana');
    assert.equal(labelForBiome('cattedrale_apex'), "Cattedrale dell'Apex");
  });

  test('case-insensitive lookup', async () => {
    const { labelForBiome } = await loadModule();
    assert.equal(labelForBiome('SAVANA'), 'Savana');
    assert.equal(labelForBiome('Foresta'), 'Foresta');
  });

  test('unknown biome → snake_case → Title Case fallback', async () => {
    const { labelForBiome } = await loadModule();
    assert.equal(labelForBiome('biome_xyz'), 'Biome Xyz');
    assert.equal(labelForBiome('weird_new_zone'), 'Weird New Zone');
  });

  test('null/undefined/empty → empty string', async () => {
    const { labelForBiome } = await loadModule();
    assert.equal(labelForBiome(null), '');
    assert.equal(labelForBiome(undefined), '');
    assert.equal(labelForBiome(''), '');
  });
});

describe('iconForBiome', () => {
  test('canonical biomes → emoji', async () => {
    const { iconForBiome } = await loadModule();
    assert.equal(iconForBiome('savana'), '🌾');
    assert.equal(iconForBiome('caverna'), '🕳');
    assert.equal(iconForBiome('foresta'), '🌳');
    assert.equal(iconForBiome('abisso_vulcanico'), '🌋');
    assert.equal(iconForBiome('cattedrale_apex'), '⛪');
    assert.equal(iconForBiome('frattura_stellare'), '✨');
  });

  test('unknown biome → 🌍 default', async () => {
    const { iconForBiome } = await loadModule();
    assert.equal(iconForBiome('weird_new_zone'), '🌍');
    assert.equal(iconForBiome('xyz'), '🌍');
  });

  test('null/empty → 🌍 default', async () => {
    const { iconForBiome } = await loadModule();
    assert.equal(iconForBiome(null), '🌍');
    assert.equal(iconForBiome(''), '🌍');
  });
});

describe('formatBiomeChip — pure HTML formatter', () => {
  test('canonical biome → icon + label HTML', async () => {
    const { formatBiomeChip } = await loadModule();
    const html = formatBiomeChip('savana');
    assert.ok(html.includes('🌾'));
    assert.ok(html.includes('Savana'));
    assert.ok(html.includes('biome-icon'));
    assert.ok(html.includes('biome-label'));
  });

  test('unknown biome → fallback icon + Title Case label', async () => {
    const { formatBiomeChip } = await loadModule();
    const html = formatBiomeChip('biome_xyz');
    assert.ok(html.includes('🌍'));
    assert.ok(html.includes('Biome Xyz'));
  });

  test('null/empty → empty string (caller hides)', async () => {
    const { formatBiomeChip } = await loadModule();
    assert.equal(formatBiomeChip(null), '');
    assert.equal(formatBiomeChip(undefined), '');
    assert.equal(formatBiomeChip(''), '');
  });

  test('escapes HTML in label fallback (XSS safety)', async () => {
    const { formatBiomeChip } = await loadModule();
    const html = formatBiomeChip('<script>x</script>');
    assert.ok(!html.includes('<script>x</script>'));
    assert.ok(html.includes('&lt;'));
  });
});

describe('renderBiomeChip — DOM side effect', () => {
  function fakeContainer() {
    const classList = new Set();
    const attrs = {};
    return {
      innerHTML: '',
      classList: {
        add: (...c) => c.forEach((x) => classList.add(x)),
        remove: (...c) => c.forEach((x) => classList.delete(x)),
        contains: (x) => classList.has(x),
      },
      setAttribute: (k, v) => {
        attrs[k] = v;
      },
      removeAttribute: (k) => {
        delete attrs[k];
      },
      _attrs: attrs,
    };
  }

  test('null containerEl → no crash', async () => {
    const { renderBiomeChip } = await loadModule();
    renderBiomeChip(null, 'savana');
    assert.ok(true);
  });

  test('null biomeId → hide + clear + remove title', async () => {
    const { renderBiomeChip } = await loadModule();
    const c = fakeContainer();
    c.innerHTML = '<span>old</span>';
    c.setAttribute('title', 'old title');
    renderBiomeChip(c, null);
    assert.equal(c.innerHTML, '');
    assert.ok(c.classList.contains('biome-hidden'));
    assert.equal(c._attrs.title, undefined);
  });

  test('empty biomeId → hide + clear', async () => {
    const { renderBiomeChip } = await loadModule();
    const c = fakeContainer();
    renderBiomeChip(c, '');
    assert.ok(c.classList.contains('biome-hidden'));
    assert.equal(c.innerHTML, '');
  });

  test('canonical biome → reveal + populate + set title tooltip', async () => {
    const { renderBiomeChip } = await loadModule();
    const c = fakeContainer();
    c.classList.add('biome-hidden');
    renderBiomeChip(c, 'savana');
    assert.ok(!c.classList.contains('biome-hidden'));
    assert.ok(c.innerHTML.includes('Savana'));
    assert.ok(c.innerHTML.includes('🌾'));
    assert.ok(c._attrs.title.includes('savana'));
    assert.ok(c._attrs.title.includes('Codex'));
  });

  test('idempotent — render twice with same id yields same innerHTML', async () => {
    const { renderBiomeChip } = await loadModule();
    const c = fakeContainer();
    renderBiomeChip(c, 'foresta');
    const first = c.innerHTML;
    renderBiomeChip(c, 'foresta');
    assert.equal(c.innerHTML, first);
  });

  test('switch biome — re-render replaces content + title', async () => {
    const { renderBiomeChip } = await loadModule();
    const c = fakeContainer();
    renderBiomeChip(c, 'savana');
    assert.ok(c.innerHTML.includes('Savana'));
    renderBiomeChip(c, 'caverna');
    assert.ok(!c.innerHTML.includes('Savana'));
    assert.ok(c.innerHTML.includes('Caverna'));
    assert.ok(c._attrs.title.includes('caverna'));
  });

  // TKT-ECO-A5 — bioma pressure tier surface tests.
  test('pressureTier — null biome_modifiers returns null (default)', async () => {
    const { pressureTier } = await loadModule();
    assert.equal(pressureTier(null), null);
    assert.equal(pressureTier(undefined), null);
    assert.equal(pressureTier({}), null);
  });

  test('pressureTier — savana defaults (diff_base 2) returns null', async () => {
    const { pressureTier } = await loadModule();
    const savanaMods = {
      diff_base: 2.0,
      hp_mult: 1.0,
      pressure_mult: 0,
      pressure_initial_bonus: 0,
    };
    assert.equal(pressureTier(savanaMods), null);
  });

  test('pressureTier — elevated tier (hp_mult 1.05 OR pressure_init >0)', async () => {
    const { pressureTier } = await loadModule();
    assert.equal(pressureTier({ hp_mult: 1.05 }), 'elevated');
    assert.equal(pressureTier({ pressure_initial_bonus: 5 }), 'elevated');
    assert.equal(pressureTier({ pressure_mult: 1 }), 'elevated');
  });

  test('pressureTier — severe tier (hp_mult ≥1.15 OR pressure_init ≥15)', async () => {
    const { pressureTier } = await loadModule();
    const abissoMods = { hp_mult: 1.15, pressure_initial_bonus: 15, pressure_mult: 3 };
    assert.equal(pressureTier(abissoMods), 'severe');
  });

  test('formatBiomeChip — pressure indicator appended for elevated/severe tier', async () => {
    const { formatBiomeChip } = await loadModule();
    const html = formatBiomeChip('abisso_vulcanico', { hp_mult: 1.15, pressure_initial_bonus: 15 });
    assert.ok(html.includes('biome-pressure-severe'));
    assert.ok(html.includes('⚠⚠'));
    const elev = formatBiomeChip('foresta', { hp_mult: 1.05 });
    assert.ok(elev.includes('biome-pressure-elevated'));
    assert.ok(elev.includes('⚠'));
  });

  test('renderBiomeChip — severe tier sets hostile tooltip', async () => {
    const { renderBiomeChip } = await loadModule();
    const c = fakeContainer();
    renderBiomeChip(c, 'abisso_vulcanico', {
      hp_mult: 1.15,
      pressure_initial_bonus: 15,
      pressure_mult: 3,
    });
    assert.ok(c._attrs.title.includes('OSTILE'));
    assert.ok(c._attrs.title.includes('+15%'));
  });

  test('renderBiomeChip — null biome_modifiers preserves default tooltip', async () => {
    const { renderBiomeChip } = await loadModule();
    const c = fakeContainer();
    renderBiomeChip(c, 'savana');
    assert.ok(c._attrs.title.includes('Codex'));
    assert.ok(!c._attrs.title.includes('OSTILE'));
  });
});
