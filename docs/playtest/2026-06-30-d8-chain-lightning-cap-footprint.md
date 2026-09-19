---
title: 'D8 chain-lightning cap 3/2 -- footprint evidence + flip-safety (aa01, Tier-3)'
workstream: ops-qa
category: playtest
doc_status: active
doc_owner: claude-code
last_verified: '2026-06-30'
language: en
tags: [playtest, aa01-impronta, terrain, chain-lightning, d8, footprint, n40]
---

# D8 chain-lightning cap 3/2 -- footprint evidence (Tier-3 lane, O6)

aa01 CAP-07 D8. Master-dd grilling verdict (2026-06-30): the chain-lightning caps
= **3/2** (`maxDepth 3`, `shock 2`), up from the as-built 2/2 (#3082). This bumps
the BFS propagation one hop further through adjacent water tiles; per-tile shock is
unchanged. BUILT flag-gated OFF (`TERRAIN_CHAIN_LIGHTNING_ENABLED`,
`apps/backend/services/combat/terrainReactions.js`). The flag is NOT flipped here.

> **Band PROVISIONAL (W5 not built) + NON-band-neutral.** The chain is a real power
> change when it triggers. The flip is the chip's only explicitly OWNER-gated +
> "non-band-neutral" item -- master-dd's call.

## Why a footprint sweep, not a stochastic N=40

The chain is **deterministic** given terrain + occupant positions (a BFS through
water + a fixed per-tile shock, floored at 1 HP). A stochastic N=40 over RNG seeds
adds nothing -- the band that actually moves is the **geometric reach** (maxDepth)
and how many occupants the wider radius can shock. Worse, the current passive-AI
full-loop harness never positions a caster on a water tile (no lightning-on-water
play, no electrified-terrain encounter authored in the default flow), so an
in-combat N=40 would be **inert** (the I3-style illusory result the team avoids).

So the honest band = a deterministic footprint sweep of the radius-2 vs radius-3
reach on representative water layouts. Probe: `tools/sim/d8-chain-footprint.js`.

## Footprint (probe, shock=2)

| scenario                  | d2 tiles/hits/dmg | d3 tiles/hits/dmg | delta tiles/hits/dmg |
| ------------------------- | ----------------- | ----------------- | -------------------- |
| line-6 (straight reach)   | 2 / 2 / 4         | 3 / 3 / 6         | +1 / +1 / +2         |
| plus-4 (4-dir arms len 4) | 8 / 8 / 16        | 12 / 12 / 24      | +4 / +4 / +8         |
| flood-3 (7x7 water field) | 12 / 12 / 24      | 24 / 24 / 48      | +12 / +12 / +24      |

(occupant on EVERY water tile = worst case for "how many can it shock".)

## Read

- **Realistic delta is small**: in a straight water line the radius-3 chain reaches
  ONE more tile (+1 occupant, +2 damage); a 4-direction puddle reaches +4. These are
  the layouts a real map produces.
- **Worst case is a pathological full-water arena** (flood-3 = a 7x7 all-water field
  with an occupant on every tile): radius 3 doubles the reach (12 -> 24 occupants,
  +24 total chain damage). No authored encounter looks like this; it bounds the
  theoretical ceiling, not expected play.
- **Floor-at-1 invariant holds**: the chain shock is floored at 1 HP per occupant
  -- it NEVER lands a killing blow (no mid-attack death pipeline fires on a chained
  non-target). Friendly-fire is by design (a positioning telegraph).
- **Flag OFF -> byte-identical**: the session.js electrified branch only calls the
  chain helper when `TERRAIN_CHAIN_LIGHTNING_ENABLED='true'`. Default OFF = the
  single-tile electrify burst still fires, the multi-tile chain never does.
- **Inert on current content even ON**: no default-flow encounter authors
  water + a lightning caster, so flipping it ON is band-neutral for TODAY's content
  (mirrors HA1) -- it only bites once an electrified-terrain encounter ships.

## Owner-gate (master-dd)

1. **Ratify caps 3/2** -- DONE in code as PROPOSED (the footprint above is the input).
2. **Flip `TERRAIN_CHAIN_LIGHTNING_ENABLED`** -- OWNER-gated, NON-band-neutral.
   Recommendation: **defer** (consistent with the W5 caveat + the HA1/D6 pattern:
   wire + cap-ratify now, flip when an electrified-terrain encounter exists AND a
   rigorous in-combat band is available post-W5). Reversible either way.

Tests: `tests/services/terrainChainLightning.test.js` + terrain wire = 37/37 green.

See [[project_closeout_master_plan]],
`docs/planning/2026-06-29-closeout-master-plan.md` (O6),
`docs/planning/2026-06-23-residual-gate-register.md`.
