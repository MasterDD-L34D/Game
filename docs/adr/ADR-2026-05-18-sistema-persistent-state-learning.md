---
title: 'ADR-2026-05-18 — Sistema persistent cross-session state (learning AI, P5)'
date: 2026-05-18
type: adr
workstream: backend
owner: master-dd
status: accepted
proposed_by: claude-code (codemasterdd DF re-scope audit, ground-truth gh-api)
accepted_by: master-dd (Eduardo Scarpelli) -- ratify Option B 2026-05-29 (gate playtest, vedi Verdetto)
verdict_date: 2026-05-29
implemented_date: 2026-05-25
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

> STATUS: **ACCEPTED — Option B RATIFIED (verdetto master-dd 2026-05-29)**, gate
> playtest attivo (vedi "Verdetto master-dd"). Il subset Option B (`units_observed`
> + threat, Prisma) e' shippato + validato (e2e PASS 2026-05-25). Ratify formale dato
> in valutazione congiunta DF (parent `ADR-2026-05-18-df-levels`, Q5), post
> harsh-review. Vedi "Implementation status" + "Verdetto master-dd" sotto.

## Implementation status (2026-05-25)

**Built = Option B** (subset minimale, vedi "Options considered"): solo
`units_observed` + threat persistente. NON costruite le bucket di Option A
(`tactics_observed`, `factions`, `strategic_phase`) ne' il campo `abilities[]`.

- Storage: Prisma model `SistemaState` (campaign-scoped, colonna JSONB
  `units_observed`), migration `0011_sistema_state`. NON file JSON.
- Write: `coopOrchestrator` fold a fine-encounter (best-effort). Read:
  `GET /api/campaign/sistema-state?campaign_id=<id>`.
- Surface: client Godot v2 (brief "Il Sistema ricorda" + echo Cronaca nel debrief).
- PR: #2363/#2364 (pilot + route), #2371 (store), #2377/#2379 (debrief chip +
  orphan removal), #2383 (cumulativeStateTracker wire).
- Validazione 2026-05-25 (Ryzen): logica 18/18 + e2e real-Postgres PASS. Findings
  `docs/playtest/2026-05-25-m1-sistema-live-loop.md`.
- SoT caricato: vault `00-SOURCE-OF-TRUTH.md` §13.5.1 (PR vault #184).

**Aperto**: ratify formale master-dd (Risks #5 playtest gate) + decisione se
estendere a Option A (tactics/factions/phase = scope S7/M5 in PHASE-PLAN).

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

Nuovi file proposti (scaffold originale): `services/ai/sistemaStateManager.js` +
`sistemaStateAccumulator.js` + `campaign/sistemaStateLoader.js` + Prisma model +
migration + route GET `/api/campaign/sistema-state?campaign_id=<id>`.

**AS-BUILT (reconcile 2026-05-29, fix P2.2 harsh-review)**: shippati
`apps/backend/services/ai/sistemaStateStore.js` + `apps/backend/services/ai/sistemaStateAccumulator.js`.
`sistemaStateManager.js` / `campaign/sistemaStateLoader.js` NON creati come file
separati: la logica e' folded in `sistemaStateStore.js` + `coopOrchestrator`. Route +
Prisma model `SistemaState` come da "Implementation status" sopra.

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

## Verdetto master-dd (2026-05-29)

Dato in valutazione congiunta DF (parent `ADR-2026-05-18-df-levels`, Q5), post
harsh-review stress-test:

1. **Option B = RATIFIED** (gia' shipped + e2e PASS 2026-05-25). NON era una scelta
   "pilot" forward (correzione P0.2 harsh-review: era stale framing). Resta in main
   come shipped subset (units_observed + threat).
2. **Gate = ratify-OR-revert sul playtest AI-driven canonical**: Option B resta, ma il
   lock definitivo (no-revert) e' subordinato al **playtest AI-driven canonico** del core
   loop (multi-policy, WR in-band a N=40, `docs/process/CANONICAL-AI-PLAYTEST.md`) —
   stesso gate di L2-L5 nel parent ADR. Playtest umano = conferma opzionale. Se la sim
   mostra "AI troppo aggressiva" (Risks #5) -> tuning o revert del subset.
3. **Estensione Option A** (tactics_observed / factions / strategic_phase) = feature
   M2+ ordinaria, NON priorita' automatica, stesso doppio-gate (playtest +
   same-increment-surface) del parent. NON costruire ora.
4. **Determinismo replay**: snapshot+seed accettato (Risks #1).

Riferimento audit completo: codemasterdd `STATUS_MULTI_REPO.md`
§DF Integration + PR #2326 caveat ground-truth.
