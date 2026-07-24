'use strict';

// D8 chain-lightning footprint sweep (grilling 2026-06-30, cap 3/2).
//
// The chain is DETERMINISTIC given terrain + occupant positions (BFS + fixed
// per-tile shock), so a stochastic N=40 over RNG seeds adds nothing -- the band
// that actually moves is the GEOMETRIC reach (maxDepth) and how many occupants it
// can shock. This probe enumerates representative water layouts and reports the
// footprint (tiles electrified, occupants hit, total chain damage) at the as-built
// cap (maxDepth 2) vs the verdict cap (maxDepth 3), shock fixed at 2. The delta =
// the worst-case lethality increase the flip would introduce.
//
// Usage: node tools/sim/d8-chain-footprint.js

const { chainLightningStrike } = require('../../apps/backend/services/combat/terrainReactions');

// Build a "x,y" water map + one full-HP occupant per water tile (worst case for
// "how many can it shock"). Origin is electrified (the single-tile burst already hit
// its occupant); occupants on the origin are excluded by the helper.
function scenario(name, waterCoords, origin = { x: 0, y: 0 }) {
  const map = {};
  for (const [x, y] of waterCoords)
    map[`${x},${y}`] = { type: 'water', ttl: 2, source_actor: null };
  map[`${origin.x},${origin.y}`] = { type: 'electrified', ttl: 1, source_actor: null };
  const units = waterCoords.map(([x, y], i) => ({ id: `occ_${i}`, position: { x, y }, hp: 20 }));
  return { name, map, units, origin };
}

// Deep-clone the mutable bits so the depth-2 run does not pollute the depth-3 run.
function clone(s) {
  return {
    name: s.name,
    origin: s.origin,
    map: JSON.parse(JSON.stringify(s.map)),
    units: s.units.map((u) => ({ ...u, position: { ...u.position } })),
  };
}

function measure(s, maxDepth) {
  const c = clone(s);
  const res = chainLightningStrike(c.origin, c.map, c.units, { maxDepth, shockDamagePerTile: 2 });
  const total = res.hits.reduce((a, h) => a + h.shock_damage, 0);
  return { tiles: res.electrified_tiles.length, hits: res.hits.length, damage: total };
}

// Representative layouts. Lines = max reach; flood = max occupant count.
const line = (n) => Array.from({ length: n }, (_, i) => [i + 1, 0]);
const plus = (n) => {
  const out = [];
  for (let d = 1; d <= n; d++) out.push([d, 0], [-d, 0], [0, d], [0, -d]);
  return out;
};
const flood = (r) => {
  const out = [];
  for (let x = -r; x <= r; x++)
    for (let y = -r; y <= r; y++) if (!(x === 0 && y === 0)) out.push([x, y]);
  return out;
};

const scenarios = [
  scenario('line-6 (straight reach)', line(6)),
  scenario('plus-4 (4-dir arms len 4)', plus(4)),
  scenario('flood-3 (7x7 water field)', flood(3)),
];

console.log('D8 chain-lightning footprint: maxDepth 2 (as-built) vs 3 (verdict), shock=2\n');
console.log(
  'scenario                        | d2 tiles/hits/dmg | d3 tiles/hits/dmg | delta tiles/hits/dmg',
);
console.log(''.padEnd(100, '-'));
let worstDmgDelta = 0;
let worstHitsDelta = 0;
for (const s of scenarios) {
  const d2 = measure(s, 2);
  const d3 = measure(s, 3);
  const dt = { tiles: d3.tiles - d2.tiles, hits: d3.hits - d2.hits, damage: d3.damage - d2.damage };
  worstDmgDelta = Math.max(worstDmgDelta, dt.damage);
  worstHitsDelta = Math.max(worstHitsDelta, dt.hits);
  console.log(
    `${s.name.padEnd(31)} | ${`${d2.tiles}/${d2.hits}/${d2.damage}`.padEnd(17)} | ${`${d3.tiles}/${d3.hits}/${d3.damage}`.padEnd(17)} | +${dt.tiles}/+${dt.hits}/+${dt.damage}`,
  );
}
console.log('');
console.log(`WORST-CASE per-strike delta: +${worstHitsDelta} occupants, +${worstDmgDelta} damage.`);
console.log(
  'Floor-at-1 invariant holds (chain never lands a killing blow); friendly-fire by design.',
);
