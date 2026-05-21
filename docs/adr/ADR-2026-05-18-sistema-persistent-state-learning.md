---
title: 'ADR-2026-05-18 — Sistema persistent cross-session state (learning AI, P5)'
date: 2026-05-18
type: adr
workstream: backend
owner: master-dd
status: draft
proposed_by: claude-code (codemasterdd DF re-scope audit, ground-truth gh-api)
accepted_by: pending master-dd verdict
verdict_date: pending
related_files:
  - apps/backend/services/ai/sistemaTurnRunner.js
  - apps/backend/services/ai/declareSistemaIntents.js
  - apps/backend/services/ai/threatAssessment.js
  - packs/evo_tactics_pack/data/balance/sistema_pressure.yaml
  - apps/backend/services/vcScoring.js
  - apps/backend/routes/session.js
  - apps/backend/services/campaign/campaignLoader.js
  - prisma/schema.prisma
related_adr:
  - docs/adr/ADR-2026-04-16-round-model.md
  - docs/adr/ADR-2026-04-21-meta-progression-prisma.md
related_pr:
  - https://github.com/MasterDD-L34D/Game/pull/2326
related_doc:
  - docs/planning/RESCUE-FORGOTTEN-HIGH-ROI.md
  - docs/planning/2026-04-20-pilastri-reality-audit.md
---

# ADR-2026-05-18 — Sistema persistent cross-session state (learning AI)

> STATUS: **DRAFT** — proposta da audit codemasterdd DF re-scope. Richiede
> verdetto master-dd PRIMA di qualsiasi implementazione. Nessun codice
> scritto. Questo file = scaffold decisione, non decisione presa.

## Context

Il pilastro **P5 "Co-op vs Sistema"** dichiara antagonista AI data-driven.
Audit pilastri (`docs/planning/2026-04-20-pilastri-reality-audit.md`):
P5 = 🟡, AI solida ma **stateless session-to-session**. Ground-truth
2026-05-18 (gh api origin/main):

- `apps/backend/services/ai/sistemaTurnRunner.js` (~269 LOC) — orchestrazione
  per-turn AP loop. **Zero memoria cross-session.**
- `apps/backend/services/ai/declareSistemaIntents.js` (~543 LOC) — pure
  function intent declaration, pressure-tier cap. **Ephemeral**, niente
  persistenza.
- `apps/backend/services/ai/threatAssessment.js` — threat index
  **per-session** da `session.events`, no aggregato storico.
- `sistema_pressure.yaml` — 5 tier Calm->Apex, pressure 0..100 **session-local**.
- `prisma/schema.prisma` — Campaign/Chapter/PartyRoster/NpcRelation/
  FormSessionState esistono (M10-M12). **Nessun model Sistema.**

La AI non "ricorda" unita pericolose, tattiche viste, perdite fazioni tra
encounter. Da qui la percezione "Sistema troppo passivo/flat" (P5 weakness).

## Decision (proposed)

Aggiungere un layer di stato persistente `SistemaState` per-campaign,
deterministico (NO LLM, NO random), con 4 bucket + soglie FSM:

- `units_observed`: { unit_id: { sightings, threat_level, abilities[], kills_vs_sistema } }
- `tactics_observed`: { tactic_id: { uses, sessions[], counter_status } }
- `factions`: { faction_id: { morale, casualties, objective, units_remaining } }
- `strategic_phase`: 1..5

Soglie deterministiche: kills_vs_sistema>=3 -> threat high + bounty;
tactic uses>=2 -> "studying", >=3 -> "ready"; morale -0.1/unita persa,
<=0 -> faction shattered; phase advance su condizioni esplicite.

Persistenza: Prisma model `SistemaState` (campaign-scoped, JSONB bucket)

- snapshot on session `/end`, hydrate on campaign load.

## Scope & seam (file-cited)

| Trigger            | Seam esistente                                                                                    |
| ------------------ | ------------------------------------------------------------------------------------------------- |
| Session end        | `routes/session.js` `/end` -> post `vcScoring.scoreSession()` hook accumulator                    |
| Battle aggregation | `services/vcScoring.js scoreSession()` loop -> parallel SIS observation collector                 |
| Intent declaration | `declareSistemaIntents.js` -> optional arg `persistent_tactics` per counter-weighting             |
| Campaign load      | `services/campaign/campaignLoader.js loadCampaign()` -> attach `session.sistema_state_persistent` |

Nuovi file proposti: `services/ai/sistemaStateManager.js` (~150 LOC) +
`sistemaStateAccumulator.js` (~120 LOC) + `campaign/sistemaStateLoader.js`
(~80 LOC) + Prisma model + migration + route GET `/api/campaign/:id/sistema-state`.

Backward-compat: optional args con default (zero breaking su flow esistente),
adapter fallback se DB assente (graceful degrade in-memory).

## Effort & gate

~9h totali (Prisma+migration 1h / manager+loader 4h / accumulator 2h /
route 1h / test 2h). Non-blocking M1 (observational, no regola gameplay).

Gate SAFE_CHANGES.md: nuovi servizi 🟢 SAFE; Prisma model + opt-arg su
AI core (sistemaTurnRunner/declareSistemaIntents) 🟡 CHECKPOINT.
**-> ADR obbligatorio (questo) prima del codice.**

## Risks

1. **Determinismo replay**: counter-state non deve rendere policy
   non-deterministica senza seed. Mitig: snapshot stato + RNG seed per encounter.
2. **Morale FSM edge**: cascade morale vs reinforcement spawner -> integration test.
3. **Pressure tier vs strategic_phase**: ortogonali (pressure = reazione
   session-outcome; phase = learning cross-session). Chiarito qui, non confondere.
4. **Dipendenza event hooks (S2)**: accumulator su `/end` non richiede S2;
   ma se round orchestrator redesign pending, seam puo' shiftare. Verificare
   finality ADR-2026-04-16.
5. **Bias balance**: AI cumulative learning puo' diventare "troppo aggressiva"
   -> playtest 1 sessione post-MVP prima di lock.

## Consequences

- (+) P5 da "data-driven within session" a "historically data-driven"
  (learning credibile cross-campaign, risponde a "troppo passivo").
- (+) Phase advancement + morale cascade visibili in debrief = beat
  narrativo, non escalation opaca.
- (+) Riusa pattern M10-M12 (Campaign/Prisma persistence consolidati).
- (-) Nuovo state layer = superficie test + rischio determinismo replay.
- (-) Compete con backlog M-scope: NON urgente, gated su priorita master-dd.

## Options considered

- **A (proposed)**: full SistemaState Prisma + 4 bucket + FSM. ~9h.
- **B minimal**: solo `units_observed` + threat persistente (no factions/phase).
  ~3-4h. Chiude meno del gap P5 ma low-risk pilot.
- **C no-op**: restare stateless. P5 resta 🟡 "passivo", gap non chiuso.

## Decision needed (master-dd)

1. Pursue? (A full / B pilot / C defer)
2. Se pursue: milestone target (S7 post-M4? o feature M5?) — NON "rescue",
   feature nuova ordinaria competere in roadmap.
3. Determinismo replay: accettabile snapshot+seed strategy?

Riferimento audit completo: codemasterdd `STATUS_MULTI_REPO.md`
§DF Integration + PR #2326 caveat ground-truth.
