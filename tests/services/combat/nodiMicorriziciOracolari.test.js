// tests/services/combat/nodiMicorriziciOracolari.test.js
//
// nodi_micorrizici_oracolari -- oracle reveal.
// Spec: docs/superpowers/specs/2026-07-10-buff-steal-e-oracle-reveal-design.md
//
// Il tratto e' data-only: applica passivamente `telepatic_link`, che
// computeTelepathicReveal consuma per rivelare gli intent nemici entro raggio 3.
// Nessun modulo dedicato -- questi test inchiodano la entry YAML e la pipe.
// Real-module tests (CommonJS), CI-gated via tests/services/*/*.test.js.

'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const yaml = require('js-yaml');

const {
  applyPassiveAncestors,
} = require('../../../apps/backend/services/combat/passiveStatusApplier');
const {
  computeTelepathicReveal,
} = require('../../../apps/backend/services/combat/telepathicReveal');
const { isEngineLiveReliable } = require('../../helpers/traitLiveness');

const REGISTRY = yaml.load(
  fs.readFileSync(path.resolve(__dirname, '../../../data/core/traits/active_effects.yaml'), 'utf8'),
).traits;

const TRAIT = 'nodi_micorrizici_oracolari';

test('nodi: la entry esiste ed e riconosciuta engine-LIVE', () => {
  const def = REGISTRY[TRAIT];
  assert.ok(def, 'entry assente da active_effects.yaml');
  assert.equal(def.trigger.action_type, 'passive');
  assert.equal(def.effect.kind, 'apply_status');
  assert.equal(def.effect.stato, 'telepatic_link');
  assert.equal(isEngineLiveReliable(def), true);
});

test('nodi: applyPassiveAncestors concede telepatic_link', () => {
  const unit = { id: 'u1', traits: [TRAIT], status: {} };
  const events = applyPassiveAncestors(unit, REGISTRY);
  assert.equal(unit.status.telepatic_link, 2);
  assert.ok(events.some((e) => e.trait === TRAIT && e.stato === 'telepatic_link'));
});

test('nodi: un unita senza il tratto non riceve telepatic_link', () => {
  const unit = { id: 'u2', traits: [], status: {} };
  applyPassiveAncestors(unit, REGISTRY);
  assert.equal(unit.status.telepatic_link, undefined);
});

// End-to-end del valore del tratto: lo status passivo accende la pipe di reveal.
// L'unita' porta il tratto -> applyPassiveAncestors le da' telepatic_link ->
// computeTelepathicReveal le mostra l'intent nemico.
function sessionWithEnemyAt(enemyPos) {
  const carrier = {
    id: 'p1',
    controlled_by: 'player',
    hp: 10,
    position: { x: 0, y: 0 },
    traits: [TRAIT],
    status: {},
  };
  applyPassiveAncestors(carrier, REGISTRY);
  return {
    units: [
      carrier,
      { id: 'e1', controlled_by: 'sistema', hp: 10, position: enemyPos, status: {} },
    ],
    roundState: {
      pending_intents: [{ unit_id: 'e1', action: { type: 'attack', target_id: 'p1' } }],
    },
  };
}

test('nodi: il portatore vede lintent nemico entro raggio 3', () => {
  const out = computeTelepathicReveal(sessionWithEnemyAt({ x: 2, y: 1 })); // manhattan 3
  assert.equal(out.length, 1);
  assert.equal(out[0].actor_id, 'p1');
  assert.equal(out[0].revealed[0].enemy_id, 'e1');
  assert.equal(out[0].revealed[0].intent_type, 'attack');
  assert.equal(out[0].revealed[0].target_id, 'p1');
});

// Il contenimento della potenza e' il RAGGIO, non la rarita' (spec decisione 1):
// telepatic_link non concede statistiche, quindi cio' che limita il tratto e' quanto
// lontano vede. Se questo test si rompe, il contenimento e' saltato.
test('nodi: oltre raggio 3 lintent resta nascosto', () => {
  const out = computeTelepathicReveal(sessionWithEnemyAt({ x: 4, y: 0 })); // manhattan 4
  assert.equal(out.length, 0);
});
