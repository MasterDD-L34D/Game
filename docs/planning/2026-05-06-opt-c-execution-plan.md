---
title: 'Opt C execution plan — onboarding BASE + parallel pillar foundation fix'
doc_status: active
doc_owner: master-dd
workstream: cross-cutting
last_verified: 2026-05-06
source_of_truth: false
language: it
review_cycle_days: 30
related:
  - docs/reports/2026-05-06-multi-system-audit-master.md
  - docs/planning/2026-05-06-onboarding-port-decisions.md
  - docs/planning/2026-04-29-master-execution-plan-v3.md
---

# Opt C execution plan — Sprint M.6 + parallel pillar foundation fix

## Status

ACTIVE — master-dd 2026-05-06 verdict: "seguiamo le tue raccomandazioni, parti da quelle e prepara i piani necessari per procedere".

## Strategia

**Opt C cumulative**: ship onboarding BASE host-only ASAP + parallel critical pillar fix (P0 Ennea voice + P3 form mech link). COMBO + vote + world muta = Sprint N+ separate post-playtest BASE.

**Rationale**:

- Phase A backend già shipped (PR #2071 commit `861adcc6`) → BASE schema canonical pronto
- Pillar P3+P4 surface-DEAD anti-pattern blocca user vision sensibile (perché ennea/form stat surface-DEAD = COMBO pre-mature)
- Foundation prima → COMBO informato dai dati playtest BASE
- Total Opt C: ~18-22h cumulative (vs Opt B 67-70h block)

## 4 track parallel

### Track 1 — Sprint M.6 Phase B Godot (5-7h, chip spawn master-dd o Codex)

Vedi `docs/planning/2026-05-06-sprint-m6-godot-chip-spec.md` (separate handoff).

**Scope**:

- `phone_onboarding_view.gd` + `.tscn` (3-stage briefing/choices/transition)
- Timer 30s deliberation + auto-select option_a fallback
- Composer integration MODE_ONBOARDING entry pre-CHARACTER_CREATION
- HTTP fetch campaign onboarding payload o WS receive
- Display `onboarding_chosen` broadcast per phone non-host (read-only)

**Ready dependencies**: backend Phase A `861adcc6` shipped. WS msg type `onboarding_payload` + intent action `onboarding_choice` operational.

**Effort breakdown**:

- View scene + 3-stage swap (2h)
- Timer logic + auto-select (1h)
- Composer integration MODE_ONBOARDING (1h)
- WS payload binding (1h)
- Result broadcast read-only display (1h)
- Test + smoke (1h)

**Out of scope**: vote co-op (Q4 deferred Sprint N+), 2-step COMBO (Q1 deferred Sprint N+), world muta (Q3 deferred Sprint N+).

### Track 2 — TKT-P4-ENNEA-VOICE-FRONTEND (4h autonomous P0)

**Severity**: P0 Gate 5 FAIL critico. CLAUDE.md riga "Gate 5 — Engine wired" violata.

**Scope**: 9/9 Ennea voice palette × 7 beat = 189 line authorate + endpoint `GET /api/session/:id/voice` LIVE → frontend wire in debrief panel (analog ennea badge sezione already live).

**Files**:

- `apps/play/src/debriefPanel.js` — extend con `setEnneaVoice(payload)` setter API
- NEW `apps/play/src/enneaVoiceRender.js` — pure `formatVoiceLine` + `renderEnneaVoice` side-effect (idempotent, follows mating/qbn pattern)
- `apps/play/src/phaseCoordinator.js` — pipe `bridge.lastDebrief.ennea_voice` → `dbApi.setEnneaVoice(...)` quando phase=='debrief'
- `apps/backend/services/rewardEconomy.js buildDebriefSummary` — emit `ennea_voice` field via `selectEnneaVoice` orch helper
- `apps/play/src/debriefPanel.css` — `.db-ennea-voice` archetype-specific palette (9 colors)

**Tests**: 12 unit (formatVoiceLine + escape + 9 archetype + render idempotent + side-effect class) in `tests/play/enneaVoiceRender.test.js`.

**Smoke**: bootstrap encounter → kill → debrief shows Ennea voice line player-visible <60s gameplay.

**Effort breakdown**: helper module (1h) + debrief wire (1h) + backend buildDebriefSummary extend (30min) + tests (1h) + smoke (30min).

### Track 3 — TKT-P3-INNATA-TRAIT-GRANT (3h autonomous)

**Severity**: HIGH P3 critical drift. Canonical PI-Pacchetti-Forme dichiara "ogni Forma assegna 1 trait garantito". NON implementato.

**Scope**: aggiungi campo `innata_trait_id` a ogni form in `mbti_forms.yaml` + apply on character creation (auto-grant trait_id quando form_id assignato).

**Files**:

- `data/core/forms/mbti_forms.yaml` — add `innata_trait_id` field per ogni form (16 form × 1 trait, picked from `active_effects.yaml` 458 pool)
- `apps/backend/services/coop/coopOrchestrator.js` `submitCharacter()` — post-normalize append innata trait to `traits[]` if `form_id` present
- `services/generation/SpeciesBuilder.js` — same logic on species build
- `apps/backend/services/coop/coopOrchestrator.js` `characterToUnit` — propagate innata_trait_id metadata

**Tests**:

- `tests/api/coopOrchestrator.test.js` add 3 test (innata grant + form_id missing fallback + duplicate trait avoid)
- `tests/services/innataTraitGrant.test.js` NEW pure function

**Smoke**: harness `tools/testing/phone-flow-harness.js` scenario 2 verify character_create → spec.traits include form innata.

**Effort breakdown**: yaml extend 16 form + trait pick (1h) + orch wire (30min) + tests (1h) + smoke (30min).

**Open question**: quali 16 trait pick come innata per le 16 form? Default: pick from existing `inner_voices.yaml` mapping form → axis trait. Auto-pick safe.

### Track 4 — TKT-P3-FORM-STAT-APPLIER (6h autonomous)

**Severity**: CRITICAL P3 drift. `form_id` cosmetic only — NO stat modifier in combat (`wsSession.js:1348` fallback `form_default`).

**Scope**: form_id → stat_seed applier in `normaliseUnit` (session engine). Form determinia HP/AP/attack/defense baseline modifier.

**Files**:

- `data/core/forms/mbti_forms.yaml` — add `stat_seed` field per form (4 stats × 16 form modifier)
- `apps/backend/services/sessionHelpers.js normaliseUnit` o equivalente — apply form stat_seed to base species stat
- `apps/backend/services/coop/coopOrchestrator.js characterToUnit` — propagate form stat_seed via initial spec
- `apps/backend/services/combat/resolver.js` — verify stat_seed honored (no override)

**Tests**:

- `tests/api/sessionStart.test.js` add 4 test (form stat applied + species baseline + override + missing form fallback)
- `tests/services/formStatApplier.test.js` NEW pure function

**Smoke**: harness scenario character_create + start session → verify unit.hp/ap/atk reflect form stat modifier.

**Effort breakdown**: yaml extend stat_seed 16 form (2h design + author) + applier impl (2h) + orch propagate (30min) + tests (1h) + smoke (30min).

**Open question**: stat_seed values per form? Need balance pass. Default: ±1-2 flat modifier per form per stat (NO multiplicative). Safe baseline, no balance regression risk.

## Sequencing — parallel-safe matrix

| Track                | Touches files                                                                           | Parallel-safe with              |
| -------------------- | --------------------------------------------------------------------------------------- | ------------------------------- |
| 1 Sprint M.6 Phase B | Game-Godot-v2/\* (separate repo)                                                        | ALL                             |
| 2 P0 Ennea voice     | apps/play/_ + apps/backend/services/rewardEconomy.js + tests/play/_                     | ALL (frontend stack)            |
| 3 Innata trait       | mbti_forms.yaml + coopOrchestrator.js + SpeciesBuilder + tests/api                      | sequential w/ 4 (yaml conflict) |
| 4 Form stat applier  | mbti_forms.yaml + sessionHelpers.js + coopOrchestrator.js + combat resolver + tests/api | sequential w/ 3 (yaml conflict) |

**Recommended order**:

1. Track 2 (P0 Ennea voice) — autonomous, parallel-safe, P0 priority
2. Track 3 (Innata trait) — autonomous, dipende solo da yaml
3. Track 4 (Form stat applier) — autonomous, depends on Track 3 yaml extension (cumulative)
4. Track 1 (Sprint M.6 Godot) — chip spawn master-dd o Codex agent (handoff)

## Effort total

| Track                                   | Effort     | Type              |
| --------------------------------------- | ---------- | ----------------- |
| 1 Sprint M.6 Phase B Godot              | 5-7h       | chip handoff      |
| 2 P0 Ennea voice frontend               | 4h         | autonomous Claude |
| 3 Innata trait grant                    | 3h         | autonomous Claude |
| 4 Form stat applier                     | 6h         | autonomous Claude |
| **Subtotal Opt C**                      | **18-20h** |                   |
| Sprint N+ COMBO upgrade (post-playtest) | ~30-40h    | future planning   |

## Success criteria

Opt C considerato shipped quando:

- ✅ Track 2 P0 Ennea voice player-visible <60s gameplay (Gate 5 PASS)
- ✅ Track 3 Innata trait granted automatic (every form character has guaranteed trait)
- ✅ Track 4 form_id determinia unit baseline stat (player vede form_id matter mechanically)
- ✅ Track 1 Sprint M.6 Phase B Godot port shipped (post-chip)
- ✅ Harness 13/15 PASS preserved + tests AI 383/383 + coop 27/27 zero regression
- ✅ PR cumulative reviewed/merged (master-dd approval)

Pillar status post-Opt C target:

- P3 Identità Specie × Job: 🟡++ → **🟢 candidato** (form mech link + Innata trait + Job D3 wire deferred to follow-up Sprint)
- P4 MBTI/Ennea: 🟡++ → **🟢 candidato** (Ennea voice surface live + dialogue color pipeline next sprint)

## Risk + mitigation

| Risk                                             | Mitigation                                                                  |
| ------------------------------------------------ | --------------------------------------------------------------------------- |
| Track 3+4 yaml conflict (mbti_forms.yaml extend) | Sequenziale: T3 first, T4 building on T3 yaml                               |
| Form stat_seed balance regression                | Default ±1-2 flat (no multiplicative) + harness coop tests                  |
| Innata trait pool selection arbitrary            | Lazy default: pick first axis-aligned trait, master-dd refine post-playtest |
| Sprint M.6 chip handoff timeout                  | Track 1 deferred OK, Track 2-3-4 ship indipendenti                          |
| Pre-existing CI flake terrainReactionsWire       | Re-run pattern documented (CLAUDE.md)                                       |

## Deferrals

**Sprint N+ separate** (NON questa sessione):

- COMBO 2-step submit (Q1 user vision)
- Vote co-op majority protocol (Q4)
- World muta scenario seed deviation (Q3)
- TKT-P4-MBTI-003 recruit gating thresholds
- TKT-P4-ITER2-DEFAULT (4 axis full default)
- TKT-P4-DIALOGUE-COLOR-PIPELINE
- TKT-P4-TF-THOUGHT
- Job D1 PP/SG resource gating enforce
- Job D2 PE resource impl
- Job D3 form×job soft_gate wire
- World gen biome package wire (5 campi YAML ignorati)
- ERMES realtime + L2/L3/L4 ecosystem wire

**Opzione playtest decision-gated** (post Opt C ship):

- Sprint N+ scope priority informato da playtest BASE feedback
- COMBO upgrade greenlit se player cite choice in debrief
- World muta greenlit se player chiede "perché mondo statico"

## Reversibility

- Track 2 (Ennea voice frontend): additive frontend wire, reversibile via revert
- Track 3 (Innata trait): additive yaml field + opt-in apply, fallback graceful
- Track 4 (Form stat applier): additive stat_seed yaml + applier, default ±0 if missing
- Track 1 (Sprint M.6 Phase B): additive Godot scene, no breaking change

ZERO breaking change pattern preservato across Opt C.

## Procedo

Master-dd OK Opt C plan? Avvio:

1. Track 2 P0 Ennea voice frontend autonomous now
2. Poi Track 3 Innata trait
3. Poi Track 4 form stat applier
4. Sprint M.6 Phase B = chip spec separate (Track 1) → master-dd dispatch o Codex agent

Default OK = procedo Track 2 immediately.
