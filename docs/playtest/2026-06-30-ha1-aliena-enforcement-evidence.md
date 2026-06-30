---
title: 'HA1 aliena_enforcement strength evidence + flip-safety (SPEC-H, Tier-3 N2)'
workstream: ops-qa
category: playtest
doc_status: active
doc_owner: claude-code
last_verified: '2026-06-30'
language: en
tags: [playtest, spec-h, aliena, enforcement, guardrail, n40]
---

# HA1 aliena_enforcement -- strength evidence + flip-safety (Tier-3 lane N2)

SPEC-H HA1 = the ALIENA soft-enforcement flip. When
`policy.aliena_enforcement = {enabled:true, strength>0}`, reinforcement spawn
weights are modulated by each pool entry's ALIENA coherence aggregate:
`factor = max(0.0001, 1 - strength*(1 - aggregate))`
(`apps/backend/services/combat/biomeSpawnBias.js:261`). `strength` is a continuous
knob [0,1], default 0 (off). Machinery + surface COMPLETE (#2828-#2835); this is
the flip-gate evidence. Probe: `tools/sim/aliena-enforcement-probe.js`.

## Verify-first finding -- HA1 is a GUARDRAIL, not a balance lever

A naive combat N=40 on `enc_badlands_pilot_01` would have been an **I3-style
illusory result**. Computing the real coherence aggregates of the authored
badlands reinforcement pool (real `scoreAlienaCoherence` on real pool data):

| pool entry                                                                              | aggregate           |
| --------------------------------------------------------------------------------------- | ------------------- |
| sand-burrower / rust-scavenger / echo-wing / ferrocolonia-magnetotattica / dune-stalker | 0.5 (ALL identical) |

Every entry scores the **same** aggregate (bare pool entries -> identical
plausibilita/coerenza_eco/ancoraggio sub-scores). A uniform aggregate means a
**uniform factor** -> all spawn weights scale by the same number -> the relative
weighted-random distribution is **unchanged at any strength** -> enforcement is
**INERT on the real pool**. A combat N=40 would read "band-neutral" for the WRONG
reason (no differential effect), masking the no-op.

**Consequence**: enforcement only does anything on a pool whose entries have
VARYING coherence (a procedurally-generated pool, or an authoring mistake that
drops an off-biome species into a pool). On today's well-authored, coherence-
uniform pools it is inert. So **flipping `aliena_enforcement` ON is band-safe by
construction for current content** -- it is a future-facing guardrail, not a
balance change.

## Mechanism demonstration (synthetic coherence-varied pool)

To show the re-weighting DOES work when coherence varies, a synthetic 2-entry pool:
`coherent_native` (in canonical pool + narrative-anchored -> aggregate 0.6) vs
`incoherent_alien` (not canonical + no narrative -> aggregate 0.1), equal base
weight (so strength 0 = 1:1 baseline; divergence at strength>0 is purely the
aliena factor):

| strength | coherent w | incoherent w | incoherent share | suppression |
| -------- | ---------- | ------------ | ---------------- | ----------- |
| 0.00     | 1.00       | 1.00         | 50.0%            | 0%          |
| 0.25     | 0.90       | 0.775        | 46.3%            | 13.9%       |
| 0.50     | 0.80       | 0.550        | 40.7%            | 31.3%       |
| 0.75     | 0.70       | 0.325        | 31.7%            | 53.6%       |
| 1.00     | 0.60       | 0.100        | 14.3%            | 83.3%       |

Monotone in strength, bounded (floored at 0.0001 -> an incoherent entry is never
fully excluded; weighted-random anti-determinism is preserved, per the design doc).

## Recommendation

- **Flip**: `aliena_enforcement` is safe to enable -- inert on current content
  (proven above), active only as a guardrail on future coherence-varied pools.
- **Strength = 0.5** (recommended default): a moderate guardrail -- ~31%
  suppression of a fully-incoherent entry, which still spawns ~41% of the time vs
  a coherent peer. Picks: 0.25 = light nudge, 0.5 = moderate, 0.75 = strong,
  1.0 = near-exclusion (still 14% share). This is a feel/policy choice -- the curve
  is the input, master-dd ratifies the value (L-069 lock = data; here the "data" is
  the deterministic re-weighting curve, since combat is unaffected on real pools).

## Owner-gate (master-dd)

1. **Ratify strength** (recommended 0.5) -- guardrail aggressiveness, reversible.
2. **Flip** `policy.aliena_enforcement.enabled` (per-encounter) or a global default
   -- band-safe (inert on current pools). Reversible.

NOTE: because enforcement is inert on the only authored pools, there is no combat
N=40 band to ratify here -- the gate is the re-weighting curve + the flip-safety
proof, not a win-rate band. An optional belt-and-suspenders combat N=40 (inject
`aliena_enforcement` into a varied pool + run) would confirm combat-neutrality but
adds no new signal (the weighting math is exercised directly above).

See [[project_spec_h_codex_surface]],
`docs/design/evo-tactics-aliena-enforcement-lore.md`,
`docs/planning/2026-06-29-closeout-master-plan.md` (N2).
