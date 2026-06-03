---
title: 'GAP-C option-C -- decouple graph-mode combat from static encounters (draft-node fight delivery) design'
date: 2026-06-03
doc_status: proposed
doc_owner: master-dd
workstream: worldgen
source_of_truth: false
language: en
review_cycle_days: 30
tags: [worldgen-gap-c, meta-network, route-choice, encounters, combat, band-verify, into-the-breach]
---

# GAP-C option-C -- decouple graph-mode combat from static encounters

> **Scope**: make the meta-network route-choice destinations deliver a REAL fight that matches the
> telegraphed threat, WITHOUT disturbing the ratified static `cave_path` completion bands. This is
> the combat-delivery follow-up to the backend preview work (#2592 encounter_id/terminal, #2593
> threat telegraph) and the fase-3 Godot route-choice UI (#2594 spec). Flag: `META_NETWORK_ROUTING`
> (OFF in prod). This doc is a DECISION doc -- it lays out the difficulty-structure options and
> recommends one; master-dd ratifies before any band-relevant build.

## 1. Problem (empirically confirmed 2026-06-03)

When `META_NETWORK_ROUTING=true`, the player gets route choice + a full Into-the-Breach threat
telegraph for all 6 nodes, but the actual fight is real for only **2 of 6** destinations:

```
node               encounter                          fight
DESERTO_CALDO      enc_savana_01                      REAL  (live encounters/)
FORESTA_TEMPERATA  enc_caverna_02                     REAL  (live encounters/)
BADLANDS           enc_tutorial_03                    DEGRADED (draft -> loadEncounter null)
CRYOSTEPPE         enc_tutorial_04                    DEGRADED
ROVINE_PLANARI     enc_tutorial_05  (terminal/climax) DEGRADED  <-- the run's CLIMAX is a fallback
ATOLLO_OBSIDIANA   enc_tutorial_07_hardcore_pod_rush  DEGRADED
```

The terminal node being degraded is the sharpest issue: a full graph descent currently ENDS on a
fallback fight, not the telegraphed hardcore climax.

## 2. Root cause

- Routing returns `next_encounter_id` only; combat is client-driven (`POST /session/start`).
- `session/start` resolves the encounter via `loadEncounter(encounter_id)`
  (`apps/backend/routes/session.js:1846`), which reads ONLY `docs/planning/encounters/`
  (`apps/backend/services/combat/encounterLoader.js:22`).
- The 4 draft ids live in `docs/planning/encounters-draft/` (INERT). `loadEncounter` returns `null`
  -> `encounterPayload` stays null -> the fight loses encounter-defined objectives/waves (no crash;
  it degrades to a client-roster elimination).
- `encounterThreat.js` already reads `encounters/` UNION `encounters-draft/`, which is why the
  TELEGRAPH works for all 6 while the FIGHT does not. The asymmetry is the gap.

**Why the drafts are not simply promoted to `encounters/`**: the 5 draft ids are also referenced by
the static `cave_path` chain (the ratified band substrate, #2576/#2580). Promoting makes them real
for the STATIC flow too -> 2 scaled gating fights become 7 -> with the one-attempt-per-mission cap,
completion = product over 7 fights -> ~0 (measured 0/10, PR #2593). So a blanket promote is
band-breaking and was reverted.

## 3. Goal

Graph-mode route destinations deliver a real fight matching the telegraph, with completion landing
inside the (wider, provisional) graph-mode bands ratified in #2589 -- and the static `cave_path`
bands left byte-untouched.

## 4. Approach C -- decouple the combat encounter source by mode

Static combat keeps reading `encounters/` only. Graph-mode combat additionally resolves from
`encounters-draft/`. Three mechanism variants (pick at build time):

- **C1 (recommended mechanism)** -- mode-aware resolver: `loadEncounter(id, { graphMode })`. When
  `graphMode` is true (call site already knows: the session was started from a graph route), union
  `encounters-draft/` (live dir wins on id collision, mirroring `encounterThreat`). Static callers
  pass nothing -> unchanged. Smallest surface, symmetric with the threat resolver.
- **C2** -- separate `graphEncounterLoader.js` consumed only by the graph-routed session path.
  Cleaner isolation, more duplication.
- **C3** -- promote only a SUBSET to live `encounters/` (e.g. just the terminal climax,
  enc_tutorial_05/06). Smallest content win, but re-introduces the static-band ripple for that
  subset -> still needs static re-cal. Not recommended.

C1/C2 keep combat's static `encounterLoader` path `encounters/`-only -> static bands untouched.

## 5. The difficulty-structure decision (OWNER-GATED -- the real blocker)

Making the 4 drafts real in graph-mode combat changes GRAPH-MODE completion (not static). The draft
curve includes hardcore fights (06_hardcore apex hp14, 07_pod_rush 5-swarm). A naive union -> graph
descents now chain up to 4 real gating fights -> completion drops. Options to keep completion inside
the graph-mode band:

| Option          | What                                                                                                            | Pro                                                          | Con                                                   |
| --------------- | --------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ | ----------------------------------------------------- |
| Ramp            | Escalate difficulty along the route; leverage existing `prior_node_cleared` edge gates so hard nodes sit deeper | Genre-faithful (map escalates); reuses live gating           | Route is player-chosen -> only a SOFT ramp via gates  |
| Fewer-gating    | Convert some draft nodes to non-elimination objectives (survive/escort/capture)                                 | Breaks the failure-compounding product                       | Authoring + objectiveEvaluator wiring per node        |
| Retry-allowance | Graph mode permits re-attempt / reroute on a lost node (roguelike)                                              | Matches Into-the-Breach / StS map genre; recovers completion | Run-structure rule change (meta-loop)                 |
| Trivialize      | Lower enemy hp/mods for draft nodes via `calibrationScaling`                                                    | Fits completion with one knob                                | Telegraph (dr3/elite) then mismatches a trivial fight |
| Lower-band      | Accept a lower graph-mode completion target (re-ratify #2589 lower)                                             | Cheapest; bands already provisional                          | A real game-feel concession (lower win-rate)          |

**Recommendation (Claude autonomous judgment -- pending master-dd review for criteria diversi:
genre-fidelity vs author-cost vs run-length vs win-rate target).** Combine **Retry-allowance +
soft-Ramp via existing `prior_node_cleared` gates**, keep the terminal (06_hardcore / 07_pod_rush)
HARD as a satisfying climax. Rationale: route choice already evokes the Into-the-Breach / Slay-the-
Spire map, where a chosen path escalates and some failure tolerance is genre-standard; this recovers
completion without watering down the telegraphed threat (rejects Trivialize) or conceding win-rate
(rejects bare Lower-band). Fewer-gating is a good ADDITIVE polish later (objective variety) but is
authoring-heavy. The discarded options stay preserved here for master-dd to weigh against other
criteria.

## 6. Band-verify plan (mandatory before flip-with-real-fights)

1. Build C1 behind `META_NETWORK_ROUTING` (graph-mode only; flag OFF default).
2. Graph-mode N=40 band-verify via the existing harness (`tools/sim/meta-network-driver.js` +
   `batch-ai-runner` + `meta-band-aggregator`), policies greedy + MBTI sample.
3. Re-tune `calibrationScaling` graph-mode knobs (the SIM-ONLY difficulty, NOT the game; reversible
   via `FL_ENEMY_*`) until completion + lineage land in band.
4. Re-ratify the #2589 graph-mode bands with the new substrate (master-dd decision-handoff).
5. Static `cave_path` N=40 unchanged regression (proves zero static ripple).

## 7. Blast radius

- Graph-mode combat only; flag OFF in prod -> zero live-campaign impact until flip.
- Static `encounterLoader` path untouched -> static bands byte-stable.
- `encounterThreat` unchanged (already reads drafts).
- Reversible: the mode-aware union is gated; removing the flag restores `encounters/`-only.

## 8. DoD + Gate-5

- C1 unit tests (graph-mode loads draft, static does not).
- Graph-mode N=40 in band + static N=40 unchanged (evidence captured in a playtest report).
- **Gate-5 (player surface)**: with the flag on, a player who picks a draft-node route fights the
  REAL telegraphed encounter (difficulty + waves match the card), and a full descent ends on the
  hardcore climax -- verifiable in <60s of play. Before: telegraph card, fallback fight.

## 9. Owner decisions to ratify

1. Difficulty-structure option(s) from section 5 (recommend Retry-allowance + soft-Ramp).
2. Mechanism C1 vs C2 (recommend C1).
3. Whether the terminal climax stays at the 06/07 hardcore tier.
4. Graph-mode completion band target for re-ratify (keep #2589 wider band, or adjust).

Until ratified, the drafts stay INERT in `encounters-draft/` (telegraph-only) and the flip delivers
route choice with 2/6 real fights (MVP). This doc unblocks the build the moment the difficulty
decision lands.
