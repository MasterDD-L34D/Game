---
title: "L'Impronta reconciliation spec (CAP-11 core + onboarding/telemetry inputs) -- master-dd-gated"
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

# L'Impronta reconciliation spec (C1)

> **Status: RATIFIED 2026-06-22 (master-dd).** The 3 design calls of section 7 are
> decided: (1) biomeResolver -> **AFFINITY** (6.1-A); (2) onboarding -> **ADDITIVE
> separate-phase** beat (6.2-A); (3) PlayerRunTelemetry -> **DEFER** (6.4-C). The
> options below are kept for the record; the ratified pick is marked per section.
> C2 = per-piece code reconciliation, now unblocked for the ratified pieces (section
> 8), with the remaining C2 sub-design-calls flagged in section 7. Parent plan:
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

> **RATIFIED 2026-06-22 (master-dd): Option A -- AFFINITY.** biomeResolver becomes a
> non-binding `biomeAffinity()` weight signal; biome stays route-canon (constraint 1).
> **Open C2 sub-design-call**: WHERE the affinity is consumed (route-vote presentation
> weighting / encounter flavor / cosmetic "branco leans toward X" hint) is NOT yet
> decided -- the C2 affinity build must surface this to master-dd before wiring a
> consumer (an unconsumed affinity = Gate-5 dead).

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

> **RATIFIED 2026-06-22 (master-dd): Option A -- ADDITIVE separate-phase.** The game
> keeps a distinct "imprint" beat as an OPTIONAL pre-phase that NEVER merges
> `character_creation` + `world_setup` (constraint 2), device-authoritative + quorum
> (constraint 3), targeting Godot (constraint 4). **Open C2 sub-design-calls**: (a)
> exact placement (standalone pre-phase vs folded into `world_setup` framing); (b)
> what the imprint beat actually asks the player (the 4 body-part axes feed 6.1's
> affinity, but the player-facing prompt/UX is a design call); (c) the Godot surface.
> These are master-dd calls the C2 imprint build must NOT invent autonomously.

### 6.3 onboarding_v2 backend (`/campaign/start/v2`, campaignLoader, default_campaign_mvp)

Mostly canon-neutral plumbing IF decoupled from biomeResolver-binding + host-token.
**Per the 6.2-A ratification**: reconcile `/campaign/start/v2` to (a) device-authority
(no host-token), (b) NO body-part->biome binding (consume 6.1's affinity weight at
most, read-only), (c) separate phases. Part of the C2 imprint build, gated behind the
6.2 sub-design-calls above.

### 6.4 PlayerRunTelemetry canon-home (CAP-12) -- RATIFIED: DEFER (Option C)

> **RATIFIED 2026-06-22 (master-dd): Option C -- DEFER.** Park CAP-12 until a
> design-spec decides the home AND a producer exists. The feature is inert/orphaned:
> no run-lifecycle hook writes to it, the POST route is unauthenticated, no migration
> is committed, no Gate-5 surface -> it persists nothing today. Both build options
> (standalone, fold) trip the SAME forbidden-path migration gate and BOTH still need
> a producer + end-of-run write-hook that do not exist regardless of home; canon (SoT
> 13.9 / 00D 16.4) treats `vcSnapshot` as reconstruct-from-ledger (session-scoped),
> arguing against persisting it standalone. Branch preserved.
>
> **Ground-truth correction:** the "aligned ADR-2026-06-07 pt3" framing (in the prior
> BACKLOG/plan note) is OVERSTATED. The only ADR-2026-06-07 is
> `device-authority-tv-mirror-canon` -- there is no "pt3", and it does NOT sanction
> `vcSnapshot`/`selectedForm` persistence (it ratifies device-authority + Form-Pulse
> as a device micro-input). The mechanism is MBTI/Form-Pulse-correlated, but no ADR
> backs persisting it; `selectedForm` is also non-canonical backend naming (only a
> test-viewer UI field today). The home + a canonical `selectedForm` owner are exactly
> what the future design-spec must settle.

Options considered (for the record); canon-home is open:

- **Option A -- session/telemetry workstream, standalone store + route + Prisma model**
  (as built), flag-gated read/write, NOT tied to the imprint model. Lifts cleanly
  regardless of 6.1/6.2.
- **Option B -- fold into the existing chronicle/VC telemetry path** rather than a
  new Prisma model (avoid a parallel store).
- **Option C -- defer until an onboarding decision exists** (the plan's current
  default: DEFER, gated).

> (Ratified C -- DEFER, see banner above. Note for the future spec: a new
> `prisma/schema.prisma` model = migration = forbidden-path / master-dd manual + ADR;
> no file-DB fallback, persistence needs Postgres. Finders split on fold-vs-standalone
> direction -- that disagreement is itself why a dedicated design-spec, not a home
> commitment now, is the right next move.)

### 6.5 UX (CAP-13/13b + CAP-14b web mockup)

Reference only. The 1015-LOC web mockup + UX patches inform a Godot onboarding
surface but are NOT ported to web. Action: catalog as UX reference (museum/curated);
no code reconciliation.

## 7. Design calls -- RESOLVED 2026-06-22 + remaining C2 sub-calls

**Ratified (master-dd):**

1. biomeResolver disposition -> **AFFINITY** (6.1-A).
2. imprint onboarding beat -> **ADDITIVE separate-phase** (6.2-A).
3. PlayerRunTelemetry canon-home -> **DEFER** (6.4-C).

**Remaining C2 sub-design-calls (still master-dd; surface before building each piece):**

- (affinity) WHERE the affinity weight is consumed: route-vote presentation / encounter
  flavor / cosmetic hint (6.1).
- (imprint) placement (pre-phase vs `world_setup` framing), the player-facing prompt/UX,
  and the Godot surface (6.2).
- (telemetry) the future home + a canonical `selectedForm` owner + producer + auth/PII
  posture (6.4) -- a separate future spec, not part of this reconciliation.

## 8. Sequencing to C2 (UNBLOCKED for ratified pieces)

C1 is ratified -> C2 = per-piece code reconciliation PRs, each flag-gated +
band-neutral, each subtracting Track-A-merged pieces (cap-11 is the umbrella superset;
CAP-06 already landed via PR #2958). Suggested order:

1. **C2-affinity** (6.1-A) -- the most canon-neutral piece: `biomeResolver` ->
   `biomeAffinity()` returning read-only weights, NO binding biome assignment. BLOCKED
   on the affinity-consumption sub-call (where it is consumed) -- do not wire a consumer
   until decided (else Gate-5 dead engine). A pure weight-producer + tests
   (flag-gated/unconsumed) could land first if master-dd wants forward motion.
2. **C2-imprint** (6.2-A + 6.3) -- additive separate-phase imprint beat +
   device-authority `/campaign/start/v2`. BLOCKED on the imprint sub-calls (placement /
   prompt-UX / Godot surface). Larger; likely its own focused spec + Godot cross-repo chip.
3. **CAP-12 telemetry** -- DEFERRED (6.4-C); no C2 action; branch parked.
4. **CAP-13/13b + CAP-14b** -- UX reference only; catalog (museum/curated), no code.

Each C2 PR preserves the source `aa01/*` branch until its piece is integrated.

## 9. Non-goals

- Not deciding the L'Impronta design (master-dd).
- Not implementing imprint code this session.
- Not deleting any `aa01/*` branch (preserved until integrated or superseded-with-record).
- Not adding a web onboarding surface (Godot target).
