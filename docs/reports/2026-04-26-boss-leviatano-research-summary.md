---
title: 'Boss Leviatano Risonante — research summary + 3 ADR draft + sprint plan'
doc_status: draft
doc_owner: master-dd
workstream: cross-cutting
last_verified: '2026-04-26'
source_of_truth: false
language: it
review_cycle_days: 90
related:
  - docs/adr/ADR-2026-04-26-multi-stage-encounter-schema.md
  - docs/adr/ADR-2026-04-26-parley-outcome-enum.md
  - docs/adr/ADR-2026-04-26-cross-bioma-worldstate-persistence.md
  - docs/planning/2026-04-26-leviatano-sprint-plan.md
  - docs/archive/concept-explorations/2026-04/Vertical Slice - Risveglio del Leviatano.html
---

# Boss Leviatano Risonante — research summary

## TL;DR

1. **Boss Leviatano già canonical**: species in `packs/evo_tactics_pack/data/species.yaml:115` (`leviatano_risonante`), apex tier in 2 encounter (`docs/planning/encounters/enc_frattura_03.yaml:70-74`, `data/encounters/elite_01.yaml`), 3 strati biome wired in `data/core/traits/biome_pools.json:381,417,453`. Schema runtime ha **rotto il design** (commento esplicito `enc_frattura_03.yaml:7-9`: "Original design had 3 branching objectives — schema supports single objective").
2. **3 ADR draft scritti** (status `proposed`): multi-stage encounter schema (Sprint A 12-15h), parley outcome enum (Sprint B 20-25h), cross-bioma world-state persistence (Sprint C 8-12h). Totale 40-52h impl + 25-40h playtest/balance = ~75-90h.
3. **Sprint plan** sequenziale `A → B → C` (A prereq B; C parallel-safe). Pattern proven: vertical slice 2128 LOC mostra UX 1:1 (3 strati + 3 outcome accordo/ritirata/combat + debrief differenziato).
4. **Pillars impattati**: P1 🟢→🟢+ · P4 🟡→🟡+ (F-axis path significativo) · P6 🟢c→🟢. Sblocca Nido lineage offspring environmental mutation via WorldState.trait_unlocks.
5. **Recommendation**: NON impl ora. **Firma 3 ADR prima** (5 user decision points sotto). Sequencing suggerito: **Nido prima → Leviatano poi**, perché Sprint C (world-state) è prerequisito Nido offspring environmental mutation, ma Nido OD-001 verdict è già pending da settimane.

## Quick links

- **ADR-A multi-stage**: [`docs/adr/ADR-2026-04-26-multi-stage-encounter-schema.md`](../adr/ADR-2026-04-26-multi-stage-encounter-schema.md)
- **ADR-B parley**: [`docs/adr/ADR-2026-04-26-parley-outcome-enum.md`](../adr/ADR-2026-04-26-parley-outcome-enum.md)
- **ADR-C world-state**: [`docs/adr/ADR-2026-04-26-cross-bioma-worldstate-persistence.md`](../adr/ADR-2026-04-26-cross-bioma-worldstate-persistence.md)
- **Sprint plan**: [`docs/planning/2026-04-26-leviatano-sprint-plan.md`](../planning/2026-04-26-leviatano-sprint-plan.md)
- **Vertical slice (2128 LOC)**: [`docs/archive/concept-explorations/2026-04/Vertical Slice - Risveglio del Leviatano.html`](../archive/concept-explorations/2026-04/Vertical%20Slice%20-%20Risveglio%20del%20Leviatano.html)
- **Museum M-014**: [`docs/museum/cards/worldgen-cross-bioma-events-propagation.md`](../museum/cards/worldgen-cross-bioma-events-propagation.md)

## User decision points (firma ADR pending)

Da decidere **prima** di promote ADR `proposed` → `accepted`:

1. **Phase enter_condition flessibilità** (Sprint A): ammetti solo `hp_threshold` + `turn_count` + `objective_completed`, oppure aggiungi anche `narrative_choice_made` (player choice diegetico tipo Disco Elysium thought)? Decision blocks schema enum.
2. **Outcome `retreat` semantica** (Sprint B): è **fail-state-lite** (PE ridotti, no lore_unlock) oppure **success-vile** (lore unlock "ritirata controllata", PE intermedi, world state semi-stabile)? Pattern Long War 2 vs FFT.
3. **Parley reach threshold** (Sprint B): 5 azioni (proposed) è ok? Range plausibile 3-8. Più basso = trivializzabile, più alto = ghost feature. Balance N=10 sim può iterare ma threshold iniziale serve.
4. **WorldState scope** (Sprint C): per-`campaign_id` (proposed) oppure per-`account/profile` (cross-campaign persistence)? Più alto scope = più impatto narrativo + più complessità sync cross-PC.
5. **Sequencing Nido vs Leviatano**: Nido OD-001 verdict A/B/C/skip è bloccato da settimane (50-80h sunk cost). Sprint C (world-state) sblocca Nido offspring environmental mutation, ma può anche shippare standalone. Vuoi:
   - **(a)** Nido verdict prima → poi Leviatano (Nido unlocked da Sprint C come bonus)?
   - **(b)** Leviatano prima (chiude vertical slice promesso, P4/P6 promotion) → Nido dopo?
   - **(c)** Parallelo: Sprint C standalone → poi Nido + Leviatano A/B in parallel?

## Risk register (top 5)

| # | Risk | Severity | Mitigation |
|---|---|---|---|
| 1 | Schema `phases[]` ripple `packages/contracts` → mock parity break | High | Field additive optional + contract registry test pre-merge |
| 2 | Frontend HUD complexity (phase indicator + outcome variants + transition feedback) → UI tech debt | High | Riusa pattern `progressionPanel.js`/`formsPanel.js`, no overlay reinventato |
| 3 | AI behavior multi-stage (apex form switch fase 3) → AI policy regression | High | AI policy regression test in Sprint A DoD; apex form change = re-eval utility scores forced |
| 4 | Test surface explosion (3 outcome × 3 phases × 4-8p) → CI time | Med | Tier test (fast unit always, slow integration nightly) |
| 5 | Vertical slice match-fidelity gap (UX promette debrief 3 outcome + new bridges + flint rituali) | High | UX review checkpoint post Sprint B; vertical slice come acceptance criterion non come reference soft |

## Stato attuale (evidence)

| Componente | Stato | File:line |
|---|---|---|
| Species canonical | ✅ esiste | `packs/evo_tactics_pack/data/species.yaml:115` |
| Encounter apex `enc_frattura_03` | ✅ shippato (single-stage degraded) | `docs/planning/encounters/enc_frattura_03.yaml:70-74` |
| Encounter apex `elite_01` | ✅ shippato (combat-only) | `data/encounters/elite_01.yaml:1-43` |
| 3 strati biome pool | ✅ wired runtime | `data/core/traits/biome_pools.json:381,417,453` |
| Vertical slice UX | ✅ 2128 LOC ready as spec | `docs/archive/concept-explorations/2026-04/Vertical Slice - Risveglio del Leviatano.html` |
| Multi-stage schema | ❌ assente | `schemas/evo/encounter.schema.json:41-96` (single objective only) |
| Outcome `parley`/`retreat` | ❌ assente | `apps/backend/routes/session.js:2009-2012` (binary win/wipe) |
| WorldState persistence | ❌ assente | nessun model Prisma |
| Cross-events runtime | ❌ buried | museum M-014 score 4/5, validator Python solo |

## Recommendation sequencing (final)

**Path scelto raccomandato: Nido prima → Leviatano poi (option a above)**.

Motivazioni:
1. Nido OD-001 è bloccato da settimane con 50-80h sunk cost engine — ogni giorno di rinvio aumenta il costo opportunità.
2. Sprint C (world-state) **sblocca implicitamente** Nido offspring environmental mutation (vedi ADR-C "Hook Nido"). Se Nido shippa prima, Sprint C amplifica retroattivamente.
3. Leviatano è scoped 75-90h totali (3 sprint + balance + playtest). Spezzare con Nido in mezzo causa context loss.
4. Recommendation: **OD-001 verdict questa settimana** → poi block 2-3 settimane Leviatano A→B→playtest → poi Sprint C che sblocca Nido v2 environmental mutation.

Se Nido verdict resta bloccato >7 giorni: **fallback option (b)** Leviatano prima, perché chiude promesse P4/P6 e UX vertical slice già esiste come acceptance criterion concreto.

## File scritti questa sessione

1. `docs/adr/ADR-2026-04-26-multi-stage-encounter-schema.md` — Sprint A draft
2. `docs/adr/ADR-2026-04-26-parley-outcome-enum.md` — Sprint B draft
3. `docs/adr/ADR-2026-04-26-cross-bioma-worldstate-persistence.md` — Sprint C draft
4. `docs/planning/2026-04-26-leviatano-sprint-plan.md` — sprint plan + risk register + DoD
5. `docs/reports/2026-04-26-boss-leviatano-research-summary.md` — questo file

NO implementation. Solo doc draft + research consolidation. Prossima sessione: user verdict 5 decision points → promote ADR → kickoff Sprint A.
