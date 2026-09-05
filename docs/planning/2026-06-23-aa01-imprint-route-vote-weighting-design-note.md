---
title: 'Imprint route-vote affinity weighting -- design-note (D5, master-dd-gated PROPOSAL)'
date: 2026-06-23
sprint: aa01-impronta-reconciliation
doc_status: review_needed
doc_owner: claude-code
workstream: cross-cutting
last_verified: '2026-06-23'
source_of_truth: false
language: it-en
review_cycle_days: 90
---

# Imprint route-vote affinity weighting -- design-note (D5)

> **Status: PROPOSED -- master-dd-gated, NOT canon, NOT scheduled for build.** This is
> the design-note for deferred item **D5** (the 2nd affinity consumer; master-dd picked
> hint + route-vote weighting, only the hint shipped in #2970). It defines HOW the imprint
> cosmetic weights would nudge the route-vote PRESENTATION so the rule is ratified BEFORE
> any code. It is **doubly-gated**: `META_NETWORK_ROUTING` is OFF (do NOT flip without
> explicit master-dd consent) AND the Godot route-UI is itself flag-gated. Nothing here
> ships until that flip is on the table. The diegetic copy is master-dd-authored (HITL);
> this note proposes placeholders only.
>
> Parent: [`2026-06-22-aa01-c2-imprint-build-spec.md`](2026-06-22-aa01-c2-imprint-build-spec.md)
> (sec.5 STEP 5 DEFERRED) + [`2026-06-22-aa01-deferred-tracker.md`](2026-06-22-aa01-deferred-tracker.md)
> (row D5).

## 1. What this is (and is not)

- **Is**: a soft, non-binding NUDGE on how the route-vote candidates are PRESENTED, so a
  branco whose imprint leans toward a biome gets a cosmetic cue when that biome appears as
  a route candidate ("il tuo branco predilige questo bioma").
- **Is NOT**: a change to the vote itself. The vote tally / weight / quorum math stays
  byte-identical. Biome stays route-canon (constraint 1, reconciliation-spec sec.5). The
  weights NEVER feed damage / score / affinity / route-resolution math. No raw numbers
  surfaced (ER3).

## 2. Ground truth (recon 2026-06-23)

- **Producer EXISTS** -- `services/imprint/imprintBiomeWeights.js`
  `computeImprintBiomeWeights(teamTuples)` returns a normalized `{ biome: weight }` map
  (sum=1) + `topBiome(weights)`. On `all_connected_marked` the orchestrator stamps
  `orch.brancoBiomeHint = { leans_toward, weights }` (coopOrchestrator
  `_computeImprintHint`).
- **Route candidates EXIST** on the same orchestrator -- `orch.routeCandidates`
  (GAP-C fase-3 co-op route vote) surfaced via `route_choice` + `route_tally` WS broadcasts.
  Candidate shape (from `metaNetworkRouting.selectNextNodes` / enriched):
  `{ node_id, biome_id, encounter_id, threat:{...}, edge_type, resistance, terminal }`.
- **Godot consumer EXISTS** -- `scripts/ui/route_choice_view.gd` (`RouteChoiceView`)
  renders one card per candidate (biome at the top + accent + threat stars + optional live
  tally). It already reads per-candidate fields and tints by biome class
  (`BiomePalette`), so a presentation cue is a thin additive render.
- **Both flags OFF** -- `META_NETWORK_ROUTING` (campaign.js:76) gates the whole route
  layer; the Godot route-UI is gated too. So D5 has no live surface until the route layer
  itself lights up.

The producer (engine) is present; only the route-vote consumer is missing -- and it is
the doubly-gated one. The orchestrator HOLDS both `brancoBiomeHint` and `routeCandidates`,
so the join is local (no new cross-service plumbing).

## 3. The design call (SDMG -- ratify before code)

The build-spec (sec.9) flags the producer weight semantics as **SDMG** (self-designed):
"aggregate 16 sub-combos + normalize is ONE interpretation; ratify only if/when route-vote
weighting is built." So the presentation RULE is a master-dd call, not a build detail.
Three candidate presentation models:

| Opt | Presentation                                                                                                                             | Pro                                                                                                | Con                                                                                              |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| A   | **Passive lean badge / accent** on the candidate card whose `biome_id` matches `leans_toward` (or weight >= threshold). Order untouched. | Lowest steering; preserves the Into-the-Breach full-information scan (P1). Honest "cue, not push". | Subtle -- a hurried table may miss it.                                                           |
| B   | **Re-order** candidates so the leaning biome is shown first.                                                                             | Strong signal.                                                                                     | Changes scan order = soft steering; weakens P1 "tattica leggibile" neutrality + full-info model. |
| C   | **Surface the weight number / bar**.                                                                                                     | Maximally informative.                                                                             | REJECT -- ER3 (no raw numbers), and the weights are cosmetic-tier, not a public stat.            |

**Recommendation: Option A** (badge/accent, order untouched). It is the only one that adds
a cue WITHOUT steering the vote or breaking the full-information route model. The vote stays
non-binding and the player keeps the same readable card set.

## 4. Proposed additive data shape (when D5 is built)

- Backend: when `META_NETWORK_ROUTING` is on AND `orch.brancoBiomeHint` exists, enrich each
  surfaced route candidate with an additive, default-absent field:
  `branco_affinity: { leans: <bool> }` (Option A) -- `leans=true` iff
  `candidate.biome_id === brancoBiomeHint.leans_toward` (or `weights[biome] >= threshold`).
  Absent when the flag is OFF or no hint exists -> band-neutral, existing route payload
  shape unchanged.
- Godot: `RouteChoiceView._build_card` reads `candidate.branco_affinity.leans` and, when
  true, renders a small diegetic badge / accent ("consigliato dal branco" -- **placeholder,
  master-dd copy**). Null-safe: renders nothing when the field is absent.
- The `weights` map is NEVER serialized to the candidate (no numbers, sec.3 Opt C reject).

## 5. MUST-NOT-REGRESS (carry into any future build)

- Vote tally / weight / quorum math UNTOUCHED -- the nudge is presentation-only,
  non-binding.
- Biome stays route-canon -- the affinity NEVER selects or biases the resolved node.
- No raw numbers (ER3) -- badge/accent only, never the weight value.
- Band-neutral -- the additive field is absent with the flag OFF or no hint; existing
  route payload byte-identical.
- Doubly-gated -- requires `META_NETWORK_ROUTING` ON (a separate master-dd flip; do NOT
  flip it for this) + the Godot route-UI. D5 cannot light up before the route layer does.
- Gate-5 -- ship the backend field WITH its `RouteChoiceView` consumer in the same PR; no
  producer-only field.

## 6. Open questions for master-dd (ratify checklist)

1. Presentation model: **A (badge/accent)** vs B (re-order) vs C (number, rejected).
2. Threshold: top-biome-only (`leans_toward`) vs every biome with `weight >= X` (X = ?).
3. Diegetic copy for the badge ("consigliato dal branco" / "il tuo branco predilige questo
   bioma" / other) -- master-dd-authored.
4. Scope: co-op route-vote only, or also the solo TV-pick route path?
5. Ratify the producer weight semantics (SDMG, build-spec sec.9) at the same time, since
   D5 is the first consumer that makes them load-bearing.

## 7. Disposition

**D5 stays DEFERRED.** No code now: doubly-gated + SDMG-unsettled semantics + zero live
value until the meta-network flip is a real call. When `META_NETWORK_ROUTING` is on the
table, take the Option-A (or master-dd-chosen) rule above and build it flag-gated +
band-neutral with the `RouteChoiceView` consumer in one PR (Gate-5). Until then this
note is the ratified-design parking spot, not a build ticket.
