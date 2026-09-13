---
title: "C2-imprint build-spec -- additive L'Impronta beat + imprint affinity + cosmetic hint"
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

# C2-imprint build-spec

> **Status: review_needed.** This is the BUILD-spec for the C2-imprint MVP (the
> ratified L'Impronta affinity folds into it -- see
> [`2026-06-22-aa01-cap11-limpronta-reconciliation-spec.md`](2026-06-22-aa01-cap11-limpronta-reconciliation-spec.md)).
> 3 sub-design-calls (section 4) need master-dd before coding. The player-facing
> diegetic prose / hint string is master-dd-authored (codex-lore HITL boundary) -- this
> spec does NOT invent it. Every build step is flag-gated default-OFF + band-neutral; the
> producer does NOT ship without the Godot surface (Gate-5).
>
> **DECISIONS 2026-06-22 (master-dd) -- see section 4bis**: placement = transient sub-step
> (4.1-B); prompt/UX = reuse aa01 4-axis schema, prose master-dd-authored (4.2-A); Godot =
> full topology staged (4.3-A) **with N-player creature scaling** (2-4 players, not a fixed
> 4). Backend STEP 0-3 is now buildable.

## 1. Overview

"L'Impronta" lands as an ADDITIVE, separate-phase imprint beat: device-authority (NO
host-token start), `character_creation` and `world_setup` stay SEPARATE, target Godot.
The beat collects 4 body-part axes (zampe/locomotion, mascella/offense, pelle/defense,
occhi/senses) per-device, feeds an imprint-affinity producer (NEW module, DISTINCT name
-- `biomeAffinity.js` is taken), and surfaces a read-only cosmetic hint "il tuo branco
tende verso X" on `publicSessionView`. Route-vote weighting is a LATER layer
(`META_NETWORK_ROUTING` OFF). **biome stays route-canon; the affinity is NEVER a binding
biome assignment** -- cosmetic-display weights only, never fed into damage/score/affinity/
route math.

## 2. Current ground truth (recon)

- Main's `coopOrchestrator.js` ALREADY has an `onboarding` phase: `PHASES` (~L43-52) =
  `lobby -> onboarding -> character_creation -> world_setup -> combat -> debrief -> nido
-> ended`. And a proven transient per-player collect pattern: `formPulses` Map +
  `submitFormPulse` (~L758-783) + tally + `revealAcks` (~L153/713).
- Device-authority trio to mirror (SPEC-K): `worldTally` (~L903-943), `missionReadyTally`
  (~L1371-1405), exported `lifecycleQuorumPids` (`wsSession.js:1146-1155`, exported
  :2443) for the connected-voter set (excludes a pure TV-mirror host, includes a
  host who plays). Anti-deadlock timer precedent: `openLethalConsent` (~L1116-1153).
- The species combat affinity `apps/backend/services/species/biomeAffinity.js`
  (`getBiomeAffinityModifier`, wired `session.js:547`) -- the imprint producer MUST use a
  different name/path.
- **3 aa01 regressions to NOT inherit**: (a) host-token start (`/coop/imprint/start`
  authHost); (b) `character_creation` + `world_setup` phase-collapse (cap-15 'imprint'
  phase auto-jumped imprint->combat); (c) `players[0]`-only campaign ownership
  (`/campaign/start/v2`).

## 3. Imprint beat design

**Where it sits**: an additive beat BETWEEN `onboarding` and `character_creation`; on
completion it advances to `character_creation` (which stays the WHO gate, `submitCharacter`
~L546-550) leaving `world_setup` (the WHERE gate, `confirmWorld` + K-02 device-quorum
~L614/664) untouched. It must NOT auto-jump to combat.

**How it collects (device-authority, copy the SPEC-K trio):**

1. COLLECT -- `submitImprintMark(playerId, {axis, value})` -> per-player Map (mirror
   `formPulses`). Submitter identity is SOCKET-BOUND (playerId from the authenticated WS
   connection, NOT from payload). Non-throwing: reject unknown axis/value with 400.
2. TALLY -- `imprintTally(allPlayerIds, connectedPlayerIds)` derives
   `connected_total`/`connected_pending` + boolean `all_connected_marked` over the
   CONNECTED set only (mirror `worldTally`/`missionReadyTally`). Reuse exported
   `lifecycleQuorumPids` (do NOT hand-roll a 4th host-exclusion filter).
3. TRY-ADVANCE -- `tryAdvanceImprint(...)` no-op-unless-quorum, called by BOTH the WS
   drain and the REST mirror after every collect AND on socket `close` (a disconnect can
   COMPLETE the quorum). NO host-token gate on the commit: host may only OPEN / CANCEL
   (anti-deadlock soft) / force; the ADVANCE is the device quorum (mirror
   proposeWorld-stashes / confirmWorld-from-`tryAutoConfirmWorld`, K-02). Arm an
   anti-deadlock fallback (injectable `_setTimeoutFn` + `unref()` + deadline-pinned `now`,
   mirror `openLethalConsent`) OR reuse the 15s onboarding deliberation `default_choices`
   so the beat never hangs (see risk: defaulting is itself a sub-call).

**Transport**: WS intent `imprint_mark` drained server-side in `wsSession.js` (broadcast
`imprint_tally` + ack submitter, re-eval on `close`) PLUS a REST mirror
`POST /coop/imprint/mark` (authPlayer, same orchestrator calls + `broadcastCoopState`).
Add the `imprint_tally` WS broadcast -- the aa01 build only returned readiness in REST
bodies (gap).

**Feeds producer + hint**: on `all_connected_marked` the beat aggregates the 4-axis team
tuple, calls `computeImprintBiomeWeights(teamChoices)` (section 5 STEP 2), and stamps
`session.branco_biome_hint` for `publicSessionView`. NO trait grant (the aa01 V2 already
dropped V1's choice->trait_id mapping; axis->trait is a separate non-band-neutral
sub-call), NO biome assignment, NO write into combat/score/affinity/route math.

## 4. Sub-design-calls for master-dd (decide before coding)

### 4.1 PLACEMENT -- real phase vs transient sub-step

Real `PHASES` entry `imprint` (cleanest semantics + first-class `phase_change` frame, but
touches the enum L43-52 + `forceAdvance` whitelist L1510-1521 + `buildPhaseChangePayload`
branches + every run-reset clear site = higher blast radius) **vs** transient sub-step
(new `imprintMarks` Map drained before `character_creation`, mirror
`formPulses`/`revealAcks`; NO enum change, lowest blast radius, no dedicated `phase_change`
frame -- Godot renders a transient view off the tally broadcast, like Form Pulse).
**Recommendation: transient sub-step** (proven precedent, cannot deadlock the phase
machine; promote to a real phase later only if the Godot UX needs a dedicated frame).

### 4.2 PROMPT/UX wording + axis-ownership

Reuse the aa01 `onboarding_v2.axes` content verbatim (briefing "Quattro di voi / Quattro
creature / Un solo mondo da scoprire"; 4 phones each owning ONE axis P1=zampe..P4=occhi;
binary prompts "Veloci o silenziose?") **vs** re-author the diegetic prose + hint string
for C2 voice **vs** change the axis-ownership model. **Recommendation: reuse the
data-driven 4-axis schema + axis-ownership verbatim as the content seed** (it is the
genuinely good "4 creature 1 bioma" idea, already tested), BUT treat the player-facing
PROSE and the hint string "il tuo branco tende verso X" as master-dd-authored copy (do NOT
let the build invent diegetic prose -- codex-lore HITL boundary). I will not invent the
strings; present 1-2 candidates only on request.

### 4.3 GODOT surface shape

Full aa01 topology (TV briefing 8s + 4-phone parallel one-axis-each + TV creature-card
silhouettes filling in + in-match hint chip) **vs** lighter (skip TV briefing, 4-phone
input + hint chip) **vs** phone-only (loses the shared-screen moment).
**Recommendation: full topology but STAGED** -- ship 4-phone parallel axis input +
`publicSessionView.branco_biome_hint` chip first (the load-bearing device-authority +
Gate-5 surface), add the TV briefing/silhouette cinematic as a follow-up. Exact UI = a
cross-repo Godot chip (section 6).

## 4bis. Decisions (2026-06-22 master-dd) + N-player scaling

- **4.1 placement -> transient sub-step** (formPulses-style `imprintMarks` Map; no PHASES
  enum change).
- **4.2 prompt/UX -> reuse the aa01 4-axis schema + axis model**; player-facing prose +
  hint string stay master-dd-authored (NOT invented in code).
- **4.3 Godot -> full topology, staged** (4-phone input + hint chip first, TV cinematic
  follow-up).

**N-player scaling (master-dd correction: "le creature scalano coi player"):** co-op is
2-4 players; the aa01 "4 phones, one axis each" assumed exactly 4. Reconciled design:

- **Creatures = N = connected player count (2-4), not hardcoded 4.** The TV shows N
  creature silhouettes (one per player), filling in as each device commits. ALL
  player-facing "4 creature" copy adapts to N -- this is the DISCLAIMER to carry through
  prose + Godot.
- **The 4 body-part axes are constant** (they define the team biome affinity) and are
  ROUND-ROBIN assigned to the N players so all 4 are always covered: 4p -> 1 axis each;
  3p -> one player owns 2 axes; 2p -> 2 axes each. A player owning >1 axis answers each in
  sequence on their device. The team still yields ONE 4-tuple -> `computeImprintBiomeWeights`.
- Unanswered axes at the anti-deadlock timeout fall back to the onboarding
  `default_choices` so the 4-tuple is always complete.
- Keeps the aa01 schema + ONE shared-branco affinity while scaling to any N. (Alternative
  per-creature model -- each player imprints their own creature across all 4 axes, N
  4-tuples aggregated -- is a larger input change; FLAGGED, not chosen. master-dd can
  override.)

The backend assigns axes via a pure `assignImprintAxes(connectedPlayerIds)` ->
`{playerId: [axis,...]}` round-robin helper; the tally requires every AXIS answered (not
every player), so a 2-3p team completes when all 4 axes have a value.

## 5. MVP build plan (each flag-gated, band-neutral)

0. **Flag** -- `IMPRINT_BEAT_ENABLED` default-OFF via `isImprintEnabled()` (mirror
   `staminaFatigue.isFatigueEnabled()` L17-24). Every write site guarded; OFF =
   byte-identical legacy behavior.
1. **Backend beat (no producer yet)** -- `imprintMarks` Map + `submitImprintMark` +
   `imprintTally` (boolean `all_connected_marked`) + `tryAdvanceImprint` in
   `coopOrchestrator.js`, modeled on `formPulses`/`worldTally`/`missionReadyTally`. Clear
   the Map in `startRun` (L291-307), `startOnboarding` (L338-354), `advanceScenarioOrEnd`
   (L1551-1566). Socket-bind submitter; reuse `lifecycleQuorumPids`; non-throwing. Wire
   BOTH transports (WS `imprint_mark` drain + REST `POST /coop/imprint/mark`); host may
   only OPEN/CANCEL/force. TDD per section 8.
2. **`imprintBiomeWeights` producer (pure)** -- port `biome_resolution.yaml` (16-combo
   base_lookup + modulation + `fallback_biome: savana`) into `data/core/imprint/`. Create
   `services/imprint/imprintBiomeWeights.js` exporting
   `computeImprintBiomeWeights(teamChoices)` -> normalized `{biome: weight}` (sum=1),
   aggregating across the team tuples. MUST NOT be named `biomeAffinity.js` / export
   `getBiomeAffinityModifier`; MUST NOT throw (invalid/missing axis -> skip / return `{}`);
   MUST NOT mutate session/combat; MUST NOT return a single `biome_id`.
3. **Cosmetic hint surface (Gate-5 closure)** -- on `all_connected_marked` stamp
   `session.branco_biome_hint = {leans_toward, weights, line}` ONLY when
   `isImprintEnabled()` (guard at write site, mirror the stamina pattern
   session.js:~2628-2632). Add ONE additive field to `publicSessionView`
   (`sessionHelpers.js` ~L534-546): `branco_biome_hint: session.branco_biome_hint || null`
   (copy the `overcharge_used_this_run` / `stresswave_event` null-default additive
   pattern). Flag OFF => field byte-identically null => band-neutral. Public-tier: cosmetic
   string + top biome only, NO route binding, NO raw numbers.
4. **Godot surface chip** -- cross-repo (section 6). NOTHING flips
   `IMPRINT_BEAT_ENABLED` ON until the consumer exists. Flip = a later master-dd call
   after the surface lands + playtest.
5. **DEFERRED (out of MVP)** -- route-vote weighting (feeding imprint weights into
   `META_NETWORK_ROUTING`) stays OFF/unbuilt; optional axis->trait grant = separate
   non-band-neutral spec.

## 6. Godot chip scope (cross-repo Game-Godot-v2)

Prereq: Game backend STEP 1-3 merged, flag still OFF. (1) PHONE device-authority input --
4 phones in parallel, each owns ONE axis, binary prompt + 2 buttons + descriptions from
`onboarding_v2.axes`; on commit sends the socket-bound `imprint_mark` WS intent (NO
player_id in payload) with REST fallback; renders own marked/waiting (N/M) off
`imprint_tally`. (2) Optional TV mirror -- briefing lines + creature-card silhouettes
filling in (the "4 creature 1 bioma" moment); TV never an input device (excluded via
`lifecycleQuorumPids`). (3) In-match hint chip -- read-only, reads
`publicSessionView.branco_biome_hint`, null-safe (renders nothing when null/flag OFF), no
route binding, no numbers. (4) NO host-only start button -- beat opens via host OPEN but
advances on device quorum. Mirror the existing SPEC-J/K Godot consumer chips
(per-device intent, snapshot-driven, anonymous counts-only). Stage: phone input + hint
chip first, TV cinematic follow-up.

## 7. MUST-NOT-REGRESS

- No host-token start: host may only OPEN/CANCEL/force; the COMMIT is the device quorum.
- No phase collapse: `character_creation` and `world_setup` stay separate gated phases;
  the beat sits BEFORE `character_creation`, never auto-jumps to combat.
- No single-owner campaign: all 4 players are first-class device-authority participants
  (no `players[0]`-only).
- No producer name/path collision: `services/imprint/imprintBiomeWeights.js` /
  `computeImprintBiomeWeights`, NOT `biomeAffinity.js`/`getBiomeAffinityModifier`.
- No binding biome assignment: the affinity is cosmetic weights only; biome stays
  route-canon; never feeds damage/score/affinity/route math.
- Non-throwing producer (return `{}`/skip, unlike `resolveBiome`'s throw-guards).
- Band-neutral: flag OFF => `branco_biome_hint` byte-identically null + beat never opens.
- Gate-5: never ship the producer / field as a producer-only PR without the Godot
  consumer; flip ON only after the surface lands.
- State hygiene: clear `imprintMarks` in startRun/startOnboarding/advanceScenarioOrEnd.
- Connected-only tally (a disconnect abandons the pending mark); reuse
  `lifecycleQuorumPids`.
- Additive `publicSessionView` field defaults null, never changes existing response shape.

## 8. Test plan

- coopOrchestrator imprint unit (mirror `coopOrchestratorImprintV2.test.js`): per-player
  store; `all_connected_marked` over connected set; `tryAdvanceImprint` no-op unless
  quorum; disconnect-of-last-pending COMPLETES quorum -> `character_creation`; host cannot
  commit; anti-deadlock fires; cleared on run-reset sites.
- REST (mirror `coopImprintRest.test.js`): authPlayer 403 bad token; reject ghost/non-room;
  400 invalid axis/value (non-throwing); returns + broadcasts tally; host-only open/cancel
  reject non-host.
- WS (`wsSession`): `imprint_mark` drains server-side (not relayed to host), broadcasts
  tally, acks submitter; `close` re-evaluates + can auto-advance; submitter socket-bound.
- producer unit: 16 combos -> expected buckets; normalize sum=1; empty/partial -> `{}`,
  never throws; weights-only (no biome_id, no mutation); distinct name/export.
- `publicSessionView` (mirror `ermes_band`/`overcharge_used_this_run` asserts):
  `branco_biome_hint` null when OFF, populated when ON post-quorum; public-tier; additive.
- Band-neutrality: combat + meta-loop oracle with flag OFF byte-identical to baseline;
  grep assertion that imprint weights are never read by damage/affinity/route code.
- Regression: `node --test tests/ai/*.test.js`, coop+WS suite, `npm run format:check`, and
  the existing onboarding/character_creation/world_setup phase tests stay green.

## 9. Open risks

- Placement A (real phase) blast-radius (enum + whitelist + reset sites); B avoids it but
  loses the dedicated `phase_change` frame (Godot needs a synthetic trigger off the tally).
- Subjective UX owner-gated: diegetic prose + hint string are master-dd-authored; building
  with placeholder copy risks shipping machine-prose.
- axis->trait grant pending: aa01 V2 dropped V1's choice->trait_id (axes have NO mechanical
  effect today); granting traits later = non-band-neutral, separate spec.
- aa01 `transition_line` cosmetic bug substitutes raw `biome_id` not a human name -- if any
  template logic is reused, carry the human-name lookup.
- Producer weight semantics are SDMG (self-designed): "aggregate 16 sub-combos per biome +
  normalize" is one interpretation; ratify only if/when route-vote weighting is built.
- Gate-5 sequencing: the Godot chip is cross-repo + depends on backend STEP 1-3; flag
  stays OFF until the surface exists, so the backend PRs ship inert (accepted).
- Anti-deadlock defaulting (reuse 15s `default_choices` VELOCE/PROFONDA/DURA/LONTANO)
  silently picks for a non-responder -- is a defaulted imprint acceptable, or should it
  block? Surface if defaulting changes the team aggregate materially.

## 10. Sequencing / dependencies

C1 ratified -> this build-spec (review_needed) -> master-dd decides the 3 sub-calls
(section 4) -> backend STEP 0-3 (flag-OFF, band-neutral, master-dd merges) -> Godot chip
(cross-repo) -> flip `IMPRINT_BEAT_ENABLED` after the surface lands + playtest. Route-vote
weighting + axis->trait = later/separate. The `aa01/*` branches stay preserved until each
piece integrates.

## 11. Implementation status (2026-06-22)

**Backend STEP 0-3 BUILT** -> PR #2970 (`feat/aa01-c2-imprint-backend`), flag-OFF /
band-neutral, awaiting master-dd merge. ~45 imprint tests; coop 235/235 + AI 554/554.
`coop-phase-validator` adversarial review (2 P1 + 3 P2 + 1 P3 + 1 follow-up) all resolved.

Refinements made during the build (vs the spec above):

- **Beat is NON-gating** (host-opened side-collection, mirror `formPulses`) -- it does NOT
  intercept the onboarding->character_creation transition; the client sequences it
  post-onboarding. Lowest blast-radius realization of 4.1-B; zero phase-machine change.
- **Producer name** = `services/imprint/imprintBiomeWeights.js` /
  `computeImprintBiomeWeights` (NOT `biomeAffinity`, which is taken by species combat
  affinity).
- **STEP 3 surface = coop-state** (`branco_biome_hint` in `broadcastCoopState` +
  reconnect/host-transfer/disconnect parity + guarded `snapshot()`). The
  `publicSessionView` in-match field is DEFERRED (D3) -- co-op clients read coop-state,
  which carries the run-scoped hint; thin follow-up only if a combat-only consumer ever
  needs it. **Verified 2026-06-23: no such consumer exists** -- the only imprint-hint
  consumer is the Godot phone chip (`phone_imprint_hint_chip.gd`), mounted on the composer
  root so it persists into combat and reads the hint off coop-state (`imprint_tally`); no
  TV / combat-HUD surface reads `publicSessionView` for the hint. Adding the field now =
  engine-LIVE / surface-DEAD (Gate-5). Stays deferred; build only if a future solo /
  non-coop combat HUD needs it.
- **Anti-deadlock** = host `POST /coop/imprint/force` (explicit force-complete with
  defaults) + host cancel. The silent auto-timer (build-spec open-risk) stays a master-dd
  design call; NOT built.
- **Empty-connected guard**: `open` rejects `no_connected_players` (the host opens after
  devices connect).

Residual (NOT in this MVP): Godot surface chip (cross-repo, prereq = #2970 merged) ->
flip `IMPRINT_BEAT_ENABLED` after surface + playtest; `publicSessionView` field;
auto-timer (master-dd); route-vote weighting (meta-network flip); axis->trait grant.

**2026-06-23 disposition of the deferred residuals** (full tracker:
[`2026-06-22-aa01-deferred-tracker.md`](2026-06-22-aa01-deferred-tracker.md)):

- **D3 `publicSessionView` field** -> stays DEFERRED. Gate-5 verified (above): coop-state
  already delivers the hint in-match; no consumer reads `publicSessionView`. No build.
- **D5 route-vote weighting** -> design-note
  [`2026-06-23-aa01-imprint-route-vote-weighting-design-note.md`](2026-06-23-aa01-imprint-route-vote-weighting-design-note.md)
  (PROPOSED; doubly-gated behind `META_NETWORK_ROUTING` + Godot route-UI; SDMG semantics;
  no build now).
- **D6 axis->trait grant** -> spec DRAFT
  [`2026-06-23-aa01-imprint-axis-trait-grant-spec-draft.md`](2026-06-23-aa01-imprint-axis-trait-grant-spec-draft.md)
  (NON-band-neutral new feature; master-dd ratify + N=40 before any code).
