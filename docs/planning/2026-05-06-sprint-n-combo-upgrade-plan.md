---
title: 'Sprint N+ COMBO upgrade plan — onboarding 2-step + vote co-op + world muta'
doc_status: draft
doc_owner: master-dd
workstream: cross-cutting
last_verified: 2026-05-06
source_of_truth: false
language: it
review_cycle_days: 30
related:
  - docs/planning/2026-05-06-opt-c-execution-plan.md
  - docs/planning/2026-05-06-onboarding-port-decisions.md
  - docs/planning/2026-05-06-character-creation-port-godot-spec.md
  - docs/reports/2026-05-06-multi-system-audit-master.md
  - docs/reports/2026-05-06-world-gen-audit.md
---

# Sprint N+ COMBO upgrade — post-foundation playtest decision

## Status

DRAFT — pre-greenlight playtest. Ship condizionato a:

1. Sprint M.6 BASE narrative onboarding shipped + playtested
2. Pillar foundation P3+P4 🟢 candidato confermato (post Opt C 3 track shipped)
3. Master-dd verdict playtest data: "player cita choice in debrief" + "sente identity"

## Scope user vision

**User feedback 2026-05-06**: "non una scelta ma combinazione di risposte che mutano mondo e ti donano prima combo".

Sprint M.6 BASE = 1 scelta → 1 trait. NON è la full vision.

Sprint N+ COMBO upgrade implementa:

- **Q1 COMBO direct**: 2 scelte sequenziali → combo 2 trait
- **Q3 mondo muta**: scenario seed deviation + biome bias hint
- **Q4 vote co-op majority**: ogni player vota, maggioranza vince

## Effort cumulative

| Layer                                       | Ticket                   | Effort   |
| ------------------------------------------- | ------------------------ | -------- |
| Onboarding 2nd choice card + 9 combo design | TKT-NARR-COMBO-2NDCHOICE | 6h       |
| Vote co-op majority protocol                | TKT-COOP-VOTE-MAJORITY   | 4h       |
| World bridge onboarding → enrichWorld       | TKT-WORLD-ONBOARD-BRIDGE | 4h       |
| Scenario seed integer modifier              | TKT-WORLD-SEED-DEVIATION | 3h       |
| Godot phone 2-card UI + vote display        | TKT-GODOT-COMBO-VIEW     | 5h       |
| Tests + harness extension                   | TKT-COMBO-TESTS          | 3h       |
| **Subtotal Sprint N+ COMBO**                |                          | **~25h** |

## Pre-requisiti (hard gate)

Sprint N+ COMBO ship **NON inizia** finché:

- ✅ TKT-P4-ENNEA-VOICE-FRONTEND shipped (Opt C Track 2) → DONE commit `fe456bc3`
- ✅ TKT-P3-INNATA-TRAIT-GRANT shipped (Opt C Track 3) → DONE commit `dd2b513a`
- ✅ TKT-P3-FORM-STAT-APPLIER shipped (Opt C Track 4) → DONE commit `b881717a`
- ⏳ Sprint M.6 Phase B Godot phone_onboarding_view.gd shipped
- ⏳ Playtest BASE: ≥4 amici cite choice in debrief, ≥80% completano in <60s
- ⏳ Master-dd greenlight + COMBO design call (Q2 trait pool finale)

## Q2 trait pool — combo 2nd choice

User Q2 verdict: "pesca dal pool 458 esistenti". NO trait nuovi (evita ADR + schema ripple).

3 candidate scelta-2 (placeholder design — refine post-playtest):

| Option | Label IT                           | Trait pool candidate                                   | Tema         |
| ------ | ---------------------------------- | ------------------------------------------------------ | ------------ |
| **X**  | "Attacca e fuggi" (burst)          | `raffica_breve` o equivalente effect_type=burst_attack | Mordi-fuggi  |
| **Y**  | "Tieni la linea" (formation)       | `formazione_serrata` o effect_type=adjacent_buff       | Difesa coesa |
| **Z**  | "Sfrutta l'ambiente" (biome react) | `adattamento_bioma` o biome_affinity trigger           | Camaleonte   |

Effort design call: ~2h master-dd review pool + select final 3 trait_id.

## Q3 mondo muta architecture

**Audit 2026-05-06 verdict**: world gen runtime consume 29% pacchetto bioma, L2/L3/L4 ZERO wire. Bridge onboarding → enrichWorld possibile via:

### Opzione D — onboardingChoice → enrichWorld branch (~4h)

Pass `onboardingChoice.trait_id` + `combo_trait_2` a `coopOrchestrator.confirmWorld()`. enrichWorld branches:

- **ALIENA tone**: scelta-1 sfuggente → biomi aperti (savana, plains); duro → biomi protected (caverna); letale → biomi pressed (vulcano, abisso)
- **ERMES bias**: scelta-2 burst → role_gap "ranged"; formation → role_gap "tank"; biome react → role_gap "scout"
- **Custode trainer**: deterministic seed shifted by combo hash

Output: `enrichedWorld.aliena.summary_tone` + `enrichedWorld.ermes.role_gap_bias` reflect combo. Player vede mondo "diverso" via narrative summary.

### Opzione D-bonus — scenario seed integer (~3h)

Hash combo `(choice1, choice2)` → seed integer modifier passato a procedural generator. enrichWorld output stays deterministic per combo. NO N scene unique (evita budget content esplosivo).

## Q4 vote co-op majority protocol

Pre-fix Sprint M.6 BASE = host-only. COMBO Sprint N+ = vote co-op majority.

### Schema WS

Backend:

- `intent action='onboarding_vote' option_key=X` → orch tally vote per player
- Quando tutti player ack (count ≥ N/2 + 1) → majority calcolato + commit
- Tie break: option_a default (canonical fallback)

Frontend:

- Phone all player vedono 3 card scelta-1
- Tap card → send vote intent
- Mostra running tally counter live
- Auto-commit quando majority reached
- Per scelta-2 same flow

Effort: ~4h backend protocol + ~2h Godot UI tally display.

## Implementation phasing

Sequential delivery:

**Phase 1 — Backend foundation** (~7h):

- Add 'onboarding_vote_active' state to coopOrchestrator
- voteOnboarding(playerId, optionKey, {allPlayerIds}) majority tally
- World bridge enrichWorld payload extension
- Tests

**Phase 2 — Godot frontend** (~5h):

- 2-card sequential view (.tscn extend phone_onboarding_view)
- Vote tally display realtime
- Result broadcast
- Smoke test

**Phase 3 — Balance + content** (~3h):

- 9 combo trait pair design refinement
- ALIENA tone bias finalize
- Scenario seed deviation integration test

**Phase 4 — Playtest gate** (~2h):

- Userland N=4 master-dd amici cite combo in debrief
- Verify mondo "feels different" per combo
- Tweak biome bias se feedback insufficient

## Risk + mitigation

| Risk                                           | Mitigation                                                                          |
| ---------------------------------------------- | ----------------------------------------------------------------------------------- |
| Content budget esplosivo (9 combo × narrative) | Pair-of-traits + seed integer (NO scene unique). Emily Short Quality-Based pattern. |
| Vote co-op race condition (AFK + tie break)    | Default option_a fallback + 30s vote timeout                                        |
| World muta troppo subtle / non-percepito       | Narrative summary diegetic + post-playtest tweak biome list                         |
| Foundation pillar fix regression               | Hard gate: tracks Opt C 2/3/4 must be 🟢 confermato prima Sprint N+                 |
| Scope creep beyond ~25h                        | Strict ticket boundary, defer non-MVP polish (audio briefing, animations)           |

## Success criteria

- ≥80% player cite combo (NOT just choice 1) in debrief
- ≥3 amici verbatim "il mondo era diverso questa volta"
- ZERO regression Opt C tracks (P3+P4 🟢 candidato preserved)
- Vote majority resolves in <30s avg (timeout = sane default)

## Reversibility

Sprint N+ COMBO = additive backend + frontend. Reversible via revert PR. Sprint M.6 BASE flow preserved as fallback (toggle ENV `ONBOARDING_MODE=base|combo` opt-in).

## Open questions deferred (Sprint N+ planning kickoff)

1. Audio briefing TTS Godot? (default skip MVP)
2. Onboarding replay button? (canonical 51 = NO respec)
3. Mobile UX vote tally — scrollable list o card overlay?
4. Cross-stack test: ngrok + 4 amici phone ≥1h playtest reale prima ship?

## Pickup instructions

Sprint N+ kickoff prerequisites all green → master-dd o Codex chip può:

1. Read this doc + audit master + Opt C plan
2. Spawn parallel chip per Phase 1+2 (back+front parallel)
3. Phase 3+4 sequential post-merge
4. Open PR cumulative o stack of small PRs

Default: questa doc resta `draft` finché Sprint M.6 playtest greenlit.
