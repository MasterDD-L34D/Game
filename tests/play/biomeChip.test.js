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

// FASE 3 P4 — ERMES eco band diegetic descriptor.
describe('ecoBandLabel + eco descriptor (FASE 3 P4)', () => {
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

  test('ecoBandLabel maps bands to diegetic IT (never the ERMES name)', async () => {
    const { ecoBandLabel } = await loadModule();
    assert.equal(ecoBandLabel('low'), 'Bioma calmo');
    assert.equal(ecoBandLabel('med'), 'Bioma in equilibrio');
    assert.equal(ecoBandLabel('high'), 'Bioma in tensione');
    assert.equal(ecoBandLabel(null), '');
    assert.equal(ecoBandLabel('xyz'), '');
    for (const b of ['low', 'med', 'high']) {
      assert.ok(!ecoBandLabel(b).toUpperCase().includes('ERMES'));
    }
  });

  test('formatBiomeChip appends eco descriptor when band present', async () => {
    const { formatBiomeChip } = await loadModule();
    const html = formatBiomeChip('cryosteppe_convergence', null, 'high');
    assert.ok(html.includes('biome-eco-high'));
    assert.ok(html.includes('Bioma in tensione'));
    assert.ok(html.includes('data-band="high"'));
  });

  test('formatBiomeChip — no eco span when band null/unknown', async () => {
    const { formatBiomeChip } = await loadModule();
    assert.ok(!formatBiomeChip('savana', null, null).includes('biome-eco'));
    assert.ok(!formatBiomeChip('savana', null, 'bogus').includes('biome-eco'));
  });

  test('formatBiomeChip — eco + pressure tier coexist', async () => {
    const { formatBiomeChip } = await loadModule();
    const html = formatBiomeChip('abisso_vulcanico', { hp_mult: 1.05 }, 'low');
    assert.ok(html.includes('biome-pressure-elevated'));
    assert.ok(html.includes('biome-eco-low'));
    assert.ok(html.includes('Bioma calmo'));
  });

  test('renderBiomeChip — eco descriptor in body + tooltip', async () => {
    const { renderBiomeChip } = await loadModule();
    const c = fakeContainer();
    renderBiomeChip(c, 'rovine_planari', null, 'low');
    assert.ok(c.innerHTML.includes('Bioma calmo'));
    assert.ok(c._attrs.title.includes('Bioma calmo'));
  });
});

// SPEC-P PA3 — wounded-biome diegetic telegraph (#2677 read-side -> surface).
// A13 cross-run: a biome wounded by a failed expedition reacts more harshly.
// Anti-brick doctrine (SPEC-P sez.8): the degrade MUST be telegraphed, no raw number.
describe('woundedLabel + wounded telegraph (SPEC-P PA3)', () => {
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

  test('woundedLabel(true) → diegetic IT label (never a raw number)', async () => {
    const { woundedLabel } = await loadModule();
    assert.equal(woundedLabel(true), 'Bioma ferito');
    assert.ok(!/\d/.test(woundedLabel(true)));
  });

  test('woundedLabel falsy → empty string', async () => {
    const { woundedLabel } = await loadModule();
    assert.equal(woundedLabel(false), '');
    assert.equal(woundedLabel(null), '');
    assert.equal(woundedLabel(undefined), '');
    assert.equal(woundedLabel(0), '');
  });

  test('formatBiomeChip — wounded flag appends biome-wounded span + label', async () => {
    const { formatBiomeChip } = await loadModule();
    const html = formatBiomeChip('savana', null, null, true);
    assert.ok(html.includes('biome-wounded'));
    assert.ok(html.includes('Bioma ferito'));
    assert.ok(html.includes('data-wounded="true"'));
  });

  test('formatBiomeChip — no wounded span when flag false/omitted (backward compat)', async () => {
    const { formatBiomeChip } = await loadModule();
    assert.ok(!formatBiomeChip('savana', null, null, false).includes('biome-wounded'));
    assert.ok(!formatBiomeChip('savana').includes('biome-wounded'));
    assert.ok(!formatBiomeChip('savana', { hp_mult: 1.05 }, 'high').includes('biome-wounded'));
  });

  test('formatBiomeChip — wounded coexists with pressure tier + eco band', async () => {
    const { formatBiomeChip } = await loadModule();
    const html = formatBiomeChip(
      'abisso_vulcanico',
      { hp_mult: 1.15, pressure_initial_bonus: 15 },
      'high',
      true,
    );
    assert.ok(html.includes('biome-pressure-severe'));
    assert.ok(html.includes('biome-eco-high'));
    assert.ok(html.includes('biome-wounded'));
    assert.ok(html.includes('Bioma ferito'));
  });

  test('renderBiomeChip — wounded descriptor in body + tooltip', async () => {
    const { renderBiomeChip } = await loadModule();
    const c = fakeContainer();
    renderBiomeChip(c, 'savana', null, null, true);
    assert.ok(c.innerHTML.includes('Bioma ferito'));
    assert.ok(c._attrs.title.includes('ferito'));
  });

  test('renderBiomeChip — no wounded marker when flag false (backward compat)', async () => {
    const { renderBiomeChip } = await loadModule();
    const c = fakeContainer();
    renderBiomeChip(c, 'savana', null, null, false);
    assert.ok(!c.innerHTML.includes('biome-wounded'));
    assert.ok(!c._attrs.title.includes('ferito'));
  });
});

// SPEC-I ER6 -- StressWave event telegraph (4o descrittore, diegetico).
// L'evento one-shot (rescue/overrun) viene annunciato al crossing della
// soglia; mai il valore wave (ER3: banda + hint, niente numeri).
describe('stresswaveEventLabel + telegraph (SPEC-I ER6)', () => {
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

  test('rescue/overrun → diegetic IT labels (never a raw number)', async () => {
    const { stresswaveEventLabel } = await loadModule();
    assert.equal(stresswaveEventLabel('rescue'), 'Soccorso in arrivo');
    assert.equal(stresswaveEventLabel('overrun'), 'Ondata in arrivo');
    assert.ok(!/\d/.test(stresswaveEventLabel('rescue')));
  });

  test('falsy / unknown event → empty string', async () => {
    const { stresswaveEventLabel } = await loadModule();
    assert.equal(stresswaveEventLabel(null), '');
    assert.equal(stresswaveEventLabel(undefined), '');
    assert.equal(stresswaveEventLabel(''), '');
    assert.equal(stresswaveEventLabel('sync_window'), '');
  });

  test('formatBiomeChip — stresswave event renders 4th descriptor', async () => {
    const { formatBiomeChip } = await loadModule();
    const html = formatBiomeChip('abisso_vulcanico', null, 'high', false, { event: 'overrun' });
    assert.ok(html.includes('biome-stresswave'));
    assert.ok(html.includes('Ondata in arrivo'));
    assert.ok(html.includes('data-stresswave="overrun"'));
  });

  test('formatBiomeChip — no stresswave span without event (backward compat)', async () => {
    const { formatBiomeChip } = await loadModule();
    const html = formatBiomeChip('savana', null, null, false);
    assert.ok(!html.includes('biome-stresswave'));
  });

  test('renderBiomeChip — stresswave event in body (coexists with wounded)', async () => {
    const { renderBiomeChip } = await loadModule();
    const c = fakeContainer();
    renderBiomeChip(c, 'savana', null, null, true, { event: 'rescue' });
    assert.ok(c.innerHTML.includes('Bioma ferito'));
    assert.ok(c.innerHTML.includes('Soccorso in arrivo'));
  });
});
