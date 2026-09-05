---
title: 'Move terrain-cost substrate phase 0 (#3006) -- adversarial review'
date: 2026-06-23
doc_status: active
doc_owner: claude-code
workstream: combat
last_verified: '2026-06-23'
source_of_truth: false
review_cycle_days: 90
tags: [combat, movement, terrain-cost, substrate, review, verify-first]
---

# Move terrain-cost substrate phase 0 (#3006) -- adversarial review

> Verify-first review of master-dd's substrate phase 0 (`840f35ef`, merged), at the
> request of the derived-canon salvage continuation (the salvage trait kit's last 2.5
> modes are gated on this substrate). Refute-by-default; every finding ground-truthed.
> Verdict: **phase 0 is clean -- ship as-is. No P1/P2. 3 P3 hardening notes + 1
> coordination flag that materially affects the salvage plan.**

## Scope reviewed

- `apps/backend/services/combat/moveCost.js` (Dijkstra, 4-neighbour, terrain-only)
- `apps/backend/services/combat/movementProfiles.js` (W6 yaml loader + safe default)
- `apps/backend/services/combat/movementResolver.js` (profile resolution + volo grades)
- 4 test files (24 tests, all green) + design spec `2026-06-23-move-terrain-cost-substrate-design.md`.

## Verified-good (refuted concerns)

1. **Band-neutral claim TRUE.** Grepped every non-test consumer: ZERO. The only require is
   `movementResolver -> movementProfiles` (internal). `hexGrid.js:71` is a local var named
   `moveCost`, not a consumer. Phase 0 is genuinely inert at runtime -> AI baseline 557/557
   byte-stable holds. The "all-default terrain -> cost == Manhattan" invariant is locked by
   `moveTerrainBandNeutral.test.js` across morphotypes corazzato/volante/null.
2. **Dijkstra correctness.** Lazy-deletion frontier (stale-skip at L55) + dest-pop early return
   (L53) is optimal for non-negative weights. yaml multipliers are all >= 1.0 (min = default 1.0),
   so the precondition holds on real data. 0-cost edges would be safe too (strict `<` re-push
   guard prevents a 0-weight re-push loop). Terrain never hard-blocks (hazard = high cost, design
   sez.D) so a connected grid is always reachable; `Infinity` only on OOB (L32-33). Correct.
3. **volo grade math.** g1 frees normal terrain, g2 halves the hazard penalty (`1 + (mult-1)/2`,
   2.0->1.5), g3 frees hazard. `default` clamped `min(mult,1.0)` so volo never worsens. Matches
   design verdict D (graded). g0 / no-trait returns the profile unchanged (deepEqual test).

## Findings (all P3 -- hardening, non-blocking)

- **P3 `moveCost.js:_enterCost`** -- no clamp on non-positive multipliers. A *negative* terrain
  multiplier (nonsensical, but yaml is human-authored) would break Dijkstra pop-optimality. Cheap
  guard: `Math.max(0, m[type] ?? base)` in `_enterCost`, or an author-time validator on the yaml.
  Latent (no current data triggers it).
- **P3 `movementProfiles.js:67-68`** -- `DEFAULT_PROFILE` / `PROFILE_NAMES` are captured at module
  import via `load()`. After `_resetCache()` + a different yaml, these consts are stale, so
  `resolveMovementProfile`'s `PROFILE_NAMES.includes(explicit)` (L29) would miss newly-loaded
  profiles. Test-only footgun (prod yaml is static, never reset). Make them getters, or re-read
  inside `resolveMovementProfile`, if phase-1 tests start swapping yamls.
- **P3 doc drift** -- design sez.B/3 signature `moveCost(from, dest, profile, terrainGrid)` differs
  from the impl `moveCost(from, dest, profile, terrainAt, bounds)` (curried lookup fn + explicit
  bounds). The impl shape is fine (more testable); update the spec so phase-1 wiring reads true.

## Coordination flag (NOT a bug -- materially affects the salvage plan)

The salvage doc lists **4 substrate-gated modes** to "build on top": `adattamento_volo` I-III,
`radici_ancora_planare`, `eco_sismico`, `membrane` terrain-heal. Ground-truth on this substrate:

- **volo + radici are OWNED by the substrate workstream** -- this design's phases 2-3 explicitly
  author `adattamento_volo` (with `grade`) and `radici_ancora_planare` (anchor/DR), and the
  resolver ALREADY ships `applyVoloGrade` / `evaluateVoloGrade`. If the salvage session also builds
  volo/radici, that is a double-build collision (anti-pattern #19; the design's own sez.5 flags the
  overlap with "la sessione trait-mechanics"). **Recommendation: volo + radici belong to the
  substrate phases; the salvage side should NOT re-author them.**
- **eco_sismico + membrane terrain-heal are NOT in this substrate design at all.** They consume the
  terrain primitives this substrate provides but need their own design + build. They remain the
  genuine salvage-side net-new -- and only after the move-gate wire (phase 1) exists.

Net: once phase 1 (move-gate wire) lands, the salvage-side remaining work narrows from "4 modes"
to **eco_sismico + membrane terrain-heal (+ their design)**; volo + radici close inside the
substrate workstream. Sequencing call (master-dd): who authors volo/radici, and is the salvage
plan re-scoped to the 2 net-new tile/terrain modes?

## Recommendation

Phase 0 ships as-is (no blocking issues). Optionally fold the 3 P3 hardening notes into phase 1.
Resolve the volo/radici ownership question before either session authors those 2 traits.
