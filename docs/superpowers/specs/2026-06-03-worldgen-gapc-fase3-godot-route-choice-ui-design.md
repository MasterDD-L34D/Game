---
title: 'GAP-C fase-3 — Godot route-choice UI (Into the Breach telegraph) design'
date: 2026-06-03
doc_status: proposed
doc_owner: master-dd
workstream: worldgen
source_of_truth: false
language: en
review_cycle_days: 30
tags: [worldgen-gap-c, meta-network, godot, fase-3, into-the-breach, route-choice, cross-repo]
---

# GAP-C fase-3 — Godot route-choice UI design

> **Scope**: the cross-repo (Game-Godot-v2) player-facing route-choice screen that consumes the
> meta-network graph routing. This spec lives in the Game repo (the GAP-C design trail) but the
> IMPL + GUT tests are in `MasterDD-L34D/Game-Godot-v2`. It is the **fase-3** of GAP-C and the
> last player-value prerequisite before the `META_NETWORK_ROUTING` PROD flip.

## 1. Why now / where this sits

The backend route-choice surface is **COMPLETE** on Game `main`:

- **#2483** — `metaNetworkRouting.selectNextNodes` (eligible candidates, deterministic).
- **#2509** — arc-conditions (season / prior_node_cleared) Stage 1.
- **#2582** — LIVE routing: `/advance` graph traversal (0->terminal / 1->auto / >1->`choice_required`)
  - `/choose {node_id}` + co-op `world_vote`->`/choose` bridge.
- **#2585/#2587** — 6-node graph (true 3-way branch + Atollo), Dormans completability validator.
- **#2592** — candidates carry `encounter_id` + `terminal`.
- **#2593** — candidates carry `threat` (difficulty + class + peak tier + spawn count), decoupled
  from live combat (read-only metadata; combat encounters unchanged).

**Missing = this UI.** Today the graph is flag-gated OFF in prod and there is NO Godot screen that
shows the player the route choice (verified: `Game-Godot-v2` has zero meta-network / campaign-map UI).
The `META_NETWORK_ROUTING` PROD flip is DEFERRED precisely because flipping with no consuming UI =
"Engine LIVE / Surface DEAD" (Gate-5) + a contract risk. This spec is the fase-3 that unblocks the
flip (sequencing: build this UI -> healthy prod -> flip last, the reversible env activation).

## 2. Goal + Definition of Done (Gate-5)

A player (solo + co-op) finishing a chapter sees the eligible next nodes as full-information
Into-the-Breach cards and picks one within <60s; the pick drives the next encounter.

- DoD-1: after a graph-mode chapter clears, the route-choice screen renders the candidates with
  biome + the destination encounter + threat telegraph + the terminal/climax marker.
- DoD-2: picking a node calls `/choose` and advances to that node's encounter.
- DoD-3: co-op — players vote, the host resolves the winner to `/choose` (reuse the world-vote path).
- DoD-4: flag OFF / no `choice_required` -> the screen never appears (static chain unchanged) =
  back-compat + reversible.
- DoD-5: GUT tests green (pure request builders + view render + the choice_required flow).

## 3. Backend contract (already shipped — consume, don't change)

`base_url` via `WebOriginResolver.http_base()` (default `http://localhost:3334`).

- `GET /api/campaign/meta-network/next?from=<NODE>&cleared=A,B&season=<s>&campaign_id=<id>`
  -> `{ enabled, network_id, from, candidates[], excluded, blocked, reason }`.
  `enabled:false` (reason `flag_off`) when `META_NETWORK_ROUTING !== 'true'` -> the client treats
  this as "no graph routing" and stays on the static chain (DoD-4).
- `POST /api/campaign/advance { id, outcome, survivors, ... }` -> graph mode returns ONE of:
  `{ campaign_completed:true }` (terminal/no candidates) | `{ next_encounter_id }` (exactly one,
  auto-advanced) | `{ choice_required:true, route_choice:{ candidates[] } }` (>1 -> player chooses).
- `POST /api/campaign/choose { id, node_id }` -> `{ next_encounter_id, campaign }` (resolves the
  pick against fresh candidates; requires the current node already cleared). VERIFY the exact body
  at impl (`apps/backend/routes/campaign.js` `/campaign/choose` handler).

**Candidate shape** (the render model):

```
{
  node_id, biome_id, weight, edge_type, resistance, seasonality, edge_types[],
  encounter_id,            # the encounter this node serves (N=1), or null
  terminal,                # true = climax node (reaching+clearing ends the run)
  threat: {                # null when no encounter metadata
    difficulty_rating,     # 1..5 (stars)
    encounter_class,       # standard | hardcore | boss | tutorial | tutorial_advanced
    max_tier,              # base | elite | apex (peak enemy tier across waves)
    wave1_count            # initial spawn count
  }
}
```

## 4. Godot-side work (3 pieces, mirror existing patterns)

### 4.1 `CampaignApi` extension (`scripts/net/campaign_api.gd`)

Add pure request builders + async wrappers, mirroring the existing `build_*_request()` + `_send()`
pattern (returns `{ok, status, data, error}`; `_failure` on non-2xx):

- `build_meta_network_next_request(from, cleared:=[], season:="", campaign_id:="")`
- `build_advance_request(payload)` (graph-aware `/advance`; may already be partially needed)
- `build_choose_request(campaign_id, node_id)`
  Plus `meta_network_next(...)`, `choose(...)` async wrappers. Pure builders = GUT-offline-testable
  (see `tests/unit/test_campaign_api.gd`).

### 4.2 `RouteChoiceView` (new scene + script)

A new view rendering the candidates as Into-the-Breach **full-information** cards. Model the scene
on the existing view pattern (`scenes/phone/PhoneWorldVoteView.tscn` for the co-op pick affordance,
`scenes/ui/*` + `HudView` for the TV/HUD surface). Each card shows: biome_id, encounter_id,
`difficulty_rating` as stars, `encounter_class` badge (hardcore/boss accent), `max_tier` +
`wave1_count` ("face N, peak APEX"), edge_type/resistance (path flavor), and a **TERMINAL/climax**
marker when `terminal:true`. Emits `route_chosen(node_id)`. No hidden info (anti-reference: opaque
roguelike map RNG). Back-out / inspect allowed (ItB).

### 4.3 Campaign-flow wire (`scripts/session/campaign_state.gd` + the post-combat flow)

- `CampaignState` gains `current_node` + `cleared_nodes` (mirror the backend; additive to the
  Resource + the godot-v2 sync payload; default empty -> static-chain back-compat).
- After a chapter's debrief, the flow calls `/advance`; if the response is `choice_required`, open
  `RouteChoiceView` with `route_choice.candidates`; on `route_chosen` -> `/choose {node_id}` ->
  serve `next_encounter_id`. If `next_encounter_id` (auto) or `campaign_completed`, no view.
- **Co-op**: >1 candidate -> reuse the world-vote path (`PhoneWorldVoteView` / `world_vote` +
  `world_tally`); the winning `node_id` feeds the host `/choose` (the #2582 bridge is proven
  test-only on the backend).

## 5. Flag + safety (band-safe, reversible)

- The client NEVER sets `META_NETWORK_ROUTING` (server-side env). It only REACTS to the contract:
  `choice_required` present -> show the view; absent / `enabled:false` -> static chain unchanged.
- Flag OFF in prod today -> `/advance` never returns `choice_required` -> the view never appears ->
  zero behaviour change until the flip. The flip stays a separate, reversible owner verdict.
- No combat / band impact (this is campaign routing UI; the ratified combat bands are untouched).

## 6. Reference games (docs/guide/games-source-index.md, pillar P5)

- **Into the Breach** (Tier S): island->island route is hand-authored + readable BEFORE choosing,
  zero hidden info. The model for these cards (telegraph reward/risk per node). The backend already
  supplies the full info (biome + encounter + threat); the UI must show it all, no fog.
- **Anti-reference**: Slay-the-Spire-style opaque map RNG (hidden branch) -> contradicts P1
  "tactica leggibile" + ItB full-information.

## 7. Test plan (GUT, Godot-v2)

- `test_campaign_api.gd`: the new pure builders (url/method/body) + a stubbed `_send` happy/`enabled:false`/404.
- `test_route_choice_view.gd` (new): renders N candidates; a terminal candidate shows the climax
  marker; `threat:null` degrades gracefully; emits `route_chosen` on pick.
- flow test: `choice_required` -> view shown; auto/completed -> not shown; flag-off contract -> static.

## 8. Out of scope / deferred

- The PROD flip (separate reversible owner verdict, post this UI + healthy prod).
- fase-4 generative grammar (Dormans) — graph is hand-authored for the MVP.
- B-pressure arc-conditions (`campaignPressure` Q-F Opt2) — a later routing-depth slice.
- Authoring the 4 unpromoted node-encounters as LIVE combat (#2593 found promoting crashes
  completion 0/10; the threat preview reads their metadata read-only, no live-combat needed).

## 9. Open questions (master-dd)

- Q1: surface = phone-only, TV/HUD-only, or both? (PhoneWorldVoteView suggests phone-first co-op.)
- Q2: co-op tie-break on the world-vote tally (host decides? weighted? re-vote?).
- Q3: show `excluded`/`blocked` nodes greyed-with-reason (ItB "locked, needs X") or hide them?
  (The backend already returns `blocked:[{node_id, blocked_by}]` -> a grey "locked: winter" card is
  cheap + on-pillar.)
