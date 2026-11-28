---
title: Handoff -- Form-Pulse trait v2 coverage + ratify (2026-06-24)
date: 2026-06-24
sprint: aa01-impronta-reconciliation
doc_status: active
doc_owner: claude-code
workstream: cross-cutting
last_verified: '2026-06-24'
source_of_truth: false
language: it-en
review_cycle_days: 90
---

# Handoff -- Form-Pulse trait v2 coverage + ratify (2026-06-24)

## TL;DR

- FORM_PULSE trait v2 **coverage condition CLEARED + RATIFIED** (master-dd 2026-06-24): the branco +
  minor mappings, cap-tier, and threshold->0 are accepted. PR [#3016](https://github.com/MasterDD-L34D/Game/pull/3016) MERGED.
- Closed the minor-pool ratify gate (chip `task_6d88f23a`). The prod flag stays OFF -- ratify != flip.
- 4 PRs merged this session; **0 open PRs** left.
- Next unblock for FORM_PULSE: set the encounter-offset VALUE, then the env flag flip on Ryzen (NOT done here).

## PR merged (4)

| PR                                                       | Scope                                                        | SHA (squash) | Test                         |
| -------------------------------------------------------- | ------------------------------------------------------------ | ------------ | ---------------------------- |
| [#3016](https://github.com/MasterDD-L34D/Game/pull/3016) | FP coverage matrix + 4 inert remaps + S-pole + cap-tier gate | `3ae83007`   | +6 gate tests; cluster 34/34 |
| [#3026](https://github.com/MasterDD-L34D/Game/pull/3026) | doc-salvage net-new (membrane + eco)                         | merged       | --                           |
| [#2957](https://github.com/MasterDD-L34D/Game/pull/2957) | creature-lore draft name polish                              | merged       | --                           |
| [#2918](https://github.com/MasterDD-L34D/Game/pull/2918) | daily tracker index refresh                                  | `a8acd82a`   | --                           |

## What #3016 actually did

Engine-LIVE audit of all 10 branco + 10 minor axis-pole picks across **16 MBTI + 9 Ennea** branches
(`apps/backend/services/identity/brancoTraitEmergence.js`). Core finding: `action_type: passive` +
`buff_stat` has **NO runtime consumer** (only `move_bonus` + active abilities consume `buff_stat`),
and `requires: posizione_sopraelevata` fires ~never on flat maps. So 4 picks were engine-inert/near-inert
(the same class the #2992 harsh review caught on the minor pool, on poles it did not check):

| Pole         | OLD (broken)                       | -> NEW (LIVE)                 |
| ------------ | ---------------------------------- | ----------------------------- |
| Branco I     | `mimetismo_cromatico_passivo`      | `mente_lucida`                |
| Branco F     | `empatia_coordinativa`             | `spirito_combattivo`          |
| Branco Agile | `zampe_a_molla`                    | `coda_stabilizzatrice_vortex` |
| Minor F      | `comunicazione_fotonica_coda_coda` | `membrane_eliofiltranti`      |
| Branco S     | `sensori_sismici` (weak, gated)    | `cartilagini_flessoacustiche` |

Plus: cap-tier ENFORCED by `tests/services/formPulseTraitV2Coverage.test.js` (minors T1 +
engine-live-reliable + applies_to/kind side-consistent; asserts the old picks FAIL). Power proxy
hardened (zero passive buff_stat); N=200 re-run ~1.2/creature, now uniform across branches.
**Empirically re-verified** by running the real engine on all 24 traits (20 LIVE / 4 inert, all correct).
Coverage matrix doc: `docs/planning/2026-06-23-aa01-form-pulse-trait-v2-coverage-matrix.md` (RATIFIED).

## Blockers residui (FORM_PULSE, before prod flag flip)

- [ ] **Encounter-offset VALUE** -- design calibration (~1.2/creature; direction justified by the
      A/B in #3017). Set the exact number/tier-cap before flip.
- [ ] **`FORM_PULSE_TRAIT_V2_ENABLED` prod env flip** -- Ryzen operator only (`.env` edit + restart on
      `C:/Users/VGit/Desktop/Game`); see `docs/godot-v2/qa/2026-06-23-prod-flag-flip-readiness.md`.
      NOT executable from Lenovo. Ratify != flip.
- [ ] **IMPRINT** -- code-complete + playtest PASS; remaining = master-dd **sign-off** then
      `IMPRINT_BEAT_ENABLED` flip (separate beat, chip `task_3e8e207b`).

## Next entry point

1. **First action**: decide the encounter-offset value/tier-cap (master-dd design call), then update
   the readiness doc + hand to the Ryzen operator for both env flips.
2. **Reference**: `2026-06-23-aa01-form-pulse-trait-v2-coverage-matrix.md` (sec.3 + sec.10),
   `2026-06-23-aa01-form-pulse-trait-v2-n40-ratify.md`, `2026-06-23-prod-flag-flip-readiness.md`.
3. **Reproduce the power figure**: `node tools/sim/fp-trait-delta-probe.js --n 200`.
4. **Optional**: Godot Form-Pulse 5-bar UX (the backend emergence is dormant until pulses are fed).

## Memory

Cross-session state persisted in:

- `trait-engine-live-surface` -- the engine LIVE/inert predicate + the #3016 picks (RATIFIED+MERGED).
- `form-pulse-v2-session-close-2026-06-23` -- full workstream state + the 2026-06-24 UPDATE block.
