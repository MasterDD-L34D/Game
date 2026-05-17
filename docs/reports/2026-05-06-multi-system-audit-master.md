---
title: 'Multi-system audit master 2026-05-06 — World/Specie/Forme/Tratti/Job/MBTI/Ennea'
doc_status: active
doc_owner: master-dd
workstream: cross-cutting
last_verified: 2026-05-06
source_of_truth: false
language: it
review_cycle_days: 30
related:
  - docs/reports/2026-05-06-world-gen-audit.md
  - docs/reports/2026-05-06-species-forms-traits-audit.md
  - docs/reports/2026-05-06-job-system-audit.md
  - docs/reports/2026-05-06-mbti-ennea-audit.md
  - docs/planning/2026-05-06-onboarding-port-decisions.md
---

# Multi-system audit master 2026-05-06

**Trigger**: master-dd 2026-05-06 — "vedo discrepanze da come avevamo progettato. ricontrollare bene tutti i doc relativi a mondo, specie, tratti, forme, job, MBTI/Ennea".

**4 agent paralleli BG**, 4 report shipped. Aggregate qui per decisione cross-cutting.

## TL;DR

**Drift confermato MASSIVO** in 4/4 domain. Player vision (Q1 COMBO + Q3 world muta + Q4 vote co-op) richiede stack di prerequisiti **~40-50h** prima di poter shippare COMBO sensato. Non è Sprint M.6 timeboxed.

**Pattern dominante**: "Engine LIVE Surface DEAD" + parts/forms placeholder + trait_plan stub. Backend ricco, surface incompleta.

**Pillar reality check**:
- P1 Tattica 🟢++ (confermato)
- P2 Evoluzione 🟢++ (confermato post-Skiv sprint)
- **P3 Identità Specie × Job** 🟡++ (NOT 🟢++ come claim, surface gate fallisce)
- **P4 Temperamenti MBTI/Ennea** 🟡++ (NOT 🟢 candidato come claim, Engine LIVE Surface DEAD)
- P5 Co-op 🟢 candidato (post-cutover Phase 3 confermato)
- P6 Fairness 🟢 candidato

## Drift summary cross-domain

### World gen (Agent A)

| Drift | Severity | Effort fix |
|---|---|---|
| 5/7 campi biomes.yaml caricati ma NOT consumed (StressWave, hazard.stress_modifiers, npc_archetypes, narrative.tone, hooks) | HIGH | 3h W-1 |
| L2 ecosistema (5 yaml validi) → ZERO runtime wire | HIGH | TBD |
| L3 meta-network + L4 cross-eventi → ZERO runtime | HIGH | TBD |
| ERMES file-based static (prototype lab isolato non runtime) | MEDIUM | 5h W-4 |
| Biome selection: nessuna logica backend (dipende input esterno) | MEDIUM | 2h W-3 |

**Q3 canonical answer**: mondo NON muta da onboarding by default. Bridge possibile ~3-4h ADR (Opzione D — pass `onboardingChoice.trait_id` a `enrichWorld`, branch ALIENA tone + ERMES bias).

### Specie + Forme + Tratti (Agent B)

| Drift | Severity | Effort fix |
|---|---|---|
| 14/15 specie hanno `default_parts` IDENTICI (burrower/sand_digest/sand_claws/heat_scales/echolocation placeholder catalog globale) | CRITICAL | TBD design |
| `data/forms.yaml` dichiarata canonical in `PI-Pacchetti-Forme.md` **NON ESISTE**. Sostituita da fragmented files | CRITICAL | doc fix |
| `form_id` cosmetic only — NO stat modifier né trait grant in combat (`wsSession.js:1348` fallback `form_default`) | CRITICAL | 6h fix |
| **Innata trait** canonical (ogni Forma 1 trait garantito) NON implementata | HIGH | 3h fix |
| 43/64 trait_plan IDs silently ignored (33% coverage active_effects.yaml) | HIGH | 8h fix |
| Pack d20 token `trait_T1:pianificatore` = label testuali NO resolver | MEDIUM | 4h fix |
| `mutation_catalog.yaml` 36 mutations + aspect_token NOT wired runtime | MEDIUM | TBD |

### Job system (Agent C)

| Drift | Severity | Effort fix |
|---|---|---|
| **D1** resource gating PP/SG/PT cosmetic (skipped MVP `abilityExecutor.js:542+1477`). Capstone r4 fire incondizionatamente | HIGH | 4h |
| **D2** `aberrant` job declares PE resource non implementato → silently ignored | HIGH | 30min remap o 4h impl |
| **D3** `mbti_forms.yaml soft_gate.first_turn_penalty` dual identity friction = dead code (zero runtime enforcement) | HIGH | 3h |
| Numeric-ref doc dice 49 ability vs real 55 (stale by 6) | LOW | 30min |
| Job × Form `job_affinities` cosmetic (categories never mapped to job_ids) | MEDIUM | TBD |

### MBTI + Ennea (Agent D)

| Drift | Severity | Effort fix |
|---|---|---|
| **Ennea voice 9/9 × 7 beat = ~189 line authorate** + endpoint live + ZERO frontend caller in-session (Engine LIVE Surface DEAD) | CRITICAL P0 | 4h TKT-P4-ENNEA-VOICE-FRONTEND |
| Dialogue color codes helpers ready ma narrative pipeline non emette `<mbti>` tagged text auto | HIGH | 2h |
| T_F Thought Cabinet ZERO thoughts (by-design "già surfaced via job_affinities" ma player non vede) | HIGH | 2h |
| MBTI iter2 (4 axis full) opt-in `VC_AXES_ITER=2`. Default iter1 → E_I + S_N partial sessions corte | MEDIUM | 3h |
| TKT-P4-MBTI-003 recruit gating thresholds ancora open | MEDIUM | 4-6h |
| TKT-P4-FORM-GATE-GHOST museum M-010 | MEDIUM | 3h |

## Effort cumulative per scope

### Onboarding COMBO + vote + world muta (user vision Q1+Q3+Q4)

| Layer | Ticket | Effort |
|---|---|---|
| Backend Phase A (already shipped commit `861adcc6`) | character_creation handler + onboarding base | 3h ✅ |
| Vote co-op protocol | majority tally + AFK timeout + tie break | 4h |
| Q3 world bridge | onboardingChoice.trait_id → enrichWorld → ALIENA branch + ERMES bias | 3-4h |
| Q1 COMBO 2nd choice + 9 combo trait pair | choice_2 design + pool 458 mapping + state | 10h |
| Q1 COMBO scenario seed deviation | integer modifier + procedural gen tap | 3h |
| Godot frontend Phase B (BASE) | phone_onboarding_view.gd 3-stage + timer + auto-select | 5-7h |
| Godot frontend COMBO upgrade | 2nd card + vote UI + result broadcast | 4h |
| **Subtotal onboarding scope** | | **~32-35h** |

### Prerequisiti Pillar fix (per onboarding sensato)

| Layer | Ticket | Effort |
|---|---|---|
| **P0** Ennea voice frontend | TKT-P4-ENNEA-VOICE-FRONTEND | 4h |
| Innata trait grant da form_id | P3+P4 critical drift fix | 3h |
| 43 species trait_plan IDs stub fix | P3 trait_plan coverage | 8h |
| form_id → stat_seed applier | P3+P4 form mechanical link | 6h |
| Job D3 form×job soft_gate wire | P3 dual identity friction | 3h |
| Dialogue color pipeline + T_F Thought | P4 narrative completeness | 4h |
| Job D1 resource gating PP/SG enforce | P3 capstone balance | 4h |
| World biome package wire (5 campi) | P1 biome richness | 3h |
| **Subtotal prerequisiti** | | **~35h** |

### Grand total

**~67-70h** per shippare onboarding COMBO + vote + world muta su foundation pulita. **NON** Sprint M.6 timeboxed (~10h originale stima).

## Decisioni master-dd richieste

### Strategic pivot

**Opzione A — Ship BASE foundation NOW, COMBO Sprint N+** (recommend)
- Phase A backend già shipped (commit `861adcc6`)
- Phase B Godot phone_onboarding_view BASE 5-7h Sprint M.6
- Parallel autonomous: prerequisiti Pillar fix (P4 voice + form mech link + trait_plan stub) ~20-30h
- Sprint N+ COMBO upgrade post foundation: vote + world muta + 2nd choice + scenario seed
- Iterativo, playtest-informed
- Total Sprint M.6: 10h. Sprint N+: 30-40h. **Distributed**.

**Opzione B — Big-bang COMBO + vote + world muta** (vision-fedele)
- 1 mega-PR ~67-70h
- Tutto onboarding scope + prerequisiti
- Risk: scope creep + ship-blocked
- Vision-fedele user request

**Opzione C — Pivot: ship onboarding minimal (BASE host-only) + parallel pillar fix**
- Q1=BASE first ship Sprint M.6 (~10h)
- Q3=NIENTE world muta MVP (canonical default)
- Q4=host-only (no vote)
- Parallel: P4 voice frontend + Innata trait + form mech link (~13-15h)
- COMBO + vote + world muta = Sprint N+ separate, independent

**Opzione D — Stop onboarding port. Fix Pillar drift first** (audit-driven)
- Phase A backend shipped resta (zero impact)
- Sprint M.6 deferred
- Focus: P4 voice surface + P3 form_id mech link + species default_parts richness
- Onboarding port resume DOPO pillar foundation 🟢 candidato confermato (ready trait/form/world stack)

### Q3 final decision (post-audit)

| Q3 | Path | Effort | Canonical |
|---|---|---|---|
| Mondo statico canonical | Niente in BASE | 0 | YES (51 doc canonical default) |
| Onboarding bridge ALIENA tone | enrichWorld param | 3-4h | NO (richiede ADR) |
| Full world muta (biome + seed + ERMES) | TKT-P2-ONBOARDING-WORLD-BRIDGE + extension | 8-10h | NO (richiede ADR) |

User Q3 verdict: "consultare doc come viene generato mondo" → answer: **mondo gen è 29% shipped, vorrebbe esserlo molto più ricco** (4 livelli SoT). Pre-onboarding bridge ha senso solo dopo biome package wire.

## Recommended next action

**Recommend Opzione C** (BASE ship now + parallel pillar fix):

1. **Phase A backend già shipped** ✅ (commit `861adcc6`, additive zero impact)
2. **Phase B Godot frontend BASE** Sprint M.6 timing autonomous se chip spawn (~5-7h)
3. **Parallel autonomous pillar critical fix** (~13-15h):
   - TKT-P4-ENNEA-VOICE-FRONTEND 4h (P0 Gate 5 fail)
   - Innata trait grant da form_id 3h (P3+P4)
   - form_id → stat_seed applier 6h (P3+P4)
4. **COMBO + vote + world muta = Sprint N+ separate** post foundation playtest

Tutti i 4 audit doc sono saved + cross-linked. PR #2071 commit `861adcc6` baseline solido per Opzione C.

## Files per agent

- `docs/reports/2026-05-06-world-gen-audit.md` (Agent A)
- `docs/reports/2026-05-06-species-forms-traits-audit.md` (Agent B)
- `docs/reports/2026-05-06-job-system-audit.md` (Agent C)
- `docs/reports/2026-05-06-mbti-ennea-audit.md` (Agent D)

## Lessons codified questo audit

1. **"Engine LIVE Surface DEAD" pervasive**: P3 + P4 entrambi affette. CLAUDE.md Gate 5 policy violata in production claim 🟢/🟢++ status aspirational.
2. **Default_parts placeholder catalog globale**: 14/15 specie identici → bottle neck specie diversification. Drift design critical.
3. **forms.yaml canonical NOT EXIST**: doc dichiara file mai creato. Drift catastrophic doc-vs-code.
4. **Trait_plan stub 67%**: 43/64 IDs silently ignored. Authoring intent gap massivo.
5. **Iter2 opt-in default**: VC_AXES_ITER=2 enables 4 axis full ma default iter1. Surface gap MBTI silenzioso.

Master-dd OK opzione C? O pivot?
