---
title: 'aa01 Sprint-Impronta reconciliation plan (13 branches, master-dd SUPERSEDE override)'
date: 2026-06-22
sprint: aa01-impronta-reconciliation
doc_status: active
doc_owner: claude-code
workstream: cross-cutting
last_verified: '2026-06-22'
source_of_truth: false
language: it-en
review_cycle_days: 90
---

# aa01 Sprint-Impronta -- reconciliation plan

## TL;DR

13 `origin/aa01/cap-*` branches ("Sprint Impronta", L'Impronta onboarding, built
disk-only on Lenovo ~2026-04-25, backed up to origin 2026-06-07, 0 PR ever).
BACKLOG.md:178-185 recorded VERDETTO 2026-06-07 = **SUPERSEDE** (non-canonical).
**2026-06-22 master-dd OVERRIDE**: do NOT delete -- the work must be CORRECTED and
reconciled into the current canon. Nothing deleted, everything evaluated, then
reconciled. Branches stay preserved on `origin/aa01/cap-*` until each is integrated
OR explicitly superseded-with-record. Only CAP-02 is abandoned (gitignored
auto-snapshot).

This doc = the harsh-reviewed execution plan. 3 tracks: A (quick wins,
canon-neutral), B (investigate-then-decide), C (design spec that gates the imprint
code). Sequencing A -> B -> C1 (master-dd ratify) -> C2 (per-piece code).

## Background

"Sprint Impronta Ondata 1" = imprint/onboarding/first-minute system. The 13
branches map to 12 CAP slices (cap-13 has two: imprint-mockup + mockup-ux-patch):

| Branch                                         | Slice      | Nature                                             |
| ---------------------------------------------- | ---------- | -------------------------------------------------- |
| cap-02-tracking-commit                         | CAP-02     | `docs/flint-status.json` auto-snapshot churn       |
| cap-03-readme-pillar-sync                      | CAP-03     | README 1-line pillar text                          |
| cap-04-changelog-create                        | CAP-04     | root `CHANGELOG.md` scaffold (127 LOC)             |
| cap-06-elevation-refactor                      | CAP-06     | `sessionHelpers.js` inline -> helper (13 LOC)      |
| cap-07-terrain-reactions-wire                  | CAP-07     | `terrainReactionsBridge.js` + wiring (358 LOC)     |
| cap-11-biome-resolution                        | CAP-11     | **umbrella** superset (biomeResolver + all above)  |
| cap-12-player-telemetry                        | CAP-12     | `PlayerRunTelemetry` store/route/Prisma            |
| cap-13-imprint-mockup / cap-13-mockup-ux-patch | CAP-13/13b | imprint UX mockup                                  |
| cap-14-onboarding-v2                           | CAP-14     | `onboarding_v2` schema + `/campaign/start/v2`      |
| cap-14b-frontend-imprint                       | CAP-14b    | web `apps/play` onboarding (dead post-Godot-pivot) |
| cap-15-imprint-phase                           | CAP-15     | imprint phase in `coopOrchestrator`                |
| cap-15b-rest-imprint                           | CAP-15b    | REST `/coop/imprint/*`                             |

**Why SUPERSEDE was the original verdict** (still the canon-conflict to reconcile in
C1): the imprint backend implements a NON-canonical onboarding model -- 4 body-part
choices -> biome via `biomeResolver` -- conflicting with canon (1-trait/branco +
biome-via-route-choice), and in 2 places it would REGRESS main: (a) imprint-phase
collapses `character_creation` + `world_setup` which main keeps separate; (b)
host-token start = anti device-authority. Reconciliation does not adopt these as-is;
it extracts the canon-neutral value and re-designs the conflicting parts.

## Per-CAP decisions (master-dd, locked)

- **CAP-02** flint-status.json -> **DROP** (auto-gen snapshot, gitignored in #2927,
  zero content value). Drop-with-record; branch preserved.
- **CAP-03** README pillar-sync -> drop its stale April text; FRESH fix instead:
  README L95 stop inlining pillar status, point to the runtime SoT.
- **CAP-04** CHANGELOG.md -> **ADOPT** the Keep-a-Changelog scaffold as root
  `CHANGELOG.md` (source_of_truth) + bring current (reconstruct May-June arcs).
- **CAP-06** elevation refactor -> **RE-APPLY** inline -> `elevationDamageMultiplier`
  helper on current `sessionHelpers.js` `computePositionalDamage` + regression test
  asserting elevMul identical.
- **CAP-07** terrain bridge -> **RECONCILE vs main** (diff-then-decide, no blind
  merge). Verdict feeds C1 (channel-field coupling).
- **CAP-11** biomeResolver / L'Impronta -> **DESIGN-DIVE SPEC** (C1 core). biome
  stays route-canon; keep separate phases; device-authority; Godot client.
  biomeResolver -> consider repurposing as non-binding biome-AFFINITY (option for
  master-dd, NOT decided here).
- **CAP-12** PlayerRunTelemetry -> **DEFER**, gated; canon-home decided inside C1.
- **CAP-13/13b/14/14b/15/15b** -> SPEC-INPUTS to C1 (gated + preserved). 13/13b =
  UX reference; 14 = backend onboarding to reconcile; 14b = web superseded by Godot
  pivot (target Godot, web = reference only); 15/15b = redesign keeping phases
  separate.

## Harsh-review findings (skeptic pass, 2026-06-22)

The plan above was drafted in a prior session; an independent refute-by-default
review against ground-truth (git diffs of all cap branches + current main source)
produced 10 findings. Verdict: plan SOUND, sequencing correct, no item mis-merged.
Refinements:

- **F1 (LOW, corrected):** helper is at `apps/backend/services/grid/hexGrid.js:235`,
  NOT `services/combat/hexGrid.js` (memory path wrong). cap-06 already imports the
  correct path; no execution impact.
- **F2 (MED -- the refactor-trap):** `elevationDamageMultiplier` applies
  `Math.max(mult, 0.1)` to elevMul ALONE; the inline version floored only the TOTAL
  product `Math.max(0.1, Math.min(2.0, elevMul*flankMul*rearMul))`. Identical for
  defaults (bonus 0.3 / penalty -0.15 -> 1.3 / 0.85, floor never bites); diverges
  only if `1+penalty < 0.1` (penalty < -0.9) or `1+bonus < 0.1`. A1 gate: (a) grep
  all `computePositionalDamage` callers for custom elevationBonus/elevationPenalty;
  (b) regression test pins delta in {>=1, 0, <=-1} with defaults AND
  terrain_defense.yaml values; (c) if any caller passes extreme penalty, flag to
  master-dd as a behavior change (not a refactor).
- **F3 (LOW):** a SECOND inline elevation-mult exists at `sessionHelpers.js:365-392`
  (predict/simulate fn, hardcoded 1.3/0.85, no params). cap-06 does not touch it.
  Keep A1 faithful to cap-06 (computePositionalDamage only); log the predict-fn dup
  as a follow-up finding -- no silent scope-creep.
- **F4 (LOW):** README has TWO pillar-drift points: L95 inline snapshot (A3 target)
  AND L77 "For agents" list pointing to the older `docs/PILLARS_STATUS.md` (6KB) vs
  the runtime SoT `docs/reports/PILLAR-LIVE-STATUS.md` (24KB). A3 de-drifts L95 ->
  SoT only; LEAVE L77 (PILLARS_STATUS.md may be an intentionally distinct
  design-pillars-with-micro-steps doc, not drift) and flag the relationship for
  master-dd.
- **F5 (MED -- biggest Track-A effort/risk):** the CHANGELOG scaffold is M-code /
  milestone-based (M11..M14-A); May-June work is NOT M-coded (SPEC-A..Q suite,
  OD-024 sentience, PHASEC, meta-network, governance) -- tracked by PR#/ticket. A2
  must NOT fabricate M-codes; reconstruct dated arc-blocks sourced from merged PRs /
  BACKLOG closures, bounded to player-/design-visible arcs. An internal
  `docs/planning/changelog.md` (16KB) ALREADY exists -> A2 reconciles/references it
  (no 3rd divergent changelog). Post-Godot-pivot the web client is dead -> frame the
  root CHANGELOG honestly as a repo/backend/design changelog; player-facing client
  notes live in Game-Godot-v2.
- **F6 (LOW):** cap-07 bridge is gated on the absent `ability.channel` field ->
  B1's verdict feeds C1 (channel field = spec input). B1 must also rule on the
  dormant wiring (session.js +8, sessionRoundBridge.js +6), not only the bridge file.
- **F7 (MED):** cap-11 is the umbrella SUPERSET -- it bundles cap-04 (identical 127
  LOC), cap-03, cap-06 (identical 13 LOC), cap-07, biomeResolver, biome_resolution
  yaml, PLUS `agents/agents_index.json` (76 LOC churn) + flint-status.json (60 LOC).
  Implications: Track A content is a SUBSET of cap-11; C2 reconciliation must
  SUBTRACT the Track-A-merged pieces and EXCLUDE the agents_index/flint-status noise
  (not independently justified).
- **F8 (LOW):** new docs need ASCII-first + frontmatter + registry same-PR (strict
  CI); no forbidden paths touched (README, CHANGELOG, BACKLOG, sessionHelpers in
  apps/backend, planning doc + registry); no overlap with the 3 open sibling chips
  (bestiary #2943 / register-9-docs / TKT-P6 traits).
- **F9 (LOW):** split Track A into 2 PRs -- PR-code (A1, test-baseline gate) vs
  PR-docs (A2 + A3 + this plan + BACKLOG + registry, governance gate). Mixing code +
  docs muddies review surface and the auto-merge L3 gate classes.
- **F10 (gate):** C1 is a spec doc only this session. It enumerates the 2
  MUST-NOT-REGRESS canon constraints (phase-collapse, host-token start) + the
  Godot-target (web = ref-only), and presents the biome-affinity repurpose as an
  OPTION for master-dd -- the L'Impronta design call is NOT made here.

## The plan (refined)

Principle: NO branch deleted until its work is integrated OR explicitly
superseded-with-record; branches preserved on origin throughout. Only CAP-02
abandoned.

### Track A -- quick wins (canon-neutral). 2 PRs.

**PR-code (branch `refactor/cap06-elevation-helper`):**

- **A1 CAP-06**: re-apply inline -> `elevationDamageMultiplier({attackerElevation,
targetElevation, bonus, penalty})` in `sessionHelpers.js` `computePositionalDamage`
  (current ~L728). Import from `../services/grid/hexGrid`. Acceptance: caller-param
  audit (F2a) + regression test (F2b) green + existing combat/elevation suites green
  - `npm run format:check`. If F2c triggers, STOP + flag master-dd.

**PR-docs (branch `docs/aa01-impronta-reconciliation`):**

- **A2 CAP-04**: adopt the scaffold as root `CHANGELOG.md`, update `last_verified` to
  2026-06-22, append dated May-June arc-blocks (no fabricated M-codes, sourced from
  merged PRs / BACKLOG), reconcile with `docs/planning/changelog.md`, honest
  Godot-pivot framing. Registry entry same PR.
- **A3 CAP-03**: README L95 -> replace inline pillar snapshot with a pointer to
  `docs/reports/PILLAR-LIVE-STATUS.md` (runtime SoT). Leave L77; flag PILLARS_STATUS
  relationship.
- **+ this plan doc + BACKLOG entry + docs_registry.json** entries.

### Track B -- investigate-then-decide.

- **B1 CAP-07**: diff `terrainReactionsBridge.js` (cartesian<->hex) + its dormant
  wiring vs main's current `terrainReactions.js` + session/round wiring. Produce a
  verdict {integrate / superseded / defer-to-channel-spec}. Note the channel-field
  coupling to C1. No merge before the verdict. Output = a short verdict section
  appended here or a sibling note.

#### B1 verdict (executed 2026-06-22): SUPERSEDED

Ground-truth diff of `origin/aa01/cap-07-terrain-reactions-wire` vs current
`origin/main` REFUTES the premise that the bridge is "gated on an absent
`ability.channel` field". On current main the terrain-reaction system is
already LIVE and STATEFUL:

- `apps/backend/routes/session.js:1164-1195` -- `action.channel` (fuoco/ghiaccio/...)
  -> `CHANNEL_TO_ELEMENT` -> `reactTile` -> persisted in `session.tile_state_map`
  -> burst damage applied to `target.hp`. `ability.channel` is NOT absent; it
  drives live reactions.
- Persistent map: `session.tile_state_map` (init `session.js:2160`, exposed in the
  session view `sessionHelpers.js:504`).
- Round-end TTL decay: `sessionRoundBridge.js:1155-1180` decrements ttl, reverts to
  `normal`, emits `terrainDecayEvents` -- functionally IDENTICAL to CAP-07's
  `decayTileStates`, already shipped.
- `chainElectrified` helper exists + is exported on main (`terrainReactions.js:127,185`).

CAP-07's `terrainReactionsBridge.js` is a strictly-inferior PARALLEL build:

- It uses `session.tileStateMap` (camelCase) which would COLLIDE/DIVERGE with main's
  live `session.tile_state_map` (snake_case) -- two maps, one live, one dead.
- Its populator `applyTerrainReaction` is NEVER CALLED in cap-07 (grep: 0 call sites
  outside the bridge def + its test). The session.js comment claims it mutates the
  map "quando ability con channel colpisce", but the cap-07 wiring diff only adds
  `tileStateMap: {}` (init) + `decayTileStates` (round-end) -- never the populate
  call -> the camelCase map stays empty -> `decayTileStates` is a no-op. Dead even
  inside cap-07.
- `decayTileStates` duplicates main's `sessionRoundBridge.js:1155-1180` decay.

**Decision: SUPERSEDED.** Main already shipped the complete stateful terrain-reaction
system, better integrated (single live snake_case map, inline populate, round-end
decay). Do NOT merge the bridge (would introduce a dead duplicate camelCase map +
redundant decay). Branch `origin/aa01/cap-07-terrain-reactions-wire` preserved-with-record.

**One carve-out DEFERRED (forward-work, NOT this reconciliation):** chain-lightning
propagation -- `chainElectrified` BFS over the persistent map on a `chain_trigger` /
electrified tile -- is the only genuinely-unbuilt sub-feature (main has the helper but
no call site wires multi-tile chaining from `session.js`). Integrating it is a
design/balance call (chain spread radius + per-tile damage), NOT a mechanical merge ->
logged as a balance/spec follow-up. The F6 "channel-field coupling to C1" is RESOLVED:
the channel field is canon-live, not a spec gap.

### Track C -- design spec (gates imprint code).

- **C1**: write the L'Impronta reconciliation SPEC (master-dd-gated). Inputs: CAP-11
  biomeResolver (core) + CAP-13/13b/14/14b/15/15b + CAP-12 telemetry. The spec maps
  every canon conflict, states the MUST-NOT-REGRESS constraints, proposes
  reconciliation OPTIONS (incl. biomeResolver -> biome-affinity, telemetry
  canon-home), and targets the Godot client. The design call is master-dd's;
  the spec does not implement imprint code.
- **C2** (out of scope this session): per-piece code reconciliation PRs, AFTER C1 is
  ratified. C2 must subtract Track-A-merged pieces (F7).

## Sequencing and risks

Sequencing: A (now) -> B -> C1 (master-dd ratify) -> C2.

Risks validated:

- A1 helper must give EXACT same elevMul or it is a balance change, not a refactor
  -- F2 test + caller audit gate it.
- A2 reconstructing ~8 weeks of changelog = effort/accuracy -- bounded to
  player/design-visible arcs, sourced from git/PR/BACKLOG, no fabricated M-codes.
- C1 branches are ~8 weeks stale -> the imprint code is REFERENCE likely-to-rewrite
  post-spec, NOT cherry-pick (cap-06 is the one clean exception, a faithful 13-LOC
  re-apply).
- Preservation keeps the 13 branches flagged by the weekly drift audit until Track C
  integrates them (accepted). This plan doc is registered so the audit can cross-ref
  the disposition.

## Branch preservation policy

- No `aa01/*` branch is deleted in this plan.
- CAP-02 is the only "drop" -- recorded here, branch still preserved on origin.
- A branch is eligible for retirement ONLY after its work is integrated (PR merged)
  OR a superseded-with-record entry exists (this doc + BACKLOG).

## Status / next entry point

- Track A: PR-code #2958 (CAP-06) + PR-docs #2959 (plan + CAP-03/04) opened + verified
  (554/554 AI baseline, governance errors=0), awaiting master-dd merge.
- Track B: B1 DONE -- verdict SUPERSEDED (main shipped the stateful terrain system; cap-07
  bridge = dead duplicate). Carve-out chain-lightning = deferred balance/spec follow-up.
- Track C: C1 spec WRITTEN (review_needed, master-dd-gated) --
  [`2026-06-22-aa01-cap11-limpronta-reconciliation-spec.md`](2026-06-22-aa01-cap11-limpronta-reconciliation-spec.md);
  3 open design calls (biomeResolver disposition / imprint-beat shape / telemetry
  canon-home). C2 code pending ratification.
- Do NOT make the L'Impronta design call autonomously (subjective, master-dd).
