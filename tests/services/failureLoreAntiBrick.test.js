'use strict';
// =============================================================================
// SPEC-P failure-as-lore -- acceptance gate #6: anti-brick invariant (sez.8).
//
// Acceptance #6 (verbatim): the anti-brick invariant must be verifiable with an
// EXPLICIT AUTOMATIC test (e.g. N>=5 consecutive failed runs in the same biome ->
// `metaNetworkCompletability` confirms the campaign is still completable + the
// recovery path is reachable), NOT just design-rationale.
//
// Invariant P1 (sez.8): no state renders the campaign unplayable. It holds because:
//   (a) wounds are BOUNDED -- woundBiome is idempotent + capped at MAX_WOUNDED_BIOMES,
//       and pressureDelta never exceeds the ER2 cap (no unbounded difficulty climb);
//   (b) wounds are a campaign-state TAG -- they never mutate the meta-network graph
//       topology, so `checkCompletable` is preserved by construction; and
//   (c) every woundable biome's node stays reachable from the start, so the recovery
//       move (win there -> healBiome) is always physically routable; and
//   (d) healBiome provides the recovery transition (wounded set shrinks back).
//
// This test encodes (a)-(d) against the REAL alpha network + a control graph that
// PROVES the completability oracle has teeth (a stranded graph -> ok:false), so the
// green here is signal, not a constant-true.
// =============================================================================

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  MAX_WOUNDED_BIOMES,
  ER2_PRESSURE_CAP,
  woundBiome,
  healBiome,
  pressureDelta,
} = require('../../apps/backend/services/worldgen/biomeWound');
const {
  checkCompletable,
  _reachable,
} = require('../../apps/backend/services/worldgen/metaNetworkCompletability');
const resolver = require('../../apps/backend/services/worldgen/metaNetworkResolver');

const ALL_SEASONS = [null, 'spring', 'summer', 'autumn', 'winter'];

function realNetwork() {
  resolver._resetCache();
  return resolver.getNetwork();
}

// biome_id -> node.id map (the wounded set keys on session.biome_id == node biome_id).
function biomeToNode(net) {
  const m = new Map();
  for (const n of net.nodes) if (n.biome_id) m.set(n.biome_id, n.id);
  return m;
}

// Mirror the session-end loop (routes/session.js): a defeat in `biomeId` applies
// woundBiome; the persisted set only changes when `added` is true.
function applyDefeat(wounded, biomeId) {
  const r = woundBiome(wounded, biomeId);
  return r.added ? r.wounded : wounded;
}

// A wounded biome's node is reachable (recovery routable) if it sits in the
// reachable set under at least one season.
function nodeReachableSomeSeason(net, nodeId) {
  const key = String(nodeId).toLowerCase();
  return ALL_SEASONS.some((s) => _reachable(net, net.start_node, s).has(key));
}

test('control: the completability oracle has teeth (a stranded graph -> ok:false)', () => {
  // T is only reachable via a prior_node_cleared[Z] gate, and Z is never reachable.
  const stranded = {
    start_node: 'A',
    nodes: [{ id: 'A' }, { id: 'T', terminal: true }],
    edges: [{ from: 'A', to: 'T', type: 'corridor', conditions: { prior_node_cleared: ['Z'] } }],
  };
  assert.equal(checkCompletable(stranded, { seasons: [null] }).ok, false);
});

test('cap invariant: MAX_WOUNDED_BIOMES < graph node count (a recovery node always survives)', () => {
  const net = realNetwork();
  assert.ok(
    MAX_WOUNDED_BIOMES < net.nodes.length,
    `cap ${MAX_WOUNDED_BIOMES} must be < ${net.nodes.length} nodes so not every node can be wounded at once`,
  );
});

test('N>=5 consecutive fails in the same biome -> set bounded + still completable + recovery reachable', () => {
  const net = realNetwork();
  const map = biomeToNode(net);
  // FORESTA_TEMPERATA -> foresta_miceliale: a non-start node, reachable from start.
  const biomeId = 'foresta_miceliale';
  assert.ok(map.has(biomeId), 'fixture biome is a real graph node');

  let wounded = [];
  for (let i = 0; i < 6; i++) wounded = applyDefeat(wounded, biomeId);

  // (a) bounded: idempotent -> repeated same-biome fails never grow the set past 1.
  assert.deepEqual(wounded, [biomeId]);
  // (a) bounded: pressure never escapes the ER2 cap (no unbounded climb).
  assert.ok(pressureDelta(wounded) <= ER2_PRESSURE_CAP);
  // (b) completable: the graph stays solvable in EVERY season despite the wounds.
  const comp = checkCompletable(net, { seasons: ALL_SEASONS });
  assert.equal(comp.ok, true, `campaign completable; stranded=${JSON.stringify(comp.stranded)}`);
  // (c) recovery reachable: the wounded node is routable, so winning there is possible.
  assert.ok(nodeReachableSomeSeason(net, map.get(biomeId)), 'recovery node reachable from start');
});

test('recovery win heals the biome (anti-brick exit): wounded set shrinks, degrade clears', () => {
  let wounded = ['foresta_miceliale'];
  const r = healBiome(wounded, 'foresta_miceliale');
  assert.equal(r.healed, true);
  assert.deepEqual(r.wounded, []);
  assert.equal(pressureDelta(r.wounded), 0);
});

test('worst case: cap-many distinct biomes wounded -> completable + each recovery node reachable + bounded', () => {
  const net = realNetwork();
  const map = biomeToNode(net);
  // savana (DESERTO_CALDO = start) + foresta_miceliale (FORESTA_TEMPERATA).
  const biomes = ['savana', 'foresta_miceliale'];
  assert.equal(biomes.length, MAX_WOUNDED_BIOMES);

  let wounded = [];
  for (const b of biomes) {
    assert.ok(map.has(b), `${b} is a real graph node`);
    wounded = applyDefeat(wounded, b);
  }
  assert.equal(wounded.length, MAX_WOUNDED_BIOMES);

  // A further distinct fail past the cap is rejected -> set stays bounded.
  const overflow = woundBiome(wounded, 'mezzanotte_orbitale');
  assert.equal(overflow.capped, true);
  assert.deepEqual(overflow.wounded, wounded);

  // pressure pinned at the ER2 cap, never above it.
  assert.equal(pressureDelta(wounded), ER2_PRESSURE_CAP);

  // completable in every season + every wounded node still routable for recovery.
  const comp = checkCompletable(net, { seasons: ALL_SEASONS });
  assert.equal(comp.ok, true, `stranded=${JSON.stringify(comp.stranded)}`);
  for (const b of wounded) {
    assert.ok(nodeReachableSomeSeason(net, map.get(b)), `recovery node for ${b} reachable`);
  }
});

test('realistic interleave (fail, fail, recover, re-fail) stays bounded + completable', () => {
  const net = realNetwork();
  let wounded = [];
  wounded = applyDefeat(wounded, 'savana'); // run 1: lose in savana
  wounded = applyDefeat(wounded, 'savana'); // run 2: lose again (idempotent)
  wounded = healBiome(wounded, 'savana').wounded; // run 3: win in savana -> heal
  assert.deepEqual(wounded, []);
  wounded = applyDefeat(wounded, 'savana'); // run 4: lose in the healed biome
  assert.deepEqual(wounded, ['savana']);
  assert.ok(pressureDelta(wounded) <= ER2_PRESSURE_CAP);
  assert.equal(checkCompletable(net, { seasons: ALL_SEASONS }).ok, true);
});

test('non-node wound is bounded + RECOVERABLE (heal) -- recovery is mechanism-level, not routing-gated', () => {
  // `caverna` is an encounter-only biome, NOT a meta-network node. A run can still wound it
  // (woundBiome keys on session.biome_id), consuming a slot. The anti-brick guarantee for
  // such a wound is NOT graph-routing (there is no node to route to) but the HEAL mechanism:
  // a victory in that same encounter clears it (healBiome keys on biome_id, node or not), so
  // the slot is never permanently stuck. Asserting only the wound-independent checkCompletable
  // would prove nothing about this wound (Codex PR #2777 P2) -- prove the recovery instead.
  const net = realNetwork();
  const map = biomeToNode(net);
  assert.ok(!map.has('caverna'), 'fixture is genuinely a non-node biome');

  let wounded = [];
  for (let i = 0; i < 5; i++) wounded = applyDefeat(wounded, 'caverna');
  assert.deepEqual(wounded, ['caverna']); // bounded (idempotent), one slot consumed
  assert.ok(pressureDelta(wounded) <= ER2_PRESSURE_CAP); // never escalates past ER2

  // recovery: a victory in caverna heals it -> the slot is freed, no permanent stuck state.
  const healed = healBiome(wounded, 'caverna');
  assert.equal(healed.healed, true);
  assert.deepEqual(healed.wounded, []);
  assert.equal(pressureDelta(healed.wounded), 0);
});

test('mixed wound at cap (1 node + 1 non-node) -> not bricked: completable + node recovery routable + non-node healable', () => {
  // The exact Codex scenario: a non-node biome consumes one of the two slots. Prove it is
  // NOT a brick on every axis: (a) campaign stays completable, (b) the node-biome wound has a
  // routable recovery node, (c) the non-node wound is still healable (mechanism-level), and
  // (d) pressure stays pinned at the ER2 cap, never above.
  const net = realNetwork();
  const map = biomeToNode(net);
  let wounded = [];
  wounded = applyDefeat(wounded, 'caverna'); // non-node slot
  wounded = applyDefeat(wounded, 'savana'); // node slot (DESERTO_CALDO = start)
  assert.equal(wounded.length, MAX_WOUNDED_BIOMES);

  assert.equal(checkCompletable(net, { seasons: ALL_SEASONS }).ok, true);
  assert.ok(nodeReachableSomeSeason(net, map.get('savana')), 'node wound recovery routable');
  assert.equal(healBiome(wounded, 'caverna').healed, true); // non-node wound recoverable
  assert.equal(pressureDelta(wounded), ER2_PRESSURE_CAP); // never above ER2 even at cap
});
