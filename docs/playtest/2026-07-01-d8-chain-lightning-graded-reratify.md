---
title: 'D8 chain-lightning -- graded re-ratify (W5): NULL by non-exercise (flag inert in sim)'
workstream: ops-qa
category: playtest
doc_status: review_needed
doc_owner: claude-code
last_verified: '2026-07-01'
language: en
tags:
  [playtest, calibration, d8, chain-lightning, terrain, n40, graded, w5, ai-driven, non-exercise]
---

# D8 chain-lightning -- graded re-ratify (W5)

W5 continuation, **lead mechanic** (master-dd grilling 2026-07-01). D8 was chosen to lead the graded
re-ratify because -- UNLIKE ER6's structurally-inert flag -- the chain is an ACTIVE mechanic when it
fires (a multi-tile shock spreading across electrified water terrain), so it was the decisive test of
whether the W5 graded metrics find a REAL band or another null before the expensive W6.

## TL;DR verdict

**NULL by non-exercise.** D8 chain-lightning (`TERRAIN_CHAIN_LIGHTNING_ENABLED`, caps 3/2, maxDepth 3,
PR #3121) is **band-neutral on current AI-sim content** because it is **structurally unreachable** by
the AI harness: across N=40 flag-ON hardcore encounters the terrain-reaction system fires **0 times**
(0 chain spreads, 0 electrify reactions, 0 `reactTile` calls at all). The flag gates dead code in the
sim -- even more inert than ER6 (whose overrun event at least fired). Per the grilling Q2 contingency
(NULL -> autonomous confirm + doc + proceed), no owner decision is required and nothing flips. The cap
3/2 ratify basis remains the deterministic footprint sweep (`tools/sim/d8-chain-footprint.js`, #3121),
which bounds the geometric worst-case the chain WOULD have IF an encounter ever exercised it.

## Why the chain is structurally unreachable

The chain fires only on `lightning + water -> electrified + chain_trigger`
(`terrainReactions.reactTile`): a lightning-channel attack landing on a tile that is ALREADY `water`,
with adjacent water tiles that carry occupants. In an AI-sim fight none of the three preconditions is
ever met:

- **Player policy emits no channel.** `combat-policy.selectPlayerAction` returns only
  `{action_type:'attack'|'move'}` -- never a `channel` field. The resolver defaults to `fisico`, which
  is not in `CHANNEL_TO_ELEMENT` (only fuoco/ghiaccio/acqua/elettrico map), so a player attack triggers
  no terrain reaction.
- **Enemy AI never picks water/lightning.** `declareSistemaIntents.pickExploitChannel(target)` returns
  the target's vuln channel from `ARCHETYPE_VULN_CHANNEL = { corazzato:psionico, bioelettrico:fisico,
psionico:fisico, termico:ionico, adattivo:null }` -> only `psionico`/`fisico`/`ionico` (or the
  `fisico` fallback). None of those is in `CHANNEL_TO_ELEMENT` either, so an enemy attack also triggers
  no terrain reaction.
- **Nothing seeds water.** `session.tile_state_map` inits empty and only gains a `water` tile when an
  `acqua`-channel attack lands (`water + normal -> puddle`). That channel is never emitted, so the map
  stays empty for the whole fight.

Net: neither faction ever emits a mapped elemental channel, so `reactTile` is never called, no tile
ever becomes `water` or `electrified`, and the chain branch (gated by `isChainLightningEnabled`) is
never entered. The flag is inert. (This is a property of the ENTIRE M14-A terrain-reaction system in
AI-sim play, not just D8 -- the sim has no elemental-channel driver.)

## Evidence A -- fire-count (DECISIVE)

`tools/sim/d8-chain-fire-count.js` patches the `terrainReactions` exports with counting wrappers
BEFORE `app.js`/`session.js` is required (so `session.js`'s destructured bindings capture the
wrappers), runs N=40 hardcore encounters with the flag ON, and reports how many times the terrain
system fires. This is the airtight arbiter -- a DELTA of zero cannot be argued away as noise.

```
D8_FIRE_COUNT = {
  "N": 40, "scenario": "enc_hardcore_reinf_01", "biome": "abisso_vulcanico", "flag": "true",
  "reactTile_calls": 0,        // the terrain-reaction fn is never even called
  "reactTile_mapped_hits": 0,  // no channel ever maps to an element
  "electrify_reactions": 0,    // no lightning+water electrify ever happens
  "chain_branch_calls": 0,     // the electrified chain branch is never entered
  "chain_spreads": 0,          // the multi-tile chain never spreads (the flagged effect)
  "chain_non_exercised": true
}
```

Zero across the board -> the flag gates dead code -> any graded delta is noise by construction.

**Instrument positive control (closes the false-null hole).** A monkeypatch that failed to bind
would ALSO report 0, masking a broken instrument as a real null. Before the measurement the script
runs a self-test that drives the terrainReactionsWire acqua->folgore sequence (p1 puddles the sis
tile then electrifies it, same turn) and asserts the counters MOVE -- it prints
`instrument self-test OK: reactTile+2, chain_branch+1, electrified` and THROWS otherwise. The patch
provably counts >0 under a known-firing condition, so the 0 across N=40 realistic runs is a REAL
null, not an instrument failure.

## Evidence B -- graded A/B (corroborating; and a cautionary tale)

`tools/sim/d8-chain-graded-probe.js` -- ER6-probe pattern, per-arm child-process isolation
(drift-free), same seeds, ER6 hardcore measurement point (`enc_hardcore_reinf_01` / `abisso_vulcanico`
/ pressure 30 / duo_hardcore -- the busiest realistic fight). Arms: `off`, `off2`, `off3` (two
independent same-config noise replicates), `on`. N=40, node 22. Artifact:
`reports/sim/d8-chain-graded-n40.json`.

| arm                    | win_rate | enemy_hp_rem | hp_rem | ko_rate | rounds |
| ---------------------- | -------- | ------------ | ------ | ------- | ------ |
| chain OFF              | 1.0      | 0.0          | 0.9904 | 0.0     | 36.45  |
| chain OFF2 (replicate) | 1.0      | 0.0          | 0.9913 | 0.0     | 35.95  |
| chain OFF3 (replicate) | 1.0      | 0.0          | 0.9904 | 0.0     | 36.23  |
| chain ON               | 1.0      | 0.0          | 0.9879 | 0.0     | 36.38  |

D8 effect (on-off): `hp_remaining -0.0025`, all other channels exactly 0. Noise floor spread
(off2-off / off3-off): up to `0.0009`. `enemy_hp_remaining` saturates to 0 (the party always clears
the fight) and `ko_rate`/`win_rate` are pinned, so `hp_remaining` is the only live channel.

**The cautionary tale**: this run's `on-off` (0.0025) marginally EXCEEDS the tight noise floor
(0.0009), and across runs the ON arm sat ~0.003 below the OFF family -- which, taken alone, a naive
reader could mistake for a small friendly-fire band. It is not: the fire-count proves 0 chain fires,
so ON and OFF are the SAME code path and the sub-0.3% gap is pure sampling of the sim's irreducible
non-seed non-determinism (the OFF replicates themselves drift ~0.4 rounds run-to-run; a single ON
replicate under-samples it). This is exactly the W5 lesson made concrete: **the graded metric adds
discriminating power ONLY on power-differential mechanics; on a structurally-inert flag it just
measures noise, and the honest verdict comes from the fire-count, not the delta.**

## Evidence C -- footprint (the real cap-3/2 ratify basis, unchanged)

The chain BFS is deterministic given terrain + occupant positions, so the cap 3/2 (maxDepth 3) was
ratified in #3121 via a geometric footprint sweep, NOT a stochastic N=40 -- and that remains the
correct instrument. `tools/sim/d8-chain-footprint.js` enumerates representative water layouts and
reports the per-strike delta of maxDepth 2 (as-built) vs 3 (verdict): the worst-case lethality the
flip would introduce IF a fight ever exercised it. The graded re-ratify does not disturb that basis --
it only establishes that current sim content never reaches the mechanic, so there is no live band to
re-ratify.

## What this means

- **D8 stays flag-OFF.** No prod change. The cap 3/2 values remain PROPOSED, ratified geometrically by
  the footprint; there is no sim-measurable live band to add.
- **A real live band would require content** the game does not have: an encounter that seeds water
  terrain AND an agent (player or enemy) that emits `acqua`/`elettrico` channels onto it. Until such
  content exists, D8 is band-neutral in AI-sim play by construction. (Tracked as a follow-up thought,
  not a blocker.)
- **The mechanic is live + correct**, just not exercised: `tests/services/terrainChainLightning.test.js`
  (27 assertions incl. flag gating, cap 3/2, chain spread, floored shock) and
  `tests/api/terrainReactionsWire.test.js` (live acqua->folgore->electrified) all pass.
- **W5 proceeds to W6** (form-pulse graded re-ratify -- a genuine power-differential lane) per the
  grilling sequence.

## Reproduce (node 22, in-process supertest, no prod port)

```
# Decisive non-exercise proof (grep the sentinel out of the boot logs):
node tools/sim/d8-chain-fire-count.js 40 | grep '^D8_FIRE_COUNT='

# Graded A/B (isolated arms -> reports/sim/d8-chain-graded-n40.json):
node tools/sim/d8-chain-graded-probe.js 40

# Geometric cap 3/2 footprint (the ratify basis, #3121):
node tools/sim/d8-chain-footprint.js
```

Commit `31e39160` | node v22.22.3 | flag `TERRAIN_CHAIN_LIGHTNING_ENABLED` stays OFF (this measures,
never flips).
