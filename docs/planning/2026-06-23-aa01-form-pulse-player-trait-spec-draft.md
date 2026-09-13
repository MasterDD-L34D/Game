---
title: 'Form-Pulse trait system v2 -- per-player minor trait + always-emerge + random-fill (DRAFT, NON-band-neutral, master-dd ratify)'
date: 2026-06-23
sprint: aa01-impronta-reconciliation
doc_status: draft
doc_owner: claude-code
workstream: cross-cutting
last_verified: '2026-06-23'
source_of_truth: false
language: it-en
review_cycle_days: 90
---

# Form-Pulse trait system v2 -- design spec DRAFT

> **Status: DRAFT / PROPOSED -- NON-canon, NON-band-neutral, master-dd ratify + N=40 BEFORE
> any code.** This extends the EXISTING Form-Pulse -> shared branco-trait system
> (`brancoTraitEmergence`, MA1 part 2, ADR-2026-06-08) with three master-dd-decided pieces
> (2026-06-23). It is flag-gated: with the flag OFF the Form-Pulse behaves byte-identically
> to today. The mapping(s) + rules stay PROPOSED until ratified via N=40 (mirror MA3).

> **RATIFY VERDICT 2026-06-23 (master-dd), conditional.** Build merged (Game #2992,
> flag-gated OFF). N=40/N=200 evidence:
> [`2026-06-23-aa01-form-pulse-trait-v2-n40-ratify.md`](2026-06-23-aa01-form-pulse-trait-v2-n40-ratify.md).
>
> - **Piece 1 (threshold -> 0 / always-emerge): RATIFIED.**
> - **Flat-tie fallback: first-axis +** (the implemented default).
> - **Piece 2 (per-player minor traits): ratified WITH cap-tier + a COVERAGE CONDITION** --
>   keep the minors genuinely minor (the pool was hardened post harsh-review to reliable T1),
>   AND author "correct" branco+minor combos across ALL MBTI (16) + Ennea (9) branches (the
>   bigger design task; see the trait-coverage chip). This condition gates the minor-trait flip.
> - **Piece 3 (random-fill timeout): built** (rides the same flag).
> - **Before the `FORM_PULSE_TRAIT_V2_ENABLED` flip: a real combat A/B** (win-rate, not just
>   the power proxy) to fix the encounter offset. Flip itself = the dedicated flip chip.
>
> So this doc stays DRAFT until the coverage + combat-A/B conditions close.

## 0. Scope realignment (why this is on Form-Pulse, not Imprint)

A 2026-06-23 ground-truth check found the co-op flow has **two distinct beats**:

|                  | **IMPRINT ("L'Impronta")**   | **FORM-PULSE**                          |
| ---------------- | ---------------------------- | --------------------------------------- |
| Input            | 4 binary pole buttons        | **5 continuous bars/sliders** ([-1,+1]) |
| Ownership        | round-robin, 1-2 axes/player | **every player moves all 5 bars**       |
| Output           | cosmetic biome hint only     | **shared branco TRAIT** + MBTI/VC nudge |
| Per-player trait | none                         | none                                    |

The master-dd design ("per-player bars -> shared branco trait + per-player minor trait
compatible with own bars + the branco trait, with a random fill for whoever does not
participate") lives on **FORM-PULSE**. The shared branco trait already exists; this spec
adds the missing pieces. The IMPRINT items (D3/D5/D6, build-spec + deferred-tracker) are a
separate cosmetic beat -- **D6 (imprint axis->trait) is SUPERSEDED by this spec** (the trait
design moved to Form-Pulse). Imprint's deadline timer stays warn-only (#2977); the
random-fill/timeout here is a Form-Pulse mechanic.

## 1. Existing system (reused as-is)

`services/identity/brancoTraitEmergence.js` + `services/formPulseVc.js` +
`coopOrchestrator._applyBrancoTraitEmergence` (~L812):

1. Each player submits 5 bars (axes in `[-1,+1]`): `solitary_swarm`, `explore_caution`,
   `symbiosis_predation`, `memory_instinct`, `agile_robust`.
2. `aggregateFormPulses` = per-axis **average** across submitting players -> branco aggregate.
3. `emergeBrancoTrait` = **dominant axis** (`argmax|avg|`); if `|avg| >= EMERGENCE_THRESHOLD`
   (0.30) the trait for that axis's pole (sign) emerges. Deterministic tie-break (mapping
   order).
4. Applied to EVERY submitted character (all share the branco trait). Idempotent; a changed
   dominant axis swaps the tracked id; player-chosen traits untouched.

PROPOSED branco mapping (ratify N=40 -- kept):

| Axis                | + pole                | - pole                        |
| ------------------- | --------------------- | ----------------------------- |
| solitary_swarm      | `legame_di_branco`    | `mimetismo_cromatico_passivo` |
| explore_caution     | `sensori_sismici`     | `sensori_geomagnetici`        |
| symbiosis_predation | `ferocia`             | `empatia_coordinativa`        |
| memory_instinct     | `cervello_predittivo` | `cervello_a_bassa_latenza`    |
| agile_robust        | `pelle_elastomera`    | `zampe_a_molla`               |

**Decided (master-dd 2026-06-23): keep the dominant-axis model + this mapping.**

## 2. Piece 1 -- always-emerge (threshold -> 0), flag-gated

**Decided**: the branco should ALWAYS receive a trait (no "indeciso -> nothing"). Make
`EMERGENCE_THRESHOLD` **configurable**; the new mode = 0 (always emerge the dominant-axis
trait, even weak).

- **Flag-gated / band-neutral**: default threshold stays **0.30** (today's behavior). Only
  with the v2 flag ON does it drop to 0. Flag OFF => byte-identical.
- **Flat-tie fallback (open call)**: at threshold 0, a perfectly flat aggregate (every
  `avg == 0`) has no signed dominant axis. Deterministic fallback = first axis in mapping
  order, pole `+` (or: no-emerge even at threshold 0). **Ratify which.**

## 3. Piece 2 -- per-player minor trait (NEW)

**Decided**: each player ALSO receives a **minor/passive trait** (distinct category from the
shared branco slot -- the D6=D "categoria distinta" decision), derived from THEIR OWN bars,
**complementing** the branco trait.

**Algorithm (COMPLEMENT rule -- decided):**

1. Compute the player's own dominant axis = `argmax|player's 5 bars|`.
2. If that axis **equals the branco's dominant axis**, use the player's **2nd-strongest**
   axis instead -> the minor trait COMPLEMENTS (never duplicates) the shared branco trait.
   "Compatible" = non-duplicate / complementary.
3. Map (axis, pole) -> a **minor-pool** `trait_id` (distinct from the branco mapping;
   minor/passive tier). Apply to that player's OWN creature only.

**PROPOSED minor-pool mapping (2026-06-23; ratify + N=40).** A SEPARATE 5x2 table of T1
`trait_id`s, DISTINCT from the branco mapping (the minor trait reads as a smaller, personal
flavor, not a second branco-combat trait). Tier = **T1-any** (master-dd: thematic fit over
passive-only). Fit flags: OK unless noted.

| Axis                | + pole (label) | minor trait `+`         | - pole (label) | minor trait `-`                    |
| ------------------- | -------------- | ----------------------- | -------------- | ---------------------------------- |
| solitary_swarm      | Sciame         | `biofilm_glow` (~loose) | Solitario      | `camere_mirage`                    |
| explore_caution     | Cauto          | `cuticole_cerose`       | Esplora        | `antenne_dustsense`                |
| symbiosis_predation | Predazione     | `denti_seghettati`      | Simbiosi       | `comunicazione_fotonica_coda_coda` |
| memory_instinct     | Memoria        | `sensori_planctonici`   | Istinto        | `coda_prensile_muscolare`          |
| agile_robust        | Robusto        | `cartilagini_biofibre`  | Agile          | `coda_stabilizzatrice_filo`        |

All ids verified to exist as RELIABLE T1 effects in `active_effects.yaml`. **Updated after the
harsh review of the build (Game #2992)**: the original `memory_instinct` picks were broken --
`ancestor_autocontrollo_...fr_06` is engine-INERT (its `requires_target_tag` enemy-tag system is
not wired) and `ali_fulminee` is elevation-gated (~never fires on flat maps) -- replaced with
`sensori_planctonici` (memetic pattern-read, `damage_reduction`) + `coda_prensile_muscolare`
(reactive grip, `apply_status`), both reliable on-hit. The earlier `mente_focalizzata` rename
proposal is DROPPED (the ancestor id is no longer used; per the istruttoria the `ancestor_`
naming is a ratified convention anyway). `solitary_swarm +` stays ~loose. Do NOT reuse branco ids.

**Open calls (ratify):** confirm the proposed ids above (esp. the `solitary_swarm +` ~loose
cell); whether the minor trait is stripped/re-derived if the
player re-submits (mirror the branco idempotent swap); whether a 2-axis tie inside a single
player's bars uses mapping order (yes, for determinism).

## 4. Piece 3 -- random-fill + 2-stage timeout (NEW)

**Decided**: a player who does not submit must not block the branco emergence forever; on
timeout their bars are **rolled at random** and feed BOTH the branco aggregate AND their own
minor trait.

- **2-stage** (mirror the imprint #2977 escalation shape, but it ACTS here): at the **warn**
  deadline -> a non-blocking warning broadcast (devices nudge the laggards); at the **auto**
  deadline -> roll the missing players' bars.
- **Real random, frozen on roll**: the user wants genuinely random bars (NOT a deterministic
  hash). Reconcile with reconnect/replay-safety by **rolling ONCE server-side and persisting
  the rolled values into `formPulses`** (exactly like a real submission). After the roll the
  state is frozen, so reconnect/snapshot stay consistent. The RNG is an injectable seam (DI,
  mirror `_setTimeoutFn`) so tests are deterministic; production uses a real roll.
- **Feeds everything**: the rolled bars enter `aggregateFormPulses` (branco) AND that
  player's per-player minor trait (Piece 2). A randomly-filled player thus gets a coherent
  minor trait from their rolled profile.
- **Timing (per-player scaled -- decided knob A)**: warn + grace scale with the connected
  player count (more devices = more coordination time). PROPOSED defaults (ratify): warn =
  45000ms, grace = +30000ms, + a per-extra-player increment. All env-configurable, not
  hardcoded.
- **Flag-gated**: default OFF = Form-Pulse has NO timeout (today's behavior: a non-submitter
  blocks emergence until they submit). Flag ON arms the 2-stage timer.

## 5. Flag + band-neutrality

ALL of Pieces 1-3 sit behind a single v2 flag (e.g. `FORM_PULSE_TRAIT_V2_ENABLED`, default
OFF). OFF => threshold 0.30, no timeout, no per-player minor trait, no random-fill =
byte-identical to today. The mapping(s) + timing + flat-tie rule stay PROPOSED until N=40.

## 6. P6 Fairness implications (ratify-blocking)

- The branco trait (shared) + a per-player minor trait = MORE team power than a baseline run.
  The minor traits are a DISTINCT minor/passive tier (D6=D) to cap the creep; N=40 must
  confirm the combined load vs encounter difficulty.
- Random-fill gives an absent player a real (rolled) minor trait + shifts the branco
  aggregate -- acceptable because it is the team's anti-deadlock, but the roll must be a
  minor/passive trait (low stakes), not a strong combat trait.
- Solo applicability: if Form-Pulse is co-op-only, solo runs never get these -> account for
  the solo-vs-co-op gap.

## 7. Open calls -- ratify checklist (master-dd + N=40)

1. The flat-tie fallback at threshold 0 (first-axis-+ vs no-emerge).
2. The minor-pool 5x2 mapping is now PROPOSED (sec.3, hardened post harsh-review #2992 to
   reliable T1 ids); ratify-confirm the ids (esp. the `solitary_swarm +` ~loose cell).
3. Timing defaults + the per-player scaling increment.
4. Re-derivation on re-submit (strip/swap the minor trait like the branco one?).
5. Solo applicability.
6. **Wiring VERIFIED 2026-06-23** (live wire-truth drive of the real orchestrator): the
   Godot Form-Pulse bars send the 5 creature-axis keys (`phone_form_pulse_view.gd`
   `_collect_form_axes`); `wsSession.js` passes `allPlayerIds` (host-excluded, #2073);
   `submitFormPulse` stores keys verbatim; emergence fires (`ferocia` emerged from a
   symbiosis_predation-leaning aggregate + applied to ALL characters). The
   `_applyBrancoTraitEmergence` "phone MBTI axes yield no emergent" comment is STALE --
   clean it up at build time (doc hygiene, no behavior change).

## 8. Build plan (after ratify)

Mirror `brancoTraitEmergence` discipline (pure producer + PROPOSED mapping + flag-gated +
TDD):

1. Make `EMERGENCE_THRESHOLD` injectable; v2 flag -> 0 + flat-tie fallback. Tests.
2. `emergePlayerMinorTrait(playerAxes, brancoAxis, opts)` pure helper (complement rule +
   minor-pool mapping). Tests (incl. the dominant==branco -> 2nd-axis case).
3. `_applyPlayerMinorTraits()` -> each character gets its own minor trait; idempotent.
4. 2-stage timer on the Form-Pulse open/submit path (DI `_setTimeoutFn` + RNG seam; persist
   rolled bars). Tests mirror `coopOrchestratorLethalAutoTimer.test.js`.
5. Godot: Form-Pulse view shows the warn + (optional) the rolled-fill; surface the per-player
   minor trait + branco trait in the debrief/roster. Gate-5: ship the consumer with the
   producer.

## 9. Disposition

**DRAFT.** No code until master-dd ratifies the open calls (sec.7) + the mapping(s) clear an
N=40 balance pass. On ratify, build per sec.8 (flag OFF until the surface lands + playtest).
On decline of any piece, that piece stays unbuilt (the others can ship independently behind
the flag). Supersedes the D6 imprint-axis->trait direction.
