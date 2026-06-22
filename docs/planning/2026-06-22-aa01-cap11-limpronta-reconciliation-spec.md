---
title: "L'Impronta reconciliation spec (CAP-11 core + onboarding/telemetry inputs) -- master-dd-gated"
date: 2026-06-22
sprint: aa01-impronta-reconciliation
doc_status: review_needed
doc_owner: claude-code
workstream: cross-cutting
last_verified: '2026-06-22'
source_of_truth: false
language: it-en
review_cycle_days: 90
---

# L'Impronta reconciliation spec (C1)

> **Status: review_needed -- master-dd ratification PENDING.** This is an OPTIONS
> spec, not a decision. The subjective L'Impronta design call (which onboarding
> model the game ships) is master-dd's. This doc maps the canon conflicts, states
> the MUST-NOT-REGRESS constraints, and lays out reconciliation options per
> component so master-dd can decide. No imprint code is implemented until this spec
> is ratified (-> Track C2). Parent plan:
> [`2026-06-22-aa01-impronta-reconciliation-plan.md`](2026-06-22-aa01-impronta-reconciliation-plan.md).

## 1. Purpose + boundary

The 13 `aa01/cap-*` branches built a "L'Impronta" onboarding system (Jackbox-style
first-minute) disk-only ~2026-04-25. The original verdict was SUPERSEDE
(non-canonical); master-dd overrode it to CORRECT + reconcile. CAP-11 (biomeResolver)
is the core conflict; CAP-13/13b/14/14b/15/15b + CAP-12 are inputs. This spec does
the design-dive but stops at OPTIONS -- the pick is master-dd's.

## 2. Inputs (what the branches actually built)

Verified by `git show` against each branch (line counts approximate):

- **CAP-11 biomeResolver** -- `apps/backend/services/imprint/biomeResolver.js` (149).
  `resolveBiome({ locomotion, offense, defense, senses }, opts)` ->
  `{ biome_id, base_biome_id, applied_modulations }`. Model
  `data/core/imprint/biome_resolution.yaml`: 4 binary body-part axes (locomotion
  VELOCE|SILENZIOSA, offense PROFONDA|RAPIDA, defense DURA|FLESSIBILE, senses
  LONTANO|ACUTO) -> 16 combos -> 7 core biomes via base lookup + optional
  team-composition modulation ("Pattern D hybrid", ~20% canalization target).
- **CAP-14 onboarding_v2** -- `/campaign/start/v2` route + `campaignLoader.js` (+15) +
  `data/core/campaign/default_campaign_mvp.yaml` (+61) + the imprint web mockup
  `prototypes/imprint-v2/index.html` (1015). Bundles biomeResolver + telemetry store
  (umbrella-ish, like cap-11).
- **CAP-13/13b** -- imprint UX mockup (visual reference only).
- **CAP-14b** -- web `apps/play` `onboardingPanelV2` (frontend). **Superseded by the
  Godot pivot (2026-04-29)**; reference only.
- **CAP-15 / 15b** -- imprint PHASE in `coopOrchestrator` + REST `/coop/imprint/*`
  (tests `coopOrchestratorImprintV2.test.js`, `coopImprintRest.test.js`).
- **CAP-12 PlayerRunTelemetry** -- `services/telemetry/playerRunTelemetryStore.js`
  (172) + `routes/playerTelemetry.js` (70) + `prisma/schema.prisma` (+22, a new
  model) + `app.js` mount (+6) + session wiring. Persists `vcSnapshot` +
  `selectedForm` cross-run (aligned ADR-2026-06-07 pt3). Standalone, canon-neutral
  in mechanism; only the canon-home is open.

## 3. Current canon (the truth to reconcile against)

- **Biome selection = route-choice**, NOT derived from body parts. The meta-network
  routing graph (GAP-C, flag-gated) selects the biome via co-op route-vote across a
  node graph of canonical biomes. Biome is an emergent route outcome, not a
  character-creation product.
- **Character creation = 1 trait + branco** (canonical onboarding), not a 4-axis
  body-part questionnaire.
- **Phases are separate**: the coop orchestrator runs
  `lobby -> character_creation -> world_setup -> combat -> debrief -> ended`.
  `character_creation` (who you are) and `world_setup` (where/how the run is framed)
  are distinct phases.
- **Device-authority** (SPEC-K): per-device/per-player authority + quorum; NO
  host-token-drives-start. Onboarding/imprint must be device-authoritative.
- **Client = Godot** (Game-Godot-v2). The web `apps/play` client is retired
  post-pivot; any surface targets Godot. Web mockups = visual reference only.

## 4. Conflict map (imprint-as-built vs canon)

| Imprint-as-built (aa01)                             | Canon (current)                           | Conflict                        |
| --------------------------------------------------- | ----------------------------------------- | ------------------------------- |
| 4 body-part choices -> `biomeResolver` -> biome_id  | biome = route-choice (emergent)           | **HARD** (biome source)         |
| 4-axis questionnaire defines the creature           | char-creation = 1 trait + branco          | **HARD** (char model)           |
| imprint phase collapses char-creation + world_setup | two SEPARATE phases                       | **HARD** (phase regression)     |
| host-token starts the run                           | device-authority + quorum (no host-token) | **HARD** (authority regression) |
| web `apps/play` onboardingPanelV2 (CAP-14b)         | Godot client                              | **SUPERSEDED** (target)         |
| `PlayerRunTelemetry` (vcSnapshot + selectedForm)    | aligned ADR-2026-06-07 pt3; no canon-home | **SOFT** (home undecided)       |

## 5. MUST-NOT-REGRESS constraints (non-negotiable in any option)

1. Biome stays route-canon -- reconciliation MUST NOT make biome a deterministic
   function of body-part choices.
2. `character_creation` and `world_setup` stay SEPARATE phases -- no collapse.
3. Device-authority preserved -- no host-token-drives-start; onboarding is
   per-device + quorum-gated.
4. Target Godot -- no new web `apps/play` onboarding surface; web = reference only.
5. Additive + flag-gated by default -- any new onboarding path ships behind a flag,
   band-neutral until ratified (mirror the OD-024 / lethal / meta-network pattern).

## 6. Reconciliation options (per component) -- master-dd decides

### 6.1 biomeResolver (CAP-11 core)

The 4-tuple -> biome lookup conflicts canon (biome is route-derived, not
body-derived). Options:

- **Option A -- repurpose as non-binding biome-AFFINITY (recommended framing).**
  Keep the 4-axis -> distribution data, but it produces a soft AFFINITY/weighting
  signal (e.g. nudging route-vote presentation, encounter flavor, or a cosmetic
  "your branco leans toward X" hint), NEVER a binding biome assignment. Satisfies
  constraint 1. `resolveBiome` becomes `biomeAffinity()` returning weights, consumed
  read-only. Biome still comes from route-choice.
- **Option B -- retire biomeResolver, keep the YAML as design data.** Drop the
  resolver; archive `biome_resolution.yaml` as a reference mapping (museum/curated).
  No runtime use. Simplest; loses the affinity idea.
- **Option C -- defer entirely.** No reconciliation now; branch preserved; revisit if
  an affinity surface is ever wanted.

> Master-dd call: A vs B vs C. (A preserves the work as a canon-safe signal; B/C
> discard the mechanism.)

### 6.2 Onboarding phase model (CAP-14 / 15 / 15b)

The imprint phase collapses char-creation + world_setup and uses host-token start
(constraints 2 + 3). Options:

- **Option A -- redesign as an ADDITIVE pre-phase, phases kept separate.** An
  optional "imprint" beat BEFORE `character_creation` (or folded into `world_setup`
  framing) that NEVER merges the two phases and is device-authoritative + quorum.
  `/campaign/start/v2` reworked to device-authority (no host-token). Preserves the
  Jackbox first-minute feel without the regressions.
- **Option B -- discard the phase/REST work; harvest only the copy/UX.** Treat
  CAP-15/15b as superseded; lift only mockup/UX ideas into the Godot onboarding.
- **Option C -- defer.**

> Master-dd call: does the game want a distinct "imprint" onboarding beat at all, and
> if so, A's additive-separate-phase shape?

### 6.3 onboarding_v2 backend (`/campaign/start/v2`, campaignLoader, default_campaign_mvp)

Mostly canon-neutral plumbing IF decoupled from biomeResolver-binding + host-token.
Option: reconcile `/campaign/start/v2` to (a) device-authority, (b) no body-part->biome
binding (consume 6.1's affinity at most), (c) separate phases. Gate behind 6.2's
decision. Otherwise defer.

### 6.4 PlayerRunTelemetry canon-home (CAP-12) -- folded here per plan

Mechanism is canon-aligned (vcSnapshot + selectedForm, ADR-2026-06-07 pt3); only the
home is open. Options for canon-home:

- **Option A -- session/telemetry workstream, standalone store + route + Prisma model**
  (as built), flag-gated read/write, NOT tied to the imprint model. Lifts cleanly
  regardless of 6.1/6.2.
- **Option B -- fold into the existing chronicle/VC telemetry path** rather than a
  new Prisma model (avoid a parallel store).
- **Option C -- defer until an onboarding decision exists** (the plan's current
  default: DEFER, gated).

> Master-dd call: A (standalone lift now) vs B (fold) vs C (keep deferred). Note: a new
> `prisma/schema.prisma` model = migration = forbidden-path / master-dd manual + ADR.

### 6.5 UX (CAP-13/13b + CAP-14b web mockup)

Reference only. The 1015-LOC web mockup + UX patches inform a Godot onboarding
surface but are NOT ported to web. Action: catalog as UX reference (museum/curated);
no code reconciliation.

## 7. Open design calls for master-dd (explicit)

1. biomeResolver disposition: affinity (6.1-A) / retire (6.1-B) / defer (6.1-C)?
2. Is there a distinct "imprint" onboarding beat, and if so the additive-separate
   shape (6.2-A)?
3. PlayerRunTelemetry canon-home: standalone (6.4-A) / fold (6.4-B) / defer (6.4-C)?
   (If standalone with the Prisma model -> migration = ADR + manual merge.)

## 8. Sequencing to C2 (post-ratification only)

After master-dd ratifies sections 6.x, C2 = per-piece code reconciliation PRs, each
flag-gated + band-neutral, each subtracting Track-A-merged pieces (cap-11 is the
umbrella superset; CAP-06 already landed via PR #2958). No C2 code before ratification.

## 9. Non-goals

- Not deciding the L'Impronta design (master-dd).
- Not implementing imprint code this session.
- Not deleting any `aa01/*` branch (preserved until integrated or superseded-with-record).
- Not adding a web onboarding surface (Godot target).
