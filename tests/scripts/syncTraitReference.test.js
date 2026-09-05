// CI guard: il mirror trait_reference esclude le entry meta/legacy, non i tratti reali.
//
// Background: `data/traits/index.json` ospita anche entry che NON sono tratti di
// creatura -- `traits_aggregate` (famiglia_tipologia "Meta/Dataset") e' un dump
// normalizzato dei TR-* per pipeline legacy. Finche' il mirror proiettava l'indice
// 1:1, quella entry finiva in trait_reference.json e i tool a valle
// (report_trait_coverage / build_trait_baseline) la trattavano come tratto reale,
// pretendendone copertura di specie -- copertura che nessuna specie puo' avere.
//
// Il filtro usa il prefisso `Meta/` CON lo slash. Il negative control sotto e' la
// parte load-bearing: famiglie legittime come "Metabolico/Resilienza" iniziano per
// "Meta" ma NON vanno escluse. Un filtro `startsWith('Meta')` senza slash farebbe
// sparire tratti reali dal mirror in silenzio.
//
// Run: `node --test tests/scripts/syncTraitReference.test.js`
// Wirato in `npm run test:api`.

const test = require('node:test');
const assert = require('node:assert/strict');

const { projectMirror, isMetaEntry } = require('../../scripts/sync_trait_reference.js');

test('isMetaEntry esclude le entry Meta/ ma non le famiglie Metabolico/', () => {
  assert.equal(isMetaEntry({ famiglia_tipologia: 'Meta/Dataset' }), true);

  // Negative control: queste sono famiglie reali presenti nell'indice.
  assert.equal(isMetaEntry({ famiglia_tipologia: 'Metabolico/Resilienza' }), false);
  assert.equal(isMetaEntry({ famiglia_tipologia: 'Metabolico/Difensivo' }), false);
  assert.equal(isMetaEntry({ famiglia_tipologia: 'Digestivo/Metabolico' }), false);
  assert.equal(isMetaEntry({ famiglia_tipologia: 'Tegumentario/Difensivo' }), false);

  // Entry senza famiglia: non e' meta, va tenuta.
  assert.equal(isMetaEntry({}), false);
  assert.equal(isMetaEntry(undefined), false);
});

test('projectMirror scarta le entry meta e preserva i tratti reali', () => {
  const index = {
    schema_version: '1.0',
    traits: {
      traits_aggregate: { label: 'Aggregato tratti Evo', famiglia_tipologia: 'Meta/Dataset' },
      grassi_termici: { label: 'Grassi Termici', famiglia_tipologia: 'Metabolico/Resilienza' },
      pelli_fitte: { label: 'Pelli Fitte', famiglia_tipologia: 'Tegumentario/Difensivo' },
    },
  };

  const mirror = projectMirror(index);
  const ids = Object.keys(mirror.traits);

  assert.deepEqual(ids, ['grassi_termici', 'pelli_fitte']);
  assert.ok(
    !('traits_aggregate' in mirror.traits),
    'entry Meta/Dataset non deve entrare nel mirror',
  );
  assert.equal(mirror.traits.grassi_termici.label, 'Grassi Termici');
});

test('il mirror reale non contiene entry meta e resta non vuoto', () => {
  const index = require('../../data/traits/index.json');
  const mirror = projectMirror(index);

  const leaked = Object.entries(mirror.traits).filter(([, entry]) => isMetaEntry(entry));
  assert.deepEqual(leaked, [], 'nessuna entry meta deve sopravvivere alla proiezione');

  const indexCount = Object.keys(index.traits).length;
  const metaCount = Object.values(index.traits).filter(isMetaEntry).length;
  assert.ok(
    metaCount > 0,
    'l indice deve ancora contenere le entry meta (il filtro vive nel mirror)',
  );
  assert.equal(Object.keys(mirror.traits).length, indexCount - metaCount);
});
