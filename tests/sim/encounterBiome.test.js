// encounter-biome -- A13 N=40 evidence harness: encounter_id -> biome_id resolver
// (sim-side, reads the same YAML dirs as encounterThreat; no API surface change).

'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const { biomeForEncounter, _resetCache } = require('../../tools/sim/encounter-biome');

function fixtureDir(files) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'encbiome-'));
  for (const [name, content] of Object.entries(files)) {
    fs.writeFileSync(path.join(dir, name), content, 'utf8');
  }
  return dir;
}

test('biomeForEncounter: resolves biome_id from encounter YAML', () => {
  _resetCache();
  const dir = fixtureDir({
    'enc_alpha_01.yaml': 'encounter_id: enc_alpha_01\nbiome_id: savana\n',
    'enc_beta_01.yaml': 'encounter_id: enc_beta_01\nbiome_id: caverna\n',
  });
  assert.equal(biomeForEncounter('enc_alpha_01', { dirs: [dir] }), 'savana');
  assert.equal(biomeForEncounter('enc_beta_01', { dirs: [dir] }), 'caverna');
});

test('biomeForEncounter: unknown id / missing biome_id / malformed yaml -> null', () => {
  _resetCache();
  const dir = fixtureDir({
    'enc_nobiome_01.yaml': 'encounter_id: enc_nobiome_01\n',
    'enc_broken_01.yaml': '::: not yaml {{{',
  });
  assert.equal(biomeForEncounter('enc_missing', { dirs: [dir] }), null);
  assert.equal(biomeForEncounter('enc_nobiome_01', { dirs: [dir] }), null);
  assert.equal(biomeForEncounter('enc_broken_01', { dirs: [dir] }), null);
  assert.equal(biomeForEncounter(null, { dirs: [dir] }), null);
});

test('biomeForEncounter: first dir wins on id collision (live > draft)', () => {
  _resetCache();
  const live = fixtureDir({ 'enc_dup_01.yaml': 'encounter_id: enc_dup_01\nbiome_id: savana\n' });
  const draft = fixtureDir({ 'enc_dup_01.yaml': 'encounter_id: enc_dup_01\nbiome_id: tundra\n' });
  assert.equal(biomeForEncounter('enc_dup_01', { dirs: [live, draft] }), 'savana');
});

test('biomeForEncounter: absent dir skipped gracefully', () => {
  _resetCache();
  const dir = fixtureDir({ 'enc_solo_01.yaml': 'encounter_id: enc_solo_01\nbiome_id: palude\n' });
  const ghost = path.join(dir, 'nope');
  assert.equal(biomeForEncounter('enc_solo_01', { dirs: [ghost, dir] }), 'palude');
});

test('biomeForEncounter: real repo dirs resolve a known live encounter', () => {
  _resetCache();
  // enc_savana_01 is a live authored encounter (default campaign chain).
  assert.equal(biomeForEncounter('enc_savana_01'), 'savana');
});
