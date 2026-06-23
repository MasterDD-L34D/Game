---
title: 'aa01 reconciliation -- deferred-items tracker + session change log (2026-06-22)'
date: 2026-06-22
sprint: aa01-impronta-reconciliation
doc_status: active
doc_owner: claude-code
workstream: cross-cutting
last_verified: '2026-06-22'
source_of_truth: true
language: it-en
review_cycle_days: 90
---

# aa01 reconciliation -- deferred tracker + change log

> Single tracker for everything the 2026-06-22 aa01 Sprint-Impronta reconciliation
> SHIPPED and everything it DEFERRED (with the gate on each). Mirrored in the
> codemasterdd hub (`docs/handoffs/2026-06-22-aa01-reconciliation-deferred-tracker.md`).
> Deferred items are cross-referenced from `BACKLOG.md` + the aa01 plan + spec. **aa01 /
> L'Impronta is its own track -- NOT part of the SPEC-A..Q reconstruction suite**; SPEC /
> meta-network links are noted only where a deferred item genuinely touches them.

> **Update 2026-06-22 (chip done):** **D1 phone surface + cosmetic hint chip DONE** --
> GGv2 [#531](https://github.com/MasterDD-L34D/Game-Godot-v2/pull/531) MERGED (stage 1:
> phone device-authority input + hint chip; GUT tests). The TV briefing / creature-
> silhouette cinematic is the remaining D1 follow-up. **D2 (flip `IMPRINT_BEAT_ENABLED`)
> is now the NEXT gate** -- the consumer exists, so the flip is gated only on a playtest +
> master-dd (still NOT autonomous: prod-affecting flag).

> **Update 2026-06-22 (D1 follow-up done):** the TV briefing / creature-silhouette cinematic
>
> - the host-open trigger landed -- GGv2 [#535](https://github.com/MasterDD-L34D/Game-Godot-v2/pull/535)
>   (host auto-opens on the lobby->character_creation seam, band-neutral: opens FIRST, mounts
>   only on success, 409 imprint_disabled -> proceed; `MainImprint` + `ImprintCinematicView`
>   N-silhouette TV mirror + cosmetic hint; `CoopApi.open/cancel/force_imprint`; device-quorum
>   advance; 47 GUT). **D1 is now fully DONE** (phone #531 + host/TV #535). **D2 (flip
>   `IMPRINT_BEAT_ENABLED`) is gated only on a co-op playtest + master-dd** (still NOT
>   autonomous: prod-affecting flag).

> **Update 2026-06-23 (D3/D5/D6 disposition):** the 3 remaining backend-side deferred
> items were scoped against the live code (master-dd-gated, no engine code shipped):
>
> - **D3 `publicSessionView` field** -> stays DEFERRED. Gate-5 verified: the ONLY
>   imprint-hint consumer is the Godot phone chip (`phone_imprint_hint_chip.gd`), mounted
>   on the composer root so it persists into combat and reads the hint off coop-state; no
>   TV / combat-HUD surface reads `publicSessionView` for the hint. Adding the field now =
>   engine-LIVE / surface-DEAD. Build only if a future solo / non-coop combat HUD needs it.
> - **D5 route-vote weighting** -> design-note authored (PROPOSED, master-dd-gated):
>   [`2026-06-23-aa01-imprint-route-vote-weighting-design-note.md`](2026-06-23-aa01-imprint-route-vote-weighting-design-note.md).
>   Doubly-gated (`META_NETWORK_ROUTING` OFF + Godot route-UI) + SDMG semantics -> no build
>   now; the note is the ratified-design parking spot for when the meta-network flip is a
>   real call.
> - **D6 axis->trait grant** -> spec DRAFT authored (NON-band-neutral, master-dd ratify):
>   [`2026-06-23-aa01-imprint-axis-trait-grant-spec-draft.md`](2026-06-23-aa01-imprint-axis-trait-grant-spec-draft.md).
>   Mirrors `brancoTraitEmergence` governance; no code until master-dd picks the stacking +
>   mapping AND it clears an N=40 balance pass.

## 1. Shipped this session (merged / open PRs)

| PR                                                       | Content                                                                                                                                                            | Status |
| -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------ |
| [#2958](https://github.com/MasterDD-L34D/Game/pull/2958) | CAP-06 elevation refactor (`computePositionalDamage` -> `elevationDamageMultiplier` helper) + regression test                                                      | MERGED |
| [#2970](https://github.com/MasterDD-L34D/Game/pull/2970) | C2-imprint backend MVP (additive device-authority beat + `imprintBiomeWeights` producer + cosmetic hint; flag `IMPRINT_BEAT_ENABLED` OFF, band-neutral)            | MERGED |
| [#2959](https://github.com/MasterDD-L34D/Game/pull/2959) | Docs: aa01 plan + harsh-review (10 findings) + Track A (CHANGELOG adopt, README de-drift) + B1 verdict + C1 spec (ratified) + C2-imprint build-spec + this tracker | open   |

Per-CAP disposition (13 branches, all preserved on `origin/aa01/cap-*`):

- CAP-02 flint-status -> **DROP** (gitignored auto-snapshot).
- CAP-03 README / CAP-04 CHANGELOG / CAP-06 elevation -> **Track A** (shipped).
- CAP-07 terrain bridge -> **SUPERSEDED** (main already has the live stateful
  `tile_state_map` system; bridge = dead duplicate). One carve-out deferred (below).
- CAP-11 biomeResolver -> **AFFINITY** (built as `imprintBiomeWeights`).
- CAP-12 PlayerRunTelemetry -> **DEFER** (below).
- CAP-13/13b/14b -> UX museum-reference (no code).
- CAP-14/15/15b -> reconciled into the additive imprint beat (built).

## 2. Deferred items (the tracker)

| #   | Item                                              | What it is                                                                                                          | Gated on                                                                                                                                                 | Track / link                                                                                                  |
| --- | ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| D1  | **C2-imprint Godot surface**                      | The phone/TV client for the beat + cosmetic hint chip (cross-repo Game-Godot-v2)                                    | **DONE** -- #531 (phone+hint) + #535 (host-open + TV cinematic); playtest pending -> D2                                                                  | aa01 -> build-spec sec.6                                                                                      |
| D2  | **`IMPRINT_BEAT_ENABLED` flip**                   | Turn the imprint beat ON in prod                                                                                    | **D1 surface landed (#531)** -> playtest + master-dd (NEXT gate)                                                                                         | aa01 (Gate-5)                                                                                                 |
| D3  | **C2-imprint `publicSessionView` in-match field** | An additive combat-session hint field (today the hint rides coop-state)                                             | VERIFIED 2026-06-23: none (coop-state covers in-match; Godot phone chip persists into combat) -> stays deferred, Gate-5                                  | aa01 -> build-spec sec.5 STEP 3                                                                               |
| D4  | **C2-imprint auto-timer defaulting**              | Silent auto-default of unmarked axes on timeout (host `force` already exists)                                       | master-dd design call ("is a defaulted imprint acceptable?")                                                                                             | aa01 -> build-spec open-risk                                                                                  |
| D5  | **C2-imprint route-vote affinity weighting**      | The 2nd affinity consumer (master-dd picked hint + route-vote; only hint built)                                     | `META_NETWORK_ROUTING` flip + Godot route-UI                                                                                                             | aa01 + **meta-network / GAP-C** -> [design-note](2026-06-23-aa01-imprint-route-vote-weighting-design-note.md) |
| D6  | **C2-imprint axis->trait grant**                  | Make the 4 axes grant mechanical traits (aa01 V2 dropped V1's choice->trait_id)                                     | master-dd ratify + N=40, separate spec (NON-band-neutral; touches roster/combat) -> [spec DRAFT](2026-06-23-aa01-imprint-axis-trait-grant-spec-draft.md) | aa01                                                                                                          |
| D7  | **C2-imprint diegetic prose + hint-string**       | Player-facing copy + "il tuo branco tende verso X" wording                                                          | master-dd-authored (codex-lore HITL boundary)                                                                                                            | aa01                                                                                                          |
| D8  | **CAP-07 chain-lightning propagation**            | `chainElectrified` multi-tile BFS over the persistent `tile_state_map` on an electrified tile                       | master-dd balance design (chain radius + per-tile damage)                                                                                                | terrain reactions (M14-A legacy), NOT a SPEC letter                                                           |
| D9  | **CAP-12 PlayerRunTelemetry canon-home**          | Where `vcSnapshot` + `selectedForm` cross-run telemetry lives (standalone Prisma / fold into campaign-save / defer) | a dedicated design-spec (home + producer + auth/PII); migration = forbidden-path + ADR                                                                   | aa01 + **SPEC-M (Form-Pulse/MBTI)** + reconstruct-from-ledger doctrine (SoT 13.9 / 00D 16.4)                  |

Notes:

- **Correction recorded** (D9 context): the prior "PlayerRunTelemetry aligned ADR-2026-06-07
  pt3" framing is OVERSTATED -- the only ADR-2026-06-07 is
  `device-authority-tv-mirror-canon` (no "pt3"; does not sanction vcSnapshot/selectedForm
  persistence). `selectedForm` is non-canonical backend naming today.
- **D4/D5/D6** are the explicit C2-imprint build-spec open-risks; **D8** is the CAP-07 B1
  carve-out; **D9** is the CAP-12 defer.

## 3. SPEC A..Q mapping

aa01 / L'Impronta is a **distinct reconciliation track**, not a SPEC-A..Q reconstruction
item -- so most deferred items above are aa01-track, not SPEC-letter. The only genuine
cross-links:

- **D9 telemetry** touches **SPEC-M** (Form Pulse / MBTI) + the canon reconstruct-from-
  ledger doctrine (vcSnapshot is session-scoped, reconstructed, not independently
  persisted). Any telemetry-home spec must respect that doctrine.
- **D5 route-vote weighting** touches the **meta-network / GAP-C** routing layer
  (`META_NETWORK_ROUTING`, flag OFF + Godot-route-UI gated) -- it can only light up after
  that flip.

No deferred item is blocking any SPEC-A..Q acceptance criterion; they extend the aa01
imprint feature. The SPEC roadmap carries a one-line pointer to this tracker.

## 4. Where these are tracked

- This tracker (SoT) -- Game `docs/planning/` + codemasterdd hub `docs/handoffs/`.
- `BACKLOG.md` -- the aa01 reconciliation section (Track A/B/C + the deferred list).
- `docs/planning/2026-06-22-aa01-impronta-reconciliation-plan.md` (parent plan) +
  `docs/planning/2026-06-22-aa01-cap11-limpronta-reconciliation-spec.md` (C1) +
  `docs/planning/2026-06-22-aa01-c2-imprint-build-spec.md` (C2, sec.11 status).
- Memory: `project_aa01_impronta_reconciliation.md`.
